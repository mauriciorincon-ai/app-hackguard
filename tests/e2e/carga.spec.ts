import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// La pantalla de carga de evidencia tal como la lee quien confirma un lote, en español (el inglés llega al cierre del
// hito): los dos lotes del demo, la revisión que la regla de E-5 dicta (las fallidas siempre, el resto por muestra), el
// sobre sin constancia de ejecución de ZAP como «No ejecutada», la fila elegida que abre su ficha, las pestañas de vía,
// 380 px y accesibilidad en los dos temas. Ninguna aserción fija una fecha: los lotes y sus cuentas salen del demo.

const RUTA = "/evidencia/carga";

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

const selectorDeLote = (page: Page, id: string) =>
  page.locator(".hg-selector .hg-opcion", { hasText: id });

const zona = (page: Page, id: string) => page.locator(`[data-lote="${id}"]`);

test.describe("los lotes del demo y su decisión", () => {
  test("la página lista los dos lotes importados, ambos por confirmar, con sus sobres y sus fallidas", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await expect(page.locator(".hg-selector .hg-opcion")).toHaveCount(2);
    // LOTE-0008 trae además la re-prueba SOB-0036 de HZ-0009, que se revisa siempre (B2): 2 obligatorias.
    for (const [id, obligatorias] of [
      ["LOTE-0007", "1"],
      ["LOTE-0008", "2"],
    ] as const) {
      await expect(zona(page, id)).toHaveAttribute(
        "data-decision",
        "por_confirmar",
      );
      await expect(zona(page, id)).toHaveAttribute("data-sobres", "3");
      await expect(zona(page, id)).toHaveAttribute(
        "data-obligatorias",
        obligatorias,
      );
    }
  });

  test("elegir otro lote en el selector cambia la zona visible y marca el control", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await selectorDeLote(page, "LOTE-0008").click();
    await expect(selectorDeLote(page, "LOTE-0008")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(zona(page, "LOTE-0008")).toBeVisible();
    await expect(zona(page, "LOTE-0007")).toBeHidden();
  });
});

test.describe("la revisión de E-5", () => {
  test("toda fallida se revisa siempre, aunque el lote tenga muestra", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await expect(
      zona(page, "LOTE-0007").locator('tr[data-sobre="SOB-0032"]'),
    ).toHaveAttribute("data-revision", "siempre");
    await selectorDeLote(page, "LOTE-0008").click();
    await expect(
      zona(page, "LOTE-0008").locator('tr[data-sobre="SOB-0034"]'),
    ).toHaveAttribute("data-revision", "siempre");
  });

  test("el resto de un lote que no falla entra a la muestra, nunca a la revisión obligatoria", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await expect(
      zona(page, "LOTE-0007").locator('tr[data-sobre="SOB-0031"]'),
    ).toHaveAttribute("data-revision", "muestra");
    await expect(
      zona(page, "LOTE-0007").locator('tr[data-sobre="SOB-0033"]'),
    ).toHaveAttribute("data-revision", "muestra");
  });

  test("una prueba de ZAP sin constancia de ejecución aparece como No ejecutada, no como superada", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await selectorDeLote(page, "LOTE-0008").click();
    const fila = zona(page, "LOTE-0008").locator('tr[data-sobre="SOB-0035"]');
    await expect(fila).toContainText("No ejecutada");
    await expect(fila).not.toContainText("Superada");
  });
});

test.describe("la fila elegida y las pestañas", () => {
  test("elegir un sobre marca su control y muestra su ficha, y oculta la anterior", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await selectorDeLote(page, "LOTE-0008").click();
    const boton = zona(page, "LOTE-0008")
      .locator('tr[data-sobre="SOB-0035"] button')
      .first();
    await boton.click();
    await expect(boton).toHaveAttribute("aria-pressed", "true");
    await expect(
      zona(page, "LOTE-0008").locator('[data-si-seleccion="SOB-0035"]'),
    ).toBeVisible();
    await expect(
      zona(page, "LOTE-0008").locator('[data-si-seleccion="SOB-0034"]'),
    ).toBeHidden();
  });

  test("las pestañas de vía cambian la vista y dicen cuál está activa", async ({
    page,
  }) => {
    await page.goto(RUTA);
    const pestanas = page.locator("[data-pestanas] .hg-pestana");
    await expect(pestanas.first()).toHaveAttribute("aria-pressed", "true");
    await pestanas.nth(1).click();
    await expect(pestanas.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-pestanas]")).toHaveAttribute(
      "data-via",
      "pegado",
    );
  });
});

test.describe("en el móvil", () => {
  test("sin desborde horizontal a 380 px, con el lote abierto", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto(RUTA);
    await sinDesborde(page);
  });
});

test.describe("accesibilidad", () => {
  test("sin violaciones serias en la pantalla, en los dos temas", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(RUTA);
    for (const tema of ["oscuro", "claro"]) {
      await page.evaluate(
        (t) => document.documentElement.setAttribute("data-theme", t),
        tema,
      );
      expect(await serias(page), `carga, tema ${tema}`).toEqual([]);
    }
  });
});
