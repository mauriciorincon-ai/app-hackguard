// Utilidades de los gates de la maqueta (tests/unit/maqueta-*.test.ts).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const RAIZ = process.cwd();
export const RAIZ_MAQUETA = resolve(RAIZ, "docs/diseno");

export const paginasDe = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .sort();

/** Corre el generador hacia un directorio temporal (opcionalmente en otra fecha de consulta). */
export function generarEnTemporal(fecha?: string) {
  const salida = mkdtempSync(join(tmpdir(), "maqueta-"));
  const env: NodeJS.ProcessEnv = { ...process.env, MAQUETA_SALIDA: salida, MAQUETA_SILENCIO: "1" };
  if (fecha) env.MAQUETA_FECHA = fecha;
  execFileSync(process.execPath, ["scripts/maqueta/generar.mjs"], { env, cwd: RAIZ, stdio: "pipe" });
  return salida;
}

export const leerPagina = (dir: string, pagina: string) => readFileSync(join(dir, pagina), "utf8");

export const documentoDe = (html: string) => new DOMParser().parseFromString(html, "text/html");
