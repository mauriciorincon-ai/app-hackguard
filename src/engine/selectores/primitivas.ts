// Las dos primitivas de texto que comparten el catálogo y los selectores. Viven aparte para que un selector (que pertenece
// a su adaptador) no tenga que importar `catalogo/esquemas.ts`: esquemas.ts importa el registro de selectores, y un
// selector que importara a esquemas.ts cerraría un ciclo (ADR-002, decisión 6 · regla 10).
import { z } from "zod";

const MAX_TEXTO = 2000;

export const textoNoVacio = z
  .string()
  .min(1)
  .max(MAX_TEXTO)
  .refine((s) => s.trim().length > 0, { message: "formato:en-blanco" });

export const Texto = z.strictObject({ es: textoNoVacio, en: textoNoVacio });
export type Texto = z.infer<typeof Texto>;
export const Nombre = textoNoVacio;
