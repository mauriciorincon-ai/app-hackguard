#!/usr/bin/env node
// kit v1.39.0 — LO QUE EL PROVEEDOR PUBLICA NO ES LO QUE EL BUILD ESCRIBE (Big-D S2, S2-AUD-32, Alto).
// En Vercel, Next 16 compila con el adapter de Vercel (`NEXT_ENABLE_ADAPTER=1`): dentro de `next build` copia las
// páginas a `.next/output/static/` y Vercel publica ESA copia, no `out/`. Todo paso posterior al build que modifica
// `out/` (una CSP por <meta>, un manifiesto, huellas) puede no llegar a producción sin que ninguna prueba local lo
// vea: las e2e y Lighthouse sirven `out/`. Este gate compara la carpeta PUBLICADA con `out/`: cada página .html de
// una está en la otra y es idéntica byte a byte; una carpeta vacía también falla (no demuestra nada).
// Lo invoca `scripts/build-como-proveedor.mjs` tras `vercel build`; se puede correr a mano:
//   node scripts/verificar-salida-publicada.mjs <carpeta-publicada> [referencia=out]
// Patrón: wiki/patterns/lo-que-el-proveedor-publica.md (planeadora, RO).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

/** Rutas relativas de todas las páginas .html bajo `carpeta`, ordenadas. */
export function paginas(carpeta, dir = carpeta) {
  return readdirSync(dir)
    .flatMap((f) => {
      const ruta = join(dir, f);
      if (statSync(ruta).isDirectory()) return paginas(carpeta, ruta);
      return f.endsWith(".html") ? [relative(carpeta, ruta)] : [];
    })
    .sort();
}

/**
 * Lo que falla al comparar la carpeta `publicada` con `referencia`. Vacío = todo bien.
 * @param {string} publicada  lo que el proveedor publica (p. ej. `.vercel/output/static`)
 * @param {string} referencia lo que prueban las e2e y Lighthouse (p. ej. `out`)
 * @returns {{ paginas: number, fallas: string[] }}
 */
export function fallasDeSalida(publicada, referencia) {
  if (!existsSync(publicada)) return { paginas: 0, fallas: [`${publicada}: no existe`] };
  if (!existsSync(referencia)) return { paginas: 0, fallas: [`${referencia}: no existe`] };
  const pub = paginas(publicada);
  const ref = paginas(referencia);
  const fallas = pub.length ? [] : [`${publicada}: no tiene páginas`];
  const enRef = new Set(ref);
  for (const p of pub) {
    if (!enRef.has(p)) {
      fallas.push(`${p}: se publica y no está en ${referencia}`);
      continue;
    }
    const a = readFileSync(join(publicada, p));
    const b = readFileSync(join(referencia, p));
    if (!a.equals(b)) fallas.push(`${p}: distinta de la de ${referencia} (${a.length} vs ${b.length} bytes)`);
  }
  const enPub = new Set(pub);
  for (const p of ref) if (!enPub.has(p)) fallas.push(`${p}: está en ${referencia} y no se publica`);
  return { paginas: pub.length, fallas };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [publicada, referencia = "out"] = process.argv.slice(2);
  if (!publicada) {
    console.error("uso: node scripts/verificar-salida-publicada.mjs <carpeta-publicada> [referencia=out]");
    process.exit(2);
  }
  const r = fallasDeSalida(publicada, referencia);
  if (r.fallas.length) {
    console.error(`✗ salida publicada: ${r.fallas.length} falla(s) entre ${publicada} y ${referencia}`);
    for (const f of r.fallas) console.error(`  - ${f}`);
    console.error("Lo que el proveedor publica no es lo que el build escribió. Todo paso posterior al build debe escribir en las dos carpetas.");
    process.exit(1);
  }
  console.log(`✓ salida publicada: ${r.paginas} páginas en ${publicada}, cada una idéntica a la de ${referencia}`);
}
