// `pnpm build:publico` (C19): la exportación pública. Construye con HACKGUARD_PUBLICO=1 en su propia carpeta (no pisa `out/`), copia a
// `dist/publico/` SOLO lo que la lista blanca permite (src/lib/publico/lista-blanca.ts) y barre lo copiado con la frontera. Sentry va
// sin DSN. Termina con 1 si algo cruza la frontera. No abre ningún servidor.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copiarExportacion } from "../../src/lib/publico/copiar.ts";
import {
  barrerCarpeta,
  conocidosDeDemo,
} from "../../src/lib/publico/frontera.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXPORTADO = join(RAIZ, ".next-publico");
const DESTINO = join(RAIZ, "dist", "publico");

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
  const { copiados, omitidos } = copiarExportacion(exportado, destino);
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
