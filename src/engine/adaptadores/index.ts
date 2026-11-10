// El registro de adaptadores: agregar una herramienta es un archivo nuevo en esta carpeta y una entrada aquí. El núcleo
// (armar el sobre, calcular el veredicto, sellar las huellas, formar el lote) no cambia.
import { ADAPTADOR_DE_GARAK } from "./garak.ts";
import type { Adaptador } from "./interfaz.ts";
import { ADAPTADOR_DE_INSPECT } from "./inspect.ts";
import { ADAPTADOR_DE_PROMPTFOO } from "./promptfoo.ts";
import { ADAPTADOR_DE_PYRIT } from "./pyrit.ts";
import { ADAPTADOR_DE_ZAP } from "./zap.ts";

export const ADAPTADORES: readonly Adaptador[] = [
  ADAPTADOR_DE_GARAK,
  ADAPTADOR_DE_ZAP,
  ADAPTADOR_DE_PROMPTFOO,
  ADAPTADOR_DE_PYRIT,
  ADAPTADOR_DE_INSPECT,
];

export const adaptadorDe = (herramienta: string): Adaptador | undefined =>
  ADAPTADORES.find((a) => a.herramienta === herramienta);

export type { Adaptador, Corrida, LecturaDeAdaptador } from "./interfaz.ts";
