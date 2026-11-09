import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// D1 y D3 tal como las usa quien las abre, en español (el inglés llega al cierre del hito): del panel de instantáneas a «qué cambió
// entre dos instantáneas», y del plan del clasificador (desactualizado) a su historial de versiones. Ninguna aserción fija una fecha.

const CLASIFICADOR = "act-demo-clasificador";

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

const sinDesborde = async (page: Page) => {
  const [ancho, visible] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(ancho).toBeLessThanOrEqual(visible);
};

test.describe("/catalogo/diferencias", () => {
  test("desde los marcos se llega a lo que cambió; la demo se dice demo", async ({
    page,
  }) => {
    await page.goto("/catalogo/marcos");
    await page
      .getByRole("link", { name: "Ver qué cambió entre dos instantáneas" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/catalogo\/diferencias\/?$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Demo, no oficial").first()).toBeVisible();
    for (const tipo of ["entra", "sale", "cambia"])
      await expect(
        page.locator(`[data-movimiento="${tipo}"]`).first(),
      ).toBeVisible();
    await expect(page.getByText("PR-MD-DEMO-001").first()).toBeVisible();
    await sinDesborde(page);
    expect(await serias(page)).toEqual([]);
  });
});

test.describe("el selector de comparaciones", () => {
  test("lista cada comparación consecutiva, marca la abierta y su enlace abre esa misma comparación", async ({
    page,
  }) => {
    await page.goto("/catalogo/diferencias");
    const entre = await page
      .locator("[data-diferencias]")
      .getAttribute("data-entre");
    const selector = page.getByRole("navigation", {
      name: "Comparaciones entre instantáneas consecutivas",
    });
    const enlaces = selector.getByRole("link");
    const n = await enlaces.count();
    expect(n).toBeGreaterThanOrEqual(1);
    // Exactamente una está abierta, con aria-current y con el texto «la que ves» (nunca solo el estilo).
    const abierta = selector.locator('[aria-current="page"]');
    await expect(abierta).toHaveCount(1);
    await expect(abierta).toContainText("la que ves");
    expect(await abierta.getAttribute("data-par")).toBe(entre);
    // El enlace de la abierta lleva a su propia página, con las mismas cifras.
    const cifras = await page.locator(".hg-resumen").innerText();
    await abierta.click();
    await expect(page).toHaveURL(
      new RegExp(`/catalogo/diferencias/${entre!.replace("..", "/")}/?$`),
    );
    await expect(page.locator("[data-diferencias]")).toHaveAttribute(
      "data-entre",
      entre!,
    );
    expect(await page.locator(".hg-resumen").innerText()).toBe(cifras);
    await expect(
      page
        .getByRole("navigation", {
          name: "Comparaciones entre instantáneas consecutivas",
        })
        .locator('[aria-current="page"]'),
    ).toHaveCount(1);
    await sinDesborde(page);
    expect(await serias(page)).toEqual([]);
  });

  test("una comparación que no existe no tiene página", async ({ page }) => {
    const r = await page.goto(
      "/catalogo/diferencias/2026-01-01-000000000000/2026-01-02-000000000000",
    );
    expect(r?.status()).toBe(404);
  });
});

test.describe("el plan desactualizado y su historial", () => {
  test("el plan del clasificador avisa y lleva al historial con las dos versiones", async ({
    page,
  }) => {
    await page.goto(`/activos/${CLASIFICADOR}/plan`);
    await expect(
      page.locator(`[data-plan-de="${CLASIFICADOR}"]`),
    ).toBeVisible();
    await expect(page.getByText("Plan desactualizado").first()).toBeVisible();
    await page
      .getByRole("link", { name: "Ver qué cambió en el activo" })
      .click();
    await expect(page).toHaveURL(/\/historial\/?$/);
    await expect(
      page.locator(`[data-historial-de="${CLASIFICADOR}"]`),
    ).toBeVisible();
    await expect(page.locator("[data-version]")).toHaveCount(2);
    await expect(page.locator('[data-version="2"]')).toHaveAttribute(
      "data-vigente",
      "true",
    );
    await expect(page.locator('[data-version="1"]')).toContainText(
      "El plan se emitió con esta versión",
    );
    await expect(
      page.locator('[data-campo="rasgos.modelo_de_terceros"]'),
    ).toBeVisible();
    await sinDesborde(page);
    expect(await serias(page)).toEqual([]);
  });

  test("el asistente demo no tiene historial ni aviso", async ({ page }) => {
    await page.goto("/activos/act-demo-asistente/plan");
    await expect(page.getByText("Plan desactualizado")).toHaveCount(0);
    expect(
      (await page.goto("/activos/act-demo-asistente/historial"))?.status(),
    ).toBe(404);
  });
});
