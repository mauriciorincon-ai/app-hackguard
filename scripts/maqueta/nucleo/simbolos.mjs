// Marcas de estado como TRAZOS SVG, nunca como caracteres de una fuente (un ✓ o una flecha pueden no
// existir en la tipografía cargada). El color llega por currentColor (el papel del estado); el texto va
// siempre al lado. Una forma por papel, para que se aprenda sin color: círculo relleno con visto =
// bien · triángulo = atención · cuadrado relleno con aspa = falla · círculo punteado = no hay.
const marca = (contenido) =>
  `<svg class="hg-marca-estado" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${contenido}</svg>`;

const HUECO = 'stroke="var(--fondo)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const TRAZO = 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';

const barras = (llenas) =>
  marca(
    [0, 1, 2, 3]
      .map((i) => {
        const alto = 4 + i * 3;
        const relleno = i < llenas ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1"';
        return `<rect x="${1 + i * 3.75}" y="${15 - alto}" width="2.75" height="${alto}" rx="0.5" ${relleno}/>`;
      })
      .join(""),
  );

export const SIMBOLO = {
  ok: marca(`<circle cx="8" cy="8" r="7.25" fill="currentColor"/><path d="M4.6 8.3l2.3 2.3 4.6-5" ${HUECO}/>`),
  aviso: marca(`<path d="M8 1.8l6.6 12H1.4z" ${TRAZO}/><path d="M8 6.4v3.4M8 11.9v.2" ${TRAZO}/>`),
  falla: marca(
    `<rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" ${HUECO}/>`,
  ),
  parcial: marca(`<circle cx="8" cy="8" r="6.4" ${TRAZO}/><path d="M8 1.6a6.4 6.4 0 0 0 0 12.8z" fill="currentColor"/>`),
  reloj: marca(`<circle cx="8" cy="8" r="6.4" ${TRAZO}/><path d="M8 4.4V8l2.6 1.7" ${TRAZO}/>`),
  vacio: marca(`<circle cx="8" cy="8" r="6.4" ${TRAZO} stroke-dasharray="2.2 2.6"/>`),
  no_aplica: marca(`<circle cx="8" cy="8" r="6.4" ${TRAZO}/><path d="M5 8h6" ${TRAZO}/>`),
  firma: marca(`<path d="M2 13.2c2.2-.2 2.6-3.4 4.3-3.4 1.5 0 .6 2.6 2 2.6 1.6 0 1.7-3.4 5.7-3.2" ${TRAZO}/><path d="M9.2 6.8l3.3-4 1.7 1.4-3.3 4-2.1.7z" fill="currentColor"/>`),
  barras4: barras(4),
  barras3: barras(3),
  barras2: barras(2),
  barras1: barras(1),
  barras0: barras(0),
};
