// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generarBrochure,
  htmlDeFuncionalidad,
} from "../../scripts/brochure.mjs";
import { RAIZ } from "./propuestas/ayuda.ts";

const leer = (r: string) => readFileSync(path.join(RAIZ, r), "utf8");
const exportado = JSON.parse(leer("docs/brochure-export.json"));
const en = JSON.parse(leer("docs/brochure-en.json"));
const html = leer("docs/BROCHURE.html");
const features = exportado.funcionalidades.grupos.flatMap(
  (g: { features: { id: string }[] }) => g.features,
);

describe("scripts/brochure.mjs: el brochure sale del export y de su copia en inglés", () => {
  it("el HTML versionado es lo que el generador produce (sin deriva)", () => {
    expect(generarBrochure(exportado, en, html)).toBe(html);
  });

  it("el inglés cubre cada funcionalidad, cada tarjeta y el titular, y nada de más", () => {
    expect(Object.keys(en.features).sort()).toEqual(
      features.map((f: { id: string }) => f.id).sort(),
    );
    expect(Object.keys(en.grupos).sort()).toEqual(
      exportado.funcionalidades.grupos
        .map((g: { orden: number }) => String(g.orden))
        .sort(),
    );
    expect(en.tagline.length).toBeGreaterThan(10);
  });

  it("el inglés está redactado, no copiado: ninguna frase igual a su español", () => {
    for (const f of features)
      expect(en.features[f.id].que_hace, f.id).not.toBe(f.que_hace);
  });

  it("un export con una funcionalidad sin inglés no genera nada (falla ruidosa)", () => {
    const sinF18 = { ...en, features: { ...en.features } };
    delete sinF18.features.F18;
    expect(() => generarBrochure(exportado, sinF18, html)).toThrow(/F18/);
  });

  it("cada funcionalidad lleva el par de idiomas y escapa el apóstrofo como el resto de la página", () => {
    const f = { id: "F99", nombre: "Uno", que_hace: "Dos" };
    const sal = htmlDeFuncionalidad(f, {
      features: { F99: { nombre: "One", que_hace: "It's two" } },
    });
    expect(sal).toContain("It&#x27;s two");
    expect(sal).toContain('lang="es"');
    expect(sal).toContain('lang="en"');
  });
});
