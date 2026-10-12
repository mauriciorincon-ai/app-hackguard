// @vitest-environment node
// El planificador: qué entra al plan, qué queda fuera y por qué; que sea determinista (los mismos bytes
// aunque los conjuntos lleguen en otro orden); que sin autorización no haya plan; y que el paquete sea
// declarativo. Las invariantes valen para cualquier activo, no solo para los demo.
import { describe, expect, it } from "vitest";
import type { Activo } from "../../../src/engine/activos/esquemas.ts";
import { normalizarActivo } from "../../../src/engine/activos/normalizar.ts";
import { huella } from "../../../src/engine/huella.ts";
import { Paquete, Plan } from "../../../src/engine/planificador/esquemas.ts";
import { codigoDePlan } from "../../../src/engine/planificador/informe.ts";
import {
  planificar,
  type ResultadoDelPlan,
} from "../../../src/engine/planificador/planificar.ts";
import {
  ASISTENTE,
  CLASIFICADOR,
  copia,
  FECHA,
  mundo,
  PORTAL,
} from "./ayuda.ts";

async function plan(id: string, cambiar?: (a: Activo) => void) {
  const m = await mundo();
  const activo = copia(m.activos[id]!);
  cambiar?.(activo);
  const r = await planificar({
    activo,
    instantanea: m.instantanea,
    formula: m.formula,
    entornos: m.entornos,
    fecha: FECHA,
    patrones: m.patrones,
  });
  return r;
}
async function emitido(id: string, cambiar?: (a: Activo) => void) {
  const r = await plan(id, cambiar);
  if (!r.emitido) throw new Error("se esperaba un plan");
  return r;
}
const ids = (xs: { prueba: string }[]) => xs.map((x) => x.prueba);

describe("el plan del asistente demo (software + agente + modelo generativo)", () => {
  it("planea 14 y excluye 12, con los tres motivos", async () => {
    const { plan: p } = await emitido(ASISTENTE);
    expect(p.resumen).toMatchObject({
      candidatas: 26,
      otras_familias: 12,
      planeadas: 14,
      excluidas: 12,
      controles_con_prueba: 4,
      controles_sin_prueba: 3,
      planeadas_sin_control: 6,
      sin_herramienta: 0,
    });
    expect(ids(p.planeadas).sort()).toEqual([
      "PR-AG-HERR-001",
      "PR-AG-LIM-001",
      "PR-AG-PERM-001",
      "PR-AG-REG-001",
      "PR-IA-CONT-001",
      "PR-IA-ENC-002",
      "PR-IA-PINJ-001",
      "PR-IA-SAL-001",
      "PR-SW-CLK-001",
      "PR-SW-CSP-001",
      "PR-SW-DEP-001",
      "PR-SW-ERR-001",
      "PR-SW-TS-001",
      "PR-SW-XSS-001",
    ]);
    const por = (m: string) => ids(p.excluidas.filter((e) => e.motivo === m));
    expect(por("alcance")).toEqual(["PR-SW-SQLI-001"]);
    expect(por("operador")).toEqual(["PR-IA-FUGA-001"]);
    expect(por("perfil")).toHaveLength(10);
  });

  it("la agregada entra con su justificación y sin razón de perfil", async () => {
    const { plan: p } = await emitido(ASISTENTE);
    const clk = p.planeadas.find((x) => x.prueba === "PR-SW-CLK-001");
    expect(clk?.razon).toBeNull();
    expect(clk?.agregada?.justificacion.es).toContain("portal de clientes");
    expect(p.planeadas.filter((x) => x.agregada !== null)).toHaveLength(1);
  });

  it("la prioridad suma como mucho 1 y dice qué ajustes aplicaron", async () => {
    const { plan: p } = await emitido(ASISTENTE);
    const lim = p.planeadas.find((x) => x.prueba === "PR-AG-LIM-001")!;
    expect(lim.prioridad.base).toBe(4);
    expect(lim.prioridad.ajustes.map((a) => a.id)).toEqual([
      "exposicion_publica",
      "capacidad_de_accion",
    ]);
    expect(lim.prioridad.ajuste).toBe(1);
    expect(lim.prioridad.final).toBe(5);
    // De mayor a menor prioridad y, a igualdad, por id.
    const orden = p.planeadas.map(
      (x) => [x.prioridad.final, x.prueba] as const,
    );
    const esperado = [...orden].sort(
      (a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1),
    );
    expect(orden).toEqual(esperado);
  });

  it("la cobertura dice qué controles tendrán evidencia y cuáles no", async () => {
    const { plan: p } = await emitido(ASISTENTE);
    const estado = Object.fromEntries(
      p.cobertura.map((c) => [c.control.replace("iso42001-", ""), c.estado]),
    );
    expect(estado).toEqual({
      "A.6.2.4": "con_prueba",
      "A.6.2.6": "con_prueba",
      "A.6.2.8": "con_prueba",
      "A.9.4": "con_prueba",
      "A.7.4": "sin_prueba",
      "A.7.5": "sin_prueba",
      "A.9.2": "sin_prueba",
    });
  });
});

describe("el plan del clasificador demo (modelo de decisión, solo en el portátil)", () => {
  it("planea 11 y excluye la que exige un modelo de terceros", async () => {
    const { plan: p } = await emitido(CLASIFICADOR);
    expect(p.resumen).toMatchObject({
      candidatas: 12,
      otras_familias: 26,
      planeadas: 11,
      excluidas: 1,
    });
    expect(p.excluidas).toMatchObject([
      { prueba: "PR-MD-DER-001", motivo: "perfil" },
    ]);
    expect(
      p.planeadas.every((x) => x.herramienta?.entorno === "portatil"),
    ).toBe(true);
    // Solo datos personales suma: el tope no se toca.
    expect(
      p.planeadas.every(
        (x) => x.prioridad.ajuste === 1 && x.prioridad.ajustes.length === 1,
      ),
    ).toBe(true);
  });
});

describe("sin alcance y reglas no hay plan (regla dura 5)", () => {
  it("el portal demo no recibe plan", async () => {
    const r = await plan(PORTAL);
    expect(r).toEqual({
      emitido: false,
      motivo: "sin_autorizacion",
      activo: PORTAL,
    });
    expect(codigoDePlan(r)).toBe(2);
  });

  it.each([
    ["sin alcance", (a: Activo) => (a.alcance = null)],
    ["sin reglas", (a: Activo) => (a.reglas = null)],
  ])("%s tampoco", async (_n, cambiar) => {
    const r = await plan(ASISTENTE, cambiar);
    expect(r.emitido).toBe(false);
  });
});

describe("invariantes: valen para cualquier activo", () => {
  it.each([ASISTENTE, CLASIFICADOR])("%s", async (id) => {
    const m = await mundo();
    const { plan: p, paquete } = await emitido(id);
    const planeadas = ids(p.planeadas);
    const excluidas = ids(p.excluidas);
    // Ninguna prueba está planeada y excluida a la vez, y entre las dos están todas las candidatas.
    expect(planeadas.filter((x) => excluidas.includes(x))).toEqual([]);
    const activo = m.activos[id]!;
    const candidatas = m.instantanea.catalogo.pruebas
      .filter((x) => activo.familias.includes(x.familia))
      .map((x) => x.id)
      .sort();
    expect([...planeadas, ...excluidas].sort()).toEqual(candidatas);
    expect(p.resumen.candidatas + p.resumen.otras_familias).toBe(
      m.instantanea.catalogo.pruebas.length,
    );
    // Cada exclusión trae motivo y razón en los dos idiomas.
    for (const e of p.excluidas) {
      expect(e.razon.es.length).toBeGreaterThan(0);
      expect(e.razon.en.length).toBeGreaterThan(0);
    }
    // La prioridad respeta el tope y el techo; la agregada trae su justificación.
    for (const x of p.planeadas) {
      expect(x.prioridad.ajuste).toBeLessThanOrEqual(m.formula.tope_de_ajuste);
      expect(x.prioridad.final).toBeLessThanOrEqual(m.formula.techo);
      expect(x.prioridad.final).toBe(
        Math.min(m.formula.techo, x.prioridad.base + x.prioridad.ajuste),
      );
      if (x.agregada !== null) expect(x.razon).toBeNull();
      else expect(x.razon).not.toBeNull();
    }
    // Las pruebas del paquete son exactamente las planeadas con herramienta.
    const delPaquete = paquete.herramientas
      .flatMap((h) => h.pruebas.map((x) => x.prueba))
      .sort();
    expect(delPaquete).toEqual(
      p.planeadas
        .filter((x) => x.herramienta !== null)
        .map((x) => x.prueba)
        .sort(),
    );
    // La cobertura cuenta las filas.
    expect(
      p.resumen.controles_con_prueba + p.resumen.controles_sin_prueba,
    ).toBe(p.cobertura.length);
    for (const c of p.cobertura) {
      expect(c.estado).toBe(c.pruebas.length > 0 ? "con_prueba" : "sin_prueba");
      for (const prueba of c.pruebas) expect(planeadas).toContain(prueba);
    }
    expect(Plan.safeParse(p).success).toBe(true);
    expect(Paquete.safeParse(paquete).success).toBe(true);
  });
});

describe("determinismo (regla dura 1)", () => {
  it("dos corridas dan los mismos bytes", async () => {
    const a = await emitido(ASISTENTE);
    const b = await emitido(ASISTENTE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("los conjuntos en otro orden dan la misma huella", async () => {
    const m = await mundo();
    const base = await emitido(ASISTENTE);
    const barajado = await (async () => {
      const activo = copia(m.activos[ASISTENTE]!);
      activo.familias.reverse();
      activo.entornos.reverse();
      activo.ajustes.reverse();
      activo.alcance!.familias.reverse();
      activo.alcance!.fuera.reverse();
      activo.rasgos = Object.fromEntries(
        Object.entries(activo.rasgos).reverse(),
      );
      const instantanea = copia(m.instantanea);
      instantanea.catalogo.pruebas.reverse();
      return planificar({
        activo,
        instantanea,
        formula: m.formula,
        entornos: m.entornos,
        fecha: FECHA,
      });
    })();
    if (!barajado.emitido) throw new Error("plan esperado");
    expect(barajado.plan.huella).toBe(base.plan.huella);
    expect(barajado.paquete.huella).toBe(base.paquete.huella);
  });

  it("las huellas son las del contenido, y el plan cita la del paquete", async () => {
    const m = await mundo();
    const { plan: p, paquete } = await emitido(ASISTENTE);
    const cuerpoDelPlan: Record<string, unknown> = { ...p };
    delete cuerpoDelPlan.huella;
    const cuerpoDelPaquete: Record<string, unknown> = { ...paquete };
    delete cuerpoDelPaquete.huella;
    expect(p.huella).toBe(await huella(cuerpoDelPlan));
    expect(paquete.huella).toBe(await huella(cuerpoDelPaquete));
    expect(p.paquete.huella).toBe(paquete.huella);
    expect(p.activo.huella).toBe(
      await huella(normalizarActivo(m.activos[ASISTENTE]!)),
    );
    expect(p.instantanea).toEqual({
      fecha: m.instantanea.fecha_evaluacion,
      huella: m.instantanea.huella,
    });
    expect(p.formula.huella).toBe(await huella(m.formula));
    expect(p.entornos.huella).toBe(await huella(m.entornos));
  });

  it("cambiar un dato del activo cambia la huella del plan", async () => {
    const a = await emitido(ASISTENTE);
    const b = await emitido(ASISTENTE, (x) => (x.perfil.datos = "personales"));
    expect(b.plan.huella).not.toBe(a.plan.huella);
    expect(b.plan.activo.huella).not.toBe(a.plan.activo.huella);
  });

  it("la fecha de emisión es una entrada: otra fecha, otra huella, mismo contenido", async () => {
    const m = await mundo();
    const otra = await planificar({
      activo: m.activos[ASISTENTE]!,
      instantanea: m.instantanea,
      formula: m.formula,
      entornos: m.entornos,
      fecha: "2026-12-31",
    });
    const base = await emitido(ASISTENTE);
    if (!otra.emitido) throw new Error("plan esperado");
    expect(otra.plan.huella).not.toBe(base.plan.huella);
    expect(otra.paquete.huella).toBe(base.paquete.huella);
    expect(otra.plan.planeadas).toEqual(base.plan.planeadas);
  });

  it("una fecha que no existe o anterior a la instantánea es un error de quien la pide", async () => {
    const m = await mundo();
    const entrada = {
      activo: m.activos[ASISTENTE]!,
      instantanea: m.instantanea,
      formula: m.formula,
      entornos: m.entornos,
    };
    await expect(
      planificar({ ...entrada, fecha: "2026-02-30" }),
    ).rejects.toThrow(RangeError);
    await expect(
      planificar({ ...entrada, fecha: "2026-10-04" }),
    ).rejects.toThrow(/anterior a la instantánea/);
  });
});

describe("alcance, ajustes y herramienta", () => {
  it("una familia fuera de la autorización se excluye entera, también lo agregado", async () => {
    const { plan: p } = await emitido(
      ASISTENTE,
      (a) => (a.alcance!.familias = ["agente", "modelo_generativo"]),
    );
    const software = p.excluidas.filter((e) => e.motivo === "alcance");
    expect(ids(software)).toContain("PR-SW-CLK-001");
    expect(ids(software)).toContain("PR-SW-SQLI-001");
    expect(software.every((e) => e.prueba.startsWith("PR-SW-"))).toBe(true);
    expect(software[0]?.razon.es).toMatch(/familia/);
    expect(p.planeadas.some((x) => x.prueba.startsWith("PR-SW-"))).toBe(false);
  });

  it("sin el entorno que pide una herramienta, la prueba se planea sin herramienta y a la vista", async () => {
    const r = await emitido(ASISTENTE, (a) => (a.entornos = ["portatil"]));
    expect(r.plan.resumen.sin_herramienta).toBe(6);
    const sin = r.plan.planeadas.filter((x) => x.herramienta === null);
    expect(sin.every((x) => x.prueba.startsWith("PR-SW-"))).toBe(true);
    expect(r.paquete.herramientas.some((h) => h.herramienta === "zap")).toBe(
      false,
    );
    expect(codigoDePlan(r)).toBe(1);
  });

  it("otra fórmula, otra prioridad: el tope y el techo vienen de los datos", async () => {
    const m = await mundo();
    const formula = copia(m.formula);
    formula.tope_de_ajuste = 0;
    const r = await planificar({
      activo: m.activos[ASISTENTE]!,
      instantanea: m.instantanea,
      formula,
      entornos: m.entornos,
      fecha: FECHA,
    });
    if (!r.emitido) throw new Error("plan esperado");
    expect(
      r.plan.planeadas.every(
        (x) =>
          x.prioridad.ajuste === 0 && x.prioridad.final === x.prioridad.base,
      ),
    ).toBe(true);
    const bajo = copia(m.formula);
    bajo.techo = 3;
    bajo.tope_de_ajuste = 3;
    const t = await planificar({
      activo: m.activos[ASISTENTE]!,
      instantanea: m.instantanea,
      formula: bajo,
      entornos: m.entornos,
      fecha: FECHA,
    });
    if (!t.emitido) throw new Error("plan esperado");
    expect(Math.max(...t.plan.planeadas.map((x) => x.prioridad.final))).toBe(3);
  });

  it("la condición «distinto» de la fórmula se evalúa", async () => {
    const { plan: p } = await emitido(CLASIFICADOR);
    expect(p.planeadas[0]?.prioridad.ajustes.map((a) => a.id)).toEqual([
      "datos_no_publicos",
    ]);
  });
});

describe("el paquete es declarativo (riesgo 3)", () => {
  it("rechaza cualquier campo que no esté en el esquema", async () => {
    const { paquete } = await emitido(ASISTENTE);
    expect(Paquete.safeParse({ ...paquete, procedimiento: "x" }).success).toBe(
      false,
    );
    const pruebas = copia(paquete);
    (
      pruebas.herramientas[0]!.pruebas[0] as unknown as Record<string, unknown>
    ).pasos = ["x"];
    expect(Paquete.safeParse(pruebas).success).toBe(false);
  });

  it("el filtro del S1 no marca nada en el texto del dueño de los demo", async () => {
    const r = await emitido(ASISTENTE);
    expect(r.marcas).toEqual([]);
    expect(codigoDePlan(r)).toBe(0);
  });

  it("el filtro marca el texto del dueño que parece un procedimiento, sin rechazar el plan", async () => {
    const m = await mundo();
    // Una carnada del propio filtro: lo que ya sabemos que marca.
    const carnada = (await import("../../../datos/filtro/patrones.json"))
      .default.patrones[0]!.carnadas[0]!;
    const r = await emitido(
      ASISTENTE,
      (a) => (a.alcance!.limites = { es: carnada, en: carnada }),
    );
    expect(m.patrones.length).toBeGreaterThan(0);
    expect(r.marcas.length).toBeGreaterThan(0);
    expect(r.marcas[0]?.campo).toMatch(/^alcance\.limites\./);
    expect(r.plan.resumen.planeadas).toBe(14);
    expect(codigoDePlan(r)).toBe(1);
  });
});

describe("tipo de resultado", () => {
  it("un resultado no emitido no trae plan", async () => {
    const r: ResultadoDelPlan = await plan(PORTAL);
    expect("plan" in r).toBe(false);
  });
});
