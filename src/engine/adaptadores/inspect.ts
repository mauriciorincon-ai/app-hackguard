// Adaptador de Inspect: lee el log de una evaluación, `EvalLog` en JSON (`inspect log dump <log>`) (S12, D10). Formato citado por su
// fuente, no por memoria (https://github.com/UKGovernmentBEIS/inspect_ai):
// - https://github.com/UKGovernmentBEIS/inspect_ai/blob/0.3.288/src/inspect_ai/log/_log.py@0.3.288 (`EvalLog`, `EvalSpec`,
//   `EvalSample`; `EvalLog.version` es la versión del FORMATO del log, no la de Inspect);
// - https://github.com/UKGovernmentBEIS/inspect_ai/blob/0.3.288/src/inspect_ai/scorer/_metric.py@0.3.288 (`Score`, `Value`:
//   «C» correcta · «I» incorrecta · «P» crédito parcial · «N» sin respuesta o rechazo; NaN = sin puntuar);
// - https://github.com/UKGovernmentBEIS/inspect_ai/blob/0.3.288/src/inspect_ai/_eval/task/log.py@0.3.288 (`eval.packages`
//   lleva `{"inspect_ai": <versión>}`: la clave sale de `PKG_NAME`).
// Reglas del formato:
// - el log trae el NaN del «sin puntuar» como constante JSON (`ser_json_inf_nan="constants"`): `JSON.parse` no la acepta y aquí
//   se lee como `null` (solo fuera de las cadenas);
// - una muestra es una fila `(id, epoch)`. Su puntaje es DATO de la herramienta, nunca el veredicto: se cuentan muestras y el
//   veredicto lo calcula la regla de la prueba (ADR-008). Las métricas agregadas del log (`results.scores`) NO se leen: serían
//   un veredicto de la herramienta;
// - una muestra con `error`, sin puntaje o con valor «N», NaN o no escalar no evaluó nada: no es superada ni fallida;
// - lectura del puntaje (declarada, no inferida del evaluador): «C», `true`, 1 o «yes» = el control resistió; «I», `false`, 0 o
//   «no» = falló; «P» y los números entre 0 y 1 = crédito parcial, que se cuenta como NO resistido y se avisa. Vale para las
//   tareas puntuadas para que «correcto» sea «el control resistió», como la del plan; con otra convención la regla no aplica;
// - una muestra con varios puntajes falla si alguno falla;
// - el log pertenece al selector `modulo.referencia` si esa referencia es `eval.task` o `eval.task_registry_name`;
// - la versión es `eval.packages.inspect_ai` (obligatoria). Solo se lee con `status: "success"`: un log cancelado o con error
//   trae muestras a medias;
// - la entrada, la meta, la salida del modelo, los mensajes, los eventos, el almacén, la explicación del juez, el modelo y sus
//   argumentos, las rutas y el origen git son material sensible (reglas duras 3 y 4): el esquema de lectura los descarta.
import { z } from "zod";
import { compararVersiones } from "../evidencia/molde.ts";
import {
  advertencia,
  type Adaptador,
  type Corrida,
  type LecturaDeAdaptador,
  type MedidaDeSelector,
  type Selector,
  type TextoBilingue,
} from "./interfaz.ts";

/** Quita el centinela NaN/±Infinity de Inspect (constantes JSON) sin tocar el interior de las cadenas. */
function aJsonEstandar(texto: string): string {
  return texto.replace(/"(?:[^"\\]|\\.)*"|-?\bInfinity\b|\bNaN\b/g, (t) =>
    t.startsWith('"') ? t : "null",
  );
}

// `z.object` descarta lo que no se declara: la entrada, la salida, los mensajes y la explicación nunca salen de aquí.
const Muestra = z.object({
  id: z.union([z.string(), z.number()]),
  epoch: z.number().optional(),
  error: z.unknown().optional(),
  scores: z
    .record(z.string(), z.object({ value: z.unknown().optional() }))
    .nullish(),
});
const Archivo = z.object({
  version: z.number().optional(),
  status: z.enum(["started", "success", "cancelled", "error"]),
  eval: z.object({
    created: z.string().optional(),
    task: z.string(),
    task_registry_name: z.string().nullish(),
    packages: z.record(z.string(), z.string()).optional(),
  }),
  results: z
    .object({
      total_samples: z.number().optional(),
      completed_samples: z.number().optional(),
    })
    .nullish(),
  samples: z.array(Muestra).nullish(),
});
type MuestraLeida = z.infer<typeof Muestra>;

type Lectura = "resiste" | "falla" | "parcial" | "sin_evaluar";

/** Qué dice UN valor de puntaje (`Value` de Inspect) sobre el control. */
function leerValor(v: unknown): Lectura {
  if (typeof v === "boolean") return v ? "resiste" : "falla";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "sin_evaluar";
    return v >= 1 ? "resiste" : v <= 0 ? "falla" : "parcial";
  }
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "c" || t === "yes" || t === "true") return "resiste";
    if (t === "i" || t === "no" || t === "false") return "falla";
    if (t === "p") return "parcial";
  }
  // «N» (sin respuesta o rechazo), null/NaN (sin puntuar), listas y mapas: no se interpretan.
  return "sin_evaluar";
}

/** La lectura de una muestra: falla si algún puntaje falla; sin puntaje o con error no se evaluó. */
function leerMuestra(m: MuestraLeida): Lectura {
  if (m.error !== undefined && m.error !== null) return "sin_evaluar";
  const lecturas = Object.values(m.scores ?? {}).map((s) => leerValor(s.value));
  const validas = lecturas.filter((l) => l !== "sin_evaluar");
  if (validas.length === 0) return "sin_evaluar";
  if (validas.includes("falla")) return "falla";
  if (validas.includes("parcial")) return "parcial";
  return "resiste";
}

function leer(texto: string, minima: string | null): LecturaDeAdaptador {
  const fallo = (
    motivo: Extract<LecturaDeAdaptador, { ok: false }>["motivo"],
    detalle: string,
  ): LecturaDeAdaptador => ({ ok: false, motivo, detalle });

  let bruto: unknown;
  try {
    bruto = JSON.parse(aJsonEstandar(texto)) as unknown;
  } catch {
    return fallo("no_es_el_formato", "el archivo no es JSON");
  }
  const lectura = Archivo.safeParse(bruto);
  if (!lectura.success) {
    const donde = lectura.error.issues[0]?.path.join(".") ?? "";
    return fallo(
      "no_es_el_formato",
      donde === ""
        ? "no es el log de una evaluación de Inspect (`inspect log dump`)"
        : `falta o es inválido: ${donde}`,
    );
  }
  const log = lectura.data;
  const version = log.eval.packages?.["inspect_ai"];
  if (version === undefined)
    return fallo(
      "campo_ausente",
      "falta eval.packages.inspect_ai: sin la versión no se compara con el rango probado",
    );
  if (minima !== null) {
    const c = compararVersiones(version, minima);
    if (c === null)
      return fallo(
        "version_no_comparable",
        `la versión «${version}» no se puede comparar con ${minima}`,
      );
    if (c < 0)
      return fallo(
        "version_menor_que_la_minima",
        `${version} es menor que ${minima}`,
      );
  }
  if (log.status !== "success")
    return fallo(
      "sin_resultados",
      `el log está en estado «${log.status}»: solo se lee un log terminado con éxito`,
    );
  const muestras = log.samples ?? [];
  if (muestras.length === 0)
    return fallo(
      "sin_resultados",
      "el log no trae muestras (¿se guardó solo el encabezado?)",
    );

  const advertencias: TextoBilingue[] = [];
  const completadas = log.results?.completed_samples;
  if (completadas !== undefined && completadas > muestras.length)
    advertencias.push(
      advertencia(
        `El log dice ${completadas} muestras completadas pero trae ${muestras.length}: revisa que no se haya recortado.`,
        `The log says ${completadas} samples completed but holds ${muestras.length}: check it was not trimmed.`,
      ),
    );
  const rango = ADAPTADOR_DE_INSPECT.rangoProbado;
  const desde = compararVersiones(version, rango.desde);
  const hasta = compararVersiones(version, rango.hasta);
  if (desde === null || hasta === null)
    advertencias.push(
      advertencia(
        `La versión «${version}» de Inspect no se puede comparar con la probada (${rango.desde}).`,
        `Inspect version “${version}” cannot be compared with the tested one (${rango.desde}).`,
      ),
    );
  else if (desde < 0 || hasta > 0)
    advertencias.push(
      advertencia(
        `Inspect ${version} está fuera del rango probado (${rango.desde}).`,
        `Inspect ${version} is outside the tested range (${rango.desde}).`,
      ),
    );

  const marca = log.eval.created;
  const m =
    marca === undefined
      ? null
      : /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(marca);
  if (m === null)
    advertencias.push(
      advertencia(
        "El log no trae una fecha legible en «eval.created»: la fecha de la corrida hay que darla al importar.",
        "The log has no readable date in “eval.created”: the run date must be given when importing.",
      ),
    );
  const tareas = new Set(
    [log.eval.task, log.eval.task_registry_name].filter(
      (t): t is string => typeof t === "string",
    ),
  );
  const corrida: Corrida = {
    herramienta: { id: "inspect", version },
    fecha: m?.[1] ?? null,
    hora: m?.[2] ?? null,
    zonaHoraria: m !== null && /(Z|\+00:00)$/.test(marca ?? "") ? "UTC" : null,
    advertencias,
    medir: (selector) => medirInspect(muestras, tareas, selector),
  };
  return { ok: true, corrida };
}

function medirInspect(
  muestras: readonly MuestraLeida[],
  tareas: ReadonlySet<string>,
  selector: Selector,
): MedidaDeSelector {
  if (selector.tipo !== "modulo") return { tipo: "no_aplica" };
  const suyas = tareas.has(selector.referencia) ? muestras : [];
  const lecturas = suyas.map(leerMuestra);
  const evaluadas = lecturas.filter((l) => l !== "sin_evaluar").length;
  const sinEvaluar = suyas.length - evaluadas;
  const parciales = lecturas.filter((l) => l === "parcial").length;
  const fallidas = lecturas.filter(
    (l) => l === "falla" || l === "parcial",
  ).length;
  const ejecutada = evaluadas > 0;

  const advertencias: TextoBilingue[] = [];
  if (suyas.length === 0)
    advertencias.push(
      advertencia(
        "La tarea de este log no es la de este selector: no se puede decir que la prueba se superó.",
        "This log's task is not this selector's: the test cannot be said to have passed.",
      ),
    );
  else if (!ejecutada)
    advertencias.push(
      advertencia(
        "Ninguna muestra de la tarea quedó evaluada (con error, sin puntuar o sin respuesta).",
        "No sample of the task ended up evaluated (error, unscored or no answer).",
      ),
    );
  if (sinEvaluar > 0 && ejecutada)
    advertencias.push(
      advertencia(
        `${sinEvaluar} muestra(s) con error, sin puntuar o sin respuesta no cuentan como evaluadas.`,
        `${sinEvaluar} sample(s) with an error, unscored or with no answer do not count as evaluated.`,
      ),
    );
  if (parciales > 0)
    advertencias.push(
      advertencia(
        `${parciales} muestra(s) con crédito parcial se cuentan como no resistidas.`,
        `${parciales} sample(s) with partial credit are counted as not resisted.`,
      ),
    );
  const extracto = ejecutada
    ? `Inspect · ${selector.referencia} · ${evaluadas} muestra${evaluadas === 1 ? "" : "s"} evaluada${evaluadas === 1 ? "" : "s"} · ${fallidas} no resistida${fallidas === 1 ? "" : "s"}${sinEvaluar > 0 ? ` · ${sinEvaluar} sin evaluar` : ""}`
    : `Inspect · ${selector.referencia} · sin muestras evaluadas`;
  return {
    tipo: "medido",
    resultado: {
      ejecutada,
      evaluadas: ejecutada ? evaluadas : null,
      fallidas: ejecutada ? fallidas : null,
      alertas: null,
      metrica: null,
    },
    extracto,
    advertencias,
  };
}

export const ADAPTADOR_DE_INSPECT: Adaptador = {
  id: "inspect-eval-log-json",
  version: "1.0.0",
  herramienta: "inspect",
  // El formato se fijó contra los tipos del tag 0.3.288; el sintético de pruebas lleva esa versión.
  rangoProbado: { desde: "0.3.288", hasta: "0.3.288" },
  leer,
};
