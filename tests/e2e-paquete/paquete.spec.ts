import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import path from "node:path";

// C20 · el paquete servido como lo recibirá CV Viva: sin URL limpias, bajo /piezas/hackguard/, en 127.0.0.1. Se recorre desde la
// entrada siguiendo solo enlaces; cada página responde 200, es accesible en ES y EN a 380 px, no desborda, no pide nada fuera de
// 127.0.0.1 (cualquier petición ajena se aborta y hace fallar el test) y no deja un error en la consola.

const BASE = "/piezas/hackguard";
const PIEZA = path.join(
  process.cwd(),
  "dist/paquete-hoja-de-vida/public/piezas/hackguard",
);
const paginasDelPaquete = (dir = PIEZA): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory())
      return e.name === "_next" || e.name === "_not-found"
        ? []
        : paginasDelPaquete(abs);
    return e.name.endsWith(".html")
      ? [`${BASE}/${path.relative(PIEZA, abs).split(path.sep).join("/")}`]
      : [];
  });
// Las páginas de la pieza: la entrada, el catálogo, las fichas, marcos, controles, la brecha y sus controles (sin `_not-found/`).
const ESPERADAS = paginasDelPaquete()
  .filter((r) => !/\/(404|_not-found)\.html$/.test(r))
  .sort();

function vigilar(page: Page) {
  const ajenas: string[] = [];
  const malas: string[] = [];
  void page.route("**/*", (ruta) => {
    const u = new URL(ruta.request().url());
    if (u.hostname === "127.0.0.1") return ruta.continue();
    ajenas.push(u.href);
    return ruta.abort();
  });
  page.on("console", (m) => {
    if (m.type() === "error") malas.push(`consola: ${m.text()}`);
  });
  page.on("pageerror", (e) => malas.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) malas.push(`${r.status()} ${r.url()}`);
  });
  return { ajenas, malas };
}

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => v.id);

for (const idioma of ["es", "en"] as const) {
  test.describe(`paquete · ${idioma}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((i) => {
        try {
          window.localStorage.setItem("hackguard:idioma", i);
        } catch {
          /* sin almacenamiento sale en español */
        }
      }, idioma);
    });

    test("se recorre desde la entrada por sus enlaces: cada página existe, es accesible y no sale de 127.0.0.1", async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const { ajenas, malas } = vigilar(page);
      const vistas = new Set<string>();
      const porVer = [`${BASE}/index.html`];
      while (porVer.length > 0) {
        const url = porVer.pop()!;
        if (vistas.has(url)) continue;
        vistas.add(url);
        const r = await page.goto(url);
        expect(r?.status(), url).toBe(200);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html"), url).toHaveAttribute("lang", idioma);
        expect(await serias(page), `${url}: axe`).toEqual([]);
        const ancho = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          window.innerWidth,
        ]);
        expect(ancho[0], `${url}: desborda`).toBeLessThanOrEqual(ancho[1]!);
        const hrefs = await page
          .locator("a[href]")
          .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
        for (const h of hrefs) {
          if (h.startsWith("#")) continue;
          expect(h.startsWith(`${BASE}/`), `${url}: ${h} sin la base`).toBe(
            true,
          );
          const sin = h.split("#")[0]!.split("?")[0]!;
          expect(sin.endsWith(".html"), `${url}: ${h} sin .html`).toBe(true);
          porVer.push(sin);
        }
      }
      expect([...vistas].sort(), "páginas alcanzables por enlaces").toEqual(
        ESPERADAS,
      );
      expect(ajenas, "peticiones fuera de 127.0.0.1").toEqual([]);
      expect(malas, "errores de consola o respuestas ≥ 400").toEqual([]);
    });
  });
}

test("un enlace del paquete es un <a> con la base y sin precarga (no hay archivos RSC que pedir)", async ({
  page,
}) => {
  const pedidas: string[] = [];
  page.on("request", (r) => pedidas.push(new URL(r.url()).pathname));
  await page.goto(`${BASE}/catalogo.html`);
  await page.waitForLoadState("networkidle");
  expect(pedidas.filter((p) => p.endsWith(".txt"))).toEqual([]);
  await page
    .locator('a[href^="/piezas/hackguard/catalogo/PR-"]')
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/piezas\/hackguard\/catalogo\/PR-[A-Z0-9-]+\.html$/,
  );
});

test("lo que no está en el paquete no existe: ni el tablero, ni un activo, ni la maqueta", async ({
  page,
}) => {
  for (const ruta of [
    `${BASE}/tablero.html`,
    `${BASE}/activos/act-demo-asistente.html`,
    `${BASE}/diseno/index.html`,
    `${BASE}/conoce/index.html`,
  ]) {
    const r = await page.goto(ruta);
    expect(r?.status(), ruta).toBe(404);
  }
});
