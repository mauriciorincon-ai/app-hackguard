// @vitest-environment node
// La guía de prueba es UN recorrido caminable (G-Plan del S10): sus paradas dicen «Parada N de M» con N = 1…M en el orden del
// documento, la cabecera declara cuántas son y cuántos minutos suman, y ninguna casilla se repite. Una parada que se cuela en
// medio, o un total que no cuadra, se lee como «esto es todo lo que había». Esta prueba lo exige por comando, no a ojo.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./catalogo/ayuda.ts";

const guia = readFileSync(`${RAIZ}/docs/GUIA-DE-PRUEBA.html`, "utf8");
const paradas = [...guia.matchAll(/Parada (\d+) de (\d+)<\/span>/g)].map(
  (m) => ({ n: Number(m[1]), total: Number(m[2]) }),
);
const items = [...guia.matchAll(/<li data-origen="[a-z]+"([^>]*)>/g)].map(
  (m) => m[1] ?? "",
);

describe("la guía de prueba se camina como un solo recorrido, en orden", () => {
  it("hay paradas, y todas dicen el mismo total, que es el de casillas", () => {
    expect(paradas.length).toBeGreaterThan(0);
    expect(new Set(paradas.map((p) => p.total))).toEqual(
      new Set([paradas.length]),
    );
    expect(items.length).toBe(paradas.length);
  });

  it("las paradas van de 1 a N en el orden del documento", () => {
    expect(paradas.map((p) => p.n)).toEqual(paradas.map((_, i) => i + 1));
  });

  it("ninguna casilla ni ninguna parada se repite", () => {
    const casillas = [...guia.matchAll(/<input type="checkbox" id="([^"]+)"/g)];
    const ids = casillas.map((m) => m[1]);
    expect(ids.length).toBe(paradas.length);
    expect(new Set(ids).size).toBe(ids.length);
    const anclas = [...guia.matchAll(/<li [^>]*\bid="(p-[^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(new Set(anclas).size).toBe(anclas.length);
  });

  it("la cabecera declara las paradas, las efectivas y los minutos, y cuadran con las paradas", () => {
    const cabecera = guia.match(
      /Recorrido: (\d+) paradas declaradas, (\d+) efectivas · ~(\d+) min/,
    );
    expect(cabecera, "la cabecera del recorrido").not.toBeNull();
    expect(Number(cabecera![1])).toBe(paradas.length);
    const noCorre = items.filter((a) => a.includes("data-no-corre")).length;
    expect(Number(cabecera![2])).toBe(paradas.length - noCorre);
    const minutos = items.map((a) => Number(a.match(/data-min="(\d+)"/)?.[1]));
    expect(minutos.every((m) => Number.isInteger(m))).toBe(true);
    expect(minutos.reduce((a, b) => a + b, 0)).toBe(Number(cabecera![3]));
  });

  it("la cabecera cuenta las paradas de juicio humano ⭐ y las nuevas o mejoradas", () => {
    const juicio = items.filter((a) => a.includes("data-minimo")).length;
    expect(guia).toContain(`Juicio humano ⭐: ${juicio} paradas.`);
    const cambios = [...guia.matchAll(/<li data-origen="(nuevo|mejorado)"/g)]
      .length;
    expect(guia).toContain(
      `${cambios} paradas son nuevas o mejoradas en este sprint`,
    );
  });

  it("el tope se fue: no queda el filtro «gate corto» ni el atributo data-corto", () => {
    expect(items.filter((a) => a.includes("data-corto"))).toEqual([]);
    expect(guia).not.toContain('data-filtro="corto"');
  });

  it("las casillas se guardan con el prefijo del sprint vigente", () => {
    expect(guia).toMatch(/var NS = "hackguard-s\d+:";/);
  });
});
