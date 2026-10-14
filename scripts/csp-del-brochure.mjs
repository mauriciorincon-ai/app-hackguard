#!/usr/bin/env node
// El brochure (`docs/BROCHURE.html`, servido en /conoce) lleva UN <script> en línea, y la política de las rutas de la app no deja
// ejecutar scripts en línea. La cabecera de /conoce lo permite por su huella (sha256), no con 'unsafe-inline': si el script cambia
// un byte, la huella cambia y la página deja de ejecutarse hasta que se actualice la cabecera. Este script recalcula la huella y
// la escribe en serve.json y vercel.json; `tests/unit/documentos-del-hito.test.ts` falla si alguna está vieja.
//
//   node scripts/csp-del-brochure.mjs            imprime la huella y si las dos cabeceras la tienen
//   node scripts/csp-del-brochure.mjs --escribir la escribe en serve.json y vercel.json
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** El contenido del único <script> en línea del brochure. Falla si hay más de uno o si lleva `src`. */
export function scriptEnLinea(html) {
  // Los comentarios HTML pueden nombrar la etiqueta; el navegador no los toma por un script.
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, "");
  const scripts = [
    ...sinComentarios.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g),
  ];
  if (scripts.length !== 1)
    throw new Error(
      `el brochure debe llevar exactamente un <script>, lleva ${scripts.length}`,
    );
  if (/\bsrc\s*=/.test(scripts[0][1]))
    throw new Error(
      "el <script> del brochure no puede cargar un archivo: es autocontenido",
    );
  return scripts[0][2];
}

export const huellaDelScript = (html) =>
  `sha256-${createHash("sha256").update(scriptEnLinea(html)).digest("base64")}`;

/** El contenido del único <style> del brochure. Sin él, la hoja de /conoce tendría que abrirse con 'unsafe-inline'. */
export function estiloEnLinea(html) {
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, "");
  const estilos = [...sinComentarios.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)];
  if (estilos.length !== 1)
    throw new Error(`el brochure debe llevar exactamente un <style>, lleva ${estilos.length}`);
  if (/\bstyle\s*=/.test(sinComentarios.replace(/<style[\s\S]*?<\/style>/g, "")))
    throw new Error("el brochure no puede llevar atributos style=: su hoja es el único CSS");
  return estilos[0][2];
}

export const huellaDelEstilo = (html) =>
  `sha256-${createHash("sha256").update(estiloEnLinea(html)).digest("base64")}`;

/** La política de /conoce: solo el script y el estilo cuyas huellas se declaran; todo lo demás, como la maqueta. */
export const cspDelBrochure = (huella, estilo) =>
  `default-src 'self'; script-src '${huella}'; style-src '${estilo}'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`;

/** Lee la huella que declara una cabecera de /conoce, o null si no hay. */
export function huellaDeclarada(politica) {
  const m = /script-src '(sha256-[A-Za-z0-9+/=]+)'/.exec(politica ?? "");
  return m ? m[1] : null;
}

const cabeceraServe = (cfg) =>
  cfg.headers.find((h) => h.source === "conoce{,/**}");
const cabeceraVercel = (cfg) =>
  cfg.headers.find((h) => h.source === "/conoce(/.*)?");
const politicaDe = (entrada) =>
  entrada?.headers.find((x) => x.key === "Content-Security-Policy")?.value;

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const html = readFileSync(join(RAIZ, "docs/BROCHURE.html"), "utf8");
  const huella = huellaDelScript(html);
  const estilo = huellaDelEstilo(html);
  const serve = JSON.parse(readFileSync(join(RAIZ, "serve.json"), "utf8"));
  const vercel = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf8"));
  if (process.argv.includes("--escribir")) {
    const nueva = [
      { key: "Content-Security-Policy", value: cspDelBrochure(huella, estilo) },
    ];
    const a = cabeceraServe(serve);
    if (a) a.headers = nueva;
    else serve.headers.push({ source: "conoce{,/**}", headers: nueva });
    const b = cabeceraVercel(vercel);
    if (b) b.headers = nueva;
    else vercel.headers.push({ source: "/conoce(/.*)?", headers: nueva });
    writeFileSync(
      join(RAIZ, "serve.json"),
      `${JSON.stringify(serve, null, 2)}\n`,
    );
    writeFileSync(
      join(RAIZ, "vercel.json"),
      `${JSON.stringify(vercel, null, 2)}\n`,
    );
  }
  const en = (cfg, f) => huellaDeclarada(politicaDe(f(cfg)));
  console.log(`brochure: ${huella}`);
  console.log(
    `serve.json:  ${en(serve, cabeceraServe) === huella ? "al día" : "VIEJA o ausente"}`,
  );
  console.log(
    `vercel.json: ${en(vercel, cabeceraVercel) === huella ? "al día" : "VIEJA o ausente"}`,
  );
}
