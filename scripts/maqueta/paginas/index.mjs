// index.html provisional de la fase 0: comprueba la tubería (generar, servir, conmutar tema, idioma y
// estado, calcular días desde la fecha de consulta). No es diseño; la mirada 5 trae la portada real.
import { PIEZAS } from "../datos/muestra-fase0.mjs";
import { neutro, t } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";
import { vigencia } from "../nucleo/vigencia.mjs";

const ESTADO = {
  vigente: { es: "Vigente", en: "Current" },
  por_revisar: { es: "Por revisar", en: "Review due" },
  vencido: { es: "Vencido", en: "Overdue" },
};

function hace(dias) {
  if (dias === 0) return { es: "verificada hoy", en: "verified today" };
  if (dias === 1) return { es: "verificada hace 1 día", en: "verified 1 day ago" };
  return { es: `verificada hace ${dias} días`, en: `verified ${dias} days ago` };
}

function fila(pieza, consulta, umbrales) {
  const { estado, dias } = vigencia(pieza.verificada, consulta, umbrales);
  return `<li class="mq-fila" data-vigencia="${estado}" data-dias="${dias}" data-verificada="${pieza.verificada}">
<span class="mq-fila-nombre">${neutro(pieza.nombre, "strong")} <span class="mq-menor">${t(pieza.tipo)}</span></span>
<span class="mq-estado mq-estado-${estado}">${SIMBOLO[estado]}<span class="mq-estado-texto">${t(ESTADO[estado])}</span></span>
<span class="mq-menor">${t(hace(dias))} · ${neutro(pieza.verificada)}</span>
</li>`;
}

export function index({ consulta, umbrales }) {
  const contenido = `<h1>${t({ es: "Maqueta de HackGuard", en: "HackGuard mockup" })}</h1>
<p class="mq-entrada">${t({
    es: "Esta página es provisional. Comprueba que la maqueta se genera, se sirve y responde; aquí todavía no hay diseño que juzgar.",
    en: "This page is temporary. It checks that the mockup builds, is served and responds; there is no design to judge here yet.",
  })}</p>

<section aria-labelledby="vigencia">
<h2 id="vigencia">${t({ es: "Vigencia calculada", en: "Computed freshness" })}</h2>
<p>${t({ es: "Fecha de consulta:", en: "Query date:" })} ${neutro(consulta, "strong")}. ${t({
    es: "Los días salen de esa fecha, nunca del reloj.",
    en: "Day counts come from that date, never from the clock.",
  })}</p>
<ul class="mq-filas">
${PIEZAS.map((p) => fila(p, consulta, umbrales)).join("\n")}
</ul>
</section>

<section aria-labelledby="estados">
<h2 id="estados">${t({ es: "Estados de pantalla", en: "Screen states" })}</h2>
${barraDeEstados([
  { valor: "datos", nombre: { es: "Con datos", en: "With data" } },
  { valor: "vacio", nombre: { es: "Vacío", en: "Empty" } },
  { valor: "carga", nombre: { es: "Cargando", en: "Loading" } },
  { valor: "error", nombre: { es: "Error", en: "Error" } },
])}
<div class="mq-muestra">
<p data-si="datos">${t({ es: "Así se ve la pantalla cuando hay datos.", en: "This is the screen when there is data." })}</p>
<p data-si="vacio">${t({ es: "Todavía no hay nada que mostrar.", en: "There is nothing to show yet." })}</p>
<p data-si="carga">${t({ es: "Leyendo los archivos del catálogo…", en: "Reading the catalog files…" })}</p>
<p data-si="error">${t({
    es: "No se pudo leer el catálogo. Revisa el archivo y vuelve a cargarlo.",
    en: "The catalog could not be read. Check the file and load it again.",
  })}</p>
</div>
</section>`;

  return pagina({
    titulo: { es: "HackGuard · maqueta", en: "HackGuard · mockup" },
    contenido,
    revisar: [
      {
        donde: { es: "Botón de tema, arriba", en: "Theme button, top" },
        hacer: { es: "Púlsalo", en: "Press it" },
        ver: { es: "El fondo pasa de oscuro a claro y vuelve", en: "The background goes from dark to light and back" },
      },
      {
        donde: { es: "Botón de idioma, arriba", en: "Language button, top" },
        hacer: { es: "Púlsalo", en: "Press it" },
        ver: { es: "Todo el texto cambia a inglés", en: "All the text switches to Spanish" },
      },
      {
        donde: { es: "Vigencia calculada", en: "Computed freshness" },
        hacer: { es: "Lee las tres filas", en: "Read the three rows" },
        ver: {
          es: "Cada estado tiene un símbolo distinto y su texto, no solo un color",
          en: "Each status has its own symbol and label, not just a color",
        },
      },
      {
        donde: { es: "Estados de pantalla", en: "Screen states" },
        hacer: { es: "Pulsa cada uno", en: "Press each one" },
        ver: { es: "El mensaje de abajo cambia", en: "The message below changes" },
      },
    ],
  });
}
