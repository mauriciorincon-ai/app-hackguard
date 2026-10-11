// @vitest-environment node
// El CLI corre como lo correrá una persona: un proceso de Node aparte, con el TypeScript nativo de Node,
// sobre el `datos/` del repo. Se prueban los códigos de salida, la escritura de la instantánea y el gate.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import { RAIZ, SEMILLAS, ULTIMA_VERIFICACION } from "./ayuda.ts";

// Fechas relativas a la última verificación de `datos/`, no al calendario: re-verificar una entidad no rompe
// estas pruebas.
const FECHA = fechaMasDias(ULTIMA_VERIFICACION, 11);
const OTRA_FECHA = fechaMasDias(ULTIMA_VERIFICACION, 12);
const ANTERIOR = fechaMasDias(ULTIMA_VERIFICACION, -1);

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
  it("sobre el catálogo real sale 1 (con advertencias: las pruebas de software sin control), en español por defecto", () => {
    const r = catalogo("validar");
    expect(r.codigo).toBe(1);
    expect(r.salida.split("\n")[0]).toBe("Catálogo: con advertencias");
    expect(r.errores).toBe("");
  });

  it("con --idioma en y con --json", () => {
    expect(catalogo("validar", "--idioma", "en").salida.split("\n")[0]).toBe(
      "Catalog: with warnings",
    );
    const json = JSON.parse(catalogo("validar", "--json").salida) as {
      estado: string;
      codigo_de_salida: number;
    };
    expect(json).toMatchObject({
      estado: "con_advertencias",
      codigo_de_salida: 1,
    });
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
    [
      ["validar", "--agregar", "no-existe.json"],
      "--agregar: no existe no-existe.json / does not exist: no-existe.json",
    ],
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

  it("una fecha anterior a la última verificación del catálogo es un error de uso (3)", () => {
    const r = catalogo(
      "instantanea",
      "--fecha",
      ANTERIOR,
      "--salida",
      temporal,
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain(
      `la fecha de evaluación ${ANTERIOR} es anterior a la última verificación del catálogo (${ULTIMA_VERIFICACION})`,
    );
    expect(readdirSync(temporal)).toEqual([]);
  });

  it("emite un archivo nombrado por su huella, y tres corridas dan la misma huella", () => {
    const huellas = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const r = catalogo(
        "instantanea",
        "--fecha",
        FECHA,
        "--salida",
        temporal,
        "--json",
      );
      expect(r.codigo).toBe(0);
      const json = JSON.parse(r.salida) as { huella: string; archivo: string };
      huellas.add(json.huella);
      expect(json.archivo).toBe(
        `${temporal}/${FECHA}-${json.huella.slice(0, 12)}.json`,
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
      OTRA_FECHA,
      "--salida",
      temporal,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toMatch(
      new RegExp(`^Instantánea emitida: .*${OTRA_FECHA}-[0-9a-f]{12}\\.json\\n`),
    );
  });

  it("con un catálogo inválido sale 2 y no escribe nada (gate de publicación)", () => {
    const destino = path.join(temporal, "bloqueada");
    const r = catalogo(
      "instantanea",
      "--fecha",
      FECHA,
      "--salida",
      destino,
      "--agregar",
      `${SEMILLAS}/SEMILLA-SIN-MARCO.json`,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("No se escribió nada");
    expect(existsSync(destino)).toBe(false);
  });

  it("con --agregar, sin --salida o con --salida dentro de datos/, sale 3 y no escribe en datos/instantaneas", () => {
    const antes = readdirSync(path.join(RAIZ, "datos/instantaneas")).sort();
    for (const salida of [[], ["--salida", "datos/instantaneas"], ["--salida", "datos/otra"]]) {
      const r = catalogo(
        "instantanea",
        "--fecha",
        FECHA,
        ...salida,
        "--agregar",
        `${SEMILLAS}/SEMILLA-REFERENCIA.json`,
      );
      expect(r.codigo, salida.join(" ")).toBe(3);
      expect(r.errores).toContain("exige --salida fuera de datos/");
    }
    expect(readdirSync(path.join(RAIZ, "datos/instantaneas")).sort()).toEqual(antes);
    expect(existsSync(path.join(RAIZ, "datos/otra"))).toBe(false);
  });

  it("una prueba agregada desde fuera del repo entra como agregado/<nombre>, sin la ruta de la máquina", () => {
    const fuera = path.join(temporal, "fuera");
    mkdirSync(fuera);
    const copia = path.join(fuera, "SEMILLA-SIN-CONTROL.json");
    copyFileSync(path.join(RAIZ, SEMILLAS, "SEMILLA-SIN-CONTROL.json"), copia);
    const destino = path.join(temporal, "agregada");
    const r = catalogo(
      "instantanea",
      "--fecha",
      FECHA,
      "--salida",
      destino,
      "--agregar",
      copia,
      "--json",
    );
    expect(r.codigo).toBe(0);
    const { archivo } = JSON.parse(r.salida) as { archivo: string };
    const escrita = readFileSync(archivo, "utf8");
    expect(escrita).toContain('"ruta": "agregado/SEMILLA-SIN-CONTROL.json"');
    // Lo agregado puede venir de datos/privado/: la instantánea nace solo legible por su dueño (regla 17-bis a).
    expect(statSync(archivo).mode & 0o777).toBe(0o600);
    expect(escrita).not.toContain(fuera);
    expect(escrita).not.toContain('"ruta": "../');
  });

  it("un archivo de datos ilegible es un error de lectura (3), no un catálogo inválido", () => {
    const r = catalogo("validar", "--agregar", "datos");
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("error de lectura / read error");
  });
});
