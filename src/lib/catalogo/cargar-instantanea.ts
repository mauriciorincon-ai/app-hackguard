// Carga la instantánea OFICIAL del catálogo (la de fecha más reciente en `datos/instantaneas/`). La pantalla lee solo
// ella, nunca los archivos sueltos de `datos/`: lo que se muestra es exactamente lo que tiene huella. Se ejecuta en el
// build (Node), jamás en el navegador. Si la instantánea no es lo que dice ser, lanza: más vale un build roto que una
// pantalla que muestra un catálogo que nadie firmó.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FORMATO_DE_INSTANTANEA,
  huellaDeInstantanea,
  nombreDeInstantanea,
  type Instantanea,
} from "../../engine/catalogo/instantanea.ts";

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

export async function cargarInstantaneaOficial(
  raiz: string = process.cwd(),
): Promise<InstantaneaCargada> {
  const carpeta = join(raiz, "datos", "instantaneas");
  const archivo = archivoOficial(carpeta);
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
