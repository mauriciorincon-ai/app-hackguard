// @vitest-environment node
// Gate de deriva del código de FIRST (G-Plan P2, regla dura 7): los cinco archivos de la calculadora oficial de CVSS 4.0 son
// los del commit fijado, byte a byte; el módulo que los envuelve es lo que el generador escribiría; y ese módulo no usa
// ninguna variable sin declarar (en un módulo ESM eso sería un ReferenceError).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import {
  ARCHIVOS_DE_FIRST,
  DIR_DEL_VENDOR,
  SALIDA_DTS,
  SALIDA_JS,
  generar,
  variablesImplicitas,
  verificar,
} from "../../../scripts/severidad/vendor-first.mjs";

const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");
const sha256 = (texto: string) =>
  createHash("sha256").update(texto, "utf8").digest("hex");
const FICHA = JSON.parse(
  leer(`${DIR_DEL_VENDOR}/first-c5b0d40/VENDOR.json`),
) as {
  commit: string;
  archivos: Record<string, string>;
};

describe("el código de FIRST es el del commit fijado", () => {
  it("la ficha cita el commit c5b0d40 de la calculadora oficial", () => {
    expect(FICHA.commit).toBe("c5b0d409ae9f57c44264c6ce5f27d89298e1d32a");
    expect(FICHA.commit.startsWith("c5b0d40")).toBe(true);
  });

  it.each([...ARCHIVOS_DE_FIRST, "LICENSE"])(
    "%s tiene la huella de la ficha",
    (nombre) => {
      expect(sha256(leer(`${DIR_DEL_VENDOR}/first-c5b0d40/${nombre}`))).toBe(
        FICHA.archivos[nombre],
      );
    },
  );

  it("la ficha no lista archivos de más ni de menos", () => {
    expect(Object.keys(FICHA.archivos).sort()).toEqual(
      [...ARCHIVOS_DE_FIRST, "LICENSE"].sort(),
    );
  });
});

describe("el módulo generado", () => {
  it("es exactamente lo que el generador escribiría (cero deriva)", async () => {
    expect(await verificar()).toEqual([]);
    const { js, dts } = await generar();
    expect(leer(SALIDA_JS)).toBe(js);
    expect(leer(SALIDA_DTS)).toBe(dts);
  });

  it("pega cada archivo de FIRST entre marcadores, con la huella de la ficha y en el orden fijado", () => {
    const js = leer(SALIDA_JS);
    const regiones = [
      ...js.matchAll(
        /^\/\/ >>> first-c5b0d40\/(\S+) · sha256 ([0-9a-f]{64}) · (\d+) bytes\n([\s\S]*?)\n\/\/ <<< first-c5b0d40\/\1$/gm,
      ),
    ];
    expect(regiones.map((r) => r[1])).toEqual(ARCHIVOS_DE_FIRST);
    for (const [, nombre, huella, bytes, cuerpo] of regiones) {
      const original = `${cuerpo}\n`;
      expect(sha256(original), nombre).toBe(huella);
      expect(huella, nombre).toBe(FICHA.archivos[nombre]);
      expect(Buffer.byteLength(original, "utf8"), nombre).toBe(Number(bytes));
      expect(original, nombre).toBe(
        leer(`${DIR_DEL_VENDOR}/first-c5b0d40/${nombre}`),
      );
    }
  });

  it("no usa ninguna variable sin declarar (no-undef en cero, como módulo)", async () => {
    const eslint = new ESLint({
      cwd: RAIZ,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.js"],
          languageOptions: { ecmaVersion: 2022, sourceType: "module" },
          rules: { "no-undef": "error" },
        },
      ],
    });
    const [resultado] = await eslint.lintText(leer(SALIDA_JS), {
      filePath: "first.generated.js",
    });
    expect(resultado.messages).toEqual([]);
  });

  it("declara exactamente las variables que el código de FIRST usa sin declarar", async () => {
    const { archivos, variables } = await generar();
    expect(await variablesImplicitas(archivos)).toEqual(variables);
    expect(variables).toHaveLength(97);
    expect(variables).toContain("cvssLookup_global");
    expect(variables).toContain("maxComposed");
    expect(variables).toContain("expectedMetricOrder");
    expect(leer(SALIDA_JS)).toContain(`let ${variables.join(", ")};`);
  });

  it("se carga como módulo estricto y exporta lo que el motor usa", async () => {
    const m =
      await import("../../../src/engine/severidad/vendor/first.generated.js");
    expect(Object.keys(m).sort()).toEqual([
      "cvssLookup_global",
      "cvss_score",
      "expectedMetricOrder",
      "macroVector",
      "maxSeverity",
    ]);
    expect(Object.keys(m.expectedMetricOrder)).toHaveLength(32);
  });
});
