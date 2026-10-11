import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// La pantalla del catálogo, servida como la usa quien la abre: la lista de las pruebas de la instantánea oficial, sus
// filtros, la ficha de cada prueba, el tema y el idioma. En español (el inglés llega al cierre del hito). Ninguna aserción
// fija una cuenta de vigencia: la fecha de consulta es la del commit que se construye y las cifras envejecen con ella.

const CARPETA = join("datos", "instantaneas");
const OFICIAL = readdirSync(CARPETA)
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const IDS: string[] = JSON.parse(
  readFileSync(join(CARPETA, OFICIAL), "utf8"),
).catalogo.pruebas.map((p: { id: string }) => p.id);

// Las filas filtradas o de otra página siguen en el DOM, ocultas: se cuentan las que se ven. La lista muestra 20 por página.
const POR_PAGINA = 20;
const TOTAL = IDS.length;
const filas = (page: Page) => page.locator("tr[data-prueba]:visible");
const idsVisibles = (page: Page) =>
  filas(page).evaluateAll((trs) =>
    trs.map((tr) => tr.getAttribute("data-prueba")!),
  );
const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

test.describe("/catalogo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalogo");
    await expect(
      page.getByRole("heading", { level: 1, name: "Catálogo de pruebas" }),
    ).toBeVisible();
  });

  test("lista las pruebas de la instantánea oficial, 20 por página, una por una", async ({
    page,
  }) => {
    expect(TOTAL).toBeGreaterThan(POR_PAGINA);
    await expect(filas(page)).toHaveCount(POR_PAGINA);
    const primera = await idsVisibles(page);
    await expect(page.locator("[data-cuenta-filtrada]:visible")).toHaveText(
      String(TOTAL),
    );
    await page.getByRole("button", { name: /Siguiente/ }).click();
    await expect(filas(page)).toHaveCount(TOTAL - POR_PAGINA);
    const segunda = await idsVisibles(page);
    expect([...primera, ...segunda].sort()).toEqual([...IDS].sort());
    await expect(
      page.getByRole("button", { name: /Siguiente/ }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /Anterior/ }).click();
    expect(await idsVisibles(page)).toEqual(primera);
    await expect(page.getByRole("button", { name: /Anterior/ })).toBeDisabled();
  });

  test("un filtro devuelve a la página 1 y el filtro «herramienta» reduce la lista", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Siguiente/ }).click();
    await page.locator("#filtro-herramienta").selectOption({ index: 1 });
    await expect(
      page.getByRole("navigation", { name: /Paginación/ }),
    ).toBeHidden();
    const quedan = await filas(page).count();
    expect(quedan).toBeGreaterThan(0);
    expect(quedan).toBeLessThan(TOTAL);
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(filas(page)).toHaveCount(POR_PAGINA);
    await expect(page.getByRole("button", { name: /Anterior/ })).toBeDisabled();
  });

  test("un filtro reduce la lista y «Quitar filtros» la restaura", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Modelo de decisión" }).click();
    const quedan = await filas(page).count();
    expect(quedan).toBeGreaterThan(0);
    expect(quedan).toBeLessThan(TOTAL);
    await expect(page.locator("[data-cuenta-filtrada]:visible")).toHaveText(
      String(quedan),
    );
    await page.locator("#filtro-madurez").selectOption("propia");
    expect(await filas(page).count()).toBeLessThanOrEqual(quedan);
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(filas(page)).toHaveCount(POR_PAGINA);
    await expect(page.getByRole("button", { name: "Todas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("una combinación sin pruebas dice «Ninguna prueba cumple esos filtros» y se sale de ella", async ({
    page,
  }) => {
    await page
      .locator("#filtro-revision")
      .selectOption("marcada_para_revision");
    await expect(
      page.getByRole("heading", { name: "Ninguna prueba cumple esos filtros" }),
    ).toBeVisible();
    await expect(filas(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(filas(page)).toHaveCount(POR_PAGINA);
  });

  test("cada fila abre la ficha de SU prueba, con la misma vigencia que mostraba la fila", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Agente" }).click();
    const fila = filas(page).first();
    const id = (await fila.getAttribute("data-prueba"))!;
    const vigencia = await fila
      .locator("[data-estado-fechado]")
      .first()
      .getAttribute("data-estado-fechado");
    await fila.getByRole("link").first().click();
    await expect(page).toHaveURL(new RegExp(`/catalogo/${id}$`));
    await expect(page.locator(`[data-ficha-de="${id}"]`)).toBeVisible();
    await expect(page.locator("[data-ficha-vigencia]")).toHaveAttribute(
      "data-ficha-vigencia",
      vigencia!,
    );
    for (const seccion of [
      "Resultado esperado",
      "Cómo se decide el veredicto",
      "Configuración de la corrida",
      "Cuándo aplica",
      "Resumen",
      "Marco y controles",
      "Fuentes",
    ]) {
      await expect(page.getByRole("heading", { name: seccion })).toBeVisible();
    }
    await page.getByRole("link", { name: "Volver al catálogo" }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
  });

  test("una prueba que no existe da 404, no una ficha vacía", async ({
    page,
  }) => {
    const respuesta = await page.goto("/catalogo/PR-NO-EXISTE-001");
    expect(respuesta?.status()).toBe(404);
  });

  test("el tema y el idioma cambian y se conservan al recargar", async ({
    page,
  }) => {
    const raiz = page.locator("html");
    await expect(raiz).toHaveAttribute("data-theme", "oscuro");
    await page
      .getByRole("button", { name: "Cambiar entre tema oscuro y claro" })
      .click();
    await expect(raiz).toHaveAttribute("data-theme", "claro");
    await page
      .getByRole("button", { name: "Cambiar el idioma a inglés" })
      .click();
    await expect(raiz).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: "Test catalog" }),
    ).toBeVisible();
    await page.reload();
    await expect(raiz).toHaveAttribute("data-theme", "claro");
    await expect(raiz).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: "Test catalog" }),
    ).toBeVisible();
  });

  test("sin desborde horizontal a 380 px, en la lista y en una ficha", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    for (const ruta of ["/catalogo", `/catalogo/${IDS[0]}`]) {
      await page.goto(ruta);
      const [ancho, visible] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(ancho, ruta).toBeLessThanOrEqual(visible);
    }
  });

  test("sin violaciones serias de accesibilidad, en los dos temas, en la lista y en una ficha", async ({
    page,
  }) => {
    // Con «reducir movimiento» la hoja no anima el cambio de tema (axe leería el color a mitad de la transición) y es
    // además la preferencia que la regla 5 pide cubrir.
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const tema of ["oscuro", "claro"]) {
      await page.evaluate(
        (t) => document.documentElement.setAttribute("data-theme", t),
        tema,
      );
      expect(await serias(page), `lista, tema ${tema}`).toEqual([]);
    }
    await page.goto(`/catalogo/${IDS[0]}`);
    for (const tema of ["oscuro", "claro"]) {
      await page.evaluate(
        (t) => document.documentElement.setAttribute("data-theme", t),
        tema,
      );
      expect(await serias(page), `ficha, tema ${tema}`).toEqual([]);
    }
  });
});
