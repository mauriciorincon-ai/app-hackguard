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
import {
  calcularBrecha,
  type Brecha,
} from "../../src/engine/brecha/calcular.ts";
import type { CatalogoEnBruto } from "../../src/engine/catalogo/tipos.ts";
import type { evaluarConjunto } from "../../src/engine/demo/conjunto.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { huellaDelLibro } from "../../src/engine/evidencia/libro.ts";
import type { Lote } from "../../src/engine/lotes/esquemas.ts";
import { libroEfectivo } from "../../src/engine/lotes/efectivo.ts";
import { resellarLote } from "../../src/engine/lotes/huellas.ts";
import type { PlanDeMuestreo } from "../../src/engine/lotes/esquemas.ts";
import {
  revisionDelLote,
  type RevisionDelLote,
  type SobreParaRevisar,
} from "../../src/engine/lotes/revision.ts";
import { validarPlanDeMuestreo } from "../../src/engine/lotes/muestra.ts";
import type { Sobre } from "../../src/engine/evidencia/esquemas.ts";
import type { salidaJsonDeHallazgos } from "../../src/engine/evidencia/informe.ts";
import type { situacionDeHallazgo } from "../../src/engine/hallazgos/situacion.ts";
import { sha256, type huella } from "../../src/engine/huella.ts";
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
  catalogo: {
    pruebas: unknown[];
    familias: { id: string }[];
    umbrales: { vigencia: { por_revisar: number; vencido: number } };
  };
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
  situacionDeHallazgo: typeof situacionDeHallazgo;
  salidaJsonDeHallazgos: typeof salidaJsonDeHallazgos;
  revisionDelLote: typeof revisionDelLote;
  libroEfectivo: typeof libroEfectivo;
  validarPlanDeMuestreo: typeof validarPlanDeMuestreo;
  calcularBrecha: typeof calcularBrecha;
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
let entradaDelLibro: {
  sobres: unknown[];
  hallazgos: unknown[];
  lotes: unknown[];
  escala: unknown;
  plazos: unknown;
  fecha: string;
};
// Los lotes (S6): la muestra que una persona revisa y el libro efectivo, con lotes y sobres en otro orden.
interface EntradaDeLosLotes {
  plan: unknown;
  sobres: unknown[];
  /** Dos escenarios: los lotes demo como están (por confirmar) y con los dos confirmados. */
  escenarios: { nombre: string; lotes: unknown[] }[];
  /** Un lote de 60 sobres con 6 que fallan: el resto (54) pide una muestra de 25. */
  sintetico: {
    lote: unknown;
    sobres: [string, { veredicto: string; reprueba_de: string | null }][];
  };
}
let entradaDeLosLotes: EntradaDeLosLotes;
// La brecha (S7): una sola cuenta con todo lo que la alimenta, que el navegador recibe en el orden inverso.
interface InsumosDeBrecha {
  sobres: unknown[];
  lotes: unknown[];
  hallazgos: unknown[];
  escala: unknown;
  plazos: unknown;
  planes: unknown[];
  activos: string[];
  pruebas: {
    id: string;
    familia: string;
    controles: string[];
    fecha_verificacion: string;
  }[];
  familias: { id: string }[];
  vigencia: unknown;
  umbralesDeBrecha: unknown;
  fecha: string;
}
let insumosDeBrecha: InsumosDeBrecha;
let brechaEnNode: Brecha;
const enNodeLotes = {} as {
  revisiones: Record<string, RevisionDelLote>;
  sintetico: RevisionDelLote;
  efectivo: Record<string, [string, string | undefined][]>;
  huellas: Record<string, string>;
  plan: unknown[];
};
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
      node(
        "src/cli/evidencia.ts",
        "hallazgos-listar",
        "--fecha",
        FECHA_DEL_LIBRO,
        "--json",
      ),
    ) as { huella_del_libro: string; huella_de_los_hallazgos: string };
  const libros = [listar(), listar(), listar()];
  expect(
    new Set(
      libros.map((l) => `${l.huella_del_libro}/${l.huella_de_los_hallazgos}`),
    ).size,
    "tres corridas del CLI del libro, una sola huella",
  ).toBe(1);
  enNode.libro = {
    libro: libros[0].huella_del_libro,
    hallazgos: libros[0].huella_de_los_hallazgos,
  };
  entradaDelLibro = {
    sobres: leerCarpeta("datos", "evidencia", "demo").reverse(),
    hallazgos: leerCarpeta("datos", "hallazgos", "demo").reverse(),
    lotes: leerCarpeta("datos", "lotes", "demo").reverse(),
    escala: leerJson<unknown>("datos", "severidad", "escala-ia.json"),
    plazos: leerJson<unknown>("datos", "hallazgos", "plazos.json"),
    fecha: FECHA_DEL_LIBRO,
  };

  // Node es la referencia de los lotes (S6): el mismo motor, en su orden, en el proceso de Node. El navegador recibe
  // los sobres y los lotes al revés y tiene que dar lo mismo: la muestra sale de la huella del lote y no del orden.
  const planDeMuestreo = leerJson<PlanDeMuestreo>(
    "datos",
    "evidencia",
    "muestreo.json",
  );
  const sobresDemo = leerCarpeta("datos", "evidencia", "demo") as Sobre[];
  const lotesDemo = leerCarpeta("datos", "lotes", "demo") as Lote[];
  const sobresPorIdDemo = new Map(sobresDemo.map((x) => [x.id, x]));
  const confirmados = await Promise.all(
    lotesDemo.map((l) =>
      resellarLote(l, {
        por: "Revisora demo",
        fecha: "2026-10-03",
        decision: "confirmado",
        revisados: l.sobres.map((x) => x.id),
        separados: l.id === "LOTE-0008" ? ["SOB-0034"] : [],
      }),
    ),
  );
  const idsSinteticos = Array.from({ length: 60 }, (_, i) => `SOB-${2001 + i}`);
  // El sobre 40 es la re-prueba superada de un hallazgo: se revisa siempre, como las 4 fallidas y las 2 parciales (B2).
  const sobresSinteticos: [string, SobreParaRevisar][] = idsSinteticos.map(
    (id, i) => [
      id,
      {
        veredicto: [2, 17, 33, 48].includes(i)
          ? "fallida"
          : [9, 55].includes(i)
            ? "parcial"
            : i % 7 === 3
              ? "no_ejecutada"
              : "superada",
        reprueba_de: i === 40 ? "HZ-0009" : null,
      },
    ],
  );
  const semilla = await sha256("semilla-del-lote-sintetico");
  const loteSintetico = {
    huellas: { archivo: semilla, lote: semilla, registro: semilla },
    sobres: idsSinteticos.map((id) => ({ id, huella: semilla })),
  };
  const escenarios = [
    { nombre: "por-confirmar", lotes: lotesDemo },
    { nombre: "confirmados", lotes: confirmados },
  ];
  enNodeLotes.plan = validarPlanDeMuestreo(planDeMuestreo);
  enNodeLotes.revisiones = Object.fromEntries(
    await Promise.all(
      lotesDemo.map(
        async (l) =>
          [
            l.id,
            await revisionDelLote(l, sobresPorIdDemo, planDeMuestreo),
          ] as const,
      ),
    ),
  );
  enNodeLotes.sintetico = await revisionDelLote(
    loteSintetico,
    new Map(sobresSinteticos),
    planDeMuestreo,
  );
  enNodeLotes.efectivo = {};
  enNodeLotes.huellas = {};
  for (const e of escenarios) {
    enNodeLotes.efectivo[e.nombre] = libroEfectivo(sobresDemo, e.lotes)
      .filter((x) => x.confirmacion?.modo === "lote")
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((x) => [x.id, x.confirmacion?.lote] as [string, string | undefined]);
    enNodeLotes.huellas[e.nombre] = await huellaDelLibro(sobresDemo, e.lotes);
  }
  entradaDeLosLotes = {
    plan: planDeMuestreo,
    sobres: [...sobresDemo].reverse(),
    escenarios: escenarios.map((e) => ({
      nombre: e.nombre,
      lotes: [...e.lotes].reverse(),
    })),
    sintetico: {
      lote: { ...loteSintetico, sobres: [...loteSintetico.sobres].reverse() },
      sobres: [...sobresSinteticos].reverse(),
    },
  };

  // Node es la referencia de la brecha (S7): el mismo motor, con todo en su orden. El navegador lo recibe al revés y tiene
  // que dar los mismos bytes: la cuenta no depende del orden de entrada ni del motor que la corre.
  const lotesDeBrecha = leerCarpeta("datos", "lotes", "demo") as Lote[];
  const planesDeBrecha = ACTIVOS_CON_PLAN.map((id) =>
    leerJson<{ activo: { id: string } }>("datos", "planes", `${id}.plan.json`),
  );
  const idsDeActivos = (
    leerCarpeta("datos", "activos", "demo") as { id: string }[]
  ).map((a) => a.id);
  const pruebasDeBrecha = (
    OFICIAL.catalogo.pruebas as InsumosDeBrecha["pruebas"]
  ).map((p) => ({
    id: p.id,
    familia: p.familia,
    controles: p.controles,
    fecha_verificacion: p.fecha_verificacion,
  }));
  const escalaDeBrecha = leerJson<unknown>(
    "datos",
    "severidad",
    "escala-ia.json",
  );
  const plazosDeBrecha = leerJson<unknown>("datos", "hallazgos", "plazos.json");
  const umbralesDeBrecha = leerJson<unknown>(
    "datos",
    "brecha",
    "umbrales.json",
  );
  type EntradaDeBrecha = Parameters<typeof calcularBrecha>[0];
  brechaEnNode = await calcularBrecha({
    consulta: FECHA_DEL_LIBRO,
    umbrales: umbralesDeBrecha as EntradaDeBrecha["umbrales"],
    vigencia: OFICIAL.catalogo.umbrales.vigencia,
    familias: OFICIAL.catalogo.familias,
    pruebas: pruebasDeBrecha,
    activos: idsDeActivos.map((id) => ({
      id,
      plan: (planesDeBrecha.find((p) => p.activo.id === id) ??
        null) as EntradaDeBrecha["activos"][number]["plan"],
    })),
    libro: libroEfectivo(sobresDemo, lotesDeBrecha),
    hallazgos: leerCarpeta(
      "datos",
      "hallazgos",
      "demo",
    ) as EntradaDeBrecha["hallazgos"],
    lotes: lotesDeBrecha,
    escala: escalaDeBrecha as EntradaDeBrecha["escala"],
    plazos: plazosDeBrecha as EntradaDeBrecha["plazos"],
  });
  insumosDeBrecha = {
    sobres: [...sobresDemo].reverse(),
    lotes: [...lotesDeBrecha].reverse(),
    hallazgos: (
      leerCarpeta("datos", "hallazgos", "demo") as unknown[]
    ).reverse(),
    escala: escalaDeBrecha,
    plazos: plazosDeBrecha,
    planes: [...planesDeBrecha].reverse(),
    activos: [...idsDeActivos].reverse(),
    pruebas: [...pruebasDeBrecha].reverse(),
    // Las familias son una lista ordenada del catálogo (software, agente…), no un conjunto: la brecha las dice en ese orden.
    familias: OFICIAL.catalogo.familias,
    vigencia: OFICIAL.catalogo.umbrales.vigencia,
    umbralesDeBrecha,
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
        'export { situacionDeHallazgo } from "./src/engine/hallazgos/situacion.ts";',
        'export { revisionDelLote } from "./src/engine/lotes/revision.ts";',
        'export { libroEfectivo } from "./src/engine/lotes/efectivo.ts";',
        'export { validarPlanDeMuestreo } from "./src/engine/lotes/muestra.ts";',
        'export { calcularBrecha } from "./src/engine/brecha/calcular.ts";',
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

  test("el libro de evidencia, con sus lotes, y los hallazgos evaluados (todo en otro orden)", async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const r = await page.evaluate(async (entrada) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor })
        .MotorHackGuard;
      const sobres = entrada.sobres as Parameters<
        typeof motor.huellaDelLibro
      >[0];
      const lotes = entrada.lotes as Parameters<typeof motor.libroEfectivo>[1];
      // Lo que cuenta es el libro efectivo (ADR-009): los sobres con la confirmación de su lote, si la tienen.
      const libro = motor.libroEfectivo(sobres, lotes);
      const hallazgos = entrada.hallazgos as Parameters<
        typeof motor.situacionDeHallazgo
      >[0][];
      const datos = {
        escala: entrada.escala as Parameters<
          typeof motor.situacionDeHallazgo
        >[2]["escala"],
        plazos: entrada.plazos as Parameters<
          typeof motor.situacionDeHallazgo
        >[2]["plazos"],
        fecha: entrada.fecha,
      };
      // El CLI lista por identificador de hallazgo; el navegador recibió la lista al revés y la ordena igual.
      // La situación (estado, severidad, plazo y revisión) sale de la MISMA función del motor.
      const filas = [...hallazgos]
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map((h) => motor.situacionDeHallazgo(h, libro, datos))
        .flatMap((r) => (r.ok ? [{ situacion: r.situacion }] : []));
      return {
        libro: await motor.huellaDelLibro(sobres, lotes),
        hallazgos: await motor.huella(
          motor.salidaJsonDeHallazgos(filas, entrada.fecha).hallazgos,
        ),
      };
    }, entradaDelLibro);
    console.log(
      `determinismo · ${browserName} · libro ${r.libro} · hallazgos ${r.hallazgos}`,
    );
    expect(r.libro).toBe(enNode.libro.libro);
    expect(r.hallazgos).toBe(enNode.libro.hallazgos);
  });

  test("la brecha: una sola cuenta, los mismos bytes y la misma huella con todo en otro orden", async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const b = await page.evaluate(async (e) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor })
        .MotorHackGuard;
      type Entrada = Parameters<typeof motor.calcularBrecha>[0];
      const lotes = e.lotes as Parameters<typeof motor.libroEfectivo>[1];
      const sobres = e.sobres as Parameters<typeof motor.huellaDelLibro>[0];
      const planes = e.planes as { activo: { id: string } }[];
      return motor.calcularBrecha({
        consulta: e.fecha,
        umbrales: e.umbralesDeBrecha as Entrada["umbrales"],
        vigencia: e.vigencia as Entrada["vigencia"],
        familias: e.familias,
        pruebas: e.pruebas,
        activos: e.activos.map((id) => ({
          id,
          plan: (planes.find((p) => p.activo.id === id) ??
            null) as Entrada["activos"][number]["plan"],
        })),
        libro: motor.libroEfectivo(sobres, lotes),
        hallazgos: e.hallazgos as Entrada["hallazgos"],
        lotes: lotes as Entrada["lotes"],
        escala: e.escala as Entrada["escala"],
        plazos: e.plazos as Entrada["plazos"],
      });
    }, insumosDeBrecha);
    console.log(
      `determinismo · ${browserName} · brecha ${b.huella.slice(0, 12)} · ${b.resumen.planeadas} planeadas, ${b.resumen.ejecutadas} ejecutadas`,
    );
    // Una cuenta que no cuenta nada daría lo mismo en todas partes: se comprueba que hay algo que contar.
    expect(b.resumen.planeadas).toBeGreaterThan(0);
    expect(b.controles.length).toBeGreaterThan(0);
    expect(b.problemas).toEqual([]);
    expect(b.huella).toBe(brechaEnNode.huella);
    expect(JSON.stringify(b)).toBe(JSON.stringify(brechaEnNode));
  });

  test("la muestra de cada lote, el libro efectivo y el plan de muestreo (lotes y sobres en otro orden)", async ({
    page,
    browserName,
  }) => {
    await abrirMotor(page);
    const r = await page.evaluate(async (entrada) => {
      const motor = (globalThis as unknown as { MotorHackGuard: Motor })
        .MotorHackGuard;
      const plan = entrada.plan as PlanDeMuestreo;
      const sobres = entrada.sobres as Sobre[];
      const sobresPorId = new Map(sobres.map((x) => [x.id, x]));
      const porConfirmar = entrada.escenarios[0].lotes as Lote[];
      const revisiones: Record<string, unknown> = {};
      for (const l of porConfirmar)
        revisiones[l.id] = await motor.revisionDelLote(l, sobresPorId, plan);
      const efectivo: Record<string, unknown> = {};
      const huellas: Record<string, string> = {};
      for (const e of entrada.escenarios) {
        efectivo[e.nombre] = motor
          .libroEfectivo(sobres, e.lotes as Lote[])
          .filter((x) => x.confirmacion?.modo === "lote")
          // El libro efectivo conserva el orden de entrada; se compara ordenado por identificador, como el CLI.
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .map((x) => [x.id, x.confirmacion?.lote]);
        huellas[e.nombre] = await motor.huellaDelLibro(
          sobres,
          e.lotes as Lote[],
        );
      }
      return {
        plan: motor.validarPlanDeMuestreo(plan),
        revisiones,
        sintetico: await motor.revisionDelLote(
          entrada.sintetico.lote as Lote,
          new Map(entrada.sintetico.sobres as [string, SobreParaRevisar][]),
          plan,
        ),
        efectivo,
        huellas,
      };
    }, entradaDeLosLotes);
    console.log(
      `determinismo · ${browserName} · muestra sintética ${r.sintetico.muestra.slice(0, 3).join(",")}… (${r.sintetico.muestra.length}) · libro con lotes ${r.huellas["confirmados"]}`,
    );
    // El plan cumple su riesgo con la misma aritmética exacta en cada motor.
    expect(r.plan).toEqual([]);
    expect(r.plan).toEqual(enNodeLotes.plan);
    // Los lotes demo: las que fallan siempre y la muestra, iguales a las de Node.
    expect(r.revisiones).toEqual(enNodeLotes.revisiones);
    // 60 sobres con 6 que fallan: las 6 siempre y 25 de los otros 54, los mismos 25 en los tres motores.
    expect(r.sintetico.siempre).toHaveLength(7);
    expect(r.sintetico.muestra).toHaveLength(25);
    expect(r.sintetico).toEqual(enNodeLotes.sintetico);
    // El libro efectivo: sin lotes confirmados nadie cuenta por lote; confirmados, cuentan los suyos menos el separado.
    expect(r.efectivo).toEqual(enNodeLotes.efectivo);
    expect(enNodeLotes.efectivo["por-confirmar"]).toEqual([]);
    expect(enNodeLotes.efectivo["confirmados"]).toHaveLength(5);
    expect(r.huellas).toEqual(enNodeLotes.huellas);
    expect(r.huellas["confirmados"]).not.toBe(r.huellas["por-confirmar"]);
  });
});
