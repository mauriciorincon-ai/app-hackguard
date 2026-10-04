// index.html — la entrada a la maqueta: las pantallas del H1 en el orden de la orden de
// diseño, con lo que muestra cada una, sus funcionalidades y el estado de su mirada, y la puerta a la
// aplicación (el tablero). Es una página de la sala, no del producto: el logo de la aplicación lleva al
// tablero, y la franja de sala de cada pantalla trae de vuelta aquí.
import { archivoDeFicha } from "../datos/catalogo.mjs";
import { ACTIVOS, HALLAZGOS, ORDEN_DE_HALLAZGOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { estado } from "../nucleo/componentes.mjs";
import { atributo, neutro, t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";

const ACTIVO = Object.keys(ACTIVOS)[0];
const APROBADA = { rol: "positivo", simbolo: "ok", nombre: { es: "Aprobada", en: "Approved" } };

// Las pantallas de la orden de diseño, en su orden. El kit del sistema va aparte, al pie.
const PANTALLAS = [
  { archivo: "tablero.html", nombre: { es: "Tablero", en: "Dashboard" }, c: "C16 · C18",
    que: { es: "Lo que pide atención hoy, cómo va cada activo y la validación del instrumento.", en: "What needs attention today, how each asset is doing and the instrument validation." } },
  { archivo: "catalogo.html", nombre: { es: "Catálogo", en: "Catalog" }, c: "C1 · C3",
    que: { es: "Las pruebas de todas las familias, con filtros que funcionan.", en: "Tests for every family, with working filters." } },
  { archivo: archivoDeFicha("PR-IA-PINJ-001"), nombre: { es: "Ficha de prueba", en: "Test record" }, c: "C1 · C3 · C6",
    que: { es: "Qué verifica, resultado esperado, regla de veredicto, marco y controles; una por prueba.", en: "What it verifies, expected result, verdict rule, framework and controls; one per test." } },
  { archivo: "marcos.html", nombre: { es: "Marcos y versiones", en: "Frameworks and versions" }, c: "C3 · C4",
    que: { es: "Versión vigente, aviso de versión nueva y mapa de equivalencias.", en: "Current version, new-version notice and equivalence map." } },
  { archivo: "controles.html", nombre: { es: "Controles", en: "Controls" }, c: "C5",
    que: { es: "El Anexo A con resumen propio y las pruebas que dan evidencia a cada control.", en: "Annex A with in-house summaries and the tests that give evidence to each control." } },
  { archivo: "propuestas.html", nombre: { es: "Bandeja de propuestas", en: "Proposal inbox" }, c: "C2 · C7 · C15",
    que: { es: "Lo que proponen el investigador y el extractor, para aprobar, rechazar o separar.", en: "What the researcher and the extractor propose, to approve, reject or split." } },
  { archivo: archivoDeActivo(ACTIVO), nombre: { es: "Activo", en: "Asset" }, c: "C8",
    que: { es: "Dueño y proveedor, perfil, alcance autorizado y reglas de enfrentamiento.", en: "Owner and provider, profile, authorized scope and rules of engagement." } },
  { archivo: archivoDePlan(ACTIVO), nombre: { es: "Plan", en: "Plan" }, c: "C9 · C10",
    que: { es: "Planeadas y excluidas con su razón, cobertura por control y paquete de ejecución.", en: "Planned and excluded with their reasons, coverage by control and execution package." } },
  { archivo: "evidencia.html", nombre: { es: "Carga y confirmación", en: "Intake and confirmation" }, c: "C11 · C14 · C15",
    que: { es: "Las tres vías de carga y la confirmación por lote, con todas las fallas a la vista.", en: "The three intake routes and batch confirmation, with every failure in plain view." } },
  { archivo: archivoDeHallazgo(ORDEN_DE_HALLAZGOS[0]), nombre: { es: "Hallazgo", en: "Finding" }, c: "C12 · C13",
    que: { es: `Recorrido de cierre, severidad, plazo y salidas posibles; ${HALLAZGOS.length}, uno por momento.`, en: `Closure progress, severity, deadline and possible outcomes; ${HALLAZGOS.length}, one per moment.` } },
  { archivo: "brecha.html", nombre: { es: "Brecha", en: "Gap" }, c: "C16",
    que: { es: "Esperado contra obtenido y cobertura por activo, familia y control.", en: "Expected against obtained and coverage by asset, family and control." } },
  { archivo: "control.html", nombre: { es: "Vista por control", en: "Control view" }, c: "C17",
    que: { es: "Los cuatro estados de un control y la cadena de cierre de sus hallazgos.", en: "A control's four statuses and the closure chain of its findings." } },
  { archivo: "informe.html", nombre: { es: "Informe", en: "Report" }, c: "C16 · C18",
    que: { es: "Las ocho secciones de la especificación; se lee aquí y se imprime.", en: "The specification's eight sections; it reads here and it prints." } },
];

export function index({ consulta, existentes }) {
  const filas = PANTALLAS.map(
    (p, i) => `<tr>
<td data-celda="id"><span class="hg-dato" data-neutro>${String(i + 1).padStart(2, "0")}</span></td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${p.archivo}">${t(p.nombre)}</a></p><p class="hg-menor">${t(p.que)}</p></td>
<td><p class="hg-menor">${neutro(p.c)}</p></td>
<td data-celda="estado">${estado(APROBADA)}</td>
</tr>`,
  ).join("\n");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Maqueta de HackGuard", en: "HackGuard mockup" })}</h1>
<p class="hg-bajada">${t({
    es: `Las ${PANTALLAS.length} pantallas del primer horizonte, con datos sintéticos. Entra por el tablero como entraría el operador, o abre cada pantalla desde esta lista.`,
    en: `The ${PANTALLAS.length} screens of the first horizon, with synthetic data. Come in through the dashboard as the operator would, or open each screen from this list.`,
  })}</p>
</div>
<div><a class="hg-boton hg-boton-primario" href="tablero.html">${t({ es: "Entrar a la aplicación", en: "Enter the application" })}</a></div>
</div>

<section class="hg-panel" aria-labelledby="pantallas">
<div class="hg-panel-cab"><h2 id="pantallas">${t({ es: "Pantallas", en: "Screens" })}</h2><p class="hg-menor">${t({
    es: `En el orden de la orden de diseño. Las ${PANTALLAS.length}, aprobadas una por una en las miradas 1 a 5 y en conjunto en G-Diseño.`,
    en: `In the design order's sequence. All ${PANTALLAS.length}, approved one by one in reviews 1 to 5 and as a whole at the design gate.`,
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pantallas de la maqueta", en: "Mockup screens" })}</caption>
<thead><tr><th scope="col">${t({ es: "N.º", en: "No." })}</th><th scope="col">${t({ es: "Pantalla", en: "Screen" })}</th><th scope="col">${t({ es: "Funciones", en: "Features" })}</th><th scope="col">${t({ es: "Mirada", en: "Review" })}</th></tr></thead>
<tbody>
${filas}
</tbody>
</table>
<p class="hg-panel-pie">${t({ es: "El sistema de diseño completo, pieza por pieza:", en: "The full design system, piece by piece:" })} <a href="kit.html">${t({ es: "kit de componentes", en: "component kit" })}</a>.</p>
</section>

<section class="hg-panel" aria-labelledby="como">
<div class="hg-panel-cab"><h2 id="como">${t({ es: "Cómo recorrerla", en: "How to go through it" })}</h2></div>
<div class="hg-panel-cuerpo">
<ol class="hg-lista" ${atributo("aria-label", { es: "Pasos del recorrido", en: "Tour steps" })}>
<li>${t({ es: "Ábrela en el teléfono y en el escritorio: en el teléfono la navegación baja al pie y las tablas se vuelven tarjetas.", en: "Open it on the phone and on the desktop: on the phone the navigation drops to the bottom and tables turn into cards." })}</li>
<li>${t({ es: "Cambia de tema y de idioma con los botones de arriba a la derecha; la elección se recuerda entre pantallas.", en: "Switch theme and language with the buttons at the top right; the choice is remembered across screens." })}</li>
<li>${t({ es: "La franja de sala, arriba con borde punteado, no es producto: dice qué se mira y deja ver cada pantalla vacía, cargando o con error.", en: "The room strip, at the top with a dashed border, is not product: it says what is being reviewed and shows each screen empty, loading or with an error." })}</li>
<li>${t({ es: "Al pie de cada pantalla, «Qué revisar y qué deberías ver» dice qué hacer y qué resultado esperar.", en: "At the foot of each screen, “What to check and what you should see” says what to do and what result to expect." })}</li>
</ol>
</div>
</section>`;

  return pagina({
    titulo: { es: "HackGuard · maqueta", en: "HackGuard · mockup" },
    indice: true,
    migas: [t({ es: "Sala de diseño", en: "Design room" }), t({ es: "Recorrido", en: "Tour" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "G-Diseño aprobado el 2026-10-04 (mirada 6): el recorrido completo, en teléfono y escritorio, en los dos temas, en español y en inglés. Desde aquí, cada pantalla del producto se compara con su página de esta maqueta.",
        en: "Design gate approved on 2026-10-04 (review 6): the full walk-through, on phone and desktop, in both themes, in Spanish and in English. From here on, every product screen is compared with its page in this mockup.",
      },
    },
    contenido,
    revisar: [
      {
        donde: { es: "Botón «Entrar a la aplicación»", en: "“Enter the application” button" },
        hacer: { es: "Púlsalo", en: "Press it" },
        ver: { es: "Se abre el tablero, la portada del operador", en: "The dashboard opens, the operator's home" },
      },
      {
        donde: { es: "Tabla de pantallas", en: "Screens table" },
        hacer: { es: "Recórrela de arriba abajo", en: "Go through it top to bottom" },
        ver: { es: `Las ${PANTALLAS.length} de la orden de diseño en su orden, todas «Aprobada»`, en: `All ${PANTALLAS.length} from the design order in sequence, each “Approved”` },
      },
      {
        donde: { es: "Cualquier pantalla", en: "Any screen" },
        hacer: { es: "Pulsa «Recorrido» en la franja de sala", en: "Press “Tour” in the room strip" },
        ver: { es: "Vuelves aquí; el logo de la aplicación, en cambio, lleva al tablero", en: "You come back here; the application logo, instead, goes to the dashboard" },
      },
    ],
  });
}
