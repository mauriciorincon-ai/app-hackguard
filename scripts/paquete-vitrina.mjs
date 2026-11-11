// `pnpm paquete:vitrina` (C20): arma el paquete estático que CV Viva monta en `public/piezas/hackguard/`. Construye con la base de la pieza,
// copia solo lo que la lista blanca permite (sin RSC), escribe el manifiesto con el SHA-256 de cada archivo y lo verifica de punta a punta
// (`paquete:verificar`). Escribe SOLO en `dist/`: no toca hoja-de-vida (la entrega es un PR de contenido de la planeadora).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copiarExportacion } from "../src/lib/publico/copiar.ts";
import { conocidosDeDemo } from "../src/lib/publico/frontera.ts";
import {
  armarManifiesto,
  CARPETA_DE_LA_PIEZA,
  verificarPaquete,
} from "../src/lib/publico/manifiesto.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPORTADO = join(RAIZ, ".next-paquete");
export const DESTINO = join(RAIZ, "dist", "paquete-hoja-de-vida");

const git = (...a) =>
  spawnSync("git", a, { cwd: RAIZ, encoding: "utf8" }).stdout.trim();
export const dominiosDeCeroEnlaces = () =>
  JSON.parse(readFileSync(join(RAIZ, "cero-enlaces.json"), "utf8")).dominios;

export async function armarPaquete({ env = process.env } = {}) {
  rmSync(EXPORTADO, { recursive: true, force: true });
  const r = spawnSync(join(RAIZ, "node_modules", ".bin", "next"), ["build"], {
    cwd: RAIZ,
    stdio: "inherit",
    env: {
      ...env,
      HACKGUARD_PAQUETE: "1",
      HACKGUARD_PUBLICO: "1",
      NEXT_PUBLIC_SENTRY_DSN: "",
    },
  });
  if (r.status !== 0) throw new Error("next build falló");
  rmSync(DESTINO, { recursive: true, force: true });
  const pieza = join(DESTINO, CARPETA_DE_LA_PIEZA);
  mkdirSync(pieza, { recursive: true });
  const { copiados, omitidos } = copiarExportacion(EXPORTADO, pieza, {
    sinRsc: true,
  });
  const version = JSON.parse(
    readFileSync(join(RAIZ, "package.json"), "utf8"),
  ).version;
  const manifiesto = await armarManifiesto({
    raiz: DESTINO,
    version,
    commit: git("rev-parse", "HEAD"),
    arbolLimpio: git("status", "--porcelain") === "",
  });
  writeFileSync(
    join(DESTINO, "manifiesto.json"),
    `${JSON.stringify(manifiesto, null, 2)}\n`,
  );
  const fuera = await verificarPaquete(
    DESTINO,
    conocidosDeDemo(RAIZ),
    dominiosDeCeroEnlaces(),
  );
  return { copiados, omitidos, manifiesto, fuera };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { manifiesto, omitidos, fuera } = await armarPaquete();
  console.log(
    `dist/paquete-hoja-de-vida: ${manifiesto.n_archivos} archivos (${manifiesto.bytes} bytes), ${omitidos} fuera de la lista blanca · base ${manifiesto.base} · huella ${manifiesto.huella.slice(0, 12)}`,
  );
  if (fuera.length > 0) {
    for (const h of fuera.slice(0, 40))
      console.error(`  ${h.regla} · ${h.archivo} · ${h.detalle}`);
    console.error(
      `El paquete no pasa su verificación: ${fuera.length} hallazgo(s).`,
    );
    process.exit(1);
  }
  console.log("El paquete pasa su verificación: 0 hallazgos.");
}
