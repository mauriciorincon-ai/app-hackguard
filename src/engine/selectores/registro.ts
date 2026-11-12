// El registro de selectores (ADR-002, decisión 6 · regla dura 10): la unión que valida `prueba.selector` se arma AQUÍ, desde
// el selector de cada adaptador y los manuales. Agregar un adaptador con un selector propio es un archivo
// `adaptadores/<id>/selector.ts` y una línea en este registro: el esquema del catálogo no cambia.
//
// Este módulo NO importa `catalogo/esquemas.ts` (que sí lo importa a él): ni él ni los selectores pueden cerrar un ciclo.
// Un test lo fija leyendo los imports.
import { z } from "zod";
import { SELECTOR_DE_GARAK } from "../adaptadores/garak/selector.ts";
import { SELECTOR_DE_ZAP } from "../adaptadores/zap/selector.ts";
import { SELECTOR_MODULO, SELECTOR_REVISION } from "./manuales.ts";

export const Selector = z.discriminatedUnion("tipo", [
  SELECTOR_DE_GARAK,
  SELECTOR_DE_ZAP,
  SELECTOR_MODULO,
  SELECTOR_REVISION,
]);
export type Selector = z.infer<typeof Selector>;

/** Los tipos que la unión conoce, en el orden del registro: de aquí sale lo que una herramienta puede declarar. */
export const TIPOS_DE_SELECTOR = [
  SELECTOR_DE_GARAK.shape.tipo.value,
  SELECTOR_DE_ZAP.shape.tipo.value,
  SELECTOR_MODULO.shape.tipo.value,
  SELECTOR_REVISION.shape.tipo.value,
] as const;
