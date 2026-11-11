// Adaptador de promptfoo: lee el archivo que escribe `promptfoo eval -o <archivo>.json` (S12, D8). Formato oficial citado
// por su fuente, no por memoria: https://github.com/promptfoo/promptfoo/blob/0.123.1/src/types/index.ts@0.123.1
// (`OutputFile`, `EvaluateSummaryV3`, `EvaluateResult`, `GradingResult`, `ResultFailureReason`). Reglas del formato:
// - la raíz es `{ evalId, results, config, shareableUrl, metadata? }` y `results` es el resumen V3 (`version: 3`, `timestamp`,
//   `results[]`, `stats`). La sección JSON de `site/docs/configuration/outputs.md@0.123.1` no coincide con los tipos
//   (muestra `outputs` y `providers`, que V3 no tiene): se sigue el tipo, no esa página;
// - cada fila de `results[]` trae `success`, `score` y `failureReason` numérico (0 sin falla · 1 una aserción rechazó el caso ·
//   2 error de la corrida). Una fila con error NO evaluó nada: no cuenta ni como superada ni como fallida;
// - `success` y `score` son DATO de la herramienta, nunca el veredicto: aquí solo se cuentan filas y el veredicto lo calcula la
//   regla de la prueba (ADR-008);
// - una fila pertenece al selector `modulo.referencia` si su `pluginId` (red team: `gradingResult.metadata` o
//   `testCase.metadata`) o el `type` de alguna de sus aserciones es esa referencia;
// - la versión de la herramienta es `metadata.promptfooVersion` (opcional en el tipo, obligatoria aquí: sin ella no se puede
//   comparar con el rango probado). Sin filas el sobre es `no_ejecutada`, jamás `superada`;
// - el prompt, las variables, la respuesta del modelo, el motivo del evaluador y la configuración (cargas de ataque, claves
//   de proveedores) son material sensible (reglas duras 3 y 4): el esquema de lectura los descarta, solo salen conteos.
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

/** `ResultFailureReason` del tipo oficial: 0 NONE · 1 ASSERT · 2 ERROR. */
const FALLA_POR_ERROR = 2;

// `z.object` descarta lo que no se declara: el prompt, las variables y la respuesta nunca salen de aquí.
const Aserciones = z.array(z.object({ type: z.string() })).optional();
const Fila = z.object({
  success: z.boolean(),
  score: z.number().optional(),
  failureReason: z.number().int().optional(),
  gradingResult: z
    .object({
      assertion: z.object({ type: z.string() }).nullish(),
      componentResults: z
        .array(
          z.object({ assertion: z.object({ type: z.string() }).nullish() }),
        )
        .optional(),
      metadata: z.object({ pluginId: z.string().optional() }).nullish(),
    })
    .nullish(),
  testCase: z
    .object({
      assert: Aserciones,
      metadata: z.object({ pluginId: z.string().optional() }).nullish(),
    })
    .nullish(),
});
const Archivo = z.object({
  results: z.object({
    version: z.literal(3),
    timestamp: z.string().optional(),
    results: z.array(Fila),
    stats: z
      .object({
        successes: z.number(),
        failures: z.number(),
        errors: z.number(),
      })
      .optional(),
  }),
  metadata: z.object({ promptfooVersion: z.string().optional() }).optional(),
});
type FilaLeida = z.infer<typeof Fila>;

/** Los identificadores con los que una fila puede ser pedida por un selector: su plugin y los tipos de sus aserciones. */
function etiquetasDe(f: FilaLeida): Set<string> {
  const e = new Set<string>();
  const plugin =
    f.gradingResult?.metadata?.pluginId ?? f.testCase?.metadata?.pluginId;
  if (plugin !== undefined) e.add(plugin);
  const tipo = f.gradingResult?.assertion?.type;
  if (tipo !== undefined) e.add(tipo);
  for (const c of f.gradingResult?.componentResults ?? []) {
    const t = c.assertion?.type;
    if (t !== undefined) e.add(t);
  }
  for (const a of f.testCase?.assert ?? []) e.add(a.type);
  return e;
}

function leer(texto: string, minima: string | null): LecturaDeAdaptador {
  const fallo = (
    motivo: Extract<LecturaDeAdaptador, { ok: false }>["motivo"],
    detalle: string,
  ): LecturaDeAdaptador => ({ ok: false, motivo, detalle });

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto) as unknown;
  } catch {
    return fallo("no_es_el_formato", "el archivo no es JSON");
  }
  const lectura = Archivo.safeParse(bruto);
  if (!lectura.success) {
    const donde = lectura.error.issues[0]?.path.join(".") ?? "";
    return fallo(
      "no_es_el_formato",
      donde === ""
        ? "no es el archivo de salida de promptfoo (`promptfoo eval -o`)"
        : donde === "results.version"
          ? "solo se lee el resumen V3 de promptfoo (`results.version: 3`)"
          : `falta o es inválido: ${donde}`,
    );
  }
  const { results: resumen, metadata } = lectura.data;
  const version = metadata?.promptfooVersion;
  if (version === undefined)
    return fallo(
      "campo_ausente",
      "falta metadata.promptfooVersion: sin la versión no se compara con el rango probado",
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
  if (resumen.results.length === 0)
    return fallo(
      "sin_resultados",
      "el archivo no trae ninguna fila de resultados",
    );

  const advertencias: TextoBilingue[] = [];
  const s = resumen.stats;
  if (
    s !== undefined &&
    s.successes + s.failures + s.errors !== resumen.results.length
  )
    advertencias.push(
      advertencia(
        `Las estadísticas del archivo (${s.successes} + ${s.failures} + ${s.errors}) no suman sus ${resumen.results.length} filas: revisa que no se haya editado.`,
        `The file's stats (${s.successes} + ${s.failures} + ${s.errors}) do not add up to its ${resumen.results.length} rows: check it was not edited.`,
      ),
    );
  const rango = ADAPTADOR_DE_PROMPTFOO.rangoProbado;
  const desde = compararVersiones(version, rango.desde);
  const hasta = compararVersiones(version, rango.hasta);
  if (desde === null || hasta === null)
    advertencias.push(
      advertencia(
        `La versión «${version}» de promptfoo no se puede comparar con la probada (${rango.desde}).`,
        `promptfoo version “${version}” cannot be compared with the tested one (${rango.desde}).`,
      ),
    );
  else if (desde < 0 || hasta > 0)
    advertencias.push(
      advertencia(
        `promptfoo ${version} está fuera del rango probado (${rango.desde}).`,
        `promptfoo ${version} is outside the tested range (${rango.desde}).`,
      ),
    );

  const marca = resumen.timestamp;
  const m =
    marca === undefined
      ? null
      : /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(marca);
  if (m === null)
    advertencias.push(
      advertencia(
        "El archivo no trae una marca de tiempo legible en «results.timestamp»: la fecha de la corrida hay que darla al importar.",
        "The file has no readable timestamp in “results.timestamp”: the run date must be given when importing.",
      ),
    );
  const corrida: Corrida = {
    herramienta: { id: "promptfoo", version },
    fecha: m?.[1] ?? null,
    hora: m?.[2] ?? null,
    zonaHoraria: m !== null && marca?.endsWith("Z") ? "UTC" : null,
    advertencias,
    medir: (selector) => medirPromptfoo(resumen.results, selector),
  };
  return { ok: true, corrida };
}

function medirPromptfoo(
  filas: readonly FilaLeida[],
  selector: Selector,
): MedidaDeSelector {
  if (selector.tipo !== "modulo") return { tipo: "no_aplica" };
  const suyas = filas.filter((f) => etiquetasDe(f).has(selector.referencia));
  const conError = suyas.filter((f) => f.failureReason === FALLA_POR_ERROR);
  const evaluadas = suyas.length - conError.length;
  const fallidas = suyas.filter(
    (f) => f.failureReason !== FALLA_POR_ERROR && !f.success,
  ).length;
  const ejecutada = evaluadas > 0;

  const advertencias: TextoBilingue[] = [];
  if (suyas.length === 0)
    advertencias.push(
      advertencia(
        "Ninguna fila del archivo corresponde a este selector: no se puede decir que la prueba se superó.",
        "No row in the file matches this selector: the test cannot be said to have passed.",
      ),
    );
  else if (!ejecutada)
    advertencias.push(
      advertencia(
        "Todas las filas de este selector terminaron en error de la corrida: ninguna se evaluó.",
        "Every row for this selector ended in a run error: none was evaluated.",
      ),
    );
  if (conError.length > 0 && ejecutada)
    advertencias.push(
      advertencia(
        `${conError.length} fila(s) terminaron en error de la corrida y no cuentan como evaluadas.`,
        `${conError.length} row(s) ended in a run error and do not count as evaluated.`,
      ),
    );
  const extracto = ejecutada
    ? `promptfoo · ${selector.referencia} · ${evaluadas} evaluada${evaluadas === 1 ? "" : "s"} · ${fallidas} fallida${fallidas === 1 ? "" : "s"}${conError.length > 0 ? ` · ${conError.length} con error de la corrida` : ""}`
    : `promptfoo · ${selector.referencia} · sin filas evaluadas`;
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

export const ADAPTADOR_DE_PROMPTFOO: Adaptador = {
  id: "promptfoo-eval-json",
  version: "1.0.0",
  herramienta: "promptfoo",
  // El formato se fijó contra los tipos del tag 0.123.1; el sintético de pruebas lleva esa versión.
  rangoProbado: { desde: "0.123.1", hasta: "0.123.1" },
  leer,
};
