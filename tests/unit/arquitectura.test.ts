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

describe("ninguna prueba sube su propio timeout (S6-T1, S6-T2)", () => {
  // Un timeout explícito esconde una prueba lenta o una máquina cargada; se midió (full `pnpm test` con cobertura: la más lenta,
  // 1,0 s, contra los 5 s por omisión) y se quitó. Si una prueba necesita más, se arregla su causa y se declara aquí con su razón.
  const EXCEPCIONES: Record<string, string> = {
    // Genera la maqueta entera y lee todas sus páginas por cada una de las 53 fechas: la más lenta tarda 1,5 s (2026-10-13, `pnpm test`
    // completo con cobertura) y crece con la maqueta, no es un cuelgue. Si deja de ser así, se parte la prueba y esta línea sale.
    "tests/unit/maqueta-envejecimiento.test.ts": "recorre la maqueta por fecha",
  };
  const recorrer = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? recorrer(path.join(d, e.name))
        : /\.tsx?$/.test(e.name)
          ? [path.join(d, e.name)]
          : [],
    );
  const SUBE =
    /\btestTimeout\b|\bhookTimeout\b|\btimeout:\s*\d|^\s*\}\s*,\s*\d[\d_]{3,}\s*\)/m;
  it("ningún archivo de tests/unit declara un timeout propio", () => {
    const con = recorrer(path.join(RAIZ, "tests/unit"))
      .filter((f) => !f.endsWith("arquitectura.test.ts"))
      .filter((f) => SUBE.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(RAIZ, f))
      .filter((f) => EXCEPCIONES[f] === undefined);
    expect(con).toEqual([]);
  });
});

describe("la fila de cabeceras de una tabla vive en un solo sitio (S3-B2)", () => {
  const recorrer = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? recorrer(path.join(d, e.name))
        : e.name.endsWith(".tsx")
          ? [path.join(d, e.name)]
          : [],
    );
  it("ninguna pantalla define su propia `Cabeceras`", () => {
    const copias = recorrer(path.join(RAIZ, "src/components"))
      .filter((f) => !f.endsWith("cabeceras.tsx"))
      .filter((f) => /function Cabeceras\b/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(RAIZ, f));
    expect(copias).toEqual([]);
    expect(
      readFileSync(path.join(RAIZ, "src/components/cabeceras.tsx"), "utf8"),
    ).toMatch(/export function Cabeceras\b/);
  });
});

describe("un botón que despliega algo dice aria-expanded, no aria-pressed (S4-AP)", () => {
  const recorrer = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? recorrer(path.join(d, e.name))
        : /\.(tsx|mjs|css|js)$/.test(e.name)
          ? [path.join(d, e.name)]
          : [],
    );
  it("el botón que precede a un `.hg-revelado` lleva aria-expanded, en los componentes y en la maqueta", () => {
    const malos: string[] = [];
    for (const f of [
      ...recorrer(path.join(RAIZ, "src/components")),
      ...recorrer(path.join(RAIZ, "scripts/maqueta/paginas")),
    ]) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/class(?:Name)?="hg-revelado"/g)) {
        const antes = t.slice(0, m.index);
        const fin = antes.lastIndexOf("</button>");
        const inicio = antes.lastIndexOf("<button", fin);
        if (inicio < 0) continue;
        if (/aria-pressed[=:{]/.test(antes.slice(inicio, fin)))
          malos.push(path.relative(RAIZ, f));
      }
    }
    expect(malos).toEqual([]);
  });

  it("la hoja del sistema muestra el revelado con aria-expanded, no con aria-pressed", () => {
    const css = readFileSync(
      path.join(RAIZ, "docs/diseno/assets/app.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\[data-controlador="alternar"\]\[aria-expanded="true"\] \+ \.hg-revelado/,
    );
    expect(css).not.toMatch(/\[aria-pressed="true"\] \+ \.hg-revelado/);
  });
});
