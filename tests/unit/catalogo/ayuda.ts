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

const fechaDe = (a: ArchivoDeDatos): string =>
  (JSON.parse(a.texto) as { fecha_verificacion?: string }).fecha_verificacion ??
  "";

/**
 * La última verificación del catálogo real: la fecha más temprana en que se puede evaluar. Las pruebas que
 * corren sobre `datos/` fechan contra ella, no contra el calendario, para que re-verificar una entidad no las
 * rompa.
 */
export const ULTIMA_VERIFICACION = [
  ...base.marcos,
  ...base.herramientas,
  ...base.pruebas,
]
  .map(fechaDe)
  .reduce((max, f) => (f > max ? f : max), "");

/** La fecha de verificación que `catalogoBase()` da a todos sus marcos y herramientas. */
export const FECHA_BASE = "2026-10-04";

function conFechaBase(archivo: ArchivoDeDatos): ArchivoDeDatos {
  const datos = JSON.parse(archivo.texto) as Record<string, unknown>;
  datos.fecha_verificacion = FECHA_BASE;
  return { ...archivo, texto: JSON.stringify(datos) };
}

/** Una copia del catálogo real que cada prueba puede editar sin tocar a las demás. */
export function catalogoReal(): CatalogoEnBruto {
  return structuredClone(base);
}

/**
 * El catálogo real sin sus pruebas: marcos, controles, herramientas y vocabulario de `datos/`, todos verificados
 * el `FECHA_BASE`. Las pruebas del motor parten de aquí, para que sumar o re-verificar algo en el catálogo real
 * no cambie lo que miden.
 */
export function catalogoBase(): CatalogoEnBruto {
  const c = structuredClone(base);
  return {
    ...c,
    marcos: c.marcos.map(conFechaBase),
    herramientas: c.herramientas.map(conFechaBase),
    pruebas: [],
  };
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

/**
 * Las cuentas del catálogo base, sacadas de los datos: las pruebas que imprimen o comparan conteos las usan, para
 * que agregar un marco, una herramienta o una familia no rompa pruebas que no miden eso.
 */
export const CUENTAS_BASE = {
  marcos: base.marcos.length,
  mapas: base.equivalencias.length,
  controles: base.controles
    .map(
      (a) =>
        JSON.parse(a.texto) as { areas: { controles: unknown[] }[] },
    )
    .reduce(
      (n, capa) => n + capa.areas.reduce((m, ar) => m + ar.controles.length, 0),
      0,
    ),
  herramientas: base.herramientas.length,
  familias: (
    JSON.parse(base.familias?.texto ?? '{"familias":[]}') as {
      familias: unknown[];
    }
  ).familias.length,
  /** Una nota por cada campo `por_verificar` de cada marco (`marco/por-verificar`). */
  notas: base.marcos
    .map((a) => JSON.parse(a.texto) as { por_verificar?: unknown[] })
    .reduce((n, m) => n + (m.por_verificar?.length ?? 0), 0),
};
