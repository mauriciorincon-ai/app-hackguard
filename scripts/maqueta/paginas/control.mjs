// control.html y control-<id>.html — pantalla 12 (C17). La vista por control: «evidencia organizada»,
// separada del nivel de aseguramiento (E-16). La lista dice, para cada control aplicable, sus pruebas, su
// evidencia más reciente, sus fallas abiertas y su estado; cada control abre su página, con una fila por
// prueba y la cadena hallazgo → corrección → re-prueba → cierre (la que se aprobó en la mirada 1, en la
// página `direccion`, que esta reemplaza). Todo sale de nucleo/brecha.mjs con la fecha de consulta.
import { CONTROLES, FAMILIAS, PRUEBAS as CATALOGO, archivoDeFicha } from "../datos/catalogo.mjs";
import { AREAS, NORMA, areaDe } from "../datos/gobierno.mjs";
import { ACTIVOS, SOBRES, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { brecha as calcular } from "../nucleo/brecha.mjs";
import { huellaDe } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, destino, enlace, estado, firma, huella, par, sello, selectorDeObjetos } from "../nucleo/componentes.mjs";
import { ESTADO_DE_CONTROL, SEVERIDAD } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { conteo, desglose, ejecutadas, estadoDeControl, evidenciaFechada, hallazgoBreve, plazoFechado, plural, veredictoDe } from "../nucleo/piezas-de-brecha.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

// Sin puntos en el nombre: el gate de enlaces solo admite letras, cifras y guiones antes de «.html».
export const archivoDeControl = (id) => `control-${id.toLowerCase().replaceAll(".", "-")}.html`;

const CAPA = { es: "Anexo A · capa por defecto", en: "Annex A · default layer" };
const EVIDENCIA_ORGANIZADA = {
  es: "Esto es evidencia organizada para quien deba evaluarla. No mide el nivel de aseguramiento ni certifica cumplimiento.",
  en: "This is evidence organized for whoever must assess it. It does not measure assurance or certify compliance.",
};
const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;
const ESTADOS = ["con_evidencia_vigente", "evidencia_antigua", "con_fallas", "sin_evidencia"];
const sobreDe = (id) => SOBRES.find((s) => s.id === id);
const nombreDeArea = (c) => AREAS.find((a) => a.id === areaDe(c)).nombre;

// ---------- La lista: un control por fila ----------

function filaDeControl(c, existentes) {
  const pruebas = c.totales.planeadas
    ? `${ejecutadas(c.totales)}${desglose(c.totales)}`
    : `<p class="hg-menor">${t({ es: "Ninguna en el plan: las que lo cubren quedaron fuera.", en: "None in the plan: the ones that cover it were left out." })}</p>`;
  const evidencia = c.ultima ? `<p>${evidenciaFechada(c.ultima, c.edad)}</p>` : `<p class="hg-menor">${t({ es: "Sin evidencia confirmada.", en: "No confirmed evidence." })}</p>`;
  const fallas = c.fallas.length
    ? c.fallas.map((h) => `<p>${hallazgoBreve(h, existentes)}</p>`).join("")
    : `<p class="hg-menor">${t({ es: "Ninguna falla abierta.", en: "No open failure." })}</p>`;
  return `<tr data-fila-de-lista="${c.id}">
<td data-celda="id">${dato(c.id)}</td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeControl(c.id)}">${t(CONTROLES[c.id])}</a></p><p class="hg-menor">${neutro(areaDe(c.id))} · ${t(nombreDeArea(c.id))}</p></td>
<td data-celda="resultado">${pruebas}</td>
<td>${evidencia}${fallas}</td>
<td data-celda="estado">${estadoDeControl(c.id, c.vista.estado)}</td>
</tr>`;
}

export function control({ consulta, umbrales, existentes }) {
  const b = calcular(consulta, umbrales);
  const cuenta = (e) => b.controles.filter((c) => c.vista.estado === e).length;
  const cifras = ESTADOS.map((e) => `<li data-cifra="${e}"><span class="hg-cifra" data-neutro>${cuenta(e)}</span>${estado(ESTADO_DE_CONTROL[e])}</li>`).join("");

  const sinControl = b.sinControl
    .map(
      (f) => `<tr>
<td data-celda="id">${dato(f.ficha.id)}</td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeFicha(f.ficha.id)}">${t(f.ficha.nombre)}</a></p><p class="hg-menor">${t(ACTIVOS[f.activo].nombre)} · ${t(FAMILIAS[f.ficha.familia])}</p></td>
<td data-celda="estado">${veredictoDe(f.veredicto)}</td>
</tr>`,
    )
    .join("\n");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Vista por control", en: "Control view" })}</h1>
<p class="hg-bajada">${t(EVIDENCIA_ORGANIZADA)}</p>
<p class="hg-cabecera-meta" data-si="datos"><span>${neutro(NORMA)} · ${t(CAPA)}</span><span>${t({
    es: `${b.controles.length} controles aplicables a los planes`,
    en: `${b.controles.length} controls applicable to the plans`,
  })}</span><span>${tHtml({ es: "Consulta del {f}", en: "Queried on {f}" }, { f: dato(consulta) })}</span></p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Controles por estado", en: "Controls by status" })}>${cifras}</ul>
</div>

<div class="hg-pila" data-si="datos">
<section class="hg-panel" aria-labelledby="controles">
<div class="hg-panel-cab"><h2 id="controles">${t({ es: "Controles aplicables", en: "Applicable controls" })}</h2><p class="hg-menor">${t({
    es: "Los que cubre alguna prueba planeada y los que se quedaron sin prueba en los planes.",
    en: "Those covered by some planned test and those left with no test in the plans.",
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Controles aplicables", en: "Applicable controls" })}</caption>
${columnas([
  { es: "Control", en: "Control" },
  { es: "Qué exige", en: "What it requires" },
  { es: "Pruebas del plan", en: "Plan tests" },
  { es: "Evidencia y fallas", en: "Evidence and failures" },
  { es: "Estado", en: "Status" },
])}
<tbody>
${b.controles.map((c) => filaDeControl(c, existentes)).join("\n")}
</tbody>
</table>
</section>

<section class="hg-panel" aria-labelledby="sin-control">
<div class="hg-panel-cab"><h2 id="sin-control">${t({ es: "Pruebas del plan sin control", en: "Plan tests with no control" })}</h2><p class="hg-menor">${t({
    es: "Están en el plan por su marco, pero no dan evidencia a ningún control. No se esconden: esta es su cuenta.",
    en: "They are in the plan because of their framework, but give evidence to no control. They are not hidden: this is their tally.",
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas del plan sin control", en: "Plan tests with no control" })}</caption>
${columnas([{ es: "Prueba", en: "Test" }, { es: "Qué verifica", en: "What it verifies" }, { es: "Último veredicto", en: "Latest verdict" }])}
<tbody>
${sinControl}
</tbody>
</table>
</section>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Ningún control es aplicable todavía", en: "No control applies yet" },
  `<p>${t({
    es: "Un control se vuelve aplicable cuando un plan incluye una prueba que lo cubre. Emite el plan de un activo para empezar a reunir evidencia.",
    en: "A control becomes applicable when a plan includes a test that covers it. Issue an asset's plan to start gathering evidence.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Leyendo el libro de evidencia", en: "Reading the evidence ledger" },
  `<p>${t({ es: "Se comprueba la huella de cada sobre antes de mostrarlo.", en: "Each envelope's fingerprint is checked before it is shown." })}</p>${ESQUELETO}`,
)}

${errorDelLibro()}`;

  return pagina({
    titulo: { es: "HackGuard · por control", en: "HackGuard · by control" },
    seccion: { id: "brecha", archivo: "control.html" },
    migas: [t({ es: "Brecha", en: "Gap" }), t({ es: "Por control", en: "By control" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 5 (aprobada): la vista por control completa. Cada control abre su página; la de la mirada 1 (direccion) se retiró porque esta la reemplaza.",
        en: "Review 5 (approved): the complete control view. Each control opens its own page; the review 1 page (direccion) was retired because this one replaces it.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Cifras de arriba", en: "Figures at the top" },
        hacer: { es: "Léelas sin fijarte en el color", en: "Read them without relying on color" },
        ver: { es: "Los cuatro estados de un control, cada uno con su forma y su texto", en: "The four statuses of a control, each with its shape and its label" },
      },
      {
        donde: { es: "Tabla de controles", en: "Controls table" },
        hacer: { es: "Recorre una fila de izquierda a derecha", en: "Follow one row from left to right" },
        ver: { es: "Qué exige, cuántas pruebas tiene y cuántas corrieron, de cuándo es su evidencia y qué falla sigue abierta", en: "What it requires, how many tests it has and how many ran, how old its evidence is and which failure is still open" },
      },
      {
        donde: { es: "Fila de iso42001-A.7.4", en: "The iso42001-A.7.4 row" },
        hacer: { es: "Léela", en: "Read it" },
        ver: { es: "Dice que ninguna prueba del plan lo cubre, en vez de esconderlo", en: "It says no test in the plan covers it, instead of hiding it" },
      },
      {
        donde: { es: "Nombre de un control", en: "A control's name" },
        hacer: { es: "Abre «con fallas»", en: "Open the one with failures" },
        ver: { es: "Su página: una fila por prueba y la cadena de cierre de sus hallazgos", en: "Its page: one row per test and the closure chain of its findings" },
      },
    ],
  });
}

// ---------- La página de un control ----------

function fraseDeControl(c, plazos, umbrales) {
  const total = c.vista.filas.length;
  const fallas = c.vista.cuenta("con_fallas");
  if (total === 0) {
    return { es: "Ninguna prueba de los planes lo cubre: las que lo harían quedaron fuera.", en: "No test in the plans covers it: the ones that would were left out." };
  }
  if (c.vista.estado === "con_fallas") {
    const atraso = Math.max(0, ...plazos.map((p) => p.atraso));
    return {
      es:
        `${fallas} de ${total} pruebas ${plural(fallas, "falló", "fallaron")}. ` +
        (atraso > 0 ? `El hallazgo más atrasado lleva ${atraso} ${plural(atraso, "día", "días")} vencido.` : "Sus hallazgos siguen dentro del plazo."),
      en: `${fallas} of ${total} tests failed. ` + (atraso > 0 ? `The most overdue finding is ${atraso} ${plural(atraso, "day", "days")} past its deadline.` : "Its findings are still within their deadlines."),
    };
  }
  if (c.vista.estado === "sin_evidencia") {
    return { es: `Ninguna de sus ${total} pruebas tiene resultado confirmado.`, en: `None of its ${total} tests has a confirmed result.` };
  }
  if (c.vista.estado === "evidencia_antigua") {
    const n = umbrales.evidencia_antigua;
    return { es: `Toda su evidencia tiene ${n} días o más.`, en: `All its evidence is ${n} days old or more.` };
  }
  const sin = c.vista.cuenta("sin_evidencia");
  return sin
    ? { es: `Hay evidencia reciente y ninguna prueba falló; ${sin} de ${total} todavía no tienen resultado.`, en: `There is recent evidence and no test failed; ${sin} of ${total} have no result yet.` }
    : { es: "Hay evidencia reciente y ninguna prueba falló.", en: "There is recent evidence and no test failed." };
}

function filaDePrueba(f, c, plazosPorHallazgo, existentes) {
  const { prueba, ultimo, abierto, edad, veredicto } = f;
  let resultado = `<p>${veredictoDe(veredicto)}</p>`;
  if (ultimo) {
    resultado += `<p class="hg-menor">${t(conteo(ultimo))}</p>`;
    if (ultimo.reprueba_de) resultado += `<p class="hg-menor">${t({ es: "Re-prueba de", en: "Retest of" })} ${dato(ultimo.reprueba_de)}</p>`;
  } else {
    resultado += `<p class="hg-menor">${t({ es: "Planeada, sin resultado todavía.", en: "Planned, no result yet." })}</p>`;
  }
  // El hallazgo que dejó abierto va con su resultado: junto al carril, cinco columnas no caben.
  const p = abierto && plazosPorHallazgo[abierto.id];
  if (abierto) {
    resultado += `<p>${hallazgoBreve(abierto, existentes)}</p>${p ? plazoFechado(abierto, p) : `<p class="hg-menor">${t({ es: "Riesgo aceptado: el plazo no corre.", en: "Accepted risk: the deadline is not running." })}</p>`}`;
  }
  const evidencia = ultimo
    ? `<p>${dato(ultimo.id)}</p><p>${evidenciaFechada(ultimo.fecha, edad)}</p>${huella(huellaDe(ultimo))}<p>${firma(ultimo.confirmado)}</p>`
    : `<p class="hg-menor">${t({ es: "Sin sobre de evidencia.", en: "No evidence envelope." })}</p>`;
  return `<tr data-fila-control="${f.estado}" data-de-control="${c.id}" data-veredicto="${veredicto}">
<td data-celda="id">${dato(prueba.id)}</td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeFicha(prueba.id)}">${t(prueba.nombre)}</a></p><p class="hg-menor">${t(ACTIVOS[prueba.activo].nombre)}</p></td>
<td>${resultado}</td>
<td>${evidencia}</td>
</tr>`;
}

function eslabon({ rol, simbolo, pendiente }, titulo, cuerpo = "") {
  return `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo}</li>`;
}

function cadena(h, p, existentes) {
  const origen = sobreDe(h.sobre_origen);
  const reprueba = h.sobre_reprueba ? sobreDe(h.sobre_reprueba) : null;
  const abierto = eslabon({ rol: "falla", simbolo: "falla" }, { es: "Hallazgo abierto", en: "Finding opened" }, `${dato(h.apertura)}<span class="hg-menor">${t(conteo(origen))}</span>${dato(origen.id)}`);
  const correccion = h.correccion
    ? eslabon({ rol: "acento", simbolo: "firma" }, { es: "Corrección declarada", en: "Fix declared" }, `${dato(h.correccion.fecha)}<span class="hg-menor">${t(h.correccion.nota)}</span>`)
    : eslabon({ pendiente: true }, { es: "Corrección pendiente", en: "Fix pending" });
  const repetida = reprueba
    ? eslabon(
        { rol: "positivo", simbolo: "ok" },
        { es: "Re-prueba superada", en: "Retest passed" },
        `${dato(reprueba.fecha)}<span class="hg-menor">${t({
          es: `Misma configuración, k = ${reprueba.evaluadas} (el original usó ${origen.evaluadas}).`,
          en: `Same configuration, k = ${reprueba.evaluadas} (the original used ${origen.evaluadas}).`,
        })}</span>${firma(reprueba.confirmado)}`,
      )
    : eslabon({ pendiente: true }, { es: "Re-prueba pendiente", en: "Retest pending" });
  const cierre = h.cierre ? eslabon({ rol: "positivo", simbolo: "ok" }, { es: "Cerrado por re-prueba", en: "Closed by retest" }, dato(h.cierre)) : eslabon({ pendiente: true }, { es: "Sin cerrar", en: "Not closed" });

  return `<section class="hg-panel" aria-labelledby="cadena-${h.id}">
<div class="hg-panel-cab"><div class="hg-panel-linea">${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)}<h3 id="cadena-${h.id}">${t(h.titulo)}</h3></div><div class="hg-panel-linea">${chip(SEVERIDAD[h.severidad])}${p ? plazoFechado(h, p) : ""}</div></div>
<ol class="hg-cadena hg-cadena-horizontal">
${abierto}
${correccion}
${repetida}
${cierre}
</ol>
</section>`;
}

/** Lo que una persona puede hacer por este control, según su estado: una sola acción principal. */
function accion(c, existentes) {
  const boton = (archivo, texto) => `<a class="hg-boton hg-boton-primario" href="${destino(archivo, existentes)}">${t(texto)}</a>`;
  if (c.vista.estado === "con_fallas") {
    const h = c.fallas[0];
    if (!h) return `<p>${t({ es: "Sus fallas tienen el riesgo aceptado: se revisan en la fecha que cada una declara.", en: "Its failures have their risk accepted: each is reviewed on the date it declares." })}</p>`;
    return `<p>${t({ es: `Corregir y re-probar ${h.id}. El control sigue con fallas hasta que una re-prueba superada se confirme.`, en: `Fix and retest ${h.id}. The control keeps its failures until a passed retest is confirmed.` })}</p>${boton(archivoDeHallazgo(h.id), { es: "Abrir el hallazgo", en: "Open the finding" })}`;
  }
  if (c.vista.estado === "evidencia_antigua") {
    const activo = c.filas[0].activo;
    return `<p>${t({ es: "Volver a ejecutar sus pruebas: la evidencia que tiene ya no dice cómo está hoy.", en: "Run its tests again: the evidence it has no longer says how it stands today." })}</p>${boton(archivoDePlan(activo), { es: "Abrir el plan", en: "Open the plan" })}`;
  }
  if (c.totales.planeadas === 0) {
    return `<p>${t({ es: "Ninguna prueba de los planes lo cubre. Revisa en el catálogo cuáles lo harían y por qué quedaron fuera.", en: "No test in the plans covers it. Check in the catalog which ones would and why they were left out." })}</p>${boton("catalogo.html", { es: "Abrir el catálogo", en: "Open the catalog" })}`;
  }
  const sin = c.vista.cuenta("sin_evidencia");
  return `<p>${t({ es: `Cargar la evidencia que falta: ${sin} de ${c.vista.filas.length} pruebas sin resultado.`, en: `Load the missing evidence: ${sin} of ${c.vista.filas.length} tests with no result.` })}</p>${boton("evidencia.html", { es: "Ir a la carga de evidencia", en: "Go to evidence intake" })}`;
}

export const controlDetalle = (id) => ({ consulta, umbrales, existentes }) => {
  const b = calcular(consulta, umbrales);
  const c = b.controles.find((x) => x.id === id);
  const plazosPorHallazgo = Object.fromEntries(b.abiertos.filter(({ p }) => p).map(({ h, p }) => [h.id, p]));
  const plazos = c.fallas.map((h) => plazosPorHallazgo[h.id]).filter(Boolean);
  const cifras = ESTADOS.map((e) => `<li><span class="hg-cifra" data-neutro>${c.vista.cuenta(e)}</span>${estado(ESTADO_DE_CONTROL[e])}</li>`).join("");
  const cerradosPrimero = [...c.hallazgos].sort((x, y) => Number(Boolean(y.cierre)) - Number(Boolean(x.cierre)));

  // Lo que el catálogo tiene para este control aunque ningún plan lo incluya (para el control sin prueba).
  const delCatalogo = CATALOGO.filter((p) => p.controles.includes(id));

  const selector = selectorDeObjetos(
    { es: "Controles aplicables", en: "Applicable controls" },
    b.controles.map((x) => ({ archivo: archivoDeControl(x.id), titulo: dato(x.id), nota: t(ESTADO_DE_CONTROL[x.vista.estado].nombre), actual: x.id === id })),
    existentes,
  );

  const tabla = c.vista.filas.length
    ? `<section class="hg-panel" aria-labelledby="pruebas">
<div class="hg-panel-cab"><h2 id="pruebas">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</h2><p class="hg-menor">${t({
        es: "Una fila por prueba planeada, con su último sobre de evidencia confirmado.",
        en: "One row per planned test, with its latest confirmed evidence envelope.",
      })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</caption>
${columnas([
  { es: "Prueba", en: "Test" },
  { es: "Qué verifica", en: "What it verifies" },
  { es: "Último resultado y hallazgo", en: "Latest result and finding" },
  { es: "Evidencia y confirmación", en: "Evidence and confirmation" },
])}
<tbody>
${c.vista.filas.map((f) => filaDePrueba(f, c, plazosPorHallazgo, existentes)).join("\n")}
</tbody>
</table>
</section>`
    : `<section class="hg-panel" aria-labelledby="pruebas">
<div class="hg-panel-cab"><h2 id="pruebas">${t({ es: "Pruebas del catálogo que lo cubren", en: "Catalog tests that cover it" })}</h2><p class="hg-menor">${t({
        es: "Existen, pero ningún plan las incluye: por eso el control no tiene evidencia.",
        en: "They exist, but no plan includes them: that is why the control has no evidence.",
      })}</p></div>
<div class="hg-panel-cuerpo"><ul class="hg-lista hg-lista-datos">${delCatalogo
        .map((p) => `<li>${dato(p.id)} ${enlace(archivoDeFicha(p.id), t(p.nombre), existentes)}</li>`)
        .join("")}</ul></div>
</section>`;

  const cadenas = c.hallazgos.length
    ? `<section class="hg-pila" aria-labelledby="cadenas">
<h2 id="cadenas">${t({ es: "Cadena de cierre de sus hallazgos", en: "Closure chain of its findings" })}</h2>
${cerradosPrimero.map((h) => cadena(h, plazosPorHallazgo[h.id], existentes)).join("\n")}
</section>`
    : "";

  const activos = [...new Set(c.filas.map((f) => f.activo))];
  const contenido = `${selector}

<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(id)}<span class="hg-menor">${neutro(NORMA)} · ${t(CAPA)}</span></p>
<h1>${t(CONTROLES[id])}</h1>
<p class="hg-bajada">${t(EVIDENCIA_ORGANIZADA)}</p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Pruebas por estado", en: "Tests by status" })}>${cifras}</ul>
</div>

<div class="hg-trabajo" data-si="datos">
<div class="hg-pila">
${sello(ESTADO_DE_CONTROL[c.vista.estado], `<p>${t(fraseDeControl(c, plazos, umbrales))}</p>`, `data-control="${id}" data-control-estado="${c.vista.estado}" data-por-filas`)}
${tabla}
${cadenas}
</div>

<aside class="hg-carril" ${atributo("aria-label", { es: `Acción y propiedades de ${id}`, en: `Action and properties of ${id}` })}>
<section class="hg-tarjeta hg-tarjeta-accion" aria-labelledby="accion">
<h2 class="hg-tarjeta-titulo" id="accion">${t({ es: "Lo que falta", en: "What is missing" })}</h2>
${accion(c, existentes)}
</section>
<section class="hg-tarjeta" aria-labelledby="propiedades">
<h2 class="hg-tarjeta-titulo" id="propiedades">${t({ es: "Propiedades", en: "Properties" })}</h2>
<dl class="hg-propiedades">
${par({ es: "Área del Anexo A", en: "Annex A area" }, `<span>${neutro(areaDe(id))} · ${t(nombreDeArea(id))}</span>`)}
${par({ es: "Pruebas en los planes", en: "Tests in the plans" }, c.totales.planeadas ? `<span>${t({ es: `${c.totales.planeadas} · ${c.totales.ejecutadas} con resultado`, en: `${c.totales.planeadas} · ${c.totales.ejecutadas} with a result` })}</span>` : `<span>${t({ es: "Ninguna", en: "None" })}</span>`)}
${par({ es: "Activos", en: "Assets" }, activos.length ? activos.map((a) => `<span>${enlace(archivoDeActivo(a), t(ACTIVOS[a].nombre), existentes)}</span>`).join("") : `<span>${t({ es: "Ninguno", en: "None" })}</span>`)}
${par({ es: "Evidencia más reciente", en: "Latest evidence" }, c.ultima ? evidenciaFechada(c.ultima, c.edad) : `<span>${t({ es: "Ninguna", en: "None" })}</span>`)}
</dl>
</section>
<section class="hg-tarjeta" aria-labelledby="equivalentes">
<h2 class="hg-tarjeta-titulo" id="equivalentes">${t({ es: "Controles equivalentes", en: "Equivalent controls" })}</h2>
<p class="hg-menor">${t({
    es: "Ningún mapa hacia otro marco de cumplimiento está cargado todavía. Cuando lo esté, cada equivalencia dirá su fuente y si el mapa es incompleto.",
    en: "No map to another compliance framework is loaded yet. When one is, each equivalence will state its source and whether the map is incomplete.",
  })}</p>
</section>
</aside>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Ninguna prueba cubre este control todavía", en: "No test covers this control yet" },
  `<p>${t({
    es: "Un control sin pruebas no es un control cumplido: es una deuda a la vista. Asígnale una prueba del catálogo para empezar a reunir evidencia.",
    en: "A control with no tests is not a control that is met: it is a visible debt. Assign it a test from the catalog to start gathering evidence.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Leyendo el libro de evidencia", en: "Reading the evidence ledger" },
  `<p>${t({ es: "Se comprueba la huella de cada sobre antes de mostrarlo.", en: "Each envelope's fingerprint is checked before it is shown." })}</p>${ESQUELETO}`,
)}

${errorDelLibro()}`;

  return pagina({
    titulo: { es: `HackGuard · ${id}`, en: `HackGuard · ${id}` },
    seccion: { id: "brecha", archivo: "control.html" },
    migas: [t({ es: "Brecha", en: "Gap" }), t({ es: "Por control", en: "By control" }), dato(id)],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 5 (aprobada): la página de un control, con lo aprobado en la mirada 1. Hay una por cada control aplicable; el selector de arriba las recorre.",
        en: "Review 5 (approved): a control's page, with what was approved in review 1. There is one per applicable control; the selector at the top goes through them.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Selector de arriba", en: "The selector at the top" },
        hacer: { es: `Abre los ${b.controles.length} controles`, en: `Open all ${b.controles.length} controls` },
        ver: { es: "Cada uno con su estado y un aviso que dice por qué; entre todos aparecen los cuatro estados", en: "Each with its status and a notice saying why; together they show all four statuses" },
      },
      {
        donde: { es: "Tabla de pruebas", en: "Test table" },
        hacer: { es: "Recorre una fila de izquierda a derecha", en: "Follow one row from left to right" },
        ver: { es: "Qué verifica, qué dio y qué hallazgo dejó abierto, y con qué evidencia firmada", en: "What it verifies, what it gave and which finding it left open, and with what signed evidence" },
      },
      {
        donde: { es: "Cadena de cierre (control con fallas)", en: "Closure chain (control with failures)" },
        hacer: { es: "Compara sus hallazgos", en: "Compare its findings" },
        ver: { es: "Uno cerrado por re-prueba y otro abierto con sus pasos pendientes en línea punteada", en: "One closed by retest and one open with its pending steps on a dashed line" },
      },
      {
        donde: { es: "Carril de la derecha", en: "Right-hand rail" },
        hacer: { es: "Compara «Lo que falta» entre controles", en: "Compare “What is missing” across controls" },
        ver: { es: "Una sola acción por control, la que su estado pide", en: "A single action per control, the one its status calls for" },
      },
    ],
  });
};

function errorDelLibro() {
  return aviso(
    "error",
    ERROR,
    { es: "No se pudo leer el libro de evidencia", en: "The evidence ledger could not be read" },
    sello(
      { rol: "falla", simbolo: "falla", nombre: { es: "Una huella no coincide", en: "A fingerprint does not match" } },
      `<p>${t({
        es: "Un sobre cambió después de confirmarse. No se muestra nada hasta que coincida: restaura la última copia del libro y vuelve a cargarlo.",
        en: "An envelope changed after it was confirmed. Nothing is shown until it matches: restore the latest copy of the ledger and load it again.",
      })}</p>`,
    ),
  );
}
