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

function leer(raiz: string, absoluta: string): ArchivoDeDatos {
  const ruta = path.relative(raiz, absoluta).split(path.sep).join("/");
  return { ruta, texto: utf8.decode(readFileSync(absoluta)) };
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
