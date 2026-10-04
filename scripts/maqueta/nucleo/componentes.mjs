// Componentes canon de la maqueta (los que design-system.md declara). Cada uno devuelve HTML.
import { esc, neutro, t } from "./html.mjs";
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
  return `<span class="hg-huella" data-neutro><span class="hg-huella-pre">${esc(algoritmo)}:</span>${esc(hex.slice(0, 8))}…${esc(hex.slice(-4))}</span>`;
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
