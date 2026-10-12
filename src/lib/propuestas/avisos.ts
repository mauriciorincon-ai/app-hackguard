// Los avisos de versión como los muestran las pantallas: el motor dice cuáles son (`avisosDeVersion`); aquí se nombran y se les da su
// ruta. Los usan Marcos, el tablero, la brecha y el informe: una sola forma de decirlo.
import type { AvisoDeVersion } from "../../engine/propuestas/avisos.ts";
import { rutaDeUnaPropuesta } from "./etiquetas.ts";
import type { AvisoDeMarco } from "./tipos.ts";

export function avisosDeMarco(
  avisos: readonly AvisoDeVersion[],
  nombreDelMarco: (id: string) => string,
): AvisoDeMarco[] {
  return avisos.map((a) => ({
    marco: a.marco,
    nombre: nombreDelMarco(a.marco),
    vigente: a.vigente,
    publicada: a.publicada,
    fecha: a.fecha_version,
    propuesta: a.propuesta,
    fuentes: a.fuentes,
    verificadas: a.fuentes_verificadas,
    ruta: rutaDeUnaPropuesta(a.propuesta),
  }));
}
