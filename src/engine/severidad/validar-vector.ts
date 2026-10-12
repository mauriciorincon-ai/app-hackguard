// Validador estricto de vectores CVSS 4.0 (G-Plan P2, regla dura 7). Va ANTES de la calculadora de FIRST, que acepta
// lo que no debería: un vector truncado (`CVSS:4.0/AV:N` da 0.0, uno al que le falta SA da 9.3) y da un número como si
// fuera una medida. Aquí un vector entra completo, en el orden de la Tabla 23 de la especificación, sin repetir, sin
// segmentos vacíos y con los valores exactos (mayúsculas), o no entra.
//
// La tabla de métricas es PROPIA (no se lee de la de FIRST) para que el validador siga siendo un control aparte; un
// test comprueba que coincide, clave a clave y valor a valor, con `expectedMetricOrder` del código de FIRST fijado.

/** Las 11 métricas base: obligatorias y sin «X». */
export const METRICAS_BASE = [
  ["AV", ["N", "A", "L", "P"]],
  ["AC", ["L", "H"]],
  ["AT", ["N", "P"]],
  ["PR", ["N", "L", "H"]],
  ["UI", ["N", "P", "A"]],
  ["VC", ["H", "L", "N"]],
  ["VI", ["H", "L", "N"]],
  ["VA", ["H", "L", "N"]],
  ["SC", ["H", "L", "N"]],
  ["SI", ["H", "L", "N"]],
  ["SA", ["H", "L", "N"]],
] as const satisfies readonly (readonly [string, readonly string[]])[];

/** Amenaza (1), entorno (14) y suplementarias (6): opcionales; «X» = no definida. */
export const METRICAS_OPCIONALES = [
  ["E", ["X", "A", "P", "U"]],
  ["CR", ["X", "H", "M", "L"]],
  ["IR", ["X", "H", "M", "L"]],
  ["AR", ["X", "H", "M", "L"]],
  ["MAV", ["X", "N", "A", "L", "P"]],
  ["MAC", ["X", "L", "H"]],
  ["MAT", ["X", "N", "P"]],
  ["MPR", ["X", "N", "L", "H"]],
  ["MUI", ["X", "N", "P", "A"]],
  ["MVC", ["X", "H", "L", "N"]],
  ["MVI", ["X", "H", "L", "N"]],
  ["MVA", ["X", "H", "L", "N"]],
  ["MSC", ["X", "H", "L", "N"]],
  ["MSI", ["X", "S", "H", "L", "N"]],
  ["MSA", ["X", "S", "H", "L", "N"]],
  ["S", ["X", "N", "P"]],
  ["AU", ["X", "N", "Y"]],
  ["R", ["X", "A", "U", "I"]],
  ["V", ["X", "D", "C"]],
  ["RE", ["X", "L", "M", "H"]],
  ["U", ["X", "Clear", "Green", "Amber", "Red"]],
] as const satisfies readonly (readonly [string, readonly string[]])[];

/** Las 32 métricas en el orden en que un vector las escribe. */
export const METRICAS_DE_CVSS: readonly (readonly [
  string,
  readonly string[],
])[] = [...METRICAS_BASE, ...METRICAS_OPCIONALES];

export const PREFIJO_DE_CVSS = "CVSS:4.0/";

export const MOTIVOS_DE_VECTOR_INVALIDO = [
  "prefijo",
  "segmento_vacio",
  "sin_valor",
  "metrica_desconocida",
  "metrica_duplicada",
  "fuera_de_orden",
  "valor_invalido",
  "base_incompleta",
] as const;
export type MotivoDeVectorInvalido =
  (typeof MOTIVOS_DE_VECTOR_INVALIDO)[number];

export interface MetricaDeVector {
  clave: string;
  valor: string;
}

export type ResultadoDeValidacionDeVector =
  | {
      ok: true;
      /** Las 32 métricas, con «X» en las que el vector no define: lo que la calculadora de FIRST espera. */
      seleccion: Record<string, string>;
      /** Las que el vector escribe, en su orden. */
      presentes: MetricaDeVector[];
    }
  | { ok: false; motivo: MotivoDeVectorInvalido; detalle: string };

const falla = (
  motivo: MotivoDeVectorInvalido,
  detalle: string,
): ResultadoDeValidacionDeVector => ({ ok: false, motivo, detalle });

export function validarVector(vector: string): ResultadoDeValidacionDeVector {
  if (!vector.startsWith(PREFIJO_DE_CVSS)) return falla("prefijo", vector);
  const partes = vector.slice(PREFIJO_DE_CVSS.length).split("/");
  const presentes: MetricaDeVector[] = [];
  const vistas = new Set<string>();
  let ultimo = -1;
  for (const parte of partes) {
    if (parte === "") return falla("segmento_vacio", vector);
    const corte = parte.indexOf(":");
    const clave = corte < 0 ? parte : parte.slice(0, corte);
    const valor = corte < 0 ? "" : parte.slice(corte + 1);
    if (valor === "" || valor.includes(":")) return falla("sin_valor", parte);
    const indice = METRICAS_DE_CVSS.findIndex(([k]) => k === clave);
    if (indice < 0) return falla("metrica_desconocida", clave);
    if (vistas.has(clave)) return falla("metrica_duplicada", clave);
    if (indice < ultimo) return falla("fuera_de_orden", clave);
    if (!METRICAS_DE_CVSS[indice][1].includes(valor))
      return falla("valor_invalido", `${clave}:${valor}`);
    vistas.add(clave);
    ultimo = indice;
    presentes.push({ clave, valor });
  }
  const faltan = METRICAS_BASE.filter(([k]) => !vistas.has(k)).map(([k]) => k);
  if (faltan.length > 0) return falla("base_incompleta", faltan.join(", "));
  const seleccion: Record<string, string> = {};
  for (const [clave] of METRICAS_DE_CVSS) seleccion[clave] = "X";
  for (const { clave, valor } of presentes) seleccion[clave] = valor;
  return { ok: true, seleccion, presentes };
}
