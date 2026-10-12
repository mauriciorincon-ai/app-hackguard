// Ayudas de las pruebas de propuestas: el mundo real (instantánea oficial, activos con plan), el contexto de verificación y las
// corridas demo selladas, cargados como los carga el build.
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  cargarBorrador,
  cargarConsulta,
  cargarCorridas,
  contextoDeVerificacion,
} from "../../../src/lib/propuestas/cargar.ts";
import type {
  Borrador,
  PropuestaSellada,
} from "../../../src/engine/propuestas/esquemas.ts";
import type { ContextoDeVerificacion } from "../../../src/engine/propuestas/verificar.ts";
import { instantanea, mundo } from "../lib/mundo-de-activos";

export const RAIZ = process.cwd();
export { instantanea, mundo };
export const ctx: ContextoDeVerificacion = contextoDeVerificacion(
  instantanea,
  mundo,
  RAIZ,
);
export const cargadas = await cargarCorridas(RAIZ);
export const corridas = cargadas.corridas;
export const propuestas: PropuestaSellada[] = corridas.flatMap(
  (c) => c.corrida.propuestas,
);
export const deId = (id: string): PropuestaSellada => {
  const p = propuestas.find((x) => x.id === id);
  if (p === undefined) throw new Error(`no hay ${id} en las corridas demo`);
  return p;
};
export const borradorDe = (corrida: string): Borrador =>
  cargarBorrador(RAIZ, `propuestas/demo/${corrida}`);
export const consultaDe = (corrida: string) =>
  cargarConsulta(RAIZ, `propuestas/demo/${corrida}`);
export const copia = <T>(x: T): T => structuredClone(x);
export const leerJson = (relativa: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8")) as unknown;
