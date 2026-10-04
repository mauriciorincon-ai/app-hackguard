// index.html: el recorrido de la maqueta. Provisional hasta la mirada 5 (la portada real): lista las
// páginas que ya existen, primero las que toca mirar ahora, con el estado de su mirada.
import { archivoDeFicha } from "../datos/catalogo.mjs";
import { ACTIVOS, ORDEN_DE_HALLAZGOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { chip, estado } from "../nucleo/componentes.mjs";
import { t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";

const ACTIVO = Object.keys(ACTIVOS)[0];
const EN_MIRADA = { rol: "acento", simbolo: "firma", nombre: { es: "Mírala ahora", en: "Review it now" } };
const APROBADA = { rol: "positivo", simbolo: "ok", nombre: { es: "Aprobada", en: "Approved" } };

const PAGINAS = [
  {
    archivo: archivoDeFicha("PR-IA-PINJ-001"),
    nombre: { es: "Ficha de prueba", en: "Test record" },
    que: { es: "Qué verifica, resultado esperado, regla de veredicto, marco y controles. Cada prueba del catálogo tiene la suya.", en: "What it verifies, expected result, verdict rule, framework and controls. Every test in the catalog has its own." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "marcos.html",
    nombre: { es: "Marcos y versiones", en: "Frameworks and versions" },
    que: { es: "Versión vigente de cada marco, aviso de versión nueva y mapa de equivalencias.", en: "Each framework's current version, new-version notice and equivalence map." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "controles.html",
    nombre: { es: "Controles", en: "Controls" },
    que: { es: "Las áreas del Anexo A, las pruebas que dan evidencia a cada control y las que no dan a ninguno.", en: "The Annex A areas, the tests that give evidence to each control and those that give to none." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "propuestas.html",
    nombre: { es: "Bandeja de propuestas", en: "Proposal inbox" },
    que: { es: "Lo que proponen el investigador y el extractor, para aprobar, rechazar o separar.", en: "What the researcher and the extractor propose, to approve, reject or split." },
    mirada: EN_MIRADA,
  },
  {
    archivo: archivoDeActivo(ACTIVO),
    nombre: { es: "Activo", en: "Asset" },
    que: { es: "Dueño y proveedor, perfil, alcance autorizado y reglas de enfrentamiento. Tres activos demo.", en: "Owner and provider, profile, authorized scope and rules of engagement. Three demo assets." },
    mirada: EN_MIRADA,
  },
  {
    archivo: archivoDePlan(ACTIVO),
    nombre: { es: "Plan", en: "Plan" },
    que: { es: "Pruebas planeadas y excluidas con su razón, cobertura por control y paquete de ejecución.", en: "Planned and excluded tests with their reasons, coverage by control and execution package." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "kit.html",
    nombre: { es: "Kit de componentes", en: "Component kit" },
    que: { es: "Cada token y cada componente del sistema de diseño.", en: "Every token and component of the design system." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "direccion.html",
    nombre: { es: "Vista por control (adelanto)", en: "Control view (preview)" },
    que: { es: "La página de la mirada 1, rehecha: el estado de un control con sus pruebas, su evidencia y sus hallazgos.", en: "The review 1 page, rebuilt: a control's status with its tests, evidence and findings." },
    mirada: EN_MIRADA,
  },
  {
    archivo: "catalogo.html",
    nombre: { es: "Catálogo de pruebas", en: "Test catalog" },
    que: { es: "Las pruebas de las cuatro familias, con filtros que funcionan.", en: "Tests for the four families, with working filters." },
    mirada: APROBADA,
  },
  {
    archivo: archivoDeHallazgo(ORDEN_DE_HALLAZGOS[0]),
    nombre: { es: "Hallazgo", en: "Finding" },
    que: { es: "Recorrido de cierre, severidad, plazo y salidas posibles. Cuatro hallazgos, uno por momento del ciclo.", en: "Closure progress, severity, deadline and possible outcomes. Four findings, one per moment of the life cycle." },
    mirada: APROBADA,
  },
  {
    archivo: "evidencia.html",
    nombre: { es: "Carga de evidencia", en: "Evidence intake" },
    que: { es: "Las tres vías de carga y la confirmación por lote, con todas las fallas a la vista.", en: "The three intake routes and batch confirmation, with every failure in plain view." },
    mirada: APROBADA,
  },
];

export function index({ consulta, existentes }) {
  const filas = PAGINAS.map(
    (p) => `<tr>
<td data-celda="id"><a class="hg-enlace-fila" href="${p.archivo}">${t(p.nombre)}</a></td>
<td><p class="hg-menor">${t(p.que)}</p></td>
<td data-celda="estado">${p.mirada === EN_MIRADA ? chip(p.mirada) : estado(p.mirada)}</td>
</tr>`,
  ).join("\n");

  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Maqueta de HackGuard", en: "HackGuard mockup" })}</h1>
<p class="hg-bajada">${t({
    es: "Recorrido provisional: crece con cada mirada. Los datos son sintéticos. La portada real llega en la mirada 5.",
    en: "Temporary tour: it grows with each review. All data is synthetic. The real home page arrives in review 5.",
  })}</p>
</div>
</div>
<section class="hg-panel" aria-labelledby="paginas">
<div class="hg-panel-cab"><h2 id="paginas">${t({ es: "Páginas", en: "Pages" })}</h2><p class="hg-menor">${t({ es: "Primero las que toca mirar ahora.", en: "The ones to review now come first." })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Páginas de la maqueta", en: "Mockup pages" })}</caption>
<thead><tr><th scope="col">${t({ es: "Página", en: "Page" })}</th><th scope="col">${t({ es: "Qué es", en: "What it is" })}</th><th scope="col">${t({ es: "Mirada", en: "Review" })}</th></tr></thead>
<tbody>
${filas}
</tbody>
</table>
</section>`;

  return pagina({
    titulo: { es: "HackGuard · maqueta", en: "HackGuard · mockup" },
    migas: [t({ es: "Sala de diseño", en: "Design room" }), t({ es: "Recorrido", en: "Tour" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter, segundo tramo: todas las pantallas construidas ya tienen la interfaz nueva.",
        en: "Review 4-ter, second stretch: every screen built so far now has the new interface.",
      },
    },
    contenido,
  });
}

