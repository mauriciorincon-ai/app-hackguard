// Determinismo multi-navegador (RNF-01, regla dura 1): el MISMO motor, empaquetado con esbuild, da en Chromium,
// Firefox y WebKit la misma huella que en Node. Node es la referencia: el CLI corre tres veces como proceso
// aparte y las tres huellas tienen que coincidir. En el navegador, el motor recibe el catálogo de `datos/` ya
// leído y lo valida, lo fecha y lo huella con `crypto.subtle`. La página se sirve con `page.route` sobre un
// origen https ficticio, sin red y sin la aplicación: un contexto seguro y nada más.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { cargarCatalogo } from "../../src/cli/cargar.ts";
import type { construirInstantanea } from "../../src/engine/catalogo/instantanea.ts";
import type { CatalogoEnBruto } from "../../src/engine/catalogo/tipos.ts";
import type { evaluarConjunto } from "../../src/engine/demo/conjunto.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import type { huellaDelLibro } from "../../src/engine/evidencia/libro.ts";
import type { salidaJsonDeHallazgos } from "../../src/engine/evidencia/informe.ts";
import type { evaluarHallazgo } from "../../src/engine/hallazgos/ciclo.ts";
import type { huella } from "../../src/engine/huella.ts";
import type { planificar } from "../../src/engine/planificador/planificar.ts";

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

// El planificador (S4): el plan y el paquete de dos activos demo, con la instantánea oficial. La fecha de
// emisión sale de la instantánea, no del calendario.
const leerJson = <T>(...partes: string[]) =>
  JSON.parse(readFileSync(path.join(RAIZ, ...partes), "utf8")) as T;
interface ActivoLeido {
  familias: unknown[];
  entornos: unknown[];
  ajustes: unknown[];
  alcance: { familias: unknown[]; fuera: unknown[] } | null;
}
interface InstantaneaLeida {
  fecha_evaluacion: string;
  catalogo: { pruebas: unknown[] };
}
type EntradaDelPlan = Parameters<typeof planificar>[0];
const CARPETA_INSTANTANEAS = path.join(RAIZ, "datos", "instantaneas");
const OFICIAL = leerJson<InstantaneaLeida>(
  "datos",
  "instantaneas",
  readdirSync(CARPETA_INSTANTANEAS)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-[0-9a-f]{12}\.json$/.test(f))
    .sort()
    .at(-1)!,
);
const FECHA_DEL_PLAN = fechaMasDias(OFICIAL.fecha_evaluacion as string, 6);
const ACTIVOS_CON_PLAN = ["act-demo-asistente", "act-demo-clasificador"];

interface Motor {
  construirInstantanea: typeof construirInstantanea;
  evaluarConjunto: typeof evaluarConjunto;
  planificar: typeof planificar;
  huella: typeof huella;
  huellaDelLibro: typeof huellaDelLibro;
  evaluarHallazgo: typeof evaluarHallazgo;
  salidaJsonDeHallazgos: typeof salidaJsonDeHallazgos;
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
const enNode = {
  instantanea: "",
  umbral: "",
  clasificador: "",
  planes: {} as Record<string, { plan: string; paquete: string }>,
  libro: { libro: "", hallazgos: "" },
};
// El libro de evidencia (S5): los sobres y los hallazgos demo, que el navegador recibe en el orden inverso.
const FECHA_DEL_LIBRO = FECHA_DEL_PLAN;
const leerCarpeta = (...partes: string[]) =>
  readdirSync(path.join(RAIZ, ...partes))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => leerJson<unknown>(...partes, f));
let entradaDelLibro: { sobres: unknown[]; hallazgos: unknown[]; fecha: string };
let entradaDelPlan: {
  activos: Record<string, unknown>;
  instantanea: unknown;
  formula: unknown;
  entornos: unknown;
  fecha: string;
};

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

  // Node es la referencia del plan: el CLI emite cada plan; el del asistente, tres veces.
  for (const id of ACTIVOS_CON_PLAN) {
    const carpeta = mkdtempSync(path.join(tmpdir(), "hackguard-plan-"));
    try {
      const emitir = () =>
        JSON.parse(
          node(
            "src/cli/plan.ts",
            "emitir",
            id,
            "--fecha",
            FECHA_DEL_PLAN,
            "--salida",
            carpeta,
            "--json",
          ),
        ) as { huella_del_plan: string; huella_del_paquete: string };
      const corridas =
        id === ACTIVOS_CON_PLAN[0]
          ? [emitir(), emitir(), emitir()]
          : [emitir()];
      expect(
        new Set(corridas.map((c) => c.huella_del_plan)).size,
        `tres corridas del CLI del plan de ${id}, una sola huella`,
      ).toBe(1);
      enNode.planes[id] = {
        plan: corridas[0].huella_del_plan,
        paquete: corridas[0].huella_del_paquete,
      };
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  }
  // Node es la referencia del libro: el CLI evalúa los hallazgos tres veces y las huellas coinciden.
  const listar = () =>
    JSON.parse(
      node("src/cli/evidencia.ts", "hallazgos-listar", "--fecha", FECHA_DEL_LIBRO, "--json"),
    ) as { huella_del_libro: string; huella_de_los_hallazgos: string };
  const libros = [listar(), listar(), listar()];
  expect(
    new Set(libros.map((l) => `${l.huella_del_libro}/${l.huella_de_los_hallazgos}`)).size,
    "tres corridas del CLI del libro, una sola huella",
  ).toBe(1);
  enNode.libro = { libro: libros[0].huella_del_libro, hallazgos: libros[0].huella_de_los_hallazgos };
  entradaDelLibro = {
    sobres: leerCarpeta("datos", "evidencia", "demo").reverse(),
    hallazgos: leerCarpeta("datos", "hallazgos", "demo").reverse(),
    fecha: FECHA_DEL_LIBRO,
  };

  // El navegador recibe los conjuntos del activo y las pruebas de la instantánea en el orden inverso.
  const instantanea = structuredClone(OFICIAL);
  instantanea.catalogo.pruebas.reverse();
  entradaDelPlan = {
    activos: Object.fromEntries(
      ACTIVOS_CON_PLAN.map((id) => {
        const a = leerJson<ActivoLeido>(
          "datos",
          "activos",
          "demo",
          `${id}.json`,
        );
        for (const lista of [
          a.familias,
          a.entornos,
          a.ajustes,
          a.alcance?.familias,
          a.alcance?.fuera,
        ])
          (lista as unknown[] | undefined)?.reverse();
        return [id, a];
      }),
    ),
    instantanea,
    formula: leerJson<unknown>("datos", "planificador", "formula.json"),
    entornos: leerJson<unknown>("datos", "planificador", "entornos.json"),
    fecha: FECHA_DEL_PLAN,
  };

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
        'export { planificar } from "./src/engine/planificador/planificar.ts";',
        'export { huella } from "./src/engine/huella.ts";',
        'export { huellaDelLibro } from "./src/engine/evidencia/libro.ts";',
        'export { salidaJsonDeHallazgos } from "./src/engine/evidencia/informe.ts";',
        'export { evaluarHallazgo } from "./src/engine/hallazgos/ciclo.ts";',
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
            [...s.pruebas, ...s.marcos, ...s.herramientas].map((v) => v.estado),
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

  for (const id of ACTIVOS_CON_PLAN) {
    test(`el plan y el paquete de ${id} (${FECHA_DEL_PLAN})`, async ({
      page,
      browserName,
    }) => {
      await abrirMotor(page);
      const { plan, paquete } = await page.evaluate(
        async ({ entrada, id }) => {
          const motor = (globalThis as unknown as { MotorHackGuard: Motor })
            .MotorHackGuard;
          const e = entrada as unknown as {
            activos: Record<string, EntradaDelPlan["activo"]>;
            instantanea: EntradaDelPlan["instantanea"];
            formula: EntradaDelPlan["formula"];
            entornos: EntradaDelPlan["entornos"];
            fecha: string;
          };
          const r = await motor.planificar({
            activo: e.activos[id],
            instantanea: e.instantanea,
            formula: e.formula,
            entornos: e.entornos,
            fecha: e.fecha,
          });
          return r.emitido
            ? { plan: r.plan.huella, paquete: r.paquete.huella }
            : { plan: null, paquete: null };
        },
        { entrada: entradaDelPlan, id },
      );
      console.log(
        `determinismo · ${browserName} · plan ${id} · ${plan} · paquete ${paquete}`,
      );
      expect(plan).toBe(enNode.planes[id].plan);
      expect(paquete).toBe(enNode.planes[id].paquete);
    });
  }

  test("el libro de evidencia y los hallazgos evaluados (sobres y hallazgos en otro orden)", async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const r = await page.evaluate(async (entrada) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor }).MotorHackGuard;
      const libro = entrada.sobres as Parameters<typeof motor.huellaDelLibro>[0];
      const hallazgos = entrada.hallazgos as Parameters<typeof motor.evaluarHallazgo>[0][];
      // El CLI lista por identificador de hallazgo; el navegador recibió la lista al revés y la ordena igual.
      const filas = [...hallazgos]
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map((h) => motor.evaluarHallazgo(h, libro))
        .flatMap((e) =>
          e.ok
            ? [{ evaluacion: e.evaluacion, estado: { es: "", en: "" }, severidad: null, plazo: null }]
            : [],
        );
      return {
        libro: await motor.huellaDelLibro(libro),
        hallazgos: await motor.huella(motor.salidaJsonDeHallazgos(filas, entrada.fecha).hallazgos),
      };
    }, entradaDelLibro);
    console.log(`determinismo · ${browserName} · libro ${r.libro} · hallazgos ${r.hallazgos}`);
    expect(r.libro).toBe(enNode.libro.libro);
    expect(r.hallazgos).toBe(enNode.libro.hallazgos);
  });
});
