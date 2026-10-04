// index.html: el recorrido de la maqueta. Provisional hasta la mirada 5 (la portada real): por ahora
// lista las páginas que ya existen, en el orden en que se miran.
import { t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";

const PAGINAS = [
  {
    archivo: "direccion.html",
    nombre: { es: "Dirección", en: "Direction" },
    que: {
      es: "La identidad de HackGuard sobre un corte real de la vista por control: tipografía, color, estados y la cadena de cierre.",
      en: "HackGuard's identity on a real slice of the control view: type, color, statuses and the closure chain.",
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
