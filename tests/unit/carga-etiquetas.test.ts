// @vitest-environment node
// Las etiquetas de estado de la carga son dato (regla dura 12: símbolo + texto + color, y el color es un rol que sale de
// `datos/evidencia/etiquetas-de-carga.json`): el esquema exige cada etiqueta una vez, y ningún componente de la carga escribe un
// rol de color de estado a mano.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLES, SIMBOLOS } from "../../src/engine/catalogo/esquemas.ts";
import {
  EtiquetasDeCarga,
  IDS_DE_ETIQUETAS_DE_CARGA,
} from "../../src/engine/lotes/esquemas.ts";
import { cargarEtiquetasDeCarga } from "../../src/lib/evidencia/cargar-evidencia.ts";
import { RAIZ } from "./evidencia/ayuda.ts";

const datos = cargarEtiquetasDeCarga(RAIZ);
const crudo = () =>
  JSON.parse(
    readFileSync(
      path.join(RAIZ, "datos/evidencia/etiquetas-de-carga.json"),
      "utf8",
    ),
  ) as { etiquetas: Record<string, unknown>[] };

describe("el vocabulario de la carga", () => {
  it("tiene cada etiqueta una vez, con su rol, su marca y su nombre en los dos idiomas", () => {
    expect(datos.etiquetas.map((e) => e.id).sort()).toEqual(
      [...IDS_DE_ETIQUETAS_DE_CARGA].sort(),
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
    const falta = { ...base, etiquetas: base.etiquetas.slice(1) };
    expect(EtiquetasDeCarga.safeParse(falta).success).toBe(false);
    const repetida = {
      ...base,
      etiquetas: [...base.etiquetas, base.etiquetas[0]],
    };
    expect(EtiquetasDeCarga.safeParse(repetida).success).toBe(false);
    const ajena = {
      ...base,
      etiquetas: [...base.etiquetas, { ...base.etiquetas[0], id: "inventada" }],
    };
    expect(EtiquetasDeCarga.safeParse(ajena).success).toBe(false);
    const demas = {
      ...base,
      etiquetas: base.etiquetas.map((e, i) =>
        i === 0 ? { ...e, color: "#f00" } : e,
      ),
    };
    expect(EtiquetasDeCarga.safeParse(demas).success).toBe(false);
    expect(EtiquetasDeCarga.safeParse(base).success).toBe(true);
  });
});

describe("ningún componente de la carga escribe un rol de color a mano (regla dura 12)", () => {
  const carpeta = path.join(RAIZ, "src/components/carga");
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith(".tsx"));
  it("hay componentes que mirar", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(2);
  });
  for (const f of archivos)
    it(`${f} solo usa roles que llegan de los datos`, () => {
      const texto = readFileSync(path.join(carpeta, f), "utf8");
      // «es-falla», «es-acento»…: un rol de estado literal. Los que llegan de los datos se arman con `es-${…}`.
      const literales = [...texto.matchAll(/["'`\s]es-(?!\$\{)[a-z]+/g)].map(
        (m) => m[0].trim(),
      );
      expect(literales).toEqual([]);
    });
});
