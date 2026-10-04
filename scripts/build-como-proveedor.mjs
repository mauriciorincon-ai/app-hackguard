#!/usr/bin/env node
// kit v1.39.0 — LA CI CONSTRUYE COMO EL PROVEEDOR (perfil `--estatico`; Big-D S2, S2-AUD-32).
// Un `pnpm build` local no reproduce el entorno de Vercel: allá Next 16 compila con el adapter de Vercel y publica
// `.next/output/static/` (copiado DURANTE `next build`), no `out/`. Este paso corre en el job `quality` tras
// `pnpm build`:
//   1. si `next.config.*` no declara `output: "export"`, no aplica (perfil web: el proveedor publica lo que `next
//      build` emite) y sale 0 diciéndolo;
//   2. si aplica, hace `vercel build` SIN conexión ni sesión (el proyecto se declara en `.vercel/project.json`
//      mínimo) con `NEXT_ENABLE_ADAPTER=1`, y
//   3. exige que cada página publicada sea idéntica a la de `out/` (scripts/verificar-salida-publicada.mjs).
// El CLI de Vercel va FIJADO aquí, fuera del lockfile (dependabot no lo ve): se sube a mano cuando Vercel cambie su
// builder y se re-verifica el rojo (demo: modificar una página de out/ tras el build → debe fallar).
//   node scripts/build-como-proveedor.mjs            (en CI)
//   node scripts/build-como-proveedor.mjs --solo-detectar   (dice si aplica, sin construir)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fallasDeSalida } from "./verificar-salida-publicada.mjs";

export const VERCEL_CLI = "vercel@60.1.3"; // fijado fuera del lockfile — subir a mano y re-verificar el rojo
export const PUBLICADA = ".vercel/output/static";
export const REFERENCIA = "out";

/** ¿La app es export estático? Lee `output: "export"` en next.config.{ts,mjs,js}. */
export function esExportEstatico(leer = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null)) {
  for (const f of ["next.config.ts", "next.config.mjs", "next.config.js"]) {
    const t = leer(f);
    if (t && /output\s*:\s*["']export["']/.test(t)) return true;
  }
  return false;
}

/** Proyecto mínimo para que `vercel build` corra sin sesión ni red. No lleva credenciales. */
export function proyectoMinimo() {
  return JSON.stringify({
    projectId: "prj_ci",
    orgId: "team_ci",
    settings: { framework: "nextjs", installCommand: "true" },
  });
}

function principal() {
  if (!esExportEstatico()) {
    console.log("build-como-proveedor: n/a — perfil web, el proveedor publica lo que `next build` emite");
    return 0;
  }
  if (process.argv.includes("--solo-detectar")) {
    console.log("build-como-proveedor: aplica (output: \"export\")");
    return 0;
  }
  mkdirSync(".vercel", { recursive: true });
  if (!existsSync(".vercel/project.json")) writeFileSync(".vercel/project.json", proyectoMinimo());
  execFileSync("pnpm", ["dlx", VERCEL_CLI, "build", "--yes"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_ENABLE_ADAPTER: "1", VERCEL_TELEMETRY_DISABLED: "1" },
  });
  const r = fallasDeSalida(PUBLICADA, REFERENCIA);
  if (r.fallas.length) {
    console.error(`✗ build-como-proveedor: ${r.fallas.length} falla(s) entre ${PUBLICADA} y ${REFERENCIA}`);
    for (const f of r.fallas) console.error(`  - ${f}`);
    return 1;
  }
  console.log(`✓ build-como-proveedor: ${r.paginas} páginas publicadas idénticas a ${REFERENCIA}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(principal());
