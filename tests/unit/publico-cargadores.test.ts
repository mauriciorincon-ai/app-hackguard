// @vitest-environment node
// C19 · lo que de verdad impide que un dato real llegue al export público no es el barrido (que deja pasar un id que coincide con un
// demo), sino que ninguna pantalla carga `datos/privado/`. Este test lo fija leyendo el código: `cargarPlanesEmitidos` tiene
// `privados = true` por defecto (lo usa la CLI), así que toda pantalla que lo llame, o llame al libro, debe decir `privados: false`.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

function archivos(dir: string): string[] {
  return readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return /\.(?:ts|tsx)$/.test(e.name) ? [ruta] : [];
  });
}
/** El código sin comentarios: un comentario que nombra `privados: true` no es una llamada. */
const leer = (ruta: string) =>
  readFileSync(join(RAIZ, ruta), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Lo que una pantalla pública puede ejecutar: las páginas, los componentes y las bibliotecas de carga (la CLI no entra aquí). */
const SUPERFICIE_DE_PANTALLAS = [
  ...archivos("src/app"),
  ...archivos("src/components"),
  ...archivos("src/lib"),
];
/** La única excepción: aplicar una propuesta es un comando de la CLI que una persona confirma (se lee con `privados: true`). */
const SOLO_CLI = new Set(["src/lib/propuestas/aplicar.ts"]);

describe("ninguna pantalla pública carga datos privados", () => {
  it("hay superficie que revisar", () => {
    expect(SUPERFICIE_DE_PANTALLAS.length).toBeGreaterThan(100);
  });

  it("nada de src/app, src/components ni src/lib pasa `privados: true` (salvo el comando de aplicar)", () => {
    const culpables = SUPERFICIE_DE_PANTALLAS.filter(
      (f) => !SOLO_CLI.has(f) && /privados:\s*true/.test(leer(f)),
    );
    expect(culpables).toEqual([]);
  });

  it("toda llamada a los cargadores de planes y del libro en src/app dice `privados: false`", () => {
    const llamadas: string[] = [];
    for (const f of archivos("src/app")) {
      const t = leer(f);
      for (const m of t.matchAll(
        /\b(cargarPlanesEmitidos|cargarLibroValidado)\s*\(([^)]*)\)/g,
      ))
        if (!/privados:\s*false/.test(m[2]!)) llamadas.push(`${f}: ${m[1]}`);
    }
    expect(llamadas).toEqual([]);
  });

  it("el cargador de hallazgos de las pantallas dice `privados: false` y el de activos no lo pone en true", () => {
    expect(leer("src/lib/evidencia/cargar.ts")).toMatch(/privados:\s*false/);
    expect(leer("src/lib/activos/cargar.ts")).toMatch(/privados\s*=\s*false/);
  });

  it("la CLI es la única que lee `privados: true` fuera de aplicar.ts (el contraste existe)", () => {
    const cli = archivos("src/cli").filter((f) =>
      /privados:\s*true/.test(leer(f)),
    );
    expect(cli.length).toBeGreaterThan(0);
    for (const f of cli)
      expect(relative("src", f).startsWith("cli")).toBe(true);
  });
});
