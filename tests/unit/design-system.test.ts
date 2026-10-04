// design-system.md declara los tokens de color en una tabla; los tokens reales se generan desde
// scripts/paleta/. Este gate impide que el documento diga un color y la app pinte otro.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const documento = readFileSync("design-system.md", "utf8");
const tokens: Record<"oscuro" | "claro", Record<string, string>> = JSON.parse(
  readFileSync("docs/diseno/assets/tokens.json", "utf8"),
);

const filas = new Map(
  [...documento.matchAll(/^\| `--([a-z0-9-]+)` \| `(#[0-9a-f]{6})` \| `(#[0-9a-f]{6})` \|/gm)].map((m) => [m[1], [m[2], m[3]]]),
);

describe("design-system.md dice los mismos colores que los tokens generados", () => {
  it("la tabla lista exactamente los tokens que existen", () => {
    expect([...filas.keys()].sort()).toEqual(Object.keys(tokens.oscuro).sort());
  });

  it.each(Object.keys(tokens.oscuro))("--%s", (nombre) => {
    expect(filas.get(nombre)).toEqual([tokens.oscuro[nombre], tokens.claro[nombre]]);
  });
});
