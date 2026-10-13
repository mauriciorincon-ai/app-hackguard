// @vitest-environment node
// Toda página lleva su propio título (WCAG 2.4.2, S2-B3): quien navega con un lector de pantalla o con varias pestañas abiertas se
// orienta por él. Un export estático lleva UN título por página, así que dice los dos idiomas.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { titulo } from "../../src/lib/titulo.ts";
import { RAIZ } from "./propuestas/ayuda.ts";

const paginas = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? paginas(path.join(d, e.name))
      : e.name === "page.tsx"
        ? [path.join(d, e.name)]
        : [],
  );

describe("el título de cada página", () => {
  it("dice los dos idiomas, y con un elemento lo nombra primero", () => {
    expect(titulo("Brecha", "Gap").title).toBe("Brecha / Gap");
    expect(titulo("Hallazgo", "Finding", "HZ-0007").title).toBe(
      "HZ-0007 · Hallazgo / Finding",
    );
  });

  it("la plantilla del diseño raíz le pone el nombre de la app", () => {
    const layout = readFileSync(path.join(RAIZ, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/template:\s*"%s · HackGuard"/);
  });

  const todas = paginas(path.join(RAIZ, "src/app")).map((f) =>
    path.relative(path.join(RAIZ, "src/app"), f),
  );
  it("hay páginas que mirar", () => {
    expect(todas.length).toBeGreaterThanOrEqual(15);
  });
  for (const rel of todas.filter((r) => r !== "page.tsx"))
    it(`${rel} declara su título`, () => {
      const texto = readFileSync(path.join(RAIZ, "src/app", rel), "utf8");
      expect(texto).toMatch(
        /export const metadata = titulo\(|export async function generateMetadata\(/,
      );
    });
});
