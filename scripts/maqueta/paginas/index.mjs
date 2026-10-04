// index.html: el recorrido de la maqueta. Provisional hasta la mirada 5 (la portada real): por ahora
// lista las páginas que ya existen, en el orden en que se miran.
import { archivoDeFicha } from "../datos/catalogo.mjs";
import { t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";

const PAGINAS = [
  {
    archivo: "direccion.html",
    nombre: { es: "Dirección", en: "Direction" },
    que: {
      es: "Mirada 1, aprobada. La identidad sobre un corte real de la vista por control: tipografía, color, estados y la cadena de cierre.",
      en: "Review 1, approved. The identity on a real slice of the control view: type, color, statuses and the closure chain.",
    },
  },
  {
    archivo: "kit.html",
    nombre: { es: "Kit de componentes", en: "Component kit" },
    que: {
      es: "Mirada 2. Cada token y cada componente del sistema de diseño.",
      en: "Review 2. Every token and component of the design system.",
    },
  },
  {
    archivo: "catalogo.html",
    nombre: { es: "Catálogo de pruebas", en: "Test catalog" },
    que: {
      es: "Mirada 2. Las pruebas de las cuatro familias, con filtros que funcionan.",
      en: "Review 2. Tests for the four families, with working filters.",
    },
  },
  {
    archivo: archivoDeFicha("PR-IA-PINJ-001"),
    nombre: { es: "Ficha de prueba", en: "Test record" },
    que: {
      es: "Mirada 2. Qué verifica, resultado esperado, regla de veredicto, marco y controles. Cada prueba del catálogo tiene la suya.",
      en: "Review 2. What it verifies, expected result, verdict rule, framework and controls. Every test in the catalog has its own.",
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
