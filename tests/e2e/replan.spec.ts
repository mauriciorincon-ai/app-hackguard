import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// D4 tal como la usa quien la abre, en español (el inglés se ve cambiando de idioma a mitad del recorrido de la guía): del aviso del plan
// desactualizado a lo que cambiaría al re-planear, con la causa de cada movimiento. Ninguna aserción fija una fecha ni una huella.

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

test.describe("/activos/<id>/re-planear", () => {
  test("del aviso del plan se llega a lo que entraría, con su causa; la base demo se dice demo", async ({
    page,
  }) => {
    await page.goto(`/activos/${CLASIFICADOR}/plan`);
    await page
      .getByRole("link", { name: "Ver qué cambiaría al re-planear" })
      .click();
    await expect(page).toHaveURL(/\/re-planear\/?$/);
    await expect(
      page.locator(`[data-replan-de="${CLASIFICADOR}"]`),
    ).toBeVisible();

    // Base oficial: el único factor que cambió es el perfil.
    const oficial = page.locator('[data-base="oficial"]');
    await expect(
      oficial.locator('[data-movimiento="entra"][data-prueba="PR-MD-DER-001"]'),
    ).toHaveAttribute("data-causas", "perfil");
    await expect(oficial.getByText("no oficial")).toHaveCount(0);

    // Base demo: rotulada, con causa conjunta, causa de regla y los controles que ganan y pierden.
    const demo = page.locator('[data-base="demo"]');
    await expect(demo.getByText("Demo, no oficial").first()).toBeVisible();
    await expect(
      demo.locator('[data-prueba="PR-MD-DEMO-002"]'),
    ).toHaveAttribute("data-conjunta", "true");
    await expect(demo.locator('[data-prueba="PR-MD-INV-001"]')).toHaveAttribute(
      "data-causas",
      "regla",
    );
    await expect(
      demo
        .locator('[data-control="iso42001-A.6.2.2"][data-efecto="pierde"]')
        .first(),
    ).toBeVisible();
    await expect(
      demo
        .locator('[data-control="iso42001-A.7.4"][data-efecto="gana"]')
        .first(),
    ).toBeVisible();
    await sinDesborde(page);
    expect(await serias(page)).toEqual([]);
  });

  test("el asistente demo, con el plan vigente, no tiene esta página", async ({
    page,
  }) => {
    expect(
      (await page.goto("/activos/act-demo-asistente/re-planear"))?.status(),
    ).toBe(404);
  });
});
