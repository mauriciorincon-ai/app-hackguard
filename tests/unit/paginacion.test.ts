// @vitest-environment node
// La paginación de la lista: una porción de lo que cumple los filtros, siempre dentro del rango que existe.
import { describe, expect, it } from "vitest";
import {
  POR_PAGINA,
  acotar,
  porcion,
  rango,
  totalDePaginas,
} from "../../src/lib/catalogo/paginacion.ts";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

describe("paginación del catálogo", () => {
  it("son 20 por página, y siempre hay al menos una página", () => {
    expect(POR_PAGINA).toBe(20);
    expect(totalDePaginas(0)).toBe(1);
    expect(totalDePaginas(1)).toBe(1);
    expect(totalDePaginas(20)).toBe(1);
    expect(totalDePaginas(21)).toBe(2);
    expect(totalDePaginas(38)).toBe(2);
    expect(totalDePaginas(40)).toBe(2);
    expect(totalDePaginas(41)).toBe(3);
  });

  it("las 38 pruebas caben en dos páginas: 20 y 18, sin repetir ni perder ninguna", () => {
    const todas = ids(38);
    const primera = porcion(todas, 1);
    const segunda = porcion(todas, 2);
    expect(primera).toHaveLength(20);
    expect(segunda).toHaveLength(18);
    expect([...primera, ...segunda]).toEqual(todas);
  });

  it("una página fuera de rango se lleva al rango que existe, y lo que no es un número vale 1", () => {
    expect(acotar(0, 38)).toBe(1);
    expect(acotar(-3, 38)).toBe(1);
    expect(acotar(9, 38)).toBe(2);
    expect(acotar(Number.NaN, 38)).toBe(1);
    expect(acotar(1.9, 38)).toBe(1);
    // Un filtro que deja 5 pruebas mientras se estaba en la página 2: se vuelve a la 1, nunca una página vacía.
    expect(porcion(ids(5), 2)).toEqual(ids(5));
    expect(porcion([], 1)).toEqual([]);
  });

  it("el rango dice de qué fila a qué fila va la página, o 0 a 0 si no hay ninguna", () => {
    expect(rango(1, 38)).toEqual({ desde: 1, hasta: 20 });
    expect(rango(2, 38)).toEqual({ desde: 21, hasta: 38 });
    expect(rango(7, 38)).toEqual({ desde: 21, hasta: 38 });
    expect(rango(1, 1)).toEqual({ desde: 1, hasta: 1 });
    expect(rango(1, 0)).toEqual({ desde: 0, hasta: 0 });
  });

  it("con otro tamaño de página las mismas cuentas siguen cuadrando", () => {
    expect(totalDePaginas(38, 10)).toBe(4);
    expect(porcion(ids(38), 4, 10)).toEqual(ids(38).slice(30));
    expect(rango(4, 38, 10)).toEqual({ desde: 31, hasta: 38 });
  });
});
