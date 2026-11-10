// @vitest-environment node
// El reparto de la constitución (S12): CLAUDE.md quedó con lo que rige siempre y el resto vive en `.claude/rules/<área>.md` con `paths:`.
// Palanca de tokens: el contexto de cada sesión carga solo lo que rige siempre. El gate: ninguna regla numerada se pierde ni se repite,
// cada archivo de reglas declara dónde carga, y CLAUDE.md no vuelve a crecer por encima de su techo.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./catalogo/ayuda.ts";

/** Techo de CLAUDE.md en caracteres (la orden del S12: ≤ 15 000; antes 28 686). */
const TECHO_CLAUDE_MD = 15_000;

/** Las reglas duras de producto (1–12) y las del kit (1–29 y 17-bis) que el reparto debe conservar, una vez cada una. */
const REGLAS_DE_PRODUCTO = Array.from({ length: 12 }, (_, i) => String(i + 1));
const REGLAS_DEL_KIT = [
  ...Array.from({ length: 29 }, (_, i) => String(i + 1)),
  "17-bis",
];

interface Archivo {
  nombre: string;
  texto: string;
}

function leerArchivos(raiz: string): Archivo[] {
  const carpeta = join(raiz, ".claude", "rules");
  const reglas = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      nombre: `.claude/rules/${f}`,
      texto: readFileSync(join(carpeta, f), "utf8"),
    }));
  return [
    {
      nombre: "CLAUDE.md",
      texto: readFileSync(join(raiz, "CLAUDE.md"), "utf8"),
    },
    ...reglas,
  ];
}

/**
 * En qué archivos aparece cada regla numerada. Una regla de producto abre su línea con «N. **Título**» y una del kit con
 * «N. `[frecuencia]`»: así las dos numeraciones, que se pisan entre 1 y 12, no se confunden.
 */
export function ubicarReglas(archivos: Archivo[]): {
  producto: Map<string, string[]>;
  kit: Map<string, string[]>;
} {
  const producto = new Map<string, string[]>();
  const kit = new Map<string, string[]>();
  for (const { nombre, texto } of archivos) {
    // Los pasos del workflow también se numeran «N. **Título**»: una regla de producto cuenta solo bajo un encabezado «Regla(s) dura(s)».
    let bajoReglasDuras = false;
    for (const linea of texto.split("\n")) {
      if (linea.startsWith("#"))
        bajoReglasDuras = /^##\s+Reglas? duras?/.test(linea);
      const p = bajoReglasDuras ? /^(\d+)\. \*\*[^`]/.exec(linea) : null;
      if (p) producto.set(p[1]!, [...(producto.get(p[1]!) ?? []), nombre]);
      const k = /^(\d+(?:-bis)?)\. `\[(?:siempre|sprint|hito|cambio)\]`/.exec(
        linea,
      );
      if (k) kit.set(k[1]!, [...(kit.get(k[1]!) ?? []), nombre]);
    }
  }
  return { producto, kit };
}

/** Los `paths:` del frontmatter de un archivo de reglas; vacío si no tiene o si el frontmatter no cierra. */
export function rutasDeCarga(texto: string): string[] {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(texto);
  if (!m) return [];
  const bloque = /^paths:\n((?:\s+- .+\n?)+)/m.exec(m[1]! + "\n");
  if (!bloque) return [];
  return [...bloque[1]!.matchAll(/^\s+- "?([^"\n]+)"?\s*$/gm)].map(
    (x) => x[1]!,
  );
}

describe("el reparto de la constitución por carpeta (S12)", () => {
  const archivos = leerArchivos(RAIZ);
  const { producto, kit } = ubicarReglas(archivos);

  it("cada regla dura de producto (1–12) vive en un solo archivo", () => {
    for (const id of REGLAS_DE_PRODUCTO) {
      expect(producto.get(id), `regla de producto ${id}`).toHaveLength(1);
    }
    expect([...producto.keys()].sort()).toEqual([...REGLAS_DE_PRODUCTO].sort());
  });

  it("cada regla del kit (1–29 y 17-bis) vive en un solo archivo", () => {
    for (const id of REGLAS_DEL_KIT) {
      expect(kit.get(id), `regla del kit ${id}`).toHaveLength(1);
    }
    expect([...kit.keys()].sort()).toEqual([...REGLAS_DEL_KIT].sort());
  });

  it("cada archivo de reglas declara `paths:` no vacío, y ninguno carga sin ruta", () => {
    const reglas = archivos.filter((a) =>
      a.nombre.startsWith(".claude/rules/"),
    );
    expect(reglas.length).toBeGreaterThanOrEqual(6);
    for (const a of reglas) {
      expect(rutasDeCarga(a.texto), a.nombre).not.toHaveLength(0);
    }
  });

  it("CLAUDE.md respeta su techo y conserva sus anclas", () => {
    const claude = archivos[0]!.texto;
    expect([...claude].length).toBeLessThanOrEqual(TECHO_CLAUDE_MD);
    expect(claude).toContain("## Identidad y las dos casas");
    expect(claude).toContain("Gate de modelo al abrir cada fase");
    expect(claude).toContain("# Compact instructions");
    expect(claude).toContain("Worktrees prohibidos");
  });

  it("el gate se demuestra: una regla repetida, una perdida y un archivo sin `paths:` se detectan", () => {
    const repetida = ubicarReglas([
      ...archivos,
      { nombre: "x.md", texto: "6. `[siempre]` **Commits convencionales**\n" },
    ]);
    expect(repetida.kit.get("6")).toHaveLength(2);
    const perdida = ubicarReglas(
      archivos.map((a) => ({
        ...a,
        texto: a.texto.replace(/^12\. \*\*El color nunca solo.*$/m, ""),
      })),
    );
    expect(perdida.producto.get("12")).toBeUndefined();
    expect(rutasDeCarga("# sin frontmatter\n")).toEqual([]);
    expect(rutasDeCarga("---\npaths:\n---\n# vacío\n")).toEqual([]);
  });
});
