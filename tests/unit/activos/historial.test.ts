// @vitest-environment node
// El historial de un activo (D3, Sprint 10): versiones con huella, qué cambió de una a otra y el plan «desactualizado». Una huella que no
// es la de su contenido, un salto en las versiones o un activo que cambió sin dejar versión rompen; un plan emitido con una versión
// anterior NO rompe: queda marcado, con su causa.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAUSAS_DE_DESACTUALIZACION,
  ESTADOS_DEL_PLAN,
  Historial,
  diferenciasDeActivo,
  estadoDelPlan,
  huellaDelActivo,
  versionDelPlan,
  versionesDe,
} from "../../../src/engine/activos/historial.ts";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { Etiquetas, Plan } from "../../../src/engine/planificador/esquemas.ts";

const RAIZ = process.cwd();
const json = (relativa: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8"));
const ID = "act-demo-clasificador";
const historial = () =>
  Historial.parse(json(`datos/historial/activos/${ID}.json`));
const actual = () => Activo.parse(json(`datos/activos/demo/${ID}.json`));
const plan = () => Plan.parse(json(`datos/planes/${ID}.plan.json`));

describe("versionesDe", () => {
  it("la versión 1 tiene exactamente la huella que el plan emitido cita", async () => {
    const versiones = await versionesDe(historial(), actual());
    const v1 = versiones.find((v) => v.n === 1)!;
    expect(v1.huella).toBe(plan().activo.huella);
    expect(await huellaDelActivo(v1.activo)).toBe(plan().activo.huella);
  });

  it("devuelve de la más nueva a la más vieja y marca la vigente, cuya huella es la del archivo de hoy", async () => {
    const versiones = await versionesDe(historial(), actual());
    expect(versiones.map((v) => [v.n, v.vigente])).toEqual([
      [2, true],
      [1, false],
    ]);
    expect(versiones[0]!.huella).toBe(await huellaDelActivo(actual()));
    expect(versiones[0]!.huella).not.toBe(versiones[1]!.huella);
  });

  it("un activo que cambió sin dejar una versión nueva rompe", async () => {
    const a = structuredClone(actual());
    a.perfil.pila = { es: "Otra pila", en: "Another stack" };
    await expect(versionesDe(historial(), a)).rejects.toThrow(
      /sin dejar una versión nueva/,
    );
  });

  it("una versión anterior con la huella de otro contenido rompe", async () => {
    const h = historial();
    h.anteriores[0]!.activo.perfil.pila = { es: "Alterada", en: "Altered" };
    await expect(versionesDe(h, actual())).rejects.toThrow(
      /no es la de su contenido/,
    );
  });

  it("las versiones deben ser consecutivas, y la vigente seguir a la última", async () => {
    const salto = historial();
    salto.anteriores[0]!.n = 3;
    await expect(versionesDe(salto, actual())).rejects.toThrow(
      /no son consecutivas/,
    );
    const tarde = historial();
    tarde.actual.n = 5;
    await expect(versionesDe(tarde, actual())).rejects.toThrow(
      /no sigue a la última/,
    );
  });

  it("un historial de otro activo rompe, y las fechas no pueden retroceder", async () => {
    const otro = historial();
    otro.activo = "act-demo-portal";
    await expect(versionesDe(otro, actual())).rejects.toThrow(/otro activo/);
    const atras = historial();
    atras.actual.fecha = "2026-01-01";
    await expect(versionesDe(atras, actual())).rejects.toThrow(/retroceden/);
  });

  it("el formato y los campos de más se rechazan (VALIDA, no transforma)", () => {
    const h = json(`datos/historial/activos/${ID}.json`) as Record<
      string,
      unknown
    >;
    expect(Historial.safeParse({ ...h, formato: "otro" }).success).toBe(false);
    expect(Historial.safeParse({ ...h, sobra: 1 }).success).toBe(false);
    expect(Historial.safeParse({ ...h, anteriores: [] }).success).toBe(false);
  });
});

describe("diferenciasDeActivo", () => {
  it("de la 1 a la 2 cambian el rasgo y el texto de los modelos, y nada más", async () => {
    const versiones = await versionesDe(historial(), actual());
    const cambios = await diferenciasDeActivo(
      versiones[1]!.activo,
      versiones[0]!.activo,
    );
    expect(cambios.map((c) => c.campo)).toEqual([
      "perfil.modelos",
      "rasgos.modelo_de_terceros",
    ]);
    const rasgo = cambios.find((c) => c.campo === "rasgos.modelo_de_terceros")!;
    expect([rasgo.antes, rasgo.despues]).toEqual([null, true]);
  });

  it("el orden de los conjuntos no es un cambio: la normalización lo absorbe", async () => {
    const a = actual();
    const b = structuredClone(a);
    b.familias = [...b.familias].reverse();
    b.entornos = [...b.entornos].reverse();
    expect(await diferenciasDeActivo(a, b)).toEqual([]);
  });

  it("un activo frente a sí mismo no tiene cambios", async () => {
    expect(await diferenciasDeActivo(actual(), actual())).toEqual([]);
  });
});

describe("estadoDelPlan", () => {
  const hoy = (activo: string, instantanea: string) => ({
    huella_del_activo: activo,
    huella_de_la_instantanea: instantanea,
  });
  const p = () => plan();

  it("vigente si cita la huella del activo de hoy y la de la instantánea oficial", () => {
    expect(
      estadoDelPlan(p(), hoy(p().activo.huella, p().instantanea.huella)),
    ).toEqual({ estado: "vigente", por: [] });
  });

  it("desactualizado por perfil si el activo es otro", async () => {
    expect(
      estadoDelPlan(p(), hoy(await huellaDelActivo(actual()), p().instantanea.huella)),
    ).toEqual({ estado: "plan_desactualizado", por: ["perfil"] });
  });

  it("desactualizado por catálogo si la instantánea oficial es otra", () => {
    expect(estadoDelPlan(p(), hoy(p().activo.huella, "0".repeat(64)))).toEqual({
      estado: "plan_desactualizado",
      por: ["catalogo"],
    });
  });

  it("si cambiaron las dos cosas, dice las dos, en ese orden: no elige una", () => {
    expect(estadoDelPlan(p(), hoy("1".repeat(64), "0".repeat(64)))).toEqual({
      estado: "plan_desactualizado",
      por: ["perfil", "catalogo"],
    });
  });

  it("el clasificador demo, de verdad: su plan se emitió con la versión 1 y hoy es la 2", async () => {
    const versiones = await versionesDe(historial(), actual());
    expect(versionDelPlan(versiones, p())?.n).toBe(1);
    expect(
      estadoDelPlan(
        p(),
        hoy(versiones[0]!.huella, p().instantanea.huella),
      ).por,
    ).toEqual(["perfil"]);
  });

  it("una huella de plan que no es de ninguna versión conocida no tiene versión", async () => {
    const versiones = await versionesDe(historial(), actual());
    const otro = { activo: { id: ID, huella: "9".repeat(64) } };
    expect(versionDelPlan(versiones, otro)).toBeNull();
  });
});

describe("el vocabulario del estado del plan es dato (regla dura 12)", () => {
  it("cada estado desactualizado tiene su etiqueta con símbolo, rol y los dos idiomas, en datos/planificador/etiquetas.json", () => {
    const e = Etiquetas.parse(json("datos/planificador/etiquetas.json"));
    const f = e.etiquetas.find((x) => x.id === "plan_desactualizado");
    expect(f).toBeDefined();
    expect(f!.simbolo).toBe("reloj");
    expect(f!.nombre.es.length).toBeGreaterThan(0);
    expect(f!.nombre.en.length).toBeGreaterThan(0);
    expect(ESTADOS_DEL_PLAN).toContain("plan_desactualizado");
    expect(CAUSAS_DE_DESACTUALIZACION).toEqual(["perfil", "catalogo"]);
  });
});
