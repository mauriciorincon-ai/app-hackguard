// @vitest-environment node
// Lo que dejó la auditoría del S8 como robustez (lote L4): una fuente colgada no cuelga la búsqueda, una corrida ilegible se reporta y no
// detiene la carga, `validar` en un clon sin las lecturas dice lo que no pudo hacer en vez de fallar, y los identificadores se comparan
// sin acentos.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import {
  buscar,
  TIEMPO_MAXIMO_DE_PETICION_MS,
  type Peticion,
} from "../../../src/lib/propuestas/buscar.ts";
import { cargarCorridas } from "../../../src/lib/propuestas/cargar.ts";
import { RAIZ } from "./ayuda.ts";

const temporales: string[] = [];
const carpeta = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-robustez-"));
  temporales.push(d);
  return d;
};
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

const instantanea = {
  catalogo: {
    marcos: [
      {
        id: "uno",
        nombre: "Marco uno",
        familias_aplicables: ["agente"],
        lista_blanca_de_fuentes: ["uno.test"],
        vias_de_acceso: [{ url: "https://uno.test/a" }],
      },
    ],
  },
} as unknown as Instantanea;
const OPCIONES = {
  fecha: "2026-10-12",
  corrida: "INV-2026-10-12-01",
  alcance: { es: "prueba", en: "test" },
};
const respuesta = (cuerpo: () => Promise<string>, largo?: string) => ({
  status: 200,
  headers: {
    get: (n: string) =>
      n === "content-type"
        ? "text/plain"
        : n === "content-length"
          ? (largo ?? null)
          : null,
  },
  text: cuerpo,
});
/** Una promesa que se cuelga hasta que la señal de la petición se aborta (como un servidor que no contesta). */
const colgada = (senal: AbortSignal) =>
  new Promise<never>((_, rechazar) =>
    senal.addEventListener("abort", () => rechazar(new Error("abortada"))),
  );

describe("la búsqueda no se cuelga ni lee de más (auditoría S8, F6)", () => {
  it("cada petición lleva una señal con tope de tiempo", async () => {
    let senal: AbortSignal | undefined;
    const peticion: Peticion = async (_url, init) => {
      senal = init.signal;
      return respuesta(async () => "hola");
    };
    await buscar(instantanea, OPCIONES, peticion, carpeta());
    expect(senal).toBeInstanceOf(AbortSignal);
    expect(TIEMPO_MAXIMO_DE_PETICION_MS).toBeGreaterThan(0);
  });
  it("una fuente que nunca contesta vence y queda «sin_red», sin colgar la búsqueda", async () => {
    const peticion: Peticion = (_url, init) => colgada(init.signal);
    const c = await buscar(
      instantanea,
      { ...OPCIONES, tiempoMaximoMs: 30 },
      peticion,
      carpeta(),
    );
    expect(c.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "sin_red",
    });
  });
  it("un cuerpo que se cuelga después de las cabeceras también vence", async () => {
    const peticion: Peticion = async (_url, init) =>
      respuesta(() => colgada(init.signal));
    const c = await buscar(
      instantanea,
      { ...OPCIONES, tiempoMaximoMs: 30 },
      peticion,
      carpeta(),
    );
    expect(c.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "sin_red",
    });
  });
  it("una página que declara más de 5 MB no se baja", async () => {
    let bajada = false;
    const peticion: Peticion = async () =>
      respuesta(async () => {
        bajada = true;
        return "x";
      }, "6000000");
    const c = await buscar(instantanea, OPCIONES, peticion, carpeta());
    expect(bajada).toBe(false);
    expect(c.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "http_otro",
    });
  });
});

describe("una corrida ilegible se reporta y las demás siguen (auditoría S8, F7)", () => {
  it("un corrida.json que no es JSON va a «problemas» y no detiene la carga", async () => {
    const raiz = carpeta();
    cpSync(
      path.join(RAIZ, "propuestas/demo"),
      path.join(raiz, "propuestas/demo"),
      { recursive: true },
    );
    const rota = path.join(raiz, "propuestas/corridas/INV-2026-10-12-09");
    mkdirSync(rota, { recursive: true });
    writeFileSync(path.join(rota, "corrida.json"), "{ esto no es json");
    const { corridas, problemas } = await cargarCorridas(raiz);
    expect(corridas.length).toBe(2);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]!.detalle).toContain("no es un JSON válido");
    expect(problemas[0]!.ruta).toContain("INV-2026-10-12-09");
  });
});

/** Una raíz de juguete con los datos, la demo y UNA corrida real, sin `propuestas/.lecturas/` (como un clon limpio). */
function clonLimpio() {
  const raiz = carpeta();
  cpSync(path.join(RAIZ, "datos"), path.join(raiz, "datos"), {
    recursive: true,
    filter: (o) =>
      !path.relative(RAIZ, o).startsWith(path.join("datos", "privado")),
  });
  for (const rel of [
    "propuestas/demo",
    "propuestas/corridas",
    "docs/kit-de-prueba/propuestas-demo",
    "docs/kit-de-prueba/textos-pegados",
  ])
    cpSync(path.join(RAIZ, rel), path.join(raiz, rel), { recursive: true });
  return raiz;
}
const validar = (raiz: string) => {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/propuestas.ts"),
      "validar",
    ],
    { cwd: raiz, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout };
};

describe("`validar` en un clon limpio (auditoría S8, F8)", () => {
  it("sin las lecturas de una corrida real dice que no pudo sellar otra vez, y no falla", () => {
    const r = validar(clonLimpio());
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("no se pudo sellar otra vez aquí");
    expect(r.salida).toContain("INV-2026-10-12-01");
    expect(r.salida).toContain("EXT-2026-10-12-01");
  });
  it("un borrador roto NO se traga: se nombra y sale con error", () => {
    const raiz = clonLimpio();
    writeFileSync(
      path.join(raiz, "propuestas/demo/INV-2026-10-02-01/propuesta.json"),
      "{ roto",
    );
    const r = validar(raiz);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain("INV-2026-10-02-01");
    expect(r.salida).toContain("no se pudo sellar otra vez el borrador");
  });
});

describe("los identificadores se comparan sin acentos (auditoría S8, F9)", () => {
  const hook = path.join(
    RAIZ,
    "scripts/propuestas/hooks/sin-identificadores.mjs",
  );
  const correr = (identificador: string, comando: string) =>
    spawnSync(process.execPath, [hook, "--investigador"], {
      input: JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: comando },
      }),
      env: {
        PATH: process.env.PATH ?? "",
        HACKGUARD_IDENTIFICADORES: identificador,
      } as unknown as NodeJS.ProcessEnv,
      encoding: "utf8",
    }).status;
  it("«Rincón» en el dato bloquea «rincon» en el comando, y al revés", () => {
    expect(correr("Rincón", "echo rincon")).toBe(2);
    expect(correr("rincon", "echo RINCÓN")).toBe(2);
    expect(correr("Rincón", "echo Rincón")).toBe(2);
  });
  it("un comando sin el identificador pasa", () => {
    expect(
      correr(
        "Rincón",
        "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01",
      ),
    ).toBe(0);
  });
});
