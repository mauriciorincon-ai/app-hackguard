// El registro de adaptadores: agregar una herramienta es un archivo nuevo en esta carpeta y una entrada aquí. El núcleo
// (armar el sobre, calcular el veredicto, sellar las huellas, formar el lote) no cambia.
import { ADAPTADOR_DE_GARAK } from "./garak.ts";
import type { Adaptador } from "./interfaz.ts";
import { ADAPTADOR_DE_ZAP } from "./zap.ts";

export const ADAPTADORES: readonly Adaptador[] = [
  ADAPTADOR_DE_GARAK,
  ADAPTADOR_DE_ZAP,
];

export const adaptadorDe = (herramienta: string): Adaptador | undefined =>
  ADAPTADORES.find((a) => a.herramienta === herramienta);

export type { Adaptador, Corrida, LecturaDeAdaptador } from "./interfaz.ts";
