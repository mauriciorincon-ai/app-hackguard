// @vitest-environment node
// Gate de tintas VETADAS y de colores sueltos (design-system.md § 2 y § 9; regla 5 de la constitución). Corre en
// `pnpm test`, no en axe al final: el producto toma TODOS sus colores de los tokens de la hoja del sistema, y las dos
// tintas de línea (`--linea`, `--linea-fuerte`) no alcanzan contraste como texto, así que solo separan y bordean.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const EXTENSIONES = /\.(ts|tsx|css)$/;

export interface Hallazgo {
  ruta: string;
  linea: number;
  regla: "color-suelto" | "tinta-vetada-como-texto";
  texto: string;
}

// Un color escrito a mano: hexadecimal (3, 4, 6 u 8 dígitos) o una función de color.
const COLOR_SUELTO =
  /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/;
// Una tinta vetada usada como color de texto: `color:` en CSS/estilos o una utilidad de texto de Tailwind.
const TINTA_VETADA =
  /(?<![\w-])color\s*:\s*["']?\s*var\(\s*--linea(?:-fuerte)?\b|\btext-(?:linea|\[?\(?var\(--linea|\(--linea)/;

export function hallazgosDe(ruta: string, texto: string): Hallazgo[] {
  const salida: Hallazgo[] = [];
  texto.split("\n").forEach((linea, i) => {
    if (COLOR_SUELTO.test(linea))
      salida.push({
        ruta,
        linea: i + 1,
        regla: "color-suelto",
        texto: linea.trim(),
      });
    if (TINTA_VETADA.test(linea))
      salida.push({
        ruta,
        linea: i + 1,
        regla: "tinta-vetada-como-texto",
        texto: linea.trim(),
      });
  });
  return salida;
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory()
      ? archivos(ruta)
      : EXTENSIONES.test(nombre)
        ? [ruta]
        : [];
  });
}

describe("tintas vetadas y colores sueltos", () => {
  it("el producto (src/) no escribe ningún color a mano ni usa una tinta vetada como texto", () => {
    const todos = archivos(join(RAIZ, "src")).flatMap((ruta) =>
      hallazgosDe(relative(RAIZ, ruta), readFileSync(ruta, "utf8")),
    );
    expect(
      todos.map((h) => `${h.ruta}:${h.linea} [${h.regla}] ${h.texto}`),
      "colores sueltos o tintas vetadas: usa un token de docs/diseno/assets/tokens.css",
    ).toEqual([]);
  });

  it("recorre los archivos de interfaz: hay al menos la hoja del producto y un componente", () => {
    const rutas = archivos(join(RAIZ, "src")).map((r) => relative(RAIZ, r));
    expect(rutas).toContain("src/app/globals.css");
    expect(rutas.some((r) => r.endsWith(".tsx"))).toBe(true);
  });

  describe("el detector distingue lo vetado de lo permitido", () => {
    const marca = (texto: string) =>
      hallazgosDe("x.css", texto).map((h) => h.regla);
    it("marca un hexadecimal, una función de color y una tinta de línea como texto", () => {
      expect(marca("a { background: #12100e; }")).toEqual(["color-suelto"]);
      expect(marca("a { border-color: rgb(0 0 0 / 0.2); }")).toEqual([
        "color-suelto",
      ]);
      expect(marca("a { color: var(--linea); }")).toEqual([
        "tinta-vetada-como-texto",
      ]);
      expect(marca("a { color: var(--linea-fuerte); }")).toEqual([
        "tinta-vetada-como-texto",
      ]);
      expect(marca('<p className="text-linea">x</p>')).toEqual([
        "tinta-vetada-como-texto",
      ]);
    });
    it("deja pasar los tokens, los bordes con tinta de línea y los enlaces ancla", () => {
      expect(
        marca("a { color: var(--tinta); border: 1px solid var(--linea); }"),
      ).toEqual([]);
      expect(marca("a { background: var(--linea-fuerte); }")).toEqual([]);
      expect(marca('<a href="#contenido">x</a>')).toEqual([]);
      expect(marca('stroke="var(--fondo)"')).toEqual([]);
    });
  });
});
