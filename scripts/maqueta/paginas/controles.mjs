// controles.html — pantalla 5 (C5). La capa por defecto de controles: las áreas del Anexo A de
// ISO/IEC 42001 con identificador y resumen PROPIO (jamás el texto de la norma, regla 11), los controles
// a los que el catálogo da evidencia con las pruebas que los cubren, y la deuda a la vista: pruebas sin
// control asignado. Todo conteo sale del catálogo.
import { CONTROLES, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { AREAS, NORMA, areaDe } from "../datos/gobierno.mjs";
import { dato, enlace, estado, libro, sello } from "../nucleo/componentes.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const SIN_CONTROL = { rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } };
const SIN_PRUEBAS = { rol: "neutro", simbolo: "vacio", nombre: { es: "Sin pruebas en el catálogo", en: "No tests in the catalog" } };
const CON_PRUEBAS = { rol: "positivo", simbolo: "ok" };

const cubren = (control) => PRUEBAS.filter((p) => p.controles.includes(control));

export function controles({ existentes }) {
  const ids = Object.keys(CONTROLES);
  const sinControl = PRUEBAS.filter((p) => p.controles.length === 0);
  const areasConPruebas = AREAS.filter((a) => ids.some((c) => areaDe(c) === a.id && cubren(c).length));
  const fichaDe = (p) => enlace(archivoDeFicha(p.id), dato(p.id), existentes);

  const areas = AREAS.map((a) => {
    const suyos = ids.filter((c) => areaDe(c) === a.id);
    const pruebas = new Set(suyos.flatMap((c) => cubren(c).map((p) => p.id)));
    const cobertura = pruebas.size
      ? `<p>${estado({ ...CON_PRUEBAS, nombre: { es: `${pruebas.size} pruebas dan evidencia`, en: `${pruebas.size} tests give evidence` } })}</p><p class="hg-menor">${tHtml(
          { es: "en {n} controles", en: "across {n} controls" },
          { n: neutro(String(suyos.length)) },
        )}</p>`
      : `<p>${estado(SIN_PRUEBAS)}</p>`;
    return [`<p>${dato(a.id)}</p>`, `<p><strong>${t(a.nombre)}</strong></p><p>${t(a.resumen)}</p>`, cobertura];
  });

  const detalle = areasConPruebas
    .map((a) => {
      const filas = ids
        .filter((c) => areaDe(c) === a.id)
        .map((c) => {
          const pruebas = cubren(c);
          return [
            `<p>${dato(c)}</p>`,
            `<p>${t(CONTROLES[c])}</p>`,
            `<p>${pruebas.map(fichaDe).join(" · ")}</p><p class="hg-menor">${tHtml(
              { es: pruebas.length === 1 ? "{n} prueba" : "{n} pruebas", en: pruebas.length === 1 ? "{n} test" : "{n} tests" },
              { n: neutro(String(pruebas.length)) },
            )}</p>`,
            `<p class="hg-menor">${t({ es: "Ninguno registrado", en: "None recorded" })}</p>`,
          ];
        });
      return `<h3 class="hg-titulo-3">${dato(a.id)} ${t(a.nombre)}</h3>
${libro(
  [
    { es: "Control", en: "Control" },
    { es: "Qué exige, con palabras propias", en: "What it requires, in our own words" },
    { es: "Pruebas que le dan evidencia", en: "Tests that give it evidence" },
    { es: "Equivalentes en otros marcos", en: "Equivalents in other frameworks" },
  ],
  filas,
)}`;
    })
    .join("\n");

  const deuda = sinControl.map((p) => [`<p>${dato(p.id)}</p>`, `<p>${enlace(archivoDeFicha(p.id), t(p.nombre), existentes)}</p><p>${t(p.que_verifica)}</p>`, `<p>${estado(SIN_CONTROL)}</p>`]);

  const contenido = `<div class="hg-encabezado">
<div>
<h1>${t({ es: "Controles", en: "Controls" })}</h1>
<p class="hg-entrada">${t({
    es: "Un hallazgo es evidencia de que un control falla. Aquí se ve a qué control da evidencia cada prueba, y cuáles todavía no dan a ninguno.",
    en: "A finding is evidence that a control fails. This shows which control each test gives evidence to, and which ones do not give evidence to any yet.",
  })}</p>
</div>
<p class="hg-menor" data-si="datos">${t({ es: "Capa por defecto", en: "Default layer" })} · ${neutro(NORMA)} · ${t({ es: "Anexo A", en: "Annex A" })}<br>${t({
    es: "Solo identificadores y resúmenes propios; el texto de la norma no está aquí. Ninguna capa propia cargada.",
    en: "Identifiers and our own summaries only; the standard's text is not here. No custom layer loaded.",
  })}</p>
</div>

<div data-si="datos">
<ul class="hg-cifras" ${atributo("aria-label", { es: "Resumen de controles", en: "Control summary" })}>
<li><span class="hg-cifra" data-neutro>${AREAS.length}</span><span>${t({ es: "áreas del Anexo A", en: "Annex A areas" })}</span></li>
<li><span class="hg-cifra" data-neutro>${areasConPruebas.length}</span>${estado({ ...CON_PRUEBAS, nombre: { es: "áreas con pruebas", en: "areas with tests" } })}</li>
<li><span class="hg-cifra" data-neutro>${ids.filter((c) => cubren(c).length).length}</span><span>${t({ es: "controles con evidencia posible", en: "controls with possible evidence" })}</span></li>
<li><span class="hg-cifra" data-neutro>${sinControl.length}</span>${estado({ ...SIN_CONTROL, nombre: { es: "pruebas sin control", en: "tests without a control" } })}</li>
</ul>

${libro(
  [
    { es: "Área", en: "Area" },
    { es: "Qué cubre, con palabras propias", en: "What it covers, in our own words" },
    { es: "Pruebas del catálogo", en: "Catalog tests" },
  ],
  areas,
)}

<section class="hg-seccion" aria-labelledby="con-pruebas">
<h2 id="con-pruebas">${t({ es: "Controles con pruebas", en: "Controls with tests" })}</h2>
<p class="hg-intro">${t({
    es: "Que una prueba dé evidencia a un control no dice que el control se cumpla: dice dónde mirar. El estado de cada control, con su evidencia, está en la vista por control.",
    en: "A test giving evidence to a control does not say the control is met: it says where to look. Each control's status, with its evidence, is in the control view.",
  })}</p>
${detalle}
</section>

<section class="hg-seccion" aria-labelledby="deuda">
<h2 id="deuda">${t({ es: "Pruebas sin control asignado", en: "Tests with no control assigned" })}</h2>
<p class="hg-intro">${t({
    es: "Se aceptan en el catálogo, pero su resultado no cuenta para ningún control. Es una deuda a la vista, no un error: una persona decide a qué control dan evidencia.",
    en: "They are accepted in the catalog, but their result does not count toward any control. It is a visible debt, not an error: a person decides which control they give evidence to.",
  })}</p>
${libro(
  [
    { es: "Prueba", en: "Test" },
    { es: "Qué verifica", en: "What it verifies" },
    { es: "Control", en: "Control" },
  ],
  deuda,
)}
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "No hay controles cargados", en: "No controls loaded" })}</h2>
<p>${t({
    es: "Sin la capa de controles, las pruebas se planean y se ejecutan igual, pero ningún resultado cuenta como evidencia de un control. Carga la capa por defecto del repositorio.",
    en: "Without the control layer, tests are still planned and run, but no result counts as evidence for a control. Load the default layer from the repository.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Cruzando pruebas y controles", en: "Matching tests and controls" })}</h2>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "Los controles no se cargaron", en: "The controls did not load" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "1 prueba cita un control que no existe", en: "1 test cites a control that does not exist" } },
  `<p>${tHtml(
    {
      es: "{p} cita {c}, que no está en la capa de controles. Corrige el identificador en la prueba, o quítalo y quedará como «sin control asignado».",
      en: "{p} cites {c}, which is not in the control layer. Fix the identifier in the test, or remove it and it will show as “no control assigned”.",
    },
    { p: dato("PR-AG-NUEVA-004"), c: dato("iso42001-A.6.9.9") },
  )}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · controles", en: "HackGuard · controls" },
    seccion: { id: "catalogo", archivo: "controles.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 3. Controles. Los resúmenes son propios e ilustrativos: se validan contra la norma en el primer sprint.",
        en: "Review 3. Controls. The summaries are our own and illustrative: they are validated against the standard in the first sprint.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Tabla de áreas", en: "Area table" },
        hacer: { es: "Recorre la columna de la derecha", en: "Scan the right-hand column" },
        ver: { es: "Se ve qué áreas tienen pruebas y cuáles no, sin depender del color", en: "You can see which areas have tests and which do not, without relying on color" },
      },
      {
        donde: { es: "1. Controles con pruebas", en: "1. Controls with tests" },
        hacer: { es: "Pulsa el identificador de una prueba", en: "Press a test's identifier" },
        ver: { es: "Abre la ficha de esa prueba, que nombra este mismo control", en: "It opens that test's record, which names this same control" },
      },
      {
        donde: { es: "2. Pruebas sin control asignado", en: "2. Tests with no control assigned" },
        hacer: { es: "Lee la lista", en: "Read the list" },
        ver: { es: "Se lee como una deuda pendiente, no como una falla", en: "It reads as a pending debt, not as a failure" },
      },
      {
        donde: { es: "Toda la página", en: "The whole page" },
        hacer: { es: "Busca texto de la norma", en: "Look for the standard's text" },
        ver: { es: "No hay: solo identificadores y resúmenes con palabras propias", en: "There is none: only identifiers and summaries in our own words" },
      },
    ],
  });
}
