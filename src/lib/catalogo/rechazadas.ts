// De los hallazgos del validador a la lista que la pantalla de error muestra: una línea por problema que invalida el
// catálogo, con la prueba (o el archivo) y la razón en los dos idiomas. Solo los errores: advertencias y notas no
// impiden cargar nada.
import type { Hallazgo } from "../../engine/catalogo/validar.ts";
import type { Bilingue } from "./tipos.ts";

export interface Rechazada {
  id: string;
  razon: Bilingue;
}

/** El nombre del archivo sin carpeta ni extensión: para una prueba es su identificador. */
const idDe = (ruta: string): string =>
  (ruta.split("/").at(-1) ?? ruta).replace(/\.json$/, "");

export const rechazadasDe = (hallazgos: readonly Hallazgo[]): Rechazada[] =>
  hallazgos
    .filter((h) => h.severidad === "error")
    .map((h) => ({ id: idDe(h.ruta), razon: h.detalle ?? h.nombre }));
