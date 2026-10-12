import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Las pantallas «Activo» y «Plan» tal como las usa quien las abre, en español (el inglés llega al cierre del hito): el selector
// de los tres activos demo, el portal sin plan en las dos páginas, las pruebas planeadas con su «Aplica porque:», una agregada
// por la persona, los tres motivos de exclusión, un control «Sin prueba» y la descarga del paquete con los mismos bytes del
// archivo versionado. Ninguna aserción fija una fecha de consulta: lo que envejece sale de la instantánea.

const ASISTENTE = "act-demo-asistente";
const PORTAL = "act-demo-portal";
const CLASIFICADOR = "act-demo-clasificador";
const PLAN_ASISTENTE = JSON.parse(
  readFileSync(join("datos", "planes", `${ASISTENTE}.plan.json`), "utf8"),
);
const PLANEADAS = PLAN_ASISTENTE.planeadas.length as number;
const EXCLUIDAS = PLAN_ASISTENTE.excluidas.length as number;

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

test.describe("selector de activos", () => {
  test("enlaza los tres activos demo desde la página de cada uno", async ({
    page,
  }) => {
    await page.goto(`/activos/${ASISTENTE}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    for (const id of [ASISTENTE, CLASIFICADOR, PORTAL]) {
      await expect(
        page.locator(`a[href="/activos/${id}"]`).first(),
      ).toBeAttached();
    }
  });
});

test.describe("/activos/act-demo-asistente", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/activos/${ASISTENTE}`);
    await expect(page.locator(`[data-activo="${ASISTENTE}"]`)).toBeVisible();
  });

  test("muestra quién es dueño y quién es el proveedor, cada uno en su lugar", async ({
    page,
  }) => {
    const quien = page.locator("section", {
      has: page.getByRole("heading", { name: "Dueño y proveedor" }),
    });
    await expect(quien).toBeVisible();
    await expect(quien).toContainText("Proveedor");
  });

  test("el carril lleva al plan de este activo", async ({ page }) => {
    await page
      .locator(`a[href="/activos/${ASISTENTE}/plan"]:visible`)
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/activos/${ASISTENTE}/plan$`));
    await expect(page.locator(`[data-plan-de="${ASISTENTE}"]`)).toBeVisible();
  });

  test("sin desborde horizontal a 380 px", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto(`/activos/${ASISTENTE}`);
    await sinDesborde(page);
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
      expect(await serias(page), `activo, tema ${tema}`).toEqual([]);
    }
  });
});

test.describe("/activos/act-demo-asistente/plan", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/activos/${ASISTENTE}/plan`);
    await expect(page.locator(`[data-plan-de="${ASISTENTE}"]`)).toBeVisible();
  });

  test("las pruebas planeadas y las excluidas suman las candidatas, cada una con su fila", async ({
    page,
  }) => {
    expect(PLANEADAS + EXCLUIDAS).toBe(PLAN_ASISTENTE.resumen.candidatas);
    await expect(page.locator("tr[data-planeada]:visible")).toHaveCount(
      PLANEADAS,
    );
    await expect(page.locator("tr[data-excluida]:visible")).toHaveCount(
      EXCLUIDAS,
    );
  });

  test("una prueba planeada muestra por qué aplica", async ({ page }) => {
    const fila = page.locator('tr[data-planeada="PR-AG-HERR-001"]');
    await expect(fila).toBeVisible();
    await expect(fila).toContainText("Aplica porque:");
  });

  test("una prueba agregada por la persona lleva su marca y su justificación", async ({
    page,
  }) => {
    const agregada = page.locator("tr[data-planeada][data-agregada]");
    await expect(agregada).toHaveCount(1);
    await expect(agregada).toContainText("Agregada por ti");
    await expect(agregada).toContainText(
      "La interfaz web del asistente se va a incrustar en el portal de clientes",
    );
  });

  test("las exclusiones se explican con sus tres motivos: perfil, alcance y operador", async ({
    page,
  }) => {
    await expect(
      page.locator('tr[data-excluida][data-motivo="perfil"]'),
    ).toHaveCount(10);
    await expect(
      page.locator('tr[data-excluida][data-motivo="alcance"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('tr[data-excluida][data-motivo="operador"]'),
    ).toHaveCount(1);
    await expect(page.getByText("Fuera de alcance").first()).toBeVisible();
    await expect(page.getByText("Quitada por ti").first()).toBeVisible();
  });

  test("un control sin prueba en el plan se marca como «Sin prueba»", async ({
    page,
  }) => {
    await expect(
      page.locator('td[data-celda="estado"]', { hasText: "Sin prueba" }),
    ).toHaveCount(PLAN_ASISTENTE.resumen.controles_sin_prueba);
  });

  test("descargar el paquete entrega los mismos bytes del archivo versionado", async ({
    page,
  }) => {
    const enlace = page.locator(`a[href="/activos/${ASISTENTE}/paquete.json"]`);
    await expect(enlace).toBeVisible();
    const respuesta = await page.request.get(
      `/activos/${ASISTENTE}/paquete.json`,
    );
    expect(respuesta.ok()).toBe(true);
    const versionado = readFileSync(
      join("datos", "planes", `${ASISTENTE}.paquete.json`),
    );
    expect(Buffer.from(await respuesta.body())).toEqual(versionado);
  });

  test("el idioma cambia la página a inglés y vuelve al español", async ({
    page,
  }) => {
    const raiz = page.locator("html");
    await page
      .getByRole("button", { name: "Cambiar el idioma a inglés" })
      .first()
      .click();
    await expect(raiz).toHaveAttribute("lang", "en");
    await expect(page.getByText("Planned tests").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Switch the language to Spanish" })
      .first()
      .click();
    await expect(raiz).toHaveAttribute("lang", "es");
  });

  test("sin desborde horizontal a 380 px", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto(`/activos/${ASISTENTE}/plan`);
    await sinDesborde(page);
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
      expect(await serias(page), `plan, tema ${tema}`).toEqual([]);
    }
  });
});

test.describe("el portal, sin autorización, no recibe plan", () => {
  test("su página dice «Sin autorización no hay plan» y ofrece la plantilla", async ({
    page,
  }) => {
    await page.goto(`/activos/${PORTAL}`);
    await expect(
      page.getByText("Sin autorización no hay plan").first(),
    ).toBeVisible();
    const plantilla = page.getByRole("button", {
      name: "Ver la plantilla para activos propios",
    });
    await expect(plantilla).toHaveAttribute("aria-expanded", "false");
    await plantilla.click();
    await expect(plantilla).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByText("Alcance de la plantilla").first(),
    ).toBeVisible();
  });

  test("su página de plan no tiene ninguna prueba planeada y lo dice", async ({
    page,
  }) => {
    await page.goto(`/activos/${PORTAL}/plan`);
    await expect(
      page.getByText("Sin autorización no hay plan").first(),
    ).toBeVisible();
    await expect(page.locator("tr[data-planeada]")).toHaveCount(0);
  });

  test("un activo sin plan no ofrece descarga del paquete", async ({
    page,
  }) => {
    await page.goto(`/activos/${PORTAL}/plan`);
    await expect(
      page.locator(`a[href="/activos/${PORTAL}/paquete.json"]`),
    ).toHaveCount(0);
  });
});

test("el clasificador demo tiene su plan y su descarga", async ({ page }) => {
  await page.goto(`/activos/${CLASIFICADOR}/plan`);
  await expect(page.locator(`[data-plan-de="${CLASIFICADOR}"]`)).toBeVisible();
  await expect(
    page.locator(`a[href="/activos/${CLASIFICADOR}/paquete.json"]`),
  ).toBeVisible();
});
