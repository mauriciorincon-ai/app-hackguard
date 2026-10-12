// CVSS 4.0 contra la referencia de first.org fijada por commit (regla dura 7, G-Plan P2). El puntaje lo calcula el
// código de FIRST sin tocar un byte (`vendor/`); este módulo solo lo precede con el validador estricto y le arma las
// 32 métricas que espera. Un vector que no pasa el validador no se puntúa: no hay «puntaje de un vector truncado».
import type { NivelDeSeveridad } from "../hallazgos/esquemas.ts";
import {
  cvssLookup_global,
  cvss_score,
  macroVector,
  maxSeverity,
} from "./vendor/first.generated.js";
import {
  validarVector,
  type MetricaDeVector,
  type MotivoDeVectorInvalido,
} from "./validar-vector.ts";

/** La referencia fijada: repositorio y commit de la calculadora oficial. */
export const REFERENCIA_DE_CVSS = "FIRSTdotorg/cvss-v4-calculator@c5b0d40";

/** Correspondencia declarada con las bandas de CVSS: 0,0 es «None» y aquí «informativo». */
export function nivelDeCvss(puntaje: number): NivelDeSeveridad {
  if (puntaje >= 9) return "critico";
  if (puntaje >= 7) return "alto";
  if (puntaje >= 4) return "medio";
  if (puntaje > 0) return "bajo";
  return "informativo";
}

export type ResultadoDePuntaje =
  | {
      ok: true;
      vector: string;
      puntaje: number;
      nivel: NivelDeSeveridad;
      /** Las métricas que el vector escribe, en su orden. */
      metricas: MetricaDeVector[];
    }
  | { ok: false; motivo: MotivoDeVectorInvalido; detalle: string };

export function puntuarCvss(vector: string): ResultadoDePuntaje {
  const validado = validarVector(vector);
  if (!validado.ok) return validado;
  const puntaje = cvss_score(
    validado.seleccion,
    cvssLookup_global,
    maxSeverity,
    macroVector(validado.seleccion),
  );
  return {
    ok: true,
    vector,
    puntaje,
    nivel: nivelDeCvss(puntaje),
    metricas: validado.presentes,
  };
}

/** El motivo por el que un vector no entra, o `null` si entra: lo que `validarHallazgos` pide como `vectorInvalido`. */
export function motivoDeVectorInvalido(vector: string): string | null {
  const v = validarVector(vector);
  return v.ok ? null : `${v.motivo}: ${v.detalle}`;
}
