// @vitest-environment node
// C1 a C5 del plan v2 como reglas sobre las trazas: en verde con las corridas demo, y en rojo, nombrando la propuesta, cuando se rompe
// la señal que cada una vigila.
import { describe, expect, it } from "vitest";
import {
  evaluarCriterios,
  IDS_DE_CRITERIOS,
} from "../../../src/engine/propuestas/traza.ts";
import type { Senales } from "../../../src/engine/propuestas/esquemas.ts";
import { copia, ctx, propuestas } from "./ayuda.ts";

const U3 = ctx.umbrales.antiguedad_marco_dias;
const entradas = () =>
  propuestas.map((p) => ({ id: p.id, senales: copia(p.senales) }));
const criterio = (
  lista: ReturnType<typeof evaluarCriterios>,
  id: (typeof IDS_DE_CRITERIOS)[number],
) => lista.find((c) => c.id === id)!;
const con = (id: string, cambios: Partial<Senales>) => {
  const e = entradas();
  const x = e.find((p) => p.id === id)!;
  Object.assign(x.senales, cambios);
  return e;
};

describe("los cinco criterios, sobre las trazas de las corridas demo", () => {
  const evaluados = evaluarCriterios(entradas(), U3);
  it("salen C1 a C5, en orden", () => {
    expect(evaluados.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4", "C5"]);
  });
  it("todos se cumplen con las siete propuestas demo", () => {
    for (const c of evaluados) expect(c.cumple, c.id).toBe(true);
  });
  it("C1 mira a las siete; C2 solo al extractor; C3 a las pruebas nuevas", () => {
    expect(criterio(evaluados, "C1").poblacion).toBe(7);
    expect(criterio(evaluados, "C2").poblacion).toBe(2);
    expect(criterio(evaluados, "C3").poblacion).toBe(3);
  });
  it("C3 es una tasa: 100 % de las pruebas nuevas llega atada a un control", () => {
    expect(criterio(evaluados, "C3").tasa).toEqual({
      obtenida: 1,
      minima: 0.8,
    });
  });
  it("C4 no tiene población: el investigador y el extractor no cierran hallazgos", () => {
    expect(criterio(evaluados, "C4").poblacion).toBe(0);
  });
  it("C5 mira a la prueba cuyo marco supera los 180 días y la encuentra marcada", () => {
    const c5 = criterio(evaluados, "C5");
    expect(c5.poblacion).toBeGreaterThanOrEqual(1);
    expect(c5.incumplen).toEqual([]);
  });
});

describe("cada criterio se pone en rojo cuando se rompe su señal", () => {
  it("C1 · una cita sin verificar que llega sin marca", () => {
    const c = criterio(
      evaluarCriterios(
        con("PROP-0033", { citas_sin_verificar: 1, pausa_humana: false }),
        U3,
      ),
      "C1",
    );
    expect(c.cumple).toBe(false);
    expect(c.incumplen).toEqual(["PROP-0033"]);
    expect(c.riesgo).toBe("R1");
  });
  it("C2 · un veredicto que no salió de la regla", () => {
    const c = criterio(
      evaluarCriterios(con("PROP-0036", { veredicto_por_regla: false }), U3),
      "C2",
    );
    expect(c.cumple).toBe(false);
    expect(c.incumplen).toEqual(["PROP-0036"]);
    expect(c.riesgo).toBe("R2");
  });
  it("C3 · por debajo del 80 % de pruebas nuevas atadas a un control", () => {
    const e = entradas();
    for (const id of ["PROP-0031", "PROP-0033"])
      e.find((p) => p.id === id)!.senales.control_asociado = false;
    const c = criterio(evaluarCriterios(e, U3), "C3");
    expect(c.cumple).toBe(false);
    expect(c.incumplen).toEqual(["PROP-0031", "PROP-0033"]);
    expect(c.tasa?.obtenida).toBeCloseTo(1 / 3, 5);
  });
  it("C3 · sin pruebas nuevas la tasa es 1 y se cumple", () => {
    const c = criterio(evaluarCriterios([], U3), "C3");
    expect(c.cumple).toBe(true);
    expect(c.poblacion).toBe(0);
  });
  it("C4 · un hallazgo cerrado sin re-prueba", () => {
    const c = criterio(
      evaluarCriterios(
        con("PROP-0031", { hallazgo_cerrado: true, reprueba_hecha: false }),
        U3,
      ),
      "C4",
    );
    expect(c.cumple).toBe(false);
    expect(c.incumplen).toEqual(["PROP-0031"]);
    expect(c.riesgo).toBe("R4");
  });
  it("C4 · cerrado con re-prueba hecha se cumple", () => {
    const c = criterio(
      evaluarCriterios(
        con("PROP-0031", { hallazgo_cerrado: true, reprueba_hecha: true }),
        U3,
      ),
      "C4",
    );
    expect(c.cumple).toBe(true);
    expect(c.poblacion).toBe(1);
  });
  it("C5 · un marco de más de 180 días que llega sin pasar por una persona", () => {
    const c = criterio(
      evaluarCriterios(
        con("PROP-0031", { antiguedad_marco_dias: 181, pausa_humana: false }),
        U3,
      ),
      "C5",
    );
    expect(c.cumple).toBe(false);
    expect(c.incumplen).toContain("PROP-0031");
    expect(c.riesgo).toBe("R3");
  });
  it("C5 · a 180 días exactos no entra en la población", () => {
    const sin = criterio(
      evaluarCriterios(
        con("PROP-0031", { antiguedad_marco_dias: 180, pausa_humana: false }),
        U3,
      ),
      "C5",
    );
    expect(sin.incumplen).not.toContain("PROP-0031");
  });
});

describe("las 17 señales", () => {
  it("cada propuesta trae exactamente las mismas claves", () => {
    const claves = Object.keys(propuestas[0]!.senales).sort();
    expect(claves).toHaveLength(17);
    for (const p of propuestas)
      expect(Object.keys(p.senales).sort(), p.id).toEqual(claves);
  });
  it("«pausa_humana» es verdad exactamente cuando la propuesta trae pausa", () => {
    for (const p of propuestas)
      expect(p.senales.pausa_humana, p.id).toBe(p.pausa !== null);
  });
  it("el recorrido de nodos termina en «pausa_humana» solo si hubo pausa", () => {
    for (const p of propuestas) {
      const nodos = p.senales.nodos_visitados;
      expect(nodos.includes("pausa_humana"), p.id).toBe(p.pausa !== null);
    }
  });
});
