// La forma del selector de ZAP: los `pluginid` de las reglas que miden una prueba y cómo se agregan. Es el contrato del
// adaptador (ADR-002, decisión 6): agregar o cambiar este selector no toca el esquema del catálogo.
import { z } from "zod";

export const SELECTOR_DE_ZAP = z.strictObject({
  tipo: z.literal("zap"),
  pluginids: z.array(z.int().positive()).min(1),
  agregacion: z.enum(["cualquier_regla", "todas_las_reglas"]),
});
