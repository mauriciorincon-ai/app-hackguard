import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// El flujo principal EN INGLÉS (regla 20: el e2e y las capturas van en un idioma por sprint; el otro al cierre del hito,
// que es este). La preferencia se fija antes de cargar con la misma clave que escribe el conmutador de la barra de
// contexto. En cada pantalla se comprueban tres cosas: el idioma de la página, que el título de la página se ve en
// inglés, y que ningún texto en español queda visible fuera de un dato neutro (`data-neutro`: identificadores, fechas,
// huellas). Y axe, sin violaciones serias.

const CARPETA = join("datos", "instantaneas");
const OFICIAL = readdirSync(CARPETA)
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const PRIMERA_PRUEBA: string = JSON.parse(
  readFileSync(join(CARPETA, OFICIAL), "utf8"),
).catalogo.pruebas[0].id;

const ACTIVO = "act-demo-asistente";

/** Lo que se ve en español fuera de un dato neutro: debe ser la lista vacía en cada pantalla. */
const ESPANOL_VISIBLE = (page: Page) =>
  page.locator('[lang="es"]:visible').evaluateAll((els) =>
    els
      .filter((e) => !e.closest("[data-neutro]"))
      .map((e) => (e.textContent ?? "").trim())
      .slice(0, 8),
  );

/** Abre la página en inglés y comprueba las tres reglas de arriba. */
async function enIngles(page: Page, ruta: string) {
  await page.goto(ruta);
  await expect(page.locator("html"), ruta).toHaveAttribute("lang", "en");
  await expect(page.locator("html"), ruta).toHaveAttribute("data-lang", "en");
  await expect(
    page.locator("h1 [lang='en']:visible").first(),
    ruta,
  ).toBeVisible();
  expect(
    await ESPANOL_VISIBLE(page),
    `${ruta}: texto en español visible`,
  ).toEqual([]);
  const scan = await new AxeBuilder({ page }).analyze();
  const serias = scan.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serias, `${ruta}: ${JSON.stringify(serias.map((v) => v.id))}`).toEqual(
    [],
  );
}

test.describe("el flujo principal en inglés", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("hackguard:idioma", "en");
      } catch {
        /* sin almacenamiento la página sale en español y el test falla: es lo que quiere */
      }
    });
  });

  test("catálogo y ficha de una prueba", async ({ page }) => {
    await enIngles(page, "/catalogo");
    await enIngles(page, `/catalogo/${PRIMERA_PRUEBA}`);
  });

  test("activo y plan", async ({ page }) => {
    await enIngles(page, `/activos/${ACTIVO}`);
    await enIngles(page, `/activos/${ACTIVO}/plan`);
  });

  test("carga de evidencia y hallazgo", async ({ page }) => {
    await enIngles(page, "/evidencia/carga");
    await enIngles(page, "/evidencia/hallazgos/HZ-0007");
  });

  test("tablero, brecha, control e informe", async ({ page }) => {
    await enIngles(page, "/tablero");
    await enIngles(page, "/brecha");
    await enIngles(page, "/brecha/control/iso42001-a-6-2-4");
    await enIngles(page, "/brecha/informe");
  });

  test("bandeja de propuestas", async ({ page }) => {
    await enIngles(page, "/catalogo/propuestas");
  });

  test("el conmutador vuelve al español sin perder la página", async ({
    page,
  }) => {
    await enIngles(page, "/tablero");
    await page
      .getByRole("button", { name: "Switch the language to Spanish" })
      .first()
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("html")).toHaveAttribute("data-lang", "es");
    await expect(page.locator("h1 [lang='es']:visible").first()).toBeVisible();
  });
});
