// Gate de la ESCALA DE PRIORIDAD DE IA de la maqueta (auditoría de cierre, A2): la escala es dato (reglas 7
// y 10) y la ficha de hallazgo la dibuja entera desde ahí, con su piso y su techo. Este gate comprueba que
// lo que la pantalla afirma de la tabla es cierto en la tabla: una casilla por banda de frecuencia, un
// nivel que nunca baja cuando sube la frecuencia o el impacto, y el piso y el techo declarados en los datos
// cumplidos en su fila.
import { describe, expect, it } from "vitest";
import { ESCALA_IA } from "../../scripts/maqueta/datos/mundo.mjs";

const RANGO = ["informativo", "bajo", "medio", "alto", "critico"];
function rango(nivel: string) {
  const i = RANGO.indexOf(nivel);
  if (i === -1) throw new Error(`nivel desconocido en la tabla: «${nivel}»`);
  return i;
}

const tabla = ESCALA_IA.tabla as Record<string, string[]>;
const impactos = Object.keys(tabla)
  .map(Number)
  .sort((a, b) => a - b);
const limites = ESCALA_IA.limites as {
  impacto: number;
  tipo: "piso" | "techo";
  nivel: string;
}[];

describe("maqueta: la tabla de prioridad de IA cumple lo que la pantalla dice de ella", () => {
  it("cada fila tiene una casilla por banda de frecuencia", () => {
    for (const impacto of impactos)
      expect(tabla[impacto].length, `impacto ${impacto}`).toBe(
        ESCALA_IA.facilidad.length,
      );
  });

  it("el nivel nunca baja cuando sube la frecuencia", () => {
    for (const impacto of impactos) {
      const fila = tabla[impacto];
      for (let i = 1; i < fila.length; i++)
        expect(
          rango(fila[i]),
          `impacto ${impacto}: «${fila[i]}» después de «${fila[i - 1]}»`,
        ).toBeGreaterThanOrEqual(rango(fila[i - 1]));
    }
  });

  it("el nivel nunca baja cuando sube el impacto", () => {
    for (let j = 1; j < impactos.length; j++)
      for (let i = 0; i < ESCALA_IA.facilidad.length; i++)
        expect(
          rango(tabla[impactos[j]][i]),
          `banda ${i + 1}: impacto ${impactos[j]} por debajo de impacto ${impactos[j - 1]}`,
        ).toBeGreaterThanOrEqual(rango(tabla[impactos[j - 1]][i]));
  });

  it("el piso y el techo de los datos se cumplen en su fila", () => {
    expect(limites.length).toBeGreaterThan(0);
    for (const l of limites) {
      expect(
        impactos,
        `el ${l.tipo} nombra un impacto que no está en la tabla`,
      ).toContain(l.impacto);
      for (const nivel of tabla[l.impacto]) {
        const cumple =
          l.tipo === "piso"
            ? rango(nivel) >= rango(l.nivel)
            : rango(nivel) <= rango(l.nivel);
        expect(
          cumple,
          `impacto ${l.impacto}: «${nivel}» rompe el ${l.tipo} («${l.nivel}»)`,
        ).toBe(true);
      }
    }
  });
});
