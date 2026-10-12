// @vitest-environment node
// La salida de los comandos del libro, en los dos idiomas y en JSON: el estado se lee por símbolo y palabra.
import { describe, expect, it } from "vitest";
import {
  CODIGOS_DEL_LIBRO,
  codigoDeValidacion,
  informeDeHallazgos,
  informeDeValidacion,
  salidaJsonDeHallazgos,
  type FilaDeListadoDeHallazgo,
} from "../../../src/engine/evidencia/informe.ts";
import { evaluarHallazgo } from "../../../src/engine/hallazgos/ciclo.ts";
import { plazoDe } from "../../../src/engine/hallazgos/plazo.ts";
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
  async function filas(): Promise<FilaDeListadoDeHallazgo[]> {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    return ["HZ-0003", "HZ-0005", "HZ-0007", "HZ-0009"].map((id) => {
      const r = evaluarHallazgo(m.hallazgos[id]!, libro);
      if (!r.ok) throw new Error(id);
      return {
        evaluacion: r.evaluacion,
        estado: { es: r.evaluacion.estado, en: r.evaluacion.estado },
        severidad: id === "HZ-0007" ? { nivel: { es: "Alto", en: "High" }, detalle: "3 × 36 %" } : null,
        plazo: id === "HZ-0007" ? plazoDe("alto", r.evaluacion.estado, r.evaluacion.apertura, "2026-10-03", m.plazos) : null,
      };
    });
  }

  it("dice cuáles siguen contando como falla, el plazo vencido, el cierre y lo que le falta a una re-prueba", async () => {
    const t = informeDeHallazgos(await filas(), "2026-10-03", "es");
    expect(t).toContain("Hallazgos a 2026-10-03: 4 · 3 cuentan como falla de su control");
    expect(t).toContain("HZ-0005 · aceptado_con_riesgo · sigue contando como falla del control");
    expect(t).toContain("severidad: Alto (3 × 36 %)");
    expect(t).toContain("plazo vencido: 17 días de atraso (vencía el 2026-09-16)");
    expect(t).toContain("cierre: reprueba · SOB-0027 · 2026-09-24");
    expect(t).toContain("re-prueba por confirmar: SOB-0036");
  });

  it("en inglés", async () => {
    const t = informeDeHallazgos(await filas(), "2026-10-03", "en");
    expect(t).toContain("Findings on 2026-10-03: 4 · 3 count as a failure of their control");
    expect(t).toContain("overdue: 17 days late (it was due on 2026-09-16)");
    expect(t).toContain("re-test to confirm: SOB-0036");
  });

  it("una re-prueba que no cierra dice por qué", async () => {
    const m = await mundo();
    const h = { ...m.hallazgos["HZ-0003"]!, eventos: [] };
    const r = evaluarHallazgo(h, Object.values(m.sobres));
    if (!r.ok) throw new Error("debía evaluarse");
    const t = informeDeHallazgos([{ evaluacion: r.evaluacion, estado: { es: "x", en: "x" }, severidad: null, plazo: null }], "2026-10-03", "es");
    expect(t).toContain("re-prueba SOB-0027 no cierra: sin_correccion");
  });

  it("el JSON trae lo mismo para una máquina", async () => {
    const j = salidaJsonDeHallazgos(await filas(), "2026-10-03");
    expect(j.fecha).toBe("2026-10-03");
    expect(j.hallazgos.map((h) => [h.id, h.estado, h.cuenta_como_falla])).toEqual([
      ["HZ-0003", "cerrado", false],
      ["HZ-0005", "aceptado_con_riesgo", true],
      ["HZ-0007", "abierto", true],
      ["HZ-0009", "corregido", true],
    ]);
    expect(j.hallazgos[3]!.por_confirmar).toEqual(["SOB-0036"]);
  });
});
