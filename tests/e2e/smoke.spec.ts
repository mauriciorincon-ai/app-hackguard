import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// SMOKE del kit (v1.28.0): la única razón de este archivo es que el job `e2e` PUEDA FALLAR
// desde el commit inicial. `test:e2e` ya no lleva `--pass-with-no-tests`: un job que pasa con
// cero pruebas descubiertas no es un gate (Angel Ghost S1: cuatro fases con e2e «verde» y
// ninguna prueba). Si este smoke se pone rojo en el estampado, el gate está funcionando.
// El S1 lo conserva (es la regresión de «la app arranca y es accesible») y añade los suyos.
test("la app arranca, la raíz lleva al tablero y no tiene violaciones serias de accesibilidad", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL(/\/tablero/);
  await expect(page.locator("body")).toBeVisible();
  const scan = await new AxeBuilder({ page }).analyze();
  const serias = scan.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serias, JSON.stringify(serias.map((v) => v.id))).toEqual([]);
});

// Cada página lleva su propio título (WCAG 2.4.2): el de la raíz no sirve a quien tiene varias pestañas abiertas.
test("cada página tiene un título propio, con el nombre de la app al final", async ({
  page,
}) => {
  const titulos = new Map<string, string>();
  for (const [ruta, esperado] of [
    ["/tablero", /^Tablero \/ Dashboard · HackGuard$/],
    ["/catalogo", /^Catálogo de pruebas \/ Test catalog · HackGuard$/],
    ["/catalogo/controles", /^Controles \/ Controls · HackGuard$/],
    [
      "/catalogo/marcos",
      /^Marcos y versiones \/ Frameworks and versions · HackGuard$/,
    ],
    [
      "/catalogo/propuestas",
      /^Bandeja de propuestas \/ Proposal inbox · HackGuard$/,
    ],
    ["/brecha", /^Brecha \/ Gap · HackGuard$/],
    ["/brecha/informe", /^Informe de brecha \/ Gap report · HackGuard$/],
    ["/evidencia/carga", /^Carga de evidencia \/ Evidence intake · HackGuard$/],
    [
      "/evidencia/hallazgos/HZ-0007",
      /^HZ-0007 · Hallazgo \/ Finding · HackGuard$/,
    ],
  ] as const) {
    await page.goto(ruta);
    await expect(page, ruta).toHaveTitle(esperado);
    titulos.set(ruta, await page.title());
  }
  expect(
    new Set(titulos.values()).size,
    "dos páginas con el mismo título",
  ).toBe(titulos.size);
});
