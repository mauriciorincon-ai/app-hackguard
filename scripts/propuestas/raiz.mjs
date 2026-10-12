// La raíz del repo y la de trabajo, sin dependencias: los hooks la importan y no pueden depender de nada que no cargue (si un hook se rompe
// al arrancar, el del agente BLOQUEA —ver entrada.mjs— y el de la sesión principal deja pasar; por eso aquí no hay `import` de paquetes).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ_REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Dónde viven datos/ y propuestas/. Las pruebas la apuntan a una copia temporal con HACKGUARD_RAIZ. */
export const RAIZ = resolve(process.env.HACKGUARD_RAIZ ?? RAIZ_REPO);
