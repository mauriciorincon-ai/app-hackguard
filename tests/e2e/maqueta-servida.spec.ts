import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import {
  desbordes,
  palabrasPartidas,
  pasadaDeInteraccion,
} from "../../scripts/maqueta/arnes/sondas.mjs";

// La maqueta de la Etapa de Diseño se prueba SERVIDA, entrando por donde entra el usuario, no por
// doble clic: en las dos apps hermanas el preview dio 404 o perdió los estilos y ninguna prueba lo vio
// porque todas abrían el archivo. Este spec cubre el servidor de `pnpm start` (el de e2e y Lighthouse);
// Vercel se verifica en el preview con sesión, y tests/unit/servidor-config exige que ambos coincidan.

const MAQUETA = "docs/diseno";
const PAGINAS = readdirSync(MAQUETA).filter((f) => f.endsWith(".html"));
const PREFERENCIA = "hg-maqueta-v0:"; // misma clave que assets/maqueta.js

/** Un color de un tema, leído de los tokens: si la paleta cambia, este spec la sigue. */
function colorDe(tema: "oscuro" | "claro", token: string) {
  const tokens = readFileSync(`${MAQUETA}/assets/tokens.css`, "utf8");
  const bloque = tokens.slice(tokens.indexOf(`[data-theme="${tema}"]`));
  const hex = new RegExp(`--${token}:\\s*#([0-9a-f]{6})`, "i").exec(bloque)![1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

const fondoDe = (tema: "oscuro" | "claro") => colorDe(tema, "fondo");

for (const entrada of ["/diseno/index.html", "/diseno/", "/diseno"]) {
  test(`la maqueta abre con estilos desde ${entrada}`, async ({ page }) => {
    const respuesta = await page.goto(entrada);
    expect(respuesta?.status()).toBe(200);
    await expect(page).toHaveURL(/\/diseno\/index\.html$/);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      fondoDe("oscuro"),
    );
    await expect(page.locator("h1")).toBeVisible();
  });
}

test("un enlace relativo del índice abre otra página con estilos y con sus fuentes", async ({
  page,
}) => {
  await page.goto("/diseno");
  await page.locator('main a[href="tablero.html"]').first().click();
  await expect(page).toHaveURL(/\/diseno\/tablero\.html$/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    fondoDe("oscuro"),
  );
  const caras = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family.replace(/"/g, ""));
  });
  expect(caras).toContain("Atkinson Hyperlegible Next");
  expect(caras).toContain("Atkinson Hyperlegible Mono");
});

// HOJA DE IMPRESIÓN del informe (RF-05.6). Impreso sale solo el informe: sin navegación, sin sala y sin
// carril; en tinta oscura aunque la pantalla esté en oscuro (tinta clara sobre papel blanco no se lee);
// con las tablas como tablas y sin salirse del área útil de una hoja A4 (unos 700 px con sus márgenes).
test("informe.html impreso: solo el informe, en tinta oscura y dentro de una hoja", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 1000 });
  await page.goto("/diseno/informe.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "oscuro");
  await page.emulateMedia({ media: "print" });
  for (const fuera of [
    ".mq-franja",
    ".mq-pie",
    ".hg-lateral",
    ".hg-barra",
    ".hg-subnav",
    ".hg-carril",
  ]) {
    await expect(
      page.locator(fuera).first(),
      `${fuera} no debe imprimirse`,
    ).toBeHidden();
  }
  await expect(page.locator("#informe h1")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "color",
    colorDe("claro", "tinta"),
  );
  await expect(page.locator("#informe .hg-tabla thead").first()).toHaveCSS(
    "display",
    "table-header-group",
  );
  expect(await desbordes(page)).toEqual([]);
  expect(await palabrasPartidas(page)).toEqual([]);
});

// LO ELEGIDO SE VE SIN COLOR (regla 12, auditoría de cierre M16). Un botón pulsado y su vecino sin pulsar
// tienen que diferenciarse en algo que no sea color: peso, forma o grosor. Se comparan sus estilos con
// los colores borrados; si solo cambiaba el tinte, quedan iguales.
for (const pagina of ["kit.html", "tablero.html"]) {
  test(`${pagina}: un botón pulsado se distingue sin color de uno sin pulsar`, async ({
    page,
  }) => {
    await page.goto(`/diseno/${pagina}`);
    const iguales = await page.evaluate(() => {
      const sinColor = (v: string) =>
        v.replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, "C");
      const firma = (el: Element) => {
        const s = getComputedStyle(el);
        return [
          s.fontWeight,
          sinColor(s.boxShadow),
          s.borderTopWidth,
          s.borderBottomWidth,
          s.textDecorationLine,
          s.outlineStyle,
        ].join(" | ");
      };
      const pulsados = [
        ...document.querySelectorAll('.hg-boton[aria-pressed="true"]'),
      ].filter((el) => (el as HTMLElement).offsetParent);
      return pulsados.flatMap((el) => {
        const vecino = el.parentElement?.querySelector(
          '.hg-boton[aria-pressed="false"]',
        );
        return vecino && firma(el) === firma(vecino)
          ? [`«${el.textContent?.trim()}»: ${firma(el)}`]
          : [];
      });
    });
    expect(iguales).toEqual([]);
  });
}

// LOS CUATRO ESTADOS DE CADA PANTALLA (auditoría de cierre, M15). Vacío, carga y error también caben en
// 380 px y pasan axe. Un tema y un idioma bastan aquí: los tests de abajo cubren los cuatro pares en el
// estado «con datos».
const CON_ESTADOS = PAGINAS.filter((p) =>
  readFileSync(`${MAQUETA}/${p}`, "utf8").includes('data-controlador="estado"'),
);
for (const pagina of CON_ESTADOS) {
  test(`${pagina}: vacío, carga y error caben en 380 px y sin violaciones de accesibilidad`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto(`/diseno/${pagina}`);
    const valores = await page
      .locator('.mq-franja [data-controlador="estado"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.getAttribute("data-valor")!)
          .filter((v) => v !== "datos"),
      );
    expect(
      valores.length,
      `${pagina}: la franja no ofrece estados`,
    ).toBeGreaterThan(0);
    const fallas: string[] = [];
    for (const valor of valores) {
      await page
        .locator(
          `.mq-franja [data-controlador="estado"][data-valor="${valor}"]`,
        )
        .click();
      await expect(page.locator("body")).toHaveAttribute("data-estado", valor);
      for (const d of await desbordes(page))
        fallas.push(`${valor} · desborde: ${d}`);
      for (const p of await palabrasPartidas(page))
        fallas.push(`${valor} · palabra partida: ${p}`);
      const scan = await new AxeBuilder({ page }).analyze();
      for (const v of scan.violations)
        fallas.push(`${valor} · ${v.id}: ${v.nodes.length}`);
    }
    expect(fallas).toEqual([]);
  });
}

for (const pagina of PAGINAS) {
  test(`${pagina}: cada control dibujado cambia algo al activarlo`, async ({
    page,
  }) => {
    await page.goto(`/diseno/${pagina}`);
    const { fallas, activados } = await pasadaDeInteraccion(page);
    expect(fallas).toEqual([]);
    expect(activados).toBeGreaterThan(0);
  });

  for (const idioma of ["es", "en"] as const) {
    test(`${pagina} [${idioma}]: cabe en 380 px sin desplazamiento horizontal ni palabras partidas`, async ({
      page,
    }) => {
      await page.addInitScript(
        ([clave, valor]) => localStorage.setItem(clave, valor),
        [`${PREFERENCIA}idioma`, idioma],
      );
      await page.setViewportSize({ width: 380, height: 800 });
      await page.goto(`/diseno/${pagina}`);
      await expect(page.locator("html")).toHaveAttribute("lang", idioma);
      expect(await desbordes(page)).toEqual([]);
      // Y sin partir palabras por la mitad (una columna estrecha lo hace sin desbordar nada).
      expect(await palabrasPartidas(page)).toEqual([]);
    });

    // En escritorio tampoco: una columna de tabla o de rejilla puede partir una palabra o pisar a su
    // vecina aunque la ventana sea ancha (así se partían los chips de la mirada 4-bis).
    test(`${pagina} [${idioma}]: en escritorio nada se sale de su columna ni se parte`, async ({
      page,
    }) => {
      await page.addInitScript(
        ([clave, valor]) => localStorage.setItem(clave, valor),
        [`${PREFERENCIA}idioma`, idioma],
      );
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/diseno/${pagina}`);
      await expect(page.locator("html")).toHaveAttribute("lang", idioma);
      expect(await desbordes(page)).toEqual([]);
      expect(await palabrasPartidas(page)).toEqual([]);
    });

    for (const tema of ["oscuro", "claro"] as const) {
      test(`${pagina} [${tema} · ${idioma}]: sin violaciones de accesibilidad`, async ({
        page,
      }) => {
        await page.addInitScript(
          ([prefijo, t, i]) => {
            localStorage.setItem(`${prefijo}tema`, t);
            localStorage.setItem(`${prefijo}idioma`, i);
          },
          [PREFERENCIA, tema, idioma],
        );
        await page.goto(`/diseno/${pagina}`);
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          fondoDe(tema),
        );
        const scan = await new AxeBuilder({ page }).analyze();
        expect(
          scan.violations.map((v) => `${v.id}: ${v.nodes.length}`),
        ).toEqual([]);
      });
    }
  }
}

test.describe("con «reducir movimiento»", () => {
  test.use({ reducedMotion: "reduce" });

  for (const pagina of PAGINAS) {
    test(`${pagina}: todo se ve y nada se anima`, async ({ page }) => {
      await page.goto(`/diseno/${pagina}`);
      // El título por su rol: los avisos de los otros estados también llevan h1, pero están ocultos.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator('[data-controlador="tema"]').click();
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(
        0,
      );
    });
  }
});
