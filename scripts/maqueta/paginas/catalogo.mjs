// catalogo.html — pantalla 2 (C1, C3). El catálogo de pruebas como libro: una fila por prueba, filtrable
// por familia, marco, control, madurez, vigencia y revisión de contenido. Los filtros FUNCIONAN
// (controlador «filtro» de assets/maqueta.js). Vigencias y conteos salen de nucleo/calculos.mjs.
import { CONTROLES, FAMILIAS, HERRAMIENTAS, INSTANTANEA, MADUREZ, MARCOS, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { huellaDe, vigencia } from "../nucleo/calculos.mjs";
import { celda, dato, dias, estado, huella, sello } from "../nucleo/componentes.mjs";
import { VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, esc, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const SIN_CONTROL = { rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } };
const MARCADA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Marcada para revisión", en: "Flagged for review" } };
const nombreDe = (h) => (typeof h.nombre === "string" ? neutro(h.nombre) : t(h.nombre));

function fila(prueba, consulta, umbrales) {
  const v = vigencia(prueba.verificada, consulta, umbrales);
  const marco = MARCOS[prueba.marco];
  const controles = prueba.controles.length
    ? prueba.controles.map((c) => `<p>${dato(c)}</p>`).join("")
    : `<p>${estado(SIN_CONTROL)}</p>`;
  const repeticiones = prueba.k
    ? { es: `k = ${prueba.k}`, en: `k = ${prueba.k}` }
    : { es: "determinista", en: "deterministic" };

  const principal = `<p><a href="${archivoDeFicha(prueba.id)}">${t(prueba.nombre)}</a></p>
<p>${t(prueba.que_verifica)}</p>
<p class="hg-menor">${t(FAMILIAS[prueba.familia])} · ${nombreDe(HERRAMIENTAS[prueba.herramienta])} · ${t(repeticiones)}</p>`;

  const vigenciaHtml = `<div data-fechado="vigencia" data-desde="${prueba.verificada}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">
<p>${estado(VIGENCIA[v.estado])}</p>
<p class="hg-menor">${t({ es: "Verificada", en: "Verified" })} <span data-frase-dias>${t(dias(v.dias))}</span></p>
</div>`;

  const notas = `<p>${t(MADUREZ[prueba.madurez])}</p>${prueba.revision === "marcada_para_revision" ? `<p>${estado(MARCADA)}</p>` : ""}`;

  const atributos = [
    `data-familia="${prueba.familia}"`,
    `data-marco="${prueba.marco}"`,
    `data-control="${prueba.controles.length ? prueba.controles.join(" ") : "ninguno"}"`,
    `data-madurez="${prueba.madurez}"`,
    `data-vigencia="${v.estado}"`,
    `data-revision="${prueba.revision}"`,
  ].join(" ");

  return `<li data-filtrable data-prueba="${prueba.id}" ${atributos}><dl class="hg-fila">
${celda({ es: "Prueba", en: "Test" }, `<p>${dato(prueba.id)}</p>`)}
${celda({ es: "Qué verifica", en: "What it verifies" }, principal)}
${celda({ es: "Marco y control", en: "Framework and control" }, `<p class="hg-menor">${neutro(`${marco.corto} ${marco.version} · ${prueba.ref}`)}</p>${controles}`)}
${celda({ es: "Vigencia", en: "Freshness" }, vigenciaHtml)}
${celda({ es: "Notas", en: "Notes" }, notas)}
</dl></li>`;
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

export function catalogo({ consulta, umbrales, existentes }) {
  const vigencias = PRUEBAS.map((p) => vigencia(p.verificada, consulta, umbrales).estado);
  const cuenta = (e) => vigencias.filter((v) => v === e).length;
  const sinControl = PRUEBAS.filter((p) => p.controles.length === 0).length;
  const total = PRUEBAS.length;
  const huellaDelCatalogo = huellaDe({ version: INSTANTANEA.version, pruebas: PRUEBAS.map((p) => p.id).join(",") });

  const cifras = [
    ...["vigente", "por_revisar", "vencido"].map((e) => `<li><span class="hg-cifra" data-neutro>${cuenta(e)}</span>${estado(VIGENCIA[e])}</li>`),
    `<li><span class="hg-cifra" data-neutro>${sinControl}</span>${estado(SIN_CONTROL)}</li>`,
  ].join("");

  const familias = [{ valor: "", nombre: { es: "Todas", en: "All" } }, ...Object.entries(FAMILIAS).map(([valor, nombre]) => ({ valor, nombre }))]
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton" data-controlador="filtro" data-campo="familia" data-valor="${valor}" aria-pressed="${valor === ""}">${t(nombre)}</button>`,
    )
    .join("");

  const campos = [
    lista("marco", { es: "Marco", en: "Framework" }, Object.entries(MARCOS).map(([valor, m]) => ({ valor, texto: `${m.nombre} ${m.version}` }))),
    lista("control", { es: "Control", en: "Control" }, [
      ...Object.keys(CONTROLES).map((valor) => ({ valor, texto: valor })),
      { valor: "ninguno", texto: { es: "Sin control asignado", en: "No control assigned" } },
    ]),
    lista("madurez", { es: "Madurez", en: "Maturity" }, Object.entries(MADUREZ).map(([valor, texto]) => ({ valor, texto }))),
    lista("vigencia", { es: "Vigencia", en: "Freshness" }, Object.entries(VIGENCIA).map(([valor, v]) => ({ valor, texto: v.nombre }))),
    lista("revision", { es: "Revisión de contenido", en: "Content review" }, [
      { valor: "limpia", texto: { es: "Limpia", en: "Clean" } },
      { valor: "marcada_para_revision", texto: { es: "Marcada para revisión", en: "Flagged for review" } },
    ]),
  ].join("");

  const cabecera = [
    { es: "Prueba", en: "Test" },
    { es: "Qué verifica", en: "What it verifies" },
    { es: "Marco y control", en: "Framework and control" },
    { es: "Vigencia", en: "Freshness" },
    { es: "Notas", en: "Notes" },
  ]
    .map((c) => `<span>${t(c)}</span>`)
    .join("");

  const contenido = `<div class="hg-encabezado">
<div>
<h1>${t({ es: "Catálogo de pruebas", en: "Test catalog" })}</h1>
<p class="hg-entrada">${t({
    es: "Cada prueba dice qué verifica, con qué herramienta y qué resultado se espera. Nada más.",
    en: "Each test says what it verifies, with which tool and what result is expected. Nothing more.",
  })}</p>
</div>
<p class="hg-menor" data-si="datos">${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)} · ${huella(huellaDelCatalogo)}<br>${tHtml(
    { es: `${total} pruebas en ${Object.keys(FAMILIAS).length} familias · consulta del {fecha}`, en: `${total} tests in ${Object.keys(FAMILIAS).length} families · queried on {fecha}` },
    { fecha: dato(consulta) },
  )}</p>
</div>

<div data-si="datos">
<ul class="hg-cifras" ${atributo("aria-label", { es: "Pruebas por vigencia", en: "Tests by freshness" })}>${cifras}</ul>

<div class="hg-filtros">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Familia", en: "Family" })}>${familias}</div>
<div class="hg-campos">${campos}</div>
<div class="hg-pie-de-filtros">
<p class="hg-menor">${tHtml(
    { es: `Se muestran {n} de ${total} pruebas`, en: `Showing {n} of ${total} tests` },
    { n: `<span data-cuenta-filtrada data-neutro>${total}</span>` },
  )}</p>
<button type="button" class="hg-boton" data-controlador="filtro-limpiar" hidden>${t({ es: "Quitar filtros", en: "Clear filters" })}</button>
</div>
</div>

<div class="hg-libro-cab" aria-hidden="true">${cabecera}</div>
<ul class="hg-libro">
${PRUEBAS.map((p) => fila(p, consulta, umbrales)).join("\n")}
</ul>
<div class="hg-aviso" data-sin-resultados hidden>
<h2>${t({ es: "Ninguna prueba cumple esos filtros", en: "No test matches those filters" })}</h2>
<p>${t({ es: "Quita un filtro o vuelve a «Todas» para ver el catálogo completo.", en: "Remove a filter or go back to “All” to see the whole catalog." })}</p>
</div>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "El catálogo está vacío", en: "The catalog is empty" })}</h2>
<p>${t({
    es: "Todavía no se ha cargado ninguna prueba. Carga las semillas del repositorio o aprueba una propuesta del investigador para empezar.",
    en: "No test has been loaded yet. Load the repository seeds or approve a proposal from the researcher to get started.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Validando el catálogo", en: "Validating the catalog" })}</h2>
<p class="hg-menor">${t({ es: "Cada prueba se comprueba contra su esquema antes de mostrarse.", en: "Each test is checked against its schema before it is shown." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "El catálogo no se cargó", en: "The catalog did not load" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "2 pruebas rechazadas al cargar", en: "2 tests rejected on load" } },
  `<ul class="hg-lista"><li>${dato("PR-IA-NUEVA-003")} ${t({ es: "cita su marco sin versión.", en: "cites its framework without a version." })}</li><li>${dato("PR-AG-NUEVA-004")} ${t({
    es: "es de una familia que varía entre corridas y no declara repeticiones.",
    en: "belongs to a family that varies between runs and declares no repetitions.",
  })}</li></ul><p>${t({
    es: "Nada entra a medias: corrige esas dos y vuelve a cargar. El resto del catálogo no se muestra hasta entonces.",
    en: "Nothing gets in half-done: fix those two and load again. The rest of the catalog is not shown until then.",
  })}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · catálogo", en: "HackGuard · catalog" },
    seccion: { id: "catalogo", archivo: "catalogo.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 2. El catálogo de pruebas. Cada fila abre la ficha de su prueba. Los datos son sintéticos y las versiones de los marcos, ilustrativas.",
        en: "Review 2. The test catalog. Each row opens its own test's record. Data is synthetic and framework versions are illustrative.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Botones de familia", en: "Family buttons" },
        hacer: { es: "Pulsa «Modelo de decisión»", en: "Press “Decision model”" },
        ver: { es: "Quedan 6 filas y el contador lo dice", en: "6 rows remain and the counter says so" },
      },
      {
        donde: { es: "Lista «Vigencia»", en: "“Freshness” list" },
        hacer: { es: "Elige «Vencido» sin quitar la familia", en: "Pick “Overdue” keeping the family" },
        ver: { es: "Los filtros se suman; aparece «Quitar filtros»", en: "Filters add up; “Clear filters” appears" },
      },
      {
        donde: { es: "Columna «Vigencia»", en: "“Freshness” column" },
        hacer: { es: "Recorre las filas", en: "Scan the rows" },
        ver: { es: "Vigente, por revisar y vencido se distinguen por su forma, y cada uno dice sus días", en: "Current, review due and overdue differ by shape, and each one states its days" },
      },
      {
        donde: { es: "Columna «Marco y control»", en: "“Framework and control” column" },
        hacer: { es: "Busca las pruebas de software", en: "Find the software tests" },
        ver: { es: "«Sin control asignado» se ve como una deuda, no como un error", en: "“No control assigned” reads as a debt, not as an error" },
      },
      {
        donde: { es: "Nombre de una prueba", en: "A test's name" },
        hacer: { es: "Filtra por «Vencido» y abre una de las filas", en: "Filter by “Overdue” and open one of the rows" },
        ver: { es: "Se abre la ficha de esa prueba, y dice que está vencida", en: "That test's record opens, and it says it is overdue" },
      },
      {
        donde: { es: "En el teléfono", en: "On the phone" },
        hacer: { es: "Desplázate por las filas", en: "Scroll the rows" },
        ver: { es: "Cada dato lleva su rótulo y nada se sale de la pantalla", en: "Each value has its label and nothing runs off the screen" },
      },
    ],
  });
}
