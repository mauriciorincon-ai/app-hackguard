// @vitest-environment node
// Las guardas del ejecutor (S12, D11), una por una, sobre el núcleo puro: cada prueba arma una entrada válida, rompe UNA cosa y
// espera la guarda que la nombra. Sin la guarda, la prueba correspondiente falla (ver la demo en rojo del cierre).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { ADAPTADORES } from "../../../src/engine/adaptadores/index.ts";
import {
  decidirEjecucion,
  GUARDAS,
  type EntradaDeEjecucion,
  type Guarda,
} from "../../../src/engine/ejecutor/decidir.ts";
import { TablaDeComandos } from "../../../src/engine/ejecutor/esquemas.ts";
import { Paquete } from "../../../src/engine/planificador/esquemas.ts";

const RAIZ = path.resolve(import.meta.dirname, "../../..");
const leer = (r: string) =>
  JSON.parse(readFileSync(path.join(RAIZ, r), "utf8")) as unknown;

const TABLA = TablaDeComandos.parse(leer("datos/ejecutor/comandos.json"));
const PAQUETE = Paquete.parse(
  leer("datos/planes/act-demo-asistente.paquete.json"),
);
const DEMO = leer("datos/activos/demo/act-demo-asistente.json") as Record<
  string,
  unknown
>;

function activoPropio(cambios: Record<string, unknown> = {}) {
  const base = structuredClone(DEMO) as Record<string, unknown> & {
    alcance: Record<string, unknown>;
  };
  base.id = "mi-asistente";
  base.origen = "propio";
  base.alcance.objetivos = ["http://127.0.0.1:8080"];
  base.alcance.vigente_hasta = "2026-12-31";
  return Activo.parse({ ...base, ...cambios });
}

function entrada(
  cambios: Partial<EntradaDeEjecucion> = {},
): EntradaDeEjecucion {
  return {
    activo: activoPropio(),
    origenDeLaCarpeta: "propio",
    plan: { paquete: PAQUETE, huellaDelActivoVigente: PAQUETE.activo.huella },
    fecha: "2026-11-10",
    objetivo: "http://127.0.0.1:8080",
    configuraciones: {
      promptfoo: "/u/p.yaml",
      garak: "/u/g.yaml",
      inspect: "/u/i.py",
    },
    soloEstas: [],
    tabla: TABLA,
    instaladas: {
      promptfoo: "/bin/promptfoo",
      zap: "/bin/zap-baseline.py",
      garak: "/bin/garak",
      inspect: "/bin/inspect",
    },
    conAdaptador: new Set(ADAPTADORES.map((a) => a.herramienta)),
    carpeta: "/tmp/c",
    ...cambios,
  };
}

const rechazadas = (x: EntradaDeEjecucion): Guarda[] => {
  const d = decidirEjecucion(x);
  return d.ok ? [] : d.rechazos.map((r) => r.guarda);
};
const omitidas = (x: EntradaDeEjecucion) => {
  const d = decidirEjecucion(x);
  if (!d.ok) throw new Error("rechazada");
  return d.omitidas.map((r) => `${r.herramienta}:${r.guarda}`);
};

describe("decidirEjecucion: el caso que sí corre", () => {
  it("con todo en regla devuelve una orden por herramienta lanzable, con el objetivo canónico y sin shell", () => {
    const d = decidirEjecucion(entrada());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.objetivo).toBe("http://127.0.0.1:8080");
    const por = Object.fromEntries(d.ordenes.map((o) => [o.herramienta, o]));
    expect(Object.keys(por).sort()).toEqual([
      "garak",
      "inspect",
      "promptfoo",
      "zap",
    ]);
    expect(por.promptfoo).toMatchObject({
      ejecutable: "/bin/promptfoo",
      argumentos: [
        "eval",
        "--config",
        "/u/p.yaml",
        "--output",
        "/tmp/c/resultado.json",
      ],
      salida: "resultado.json",
      entorno: { HACKGUARD_OBJETIVO: "http://127.0.0.1:8080" },
    });
    expect(por.zap!.argumentos).toEqual([
      "-t",
      "http://127.0.0.1:8080",
      "-J",
      "/tmp/c/informe.json",
    ]);
    // `hackguard-revision` no es de una herramienta: sale como omitida, jamás como orden.
    expect(d.omitidas.map((o) => o.herramienta)).toContain(
      "hackguard-revision",
    );
  });

  it("pasa el objetivo en su forma canónica, no como se escribió", () => {
    const d = decidirEjecucion(entrada({ objetivo: "http://127.1:8080/" }));
    expect(d.ok && d.objetivo).toBe("http://127.0.0.1:8080");
  });

  it("--herramienta limita a las pedidas y nombra la que no está en el paquete", () => {
    const d = decidirEjecucion(entrada({ soloEstas: ["zap", "nmap"] }));
    expect(d.ok && d.ordenes.map((o) => o.herramienta)).toEqual(["zap"]);
    expect(omitidas(entrada({ soloEstas: ["zap", "nmap"] }))).toContain(
      "nmap:herramienta_fuera_del_paquete",
    );
  });
});

describe("guardas del activo: una rechaza TODO, también en el ensayo", () => {
  it("1 · activo demo (por su origen)", () => {
    const demo = Activo.parse({ ...(structuredClone(DEMO) as object) });
    expect(rechazadas(entrada({ activo: demo }))).toContain("activo_demo");
  });
  it("1 · activo demo (por su carpeta, aunque diga «propio»)", () => {
    expect(rechazadas(entrada({ origenDeLaCarpeta: "demo" }))).toContain(
      "activo_demo",
    );
  });
  it("1 · origen que no cuadra con la carpeta, o carpeta desconocida", () => {
    expect(rechazadas(entrada({ origenDeLaCarpeta: null }))).toContain(
      "activo_demo",
    );
  });
  it("2 · sin alcance y reglas de enfrentamiento", () => {
    const sin = activoPropio({ alcance: null, reglas: null });
    expect(rechazadas(entrada({ activo: sin }))).toContain("sin_autorizacion");
  });
  it("3 · sin plan emitido", () => {
    expect(rechazadas(entrada({ plan: null }))).toEqual(["sin_plan"]);
  });
  it("3 · plan de una versión anterior del activo", () => {
    expect(
      rechazadas(
        entrada({ plan: { paquete: PAQUETE, huellaDelActivoVigente: "otra" } }),
      ),
    ).toEqual(["plan_desactualizado"]);
  });
  it("4 · sin vigente_hasta", () => {
    const a = activoPropio();
    delete (a.alcance as Record<string, unknown>).vigente_hasta;
    expect(rechazadas(entrada({ activo: a }))).toEqual(["sin_vigencia"]);
  });
  it("4 · autorización vencida (el último día todavía vale)", () => {
    expect(rechazadas(entrada({ fecha: "2027-01-01" }))).toEqual([
      "autorizacion_vencida",
    ]);
    expect(rechazadas(entrada({ fecha: "2026-12-31" }))).toEqual([]);
  });
  it("5 · sin objetivos autorizados en el alcance", () => {
    const a = activoPropio();
    delete (a.alcance as Record<string, unknown>).objetivos;
    expect(rechazadas(entrada({ activo: a }))).toEqual([
      "sin_objetivos_autorizados",
    ]);
  });
  it("5 · objetivo que no es una URL simple", () => {
    for (const o of [
      "127.0.0.1",
      "http://u:p@127.0.0.1:8080",
      "http://127.0.0.1:8080/?x=1",
      "ftp://127.0.0.1",
    ])
      expect(rechazadas(entrada({ objetivo: o }))).toEqual([
        "objetivo_invalido",
      ]);
  });
  it("5 · objetivo fuera de alcance, también el que solo se parece", () => {
    for (const o of [
      "http://127.0.0.1:9999",
      "http://127.0.0.2:8080",
      "https://127.0.0.1:8080",
      "http://127.0.0.1.evil.test:8080",
    ])
      expect(rechazadas(entrada({ objetivo: o }))).toEqual([
        "objetivo_fuera_de_alcance",
      ]);
  });
  it("6 · infraestructura de terceros, aunque el dueño la haya escrito en el alcance", () => {
    const a = activoPropio();
    a.alcance!.objetivos = ["https://api.openai.com"];
    expect(
      rechazadas(entrada({ activo: a, objetivo: "https://api.openai.com" })),
    ).toEqual(["infraestructura_de_terceros"]);
  });
  it("junta todas las guardas que fallan, en orden", () => {
    const g = rechazadas(
      entrada({
        plan: null,
        fecha: "2030-01-01",
        objetivo: "http://127.0.0.2",
      }),
    );
    expect(g).toEqual([
      "sin_plan",
      "autorizacion_vencida",
      "objetivo_fuera_de_alcance",
    ]);
  });
});

describe("guardas por herramienta: se omite la que no se puede, las demás siguen", () => {
  it("7 · sin adaptador", () => {
    expect(omitidas(entrada({ conAdaptador: new Set(["zap"]) }))).toEqual(
      expect.arrayContaining([
        "promptfoo:sin_adaptador",
        "garak:sin_adaptador",
      ]),
    );
  });
  it("8 · sin comando de lanzamiento (PyRIT)", () => {
    const x = entrada({
      tabla: { ...TABLA, herramientas: { ...TABLA.herramientas, zap: null } },
    });
    expect(omitidas(x)).toContain("zap:sin_comando");
  });
  it("9 · sin la configuración del usuario", () => {
    expect(omitidas(entrada({ configuraciones: {} }))).toEqual(
      expect.arrayContaining([
        "promptfoo:sin_configuracion",
        "garak:sin_configuracion",
      ]),
    );
  });
  it("10 · no instalada en el PATH", () => {
    expect(omitidas(entrada({ instaladas: { promptfoo: null } }))).toContain(
      "promptfoo:no_instalada",
    );
  });
  it("cada guarda del catálogo de guardas está probada en este archivo", () => {
    const fuente = readFileSync(import.meta.filename, "utf8");
    for (const g of GUARDAS) expect(fuente.includes(g), g).toBe(true);
  });
});
