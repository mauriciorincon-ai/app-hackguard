import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { desbordes, pasadaDeInteraccion } from "../../scripts/maqueta/arnes/sondas.mjs";

// La maqueta de la Etapa de Diseño se prueba SERVIDA, entrando por donde entra el usuario, no por
// doble clic: en las dos apps hermanas el preview dio 404 o perdió los estilos y ninguna prueba lo vio
// porque todas abrían el archivo. Este spec cubre el servidor de `pnpm start` (el de e2e y Lighthouse);
// Vercel se verifica en el preview con sesión, y tests/unit/servidor-config exige que ambos coincidan.

const MAQUETA = "docs/diseno";
const PAGINAS = readdirSync(MAQUETA).filter((f) => f.endsWith(".html"));
const PREFERENCIA = "hg-maqueta-v0:"; // misma clave que assets/maqueta.js

/** Color de fondo de un tema, leído de los tokens: si la paleta cambia, este spec la sigue. */
function fondoDe(tema: "oscuro" | "claro") {
  const tokens = readFileSync(`${MAQUETA}/assets/tokens.css`, "utf8");
  const bloque = tokens.slice(tokens.indexOf(`[data-theme="${tema}"]`));
  const hex = /--fondo:\s*#([0-9a-f]{6})/i.exec(bloque)![1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

for (const entrada of ["/diseno/index.html", "/diseno/", "/diseno"]) {
  test(`la maqueta abre con estilos desde ${entrada}`, async ({ page }) => {
    const respuesta = await page.goto(entrada);
    expect(respuesta?.status()).toBe(200);
    await expect(page).toHaveURL(/\/diseno\/index\.html$/);
    await expect(page.locator("body")).toHaveCSS("background-color", fondoDe("oscuro"));
    await expect(page.locator("h1")).toBeVisible();
  });
}

test("un enlace relativo del índice abre otra página con estilos y con sus fuentes", async ({ page }) => {
  await page.goto("/diseno");
  await page.locator('a[href="direccion.html"]').first().click();
  await expect(page).toHaveURL(/\/diseno\/direccion\.html$/);
  await expect(page.locator("body")).toHaveCSS("background-color", fondoDe("oscuro"));
  const caras = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
  });
  expect(caras).toContain("Atkinson Hyperlegible Next");
  expect(caras).toContain("Atkinson Hyperlegible Mono");
  expect(caras).toContain("Source Serif 4");
});

for (const pagina of PAGINAS) {
  test(`${pagina}: cada control dibujado cambia algo al activarlo`, async ({ page }) => {
    await page.goto(`/diseno/${pagina}`);
    const { fallas, activados } = await pasadaDeInteraccion(page);
    expect(fallas).toEqual([]);
    expect(activados).toBeGreaterThan(0);
  });

  for (const idioma of ["es", "en"] as const) {
    test(`${pagina} [${idioma}]: cabe en 380 px sin desplazamiento horizontal`, async ({ page }) => {
      await page.addInitScript(([clave, valor]) => localStorage.setItem(clave, valor), [`${PREFERENCIA}idioma`, idioma]);
      await page.setViewportSize({ width: 380, height: 800 });
      await page.goto(`/diseno/${pagina}`);
      await expect(page.locator("html")).toHaveAttribute("lang", idioma);
      expect(await desbordes(page)).toEqual([]);
    });

    for (const tema of ["oscuro", "claro"] as const) {
      test(`${pagina} [${tema} · ${idioma}]: sin violaciones de accesibilidad`, async ({ page }) => {
        await page.addInitScript(
          ([prefijo, t, i]) => {
            localStorage.setItem(`${prefijo}tema`, t);
            localStorage.setItem(`${prefijo}idioma`, i);
          },
          [PREFERENCIA, tema, idioma],
        );
        await page.goto(`/diseno/${pagina}`);
        await expect(page.locator("body")).toHaveCSS("background-color", fondoDe(tema));
        const scan = await new AxeBuilder({ page }).analyze();
        expect(scan.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  }
}

test.describe("con «reducir movimiento»", () => {
  test.use({ reducedMotion: "reduce" });

  for (const pagina of PAGINAS) {
    test(`${pagina}: todo se ve y nada se anima`, async ({ page }) => {
      await page.goto(`/diseno/${pagina}`);
      await expect(page.locator("h1")).toBeVisible();
      await page.locator('[data-controlador="tema"]').click();
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    });
  }
});
