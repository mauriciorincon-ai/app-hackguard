// Ayudas de las pruebas del planificador: el mundo real de `datos/` (instantánea oficial, activos demo, fórmula
// y entornos) leído una vez, y copias que cada prueba puede mutar sin tocar a las demás.
import path from "node:path";
import {
  cargarActivos,
  cargarDatosDelPlanificador,
  cargarPatrones,
} from "../../../src/cli/cargar-activos.ts";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { cargarInstantaneaOficial } from "../../../src/lib/catalogo/cargar-instantanea.ts";

export const RAIZ = path.resolve(__dirname, "../../..");
export const FECHA = "2026-10-11";

let memo: Promise<Mundo> | null = null;

export interface Mundo {
  instantanea: Instantanea;
  activos: Record<string, Activo>;
  archivos: ReturnType<typeof cargarActivos>;
  formula: ReturnType<typeof cargarDatosDelPlanificador>["formula"];
  entornos: ReturnType<typeof cargarDatosDelPlanificador>["entornos"];
  patrones: ReturnType<typeof cargarPatrones>;
}

export function mundo(): Promise<Mundo> {
  memo ??= (async () => {
    const { instantanea } = await cargarInstantaneaOficial(RAIZ);
    const archivos = cargarActivos(RAIZ);
    const activos: Record<string, Activo> = {};
    for (const a of archivos) {
      const activo = Activo.parse(JSON.parse(a.texto));
      activos[activo.id] = activo;
    }
    return {
      instantanea,
      activos,
      archivos,
      patrones: cargarPatrones(RAIZ),
      ...cargarDatosDelPlanificador(RAIZ),
    };
  })();
  return memo;
}

/** Un activo con campos que el esquema no admite: para demostrar que el validador los rechaza. */
export const libre = (a: Activo) => a as unknown as Record<string, unknown>;

/** Una copia profunda: cada prueba muta la suya. */
export const copia = <T>(valor: T): T => structuredClone(valor);

export const ASISTENTE = "act-demo-asistente";
export const CLASIFICADOR = "act-demo-clasificador";
export const PORTAL = "act-demo-portal";
