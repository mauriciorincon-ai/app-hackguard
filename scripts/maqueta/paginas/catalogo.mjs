// catalogo.html — pantalla 2 (C1, C3). El catálogo de pruebas como tabla densa: una fila por prueba,
// filtrable por familia, marco, control, madurez, vigencia y revisión de contenido. Los filtros FUNCIONAN
// (controlador «filtro» de assets/maqueta.js). Vigencias y conteos salen de nucleo/calculos.mjs.
// Dirección «consola» (mirada 4-ter): cabecera con cifras, panel con herramientas y tabla.
import { CONTROLES, FAMILIAS, HERRAMIENTAS, INSTANTANEA, MADUREZ, MARCOS, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { huellaDe, vigencia } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, dias, estado, huella, sello } from "../nucleo/componentes.mjs";
import { VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, esc, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const SIN_CONTROL = { rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } };
const SIN_CONTROL_CORTO = { ...SIN_CONTROL, nombre: { es: "Sin control", en: "No control" } };
const MARCADA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Marcada", en: "Flagged" } };
const nombreDe = (h) => (typeof h.nombre === "string" ? neutro(h.nombre) : t(h.nombre));

function fila(prueba, consulta, umbrales) {
  const v = vigencia(prueba.verificada, consulta, umbrales);
  const marco = MARCOS[prueba.marco];
  const controles = prueba.controles.length ? prueba.controles.map((c) => `<p>${dato(c)}</p>`).join("") : `<p>${chip(SIN_CONTROL_CORTO)}</p>`;
  const repeticiones = prueba.k ? { es: `k = ${prueba.k}`, en: `k = ${prueba.k}` } : { es: "determinista", en: "deterministic" };

  // Lo que no es noticia no lleva chip: «vigente» va en línea; lo que pide atención, en chip.
  const vigenciaHtml = `<div data-fechado="vigencia" data-desde="${prueba.verificada}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">
<p>${v.estado === "vigente" ? estado(VIGENCIA.vigente) : chip(VIGENCIA[v.estado])}</p>
<p class="hg-menor"><span data-frase-dias>${t(dias(v.dias))}</span></p>
</div>`;

  const atributos = [
    `data-familia="${prueba.familia}"`,
    `data-marco="${prueba.marco}"`,
    `data-control="${prueba.controles.length ? prueba.controles.join(" ") : "ninguno"}"`,
    `data-madurez="${prueba.madurez}"`,
    `data-vigencia="${v.estado}"`,
    `data-revision="${prueba.revision}"`,
  ].join(" ");

  return `<tr data-filtrable data-prueba="${prueba.id}" ${atributos}>
<td data-celda="id">${dato(prueba.id)}</td>
<td><p><a class="hg-enlace-fila" href="${archivoDeFicha(prueba.id)}">${t(prueba.nombre)}</a></p><p class="hg-menor">${t(prueba.que_verifica)}</p></td>
<td><p>${t(FAMILIAS[prueba.familia])}</p><p class="hg-menor">${nombreDe(HERRAMIENTAS[prueba.herramienta])} · ${t(repeticiones)}</p></td>
<td><p class="hg-menor">${neutro(`${marco.corto} ${marco.version} · ${prueba.ref}`)}</p>${controles}</td>
<td data-celda="estado">${vigenciaHtml}</td>
<td><p>${t(MADUREZ[prueba.madurez])}</p>${prueba.revision === "marcada_para_revision" ? `<p>${chip(MARCADA)}</p>` : ""}</td>
</tr>`;
}

// Un <option> no admite marcado: lleva sus dos textos en data-es / data-en y assets/maqueta.js pone el
// del idioma activo. Los identificadores van como data-neutro.
function opcion({ valor, texto }) {
  if (typeof texto === "string") return `<option value="${esc(valor)}" data-neutro>${esc(texto)}</option>`;
  return `<option value="${esc(valor)}" data-es="${esc(texto.es)}" data-en="${esc(texto.en)}">${esc(texto.es)}</option>`;
}

function lista(campo, rotulo, opciones) {
  const id = `filtro-${campo}`;
  const items = [{ valor: "", texto: { es: "Todos", en: "All" } }, ...opciones].map(opcion).join("");
  return `<label class="hg-campo" for="${id}"><span>${t(rotulo)}</span><select id="${id}" data-controlador="filtro" data-campo="${campo}">${items}</select></label>`;
}

// Lo que el estado de error muestra rechazado al cargar: pruebas que no pasan su esquema.
const RECHAZADAS = [
  { id: "PR-IA-NUEVA-003", razon: { es: "cita su marco sin versión.", en: "cites its framework without a version." } },
  { id: "PR-AG-NUEVA-004", razon: { es: "es de una familia que varía entre corridas y no declara repeticiones.", en: "belongs to a family that varies between runs and declares no repetitions." } },
];

export function catalogo({ consulta, umbrales, existentes }) {
  const vigencias = PRUEBAS.map((p) => vigencia(p.verificada, consulta, umbrales).estado);
  const cuenta = (e) => vigencias.filter((v) => v === e).length;
  const sinControl = PRUEBAS.filter((p) => p.controles.length === 0).length;
  const deDecision = PRUEBAS.filter((p) => p.familia === "modelo_decision").length;
  const total = PRUEBAS.length;
  const huellaDelCatalogo = huellaDe({ version: INSTANTANEA.version, pruebas: PRUEBAS.map((p) => p.id).join(",") });

  const cifras = [
    ...["vigente", "por_revisar", "vencido"].map((e) => `<li><span class="hg-cifra" data-neutro>${cuenta(e)}</span>${estado(VIGENCIA[e])}</li>`),
    `<li><span class="hg-cifra" data-neutro>${sinControl}</span>${estado(SIN_CONTROL_CORTO)}</li>`,
  ].join("");

  const familias = [{ valor: "", nombre: { es: "Todas", en: "All" } }, ...Object.entries(FAMILIAS).map(([valor, nombre]) => ({ valor, nombre }))]
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton hg-filtro" data-controlador="filtro" data-campo="familia" data-valor="${valor}" aria-pressed="${valor === ""}">${t(nombre)}</button>`,
    )
    .join("");

  const campos = [
    lista("marco", { es: "Marco", en: "Framework" }, Object.entries(MARCOS).map(([valor, m]) => ({ valor, texto: `${m.nombre} ${m.version}` }))),
    lista("control", { es: "Control", en: "Control" }, [
      ...Object.keys(CONTROLES).map((valor) => ({ valor, texto: valor })),
      { valor: "ninguno", texto: SIN_CONTROL.nombre },
    ]),
    lista("madurez", { es: "Madurez", en: "Maturity" }, Object.entries(MADUREZ).map(([valor, texto]) => ({ valor, texto }))),
    lista("vigencia", { es: "Vigencia", en: "Freshness" }, Object.entries(VIGENCIA).map(([valor, v]) => ({ valor, texto: v.nombre }))),
    lista("revision", { es: "Revisión de contenido", en: "Content review" }, [
      { valor: "limpia", texto: { es: "Limpia", en: "Clean" } },
      { valor: "marcada_para_revision", texto: { es: "Marcada para revisión", en: "Flagged for review" } },
    ]),
  ].join("");

  const columnas = [
    { es: "Prueba", en: "Test" },
    { es: "Qué verifica", en: "What it verifies" },
    { es: "Familia y herramienta", en: "Family and tool" },
    { es: "Marco y control", en: "Framework and control" },
    { es: "Vigencia", en: "Freshness" },
    { es: "Madurez", en: "Maturity" },
  ]
    .map((c) => `<th scope="col">${t(c)}</th>`)
    .join("");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Catálogo de pruebas", en: "Test catalog" })}</h1>
<p class="hg-bajada">${t({
    es: "Cada prueba dice qué verifica, con qué herramienta y qué resultado se espera. Nada más.",
    en: "Each test says what it verifies, with which tool and what result is expected. Nothing more.",
  })}</p>
<p class="hg-cabecera-meta" data-si="datos"><span>${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)}</span><span>${huella(huellaDelCatalogo)}</span><span>${tHtml(
    { es: `${total} pruebas en ${Object.keys(FAMILIAS).length} familias · consulta del {fecha}`, en: `${total} tests in ${Object.keys(FAMILIAS).length} families · queried on {fecha}` },
    { fecha: dato(consulta) },
  )}</span></p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Pruebas por vigencia", en: "Tests by freshness" })}>${cifras}</ul>
</div>

<section class="hg-panel" data-si="datos" ${atributo("aria-label", { es: "Pruebas del catálogo", en: "Catalog tests" })}>
<div class="hg-herramientas">
<div class="hg-herramientas-linea">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Familia", en: "Family" })}>${familias}</div>
<div class="hg-grupo">
<p class="hg-menor">${tHtml(
    { es: `Se muestran {n} de ${total} pruebas`, en: `Showing {n} of ${total} tests` },
    { n: `<span data-cuenta-filtrada data-neutro>${total}</span>` },
  )}</p>
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="filtro-limpiar" hidden>${t({ es: "Quitar filtros", en: "Clear filters" })}</button>
</div>
</div>
<div class="hg-campos">${campos}</div>
</div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas del catálogo", en: "Catalog tests" })}</caption>
<thead><tr>${columnas}</tr></thead>
<tbody>
${PRUEBAS.map((p) => fila(p, consulta, umbrales)).join("\n")}
</tbody>
</table>
<div class="hg-aviso es-neutro" data-sin-resultados hidden>
<h2>${t({ es: "Ninguna prueba cumple esos filtros", en: "No test matches those filters" })}</h2>
<p>${t({ es: "Quita un filtro o vuelve a «Todas» para ver el catálogo completo.", en: "Remove a filter or go back to “All” to see the whole catalog." })}</p>
</div>
</section>

${aviso(
  "vacio",
  VACIO,
  { es: "El catálogo está vacío", en: "The catalog is empty" },
  `<p>${t({
    es: "Todavía no se ha cargado ninguna prueba. Carga las semillas del repositorio o aprueba una propuesta del investigador para empezar.",
    en: "No test has been loaded yet. Load the repository seeds or approve a proposal from the researcher to get started.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Validando el catálogo", en: "Validating the catalog" },
  `<p>${t({ es: "Cada prueba se comprueba contra su esquema antes de mostrarse.", en: "Each test is checked against its schema before it is shown." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "El catálogo no se cargó", en: "The catalog did not load" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: `${RECHAZADAS.length} pruebas rechazadas al cargar`, en: `${RECHAZADAS.length} tests rejected on load` } },
    `<ul class="hg-lista">${RECHAZADAS.map((r) => `<li>${dato(r.id)} ${t(r.razon)}</li>`).join("")}</ul><p>${t({
      es: "Nada entra a medias: corrige esas pruebas y vuelve a cargar. El resto del catálogo no se muestra hasta entonces.",
      en: "Nothing gets in half-done: fix those tests and load again. The rest of the catalog is not shown until then.",
    })}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · catálogo", en: "HackGuard · catalog" },
    seccion: { id: "catalogo", archivo: "catalogo.html" },
    migas: [t({ es: "Catálogo", en: "Catalog" }), t({ es: "Pruebas", en: "Tests" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter: el catálogo con la interfaz nueva (aprobado en el primer tramo). Cada fila abre la ficha de su prueba.",
        en: "Review 4-ter: the catalog with the new interface (approved in the first stretch). Each row opens its own test record.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Toda la pantalla", en: "The whole screen" },
        hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" },
        ver: { es: "Se siente una aplicación: navegación a la izquierda, cifras arriba y una tabla que ocupa el ancho", en: "It feels like an application: navigation on the left, figures on top and a table that fills the width" },
      },
      {
        donde: { es: "Píldoras de familia", en: "Family pills" },
        hacer: { es: "Pulsa «Modelo de decisión»", en: "Press “Decision model”" },
        ver: { es: `Quedan ${deDecision} filas y el contador lo dice`, en: `${deDecision} rows remain and the counter says so` },
      },
      {
        donde: { es: "Lista «Vigencia»", en: "“Freshness” list" },
        hacer: { es: "Elige «Vencido» sin quitar la familia", en: "Pick “Overdue” keeping the family" },
        ver: { es: "Los filtros se suman; aparece «Quitar filtros»", en: "Filters add up; “Clear filters” appears" },
      },
      {
        donde: { es: "Columna «Vigencia»", en: "“Freshness” column" },
        hacer: { es: "Recorre las filas", en: "Scan the rows" },
        ver: { es: "Lo vigente va sin recuadro; «por revisar» y «vencido» resaltan, cada uno con su forma y sus días", en: "Current ones carry no box; “review due” and “overdue” stand out, each with its shape and its days" },
      },
      {
        donde: { es: "Nombre de una prueba", en: "A test's name" },
        hacer: { es: "Filtra por «Vencido» y abre una de las filas", en: "Filter by “Overdue” and open one of the rows" },
        ver: { es: "Se abre la ficha de esa prueba, y dice que está vencida", en: "That test's record opens, and it says it is overdue" },
      },
      {
        donde: { es: "En el teléfono", en: "On the phone" },
        hacer: { es: "Desplázate por las filas", en: "Scroll the rows" },
        ver: { es: "Cada prueba es una tarjeta, la navegación queda abajo y nada se sale de la pantalla", en: "Each test is a card, navigation sits at the bottom and nothing runs off the screen" },
      },
    ],
  });
}
