// Lee del disco lo que el planificador necesita: los activos (los demo versionados en `datos/activos/` y los
// propios, ignorados por git, en `datos/privado/activos/`), los datos que gobiernan al planificador y los
// patrones del filtro. Es la única pieza del planificador que toca el sistema de archivos: el motor recibe
// textos y objetos y no sabe de dónde vinieron. Las rutas salen relativas a la raíz y con «/».
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PatronesDelFiltro } from "../engine/catalogo/esquemas.ts";
import {
  compilarPatrones,
  type PatronCompilado,
} from "../engine/catalogo/filtro.ts";
import type { ArchivoDeActivo } from "../engine/activos/validar.ts";
import { Entornos, Formula } from "../engine/planificador/esquemas.ts";

/** Dónde viven los activos: la primera es pública y solo admite demos; la segunda es privada (regla dura 8). */
export const CARPETAS_DE_ACTIVOS = [
  "datos/activos",
  "datos/privado/activos",
] as const;
export const CARPETA_DE_PLANES = "datos/planes";
export const CARPETA_PRIVADA_DE_PLANES = "datos/privado/planes";

function jsonsDe(raiz: string, relativa: string): ArchivoDeActivo[] {
  const absoluta = path.join(raiz, relativa);
  if (!existsSync(absoluta)) return [];
  const archivos: ArchivoDeActivo[] = [];
  for (const nombre of readdirSync(absoluta).sort()) {
    const hijo = path.join(absoluta, nombre);
    const ruta = `${relativa}/${nombre}`;
    if (statSync(hijo).isDirectory()) archivos.push(...jsonsDe(raiz, ruta));
    else if (nombre.endsWith(".json"))
      archivos.push({ ruta, texto: readFileSync(hijo, "utf8") });
  }
  return archivos;
}

export function cargarActivos(raiz: string): ArchivoDeActivo[] {
  return CARPETAS_DE_ACTIVOS.flatMap((c) => jsonsDe(raiz, c));
}

/** Solo los versionados (demo): lo único que las pantallas del build leen. Un activo propio no sale de la CLI. */
export function cargarActivosPublicos(raiz: string): ArchivoDeActivo[] {
  return jsonsDe(raiz, CARPETAS_DE_ACTIVOS[0]);
}

function leerJson(raiz: string, relativa: string): unknown {
  return JSON.parse(readFileSync(path.join(raiz, relativa), "utf8")) as unknown;
}

/** La fórmula y los entornos, validados contra su esquema; un error de forma lanza y el CLI lo dice. */
export function cargarDatosDelPlanificador(raiz: string) {
  return {
    formula: Formula.parse(leerJson(raiz, "datos/planificador/formula.json")),
    entornos: Entornos.parse(
      leerJson(raiz, "datos/planificador/entornos.json"),
    ),
  };
}

export function cargarPatrones(raiz: string): PatronCompilado[] {
  const datos = PatronesDelFiltro.parse(
    leerJson(raiz, "datos/filtro/patrones.json"),
  );
  const { patrones, problemas } = compilarPatrones(datos);
  if (problemas.length > 0)
    throw new Error(
      `datos/filtro/patrones.json: ${problemas.length} patrones con problemas / patterns with problems`,
    );
  return patrones;
}
