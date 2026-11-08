#!/usr/bin/env node
// Genera lo que `docs/BROCHURE.html` toma del export de la vitrina: el titular, las cuatro tarjetas (nombre y línea) y las
// funcionalidades de cada una. El español sale de `docs/brochure-export.json`; el inglés, de `docs/brochure-en.json` (lo redacta la
// app: el export solo tiene español). Lo demás de la página (escenas, hilo, negativas, lo fino) es de la pieza y no se toca; las cifras
// las escribe `scripts/cifras-del-export.mjs`. Después de generar, corre `scripts/csp-del-brochure.mjs` si el único script cambió.
//
//   node scripts/brochure.mjs            escribe docs/BROCHURE.html
//   node scripts/brochure.mjs --verificar  sale con 1 si el archivo versionado no es lo que el generador produce
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Escapa como el resto de la página (el apóstrofo sale como &#x27;). */
export function escapar(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const par = (es, en) =>
  `<span lang="es">${escapar(es)}</span><span lang="en">${escapar(en)}</span>`;

function faltante(donde) {
  throw new Error(`falta el inglés de ${donde} en docs/brochure-en.json`);
}

/** El HTML de una funcionalidad: la misma forma en las 18. */
export function htmlDeFuncionalidad(f, en) {
  const t = en?.features?.[f.id];
  if (!t?.nombre || !t?.que_hace) faltante(f.id);
  return (
    `<div class="feature" data-feature="${f.id}"><h4>${par(f.nombre, t.nombre)}</h4>` +
    `<p class="como" lang="es">${escapar(f.que_hace)}</p>` +
    `<p class="como" lang="en">${escapar(t.que_hace)}</p></div>`
  );
}

/** Reescribe del HTML lo que viene del export. Pura: mismo export, mismo inglés, mismos bytes. */
export function generarBrochure(exportado, en, html) {
  let salida = html;

  // Titular
  if (!en.tagline) faltante("el titular");
  const h1 =
    /<h1><span lang="es">[^<]*<\/span><span lang="en">[^<]*<\/span><\/h1>/;
  if (!h1.test(salida))
    throw new Error("el brochure no tiene su <h1> con los dos idiomas");
  salida = salida.replace(
    h1,
    `<h1>${par(exportado.promesa.tagline, en.tagline)}</h1>`,
  );

  const grupos = exportado.funcionalidades.grupos;
  grupos.forEach((g, i) => {
    const n = i + 1;
    const e = en.grupos?.[String(g.orden)];
    if (!e?.nombre || !e?.linea) faltante(`la tarjeta ${g.orden}`);
    // Nombre y línea de la tarjeta
    const cabeza = new RegExp(
      `<span class="titulo" id="ti${n}"><span lang="es">[^<]*</span><span lang="en">[^<]*</span></span>` +
        `<span class="linea"><span lang="es">[^<]*</span><span lang="en">[^<]*</span></span>`,
    );
    if (!cabeza.test(salida))
      throw new Error(`falta la cabeza de la tarjeta ti${n}`);
    salida = salida.replace(
      cabeza,
      `<span class="titulo" id="ti${n}">${par(g.nombre, e.nombre)}</span><span class="linea">${par(g.linea, e.linea)}</span>`,
    );
  });

  // Cuerpos: una pasada por tarjeta, en orden, sobre cada `.detalle-cuerpo`
  const cuerpos = [...salida.matchAll(/<div class="detalle-cuerpo">/g)];
  if (cuerpos.length !== grupos.length)
    throw new Error(
      `el brochure tiene ${cuerpos.length} tarjetas y el export ${grupos.length}`,
    );
  let i = 0;
  salida = salida.replace(
    /<div class="detalle-cuerpo">(?:<div class="feature" data-feature="F\d+">.*?<\/p><\/div>)+(\s*)<\/div>/gs,
    (_, espacio) => {
      const g = grupos[i++];
      return `<div class="detalle-cuerpo">${g.features.map((f) => htmlDeFuncionalidad(f, en)).join("")}${espacio}</div>`;
    },
  );
  if (i !== grupos.length)
    throw new Error("no se reconoció el cuerpo de todas las tarjetas");
  return salida;
}

export function generar() {
  const exportado = JSON.parse(
    readFileSync(join(RAIZ, "docs/brochure-export.json"), "utf8"),
  );
  const en = JSON.parse(
    readFileSync(join(RAIZ, "docs/brochure-en.json"), "utf8"),
  );
  const actual = readFileSync(join(RAIZ, "docs/BROCHURE.html"), "utf8");
  return { actual, nuevo: generarBrochure(exportado, en, actual) };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { actual, nuevo } = generar();
  if (process.argv.includes("--verificar")) {
    if (nuevo !== actual) {
      console.error(
        "docs/BROCHURE.html no es lo que genera scripts/brochure.mjs",
      );
      process.exit(1);
    }
    console.log("brochure: el HTML es el que genera el export");
  } else {
    writeFileSync(join(RAIZ, "docs/BROCHURE.html"), nuevo);
    console.log(`brochure: docs/BROCHURE.html escrito (${nuevo.length} bytes)`);
  }
}
