// Plazos de atención y revisión del riesgo aceptado. Los plazos por severidad son DATOS (`datos/hallazgos/plazos.json`)
// y la fecha de evaluación es una ENTRADA: nada aquí lee el reloj (regla dura 1 y 10). Un plazo vencido no cierra
// ni abre nada: solo se ve.
import { diasEntre, fechaMasDias } from "../fecha.ts";
import type { EstadoDeHallazgo, NivelDeSeveridad, Plazos } from "./esquemas.ts";
import { ESTADOS_CON_PLAZO } from "./ciclo.ts";

export type EstadoDePlazo = "en_plazo" | "vencido" | "sin_plazo" | "no_corre";

export interface PlazoDeHallazgo {
  estado: EstadoDePlazo;
  /** Días que da la severidad; nulo si esa severidad no tiene plazo. */
  total: number | null;
  /** Días desde la apertura hasta la fecha de evaluación. */
  dias: number;
  /** Fecha en que vence, si hay plazo. */
  vence: string | null;
  /** Días de atraso (0 si no hay). */
  atraso: number;
}

export function plazoDe(
  severidad: NivelDeSeveridad,
  estado: EstadoDeHallazgo,
  apertura: string,
  fecha: string,
  plazos: Plazos,
): PlazoDeHallazgo {
  const dias = diasEntre(apertura, fecha);
  if (dias < 0)
    throw new RangeError(
      "la fecha de evaluación es anterior a la apertura del hallazgo",
    );
  const total = plazos.dias[severidad];
  // El plazo solo corre mientras el hallazgo espera trabajo: no en uno cerrado ni en un riesgo aceptado.
  if (!ESTADOS_CON_PLAZO.includes(estado))
    return { estado: "no_corre", total, dias, vence: null, atraso: 0 };
  if (total === null)
    return { estado: "sin_plazo", total, dias, vence: null, atraso: 0 };
  const atraso = Math.max(0, dias - total);
  return {
    estado: atraso > 0 ? "vencido" : "en_plazo",
    total,
    dias,
    vence: fechaMasDias(apertura, total),
    atraso,
  };
}

export type EstadoDeRevision = "toca_revisar" | "programada";

export interface RevisionDeRiesgo {
  estado: EstadoDeRevision;
  /** Días desde que se aceptó el riesgo. */
  dias: number;
  total: number;
  /** Cuándo toca revisarlo. */
  fecha: string;
}

/** Un riesgo aceptado vuelve a revisarse en la fecha que la persona fijó al aceptarlo. */
export function revisionDeRiesgo(
  aceptadoEn: string,
  revisionEnDias: number,
  fecha: string,
): RevisionDeRiesgo {
  const dias = diasEntre(aceptadoEn, fecha);
  if (dias < 0)
    throw new RangeError(
      "la fecha de evaluación es anterior a la aceptación del riesgo",
    );
  return {
    estado: dias >= revisionEnDias ? "toca_revisar" : "programada",
    dias,
    total: revisionEnDias,
    fecha: fechaMasDias(aceptadoEn, revisionEnDias),
  };
}
