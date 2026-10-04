// Armazón común de toda página de la maqueta: cabecera de la app con los conmutadores de tema e
// idioma, bloque de SALA (lo que no es producto: nota de la mirada y botoneras), contenido, y al pie la
// matriz «Qué revisar y qué deberías ver». CSS y JS son archivos relativos de assets/ (cero red, cero
// scripts en línea: la política de contenido de /diseno/ solo admite 'self').
import { atributo, esc, t } from "./html.mjs";

const SALTO = { es: "Saltar al contenido", en: "Skip to content" };
const DESCRIPTOR = { es: "planeador de pruebas y libro de evidencia", en: "security test planner & evidence ledger" };
const TEMA = { es: "Cambiar entre tema oscuro y claro", en: "Switch between dark and light theme" };
const IDIOMA = { es: "Cambiar el idioma a inglés", en: "Switch the language to Spanish" };
const SALA = { es: "Sala de diseño", en: "Design room" };
const MATRIZ = { es: "Qué revisar y qué deberías ver", en: "What to check and what you should see" };
const COLUMNAS = [
  { es: "Dónde", en: "Where" },
  { es: "Qué hacer", en: "What to do" },
  { es: "Qué deberías ver", en: "What you should see" },
];

// Navegación de la app: cinco secciones, y dentro de cada una sus páginas. Una página que la maqueta
// todavía no tiene se dibuja como texto (no como enlace roto) hasta que su mirada la construya.
export const NAVEGACION = [
  { id: "tablero", nombre: { es: "Tablero", en: "Dashboard" }, paginas: [{ archivo: "tablero.html", nombre: { es: "Tablero", en: "Dashboard" } }] },
  {
    id: "catalogo",
    nombre: { es: "Catálogo", en: "Catalog" },
    paginas: [
      { archivo: "catalogo.html", nombre: { es: "Pruebas", en: "Tests" } },
      { archivo: "marcos.html", nombre: { es: "Marcos", en: "Frameworks" } },
      { archivo: "controles.html", nombre: { es: "Controles", en: "Controls" } },
      { archivo: "propuestas.html", nombre: { es: "Propuestas", en: "Proposals" } },
    ],
  },
  {
    id: "activos",
    nombre: { es: "Activos", en: "Assets" },
    paginas: [
      { archivo: "activo.html", nombre: { es: "Activo", en: "Asset" } },
      { archivo: "plan.html", nombre: { es: "Plan", en: "Plan" } },
    ],
  },
  {
    id: "evidencia",
    nombre: { es: "Evidencia", en: "Evidence" },
    paginas: [
      { archivo: "evidencia.html", nombre: { es: "Carga", en: "Intake" } },
      { archivo: "hallazgo.html", nombre: { es: "Hallazgos", en: "Findings" } },
    ],
  },
  {
    id: "brecha",
    nombre: { es: "Brecha", en: "Gap" },
    paginas: [
      { archivo: "brecha.html", nombre: { es: "Brecha", en: "Gap" } },
      { archivo: "control.html", nombre: { es: "Por control", en: "By control" } },
      { archivo: "informe.html", nombre: { es: "Informe", en: "Report" } },
    ],
  },
];

function entrada(archivo, nombre, existentes, actual) {
  if (!existentes.includes(archivo)) return `<li><span class="es-pendiente">${t(nombre)}</span></li>`;
  return `<li><a href="${archivo}"${actual ? ` aria-current="${actual}"` : ""}>${t(nombre)}</a></li>`;
}

function navegacion(seccion, existentes) {
  if (!seccion) return "";
  const items = NAVEGACION.map((s) => entrada(s.paginas[0].archivo, s.nombre, existentes, s.id === seccion.id ? "true" : "")).join("");
  return `<nav ${atributo("aria-label", { es: "Secciones", en: "Sections" })}><ul class="hg-nav">${items}</ul></nav>`;
}

function subnavegacion(seccion, existentes) {
  const grupo = seccion && NAVEGACION.find((s) => s.id === seccion.id);
  if (!grupo || grupo.paginas.length < 2) return "";
  const items = grupo.paginas.map((pg) => entrada(pg.archivo, pg.nombre, existentes, pg.archivo === seccion.archivo ? "page" : "")).join("");
  return `<nav class="hg-subnav" ${atributo("aria-label", grupo.nombre)}><ul class="hg-nav">${items}</ul></nav>`;
}

/** Botonera de sala: un grupo de botones excluyentes de un mismo controlador. */
export function grupoDeSala(controlador, rotulo, opciones, activa) {
  const botones = opciones
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton" data-controlador="${esc(controlador)}" data-valor="${esc(valor)}" aria-pressed="${valor === activa}">${t(nombre)}</button>`,
    )
    .join("");
  return `<div class="mq-grupo" role="group" ${atributo("aria-label", rotulo)}><span>${t(rotulo)}</span>${botones}</div>`;
}

export const ESTADOS_DE_PANTALLA = [
  { valor: "datos", nombre: { es: "Con datos", en: "With data" } },
  { valor: "vacio", nombre: { es: "Vacío", en: "Empty" } },
  { valor: "carga", nombre: { es: "Cargando", en: "Loading" } },
  { valor: "error", nombre: { es: "Error", en: "Error" } },
];

export const barraDeEstados = (activa = "datos") =>
  grupoDeSala("estado", { es: "Estado de la pantalla", en: "Screen state" }, ESTADOS_DE_PANTALLA, activa);

function sala({ nota, grupos = [] } = {}) {
  if (!nota) return "";
  return `<aside class="mq-sala" ${atributo("aria-label", SALA)}><div class="mq-sala-caja"><p><span class="mq-sala-rotulo">${t(SALA)}.</span> ${t(nota)}</p>${grupos.join("")}</div></aside>`;
}

function matriz(filas) {
  if (!filas?.length) return "";
  const cabecera = COLUMNAS.map((c) => `<th scope="col">${t(c)}</th>`).join("");
  const cuerpo = filas.map((f) => `<tr><td>${t(f.donde)}</td><td>${t(f.hacer)}</td><td>${t(f.ver)}</td></tr>`).join("");
  return `<footer class="mq-pie"><div class="mq-pie-caja"><h2>${t(MATRIZ)}</h2><div class="mq-tabla"><table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div></div></footer>`;
}

export function pagina({ titulo, estadoInicial = "datos", sala: datosDeSala, seccion, existentes = [], contenido, revisar }) {
  return `<!doctype html>
<html lang="es" data-lang="es" data-theme="oscuro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title data-es="${esc(titulo.es)}" data-en="${esc(titulo.en)}">${esc(titulo.es)}</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/hg.css">
<link rel="stylesheet" href="assets/maqueta.css">
<script src="assets/maqueta.js"></script>
</head>
<body data-estado="${esc(estadoInicial)}">
<a class="mq-salto" href="#contenido">${t(SALTO)}</a>
<header class="hg-cab">
<a class="hg-marca" href="index.html"><span class="hg-marca-nombre" data-neutro>HackGuard</span><span class="hg-menor">${t(DESCRIPTOR)}</span></a>
${navegacion(seccion, existentes)}
<div class="hg-botonera">
<button type="button" class="hg-boton" data-controlador="tema" ${atributo("aria-label", TEMA)}><span data-si-tema="oscuro">${t({ es: "Oscuro", en: "Dark" })}</span><span data-si-tema="claro">${t({ es: "Claro", en: "Light" })}</span></button>
<button type="button" class="hg-boton" data-controlador="idioma" ${atributo("aria-label", IDIOMA)}><span lang="es" data-neutro>ES</span><span lang="en" data-neutro>EN</span></button>
</div>
</header>
${sala(datosDeSala)}
<main id="contenido" class="hg-pagina">
${subnavegacion(seccion, existentes)}
${contenido}
</main>
${matriz(revisar)}
</body>
</html>
`;
}
