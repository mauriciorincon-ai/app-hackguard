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
    if ((await control.evaluate((el) => el.tagName)) === "SELECT") {
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
    // Un control puede vivir bajo OTRO estado de la pantalla (el botón del estado vacío): se le busca
    // recorriendo los estados de la sala antes de darlo por inalcanzable.
    if (!(await control.isVisible())) {
      const estados = page.locator('.mq-sala [data-controlador="estado"]');
      for (let e = 0; e < (await estados.count()) && !(await control.isVisible()); e += 1) await estados.nth(e).click();
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
