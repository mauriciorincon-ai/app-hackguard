import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// La brecha tal como la lee quien decide, en español (el inglés llega al cierre del hito). Las cinco pantallas —tablero,
// brecha, vista por control, su página e informe— leen UN cálculo del motor: dicen las mismas cifras, un «no detectado»
// no cuenta, un hallazgo vencido dice sus días, la cadena de cierre se lee de arriba abajo, el informe se imprime en
// papel claro y todo cabe en 380 px. Ninguna aserción fija una fecha: los días y los estados salen del cálculo del
// build (la fecha de consulta es la del commit), y la matriz de envejecimiento de la brecha los prueba en cada fecha.

const TABLERO = "/tablero";
const BRECHA = "/brecha";
const LISTA_DE_CONTROLES = "/brecha/control";
const CONTROL_CON_FALLAS_Y_CADENA = "/brecha/control/iso42001-a-6-2-4";
const CONTROL_CON_RIESGO_ACEPTADO = "/brecha/control/iso42001-a-6-2-6";
const INFORME = "/brecha/informe";
const PANTALLAS = [
  TABLERO,
  BRECHA,
  LISTA_DE_CONTROLES,
  CONTROL_CON_FALLAS_Y_CADENA,
  INFORME,
];

// Los cuatro estados de un control, como los nombra datos/brecha/etiquetas.json y el tablero los cuenta.
const ESTADOS_DE_CONTROL = [
  "con_evidencia_vigente",
  "evidencia_antigua",
  "con_fallas",
  "sin_evidencia",
];

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

// Cada cifra de arriba con su clave (data-cifra) y su valor tal como se ve.
const cifrasDe = (page: Page) =>
  page.evaluate((): Record<string, string | undefined> =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-cifra]")].map((e) => [
        e.getAttribute("data-cifra"),
        e.querySelector(".hg-cifra")?.textContent?.trim(),
      ]),
    ),
  );

const textoDe = (page: Page) => page.locator("main").innerText();

// Luminancia relativa de un color rgb(...) de la hoja: 1 es blanco, 0 es negro.
const luminancia = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

test.describe("las cinco pantallas dicen las mismas cifras", () => {
  test("una cifra que dos pantallas muestran tiene el mismo valor en las dos", async ({
    page,
  }) => {
    // Cada clave que aparece en dos o más pantallas debe llevar un solo valor en todas.
    const valoresPorClave = new Map<string, string[]>();
    for (const ruta of [TABLERO, BRECHA, LISTA_DE_CONTROLES, INFORME]) {
      await page.goto(ruta);
      for (const [clave, valor] of Object.entries(await cifrasDe(page))) {
        if (valor === undefined) continue;
        valoresPorClave.set(clave, [
          ...(valoresPorClave.get(clave) ?? []),
          valor,
        ]);
      }
    }
    const compartidas = [...valoresPorClave.entries()].filter(
      ([, valores]) => valores.length >= 2,
    );
    // Las que de verdad se repiten: ejecutadas (brecha e informe), vencidos (tablero e informe), sin evidencia (lista e informe).
    expect(compartidas.map(([clave]) => clave)).toEqual(
      expect.arrayContaining(["ejecutadas", "vencidos", "sin_evidencia"]),
    );
    for (const [clave, valores] of compartidas) {
      expect(new Set(valores).size, clave).toBe(1);
    }
  });

  test("el vencido dice los mismos días en el tablero y en el informe", async ({
    page,
  }) => {
    await page.goto(TABLERO);
    const diasEnTablero = (await textoDe(page)).match(
      /venció hace (\d+) días/,
    )?.[1];
    expect(diasEnTablero, "el tablero dice los días de atraso").toBeTruthy();
    await page.goto(INFORME);
    const diasEnInforme = (await textoDe(page)).match(
      /lleva (\d+) días vencido/,
    )?.[1];
    expect(diasEnInforme).toBe(diasEnTablero);
  });
});

test.describe("el estado de cada control", () => {
  test("cada control de la lista lleva uno de los cuatro estados, y la cuenta de cada uno es la que dice la cifra", async ({
    page,
  }) => {
    await page.goto(LISTA_DE_CONTROLES);
    const estados = await page
      .locator("[data-control][data-control-estado]")
      .evaluateAll((els) =>
        els.map((e) => e.getAttribute("data-control-estado")),
      );
    expect(estados.length).toBeGreaterThan(0);
    for (const estado of estados) expect(ESTADOS_DE_CONTROL).toContain(estado);
    const cifras = await cifrasDe(page);
    for (const estado of ESTADOS_DE_CONTROL) {
      const cuenta = estados.filter((e) => e === estado).length;
      expect(cuenta, estado).toBe(Number(cifras[estado]));
    }
  });

  test("el tablero nombra los cuatro estados aunque hoy no haya un control en evidencia antigua", async ({
    page,
  }) => {
    // Un control pasa a «evidencia antigua» cuando su evidencia más reciente cumple el umbral: eso depende de la fecha de
    // consulta, así que el e2e no lo fuerza. La matriz de envejecimiento sí construye un control en ese estado.
    await page.goto(TABLERO);
    for (const etiqueta of [
      "Con evidencia vigente",
      "Evidencia antigua",
      "Con fallas",
      "Sin evidencia",
    ]) {
      await expect(
        page.getByText(etiqueta, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test("aceptar un riesgo no saca a su control de «con fallas»", async ({
    page,
  }) => {
    await page.goto(CONTROL_CON_RIESGO_ACEPTADO);
    await expect(
      page
        .locator('[data-control="iso42001-A.6.2.6"][data-control-estado]')
        .first(),
    ).toHaveAttribute("data-control-estado", "con_fallas");
  });
});

test.describe("«no detectado» no cuenta", () => {
  test("una prueba no ejecutada nunca suma a las superadas ni a las fallidas", async ({
    page,
  }) => {
    await page.goto(BRECHA);
    const filas = await page
      .locator("[data-fila-brecha]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-veredicto")));
    const cifras = await cifrasDe(page);
    const cuenta = (v: string) => filas.filter((f) => f === v).length;
    expect(cuenta("superada")).toBe(Number(cifras.superadas));
    expect(cuenta("fallida")).toBe(Number(cifras.fallidas));
    expect(cuenta("no_ejecutada")).toBe(Number(cifras.no_ejecutadas));
    // «8 / 25»: ejecutadas son solo superadas y fallidas; las no ejecutadas no son evidencia.
    expect(cifras.ejecutadas).toBe(
      `${cuenta("superada") + cuenta("fallida")} / ${filas.length}`,
    );
  });

  test("la banda del instrumento pasa sus comprobaciones, incluida «No detectado» no es verificado", async ({
    page,
  }) => {
    await page.goto(TABLERO);
    const comprobaciones = page.locator("[data-comprobacion]");
    // Los cierres del S7 (E-6, RF-10.3) y las semillas de los agentes del S8 (S1: citas inventadas, S2: instrucciones sembradas).
    await expect(comprobaciones).toHaveCount(4);
    expect(
      (
        await comprobaciones.evaluateAll((nodos) =>
          nodos.map((n) => n.getAttribute("data-comprobacion")),
        )
      ).sort(),
    ).toEqual(["E-6", "RF-10.3", "S1", "S2"]);
    for (const e of await comprobaciones.all()) {
      await expect(e).toHaveAttribute("data-pasa", "true");
    }
    // Las comprobaciones van dentro de «Ver las comprobaciones», cerrado por defecto: se abre como lo haría una persona.
    await page.getByRole("button", { name: "Ver las comprobaciones" }).click();
    await expect(
      page.getByRole("button", { name: "Ver las comprobaciones" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("«No detectado» no es verificado"),
    ).toBeVisible();
  });
});

test.describe("el vencido con sus días y la cadena de cierre", () => {
  test("un hallazgo vencido se marca como vencido y dice cuántos días", async ({
    page,
  }) => {
    await page.goto(TABLERO);
    await expect(
      page.getByText("Vencido", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/venció hace \d+ días/).first()).toBeVisible();
  });

  test("la página del control lee la cadena de cada hallazgo: el cerrado por re-prueba y el que sigue abierto", async ({
    page,
  }) => {
    await page.goto(CONTROL_CON_FALLAS_Y_CADENA);
    const cadena = page
      .getByRole("heading", { name: /Cadena de cierre/ })
      .locator("xpath=ancestor-or-self::section[1]");
    // HZ-0003 cierra por re-prueba (corrección declarada, re-prueba superada, cerrado).
    await expect(cadena).toContainText("HZ-0003");
    await expect(cadena).toContainText("Corrección declarada");
    await expect(cadena).toContainText("Re-prueba superada");
    await expect(cadena).toContainText("Cerrado por re-prueba");
    // HZ-0007 sigue abierto: sin corrección ni re-prueba, y no cuenta como cerrado.
    await expect(cadena).toContainText("HZ-0007");
    await expect(cadena).toContainText("Corrección pendiente");
    await expect(cadena).toContainText("Re-prueba pendiente");
    await expect(cadena).toContainText("Sin cerrar");
  });
});

test.describe("el informe imprimible", () => {
  test("el informe sale en papel claro aunque la pantalla esté en oscuro, y su PDF tiene varias hojas", async ({
    page,
  }, testInfo) => {
    // page.pdf solo existe en Chromium: se prueba una vez, en el proyecto de escritorio.
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "el PDF se prueba una sola vez, en el proyecto de escritorio",
    );
    await page.goto(INFORME);
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "oscuro"),
    );
    await page.emulateMedia({ media: "print" });
    const fondo = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(luminancia(fondo), `fondo de impresión ${fondo}`).toBeGreaterThan(
      0.8,
    );

    const pdf = await page.pdf({ format: "A4", printBackground: true });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const hojas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [])
      .length;
    expect(hojas, "hojas del PDF").toBeGreaterThanOrEqual(2);
  });
});

test.describe("en el móvil", () => {
  for (const ruta of PANTALLAS) {
    test(`${ruta}: sin desborde horizontal a 380 px`, async ({ page }) => {
      await page.setViewportSize({ width: 380, height: 800 });
      await page.goto(ruta);
      await sinDesborde(page);
    });
  }
});

test.describe("accesibilidad", () => {
  for (const ruta of PANTALLAS) {
    test(`${ruta}: sin violaciones serias, en los dos temas`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(ruta);
      for (const tema of ["oscuro", "claro"]) {
        await page.evaluate(
          (t) => document.documentElement.setAttribute("data-theme", t),
          tema,
        );
        expect(await serias(page), `${ruta}, tema ${tema}`).toEqual([]);
      }
    });
  }
});
