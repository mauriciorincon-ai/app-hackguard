import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Las pantallas «Marcos y versiones» y «Controles» tal como las usa quien las abre, en español (el inglés llega al cierre del
// hito): los 14 marcos con su mapa, la instantánea oficial marcada, las 9 áreas del Anexo A, un control con sus pruebas y las
// pruebas sin control. Ninguna aserción fija una cuenta de vigencia: las cifras envejecen con la fecha de consulta.

const CARPETA = join("datos", "instantaneas");
const OFICIAL = readdirSync(CARPETA)
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const SNAP = JSON.parse(readFileSync(join(CARPETA, OFICIAL), "utf8"));
const NOMBRE = OFICIAL.replace(/\.json$/, "");
const MARCOS = SNAP.catalogo.marcos.length as number;
const AREAS = SNAP.catalogo.controles[0].areas.length as number;
const SIN_CONTROL = SNAP.catalogo.pruebas.filter(
  (p: { controles: unknown[] }) => p.controles.length === 0,
).length as number;

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

test.describe("/catalogo/marcos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalogo/marcos");
    await expect(
      page.getByRole("heading", { level: 1, name: "Marcos y versiones" }),
    ).toBeVisible();
  });

  test("muestra los 14 marcos, uno por fila, con su versión en el catálogo", async ({
    page,
  }) => {
    expect(MARCOS).toBe(14);
    await expect(page.locator("tr[data-marco]:visible")).toHaveCount(MARCOS);
    await expect(
      page.locator('tr[data-marco="owasp-llm-top10"]:visible'),
    ).toContainText(
      SNAP.catalogo.marcos.find(
        (m: { id: string }) => m.id === "owasp-llm-top10",
      ).version_vigente,
    );
  });

  test("el mapa de equivalencias OWASP LLM 2025 → 2026 lista sus pares y las pruebas que citan la entrada nueva", async ({
    page,
  }) => {
    const mapa = page.locator("section", {
      has: page.getByRole("heading", { name: "Mapa de equivalencias" }),
    });
    await expect(mapa).toBeVisible();
    const pares = SNAP.catalogo.equivalencias[0].pares.length;
    await expect(mapa.locator("tbody tr")).toHaveCount(pares);
    await expect(mapa.getByText("Cambia de número").first()).toBeVisible();
  });

  test("la instantánea oficial sale marcada como oficial y las demás como anteriores", async ({
    page,
  }) => {
    const oficial = page.locator(`tr[data-instantanea="${NOMBRE}"]`);
    await expect(oficial).toHaveAttribute("data-oficial", "true");
    await expect(oficial).toContainText("Oficial");
  });

  test("la página dice que no hay avisos de versión, sin prometer una fecha", async ({
    page,
  }) => {
    await expect(page.getByText("Sin avisos registrados")).toBeVisible();
    await expect(page.getByText("Sin aviso registrado").first()).toBeVisible();
  });

  test("sin desborde horizontal a 380 px", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto("/catalogo/marcos");
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
      expect(await serias(page), `marcos, tema ${tema}`).toEqual([]);
    }
  });
});

test.describe("/catalogo/controles", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalogo/controles");
    await expect(
      page.getByRole("heading", { level: 1, name: "Controles" }),
    ).toBeVisible();
  });

  test("muestra las 9 áreas del Anexo A con su cobertura", async ({ page }) => {
    expect(AREAS).toBe(9);
    await expect(page.locator("[data-area]:visible")).toHaveCount(AREAS);
  });

  test("dice que los resúmenes no se contrastaron con la norma, con su marca y su texto", async ({
    page,
  }) => {
    await expect(
      page.getByText("No contrastado con la norma").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Solo identificadores y resúmenes propios"),
    ).toBeVisible();
  });

  test("un control con sus pruebas lleva a la ficha de una de ellas", async ({
    page,
  }) => {
    const control = page.locator("tr[data-control]").first();
    await expect(control).toBeVisible();
    const id = (await control.locator("a").first().textContent())!.trim();
    await control.locator("a").first().click();
    await expect(page).toHaveURL(new RegExp(`/catalogo/${id}$`));
    await expect(page.locator(`[data-ficha-de="${id}"]`)).toBeVisible();
  });

  test("las pruebas sin control se listan como deuda, con el chip «Sin control»", async ({
    page,
  }) => {
    const deuda = page.locator("tr[data-prueba]:visible");
    await expect(deuda).toHaveCount(SIN_CONTROL);
    await expect(
      page.getByRole("heading", { name: "Pruebas sin control asignado" }),
    ).toBeVisible();
    await expect(
      page.getByText("una deuda a la vista, no un error"),
    ).toBeVisible();
  });

  test("sin desborde horizontal a 380 px", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto("/catalogo/controles");
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
      expect(await serias(page), `controles, tema ${tema}`).toEqual([]);
    }
  });
});

test("la navegación enlaza Marcos y Controles por su ruta, y Propuestas sigue «pronto»", async ({
  page,
}) => {
  await page.goto("/catalogo");
  // Por destino y no por nombre: en teléfono la barra de abajo no lleva el mismo nombre accesible que la lateral.
  await expect(
    page.locator('a[href="/catalogo/marcos"]').first(),
  ).toBeAttached();
  await expect(
    page.locator('a[href="/catalogo/controles"]').first(),
  ).toBeAttached();
  await expect(page.getByText("Propuestas").first()).toBeAttached();
});
