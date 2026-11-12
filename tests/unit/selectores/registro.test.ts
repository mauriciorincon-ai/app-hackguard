// @vitest-environment node
// Decisión 9 del S12 (ADR-002, decisión 6 · regla 10): la unión de selectores se arma desde el registro, cada adaptador trae el
// suyo y el esquema del catálogo no los declara. Sin ciclo de imports y con la huella oficial intacta.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADAPTADORES } from "../../../src/engine/adaptadores/index.ts";
import { Herramienta } from "../../../src/engine/catalogo/esquemas.ts";
import {
  Selector,
  TIPOS_DE_SELECTOR,
} from "../../../src/engine/selectores/registro.ts";
import { RAIZ } from "../propuestas/ayuda.ts";

const leer = (r: string) => readFileSync(path.join(RAIZ, r), "utf8");
const json = (r: string) => JSON.parse(leer(r)) as Record<string, unknown>;

const SELECTORES_DE_ADAPTADOR = readdirSync(
  path.join(RAIZ, "src/engine/adaptadores"),
  { withFileTypes: true },
)
  .filter((e) => e.isDirectory())
  .map((e) => `src/engine/adaptadores/${e.name}/selector.ts`);

describe("el registro de selectores", () => {
  it("conoce las cuatro formas, en el orden del registro", () => {
    expect([...TIPOS_DE_SELECTOR]).toEqual([
      "garak",
      "zap",
      "modulo",
      "revision",
    ]);
    expect(Selector.options.map((o) => o.shape.tipo.value)).toEqual([
      ...TIPOS_DE_SELECTOR,
    ]);
  });

  it("valida cada forma y rechaza una que ningún selector declara", () => {
    const buenos = [
      {
        tipo: "garak",
        probes: ["a.B"],
        detectores: ["d.D"],
        agregacion: "cualquier_detector",
      },
      { tipo: "zap", pluginids: [40012], agregacion: "todas_las_reglas" },
      { tipo: "modulo", referencia: "owasp:llm01" },
      { tipo: "revision", que_se_revisa: { es: "algo", en: "something" } },
    ];
    for (const b of buenos) expect(Selector.safeParse(b).success).toBe(true);
    expect(Selector.safeParse({ tipo: "inspect", tarea: "x" }).success).toBe(
      false,
    );
    expect(
      Selector.safeParse({ tipo: "zap", pluginids: [], agregacion: "x" })
        .success,
    ).toBe(false);
  });

  it("el esquema del catálogo usa la unión del registro y no declara ninguna forma", () => {
    const esquemas = leer("src/engine/catalogo/esquemas.ts");
    expect(esquemas).toMatch(/from "\.\.\/selectores\/registro\.ts"/);
    expect(esquemas).not.toMatch(/z\.literal\("(garak|zap|modulo|revision)"\)/);
    // Una herramienta solo puede declarar un tipo del registro; una prueba, un selector del registro.
    const h = json("datos/herramientas/zap.json");
    expect(Herramienta.shape.selector.safeParse(h.selector).success).toBe(true);
    expect(Herramienta.shape.selector.safeParse("inspect").success).toBe(false);
    expect(esquemas).toMatch(/selector: Selector,/);
  });

  it("cada herramienta del catálogo con adaptador declara un tipo que el registro conoce", () => {
    for (const a of ADAPTADORES) {
      const h = json(`datos/herramientas/${a.herramienta}.json`);
      expect(TIPOS_DE_SELECTOR as readonly string[]).toContain(h.selector);
    }
  });

  it("ni el registro, ni los manuales, ni un selector de adaptador importan esquemas.ts (no hay ciclo)", () => {
    const archivos = [
      "src/engine/selectores/registro.ts",
      "src/engine/selectores/manuales.ts",
      "src/engine/selectores/primitivas.ts",
      ...SELECTORES_DE_ADAPTADOR,
    ];
    expect(SELECTORES_DE_ADAPTADOR.length).toBeGreaterThanOrEqual(2);
    for (const f of archivos)
      expect(leer(f), f).not.toMatch(/from "[^"]*catalogo\/esquemas/);
  });
});

describe("la huella oficial no cambia con el traslado", () => {
  it("la instantánea oficial conserva su huella (d352e6af…) y su nombre", () => {
    const nombres = readdirSync(path.join(RAIZ, "datos/instantaneas")).filter(
      (n) => n.endsWith(".json"),
    );
    expect(nombres).toEqual(["2026-10-05-d352e6afadfb.json"]);
    expect(
      (
        json("datos/instantaneas/2026-10-05-d352e6afadfb.json").huella as string
      ).slice(0, 12),
    ).toBe("d352e6afadfb");
  });
});
