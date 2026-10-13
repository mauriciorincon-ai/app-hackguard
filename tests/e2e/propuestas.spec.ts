import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// La bandeja de propuestas (`/catalogo/propuestas`) tal como la usa quien decide, en español: la cifra de «por decidir», el filtro por
// quién propone, el registro de la última corrida de cada agente, el comando que registra una decisión (y que la pantalla no guarda
// nada), el 380 px y la accesibilidad en los dos temas. Ninguna aserción fija una cuenta: las propuestas cambian con cada corrida.

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

const propuestas = (page: Page) => page.locator("[data-propuesta]:visible");

test.describe("/catalogo/propuestas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalogo/propuestas");
  });

  test("la cifra de «por decidir» es la cuenta de las propuestas sin decidir", async ({
    page,
  }) => {
    const sinDecidir = await page
      .locator('[data-propuesta][data-decision=""]')
      .count();
    expect(sinDecidir).toBeGreaterThan(0);
    await expect(
      page.locator('[data-cifra="por_decidir"] .hg-cifra'),
    ).toHaveText(new RegExp(`^\\s*${sinDecidir}\\s*$`));
  });

  test("el filtro «quién propone» deja solo las propuestas de ese agente", async ({
    page,
  }) => {
    const boton = page.locator(
      '[data-controlador="filtro"][data-valor="extractor"]',
    );
    await boton.click();
    await expect(boton).toHaveAttribute("aria-pressed", "true");
    const origenes = await propuestas(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-origen")),
    );
    expect(origenes.length).toBeGreaterThan(0);
    expect(new Set(origenes)).toEqual(new Set(["extractor"]));
  });

  test("el carril muestra la última corrida de cada agente, con su identificador", async ({
    page,
  }) => {
    const carril = page.locator(".hg-carril");
    await expect(carril).toContainText("Última corrida del investigador");
    await expect(carril).toContainText("Última corrida del extractor");
    await expect(
      page.locator('[data-corrida="INV-2026-10-12-01"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-corrida="EXT-2026-10-12-01"]'),
    ).toBeVisible();
  });

  test("una fuente que no respondió al agente queda dicha como no accesible, sin rodearla", async ({
    page,
  }) => {
    await expect(
      page.getByText("no accesible al agente").first(),
    ).toBeVisible();
  });

  test("rechazar marca la decisión y muestra el comando que la registra; recargar la pantalla la deshace", async ({
    page,
  }) => {
    const articulo = propuestas(page).first();
    const id = await articulo.getAttribute("data-propuesta");
    const boton = page.locator(
      `[data-propuesta="${id}"] [data-controlador="decidir"][data-valor="rechazar"]`,
    );
    await boton.click();
    await expect(boton).toHaveAttribute("aria-pressed", "true");
    const comando = page.locator(`[data-propuesta="${id}"] [data-comando]`);
    await expect(comando).toContainText(
      `pnpm propuestas:decidir ${id} --decision rechazar`,
    );
    await expect(comando).toContainText("--motivo");
    await expect(comando).toContainText("no se guardó");
    // La pantalla no guarda nada: al recargar, la decisión marcada desaparece.
    await page.reload();
    await expect(
      page.locator(
        `[data-propuesta="${id}"] [data-controlador="decidir"][data-valor="rechazar"]`,
      ),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("aprobar dice su consecuencia y arma el comando; aprobar tras revisar dice que queda registrada la revisión", async ({
    page,
  }) => {
    const limpia = page
      .locator(
        '[data-propuesta]:has([data-controlador="decidir"][data-valor="aprobar"])',
      )
      .first();
    const id = await limpia.getAttribute("data-propuesta");
    await limpia
      .locator('[data-controlador="decidir"][data-valor="aprobar"]')
      .click();
    await expect(limpia.locator('[data-si-decision="aprobar"]')).toBeVisible();
    await expect(limpia.locator("[data-comando]")).toContainText(
      `pnpm propuestas:decidir ${id} --decision aprobar `,
    );
    const marcada = page
      .locator(
        '[data-propuesta]:has([data-controlador="decidir"][data-valor="aprobar_tras_revisar"])',
      )
      .first();
    const idMarcada = await marcada.getAttribute("data-propuesta");
    await marcada
      .locator(
        '[data-controlador="decidir"][data-valor="aprobar_tras_revisar"]',
      )
      .click();
    await expect(
      marcada.locator('[data-si-decision="aprobar_tras_revisar"]'),
    ).toContainText("la revisaste tú");
    await expect(marcada.locator("[data-comando]")).toContainText(
      `${idMarcada} --decision aprobar-tras-revisar`,
    );
  });

  test("separar un texto que mezcla pruebas dice cuántas nacen y arma su comando", async ({
    page,
  }) => {
    const mezcla = page
      .locator(
        '[data-propuesta]:has([data-controlador="decidir"][data-valor="separar"])',
      )
      .first();
    const id = await mezcla.getAttribute("data-propuesta");
    await mezcla
      .locator('[data-controlador="decidir"][data-valor="separar"]')
      .click();
    await expect(mezcla.locator('[data-si-decision="separar"]')).toBeVisible();
    await expect(mezcla.locator("[data-comando]")).toContainText(
      `pnpm propuestas:decidir ${id} --decision separar`,
    );
  });

  test("sin desborde horizontal a 380 px", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto("/catalogo/propuestas");
    const [ancho, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(ancho).toBeLessThanOrEqual(visible);
  });

  test("sin violaciones serias de accesibilidad, en los dos temas", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const tema of ["oscuro", "claro"]) {
      await page.evaluate(
        (t) => document.documentElement.setAttribute("data-theme", t),
        tema,
      );
      // La transición de color termina antes de medir: si axe lee a medio camino da un falso rojo de contraste.
      await page.waitForTimeout(700);
      expect(await serias(page), `propuestas, tema ${tema}`).toEqual([]);
    }
  });
});
