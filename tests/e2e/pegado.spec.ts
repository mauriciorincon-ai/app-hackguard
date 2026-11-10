import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// El texto pegado en el navegador, en español (el inglés llega al cierre del hito): se pega un reporte de Garak del kit, se ve el sobre
// que se propondría y la brecha antes y después, se descarga el sobre sin el texto de la herramienta, y TODO ocurre en la página:
// cero peticiones de red y cero escrituras en localStorage, sessionStorage o IndexedDB desde que se pega hasta que se descarga.
// Un texto con <script> se trata como texto: no se ejecuta ni se muestra. Ninguna aserción fija una fecha de consulta.

const RUTA = "/evidencia/carga";
const KIT = "docs/kit-de-prueba/textos-pegados";

// El e2e construye con consulta 2026-10-05 y el reporte del kit es del 2026-10-12: una corrida posterior a la consulta no se puede
// calcular (lo prueba el último test). Aquí se pega con la fecha corrida al 2026-10-02, el día del lote demo.
const garak = () =>
  readFileSync(
    path.join(process.cwd(), KIT, "garak-0.17.0.report.redactado.jsonl"),
    "utf8",
  ).replaceAll("2026-10-12", "2026-10-02");
// El archivo de promptfoo del kit (sintético, formato `promptfoo eval -o`), con la fecha corrida al día del lote demo.
const promptfoo = () =>
  readFileSync(
    path.join(process.cwd(), KIT, "promptfoo-0.123.1.sintetico.json"),
    "utf8",
  ).replaceAll("2026-10-12", "2026-10-02");
const garakDelKit = () =>
  readFileSync(
    path.join(process.cwd(), KIT, "garak-0.17.0.report.redactado.jsonl"),
    "utf8",
  );

declare global {
  interface Window {
    __espias: { almacenamiento: string[]; red: string[] };
    __ejecutado?: boolean;
  }
}

/** Los espías se instalan ANTES de que cargue cualquier script de la página: uno puesto después no vería una escritura temprana. */
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
    const abrir = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...a: Parameters<IDBFactory["open"]>) => {
      e.almacenamiento.push(`indexedDB.open:${String(a[0])}`);
      return abrir(...a);
    };
    const traer = window.fetch.bind(window);
    window.fetch = (...a: Parameters<typeof fetch>) => {
      e.red.push(`fetch:${String(a[0])}`);
      return traer(...a);
    };
    const abrirXhr = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...a: unknown[]
    ) {
      e.red.push(`xhr:${String(a[1])}`);
      return (abrirXhr as (...x: unknown[]) => void).apply(this, a);
    } as never;
    const baliza = navigator.sendBeacon?.bind(navigator);
    if (baliza)
      navigator.sendBeacon = (...a: Parameters<Navigator["sendBeacon"]>) => {
        e.red.push(`beacon:${String(a[0])}`);
        return baliza(...a);
      };
  });
}

async function alPegado(page: Page) {
  await conEspias(page);
  await page.goto(RUTA);
  await page.locator("[data-pestanas] .hg-pestana").nth(1).click();
  await expect(page.locator("[data-pestanas]")).toHaveAttribute(
    "data-via",
    "pegado",
  );
}

async function pegarYProponer(
  page: Page,
  texto: string,
  zona = "America/Bogota",
) {
  await page.locator("#pegado-texto").fill(texto);
  await page.locator("#pegado-zona").fill(zona);
  await page.locator("[data-proponer]").click();
}

/** Todo el texto de la página MENOS el campo donde la persona pegó: lo pegado en el campo es suyo, lo que importa es que no se repita fuera. */
const textoFueraDelCampo = (page: Page) =>
  page.evaluate(() => {
    const copia = document.body.cloneNode(true) as HTMLElement;
    copia
      .querySelectorAll("textarea, input, script")
      .forEach((n) => n.remove());
    return copia.textContent ?? "";
  });

const serias = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

test.describe("pegar el archivo de promptfoo del kit", () => {
  test("propone un sobre por prueba del plan, con el veredicto de la regla y no el de la herramienta", async ({
    page,
  }) => {
    await alPegado(page);
    await page.locator("#pegado-herramienta").selectOption("promptfoo");
    await pegarYProponer(page, promptfoo(), "");
    const sobres = page.locator("[data-sobre-propuesto]");
    await expect(sobres).toHaveCount(3);
    // `is-json` salió 1 de 1 en promptfoo, pero la regla de la prueba pide más repeticiones: «Parcial», no «Superada».
    await expect(sobres.filter({ hasText: "PR-IA-SAL-001" })).toContainText(
      /Parcial|Partial/,
    );
    // Todas las filas de `bfla` terminaron en error de la corrida: no se evaluó, no se da por superada.
    await expect(sobres.filter({ hasText: "PR-AG-PERM-001" })).toContainText(
      /No ejecutada|Not run/,
    );
    await expect(page.locator("[data-pegado-resultado]")).toContainText(
      "pnpm evidencia:importar",
    );
    expect((await serias(page)).map((v) => v.id)).toEqual([]);
  });
});

test.describe("pegar el reporte de Garak del kit", () => {
  test("propone un sobre por prueba, con el veredicto de la regla, y dice la brecha antes y después", async ({
    page,
  }) => {
    await alPegado(page);
    await pegarYProponer(page, garak());
    const sobres = page.locator("[data-sobre-propuesto]");
    await expect(sobres).toHaveCount(3);
    await expect(sobres.filter({ hasText: "PR-IA-PINJ-001" })).toContainText(
      /Fallida|Failed/,
    );
    await expect(sobres.filter({ hasText: "PR-IA-ENC-002" })).toContainText(
      /Superada|Passed/,
    );
    // La brecha antes y después: las dos columnas existen para cada cifra y el cambio es la diferencia.
    const fila = (clave: string) =>
      page.locator(`[data-cifra-pegado="${clave}"]`);
    for (const clave of [
      "planeadas",
      "ejecutadas",
      "fallidas",
      "hallazgosQueCuentan",
      "controlesConFalla",
    ]) {
      const antes = Number(
        await fila(clave).locator('[data-celda="antes"]').innerText(),
      );
      const despues = Number(
        await fila(clave).locator('[data-celda="despues"]').innerText(),
      );
      const cambio = (
        await fila(clave).locator('[data-celda="cambio"]').innerText()
      ).replace("−", "-");
      expect(Number(cambio.replace("+", "")), clave).toBe(despues - antes);
    }
    // Una falla confirmada abre un hallazgo: el control de «uso dentro de lo previsto» pasa a tener fallas.
    await expect(page.locator("[data-abririan]")).toContainText(
      "PR-IA-PINJ-001",
    );
    await expect(
      page.locator('[data-cambio-control="iso42001-A.9.4"]'),
    ).toHaveAttribute("data-sentido", "empeoro");
    // Nada cuenta todavía: lo dice, y trae los comandos que sí lo confirman.
    await expect(page.locator("[data-pegado-resultado]")).toContainText(
      "pnpm evidencia:importar",
    );
    await expect(page.locator("[data-pegado-resultado]")).toContainText(
      "pnpm evidencia:confirmar-lote",
    );
  });

  test("el sobre propuesto se descarga sin el texto de la herramienta", async ({
    page,
  }) => {
    await alPegado(page);
    const canario = "CANARIO-DEL-REPORTE-77aa";
    const lineas = garak().trimEnd().split("\n");
    await pegarYProponer(
      page,
      [...lineas, JSON.stringify({ entry_type: "nota", texto: canario })].join(
        "\n",
      ),
    );
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(3);
    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-descargar-sobre]").click(),
    ]);
    expect(descarga.suggestedFilename()).toBe("sobre-propuesto.json");
    const ruta = await descarga.path();
    const cuerpo = readFileSync(ruta, "utf8");
    const json = JSON.parse(cuerpo) as {
      formato: string;
      lote: { id: string; confirmacion: unknown };
      sobres: {
        id: string;
        confirmacion: unknown;
        huellas: { crudo: string };
      }[];
    };
    expect(json.formato).toBe("hackguard/propuesta-pegada@1");
    expect(json.sobres).toHaveLength(3);
    // Propuesto, no confirmado; y la huella del crudo, sí; el crudo, no.
    expect(json.lote.confirmacion).toBeNull();
    expect(json.sobres.every((s) => s.confirmacion === null)).toBe(true);
    expect(json.sobres[0]!.huellas.crudo).toMatch(/^[0-9a-f]{64}$/);
    expect(cuerpo).not.toContain(canario);
    expect(cuerpo).not.toContain("start_run setup");
    // El texto tampoco se vuelve a mostrar en la página.
    expect(await textoFueraDelCampo(page)).not.toContain(canario);
  });

  test("todo ocurre en la página: cero peticiones de red y cero escrituras de almacenamiento al pegar, proponer y descargar", async ({
    page,
  }) => {
    const peticiones: string[] = [];
    await alPegado(page);
    await page.waitForLoadState("networkidle");
    // Desde aquí, lo que la persona hace: cualquier petición o escritura es del texto pegado.
    page.on("request", (r) => peticiones.push(`${r.method()} ${r.url()}`));
    await page.evaluate(() => {
      window.__espias.almacenamiento.length = 0;
      window.__espias.red.length = 0;
    });
    await pegarYProponer(page, garak());
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(3);
    await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-descargar-sobre]").click(),
    ]);
    await page.locator("[data-borrar-texto]").click();
    const espias = await page.evaluate(() => window.__espias);
    expect(peticiones, "peticiones de red del navegador").toEqual([]);
    expect(espias.red, "fetch, XHR o sendBeacon desde la página").toEqual([]);
    expect(espias.almacenamiento, "escrituras de almacenamiento").toEqual([]);
  });

  test("un reporte del kit con la fecha de la corrida posterior a la consulta dice el motivo, no falla", async ({
    page,
  }) => {
    await alPegado(page);
    await pegarYProponer(page, garakDelKit());
    await expect(page.locator("[data-pegado-error]")).toHaveAttribute(
      "data-pegado-error",
      "posterior_a_la_consulta",
    );
    await expect(page.locator("[data-pegado-error]")).toContainText(
      /fecha de consulta/,
    );
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(0);
  });
});

test.describe("lo que no es un reporte", () => {
  test("un texto con <script> se trata como texto: no se ejecuta, no se muestra y no propone nada", async ({
    page,
  }) => {
    await alPegado(page);
    const intruso =
      '<script>window.__ejecutado = true</script><img src=x onerror="window.__ejecutado=true">';
    await pegarYProponer(page, intruso);
    await expect(page.locator("[data-pegado-error]")).toHaveAttribute(
      "data-pegado-error",
      "no_leyo_no_es_el_formato",
    );
    expect(await page.evaluate(() => window.__ejecutado)).toBeUndefined();
    expect(await textoFueraDelCampo(page)).not.toContain("__ejecutado");
    expect(await page.locator("img[src='x']").count()).toBe(0);
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(0);
  });

  test("un reporte válido con un <script> dentro de un campo lo lee sin ejecutarlo ni mostrarlo", async ({
    page,
  }) => {
    await alPegado(page);
    const lineas = garak().trimEnd().split("\n");
    await pegarYProponer(
      page,
      [
        ...lineas,
        JSON.stringify({
          entry_type: "adjunto",
          cuerpo: "<script>window.__ejecutado = true</script>",
        }),
      ].join("\n"),
    );
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(3);
    expect(await page.evaluate(() => window.__ejecutado)).toBeUndefined();
    expect(await textoFueraDelCampo(page)).not.toContain("__ejecutado");
  });

  test("sin texto, lo dice; y sin la zona de Garak, pide la zona", async ({
    page,
  }) => {
    await alPegado(page);
    await page.locator("[data-proponer]").click();
    await expect(page.locator("[data-pegado-error]")).toHaveAttribute(
      "data-pegado-error",
      "sin_texto",
    );
    await page.locator("#pegado-texto").fill(garak());
    await page.locator("[data-proponer]").click();
    await expect(page.locator("[data-pegado-error]")).toHaveAttribute(
      "data-pegado-error",
      "falta_zona",
    );
  });
});

test.describe("la vía en el móvil y para todos", () => {
  test("sin desborde horizontal a 380 px con el sobre propuesto a la vista", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await alPegado(page);
    await pegarYProponer(page, garak());
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(3);
    const [ancho, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(ancho).toBeLessThanOrEqual(visible);
  });

  test("sin violaciones serias, con el resultado a la vista, en los dos temas", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await alPegado(page);
    await pegarYProponer(page, garak());
    await expect(page.locator("[data-sobre-propuesto]")).toHaveCount(3);
    for (const tema of ["oscuro", "claro"]) {
      await page.evaluate(
        (t) => document.documentElement.setAttribute("data-theme", t),
        tema,
      );
      expect(await serias(page), `texto pegado, tema ${tema}`).toEqual([]);
    }
  });
});
