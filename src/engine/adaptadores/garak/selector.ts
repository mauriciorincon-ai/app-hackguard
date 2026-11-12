// La forma del selector de garak: qué sondas y qué detectores miden una prueba, y cómo se agregan. Es el contrato del
// adaptador (ADR-002, decisión 6): agregar o cambiar este selector no toca el esquema del catálogo.
import { z } from "zod";
import { Nombre } from "../../selectores/primitivas.ts";

export const SELECTOR_DE_GARAK = z.strictObject({
  tipo: z.literal("garak"),
  probes: z.array(Nombre).min(1),
  detectores: z.array(Nombre).min(1),
  agregacion: z.enum(["cualquier_detector", "todos_los_detectores"]),
});
