// @vitest-environment node
// El ejecutor opcional como lo usa una persona (S12, D11), de punta a punta y SIN herramientas reales: promptfoo y ZAP son
// scripts simulados de `tests/fixtures/herramientas/` (no atacan nada) y el «objetivo» es un servidor en 127.0.0.1 que abre y
// cierra esta prueba (puerto dinámico). El CLI corre como proceso aparte con `execFile` asíncrono: con `spawnSync` el servidor,
// que vive en este mismo proceso, no podría contestar. El PATH lleva primero la carpeta de simuladas (jamás una promptfoo real
// del equipo) y la carpeta de `node`, que los scripts necesitan para arrancar.
import { execFile, spawn } from "node:child_process";
import {
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
// Con --ejecutar la fecha de la corrida es la del reloj (±1 día): las pruebas usan la de hoy y vigencias relativas a ella.
const dia = (desplazamiento: number) =>
  new Date(Date.now() + desplazamiento * 86_400_000).toISOString().slice(0, 10);
const HOY = dia(0);
// Variables que las herramientas simuladas leen: se declaran en el `entorno_base` de la raíz de juguete; nada más de este proceso llega.
const VARIABLES_DE_LAS_SIMULADAS = [
  "HG_FIXTURE",
  "HG_FALLA",
  "HG_SIN_SALIDA",
  "HG_CODIGO_SALIDA",
  "HG_STDERR",
  "HG_VOLCADO",
  "HG_NIETO",
  "HG_DORMIR",
];
const PATH_CON_SIMULADAS = [SIMULADAS, path.dirname(process.execPath)].join(
  path.delimiter,
);
const PATH_SIN_SIMULADAS = path.dirname(process.execPath);

let servidor: http.Server;
// Carpeta temporal PROPIA de esta prueba (TMPDIR del CLI): lo que el ejecutor deja o borra se ve aquí sin mirar el tmp compartido.
let TMP = "";
let puerto = 0;
const peticiones: string[] = [];
const temporales: string[] = [];

beforeAll(async () => {
  TMP = mkdtempSync(path.join(tmpdir(), "hackguard-tmp-de-la-prueba-"));
  temporales.push(TMP);
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
      {
        cwd,
        env: { ...process.env, PATH: PATH_CON_SIMULADAS, TMPDIR: TMP, ...env },
      },
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
  activo.alcance.vigente_hasta = dia(30);
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
  const tablaRuta = path.join(raiz, "datos/ejecutor/comandos.json");
  const tabla = JSON.parse(readFileSync(tablaRuta, "utf8"));
  tabla.entorno_base.push(...VARIABLES_DE_LAS_SIMULADAS);
  writeFileSync(tablaRuta, JSON.stringify(tabla));
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
  readdirSync(TMP).filter((n) => n.startsWith("hackguard-ejecutor-"));

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
    const raiz = await raizConPropio({ vigente_hasta: dia(-1) });
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
    // historial SÍ conoce (prueba unitaria `decidir.test.ts`). Es un error inesperado del cargador, no una guarda: sale con el 3.
    expect(r.codigo).toBe(3);
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

const vivo = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const esperar = async (cond: () => boolean, ms = 8000) => {
  const fin = Date.now() + ms;
  while (!cond() && Date.now() < fin)
    await new Promise((r) => setTimeout(r, 50));
  return cond();
};
const PROMPTFOO = ["--herramienta", "promptfoo", "--ejecutar", "--por", "P"];
const FIXTURE_PF = path.join(FIXTURES, "promptfoo-0.123.1.sintetico.json");

describe("los códigos de salida con los que una herramienta deja resultados (auditoría S12, A1)", () => {
  it("ZAP sale con 2 (WARN) y promptfoo con 100 (un caso falló): los resultados se importan igual", async () => {
    const raiz = await raizConPropio();
    const zap = await cli(
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
        "P",
      ],
      raiz,
      {
        HG_FIXTURE: path.join(FIXTURES, "zap-traditional-json.derivada.json"),
        HG_CODIGO_SALIDA: "2",
      },
    );
    expect(zap.salida).not.toContain("no terminó bien");
    expect(lotes(raiz)).toHaveLength(1);
    const pf = await ejecutor(raiz, PROMPTFOO, {
      HG_FIXTURE: FIXTURE_PF,
      HG_CODIGO_SALIDA: "100",
    });
    expect(pf.salida).not.toContain("no terminó bien");
    expect(lotes(raiz)).toHaveLength(2);
  });

  it("un código que el comando no declara (promptfoo con 5) es un fallo: no se importa nada", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, PROMPTFOO, {
      HG_FIXTURE: FIXTURE_PF,
      HG_CODIGO_SALIDA: "5",
    });
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain("salió con código 5");
    expect(lotes(raiz)).toEqual([]);
  });
});

describe("lo que la herramienta recibe y lo que muestra el ejecutor (auditoría S12, M4 y M5)", () => {
  it("recibe su base, su objetivo y sus claves declaradas; un token cualquiera del entorno no viaja", async () => {
    const raiz = await raizConPropio();
    const volcado = path.join(raiz, "entorno-visto.json");
    await ejecutor(raiz, PROMPTFOO, {
      HG_FIXTURE: FIXTURE_PF,
      HG_VOLCADO: volcado,
      SECRETO_X: "no-debe-viajar",
      GITHUB_TOKEN: "tampoco",
      OPENAI_API_KEY: "esta-si-esta-declarada",
    });
    const vistas = JSON.parse(readFileSync(volcado, "utf8")) as string[];
    expect(vistas).toContain("PATH");
    expect(vistas).toContain("HACKGUARD_OBJETIVO");
    expect(vistas).toContain("OPENAI_API_KEY");
    expect(vistas).not.toContain("SECRETO_X");
    expect(vistas).not.toContain("GITHUB_TOKEN");
  });

  it("el stderr de la herramienta no se imprime: solo su tamaño", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, PROMPTFOO, {
      HG_FIXTURE: FIXTURE_PF,
      HG_FALLA: "1",
      HG_STDERR: "MARCADOR-DE-STDERR",
    });
    expect(r.codigo).toBe(1);
    expect(r.salida + r.errores).not.toContain("MARCADOR-DE-STDERR");
    expect(r.salida).toMatch(/stderr: \d+ bytes/);
  });
});

describe("el tiempo y la interrupción matan el grupo entero (auditoría S12, M1)", () => {
  it("al vencer --tiempo muere también lo que la herramienta lanzó, y la carpeta se borra", async () => {
    const raiz = await raizConPropio();
    const pidDelNieto = path.join(raiz, "nieto.pid");
    const r = await ejecutor(raiz, [...PROMPTFOO, "--tiempo", "2"], {
      HG_FIXTURE: FIXTURE_PF,
      HG_NIETO: pidDelNieto,
      HG_DORMIR: "1",
    });
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain("venció --tiempo");
    const pid = Number(readFileSync(pidDelNieto, "utf8"));
    expect(await esperar(() => !vivo(pid))).toBe(true);
    expect(carpetasTemporales()).toEqual([]);
    expect(lotes(raiz)).toEqual([]);
  });

  it("con Ctrl-C (SIGINT) sale con 130, mata el grupo y no deja el crudo en la carpeta temporal", async () => {
    const raiz = await raizConPropio();
    const pidDelNieto = path.join(raiz, "nieto.pid");
    const hijo = spawn(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli/ejecutor.ts"),
        "mi-asistente",
        "--fecha",
        HOY,
        "--objetivo",
        objetivo(),
        "--config",
        `promptfoo=${path.join(raiz, "config-promptfoo.yaml")}`,
        ...PROMPTFOO,
      ],
      {
        cwd: raiz,
        env: {
          ...process.env,
          PATH: PATH_CON_SIMULADAS,
          TMPDIR: TMP,
          HG_FIXTURE: FIXTURE_PF,
          HG_NIETO: pidDelNieto,
          HG_DORMIR: "1",
        },
        stdio: "ignore",
      },
    );
    const termino = new Promise<number | null>((r) =>
      hijo.on("close", (c) => r(c)),
    );
    expect(
      await esperar(
        () => peticiones.length > 0 && carpetasTemporales().length > 0,
      ),
    ).toBe(true);
    await esperar(() => {
      try {
        return Number(readFileSync(pidDelNieto, "utf8")) > 0;
      } catch {
        return false;
      }
    });
    hijo.kill("SIGINT");
    expect(await termino).toBe(130);
    const pid = Number(readFileSync(pidDelNieto, "utf8"));
    expect(await esperar(() => !vivo(pid))).toBe(true);
    expect(carpetasTemporales()).toEqual([]);
  });
});

describe("la fecha de la corrida, el objetivo que no se ve y los errores (auditoría S12, M2 · M3 · B1b · B2)", () => {
  it("con --ejecutar, una --fecha que no es la de hoy no lanza nada (la vigencia se compara con el reloj)", async () => {
    const raiz = await raizConPropio();
    const r = await cli(
      "ejecutor.ts",
      [
        "mi-asistente",
        "--fecha",
        "2026-01-01",
        "--objetivo",
        objetivo(),
        ...PROMPTFOO,
      ],
      raiz,
      { HG_FIXTURE: FIXTURE_PF },
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("no es la de hoy");
    expect(peticiones).toEqual([]);
    expect(lotes(raiz)).toEqual([]);
  });

  it("el ensayo avisa, por herramienta, cuando su objetivo sale de TU configuración y no se puede verificar", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, []);
    expect(r.salida).toMatch(/promptfoo toma su objetivo de TU configuración/);
    expect(r.salida).not.toMatch(/zap toma su objetivo/);
  });

  it("un error inesperado (el JSON de comandos roto) sale con 3, no con el 2 de una guarda", async () => {
    const raiz = await raizConPropio();
    writeFileSync(path.join(raiz, "datos/ejecutor/comandos.json"), "{ roto");
    const r = await ejecutor(raiz, []);
    expect(r.codigo).toBe(3);
    expect(r.salida).not.toContain("RECHAZADO");
  });

  it("--idioma en escribe en inglés lo que importa el lote; un idioma que no existe es un error de uso", async () => {
    const raiz = await raizConPropio();
    const r = await ejecutor(raiz, [...PROMPTFOO, "--idioma", "en"], {
      HG_FIXTURE: FIXTURE_PF,
    });
    expect(r.salida).toMatch(/Batch LOTE-\d+ built/);
    const mal = await ejecutor(raiz, ["--idioma", "fr"]);
    expect(mal.codigo).toBe(3);
  });
});
