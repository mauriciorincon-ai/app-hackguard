// Armazón común de toda página de la maqueta, dirección «consola» (mirada 4-ter): franja de SALA arriba
// (lo que no es producto: nota de la mirada y estados de la pantalla), barra lateral con las secciones y,
// dentro de la abierta, sus páginas; barra de contexto con la ruta y los ajustes; el contenido; y al pie
// la matriz «Qué revisar y qué deberías ver». En teléfono la navegación baja a una barra fija y las
// páginas de la sección van como pestañas. CSS y JS son archivos relativos de assets/ (cero red, cero
// scripts en línea: la política de contenido de /diseno/ solo admite 'self').
import { INSTANTANEA, PRUEBAS as PRUEBAS_DEL_CATALOGO } from "../datos/catalogo.mjs";
import { ACTIVOS, LOTES, ORDEN_DE_HALLAZGOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { atributo, esc, neutro, t } from "./html.mjs";

const PRIMER_ACTIVO = Object.keys(ACTIVOS)[0];

const SALTO = { es: "Saltar al contenido", en: "Skip to content" };
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
  { id: "tablero", icono: "tablero", nombre: { es: "Tablero", en: "Dashboard" }, paginas: [{ archivo: "tablero.html", nombre: { es: "Tablero", en: "Dashboard" } }] },
  {
    id: "catalogo",
    icono: "catalogo",
    cuenta: PRUEBAS_DEL_CATALOGO.length,
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
    icono: "activos",
    cuenta: Object.keys(ACTIVOS).length,
    nombre: { es: "Activos", en: "Assets" },
    paginas: [
      { archivo: archivoDeActivo(PRIMER_ACTIVO), nombre: { es: "Activo", en: "Asset" } },
      { archivo: archivoDePlan(PRIMER_ACTIVO), nombre: { es: "Plan", en: "Plan" } },
    ],
  },
  {
    id: "evidencia",
    icono: "evidencia",
    cuenta: LOTES.length,
    nombre: { es: "Evidencia", en: "Evidence" },
    paginas: [
      { archivo: "evidencia.html", nombre: { es: "Carga", en: "Intake" } },
      { archivo: archivoDeHallazgo(ORDEN_DE_HALLAZGOS[0]), nombre: { es: "Hallazgos", en: "Findings" } },
    ],
  },
  {
    id: "brecha",
    icono: "brecha",
    nombre: { es: "Brecha", en: "Gap" },
    paginas: [
      { archivo: "brecha.html", nombre: { es: "Brecha", en: "Gap" } },
      { archivo: "control.html", nombre: { es: "Por control", en: "By control" } },
      { archivo: "informe.html", nombre: { es: "Informe", en: "Report" } },
    ],
  },
];

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

function matriz(filas) {
  if (!filas?.length) return "";
  const cabecera = COLUMNAS.map((c) => `<th scope="col">${t(c)}</th>`).join("");
  const cuerpo = filas.map((f) => `<tr><td>${t(f.donde)}</td><td>${t(f.hacer)}</td><td>${t(f.ver)}</td></tr>`).join("");
  return `<footer class="mq-pie"><div class="mq-pie-caja"><h2>${t(MATRIZ)}</h2><div class="mq-tabla"><table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div></div></footer>`;
}

/** El documento HTML: cabeza común (tokens, hojas, controlador) y cuerpo. */
function documento({ titulo, estadoInicial, cuerpo }) {
  return `<!doctype html>
<html lang="es" data-lang="es" data-theme="oscuro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title data-es="${esc(titulo.es)}" data-en="${esc(titulo.en)}">${esc(titulo.es)}</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/app.css">
<link rel="stylesheet" href="assets/maqueta.css">
<script src="assets/maqueta.js"></script>
</head>
<body data-estado="${esc(estadoInicial)}">
<a class="mq-salto" href="#contenido">${t(SALTO)}</a>
${cuerpo}
</body>
</html>
`;
}

// Iconos de navegación: trazos SVG, nunca caracteres de una fuente.
const TRAZO = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const ICONO = {
  tablero: `<rect x="3" y="3" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="11" y="3" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="3" y="11" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="11" y="11" width="6" height="6" rx="1.5" ${TRAZO}/>`,
  catalogo: `<path d="M7.5 5h9M7.5 10h9M7.5 15h9" ${TRAZO}/><path d="M3.5 5h.5M3.5 10h.5M3.5 15h.5" ${TRAZO}/>`,
  activos: `<path d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6z" ${TRAZO}/><path d="M3.5 6L10 9.5 16.5 6M10 9.5v8" ${TRAZO}/>`,
  evidencia: `<rect x="2.5" y="4.5" width="15" height="11" rx="2" ${TRAZO}/><path d="M3 6.5l7 5 7-5" ${TRAZO}/>`,
  brecha: `<path d="M4 16.5V10M10 16.5v-13M16 16.5v-4.5" ${TRAZO}/>`,
};
const icono = (n) => `<svg class="hg-icono" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${ICONO[n]}</svg>`;

// El logo lleva a la portada de la aplicación (el tablero); el recorrido de la maqueta es de la sala.
const marca = () =>
  `<a class="hg-marca" href="tablero.html"><svg class="hg-marca-signo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l8 3v6.1c0 4.6-3.2 8.4-8 9.7-4.8-1.3-8-5.1-8-9.7V5.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.3 12.1l2.6 2.6 4.8-5.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg><span data-neutro>HackGuard</span></a>`;

/** Las páginas de una sección: las del objeto abierto (`seccion.paginas`) o las de la navegación. */
const paginasDe = (seccion) => {
  const grupo = NAVEGACION.find((s) => s.id === seccion?.id);
  return grupo ? (seccion.paginas ?? grupo.paginas) : [];
};

function lateral(seccion, existentes, consulta) {
  const items = NAVEGACION.map((s) => {
    const abierta = s.id === seccion?.id;
    const dentro = `${icono(s.icono)}<span>${t(s.nombre)}</span>${s.cuenta ? `<span class="hg-cuenta" data-neutro>${s.cuenta}</span>` : ""}`;
    const paginas = abierta ? paginasDe(seccion) : s.paginas;
    const destino = paginas[0].archivo;
    const actual = abierta ? (paginas.length > 1 ? "true" : "page") : "";
    const cabeza = existentes.includes(destino)
      ? `<a href="${destino}"${actual ? ` aria-current="${actual}"` : ""}>${dentro}</a>`
      : `<span class="hg-nav-pendiente">${dentro}</span>`;
    const sub =
      abierta && paginas.length > 1
        ? `<ul class="hg-nav-sub">${paginas
            .map((pg) =>
              existentes.includes(pg.archivo)
                ? `<li><a href="${pg.archivo}"${pg.archivo === seccion.archivo ? ' aria-current="page"' : ""}>${t(pg.nombre)}</a></li>`
                : `<li><span class="hg-nav-pendiente">${t(pg.nombre)}</span></li>`,
            )
            .join("")}</ul>`
        : "";
    return `<li>${cabeza}${sub}</li>`;
  }).join("");
  return `<aside class="hg-lateral" ${atributo("aria-label", { es: "Navegación", en: "Navigation" })}>
${marca()}
<nav class="hg-nav" ${atributo("aria-label", { es: "Secciones", en: "Sections" })}><ul>${items}</ul></nav>
<div class="hg-lateral-pie">
<p class="hg-rotulo">${t({ es: "Instantánea del catálogo", en: "Catalog snapshot" })}</p>
<p>${neutro(INSTANTANEA.version)}</p>
<p class="hg-rotulo">${t({ es: "Fecha de consulta", en: "Query date" })}</p>
<p>${neutro(consulta)}</p>
</div>
</aside>`;
}

function pestanasDeSeccion(seccion, existentes) {
  const paginas = paginasDe(seccion);
  if (paginas.length < 2) return "";
  const grupo = NAVEGACION.find((s) => s.id === seccion.id);
  const items = paginas
    .map((pg) =>
      existentes.includes(pg.archivo)
        ? `<li><a href="${pg.archivo}"${pg.archivo === seccion.archivo ? ' aria-current="page"' : ""}>${t(pg.nombre)}</a></li>`
        : `<li><span>${t(pg.nombre)}</span></li>`,
    )
    .join("");
  return `<nav class="hg-subnav" ${atributo("aria-label", grupo.nombre)}><ul>${items}</ul></nav>\n`;
}

function franja({ nota, grupos = [] }, indice) {
  const volver = indice ? "" : `<a class="mq-volver" href="index.html">${t({ es: "Recorrido", en: "Tour" })}</a> `;
  return `<aside class="mq-sala mq-franja" ${atributo("aria-label", SALA)}><p>${volver}<span class="mq-sala-rotulo">${t(SALA)}.</span> ${t(nota)}</p>${grupos.join("")}</aside>`;
}

/**
 * Página con el armazón de aplicación. `seccion` = { id, archivo [, paginas] } dice qué sección y qué
 * página están abiertas (sin `seccion`, ninguna: el índice y el kit son de la sala, no del producto);
 * `migas` es la ruta (piezas de HTML; la última es la página actual). `indice` marca la entrada a la
 * maqueta: su franja no enlaza al recorrido, porque es el recorrido.
 */
export function pagina({ titulo, estadoInicial = "datos", sala: datosDeSala, seccion = null, migas, consulta, existentes = [], contenido, revisar, indice = false }) {
  const ruta = migas.map((m, i) => (i === migas.length - 1 ? `<strong>${m}</strong>` : `<span>${m}</span>`)).join('<span aria-hidden="true">/</span>');
  const cuerpo = `${franja(datosDeSala, indice)}
<div class="hg-app">
${lateral(seccion, existentes, consulta)}
<div class="hg-cuerpo">
<header class="hg-barra">
${marca()}
<p class="hg-migas">${ruta}</p>
<div class="hg-ajustes">
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="tema" ${atributo("aria-label", TEMA)}><span data-si-tema="oscuro">${t({ es: "Oscuro", en: "Dark" })}</span><span data-si-tema="claro">${t({ es: "Claro", en: "Light" })}</span></button>
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="idioma" ${atributo("aria-label", IDIOMA)}><span lang="es" data-neutro>ES</span><span lang="en" data-neutro>EN</span></button>
</div>
</header>
${pestanasDeSeccion(seccion, existentes)}<main id="contenido" class="hg-principal hg-pila">
${contenido}
</main>
${matriz(revisar)}
</div>
</div>`;
  return documento({ titulo, estadoInicial, cuerpo });
}
