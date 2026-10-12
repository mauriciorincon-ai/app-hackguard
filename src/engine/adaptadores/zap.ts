// Adaptador de ZAP: lee el «Traditional JSON» de ZAP (E-6, hallazgos 7 y 8 del spike). Reglas del formato:
// - casi todo viaja como CADENA (`pluginid`, `riskcode`, `confidence`, `count`): se aceptan cadena o número;
// - el reporte solo lista las alertas levantadas, no las reglas que corrieron. Que una regla no haya levantado nada NO
//   prueba que corrió: sin constancia de ejecución el sobre es `no_ejecutada`, jamás `superada` (E-6/E-7);
// - la constancia es lo que ZAP registra de sus reglas: las estadísticas de la variante «con peticiones y respuestas»
//   (add-on reports 0.39.0), `stats.pscan.<id>.time` / `stats.ascan.<id>.started|urls|time` (internal-statistics, ZAP
//   2.11.0), o que la regla levantó alguna alerta. Sin estadísticas, ninguna regla sin alerta se da por ejecutada;
// - `confidence` «0» es falso positivo: no cuenta como alerta (pero la regla corrió);
// - el campo `attack` de cada instancia, `evidence`, y en la variante «plus» los encabezados y cuerpos de petición y
//   respuesta son material sensible (regla dura 3): el esquema de lectura los descarta (`instances` solo se cuenta).
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

const Numerico = z.union([z.string(), z.number()]);
// `z.object` descarta lo que no se declara: `attack`, `evidence` y los cuerpos nunca salen de aquí.
const Alerta = z.object({
  pluginid: Numerico,
  riskcode: Numerico,
  confidence: Numerico,
  instances: z.array(z.object({})).optional(),
});
const Estadisticas = z.record(z.string(), z.unknown());
const Sitio = z.object({
  alerts: z.array(Alerta),
  statistics: Estadisticas.optional(),
});
const Reporte = z.object({
  "@programName": z.string().optional(),
  "@version": z.string(),
  created: z.string().optional(),
  site: z.array(Sitio),
  statistics: Estadisticas.optional(),
  afPlanErrors: z.array(z.unknown()).optional(),
  afPlanWarns: z.array(z.unknown()).optional(),
});

const entero = (v: string | number): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) ? n : null;
};

/** Las claves de estadísticas por regla que ZAP escribe y que sirven de constancia de ejecución. */
const CLAVE_DE_REGLA =
  /^stats\.(?:pscan|ascan)\.(\d+)\.(?:time|started|urls|alerts)$/;

function reglasConConstancia(
  estadisticas: readonly Record<string, unknown>[],
): Set<number> {
  const corridas = new Set<number>();
  for (const e of estadisticas)
    for (const [clave, valor] of Object.entries(e)) {
      const m = CLAVE_DE_REGLA.exec(clave);
      const n = typeof valor === "number" ? valor : Number(valor);
      if (m !== null && Number.isFinite(n) && n > 0) corridas.add(Number(m[1]));
    }
  return corridas;
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
  const lectura = Reporte.safeParse(bruto);
  if (!lectura.success) {
    const donde = lectura.error.issues[0]?.path.join(".") ?? "";
    return fallo(
      donde === "@version" || donde === "site"
        ? "campo_ausente"
        : "no_es_el_formato",
      donde === ""
        ? "no es un reporte Traditional JSON de ZAP"
        : `falta o es inválido: ${donde}`,
    );
  }
  const r = lectura.data;
  const version = r["@version"];
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

  const alertas = r.site.flatMap((s) => s.alerts);
  const constancia = reglasConConstancia([
    ...(r.statistics ? [r.statistics] : []),
    ...r.site.flatMap((s) => (s.statistics ? [s.statistics] : [])),
  ]);
  const hayEstadisticas = constancia.size > 0;

  const advertencias: TextoBilingue[] = [];
  if (!hayEstadisticas)
    advertencias.push(
      advertencia(
        "El reporte no trae estadísticas de ejecución por regla: una regla sin alertas queda «no ejecutada», no «superada».",
        "The report carries no per-rule execution statistics: a rule with no alerts is “not run”, not “passed”.",
      ),
    );
  if ((r.afPlanErrors?.length ?? 0) > 0)
    advertencias.push(
      advertencia(
        `El plan de automatización reportó ${r.afPlanErrors?.length ?? 0} error(es): revisa que cubrió el alcance.`,
        `The automation plan reported ${r.afPlanErrors?.length ?? 0} error(s): check that it covered the scope.`,
      ),
    );
  if ((r.afPlanWarns?.length ?? 0) > 0)
    advertencias.push(
      advertencia(
        `El plan de automatización reportó ${r.afPlanWarns?.length ?? 0} aviso(s).`,
        `The automation plan reported ${r.afPlanWarns?.length ?? 0} warning(s).`,
      ),
    );
  if (r["@programName"] === undefined)
    advertencias.push(
      advertencia(
        "El reporte no trae «@programName» (add-on de reportes anterior a 0.17.0).",
        "The report has no “@programName” (reports add-on older than 0.17.0).",
      ),
    );

  const creado = r.created;
  const m =
    creado === undefined
      ? null
      : /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(creado);
  if (creado === undefined)
    advertencias.push(
      advertencia(
        "El reporte no trae «created»: la fecha de la corrida hay que darla al importar.",
        "The report has no “created”: the run date must be given when importing.",
      ),
    );
  const corrida: Corrida = {
    herramienta: { id: "zap", version },
    fecha: m?.[1] ?? null,
    hora: m?.[2] ?? null,
    // `created` va en UTC (add-on reports 0.41.0); `@generated` no declara zona y no se usa.
    zonaHoraria: m !== null && creado?.endsWith("Z") ? "UTC" : null,
    advertencias,
    medir: (selector) => medirZap(alertas, constancia, selector),
  };
  return { ok: true, corrida };
}

function medirZap(
  alertas: readonly z.infer<typeof Alerta>[],
  constancia: ReadonlySet<number>,
  selector: Selector,
): MedidaDeSelector {
  if (selector.tipo !== "zap") return { tipo: "no_aplica" };
  const ids = new Set(selector.pluginids);
  const suyas = alertas.filter((a) => {
    const id = entero(a.pluginid);
    return id !== null && ids.has(id);
  });
  const reales = suyas.filter((a) => entero(a.confidence) !== 0);
  const falsosPositivos = suyas.length - reales.length;
  const levantan = new Set(reales.map((a) => entero(a.pluginid)));
  const corrieron = new Set([
    ...constancia,
    ...suyas.map((a) => entero(a.pluginid)),
  ]);

  // Sin constancia de TODAS las reglas del selector no hay base para decir «no hubo alertas»: si alguna levantó una
  // alerta, esa falla se ve igual (cualquier_regla); si nadie levantó nada, solo cuenta con constancia de todas.
  const todasCorrieron = selector.pluginids.every((id) => corrieron.has(id));
  const alertasQueCuentan =
    selector.agregacion === "cualquier_regla"
      ? reales.length
      : selector.pluginids.every((id) => levantan.has(id))
        ? reales.length
        : 0;
  const ejecutada =
    selector.agregacion === "cualquier_regla"
      ? reales.length > 0 || todasCorrieron
      : todasCorrieron;

  const instancias = reales.reduce((n, a) => n + (a.instances?.length ?? 0), 0);
  const riesgo = reales.reduce(
    (m, a) => Math.max(m, entero(a.riskcode) ?? 0),
    0,
  );
  const advertencias: TextoBilingue[] = [];
  if (falsosPositivos > 0)
    advertencias.push(
      advertencia(
        `${falsosPositivos} alerta(s) de confianza 0 (falso positivo según ZAP) no cuentan.`,
        `${falsosPositivos} alert(s) with confidence 0 (a false positive according to ZAP) do not count.`,
      ),
    );
  if (!ejecutada)
    advertencias.push(
      advertencia(
        "Sin alertas y sin constancia de que la regla corrió: no se puede decir que la prueba se superó.",
        "No alerts and no proof that the rule ran: the test cannot be said to have passed.",
      ),
    );
  const extracto = ejecutada
    ? `zap · pluginid ${selector.pluginids.join(", ")} · ${alertasQueCuentan} alerta${alertasQueCuentan === 1 ? "" : "s"} · ${instancias} instancia${instancias === 1 ? "" : "s"} · riesgo máximo ${riesgo}${alertasQueCuentan === 0 ? " · constancia de ejecución en las estadísticas" : ""}`
    : `zap · pluginid ${selector.pluginids.join(", ")} · sin alertas y sin constancia de ejecución`;
  return {
    tipo: "medido",
    resultado: {
      ejecutada,
      evaluadas: null,
      fallidas: null,
      alertas: ejecutada ? alertasQueCuentan : null,
      metrica: null,
    },
    extracto,
    advertencias,
  };
}

export const ADAPTADOR_DE_ZAP: Adaptador = {
  id: "zap-traditional-json",
  version: "1.0.0",
  herramienta: "zap",
  // La salida oficial de prueba (zap-extensions@a7f2fcf) trae «Dev Build»; las derivadas llevan 2.17.0.
  rangoProbado: { desde: "2.17.0", hasta: "2.17.0" },
  leer,
};
