// @vitest-environment node
// El texto de la tendencia para la terminal, probado directamente (el CLI lo corre en otro proceso, que la cobertura no ve): solo
// redacta lo que `armarTendencia` calculó, en los dos idiomas, y nunca esconde lo que no se pudo calcular.
import { describe, expect, it } from "vitest";
import { informeDeTendencia } from "../../../src/engine/brecha/informe-tendencia.ts";
import { armarTendencia } from "../../../src/engine/brecha/tendencia.ts";
import type { Tendencia } from "../../../src/engine/brecha/tendencia.ts";
import { entradaDemo } from "../lib/mundo-de-brecha";

const nombres = {
  control: (id: string) =>
    id === "iso42001-A.6.2.8"
      ? { es: "Registro de lo que hace", en: "Record of what it does" }
      : null,
  estadoDeControl: (id: string) => ({ es: `C:${id}`, en: `c:${id}` }),
  estadoDeHallazgo: (id: string) => ({ es: `H:${id}`, en: `h:${id}` }),
};
const t = armarTendencia(entradaDemo());

describe("informeDeTendencia", () => {
  it("en español dice la regresión, el hallazgo que movió el control y lo que la evidencia movió sola", () => {
    const s = informeDeTendencia(t, "es", nombres);
    expect(s).toContain("Tendencia de la brecha · 14 cortes");
    expect(s).toContain("con regresión (un hallazgo reabierto)");
    expect(s).toContain(
      "iso42001-A.6.2.8 · Registro de lo que hace · empeoró · REGRESIÓN",
    );
    expect(s).toContain("HZ-0011 (H:cerrado → H:reabierto)");
    expect(s).toContain("HZ-0011 (— → H:abierto)");
    expect(s).toContain("regresión: HZ-0011 se reabrió el 2026-10-01");
    expect(s).toContain(" · lo movió la evidencia, no un hallazgo");
    // Un control sin nombre en el vocabulario sale solo con su id, sin «· null».
    expect(s).not.toContain("null");
    expect(s.endsWith("\n")).toBe(true);
  });

  it("en inglés dice lo mismo con sus palabras", () => {
    const s = informeDeTendencia(t, "en", nombres);
    expect(s).toContain("Gap trend · 14 cut-offs");
    expect(s).toContain("with a regression (a reopened finding)");
    expect(s).toContain(
      "iso42001-A.6.2.8 · Record of what it does · got worse · REGRESSION",
    );
    expect(s).toContain("regression: HZ-0011 was reopened on 2026-10-01");
    expect(s).toContain(" · moved by evidence, not by a finding");
  });

  it("un hallazgo que desaparece entre dos cortes se escribe con «—», y lo que no se pudo calcular se dice", () => {
    const base = t.controles.find((c) => c.id === "iso42001-A.6.2.8")!;
    const movimiento = base.movimientos[0]!;
    const con: Tendencia = {
      ...t,
      problemas: ["2026-03-21: algo no cuadra"],
      controles: [
        {
          ...base,
          movimientos: [
            {
              ...movimiento,
              hallazgos: [{ id: "HZ-0042", de: "abierto", a: null }],
            },
          ],
          regresiones: [],
        },
      ],
    };
    const es = informeDeTendencia(con, "es", nombres);
    expect(es).toContain("HZ-0042 (H:abierto → —)");
    expect(es).not.toContain("REGRESIÓN");
    expect(es).toContain(
      "No se pudo calcular en algún corte (no se esconde): 2026-03-21: algo no cuadra",
    );
    expect(informeDeTendencia(con, "en", nombres)).toContain(
      "Could not be calculated at some cut-off (not hidden): 2026-03-21: algo no cuadra",
    );
  });
});
