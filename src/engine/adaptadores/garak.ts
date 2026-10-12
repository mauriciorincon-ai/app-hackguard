// Adaptador de Garak: lee el `report.jsonl` de 0.17.0 (E-7). Lo único que hace es contar. Reglas del formato, medidas
// contra la salida real de garak (tests/fixtures/adaptadores/):
// - cada intento aparece dos veces: `status: 1` (enviado) y `status: 2` (evaluado, con `detector_results`). Solo se
//   cuentan los de `status: 2`; contar todas las líneas `attempt` duplica;
// - `detector_results[detector]` trae un puntaje por SALIDA del generador; una salida falla un detector si su puntaje es
//   ≥ el umbral. Una salida de la prueba falla según la agregación del selector (cualquier detector o todos);
// - el reporte NO trae el umbral (`eval_threshold`) ni versión de esquema (hallazgos 9 y 5 del spike). Se usa el 0,5 de
//   garak y se comprueba contra las líneas `eval`, que ya lo aplicaron: si los conteos recalculados no cuadran con los
//   suyos, el umbral de la corrida no fue ese y el lote NO se arma (no se adivina);
// - la versión de garak aparece en varios lugares y deben coincidir.
// El adaptador nunca decide el veredicto y nunca devuelve texto del reporte (prompts, salidas, disparadores).
import { z } from "zod";
import type { Resultado } from "../evidencia/esquemas.ts";
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

/** El umbral por omisión de garak (`run.eval_threshold`, `garak.core.yaml`): una salida con puntaje ≥ 0,5 falla. */
export const UMBRAL_DE_GARAK = 0.5;

const Puntajes = z.array(z.number().nullable());
const Intento = z.object({
  status: z.number(),
  probe_classname: z.string(),
  detector_results: z.record(z.string(), Puntajes),
});
const Eval = z.object({
  probe: z.string(),
  detector: z.string(),
  passed: z.number(),
  fails: z.number(),
  nones: z.number(),
});
const Init = z.object({ garak_version: z.string(), start_time: z.string() });

interface Evaluados {
  /** probe → detector → un puntaje por salida. */
  porProbe: Map<string, Map<string, (number | null)[]>>;
}

const FALLA = (p: number | null): boolean => p !== null && p >= UMBRAL_DE_GARAK;

const coincide = (clase: string, pedida: string): boolean =>
  clase === pedida || clase.startsWith(`${pedida}.`);

/** Versiones que el reporte escribe en sus distintos lugares, para comprobar que son la misma. */
function versionesEscritas(registros: Record<string, unknown>[]): string[] {
  const vs: string[] = [];
  for (const r of registros) {
    const v1 = r["_config.version"];
    if (typeof v1 === "string") vs.push(v1);
    const meta = r.meta;
    if (meta !== null && typeof meta === "object") {
      const g = (meta as Record<string, unknown>).garak_version;
      if (typeof g === "string") vs.push(g);
    }
    const cache = r.plugin_cache;
    if (cache !== null && typeof cache === "object") {
      const v = (cache as Record<string, unknown>).version;
      if (typeof v === "string") vs.push(v);
    }
  }
  return vs;
}

function leer(texto: string, minima: string | null): LecturaDeAdaptador {
  const fallo = (
    motivo: Extract<LecturaDeAdaptador, { ok: false }>["motivo"],
    detalle: string,
  ): LecturaDeAdaptador => ({ ok: false, motivo, detalle });

  const registros: Record<string, unknown>[] = [];
  for (const linea of texto.split("\n")) {
    if (linea.trim() === "") continue;
    try {
      const r: unknown = JSON.parse(linea);
      if (r === null || typeof r !== "object" || Array.isArray(r))
        return fallo("no_es_el_formato", "una línea no es un objeto JSON");
      registros.push(r as Record<string, unknown>);
    } catch {
      return fallo("no_es_el_formato", "una línea no es JSON");
    }
  }
  const tipo = (t: string) => registros.filter((r) => r.entry_type === t);

  const inicio = tipo("init")[0];
  if (inicio === undefined)
    return fallo("campo_ausente", "falta la línea «init» del reporte de garak");
  const init = Init.safeParse(inicio);
  if (!init.success)
    return fallo("campo_ausente", "«init» sin garak_version o start_time");
  const version = init.data.garak_version;

  const escritas = versionesEscritas(registros);
  if (escritas.some((v) => v !== version))
    return fallo(
      "version_incoherente",
      `garak_version dice ${version} y otro lugar del reporte dice ${escritas.find((v) => v !== version) ?? ""}`,
    );
  if (minima !== null) {
    const c = compararVersiones(version, minima);
    if (c === null)
      return fallo("version_no_comparable", `«${version}» frente a ${minima}`);
    if (c < 0)
      return fallo(
        "version_menor_que_la_minima",
        `${version} es menor que ${minima}`,
      );
  }

  // Los intentos evaluados, con un puntaje por salida y detector.
  const evaluados: Evaluados = { porProbe: new Map() };
  for (const crudo of tipo("attempt")) {
    const a = Intento.safeParse(crudo);
    if (!a.success)
      return fallo(
        "campo_ausente",
        `un intento sin ${a.error.issues[0]?.path.join(".") ?? "campos"}`,
      );
    if (a.data.status !== 2) continue;
    const detectores =
      evaluados.porProbe.get(a.data.probe_classname) ?? new Map();
    for (const [d, puntajes] of Object.entries(a.data.detector_results))
      detectores.set(d, [...(detectores.get(d) ?? []), ...puntajes]);
    evaluados.porProbe.set(a.data.probe_classname, detectores);
  }

  // El umbral no viaja en el reporte: se comprueba contra lo que garak ya contó en sus líneas `eval`.
  const evals = tipo("eval");
  if (evals.length === 0 && evaluados.porProbe.size === 0)
    return fallo("sin_resultados", "el reporte no trae intentos evaluados");
  for (const crudo of evals) {
    const e = Eval.safeParse(crudo);
    if (!e.success)
      return fallo("campo_ausente", "una línea «eval» sin sus conteos");
    const puntajes = evaluados.porProbe.get(e.data.probe)?.get(e.data.detector);
    if (puntajes === undefined)
      return fallo(
        "conteos_no_cuadran",
        `«eval» de ${e.data.probe} con ${e.data.detector} sin intentos que lo sostengan`,
      );
    const fails = puntajes.filter(FALLA).length;
    const nones = puntajes.filter((p) => p === null).length;
    const passed = puntajes.length - fails - nones;
    if (
      fails !== e.data.fails ||
      passed !== e.data.passed ||
      nones !== e.data.nones
    )
      return fallo(
        "conteos_no_cuadran",
        `${e.data.probe} con ${e.data.detector}: recalculado ${fails} fallan, ${passed} pasan, ${nones} nulos; garak dice ${e.data.fails}, ${e.data.passed}, ${e.data.nones}`,
      );
  }

  const advertencias: TextoBilingue[] = [
    advertencia(
      `El reporte no registra el umbral de la corrida: se usó ${String(UMBRAL_DE_GARAK).replace(".", ",")}, el de garak, y los conteos recalculados coinciden con los suyos.`,
      `The report does not record the run's threshold: ${UMBRAL_DE_GARAK}, garak's own, was used, and the recomputed counts match its own.`,
    ),
  ];
  const rango = ADAPTADOR_DE_GARAK.rangoProbado;
  if (
    compararVersiones(version, rango.desde) === -1 ||
    compararVersiones(version, rango.hasta) === 1 ||
    compararVersiones(version, rango.desde) === null
  )
    advertencias.push(
      advertencia(
        `garak ${version} está fuera del rango probado (${rango.desde}).`,
        `garak ${version} is outside the tested range (${rango.desde}).`,
      ),
    );

  const [fecha = null, resto = ""] = init.data.start_time.split("T");
  const hora = /^\d{2}:\d{2}/.exec(resto)?.[0] ?? null;
  const corrida: Corrida = {
    herramienta: { id: "garak", version },
    fecha: fecha !== null && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    hora,
    // garak escribe la hora local sin zona: la zona la dice quien importa.
    zonaHoraria: null,
    advertencias,
    medir: (selector) => medirGarak(evaluados, selector),
  };
  return { ok: true, corrida };
}

function medirGarak(
  evaluados: Evaluados,
  selector: Selector,
): MedidaDeSelector {
  if (selector.tipo !== "garak") return { tipo: "no_aplica" };
  const todas: (number | null)[][] = [];
  const probes = new Set<string>();
  for (const [clase, detectores] of evaluados.porProbe) {
    if (!selector.probes.some((p) => coincide(clase, p))) continue;
    const elegidos = selector.detectores.filter((d) => detectores.has(d));
    if (elegidos.length === 0) continue;
    probes.add(clase);
    const largo = Math.max(
      ...elegidos.map((d) => (detectores.get(d) ?? []).length),
    );
    for (let i = 0; i < largo; i += 1)
      todas.push(elegidos.map((d) => detectores.get(d)?.[i] ?? null));
  }
  const evaluadas = todas.filter((p) =>
    selector.agregacion === "cualquier_detector"
      ? p.some((x) => x !== null)
      : p.length === selector.detectores.length && p.every((x) => x !== null),
  );
  const fallidas = evaluadas.filter((p) =>
    selector.agregacion === "cualquier_detector"
      ? p.some(FALLA)
      : p.every(FALLA),
  ).length;

  const ejecutada = probes.size > 0 && evaluadas.length > 0;
  const resultado: Resultado = ejecutada
    ? {
        ejecutada: true,
        evaluadas: evaluadas.length,
        fallidas,
        alertas: null,
        metrica: null,
      }
    : {
        ejecutada: false,
        evaluadas: null,
        fallidas: null,
        alertas: null,
        metrica: null,
      };
  const extracto = ejecutada
    ? `garak · ${probes.size} probe${probes.size === 1 ? "" : "s"} del selector (${selector.probes.join(", ")}) · detectores ${selector.detectores.join(", ")} · ${evaluadas.length} salidas evaluadas · ${fallidas} fallan · umbral ${String(UMBRAL_DE_GARAK)}`
    : `garak · el reporte no trae el selector (${selector.probes.join(", ")} con ${selector.detectores.join(", ")}): no hay constancia de que corrió`;
  const advertencias: TextoBilingue[] = ejecutada
    ? []
    : [
        advertencia(
          "El reporte no trae ninguna salida evaluada para este selector: no hay constancia de que la prueba corrió.",
          "The report carries no evaluated output for this selector: there is no proof that the test ran.",
        ),
      ];
  return { tipo: "medido", resultado, extracto, advertencias };
}

export const ADAPTADOR_DE_GARAK: Adaptador = {
  id: "garak-report-jsonl",
  version: "1.0.0",
  herramienta: "garak",
  rangoProbado: { desde: "0.17.0", hasta: "0.17.0" },
  leer,
};
