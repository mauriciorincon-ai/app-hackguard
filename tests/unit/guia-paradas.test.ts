// @vitest-environment node
// El gate corto ⭐⭐ de la guía de prueba es un recorrido caminable: sus paradas dicen «Parada N de M» con N = 1…M en el orden del
// documento, y la cabecera declara cuántas son (regla 11, gate corto). Una parada que se cuela en medio, o un total que no cuadra,
// se lee como «esto es todo lo que había». Esta prueba lo exige por comando, no a ojo.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./catalogo/ayuda.ts";

const guia = readFileSync(`${RAIZ}/docs/GUIA-DE-PRUEBA.html`, "utf8");
const paradas = [...guia.matchAll(/⭐⭐ Parada (\d+) de (\d+)</g)].map((m) => ({
  n: Number(m[1]),
  total: Number(m[2]),
}));

describe("el gate corto ⭐⭐ de la guía de prueba se camina en orden", () => {
  it("hay paradas, y todas dicen el mismo total", () => {
    expect(paradas.length).toBeGreaterThan(0);
    expect(new Set(paradas.map((p) => p.total))).toEqual(
      new Set([paradas.length]),
    );
  });

  it("las paradas van de 1 a N en el orden del documento", () => {
    expect(paradas.map((p) => p.n)).toEqual(paradas.map((_, i) => i + 1));
  });

  it("la cabecera declara el mismo número de paradas, y no más efectivas que declaradas", () => {
    const cabecera = guia.match(
      /Gate corto ⭐⭐: (\d+) paradas declaradas, (\d+) efectivas/,
    );
    expect(cabecera, "la cabecera del gate corto").not.toBeNull();
    expect(Number(cabecera![1])).toBe(paradas.length);
    expect(Number(cabecera![2])).toBeLessThanOrEqual(Number(cabecera![1]));
  });

  it("las pruebas que van al gate mínimo y las que quedan fuera cuadran con la cabecera", () => {
    const todas = [...guia.matchAll(/<li data-origen="[a-z]+"/g)].length;
    const minimo = [...guia.matchAll(/<li data-origen="[a-z]+" data-minimo/g)]
      .length;
    expect(guia).toContain(`Gate mínimo ⭐: ${minimo} pruebas`);
    expect(guia).toContain(
      `se corre en pases completos: ${todas - minimo} pruebas más`,
    );
  });
});
