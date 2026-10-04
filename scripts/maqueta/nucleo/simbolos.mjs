// Marcas de estado como TRAZOS SVG, nunca como caracteres de una fuente (un ✓ o un ✕ puede no
// existir en la tipografía cargada). El color llega por currentColor; el texto va siempre al lado.
// Formas provisionales de la fase 0: la mirada 1 fija las definitivas.

const marco = (contenido) =>
  `<svg class="marca" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${contenido}</svg>`;

export const SIMBOLO = {
  vigente: marco(
    `<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.6 8.3l2.2 2.2 4.6-4.9" fill="none" stroke="var(--fondo)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  por_revisar: marco(
    `<path d="M8 1.6L15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6.2v3.6M8 11.6v.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  vencido: marco(
    `<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="currentColor"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="var(--fondo)" stroke-width="1.8" stroke-linecap="round"/>`,
  ),
};
