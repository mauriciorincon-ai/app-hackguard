// Gate de la PALETA: los tokens de color salen de scripts/paleta/tokens.mjs (OKLCH) y aquí se miden.
// Umbrales LITERALES: contraste WCAG para texto (AA holgado) y para marcas (3:1), y separación entre
// los cinco papeles de estado en visión normal y bajo protanopía, deuteranopía y tritanopía. El
// usuario tiene daltonismo leve: el color nunca trabaja solo (cada estado lleva además símbolo y
// texto), pero dos papeles que se confunden de color le quitan una de las tres señales.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { contraste, diferencia } from "../../scripts/paleta/color.mjs";
import { PAPELES } from "../../scripts/paleta/tokens.mjs";

const ASSETS = "docs/diseno/assets";
const tokens: Record<"oscuro" | "claro", Record<string, string>> = JSON.parse(readFileSync(`${ASSETS}/tokens.json`, "utf8"));

const SUPERFICIES = ["fondo", "superficie", "superficie-2"];
const TINTES = PAPELES.map((p: string) => `${p}-tinte`);

const TEXTO_PRINCIPAL = 7; // tinta sobre cualquier superficie o tinte
const TEXTO_SECUNDARIO = 4.5; // tinta-2 y acento (enlaces, firma) sobre superficies
const MARCA = 3; // símbolos, bordes de estado y bordes de controles
const SEPARACION_NORMAL = 0.1; // ΔE OKLab del peor par de papeles
const SEPARACION_DICROMACIA = 0.05;

const salida = mkdtempSync(join(tmpdir(), "paleta-"));
afterAll(() => rmSync(salida, { recursive: true, force: true }));

describe("paleta: tokens generados y medidos", () => {
  it("tokens.css y tokens.json son exactamente la salida del generador", () => {
    execFileSync(process.execPath, ["scripts/paleta/generar-tokens.mjs"], {
      env: { ...process.env, PALETA_SALIDA: salida, MAQUETA_SILENCIO: "1" },
    });
    for (const archivo of ["tokens.css", "tokens.json"]) {
      const igual = readFileSync(`${ASSETS}/${archivo}`, "utf8") === readFileSync(join(salida, archivo), "utf8");
      expect(igual, `${archivo}: difiere de lo que genera scripts/paleta (corre «pnpm tokens»)`).toBe(true);
    }
  });

  for (const tema of ["oscuro", "claro"] as const) {
    const t = tokens[tema];
    const razon = (a: string, b: string) => contraste(t[a], t[b]);

    it(`${tema}: la tinta se lee sobre toda superficie y todo tinte`, () => {
      for (const base of [...SUPERFICIES, ...TINTES]) {
        expect(razon("tinta", base), `tinta sobre ${base}`).toBeGreaterThanOrEqual(TEXTO_PRINCIPAL);
        expect(razon("tinta-2", base), `tinta-2 sobre ${base}`).toBeGreaterThanOrEqual(TEXTO_SECUNDARIO);
      }
      for (const base of SUPERFICIES) {
        expect(razon("acento", base), `acento sobre ${base}`).toBeGreaterThanOrEqual(TEXTO_SECUNDARIO);
      }
    });

    it(`${tema}: cada marca de estado y cada borde de control se distingue de su fondo`, () => {
      for (const papel of PAPELES) {
        for (const base of ["fondo", "superficie", `${papel}-tinte`]) {
          expect(razon(papel, base), `${papel} sobre ${base}`).toBeGreaterThanOrEqual(MARCA);
        }
      }
      for (const base of SUPERFICIES) {
        expect(razon("linea-fuerte", base), `linea-fuerte sobre ${base}`).toBeGreaterThanOrEqual(MARCA);
      }
    });

    it.each([
      ["normal", SEPARACION_NORMAL],
      ["protanopia", SEPARACION_DICROMACIA],
      ["deuteranopia", SEPARACION_DICROMACIA],
      ["tritanopia", SEPARACION_DICROMACIA],
    ] as const)(`${tema}: los papeles de estado no se confunden entre sí (%s)`, (vision, minimo) => {
      for (let i = 0; i < PAPELES.length; i++) {
        for (let j = i + 1; j < PAPELES.length; j++) {
          const d = diferencia(t[PAPELES[i]], t[PAPELES[j]], vision);
          expect(d, `${PAPELES[i]} ~ ${PAPELES[j]} con visión ${vision}`).toBeGreaterThanOrEqual(minimo);
        }
      }
    });
  }
});
