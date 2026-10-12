// @vitest-environment node
// El gate de las fixtures de los adaptadores (reglas duras 3 y 4): ninguna carga de ataque entra al repo. La de garak
// sale de una corrida local y se redacta antes del commit; el manifiesto dice de dónde sale cada una y lleva la huella de
// lo versionado. Si alguien reintroduce un texto de ataque en una fixture, o edita una sin actualizar el manifiesto,
// este gate falla.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filtrar } from "../../../src/engine/catalogo/filtro.ts";
import { sha256 } from "../../../src/engine/huella.ts";
import { cargarPatrones } from "../../../src/lib/activos/cargar-activos.ts";
import {
  MARCADOR_DE_DISPARADOR,
  MARCADOR_DE_PROBE,
  MARCADOR_DE_SALIDA,
  redactarGarak,
} from "../../../scripts/adaptadores/redactar-garak.mjs";
import { RAIZ } from "../evidencia/ayuda.ts";

const CARPETA = path.join(RAIZ, "tests/fixtures/adaptadores");
const MANIFIESTO = JSON.parse(
  readFileSync(path.join(CARPETA, "MANIFIESTO.json"), "utf8"),
) as {
  fixtures: {
    archivo: string;
    derivada: boolean;
    origen: string;
    licencia: string;
    redaccion: string;
    huella: string;
    huella_del_crudo?: string;
  }[];
};
const GARAK = "garak-0.17.0.report.redactado.jsonl";
const leer = (n: string) => readFileSync(path.join(CARPETA, n), "utf8");

describe("el manifiesto de fixtures", () => {
  it("lista cada archivo de la carpeta, y solo esos", () => {
    const enDisco = readdirSync(CARPETA)
      .filter((n) => n !== "MANIFIESTO.json")
      .sort();
    expect(MANIFIESTO.fixtures.map((f) => f.archivo).sort()).toEqual(enDisco);
  });
  it("lleva la huella de cada archivo: editar una fixture sin actualizar el manifiesto lo rompe", async () => {
    for (const f of MANIFIESTO.fixtures)
      expect(await sha256(leer(f.archivo)), f.archivo).toBe(f.huella);
  });
  it("declara origen, licencia y qué se redactó; las derivadas se dicen derivadas", () => {
    for (const f of MANIFIESTO.fixtures) {
      expect(f.origen.length, f.archivo).toBeGreaterThan(20);
      expect(f.licencia.length, f.archivo).toBeGreaterThan(5);
      expect(f.redaccion.length, f.archivo).toBeGreaterThan(10);
    }
    expect(
      MANIFIESTO.fixtures
        .filter((f) => f.derivada)
        .map((f) => f.archivo)
        .sort(),
    ).toEqual([
      "zap-traditional-json-plus.derivada.json",
      "zap-traditional-json.derivada.json",
    ]);
    // La de garak es una corrida local: su crudo (que ya no existe) deja solo su huella.
    expect(
      MANIFIESTO.fixtures.find((f) => f.archivo === GARAK)?.huella_del_crudo,
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});

// Regla 1: un `any` con su razón. Son líneas JSON de garak que la prueba recorre sin darles un tipo por campo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

describe("la fixture de garak está redactada", () => {
  const lineas = leer(GARAK)
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, Json>);

  it("todo texto de probe, de salida y todo disparador es un marcador; la estructura sigue", () => {
    const intentos = lineas.filter((l) => l.entry_type === "attempt");
    expect(intentos.length).toBeGreaterThan(20);
    const textos = (c: Json): string[] =>
      (c?.turns ?? [])
        .map((t: Json) => t.content?.text)
        .filter((x: unknown) => x !== null && x !== undefined);
    for (const a of intentos) {
      for (const t of textos(a.prompt)) expect(t).toBe(MARCADOR_DE_PROBE);
      for (const o of a.outputs) expect(o.text).toBe(MARCADOR_DE_SALIDA);
      for (const c of a.conversations)
        for (const turno of c.turns)
          expect(turno.content.text).toBe(
            turno.role === "assistant" ? MARCADOR_DE_SALIDA : MARCADOR_DE_PROBE,
          );
      for (const t of a.notes?.triggers ?? [])
        expect(t).toBe(MARCADOR_DE_DISPARADOR);
    }
  });
  it("no queda ninguna ruta del equipo", () => {
    const todo = leer(GARAK);
    expect(todo).not.toMatch(/\/Users\/|\/home\/|\/private\/var|C:\\\\/);
    expect(todo).toContain("<fixture>");
  });
  it("conserva lo que el adaptador lee: 9 tipos de línea, intentos en dos estados y un eval por probe y detector", () => {
    const tipos = new Set(lineas.map((l) => l.entry_type));
    for (const t of [
      "init",
      "attempt",
      "eval",
      "digest",
      "plugin_cache",
      "completion",
    ])
      expect(tipos.has(t), t).toBe(true);
    expect(
      new Set(
        lineas.filter((l) => l.entry_type === "attempt").map((l) => l.status),
      ),
    ).toEqual(new Set([1, 2]));
    expect(
      lineas.filter((l) => l.entry_type === "eval").length,
    ).toBeGreaterThanOrEqual(8);
  });
});

describe("el redactor", () => {
  const ATAQUE = "TEXTO-DE-ATAQUE-QUE-NO-DEBE-QUEDAR";
  const intento = (extra: object = {}) =>
    JSON.stringify({
      entry_type: "attempt",
      status: 2,
      prompt: { turns: [{ role: "user", content: { text: ATAQUE } }] },
      outputs: [{ text: ATAQUE }],
      conversations: [
        {
          turns: [
            { role: "user", content: { text: ATAQUE } },
            { role: "assistant", content: { text: ATAQUE } },
          ],
        },
      ],
      reverse_translation_outputs: [{ text: ATAQUE }],
      notes: { triggers: [ATAQUE] },
      ...extra,
    });

  it("reemplaza cada texto por su marcador y no deja fugas", () => {
    const r = redactarGarak(`${intento()}\n`);
    expect(r.fugas).toEqual([]);
    expect(r.texto).not.toContain(ATAQUE);
    expect(r.texto).toContain(MARCADOR_DE_PROBE);
    expect(r.texto).toContain(MARCADOR_DE_SALIDA);
    expect(r.texto).toContain(MARCADOR_DE_DISPARADOR);
  });
  it("si un texto de ataque se repite en un campo que el redactor no conoce, lo reporta como fuga", () => {
    const r = redactarGarak(`${intento({ goal: ATAQUE })}\n`);
    expect(r.fugas).toEqual([ATAQUE]);
  });
  it("cambia las rutas dadas y cualquier /Users/<quien>", () => {
    const l = JSON.stringify({
      entry_type: "init",
      ruta: "/Users/ana/proyecto/venv/x",
      otra: "/mi/entorno/y",
    });
    const r = redactarGarak(`${l}\n`, [["/mi/entorno", "<fixture>"]]);
    expect(r.texto).toContain("<home>/proyecto/venv/x");
    expect(r.texto).toContain("<fixture>/y");
    expect(r.texto).not.toContain("ana");
  });
  it("es determinista", () => {
    expect(redactarGarak(`${intento()}\n`).texto).toBe(
      redactarGarak(`${intento()}\n`).texto,
    );
  });
});

describe("el filtro de contenido del catálogo no marca nada en las fixtures", () => {
  it("ni en la de garak ni en las de ZAP", () => {
    const patrones = cargarPatrones(RAIZ);
    expect(patrones.length).toBeGreaterThan(0);
    for (const f of MANIFIESTO.fixtures) {
      const valor = f.archivo.endsWith(".jsonl")
        ? leer(f.archivo)
            .split("\n")
            .filter(Boolean)
            .map((l) => JSON.parse(l) as unknown)
        : (JSON.parse(leer(f.archivo)) as unknown);
      expect(filtrar(valor, patrones), f.archivo).toEqual([]);
    }
  });
});
