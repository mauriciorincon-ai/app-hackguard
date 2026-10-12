// La regla 9 (C18): la validación del instrumento corre antes de publicar y BLOQUEA si falla. Ninguna pantalla de la brecha
// se emite con una semilla que no responde lo que espera; el build se detiene y dice cuál.
import { describe, expect, it } from "vitest";
import { exigirInstrumentoVerde } from "../../../src/lib/brecha/mundo.ts";
import type { ComprobacionDeInstrumento } from "../../../src/engine/instrumento/cierres.ts";

const verde: ComprobacionDeInstrumento[] = [
  {
    requisito: "RF-10.3",
    sembradas: 1,
    obtenidas: 1,
    semillas: [
      { id: "RF-10.3-01", requisito: "RF-10.3", pasa: true, diferencias: [] },
    ],
  },
];

const roja: ComprobacionDeInstrumento[] = [
  {
    requisito: "E-6",
    sembradas: 2,
    obtenidas: 1,
    semillas: [
      { id: "E-6-01", requisito: "E-6", pasa: true, diferencias: [] },
      {
        id: "E-6-02",
        requisito: "E-6",
        pasa: false,
        diferencias: ["estado: se esperaba «no_ejecutada», salió «superada»"],
      },
    ],
  },
];

describe("el instrumento bloquea la publicación si una semilla falla (regla 9, C18)", () => {
  it("con todas las semillas en verde, la brecha sigue su camino", () => {
    expect(() => exigirInstrumentoVerde(verde)).not.toThrow();
  });

  it("con una semilla en rojo, se detiene y nombra la semilla y su diferencia", () => {
    expect(() => exigirInstrumentoVerde(roja)).toThrowError("E-6-02 (estado:");
    expect(() => exigirInstrumentoVerde(roja)).toThrowError(
      "nothing is published",
    );
  });
});
