// evidencia.html — pantalla 9 (C11, C14). Carga y confirmación: las tres vías por las que entra un
// resultado (archivo de herramienta con adaptador, texto pegado, sobre manual) y la confirmación por lote
// con TODAS las fallas a la vista y la muestra del resto. Nada cuenta hasta que una persona confirma. El
// veredicto sugerido lo calcula la regla de cada prueba; el archivo crudo no se guarda, solo su huella.
import { HERRAMIENTAS, PRUEBAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { ACTIVOS, LOTES, MUESTREO, PRIORIDAD, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { huellaDe, planDe } from "../nucleo/calculos.mjs";
import { dato, enlace, estado, huella, libro, par, sello } from "../nucleo/componentes.mjs";
import { VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, esc, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const OBLIGATORIA = { rol: "falla", simbolo: "falla", nombre: { es: "Se revisa siempre", en: "Always reviewed" } };
const EN_MUESTRA = { rol: "acento", simbolo: "firma", nombre: { es: "En la muestra", en: "In the sample" } };
const VIAS = [
  { valor: "adaptador", nombre: { es: "Archivo de herramienta", en: "Tool file" } },
  { valor: "pegado", nombre: { es: "Texto pegado", en: "Pasted text" } },
  { valor: "manual", nombre: { es: "Sobre manual", en: "Manual envelope" } },
];

/** Veredicto que la REGLA de la prueba sugiere para lo que el adaptador leyó. */
function sugerido(sobre) {
  const ficha = fichaDe(sobre.prueba);
  if (ficha.regla === "alertas-zap/v1") {
    if (sobre.alertas > 0) return "fallida";
    return sobre.corrio ? "superada" : "no_ejecutada";
  }
  return sobre.fallidas > 0 ? "fallida" : "superada";
}

const conteoDe = (sobre) =>
  sobre.razon ??
  (sobre.fallidas > 0
    ? { es: `${sobre.fallidas} de ${sobre.evaluadas} salidas fallaron`, en: `${sobre.fallidas} of ${sobre.evaluadas} outputs failed` }
    : { es: `0 de ${sobre.evaluadas} salidas fallaron`, en: `0 of ${sobre.evaluadas} outputs failed` });

/** Cuántos sobres «no fallidos» pide revisar el plan de muestreo para un lote de ese tamaño. */
function muestraPara(tamano) {
  const tramo = MUESTREO.find((m) => m.hasta === null || tamano <= m.hasta);
  return tramo.muestra === null ? tamano : Math.min(tamano, tramo.muestra);
}

function lote(l, existentes) {
  const h = HERRAMIENTAS[l.herramienta];
  const sobres = l.sobres.map((s) => ({ ...s, veredicto: sugerido(s), ficha: fichaDe(s.prueba) }));
  const obligatorias = sobres.filter((s) => s.veredicto === "fallida" || s.veredicto === "parcial");
  const resto = sobres.length - obligatorias.length;
  const huellaDelArchivo = huellaDe({ archivo: l.archivo, fecha: l.fecha, hora: l.hora });
  const huellaDelLote = huellaDe({ lote: l.id, sobres: l.sobres.map((s) => s.id).join(",") });

  const filas = sobres.map((s) => {
    const revisa = s.veredicto === "fallida" || s.veredicto === "parcial" ? OBLIGATORIA : EN_MUESTRA;
    const nota = s.hallazgo_abierto
      ? `<p class="hg-menor">${tHtml(
          { es: "Coincide con el hallazgo abierto {h}: no abre uno nuevo.", en: "It matches the open finding {h}: it does not open a new one." },
          { h: enlace(archivoDeHallazgo(s.hallazgo_abierto), dato(s.hallazgo_abierto), existentes) },
        )}</p>`
      : s.reprueba_de
        ? `<p class="hg-menor">${tHtml(
            { es: "Es la re-prueba de {h}: al confirmarla, el hallazgo se cierra.", en: "It is the retest of {h}: once confirmed, the finding closes." },
            { h: enlace(archivoDeHallazgo(s.reprueba_de), dato(s.reprueba_de), existentes) },
          )}</p>`
        : s.veredicto === "fallida"
          ? `<p class="hg-menor">${t({ es: "Al confirmarlo se abre un hallazgo.", en: "Confirming it opens a finding." })}</p>`
          : "";
    return [
      `<p>${dato(s.id)}</p>`,
      `<p>${enlace(archivoDeFicha(s.prueba), t(s.ficha.nombre), existentes)}</p><p class="hg-menor">${dato(s.prueba)}${s.ficha.selector ? ` · ${dato(s.ficha.selector)}` : ""}</p>`,
      `<p>${estado(VEREDICTO[s.veredicto])}</p><p class="hg-menor">${t(conteoDe(s))}</p><p class="hg-menor">${t({ es: "Regla", en: "Rule" })} ${dato(s.ficha.regla)}</p>${nota}`,
      `<p>${estado(revisa)}</p>`,
      `<p class="hg-menor">${t({ es: "Sobre", en: "Envelope" })}</p><p>${huella(huellaDe({ sobre: s.id, prueba: s.prueba, lote: l.id }))}</p><p class="hg-menor">${t({ es: "Resultado", en: "Result" })}</p><p>${huella(
        huellaDe({ prueba: s.prueba, veredicto: s.veredicto, evaluadas: s.evaluadas ?? 0, fallidas: s.fallidas ?? s.alertas ?? 0 }),
      )}</p>`,
    ];
  });

  const abre = sobres.filter((s) => s.veredicto === "fallida" && !s.hallazgo_abierto).length;
  const rotulo = { es: `Decisión sobre ${l.id}`, en: `Decision on ${l.id}` };

  return `<li class="hg-propuesta hg-lote" data-propuesta="${l.id}" data-decision="" data-lote="${l.id}" data-sobres="${sobres.length}" data-obligatorias="${obligatorias.length}">
<div>
<p class="hg-menor">${dato(l.id)} · ${neutro(h.nombre)} ${dato(l.version)} · ${dato(`${l.fecha} ${l.hora}`)} ${dato(l.zona)}</p>
<h2 class="hg-titulo-menor">${tHtml({ es: "{n} sobres propuestos para {a}", en: "{n} envelopes proposed for {a}" }, { n: neutro(String(sobres.length)), a: t(ACTIVOS[l.activo].nombre) })}</h2>
<dl class="hg-ficha">
${par({ es: "Archivo", en: "File" }, `${dato(l.archivo)}<p>${huella(huellaDelArchivo)}</p><p class="hg-menor">${t({
    es: "El archivo se leyó en tu equipo y no se guarda: quedan su huella y un extracto por sobre.",
    en: "The file was read on your machine and is not stored: its fingerprint and an excerpt per envelope remain.",
  })}</p>`)}
${par({ es: "Adaptador", en: "Adapter" }, dato(l.adaptador))}
${par({ es: "Ejecutado por", en: "Run by" }, t(l.ejecutado_por))}
${par({ es: "Huella del lote", en: "Batch fingerprint" }, `${huella(huellaDelLote)}<p class="hg-menor">${t({ es: "La muestra se elige con esta huella: el mismo lote da siempre la misma muestra.", en: "The sample is picked with this fingerprint: the same batch always gives the same sample." })}</p>`)}
${par({ es: "Advertencias", en: "Warnings" }, l.advertencias.map((a) => `<p>${estado({ rol: "atencion", simbolo: "aviso", nombre: a })}</p>`).join(""))}
</dl>
</div>
<div class="hg-propuesta-decision">
<div class="hg-grupo" role="group" ${atributo("aria-label", rotulo)}>
<button type="button" class="hg-boton" data-controlador="decidir" data-valor="aprobar" aria-pressed="false">${t({ es: "Confirmar el lote", en: "Confirm the batch" })}</button>
<button type="button" class="hg-boton" data-controlador="decidir" data-valor="separar" aria-pressed="false">${t({ es: "Revisar uno por uno", en: "Review one by one" })}</button>
</div>
<p class="hg-menor" data-si-decision="aprobar" hidden>${tHtml(
    {
      es: abre === 1 ? "Confirmado con tu firma. Los {n} sobres cuentan desde ahora y ya no se editan: una corrección crea un sobre nuevo. Se abre {h} hallazgo." : "Confirmado con tu firma. Los {n} sobres cuentan desde ahora y ya no se editan: una corrección crea un sobre nuevo. Se abren {h} hallazgos.",
      en: abre === 1 ? "Confirmed with your signature. All {n} envelopes count from now on and can no longer be edited: a correction creates a new envelope. {h} finding is opened." : "Confirmed with your signature. All {n} envelopes count from now on and can no longer be edited: a correction creates a new envelope. {h} findings are opened.",
    },
    { n: neutro(String(sobres.length)), h: neutro(String(abre)) },
  )}</p>
<p class="hg-menor" data-si-decision="separar" hidden>${t({ es: "El lote pasa a revisión individual: cada sobre se confirma por separado.", en: "The batch moves to individual review: each envelope is confirmed separately." })}</p>
<p class="hg-menor" data-si-decision="">${tHtml(
    {
      es: "Sin confirmar: todavía no cuenta. Revisa todas las fallidas ({f}) y la muestra de {m} entre los otros {r} sobres. Un solo error en la muestra manda el lote entero a revisión individual.",
      en: "Not confirmed: it does not count yet. Review every failed one ({f}) and the sample of {m} among the other {r} envelopes. A single error in the sample sends the whole batch to individual review.",
    },
    { f: neutro(String(obligatorias.length)), m: neutro(String(muestraPara(resto))), r: neutro(String(resto)) },
  )}</p>
</div>
<div class="hg-lote-sobres">
${libro(
  [
    { es: "Sobre", en: "Envelope" },
    { es: "Prueba", en: "Test" },
    { es: "Veredicto sugerido", en: "Suggested verdict" },
    { es: "Revisión", en: "Review" },
    { es: "Huellas", en: "Fingerprints" },
  ],
  filas,
  { atributos: (i) => `data-sobre="${sobres[i].id}" data-veredicto="${sobres[i].veredicto}" data-revision="${sobres[i].veredicto === "fallida" || sobres[i].veredicto === "parcial" ? "obligatoria" : "muestra"}"` },
)}
</div>
</li>`;
}

// Un <option> no admite marcado: lleva sus dos textos en data-es / data-en (assets/maqueta.js pone el activo).
const opcion = (valor, texto) =>
  typeof texto === "string"
    ? `<option value="${esc(valor)}" data-neutro>${esc(texto)}</option>`
    : `<option value="${esc(valor)}" data-es="${esc(texto.es)}" data-en="${esc(texto.en)}">${esc(texto.es)}</option>`;

function campo(id, rotulo, control, { obligatorio = true, ayuda } = {}) {
  return `<div class="hg-campo hg-campo-de-formulario"${obligatorio ? " data-obligatorio" : ""} data-lleno="false">
<label for="${id}">${t(rotulo)}${obligatorio ? "" : ` <span class="hg-menor">${t({ es: "(opcional)", en: "(optional)" })}</span>`}</label>
${control}
${ayuda ? `<p class="hg-menor">${t(ayuda)}</p>` : ""}
</div>`;
}

export function evidencia({ existentes }) {
  const activo = "ACT-DEMO-ASISTENTE";
  const a = ACTIVOS[activo];
  const plan = planDe(a, PRUEBAS.map((p) => fichaDe(p.id)), PRIORIDAD);
  const totalDeSobres = LOTES.reduce((n, l) => n + l.sobres.length, 0);

  const vias = VIAS.map(
    ({ valor, nombre }) => `<button type="button" class="hg-boton" data-controlador="pestana" data-valor="${valor}" aria-pressed="${valor === "adaptador"}">${t(nombre)}</button>`,
  ).join("");

  const muestreo = MUESTREO.map((m, i) => {
    const desde = i === 0 ? 1 : MUESTREO[i - 1].hasta + 1;
    const tamano = m.hasta === null ? { es: `${desde} o más`, en: `${desde} or more` } : { es: `De ${desde} a ${m.hasta}`, en: `${desde} to ${m.hasta}` };
    return `<li>${t(tamano)}: ${m.muestra === null ? t({ es: "se revisan todos", en: "all are reviewed" }) : tHtml({ es: "se revisan {n}", en: "{n} are reviewed" }, { n: neutro(String(m.muestra)) })}</li>`;
  }).join("");

  const pruebasDelPlan = plan.planeadas.map(({ ficha }) => opcion(ficha.id, `${ficha.id}`)).join("");
  const veredictos = Object.entries(VEREDICTO).map(([valor, v]) => opcion(valor, v.nombre)).join("");
  const elige = opcion("", { es: "Elige…", en: "Choose…" });

  const contenido = `<div class="hg-encabezado">
<div>
<h1>${t({ es: "Carga de evidencia", en: "Evidence intake" })}</h1>
<p class="hg-entrada">${t({
    es: "HackGuard no ejecuta pruebas: recibe lo que tus herramientas produjeron. Un resultado no cuenta hasta que una persona lo confirma.",
    en: "HackGuard does not run tests: it receives what your tools produced. A result does not count until a person confirms it.",
  })}</p>
</div>
<dl class="hg-ficha" data-si="datos">
${par({ es: "Activo", en: "Asset" }, t(a.nombre))}
${par({ es: "Plan", en: "Plan" }, enlace(archivoDePlan(activo), dato(a.plan.id), existentes))}
</dl>
</div>

<div data-si="datos" data-pestanas data-via="adaptador">
<div class="hg-filtros">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Vía de carga", en: "Intake route" })}>${vias}</div>
</div>

<div data-si-via="adaptador">
<ul class="hg-cifras" ${atributo("aria-label", { es: "Resumen de lo cargado", en: "Summary of what was loaded" })}>
<li><span class="hg-cifra" data-neutro data-cuenta-pendientes>${LOTES.length}</span><span>${t({ es: "lotes por confirmar", en: "batches to confirm" })}</span></li>
<li><span class="hg-cifra" data-neutro>${totalDeSobres}</span><span>${t({ es: "sobres propuestos", en: "proposed envelopes" })}</span></li>
<li><span class="hg-cifra" data-neutro>${LOTES.flatMap((l) => l.sobres).filter((s) => sugerido(s) === "fallida").length}</span>${estado({ ...VEREDICTO.fallida, nombre: { es: "fallidas, a la vista", en: "failed, in plain view" } })}</li>
<li><span class="hg-cifra" data-neutro>${LOTES.flatMap((l) => l.sobres).filter((s) => sugerido(s) === "no_ejecutada").length}</span>${estado({ ...VEREDICTO.no_ejecutada, nombre: { es: "no ejecutada", en: "not run" } })}</li>
</ul>
<p class="hg-intro">${t({
    es: "Elige el archivo que produjo la herramienta. El adaptador lo lee en tu equipo, arma un sobre por cada prueba del plan y sugiere el veredicto con la regla de esa prueba.",
    en: "Choose the file the tool produced. The adapter reads it on your machine, builds one envelope per test in the plan and suggests the verdict with that test's rule.",
  })}</p>
<ul class="hg-propuestas">
${LOTES.map((l) => lote(l, existentes)).join("\n")}
</ul>

<section class="hg-seccion" aria-labelledby="muestra">
<h2 id="muestra">${t({ es: "Cómo se elige la muestra", en: "How the sample is chosen" })}</h2>
<p class="hg-intro">${t({
    es: "Las fallidas y las parciales se revisan siempre, todas. De las demás se revisa una muestra cuyo tamaño depende del lote; con un lote pequeño, la muestra es el lote entero.",
    en: "Failed and partial ones are always reviewed, all of them. Of the rest a sample is reviewed, sized by the batch; with a small batch, the sample is the whole batch.",
  })}</p>
<ul class="hg-lista">${muestreo}</ul>
<p class="hg-menor">${t({ es: "Tamaños ilustrativos: el plan de muestreo vive en datos y se fija en el sprint del libro de evidencia.", en: "Illustrative sizes: the sampling plan lives in data and is set in the evidence ledger's sprint." })}</p>
</section>
</div>

<div data-si-via="pegado">
<p class="hg-intro">${t({
    es: "Pega lo que te devolvió la herramienta. El extractor propone un sobre y lo deja en la bandeja; el veredicto lo calcula la regla de la prueba y lo confirmas tú.",
    en: "Paste what the tool returned. The extractor proposes an envelope and leaves it in the inbox; the verdict is computed by the test's rule and you confirm it.",
  })}</p>
<div class="hg-formulario" data-formulario>
${campo("pegado-texto", { es: "Texto de la herramienta", en: "Tool output" }, `<textarea id="pegado-texto" rows="6" data-controlador="campo"></textarea>`, {
  ayuda: { es: "Se muestra siempre como texto, nunca se ejecuta. No se guarda entero: solo su huella y un extracto.", en: "It is always shown as text, never executed. It is not stored whole: only its fingerprint and an excerpt." },
})}
<p class="hg-menor">${tHtml({ es: "Campos obligatorios por llenar: {n}", en: "Required fields left: {n}" }, { n: `<span data-faltan data-neutro>1</span>` })}</p>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Proponer un sobre", en: "Propose an envelope" })}</button>
<div class="hg-revelado">
<p data-si-completo="false">${estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Falta el texto", en: "The text is missing" } })}</p>
<p data-si-completo="true">${tHtml(
    { es: "El extractor dejó una propuesta en {b}. Todavía no cuenta: se confirma allí, una por una.", en: "The extractor left a proposal in {b}. It does not count yet: it is confirmed there, one by one." },
    { b: enlace("propuestas.html", t({ es: "la bandeja", en: "the inbox" }), existentes) },
  )}</p>
</div>
</div>
</div>

<div data-si-via="manual">
<p class="hg-intro">${t({
    es: "Para una prueba sin herramienta o una revisión hecha a mano. El sobre mínimo es obligatorio: sin él no hay evidencia.",
    en: "For a test with no tool or a review done by hand. The minimum envelope is required: without it there is no evidence.",
  })}</p>
<div class="hg-formulario" data-formulario>
${campo("manual-prueba", { es: "Prueba del plan", en: "Test in the plan" }, `<select id="manual-prueba" data-controlador="campo">${elige}${pruebasDelPlan}</select>`)}
${campo("manual-veredicto", { es: "Veredicto", en: "Verdict" }, `<select id="manual-veredicto" data-controlador="campo">${elige}${veredictos}</select>`, {
  ayuda: { es: "«No ejecutada» no es «superada»: si no corrió, dilo.", en: "“Not run” is not “passed”: if it did not run, say so." },
})}
${campo("manual-fecha", { es: "Fecha de ejecución", en: "Run date" }, `<input id="manual-fecha" type="date" data-controlador="campo">`)}
${campo("manual-herramienta", { es: "Herramienta y versión", en: "Tool and version" }, `<input id="manual-herramienta" type="text" autocomplete="off" data-controlador="campo">`)}
${campo("manual-resumen", { es: "Qué se obtuvo, en una o dos frases", en: "What was obtained, in one or two sentences" }, `<textarea id="manual-resumen" rows="3" data-controlador="campo"></textarea>`)}
${campo("manual-desviacion", { es: "Diferencia con lo esperado", en: "Difference from the expected result" }, `<textarea id="manual-desviacion" rows="2" data-controlador="campo"></textarea>`, { obligatorio: false })}
<p class="hg-menor">${tHtml({ es: "Campos obligatorios por llenar: {n}", en: "Required fields left: {n}" }, { n: `<span data-faltan data-neutro>5</span>` })}</p>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Guardar el sobre", en: "Save the envelope" })}</button>
<div class="hg-revelado">
<p data-si-completo="false">${estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Faltan campos obligatorios", en: "Required fields are missing" } })}</p>
<p data-si-completo="true">${t({
    es: "Guardado como sobre por confirmar. Los sobres manuales se confirman uno por uno; al confirmarlo queda inmutable.",
    en: "Saved as an envelope to confirm. Manual envelopes are confirmed one by one; once confirmed it is immutable.",
  })}</p>
</div>
</div>
</div>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "No hay nada por confirmar", en: "Nothing to confirm" })}</h2>
<p>${t({
    es: "Corre las pruebas del plan con tus herramientas y trae aquí el resultado: el archivo de la herramienta, el texto que devolvió o un sobre hecho a mano.",
    en: "Run the plan's tests with your tools and bring the result here: the tool's file, the text it returned or an envelope made by hand.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Leyendo el archivo en tu equipo", en: "Reading the file on your machine" })}</h2>
<p class="hg-menor">${t({ es: "Nada sale de tu equipo. Se calcula su huella y se arma un sobre por cada prueba del plan.", en: "Nothing leaves your machine. Its fingerprint is computed and one envelope is built per test in the plan." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "El archivo no se pudo cargar", en: "The file could not be loaded" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "Versión de la herramienta fuera del rango probado", en: "Tool version outside the tested range" } },
  `<p>${tHtml(
    {
      es: "El archivo es de garak {v} y el adaptador solo se probó desde la {m}. No se arma ningún sobre con un formato que nadie verificó: actualiza la herramienta o carga el resultado como texto pegado.",
      en: "The file comes from garak {v} and the adapter was only tested from {m} on. No envelope is built from a format nobody verified: update the tool or load the result as pasted text.",
    },
    { v: dato("0.9.0"), m: dato(HERRAMIENTAS.garak.version_minima) },
  )}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · carga de evidencia", en: "HackGuard · evidence intake" },
    seccion: { id: "evidencia", archivo: "evidencia.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 4. Carga y confirmación. Los botones y los campos funcionan en la maqueta, pero no guardan nada.",
        en: "Review 4. Intake and confirmation. Buttons and fields work in the mockup, but they save nothing.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Los dos lotes", en: "The two batches" },
        hacer: { es: "Lee la columna «Veredicto sugerido»", en: "Read the “Suggested verdict” column" },
        ver: { es: "Fallida, superada y «no ejecutada» se distinguen; la no ejecutada dice por qué no es superada", en: "Failed, passed and “not run” are told apart; the not-run one says why it is not passed" },
      },
      {
        donde: { es: "Botones de un lote", en: "A batch's buttons" },
        hacer: { es: "Pulsa «Confirmar el lote»", en: "Press “Confirm the batch”" },
        ver: { es: "Dice qué pasa al confirmar: cuentan, ya no se editan y cuántos hallazgos se abren", en: "It says what confirming does: they count, can no longer be edited, and how many findings open" },
      },
      {
        donde: { es: "Botones de vía", en: "Route buttons" },
        hacer: { es: "Pulsa «Texto pegado» y luego «Sobre manual»", en: "Press “Pasted text” and then “Manual envelope”" },
        ver: { es: "Cada vía muestra lo suyo; el formulario cuenta los campos obligatorios que faltan", en: "Each route shows its own content; the form counts the required fields left" },
      },
      {
        donde: { es: "Sobre manual", en: "Manual envelope" },
        hacer: { es: "Pulsa «Guardar el sobre» sin llenar nada", en: "Press “Save the envelope” without filling anything" },
        ver: { es: "Avisa que faltan campos; no guarda a medias", en: "It warns that fields are missing; it does not save half-done" },
      },
    ],
  });
}
