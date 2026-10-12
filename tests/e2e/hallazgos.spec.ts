import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// La pantalla de un hallazgo tal como la lee quien la abre, en español (el inglés llega al cierre del hito): los cuatro
// estados del ciclo de vida, el aviso de plazo vencido, la cadena de cierre con sus eslabones pendientes, la severidad por
// escala de IA y por CVSS 4.0, la salida «Qué puedes hacer» en solo lectura, el enlace desde la barra lateral, 380 px y
// accesibilidad en los dos temas. Ninguna aserción fija una fecha de consulta: el plazo vencido de HZ-0007 ya venció en
// cualquier build posterior a su apertura, y lo demás sale del motor.

const ABIERTO = "HZ-0007";
const CORREGIDO = "HZ-0009";
const ACEPTADO = "HZ-0005";
const CERRADO = "HZ-0003";
const TODOS = [ABIERTO, CORREGIDO, ACEPTADO, CERRADO];

const ruta = (id: string) => `/evidencia/hallazgos/${id}`;

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

test.describe("los cuatro estados del ciclo de vida", () => {
  test("cada hallazgo muestra su estado con su texto, y el estado de la página es el que calcula el motor", async ({
    page,
  }) => {
    const esperados: Record<string, { estado: string; texto: string }> = {
      [ABIERTO]: { estado: "abierto", texto: "Abierto" },
      [CORREGIDO]: {
        estado: "corregido",
        texto: "Corregido, falta la re-prueba",
      },
      [ACEPTADO]: {
        estado: "aceptado_con_riesgo",
        texto: "Aceptado con riesgo",
      },
      [CERRADO]: { estado: "cerrado", texto: "Cerrado por re-prueba" },
    };
    for (const id of TODOS) {
      await page.goto(ruta(id));
      const pagina = page.locator(`[data-hallazgo="${id}"]`);
      await expect(pagina).toHaveAttribute(
        "data-estado-hallazgo",
        esperados[id]!.estado,
      );
      await expect(pagina.locator(".hg-cabecera-linea")).toContainText(
        esperados[id]!.texto,
      );
    }
  });

  test("un hallazgo aceptado con riesgo sigue contando como falla del control", async ({
    page,
  }) => {
    await page.goto(ruta(ACEPTADO));
    await expect(
      page.locator(".hg-eslabon", {
        hasText: "Sin cerrar: sigue contando como falla del control",
      }),
    ).toHaveCount(1);
  });

  test("un hallazgo cerrado por re-prueba dice que ya no corre el plazo y no ofrece acciones", async ({
    page,
  }) => {
    await page.goto(ruta(CERRADO));
    await expect(page.locator('[data-fechado="plazo"]')).toHaveCount(0);
    await expect(page.getByText("Ya no corre").first()).toBeVisible();
    await expect(
      page.getByText("Nada: la evidencia confirmada es inmutable").first(),
    ).toBeVisible();
    await expect(page.locator("[data-solo-lectura]")).toHaveCount(0);
  });
});

test.describe("plazo y avisos", () => {
  test("un hallazgo abierto con el plazo ya vencido muestra el aviso «Plazo vencido»", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    const aviso = page.locator('[data-aviso-de-plazo="vencido"]');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("Plazo vencido");
    await expect(aviso).toContainText("tiene 30 días");
    await expect(
      page.locator('[data-fechado="plazo"][data-estado-fechado="vencido"]'),
    ).toHaveAttribute("data-severidad", "alto");
  });

  test("el aviso de plazo no aparece en un hallazgo corregido dentro de plazo", async ({
    page,
  }) => {
    await page.goto(ruta(CORREGIDO));
    await expect(page.locator('[data-aviso-de-plazo="vencido"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('[data-fechado="plazo"][data-estado-fechado="en_plazo"]'),
    ).toHaveCount(1);
  });
});

test.describe("la cadena de cierre", () => {
  test("un hallazgo abierto tiene su cadena con los eslabones que faltan dibujados como pendientes", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    const eslabones = page.locator("ol.hg-cadena > li.hg-eslabon");
    await expect(eslabones).toHaveCount(4);
    await expect(page.locator("li.hg-eslabon.es-pendiente")).toHaveCount(3);
  });

  test("un hallazgo cerrado tiene la cadena completa, sin eslabones pendientes", async ({
    page,
  }) => {
    await page.goto(ruta(CERRADO));
    await expect(page.locator("ol.hg-cadena > li.hg-eslabon")).toHaveCount(4);
    await expect(page.locator("li.hg-eslabon.es-pendiente")).toHaveCount(0);
  });
});

test.describe("la severidad", () => {
  test("una severidad de IA muestra la tabla de prioridad con la celda de este hallazgo", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    await expect(
      page.locator("[data-nivel-de-tabla] table caption"),
    ).toContainText("Prioridad de acción");
    await expect(page.locator("td[data-esta-celda]")).toHaveCount(1);
    await expect(page.getByText("Frecuencia observada").first()).toBeVisible();
  });

  test("una severidad CVSS muestra el vector, la referencia fijada y cómo se calculó", async ({
    page,
  }) => {
    await page.goto(ruta(CORREGIDO));
    const severidad = page.locator('section[aria-labelledby="severidad"]');
    await expect(severidad).toContainText("CVSS:4.0/AV:N");
    await expect(severidad).toContainText("Cómo se calculó");
    await expect(severidad).toContainText("Referencia fijada");
    await expect(severidad).toContainText("FIRSTdotorg");
    await expect(page.locator("td[data-esta-celda]")).toHaveCount(0);
  });
});

test.describe("«Qué puedes hacer» es de solo lectura", () => {
  test("cada salida dice su consecuencia y el comando que la registra, sin botones", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    const acciones = page.locator("[data-solo-lectura]");
    await expect(acciones).toBeVisible();
    await expect(
      page.getByText("pnpm hallazgos:declarar HZ-0007 corregido").first(),
    ).toBeVisible();
    await expect(acciones.getByRole("button")).toHaveCount(0);
  });

  test("aceptar el riesgo no lo cierra: sigue contando como falla del control", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    await expect(
      page
        .getByText("sigue contando como falla del control hasta que se corrija")
        .first(),
    ).toBeVisible();
  });
});

test.describe("navegación", () => {
  test("la barra lateral lleva a la carga y, de ahí, al primer hallazgo", async ({
    page,
  }) => {
    await page.goto("/catalogo/PR-IA-PINJ-001");
    await page
      .locator('a[href="/evidencia/carga"]:visible')
      .first()
      .click();
    await expect(page).toHaveURL(/\/evidencia\/carga$/);
    await page
      .locator(`a[href="${ruta(ABIERTO)}"]:visible`)
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${ruta(ABIERTO)}$`));
    await expect(page.locator(`[data-hallazgo="${ABIERTO}"]`)).toBeVisible();
  });

  test("el selector lleva a cada hallazgo y marca el actual", async ({
    page,
  }) => {
    await page.goto(ruta(ABIERTO));
    const selector = page.locator(
      'nav[aria-labelledby="rotulo-selector-de-hallazgos"]',
    );
    await expect(selector.locator("a")).toHaveCount(TODOS.length);
    await expect(
      selector.locator(`a[href="${ruta(ABIERTO)}"][aria-current="true"]`),
    ).toHaveCount(1);
    await selector.locator(`a[href="${ruta(CERRADO)}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${ruta(CERRADO)}$`));
  });
});

test.describe("en el móvil", () => {
  test("sin desborde horizontal a 380 px, en los cuatro hallazgos", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    for (const id of TODOS) {
      await page.goto(ruta(id));
      await sinDesborde(page);
    }
  });
});

test.describe("accesibilidad", () => {
  test("sin violaciones serias en los cuatro hallazgos, en los dos temas", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const id of TODOS) {
      await page.goto(ruta(id));
      for (const tema of ["oscuro", "claro"]) {
        await page.evaluate(
          (t) => document.documentElement.setAttribute("data-theme", t),
          tema,
        );
        expect(await serias(page), `hallazgo ${id}, tema ${tema}`).toEqual([]);
      }
    }
  });
});
