// GENERADO por scripts/severidad/vendor-first.mjs — NO SE EDITA. Tipos de first.generated.js.

/** Las 32 métricas de CVSS 4.0 con su valor («X» = no definida). */
export type SeleccionDeMetricas = Readonly<Record<string, string>>;

/** `maxSeverity` de FIRST: distancias máximas de severidad por ecuación (+1). */
export interface DatosDeSeveridadMaxima {
  readonly eq1: Readonly<Record<number, number>>;
  readonly eq2: Readonly<Record<number, number>>;
  readonly eq3eq6: Readonly<Record<number, Readonly<Record<number, number>>>>;
  readonly eq4: Readonly<Record<number, number>>;
  readonly eq5: Readonly<Record<number, number>>;
}

export function cvss_score(
  cvssSelected: SeleccionDeMetricas,
  lookup: Readonly<Record<string, number>>,
  maxSeverityData: DatosDeSeveridadMaxima,
  macroVectorResult: string,
): number;
export function macroVector(cvssSelected: SeleccionDeMetricas): string;
export const cvssLookup_global: Readonly<Record<string, number>>;
export const maxSeverity: DatosDeSeveridadMaxima;
export const expectedMetricOrder: Readonly<Record<string, readonly string[]>>;
