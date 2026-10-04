// Sondas compartidas por el arnés de capturas (scripts/capturar-maqueta.mjs) y los e2e de la maqueta.
// Reciben una `page` de Playwright. Regla 22: un control dibujado solo cuenta si, al activarlo, ALGO
// cambia — se compara una huella SHA-256 del DOM completo (jamás su longitud: dos estados distintos
// pueden medir lo mismo).
import { createHash } from "node:crypto";

const INTERACTIVO =
  'button, select, input, textarea, summary, [role="button"], [role="switch"], [role="tab"], [role="slider"], [tabindex="0"]';

export async function huellaDelDom(page) {
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  return createHash("sha256").update(html).digest("hex");
}

/** Elementos que sobresalen del ancho de la ventana (los de área cero no cuentan). */
export async function desbordes(page) {
  return page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const fuera = [];
    if (document.documentElement.scrollWidth > ancho) {
      fuera.push(`documento: scrollWidth ${document.documentElement.scrollWidth} > ${ancho}`);
    }
    for (const el of document.body.querySelectorAll("*")) {
      const caja = el.getBoundingClientRect();
      if (caja.width === 0 || caja.height === 0) continue;
      if (el.closest(".mq-tabla")) continue; // contenedor con desplazamiento propio, declarado
      if (caja.right > ancho + 0.5) {
        fuera.push(`<${el.tagName.toLowerCase()} class="${el.className}">: derecha ${Math.round(caja.right)} > ${ancho}`);
      }
    }
    // Dentro de una celda de libro nada sobresale de su columna (aunque quepa en la ventana).
    for (const celda of document.body.querySelectorAll(".hg-celda")) {
      const limite = celda.getBoundingClientRect().right;
      if (limite === 0) continue;
      for (const el of celda.querySelectorAll("*")) {
        const caja = el.getBoundingClientRect();
        if (caja.width === 0 || caja.height === 0) continue;
        // El rótulo oculto a la vista (dt recortado a 1 px) no cuenta: nadie lo ve desbordar.
        const rotulo = el.closest("dt");
        if (rotulo && getComputedStyle(rotulo).position === "absolute") continue;
        if (caja.right > limite + 1) {
          fuera.push(`celda: <${el.tagName.toLowerCase()} class="${el.className}"> se sale de su columna por ${Math.round(caja.right - limite)} px`);
          break;
        }
      }
    }
    return fuera.slice(0, 8);
  });
}

/**
 * Palabras partidas por la mitad: el texto corriente lleva `overflow-wrap: anywhere` para que nada
 * desborde, y el precio es que una columna demasiado estrecha parte «Crítico» en «Cr / íti / co» sin
 * desbordar nada — la sonda de desbordes no lo ve. Aquí se mide cada palabra con la fuente real y se
 * compara con el ancho de la caja que la contiene. Los datos técnicos (identificadores, huellas,
 * vectores) sí pueden partirse y no cuentan.
 */
export async function palabrasPartidas(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const lienzo = document.createElement("canvas").getContext("2d");
    const partidas = [];
    const caminante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
      const el = nodo.parentElement;
      if (!el || !nodo.textContent.trim()) continue;
      if (el.closest("[data-neutro], .hg-dato, .hg-huella, .hg-vector, script, style, option")) continue;
      if (el.getClientRects().length === 0) continue;
      // La caja que limita el texto: el primer ancestro que no es «inline».
      let bloque = el;
      while (bloque.parentElement && getComputedStyle(bloque).display === "inline") bloque = bloque.parentElement;
      const estiloDeCaja = getComputedStyle(bloque);
      const ancho = bloque.clientWidth - parseFloat(estiloDeCaja.paddingLeft) - parseFloat(estiloDeCaja.paddingRight);
      if (ancho <= 2) continue; // rótulo oculto a la vista (recortado a 1 px)
      const estilo = getComputedStyle(el);
      lienzo.font = `${estilo.fontStyle} ${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
      for (const palabra of nodo.textContent.split(/\s+/)) {
        if (palabra.length < 2 || palabra.length > 24) continue;
        const mide = lienzo.measureText(palabra).width;
        if (mide > ancho + 1) {
          partidas.push(`«${palabra}» (${Math.round(mide)} px) no cabe en <${bloque.tagName.toLowerCase()} class="${bloque.className}"> (${Math.round(ancho)} px)`);
          break;
        }
      }
    }
    return [...new Set(partidas)].slice(0, 8);
  });
}

/**
 * Activa cada control visible de la página y exige que la huella del DOM cambie. Devuelve la lista de
 * fallas (vacía = pasada limpia) y cuántos controles activó. Un control interactivo sin
 * data-controlador también es falla: nadie declaró qué debe hacer.
 */
export async function pasadaDeInteraccion(page) {
  const fallas = [];
  const sinMarca = await page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => !el.hasAttribute("data-controlador") && el.getClientRects().length > 0)
        .map((el) => el.outerHTML.slice(0, 120)),
    INTERACTIVO,
  );
  for (const el of sinMarca) fallas.push(`control sin data-controlador: ${el}`);

  const controles = page.locator("[data-controlador]");
  const total = await controles.count();
  let activados = 0;

  const activar = async (i) => {
    const control = controles.nth(i);
    const nombre = [await control.getAttribute("data-controlador"), await control.getAttribute("data-campo"), await control.getAttribute("data-valor")]
      .filter(Boolean)
      .join(":");
    const antes = await huellaDelDom(page);
    const etiqueta = await control.evaluate((el) => el.tagName);
    if (etiqueta === "INPUT" || etiqueta === "TEXTAREA") {
      // Un campo se activa escribiendo en él (una fecha, si es de fecha).
      const tipo = await control.getAttribute("type");
      await control.fill(tipo === "date" ? "2026-10-01" : "texto de la pasada de interacción");
    } else if (etiqueta === "SELECT") {
      // Una lista se activa eligiendo otra opción (un clic solo la abre).
      const actual = await control.evaluate((el) => el.selectedIndex);
      await control.selectOption({ index: actual === 0 ? 1 : 0 });
    } else {
      await control.click();
    }
    const despues = await huellaDelDom(page);
    activados += 1;
    if (antes === despues) fallas.push(`el control «${nombre}» no cambió nada al activarlo`);
  };

  // Vueltas: un botón de grupo ya pulsado no cambia nada al pulsarlo otra vez, y un control puede
  // estar oculto hasta que otro lo hace aparecer («Quitar filtros», o todo lo que vive bajo un estado de
  // pantalla). Esos esperan a que los demás actúen: se repite mientras alguna vuelta active algo.
  let pendientes = [...Array(total).keys()];
  let hubo = true;
  while (pendientes.length && hubo) {
    hubo = false;
    const siguen = [];
    for (const i of pendientes) {
      const control = controles.nth(i);
      if ((await control.isVisible()) && (await control.getAttribute("aria-pressed")) !== "true") {
        await activar(i);
        hubo = true;
      } else {
        siguen.push(i);
      }
    }
    pendientes = siguen;
  }
  // Lo que queda: un interruptor suelto que nació pulsado (se activa igual: debe cambiar), o un control
  // que nunca llegó a verse (falla: nadie puede usarlo).
  for (const i of pendientes) {
    const control = controles.nth(i);
    // Un control puede vivir bajo OTRO estado de la pantalla (el botón del estado vacío) o bajo otra
    // pestaña: se le busca recorriendo los estados de la sala y las pestañas antes de darlo por inalcanzable.
    if (!(await control.isVisible())) {
      const estados = page.locator('.mq-sala [data-controlador="estado"]');
      const pestanas = page.locator('[data-controlador="pestana"]');
      const enAlgunaPestana = async () => {
        for (let v = 0; v < (await pestanas.count()) && !(await control.isVisible()); v += 1) {
          if (await pestanas.nth(v).isVisible()) await pestanas.nth(v).click();
        }
        return control.isVisible();
      };
      for (let e = 0; e < (await estados.count()) && !(await enAlgunaPestana()); e += 1) await estados.nth(e).click();
      await enAlgunaPestana();
    }
    if (!(await control.isVisible())) {
      fallas.push(`control que nunca se hizo visible: ${await control.getAttribute("data-controlador")}`);
      continue;
    }
    // Un botón de grupo que volvió a quedar pulsado (p. ej. «Todas» tras «Quitar filtros»): se pulsa
    // antes un hermano para que activarlo tenga algo que cambiar.
    const hermano = control.locator('xpath=../*[@aria-pressed="false"]').first();
    if ((await hermano.count()) > 0) await hermano.click();
    await activar(i);
  }

  return { fallas, activados };
}
