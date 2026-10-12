// Las tres huellas del sobre (E-9): el crudo, el sobre canónico y el resultado sin identificadores de corrida.
// Todo pasa por `huella` (JCS + SHA-256): la misma entrada da los mismos bytes en Node y en los navegadores.
import { huella, sha256 } from "../huella.ts";
import type { HuellasDelSobre, Sobre } from "./esquemas.ts";

/** Un sobre antes de sellarlo: todo menos sus huellas. */
export type SobreSinHuellas = Omit<Sobre, "huellas">;

/** El sobre sin `huellas`, sin tocar lo demás (la confirmación sí entra: confirmado, el sobre es otro). */
export function sinHuellas(s: Sobre | SobreSinHuellas): SobreSinHuellas {
  return Object.fromEntries(
    Object.entries(s).filter(([clave]) => clave !== "huellas"),
  ) as SobreSinHuellas;
}

/**
 * Lo que se compara entre dos corridas: la prueba, el activo, la configuración y lo que se midió. No lleva ni
 * la fecha, ni quién la ejecutó, ni el identificador del sobre, ni las advertencias.
 */
export function cuerpoDelResultado(s: SobreSinHuellas) {
  return {
    activo: s.activo,
    prueba: s.prueba,
    herramienta: s.herramienta,
    selector: s.selector,
    regla: s.regla,
    k: s.k,
    resultado: s.resultado,
    veredicto: s.veredicto,
  };
}

export const huellaDelResultado = (s: SobreSinHuellas): Promise<string> =>
  huella(cuerpoDelResultado(s));

export const huellaDelSobre = (s: SobreSinHuellas): Promise<string> =>
  huella(s);

/** La huella de los bytes que la herramienta escribió. El archivo se lee, se resume y se descarta. */
export const huellaDelCrudo = (bytes: Uint8Array): Promise<string> =>
  sha256Bytes(bytes);

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  // Una copia con su propio ArrayBuffer: así `digest` la acepta venga de Node (Buffer) o del navegador.
  const resumen = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes),
  );
  return Array.from(new Uint8Array(resumen), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** La huella de un crudo SINTÉTICO: la de los sobres demo, que no vienen de ninguna herramienta (regla dura 8). */
export const textoDelCrudoSintetico = (id: string): string =>
  `crudo-sintetico:${id}`;
export const huellaDelCrudoSintetico = (id: string): Promise<string> =>
  sha256(textoDelCrudoSintetico(id));

/** Las tres huellas de un sobre, dado el crudo ya resumido. */
export async function huellasDe(
  s: SobreSinHuellas,
  crudo: string,
): Promise<HuellasDelSobre> {
  return {
    crudo,
    sobre: await huellaDelSobre(s),
    resultado: await huellaDelResultado(s),
  };
}

/** Sella un sobre: le pone sus tres huellas. */
export async function sellar(
  s: SobreSinHuellas,
  crudo: string,
): Promise<Sobre> {
  return { ...s, huellas: await huellasDe(s, crudo) };
}

/** Vuelve a sellar un sobre cambiado (la confirmación) conservando la huella del crudo. */
export const resellar = (s: Sobre): Promise<Sobre> =>
  sellar(sinHuellas(s), s.huellas.crudo);
