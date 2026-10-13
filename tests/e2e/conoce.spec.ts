import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// El brochure servido como la ruta pública /conoce (docs/BROCHURE.html, derivado en el build): su cabecera de seguridad deja correr
// su único script por la huella, y el script hace lo que dice (abrir una tarjeta, cambiar de idioma). Se prueba con la política REAL
// del servidor: si la huella de la cabecera está vieja, el script no corre y estos tests fallan. Estados: movimiento reducido (la
// experiencia alterna completa, mirada de verdad), los dos temas con axe, 380 px y el mapa de rutas.

const FUNCIONES = JSON.parse(readFileSync("docs/brochure-export.json", "utf8"))
  .funcionalidades.total as number;

/** Los errores de política de contenido que el navegador reporta en consola. */
function vigilarCsp(page: Page): string[] {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (/content security policy|refused to execute/i.test(m.text()))
      errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(String(e)));
  return errores;
}

test.describe("/conoce", () => {
  test("se sirve con la política de su huella, su script corre y no hay violaciones", async ({
    page,
  }) => {
    const errores = vigilarCsp(page);
    const respuesta = await page.goto("/conoce");
    expect(respuesta?.status()).toBe(200);
    const politica = respuesta!.headers()["content-security-policy"];
    expect(politica).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'/);
    expect(politica).not.toContain("unsafe-eval");
    await expect(page).toHaveTitle(/HackGuard/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Un hallazgo no es una vulnerabilidad",
    );
    // el script corre: una tarjeta se abre
    const boton = page.locator(".tarjeta-boton").first();
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".tarjeta").first()).toHaveAttribute(
      "data-abierta",
      "",
    );
    expect(errores).toEqual([]);
  });

  test("lo cerrado sale del árbol de accesibilidad y lo abierto entra", async ({
    page,
  }) => {
    await page.goto("/conoce");
    const region = page.getByRole("region", {
      name: /Un catálogo que no miente/,
    });
    await expect(region).toBeHidden();
    await page.locator(".tarjeta-boton").first().click();
    await expect(region).toBeVisible();
  });

  test("las cuatro tarjetas llevan las funciones del export, todas", async ({
    page,
  }) => {
    await page.goto("/conoce");
    await expect(page.locator(".tarjeta")).toHaveCount(4);
    await expect(page.locator("[data-feature]")).toHaveCount(FUNCIONES);
  });

  test("el idioma cambia, se recuerda y en inglés no queda español visible", async ({
    page,
  }) => {
    await page.goto("/conoce");
    await page
      .getByRole("button", { name: "Cambiar el idioma a inglés" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "A finding is not a vulnerability",
    );
    // ningún elemento visible está en español (los pares lang="es" salen del árbol)
    const visibleEnEspanol = await page.evaluate(
      () =>
        [...document.querySelectorAll('body [lang="es"]')].filter(
          (e) => getComputedStyle(e).display !== "none",
        ).length,
    );
    expect(visibleEnEspanol).toBe(0);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-lang", "en");
    await expect(
      page.getByRole("button", { name: "Switch the language to Spanish" }),
    ).toBeVisible();
  });

  test("con movimiento reducido es la misma pieza, quieta y completa", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/conoce");
    const h1 = page.getByRole("heading", { level: 1 });
    const caja = await h1.boundingBox();
    expect(caja!.width).toBeGreaterThan(100);
    expect(caja!.height).toBeGreaterThan(20);
    const opacidades = await page.evaluate(() =>
      [
        ...document.querySelectorAll(".revela, .portada h1, .portada .promesa"),
      ].map((e) => Number(getComputedStyle(e).opacity)),
    );
    expect(opacidades.length).toBeGreaterThan(8);
    expect(opacidades.every((o) => o === 1)).toBe(true);
    // el hilo no está a medio dibujar
    const trazo = await page.evaluate(() => {
      const t = document.querySelector(".hilo .traza")!;
      return getComputedStyle(t).strokeDashoffset;
    });
    expect(["0px", "0", "none"]).toContain(trazo);
    // el clímax está a la vista, con sus cuatro negativas
    await expect(page.locator(".niega li")).toHaveCount(4);
    await expect(page.getByText("No ejecuta tus pruebas.")).toBeVisible();
  });

  for (const tema of ["light", "dark"] as const)
    for (const idioma of ["Cambiar el idioma a inglés", null] as const)
      test(`sin violaciones serias de accesibilidad con el tema ${tema} en ${idioma ? "inglés" : "español"}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: tema });
        await page.goto("/conoce");
        if (idioma) await page.getByRole("button", { name: idioma }).click();
        // todo abierto: el contraste de lo que hoy está cerrado también se mide
        for (const b of await page.locator(".tarjeta-boton").all())
          await b.click();
        await page.evaluate(() =>
          document.querySelectorAll("details").forEach((d) => (d.open = true)),
        );
        const serias = (
          await new AxeBuilder({ page }).analyze()
        ).violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        );
        expect(serias, JSON.stringify(serias.map((v) => v.id))).toEqual([]);
      });

  test("sin desborde horizontal a 380 px, con todo abierto", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto("/conoce");
    for (const b of await page.locator(".tarjeta-boton").all()) await b.click();
    await page.evaluate(() =>
      document.querySelectorAll("details").forEach((d) => (d.open = true)),
    );
    const ancho = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(ancho).toBeLessThanOrEqual(380);
  });

  test("el mapa de rutas lleva solo a páginas que existen", async ({
    page,
  }) => {
    await page.goto("/conoce");
    const rutas = await page
      .locator("details.fino a[href^='/']")
      .evaluateAll((as) => [
        ...new Set(as.map((a) => a.getAttribute("href")!)),
      ]);
    expect(rutas.length).toBeGreaterThanOrEqual(10);
    for (const ruta of rutas) {
      const r = await page.request.get(ruta);
      expect(r.status(), ruta).toBe(200);
    }
  });
});
