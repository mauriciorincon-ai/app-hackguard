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
    const nombre = `${await control.getAttribute("data-controlador")}${(await control.getAttribute("data-valor")) ? ":" + (await control.getAttribute("data-valor")) : ""}`;
    const antes = await huellaDelDom(page);
    await control.click();
    const despues = await huellaDelDom(page);
    activados += 1;
    if (antes === despues) fallas.push(`el control «${nombre}» no cambió nada al activarlo`);
  };

  // Un botón de grupo ya pulsado no cambia nada al pulsarlo otra vez: se deja para una segunda
  // vuelta, cuando otro del grupo ya tomó el estado.
  const pendientes = [];
  for (let i = 0; i < total; i++) {
    const control = controles.nth(i);
    if (!(await control.isVisible())) {
      fallas.push(`control no visible: ${await control.getAttribute("data-controlador")}`);
      continue;
    }
    if ((await control.getAttribute("aria-pressed")) === "true") pendientes.push(i);
    else await activar(i);
  }
  for (const i of pendientes) await activar(i);

  return { fallas, activados };
}
