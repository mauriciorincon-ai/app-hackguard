// Etiquetas de estado de la bandeja de propuestas (`datos/propuestas/etiquetas.json`) y las rutas de sus páginas. El rol de color y el
// símbolo salen de datos, nunca de un componente (regla dura 12).
import type {
  EtiquetasDePropuestas,
  IdDeEtiquetaDePropuestas,
} from "../../engine/propuestas/etiquetas.ts";
import type { Etiqueta } from "../catalogo/tipos.ts";

export function etiquetaDePropuesta(
  etiquetas: EtiquetasDePropuestas,
  id: IdDeEtiquetaDePropuestas,
): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/propuestas/etiquetas.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

export const RUTA_DE_PROPUESTAS = "/catalogo/propuestas";
export const rutaDeUnaPropuesta = (id: string): string =>
  `${RUTA_DE_PROPUESTAS}#${id.toLowerCase()}`;
