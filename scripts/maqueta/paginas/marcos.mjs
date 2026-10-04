// marcos.html — pantalla 4 (C4). Marcos con su versión vigente, el aviso cuando la fuente oficial ya
// publica otra, el mapa de equivalencias con la versión anterior (para que pruebas y hallazgos antiguos
// sigan trazados) y las instantáneas del catálogo con su huella. Conteos y vigencias se calculan.
// Dirección «consola» (mirada 4-ter): tira de cifras, y cada bloque en su panel con su tabla.
import { FAMILIAS, INSTANTANEAS, MARCOS, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { EQUIVALENCIAS, PROPUESTAS, TIPOS_DE_CAMBIO } from "../datos/gobierno.mjs";
import { huellaDe } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, estado, fechado, huella, sello } from "../nucleo/componentes.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const VERSION_NUEVA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Hay una versión más nueva", en: "A newer version exists" } };
// En una celda de tabla, la versión nueva se dice corta (la columna ya se llama «Frente a la fuente»).
const VERSION_NUEVA_CORTA = { ...VERSION_NUEVA, nombre: { es: "Versión más nueva", en: "Newer version" } };
const AL_DIA = { rol: "positivo", simbolo: "ok", nombre: { es: "Al día", en: "Up to date" } };
const VERIFICADO = { es: "Verificado", en: "Verified" };

const pruebasDe = (marco) => PRUEBAS.filter((p) => p.marco === marco);
const propuestaDe = (marco) => PROPUESTAS.find((p) => p.tipo === "version_de_marco" && p.marco === marco);
const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;

export function marcos({ consulta, umbrales, existentes }) {
  const ids = Object.keys(MARCOS);
  const conAviso = ids.filter((id) => MARCOS[id].publicada);

  const filas = ids
    .map((id) => {
      const m = MARCOS[id];
      const n = pruebasDe(id).length;
      // Lo que no es noticia no lleva chip: «al día» va en línea; la versión nueva, en chip.
      const frente = m.publicada
        ? `<p>${chip(VERSION_NUEVA_CORTA)}</p><p class="hg-menor">${tHtml({ es: "La fuente publica la {v}", en: "The source publishes {v}" }, { v: dato(m.publicada) })}</p>`
        : `<p>${estado(AL_DIA)}</p>`;
      return `<tr>
<td data-celda="id">${dato(id)}</td>
<td><p><strong>${neutro(m.nombre)}</strong></p><p class="hg-menor">${neutro(m.editor)} · ${m.familias.map((f) => t(FAMILIAS[f])).join(" · ")}</p></td>
<td><p>${dato(m.version)}</p><p class="hg-menor">${t({ es: "del", en: "dated" })} ${dato(m.fecha_version)}</p></td>
<td data-celda="estado">${frente}</td>
<td>${fechado(m.verificada, consulta, umbrales, VERIFICADO)}<p class="hg-menor">${tHtml(
        { es: n === 1 ? "{n} prueba lo cita" : "{n} pruebas lo citan", en: n === 1 ? "{n} test cites it" : "{n} tests cite it" },
        { n: neutro(String(n)) },
      )}</p></td>
</tr>`;
    })
    .join("\n");

  const avisos = conAviso
    .map((id) => {
      const m = MARCOS[id];
      const propuesta = propuestaDe(id);
      const n = pruebasDe(id).length;
      const que = propuesta
        ? tHtml(
            { es: "El investigador ya propuso el cambio con su mapa de equivalencias: {p}. Hasta que lo apruebes, el catálogo sigue en la {v}.", en: "The researcher already proposed the change with its equivalence map: {p}. Until you approve it, the catalog stays on {v}." },
            { p: enlace("propuestas.html", dato(propuesta.id), existentes), v: dato(m.version) },
          )
        : tHtml(
            { es: "Todavía no hay propuesta. Pide al investigador el cambio de versión con su mapa de equivalencias; el catálogo sigue en la {v}.", en: "There is no proposal yet. Ask the researcher for the version change with its equivalence map; the catalog stays on {v}." },
            { v: dato(m.version) },
          );
      return `<li>${sello(
        { ...VERSION_NUEVA, nombre: { es: `${m.corto}: la fuente oficial publica la ${m.publicada}`, en: `${m.corto}: the official source publishes ${m.publicada}` } },
        `<p>${que}</p><p class="hg-menor">${tHtml({ es: "{n} pruebas citan este marco.", en: "{n} tests cite this framework." }, { n: neutro(String(n)) })}</p>`,
      )}</li>`;
    })
    .join("\n");

  const mapas = Object.entries(EQUIVALENCIAS)
    .map(([id, mapa]) => {
      const m = MARCOS[id];
      const filasDelMapa = mapa.entradas
        .map((e) => {
          const afectadas = e.a ? pruebasDe(id).filter((p) => p.ref === e.a) : [];
          return `<tr>
<td data-celda="id">${e.de ? dato(e.de) : `<span class="hg-menor">${t({ es: "No existía", en: "Did not exist" })}</span>`}</td>
<td>${e.de ? `<p>${neutro(e.nombre_de)}</p>` : `<p class="hg-menor">${t({ es: "Sin nombre anterior", en: "No previous name" })}</p>`}</td>
<td>${e.a ? `<p>${dato(e.a)} ${neutro(e.nombre_a)}</p>` : `<p class="hg-menor">${t({ es: "Ninguna", en: "None" })}</p>`}</td>
<td><p>${t(TIPOS_DE_CAMBIO[e.tipo])}</p>${
            afectadas.length
              ? `<p class="hg-menor">${t({ es: "La citan:", en: "Cited by:" })} ${afectadas.map((p) => enlace(archivoDeFicha(p.id), dato(p.id), existentes)).join(" · ")}</p>`
              : ""
          }</td>
</tr>`;
        })
        .join("\n");
      const sinDestino = mapa.entradas.filter((e) => e.tipo === "sin_equivalente").length;
      return `<section class="hg-panel" aria-labelledby="mapa-${id}">
<div class="hg-panel-cab"><h2 id="mapa-${id}">${t({ es: "Mapa de equivalencias", en: "Equivalence map" })}</h2><p class="hg-menor">${neutro(m.nombre)} · ${tHtml({ es: "de la {a} a la {b}", en: "from {a} to {b}" }, { a: dato(mapa.desde), b: dato(mapa.hasta) })}</p></div>
<div class="hg-panel-cuerpo"><p class="hg-menor">${t({
        es: "Cuando un marco cambia de versión, sus entradas cambian de número y de nombre. El mapa dice a qué entrada nueva corresponde cada una, para que una prueba o un hallazgo de antes siga apuntando al lugar correcto.",
        en: "When a framework changes version, its entries change number and name. The map says which new entry each one corresponds to, so that an earlier test or finding still points to the right place.",
      })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Entradas del mapa de equivalencias", en: "Equivalence map entries" })}</caption>
${columnas([
  { es: `Entrada en la ${mapa.desde}`, en: `Entry in ${mapa.desde}` },
  { es: "Nombre anterior", en: "Previous name" },
  { es: `Entrada en la ${mapa.hasta}`, en: `Entry in ${mapa.hasta}` },
  { es: "Qué cambió", en: "What changed" },
])}
<tbody>
${filasDelMapa}
</tbody>
</table>
<p class="hg-panel-pie">${tHtml(
        {
          es: "Entradas de la versión anterior sin equivalente directo: {n}. Un hallazgo antiguo que cite una de ellas conserva su referencia original y se revisa a mano.",
          en: "Entries from the previous version with no direct equivalent: {n}. An old finding that cites one of them keeps its original reference and is reviewed by hand.",
        },
        { n: neutro(String(sinDestino)) },
      )}</p>
</section>`;
    })
    .join("\n");

  const instantaneas = INSTANTANEAS.map((i, n) => {
    const total = i.pruebas ?? PRUEBAS.length;
    return `<tr>
<td data-celda="id">${dato(i.version)}</td>
<td><p>${t(i.cambio)}</p></td>
<td><p>${dato(i.fecha)}</p><p class="hg-menor">${tHtml({ es: "{n} pruebas", en: "{n} tests" }, { n: neutro(String(total)) })}</p></td>
<td>${huella(huellaDe({ version: i.version, fecha: i.fecha, pruebas: total }))}</td>
<td data-celda="estado">${n === 0 ? estado({ rol: "positivo", simbolo: "ok", nombre: { es: "Vigente", en: "Current" } }) : `<span class="hg-menor">${t({ es: "Anterior", en: "Previous" })}</span>`}</td>
</tr>`;
  }).join("\n");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Marcos y versiones", en: "Frameworks and versions" })}</h1>
<p class="hg-bajada">${t({
    es: "Toda prueba cita un marco con su versión. Aquí se ve cuál está vigente en el catálogo y cómo se traduce desde la anterior.",
    en: "Every test cites a framework with its version. This shows which one is current in the catalog and how it translates from the previous one.",
  })}</p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Resumen de marcos", en: "Framework summary" })}>
<li><span class="hg-cifra" data-neutro>${ids.length}</span><span>${t({ es: "marcos en el catálogo", en: "frameworks in the catalog" })}</span></li>
<li><span class="hg-cifra" data-neutro>${conAviso.length}</span>${estado({ ...VERSION_NUEVA, nombre: { es: "con versión más nueva", en: "with a newer version" } })}</li>
<li><span class="hg-cifra" data-neutro>${Object.keys(EQUIVALENCIAS).length}</span><span>${t({ es: "mapa de equivalencias", en: "equivalence map" })}</span></li>
<li><span class="hg-cifra" data-neutro>${INSTANTANEAS.length}</span><span>${t({ es: "instantáneas", en: "snapshots" })}</span></li>
</ul>
</div>

<div class="hg-pila" data-si="datos">
<section class="hg-panel" aria-labelledby="marcos">
<div class="hg-panel-cab"><h2 id="marcos">${t({ es: "Marcos del catálogo", en: "Catalog frameworks" })}</h2></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Marcos del catálogo", en: "Catalog frameworks" })}</caption>
${columnas([
  { es: "Marco", en: "Framework" },
  { es: "Nombre y familias", en: "Name and families" },
  { es: "Versión en el catálogo", en: "Version in the catalog" },
  { es: "Frente a la fuente", en: "Against the source" },
  { es: "Vigencia", en: "Freshness" },
])}
<tbody>
${filas}
</tbody>
</table>
</section>

<section class="hg-panel" aria-labelledby="avisos">
<div class="hg-panel-cab"><h2 id="avisos">${t({ es: "Avisos de versión", en: "Version notices" })}</h2><p class="hg-menor">${t({
    es: "El investigador compara la versión del catálogo con la que publica la fuente oficial. Avisa; no cambia nada por su cuenta.",
    en: "The researcher compares the catalog's version with the one the official source publishes. It notifies; it changes nothing on its own.",
  })}</p></div>
<div class="hg-panel-cuerpo"><ul class="hg-rejilla">
${avisos}
</ul></div>
</section>

${mapas}

<section class="hg-panel" aria-labelledby="instantaneas">
<div class="hg-panel-cab"><h2 id="instantaneas">${t({ es: "Instantáneas del catálogo", en: "Catalog snapshots" })}</h2><p class="hg-menor">${t({
    es: "Cada cambio del catálogo guarda una instantánea con su huella. Todo plan cita la suya.",
    en: "Every catalog change saves a snapshot with its fingerprint. Every plan cites its own.",
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Instantáneas del catálogo", en: "Catalog snapshots" })}</caption>
${columnas([
  { es: "Instantánea", en: "Snapshot" },
  { es: "Qué cambió", en: "What changed" },
  { es: "Fecha y tamaño", en: "Date and size" },
  { es: "Huella", en: "Fingerprint" },
  { es: "Estado", en: "Status" },
])}
<tbody>
${instantaneas}
</tbody>
</table>
</section>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "No hay marcos cargados", en: "No frameworks loaded" },
  `<p>${t({
    es: "Sin marcos no puede haber pruebas: cada prueba cita uno con su versión. Carga las semillas del repositorio para empezar.",
    en: "Without frameworks there can be no tests: each test cites one with its version. Load the repository seeds to get started.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Comprobando los marcos", en: "Checking the frameworks" },
  `<p>${t({ es: "Se valida que cada referencia del catálogo cite una versión que existe.", en: "Each catalog reference is validated to cite a version that exists." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "Los marcos no se cargaron", en: "The frameworks did not load" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "1 referencia sin versión", en: "1 reference without a version" } },
    `<p>${tHtml(
      {
        es: "La prueba {p} cita {r} sin decir de qué versión del marco. La misma etiqueta nombra entradas distintas en cada versión, así que se rechaza al cargar: escribe la versión y vuelve a cargar.",
        en: "Test {p} cites {r} without saying which framework version. The same label names different entries in each version, so it is rejected on load: write the version and load again.",
      },
      { p: dato("PR-IA-NUEVA-003"), r: dato("LLM07") },
    )}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · marcos", en: "HackGuard · frameworks" },
    seccion: { id: "catalogo", archivo: "marcos.html" },
    migas: [t({ es: "Catálogo", en: "Catalog" }), t({ es: "Marcos", en: "Frameworks" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter: marcos y versiones con la interfaz nueva (aprobado en el segundo tramo). Las versiones, las fechas y el mapa son ilustrativos: se fijan con fuente en el primer sprint.",
        en: "Review 4-ter: frameworks and versions with the new interface (approved in the second stretch). Versions, dates and the map are illustrative: they are fixed with a source in the first sprint.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Tabla de marcos", en: "Framework table" },
        hacer: { es: "Mira la columna «Frente a la fuente»", en: "Look at the “Against the source” column" },
        ver: { es: "Se distingue de un vistazo qué marco tiene una versión más nueva publicada", en: "You can tell at a glance which framework has a newer published version" },
      },
      {
        donde: { es: "Avisos de versión", en: "Version notices" },
        hacer: { es: "Lee cada aviso", en: "Read each notice" },
        ver: { es: "Uno ya tiene propuesta en la bandeja; el otro dice qué pedir. Ninguno cambia el catálogo solo", en: "One already has a proposal in the inbox; the other says what to ask for. Neither changes the catalog by itself" },
      },
      {
        donde: { es: "Mapa de equivalencias", en: "Equivalence map" },
        hacer: { es: "Sigue una entrada de izquierda a derecha", en: "Follow one entry from left to right" },
        ver: { es: "Se entiende a qué entrada nueva corresponde y qué pruebas la citan", en: "It is clear which new entry it maps to and which tests cite it" },
      },
      {
        donde: { es: "Botón «Error» de la sala", en: "The room's “Error” button" },
        hacer: { es: "Púlsalo", en: "Press it" },
        ver: { es: "El error nombra la prueba, la referencia y qué hacer", en: "The error names the test, the reference and what to do" },
      },
    ],
  });
}
