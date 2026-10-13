// Lo que el tablero, la brecha, el informe y Marcos necesitan de las propuestas: nada más. Aparte del mundo de las propuestas para que
// quien solo necesita la cuenta y los avisos no arrastre consigo la lectura de archivos.
import type { AvisoDeVersion } from "../../engine/propuestas/avisos.ts";

/** La corrida más reciente del investigador y lo que pudo leer: «ninguna versión nueva» solo vale para las páginas que leyó. */
export interface Investigacion {
  corrida: string;
  fecha: string;
  /** Páginas que leyó y de las que sale lo que dice la corrida. */
  leidas: number;
  /** Páginas que no pudo leer (403, sesión, red): lo que digan, esa corrida no lo vio. */
  noLeidas: number;
}

/** Lo que el tablero, la brecha, el informe y Marcos necesitan de las propuestas: nada más. */
export interface ResumenDePropuestas {
  porDecidir: number;
  avisos: AvisoDeVersion[];
  investigacion: Investigacion | null;
}

export const resumenDePropuestas = (
  m: ResumenDePropuestas,
): ResumenDePropuestas => ({
  porDecidir: m.porDecidir,
  avisos: m.avisos,
  investigacion: m.investigacion,
});

/** El resumen de un mundo sin propuestas: nada por decidir, ningún aviso y ninguna investigación que lo respalde. */
export const SIN_PROPUESTAS: ResumenDePropuestas = {
  porDecidir: 0,
  avisos: [],
  investigacion: null,
};
