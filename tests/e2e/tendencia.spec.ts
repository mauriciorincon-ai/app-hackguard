import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// La evidencia en el tiempo, en español (el inglés llega al cierre del hito): el hallazgo reabierto con su cadena por ciclos y la
// tendencia de la brecha control por control. Ninguna aserción fija la fecha de consulta: la historia de HZ-0011 (abre, cierra por
// re-prueba y se reabre cuando una re-prueba posterior vuelve a fallar) está en el libro demo, y lo demás sale del motor.

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

test.describe("un hallazgo reabierto (D5)", () => {
  test("HZ-0011 está reabierto, lo dice con símbolo y texto, y su cadena abre un segundo ciclo", async ({
    page,
  }) => {
    await page.goto("/evidencia/hallazgos/HZ-0011");
    const pagina = page.locator('[data-hallazgo="HZ-0011"]');
    await expect(pagina).toHaveAttribute("data-estado-hallazgo", "reabierto");
    const cabecera = page.locator("main").getByText("Reabierto").first();
    await expect(cabecera).toBeVisible();
    // La cadena tiene más eslabones que los de un hallazgo cerrado una sola vez: el segundo ciclo viene detrás de la reapertura.
    const cadena = page.locator(".hg-eslabon");
    expect(await cadena.count()).toBeGreaterThan(6);
    await expect(
      page.locator(".hg-eslabon", { hasText: "Reabierto" }),
    ).not.toHaveCount(0);
    for (const e of await cadena.all())
      await expect(e.locator("svg").first()).toBeVisible();
  });

  test("el selector lista el reabierto justo después del abierto", async ({
    page,
  }) => {
    await page.goto("/evidencia/hallazgos/HZ-0007");
    const opciones = await page
      .locator(".hg-selector .hg-opcion")
      .allInnerTexts();
    const i = opciones.findIndex((t) => t.includes("HZ-0011"));
    // El primero es el abierto (HZ-0007) y el reabierto va justo detrás: pide trabajo igual que él.
    expect(opciones[0]).toContain("HZ-0007");
    expect(i).toBe(1);
  });
});

test.describe("la tendencia de la brecha (D6)", () => {
  test("cuenta el control que empeoró por la regresión, con su hallazgo y su enlace", async ({
    page,
  }) => {
    await page.goto("/brecha/tendencia");
    await expect(page.locator("h1")).toContainText("Tendencia de la brecha");
    const fila = page.locator('[data-tendencia-control="iso42001-A.6.2.8"]');
    await expect(fila).toHaveAttribute("data-sentido", "empeoro");
    await expect(fila).toHaveAttribute("data-regresion", "true");
    await expect(fila).toContainText("Regresión");
    await expect(fila.locator('a[href*="HZ-0011"]')).toBeVisible();
    const pasos = page.locator('[data-pasos-de="iso42001-A.6.2.8"]');
    await expect(pasos.locator("[data-paso]")).toHaveCount(3);
    await expect(pasos.locator("[data-regresion-de='HZ-0011']")).toBeVisible();
  });

  test("la última fila de la serie es la fecha de la consulta, y cada cifra trae marca y texto", async ({
    page,
  }) => {
    await page.goto("/brecha/tendencia");
    const filas = page.locator("tr[data-corte]");
    expect(await filas.count()).toBeGreaterThan(2);
    const consulta = await page
      .locator(".hg-cabecera-meta")
      .getByText(/^\d{4}-\d{2}-\d{2}$/)
      .last()
      .innerText();
    await expect(filas.last()).toHaveAttribute("data-corte", consulta);
    for (const clave of [
      "tendencia-mejoraron",
      "tendencia-empeoraron",
      "tendencia-igual",
      "tendencia-regresion",
    ])
      await expect(
        page.locator(`[data-cifra="${clave}"] svg`).first(),
      ).toBeVisible();
  });

  test("se llega desde la brecha, sin desborde a 380 px y sin fallas serias de accesibilidad en los dos temas", async ({
    page,
  }) => {
    await page.goto("/brecha");
    // La barra lateral esconde las subpáginas bajo 1100 px: el enlace de la brecha es el que llega en el teléfono.
    await page.locator("[data-enlace-tendencia] a").click();
    await expect(page).toHaveURL(/\/brecha\/tendencia\/?$/);
    expect(await serias(page)).toEqual([]);
    await page.setViewportSize({ width: 380, height: 800 });
    const [ancho, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(ancho).toBeLessThanOrEqual(visible);
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await serias(page)).toEqual([]);
  });
});
