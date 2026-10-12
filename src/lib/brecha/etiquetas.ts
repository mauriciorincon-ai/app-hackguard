// Etiquetas de estado propias de las pantallas de la brecha (`datos/brecha/etiquetas.json`) y las rutas de sus páginas. El rol
// de color y el símbolo salen de datos, nunca de un componente (regla dura 12).
import type {
  EtiquetasDeBrecha,
  IdDeEtiquetaDeBrecha,
} from "../../engine/brecha/esquemas.ts";
import type { Etiqueta } from "../catalogo/tipos.ts";

export function etiquetaDeBrecha(
  etiquetas: EtiquetasDeBrecha,
  id: IdDeEtiquetaDeBrecha,
): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/brecha/etiquetas.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

/** El segmento de la ruta de un control: `iso42001-A.6.2.4` → `iso42001-a-6-2-4` (sin puntos: un export estático no los quiere). */
export const slugDeControl = (id: string): string =>
  id.toLowerCase().replaceAll(".", "-");

export const rutaDeControl = (id: string): string =>
  `/brecha/control/${slugDeControl(id)}`;

/** El control que corresponde a un segmento de ruta, entre los aplicables. */
export const controlDeSlug = (
  ids: readonly string[],
  slug: string,
): string | null => ids.find((id) => slugDeControl(id) === slug) ?? null;

export const RUTAS = {
  tablero: "/tablero",
  brecha: "/brecha",
  controles: "/brecha/control",
  informe: "/brecha/informe",
  carga: "/evidencia/carga",
} as const;
