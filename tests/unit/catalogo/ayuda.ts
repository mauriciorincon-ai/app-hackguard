// Ayudas de las pruebas del catálogo: el catálogo real de `datos/` leído con el cargador del CLI, una copia
// editable por archivo y la prueba de referencia de las semillas.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cargarCatalogo } from "../../../src/cli/cargar.ts";
import type {
  ArchivoDeDatos,
  CatalogoEnBruto,
} from "../../../src/engine/catalogo/tipos.ts";

export const RAIZ = fileURLToPath(new URL("../../..", import.meta.url));
export const SEMILLAS = "docs/kit-de-prueba/semillas";

const base = cargarCatalogo(RAIZ);

/** Una copia del catálogo real que cada prueba puede editar sin tocar a las demás. */
export function catalogoReal(): CatalogoEnBruto {
  return structuredClone(base);
}

export type Json = Record<string, unknown>;

/** Lee, edita y vuelve a escribir el JSON de un archivo. */
export function editar(
  archivo: ArchivoDeDatos,
  cambio: (datos: Json) => void,
): void {
  const datos = JSON.parse(archivo.texto) as Json;
  cambio(datos);
  archivo.texto = JSON.stringify(datos);
}

/** Fija (o borra, con `undefined`) el valor en una ruta `a.b.0.c`. */
export function fijar(datos: Json, ruta: string, valor: unknown): void {
  const partes = ruta.split(".");
  let actual = datos as Record<string, unknown>;
  for (const parte of partes.slice(0, -1))
    actual = actual[parte] as Record<string, unknown>;
  const ultima = partes[partes.length - 1];
  if (valor === undefined) delete actual[ultima];
  else actual[ultima] = valor;
}

export const leer = (datos: Json, ruta: string): unknown =>
  ruta
    .split(".")
    .reduce<unknown>((v, p) => (v as Record<string, unknown>)[p], datos);

export function buscar(lista: ArchivoDeDatos[], ruta: string): ArchivoDeDatos {
  const archivo = lista.find((a) => a.ruta === ruta);
  if (archivo === undefined) throw new Error(`no está ${ruta}`);
  return archivo;
}

/** La prueba de referencia de las semillas (válida, sin control). */
export const referencia = (): Json =>
  JSON.parse(
    readFileSync(`${RAIZ}/${SEMILLAS}/SEMILLA-REFERENCIA.json`, "utf8"),
  ) as Json;

/** Agrega una prueba al catálogo, en `datos/pruebas/<id>.json` salvo que se diga otra ruta. */
export function conPrueba(
  catalogo: CatalogoEnBruto,
  prueba: Json,
  ruta?: string,
): string {
  const destino = ruta ?? `datos/pruebas/${String(prueba.id)}.json`;
  catalogo.pruebas.push({ ruta: destino, texto: JSON.stringify(prueba) });
  return destino;
}
