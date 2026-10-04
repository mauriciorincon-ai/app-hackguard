// marcos.html — pantalla 4 (C4). Marcos con su versión vigente, el aviso cuando la fuente oficial ya
// publica otra, el mapa de equivalencias con la versión anterior (para que pruebas y hallazgos antiguos
// sigan trazados) y las instantáneas del catálogo con su huella. Conteos y vigencias se calculan.
import { FAMILIAS, INSTANTANEAS, MARCOS, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { EQUIVALENCIAS, PROPUESTAS, TIPOS_DE_CAMBIO } from "../datos/gobierno.mjs";
import { huellaDe } from "../nucleo/calculos.mjs";
import { dato, enlace, estado, fechado, huella, libro, sello } from "../nucleo/componentes.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const VERSION_NUEVA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Hay una versión más nueva", en: "A newer version exists" } };
const AL_DIA = { rol: "positivo", simbolo: "ok", nombre: { es: "Es la versión publicada", en: "It is the published version" } };
const VERIFICADO = { es: "verificado", en: "verified" };

const pruebasDe = (marco) => PRUEBAS.filter((p) => p.marco === marco);
const propuestaDe = (marco) => PROPUESTAS.find((p) => p.tipo === "version_de_marco" && p.marco === marco);

export function marcos({ consulta, umbrales, existentes }) {
  const ids = Object.keys(MARCOS);
  const conAviso = ids.filter((id) => MARCOS[id].publicada);

  const filas = ids.map((id) => {
    const m = MARCOS[id];
    const n = pruebasDe(id).length;
    const version = m.publicada
      ? `<p>${estado(VERSION_NUEVA)}</p><p class="hg-menor">${tHtml({ es: "La fuente publica la {v}", en: "The source publishes {v}" }, { v: dato(m.publicada) })}</p>`
      : `<p>${estado(AL_DIA)}</p>`;
    return [
      `<p>${dato(id)}</p>`,
      `<p><strong>${neutro(m.nombre)}</strong></p><p class="hg-menor">${neutro(m.editor)} · ${m.familias.map((f) => t(FAMILIAS[f])).join(" · ")}</p>`,
      `<p>${dato(m.version)}</p><p class="hg-menor">${t({ es: "del", en: "dated" })} ${dato(m.fecha_version)}</p>`,
      version,
      `<p>${fechado(m.verificada, consulta, umbrales, VERIFICADO)}</p><p class="hg-menor">${tHtml(
        { es: n === 1 ? "{n} prueba lo cita" : "{n} pruebas lo citan", en: n === 1 ? "{n} test cites it" : "{n} tests cite it" },
        { n: neutro(String(n)) },
      )}</p>`,
    ];
  });

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
      return sello(
        { ...VERSION_NUEVA, nombre: { es: `${m.corto}: la fuente oficial publica la ${m.publicada}`, en: `${m.corto}: the official source publishes ${m.publicada}` } },
        `<p>${que}</p><p class="hg-menor">${tHtml({ es: "{n} pruebas citan este marco.", en: "{n} tests cite this framework." }, { n: neutro(String(n)) })}</p>`,
      );
    })
    .join("\n");

  const mapas = Object.entries(EQUIVALENCIAS)
    .map(([id, mapa]) => {
      const m = MARCOS[id];
      const filasDelMapa = mapa.entradas.map((e) => {
        const afectadas = e.a ? pruebasDe(id).filter((p) => p.ref === e.a) : [];
        return [
          e.de ? `<p>${dato(e.de)}</p>` : `<p class="hg-menor">${t({ es: "No existía", en: "Did not exist" })}</p>`,
          e.de ? `<p>${neutro(e.nombre_de)}</p>` : `<p class="hg-menor">—</p>`,
          e.a ? `<p>${dato(e.a)} ${neutro(e.nombre_a)}</p>` : `<p class="hg-menor">${t({ es: "Ninguna", en: "None" })}</p>`,
          `<p>${t(TIPOS_DE_CAMBIO[e.tipo])}</p>${
            afectadas.length
              ? `<p class="hg-menor">${t({ es: "La citan:", en: "Cited by:" })} ${afectadas.map((p) => enlace(archivoDeFicha(p.id), dato(p.id), existentes)).join(" · ")}</p>`
              : ""
          }`,
        ];
      });
      const sinDestino = mapa.entradas.filter((e) => e.tipo === "sin_equivalente").length;
      return `<h3 class="hg-titulo-3">${neutro(m.nombre)} · ${tHtml({ es: "de la {a} a la {b}", en: "from {a} to {b}" }, { a: dato(mapa.desde), b: dato(mapa.hasta) })}</h3>
${libro(
  [
    { es: `Entrada en la ${mapa.desde}`, en: `Entry in ${mapa.desde}` },
    { es: "Nombre anterior", en: "Previous name" },
    { es: `Entrada en la ${mapa.hasta}`, en: `Entry in ${mapa.hasta}` },
    { es: "Qué cambió", en: "What changed" },
  ],
  filasDelMapa,
)}
<p class="hg-menor">${tHtml(
        {
          es: "Entradas de la versión anterior sin equivalente directo: {n}. Un hallazgo antiguo que cite una de ellas conserva su referencia original y se revisa a mano.",
          en: "Entries from the previous version with no direct equivalent: {n}. An old finding that cites one of them keeps its original reference and is reviewed by hand.",
        },
        { n: neutro(String(sinDestino)) },
      )}</p>`;
    })
    .join("\n");

  const instantaneas = INSTANTANEAS.map((i, n) => {
    const total = i.pruebas ?? PRUEBAS.length;
    return [
      `<p>${dato(i.version)}</p>`,
      `<p>${t(i.cambio)}</p>${n === 0 ? `<p>${estado({ rol: "positivo", simbolo: "ok", nombre: { es: "Vigente", en: "Current" } })}</p>` : ""}`,
      `<p>${dato(i.fecha)}</p><p class="hg-menor">${tHtml({ es: "{n} pruebas", en: "{n} tests" }, { n: neutro(String(total)) })}</p>`,
      `<p>${huella(huellaDe({ version: i.version, fecha: i.fecha, pruebas: total }))}</p>`,
    ];
  });

  const contenido = `<div class="hg-encabezado">
<div>
<h1>${t({ es: "Marcos y versiones", en: "Frameworks and versions" })}</h1>
<p class="hg-entrada">${t({
    es: "Toda prueba cita un marco con su versión. Aquí se ve cuál está vigente en el catálogo y cómo se traduce desde la anterior.",
    en: "Every test cites a framework with its version. This shows which one is current in the catalog and how it translates from the previous one.",
  })}</p>
</div>
</div>

<div data-si="datos">
<ul class="hg-cifras" ${atributo("aria-label", { es: "Resumen de marcos", en: "Framework summary" })}>
<li><span class="hg-cifra" data-neutro>${ids.length}</span><span>${t({ es: "marcos en el catálogo", en: "frameworks in the catalog" })}</span></li>
<li><span class="hg-cifra" data-neutro>${conAviso.length}</span>${estado({ ...VERSION_NUEVA, nombre: { es: "con versión más nueva publicada", en: "with a newer published version" } })}</li>
<li><span class="hg-cifra" data-neutro>${Object.keys(EQUIVALENCIAS).length}</span><span>${t({ es: "mapa de equivalencias cargado", en: "equivalence map loaded" })}</span></li>
</ul>

${libro(
  [
    { es: "Marco", en: "Framework" },
    { es: "Nombre y familias", en: "Name and families" },
    { es: "Versión en el catálogo", en: "Version in the catalog" },
    { es: "Frente a la fuente", en: "Against the source" },
    { es: "Vigencia", en: "Freshness" },
  ],
  filas,
  { clase: "hg-folio-ancho" },
)}

<section class="hg-seccion" aria-labelledby="avisos">
<h2 id="avisos">${t({ es: "Avisos de versión", en: "Version notices" })}</h2>
<p class="hg-intro">${t({
    es: "El investigador compara la versión del catálogo con la que publica la fuente oficial de cada marco. Avisa; no cambia nada por su cuenta.",
    en: "The researcher compares the catalog's version with the one each framework's official source publishes. It notifies; it changes nothing on its own.",
  })}</p>
<div class="hg-avisos">
${avisos}
</div>
</section>

<section class="hg-seccion" aria-labelledby="mapa">
<h2 id="mapa">${t({ es: "Mapa de equivalencias", en: "Equivalence map" })}</h2>
<p class="hg-intro">${t({
    es: "Cuando un marco cambia de versión, sus entradas cambian de número y de nombre. El mapa dice a qué entrada nueva corresponde cada una, para que una prueba o un hallazgo de antes siga apuntando al lugar correcto.",
    en: "When a framework changes version, its entries change number and name. The map says which new entry each one corresponds to, so that an earlier test or finding still points to the right place.",
  })}</p>
${mapas}
</section>

<section class="hg-seccion" aria-labelledby="instantaneas">
<h2 id="instantaneas">${t({ es: "Instantáneas del catálogo", en: "Catalog snapshots" })}</h2>
<p class="hg-intro">${t({
    es: "Cada vez que el catálogo cambia se guarda una instantánea con su huella. Todo plan cita la instantánea con la que se hizo.",
    en: "Every time the catalog changes a snapshot is saved with its fingerprint. Every plan cites the snapshot it was made with.",
  })}</p>
${libro(
  [
    { es: "Instantánea", en: "Snapshot" },
    { es: "Qué cambió", en: "What changed" },
    { es: "Fecha y tamaño", en: "Date and size" },
    { es: "Huella", en: "Fingerprint" },
  ],
  instantaneas,
)}
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "No hay marcos cargados", en: "No frameworks loaded" })}</h2>
<p>${t({
    es: "Sin marcos no puede haber pruebas: cada prueba cita uno con su versión. Carga las semillas del repositorio para empezar.",
    en: "Without frameworks there can be no tests: each test cites one with its version. Load the repository seeds to get started.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Comprobando los marcos", en: "Checking the frameworks" })}</h2>
<p class="hg-menor">${t({ es: "Se valida que cada referencia del catálogo cite una versión que existe.", en: "Each catalog reference is validated to cite a version that exists." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "Los marcos no se cargaron", en: "The frameworks did not load" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "1 referencia sin versión", en: "1 reference without a version" } },
  `<p>${tHtml(
    {
      es: "La prueba {p} cita {r} sin decir de qué versión del marco. La misma etiqueta nombra entradas distintas en cada versión, así que se rechaza al cargar: escribe la versión y vuelve a cargar.",
      en: "Test {p} cites {r} without saying which framework version. The same label names different entries in each version, so it is rejected on load: write the version and load again.",
    },
    { p: dato("PR-IA-NUEVA-003"), r: dato("LLM07") },
  )}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · marcos", en: "HackGuard · frameworks" },
    seccion: { id: "catalogo", archivo: "marcos.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 3. Marcos y versiones. Las versiones, las fechas y el mapa son ilustrativos: se fijan con fuente en el primer sprint.",
        en: "Review 3. Frameworks and versions. Versions, dates and the map are illustrative: they are fixed with a source in the first sprint.",
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
        donde: { es: "1. Avisos de versión", en: "1. Version notices" },
        hacer: { es: "Lee los dos avisos", en: "Read the two notices" },
        ver: { es: "Uno ya tiene propuesta en la bandeja; el otro dice qué pedir. Ninguno cambia el catálogo solo", en: "One already has a proposal in the inbox; the other says what to ask for. Neither changes the catalog by itself" },
      },
      {
        donde: { es: "2. Mapa de equivalencias", en: "2. Equivalence map" },
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
