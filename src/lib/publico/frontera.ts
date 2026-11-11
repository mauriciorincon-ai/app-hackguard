// La frontera del modo público y del paquete (C19, C20): barre lo EXPORTADO —HTML, RSC, JS, CSS y JSON— y falla con cualquier ruta
// fuera de la lista blanca, cualquier activo que no sea demo, cualquier hallazgo, sobre o lote que no sea uno de los demos
// conocidos, cualquier estructura de evidencia o de autorización (formato de sobre, lote o plan; alcance y reglas de un activo; datos
// privados o del ejecutor) y cualquier host externo que no sea una cadena del propio framework. Es una lista blanca de lo que
// puede estar, no una lista de lo que no. La brecha se muestra sobre los DEMOS sintéticos: sus ids están permitidos porque son los
// de `datos/**/demo/`; el id de un sobre o un hallazgo real, que vive en `datos/privado/`, no está en esos conjuntos y falla.
//
// Corre en Node (build:publico, paquete:verificar, tests). Las pantallas no la importan.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  archivoPermitido,
  esRutaPublica,
  normalizarRuta,
} from "./lista-blanca.ts";

export interface HallazgoDeFrontera {
  archivo: string;
  regla: string;
  detalle: string;
}

export interface ConocidosPublicos {
  /** Los ids de los demos versionados (`datos/hallazgos/demo/`, `datos/evidencia/demo/`, `datos/lotes/demo/`): los únicos que pueden aparecer. */
  hallazgos: ReadonlySet<string>;
  sobres: ReadonlySet<string>;
  lotes: ReadonlySet<string>;
}

/**
 * Las únicas direcciones externas que puede traer lo exportado: cadenas del framework (espacios de nombres, mensajes de error,
 * una licencia) que no son un enlace de la aplicación ni una petición. Explícita y mínima: una más pide una razón.
 */
export const PREFIJOS_DEL_FRAMEWORK: readonly string[] = [
  "http://www.w3.org/",
  "https://nextjs.org/docs",
  "https://react.dev/",
  "https://github.com/zloirock/core-js",
  "http://json-schema.org/",
  "https://json-schema.org/",
];

const FORMATOS =
  /hackguard\/(?:sobre|lote|plan|paquete|hallazgo|historial-de-activo|corrida|consulta|decision|aporte|borrador|propuesta|hoja-s3)@\d|perfil-propuesto\/1/;

/** Cada marcador: la regla que falla y qué lo delata. Patrones globales: se barren todos los casos del texto.
 *  Los que son estructura (formatos, llaves de un activo) se buscan en datos (HTML, RSC, JSON), no en el JS: el código del cliente
 *  lleva las constantes de sus esquemas sin llevar ningún dato. */
const MARCADORES: readonly {
  regla: string;
  patron: RegExp;
  soloDatos?: true;
}[] = [
  {
    regla: "activo-no-demo",
    patron: /(?<![A-Za-z0-9_-])act-(?!demo-)[a-z0-9]+(?:-[a-z0-9]+)*/g,
  },
  { regla: "dato-privado", patron: /datos\\?\/(?:privado|ejecutor)/g },
  {
    regla: "formato-de-evidencia",
    patron: new RegExp(FORMATOS.source, "g"),
    soloDatos: true,
  },
  {
    regla: "alcance-o-reglas-de-un-activo",
    patron: /\\?"(?:alcance|reglas|dueno|proveedor|ajustes)\\?":/g,
    soloDatos: true,
  },
];

const ENLACES_INTERNOS = /href\\*"?[:=]\\*"(\/[^"\\#?]*)/g;
const DIRECCIONES =
  /https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?[^\s"'\\<>)`]*/gi;

const EXTENSIONES_DE_TEXTO = new Set([
  ".html",
  ".txt",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".svg",
  ".xml",
  ".map",
  ".md",
]);
const extension = (ruta: string) => {
  const i = ruta.lastIndexOf(".");
  return i < 0 ? "" : ruta.slice(i).toLowerCase();
};

/** Barre el texto de UN archivo del export. `archivo` es su ruta relativa (para el reporte). */
export function barrerTexto(
  archivo: string,
  texto: string,
  conocidos: ConocidosPublicos,
): HallazgoDeFrontera[] {
  const fuera: HallazgoDeFrontera[] = [];
  const marcar = (regla: string, detalle: string) =>
    fuera.push({ archivo, regla, detalle });

  const esCodigo = /\.(?:js|mjs|map)$/.test(archivo);
  for (const { regla, patron, soloDatos } of MARCADORES)
    if (!(soloDatos && esCodigo))
      for (const m of texto.matchAll(patron)) marcar(regla, m[0]);
  for (const [regla, patron, demo] of [
    ["hallazgo-no-demo", /(?<![A-Z0-9-])HZ-\d{4}/g, conocidos.hallazgos],
    ["sobre-no-demo", /(?<![A-Z0-9-])SOB-\d{4}/g, conocidos.sobres],
    ["lote-no-demo", /(?<![A-Z0-9-])LOTE-\d{4}/g, conocidos.lotes],
  ] as const)
    for (const m of texto.matchAll(patron))
      if (!demo.has(m[0])) marcar(regla, `${m[0]} no es un demo versionado`);
  for (const m of texto.matchAll(DIRECCIONES))
    if (!PREFIJOS_DEL_FRAMEWORK.some((p) => m[0].startsWith(p)))
      marcar("host-externo", m[0]);
  if (/\.(?:html|txt)$/.test(archivo))
    for (const m of texto.matchAll(ENLACES_INTERNOS)) {
      const ruta = normalizarRuta(m[1]!);
      if (
        !esRutaPublica(ruta) &&
        !ruta.startsWith("/_next/") &&
        ruta !== "/favicon.ico"
      )
        marcar("enlace-fuera-de-la-lista", m[1]!);
    }
  return fuera;
}

function archivosDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosDe(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** Barre una carpeta exportada: sus rutas contra la lista blanca y el texto de cada archivo contra los marcadores. */
export function barrerCarpeta(
  dir: string,
  conocidos: ConocidosPublicos,
): HallazgoDeFrontera[] {
  const fuera: HallazgoDeFrontera[] = [];
  for (const abs of archivosDe(dir)) {
    const rel = relative(dir, abs).split("\\").join("/");
    if (!archivoPermitido(rel)) {
      fuera.push({
        archivo: rel,
        regla: "ruta-fuera-de-la-lista",
        detalle: "esta ruta no está en la lista blanca",
      });
      continue;
    }
    if (EXTENSIONES_DE_TEXTO.has(extension(rel)))
      fuera.push(...barrerTexto(rel, readFileSync(abs, "utf8"), conocidos));
  }
  return fuera;
}

/** Los ids de los demos versionados, por el nombre de su archivo (`HZ-0007.json`, `SOB-0003.json`, `LOTE-0007.json`). */
export function conocidosDeDemo(raiz: string): ConocidosPublicos {
  const ids = (carpeta: string, prefijo: string) =>
    new Set(
      readdirSync(join(raiz, "datos", carpeta, "demo"))
        .filter((n) => new RegExp(`^${prefijo}-\\d{4}\\.json$`).test(n))
        .map((n) => n.replace(/\.json$/, "")),
    );
  return {
    hallazgos: ids("hallazgos", "HZ"),
    sobres: ids("evidencia", "SOB"),
    lotes: ids("lotes", "LOTE"),
  };
}
