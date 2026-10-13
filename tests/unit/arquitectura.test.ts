// @vitest-environment node
// La dirección de las dependencias entre carpetas del motor (auditoría S6, B14a): `lotes` se apoya en `evidencia`, nunca al revés. Un
// import en ambos sentidos es un ciclo en cuanto alguien cambie un `import type` por un valor.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./propuestas/ayuda.ts";

const importaDe = (carpeta: string, hacia: string): string[] =>
  readdirSync(path.join(RAIZ, "src/engine", carpeta))
    .filter((n) => n.endsWith(".ts"))
    .filter((n) =>
      new RegExp(`from "\\.\\./${hacia}/`).test(
        readFileSync(path.join(RAIZ, "src/engine", carpeta, n), "utf8"),
      ),
    );

describe("las carpetas del motor no se importan en círculo", () => {
  it("`evidencia` no importa de `lotes` (lotes se apoya en evidencia)", () => {
    expect(importaDe("evidencia", "lotes")).toEqual([]);
    expect(importaDe("lotes", "evidencia").length).toBeGreaterThan(0);
  });
});
