// Determinismo multi-navegador (RNF-01, regla dura 1): el MISMO motor, empaquetado con esbuild, da en Chromium,
// Firefox y WebKit la misma huella que en Node. Node es la referencia: el CLI corre tres veces como proceso
// aparte y las tres huellas tienen que coincidir. En el navegador, el motor recibe el catálogo de `datos/` ya
// leído y lo valida, lo fecha y lo huella con `crypto.subtle`. La página se sirve con `page.route` sobre un
// origen https ficticio, sin red y sin la aplicación: un contexto seguro y nada más.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { cargarCatalogo } from "../../src/cli/cargar.ts";
import type { construirInstantanea } from "../../src/engine/catalogo/instantanea.ts";
import type { CatalogoEnBruto } from "../../src/engine/catalogo/tipos.ts";
import type { evaluarConjunto } from "../../src/engine/demo/conjunto.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";

const RAIZ = path.resolve(__dirname, "../..");
const ORIGEN = "https://hackguard.invalid";
const LEIDO = cargarCatalogo(RAIZ);
// Las fechas se derivan de la última verificación de `datos/`, no del calendario: re-verificar una entidad no
// rompe el spec.
const ULTIMA = [...LEIDO.marcos, ...LEIDO.herramientas, ...LEIDO.pruebas]
  .map(
    (a) =>
      (JSON.parse(a.texto) as { fecha_verificacion: string })
        .fecha_verificacion,
  )
  .reduce((max, f) => (f > max ? f : max), "");
const POR_REVISAR = (
  JSON.parse(LEIDO.umbrales?.texto ?? "{}") as {
    vigencia: { por_revisar: number };
  }
).vigencia.por_revisar;
const FECHA = fechaMasDias(ULTIMA, 11);
// El primer umbral de vigencia de lo verificado último: eso pasa a «por revisar».
const FECHA_EN_UMBRAL = fechaMasDias(ULTIMA, POR_REVISAR);
const CONJUNTO =
  "docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json";

interface Motor {
  construirInstantanea: typeof construirInstantanea;
  evaluarConjunto: typeof evaluarConjunto;
}

function node(script: string, ...argumentos: string[]): string {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", script, ...argumentos],
    { cwd: RAIZ, encoding: "utf8" },
  );
  if (r.status !== 0)
    throw new Error(`${script} salió ${r.status}: ${r.stderr}`);
  return r.stdout;
}

let paquete = "";
let catalogo: CatalogoEnBruto;
let conjunto: unknown;
const enNode = { instantanea: "", umbral: "", clasificador: "" };

// Sin reintentos: una divergencia intermitente entre motores tiene que salir en rojo, no como «flaky».
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeAll(async () => {
  const salida = mkdtempSync(path.join(tmpdir(), "hackguard-determinismo-"));
  try {
    const instantanea = (fecha: string) =>
      (
        JSON.parse(
          node(
            "src/cli/catalogo.ts",
            "instantanea",
            "--fecha",
            fecha,
            "--salida",
            salida,
            "--json",
          ),
        ) as { huella: string }
      ).huella;
    const tres = new Set([1, 2, 3].map(() => instantanea(FECHA)));
    expect(tres.size, "tres corridas del CLI en Node, una sola huella").toBe(1);
    enNode.instantanea = [...tres][0];
    enNode.umbral = instantanea(FECHA_EN_UMBRAL);
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
  enNode.clasificador = (
    JSON.parse(node("src/cli/clasificador-demo.ts", "--json")) as {
      huella_de_respuestas: string;
    }
  ).huella_de_respuestas;

  // El navegador recibe las listas en el orden inverso al que lee el CLI: si el orden cambiara la huella,
  // divergirían.
  catalogo = structuredClone(LEIDO);
  for (const lista of [
    catalogo.marcos,
    catalogo.equivalencias,
    catalogo.controles,
    catalogo.herramientas,
    catalogo.pruebas,
  ])
    lista.reverse();
  conjunto = JSON.parse(readFileSync(path.join(RAIZ, CONJUNTO), "utf8"));
  const { outputFiles } = await build({
    stdin: {
      contents: [
        'export { construirInstantanea } from "./src/engine/catalogo/instantanea.ts";',
        'export { evaluarConjunto } from "./src/engine/demo/conjunto.ts";',
      ].join("\n"),
      resolveDir: RAIZ,
      loader: "ts",
      sourcefile: "motor-navegador.ts",
    },
    bundle: true,
    format: "iife",
    globalName: "MotorHackGuard",
    platform: "browser",
    write: false,
    logLevel: "silent",
  });
  paquete = outputFiles[0].text;
});

async function abrirMotor(page: Page): Promise<void> {
  await page.route(`${ORIGEN}/**`, (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="es"><meta charset="utf-8"><title>Motor</title></html>',
    }),
  );
  await page.goto(`${ORIGEN}/`);
  await page.addScriptTag({ content: paquete });
  expect(await page.evaluate(() => isSecureContext)).toBe(true);
}

const enNavegador = (page: Page, fecha: string) =>
  page.evaluate(
    async ({ catalogo, fecha }) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor })
        .MotorHackGuard;
      const r = await motor.construirInstantanea(catalogo, fecha);
      if (!r.emitida) return { huella: null, estados: [] };
      const s = r.instantanea.semaforo;
      return {
        huella: r.instantanea.huella,
        estados: [
          ...new Set(
            [...s.pruebas, ...s.marcos, ...s.herramientas].map(
              (v) => v.estado,
            ),
          ),
        ],
      };
    },
    { catalogo, fecha },
  );

test.describe("el motor da en el navegador la misma huella que en Node", () => {
  test(`la instantánea del ${FECHA}`, async ({
    page,
    browserName,
    browser,
  }) => {
    await abrirMotor(page);
    const { huella } = await enNavegador(page, FECHA);
    console.log(
      `determinismo · ${browserName} ${browser.version()} · instantánea ${FECHA} · ${huella}`,
    );
    expect(huella).toBe(enNode.instantanea);
  });

  test(`en el umbral (${FECHA_EN_UMBRAL}) algo pasa a «por revisar», y la huella es la de Node`, async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const { huella, estados } = await enNavegador(page, FECHA_EN_UMBRAL);
    console.log(
      `determinismo · ${browserName} · instantánea ${FECHA_EN_UMBRAL} · ${huella}`,
    );
    expect(estados).toContain("por_revisar");
    expect(huella).toBe(enNode.umbral);
  });

  test("el clasificador demo sobre su conjunto de referencia", async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const huella = await page.evaluate(async (conjunto) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor })
        .MotorHackGuard;
      return (await motor.evaluarConjunto(conjunto)).huella_de_respuestas;
    }, conjunto);
    console.log(`determinismo · ${browserName} · clasificador · ${huella}`);
    expect(huella).toBe(enNode.clasificador);
  });
});
