// Qué archivos de `_next/` viajan: solo los que las páginas permitidas nombran, y los que esos archivos nombran a su vez. El
// build de Next junta el código de TODAS las rutas en `_next/static/chunks/`; copiarlo entero llevaría a la exportación pública
// el código (y las cadenas) de pantallas que no están en la lista blanca, como las del alta de un activo. Corre en Node.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REFERENCIA = /(?:_next\/)?static\/[A-Za-z0-9_.\-/]+\.[A-Za-z0-9]+/g;

/**
 * Los archivos estáticos (`_next/static/...`) alcanzables desde `semillas` (archivos de texto ya copiados), en el export de `raiz`.
 * Cierre transitivo: un chunk de JS que nombra a otro lo arrastra. Devuelve rutas relativas con `/` y sin repetir.
 */
export function cierreDeEstaticos(
  raiz: string,
  semillas: readonly string[],
): string[] {
  const vistos = new Set<string>();
  const pendientes: string[] = [];
  const nombrar = (texto: string) => {
    for (const m of texto.matchAll(REFERENCIA)) {
      const rel = m[0].startsWith("_next/") ? m[0] : `_next/${m[0]}`;
      if (!vistos.has(rel) && existsSync(join(raiz, rel))) {
        vistos.add(rel);
        pendientes.push(rel);
      }
    }
  };
  for (const s of semillas) nombrar(readFileSync(join(raiz, s), "utf8"));
  while (pendientes.length > 0) {
    const rel = pendientes.pop()!;
    if (/\.(?:js|css|json)$/.test(rel))
      nombrar(readFileSync(join(raiz, rel), "utf8"));
  }
  return [...vistos].sort();
}
