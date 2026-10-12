// Guardar lo que se leyó (una página o un texto pegado) para que el sellado pueda comprobar sus citas sin red: el texto normalizado, con su
// huella por nombre, en `propuestas/.lecturas/` (ignorada por git). Un derivado nunca nace menos privado que su fuente (regla 17-bis):
// la carpeta 0700 y el archivo 0600. Solo viaja al repositorio la huella y el pasaje citado.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  huellaDeTexto,
  normalizarEspacios,
} from "../../engine/propuestas/citas.ts";
import { CARPETA_DE_LECTURAS } from "./cargar.ts";

/** El ancho al que se envuelve lo guardado: un modelo lee y busca por líneas, y una página entera en una sola línea no se puede leer. */
export const ANCHO_DE_LINEA = 100;

/**
 * Parte el texto en líneas de a lo sumo `ancho` caracteres, solo donde había UN espacio (jamás se agrega ni se quita un carácter que no
 * sea ese espacio): la forma normalizada del resultado es la del texto, y por tanto su huella.
 */
export function envolver(
  texto: string,
  ancho: number = ANCHO_DE_LINEA,
): string {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    if (actual === "") actual = palabra;
    else if (actual.length + 1 + palabra.length <= ancho)
      actual += ` ${palabra}`;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  lineas.push(actual);
  return lineas.join("\n");
}

/** Guarda el texto (legible, por líneas) y devuelve su huella, que es la de su forma normalizada. */
export async function guardarLectura(
  raiz: string,
  texto: string,
): Promise<string> {
  const normalizado = normalizarEspacios(texto);
  const huella = await huellaDeTexto(normalizado);
  const carpeta = join(raiz, CARPETA_DE_LECTURAS);
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  writeFileSync(join(carpeta, `${huella}.txt`), envolver(normalizado), {
    encoding: "utf8",
    mode: 0o600,
  });
  return huella;
}
