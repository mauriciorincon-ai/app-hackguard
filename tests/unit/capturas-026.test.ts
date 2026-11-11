// @vitest-environment node
// Las capturas de la ficha 026 (docs/ficha/026): una toma por cada funcionalidad del export, cada una un WebP de 1536×960 que no pasa de
// 80 KB, con su pie en español e inglés dentro del tope del contrato de la ficha (80 caracteres). Ninguna toma queda sin dueño.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./propuestas/ayuda.ts";

const CARPETA = path.join(RAIZ, "docs/ficha/026");
const TOPE_DE_BYTES = 80 * 1024;
const exportado = JSON.parse(
  readFileSync(path.join(RAIZ, "docs/brochure-export.json"), "utf8"),
) as { funcionalidades: { grupos: { features: { id: string }[] }[] } };
const ids = exportado.funcionalidades.grupos.flatMap((g) =>
  g.features.map((f) => f.id),
);

const yaml = readFileSync(path.join(CARPETA, "capturas.yaml"), "utf8");
const entradas = [
  ...yaml.matchAll(
    /^ {2}- \{ funcionalidad: (F\d+), archivo: ([\w.]+), pie: \{ es: "([^"]+)", en: "([^"]+)" \} \}$/gm,
  ),
].map((m) => ({ f: m[1]!, archivo: m[2]!, es: m[3]!, en: m[4]! }));

/** Ancho y alto de un WebP con pérdida (`VP8 `), de su cabecera. */
function dimensiones(archivo: string): { ancho: number; alto: number } {
  const b = readFileSync(archivo);
  expect(b.toString("ascii", 0, 4), archivo).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), archivo).toBe("WEBP");
  expect(b.toString("ascii", 12, 16), `${archivo}: WebP con pérdida`).toBe(
    "VP8 ",
  );
  return {
    ancho: b.readUInt16LE(26) & 0x3fff,
    alto: b.readUInt16LE(28) & 0x3fff,
  };
}

describe("las capturas de la ficha 026", () => {
  it("el capturas.yaml tiene una entrada por cada funcionalidad del export, ninguna de más", () => {
    expect(entradas.map((e) => e.f).sort()).toEqual([...ids].sort());
    expect(new Set(entradas.map((e) => e.f)).size).toBe(entradas.length);
    expect(yaml).toMatch(/^sin_pantalla: \[\]$/m);
  });

  it("cada toma existe, es un WebP de 1536×960 y pesa 80 KB o menos", () => {
    for (const e of entradas) {
      const ruta = path.join(CARPETA, "capturas", e.archivo);
      expect(existsSync(ruta), e.archivo).toBe(true);
      expect(e.archivo, e.f).toBe(`${e.f}.webp`);
      expect(
        statSync(ruta).size,
        `${e.archivo} pesa de más`,
      ).toBeLessThanOrEqual(TOPE_DE_BYTES);
      expect(dimensiones(ruta), e.archivo).toEqual({ ancho: 1536, alto: 960 });
    }
  });

  it("cada pie está en los dos idiomas, dentro del tope del contrato (80), y el inglés no es el español", () => {
    for (const e of entradas) {
      expect(e.es.length, `${e.f} (es)`).toBeLessThanOrEqual(80);
      expect(e.en.length, `${e.f} (en)`).toBeLessThanOrEqual(80);
      expect(e.en, e.f).not.toBe(e.es);
    }
  });

  it("no hay una toma suelta: toda imagen de la carpeta es la portada o la de una entrada", () => {
    const portada = /^portada: ([\w.]+)$/m.exec(yaml)![1]!;
    const duenas = new Set([portada, ...entradas.map((e) => e.archivo)]);
    const sueltas = readdirSync(path.join(CARPETA, "capturas")).filter(
      (n) => !duenas.has(n),
    );
    expect(sueltas).toEqual([]);
  });
});
