// Textos de dominio de la pantalla del hallazgo que no son estado: cómo se dice un piso o un techo de la tabla de IA. Lo
// que es estado (rol, símbolo) vive en datos (`datos/hallazgos/etiquetas.json`), no aquí.
import type { Bilingue } from "../catalogo/tipos.ts";

export const PISO_Y_TECHO = {
  piso: (nivel: Bilingue): Bilingue => ({
    es: `Piso: nunca menos de ${nivel.es}`,
    en: `Floor: never below ${nivel.en}`,
  }),
  techo: (nivel: Bilingue): Bilingue => ({
    es: `Techo: nunca más de ${nivel.es}`,
    en: `Ceiling: never above ${nivel.en}`,
  }),
};

/** El hallazgo que abre «Evidencia» en la barra lateral: el primero del selector (un test lo ata a los datos). */
export const PRIMER_HALLAZGO = "HZ-0007";
