import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// D2 en el navegador, en español (el inglés vive en flujo-en.spec.ts): se suelta la ficha demo, se ve cada rasgo propuesto
// con el fragmento de la ficha que lo respalda y cuáles quedan sin responder, se acepta lo que se quiere y se baja un perfil con solo
// eso. La ficha se lee en la página: cero peticiones de red y cero escrituras de almacenamiento. El texto de la ficha es dato inerte.

const RUTA = "/activos/desde-ficha";
const FICHA = path.join(
  process.cwd(),
  "datos/fichas/demo/ficha-demo-asistente.json",
);
const demo = () => JSON.parse(readFileSync(FICHA, "utf8"));

declare global {
  interface Window {
    __espias: { almacenamiento: string[]; red: string[] };
    __ejecutado?: boolean;
  }
}

async function conEspias(page: Page) {
  await page.addInitScript(() => {
    const e = { almacenamiento: [] as string[], red: [] as string[] };
    window.__espias = e;
    for (const nombre of ["setItem", "removeItem", "clear"] as const) {
      const original = Storage.prototype[nombre] as (...a: unknown[]) => void;
      Storage.prototype[nombre] = function (this: Storage, ...a: unknown[]) {
        e.almacenamiento.push(`${nombre}:${String(a[0])}`);
        return original.apply(this, a);
      } as never;
    }
    const traer = window.fetch.bind(window);
    window.fetch = (...a: Parameters<typeof fetch>) => {
      e.red.push(`fetch:${String(a[0])}`);
      return traer(...a);
    };
  });
}

const soltar = (page: Page, contenido: unknown) =>
  page.locator("[data-ficha-entrada]").setInputFiles({
    name: "ficha.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      typeof contenido === "string" ? contenido : JSON.stringify(contenido),
    ),
  });

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

test.describe("D2 · el perfil de un activo desde la ficha", () => {
  test("propone con fragmento, deja sin responder lo que nada respalda y baja solo lo aceptado", async ({
    page,
  }) => {
    const peticiones: string[] = [];
    await conEspias(page);
    await page.goto(RUTA);
    await page.waitForLoadState("networkidle");
    // Desde aquí, lo que la persona hace: cualquier petición o escritura es de la ficha.
    page.on("request", (r) => peticiones.push(`${r.method()} ${r.url()}`));
    await page.evaluate(() => {
      window.__espias.almacenamiento.length = 0;
      window.__espias.red.length = 0;
    });
    await expect(page.locator("h1")).toContainText(/Perfil desde la ficha/);
    // Sin ficha no hay nada propuesto ni descarga.
    await expect(page.locator("[data-rasgo]")).toHaveCount(0);

    await soltar(page, demo());
    await expect(page.locator("[data-ficha-leida]")).toContainText(
      /6 rasgos propuestos y 19 sin responder/,
    );
    const propuestos = page.locator('tr[data-estado="propuesto"]');
    await expect(propuestos).toHaveCount(6);
    await expect(page.locator('tr[data-estado="sin_responder"]')).toHaveCount(
      19,
    );
    // Cada propuesta trae el texto literal de la ficha que la respalda, con su ruta.
    await expect(
      propuestos
        .filter({ hasText: "usa_herramientas" })
        .locator("[data-fragmento]"),
    ).toContainText(/titular/);
    // Lo que la ficha contradice no se decide solo: sin responder, con las dos citas.
    const conflicto = page.locator('tr[data-rasgo="accede_a_datos_sensibles"]');
    await expect(conflicto).toHaveAttribute("data-estado", "sin_responder");
    await expect(conflicto.locator("[data-fragmento]")).toHaveCount(2);

    // Sin aceptar nada, no hay descarga.
    const bajar = page.locator("[data-descargar-perfil]");
    await expect(bajar).toBeDisabled();
    await page
      .getByRole("checkbox", { name: /Aceptar: .*herramientas/i })
      .first()
      .check();
    await page.locator("#ficha-id").fill("act-propio-uno");
    await page.locator("#ficha-por").fill("Ana");
    await page.locator("#ficha-fecha").fill("2026-11-10");
    await expect(bajar).toBeEnabled();
    await expect(page.locator("[data-comando]")).toContainText(
      "--id act-propio-uno --fecha 2026-11-10 --salida datos/privado/activos/act-propio-uno.perfil.json",
    );

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      bajar.click(),
    ]);
    expect(descarga.suggestedFilename()).toBe("act-propio-uno.perfil.json");
    const perfil = JSON.parse(
      readFileSync((await descarga.path()) as string, "utf8"),
    );
    expect(perfil.formato).toBe("perfil-propuesto/1");
    expect(perfil.confirmado_por).toBe("Ana");
    expect(Object.keys(perfil.rasgos)).toEqual(["usa_herramientas"]);
    expect(perfil.sin_responder).toHaveLength(24);
    // La ficha no viaja: solo el fragmento citado y la huella de sus bytes.
    expect(perfil.ficha.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(perfil)).not.toContain("para_quien");

    // Todo ocurrió en la página.
    const espias = await page.evaluate(() => window.__espias);
    expect(peticiones, "peticiones de red del navegador").toEqual([]);
    expect(espias.red, "fetch, XHR o sendBeacon desde la página").toEqual([]);
    expect(espias.almacenamiento.filter((x) => !x.includes("idioma"))).toEqual(
      [],
    );
    expect(await serias(page)).toEqual([]);
  });

  test("el texto de la ficha es dato inerte: no se ejecuta ni se interpreta", async ({
    page,
  }) => {
    await page.goto(RUTA);
    const sucia = demo();
    sucia.titular = `Asistente con herramientas <img src=x onerror="window.__ejecutado=true"><script>window.__ejecutado=true</script>`;
    await soltar(page, sucia);
    await expect(
      page.locator('tr[data-rasgo="usa_herramientas"]'),
    ).toBeVisible();
    expect(await page.evaluate(() => window.__ejecutado)).toBeUndefined();
    await expect(page.locator("[data-desde-ficha] img")).toHaveCount(0);
    await expect(
      page.locator('tr[data-rasgo="usa_herramientas"] [data-fragmento]'),
    ).toContainText("<script>");
  });

  test("un archivo que no cumple el contrato se dice y no propone nada", async ({
    page,
  }) => {
    await page.goto(RUTA);
    await soltar(page, { schema_version: "2.0.0" });
    await expect(page.locator("[data-ficha-estado]")).toContainText(
      /no cumple el contrato/,
    );
    await expect(page.locator("[data-rasgo]")).toHaveCount(0);
    await soltar(page, "esto no es json");
    await expect(page.locator("[data-ficha-estado]")).toContainText(
      /no es JSON/,
    );
    expect(await serias(page)).toEqual([]);
  });

  test("a 380 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto(RUTA);
    await soltar(page, demo());
    await expect(
      page.locator('tr[data-estado="propuesto"]').first(),
    ).toBeVisible();
    const sobra = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(sobra).toBeLessThanOrEqual(0);
    expect(await serias(page)).toEqual([]);
  });
});
