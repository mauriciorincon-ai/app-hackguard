// Copia la maqueta de la Etapa de Diseño (docs/diseno/) a public/diseno/ antes de `next build`,
// para que el export estático la sirva en /diseno/… (preview protegido de Vercel, `pnpm start`,
// Playwright). La fuente de verdad es docs/diseno/; public/diseno/ es DERIVADO: está en
// .gitignore y en los globalIgnores de ESLint, y se regenera entero en cada build.
//
// Declara el árbol que lee (regla 17-bis b): solo docs/diseno/ de este repo, hacia public/diseno/, que es
// fijo. Sin la maqueta, el build falla: un sitio sin /diseno/ no debe pasar en verde.
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "docs", "diseno");
const destino = join(raiz, "public", "diseno");

if (!existsSync(origen) || !statSync(origen).isDirectory()) {
  console.error(`copiar-maqueta: no existe ${origen}; el sitio saldría sin la maqueta. Aborto.`);
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

// El brochure (docs/BROCHURE.html) se sirve como la ruta pública /conoce: la entrega ideal de un brochure es un enlace. La fuente es
// el archivo de docs/; public/conoce/ es DERIVADO (ignorado por git), como public/diseno/. Autocontenido: un solo archivo.
const brochure = join(raiz, "docs", "BROCHURE.html");
if (!existsSync(brochure)) {
  console.error(`copiar-maqueta: no existe ${brochure}; /conoce saldría vacía. Aborto.`);
  process.exit(1);
}
const rutaConoce = join(raiz, "public", "conoce");
rmSync(rutaConoce, { recursive: true, force: true });
mkdirSync(rutaConoce, { recursive: true });
cpSync(brochure, join(rutaConoce, "index.html"));
console.log(`copiar-maqueta: ${brochure} → ${join(rutaConoce, "index.html")}`);
