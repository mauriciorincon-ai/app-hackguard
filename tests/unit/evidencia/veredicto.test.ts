// @vitest-environment node
// El veredicto lo calcula la regla de la prueba con lo que la herramienta midió: ni una persona que "ve el
// resultado" ni un modelo (reglas duras 1, 2 y 6). Cada regla, en sus límites; y la garantía de E-6/E-7.
import { describe, expect, it } from "vitest";
import type { Resultado } from "../../../src/engine/evidencia/esquemas.ts";
import {
  calcularVeredicto,
  cotaDeFalla,
} from "../../../src/engine/evidencia/veredicto.ts";

const r = (c: Partial<Resultado> = {}): Resultado => ({
  ejecutada: true,
  evaluadas: null,
  fallidas: null,
  alertas: null,
  metrica: null,
  ...c,
});
const calculado = (veredicto: string) => ({ tipo: "calculado", veredicto });
const metrica = (
  valor: number,
  umbral: number,
  sentido: "maximo" | "minimo",
) => ({
  nombre: { es: "m", en: "m" },
  valor,
  umbral,
  sentido,
});

describe("asimetrica_k: una falla reproducible falla; cero fallas exige haber evaluado al menos k", () => {
  it("una sola falla da «fallida», aunque haya mil evaluadas", () => {
    expect(
      calcularVeredicto(
        "asimetrica_k",
        r({ evaluadas: 1000, fallidas: 1 }),
        20,
      ),
    ).toEqual(calculado("fallida"));
  });
  it("cero fallas en k da «superada»", () => {
    expect(
      calcularVeredicto("asimetrica_k", r({ evaluadas: 20, fallidas: 0 }), 20),
    ).toEqual(calculado("superada"));
  });
  it("cero fallas en más de k también", () => {
    expect(
      calcularVeredicto("asimetrica_k", r({ evaluadas: 116, fallidas: 0 }), 20),
    ).toEqual(calculado("superada"));
  });
  it("cero fallas en k-1 NO es «superada»: es «parcial» (la cota 3/k no vale)", () => {
    expect(
      calcularVeredicto("asimetrica_k", r({ evaluadas: 19, fallidas: 0 }), 20),
    ).toEqual(calculado("parcial"));
  });
  it("sin k, o sin conteos, no hay veredicto: es un error de datos, no un «superada»", () => {
    expect(
      calcularVeredicto(
        "asimetrica_k",
        r({ evaluadas: 20, fallidas: 0 }),
        null,
      ),
    ).toEqual({ tipo: "error", motivo: "falta_k" });
    expect(
      calcularVeredicto(
        "asimetrica_k",
        r({ evaluadas: null, fallidas: 0 }),
        20,
      ),
    ).toEqual({ tipo: "error", motivo: "faltan_conteos" });
    expect(
      calcularVeredicto(
        "asimetrica_k",
        r({ evaluadas: 20, fallidas: null }),
        20,
      ),
    ).toEqual({ tipo: "error", motivo: "faltan_conteos" });
  });
});

describe("comprobacion_determinista: una alerta o una falla bastan", () => {
  it("cualquiera de los dos conteos que diga «falló» manda: alertas = 0 con fallidas = 3 NO es superada (S5-8)", () => {
    expect(
      calcularVeredicto(
        "comprobacion_determinista",
        r({ alertas: 0, fallidas: 3 }),
        null,
      ),
    ).toEqual(calculado("fallida"));
    expect(
      calcularVeredicto(
        "comprobacion_determinista",
        r({ alertas: 2, fallidas: 0 }),
        null,
      ),
    ).toEqual(calculado("fallida"));
    expect(
      calcularVeredicto(
        "comprobacion_determinista",
        r({ alertas: 0, fallidas: 0 }),
        null,
      ),
    ).toEqual(calculado("superada"));
  });
  it("alertas > 0 → fallida; 0 → superada", () => {
    expect(
      calcularVeredicto("comprobacion_determinista", r({ alertas: 1 }), null),
    ).toEqual(calculado("fallida"));
    expect(
      calcularVeredicto("comprobacion_determinista", r({ alertas: 0 }), null),
    ).toEqual(calculado("superada"));
  });
  it("sin alertas usa las fallidas", () => {
    expect(
      calcularVeredicto("comprobacion_determinista", r({ fallidas: 2 }), null),
    ).toEqual(calculado("fallida"));
    expect(
      calcularVeredicto("comprobacion_determinista", r({ fallidas: 0 }), null),
    ).toEqual(calculado("superada"));
  });
  it("sin ninguno de los dos no hay veredicto", () => {
    expect(calcularVeredicto("comprobacion_determinista", r(), null)).toEqual({
      tipo: "error",
      motivo: "faltan_conteos",
    });
  });
});

describe("metrica_con_umbral: la métrica contra el umbral fijado antes de la prueba", () => {
  it("máximo: en el umbral exacto cumple; un poco más, no", () => {
    expect(
      calcularVeredicto(
        "metrica_con_umbral",
        r({ metrica: metrica(0.05, 0.05, "maximo") }),
        5,
      ),
    ).toEqual(calculado("superada"));
    expect(
      calcularVeredicto(
        "metrica_con_umbral",
        r({ metrica: metrica(0.0500001, 0.05, "maximo") }),
        5,
      ),
    ).toEqual(calculado("fallida"));
  });
  it("mínimo: en el umbral exacto cumple; un poco menos, no", () => {
    expect(
      calcularVeredicto(
        "metrica_con_umbral",
        r({ metrica: metrica(0.9, 0.9, "minimo") }),
        5,
      ),
    ).toEqual(calculado("superada"));
    expect(
      calcularVeredicto(
        "metrica_con_umbral",
        r({ metrica: metrica(0.89, 0.9, "minimo") }),
        5,
      ),
    ).toEqual(calculado("fallida"));
  });
  it("sin métrica no hay veredicto", () => {
    expect(calcularVeredicto("metrica_con_umbral", r(), 5)).toEqual({
      tipo: "error",
      motivo: "falta_metrica",
    });
  });
});

describe("revision_de_diseno: no hay conteo que decida; lo declara una persona", () => {
  it("se declara", () => {
    expect(calcularVeredicto("revision_de_diseno", r(), null)).toEqual({
      tipo: "declarado",
    });
  });
});

describe("sin constancia de ejecución, nunca «superada» (E-6/E-7)", () => {
  it.each([
    ["asimetrica_k", r({ ejecutada: false, evaluadas: 20, fallidas: 0 }), 20],
    ["comprobacion_determinista", r({ ejecutada: false, alertas: 0 }), null],
    [
      "metrica_con_umbral",
      r({ ejecutada: false, metrica: metrica(0, 1, "maximo") }),
      5,
    ],
    ["revision_de_diseno", r({ ejecutada: false }), null],
  ] as const)(
    "%s: ejecutada = false → no_ejecutada, aunque todo lo demás sea «limpio»",
    (regla, resultado, k) => {
      expect(calcularVeredicto(regla, resultado, k)).toEqual(
        calculado("no_ejecutada"),
      );
    },
  );
  it("tampoco una falla sin constancia de ejecución cuenta como «fallida»", () => {
    expect(
      calcularVeredicto(
        "asimetrica_k",
        r({ ejecutada: false, evaluadas: 20, fallidas: 5 }),
        20,
      ),
    ).toEqual(calculado("no_ejecutada"));
  });
});

it("una regla que el catálogo no conoce es un error, no un veredicto", () => {
  expect(
    calcularVeredicto("inventada", r({ evaluadas: 20, fallidas: 0 }), 20),
  ).toEqual({ tipo: "error", motivo: "regla_desconocida" });
});

describe("cotaDeFalla (regla del tres)", () => {
  it.each([
    [20, 15],
    [116, 3],
    [30, 10],
    [3, 100],
    [1, 100],
    [2, 100],
    [100, 3],
  ])("con k = %i la cota es %i %%", (k, cota) => {
    expect(cotaDeFalla(k)).toBe(cota);
  });
});
