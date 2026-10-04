// Componentes canon de la maqueta (los que design-system.md declara). Cada uno devuelve HTML.
import { esc, neutro, t } from "./html.mjs";
import { vigencia } from "./calculos.mjs";
import { VIGENCIA } from "./estados.mjs";
import { SIMBOLO } from "./simbolos.mjs";

/** Estado en línea: marca + texto. `detalle` añade texto corriente después del nombre. */
export function estado({ rol, simbolo, nombre }, detalle) {
  const cola = detalle ? ` <span class="hg-menor">${detalle}</span>` : "";
  return `<span class="hg-estado es-${rol}">${SIMBOLO[simbolo]}<span>${t(nombre)}</span></span>${cola}`;
}

/** Sello: el estado que resume un objeto entero (un control, un cierre). */
export function sello({ rol, simbolo, nombre }, cuerpo, atributos = "") {
  return `<div class="hg-sello es-${rol}" ${atributos}>${SIMBOLO[simbolo]}<div><span class="hg-sello-titulo">${t(nombre)}</span>${cuerpo}</div></div>`;
}

/** Identificador, fecha o cifra técnica: en la fuente de datos y sin idioma. */
export const dato = (texto) => `<span class="hg-dato" data-neutro>${esc(texto)}</span>`;

/** Huella abreviada (algoritmo + primeros 8 y últimos 4). */
export function huella(valor) {
  const [algoritmo, hex] = valor.split(":");
  return `<span class="hg-huella" data-neutro><span class="hg-huella-pre">${esc(algoritmo)}:</span><wbr>${esc(hex.slice(0, 8))}…${esc(hex.slice(-4))}</span>`;
}

/** La firma en tinta azul: una persona confirmó esto, en esta fecha. */
export function firma(fecha) {
  return `<span class="hg-firma es-acento">${SIMBOLO.firma}<span>${t({ es: "Confirmada", en: "Confirmed" })} · ${neutro(fecha)}</span></span>`;
}

export const dias = (n) =>
  n === 0 ? { es: "hoy", en: "today" } : n === 1 ? { es: "hace 1 día", en: "1 day ago" } : { es: `hace ${n} días`, en: `${n} days ago` };

/** Celda de una fila de libro: rótulo (visible en teléfono, oculto en escritorio) + valor. */
export function celda(rotulo, valor) {
  return `<div class="hg-celda"><dt>${t(rotulo)}</dt><dd>${valor}</dd></div>`;
}

/** Par rótulo–valor de una ficha. */
export const par = (rotulo, valor) => `<div><dt>${t(rotulo)}</dt><dd>${valor}</dd></div>`;

/** Lista de frases bilingües. */
export const lista = (frases) => `<ul class="hg-lista">${frases.map((f) => `<li>${t(f)}</li>`).join("")}</ul>`;

/**
 * Semáforo de vigencia de algo fechado, con el protocolo que vigila la matriz de envejecimiento
 * (data-fechado, data-desde, data-dias, data-estado-fechado y la frase de días).
 */
export function fechado(desde, consulta, umbrales, rotulo = { es: "verificada", en: "verified" }) {
  const v = vigencia(desde, consulta, umbrales);
  return `<span data-fechado="vigencia" data-desde="${desde}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">${estado(VIGENCIA[v.estado])} <span class="hg-menor">· ${t(rotulo)} <span data-frase-dias>${t(dias(v.dias))}</span></span></span>`;
}

/**
 * Libro: cabecera de columnas + filas. `filas` es una lista de listas de celdas [rótulo implícito por
 * columna → valor HTML]; `atributos` añade atributos a cada <li> (filtros, marcas para los gates).
 */
export function libro(columnas, filas, { atributos = () => "", clase = "" } = {}) {
  const n = columnas.length;
  const clases = `hg-cols-${n}${clase ? ` ${clase}` : ""}`;
  const cab = `<div class="hg-libro-cab ${clases}" aria-hidden="true">${columnas.map((c) => `<span>${t(c)}</span>`).join("")}</div>`;
  const cuerpo = filas
    .map((celdas, i) => `<li ${atributos(i)}><dl class="hg-fila">\n${celdas.map((valor, j) => celda(columnas[j], valor)).join("\n")}\n</dl></li>`)
    .join("\n");
  return `${cab}\n<ul class="hg-libro ${clases}">\n${cuerpo}\n</ul>`;
}

/** Enlace a otra página de la maqueta; si esa página aún no existe, texto (nunca un enlace roto). */
export const enlace = (archivo, contenido, existentes) =>
  existentes.includes(archivo) ? `<a href="${archivo}">${contenido}</a>` : `<span>${contenido}</span>`;

// ---------- Piezas de la dirección «consola» (mirada 4-ter) ----------

/** Chip: el estado que decide algo en una fila o en una cabecera (tinte + borde + marca + texto). */
export const chip = ({ rol, simbolo, nombre }, atributos = "") =>
  `<span class="hg-chip es-${rol}"${atributos ? ` ${atributos}` : ""}>${SIMBOLO[simbolo]}<span>${t(nombre)}</span></span>`;

/** Barra de proporción (parte sobre total) como SVG: sin estilos en línea. */
export const proporcion = (parte, total) =>
  `<svg class="hg-proporcion" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="hg-proporcion-fondo" width="100" height="6" rx="1"/><rect class="hg-proporcion-parte" width="${Math.max(parte > 0 ? 3 : 0, Math.round((parte / total) * 100))}" height="6" rx="1"/></svg>`;

/** Estado de pantalla (vacío, carga, error): marca, título y qué hacer. `si` es el estado de sala. */
export const aviso = (si, { rol, simbolo }, titulo, cuerpo) =>
  `<div class="hg-aviso es-${rol}" data-si="${si}">${SIMBOLO[simbolo]}<h2>${t(titulo)}</h2>${cuerpo}</div>`;

export const VACIO = { rol: "neutro", simbolo: "vacio" };
export const CARGA = { rol: "neutro", simbolo: "reloj" };
export const ERROR = { rol: "falla", simbolo: "falla" };
export const ESQUELETO = `<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>`;
