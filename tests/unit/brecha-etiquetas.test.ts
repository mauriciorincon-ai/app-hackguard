// @vitest-environment node
// Las etiquetas de estado de las pantallas de la brecha son dato (regla dura 12: símbolo + texto + color, y el color es un rol que
// sale de `datos/estados.json` o de `datos/brecha/etiquetas.json`): el esquema exige cada etiqueta una vez, y ningún componente de
// la brecha escribe un rol de color, un símbolo de estado o una etiqueta de estado a mano.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EtiquetasDeBrecha,
  IDS_DE_ETIQUETAS_DE_BRECHA,
} from "../../src/engine/brecha/esquemas.ts";
import { ROLES, SIMBOLOS } from "../../src/engine/catalogo/esquemas.ts";
import { cargarEtiquetasDeBrecha } from "../../src/lib/brecha/cargar.ts";

const RAIZ = process.cwd();
const datos = cargarEtiquetasDeBrecha(RAIZ);
const crudo = () =>
  JSON.parse(
    readFileSync(path.join(RAIZ, "datos/brecha/etiquetas.json"), "utf8"),
  ) as { etiquetas: Record<string, unknown>[] };

describe("el vocabulario de la brecha", () => {
  it("tiene cada etiqueta una vez, con su rol, su marca y su nombre en los dos idiomas", () => {
    expect(datos.etiquetas.map((e) => e.id).sort()).toEqual(
      [...IDS_DE_ETIQUETAS_DE_BRECHA].sort(),
    );
    for (const e of datos.etiquetas) {
      expect(ROLES, e.id).toContain(e.rol);
      expect(SIMBOLOS, e.id).toContain(e.simbolo);
      expect(e.nombre.es.length, e.id).toBeGreaterThan(0);
      expect(e.nombre.en.length, e.id).toBeGreaterThan(0);
    }
  });

  it("el esquema rechaza una etiqueta que falta, una repetida, una que no existe y un campo de más", () => {
    const base = crudo();
    expect(
      EtiquetasDeBrecha.safeParse({
        ...base,
        etiquetas: base.etiquetas.slice(1),
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDeBrecha.safeParse({
        ...base,
        etiquetas: [...base.etiquetas, base.etiquetas[0]],
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDeBrecha.safeParse({
        ...base,
        etiquetas: [
          ...base.etiquetas,
          { ...base.etiquetas[0], id: "inventada" },
        ],
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDeBrecha.safeParse({
        ...base,
        etiquetas: base.etiquetas.map((e, i) =>
          i === 0 ? { ...e, color: "#f00" } : e,
        ),
      }).success,
    ).toBe(false);
    expect(EtiquetasDeBrecha.safeParse(base).success).toBe(true);
  });
});

describe("ningún componente de la brecha escribe un rol, un símbolo o una etiqueta de estado a mano (regla dura 12)", () => {
  const carpetas = ["brecha", "tablero", "control", "informe"].map((c) =>
    path.join(RAIZ, "src/components", c),
  );
  const archivos = carpetas.flatMap((c) =>
    readdirSync(c)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => path.join(c, f)),
  );
  it("hay componentes que mirar", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(7);
  });
  for (const f of archivos)
    it(`${path.relative(RAIZ, f)} solo usa roles y marcas que llegan de los datos`, () => {
      const texto = readFileSync(f, "utf8");
      // «es-falla», «es-acento»…: un rol de estado literal. Los que llegan de los datos se arman con `es-${…}`.
      const roles = [...texto.matchAll(/["'`\s]es-(?!\$\{)[a-z]+/g)].map((m) =>
        m[0].trim(),
      );
      expect(roles).toEqual([]);
      // Una etiqueta armada a mano: `rol: "falla"`, `simbolo="ok"`, `nombre="vacio"` (símbolo o rol literal).
      const marcas = [
        ...texto.matchAll(/\b(?:rol|simbolo)\s*[:=]\s*\{?\s*["'][a-z_]+["']/g),
      ].map((m) => m[0]);
      expect(marcas).toEqual([]);
    });
});
