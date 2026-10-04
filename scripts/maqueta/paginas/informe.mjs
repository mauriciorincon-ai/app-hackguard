// informe.html — pantalla 13 (C16, RF-05.6). El informe de brecha con la estructura de § 12 de la
// especificación: resumen para quien decide, cobertura, esperado contra obtenido, hallazgos, vista por
// control, alertas, riesgos aceptados y ficha de reproducibilidad (con la validación del instrumento,
// C18). Se lee en el navegador y se imprime: la hoja de impresión deja solo el informe, en papel claro
// aunque la pantalla esté en oscuro. Todo sale de nucleo/brecha.mjs; la huella del informe se calcula.
import { CONTROLES, FAMILIAS, INSTANTANEA, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { VALIDACION, pasa } from "../datos/validacion.mjs";
import { ACTIVOS, HALLAZGOS, SOBRES, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { brecha as calcular } from "../nucleo/brecha.mjs";
import { huellaDe } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, estado, huella, lista, par, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_HALLAZGO, SEVERIDAD } from "../nucleo/estados.mjs";
import { atributo, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { alertas, desglose, ejecutadas, estadoDeControl, evidenciaFechada, plazoFechado, plural, revisionFechada, tablaDeAlertas } from "../nucleo/piezas-de-brecha.mjs";
import { filaDeBrecha } from "./brecha.mjs";
import { archivoDeControl } from "./control.mjs";

const SECCIONES = [
  { id: "informe-resumen", nombre: { es: "Resumen para quien decide", en: "Summary for the decision-maker" } },
  { id: "informe-cobertura", nombre: { es: "Cobertura", en: "Coverage" } },
  { id: "informe-esperado", nombre: { es: "Esperado contra obtenido", en: "Expected against obtained" } },
  { id: "informe-hallazgos", nombre: { es: "Hallazgos", en: "Findings" } },
  { id: "informe-controles", nombre: { es: "Vista por control", en: "Control view" } },
  { id: "informe-alertas", nombre: { es: "Alertas", en: "Alerts" } },
  { id: "informe-riesgos", nombre: { es: "Riesgos aceptados", en: "Accepted risks" } },
  { id: "informe-ficha", nombre: { es: "Ficha de reproducibilidad", en: "Reproducibility record" } },
];
const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;
const ORDEN_DE_ESTADO = ["abierto", "corregido", "re_probado", "aceptado_con_riesgo", "cerrado", "cerrado_por_eliminacion", "no_reproducible"];

function seccion(i, cuerpo, bajada) {
  const s = SECCIONES[i];
  return `<section class="hg-informe-seccion" id="${s.id}" aria-labelledby="${s.id}-t">
<h2 id="${s.id}-t"><span class="hg-informe-num" data-neutro>${i + 1}</span>${t(s.nombre)}</h2>
${bajada ? `<p class="hg-menor">${t(bajada)}</p>` : ""}
${cuerpo}
</section>`;
}

/** Estado de un hallazgo en una fila: el cierre por re-prueba va en línea; lo demás, en chip. */
const estadoDeHallazgo = (e) => (e === "cerrado" ? estado(ESTADO_DE_HALLAZGO[e]) : chip(ESTADO_DE_HALLAZGO[e]));

export function informe({ consulta, umbrales, existentes }) {
  const b = calcular(consulta, umbrales);
  const r = b.resumen;
  const graves = b.abiertos.filter(({ h }) => h.severidad === "critico" || h.severidad === "alto");
  const sinEvidencia = b.controles.filter((c) => c.vista.estado === "sin_evidencia");
  const conPlan = b.porActivo.filter((x) => x.plan);
  const verdes = VALIDACION.filter(pasa).length;
  const huellaDelCatalogo = huellaDe({ version: INSTANTANEA.version, pruebas: PRUEBAS.map((p) => p.id).join(",") });
  const usados = b.filas.filter((f) => f.ultimo).map((f) => f.ultimo);
  // La huella del informe: lo que dice, en forma canónica. Dos corridas sobre los mismos datos dan la misma.
  const huellaDelInforme = huellaDe({
    fecha: consulta,
    instantanea: INSTANTANEA.version,
    pruebas: b.filas.map((f) => `${f.ficha.id}:${f.veredicto}:${f.ultimo?.id ?? "-"}`).join(","),
    controles: b.controles.map((c) => `${c.id}:${c.vista.estado}`).join(","),
    hallazgos: HALLAZGOS.map((h) => `${h.id}:${h.estado}`).join(","),
  });

  // ---- 1. Resumen.
  const vencido = b.vencidos[0];
  const frase = {
    es:
      `De ${r.planeadas} pruebas planeadas se ejecutaron ${r.ejecutadas}: ${r.superadas} superadas y ${r.fallidas} fallidas. ` +
      `Hay ${b.abiertos.length} ${plural(b.abiertos.length, "hallazgo", "hallazgos")} sin cerrar` +
      (vencido ? `, y el más atrasado lleva ${vencido.p.atraso} ${plural(vencido.p.atraso, "día", "días")} vencido. ` : ". ") +
      `${sinEvidencia.length} de ${b.controles.length} controles aplicables no tienen evidencia.`,
    en:
      `Of ${r.planeadas} planned tests, ${r.ejecutadas} were run: ${r.superadas} passed and ${r.fallidas} failed. ` +
      `There ${b.abiertos.length === 1 ? "is" : "are"} ${b.abiertos.length} open ${plural(b.abiertos.length, "finding", "findings")}` +
      (vencido ? `, and the most overdue is ${vencido.p.atraso} ${plural(vencido.p.atraso, "day", "days")} past its deadline. ` : ". ") +
      `${sinEvidencia.length} of ${b.controles.length} applicable controls have no evidence.`,
  };
  const cifras = `<ul class="hg-resumen" ${atributo("aria-label", { es: "Cifras del resumen", en: "Summary figures" })}>
<li data-cifra="graves"><span class="hg-cifra" data-neutro>${graves.length}</span><span>${t({ es: "críticos o altos sin cerrar", en: "critical or high still open" })}</span></li>
<li data-cifra="vencidos"><span class="hg-cifra" data-neutro>${b.vencidos.length}</span><span>${t({ es: "fuera de plazo", en: "past their deadline" })}</span></li>
<li data-cifra="sin_evidencia"><span class="hg-cifra" data-neutro>${sinEvidencia.length}</span><span>${t({ es: "controles sin evidencia", en: "controls with no evidence" })}</span></li>
<li data-cifra="ejecutadas"><span class="hg-cifra" data-neutro>${r.ejecutadas} / ${r.planeadas}</span><span>${t({ es: "pruebas ejecutadas", en: "tests run" })}</span></li>
</ul>`;
  const decidir = [
    ...b.vencidos.map(({ h, p }) => ({
      es: `${h.id} (${SEVERIDAD[h.severidad].nombre.es.toLowerCase()}) lleva ${p.atraso} ${plural(p.atraso, "día", "días")} vencido: corregir y re-probar, o decidir un cierre alternativo justificado.`,
      en: `${h.id} (${SEVERIDAD[h.severidad].nombre.en.toLowerCase()}) is ${p.atraso} ${plural(p.atraso, "day", "days")} overdue: fix and retest, or decide a justified alternative closure.`,
    })),
    ...sinEvidencia.map((c) => ({
      es: `${c.id} no tiene evidencia: ${c.totales.planeadas ? "sus pruebas no se han ejecutado" : "ninguna prueba de los planes lo cubre"}.`,
      en: `${c.id} has no evidence: ${c.totales.planeadas ? "its tests have not been run" : "no test in the plans covers it"}.`,
    })),
    ...b.aceptados.map(({ h, r: rev }) => ({
      es: `${h.id} tiene el riesgo aceptado; se revisa el ${rev.fecha}.`,
      en: `${h.id} has its risk accepted; it is reviewed on ${rev.fecha}.`,
    })),
  ];
  const s1 = seccion(0, `<p class="hg-destacado">${t(frase)}</p>
${cifras}
<h3>${t({ es: "Lo que pide una decisión", en: "What calls for a decision" })}</h3>
${lista(decidir)}`);

  // ---- 2. Cobertura.
  const s2 = seccion(
    1,
    `<h3>${t({ es: "Por familia", en: "By family" })}</h3>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Cobertura por familia", en: "Coverage by family" })}</caption>
${columnas([{ es: "Familia", en: "Family" }, { es: "Ejecutadas", en: "Run" }, { es: "Resultado", en: "Outcome" }])}
<tbody>
${b.porFamilia
  .map(
    ({ familia, totales }) => `<tr data-cobertura="familia" data-planeadas="${totales.planeadas}" data-ejecutadas="${totales.ejecutadas}">
<td data-celda="principal"><p><strong>${t(FAMILIAS[familia])}</strong></p></td>
<td data-celda="resultado">${ejecutadas(totales)}</td>
<td>${desglose(totales)}</td>
</tr>`,
  )
  .join("\n")}
</tbody>
</table>
<h3>${t({ es: "Por control", en: "By control" })}</h3>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Cobertura por control", en: "Coverage by control" })}</caption>
${columnas([{ es: "Control", en: "Control" }, { es: "Ejecutadas", en: "Run" }, { es: "Resultado", en: "Outcome" }])}
<tbody>
${b.controles
  .map(
    (c) => `<tr>
<td data-celda="principal"><p>${enlace(archivoDeControl(c.id), `<span class="hg-dato" data-neutro>${c.id}</span>`, existentes)}</p><p class="hg-menor">${t(CONTROLES[c.id])}</p></td>
<td data-celda="resultado">${c.totales.planeadas ? ejecutadas(c.totales) : `<p class="hg-menor">${t({ es: "Ninguna prueba en los planes", en: "No test in the plans" })}</p>`}</td>
<td>${c.totales.planeadas ? desglose(c.totales) : `<p class="hg-menor">—</p>`}</td>
</tr>`,
  )
  .join("\n")}
</tbody>
</table>`,
    {
      es: `Planeadas contra ejecutadas en los ${conPlan.length} activos con plan. Una prueba sin constancia de que corrió cuenta como no ejecutada.`,
      en: `Planned against run across the ${conPlan.length} assets with a plan. A test with no proof that it ran counts as not run.`,
    },
  );

  // ---- 3. Esperado contra obtenido.
  const s3 = seccion(
    2,
    `<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Esperado contra obtenido, por prueba", en: "Expected against obtained, by test" })}</caption>
${columnas([{ es: "Prueba", en: "Test" }, { es: "Qué se espera", en: "What is expected" }, { es: "Qué se obtuvo", en: "What was obtained" }, { es: "Desviación", en: "Deviation" }, { es: "Veredicto", en: "Verdict" }])}
<tbody>
${b.filas.map((f) => filaDeBrecha(f, existentes, { filtrable: false })).join("\n")}
</tbody>
</table>`,
    { es: "Solo cuenta el último sobre confirmado de cada prueba; lo que espera confirmación se nombra, pero no cuenta.", en: "Only each test's latest confirmed envelope counts; what awaits confirmation is named, but does not count." },
  );

  // ---- 4. Hallazgos.
  const ordenados = [...HALLAZGOS].sort((x, y) => ORDEN_DE_ESTADO.indexOf(x.estado) - ORDEN_DE_ESTADO.indexOf(y.estado) || x.id.localeCompare(y.id));
  const plazos = Object.fromEntries(b.abiertos.filter(({ p }) => p).map(({ h, p }) => [h.id, p]));
  const revisiones = Object.fromEntries(b.aceptados.map(({ h, r: rev }) => [h.id, rev]));
  const filasDeHallazgo = ordenados
    .map((h) => {
      const tiempo = plazos[h.id]
        ? plazoFechado(h, plazos[h.id])
        : revisiones[h.id]
          ? revisionFechada(h, revisiones[h.id])
          : `<span class="hg-menor">${tHtml({ es: "Cerrado el {f} por re-prueba {s}.", en: "Closed on {f} by retest {s}." }, { f: dato(h.cierre), s: dato(h.sobre_reprueba) })}</span>`;
      return `<tr data-hallazgo="${h.id}" data-estado-hallazgo="${h.estado}">
<td data-celda="id">${dato(h.id)}</td>
<td data-celda="principal"><p>${enlace(archivoDeHallazgo(h.id), t(h.titulo), existentes)}</p><p class="hg-menor">${t(ACTIVOS[h.activo].nombre)} · ${dato(h.prueba)}</p></td>
<td><p>${chip(SEVERIDAD[h.severidad])}</p></td>
<td>${tiempo}</td>
<td data-celda="estado">${estadoDeHallazgo(h.estado)}</td>
</tr>`;
    })
    .join("\n");
  const porEstado = ORDEN_DE_ESTADO.filter((e) => HALLAZGOS.some((h) => h.estado === e))
    .map((e) => {
      const n = HALLAZGOS.filter((h) => h.estado === e).length;
      return `<li>${estado({ ...ESTADO_DE_HALLAZGO[e], nombre: { es: `${n} · ${ESTADO_DE_HALLAZGO[e].nombre.es}`, en: `${n} · ${ESTADO_DE_HALLAZGO[e].nombre.en}` } })}</li>`;
    })
    .join("");
  const s4 = seccion(
    3,
    `<ul class="hg-desglose">${porEstado}</ul>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Hallazgos por estado y severidad", en: "Findings by status and severity" })}</caption>
${columnas([{ es: "Hallazgo", en: "Finding" }, { es: "Qué es", en: "What it is" }, { es: "Severidad", en: "Severity" }, { es: "Plazo o revisión", en: "Deadline or review" }, { es: "Estado", en: "Status" }])}
<tbody>
${filasDeHallazgo}
</tbody>
</table>`,
    { es: "Por estado y severidad, con su plazo. Solo una re-prueba superada y confirmada cierra un hallazgo.", en: "By status and severity, with its deadline. Only a passed, confirmed retest closes a finding." },
  );

  // ---- 5. Vista por control.
  const s5 = seccion(
    4,
    `<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Vista por control", en: "Control view" })}</caption>
${columnas([{ es: "Control", en: "Control" }, { es: "Qué exige", en: "What it requires" }, { es: "Evidencia", en: "Evidence" }, { es: "Estado", en: "Status" }])}
<tbody>
${b.controles
  .map((c) => {
    const sobres = c.filas.filter((f) => f.ultimo).length;
    const evidencia = c.ultima
      ? `<p>${evidenciaFechada(c.ultima, c.edad)}</p><p class="hg-menor">${t({ es: `${sobres} ${plural(sobres, "prueba", "pruebas")} con sobre confirmado`, en: `${sobres} ${plural(sobres, "test", "tests")} with a confirmed envelope` })}</p>`
      : `<p class="hg-menor">${t({ es: "Ninguna", en: "None" })}</p>`;
    return `<tr>
<td data-celda="id">${enlace(archivoDeControl(c.id), dato(c.id), existentes)}</td>
<td data-celda="principal"><p>${t(CONTROLES[c.id])}</p></td>
<td>${evidencia}</td>
<td data-celda="estado">${estadoDeControl(c.id, c.vista.estado)}</td>
</tr>`;
  })
  .join("\n")}
</tbody>
</table>`,
    { es: "Evidencia organizada para quien deba evaluarla: no mide el nivel de aseguramiento ni certifica cumplimiento.", en: "Evidence organized for whoever must assess it: it does not measure assurance or certify compliance." },
  );

  // ---- 6. Alertas (los vencidos ya están en el resumen y en los hallazgos).
  const filasDeAlerta = alertas(b, { activos: ACTIVOS, archivoDeFicha, archivoDeHallazgo, existentes }).filter((f) => f.clase !== "plazo");
  const s6 = seccion(
    5,
    filasDeAlerta.length ? tablaDeAlertas(filasDeAlerta, SECCIONES[5].nombre) : `<p>${t({ es: "Ninguna alerta en esta fecha.", en: "No alerts on this date." })}</p>`,
    { es: "Fichas del plan vencidas en el catálogo, marcos con versión nueva y evidencia antigua.", en: "Plan records overdue in the catalog, frameworks with a new version and stale evidence." },
  );

  // ---- 7. Riesgos aceptados.
  const s7 = seccion(
    6,
    b.aceptados.length
      ? b.aceptados
          .map(
            ({ h, r: rev }) => `<div class="hg-caja">
<p class="hg-caja-titulo">${dato(h.id)} ${enlace(archivoDeHallazgo(h.id), t(h.titulo), existentes)}</p>
<p>${chip(SEVERIDAD[h.severidad])}</p>
<p>${t(h.aceptacion.justificacion)}</p>
<p>${revisionFechada(h, rev)}</p>
</div>`,
          )
          .join("\n")
      : `<p>${t({ es: "Ningún riesgo aceptado.", en: "No accepted risk." })}</p>`,
    { es: "Con su justificación y la fecha en que toca revisarlos.", en: "With their justification and the date they are due for review." },
  );

  // ---- 8. Ficha de reproducibilidad.
  const planes = conPlan.map(({ id, a }) => `<span>${enlace(archivoDePlan(id), dato(a.plan.id), existentes)} <span class="hg-menor">· ${t(a.nombre)} · ${a.plan.fecha}</span></span>`).join("");
  const s8 = seccion(
    7,
    `<dl class="hg-propiedades hg-propiedades-en-columnas">
${par({ es: "Fecha de evaluación", en: "Assessment date" }, dato(consulta))}
${par({ es: "Instantánea del catálogo", en: "Catalog snapshot" }, `<span>${dato(INSTANTANEA.version)}</span>${huella(huellaDelCatalogo)}`)}
${par({ es: "Planes", en: "Plans" }, planes)}
${par({ es: "Sobres que cuentan", en: "Envelopes that count" }, `<span>${t({ es: `${usados.length} confirmados, de ${SOBRES.length} en el libro`, en: `${usados.length} confirmed, of ${SOBRES.length} in the ledger` })}</span>`)}
${par({ es: "Huella de este informe", en: "This report's fingerprint" }, huella(huellaDelInforme))}
${par(
  { es: "Validación del instrumento", en: "Instrument validation" },
  `<span>${estado(verdes === VALIDACION.length ? { rol: "positivo", simbolo: "ok", nombre: { es: `${verdes} de ${VALIDACION.length} en verde`, en: `${verdes} of ${VALIDACION.length} green` } } : { rol: "falla", simbolo: "falla", nombre: { es: `${VALIDACION.length - verdes} en rojo`, en: `${VALIDACION.length - verdes} red` } })}</span>`,
)}
</dl>
<p class="hg-menor">${t({
      es: "Dos corridas sobre los mismos datos producen este informe byte a byte: la fecha de evaluación es una entrada, no el reloj.",
      en: "Two runs over the same data produce this report byte for byte: the assessment date is an input, not the clock.",
    })}</p>`,
  );

  const indice = SECCIONES.map((s, i) => `<li><a href="#${s.id}">${i + 1}. ${t(s.nombre)}</a></li>`).join("");

  const contenido = `<div class="hg-trabajo" data-si="datos">
<article class="hg-informe" id="informe" ${atributo("aria-label", { es: "Informe de brecha", en: "Gap report" })}>
<header class="hg-informe-cab">
<p class="hg-rotulo">${t({ es: "HackGuard · informe de brecha", en: "HackGuard · gap report" })}</p>
<h1>${t({ es: "Todos los activos", en: "All assets" })}</h1>
<p class="hg-cabecera-meta"><span>${tHtml({ es: "Evaluado el {f}", en: "Assessed on {f}" }, { f: dato(consulta) })}</span><span>${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)}</span><span>${huella(huellaDelInforme)}</span></p>
</header>
${s1}
${s2}
${s3}
${s4}
${s5}
${s6}
${s7}
${s8}
</article>

<aside class="hg-carril" ${atributo("aria-label", { es: "Acción y contenido del informe", en: "Report action and contents" })}>
<section class="hg-tarjeta hg-tarjeta-accion" aria-labelledby="llevar">
<h2 class="hg-tarjeta-titulo" id="llevar">${t({ es: "Llevártelo", en: "Take it with you" })}</h2>
<p>${t({ es: "Sale solo el informe, en papel claro, con las tablas completas.", en: "Only the report comes out, on light paper, with complete tables." })}</p>
<button type="button" class="hg-boton hg-boton-primario" data-controlador="imprimir">${t({ es: "Imprimir o guardar como PDF", en: "Print or save as PDF" })}</button>
<p class="hg-menor" role="status" data-aviso-impresion hidden>${t({
    es: "Se abrió el diálogo de impresión del navegador. Elige «Guardar como PDF» para llevártelo como archivo.",
    en: "The browser's print dialog opened. Choose “Save as PDF” to take it as a file.",
  })}</p>
</section>
<nav class="hg-tarjeta" aria-labelledby="indice">
<h2 class="hg-tarjeta-titulo" id="indice">${t({ es: "Contenido", en: "Contents" })}</h2>
<ol class="hg-indice">${indice}</ol>
</nav>
<section class="hg-tarjeta" aria-labelledby="activos-del-informe">
<h2 class="hg-tarjeta-titulo" id="activos-del-informe">${t({ es: "Activos", en: "Assets" })}</h2>
<dl class="hg-propiedades">
${b.porActivo.map(({ id, a, plan }) => par(a.nombre, plan ? enlace(archivoDeActivo(id), dato(id), existentes) : `<span>${dato(id)} <span class="hg-menor">· ${t({ es: "sin plan", en: "no plan" })}</span></span>`)).join("\n")}
</dl>
</section>
</aside>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Todavía no hay informe", en: "There is no report yet" },
  `<p>${t({
    es: "El informe resume la brecha de lo planeado contra lo confirmado. Emite un plan y confirma su primera evidencia para generarlo.",
    en: "The report summarizes the gap between what was planned and what was confirmed. Issue a plan and confirm its first evidence to generate it.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Armando el informe", en: "Building the report" },
  `<p>${t({ es: "Se calcula la brecha y se firma el informe con su huella.", en: "The gap is calculated and the report is sealed with its fingerprint." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "El informe no se generó", en: "The report was not generated" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "La validación del instrumento falló", en: "The instrument validation failed" } },
    `<p>${t({
      es: "Una comprobación de las semillas no dio lo esperado. Mientras falle, no se genera ni se publica ningún informe: corrige la causa y vuelve a correr la validación.",
      en: "One check against the seeds did not give the expected result. While it fails, no report is generated or published: fix the cause and run the validation again.",
    })}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · informe", en: "HackGuard · report" },
    seccion: { id: "brecha", archivo: "informe.html" },
    migas: [t({ es: "Brecha", en: "Gap" }), t({ es: "Informe", en: "Report" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 5 (aprobada): el informe de brecha con las ocho secciones de la especificación. Se lee aquí y se imprime; imprímelo para ver la hoja.",
        en: "Review 5 (approved): the gap report with the specification's eight sections. It reads here and it prints; print it to see the sheet.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Sección 1", en: "Section 1" },
        hacer: { es: "Léela como si fueras quien decide", en: "Read it as if you were the decision-maker" },
        ver: { es: "En una frase y cuatro cifras sabes cómo está todo y qué pide decisión", en: "In one sentence and four figures you know where things stand and what needs a decision" },
      },
      {
        donde: { es: "Carril · Contenido", en: "Rail · Contents" },
        hacer: { es: "Salta a «Ficha de reproducibilidad»", en: "Jump to “Reproducibility record”" },
        ver: { es: "Fecha, instantánea, planes, huella del informe y la validación del instrumento en verde", en: "Date, snapshot, plans, the report's fingerprint and the instrument validation in green" },
      },
      {
        donde: { es: "Botón «Imprimir o guardar como PDF»", en: "“Print or save as PDF” button" },
        hacer: { es: "Púlsalo con el tema oscuro puesto y mira la vista previa", en: "Press it with the dark theme on and look at the preview" },
        ver: { es: "Solo el informe, en papel claro y tinta oscura, sin navegación ni sala; las tablas como tablas", en: "Only the report, light paper and dark ink, with no navigation or room strip; tables as tables" },
      },
      {
        donde: { es: "Sección 4", en: "Section 4" },
        hacer: { es: `Recorre los ${HALLAZGOS.length} hallazgos`, en: `Go through the ${HALLAZGOS.length} findings` },
        ver: { es: "Abiertos primero; cada uno con su plazo, su revisión o la re-prueba que lo cerró", en: "Open ones first; each with its deadline, its review or the retest that closed it" },
      },
    ],
  });
}
