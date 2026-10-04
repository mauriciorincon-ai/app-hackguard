// Copia la maqueta de la Etapa de Diseño (docs/diseno/) a public/diseno/ antes de `next build`,
// para que el export estático la sirva en /diseno/… (preview protegido de Vercel, `pnpm start`,
// Playwright). La fuente de verdad es docs/diseno/; public/diseno/ es DERIVADO: está en
// .gitignore y en los globalIgnores de ESLint, y se regenera entero en cada build.
//
// Declara el árbol que lee y aborta si el destino sale de public/ (regla 17-bis b).
import { cpSync, existsSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "docs", "diseno");
const destino = join(raiz, "public", "diseno");

if (!existsSync(origen) || !statSync(origen).isDirectory()) {
  console.error(`copiar-maqueta: no existe ${origen}; nada que copiar.`);
  process.exit(0);
}
if (!destino.startsWith(join(raiz, "public") + "/")) {
  console.error(`copiar-maqueta: destino fuera de public/ (${destino}); aborto.`);
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, {
  recursive: true,
  // Solo lo que la maqueta sirve: HTML, CSS, JS, fuentes, SVG y licencias. Los .md (README con el
  // registro de miradas) se leen en el repo, no en el sitio.
  filter: (ruta) => statSync(ruta).isDirectory() || /\.(html|css|js|woff2|svg|txt|json)$/.test(ruta),
});
console.log(`copiar-maqueta: ${origen} → ${destino}`);
