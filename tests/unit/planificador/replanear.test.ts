// @vitest-environment node
// El re-plan (D4, Sprint 10): qué entra, qué sale y qué se queda, con la CAUSA de cada movimiento (catálogo · regla · perfil, todas las que
// apliquen) y el control de ISO/IEC 42001 que gana o pierde cobertura. La primera prueba es la tabla de la receta demo: lo esperado de cada
// una de sus cinco pruebas está escrito aquí, a mano, y el motor tiene que coincidir.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { Historial } from "../../../src/engine/activos/historial.ts";
import { MOVIMIENTOS_DE_LA_RECETA } from "../../../src/engine/catalogo/instantanea-demo.ts";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { Plan } from "../../../src/engine/planificador/esquemas.ts";
import {
  ErrorDeReplan,
  replanear,
  type EntradaDeReplan,
  type Movimiento,
} from "../../../src/engine/planificador/replanear.ts";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
} from "../../../src/lib/catalogo/cargar-instantanea.ts";
import {
  cargarDatosDelPlanificador,
  cargarPatrones,
} from "../../../src/lib/activos/cargar-activos.ts";
import { copia } from "./ayuda.ts";

const RAIZ = process.cwd();
const ID = "act-demo-clasificador";
const json = (relativa: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8"));

async function base() {
  const oficial = (await cargarInstantaneaOficial(RAIZ)).instantanea;
  const demo = (await cargarInstantaneaDemo(RAIZ))!.instantanea;
  const historial = Historial.parse(json(`datos/historial/activos/${ID}.json`));
  return {
    oficial,
    demo,
    plan: Plan.parse(json(`datos/planes/${ID}.plan.json`)),
    v1: historial.anteriores[0]!.activo,
    v2: Activo.parse(json(`datos/activos/demo/${ID}.json`)),
    ...cargarDatosDelPlanificador(RAIZ),
  };
}

async function entrada(
  contra: "oficial" | "demo",
  cambios: Partial<EntradaDeReplan> = {},
): Promise<EntradaDeReplan> {
  const b = await base();
  return {
    plan: b.plan,
    activoAnterior: b.v1,
    instantaneaAnterior: b.oficial,
    activoNuevo: b.v2,
    instantaneaNueva: contra === "oficial" ? b.oficial : b.demo,
    formula: b.formula,
    entornos: b.entornos,
    fecha: "2026-11-08",
    ...cambios,
  };
}

const de = (m: Movimiento[], id: string) => m.find((x) => x.prueba === id)!;

describe("la tabla de la receta demo (plan v1 + catálogo oficial → activo v2 + catálogo demo)", () => {
  // prueba · movimiento · causas · ¿conjunta? · controles que ganan o pierden. Escrito a mano desde los comentarios de la receta.
  const ESPERADO = [
    [
      "PR-MD-DEMO-001",
      "entra",
      ["catalogo"],
      false,
      [["iso42001-A.7.4", "gana"]],
    ],
    [
      "PR-MD-DEMO-002",
      "entra",
      ["catalogo", "perfil"],
      true,
      [["iso42001-A.10.3", "gana"]],
    ],
    [
      "PR-MD-LIM-001",
      "sale",
      ["catalogo"],
      false,
      [["iso42001-A.6.2.2", "pierde"]],
    ],
    ["PR-MD-INV-001", "sale", ["regla"], false, []],
    ["PR-MD-COH-001", "se_queda", ["catalogo"], false, []],
  ] as const;

  it("cada una de las cinco pruebas de la receta está en la tabla", () => {
    expect(ESPERADO.map((e) => e[0]).sort()).toEqual(
      MOVIMIENTOS_DE_LA_RECETA.map((m) => m.id).sort(),
    );
  });

  it.each(ESPERADO)(
    "%s: %s, causas %j, conjunta %s",
    async (id, movimiento, causas, conjunta, controles) => {
      const { replan } = await replanear(await entrada("demo"));
      const todos = [...replan.entran, ...replan.salen, ...replan.se_quedan];
      const m = de(todos, id);
      expect(m.movimiento).toBe(movimiento);
      expect(m.causas).toEqual(causas);
      expect(m.conjunta).toBe(conjunta);
      expect(m.controles.map((c) => [c.control, c.efecto])).toEqual(controles);
    },
  );

  it("el plan de un movimiento trae su lugar antes y después, y el motivo de por qué estaba fuera", async () => {
    const { replan } = await replanear(await entrada("demo"));
    const entra = de(replan.entran, "PR-MD-DEMO-002");
    expect(entra.antes).toBeNull();
    expect(entra.despues!.lugar).toBeGreaterThan(0);
    expect(entra.fuera).toBe("retirada_o_ausente");
    const sale = de(replan.salen, "PR-MD-INV-001");
    expect(sale.despues).toBeNull();
    expect(sale.antes!.lugar).toBeGreaterThan(0);
    expect(sale.fuera).toBe("perfil");
    const queda = de(replan.se_quedan, "PR-MD-COH-001");
    expect(queda.cambios).toContain("prioridad");
    expect(queda.antes!.prioridad).toBeGreaterThan(queda.despues!.prioridad);
  });

  it("el activo cambia de huella, el catálogo también, y el plan nuevo cita lo de hoy", async () => {
    const e = await entrada("demo");
    const { replan, plan } = await replanear(e);
    expect(replan.plan.antes).toBe(e.plan.huella);
    expect(replan.plan.despues).toBe(plan.huella);
    expect(plan.huella).not.toBe(e.plan.huella);
    expect(plan.instantanea.huella).toBe(e.instantaneaNueva.huella);
    expect(replan.instantanea.antes.huella).toBe(e.instantaneaAnterior.huella);
    expect(replan.activo.antes).not.toBe(replan.activo.despues);
  });

  it("los controles del plan que ganan y pierden son la suma de los de las pruebas", async () => {
    const { replan } = await replanear(await entrada("demo"));
    expect(replan.controles.map((c) => [c.control, c.efecto])).toEqual([
      ["iso42001-A.10.3", "gana"],
      ["iso42001-A.6.2.2", "pierde"],
      ["iso42001-A.7.4", "gana"],
    ]);
  });
});

describe("sobre el catálogo oficial el único factor que cambia es el perfil", () => {
  it("PR-MD-DER-001 entra por el perfil solo: el activo declara ahora que un tercero opera su modelo", async () => {
    const { replan } = await replanear(await entrada("oficial"));
    expect(replan.entran.map((m) => m.prueba)).toEqual(["PR-MD-DER-001"]);
    expect(replan.entran[0]!.causas).toEqual(["perfil"]);
    expect(replan.entran[0]!.conjunta).toBe(false);
    expect(replan.entran[0]!.fuera).toBe("perfil");
    expect(replan.salen).toEqual([]);
    expect(replan.instantanea.antes).toEqual(replan.instantanea.despues);
  });

  it("las demás se quedan sin cambio y sin causa", async () => {
    const { replan, plan } = await replanear(await entrada("oficial"));
    expect(replan.se_quedan).toHaveLength(plan.resumen.planeadas - 1);
    expect(replan.se_quedan.every((m) => m.causas.length === 0)).toBe(true);
    // Solo bajan de lugar, porque DER-001 entra por encima de algunas; ninguna cambia de prioridad, de controles ni de herramienta.
    expect(new Set(replan.se_quedan.flatMap((m) => m.cambios))).toEqual(
      new Set(["lugar"]),
    );
  });
});

describe("la causa es una ablación: todas las que apliquen, nunca una sola", () => {
  const sinTercero = (i: Instantanea, id: string) =>
    ({
      ...i,
      catalogo: {
        ...i.catalogo,
        pruebas: i.catalogo.pruebas.map((p) =>
          p.id === id ? { ...p, estado_aprobacion: "retirada" as const } : p,
        ),
      },
    }) as Instantanea;

  it("una prueba retirada y que el perfil dejó de pedir sale solo por el catálogo si el perfil seguía pidiéndola, y por las dos si no", async () => {
    // LIM-001 aplica a quien devuelve una decisión tipada: el perfil no cambió eso, la causa es solo el catálogo.
    const { replan } = await replanear(await entrada("demo"));
    expect(de(replan.salen, "PR-MD-LIM-001").causas).toEqual(["catalogo"]);
  });

  it("si cualquiera de dos cambios bastaba, ambos son causa y la causa NO es conjunta", async () => {
    // Se retira DER-001 en el catálogo nuevo Y el activo deja de ser de terceros: ninguno de los dos hace falta por sí solo para que salga.
    const b = await base();
    const antes = copia(b.v1);
    antes.rasgos.modelo_de_terceros = true;
    const planAnterior = await (async () => {
      const { planificar } =
        await import("../../../src/engine/planificador/planificar.ts");
      const r = await planificar({
        activo: antes,
        instantanea: b.oficial,
        formula: b.formula,
        entornos: b.entornos,
        fecha: b.plan.fecha_emision,
      });
      if (!r.emitido) throw new Error("no se emitió");
      return r.plan;
    })();
    const ahora = copia(b.v1);
    const { replan } = await replanear({
      plan: planAnterior,
      activoAnterior: antes,
      instantaneaAnterior: b.oficial,
      activoNuevo: ahora,
      instantaneaNueva: sinTercero(b.oficial, "PR-MD-DER-001"),
      formula: b.formula,
      entornos: b.entornos,
      fecha: "2026-11-08",
    });
    const m = de(replan.salen, "PR-MD-DER-001");
    expect(m.causas).toEqual(["catalogo", "perfil"]);
    expect(m.conjunta).toBe(false);
  });
});

describe("el plan anterior debe poder reproducirse, y la fórmula y los entornos no se absorben", () => {
  const codigo = async (e: EntradaDeReplan) => {
    try {
      await replanear(e);
    } catch (error) {
      if (error instanceof ErrorDeReplan) return error.codigo;
      throw error;
    }
    return null;
  };

  it("una fórmula distinta de la que el plan citó se nombra y detiene", async () => {
    const e = await entrada("demo");
    const formula = copia(e.formula);
    formula.techo = formula.techo === 10 ? 9 : formula.techo + 1;
    expect(await codigo({ ...e, formula })).toBe("formula_distinta");
  });

  it("unos entornos distintos de los que el plan citó se nombran y detienen", async () => {
    const e = await entrada("demo");
    const entornos = copia(e.entornos);
    entornos.version = `${entornos.version}-otra`;
    expect(await codigo({ ...e, entornos })).toBe("entornos_distintos");
  });

  it("una fecha anterior a la emisión del plan que sustituye es un error de quien la pide", async () => {
    const e = await entrada("demo");
    expect(e.fecha >= e.plan.fecha_emision).toBe(true);
    await expect(replanear({ ...e, fecha: "2026-10-06" })).rejects.toThrow(
      RangeError,
    );
  });

  it("el filtro de contenido marca el paquete nuevo si se le pasan patrones, y nunca rechaza el re-plan", async () => {
    const e = await entrada("demo");
    expect((await replanear(e)).marcas).toEqual([]);
    const carnada = (await import("../../../datos/filtro/patrones.json"))
      .default.patrones[0]!.carnadas[0]!;
    const activoNuevo = copia(e.activoNuevo);
    activoNuevo.alcance!.limites = { es: carnada, en: carnada };
    const r = await replanear({
      ...e,
      activoNuevo,
      patrones: cargarPatrones(RAIZ),
    });
    expect(r.marcas.length).toBeGreaterThan(0);
    expect(r.marcas[0]?.campo).toMatch(/^alcance\.limites\./);
    expect(r.plan.resumen.planeadas).toBeGreaterThan(0);
  });

  it("un activo anterior que no es el del plan no se re-planea", async () => {
    const e = await entrada("demo");
    expect(await codigo({ ...e, activoAnterior: e.activoNuevo })).toBe(
      "plan_no_reproducible",
    );
  });

  it("una instantánea anterior que no es la del plan no se re-planea", async () => {
    const e = await entrada("demo");
    const otra = {
      ...e.instantaneaAnterior,
      catalogo: {
        ...e.instantaneaAnterior.catalogo,
        pruebas: e.instantaneaAnterior.catalogo.pruebas.map((p) =>
          p.id === "PR-MD-CAL-001"
            ? { ...p, estado_aprobacion: "retirada" as const }
            : p,
        ),
      },
    } as Instantanea;
    expect(await codigo({ ...e, instantaneaAnterior: otra })).toBe(
      "plan_no_reproducible",
    );
  });

  it("un activo de hoy sin alcance autorizado no tiene plan", async () => {
    const e = await entrada("demo");
    const sin = copia(e.activoNuevo);
    sin.alcance = null;
    expect(await codigo({ ...e, activoNuevo: sin })).toBe("sin_autorizacion");
  });
});

describe("determinista", () => {
  it("la misma entrada da los mismos bytes", async () => {
    const e = await entrada("demo");
    const a = JSON.stringify(await replanear(e));
    const b = JSON.stringify(await replanear(await entrada("demo")));
    expect(a).toBe(b);
  });

  it("re-planear sin que nada haya cambiado no mueve nada", async () => {
    const b = await base();
    const { replan } = await replanear(
      await entrada("oficial", { activoNuevo: b.v1 }),
    );
    expect(replan.entran).toEqual([]);
    expect(replan.salen).toEqual([]);
    expect(replan.controles).toEqual([]);
    expect(replan.se_quedan.every((m) => m.causas.length === 0)).toBe(true);
  });
});
