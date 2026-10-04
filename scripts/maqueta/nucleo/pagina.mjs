// Armazón común de toda página de la maqueta: cabecera con los conmutadores de tema e idioma,
// contenido, y al pie la matriz «Qué revisar y qué deberías ver». CSS y JS son archivos relativos de
// assets/ (cero red, cero scripts en línea: la política de contenido de /diseno/ solo admite 'self').
import { atributo, esc, t } from "./html.mjs";

const SALTO = { es: "Saltar al contenido", en: "Skip to content" };
const TEMA = { es: "Cambiar entre tema oscuro y claro", en: "Switch between dark and light theme" };
const IDIOMA = { es: "Cambiar el idioma a inglés", en: "Switch the language to Spanish" };
const MATRIZ = { es: "Qué revisar y qué deberías ver", en: "What to check and what you should see" };
const COLUMNAS = [
  { es: "Dónde", en: "Where" },
  { es: "Qué hacer", en: "What to do" },
  { es: "Qué deberías ver", en: "What you should see" },
];

/** Botonera de estados de sala: conmuta body[data-estado] para mostrar cada estado de la pantalla. */
export function barraDeEstados(estados) {
  const botones = estados
    .map(
      ({ valor, nombre }, i) =>
        `<button type="button" data-controlador="estado" data-valor="${esc(valor)}" aria-pressed="${i === 0}">${t(nombre)}</button>`,
    )
    .join("");
  return `<div class="mq-estados" role="group" ${atributo("aria-label", { es: "Estado de la pantalla", en: "Screen state" })}>${botones}</div>`;
}

function matriz(filas) {
  if (!filas?.length) return "";
  const cabecera = COLUMNAS.map((c) => `<th scope="col">${t(c)}</th>`).join("");
  const cuerpo = filas
    .map((f) => `<tr><td>${t(f.donde)}</td><td>${t(f.hacer)}</td><td>${t(f.ver)}</td></tr>`)
    .join("");
  return `<footer class="mq-pie"><h2>${t(MATRIZ)}</h2><div class="mq-tabla"><table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div></footer>`;
}

export function pagina({ titulo, estadoInicial = "datos", contenido, revisar }) {
  return `<!doctype html>
<html lang="es" data-lang="es" data-theme="oscuro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title data-es="${esc(titulo.es)}" data-en="${esc(titulo.en)}">${esc(titulo.es)}</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/maqueta.css">
<script src="assets/maqueta.js"></script>
</head>
<body data-estado="${esc(estadoInicial)}">
<a class="mq-salto" href="#contenido">${t(SALTO)}</a>
<header class="mq-cab">
<a class="mq-marca" href="index.html" data-neutro>HackGuard</a>
<div class="mq-conmutadores">
<button type="button" data-controlador="tema" ${atributo("aria-label", TEMA)}><span data-si-tema="oscuro">${t({ es: "Oscuro", en: "Dark" })}</span><span data-si-tema="claro">${t({ es: "Claro", en: "Light" })}</span></button>
<button type="button" data-controlador="idioma" ${atributo("aria-label", IDIOMA)}><span lang="es" data-neutro>ES</span><span lang="en" data-neutro>EN</span></button>
</div>
</header>
<main id="contenido">
${contenido}
</main>
${matriz(revisar)}
</body>
</html>
`;
}
