// @vitest-environment node
// La vista de «Controles»: las cuentas son las de la instantánea oficial (9 áreas, 38 controles, 8 con pruebas, 10 pruebas
// sin control), el aviso «no contrastado con la norma» viene del dato y los equivalentes traen el estado «mapa incompleto».
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { construirVistaDeControles } from "../../../src/lib/catalogo/controles.ts";

const RAIZ = join(__dirname, "..", "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const vista = construirVistaDeControles(
  snap,
  archivo.replace(/\.json$/, ""),
  snap.fecha_evaluacion,
);
const capa = snap.catalogo.controles[0]!;
const todos = capa.areas.flatMap((a) => a.controles);

describe("la vista de controles dice lo que la instantánea oficial dice", () => {
  it("trae las 9 áreas del Anexo A con sus 38 controles", () => {
    expect(vista.areas.map((a) => a.id)).toEqual(capa.areas.map((a) => a.id));
    expect(vista.areas).toHaveLength(9);
    expect(vista.areas.flatMap((a) => a.controles)).toHaveLength(38);
    expect(vista.capa.controles).toBe(38);
    expect(vista.capa.sinCapaPropia).toBe(true);
  });

  it("dice cuántos resúmenes no se contrastaron con la norma: los de la instantánea", () => {
    expect(vista.capa.sinContrastar).toBe(
      todos.filter((c) => !c.verificado_contra_norma).length,
    );
    expect(vista.capa.sinContrastar).toBe(38);
    expect(vista.capa.descripcion.es).toMatch(/contrastado/);
    expect(vista.capa.descripcion.en).toMatch(/checked/);
  });

  it("los controles con pruebas son exactamente los que alguna prueba cita, cada uno con las pruebas que lo citan", () => {
    const citados = new Set(snap.catalogo.pruebas.flatMap((p) => p.controles));
    expect(vista.conPruebas.map((c) => c.id).sort()).toEqual(
      [...citados].sort(),
    );
    for (const c of vista.conPruebas) {
      const quienes = snap.catalogo.pruebas
        .filter((p) => p.controles.includes(c.id))
        .map((p) => p.id);
      expect(c.pruebas.map((p) => p.id)).toEqual(quienes);
      expect(c.resumen.es.length).toBeGreaterThan(0);
    }
  });

  it("las pruebas de cada área son las distintas que citan algún control del área, y suman con las demás", () => {
    for (const a of vista.areas) {
      const ids = new Set(
        snap.catalogo.pruebas
          .filter((p) =>
            p.controles.some((c) => a.controles.some((x) => x.id === c)),
          )
          .map((p) => p.id),
      );
      expect(a.pruebas).toBe(ids.size);
    }
    expect(vista.areas.filter((a) => a.pruebas > 0)).not.toHaveLength(0);
  });

  it("las pruebas sin control son las que no citan ninguno, y cada una dice si su control está pendiente", () => {
    const sin = snap.catalogo.pruebas.filter((p) => p.controles.length === 0);
    expect(vista.sinControl.map((p) => p.id)).toEqual(sin.map((p) => p.id));
    expect(vista.sinControl).toHaveLength(10);
    for (const p of vista.sinControl) {
      expect(p.pendiente).toBe(
        snap.catalogo.pruebas.find((x) => x.id === p.id)!.control_pendiente ===
          true,
      );
    }
  });

  it("los equivalentes de otro marco traen su referencia y el estado «mapa incompleto» del vocabulario", () => {
    const con = vista.conPruebas.flatMap((c) => c.equivalentes);
    expect(con.length).toBeGreaterThan(0);
    for (const e of con) {
      expect(e.marco).toMatch(/ \S+$/);
      expect(e.referencia.length).toBeGreaterThan(0);
      expect(e.incompleto?.nombre).toEqual({
        es: "Mapa incompleto",
        en: "Incomplete map",
      });
      expect(e.incompleto?.simbolo).toBe("aviso");
    }
  });

  it("sin la capa por defecto la vista falla con las dos lenguas, no muestra una capa vacía como si estuviera bien", () => {
    const sinCapa = structuredClone(snap);
    sinCapa.catalogo.controles = [];
    expect(() =>
      construirVistaDeControles(sinCapa, "x", snap.fecha_evaluacion),
    ).toThrow(/capa de controles por defecto/);
  });
});
