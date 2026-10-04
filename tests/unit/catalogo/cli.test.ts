// @vitest-environment node
// El CLI corre como lo correrá una persona: un proceso de Node aparte, con el TypeScript nativo de Node,
// sobre el `datos/` del repo. Se prueban los códigos de salida, la escritura de la instantánea y el gate.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { RAIZ, SEMILLAS } from "./ayuda.ts";

function catalogo(...argumentos: string[]) {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "src/cli/catalogo.ts",
      ...argumentos,
    ],
    { cwd: RAIZ, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}

const temporal = mkdtempSync(path.join(tmpdir(), "hackguard-cli-"));
afterAll(() => rmSync(temporal, { recursive: true, force: true }));

describe("catalogo validar", () => {
  it("sobre el catálogo real sale 0, en español por defecto", () => {
    const r = catalogo("validar");
    expect(r.codigo).toBe(0);
    expect(r.salida.split("\n")[0]).toBe("Catálogo: ok");
    expect(r.errores).toBe("");
  });

  it("con --idioma en y con --json", () => {
    expect(catalogo("validar", "--idioma", "en").salida.split("\n")[0]).toBe(
      "Catalog: ok",
    );
    const json = JSON.parse(catalogo("validar", "--json").salida) as {
      estado: string;
      codigo_de_salida: number;
    };
    expect(json).toMatchObject({ estado: "ok", codigo_de_salida: 0 });
  });

  it("una semilla inválida sale 2 y una con advertencia sale 1", () => {
    expect(
      catalogo("validar", "--agregar", `${SEMILLAS}/SEMILLA-SIN-MARCO.json`)
        .codigo,
    ).toBe(2);
    expect(
      catalogo("validar", "--agregar", `${SEMILLAS}/SEMILLA-SIN-CONTROL.json`)
        .codigo,
    ).toBe(1);
  });

  it.each([
    [["validar", "--idioma", "fr"], "--idioma"],
    [["validar", "--agregar", "no-existe.json"], "--agregar no-existe.json"],
    [["validar", "sobra"], "sobra"],
    [["validar", "--opcion-que-no-existe"], "opcion-que-no-existe"],
    [["otro-comando"], "otro-comando"],
    [[], "uso:"],
  ])("un error de uso sale 3 y muestra el uso: %j", (argumentos, menciona) => {
    const r = catalogo(...argumentos);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain(menciona);
    expect(r.errores).toContain("usage:");
    expect(r.salida).toBe("");
  });
});

describe("catalogo instantanea", () => {
  it("sin --fecha, o con una fecha que no existe, sale 3: la fecha jamás sale del reloj", () => {
    expect(catalogo("instantanea", "--salida", temporal).codigo).toBe(3);
    expect(
      catalogo("instantanea", "--fecha", "2026-02-30", "--salida", temporal)
        .codigo,
    ).toBe(3);
    expect(readdirSync(temporal)).toEqual([]);
  });

  it("emite un archivo nombrado por su huella, y tres corridas dan la misma huella", () => {
    const huellas = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const r = catalogo(
        "instantanea",
        "--fecha",
        "2026-10-15",
        "--salida",
        temporal,
        "--json",
      );
      expect(r.codigo).toBe(0);
      const json = JSON.parse(r.salida) as { huella: string; archivo: string };
      huellas.add(json.huella);
      expect(json.archivo).toBe(
        `${temporal}/2026-10-15-${json.huella.slice(0, 12)}.json`,
      );
      const escrita = JSON.parse(readFileSync(json.archivo, "utf8")) as {
        huella: string;
      };
      expect(escrita.huella).toBe(json.huella);
    }
    expect(huellas.size).toBe(1);
    expect(readdirSync(temporal)).toHaveLength(1);
  });

  it("en texto dice dónde la escribió", () => {
    const r = catalogo(
      "instantanea",
      "--fecha",
      "2026-10-16",
      "--salida",
      temporal,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toMatch(
      /^Instantánea emitida: .*2026-10-16-[0-9a-f]{12}\.json\n/,
    );
  });

  it("con un catálogo inválido sale 2 y no escribe nada (gate de publicación)", () => {
    const destino = path.join(temporal, "bloqueada");
    const r = catalogo(
      "instantanea",
      "--fecha",
      "2026-10-15",
      "--salida",
      destino,
      "--agregar",
      `${SEMILLAS}/SEMILLA-SIN-MARCO.json`,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("No se escribió nada");
    expect(existsSync(destino)).toBe(false);
  });

  it("un archivo de datos ilegible es un error de lectura (3), no un catálogo inválido", () => {
    const r = catalogo("validar", "--agregar", "datos");
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("error de lectura / read error");
  });
});
