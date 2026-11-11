// Los selectores que no son de un adaptador en particular. `modulo` lo usan los adaptadores que identifican una prueba por
// una referencia (promptfoo, PyRIT, Inspect); `revision` es la prueba que una persona revisa a mano.
import { z } from "zod";
import { Nombre, Texto } from "./primitivas.ts";

export const SELECTOR_MODULO = z.strictObject({
  tipo: z.literal("modulo"),
  referencia: Nombre,
});

export const SELECTOR_REVISION = z.strictObject({
  tipo: z.literal("revision"),
  que_se_revisa: Texto,
});
