// La situación de un hallazgo en una fecha: su estado (del libro y los eventos), su severidad (del vector o de la tabla
// de IA y de la frecuencia que dejó la evidencia), su plazo y, si el riesgo está aceptado, su revisión. UNA cuenta,
// un cálculo: el CLI, la pantalla del hallazgo y el e2e de determinismo salen de esta función y de ninguna otra
// (design-system § 9). La fecha de evaluación es una entrada; nada aquí lee el reloj (regla dura 1).
import type { Sobre } from "../evidencia/esquemas.ts";
import { diasEntre } from "../fecha.ts";
import type { EscalaIa } from "../severidad/escala-ia.ts";
import {
  calcularSeveridad,
  type MotivoDeNoCalcular,
  type SeveridadCalculada,
} from "../severidad/severidad.ts";
import { evaluarHallazgo, type EvaluacionDeHallazgo } from "./ciclo.ts";
import type { Hallazgo, Plazos } from "./esquemas.ts";
import {
  plazoDe,
  revisionDeRiesgo,
  type PlazoDeHallazgo,
  type RevisionDeRiesgo,
} from "./plazo.ts";

export interface SituacionDeHallazgo {
  evaluacion: EvaluacionDeHallazgo;
  severidad: SeveridadCalculada;
  plazo: PlazoDeHallazgo;
  /** Solo si el riesgo está aceptado: cuándo toca revisarlo. */
  revision: RevisionDeRiesgo | null;
}

export type MotivoDeNoSituar =
  | "sobre_origen_inexistente"
  | "sobre_origen_sin_confirmar"
  | "fecha_anterior_a_la_apertura"
  | "fecha_anterior_a_la_aceptacion"
  | MotivoDeNoCalcular;

export type ResultadoDeSituacion =
  | { ok: true; situacion: SituacionDeHallazgo }
  | { ok: false; motivo: MotivoDeNoSituar; detalle: string };

export function situacionDeHallazgo(
  h: Hallazgo,
  libro: readonly Sobre[],
  datos: { escala: EscalaIa; plazos: Plazos; fecha: string },
): ResultadoDeSituacion {
  const e = evaluarHallazgo(h, libro);
  if (!e.ok) return { ok: false, motivo: e.motivo, detalle: h.sobre_origen };
  const { evaluacion } = e;
  if (diasEntre(evaluacion.apertura, datos.fecha) < 0)
    return {
      ok: false,
      motivo: "fecha_anterior_a_la_apertura",
      detalle: `${h.id}: ${evaluacion.apertura}`,
    };
  if (
    evaluacion.aceptacion !== null &&
    diasEntre(evaluacion.aceptacion.fecha, datos.fecha) < 0
  )
    return {
      ok: false,
      motivo: "fecha_anterior_a_la_aceptacion",
      detalle: `${h.id}: ${evaluacion.aceptacion.fecha}`,
    };
  const s = calcularSeveridad(
    h.severidad,
    evaluacion.sobreOrigen.resultado,
    datos.escala,
  );
  if (!s.ok) return { ok: false, motivo: s.motivo, detalle: s.detalle };
  return {
    ok: true,
    situacion: {
      evaluacion,
      severidad: s.severidad,
      plazo: plazoDe(
        s.severidad.nivel,
        evaluacion.estado,
        evaluacion.apertura,
        datos.fecha,
        datos.plazos,
      ),
      revision:
        evaluacion.estado === "aceptado_con_riesgo" &&
        evaluacion.aceptacion !== null
          ? revisionDeRiesgo(
              evaluacion.aceptacion.fecha,
              evaluacion.aceptacion.revision_en_dias,
              datos.fecha,
            )
          : null,
    },
  };
}
