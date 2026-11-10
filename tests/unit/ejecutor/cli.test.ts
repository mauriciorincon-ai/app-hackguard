// @vitest-environment node
// El ejecutor opcional como lo usa una persona (S12, D11), de punta a punta y SIN herramientas reales: promptfoo y ZAP son
// scripts simulados de `tests/fixtures/herramientas/` (no atacan nada) y el «objetivo» es un servidor en 127.0.0.1 que abre y
// cierra esta prueba (puerto dinámico). El CLI corre como proceso aparte con `execFile` asíncrono: con `spawnSync` el servidor,
// que vive en este mismo proceso, no podría contestar. El PATH lleva primero la carpeta de simuladas (jamás una promptfoo real
// del equipo) y la carpeta de `node`, que los scripts necesitan para arrancar.
import { execFile } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ASISTENTE, RAIZ } from "../evidencia/ayuda.ts";

const ejecutarArchivo = promisify(execFile);
const SIMULADAS = path.join(RAIZ, "tests/fixtures/herramientas");
const FIXTURES = path.join(RAIZ, "tests/fixtures/adaptadores");
const FECHA_DEL_PLAN = "2026-10-11";
const HOY = "2026-11-10";
const PATH_CON_SIMULADAS = [SIMULADAS, path.dirname(process.execPath)].join(
  path.delimiter,
);
const PATH_SIN_SIMULADAS = path.dirname(process.execPath);

let servidor: http.Server;
let puerto = 0;
const peticiones: string[] = [];
const temporales: string[] = [];

beforeAll(async () => {
  for (const f of ["promptfoo", "zap-baseline.py"])
    chmodSync(path.join(SIMULADAS, f), 0o755);
  servidor = http.createServer((req, res) => {
    peticiones.push(String(req.headers["x-herramienta"] ?? "?"));
    res.end("ok");
  });
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  puerto = (servidor.address() as { port: number }).port;
});
afterAll(async () => {
  await new Promise<void>((r) => servidor.close(() => r()));
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true }));
});
beforeEach(() => {
  peticiones.length = 0;
});

interface Corrida {
  codigo: number;
  salida: string;
  errores: string;
}
async function cli(
  script: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): Promise<Corrida> {
  try {
    const r = await ejecutarArchivo(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli", script),
        ...args,
      ],
      { cwd, env: { ...process.env, PATH: PATH_CON_SIMULADAS, ...env } },
    );
    return { codigo: 0, salida: r.stdout, errores: r.stderr };
  } catch (e) {
    const x = e as { code?: number; stdout?: string; stderr?: string };
    return {
      codigo: x.code ?? -1,
      salida: x.stdout ?? "",
      errores: x.stderr ?? "",
    };
  }
}

/** Una raíz de juguete con un activo PROPIO cuyo alcance autoriza el servidor de esta prueba, y su plan emitido. */
async function raizConPropio(cambiosDelAlcance: Record<string, unknown> = {}) {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-ejecutor-prueba-"));
  temporales.push(raiz);
  for (const c of [
    "instaladas",
    "instantaneas",
    "filtro",
    "planificador",
    "severidad",
    "ejecutor",
  ].filter((c) => c !== "instaladas"))
    cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
      recursive: true,
    });
  mkdirSync(path.join(raiz, "datos/hallazgos"), { recursive: true });
  cpSync(
    path.join(RAIZ, "datos/hallazgos/plazos.json"),
    path.join(raiz, "datos/hallazgos/plazos.json"),
  );
  mkdirSync(path.join(raiz, "datos/evidencia"), { recursive: true });
  cpSync(
    path.join(RAIZ, "datos/evidencia/muestreo.json"),
    path.join(raiz, "datos/evidencia/muestreo.json"),
  );
  const activo = JSON.parse(
    readFileSync(
      path.join(RAIZ, `datos/activos/demo/${ASISTENTE}.json`),
      "utf8",
    ),
  );
  activo.id = "mi-asistente";
  activo.origen = "propio";
  activo.alcance.objetivos = [`http://127.0.0.1:${puerto}`];
  activo.alcance.vigente_hasta = "2026-12-31";
  Object.assign(activo.alcance, cambiosDelAlcance);
  for (const [k, v] of Object.entries(activo.alcance))
    if (v === undefined) delete activo.alcance[k];
  mkdirSync(path.join(raiz, "datos/privado/activos"), { recursive: true });
  writeFileSync(
    path.join(raiz, "datos/privado/activos/mi-asistente.json"),
    JSON.stringify(activo),
  );
  const plan = await cli(
    "plan.ts",
    ["emitir", "mi-asistente", "--fecha", FECHA_DEL_PLAN],
    raiz,
  );
  if (plan.codigo !== 0 && plan.codigo !== 1)
    throw new Error(`no se pudo emitir el plan: ${plan.salida}${plan.errores}`);
  writeFileSync(
    path.join(raiz, "config-promptfoo.yaml"),
    "# configuración del usuario\n",
  );
  return raiz;
}

const objetivo = () => `http://127.0.0.1:${puerto}`;
const ejecutor = (
  raiz: string,
  extra: string[],
  env: Record<string, string> = {},
) =>
  cli(
    "ejecutor.ts",
    [
      "mi-asistente",
      "--fecha",
      HOY,
      "--objetivo",
      objetivo(),
      "--config",
      `promptfoo=${path.join(raiz, "config-promptfoo.yaml")}`,
      ...extra,
    ],
    raiz,
    env,
  );
const archivos = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(path.join(d, e.name)) : [path.join(d, e.name)],
  );
const lotes = (raiz: string) =>
  archivos(raiz).filter((f) =>
    f.includes(`${path.sep}datos${path.sep}privado${path.sep}lotes${path.sep}`),
  );
const carpetasTemporales = () =>
  readdirSync(tmpdir()).filter(
    (n) => n.startsWith("hackguard-ejecutor-") && !n.includes("prueba"),
  );

describe("sin --ejecutar: solo muestra, no lanza nada", () => {
  it("lista los comandos (con las herramientas que están en el PATH), nombra las omitidas y no toca el servidor", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, []);
    expect(r.codigo).toBe(1); // hay herramientas del plan sin instalar: algo que mirar
    expect(r.salida).toContain("ENSAYO");
    expect(r.salida).toMatch(/→ promptfoo .*"eval" "--config"/);
    expect(r.salida).toMatch(/→ zap .*"-t" "http:\/\/127\.0\.0\.1:\d+"/);
    expect(r.salida).toContain("[sin_configuracion] garak");
    expect(r.salida).toContain("[sin_configuracion] inspect");
    expect(peticiones).toEqual([]);
    expect(lotes(raiz)).toEqual([]);
    expect(carpetasTemporales()).toEqual([]);
  });

  it("también en el ensayo se ven los rechazos de la guarda", async () => {
    const raiz = await raizConPropio();
    const r = await cli(
      "ejecutor.ts",
      ["mi-asistente", "--fecha", HOY, "--objetivo", "http://127.0.0.1:1"],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[objetivo_fuera_de_alcance]");
    expect(peticiones).toEqual([]);
  });
});

describe("--ejecutar: corre la herramienta del usuario contra lo autorizado y propone, nunca confirma", () => {
  it("promptfoo simulado: pega al objetivo, deja un lote SIN confirmar, borra su carpeta temporal y no guarda el crudo", async () => {
    const raiz = await raizConPropio();
    const antes = carpetasTemporales();
    const r = await ejecutor(
      raiz,
      [
        "--herramienta",
        "promptfoo",
        "--ejecutar",
        "--por",
        "Persona de prueba",
      ],
      {
        HG_FIXTURE: path.join(FIXTURES, "promptfoo-0.123.1.sintetico.json"),
      },
    );
    expect(r.errores).toBe("");
    expect(r.salida).toContain("Lanzando / Launching promptfoo");
    expect(r.salida).toMatch(/SIN confirmar/);
    expect(r.salida).toContain("El ejecutor no confirma nada");
    expect(peticiones).toEqual(["promptfoo"]);
    expect(carpetasTemporales()).toEqual(antes);
    const delLote = lotes(raiz);
    expect(delLote).toHaveLength(1);
    const lote = JSON.parse(readFileSync(delLote[0]!, "utf8"));
    expect(lote.confirmacion).toBeNull();
    const sobres = archivos(raiz).filter((f) =>
      f.includes(`${path.sep}privado${path.sep}evidencia${path.sep}`),
    );
    expect(sobres.length).toBeGreaterThan(0);
    for (const s of sobres) {
      expect(JSON.parse(readFileSync(s, "utf8")).confirmacion).toBeNull();
      expect(statSync(s).mode & 0o777).toBe(0o600);
    }
    // El archivo crudo de la herramienta no quedó en ninguna parte de la raíz.
    const crudo = readFileSync(
      path.join(FIXTURES, "promptfoo-0.123.1.sintetico.json"),
      "utf8",
    );
    for (const f of archivos(raiz))
      if (!f.endsWith("config-promptfoo.yaml"))
        expect(readFileSync(f, "utf8")).not.toBe(crudo);
  });

  it("ZAP simulado: el objetivo llega como argumento (-t) y entra por el mismo adaptador", async () => {
    const raiz = await raizConPropio();
    const r = await cli(
      "ejecutor.ts",
      [
        "mi-asistente",
        "--fecha",
        HOY,
        "--objetivo",
        objetivo(),
        "--herramienta",
        "zap",
        "--ejecutar",
        "--por",
        "Persona de prueba",
      ],
      raiz,
      { HG_FIXTURE: path.join(FIXTURES, "zap-traditional-json.derivada.json") },
    );
    expect(r.salida).toContain("Lanzando / Launching zap");
    expect(peticiones).toEqual(["zap"]);
    expect(lotes(raiz)).toHaveLength(1);
  });

  it("sin --por no lanza nada: quién lo corre queda en el lote", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, ["--ejecutar"]);
    expect(r.codigo).toBe(3);
    expect(peticiones).toEqual([]);
  });

  it("una herramienta que falla no deja nada importado y la carpeta temporal se borra igual", async () => {
    const raiz = await raizConPropio();
    const antes = carpetasTemporales();
    const r = await ejecutor(
      raiz,
      ["--herramienta", "promptfoo", "--ejecutar", "--por", "P"],
      {
        HG_FIXTURE: path.join(FIXTURES, "promptfoo-0.123.1.sintetico.json"),
        HG_FALLA: "1",
      },
    );
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain("no terminó bien");
    expect(lotes(raiz)).toEqual([]);
    expect(carpetasTemporales()).toEqual(antes);
  });

  it("una herramienta que termina sin dejar su archivo tampoco importa nada", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(
      raiz,
      ["--herramienta", "promptfoo", "--ejecutar", "--por", "P"],
      {
        HG_FIXTURE: path.join(FIXTURES, "promptfoo-0.123.1.sintetico.json"),
        HG_SIN_SALIDA: "1",
      },
    );
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain("no dejó su archivo");
    expect(lotes(raiz)).toEqual([]);
  });

  it("una herramienta que no está en el PATH se omite con su razón: HackGuard no instala nada", async () => {
    const raiz = await raizConPropio();
    const r = await cli(
      "ejecutor.ts",
      [
        "mi-asistente",
        "--fecha",
        HOY,
        "--objetivo",
        objetivo(),
        "--config",
        `promptfoo=${path.join(raiz, "config-promptfoo.yaml")}`,
        "--herramienta",
        "promptfoo",
        "--ejecutar",
        "--por",
        "P",
      ],
      raiz,
      { PATH: PATH_SIN_SIMULADAS },
    );
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain("[no_instalada] promptfoo");
    expect(peticiones).toEqual([]);
  });
});

describe("las guardas rechazan antes de lanzar nada, aun con --ejecutar", () => {
  const conEjecutar = ["--ejecutar", "--por", "P"];
  const sinRastro = (raiz: string) => {
    expect(peticiones).toEqual([]);
    expect(lotes(raiz)).toEqual([]);
    expect(carpetasTemporales()).toEqual([]);
  };

  it("objetivo fuera de alcance (otro puerto de la misma máquina)", async () => {
    const raiz = await raizConPropio();
    const r = await cli(
      "ejecutor.ts",
      [
        "mi-asistente",
        "--fecha",
        HOY,
        "--objetivo",
        `http://127.0.0.1:${puerto + 1}`,
        ...conEjecutar,
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[objetivo_fuera_de_alcance]");
    sinRastro(raiz);
  });

  it("autorización vencida", async () => {
    const raiz = await raizConPropio({ vigente_hasta: "2026-11-01" });
    const r = await ejecutor(raiz, conEjecutar);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[autorizacion_vencida]");
    sinRastro(raiz);
  });

  it("sin vigente_hasta", async () => {
    const raiz = await raizConPropio({ vigente_hasta: undefined });
    const r = await ejecutor(raiz, conEjecutar);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[sin_vigencia]");
    sinRastro(raiz);
  });

  it("sin objetivos en el alcance", async () => {
    const raiz = await raizConPropio({ objetivos: undefined });
    const r = await ejecutor(raiz, conEjecutar);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[sin_objetivos_autorizados]");
    sinRastro(raiz);
  });

  it("el activo cambió después de emitir el plan: no se lanza nada", async () => {
    const raiz = await raizConPropio();
    const ruta = path.join(raiz, "datos/privado/activos/mi-asistente.json");
    const a = JSON.parse(readFileSync(ruta, "utf8"));
    a.alcance.limites.es += " (cambió)";
    a.alcance.limites.en += " (changed)";
    writeFileSync(ruta, JSON.stringify(a));
    const r = await ejecutor(raiz, conEjecutar);
    // El cargador de activos ya lo rechaza (y por eso nada se lanza); la guarda propia cubre el plan de una versión que el
    // historial SÍ conoce (prueba unitaria `decidir.test.ts`).
    expect(r.codigo).toBe(2);
    expect(r.errores).toContain("cambió desde que se emitió el plan");
    sinRastro(raiz);
  });

  it("el activo demo del repo: se rechaza y no se lanza nada (criterio del sprint)", async () => {
    const r = await cli(
      "ejecutor.ts",
      [
        "act-demo-asistente",
        "--fecha",
        HOY,
        "--objetivo",
        objetivo(),
        ...conEjecutar,
      ],
      RAIZ,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("[activo_demo]");
    expect(peticiones).toEqual([]);
  });

  it("falta --objetivo o --fecha: error de uso, nada se lanza", async () => {
    const raiz = await raizConPropio();
    expect(
      (await cli("ejecutor.ts", ["mi-asistente", "--fecha", HOY], raiz)).codigo,
    ).toBe(3);
    expect(
      (
        await cli(
          "ejecutor.ts",
          ["mi-asistente", "--objetivo", objetivo()],
          raiz,
        )
      ).codigo,
    ).toBe(3);
    sinRastro(raiz);
  });
});
