// @vitest-environment node
// Plazos y revisión del riesgo aceptado: datos en `datos/hallazgos/plazos.json`, fecha como entrada, límites exactos.
import { describe, expect, it } from "vitest";
import { ESTADOS_DE_HALLAZGO, NIVELES_DE_SEVERIDAD, Plazos } from "../../../src/engine/hallazgos/esquemas.ts";
import { plazoDe, revisionDeRiesgo } from "../../../src/engine/hallazgos/plazo.ts";
import { copia, mundo } from "../evidencia/ayuda.ts";

describe("los plazos son datos", () => {
  it("critico 7 · alto 30 · medio 90; bajo e informativo no tienen plazo", async () => {
    const m = await mundo();
    expect(m.plazos.dias).toEqual({ critico: 7, alto: 30, medio: 90, bajo: null, informativo: null });
  });
  it("el esquema es estricto: una severidad de más o de menos no pasa", async () => {
    const m = await mundo();
    const d = copia(m.plazos);
    expect(Plazos.safeParse(d).success).toBe(true);
    expect(Plazos.safeParse({ ...d, dias: { ...d.dias, grave: 3 } }).success).toBe(false);
    expect(Plazos.safeParse({ ...d, dias: { critico: 7, alto: 30, medio: 90, bajo: null } }).success).toBe(false);
    expect(Plazos.safeParse({ ...d, dias: { ...d.dias, alto: 0 } }).success).toBe(false);
  });
});

describe("plazoDe", () => {
  it("el último día del plazo todavía está en plazo; el siguiente, vencido con 1 día de atraso", async () => {
    const m = await mundo();
    // alto = 30 días desde el 2026-08-17: vence el 2026-09-16.
    const ultimo = plazoDe("alto", "abierto", "2026-08-17", "2026-09-16", m.plazos);
    expect(ultimo).toEqual({ estado: "en_plazo", total: 30, dias: 30, vence: "2026-09-16", atraso: 0 });
    const siguiente = plazoDe("alto", "abierto", "2026-08-17", "2026-09-17", m.plazos);
    expect(siguiente).toEqual({ estado: "vencido", total: 30, dias: 31, vence: "2026-09-16", atraso: 1 });
  });

  it("el día de la apertura son 0 días y está en plazo", async () => {
    const m = await mundo();
    expect(plazoDe("critico", "abierto", "2026-10-01", "2026-10-01", m.plazos)).toMatchObject({ estado: "en_plazo", dias: 0, atraso: 0, vence: "2026-10-08" });
  });

  it("el atraso de HZ-0007 a la fecha de consulta de la maqueta son 17 días", async () => {
    const m = await mundo();
    expect(plazoDe("alto", "abierto", "2026-08-17", "2026-10-03", m.plazos)).toMatchObject({ estado: "vencido", dias: 47, atraso: 17 });
  });

  it("corre en abierto, corregido y re_probado; en los demás estados ya no corre", async () => {
    const m = await mundo();
    for (const e of ESTADOS_DE_HALLAZGO) {
      const p = plazoDe("alto", e, "2026-08-17", "2026-10-03", m.plazos);
      if (["abierto", "corregido", "re_probado"].includes(e)) expect(p.estado, e).toBe("vencido");
      else expect(p, e).toEqual({ estado: "no_corre", total: 30, dias: 47, vence: null, atraso: 0 });
    }
  });

  it("bajo e informativo no tienen plazo, por mucho que pasen los días", async () => {
    const m = await mundo();
    for (const n of ["bajo", "informativo"] as const)
      expect(plazoDe(n, "abierto", "2026-01-01", "2026-12-31", m.plazos)).toMatchObject({ estado: "sin_plazo", total: null, vence: null, atraso: 0 });
  });

  it("una fecha anterior a la apertura es un error, no un plazo negativo", async () => {
    const m = await mundo();
    expect(() => plazoDe("alto", "abierto", "2026-08-17", "2026-08-16", m.plazos)).toThrow(RangeError);
  });

  it("todas las severidades tienen su entrada en los datos", async () => {
    const m = await mundo();
    expect(Object.keys(m.plazos.dias).sort()).toEqual([...NIVELES_DE_SEVERIDAD].sort());
  });
});

describe("revisionDeRiesgo", () => {
  it("antes del día de la revisión está programada; el día mismo, toca revisar", () => {
    expect(revisionDeRiesgo("2026-09-01", 90, "2026-11-29")).toEqual({ estado: "programada", dias: 89, total: 90, fecha: "2026-11-30" });
    expect(revisionDeRiesgo("2026-09-01", 90, "2026-11-30")).toEqual({ estado: "toca_revisar", dias: 90, total: 90, fecha: "2026-11-30" });
    expect(revisionDeRiesgo("2026-09-01", 90, "2027-03-01").estado).toBe("toca_revisar");
  });
  it("una fecha anterior a la aceptación es un error", () => {
    expect(() => revisionDeRiesgo("2026-09-01", 90, "2026-08-31")).toThrow(RangeError);
  });
});
