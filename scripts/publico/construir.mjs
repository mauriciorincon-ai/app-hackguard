// `pnpm build:publico` (C19): la exportación pública. Construye con HACKGUARD_PUBLICO=1 en su propia carpeta (no pisa `out/`), copia a
// `dist/publico/` SOLO lo que la lista blanca permite (src/lib/publico/lista-blanca.ts) y barre lo copiado con la frontera. Sentry va
// sin DSN. Termina con 1 si algo cruza la frontera. No abre ningún servidor.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cierreDeEstaticos } from "../../src/lib/publico/estaticos.ts";
import {
  archivoPermitido,
  rutaDeArchivo,
} from "../../src/lib/publico/lista-blanca.ts";
import {
  barrerCarpeta,
  conocidosDeDemo,
} from "../../src/lib/publico/frontera.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXPORTADO = join(RAIZ, ".next-publico");
const DESTINO = join(RAIZ, "dist", "publico");

const archivosDe = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosDe(join(dir, e.name)) : [join(dir, e.name)],
  );

export function construirPublico({
  env = process.env,
  destino = DESTINO,
  exportado = EXPORTADO,
} = {}) {
  rmSync(exportado, { recursive: true, force: true });
  const r = spawnSync(join(RAIZ, "node_modules", ".bin", "next"), ["build"], {
    cwd: RAIZ,
    stdio: "inherit",
    env: { ...env, HACKGUARD_PUBLICO: "1", NEXT_PUBLIC_SENTRY_DSN: "" },
  });
  if (r.status !== 0) throw new Error("next build falló");

  rmSync(destino, { recursive: true, force: true });
  const copiar = (rel) => {
    mkdirSync(dirname(join(destino, rel)), { recursive: true });
    copyFileSync(join(exportado, rel), join(destino, rel));
  };
  // 1) Las rutas de la lista blanca y los archivos sueltos de la raíz. El directorio de construcción de Next comparte carpeta con el
  //    export: lo que no está en la lista no viaja. 2) De `_next/`, solo lo que esas páginas nombran (y lo que eso nombra).
  const todos = archivosDe(exportado).map((a) =>
    relative(exportado, a).split("\\").join("/"),
  );
  const paginas = todos.filter(
    (rel) => rutaDeArchivo(rel) !== null && archivoPermitido(rel),
  );
  const sueltos = todos.filter(
    (rel) =>
      rutaDeArchivo(rel) === null &&
      !rel.startsWith("_next/") &&
      archivoPermitido(rel),
  );
  const semillas = [...paginas, ...sueltos].filter((rel) =>
    /\.(?:html|txt)$/.test(rel),
  );
  const estaticos = cierreDeEstaticos(exportado, semillas);
  for (const rel of [...paginas, ...sueltos, ...estaticos]) copiar(rel);
  const copiados = paginas.length + sueltos.length + estaticos.length;
  const omitidos = todos.length - copiados;
  const fuera = barrerCarpeta(destino, conocidosDeDemo(RAIZ));
  return { copiados, omitidos, fuera };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { copiados, omitidos, fuera } = construirPublico();
  console.log(
    `dist/publico: ${copiados} archivos copiados, ${omitidos} fuera de la lista blanca (no viajan).`,
  );
  if (fuera.length > 0) {
    for (const h of fuera.slice(0, 40))
      console.error(`  ${h.regla} · ${h.archivo} · ${h.detalle}`);
    console.error(`La frontera falla: ${fuera.length} hallazgo(s).`);
    process.exit(1);
  }
  console.log("La frontera del modo público: 0 hallazgos.");
}
