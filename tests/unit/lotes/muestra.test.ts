// @vitest-environment node
// El plan de muestreo (E-5): calidad límite y aceptación con cero errores, comprobado con aritmética EXACTA de enteros
// para cada tamaño de lote que cubre cada tramo; y la elección de la muestra, determinista (regla dura 1).
import { describe, expect, it } from "vitest";
import { sha256 } from "../../../src/engine/huella.ts";
import type { PlanDeMuestreo } from "../../../src/engine/lotes/esquemas.ts";
import {
  cumpleElRiesgo,
  cumpleLaCotaBinomial,
  elegirMuestra,
  malosDelResto,
  probabilidadDeAceptar,
  tamanoDeMuestra,
  validarPlanDeMuestreo,
} from "../../../src/engine/lotes/muestra.ts";
import { cargarMuestreo } from "../../../src/lib/evidencia/cargar-evidencia.ts";
import { RAIZ } from "../evidencia/ayuda.ts";

const plan = cargarMuestreo(RAIZ);
const con = (cambios: Partial<PlanDeMuestreo>): PlanDeMuestreo => ({
  ...plan,
  ...cambios,
});
const conTramos = (tramos: PlanDeMuestreo["tramos"]) => con({ tramos });

describe("el plan de muestreo de datos/evidencia/muestreo.json", () => {
  it("cumple el riesgo del consumidor para CADA tamaño de resto de cada tramo", () => {
    expect(validarPlanDeMuestreo(plan)).toEqual([]);
  });

  it("los tamaños son los mínimos del peor caso de su tramo: uno menos ya no cumple en algún tamaño", () => {
    let anterior = 0;
    for (const t of plan.tramos) {
      if (t.muestra === null) {
        anterior = t.hasta ?? anterior;
        continue;
      }
      const hasta = t.hasta ?? 5000;
      let rompe = false;
      for (let r = anterior + 1; r <= hasta; r += 1)
        if (r >= t.muestra && !cumpleElRiesgo(r, t.muestra - 1, plan))
          rompe = true;
      expect(rompe, `tramo hasta ${String(t.hasta)}`).toBe(true);
      anterior = t.hasta ?? anterior;
    }
  });

  it("el último tramo también cumple la cota binomial de un lote infinito, y 28 no", () => {
    const ultimo = plan.tramos[plan.tramos.length - 1]!;
    expect(ultimo.hasta).toBeNull();
    expect(cumpleLaCotaBinomial(ultimo.muestra!, plan)).toBe(true);
    expect(cumpleLaCotaBinomial(ultimo.muestra! - 1, plan)).toBe(false);
  });

  it("el 24 «ilustrativo» de la maqueta para 51–90 NO cumple: falla en 89", () => {
    const ilustrativo = conTramos(
      plan.tramos.map((t) => (t.hasta === 90 ? { ...t, muestra: 24 } : t)),
    );
    expect(validarPlanDeMuestreo(ilustrativo)).toEqual([
      { error: "tramo_no_cumple_el_riesgo", tramo: 2, r: 89 },
    ]);
  });

  it("cuántos se revisan: todo hasta 25, después lo que dice el tramo, nunca más que el resto", () => {
    const de = (r: number) => tamanoDeMuestra(r, plan);
    expect([0, 1, 10, 25].map(de)).toEqual([0, 1, 10, 25]);
    expect([26, 50].map(de)).toEqual([22, 22]);
    expect([51, 90].map(de)).toEqual([25, 25]);
    expect([91, 150].map(de)).toEqual([26, 26]);
    expect([151, 5000].map(de)).toEqual([29, 29]);
    expect(tamanoDeMuestra(-3, plan)).toBe(0);
  });
});

describe("la aritmética exacta", () => {
  it("malos del resto = ceil(r · LQ / 100)", () => {
    expect([10, 11, 25, 26].map((r) => malosDelResto(r, 10))).toEqual([
      1, 2, 3, 3,
    ]);
  });
  it("la probabilidad de aceptar es una fracción de enteros: 20 de 20 con 2 malos, muestra de 2 = (18·17)/(20·19)", () => {
    expect(probabilidadDeAceptar(20, 2, 10)).toEqual({
      numerador: BigInt(306),
      denominador: BigInt(380),
    });
  });
  it("si la muestra pide más buenos de los que hay, la probabilidad de aceptar es cero", () => {
    expect(probabilidadDeAceptar(10, 10, 10).numerador).toBe(BigInt(0));
  });
  it("un riesgo del 5 % no se cumple con una muestra de 1 en un lote de 30", () => {
    expect(cumpleElRiesgo(30, 1, plan)).toBe(false);
    expect(cumpleElRiesgo(30, 30, plan)).toBe(true);
  });
});

describe("un plan inválido se dice por qué", () => {
  it("los tramos fuera de orden", () => {
    const r = validarPlanDeMuestreo(
      conTramos([
        { hasta: 50, muestra: 22 },
        { hasta: 25, muestra: null },
        { hasta: null, muestra: 29 },
      ]),
    );
    expect(r.map((e) => e.error)).toContain("tramos_fuera_de_orden");
  });
  it("un tramo intermedio sin tope", () => {
    const r = validarPlanDeMuestreo(
      conTramos([
        { hasta: null, muestra: 29 },
        { hasta: null, muestra: 29 },
      ]),
    );
    expect(r.map((e) => e.error)).toContain("tramos_fuera_de_orden");
  });
  it("el último tramo con tope", () => {
    const r = validarPlanDeMuestreo(
      conTramos([
        { hasta: 25, muestra: null },
        { hasta: 50, muestra: 22 },
      ]),
    );
    expect(r.map((e) => e.error)).toContain("ultimo_tramo_con_tope");
  });
  it("un tramo que pide más que su tope", () => {
    const r = validarPlanDeMuestreo(
      conTramos([
        { hasta: 25, muestra: 30 },
        { hasta: null, muestra: 29 },
      ]),
    );
    expect(r.map((e) => e.error)).toContain("tramo_pide_mas_que_su_tope");
  });
  it("un último tramo que no cumple la cota binomial", () => {
    const r = validarPlanDeMuestreo(conTramos([{ hasta: null, muestra: 20 }]));
    expect(r.some((e) => e.error === "tramo_no_cumple_el_riesgo")).toBe(true);
  });
  it("el plan de la carga lo rechaza: un archivo con un tramo malo no se lee", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } =
      await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const dir = mkdtempSync(path.join(tmpdir(), "hackguard-muestreo-"));
    try {
      mkdirSync(path.join(dir, "datos/evidencia"), { recursive: true });
      writeFileSync(
        path.join(dir, "datos/evidencia/muestreo.json"),
        JSON.stringify(
          conTramos(
            plan.tramos.map((t) =>
              t.hasta === 90 ? { ...t, muestra: 24 } : t,
            ),
          ),
        ),
      );
      expect(() => cargarMuestreo(dir)).toThrow(
        /tramo_no_cumple_el_riesgo \(tramo 2, r = 89\)/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("elegir la muestra (sin azar, sin reloj)", () => {
  const ids = Array.from(
    { length: 40 },
    (_, i) => `SOB-${String(i + 1).padStart(4, "0")}`,
  );
  const semilla = "a".repeat(64);

  it("toma n, en el orden del libro", async () => {
    const m = await elegirMuestra(ids, 10, semilla);
    expect(m).toHaveLength(10);
    expect([...m].sort()).toEqual(m);
    expect(new Set(m).size).toBe(10);
    expect(m.every((id) => ids.includes(id))).toBe(true);
  });
  it("la misma lista en cualquier orden da la misma muestra", async () => {
    const a = await elegirMuestra(ids, 12, semilla);
    const b = await elegirMuestra([...ids].reverse(), 12, semilla);
    const c = await elegirMuestra(
      [...ids.slice(20), ...ids.slice(0, 20)],
      12,
      semilla,
    );
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
  it("otra huella de lote da otra muestra", async () => {
    expect(await elegirMuestra(ids, 12, "b".repeat(64))).not.toEqual(
      await elegirMuestra(ids, 12, semilla),
    );
  });
  it("es lo que dice SHA-256(huella:id): los n de clave más baja", async () => {
    const claves = await Promise.all(
      ids.map(async (id) => [await sha256(`${semilla}:${id}`), id] as const),
    );
    const esperado = claves
      .sort((x, y) => (x[0] < y[0] ? -1 : 1))
      .slice(0, 5)
      .map((c) => c[1])
      .sort();
    expect(await elegirMuestra(ids, 5, semilla)).toEqual(esperado);
  });
  it("n = 0 no elige nada y n mayor que la lista las toma todas", async () => {
    expect(await elegirMuestra(ids, 0, semilla)).toEqual([]);
    expect(await elegirMuestra(ids.slice(0, 3), 50, semilla)).toEqual(
      ids.slice(0, 3),
    );
  });
});
