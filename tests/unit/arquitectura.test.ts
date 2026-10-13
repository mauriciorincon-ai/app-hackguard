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

describe("lo que marca la opción actual de una lista de páginas (S5-9)", () => {
  const recorrer = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? recorrer(path.join(d, e.name))
        : e.name.endsWith(".tsx")
          ? [path.join(d, e.name)]
          : [],
    );
  it('un selector de páginas dice aria-current="page"; solo la barra lateral usa "true" (una sección que contiene subpáginas)', () => {
    const malos = recorrer(path.join(RAIZ, "src/components"))
      .filter((f) => !f.endsWith(path.join("consola", "barra-lateral.tsx")))
      .filter((f) => /aria-current=\{[^}]*"true"/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(RAIZ, f));
    expect(malos).toEqual([]);
  });
});
