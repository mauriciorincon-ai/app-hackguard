// Los filtros de la lista del catálogo: puros y sin estado, para que la pantalla y los tests digan lo mismo. Cada filtro
// es «todos» (cadena vacía) o un valor; los filtros se SUMAN. Los seis son los de la maqueta aprobada.
import type { FilaDePrueba } from "./tipos.ts";

export const CAMPOS = [
  "familia",
  "marco",
  "control",
  "madurez",
  "vigencia",
  "revision",
] as const;
export type Campo = (typeof CAMPOS)[number];
export type Filtros = Record<Campo, string>;

export const SIN_FILTROS: Filtros = {
  familia: "",
  marco: "",
  control: "",
  madurez: "",
  vigencia: "",
  revision: "",
};

/** El valor de `control` que quiere decir «ninguno»: las pruebas que todavía no dan evidencia a ningún control. */
export const SIN_CONTROL = "ninguno";

export function cumple(fila: FilaDePrueba, f: Filtros): boolean {
  if (f.familia && f.familia !== fila.familia) return false;
  if (f.marco && f.marco !== fila.marcoId) return false;
  if (f.control) {
    const ok =
      f.control === SIN_CONTROL
        ? fila.controles.length === 0
        : fila.controles.includes(f.control);
    if (!ok) return false;
  }
  if (f.madurez && f.madurez !== fila.madurez) return false;
  if (f.vigencia && f.vigencia !== fila.vigencia.estado) return false;
  if (f.revision && f.revision !== fila.revision) return false;
  return true;
}

export const filtrar = (
  filas: readonly FilaDePrueba[],
  f: Filtros,
): FilaDePrueba[] => filas.filter((fila) => cumple(fila, f));

export const hayFiltros = (f: Filtros): boolean =>
  CAMPOS.some((c) => f[c] !== "");
