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
