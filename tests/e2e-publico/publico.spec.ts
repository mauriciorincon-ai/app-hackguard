import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { esRutaPublica } from "../../src/lib/publico/lista-blanca.ts";

// C19 · la exportación pública, servida: solo lo que la lista blanca nombra, en español y en inglés, a 380 px, sin un enlace que salga de
// la lista y sin una sola petición fuera de 127.0.0.1. Lo que no está en la lista no existe (404).

const OFICIAL = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "datos/instantaneas/2026-10-05-d352e6afadfb.json"),
    "utf8",
  ),
);
const PRUEBA = OFICIAL.catalogo.pruebas[0].id as string;
const CONTROL = "iso42001-a-6-2-4";
const RUTAS = [
  "/",
  "/catalogo",
  `/catalogo/${PRUEBA}`,
  "/catalogo/marcos",
  "/catalogo/controles",
  "/brecha",
  "/brecha/control",
  `/brecha/control/${CONTROL}`,
];
const FUERA = [
  "/tablero",
  "/activos/act-demo-asistente",
  "/activos/act-demo-asistente/plan",
  "/activos/desde-ficha",
  "/evidencia/carga",
  "/evidencia/hallazgos/HZ-0007",
  "/brecha/informe",
  "/brecha/tendencia",
  "/catalogo/propuestas",
  "/catalogo/diferencias",
  "/diseno/index.html",
  "/conoce",
];

async function conRedCerrada(page: Page) {
  const ajenas: string[] = [];
  await page.route("**/*", (ruta) => {
    const u = new URL(ruta.request().url());
    if (u.hostname === "127.0.0.1") return ruta.continue();
    ajenas.push(u.href);
    return ruta.abort();
  });
  return ajenas;
}

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => v.id);

for (const idioma of ["es", "en"] as const) {
  test.describe(`modo público · ${idioma}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((i) => {
        try {
          window.localStorage.setItem("hackguard:idioma", i);
        } catch {
          /* sin almacenamiento sale en español */
        }
      }, idioma);
    });

    test("cada ruta de la lista carga, es accesible, no desborda y no sale de 127.0.0.1", async ({
      page,
    }) => {
      const ajenas = await conRedCerrada(page);
      for (const ruta of RUTAS) {
        const r = await page.goto(ruta);
        expect(r?.status(), ruta).toBe(200);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html"), ruta).toHaveAttribute(
          "lang",
          idioma,
        );
        // La entrada solo dice «HackGuard» (un nombre propio) y un enlace: su h1 no lleva texto traducible.
        if (ruta !== "/")
          await expect(
            page.locator(`h1 [lang='${idioma}']:visible`).first(),
            ruta,
          ).toBeVisible();
        expect(await serias(page), `${ruta}: axe`).toEqual([]);
        const ancho = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          ventana: window.innerWidth,
        }));
        expect(
          ancho.doc,
          `${ruta}: desborda a ${ancho.ventana}px`,
        ).toBeLessThanOrEqual(ancho.ventana);
      }
      expect(ajenas, "peticiones fuera de 127.0.0.1").toEqual([]);
    });

    test("ningún enlace sale de la lista blanca y el lateral solo trae catálogo y brecha", async ({
      page,
    }) => {
      for (const ruta of RUTAS) {
        await page.goto(ruta);
        const hrefs = await page
          .locator("a[href]")
          .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
        const malos = hrefs.filter(
          (h) =>
            !h.startsWith("#") &&
            !esRutaPublica(h) &&
            !h.startsWith("/_next/") &&
            h !== "/favicon.ico",
        );
        expect(malos, `${ruta}: enlaces fuera de la lista`).toEqual([]);
      }
      await page.goto("/catalogo");
      const secciones = await page
        .locator("nav.hg-nav > ul > li > a")
        .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      expect(secciones).toEqual(["/catalogo", "/brecha"]);
    });
  });
}

test.describe("modo público · lo que no está en la lista no existe", () => {
  for (const ruta of FUERA)
    test(`${ruta} → 404`, async ({ page }) => {
      const r = await page.goto(ruta);
      expect(r?.status(), ruta).toBe(404);
    });
});

test("la entrada lleva al catálogo, no al tablero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main a").first()).toHaveAttribute(
    "href",
    "/catalogo",
  );
});
