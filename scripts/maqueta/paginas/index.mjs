// index.html: el recorrido de la maqueta. Provisional hasta la mirada 5 (la portada real): por ahora
// lista las páginas que ya existen, en el orden en que se miran.
import { archivoDeFicha } from "../datos/catalogo.mjs";
import { ACTIVOS, ORDEN_DE_HALLAZGOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";

const ACTIVO = Object.keys(ACTIVOS)[0];
import { t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";

const PAGINAS = [
  {
    archivo: "catalogo.html",
    nombre: { es: "Catálogo de pruebas, con la interfaz nueva", en: "Test catalog, with the new interface" },
    que: {
      es: "Mirada 4-ter, primer tramo: la que toca ahora. Una lista: barra lateral, cifras, filtros y tabla densa.",
      en: "Review 4-ter, first stretch: the current one. A list: sidebar, figures, filters and a dense table.",
    },
  },
  {
    archivo: archivoDeHallazgo(ORDEN_DE_HALLAZGOS[0]),
    nombre: { es: "Hallazgo, con la interfaz nueva", en: "Finding, with the new interface" },
    que: {
      es: "Mirada 4-ter, primer tramo. Un detalle: el recorrido de cierre arriba y el carril de acción a la derecha. Cuatro hallazgos.",
      en: "Review 4-ter, first stretch. A detail page: the closure progress on top and the action rail on the right. Four findings.",
    },
  },
  {
    archivo: "evidencia.html",
    nombre: { es: "Carga de evidencia, con la interfaz nueva", en: "Evidence intake, with the new interface" },
    que: {
      es: "Mirada 4-ter, primer tramo. Un formulario: las tres vías como pestañas, el lote con su recorrido y el carril para confirmar.",
      en: "Review 4-ter, first stretch. A form: the three routes as tabs, the batch with its progress and the rail to confirm.",
    },
  },
  {
    archivo: "interfaz-a.html",
    nombre: { es: "Tres direcciones de interfaz", en: "Three interface directions" },
    que: {
      es: "Mirada 4-bis. La misma pantalla como consola, como expediente y como tablero. Elegida: la consola, con el recorrido y el carril del expediente.",
      en: "Review 4-bis. The same screen as a console, as a case file and as a dashboard. Chosen: the console, with the case file's progress and rail.",
    },
  },
  {
    archivo: "direccion.html",
    nombre: { es: "Dirección", en: "Direction" },
    que: {
      es: "Mirada 1, aspecto anterior. La identidad sobre un corte real de la vista por control: tipografía, color, estados y la cadena de cierre.",
      en: "Review 1, previous look. The identity on a real slice of the control view: type, color, statuses and the closure chain.",
    },
  },
  {
    archivo: "kit.html",
    nombre: { es: "Kit de componentes", en: "Component kit" },
    que: {
      es: "Mirada 2, aspecto anterior. Cada token y cada componente del sistema de diseño.",
      en: "Review 2, previous look. Every token and component of the design system.",
    },
  },
  {
    archivo: archivoDeFicha("PR-IA-PINJ-001"),
    nombre: { es: "Ficha de prueba", en: "Test record" },
    que: {
      es: "Mirada 2, aspecto anterior. Qué verifica, resultado esperado, regla de veredicto, marco y controles. Cada prueba del catálogo tiene la suya.",
      en: "Review 2, previous look. What it verifies, expected result, verdict rule, framework and controls. Every test in the catalog has its own.",
    },
  },
  {
    archivo: "marcos.html",
    nombre: { es: "Marcos y versiones", en: "Frameworks and versions" },
    que: {
      es: "Mirada 3, aspecto anterior. Versión vigente de cada marco, aviso de versión nueva y mapa de equivalencias.",
      en: "Review 3, previous look. Each framework's current version, new-version notice and equivalence map.",
    },
  },
  {
    archivo: "controles.html",
    nombre: { es: "Controles", en: "Controls" },
    que: {
      es: "Mirada 3, aspecto anterior. Las áreas del Anexo A, las pruebas que dan evidencia a cada control y las que no dan a ninguno.",
      en: "Review 3, previous look. The Annex A areas, the tests that give evidence to each control and those that give to none.",
    },
  },
  {
    archivo: "propuestas.html",
    nombre: { es: "Bandeja de propuestas", en: "Proposal inbox" },
    que: {
      es: "Mirada 3, aspecto anterior. Lo que proponen el investigador y el extractor, para aprobar, rechazar o separar.",
      en: "Review 3, previous look. What the researcher and the extractor propose, to approve, reject or split.",
    },
  },
  {
    archivo: archivoDeActivo(ACTIVO),
    nombre: { es: "Activo", en: "Asset" },
    que: {
      es: "Mirada 3, aspecto anterior. Dueño y proveedor, perfil, alcance autorizado y reglas de enfrentamiento. Tres activos demo.",
      en: "Review 3, previous look. Owner and provider, profile, authorized scope and rules of engagement. Three demo assets.",
    },
  },
  {
    archivo: archivoDePlan(ACTIVO),
    nombre: { es: "Plan", en: "Plan" },
    que: {
      es: "Mirada 3, aspecto anterior. Pruebas planeadas y excluidas con su razón, cobertura por control y paquete de ejecución.",
      en: "Review 3, previous look. Planned and excluded tests with their reasons, coverage by control and execution package.",
    },
  },
];

export function index() {
  const filas = PAGINAS.map((p) => `<li><a href="${p.archivo}">${t(p.nombre)}</a><span>${t(p.que)}</span></li>`).join("\n");
  const contenido = `<h1>${t({ es: "Maqueta de HackGuard", en: "HackGuard mockup" })}</h1>
<p class="hg-menor">${t({
    es: "Recorrido provisional: crece con cada mirada. Los datos son sintéticos.",
    en: "Temporary tour: it grows with each review. All data is synthetic.",
  })}</p>
<ol class="mq-recorrido">
${filas}
</ol>`;

  return pagina({ titulo: { es: "HackGuard · maqueta", en: "HackGuard · mockup" }, contenido });
}
