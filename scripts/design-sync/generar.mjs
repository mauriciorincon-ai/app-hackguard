// Bundle publicable del design system (regla 16 de la constitución; `/design-sync`). design-sync/ DERIVA de
// design-system.md y de la maqueta: este script lo escribe entero y nadie lo edita a mano.
//   - styles.css: las hojas de la maqueta tal cual (tokens.css y app.css), sin las caras de letra.
//   - components/<grupo>/<tarjeta>.html: una tarjeta por panel del kit (scripts/maqueta/paginas/kit.mjs), con el
//     mismo HTML que dibuja kit.html. Primera línea @dsCard, CSS en línea, nada pedido a la red ni a otro archivo;
//     arriba el tema oscuro en español y abajo el claro en inglés.
//   - README.md: de qué versión sale y qué tarjetas trae.
// project.json NO lo escribe este script: guarda el destino y el registro de publicación, que actualiza /design-sync.
//
// Uso: `pnpm design-sync:bundle`. tests/unit/design-sync.test.ts exige que lo versionado sea lo generado.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { panelDelKit, panelesDelKit } from "../maqueta/paginas/kit.mjs";
import { MAQUETA, RAIZ } from "../maqueta/rutas.mjs";

export const SALIDA = join(RAIZ, "design-sync");

const version = /^version:\s*(\S+)/m.exec(readFileSync(join(RAIZ, "design-system.md"), "utf8"))?.[1];
if (!version) throw new Error("design-sync: design-system.md no declara su versión en el frente");

// Las caras de letra piden sus archivos (fuentes/…): fuera de la maqueta no existen. La tarjeta declara la pila.
const HOJAS = ["tokens.css", "app.css"]
  .map((h) => readFileSync(join(MAQUETA, "assets", h), "utf8").replace(/@font-face\s*\{[^}]*\}\s*/g, "").trim())
  .join("\n\n");
if (/\burl\(/.test(HOJAS)) throw new Error("design-sync: las hojas piden un archivo con url(); la tarjeta no lo tendría");

const DE_LA_TARJETA = `/* La tarjeta: los dos temas uno sobre otro, cada uno en un idioma. Sin maqueta.js, lo que el kit cambia al
   pulsar queda en su estado inicial. */
body {
  display: grid;
  gap: var(--e-5);
  padding: var(--e-5);
}
.ds-tema {
  display: grid;
  gap: var(--e-4);
  padding: var(--e-5);
  border: 1px solid var(--linea);
  border-radius: var(--radio);
  background: var(--fondo);
  color: var(--tinta);
}
.ds-tema[data-idioma="es"] [lang="en"],
.ds-tema[data-idioma="en"] [lang="es"],
[data-theme="oscuro"] [data-si-tema="claro"],
[data-theme="claro"] [data-si-tema="oscuro"] {
  display: none !important;
}`;

const sinAcentos = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
const archivoDe = (texto) => sinAcentos(texto).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Los enlaces del kit llevan a páginas de la maqueta, que la tarjeta no tiene.
const sinEnlaces = (html) => html.replace(/href="(?!#)[^"]*"/g, 'href="#"');

/** La copia en inglés: atributos y opciones en su idioma, y cada id con sufijo para no repetir los de la copia en español. */
function enIngles(html) {
  return html
    .replace(/([\w-]+)="([^"]*)" data-\1-es="\2" data-\1-en="([^"]*)"/g, '$1="$3" data-$1-es="$2" data-$1-en="$3"')
    .replace(/(<option\b[^>]*\bdata-en="([^"]*)"[^>]*>)[^<]*(<\/option>)/g, "$1$2$3")
    .replace(/(?<![\w-])(id|for|aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g, (_, nombre, ids) =>
      `${nombre}="${ids.split(" ").map((id) => `${id}-en`).join(" ")}"`,
    );
}

const TARJETAS = panelesDelKit().map((p) => {
  const nombre = p.titulo.es;
  const html = sinEnlaces(panelDelKit(p));
  return {
    grupo: p.grupo,
    nombre,
    archivo: `${archivoDe(p.grupo)}/${archivoDe(nombre)}.html`,
    html: `<!-- @dsCard group="${p.grupo}" name="${nombre}" -->
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nombre} · HackGuard ${version}</title>
<style>
${HOJAS}

${DE_LA_TARJETA}
</style>
</head>
<body>
<section class="ds-tema" data-theme="oscuro" data-idioma="es" aria-label="Tema oscuro, español">
<p class="hg-rotulo">Tema oscuro · español</p>
${html}
</section>
<section class="ds-tema" data-theme="claro" data-idioma="en" lang="en" aria-label="Light theme, English">
<p class="hg-rotulo">Light theme · English</p>
${enIngles(html)}
</section>
</body>
</html>
`,
  };
});

const STYLES = `/* GENERADO por scripts/design-sync/generar.mjs desde design-system.md ${version} — no editar a mano.
   Las hojas de la maqueta (docs/diseno/assets/tokens.css y app.css) sin las caras de letra: Atkinson Hyperlegible
   Next y Mono las sirve la app; aquí queda la pila. */
${HOJAS}
`;

const README = `# HackGuard · bundle del design system

> GENERADO por \`pnpm design-sync:bundle\` (\`scripts/design-sync/generar.mjs\`) desde \`design-system.md\` ${version} y la
> maqueta de \`docs/diseno/\`. No se edita a mano: \`tests/unit/design-sync.test.ts\` exige los mismos bytes.

Espejo publicable del design system de HackGuard para Claude Design (regla 16 de la constitución). La jerarquía es
fija: \`design-system.md\` (fuente de verdad) → \`design-sync/\` (este bundle, deriva) → el proyecto en Claude Design
(vitrina, jamás se edita allá). El destino y el registro de publicación viven en \`project.json\`.

**Estado:** sin publicar. Se publica después del gate ⭐⭐ del ciclo H1, cuando el usuario invoque \`/design-sync\`.

## Qué trae

- \`styles.css\`: las hojas de la maqueta tal cual: \`tokens.css\` (los dos temas, generados y medidos) y \`app.css\` (la
  dirección «consola»), sin las caras de letra.
- Una tarjeta por panel del kit (\`docs/diseno/kit.html\`), con el mismo HTML. Su primera línea es la marca \`@dsCard\`
  con la que Claude Design la indexa; lleva el CSS en línea y no pide nada a la red ni a otro archivo. Arriba, el
  tema oscuro en español; abajo, el claro en inglés.

| Grupo | Tarjeta | Archivo |
| --- | --- | --- |
${TARJETAS.map((c) => `| ${c.grupo} | ${c.nombre} | \`components/${c.archivo}\` |`).join("\n")}

## Lo que no está aquí

- **El armazón y las pantallas** (barra lateral, barra de contexto, carril de acción, cada pantalla con sus estados):
  viven en la maqueta, que es la referencia de fidelidad del producto.
- **Las fuentes:** las tarjetas declaran la pila sin descargar Atkinson Hyperlegible Next ni Mono; donde no están
  instaladas se ve la letra del sistema.
- **La interacción:** sin \`maqueta.js\`, botones, pestañas y campos quedan en su estado inicial; en la maqueta cambian
  al pulsarlos.
`;

const ARCHIVOS = {
  "README.md": README,
  "styles.css": STYLES,
  ...Object.fromEntries(TARJETAS.map((c) => [`components/${c.archivo}`, c.html])),
};

/** Lo que el bundle debe contener, ruta relativa a design-sync/ → contenido. */
export function archivosDelBundle() {
  return ARCHIVOS;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  // components/ es derivado entero: se rehace para que una tarjeta retirada no quede en disco.
  rmSync(join(SALIDA, "components"), { recursive: true, force: true });
  for (const [ruta, contenido] of Object.entries(ARCHIVOS)) {
    const destino = join(SALIDA, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  }
  console.log(`design-sync: ${Object.keys(ARCHIVOS).length} archivos → design-sync/ · design-system.md ${version}`);
}
