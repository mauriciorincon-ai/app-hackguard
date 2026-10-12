// Esquema de los umbrales de la brecha: el dato que dice desde cuándo la evidencia de un control es antigua (RF-05.5).
// Es DATO (regla dura 10) y vive en `datos/brecha/umbrales.json`, aparte de los umbrales de vigencia del catálogo: así la
// instantánea del catálogo, que copia aquellos, no cambia. Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import { Nombre, Texto } from "../catalogo/esquemas.ts";

export const UmbralesDeBrecha = z.strictObject({
  version: Nombre,
  /** Días desde la evidencia más reciente de un control a partir de los cuales deja de ser vigente. */
  evidencia_antigua: z.int().min(1).max(3650),
  origen: Texto,
});
export type UmbralesDeBrecha = z.infer<typeof UmbralesDeBrecha>;

/** Los estados de un control que el motor calcula: cada uno tiene su etiqueta en `datos/estados.json`. */
export const ESTADOS_DE_CONTROL = [
  "con_fallas",
  "sin_evidencia",
  "evidencia_antigua",
  "con_evidencia_vigente",
] as const;
export type EstadoDeControl = (typeof ESTADOS_DE_CONTROL)[number];
