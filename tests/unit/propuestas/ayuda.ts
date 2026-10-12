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
  Consulta,
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
// Solo las corridas demo: las cifras que estas pruebas fijan no deben cambiar cuando el repositorio versiona una corrida real.
export const corridas = cargadas.corridas.filter((c) => c.lugar === "demo");
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
/**
 * La consulta que registra como leídas las fuentes del borrador: lo que el investigador leyó de verdad en esa corrida. El sellado solo
 * da por verificada una fuente cuya dirección y huella están aquí (auditoría, Alto). Solo llena `fuentes`: es lo único que el sellado lee.
 */
export const consultaQueLeyo = (b: Borrador): Consulta =>
  ({
    fuentes: b.propuestas.flatMap((p) =>
      ("fuentes" in p && Array.isArray(p.fuentes) ? p.fuentes : []).map(
        (f: { url: string; huella_de_la_pagina: string }) => ({
          marco: null,
          nombre: "fuente de prueba",
          url: f.url,
          estado: "leida",
          http: 200,
          huella_de_la_pagina: f.huella_de_la_pagina,
          caracteres: 1,
          motivo: null,
        }),
      ),
    ),
  }) as unknown as Consulta;
export const leerJson = (relativa: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8")) as unknown;
