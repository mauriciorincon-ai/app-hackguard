// evidencia.html — pantalla 9 (C11, C14). Carga y confirmación: las tres vías por las que entra un
// resultado (archivo de herramienta con adaptador, texto pegado, sobre manual) y la confirmación por lote
// con TODAS las fallas a la vista y la muestra del resto. Nada cuenta hasta que una persona confirma. El
// veredicto sugerido lo calcula la regla de cada prueba; el archivo crudo no se guarda, solo su huella.
// Dirección «consola» (mirada 4-ter): las vías son pestañas; cada lote es una zona de trabajo con su
// recorrido y su tabla de sobres a la izquierda y, a la derecha, el carril: qué falta para confirmar, el
// detalle del sobre seleccionado y la ficha del lote.
import { HERRAMIENTAS, PRUEBAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { ACTIVOS, HALLAZGOS, LOTES, MUESTREO, PRIORIDAD, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { huellaDe, planDe } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, estado, huella, par, proporcion, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_HALLAZGO, VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, esc, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, paginaDeApp } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

const OBLIGATORIA = { rol: "falla", simbolo: "falla", nombre: { es: "Se revisa siempre", en: "Always reviewed" } };
const EN_MUESTRA = { rol: "acento", simbolo: "firma", nombre: { es: "En la muestra", en: "In the sample" } };
// En una celda de tabla la revisión se dice en una palabra (la columna ya se llama «Revisión»).
const OBLIGATORIA_CORTA = { ...OBLIGATORIA, nombre: { es: "Siempre", en: "Always" } };
const EN_MUESTRA_CORTA = { ...EN_MUESTRA, nombre: { es: "Muestra", en: "Sample" } };
const SIN_CONFIRMAR = { rol: "atencion", simbolo: "reloj", nombre: { es: "Sin confirmar", en: "Not confirmed" } };
const CONFIRMADO = { rol: "acento", simbolo: "firma", nombre: { es: "Confirmado por ti", en: "Confirmed by you" } };
const A_REVISION = { rol: "neutro", simbolo: "parcial", nombre: { es: "A revisión individual", en: "To individual review" } };
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

/** Lo que la pantalla necesita de cada lote: sus sobres con veredicto, nota y huellas, y sus cuentas. */
function lotes(existentes) {
  return LOTES.map((l) => {
    const sobres = l.sobres.map((s) => {
      const ficha = fichaDe(s.prueba);
      const veredicto = sugerido(s);
      const obligatoria = veredicto === "fallida" || veredicto === "parcial";
      const hallazgo = HALLAZGOS.find((h) => h.id === (s.hallazgo_abierto ?? s.reprueba_de)) ?? null;
      const nota = s.hallazgo_abierto
        ? tHtml({ es: "Coincide con el hallazgo abierto {h}: no abre uno nuevo.", en: "It matches the open finding {h}: it does not open a new one." }, { h: enlace(archivoDeHallazgo(s.hallazgo_abierto), dato(s.hallazgo_abierto), existentes) })
        : s.reprueba_de
          ? tHtml({ es: "Es la re-prueba de {h}: al confirmarla, el hallazgo se cierra.", en: "It is the retest of {h}: once confirmed, the finding closes." }, { h: enlace(archivoDeHallazgo(s.reprueba_de), dato(s.reprueba_de), existentes) })
          : veredicto === "fallida"
            ? t({ es: "Al confirmarlo se abre un hallazgo.", en: "Confirming it opens a finding." })
            : veredicto === "no_ejecutada"
              ? t({ es: "No cuenta como superada: falta la constancia de que corrió.", en: "It does not count as passed: proof that it ran is missing." })
              : "";
      return {
        ...s, ficha, veredicto, obligatoria, hallazgo, nota,
        huellaSobre: huellaDe({ sobre: s.id, prueba: s.prueba, lote: l.id }),
        huellaResultado: huellaDe({ prueba: s.prueba, veredicto, evaluadas: s.evaluadas ?? 0, fallidas: s.fallidas ?? s.alertas ?? 0 }),
      };
    });
    const obligatorias = sobres.filter((s) => s.obligatoria).length;
    const resto = sobres.length - obligatorias;
    const cuenta = (v) => sobres.filter((s) => s.veredicto === v).length;
    return {
      ...l, sobres, obligatorias, resto,
      muestra: muestraPara(resto),
      abre: sobres.filter((s) => s.veredicto === "fallida" && !s.hallazgo_abierto).length,
      reparto: ["fallida", "no_ejecutada", "superada"].map((v) => ({ veredicto: v, n: cuenta(v) })).filter((x) => x.n > 0),
      nombreDeHerramienta: HERRAMIENTAS[l.herramienta].nombre,
      huellaDelArchivo: huellaDe({ archivo: l.archivo, fecha: l.fecha, hora: l.hora }),
      huellaDelLote: huellaDe({ lote: l.id, sobres: l.sobres.map((s) => s.id).join(",") }),
      seleccionado: (sobres.find((s) => s.obligatoria) ?? sobres[0]).id,
    };
  });
}

const resultado = (s) => `${s.evaluadas ? proporcion(s.fallidas, s.evaluadas) : ""}<p class="hg-menor">${t(conteoDe(s))}</p>`;

const paso = ({ rol, simbolo }, titulo, detalle) =>
  `<li class="hg-eslabon es-${rol}">${SIMBOLO[simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span><span class="hg-menor">${t(detalle)}</span></li>`;

/** Detalle del sobre seleccionado: lo que no cabe en su fila. */
function fichaDelSobre(s, existentes) {
  const h = s.hallazgo;
  return `<p class="hg-tarjeta-nombre">${enlace(archivoDeFicha(s.prueba), t(s.ficha.nombre), existentes)}</p>
<p class="hg-chips">${chip(VEREDICTO[s.veredicto])}${chip(s.obligatoria ? OBLIGATORIA : EN_MUESTRA)}</p>
${s.nota ? `<p class="hg-menor">${s.nota}</p>` : ""}
${h ? `<div class="hg-vinculo"><p>${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)} ${chip(ESTADO_DE_HALLAZGO[h.estado])}</p><p class="hg-menor">${t(h.titulo)}</p></div>` : ""}
<dl class="hg-propiedades">
${par({ es: "Sobre y prueba", en: "Envelope and test" }, `<span>${dato(s.id)} · ${dato(s.prueba)}</span>`)}
${par({ es: "Regla de veredicto", en: "Verdict rule" }, `${dato(s.ficha.regla)}<span class="hg-menor">${t({ es: "El veredicto lo calcula la regla, no la herramienta.", en: "The verdict is computed by the rule, not the tool." })}</span>`)}
${s.ficha.selector ? par({ es: "Selector", en: "Selector" }, dato(s.ficha.selector)) : ""}
${par({ es: "Huella del sobre", en: "Envelope fingerprint" }, huella(s.huellaSobre))}
${par({ es: "Huella del resultado", en: "Result fingerprint" }, huella(s.huellaResultado))}
</dl>`;
}

function zonaDeLote(l, primero, existentes) {
  const filas = l.sobres
    .map((s) => {
      const elegido = s.id === l.seleccionado;
      return `<tr data-fila data-seleccionada="${elegido}" data-sobre="${s.id}" data-veredicto="${s.veredicto}" data-revision="${s.obligatoria ? "obligatoria" : "muestra"}">
<td data-celda="id"><button type="button" class="hg-fila-boton" data-controlador="seleccionar" data-valor="${s.id}" aria-pressed="${elegido}" ${atributo("aria-label", { es: `Ver el detalle de ${s.id}`, en: `Show details of ${s.id}` })}>${dato(s.id)}</button></td>
<td><p><strong>${t(s.ficha.nombre)}</strong></p><p>${dato(s.prueba)}</p></td>
<td data-celda="estado">${chip(VEREDICTO[s.veredicto])}</td>
<td data-celda="resultado">${resultado(s)}</td>
<td>${chip(s.obligatoria ? OBLIGATORIA_CORTA : EN_MUESTRA_CORTA)}</td>
</tr>`;
    })
    .join("\n");

  return `<div class="hg-trabajo" data-si-via="${l.id}" data-propuesta="${l.id}" data-decision="" data-lote="${l.id}" data-sobres="${l.sobres.length}" data-obligatorias="${l.obligatorias}" data-seleccion="${l.seleccionado}"${primero ? "" : " hidden"}>
<div class="hg-pila">
<section class="hg-panel" ${atributo("aria-label", { es: `Lote ${l.id}`, en: `Batch ${l.id}` })}>
<div class="hg-panel-cab">
<div class="hg-panel-linea"><h2 data-neutro>${l.id}</h2><span class="hg-menor">${neutro(`${l.nombreDeHerramienta} ${l.version}`)} · ${dato(`${l.fecha} ${l.hora}`)}</span><span data-si-decision="">${chip(SIN_CONFIRMAR)}</span><span data-si-decision="aprobar" hidden>${chip(CONFIRMADO)}</span><span data-si-decision="separar" hidden>${chip(A_REVISION)}</span></div>
<ul class="hg-chips">${l.reparto.map((r) => `<li>${chip({ ...VEREDICTO[r.veredicto], nombre: { es: `${r.n} ${VEREDICTO[r.veredicto].nombre.es.toLowerCase()}`, en: `${r.n} ${VEREDICTO[r.veredicto].nombre.en.toLowerCase()}` } })}</li>`).join("")}</ul>
</div>
<ol class="hg-cadena hg-cadena-horizontal" ${atributo("aria-label", { es: "Recorrido del lote", en: "Batch progress" })}>
${paso({ rol: "positivo", simbolo: "ok" }, { es: "Archivo leído", en: "File read" }, { es: "En tu equipo. No se guarda.", en: "On your machine. Not stored." })}
${paso({ rol: "positivo", simbolo: "ok" }, { es: "Veredictos sugeridos", en: "Verdicts suggested" }, { es: "Los calculó la regla de cada prueba.", en: "Computed by each test's rule." })}
<li class="hg-eslabon es-acento"><span class="hg-eslabon-marca"><span data-si-decision="">${SIMBOLO.reloj}</span><span data-si-decision="aprobar" hidden>${SIMBOLO.firma}</span><span data-si-decision="separar" hidden>${SIMBOLO.parcial}</span></span><span class="hg-eslabon-titulo"><span data-si-decision="">${t({ es: "Tu revisión", en: "Your review" })}</span><span data-si-decision="aprobar" hidden>${t(CONFIRMADO.nombre)}</span><span data-si-decision="separar" hidden>${t(A_REVISION.nombre)}</span></span><span class="hg-menor"><span data-si-decision="">${t({ es: "Hasta aquí, nada cuenta.", en: "Until here, nothing counts." })}</span><span data-si-decision="aprobar" hidden>${t({ es: "Los sobres cuentan desde ahora.", en: "The envelopes count from now on." })}</span><span data-si-decision="separar" hidden>${t({ es: "Cada sobre se confirma por separado.", en: "Each envelope is confirmed separately." })}</span></span></li>
</ol>
${l.advertencias.length ? `<div class="hg-panel-cuerpo">${l.advertencias.map((a) => `<div class="hg-sello hg-sello-menor es-atencion">${SIMBOLO.aviso}<div><p>${t(a)}</p></div></div>`).join("")}</div>` : ""}
<table class="hg-tabla">
<caption class="hg-oculto">${tHtml({ es: "Sobres del lote {l}", en: "Envelopes in batch {l}" }, { l: neutro(l.id) })}</caption>
<thead><tr><th scope="col">${t({ es: "Sobre", en: "Envelope" })}</th><th scope="col">${t({ es: "Prueba", en: "Test" })}</th><th scope="col">${t({ es: "Veredicto sugerido", en: "Suggested verdict" })}</th><th scope="col">${t({ es: "Resultado", en: "Result" })}</th><th scope="col">${t({ es: "Revisión", en: "Review" })}</th></tr></thead>
<tbody>
${filas}
</tbody>
</table>
<p class="hg-panel-pie">${t({ es: "La muestra se elige con la huella del lote: el mismo lote da siempre la misma muestra.", en: "The sample is picked with the batch fingerprint: the same batch always gives the same sample." })}</p>
</section>

<section class="hg-panel" ${atributo("aria-label", { es: `Ficha del lote ${l.id}`, en: `Record of batch ${l.id}` })}>
<div class="hg-panel-cab"><h2>${t({ es: "Ficha del lote", en: "Batch record" })}</h2><p class="hg-menor">${t({ es: "El archivo se leyó en tu equipo y no se guarda: quedan su huella y un extracto por sobre.", en: "The file was read on your machine and is not stored: its fingerprint and an excerpt per envelope remain." })}</p></div>
<div class="hg-panel-cuerpo">
<dl class="hg-propiedades hg-propiedades-en-columnas hg-propiedades-en-tres">
${par({ es: "Archivo", en: "File" }, `<span class="hg-dato hg-vector" data-neutro>${l.archivo.replaceAll(".", ".<wbr>")}</span>`)}
${par({ es: "Huella del archivo", en: "File fingerprint" }, huella(l.huellaDelArchivo))}
${par({ es: "Huella del lote", en: "Batch fingerprint" }, huella(l.huellaDelLote))}
${par({ es: "Adaptador", en: "Adapter" }, dato(l.adaptador))}
${par({ es: "Ejecutado por", en: "Run by" }, `<span>${t(l.ejecutado_por)}</span>`)}
${par({ es: "Cuándo", en: "When" }, `<span>${dato(`${l.fecha} ${l.hora}`)} ${dato(l.zona)}</span>`)}
</dl>
</div>
</section>
</div>

<aside class="hg-carril" ${atributo("aria-label", { es: `Confirmación y detalle de ${l.id}`, en: `Confirmation and details of ${l.id}` })}>
<section class="hg-tarjeta hg-tarjeta-accion">
<h2 class="hg-tarjeta-titulo">${t({ es: "Para confirmar", en: "To confirm" })}</h2>
<ul class="hg-pendientes">
<li class="es-falla">${SIMBOLO.falla}<span>${tHtml({ es: "Revisar las fallidas: {n}. Siempre, todas.", en: "Review the failed ones: {n}. Always, all of them." }, { n: neutro(String(l.obligatorias)) })}</span></li>
<li class="es-acento">${SIMBOLO.firma}<span>${tHtml({ es: "Revisar la muestra: {m} de los otros {r}.", en: "Review the sample: {m} of the other {r}." }, { m: neutro(String(l.muestra)), r: neutro(String(l.resto)) })}</span></li>
</ul>
<div class="hg-acciones" role="group" ${atributo("aria-label", { es: `Decisión sobre ${l.id}`, en: `Decision on ${l.id}` })}>
<button type="button" class="hg-boton hg-boton-primario" data-controlador="decidir" data-valor="aprobar" aria-pressed="false">${t({ es: "Confirmar el lote", en: "Confirm the batch" })}</button>
<button type="button" class="hg-boton" data-controlador="decidir" data-valor="separar" aria-pressed="false">${t({ es: "Revisar uno por uno", en: "Review one by one" })}</button>
</div>
<p class="hg-menor" data-si-decision="">${t({ es: "Sin confirmar: todavía no cuenta. Un solo error en la muestra manda el lote entero a revisión individual.", en: "Not confirmed: it does not count yet. A single error in the sample sends the whole batch to individual review." })}</p>
<p class="hg-consecuencia" data-si-decision="aprobar" hidden>${tHtml(
    {
      es: l.abre === 1 ? "Confirmado con tu firma. Los {n} sobres cuentan desde ahora y ya no se editan: una corrección crea un sobre nuevo. Se abre {h} hallazgo." : "Confirmado con tu firma. Los {n} sobres cuentan desde ahora y ya no se editan: una corrección crea un sobre nuevo. Se abren {h} hallazgos.",
      en: l.abre === 1 ? "Confirmed with your signature. All {n} envelopes count from now on and can no longer be edited: a correction creates a new envelope. {h} finding is opened." : "Confirmed with your signature. All {n} envelopes count from now on and can no longer be edited: a correction creates a new envelope. {h} findings are opened.",
    },
    { n: neutro(String(l.sobres.length)), h: neutro(String(l.abre)) },
  )}</p>
<p class="hg-consecuencia" data-si-decision="separar" hidden>${t({ es: "El lote pasa a revisión individual: cada sobre se confirma por separado.", en: "The batch moves to individual review: each envelope is confirmed separately." })}</p>
</section>

<section class="hg-tarjeta">
<h2 class="hg-tarjeta-titulo">${t({ es: "Sobre seleccionado", en: "Selected envelope" })}</h2>
${l.sobres.map((s) => `<div class="hg-pila" data-si-seleccion="${s.id}"${s.id === l.seleccionado ? "" : " hidden"}>\n${fichaDelSobre(s, existentes)}\n</div>`).join("\n")}
</section>

</aside>
</div>`;
}

// Un <option> no admite marcado: lleva sus dos textos en data-es / data-en (assets/maqueta.js pone el activo).
const opcion = (valor, texto) =>
  typeof texto === "string"
    ? `<option value="${esc(valor)}" data-neutro>${esc(texto)}</option>`
    : `<option value="${esc(valor)}" data-es="${esc(texto.es)}" data-en="${esc(texto.en)}">${esc(texto.es)}</option>`;

function campo(id, rotulo, control, { obligatorio = true, ayuda, ancho = false } = {}) {
  return `<div class="hg-campo${ancho ? " hg-campo-ancho" : ""}"${obligatorio ? " data-obligatorio" : ""} data-lleno="false">
<label for="${id}">${t(rotulo)}${obligatorio ? "" : ` <span class="hg-menor">${t({ es: "(opcional)", en: "(optional)" })}</span>`}</label>
${control}
${ayuda ? `<p class="hg-menor">${t(ayuda)}</p>` : ""}
</div>`;
}

export function evidencia({ consulta, existentes }) {
  const activo = "ACT-DEMO-ASISTENTE";
  const a = ACTIVOS[activo];
  const plan = planDe(a, PRUEBAS.map((p) => fichaDe(p.id)), PRIORIDAD);
  const ls = lotes(existentes);
  const todos = ls.flatMap((l) => l.sobres);
  const cuenta = (v) => todos.filter((s) => s.veredicto === v).length;

  const vias = VIAS.map(
    ({ valor, nombre }) => `<button type="button" class="hg-pestana" data-controlador="pestana" data-valor="${valor}" aria-pressed="${valor === "adaptador"}">${t(nombre)}</button>`,
  ).join("");

  const selector = ls
    .map(
      (l, i) =>
        `<button type="button" class="hg-opcion" data-controlador="pestana" data-valor="${l.id}" aria-pressed="${i === 0}"><span class="hg-opcion-titulo" data-neutro>${l.id}</span><span>${neutro(l.nombreDeHerramienta)} · ${tHtml({ es: "{n} sobres", en: "{n} envelopes" }, { n: neutro(String(l.sobres.length)) })}</span></button>`,
    )
    .join("");

  const muestreo = MUESTREO.map((m, i) => {
    const desde = i === 0 ? 1 : MUESTREO[i - 1].hasta + 1;
    const tamano = m.hasta === null ? { es: `Lote de ${desde} o más`, en: `Batch of ${desde} or more` } : { es: `Lote de ${desde} a ${m.hasta}`, en: `Batch of ${desde} to ${m.hasta}` };
    return par(tamano, `<span>${m.muestra === null ? t({ es: "Se revisan todos", en: "All are reviewed" }) : tHtml({ es: "Se revisan {n}", en: "{n} are reviewed" }, { n: neutro(String(m.muestra)) })}</span>`);
  }).join("\n");

  const pruebasDelPlan = plan.planeadas.map(({ ficha }) => opcion(ficha.id, `${ficha.id}`)).join("");
  const veredictos = Object.entries(VEREDICTO).map(([valor, v]) => opcion(valor, v.nombre)).join("");
  const elige = opcion("", { es: "Elige…", en: "Choose…" });
  const faltan = (n) => `<p class="hg-menor">${tHtml({ es: "Campos obligatorios por llenar: {n}", en: "Required fields left: {n}" }, { n: `<strong data-faltan data-neutro>${n}</strong>` })}</p>`;

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Carga de evidencia", en: "Evidence intake" })}</h1>
<p class="hg-bajada">${t({
    es: "HackGuard no ejecuta pruebas: recibe lo que tus herramientas produjeron. Un resultado no cuenta hasta que una persona lo confirma.",
    en: "HackGuard does not run tests: it receives what your tools produced. A result does not count until a person confirms it.",
  })}</p>
<p class="hg-cabecera-meta" data-si="datos"><span>${t({ es: "Activo", en: "Asset" })}: <strong>${t(a.nombre)}</strong></span><span>${t({ es: "Plan", en: "Plan" })} ${enlace(archivoDePlan(activo), dato(a.plan.id), existentes)}</span></p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Resumen de lo cargado", en: "Summary of what was loaded" })}>
<li><span class="hg-cifra" data-neutro data-cuenta-pendientes>${ls.length}</span><span>${t({ es: "lotes por confirmar", en: "batches to confirm" })}</span></li>
<li><span class="hg-cifra" data-neutro>${todos.length}</span><span>${t({ es: "sobres propuestos", en: "proposed envelopes" })}</span></li>
<li><span class="hg-cifra" data-neutro>${cuenta("fallida")}</span>${estado({ ...VEREDICTO.fallida, nombre: { es: "fallidas", en: "failed" } })}</li>
<li><span class="hg-cifra" data-neutro>${cuenta("no_ejecutada")}</span>${estado({ ...VEREDICTO.no_ejecutada, nombre: { es: "no ejecutada", en: "not run" } })}</li>
</ul>
</div>

<div class="hg-pila" data-si="datos" data-pestanas data-via="adaptador">
<div class="hg-pestanas" role="group" ${atributo("aria-label", { es: "Vía de carga", en: "Intake route" })}>${vias}</div>

<div class="hg-pila" data-si-via="adaptador">
<p class="hg-menor">${t({
    es: "Elige el archivo que produjo la herramienta. El adaptador lo lee en tu equipo, arma un sobre por cada prueba del plan y sugiere el veredicto con la regla de esa prueba.",
    en: "Choose the file the tool produced. The adapter reads it on your machine, builds one envelope per test in the plan and suggests the verdict with that test's rule.",
  })}</p>
<div class="hg-pila" data-pestanas data-via="${ls[0].id}">
<div class="hg-selector" role="group" ${atributo("aria-label", { es: "Lotes por confirmar", en: "Batches to confirm" })}>${selector}</div>
${ls.map((l, i) => zonaDeLote(l, i === 0, existentes)).join("\n")}
</div>
<section class="hg-panel" aria-labelledby="muestra">
<div class="hg-panel-cab"><h2 id="muestra">${t({ es: "Cómo se elige la muestra", en: "How the sample is chosen" })}</h2><p class="hg-menor">${t({ es: "Tamaños ilustrativos: el plan de muestreo vive en datos.", en: "Illustrative sizes: the sampling plan lives in data." })}</p></div>
<div class="hg-panel-cuerpo">
<p class="hg-menor">${t({
    es: "Las fallidas y las parciales se revisan siempre, todas. De las demás se revisa una muestra cuyo tamaño depende del lote; con un lote pequeño, la muestra es el lote entero.",
    en: "Failed and partial ones are always reviewed, all of them. Of the rest a sample is reviewed, sized by the batch; with a small batch, the sample is the whole batch.",
  })}</p>
<dl class="hg-propiedades hg-propiedades-en-columnas hg-propiedades-en-tres">
${muestreo}
</dl>
</div>
</section>
</div>

<div class="hg-trabajo" data-si-via="pegado" data-formulario hidden>
<section class="hg-panel" aria-labelledby="pegado">
<div class="hg-panel-cab"><h2 id="pegado">${t({ es: "Texto de la herramienta", en: "Tool output" })}</h2></div>
<div class="hg-panel-cuerpo">
${campo("pegado-texto", { es: "Pega aquí lo que te devolvió la herramienta", en: "Paste here what the tool returned" }, `<textarea id="pegado-texto" rows="10" data-controlador="campo"></textarea>`, {
  ayuda: { es: "Se muestra siempre como texto, nunca se ejecuta. No se guarda entero: solo su huella y un extracto.", en: "It is always shown as text, never executed. It is not stored whole: only its fingerprint and an excerpt." },
})}
</div>
</section>
<aside class="hg-carril" ${atributo("aria-label", { es: "Proponer un sobre desde el texto", en: "Propose an envelope from the text" })}>
<section class="hg-tarjeta hg-tarjeta-accion">
<h2 class="hg-tarjeta-titulo">${t({ es: "Proponer", en: "Propose" })}</h2>
${faltan(1)}
<button type="button" class="hg-boton hg-boton-primario" data-controlador="alternar" aria-pressed="false">${t({ es: "Proponer un sobre", en: "Propose an envelope" })}</button>
<div class="hg-revelado">
<p data-si-completo="false">${chip({ rol: "atencion", simbolo: "aviso", nombre: { es: "Falta el texto", en: "The text is missing" } })}</p>
<p class="hg-consecuencia" data-si-completo="true">${tHtml(
    { es: "El extractor dejó una propuesta en {b}. Todavía no cuenta: se confirma allí, una por una.", en: "The extractor left a proposal in {b}. It does not count yet: it is confirmed there, one by one." },
    { b: enlace("propuestas.html", t({ es: "la bandeja", en: "the inbox" }), existentes) },
  )}</p>
</div>
</section>
<section class="hg-tarjeta">
<h2 class="hg-tarjeta-titulo">${t({ es: "Qué pasa con el texto", en: "What happens to the text" })}</h2>
<ol class="hg-cadena">
${paso({ rol: "neutro", simbolo: "vacio" }, { es: "El extractor propone un sobre", en: "The extractor proposes an envelope" }, { es: "Lo deja en la bandeja de propuestas.", en: "It leaves it in the proposal inbox." })}
${paso({ rol: "neutro", simbolo: "vacio" }, { es: "La regla calcula el veredicto", en: "The rule computes the verdict" }, { es: "La de la prueba, no el extractor.", en: "The test's rule, not the extractor." })}
${paso({ rol: "acento", simbolo: "firma" }, { es: "Tú lo confirmas", en: "You confirm it" }, { es: "Hasta entonces, no cuenta.", en: "Until then, it does not count." })}
</ol>
</section>
</aside>
</div>

<div class="hg-trabajo" data-si-via="manual" data-formulario hidden>
<section class="hg-panel" aria-labelledby="manual">
<div class="hg-panel-cab"><h2 id="manual">${t({ es: "Sobre manual", en: "Manual envelope" })}</h2><p class="hg-menor">${t({ es: "Para una prueba sin herramienta o una revisión hecha a mano.", en: "For a test with no tool or a review done by hand." })}</p></div>
<div class="hg-panel-cuerpo">
<div class="hg-formulario hg-formulario-doble">
${campo("manual-prueba", { es: "Prueba del plan", en: "Test in the plan" }, `<select id="manual-prueba" data-controlador="campo">${elige}${pruebasDelPlan}</select>`)}
${campo("manual-veredicto", { es: "Veredicto", en: "Verdict" }, `<select id="manual-veredicto" data-controlador="campo">${elige}${veredictos}</select>`, {
  ayuda: { es: "«No ejecutada» no es «superada»: si no corrió, dilo.", en: "“Not run” is not “passed”: if it did not run, say so." },
})}
${campo("manual-fecha", { es: "Fecha de ejecución", en: "Run date" }, `<input id="manual-fecha" type="date" data-controlador="campo">`)}
${campo("manual-herramienta", { es: "Herramienta y versión", en: "Tool and version" }, `<input id="manual-herramienta" type="text" autocomplete="off" data-controlador="campo">`)}
${campo("manual-resumen", { es: "Qué se obtuvo, en una o dos frases", en: "What was obtained, in one or two sentences" }, `<textarea id="manual-resumen" rows="3" data-controlador="campo"></textarea>`, { ancho: true })}
${campo("manual-desviacion", { es: "Diferencia con lo esperado", en: "Difference from the expected result" }, `<textarea id="manual-desviacion" rows="2" data-controlador="campo"></textarea>`, { obligatorio: false, ancho: true })}
</div>
</div>
</section>
<aside class="hg-carril" ${atributo("aria-label", { es: "Guardar el sobre manual", en: "Save the manual envelope" })}>
<section class="hg-tarjeta hg-tarjeta-accion">
<h2 class="hg-tarjeta-titulo">${t({ es: "Guardar", en: "Save" })}</h2>
${faltan(5)}
<button type="button" class="hg-boton hg-boton-primario" data-controlador="alternar" aria-pressed="false">${t({ es: "Guardar el sobre", en: "Save the envelope" })}</button>
<div class="hg-revelado">
<p data-si-completo="false">${chip({ rol: "atencion", simbolo: "aviso", nombre: { es: "Faltan campos obligatorios", en: "Required fields are missing" } })}</p>
<p class="hg-consecuencia" data-si-completo="true">${t({
    es: "Guardado como sobre por confirmar. Los sobres manuales se confirman uno por uno; al confirmarlo queda inmutable.",
    en: "Saved as an envelope to confirm. Manual envelopes are confirmed one by one; once confirmed it is immutable.",
  })}</p>
</div>
</section>
<section class="hg-tarjeta">
<h2 class="hg-tarjeta-titulo">${t({ es: "El sobre mínimo", en: "The minimum envelope" })}</h2>
<p class="hg-menor">${t({
    es: "Es obligatorio: sin él no hay evidencia. No se guarda a medias; si falta un campo, el botón lo dice.",
    en: "It is required: without it there is no evidence. Nothing is saved half-done; if a field is missing, the button says so.",
  })}</p>
</section>
</aside>
</div>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "No hay nada por confirmar", en: "Nothing to confirm" },
  `<p>${t({
    es: "Corre las pruebas del plan con tus herramientas y trae aquí el resultado: el archivo de la herramienta, el texto que devolvió o un sobre hecho a mano.",
    en: "Run the plan's tests with your tools and bring the result here: the tool's file, the text it returned or an envelope made by hand.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Leyendo el archivo en tu equipo", en: "Reading the file on your machine" },
  `<p>${t({ es: "Nada sale de tu equipo. Se calcula su huella y se arma un sobre por cada prueba del plan.", en: "Nothing leaves your machine. Its fingerprint is computed and one envelope is built per test in the plan." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "El archivo no se pudo cargar", en: "The file could not be loaded" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "Versión de la herramienta fuera del rango probado", en: "Tool version outside the tested range" } },
    `<p>${tHtml(
      {
        es: "El archivo es de garak {v} y el adaptador solo se probó desde la {m}. No se arma ningún sobre con un formato que nadie verificó: actualiza la herramienta o carga el resultado como texto pegado.",
        en: "The file comes from garak {v} and the adapter was only tested from {m} on. No envelope is built from a format nobody verified: update the tool or load the result as pasted text.",
      },
      { v: dato("0.9.0"), m: dato(HERRAMIENTAS.garak.version_minima) },
    )}</p>`,
  ),
)}`;

  return paginaDeApp({
    titulo: { es: "HackGuard · carga de evidencia", en: "HackGuard · evidence intake" },
    seccion: { id: "evidencia", archivo: "evidencia.html" },
    migas: [t({ es: "Evidencia", en: "Evidence" }), t({ es: "Carga", en: "Intake" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter, primer tramo: la interfaz nueva sobre la carga de evidencia. Los botones y los campos funcionan en la maqueta, pero no guardan nada.",
        en: "Review 4-ter, first stretch: the new interface on evidence intake. Buttons and fields work in the mockup, but they save nothing.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Toda la pantalla", en: "The whole screen" },
        hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" },
        ver: { es: "El lote se lee de un golpe: en qué paso va, qué trae y, a la derecha, qué falta para confirmarlo", en: "The batch reads at a glance: which step it is at, what it holds and, on the right, what is left to confirm it" },
      },
      {
        donde: { es: "Tabla de sobres", en: "Envelope table" },
        hacer: { es: "Pulsa el identificador de otro sobre", en: "Press another envelope's identifier" },
        ver: { es: "La fila queda marcada y «Sobre seleccionado» muestra su regla, sus huellas y su hallazgo", en: "The row is marked and “Selected envelope” shows its rule, its fingerprints and its finding" },
      },
      {
        donde: { es: "Carril de la derecha", en: "Right-hand rail" },
        hacer: { es: "Pulsa «Confirmar el lote»", en: "Press “Confirm the batch”" },
        ver: { es: "El tercer paso pasa a «Confirmado por ti», dice qué ocurre y baja la cifra de lotes por confirmar", en: "The third step becomes “Confirmed by you”, it says what happens and the batches-to-confirm figure goes down" },
      },
      {
        donde: { es: "Selector de lote", en: "Batch selector" },
        hacer: { es: "Cambia al segundo lote", en: "Switch to the second batch" },
        ver: { es: "Cambia todo; «no ejecutada» se distingue de «superada» y dice por qué no cuenta", en: "Everything changes; “not run” is told apart from “passed” and says why it does not count" },
      },
      {
        donde: { es: "Pestañas de vía", en: "Route tabs" },
        hacer: { es: "Pulsa «Sobre manual» y luego «Guardar el sobre» sin llenar nada", en: "Press “Manual envelope” and then “Save the envelope” without filling anything" },
        ver: { es: "El formulario cuenta los obligatorios que faltan y avisa; no guarda a medias", en: "The form counts the required fields left and warns; it does not save half-done" },
      },
    ],
  });
}
