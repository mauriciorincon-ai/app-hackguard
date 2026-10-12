// @vitest-environment node
// La salida de los comandos del libro, en los dos idiomas y en JSON: el estado se lee por símbolo y palabra.
import { describe, expect, it } from "vitest";
import {
  CODIGOS_DEL_LIBRO,
  codigoDeValidacion,
  detalleDeSeveridad,
  informeDeHallazgos,
  informeDeValidacion,
  salidaJsonDeHallazgos,
  type FilaDeListadoDeHallazgo,
} from "../../../src/engine/evidencia/informe.ts";
import { situacionDeHallazgo } from "../../../src/engine/hallazgos/situacion.ts";
import { mundo } from "./ayuda.ts";

const hallazgo = {
  regla: "sobre/plan-no-cuadra" as const,
  severidad: "error" as const,
  ruta: "datos/evidencia/demo/SOB-0012.json",
  campo: "plan.huella",
  nombre: { es: "No cuadra", en: "Does not match" },
  detalle: { es: "detalle es", en: "detail en" },
};

it("los códigos de salida son los de los otros CLI", () => {
  expect(CODIGOS_DEL_LIBRO).toEqual({ ok: 0, con_advertencias: 1, invalido: 2, bloqueado: 2, uso: 3 });
  expect(codigoDeValidacion("ok")).toBe(0);
  expect(codigoDeValidacion("con_advertencias")).toBe(1);
  expect(codigoDeValidacion("invalido")).toBe(2);
});

describe("informeDeValidacion", () => {
  it("agrupa por severidad, con la ruta, el campo y el detalle, en español", () => {
    const t = informeDeValidacion({ es: "Sobres", en: "Envelopes" }, "invalido", { es: "1 sobre", en: "1 envelope" }, [
      hallazgo,
      { ...hallazgo, severidad: "advertencia", detalle: null },
      { ...hallazgo, severidad: "nota", campo: "" },
    ], "es");
    expect(t).toContain("Sobres: inválido");
    expect(t).toContain("Errores (1)");
    expect(t).toContain("Advertencias (1)");
    expect(t).toContain("Notas (1)");
    expect(t).toContain("✗ No cuadra");
    expect(t).toContain("datos/evidencia/demo/SOB-0012.json · plan.huella");
    expect(t).toContain("detalle es");
  });

  it("y en inglés", () => {
    const t = informeDeValidacion({ es: "Sobres", en: "Envelopes" }, "con_advertencias", { es: "x", en: "1 envelope" }, [hallazgo], "en");
    expect(t).toContain("Envelopes: with warnings");
    expect(t).toContain("Errors (1)");
    expect(t).toContain("detail en");
  });

  it("sin hallazgos solo dice el estado y la cuenta", () => {
    expect(informeDeValidacion({ es: "Sobres", en: "Envelopes" }, "ok", { es: "0 sobres", en: "0" }, [], "es")).toBe("Sobres: ok\n  0 sobres\n");
  });
});

describe("informeDeHallazgos", () => {
  const NIVELES = {
    critico: { es: "Crítico", en: "Critical" },
    alto: { es: "Alto", en: "High" },
    medio: { es: "Medio", en: "Medium" },
    bajo: { es: "Bajo", en: "Low" },
    informativo: { es: "Informativo", en: "Informational" },
  };
  async function filas(fecha = "2026-10-03"): Promise<FilaDeListadoDeHallazgo[]> {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    return ["HZ-0003", "HZ-0005", "HZ-0007", "HZ-0009"].map((id) => {
      const r = situacionDeHallazgo(m.hallazgos[id]!, libro, { escala: m.escala, plazos: m.plazos, fecha });
      if (!r.ok) throw new Error(`${id}: ${r.motivo}`);
      return {
        situacion: r.situacion,
        estado: { es: r.situacion.evaluacion.estado, en: r.situacion.evaluacion.estado },
        nivel: NIVELES[r.situacion.severidad.nivel],
      };
    });
  }

  it("dice cuáles siguen contando como falla, la severidad y de dónde sale, el plazo vencido, el cierre y lo que le falta a una re-prueba", async () => {
    const t = informeDeHallazgos(await filas(), "2026-10-03", "es");
    expect(t).toContain("Hallazgos a 2026-10-03: 4 · 3 cuentan como falla de su control");
    expect(t).toContain("HZ-0005 · aceptado_con_riesgo · sigue contando como falla del control");
    expect(t).toContain("severidad: Alto (escala de IA · impacto 3 · frecuencia 36 % (42 de 116))");
    expect(t).toContain("severidad: Medio (CVSS 4.0 · 5.1 · CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N)");
    expect(t).toContain("plazo vencido: 17 días de atraso (vencía el 2026-09-16)");
    expect(t).toContain("en plazo: vence el 2026-12-04");
    expect(t).toContain("riesgo aceptado: se revisa el 2026-11-30");
    expect(t).toContain("cierre: reprueba · SOB-0027 · 2026-09-24");
    expect(t).toContain("re-prueba por confirmar: SOB-0036");
  });

  it("en inglés", async () => {
    const t = informeDeHallazgos(await filas(), "2026-10-03", "en");
    expect(t).toContain("Findings on 2026-10-03: 4 · 3 count as a failure of their control");
    expect(t).toContain("severity: High (AI scale · impact 3 · frequency 36% (42 of 116))");
    expect(t).toContain("overdue: 17 days late (it was due on 2026-09-16)");
    expect(t).toContain("on time: due on 2026-12-04");
    expect(t).toContain("accepted risk: reviewed on 2026-11-30");
    expect(t).toContain("re-test to confirm: SOB-0036");
  });

  it("cuando llega la fecha, el riesgo aceptado dice que toca revisarlo", async () => {
    const es = informeDeHallazgos(await filas("2026-11-30"), "2026-11-30", "es");
    expect(es).toContain("toca revisar el riesgo aceptado (desde el 2026-11-30)");
    const en = informeDeHallazgos(await filas("2026-11-30"), "2026-11-30", "en");
    expect(en).toContain("the accepted risk is due for review (since 2026-11-30)");
  });

  it("una severidad sin conteo lo dice en vez de inventar uno", () => {
    const s = { metodo: "escala_ia" as const, nivel: "alto" as const, referencia: "escala-ia@1", impacto: 2, alcance: 1, detectabilidad: 1, banda: 4, frecuencia: { fallidas: 1, evaluadas: 1, porCiento: 100, deConteo: false } };
    expect(detalleDeSeveridad(s, "es")).toContain("sin conteo: falló su única medición");
    expect(detalleDeSeveridad(s, "en")).toContain("no count: it failed its only measurement");
  });

  it("una re-prueba que no cierra dice por qué", async () => {
    const m = await mundo();
    const h = { ...m.hallazgos["HZ-0003"]!, eventos: [] };
    const r = situacionDeHallazgo(h, Object.values(m.sobres), { escala: m.escala, plazos: m.plazos, fecha: "2026-10-03" });
    if (!r.ok) throw new Error("debía evaluarse");
    const t = informeDeHallazgos([{ situacion: r.situacion, estado: { es: "x", en: "x" }, nivel: NIVELES.alto }], "2026-10-03", "es");
    expect(t).toContain("re-prueba SOB-0027 no cierra: sin_correccion");
  });

  it("el JSON trae lo calculado, sin nombres del vocabulario, para una máquina", async () => {
    const j = salidaJsonDeHallazgos(await filas(), "2026-10-03");
    expect(j.fecha).toBe("2026-10-03");
    expect(j.hallazgos.map((h) => [h.id, h.estado, h.cuenta_como_falla, h.severidad.nivel])).toEqual([
      ["HZ-0003", "cerrado", false, "alto"],
      ["HZ-0005", "aceptado_con_riesgo", true, "medio"],
      ["HZ-0007", "abierto", true, "alto"],
      ["HZ-0009", "corregido", true, "medio"],
    ]);
    expect(j.hallazgos[3]!.por_confirmar).toEqual(["SOB-0036"]);
    expect(j.hallazgos[3]!.severidad).toMatchObject({ metodo: "cvss", puntaje: 5.1 });
    expect(j.hallazgos[2]!.plazo).toMatchObject({ estado: "vencido", atraso: 17, vence: "2026-09-16" });
    expect(j.hallazgos[1]!.revision_del_riesgo).toMatchObject({ estado: "programada", fecha: "2026-11-30" });
    expect(j.hallazgos[0]!.revision_del_riesgo).toBeNull();
    expect(JSON.stringify(j)).not.toContain("Alto");
  });
});
