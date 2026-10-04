// propuestas.html — pantalla 6 (C2, C7, C15). La bandeja: lo que proponen el investigador y el
// extractor llega aquí y solo una persona lo aprueba, lo rechaza o lo separa. Cada propuesta muestra si
// el CÓDIGO verificó su fuente (existe y contiene el fragmento citado) y si el filtro de contenido la
// marcó. El veredicto sugerido de un sobre lo calcula la regla de la prueba, nunca el modelo.
import { PRUEBAS, REGLAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { CORRIDA, ORIGENES, PROPUESTAS, TIPOS_DE_PROPUESTA, VERIFICACION_DE_FUENTE } from "../datos/gobierno.mjs";
import { ACTIVOS, archivoDePlan } from "../datos/mundo.mjs";
import { dato, enlace, estado, par, sello } from "../nucleo/componentes.mjs";
import { VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

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
  return `<p class="hg-menor" data-si-decision="aprobar" hidden>${t(aprobada)}</p>
<p class="hg-menor" data-si-decision="rechazar" hidden>${t({ es: "Rechazada. Sale de la bandeja y queda en el registro con tu motivo.", en: "Rejected. It leaves the inbox and stays in the log with your reason." })}</p>
${p.separable ? `<p class="hg-menor" data-si-decision="separar" hidden>${t({ es: "Separada. Vuelve a la bandeja como dos propuestas, una por prueba.", en: "Split. It returns to the inbox as two proposals, one per test." })}</p>` : ""}
<p class="hg-menor" data-si-decision="">${t({ es: "Sin decidir.", en: "Not decided." })}</p>`;
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

function fuentes(p) {
  if (!p.fuentes) return "";
  return p.fuentes
    .map(
      (f) =>
        `<p>${estado(VERIFICACION_DE_FUENTE[f.verificacion])} <span class="hg-menor">· ${neutro(f.nombre)}${f.donde ? ` · ${t(f.donde)}` : ""}</span></p>${
          f.detalle ? `<p class="hg-menor">${t(f.detalle)}</p>` : ""
        }`,
    )
    .join("");
}

// Sobre propuesto por el extractor: evidencia antes que sugerencia; el veredicto sale de la regla.
function sobre(p, existentes) {
  const activo = ACTIVOS[p.activo];
  const candidatas = p.candidatas.map((id) => PRUEBAS.find((x) => x.id === id));
  const principal = fichaDe(p.candidatas[0]);
  const lineas = [
    par(
      { es: "Activo y plan", en: "Asset and plan" },
      `${t(activo.nombre)} <span class="hg-menor">· ${enlace(archivoDePlan(p.activo), dato(activo.plan.id), existentes)}</span>`,
    ),
    par(
      { es: "Citas literales", en: "Literal quotes" },
      `${estado({ rol: "positivo", simbolo: "ok", nombre: { es: `${p.citas} verificadas por código`, en: `${p.citas} verified by code` } })}<p class="hg-menor">${t({
        es: "Cada campo propuesto cita el fragmento del texto del que sale. El texto pegado no se guarda: solo su huella y un extracto.",
        en: "Each proposed field quotes the fragment of the text it comes from. The pasted text is not stored: only its fingerprint and an excerpt.",
      })}</p>`,
    ),
    par(
      p.separable ? { es: "Pruebas que mezcla", en: "Tests it mixes" } : { es: "Prueba asociada", en: "Matched test" },
      `${candidatas.map((c) => `<p>${enlace(archivoDeFicha(c.id), dato(c.id), existentes)} ${t(c.nombre)}</p>`).join("")}${
        p.separable
          ? ""
          : `<p class="hg-menor">${t({ es: "Hay dos pruebas parecidas en el plan. Se propone la primera; tú eliges.", en: "There are two similar tests in the plan. The first is proposed; you choose." })}</p>`
      }`,
    ),
  ];
  if (p.conteo) {
    const regla = REGLAS[principal.regla];
    const veredicto = p.conteo.fallidas > 0 ? "fallida" : "superada";
    lineas.push(
      par(
        { es: "Veredicto sugerido", en: "Suggested verdict" },
        `${estado(VEREDICTO[veredicto])}<p class="hg-menor">${tHtml(
          { es: "Lo calculó la regla {r} con {f} fallas en {n}, no el extractor. {d}", en: "Computed by rule {r} from {f} failures in {n}, not by the extractor. {d}" },
          { r: dato(principal.regla), f: neutro(String(p.conteo.fallidas)), n: neutro(String(p.conteo.evaluadas)), d: t(regla.decide) },
        )}</p>`,
      ),
      par({ es: "Severidad", en: "Severity" }, `<p class="hg-menor">${t({ es: "Sin precargar: la decides tú al confirmar el sobre.", en: "Not prefilled: you decide it when you confirm the envelope." })}</p>`),
    );
  }
  return `<dl class="hg-ficha">\n${lineas.join("\n")}\n</dl>`;
}

function propuesta(p, existentes) {
  const marca = p.contenido === "marcada_para_revision"
    ? sello(
        MARCADA,
        `<p>${t({
          es: "El filtro encontró un patrón que pide revisión. Marca, no rechaza: para aprobarla tienes que revisarla tú, y queda registrado.",
          en: "The filter found a pattern that calls for review. It flags, it does not reject: to approve it you must review it yourself, and that is recorded.",
        })}</p>`,
      )
    : "";
  return `<li class="hg-propuesta" data-filtrable data-propuesta="${p.id}" data-origen="${p.origen}" data-decision="">
<div>
<p class="hg-menor">${dato(p.id)} · ${t(ORIGENES[p.origen])} · ${t(TIPOS_DE_PROPUESTA[p.tipo])} · ${dato(p.fecha)}</p>
<h2 class="hg-titulo-menor">${t(p.titulo)}</h2>
<p>${t(p.resumen)}</p>
${fuentes(p)}
${p.tipo === "sobre" ? sobre(p, existentes) : ""}
${marca}
</div>
<div class="hg-propuesta-decision">
${botones(p)}
${consecuencias(p)}
</div>
</li>`;
}

export function propuestas({ existentes }) {
  const total = PROPUESTAS.length;
  const cuenta = (f) => PROPUESTAS.filter(f).length;
  const sinVerificar = cuenta((p) => p.fuentes?.some((f) => f.verificacion !== "verificada"));
  const marcadas = cuenta((p) => p.contenido === "marcada_para_revision");

  const origenes = [{ valor: "", nombre: { es: "Todas", en: "All" } }, ...Object.entries(ORIGENES).map(([valor, nombre]) => ({ valor, nombre }))]
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton" data-controlador="filtro" data-campo="origen" data-valor="${valor}" aria-pressed="${valor === ""}">${t(nombre)}</button>`,
    )
    .join("");

  const contenido = `<div class="hg-encabezado">
<div>
<h1>${t({ es: "Bandeja de propuestas", en: "Proposal inbox" })}</h1>
<p class="hg-entrada">${t({
    es: "La inteligencia artificial propone y tú apruebas. Nada de lo que hay aquí está en el catálogo ni cuenta como evidencia hasta que lo decidas.",
    en: "The AI proposes and you approve. Nothing here is in the catalog or counts as evidence until you decide.",
  })}</p>
</div>
</div>

<div data-si="datos">
<ul class="hg-cifras" ${atributo("aria-label", { es: "Resumen de la bandeja", en: "Inbox summary" })}>
<li><span class="hg-cifra" data-neutro data-cuenta-pendientes>${total}</span><span>${t({ es: "por decidir", en: "to decide" })}</span></li>
<li><span class="hg-cifra" data-neutro>${sinVerificar}</span>${estado({ ...VERIFICACION_DE_FUENTE.sin_fragmento, nombre: { es: "con fuente sin verificar", en: "with an unverified source" } })}</li>
<li><span class="hg-cifra" data-neutro>${marcadas}</span>${estado({ ...MARCADA, nombre: { es: "marcada por el filtro", en: "flagged by the filter" } })}</li>
</ul>

<div class="hg-filtros">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Quién propone", en: "Who proposes" })}>${origenes}</div>
<div class="hg-pie-de-filtros">
<p class="hg-menor">${tHtml({ es: `Se muestran {n} de ${total} propuestas`, en: `Showing {n} of ${total} proposals` }, { n: `<span data-cuenta-filtrada data-neutro>${total}</span>` })}</p>
</div>
</div>

<ul class="hg-propuestas">
${PROPUESTAS.map((p) => propuesta(p, existentes)).join("\n")}
</ul>

<section class="hg-seccion" aria-labelledby="corrida">
<h2 id="corrida">${t({ es: "Última corrida del investigador", en: "The researcher's last run" })}</h2>
<p class="hg-intro">${t({
    es: "Cada corrida queda registrada con lo que consultó y lo que no pudo consultar. Lo que no pudo leer no lo inventa ni lo fuerza: te lo pide.",
    en: "Each run is logged with what it consulted and what it could not. What it could not read it neither invents nor forces: it asks you for it.",
  })}</p>
<dl class="hg-ficha">
${par({ es: "Corrida", en: "Run" }, `${dato(CORRIDA.id)} <span class="hg-menor">· ${dato(CORRIDA.fecha)}</span>`)}
${par({ es: "Qué revisó", en: "What it covered" }, `<p>${t(CORRIDA.alcance)}</p>`)}
${par({ es: "Fuentes consultadas", en: "Sources consulted" }, neutro(String(CORRIDA.consultadas)))}
${par(
  { es: "No pudo leer", en: "Could not read" },
  `${CORRIDA.no_accesibles.map((f) => `<p>${neutro(f.nombre)} <span class="hg-menor">· ${t(f.razon)}</span></p>`).join("")}<p class="hg-menor">${t({
    es: "Adjunta o pega el documento y se procesa como cualquier otra fuente.",
    en: "Attach or paste the document and it is processed like any other source.",
  })}</p>`,
)}
${par({ es: "Contradicciones", en: "Contradictions" }, CORRIDA.contradicciones.map((c) => `<p>${t(c)}</p>`).join(""))}
</dl>
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "La bandeja está vacía", en: "The inbox is empty" })}</h2>
<p>${t({
    es: "No hay nada por decidir. Pide al investigador que revise una familia o un marco, o pega el resultado de una herramienta en la carga de evidencia.",
    en: "There is nothing to decide. Ask the researcher to check a family or a framework, or paste a tool's result into evidence intake.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Verificando las fuentes", en: "Verifying sources" })}</h2>
<p class="hg-menor">${t({ es: "Antes de mostrar una propuesta, el código comprueba que su fuente existe y que dice lo que se cita.", en: "Before a proposal is shown, code checks that its source exists and says what is quoted." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "Una propuesta no se pudo leer", en: "A proposal could not be read" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "1 propuesta no cumple su esquema", en: "1 proposal does not match its schema" } },
  `<p>${tHtml(
    {
      es: "El archivo {a} no trae el resultado esperado. Una propuesta incompleta no se muestra para aprobar: se reintentó dos veces y se reporta aquí. Las demás siguen en la bandeja.",
      en: "File {a} has no expected result. An incomplete proposal is not shown for approval: it was retried twice and is reported here. The others stay in the inbox.",
    },
    { a: dato("propuestas/PROP-0038.json") },
  )}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · propuestas", en: "HackGuard · proposals" },
    seccion: { id: "catalogo", archivo: "propuestas.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 3. La bandeja de propuestas. Los botones funcionan en la maqueta, pero no guardan nada.",
        en: "Review 3. The proposal inbox. The buttons work in the mockup, but they save nothing.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Cada propuesta", en: "Each proposal" },
        hacer: { es: "Mira la línea de la fuente", en: "Look at the source line" },
        ver: { es: "Se distingue la fuente verificada de la que no lo está, y la que no lo está sigue ahí, marcada", en: "A verified source is told apart from an unverified one, and the unverified one is still there, flagged" },
      },
      {
        donde: { es: "Propuesta marcada por el filtro", en: "Proposal flagged by the filter" },
        hacer: { es: "Lee el sello y el botón de aprobar", en: "Read the seal and the approve button" },
        ver: { es: "Aprobarla exige decir que la revisaste; el filtro no la rechazó", en: "Approving it requires stating that you reviewed it; the filter did not reject it" },
      },
      {
        donde: { es: "Sobre propuesto por el extractor", en: "Envelope proposed by the extractor" },
        hacer: { es: "Lee «Veredicto sugerido»", en: "Read “Suggested verdict”" },
        ver: { es: "Dice que lo calculó la regla, con sus cifras, y que la severidad no viene puesta", en: "It says the rule computed it, with its figures, and that severity is not prefilled" },
      },
      {
        donde: { es: "Botones de una propuesta", en: "A proposal's buttons" },
        hacer: { es: "Pulsa «Aprobar» y luego «Rechazar»", en: "Press “Approve” and then “Reject”" },
        ver: { es: "Debajo se lee qué pasa con cada decisión, y baja la cifra «por decidir»", en: "Below it says what each decision does, and the “to decide” figure goes down" },
      },
    ],
  });
}
