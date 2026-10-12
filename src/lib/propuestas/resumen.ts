// Lo que el tablero, la brecha, el informe y Marcos necesitan de las propuestas: nada más. Aparte del mundo de las propuestas para que
// quien solo necesita la cuenta y los avisos no arrastre consigo la lectura de archivos.
import type { AvisoDeVersion } from "../../engine/propuestas/avisos.ts";

/** Lo que el tablero, la brecha, el informe y Marcos necesitan de las propuestas: nada más. */
export interface ResumenDePropuestas {
  porDecidir: number;
  avisos: AvisoDeVersion[];
  investigacion: { corrida: string; fecha: string } | null;
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
