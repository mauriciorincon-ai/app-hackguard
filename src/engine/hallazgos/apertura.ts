// Cuándo un sobre abre un hallazgo y qué hereda. Solo un sobre CONFIRMADO por una persona y con veredicto
// `fallida` o `parcial` abre uno; una re-prueba (un sobre que cita un hallazgo) nunca abre otro: se suma al suyo.
// El hallazgo hereda activo, prueba, familia y controles del sobre y de la instantánea: no se vuelven a escribir.
import { VEREDICTOS_QUE_FALLAN, type Sobre } from "../evidencia/esquemas.ts";
import { evaluarHallazgo } from "./ciclo.ts";
import {
  FORMATO_DE_HALLAZGO,
  type Hallazgo,
  type SeveridadDeEntrada,
} from "./esquemas.ts";

export type DecisionDeApertura =
  | { abre: true }
  | {
      abre: false;
      motivo: "sin_confirmar" | "no_falla" | "es_reprueba" | "ya_hay_uno";
      /** El hallazgo vivo de la misma prueba y activo, si ya hay uno. */
      existente?: string;
    };

export function decidirApertura(
  sobre: Sobre,
  libro: readonly Sobre[],
  hallazgos: readonly Hallazgo[],
): DecisionDeApertura {
  if (sobre.confirmacion === null)
    return { abre: false, motivo: "sin_confirmar" };
  if (!(VEREDICTOS_QUE_FALLAN as readonly string[]).includes(sobre.veredicto))
    return { abre: false, motivo: "no_falla" };
  if (sobre.reprueba_de !== null) return { abre: false, motivo: "es_reprueba" };
  for (const h of hallazgos) {
    const r = evaluarHallazgo(h, libro);
    if (
      r.ok &&
      r.evaluacion.cuentaComoFalla &&
      r.evaluacion.activo === sobre.activo &&
      r.evaluacion.prueba === sobre.prueba
    )
      return { abre: false, motivo: "ya_hay_uno", existente: h.id };
  }
  return { abre: true };
}

/** El siguiente identificador libre: HZ-0010 si el mayor es HZ-0009. */
export function siguienteIdDeHallazgo(
  hallazgos: readonly { id: string }[],
): string {
  const mayor = hallazgos.reduce(
    (m, h) => Math.max(m, Number(h.id.slice(3))),
    0,
  );
  return `HZ-${String(mayor + 1).padStart(4, "0")}`;
}

export function hallazgoNuevo(
  id: string,
  sobre: Sobre,
  titulo: Hallazgo["titulo"],
  descripcion: Hallazgo["descripcion"],
  severidad: SeveridadDeEntrada,
): Hallazgo {
  return {
    formato: FORMATO_DE_HALLAZGO,
    id,
    origen: sobre.origen,
    sobre_origen: sobre.id,
    titulo,
    descripcion,
    severidad,
    eventos: [],
  };
}
