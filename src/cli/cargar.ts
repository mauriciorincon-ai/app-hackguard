// Lee `datos/` del disco y arma la entrada del motor. Es la única pieza del catálogo que toca el sistema de
// archivos: el motor recibe textos y no sabe de dónde vinieron. Las rutas salen relativas a la raíz y con
// «/» en cualquier sistema, para que el informe y la instantánea no dependan de la máquina.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  CARPETAS,
  RUTAS_UNICAS,
  type ArchivoDeDatos,
  type CatalogoEnBruto,
} from "../engine/catalogo/tipos.ts";

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** La ruta relativa a la raíz, con «/». Un archivo de fuera de la raíz entra como `agregado/<nombre>`: la ruta de
 * la máquina no viaja al informe ni a la instantánea. */
function rutaDe(raiz: string, absoluta: string): string {
  const relativa = path.relative(raiz, absoluta);
  if (relativa.startsWith("..") || path.isAbsolute(relativa))
    return `agregado/${path.basename(absoluta)}`;
  return relativa.split(path.sep).join("/");
}

function leer(raiz: string, absoluta: string): ArchivoDeDatos {
  const ruta = rutaDe(raiz, absoluta);
  const bytes = readFileSync(absoluta);
  try {
    return { ruta, texto: utf8.decode(bytes) };
  } catch {
    throw new Error(
      `${ruta}: no es UTF-8 válido, guárdalo como UTF-8 / is not valid UTF-8, save it as UTF-8`,
    );
  }
}

function leerUnico(raiz: string, relativa: string): ArchivoDeDatos | null {
  const absoluta = path.join(raiz, relativa);
  return existsSync(absoluta) ? leer(raiz, absoluta) : null;
}

/** Los `.json` de una carpeta; con `recursivo`, también los de sus subcarpetas. */
function leerCarpeta(
  raiz: string,
  relativa: string,
  recursivo = false,
): ArchivoDeDatos[] {
  const absoluta = path.join(raiz, relativa);
  if (!existsSync(absoluta)) return [];
  const archivos: ArchivoDeDatos[] = [];
  for (const nombre of readdirSync(absoluta).sort()) {
    const hijo = path.join(absoluta, nombre);
    if (statSync(hijo).isDirectory()) {
      if (recursivo)
        archivos.push(...leerCarpeta(raiz, path.join(relativa, nombre), true));
    } else if (nombre.endsWith(".json")) {
      archivos.push(leer(raiz, hijo));
    }
  }
  return archivos;
}

/**
 * El catálogo de `raiz/datos/`. `agregar` suma archivos de prueba de fuera de `datos/` (las semillas del
 * kit de prueba): así se ve qué hace el validador con ellas sobre el catálogo real.
 */
export function cargarCatalogo(
  raiz: string,
  agregar: readonly string[] = [],
): CatalogoEnBruto {
  return {
    familias: leerUnico(raiz, RUTAS_UNICAS.familias),
    reglas_de_veredicto: leerUnico(raiz, RUTAS_UNICAS.reglas_de_veredicto),
    rasgos: leerUnico(raiz, RUTAS_UNICAS.rasgos),
    filtro: leerUnico(raiz, RUTAS_UNICAS.filtro),
    umbrales: leerUnico(raiz, RUTAS_UNICAS.umbrales),
    estados: leerUnico(raiz, RUTAS_UNICAS.estados),
    marcos: leerCarpeta(raiz, CARPETAS.marcos),
    equivalencias: leerCarpeta(raiz, CARPETAS.equivalencias),
    controles: leerCarpeta(raiz, CARPETAS.controles),
    herramientas: leerCarpeta(raiz, CARPETAS.herramientas),
    pruebas: [
      ...leerCarpeta(raiz, CARPETAS.pruebas, true),
      ...agregar.map((archivo) => leer(raiz, path.resolve(archivo))),
    ],
  };
}

/** Carpetas de `datos/` que el catálogo no lee a propósito. */
const NO_SON_CATALOGO = ["datos/privado", "datos/instantaneas"];

/**
 * Los archivos de `datos/` que `cargarCatalogo` no leyó: otra extensión, una carpeta mal escrita o una subcarpeta
 * que no se recorre. Ignora los nombres que empiezan por «.» y las carpetas que no son catálogo. El CLI los
 * avisa, para que un archivo que no se lee no pase en silencio.
 */
export function noLeidos(raiz: string, entrada: CatalogoEnBruto): string[] {
  const leidas = new Set<string>(
    Object.values(entrada).flatMap((v: ArchivoDeDatos | ArchivoDeDatos[] | null) =>
      v === null ? [] : Array.isArray(v) ? v.map((a) => a.ruta) : [v.ruta],
    ),
  );
  const fuera: string[] = [];
  const recorrer = (relativa: string) => {
    const absoluta = path.join(raiz, relativa);
    if (!existsSync(absoluta)) return;
    for (const nombre of readdirSync(absoluta).sort()) {
      if (nombre.startsWith(".")) continue;
      const hija = `${relativa}/${nombre}`;
      if (NO_SON_CATALOGO.includes(hija)) continue;
      if (statSync(path.join(raiz, hija)).isDirectory()) recorrer(hija);
      else if (!leidas.has(hija)) fuera.push(hija);
    }
  };
  recorrer("datos");
  return fuera;
}
