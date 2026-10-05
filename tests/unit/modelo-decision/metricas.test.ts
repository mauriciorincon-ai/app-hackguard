// @vitest-environment node
// Métricas de `modelo_decision` sobre casos calculados a mano: cada cifra esperada se deriva en el comentario
// que la acompaña, sin pasar por el código que se prueba.
import { describe, expect, it } from "vitest";
import {
  brier,
  ece,
  eleccion,
  errorEnBanda,
  exactitud,
  paridad,
  tasaPorReejecucion,
  type Prediccion,
} from "../../../src/engine/modelo-decision/metricas.ts";

const p = (
  id: string,
  probabilidades: Record<string, number> | null,
  etiqueta: string,
): Prediccion => ({ id, probabilidades, etiqueta });

describe("eleccion y exactitud", () => {
  it("elige la opción más probable y desempata por id", () => {
    expect(eleccion({ b: 0.2, a: 0.3, c: 0.5 })).toBe("c");
    expect(eleccion({ b: 0.5, a: 0.5 })).toBe("a");
    expect(() => eleccion({})).toThrow(/sin opciones/);
  });

  it("una salida inválida cuenta como error (E-17)", () => {
    const ps = [
      p("1", { a: 0.9, b: 0.1 }, "a"),
      p("2", { a: 0.2, b: 0.8 }, "a"),
      p("3", null, "a"),
    ];
    expect(exactitud(ps)).toEqual({ n: 3, cuenta: 1, tasa: 1 / 3 });
    expect(exactitud([])).toEqual({ n: 0, cuenta: 0, tasa: null });
  });
});

describe("brier", () => {
  it("es la media de Σ (p − y)² sobre todas las opciones", () => {
    // 1: (0,7 − 1)² + (0,3 − 0)² = 0,09 + 0,09 = 0,18
    // 2: (0,4 − 1)² + (0,6 − 0)² = 0,36 + 0,36 = 0,72   → media 0,45
    const ps = [
      p("1", { a: 0.7, b: 0.3 }, "a"),
      p("2", { a: 0.4, b: 0.6 }, "a"),
    ];
    expect(brier(ps, ["a", "b"])).toBeCloseTo(0.45, 12);
  });

  it("una salida inválida aporta el máximo, 2; sin predicciones no hay cifra", () => {
    // (0,18 + 0,72 + 2) / 3
    const ps = [
      p("1", { a: 0.7, b: 0.3 }, "a"),
      p("2", { a: 0.4, b: 0.6 }, "a"),
      p("3", null, "b"),
    ];
    expect(brier(ps, ["a", "b"])).toBeCloseTo(2.9 / 3, 12);
    expect(brier([], ["a"])).toBeNull();
  });

  it("una opción que la predicción no trae cuenta como probabilidad 0", () => {
    // (0 − 0)² + (1 − 1)² + (0 − 0)² … la etiqueta «c» no está: (0 − 1)² + (1 − 0)² = 2
    expect(brier([p("1", { a: 1 }, "c")], ["a", "c"])).toBe(2);
  });

  it("no depende del orden de las predicciones", () => {
    const ps = [
      p("2", { a: 0.4, b: 0.6 }, "a"),
      p("1", { a: 0.7, b: 0.3 }, "a"),
      p("3", { a: 0.1, b: 0.9 }, "b"),
    ];
    expect(brier(ps, ["b", "a"])).toBe(brier([...ps].reverse(), ["a", "b"]));
  });
});

describe("ece con bins de igual masa", () => {
  it("ordena por confianza y reparte en bins del mismo tamaño", () => {
    // confianzas 0,6 ✗ · 0,7 ✓ | 0,8 ✓ · 0,9 ✓
    // bin 1: exactitud 0,5, confianza 0,65 → 0,15; bin 2: exactitud 1, confianza 0,85 → 0,15
    // ECE = ½ · 0,15 + ½ · 0,15 = 0,15
    const ps = [
      p("d", { a: 0.9, b: 0.1 }, "a"),
      p("a", { a: 0.6, b: 0.4 }, "b"),
      p("c", { a: 0.8, b: 0.2 }, "a"),
      p("b", { a: 0.3, b: 0.7 }, "b"),
    ];
    const r = ece(ps, 2);
    expect(r.valor).toBeCloseTo(0.15, 12);
    expect(r.bins.map((b) => b.n)).toEqual([2, 2]);
    expect(r.bins[0].confianza_media).toBeCloseTo(0.65, 12);
    expect(r.bins[0].exactitud).toBe(0.5);
    expect(r.validas).toBe(4);
  });

  it("con n que no divide a B, los primeros bins llevan una más; con B > n, un bin por predicción", () => {
    const ps = ["a", "b", "c", "d", "e"].map((id, i) =>
      p(id, { si: 0.5 + i / 10, no: 0.5 - i / 10 }, "si"),
    );
    expect(ece(ps, 2).bins.map((b) => b.n)).toEqual([3, 2]);
    expect(ece(ps, 9).bins.map((b) => b.n)).toEqual([1, 1, 1, 1, 1]);
  });

  it("deja fuera las inválidas y las cuenta aparte", () => {
    const r = ece([p("1", { a: 1 }, "a"), p("2", null, "a")], 3);
    expect(r).toMatchObject({ valor: 0, validas: 1, invalidas: 1 });
    expect(ece([p("1", null, "a")], 3)).toEqual({
      valor: null,
      bins: [],
      validas: 0,
      invalidas: 1,
    });
  });

  it.each([0, -1, 1.5])("rechaza %s bins", (bins) => {
    expect(() => ece([], bins)).toThrow(/bins/);
  });
});

describe("errorEnBanda", () => {
  const banda = { opcion: "aprobar", umbral: 0.7, desde: 0.6, hasta: 0.8 };

  it("cuenta, dentro de la banda, las que deciden distinto de su etiqueta", () => {
    const ps = [
      p("1", { aprobar: 0.75, revisar: 0.25 }, "aprobar"), // en banda, decide aprobar, bien
      p("2", { aprobar: 0.65, revisar: 0.35 }, "aprobar"), // en banda, no aprueba, mal
      p("3", { aprobar: 0.72, revisar: 0.28 }, "revisar"), // en banda, aprueba, mal
      p("4", { aprobar: 0.6, revisar: 0.4 }, "revisar"), // borde incluido, no aprueba, bien
      p("5", { aprobar: 0.9, revisar: 0.1 }, "revisar"), // fuera de la banda
      p("6", null, "aprobar"), // inválida: fuera
      p("7", { revisar: 1 }, "revisar"), // sin la opción: p = 0, fuera
    ];
    expect(errorEnBanda(ps, banda)).toEqual({ n: 4, cuenta: 2, tasa: 0.5 });
  });

  it("sin nada en la banda no hay tasa", () => {
    expect(errorEnBanda([p("1", { aprobar: 0.1 }, "a")], banda)).toEqual({
      n: 0,
      cuenta: 0,
      tasa: null,
    });
  });
});

describe("tasaPorReejecucion", () => {
  it("cuenta los ítems que cambian de elección en alguna corrida, y las distribuciones idénticas", () => {
    const corrida1 = [
      p("x", { a: 0.6, b: 0.4 }, "a"),
      p("y", { a: 0.3, b: 0.7 }, "b"),
      p("z", { a: 0.5, b: 0.5 }, "a"),
    ];
    const corrida2 = [
      p("z", { a: 0.5, b: 0.5 }, "a"), // idéntica
      p("x", { a: 0.4, b: 0.6 }, "a"), // cambia de a a b
      p("y", { a: 0.2, b: 0.8 }, "b"), // misma elección, otra distribución
    ];
    expect(tasaPorReejecucion([corrida1, corrida2])).toEqual({
      n: 3,
      cuenta: 1,
      tasa: 1 / 3,
      k: 2,
      vectores_identicos: 1,
    });
  });

  it("una salida inválida en una corrida es un cambio", () => {
    expect(
      tasaPorReejecucion([[p("x", { a: 1 }, "a")], [p("x", null, "a")]]).cuenta,
    ).toBe(1);
    expect(
      tasaPorReejecucion([[p("x", null, "a")], [p("x", null, "a")]]),
    ).toMatchObject({ cuenta: 0, vectores_identicos: 1 });
  });

  it("exige al menos dos corridas con los mismos ítems", () => {
    expect(() => tasaPorReejecucion([[p("x", { a: 1 }, "a")]])).toThrow(
      /al menos 2/,
    );
    expect(() =>
      tasaPorReejecucion([[p("x", { a: 1 }, "a")], [p("y", { a: 1 }, "a")]]),
    ).toThrow(/mismos ítems/);
  });
});

describe("paridad ES/EN", () => {
  it("compara exactitud y Brier por idioma y cuenta en cuántos ítems eligen lo mismo", () => {
    const es = [
      p("1", { a: 0.4, b: 0.6 }, "a"), // falla
      p("2", { a: 0.8, b: 0.2 }, "a"),
      p("3", null, "b"),
    ];
    const en = [
      p("1", { a: 0.7, b: 0.3 }, "a"),
      p("2", { a: 0.9, b: 0.1 }, "a"),
      p("3", { a: 0.2, b: 0.8 }, "b"),
    ];
    const r = paridad(es, en, ["a", "b"]);
    expect(r.es.exactitud).toEqual({ n: 3, cuenta: 1, tasa: 1 / 3 });
    expect(r.en.exactitud).toEqual({ n: 3, cuenta: 3, tasa: 1 });
    // (1 − 1/3) · 100
    expect(r.diferencia_pp).toBeCloseTo(200 / 3, 10);
    // es: (0,72 + 0,08 + 2) / 3 · en: (0,18 + 0,02 + 0,08) / 3
    expect(r.es.brier).toBeCloseTo(2.8 / 3, 12);
    expect(r.en.brier).toBeCloseTo(0.28 / 3, 12);
    // solo el ítem 2 elige lo mismo; el 3 es inválido en español
    expect(r.concordancia).toEqual({ n: 3, cuenta: 1, tasa: 1 / 3 });
  });

  it("exige los mismos ítems en los dos idiomas; sin ítems no hay diferencia", () => {
    expect(() =>
      paridad([p("1", { a: 1 }, "a")], [p("2", { a: 1 }, "a")], ["a"]),
    ).toThrow(/mismos ítems/);
    expect(paridad([], [], ["a"]).diferencia_pp).toBeNull();
  });
});
