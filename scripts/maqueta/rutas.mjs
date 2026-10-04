// Rutas del generador de la maqueta. La salida por defecto es docs/diseno/ (la maqueta versionada);
// MAQUETA_SALIDA la desvía a un directorio TEMPORAL (gates de deriva y de envejecimiento). Cualquier otro
// destino aborta: el generador no escribe en el repo fuera de docs/diseno/ ni en ningún otro lugar.
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const MAQUETA = join(RAIZ, "docs", "diseno");

export function salida() {
  const pedida = process.env.MAQUETA_SALIDA;
  if (!pedida) return MAQUETA;
  const destino = resolve(pedida);
  if (destino === MAQUETA || (destino + sep).startsWith(resolve(tmpdir()) + sep)) return destino;
  throw new Error(`maqueta: MAQUETA_SALIDA solo puede ser docs/diseno/ o un directorio temporal (${destino}); aborto.`);
}
