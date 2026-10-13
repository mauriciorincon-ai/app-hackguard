// @vitest-environment node
// Regla dura 12: símbolo + texto + color, y el color es un rol que llega de los datos. Ningún componente de una pantalla escribe a mano
// un rol de color (`es-falla`) ni el `rol: "…"` o el `simbolo: "…"` de una etiqueta. Las excepciones se declaran aquí, con su razón.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLES } from "../../src/engine/catalogo/esquemas.ts";
import { RAIZ } from "./propuestas/ayuda.ts";

/** Las carpetas de pantallas ya limpias. Una carpeta nueva entra a la lista cuando se limpia. */
const CARPETAS = [
  "carga",
  "hallazgo",
  "brecha",
  "control",
  "tablero",
  "informe",
  "propuestas",
];
/** Lo que está permitido a mano y por qué. Hoy nada: cada rol y cada símbolo sale de un archivo de etiquetas. */
const EXCEPCIONES: Record<string, string[]> = {};
/** Un rol de color de estado escrito a mano: `es-falla`. (`es-esta` es la marca de una celda, no un rol.) */
const ROL_A_MANO = new RegExp(`["'\`\\s]es-(?:${ROLES.join("|")})\\b`, "g");

const tsx = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? tsx(path.join(d, e.name))
      : e.name.endsWith(".tsx")
        ? [path.join(d, e.name)]
        : [],
  );

describe("ningún componente de pantalla escribe un rol ni un símbolo de estado a mano (regla dura 12)", () => {
  for (const c of CARPETAS)
    for (const f of tsx(path.join(RAIZ, "src/components", c))) {
      const rel = path.relative(path.join(RAIZ, "src/components"), f);
      it(`${rel}`, () => {
        const texto = readFileSync(f, "utf8");
        const permitidos = new Set(EXCEPCIONES[rel] ?? []);
        const literales = [
          ...texto.matchAll(ROL_A_MANO),
          ...texto.matchAll(/\b(?:rol|simbolo):\s*"[a-z_]+"/g),
        ]
          .map((m) => m[0].trim())
          .filter((x) => !permitidos.has(x));
        expect(literales).toEqual([]);
      });
    }
});
