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

  // S9: el gate se lee de arriba abajo, así que sus paradas viven todas en su bloque, al principio del documento.
  it("todas las ⭐⭐ están dentro del bloque del gate, antes del primer bloque de pruebas", () => {
    const inicio = guia.indexOf('id="gate-h1"');
    const fin = guia.indexOf('<section class="bloque">');
    expect(inicio).toBeGreaterThan(-1);
    expect(fin).toBeGreaterThan(inicio);
    const fuera = [...guia.matchAll(/⭐⭐ Parada (\d+) de/g)].filter(
      (m) => m.index! < inicio || m.index! >= fin,
    );
    expect(fuera.map((m) => m[0])).toEqual([]);
  });

  it("cada prueba del gate ⭐⭐ es también ⭐ mínimo (el corto es un subconjunto)", () => {
    const corto = [...guia.matchAll(/<li data-origen="[a-z]+"([^>]*)>/g)]
      .map((m) => m[1])
      .filter((atributos) => atributos.includes("data-corto"));
    expect(corto.length).toBe(paradas.length);
    expect(corto.filter((a) => !a.includes("data-minimo"))).toEqual([]);
  });

  // Cada parada declara sus minutos (data-min) y la cabecera da el total: si no cuadran, el total miente.
  it("la cabecera declara efectivas y minutos, y cuadran con las paradas", () => {
    const cabecera = guia.match(
      /Gate corto ⭐⭐: (\d+) paradas declaradas, (\d+) efectivas · ~(\d+) min/,
    );
    expect(cabecera, "la cabecera del gate corto con minutos").not.toBeNull();
    const noCorre = [
      ...guia.matchAll(/<li data-origen="[a-z]+"[^>]*data-no-corre/g),
    ].length;
    expect(Number(cabecera![2])).toBe(paradas.length - noCorre);
    const minutos = [
      ...guia.matchAll(
        /<li data-origen="[a-z]+"[^>]*data-corto[^>]*data-min="(\d+)"/g,
      ),
    ].map((m) => Number(m[1]));
    expect(minutos.length).toBe(paradas.length);
    expect(minutos.reduce((a, b) => a + b, 0)).toBe(Number(cabecera![3]));
  });
});
