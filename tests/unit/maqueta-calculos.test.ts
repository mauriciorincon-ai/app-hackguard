// Gate de los CÁLCULOS de la maqueta que ninguna pantalla de hoy pone a prueba (auditoría de cierre, M8,
// M9 y M10): los datos sintéticos no tienen el caso, así que el gate de envejecimiento y el de la brecha,
// que leen las páginas, no lo verían. Aquí cada regla se prueba con su caso armado a mano.
import { describe, expect, it } from "vitest";
import umbrales from "../../scripts/maqueta/datos/umbrales.json";
import {
  estaCerrado,
  huellaDe,
  vistaPorControl,
} from "../../scripts/maqueta/nucleo/calculos.mjs";

const CONSULTA = "2026-10-03";

describe("maqueta: la huella de un registro es la de todo su contenido", () => {
  it("lo anidado cuenta: dos sobres que solo difieren dentro de un campo dan huellas distintas", () => {
    const sobre = {
      id: "SOB-X",
      razon: { es: "Sin alertas.", en: "No alerts." },
    };
    const otro = {
      id: "SOB-X",
      razon: { es: "Una alerta.", en: "One alert." },
    };
    expect(huellaDe(sobre)).not.toBe(huellaDe(otro));
  });

  it("el orden de las claves no cuenta, en ningún nivel", () => {
    expect(huellaDe({ a: 1, b: { c: 1, d: [1, 2] } })).toBe(
      huellaDe({ b: { d: [1, 2], c: 1 }, a: 1 }),
    );
  });

  it("el orden dentro de una lista sí cuenta", () => {
    expect(huellaDe({ a: [1, 2] })).not.toBe(huellaDe({ a: [2, 1] }));
  });
});

describe("maqueta: un «no detectado» nunca es evidencia de un control (E-6)", () => {
  it("un control cuyo único sobre es «no ejecutada» queda sin evidencia, no con evidencia vigente", () => {
    const vista = vistaPorControl(
      {
        pruebas: [{ id: "PR-X" }],
        sobres: [
          { prueba: "PR-X", fecha: "2026-09-25", veredicto: "no_ejecutada" },
        ],
        hallazgos: [],
      },
      CONSULTA,
      umbrales,
    );
    expect(vista.filas[0].estado, "la fila de la prueba").toBe("sin_evidencia");
    expect(vista.estado, "el control").toBe("sin_evidencia");
  });
});

describe("maqueta: aceptar el riesgo no cierra un hallazgo", () => {
  it("solo «cerrado» está cerrado; el riesgo aceptado sigue siendo falla de su control", () => {
    expect(estaCerrado({ estado: "cerrado" })).toBe(true);
    for (const estado of [
      "abierto",
      "corregido",
      "re_probado",
      "aceptado_con_riesgo",
    ])
      expect(estaCerrado({ estado }), estado).toBe(false);
  });

  it("el hallazgo con el riesgo aceptado sigue abierto en la fila de su control", () => {
    const vista = vistaPorControl(
      {
        pruebas: [{ id: "PR-X" }],
        sobres: [{ prueba: "PR-X", fecha: "2026-09-25", veredicto: "fallida" }],
        hallazgos: [
          { id: "HZ-X", prueba: "PR-X", estado: "aceptado_con_riesgo" },
        ],
      },
      CONSULTA,
      umbrales,
    );
    expect(vista.filas[0].abierto?.id).toBe("HZ-X");
    expect(vista.estado).toBe("con_fallas");
  });
});
