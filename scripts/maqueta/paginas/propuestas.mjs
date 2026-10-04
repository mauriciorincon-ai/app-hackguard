// propuestas.html — pantalla 6 (C2, C7, C15). La bandeja: lo que proponen el investigador y el
// extractor llega aquí y solo una persona lo aprueba, lo rechaza o lo separa. Cada propuesta muestra si
// el CÓDIGO verificó su fuente (existe y contiene el fragmento citado) y si el filtro de contenido la
// marcó. El veredicto sugerido de un sobre lo calcula la regla de la prueba, nunca el modelo.
// Dirección «consola» (mirada 4-ter): cada propuesta es un panel con su decisión al pie; en el carril, la
// última corrida del investigador.
import { PRUEBAS, REGLAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { CORRIDA, ORIGENES, PROPUESTAS, TIPOS_DE_PROPUESTA, VERIFICACION_DE_FUENTE } from "../datos/gobierno.mjs";
import { ACTIVOS, archivoDePlan } from "../datos/mundo.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, estado, par, sello } from "../nucleo/componentes.mjs";
import { VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

const MARCADA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Marcada por el filtro de contenido", en: "Flagged by the content filter" } };
const DECISIONES = {
  aprobar: { es: "Aprobar", en: "Approve" },
  aprobar_tras_revisar: { es: "La revisé y la apruebo", en: "I reviewed it and approve" },
  rechazar: { es: "Rechazar", en: "Reject" },
  separar: { es: "Separar en dos", en: "Split in two" },
};

// Qué pasa al decidir: se dice con palabras, junto a los botones, antes de que nada se escriba.
function consecuencias(p) {
  const aprobada =
    p.tipo === "sobre"
      ? { es: "Aprobada. Pasa a la carga de evidencia como sobre por confirmar: todavía no cuenta.", en: "Approved. It moves to evidence intake as an envelope to confirm: it does not count yet." }
      : p.contenido === "marcada_para_revision"
        ? { es: "Aprobada tras tu revisión. Queda registrado que la revisaste tú, y entra al catálogo en la próxima instantánea.", en: "Approved after your review. It is recorded that you reviewed it, and it enters the catalog in the next snapshot." }
        : { es: "Aprobada. Entra al catálogo en la próxima instantánea, con tu firma y la fecha.", en: "Approved. It enters the catalog in the next snapshot, with your signature and the date." };
  return `<div>
<p class="hg-consecuencia" data-si-decision="aprobar" hidden>${t(aprobada)}</p>
<p class="hg-consecuencia" data-si-decision="rechazar" hidden>${t({ es: "Rechazada. Sale de la bandeja y queda en el registro con tu motivo.", en: "Rejected. It leaves the inbox and stays in the log with your reason." })}</p>
${p.separable ? `<p class="hg-consecuencia" data-si-decision="separar" hidden>${t({ es: "Separada. Vuelve a la bandeja como dos propuestas, una por prueba.", en: "Split. It returns to the inbox as two proposals, one per test." })}</p>` : ""}
<p class="hg-menor" data-si-decision="">${t({ es: "Sin decidir: no está en el catálogo ni cuenta como evidencia.", en: "Not decided: it is not in the catalog and does not count as evidence." })}</p>
</div>`;
}

function botones(p) {
  const opciones = [
    p.separable ? null : ["aprobar", p.contenido === "marcada_para_revision" ? DECISIONES.aprobar_tras_revisar : DECISIONES.aprobar],
    p.separable ? ["separar", DECISIONES.separar] : null,
    ["rechazar", DECISIONES.rechazar],
  ].filter(Boolean);
  const rotulo = { es: `Decisión sobre ${p.id}`, en: `Decision on ${p.id}` };
  return `<div class="hg-grupo" role="group" ${atributo("aria-label", rotulo)}>${opciones
    .map(([valor, nombre]) => `<button type="button" class="hg-boton" data-controlador="decidir" data-valor="${valor}" aria-pressed="false">${t(nombre)}</button>`)
    .join("")}</div>`;
}

// La fuente verificada no es noticia (en línea); la que no se pudo verificar, sí (chip).
function fuentes(p) {
  if (!p.fuentes) return "";
  return p.fuentes
    .map((f) => {
      const v = VERIFICACION_DE_FUENTE[f.verificacion];
      return `<div class="hg-junto"><p>${f.verificacion === "verificada" ? estado(v) : chip(v)} <span class="hg-menor">${neutro(f.nombre)}${f.donde ? ` · ${t(f.donde)}` : ""}</span></p>${
        f.detalle ? `<p class="hg-menor">${t(f.detalle)}</p>` : ""
      }</div>`;
    })
    .join("");
}

// Sobre propuesto por el extractor: evidencia antes que sugerencia; el veredicto sale de la regla.
function sobre(p, existentes) {
  const activo = ACTIVOS[p.activo];
  const candidatas = p.candidatas.map((id) => PRUEBAS.find((x) => x.id === id));
  const principal = fichaDe(p.candidatas[0]);
  const lineas = [
    par({ es: "Activo y plan", en: "Asset and plan" }, `<span>${t(activo.nombre)} <span class="hg-menor">· ${enlace(archivoDePlan(p.activo), dato(activo.plan.id), existentes)}</span></span>`),
    par(
      { es: "Citas literales", en: "Literal quotes" },
      `${estado({ rol: "positivo", simbolo: "ok", nombre: { es: `${p.citas} verificadas por código`, en: `${p.citas} verified by code` } })}<span class="hg-menor">${t({
        es: "Cada campo propuesto cita el fragmento del texto del que sale. El texto pegado no se guarda: solo su huella y un extracto.",
        en: "Each proposed field quotes the fragment of the text it comes from. The pasted text is not stored: only its fingerprint and an excerpt.",
      })}</span>`,
    ),
    par(
      p.separable ? { es: "Pruebas que mezcla", en: "Tests it mixes" } : { es: "Prueba asociada", en: "Matched test" },
      `${candidatas.map((c) => `<span>${enlace(archivoDeFicha(c.id), dato(c.id), existentes)} ${t(c.nombre)}</span>`).join("")}${
        p.separable
          ? ""
          : `<span class="hg-menor">${t({ es: "Hay dos pruebas parecidas en el plan. Se propone la primera; tú eliges.", en: "There are two similar tests in the plan. The first is proposed; you choose." })}</span>`
      }`,
    ),
  ];
  if (p.conteo) {
    const regla = REGLAS[principal.regla];
    const veredicto = p.conteo.fallidas > 0 ? "fallida" : "superada";
    lineas.push(
      par(
        { es: "Veredicto sugerido", en: "Suggested verdict" },
        `${chip(VEREDICTO[veredicto])}<span class="hg-menor">${tHtml(
          { es: "Lo calculó la regla {r} con {f} fallas en {n}, no el extractor. {d}", en: "Computed by rule {r} from {f} failures in {n}, not by the extractor. {d}" },
          { r: dato(principal.regla), f: neutro(String(p.conteo.fallidas)), n: neutro(String(p.conteo.evaluadas)), d: t(regla.decide) },
        )}</span>`,
      ),
      par({ es: "Severidad", en: "Severity" }, `<span class="hg-menor">${t({ es: "Sin precargar: la decides tú al confirmar el sobre.", en: "Not prefilled: you decide it when you confirm the envelope." })}</span>`),
    );
  }
  return `<dl class="hg-propiedades hg-propiedades-en-columnas">\n${lineas.join("\n")}\n</dl>`;
}

function propuesta(p, existentes) {
  const marca =
    p.contenido === "marcada_para_revision"
      ? `<div class="hg-sello hg-sello-menor es-atencion">${SIMBOLO.aviso}<div><span class="hg-sello-titulo">${t(MARCADA.nombre)}</span><p>${t({
          es: "El filtro encontró un patrón que pide revisión. Marca, no rechaza: para aprobarla tienes que revisarla tú, y queda registrado.",
          en: "The filter found a pattern that calls for review. It flags, it does not reject: to approve it you must review it yourself, and that is recorded.",
        })}</p></div></div>`
      : "";
  return `<article class="hg-panel" data-filtrable data-propuesta="${p.id}" data-origen="${p.origen}" data-decision="">
<div class="hg-panel-cuerpo">
<p class="hg-propuesta-linea">${dato(p.id)}<span>${t(ORIGENES[p.origen])}</span><span>${t(TIPOS_DE_PROPUESTA[p.tipo])}</span>${dato(p.fecha)}</p>
<h2 class="hg-tarjeta-nombre">${t(p.titulo)}</h2>
<p>${t(p.resumen)}</p>
${fuentes(p)}
${marca}
</div>
${p.tipo === "sobre" ? `<div class="hg-panel-cuerpo">${sobre(p, existentes)}</div>` : ""}
<div class="hg-decision">
${botones(p)}
${consecuencias(p)}
</div>
</article>`;
}

export function propuestas({ consulta, existentes }) {
  const total = PROPUESTAS.length;
  const cuenta = (f) => PROPUESTAS.filter(f).length;
  const sinVerificar = cuenta((p) => p.fuentes?.some((f) => f.verificacion !== "verificada"));
  const marcadas = cuenta((p) => p.contenido === "marcada_para_revision");

  const origenes = [{ valor: "", nombre: { es: "Todas", en: "All" } }, ...Object.entries(ORIGENES).map(([valor, nombre]) => ({ valor, nombre }))]
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton hg-filtro" data-controlador="filtro" data-campo="origen" data-valor="${valor}" aria-pressed="${valor === ""}">${t(nombre)}</button>`,
    )
    .join("");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Bandeja de propuestas", en: "Proposal inbox" })}</h1>
<p class="hg-bajada">${t({
    es: "La inteligencia artificial propone y tú apruebas. Nada de lo que hay aquí está en el catálogo ni cuenta como evidencia hasta que lo decidas.",
    en: "The AI proposes and you approve. Nothing here is in the catalog or counts as evidence until you decide.",
  })}</p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Resumen de la bandeja", en: "Inbox summary" })}>
<li><span class="hg-cifra" data-neutro data-cuenta-pendientes>${total}</span><span>${t({ es: "por decidir", en: "to decide" })}</span></li>
<li><span class="hg-cifra" data-neutro>${sinVerificar}</span>${estado({ ...VERIFICACION_DE_FUENTE.sin_fragmento, nombre: { es: "fuente sin verificar", en: "unverified source" } })}</li>
<li><span class="hg-cifra" data-neutro>${marcadas}</span>${estado({ ...MARCADA, nombre: { es: "marcada por el filtro", en: "flagged by the filter" } })}</li>
</ul>
</div>

<div class="hg-trabajo" data-si="datos">
<div class="hg-pila">
<div class="hg-herramientas-linea">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Quién propone", en: "Who proposes" })}>${origenes}</div>
<p class="hg-menor">${tHtml({ es: `Se muestran {n} de ${total} propuestas`, en: `Showing {n} of ${total} proposals` }, { n: `<span data-cuenta-filtrada data-neutro>${total}</span>` })}</p>
</div>
<div class="hg-propuestas">
${PROPUESTAS.map((p) => propuesta(p, existentes)).join("\n")}
</div>
</div>

<aside class="hg-carril" ${atributo("aria-label", { es: "Última corrida del investigador", en: "The researcher's last run" })}>
<section class="hg-tarjeta" aria-labelledby="corrida">
<h2 class="hg-tarjeta-titulo" id="corrida">${t({ es: "Última corrida del investigador", en: "The researcher's last run" })}</h2>
<p class="hg-menor">${t({
    es: "Cada corrida queda registrada con lo que consultó y lo que no pudo consultar. Lo que no pudo leer no lo inventa ni lo fuerza: te lo pide.",
    en: "Each run is logged with what it consulted and what it could not. What it could not read it neither invents nor forces: it asks you for it.",
  })}</p>
<dl class="hg-propiedades">
${par({ es: "Corrida", en: "Run" }, `${dato(CORRIDA.id)}${dato(CORRIDA.fecha)}`)}
${par({ es: "Qué revisó", en: "What it covered" }, `<span>${t(CORRIDA.alcance)}</span>`)}
${par({ es: "Fuentes consultadas", en: "Sources consulted" }, `<strong data-neutro>${CORRIDA.consultadas}</strong>`)}
${par(
  { es: "No pudo leer", en: "Could not read" },
  `${CORRIDA.no_accesibles.map((f) => `<span>${neutro(f.nombre)}</span><span class="hg-menor">${t(f.razon)}</span>`).join("")}<span class="hg-menor">${t({
    es: "Adjunta o pega el documento y se procesa como cualquier otra fuente.",
    en: "Attach or paste the document and it is processed like any other source.",
  })}</span>`,
)}
${par({ es: "Contradicciones", en: "Contradictions" }, CORRIDA.contradicciones.map((c) => `<span>${t(c)}</span>`).join(""))}
</dl>
</section>
</aside>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "La bandeja está vacía", en: "The inbox is empty" },
  `<p>${t({
    es: "No hay nada por decidir. Pide al investigador que revise una familia o un marco, o pega el resultado de una herramienta en la carga de evidencia.",
    en: "There is nothing to decide. Ask the researcher to check a family or a framework, or paste a tool's result into evidence intake.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Verificando las fuentes", en: "Verifying sources" },
  `<p>${t({ es: "Antes de mostrar una propuesta, el código comprueba que su fuente existe y que dice lo que se cita.", en: "Before a proposal is shown, code checks that its source exists and says what is quoted." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "Una propuesta no se pudo leer", en: "A proposal could not be read" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "1 propuesta no cumple su esquema", en: "1 proposal does not match its schema" } },
    `<p>${tHtml(
      {
        es: "El archivo {a} no trae el resultado esperado. Una propuesta incompleta no se muestra para aprobar: se reintentó dos veces y se reporta aquí. Las demás siguen en la bandeja.",
        en: "File {a} has no expected result. An incomplete proposal is not shown for approval: it was retried twice and is reported here. The others stay in the inbox.",
      },
      { a: dato("propuestas/PROP-0038.json") },
    )}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · propuestas", en: "HackGuard · proposals" },
    seccion: { id: "catalogo", archivo: "propuestas.html" },
    migas: [t({ es: "Catálogo", en: "Catalog" }), t({ es: "Propuestas", en: "Proposals" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter, segundo tramo: la bandeja de propuestas con la interfaz nueva. Los botones funcionan en la maqueta, pero no guardan nada.",
        en: "Review 4-ter, second stretch: the proposal inbox with the new interface. The buttons work in the mockup, but they save nothing.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Cada propuesta", en: "Each proposal" },
        hacer: { es: "Mira la línea de la fuente", en: "Look at the source line" },
        ver: { es: "La fuente sin verificar resalta; la verificada no. La que no se verificó sigue ahí, marcada", en: "The unverified source stands out; the verified one does not. The unverified one is still there, flagged" },
      },
      {
        donde: { es: "Propuesta marcada por el filtro", en: "Proposal flagged by the filter" },
        hacer: { es: "Lee el aviso y el botón de aprobar", en: "Read the notice and the approve button" },
        ver: { es: "Aprobarla exige decir que la revisaste; el filtro no la rechazó", en: "Approving it requires stating that you reviewed it; the filter did not reject it" },
      },
      {
        donde: { es: "Sobre propuesto por el extractor", en: "Envelope proposed by the extractor" },
        hacer: { es: "Lee «Veredicto sugerido»", en: "Read “Suggested verdict”" },
        ver: { es: "Dice que lo calculó la regla, con sus cifras, y que la severidad no viene puesta", en: "It says the rule computed it, with its figures, and that severity is not prefilled" },
      },
      {
        donde: { es: "Pie de una propuesta", en: "A proposal's footer" },
        hacer: { es: "Pulsa «Aprobar» y luego «Rechazar»", en: "Press “Approve” and then “Reject”" },
        ver: { es: "Al lado se lee qué pasa con cada decisión, el pie se marca en azul y baja la cifra «por decidir»", en: "Next to it you read what each decision does, the footer turns blue and the “to decide” figure goes down" },
      },
      {
        donde: { es: "Píldoras de arriba", en: "Pills on top" },
        hacer: { es: "Pulsa «Extractor»", en: "Press “Extractor”" },
        ver: { es: "Quedan los dos sobres y el contador lo dice", en: "The two envelopes remain and the counter says so" },
      },
    ],
  });
}
