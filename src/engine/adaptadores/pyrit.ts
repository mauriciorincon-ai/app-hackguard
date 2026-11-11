// Adaptador de PyRIT: lee los resultados puntuados de un escenario, `ScenarioResult.model_dump(mode="json")` (S12, D10).
// Formato citado por su fuente, no por memoria (repo oficial: https://github.com/microsoft/PyRIT, antes Azure/PyRIT, archivado):
// - https://github.com/microsoft/PyRIT/blob/v1.1.0/pyrit/models/results/scenario_result.py@v1.1.0 (`ScenarioResult`: `attack_results`
//   es `dict[str, list[AttackResult]]`; `model_dump` añade el campo calculado `pyrit_version`);
// - https://github.com/microsoft/PyRIT/blob/v1.1.0/pyrit/models/results/attack_result.py@v1.1.0 (`AttackResult`: `outcome`
//   ∈ {success, failure, error, undetermined}, `last_score`);
// - https://github.com/microsoft/PyRIT/blob/v1.1.0/pyrit/models/score/score.py@v1.1.0 (`Score`: `score_type`, `score_value` como
//   texto, `status` complete | undetermined, `score_category`).
// Límite declarado: v1.1.0 NO trae un exportador de archivo de puntajes (no hay `memory_exporter.py` en ese tag) ni un ejemplo
// oficial de este JSON: el archivo que se lee es el volcado del objeto oficial, y la fixture de pruebas es sintética.
// Reglas del formato:
// - `outcome` es DATO de la herramienta, nunca el veredicto: aquí solo se cuentan ataques y el veredicto lo calcula la regla de
//   la prueba (ADR-008). `success` significa que el ataque logró su objetivo: el control FALLÓ; `failure`, que resistió;
//   `error` y `undetermined` no evaluaron nada y no cuentan ni como superados ni como fallidos;
// - un ataque pertenece al selector `modulo.referencia` si esa referencia es la clave de su grupo en `attack_results` (el nombre
//   del ataque atómico) o una de las `score_category` de su último puntaje;
// - el puntaje es otro dato: si contradice al `outcome` (un puntaje true_false «true» con `failure`) solo se avisa;
// - la versión de la herramienta es `pyrit_version` (obligatoria: sin ella no se compara con el rango probado);
// - el objetivo, la conversación, el motivo del juez (`score_rationale`), los metadatos y la identidad del evaluador (con sus
//   prompts de sistema y rúbricas) son material sensible (reglas duras 3 y 4): el esquema de lectura los descarta.
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

/** `AttackOutcome` del tipo oficial. */
const RESULTADOS = ["success", "failure", "error", "undetermined"] as const;

// `z.object` descarta lo que no se declara: el objetivo, la respuesta y la justificación del juez nunca salen de aquí.
const Puntaje = z.object({
  score_type: z.string().optional(),
  score_value: z.string().nullish(),
  status: z.string().optional(),
  score_category: z.array(z.string()).nullish(),
});
const Ataque = z.object({
  outcome: z.enum(RESULTADOS),
  last_score: Puntaje.nullish(),
});
const Archivo = z.object({
  pyrit_version: z.string().optional(),
  scenario_run_state: z.string().optional(),
  creation_time: z.string().nullish(),
  completion_time: z.string().nullish(),
  attack_results: z.record(z.string(), z.array(Ataque)),
});
type AtaqueLeido = z.infer<typeof Ataque>;

interface Fila {
  grupo: string;
  ataque: AtaqueLeido;
}

/** El puntaje dice «el objetivo se logró» (true_false «true»)? null si no se puede saber. */
function puntajeDiceLogrado(p: AtaqueLeido["last_score"]): boolean | null {
  if (p === null || p === undefined) return null;
  if (p.status === "undetermined" || p.score_type !== "true_false") return null;
  const v = p.score_value?.toLowerCase();
  return v === "true" ? true : v === "false" ? false : null;
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
        ? "no es el resultado de un escenario de PyRIT (`ScenarioResult`)"
        : `falta o es inválido: ${donde}`,
    );
  }
  const archivo = lectura.data;
  const version = archivo.pyrit_version;
  if (version === undefined)
    return fallo(
      "campo_ausente",
      "falta pyrit_version: sin la versión no se compara con el rango probado",
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
  const filas: Fila[] = Object.entries(archivo.attack_results).flatMap(
    ([grupo, ataques]) => ataques.map((ataque) => ({ grupo, ataque })),
  );
  if (filas.length === 0)
    return fallo("sin_resultados", "el escenario no trae ningún ataque");

  const advertencias: TextoBilingue[] = [];
  const rango = ADAPTADOR_DE_PYRIT.rangoProbado;
  const desde = compararVersiones(version, rango.desde);
  const hasta = compararVersiones(version, rango.hasta);
  if (desde === null || hasta === null)
    advertencias.push(
      advertencia(
        `La versión «${version}» de PyRIT no se puede comparar con la probada (${rango.desde}).`,
        `PyRIT version “${version}” cannot be compared with the tested one (${rango.desde}).`,
      ),
    );
  else if (desde < 0 || hasta > 0)
    advertencias.push(
      advertencia(
        `PyRIT ${version} está fuera del rango probado (${rango.desde}).`,
        `PyRIT ${version} is outside the tested range (${rango.desde}).`,
      ),
    );
  const estado = archivo.scenario_run_state;
  if (estado !== undefined && estado !== "COMPLETED")
    advertencias.push(
      advertencia(
        `El escenario terminó en estado «${estado}», no «COMPLETED»: pueden faltar ataques.`,
        `The scenario ended in state “${estado}”, not “COMPLETED”: attacks may be missing.`,
      ),
    );

  const marca = archivo.completion_time ?? archivo.creation_time ?? undefined;
  const m =
    marca === undefined
      ? null
      : /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(marca);
  if (m === null)
    advertencias.push(
      advertencia(
        "El archivo no trae una fecha legible en «completion_time» ni «creation_time»: la fecha de la corrida hay que darla al importar.",
        "The file has no readable date in “completion_time” or “creation_time”: the run date must be given when importing.",
      ),
    );
  const corrida: Corrida = {
    herramienta: { id: "pyrit", version },
    fecha: m?.[1] ?? null,
    hora: m?.[2] ?? null,
    zonaHoraria: m !== null && /(Z|\+00:00)$/.test(marca ?? "") ? "UTC" : null,
    advertencias,
    medir: (selector) => medirPyrit(filas, selector),
  };
  return { ok: true, corrida };
}

function medirPyrit(
  filas: readonly Fila[],
  selector: Selector,
): MedidaDeSelector {
  if (selector.tipo !== "modulo") return { tipo: "no_aplica" };
  const suyas = filas.filter(
    (f) =>
      f.grupo === selector.referencia ||
      (f.ataque.last_score?.score_category ?? []).includes(selector.referencia),
  );
  const sinEvaluar = suyas.filter(
    (f) => f.ataque.outcome === "error" || f.ataque.outcome === "undetermined",
  );
  const evaluadas = suyas.length - sinEvaluar.length;
  const fallidas = suyas.filter((f) => f.ataque.outcome === "success").length;
  const ejecutada = evaluadas > 0;
  const incoherentes = suyas.filter((f) => {
    const dice = puntajeDiceLogrado(f.ataque.last_score);
    return (
      dice !== null &&
      ((f.ataque.outcome === "failure" && dice) ||
        (f.ataque.outcome === "success" && !dice))
    );
  }).length;

  const advertencias: TextoBilingue[] = [];
  if (suyas.length === 0)
    advertencias.push(
      advertencia(
        "Ningún ataque del archivo corresponde a este selector: no se puede decir que la prueba se superó.",
        "No attack in the file matches this selector: the test cannot be said to have passed.",
      ),
    );
  else if (!ejecutada)
    advertencias.push(
      advertencia(
        "Todos los ataques de este selector terminaron en error o sin determinar: ninguno se evaluó.",
        "Every attack for this selector ended in error or undetermined: none was evaluated.",
      ),
    );
  if (sinEvaluar.length > 0 && ejecutada)
    advertencias.push(
      advertencia(
        `${sinEvaluar.length} ataque(s) terminaron en error o sin determinar y no cuentan como evaluados.`,
        `${sinEvaluar.length} attack(s) ended in error or undetermined and do not count as evaluated.`,
      ),
    );
  if (incoherentes > 0)
    advertencias.push(
      advertencia(
        `${incoherentes} ataque(s) tienen un puntaje que contradice su resultado: se cuenta el resultado; revisa el archivo.`,
        `${incoherentes} attack(s) have a score that contradicts their outcome: the outcome is counted; check the file.`,
      ),
    );
  const extracto = ejecutada
    ? `PyRIT · ${selector.referencia} · ${evaluadas} evaluado${evaluadas === 1 ? "" : "s"} · ${fallidas} con objetivo logrado${sinEvaluar.length > 0 ? ` · ${sinEvaluar.length} sin evaluar` : ""}`
    : `PyRIT · ${selector.referencia} · sin ataques evaluados`;
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

export const ADAPTADOR_DE_PYRIT: Adaptador = {
  id: "pyrit-scenario-result-json",
  version: "1.0.0",
  herramienta: "pyrit",
  // El formato se fijó contra los tipos del tag v1.1.0; el sintético de pruebas lleva esa versión.
  rangoProbado: { desde: "1.1.0", hasta: "1.1.0" },
  leer,
};
