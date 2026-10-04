// Componentes canon de la maqueta (los que design-system.md declara). Cada uno devuelve HTML.
import { atributo, esc, neutro, t } from "./html.mjs";
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

/** Par rótulo–valor de una lista de propiedades. */
export const par = (rotulo, valor) => `<div><dt>${t(rotulo)}</dt><dd>${valor}</dd></div>`;

/** Lista de frases bilingües. */
export const lista = (frases) => `<ul class="hg-lista">${frases.map((f) => `<li>${t(f)}</li>`).join("")}</ul>`;

/**
 * Semáforo de vigencia de algo fechado, con el protocolo que vigila la matriz de envejecimiento
 * (data-fechado, data-desde, data-dias, data-estado-fechado y la frase de días). Lo vigente va en línea;
 * lo que pide atención, en chip (lo que no es noticia no lleva recuadro).
 */
export function fechado(desde, consulta, umbrales, rotulo = { es: "Verificada", en: "Verified" }) {
  const v = vigencia(desde, consulta, umbrales);
  const marca = v.estado === "vigente" ? estado(VIGENCIA.vigente) : chip(VIGENCIA[v.estado]);
  return `<span data-fechado="vigencia" data-desde="${desde}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">${marca} <span class="hg-menor">${t(rotulo)} <span data-frase-dias>${t(dias(v.dias))}</span></span></span>`;
}

/** Cabecera de una tabla: una celda por columna, en los dos idiomas. */
export const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;

/** Nombre de algo que puede llamarse igual en los dos idiomas (una herramienta) o tener uno por idioma. */
export const nombreDe = (h) => (typeof h.nombre === "string" ? neutro(h.nombre) : t(h.nombre));

/** Un eslabón de la cadena de cierre: hecho (con su rol y su símbolo) o pendiente (trazo punteado). */
export function eslabon({ rol, simbolo, pendiente }, titulo, cuerpo = "") {
  return `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo}</li>`;
}

/** El destino de un enlace, si la maqueta genera esa página. Si no, el generador falla: un enlace roto
 *  nunca se vuelve texto en silencio (el gate de enlaces solo ve los <a href>). */
export function destino(archivo, existentes) {
  if (!existentes.includes(archivo)) throw new Error(`enlace a una página que la maqueta no genera: ${archivo}`);
  return archivo;
}

/** Enlace a otra página de la maqueta. */
export const enlace = (archivo, contenido, existentes) => `<a href="${destino(archivo, existentes)}">${contenido}</a>`;

// ---------- Piezas de la dirección «consola» (mirada 4-ter) ----------

/** Chip: el estado que decide algo en una fila o en una cabecera (tinte + borde + marca + texto). */
export const chip = ({ rol, simbolo, nombre }, atributos = "") =>
  `<span class="hg-chip es-${rol}"${atributos ? ` ${atributos}` : ""}>${SIMBOLO[simbolo]}<span>${t(nombre)}</span></span>`;

/** Barra de proporción (parte sobre total) como SVG: sin estilos en línea. `clase` la modula (avance). */
export const proporcion = (parte, total, clase = "") =>
  `<svg class="hg-proporcion${clase ? ` ${clase}` : ""}" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="hg-proporcion-fondo" width="100" height="6" rx="1"/><rect class="hg-proporcion-parte" width="${Math.max(parte > 0 ? 3 : 0, Math.round((parte / total) * 100))}" height="6" rx="1"/></svg>`;

/** Estado de pantalla (vacío, carga, error): marca, título y qué hacer. `si` es el estado de sala. */
export const aviso = (si, { rol, simbolo }, titulo, cuerpo, nivel = 2) =>
  `<div class="hg-aviso es-${rol}" data-si="${si}">${SIMBOLO[simbolo]}<h${nivel}>${t(titulo)}</h${nivel}>${cuerpo}</div>`;

/** El aviso de un estado en una pantalla de detalle, cuyo título vive con los datos: sin datos, el aviso
 *  es el título de la página (h1, con el tamaño de un h2). La migaja de la barra dice de qué objeto es. */
export const avisoPrincipal = (si, marca, titulo, cuerpo) => aviso(si, marca, titulo, cuerpo, 1);

export const VACIO = { rol: "neutro", simbolo: "vacio" };
export const CARGA = { rol: "neutro", simbolo: "reloj" };
export const ERROR = { rol: "falla", simbolo: "falla" };
export const ESQUELETO = `<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>`;

/**
 * Selector de objeto: qué objeto de una serie está abierto (un activo, un hallazgo). `items` =
 * [{ archivo, titulo, nota, actual }], con `titulo` y `nota` ya en HTML.
 */
export function selectorDeObjetos(rotulo, items, existentes) {
  const lis = items
    .map(({ archivo, titulo, nota, actual }) => {
      const dentro = `<span class="hg-opcion-nombre">${titulo}</span><span>${nota}</span>`;
      return `<li><a class="hg-opcion" href="${destino(archivo, existentes)}"${actual ? ' aria-current="true"' : ""}>${dentro}</a></li>`;
    })
    .join("");
  return `<nav ${atributo("aria-label", rotulo)}><ul class="hg-selector">${lis}</ul></nav>`;
}
