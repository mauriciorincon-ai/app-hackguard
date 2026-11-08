// Carga la instantánea OFICIAL del catálogo (la de fecha más reciente en `datos/instantaneas/`). La pantalla lee solo
// ella, nunca los archivos sueltos de `datos/`: lo que se muestra es exactamente lo que tiene huella. Se ejecuta en el
// build (Node), jamás en el navegador. Si la instantánea no es lo que dice ser, lanza: más vale un build roto que una
// pantalla que muestra un catálogo que nadie firmó.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FORMATO_DE_INSTANTANEA,
  huellaDeInstantanea,
  nombreDeInstantanea,
  type Instantanea,
} from "../../engine/catalogo/instantanea.ts";
import type { InstantaneaListada } from "./marcos.ts";

const NOMBRE = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{12}\.json$/;

export interface InstantaneaCargada {
  instantanea: Instantanea;
  /** El nombre del archivo sin extensión: fecha de evaluación y los 12 primeros caracteres de la huella. */
  nombre: string;
}

/** El archivo oficial: el de fecha de evaluación más reciente (el nombre empieza por ella y por eso ordena). */
export function archivoOficial(carpeta: string): string {
  const archivos = readdirSync(carpeta)
    .filter((n) => NOMBRE.test(n))
    .sort();
  const ultimo = archivos.at(-1);
  if (!ultimo) {
    throw new Error(
      `no hay ninguna instantánea del catálogo en ${carpeta} / there is no catalog snapshot in ${carpeta}`,
    );
  }
  return ultimo;
}

/** Las instantáneas de `datos/instantaneas/`, la más reciente primero: nombre, fecha, cuántas pruebas traen y su huella. */
export function listarInstantaneas(
  raiz: string = process.cwd(),
): InstantaneaListada[] {
  const carpeta = join(raiz, "datos", "instantaneas");
  return readdirSync(carpeta)
    .filter((n) => NOMBRE.test(n))
    .sort()
    .reverse()
    .map((archivo) => {
      const i = JSON.parse(
        readFileSync(join(carpeta, archivo), "utf8"),
      ) as Instantanea;
      return {
        nombre: archivo.replace(/\.json$/, ""),
        fecha: i.fecha_evaluacion,
        pruebas: i.catalogo.pruebas.length,
        huella: i.huella,
      };
    });
}

/** Lee un archivo de instantánea y comprueba que es lo que dice ser: formato, huella declarada y nombre. */
async function leerYComprobar(
  carpeta: string,
  archivo: string,
): Promise<InstantaneaCargada> {
  const instantanea = JSON.parse(
    readFileSync(join(carpeta, archivo), "utf8"),
  ) as Instantanea;
  if (instantanea.formato !== FORMATO_DE_INSTANTANEA) {
    throw new Error(
      `${archivo}: formato «${String(instantanea.formato)}» desconocido / unknown format`,
    );
  }
  const huella = await huellaDeInstantanea(instantanea);
  if (huella !== instantanea.huella) {
    throw new Error(
      `${archivo}: su huella declarada no es la de su contenido / its declared fingerprint is not its content's`,
    );
  }
  if (nombreDeInstantanea(instantanea.fecha_evaluacion, huella) !== archivo) {
    throw new Error(
      `${archivo}: su nombre no corresponde a su fecha y su huella / its name does not match its date and fingerprint`,
    );
  }
  return { instantanea, nombre: archivo.replace(/\.json$/, "") };
}

export async function cargarInstantaneaOficial(
  raiz: string = process.cwd(),
): Promise<InstantaneaCargada> {
  const carpeta = join(raiz, "datos", "instantaneas");
  return leerYComprobar(carpeta, archivoOficial(carpeta));
}

/** La carpeta de la instantánea DEMO: sintética, comprobada igual que la oficial y jamás confundida con ella. */
export const CARPETA_DE_INSTANTANEA_DEMO = join(
  "datos",
  "instantaneas",
  "demo",
);

/** La instantánea demo (la más reciente de `datos/instantaneas/demo/`), o `null` si no hay ninguna. Nunca es la oficial. */
export async function cargarInstantaneaDemo(
  raiz: string = process.cwd(),
): Promise<InstantaneaCargada | null> {
  const carpeta = join(raiz, CARPETA_DE_INSTANTANEA_DEMO);
  if (!existsSync(carpeta)) return null;
  const ultimo = readdirSync(carpeta)
    .filter((n) => NOMBRE.test(n))
    .sort()
    .at(-1);
  return ultimo === undefined ? null : leerYComprobar(carpeta, ultimo);
}

/**
 * La instantánea (oficial o demo) cuya huella es la dada: la que un plan cita. `null` si ninguna archivada la tiene. El pasado de un plan es
 * conocido solo si su instantánea sigue en `datos/instantaneas/`.
 */
export async function cargarInstantaneaPorHuella(
  huella: string,
  raiz: string = process.cwd(),
): Promise<InstantaneaCargada | null> {
  for (const carpeta of [
    join(raiz, "datos", "instantaneas"),
    join(raiz, CARPETA_DE_INSTANTANEA_DEMO),
  ]) {
    if (!existsSync(carpeta)) continue;
    const archivo = readdirSync(carpeta)
      .filter((n) => NOMBRE.test(n))
      .find((n) => n.endsWith(`-${huella.slice(0, 12)}.json`));
    if (archivo !== undefined) {
      const c = await leerYComprobar(carpeta, archivo);
      if (c.instantanea.huella === huella) return c;
    }
  }
  return null;
}
