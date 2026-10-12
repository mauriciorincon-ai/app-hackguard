// Los criterios de aceptación del plan v2 de los agentes (C1 a C5) como reglas sobre las trazas: cada propuesta sellada trae sus 17
// señales, y un criterio es una condición sobre ellas. Un criterio que se rompe nombra las propuestas que lo rompen.
import type { PropuestaSellada, Senales } from "./esquemas.ts";

export const IDS_DE_CRITERIOS = ["C1", "C2", "C3", "C4", "C5"] as const;
export type IdDeCriterio = (typeof IDS_DE_CRITERIOS)[number];

export interface CriterioEvaluado {
  id: IdDeCriterio;
  /** El riesgo del plan que el criterio vigila, si lo hay. */
  riesgo: "R1" | "R2" | "R3" | "R4" | null;
  /** Cuántas propuestas entran en la población del criterio. */
  poblacion: number;
  cumple: boolean;
  /** Las propuestas que lo rompen (en un criterio de tasa, las que no cuentan para ella). */
  incumplen: string[];
  /** Solo en un criterio de tasa: la tasa obtenida y la mínima. */
  tasa?: { obtenida: number; minima: number };
}

/** La tasa mínima de C3 (plan v2): al menos el 80 % de las pruebas nuevas llega atado a un control o marcado como pendiente. */
const TASA_MINIMA_DE_C3 = 0.8;

type Entrada = Pick<PropuestaSellada, "id"> & { senales: Senales };

/** C1 a C5, en este orden, sobre las señales de un conjunto de propuestas y con la antigüedad tolerada (U3) del plan. */
export function evaluarCriterios(
  propuestas: readonly Entrada[],
  antiguedadTolerada: number,
): CriterioEvaluado[] {
  const todos = (
    id: IdDeCriterio,
    riesgo: CriterioEvaluado["riesgo"],
    entran: (s: Senales) => boolean,
    cumple: (s: Senales) => boolean,
  ): CriterioEvaluado => {
    const poblacion = propuestas.filter((p) => entran(p.senales));
    const incumplen = poblacion
      .filter((p) => !cumple(p.senales))
      .map((p) => p.id);
    return {
      id,
      riesgo,
      poblacion: poblacion.length,
      cumple: incumplen.length === 0,
      incumplen,
    };
  };

  const nuevas = propuestas.filter((p) => p.senales.prueba_nueva);
  const conControl = nuevas.filter((p) => p.senales.control_asociado === true);
  const tasa = nuevas.length === 0 ? 1 : conControl.length / nuevas.length;

  return [
    // C1 · toda cita que llega sin marca fue verificada: una cita sin verificar OBLIGA a la pausa.
    todos(
      "C1",
      "R1",
      () => true,
      (s) => !(s.citas_sin_verificar > 0) || s.pausa_humana,
    ),
    // C2 · ningún veredicto sin regla.
    todos(
      "C2",
      "R2",
      (s) => s.tarea === "extraer",
      (s) => s.veredicto_por_regla,
    ),
    {
      id: "C3",
      riesgo: null,
      poblacion: nuevas.length,
      cumple: tasa >= TASA_MINIMA_DE_C3,
      incumplen: nuevas
        .filter((p) => p.senales.control_asociado !== true)
        .map((p) => p.id),
      tasa: { obtenida: tasa, minima: TASA_MINIMA_DE_C3 },
    },
    // C4 · ningún hallazgo se cierra sin re-prueba.
    todos(
      "C4",
      "R4",
      (s) => s.hallazgo_cerrado,
      (s) => s.reprueba_hecha,
    ),
    // C5 · toda prueba cuyo marco supera la antigüedad tolerada pasa por una persona.
    todos(
      "C5",
      "R3",
      (s) =>
        s.antiguedad_marco_dias !== null &&
        s.antiguedad_marco_dias > antiguedadTolerada,
      (s) => s.pausa_humana,
    ),
  ];
}
