// @vitest-environment node
// Fechas civiles con aritmética entera: el núcleo no usa `Date`. La prueba sí, como referencia independiente.
import { describe, expect, it } from "vitest";
import {
  diasDesdeEpoca,
  diasEntre,
  esFechaCivil,
  esFechaParcial,
  fechaMasDias,
} from "../../../src/engine/fecha.ts";

describe("esFechaCivil", () => {
  it.each([
    "2026-10-04",
    "2024-02-29",
    "2000-02-29",
    "1970-01-01",
    "0001-01-01",
    "9999-12-31",
  ])("%s existe", (f) => {
    expect(esFechaCivil(f)).toBe(true);
  });

  it.each([
    "2026-02-29",
    "1900-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
    "2026-10-00",
    "0000-01-01",
    "2026-1-04",
    "2026/10/04",
    "2026-10-04T00:00",
    "",
  ])("%s no es una fecha civil", (f) => {
    expect(esFechaCivil(f)).toBe(false);
  });
});

describe("esFechaParcial", () => {
  it.each(["2026", "2026-09", "2026-09-30", "2024-02-29"])("%s vale", (f) => {
    expect(esFechaParcial(f)).toBe(true);
  });

  it.each([
    "0000",
    "2026-13",
    "2026-00",
    "2026-02-30",
    "26",
    "2026-9",
    "abril",
  ])("%s no vale", (f) => {
    expect(esFechaParcial(f)).toBe(false);
  });
});

describe("diasDesdeEpoca y diasEntre", () => {
  const referencia = (f: string) =>
    Date.UTC(
      Number(f.slice(0, 4)),
      Number(f.slice(5, 7)) - 1,
      Number(f.slice(8, 10)),
    ) / 86_400_000;

  it.each([
    "1970-01-01",
    "1969-12-31",
    "2000-02-29",
    "2000-03-01",
    "2026-10-04",
    "2100-03-01",
    "1600-02-29",
    "0400-01-01",
  ])("%s coincide con el calendario gregoriano proléptico", (f) => {
    expect(diasDesdeEpoca(f)).toBe(referencia(f));
  });

  it("cuenta días entre fechas, también hacia atrás y sobre un bisiesto", () => {
    expect(diasEntre("2026-10-04", "2026-11-03")).toBe(30);
    expect(diasEntre("2026-10-04", "2026-12-03")).toBe(60);
    expect(diasEntre("2026-10-04", "2026-09-04")).toBe(-30);
    expect(diasEntre("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("lanza con una fecha que no existe", () => {
    expect(() => diasDesdeEpoca("2026-02-30")).toThrow(/fecha no civil/);
  });
});

describe("fechaMasDias", () => {
  it("suma y resta días cruzando meses, años y bisiestos", () => {
    expect(fechaMasDias("2026-10-04", 30)).toBe("2026-11-03");
    expect(fechaMasDias("2026-10-04", 60)).toBe("2026-12-03");
    expect(fechaMasDias("2026-10-04", 100)).toBe("2027-01-12");
    expect(fechaMasDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(fechaMasDias("2100-02-28", 1)).toBe("2100-03-01");
    expect(fechaMasDias("2000-03-01", -1)).toBe("2000-02-29");
    expect(fechaMasDias("1970-01-01", -1)).toBe("1969-12-31");
    expect(fechaMasDias("2026-10-04", 0)).toBe("2026-10-04");
  });

  it("es el inverso de diasEntre en cada día de cuatro siglos alrededor de la época", () => {
    let fecha = "1900-01-01";
    for (let i = 0; i < 146_097; i += 7) {
      const siguiente = fechaMasDias("1900-01-01", i);
      expect(diasEntre("1900-01-01", siguiente)).toBe(i);
      expect(esFechaCivil(siguiente)).toBe(true);
      fecha = siguiente;
    }
    expect(fecha > "2299-12-01").toBe(true);
  });

  it("lanza fuera de 0001–9999 o con días no enteros", () => {
    expect(() => fechaMasDias("9999-12-31", 1)).toThrow(/fuera del rango/);
    expect(() => fechaMasDias("0001-01-01", -1)).toThrow(/fuera del rango/);
    expect(() => fechaMasDias("2026-10-04", 1.5)).toThrow(/días no enteros/);
  });
});
