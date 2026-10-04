// brecha.html — pantalla 11 (C16). Esperado contra obtenido en cada prueba planeada de todos los activos:
// cobertura por activo, por familia y por control (planeadas, ejecutadas, superadas, fallidas, no
// ejecutadas), la tabla por prueba con su desviación, y vencidos y alertas. «No detectado» se lee
// distinto de «verificado» (E-6). Lo que espera confirmación se ve, pero no mueve ninguna cifra. Todo sale
// de nucleo/brecha.mjs con la fecha de consulta. Dirección «consola»: es una lista, va a todo el ancho.
import { CONTROLES, FAMILIAS, INSTANTANEA, archivoDeFicha } from "../datos/catalogo.mjs";
import { ACTIVOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { brecha as calcular } from "../nucleo/brecha.mjs";
import { archivoDeControl } from "./control.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, columnas, dato, enlace, estado, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_ACTIVO, VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, esc, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import {
  alertas,
  conteo,
  desglose,
  desviacion,
  ejecutadas,
  estadoDeControl,
  evidenciaFechada,
  hallazgoBreve,
  tablaDeAlertas,
  veredictoDe,
} from "../nucleo/piezas-de-brecha.mjs";

const SIN_PLAN = { rol: "neutro", simbolo: "vacio", nombre: { es: "Sin plan", en: "No plan" } };

/** Una fila de «esperado contra obtenido». La brecha la filtra; el informe la lleva tal cual. */
export function filaDeBrecha(f, existentes, { filtrable = true } = {}) {
  const a = ACTIVOS[f.activo];
  let obtenido = `<p class="hg-menor">${t({ es: "Sin sobre confirmado.", en: "No confirmed envelope." })}</p>`;
  if (f.ultimo) {
    obtenido = `<p>${dato(f.ultimo.id)}</p><p>${evidenciaFechada(f.ultimo.fecha, f.edad)}</p><p class="hg-menor">${t(conteo(f.ultimo))}</p>`;
  }
  if (f.propuesto) {
    const v = VEREDICTO[f.propuesto.sugerido].nombre;
    obtenido += `<p class="hg-menor">${tHtml(
      {
        es: `Espera confirmación en {l} (sugiere «${v.es}»): no cuenta todavía.`,
        en: `Awaiting confirmation in {l} (it suggests “${v.en}”): it does not count yet.`,
      },
      { l: enlace("evidencia.html", dato(f.propuesto.lote), existentes) },
    )}</p>`;
  }
  const hallazgo = f.hallazgo ? `<p>${hallazgoBreve(f.hallazgo, existentes)}</p>` : "";
  const atributos = [
    `data-fila-brecha`,
    filtrable ? `data-filtrable` : "",
    `data-prueba="${f.ficha.id}"`,
    `data-activo="${f.activo}"`,
    `data-familia="${f.ficha.familia}"`,
    `data-veredicto="${f.veredicto}"`,
    f.propuesto ? `data-propuesto="${f.propuesto.lote}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<tr ${atributos}>
<td data-celda="id">${dato(f.ficha.id)}</td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeFicha(f.ficha.id)}">${t(f.ficha.nombre)}</a></p><p class="hg-menor">${t(a.nombre)} · ${t(FAMILIAS[f.ficha.familia])}</p><p class="hg-menor"><strong>${t({ es: "Se espera:", en: "Expected:" })}</strong> ${t(f.ficha.resultado_esperado)}</p></td>
<td>${obtenido}</td>
<td><p>${t(desviacion(f))}</p>${hallazgo}</td>
<td data-celda="estado">${veredictoDe(f.veredicto)}</td>
</tr>`;
}

export function brecha({ consulta, umbrales, existentes }) {
  const b = calcular(consulta, umbrales);
  const r = b.resumen;
  const conPlan = b.porActivo.filter((x) => x.plan);
  const total = b.filas.length;

  const cifras = [
    `<li data-cifra="ejecutadas"><span class="hg-cifra" data-neutro>${r.ejecutadas} / ${r.planeadas}</span><span>${t({ es: "ejecutadas de las planeadas", en: "run out of planned" })}</span></li>`,
    `<li data-cifra="superadas"><span class="hg-cifra" data-neutro>${r.superadas}</span>${estado({ ...VEREDICTO.superada, nombre: { es: "superadas", en: "passed" } })}</li>`,
    `<li data-cifra="fallidas"><span class="hg-cifra" data-neutro>${r.fallidas}</span>${estado({ ...VEREDICTO.fallida, nombre: { es: "fallidas", en: "failed" } })}</li>`,
    `<li data-cifra="no_ejecutadas"><span class="hg-cifra" data-neutro>${r.no_ejecutadas}</span>${estado({ ...VEREDICTO.no_ejecutada, nombre: { es: "sin ejecutar", en: "not run" } })}</li>`,
  ].join("");

  // ---- Cobertura: la misma cuenta agrupada de tres maneras (pestañas).
  const porActivo = b.porActivo
    .map(({ id, a, plan, totales }) => {
      const nombre = `<p><a class="hg-enlace-fila" href="${archivoDeActivo(id)}">${t(a.nombre)}</a></p>`;
      if (!plan) {
        return `<tr data-cobertura="activo">
<td data-celda="principal">${nombre}<p class="hg-menor">${t({ es: "Sin alcance autorizado no hay plan, y sin plan no hay brecha.", en: "Without an authorized scope there is no plan, and without a plan there is no gap." })}</p></td>
<td><p class="hg-menor">—</p></td>
<td><p class="hg-menor">—</p></td>
<td data-celda="estado">${chip(SIN_PLAN)}</td>
</tr>`;
      }
      return `<tr data-cobertura="activo" data-planeadas="${totales.planeadas}" data-ejecutadas="${totales.ejecutadas}">
<td data-celda="principal">${nombre}<p class="hg-menor">${t({ es: "Plan", en: "Plan" })} ${enlace(archivoDePlan(id), dato(a.plan.id), existentes)}</p></td>
<td data-celda="resultado">${ejecutadas(totales)}</td>
<td>${desglose(totales)}</td>
<td data-celda="estado">${estado(ESTADO_DE_ACTIVO[a.estado])}</td>
</tr>`;
    })
    .join("\n");

  const porFamilia = b.porFamilia
    .map(
      ({ familia, totales }) => `<tr data-cobertura="familia" data-planeadas="${totales.planeadas}" data-ejecutadas="${totales.ejecutadas}">
<td data-celda="principal"><p><strong>${t(FAMILIAS[familia])}</strong></p></td>
<td data-celda="resultado">${ejecutadas(totales)}</td>
<td>${desglose(totales)}</td>
</tr>`,
    )
    .join("\n");

  const porControl = b.controles
    .map(
      (c) => `<tr data-cobertura="control">
<td data-celda="id">${enlace(archivoDeControl(c.id), dato(c.id), existentes)}</td>
<td data-celda="principal"><p>${t(CONTROLES[c.id])}</p>${
        c.totales.planeadas ? "" : `<p class="hg-menor">${t({ es: "Ninguna prueba del plan lo cubre: las que lo cubren quedaron fuera.", en: "No test in the plan covers it: the ones that do were left out." })}</p>`
      }</td>
<td data-celda="resultado">${c.totales.planeadas ? ejecutadas(c.totales) : `<p class="hg-menor">—</p>`}</td>
<td data-celda="estado">${estadoDeControl(c.id, c.vista.estado)}</td>
</tr>`,
    )
    .join("\n");

  const pestanas = [
    { valor: "activo", nombre: { es: "Por activo", en: "By asset" } },
    { valor: "familia", nombre: { es: "Por familia", en: "By family" } },
    { valor: "control", nombre: { es: "Por control", en: "By control" } },
  ]
    .map(({ valor, nombre }) => `<button type="button" class="hg-pestana" data-controlador="pestana" data-valor="${valor}" aria-pressed="${valor === "activo"}">${t(nombre)}</button>`)
    .join("");

  // ---- Filtros de la tabla por prueba.
  const filtroActivo = [{ valor: "", nombre: { es: "Todos", en: "All" } }, ...conPlan.map(({ id, a }) => ({ valor: id, nombre: a.nombre }))]
    .map(
      ({ valor, nombre }) =>
        `<button type="button" class="hg-boton hg-filtro" data-controlador="filtro" data-campo="activo" data-valor="${valor}" aria-pressed="${valor === ""}">${t(nombre)}</button>`,
    )
    .join("");
  const opciones = [["", { es: "Todos", en: "All" }], ...["superada", "fallida", "no_ejecutada"].map((v) => [v, VEREDICTO[v].nombre])]
    .map(([valor, texto]) => `<option value="${valor}" data-es="${esc(texto.es)}" data-en="${esc(texto.en)}">${esc(texto.es)}</option>`)
    .join("");
  const filtroVeredicto = `<label class="hg-campo" for="filtro-veredicto"><span>${t({ es: "Veredicto", en: "Verdict" })}</span><select id="filtro-veredicto" data-controlador="filtro" data-campo="veredicto">${opciones}</select></label>`;

  const filasDeAlerta = alertas(b, { activos: ACTIVOS, archivoDeFicha, archivoDeHallazgo, existentes });
  const pc = b.porConfirmar;

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Brecha", en: "Gap" })}</h1>
<p class="hg-bajada">${t({
    es: "Esperado contra obtenido en cada prueba planeada, de todos los activos. Solo cuenta lo que confirmó una persona.",
    en: "Expected against obtained for every planned test, across all assets. Only what a person confirmed counts.",
  })}</p>
<p class="hg-cabecera-meta" data-si="datos"><span>${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)}</span><span>${tHtml({ es: "Consulta del {f}", en: "Queried on {f}" }, { f: dato(consulta) })}</span><span>${t({
    es: `${conPlan.length} de ${b.porActivo.length} activos con plan`,
    en: `${conPlan.length} of ${b.porActivo.length} assets with a plan`,
  })}</span></p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Cobertura de lo planeado", en: "Coverage of what was planned" })}>${cifras}</ul>
</div>

<div class="hg-pila" data-si="datos">
${sello(
  { rol: "atencion", simbolo: "reloj", nombre: { es: "Hay evidencia esperando tu confirmación", en: "There is evidence awaiting your confirmation" } },
  `<p>${t({
    es: `${pc.sobres} sobres en ${pc.lotes} lotes y ${pc.extractor} que propuso el extractor. Ninguno mueve estas cifras hasta que una persona lo confirme.`,
    en: `${pc.sobres} envelopes in ${pc.lotes} batches and ${pc.extractor} proposed by the extractor. None of them moves these figures until a person confirms it.`,
  })}</p><p>${enlace("evidencia.html", t({ es: "Ir a la carga de evidencia", en: "Go to evidence intake" }), existentes)}</p>`,
  `data-por-confirmar="${pc.sobres + pc.extractor}"`,
)}

<section class="hg-panel" data-pestanas data-via="activo" aria-labelledby="cobertura">
<div class="hg-panel-cab"><h2 id="cobertura">${t({ es: "Cobertura", en: "Coverage" })}</h2><p class="hg-menor">${t({
    es: "Planeadas contra ejecutadas. Una prueba sin constancia de que corrió cuenta como no ejecutada.",
    en: "Planned against run. A test with no proof that it ran counts as not run.",
  })}</p></div>
<div class="hg-pestanas" role="group" ${atributo("aria-label", { es: "Agrupar la cobertura", en: "Group the coverage" })}>${pestanas}</div>
<table class="hg-tabla" data-si-via="activo">
<caption class="hg-oculto">${t({ es: "Cobertura por activo", en: "Coverage by asset" })}</caption>
${columnas([{ es: "Activo", en: "Asset" }, { es: "Ejecutadas", en: "Run" }, { es: "Resultado", en: "Outcome" }, { es: "Estado", en: "Status" }])}
<tbody>
${porActivo}
</tbody>
</table>
<table class="hg-tabla" data-si-via="familia" hidden>
<caption class="hg-oculto">${t({ es: "Cobertura por familia", en: "Coverage by family" })}</caption>
${columnas([{ es: "Familia", en: "Family" }, { es: "Ejecutadas", en: "Run" }, { es: "Resultado", en: "Outcome" }])}
<tbody>
${porFamilia}
</tbody>
</table>
<table class="hg-tabla" data-si-via="control" hidden>
<caption class="hg-oculto">${t({ es: "Cobertura por control", en: "Coverage by control" })}</caption>
${columnas([{ es: "Control", en: "Control" }, { es: "Qué exige", en: "What it requires" }, { es: "Ejecutadas", en: "Run" }, { es: "Estado", en: "Status" }])}
<tbody>
${porControl}
</tbody>
</table>
<p class="hg-panel-pie" data-si-via="control" hidden>${tHtml(
  {
    es: `${b.sinControl.length} pruebas del plan no dan evidencia a ningún control ({p}): cuentan en la cobertura por activo y por familia.`,
    en: `${b.sinControl.length} tests in the plan give evidence to no control ({p}): they count in the coverage by asset and by family.`,
  },
  { p: b.sinControl.map((f) => dato(f.ficha.id)).join(" · ") },
)}</p>
</section>

<section class="hg-panel" aria-labelledby="esperado">
<div class="hg-panel-cab"><h2 id="esperado">${t({ es: "Esperado contra obtenido", en: "Expected against obtained" })}</h2><p class="hg-menor">${t({
    es: "Una fila por prueba planeada, con su último sobre confirmado.",
    en: "One row per planned test, with its latest confirmed envelope.",
  })}</p></div>
<div class="hg-herramientas">
<div class="hg-herramientas-linea">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Activo", en: "Asset" })}>${filtroActivo}</div>
<div class="hg-grupo">
<p class="hg-menor">${tHtml({ es: `Se muestran {n} de ${total} pruebas`, en: `Showing {n} of ${total} tests` }, { n: `<span data-cuenta-filtrada data-neutro>${total}</span>` })}</p>
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="filtro-limpiar" hidden>${t({ es: "Quitar filtros", en: "Clear filters" })}</button>
</div>
</div>
<div class="hg-campos">${filtroVeredicto}</div>
</div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Esperado contra obtenido, por prueba", en: "Expected against obtained, by test" })}</caption>
${columnas([
  { es: "Prueba", en: "Test" },
  { es: "Qué se espera", en: "What is expected" },
  { es: "Qué se obtuvo", en: "What was obtained" },
  { es: "Desviación", en: "Deviation" },
  { es: "Veredicto", en: "Verdict" },
])}
<tbody>
${b.filas.map((f) => filaDeBrecha(f, existentes)).join("\n")}
</tbody>
</table>
<div class="hg-aviso es-neutro" data-sin-resultados hidden>
<h2>${t({ es: "Ninguna prueba cumple esos filtros", en: "No test matches those filters" })}</h2>
<p>${t({ es: "Quita un filtro o vuelve a «Todos» para ver todas las pruebas planeadas.", en: "Remove a filter or go back to “All” to see every planned test." })}</p>
</div>
</section>

<section class="hg-panel" aria-labelledby="alertas">
<div class="hg-panel-cab"><h2 id="alertas">${t({ es: "Vencidos y alertas", en: "Overdue and alerts" })}</h2><p class="hg-menor">${t({
    es: "Hallazgos fuera de plazo, fichas del plan vencidas en el catálogo, marcos con versión nueva y evidencia antigua.",
    en: "Findings past their deadline, plan records overdue in the catalog, frameworks with a new version and stale evidence.",
  })}</p></div>
${tablaDeAlertas(filasDeAlerta, { es: "Vencidos y alertas", en: "Overdue and alerts" })}
</section>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Todavía no hay brecha que medir", en: "There is no gap to measure yet" },
  `<p>${t({
    es: "La brecha compara lo planeado con lo confirmado. Emite el plan de un activo y confirma su primera evidencia para empezar.",
    en: "The gap compares what was planned with what was confirmed. Issue an asset's plan and confirm its first evidence to begin.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Calculando la brecha", en: "Calculating the gap" },
  `<p>${t({ es: "Se cruzan los planes con los sobres confirmados, comprobando la huella de cada uno.", en: "Plans are matched against confirmed envelopes, checking each one's fingerprint." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "La brecha no se pudo calcular", en: "The gap could not be calculated" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "Un plan cita una instantánea que no está", en: "A plan cites a snapshot that is missing" } },
    `<p>${tHtml(
      {
        es: "El plan {p} se emitió con una instantánea del catálogo que ya no se encuentra. Sin ella no se sabe qué se esperaba: restáurala y vuelve a calcular.",
        en: "Plan {p} was issued with a catalog snapshot that can no longer be found. Without it there is no knowing what was expected: restore it and calculate again.",
      },
      { p: dato(conPlan[0].a.plan.id) },
    )}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · brecha", en: "HackGuard · gap" },
    seccion: { id: "brecha", archivo: "brecha.html" },
    migas: [t({ es: "Brecha", en: "Gap" }), t({ es: "Esperado contra obtenido", en: "Expected against obtained" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 5 (aprobada): la brecha de todos los activos. Las cifras salen de los planes y de los sobres confirmados; datos sintéticos.",
        en: "Review 5 (approved): the gap across all assets. Figures come from the plans and the confirmed envelopes; synthetic data.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Cifras de arriba", en: "Figures at the top" },
        hacer: { es: "Léelas sin bajar", en: "Read them without scrolling" },
        ver: { es: "Cuánto de lo planeado se ejecutó, y cuánto pasó, falló o falta", en: "How much of what was planned was run, and how much passed, failed or is missing" },
      },
      {
        donde: { es: "Cobertura", en: "Coverage" },
        hacer: { es: "Cambia entre «Por activo», «Por familia» y «Por control»", en: "Switch between “By asset”, “By family” and “By control”" },
        ver: { es: "La misma cuenta agrupada de tres maneras; el portal dice que sin plan no hay brecha", en: "The same count grouped three ways; the portal says that without a plan there is no gap" },
      },
      {
        donde: { es: "Tabla por prueba", en: "Table by test" },
        hacer: { es: "Compara la fila de PR-SW-XSS-001 con la de PR-SW-TS-001", en: "Compare the PR-SW-XSS-001 row with the PR-SW-TS-001 row" },
        ver: { es: "Las dos sin alertas: una «no ejecutada» (no detectado) y otra «superada» (verificado)", en: "Both without alerts: one “not run” (not detected) and the other “passed” (verified)" },
      },
      {
        donde: { es: "Fila de PR-SW-TS-001", en: "The PR-SW-TS-001 row" },
        hacer: { es: "Lee la línea de lo que espera confirmación", en: "Read the line about what awaits confirmation" },
        ver: { es: "Un sobre nuevo sugiere «fallida», pero la fila sigue en «superada» hasta que lo confirmes", en: "A new envelope suggests “failed”, but the row stays “passed” until you confirm it" },
      },
      {
        donde: { es: "Vencidos y alertas", en: "Overdue and alerts" },
        hacer: { es: "Recorre las filas", en: "Scan the rows" },
        ver: { es: "Cada una dice qué objeto, qué pasa y desde cuándo, con su tipo en la esquina", en: "Each one says which object, what is happening and since when, with its type in the corner" },
      },
    ],
  });
}
