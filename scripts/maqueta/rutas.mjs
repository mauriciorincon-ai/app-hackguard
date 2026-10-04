// Rutas del generador de la maqueta. La salida por defecto es docs/diseno/ (la maqueta versionada);
// MAQUETA_SALIDA la desvía a un directorio FUERA del repo (gates de deriva y de envejecimiento).
// Dentro del repo solo se escribe en docs/diseno/: cualquier otro destino aborta.
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const MAQUETA = join(RAIZ, "docs", "diseno");

export function salida() {
  const pedida = process.env.MAQUETA_SALIDA;
  if (!pedida) return MAQUETA;
  const destino = resolve(pedida);
  if (destino !== MAQUETA && (destino + sep).startsWith(RAIZ + sep)) {
    throw new Error(`maqueta: MAQUETA_SALIDA dentro del repo y fuera de docs/diseno/ (${destino}); aborto.`);
  }
  return destino;
}
