// @vitest-environment node
// La situación de un hallazgo en una fecha: estado, severidad, plazo y revisión del riesgo salen de UNA función.
import { describe, expect, it } from "vitest";
import type { Hallazgo } from "../../../src/engine/hallazgos/esquemas.ts";
import { situacionDeHallazgo } from "../../../src/engine/hallazgos/situacion.ts";
import { copia, mundo } from "../evidencia/ayuda.ts";

async function en(id: string, fecha: string, cambios: (h: Hallazgo) => void = () => {}) {
  const m = await mundo();
  const h = copia(m.hallazgos[id]!);
  cambios(h);
  return situacionDeHallazgo(h, Object.values(m.sobres), { escala: m.escala, plazos: m.plazos, fecha });
}

describe("los cuatro hallazgos de la demo", () => {
  it.each([
    ["HZ-0007", "abierto", "alto", "vencido"],
    ["HZ-0009", "corregido", "medio", "en_plazo"],
    ["HZ-0005", "aceptado_con_riesgo", "medio", "no_corre"],
    ["HZ-0003", "cerrado", "alto", "no_corre"],
  ])("%s: %s, %s, plazo %s al 2026-10-11", async (id, estado, nivel, plazo) => {
    const r = await en(id, "2026-10-11");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.situacion.evaluacion.estado).toBe(estado);
    expect(r.situacion.severidad.nivel).toBe(nivel);
    expect(r.situacion.plazo.estado).toBe(plazo);
  });
  it("solo el riesgo aceptado tiene revisión", async () => {
    const aceptado = await en("HZ-0005", "2026-10-11");
    const abierto = await en("HZ-0007", "2026-10-11");
    expect(aceptado.ok && aceptado.situacion.revision).toMatchObject({ estado: "programada", fecha: "2026-11-30" });
    expect(abierto.ok && abierto.situacion.revision).toBeNull();
  });
  it("las fechas en que algo cambia: vence HZ-0007, vence HZ-0009 y toca revisar HZ-0005", async () => {
    const plazo = async (id: string, f: string) => {
      const r = await en(id, f);
      return r.ok ? r.situacion.plazo.estado : r.motivo;
    };
    expect(await plazo("HZ-0007", "2026-09-16")).toBe("en_plazo");
    expect(await plazo("HZ-0007", "2026-09-17")).toBe("vencido");
    expect(await plazo("HZ-0009", "2026-12-04")).toBe("en_plazo");
    expect(await plazo("HZ-0009", "2026-12-05")).toBe("vencido");
    const revision = async (f: string) => {
      const r = await en("HZ-0005", f);
      return r.ok ? r.situacion.revision?.estado : r.motivo;
    };
    expect(await revision("2026-11-29")).toBe("programada");
    expect(await revision("2026-11-30")).toBe("toca_revisar");
  });
});

describe("lo que no se puede situar", () => {
  it("una fecha anterior a la apertura o a la aceptación no es una evaluación", async () => {
    const a = await en("HZ-0007", "2026-08-16");
    expect(a).toMatchObject({ ok: false, motivo: "fecha_anterior_a_la_apertura" });
    const b = await en("HZ-0005", "2026-08-19"); // el sobre se confirmó el 2026-08-20
    expect(b).toMatchObject({ ok: false, motivo: "fecha_anterior_a_la_apertura" });
    const c = await en("HZ-0005", "2026-08-31"); // y el riesgo se aceptó el 2026-09-01
    expect(c).toMatchObject({ ok: false, motivo: "fecha_anterior_a_la_aceptacion" });
  });
  it("un sobre de origen que no existe o no está confirmado", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    const datos = { escala: m.escala, plazos: m.plazos, fecha: "2026-10-11" };
    const otro = { ...copia(m.hallazgos["HZ-0007"]!), sobre_origen: "SOB-9999" };
    expect(situacionDeHallazgo(otro, libro, datos)).toMatchObject({ ok: false, motivo: "sobre_origen_inexistente" });
    const sinConfirmar = { ...copia(m.hallazgos["HZ-0007"]!), sobre_origen: "SOB-0036" };
    expect(situacionDeHallazgo(sinConfirmar, libro, datos)).toMatchObject({ ok: false, motivo: "sobre_origen_sin_confirmar" });
  });
  it("una severidad que no se puede calcular dice por qué", async () => {
    const vector = await en("HZ-0009", "2026-10-11", (h) => {
      h.severidad = { tipo: "cvss", vector: "CVSS:4.0/AV:N" };
    });
    expect(vector).toMatchObject({ ok: false, motivo: "base_incompleta" });
    const impacto = await en("HZ-0007", "2026-10-11", (h) => {
      h.severidad = { tipo: "escala_ia", impacto: 9 as never, alcance: 1, detectabilidad: 1 };
    });
    expect(impacto).toMatchObject({ ok: false, motivo: "impacto_fuera_de_escala" });
  });
});
