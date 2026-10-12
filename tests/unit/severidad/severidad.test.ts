// @vitest-environment node
// La severidad calculada y explicada: CVSS para software y la tabla de prioridad de IA para las otras familias.
// Los cuatro hallazgos de la maqueta aprobada son el oráculo: alto, alto, medio y medio.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EscalaIa } from "../../../src/engine/severidad/escala-ia.ts";
import { calcularSeveridad } from "../../../src/engine/severidad/severidad.ts";

const ESCALA = EscalaIa.parse(
  JSON.parse(readFileSync("datos/severidad/escala-ia.json", "utf8")),
);
const ia = (impacto: number, alcance: number, detectabilidad: number) =>
  ({ tipo: "escala_ia", impacto, alcance, detectabilidad }) as const;

describe("hallazgos de IA", () => {
  it.each([
    ["HZ-0003 · 6 de 20", ia(3, 2, 3), 6, 20, "alto", 3],
    ["HZ-0007 · 42 de 116", ia(3, 2, 3), 42, 116, "alto", 3],
    ["HZ-0005 · 2 de 20", ia(2, 1, 2), 2, 20, "medio", 2],
  ] as const)("%s da %s", (_n, entrada, fallidas, evaluadas, nivel, banda) => {
    const r = calcularSeveridad(entrada, { evaluadas, fallidas }, ESCALA);
    expect(r.ok).toBe(true);
    if (!r.ok || r.severidad.metodo !== "escala_ia") return;
    expect(r.severidad.nivel).toBe(nivel);
    expect(r.severidad.banda).toBe(banda);
    expect(r.severidad.frecuencia).toMatchObject({ fallidas, evaluadas, deConteo: true });
    expect(r.severidad.referencia).toBe("escala-ia@1");
  });
  it("el impacto manda: con la misma frecuencia, más impacto no da menos nivel", () => {
    const niveles = [1, 2, 3, 4].map((i) => {
      const r = calcularSeveridad(ia(i, 1, 1), { evaluadas: 20, fallidas: 6 }, ESCALA);
      return r.ok ? r.severidad.nivel : null;
    });
    expect(niveles).toEqual(["medio", "medio", "alto", "critico"]);
  });
  it("alcance y detectabilidad no cambian el nivel", () => {
    const resultados = [1, 2, 3, 4].map((x) => {
      const r = calcularSeveridad(ia(3, x, 5 - x), { evaluadas: 20, fallidas: 6 }, ESCALA);
      return r.ok ? r.severidad.nivel : null;
    });
    expect(new Set(resultados)).toEqual(new Set(["alto"]));
  });
  it("sin conteo cae en la banda más alta, y la severidad lo dice", () => {
    const r = calcularSeveridad(ia(2, 1, 1), { evaluadas: null, fallidas: null }, ESCALA);
    expect(r.ok && r.severidad.metodo === "escala_ia" && r.severidad.frecuencia.deConteo).toBe(false);
    expect(r.ok && r.severidad.nivel).toBe("alto");
  });
  it("un impacto que la escala no tiene no se calcula", () => {
    const corta = structuredClone(ESCALA);
    corta.tabla = corta.tabla.filter((f) => f.impacto !== 4);
    const r = calcularSeveridad(ia(4, 1, 1), { evaluadas: 20, fallidas: 6 }, corta);
    expect(r).toEqual({ ok: false, motivo: "impacto_fuera_de_escala", detalle: "4" });
  });
});

describe("hallazgos de software", () => {
  const VECTOR = "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N";
  it("HZ-0009 da 5.1, medio, con la referencia fijada y el vector completo", () => {
    const r = calcularSeveridad({ tipo: "cvss", vector: VECTOR }, { evaluadas: null, fallidas: null }, ESCALA);
    expect(r.ok).toBe(true);
    if (!r.ok || r.severidad.metodo !== "cvss") return;
    expect(r.severidad).toMatchObject({
      nivel: "medio",
      puntaje: 5.1,
      vector: VECTOR,
      referencia: "FIRSTdotorg/cvss-v4-calculator@c5b0d40",
    });
    expect(r.severidad.metricas).toHaveLength(11);
  });
  it("un vector truncado no se puntúa: sale el motivo, no un número", () => {
    const r = calcularSeveridad({ tipo: "cvss", vector: "CVSS:4.0/AV:N" }, { evaluadas: null, fallidas: null }, ESCALA);
    expect(r).toEqual({ ok: false, motivo: "base_incompleta", detalle: "AC, AT, PR, UI, VC, VI, VA, SC, SI, SA" });
  });
});
