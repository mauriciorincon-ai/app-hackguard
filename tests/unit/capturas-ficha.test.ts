// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ESCALA,
  TOMAS,
  VENTANA,
  salidaPermitida,
} from "../../scripts/capturas-ficha.mjs";
import { RAIZ } from "./propuestas/ayuda.ts";

const exportado = JSON.parse(
  readFileSync(path.join(RAIZ, "docs/brochure-export.json"), "utf8"),
) as { funcionalidades: { grupos: { features: { id: string }[] }[] } };

describe("scripts/capturas-ficha.mjs (devolución 026, punto 5)", () => {
  it("tiene una toma por cada funcionalidad del export, ninguna de más", () => {
    const ids = exportado.funcionalidades.grupos.flatMap((g) =>
      g.features.map((f) => f.id),
    );
    expect(TOMAS.map((t: { f: string }) => t.f).sort()).toEqual(
      [...ids].sort(),
    );
  });

  it("cada toma se ancla por un texto y una ruta de la app, no por un selector frágil", () => {
    for (const t of TOMAS as { f: string; ruta: string; ancla: string }[]) {
      expect(t.ruta, t.f).toMatch(/^\//);
      expect(t.ancla.length, t.f).toBeGreaterThan(2);
    }
  });

  it("usa la ventana de 1024×640 a escala 1,5", () => {
    expect(VENTANA).toEqual({ width: 1024, height: 640 });
    expect(ESCALA).toBe(1.5);
  });

  it("la salida jamás cae dentro de datos/ (17-bis)", () => {
    expect(salidaPermitida(path.join(RAIZ, "datos", "privado", "x"))).toBe(
      false,
    );
    expect(salidaPermitida(path.join(RAIZ, "datos"))).toBe(false);
    expect(salidaPermitida(path.join(RAIZ, "docs", "ficha", "capturas"))).toBe(
      true,
    );
    expect(salidaPermitida("/tmp/capturas")).toBe(true);
  });
});
