// tablero.html — pantalla 1 (C16, C18). La portada del operador: lo que pide su atención hoy (vencidos,
// evidencia por confirmar, propuestas por decidir y las alertas de RF-05.5), cómo va cada activo, los
// hallazgos sin cerrar por severidad, los controles por estado y el catálogo por vigencia. Arriba, la
// banda de la validación del instrumento (C18): si una comprobación falla, no se publica nada. Todo sale
// de nucleo/brecha.mjs y de datos/validacion.mjs con la fecha de consulta.
import { FAMILIAS, INSTANTANEA, PRUEBAS, archivoDeFicha } from "../datos/catalogo.mjs";
import { PROPUESTAS } from "../datos/gobierno.mjs";
import { ACTIVOS, LOTES, archivoDeActivo, archivoDeHallazgo } from "../datos/mundo.mjs";
import { VALIDACION, pasa } from "../datos/validacion.mjs";
import { brecha as calcular } from "../nucleo/brecha.mjs";
import { veredictoSugerido, vigencia } from "../nucleo/calculos.mjs";
import { fichaDe } from "../datos/catalogo.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, estado, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_ACTIVO, ESTADO_DE_CONTROL, ESTADO_DE_HALLAZGO, SEVERIDAD, VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { alertas, ejecutadas, plazoFechado, plural, tablaDeAlertas } from "../nucleo/piezas-de-brecha.mjs";

const POR_CONFIRMAR = { rol: "atencion", simbolo: "reloj", nombre: { es: "Por confirmar", en: "To confirm" } };
const POR_DECIDIR = { rol: "acento", simbolo: "firma", nombre: { es: "Por decidir", en: "To decide" } };
const SIN_PLAN = { rol: "neutro", simbolo: "vacio", nombre: { es: "Sin plan", en: "No plan" } };
const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;

/** Lista de cuentas: un rótulo con su forma y su cifra a la derecha. Los enlaces van en el pie del panel. */
const cuentas = (filas, rotulo) =>
  `<ul class="hg-cuentas" ${atributo("aria-label", rotulo)}>${filas.map(({ marca, n, atributos = "" }) => `<li ${atributos}>${marca}<span class="hg-cifra-menor" data-neutro>${n}</span></li>`).join("")}</ul>`;

export function tablero({ consulta, umbrales, existentes }) {
  const b = calcular(consulta, umbrales);
  const verdes = VALIDACION.filter(pasa).length;
  const validado = verdes === VALIDACION.length;
  const pc = b.porConfirmar;
  const porOrigen = (o) => PROPUESTAS.filter((p) => p.origen === o).length;

  const cifras = [
    `<li data-cifra="sin_cerrar"><span class="hg-cifra" data-neutro>${b.abiertos.length}</span><span>${t({ es: "hallazgos sin cerrar", en: "open findings" })}</span></li>`,
    `<li data-cifra="vencidos"><span class="hg-cifra" data-neutro>${b.vencidos.length}</span><span>${t({ es: "fuera de plazo", en: "past their deadline" })}</span></li>`,
    `<li data-cifra="por_confirmar"><span class="hg-cifra" data-neutro>${pc.sobres + pc.extractor}</span><span>${t({ es: "sobres por confirmar", en: "envelopes to confirm" })}</span></li>`,
    `<li data-cifra="por_decidir"><span class="hg-cifra" data-neutro>${PROPUESTAS.length}</span><span>${t({ es: "propuestas por decidir", en: "proposals to decide" })}</span></li>`,
  ].join("");

  // ---- Banda de la validación del instrumento (C18).
  const comprobaciones = VALIDACION.map(
    (c) => `<tr data-comprobacion="${c.id}" data-pasa="${pasa(c)}">
<td data-celda="id">${dato(c.id)}</td>
<td data-celda="principal"><p><strong>${t(c.nombre)}</strong></p>${c.casos.map((x) => `<p class="hg-menor">${t(x.que)}: ${neutro(`${x.obtenidos} / ${x.sembrados}`)}</p>`).join("")}</td>
<td data-celda="estado">${pasa(c) ? estado({ rol: "positivo", simbolo: "ok", nombre: { es: "En verde", en: "Green" } }) : chip({ rol: "falla", simbolo: "falla", nombre: { es: "En rojo", en: "Red" } })}</td>
</tr>`,
  ).join("\n");
  const banda = sello(
    validado
      ? { rol: "positivo", simbolo: "ok", nombre: { es: "El instrumento pasó su validación", en: "The instrument passed its validation" } }
      : { rol: "falla", simbolo: "falla", nombre: { es: "La validación del instrumento falló: no se publica nada", en: "The instrument validation failed: nothing is published" } },
    `<p>${t({
      es: `${verdes} de ${VALIDACION.length} comprobaciones en verde con la instantánea ${INSTANTANEA.version}. Corre antes de publicar cualquier cosa; si una falla, no se publica nada.`,
      en: `${verdes} of ${VALIDACION.length} checks green with snapshot ${INSTANTANEA.version}. It runs before anything is published; if one fails, nothing is published.`,
    })}</p>
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="alternar" aria-pressed="false">${t({ es: "Ver las comprobaciones", en: "See the checks" })}</button>
<div class="hg-revelado">
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Comprobaciones de la validación del instrumento", en: "Instrument validation checks" })}</caption>
${columnas([{ es: "Requisito", en: "Requirement" }, { es: "Qué se sembró y qué se obtuvo", en: "What was seeded and what was obtained" }, { es: "Resultado", en: "Result" }])}
<tbody>
${comprobaciones}
</tbody>
</table>
</div>`,
    `data-validacion="${validado ? "verde" : "rojo"}"`,
  );

  // ---- Pide tu atención: vencidos, lo que espera una persona y las alertas.
  const atencion = [
    ...alertas(b, { activos: ACTIVOS, archivoDeFicha, archivoDeHallazgo, existentes }).filter((f) => f.clase === "plazo"),
    ...LOTES.map((l) => {
      const fallidas = l.sobres.filter((s) => veredictoSugerido(s, fichaDe(s.prueba).regla) === "fallida").length;
      const herramienta = l.herramienta === "zap" ? "ZAP" : l.herramienta;
      return {
        clase: "lote",
        id: dato(l.id),
        tipo: POR_CONFIRMAR,
        que: `<p>${enlace("evidencia.html", t({ es: `${l.sobres.length} sobres de ${herramienta} esperan tu confirmación`, en: `${l.sobres.length} ${herramienta} envelopes await your confirmation` }), existentes)}</p><p class="hg-menor">${t({
          es: `${fallidas} ${plural(fallidas, "sugiere", "sugieren")} «fallida». Nada cuenta hasta que confirmes.`,
          en: `${fallidas} ${plural(fallidas, "suggests", "suggest")} “failed”. Nothing counts until you confirm.`,
        })}</p>`,
      };
    }),
    {
      clase: "propuestas",
      id: `<span class="hg-rotulo">${t({ es: "Bandeja", en: "Inbox" })}</span>`,
      tipo: POR_DECIDIR,
      que: `<p>${enlace("propuestas.html", t({ es: `${PROPUESTAS.length} propuestas por decidir`, en: `${PROPUESTAS.length} proposals to decide` }), existentes)}</p><p class="hg-menor">${t({
        es: `${porOrigen("investigador")} del investigador y ${porOrigen("extractor")} del extractor. Ninguna entra sin tu aprobación.`,
        en: `${porOrigen("investigador")} from the researcher and ${porOrigen("extractor")} from the extractor. None gets in without your approval.`,
      })}</p>`,
    },
    ...alertas(b, { activos: ACTIVOS, archivoDeFicha, archivoDeHallazgo, existentes }).filter((f) => f.clase !== "plazo"),
  ];

  // ---- Activos.
  const filasDeActivo = b.porActivo
    .map(({ id, a, plan, totales }) => {
      const abiertos = b.abiertos.filter(({ h }) => h.activo === id);
      const hallazgos = abiertos.length
        ? abiertos.map(({ h }) => `<p>${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)} ${chip(SEVERIDAD[h.severidad])}</p>`).join("")
        : `<p class="hg-menor">${t({ es: "Ninguno sin cerrar", en: "None open" })}</p>`;
      return `<tr data-cobertura="activo"${plan ? ` data-planeadas="${totales.planeadas}" data-ejecutadas="${totales.ejecutadas}"` : ""}>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeActivo(id)}">${t(a.nombre)}</a></p><p class="hg-menor">${a.familias.map((f) => t(FAMILIAS[f])).join(" · ")}</p></td>
<td data-celda="resultado">${plan ? ejecutadas(totales) : `<p class="hg-menor">${t({ es: "Sin alcance autorizado no hay plan.", en: "Without an authorized scope there is no plan." })}</p>`}</td>
<td>${hallazgos}</td>
<td data-celda="estado">${plan ? estado(ESTADO_DE_ACTIVO[a.estado]) : chip(SIN_PLAN)}</td>
</tr>`;
    })
    .join("\n");

  // ---- Hallazgos sin cerrar por severidad.
  const severidades = cuentas(
    Object.keys(SEVERIDAD).map((s) => ({ marca: estado(SEVERIDAD[s]), n: b.abiertos.filter(({ h }) => h.severidad === s).length, atributos: `data-severidad-cuenta="${s}"` })),
    { es: "Hallazgos sin cerrar por severidad", en: "Open findings by severity" },
  );
  const abiertos = b.abiertos
    .map(
      ({ h, p }) => `<li><p>${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)} ${chip(ESTADO_DE_HALLAZGO[h.estado])}</p><p>${t(h.titulo)}</p>${p ? plazoFechado(h, p) : ""}</li>`,
    )
    .join("");
  const aceptados = b.aceptados.length
    ? `<p class="hg-menor">${t({
        es: `Además, ${b.aceptados.length} con el riesgo aceptado: no ${b.aceptados.length === 1 ? "está cerrado, pero no pide" : "están cerrados, pero no piden"} trabajo; se ${b.aceptados.length === 1 ? "revisa" : "revisan"} en su fecha.`,
        en: `Also, ${b.aceptados.length} with the risk accepted: not closed, but asking for no work; ${b.aceptados.length === 1 ? "it is" : "they are"} reviewed on ${b.aceptados.length === 1 ? "its" : "their"} date.`,
      })}</p>`
    : "";

  // ---- Controles y catálogo.
  const controles = cuentas(
    ["con_fallas", "sin_evidencia", "evidencia_antigua", "con_evidencia_vigente"].map((e) => ({ marca: estado(ESTADO_DE_CONTROL[e]), n: b.controles.filter((c) => c.vista.estado === e).length })),
    { es: "Controles por estado", en: "Controls by status" },
  );
  const vigencias = PRUEBAS.map((p) => vigencia(p.verificada, consulta, umbrales).estado);
  const marcadas = PRUEBAS.filter((p) => p.revision === "marcada_para_revision").length;
  const catalogo = cuentas(
    [
      ...["vencido", "por_revisar", "vigente"].map((e) => ({ marca: estado(VIGENCIA[e]), n: vigencias.filter((v) => v === e).length })),
      { marca: estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Marcadas para revisión", en: "Flagged for review" } }), n: marcadas },
    ],
    { es: "Pruebas del catálogo por vigencia", en: "Catalog tests by freshness" },
  );

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Tablero", en: "Dashboard" })}</h1>
<p class="hg-bajada">${t({
    es: "Lo que pide tu atención hoy y cómo va cada activo. Solo cuenta lo que confirmó una persona.",
    en: "What needs your attention today and how each asset is doing. Only what a person confirmed counts.",
  })}</p>
<p class="hg-cabecera-meta" data-si="datos"><span>${tHtml({ es: "Consulta del {f}", en: "Queried on {f}" }, { f: dato(consulta) })}</span><span>${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)}</span></p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Lo que espera acción", en: "What awaits action" })}>${cifras}</ul>
</div>

<div class="hg-pila" data-si="datos">
${banda}

<div class="hg-tablero">
<div class="hg-pila">
<section class="hg-panel" aria-labelledby="atencion">
<div class="hg-panel-cab"><h2 id="atencion">${t({ es: "Pide tu atención", en: "Needs your attention" })}</h2><p class="hg-menor">${t({ es: "Lo más urgente primero.", en: "Most urgent first." })}</p></div>
${tablaDeAlertas(atencion, { es: "Lo que pide tu atención", en: "What needs your attention" })}
</section>

<section class="hg-panel" aria-labelledby="activos">
<div class="hg-panel-cab"><h2 id="activos">${t({ es: "Activos", en: "Assets" })}</h2><p class="hg-menor">${enlace("brecha.html", t({ es: "Ver la brecha", en: "See the gap" }), existentes)}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Activos", en: "Assets" })}</caption>
${columnas([{ es: "Activo", en: "Asset" }, { es: "Ejecutadas", en: "Run" }, { es: "Hallazgos sin cerrar", en: "Open findings" }, { es: "Estado", en: "Status" }])}
<tbody>
${filasDeActivo}
</tbody>
</table>
</section>
</div>

<div class="hg-pila">
<section class="hg-panel" aria-labelledby="hallazgos">
<div class="hg-panel-cab"><h2 id="hallazgos">${t({ es: "Hallazgos sin cerrar", en: "Open findings" })}</h2></div>
<div class="hg-panel-cuerpo">
${severidades}
<ul class="hg-abiertos">${abiertos}</ul>
${aceptados}
</div>
</section>

<section class="hg-panel" aria-labelledby="por-control">
<div class="hg-panel-cab"><h2 id="por-control">${t({ es: "Controles", en: "Controls" })}</h2><p class="hg-menor">${enlace("control.html", t({ es: "Vista por control", en: "Control view" }), existentes)}</p></div>
<div class="hg-panel-cuerpo">${controles}</div>
</section>

<section class="hg-panel" aria-labelledby="del-catalogo">
<div class="hg-panel-cab"><h2 id="del-catalogo">${t({ es: "Catálogo", en: "Catalog" })}</h2><p class="hg-menor">${enlace("catalogo.html", t({ es: `${PRUEBAS.length} pruebas`, en: `${PRUEBAS.length} tests` }), existentes)}</p></div>
<div class="hg-panel-cuerpo">${catalogo}</div>
</section>
</div>
</div>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Todavía no hay nada que vigilar", en: "There is nothing to watch yet" },
  `<p>${t({
    es: "Registra tu primer activo con su dueño, su alcance autorizado y sus reglas de enfrentamiento. Desde ahí, el tablero te dirá qué falta.",
    en: "Register your first asset with its owner, its authorized scope and its rules of engagement. From there, the dashboard will tell you what is missing.",
  })}</p>${enlace(archivoDeActivo(Object.keys(ACTIVOS)[2]), t({ es: "Ver un activo sin autorización", en: "See an asset without authorization" }), existentes)}`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Abriendo el tablero", en: "Opening the dashboard" },
  `<p>${t({ es: "Se valida el instrumento y se calcula la brecha antes de mostrar una sola cifra.", en: "The instrument is validated and the gap calculated before a single figure is shown." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "La validación del instrumento falló", en: "The instrument validation failed" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "RF-10.3 en rojo: un cierre sin re-prueba pasó", en: "RF-10.3 red: a closure without a retest got through" } },
    `<p>${t({
      es: "Una de las semillas de cierres prohibidos no se rechazó. Mientras falle, no se publica ninguna instantánea ni la vitrina, y las cifras del tablero no se muestran: corrige el libro y vuelve a correr la validación.",
      en: "One of the forbidden-closure seeds was not rejected. While it fails, no snapshot or showcase is published, and the dashboard's figures are not shown: fix the ledger and run the validation again.",
    })}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · tablero", en: "HackGuard · dashboard" },
    seccion: { id: "tablero", archivo: "tablero.html" },
    migas: [t({ es: "Tablero", en: "Dashboard" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 5 (aprobada): el tablero, la portada de la aplicación. Resume todo lo anterior con las mismas cuentas; datos sintéticos.",
        en: "Review 5 (approved): the dashboard, the application's home. It sums up everything before it with the same counts; synthetic data.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Toda la pantalla", en: "The whole screen" },
        hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" },
        ver: { es: "Sabes qué es lo urgente antes de leer una fila: el vencido arriba, en rojo y con su forma", en: "You know what is urgent before reading a row: the overdue one on top, in red and with its shape" },
      },
      {
        donde: { es: "Banda verde", en: "Green band" },
        hacer: { es: "Pulsa «Ver las comprobaciones»", en: "Press “See the checks”" },
        ver: { es: `Las ${VALIDACION.length} comprobaciones con lo sembrado y lo obtenido; si una fallara, nada se publica`, en: `The ${VALIDACION.length} checks with what was seeded and what was obtained; if one failed, nothing would be published` },
      },
      {
        donde: { es: "Franja de sala · Error", en: "Room strip · Error" },
        hacer: { es: "Pulsa «Error»", en: "Press “Error”" },
        ver: { es: "La validación en rojo bloquea el tablero entero y dice qué falló", en: "The validation in red blocks the whole dashboard and says what failed" },
      },
      {
        donde: { es: "Columna de la derecha", en: "Right-hand column" },
        hacer: { es: "Compara las tres cuentas", en: "Compare the three counts" },
        ver: { es: "Hallazgos por severidad, controles por estado y catálogo por vigencia, cada fila con su forma", en: "Findings by severity, controls by status and catalog by freshness, each row with its shape" },
      },
      {
        donde: { es: "En el teléfono", en: "On the phone" },
        hacer: { es: "Desplázate de arriba abajo", en: "Scroll top to bottom" },
        ver: { es: "Primero lo urgente, después los activos y al final las cuentas; nada se sale de la pantalla", en: "Urgent things first, then the assets and the counts last; nothing runs off the screen" },
      },
    ],
  });
}
