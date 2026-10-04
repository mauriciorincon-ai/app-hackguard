// Piezas de HTML del generador. Regla 20: todo texto nace como mapa { es, en } y se emite en los dos
// idiomas; la hoja de estilos oculta el inactivo y assets/maqueta.js conmuta html[data-lang].

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function esc(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

function par(texto) {
  if (!texto || typeof texto.es !== "string" || typeof texto.en !== "string" || !texto.es || !texto.en) {
    throw new Error(`texto sin sus dos idiomas: ${JSON.stringify(texto)}`);
  }
  return texto;
}

/** Texto visible en los dos idiomas. */
export function t(texto) {
  const { es, en } = par(texto);
  return `<span lang="es">${esc(es)}</span><span lang="en">${esc(en)}</span>`;
}

/** Texto en los dos idiomas con piezas de HTML incrustadas: «{clave}» se sustituye por `piezas.clave`. */
export function tHtml(texto, piezas) {
  const { es, en } = par(texto);
  const armar = (frase) => esc(frase).replace(/\{(\w+)\}/g, (_, clave) => piezas[clave]);
  return `<span lang="es">${armar(es)}</span><span lang="en">${armar(en)}</span>`;
}

/** Atributo de texto (aria-label, title…) con sus dos idiomas; el script lo conmuta. */
export function atributo(nombre, texto) {
  const { es, en } = par(texto);
  return `${nombre}="${esc(es)}" data-${nombre}-es="${esc(es)}" data-${nombre}-en="${esc(en)}"`;
}

/** Texto que no cambia con el idioma: identificadores, fechas, huellas, nombres propios. */
export function neutro(texto, etiqueta = "span") {
  return `<${etiqueta} data-neutro>${esc(texto)}</${etiqueta}>`;
}
