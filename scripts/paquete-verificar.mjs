// `pnpm paquete:verificar [--en <carpeta>] [--entrega]` (C20): verifica un paquete ya armado (por defecto `dist/paquete-hoja-de-vida`): manifiesto y
// huella, SHA-256 de cada archivo (ni de más ni de menos), entrada, la base en cada enlace, cero hosts externos, cero enlaces de acceso
// (los dominios de `cero-enlaces.json`, localhost y 127.0.0.1), nada fuera de la lista blanca ni fuera de la pieza y ningún dato que
// no sea demo. Con `--entrega` exige además que el paquete venga de un árbol limpio y del commit actual (lo que se copia a hoja-de-vida).
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { conocidosDeDemo } from "../src/lib/publico/frontera.ts";
import { verificarPaquete } from "../src/lib/publico/manifiesto.ts";
import { DESTINO, dominiosDeCeroEnlaces } from "./paquete-vitrina.mjs";

const i = process.argv.indexOf("--en");
const carpeta = i > 0 ? resolve(process.argv[i + 1]) : DESTINO;
const RAIZ = join(import.meta.dirname, "..");
const commitActual = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: RAIZ,
  encoding: "utf8",
}).stdout.trim();
const fuera = await verificarPaquete(
  carpeta,
  conocidosDeDemo(RAIZ),
  dominiosDeCeroEnlaces(),
  process.argv.includes("--entrega") ? { commit: commitActual } : undefined,
);
if (fuera.length > 0) {
  for (const h of fuera.slice(0, 40))
    console.error(`  ${h.regla} · ${h.archivo} · ${h.detalle}`);
  console.error(
    `El paquete no pasa su verificación: ${fuera.length} hallazgo(s).`,
  );
  process.exit(1);
}
console.log(`El paquete (${carpeta}) pasa su verificación: 0 hallazgos.`);
