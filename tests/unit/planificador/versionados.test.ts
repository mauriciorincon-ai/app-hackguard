// @vitest-environment node
// Los planes y paquetes de `datos/planes/` son los que el CLI escribiría hoy: cada uno cita su activo, la
// instantánea oficial, la fórmula y los entornos vigentes, y su propia huella. Si el catálogo o un activo
// cambian sin re-emitir, esto falla: es lo que cierra la nota de ADR-002 («mientras ningún plan la cite»).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizarActivo } from "../../../src/engine/activos/normalizar.ts";
import { ROLES, SIMBOLOS } from "../../../src/engine/catalogo/esquemas.ts";
import { huella } from "../../../src/engine/huella.ts";
import {
  MOTIVOS_DE_EXCLUSION,
  Motivos,
  Paquete,
  Plan,
  Plantilla,
} from "../../../src/engine/planificador/esquemas.ts";
import { planificar } from "../../../src/engine/planificador/planificar.ts";
import { ASISTENTE, CLASIFICADOR, mundo, PORTAL, RAIZ } from "./ayuda.ts";

const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), "utf8");
const archivosDePlanes = readdirSync(path.join(RAIZ, "datos/planes")).sort();

describe("datos/planes/", () => {
  it("hay un plan y un paquete por activo autorizado, y ninguno para el portal", () => {
    expect(archivosDePlanes).toEqual([
      `${ASISTENTE}.paquete.json`,
      `${ASISTENTE}.plan.json`,
      `${CLASIFICADOR}.paquete.json`,
      `${CLASIFICADOR}.plan.json`,
    ]);
    expect(archivosDePlanes.some((a) => a.includes(PORTAL))).toBe(false);
  });

  it.each([ASISTENTE, CLASIFICADOR])(
    "%s: cita lo vigente y re-emitido da los mismos bytes",
    async (id) => {
      const m = await mundo();
      const planTexto = leer(`datos/planes/${id}.plan.json`);
      const paqueteTexto = leer(`datos/planes/${id}.paquete.json`);
      const plan = Plan.parse(JSON.parse(planTexto));
      const paquete = Paquete.parse(JSON.parse(paqueteTexto));
      // Cita la instantánea oficial: si aparece otra, hay que re-emitir los planes.
      expect(plan.instantanea).toEqual({
        fecha: m.instantanea.fecha_evaluacion,
        huella: m.instantanea.huella,
      });
      expect(plan.activo.huella).toBe(
        await huella(normalizarActivo(m.activos[id]!)),
      );
      expect(plan.formula.huella).toBe(await huella(m.formula));
      expect(plan.entornos.huella).toBe(await huella(m.entornos));
      expect(plan.paquete.huella).toBe(paquete.huella);
      // Re-emitido con la fecha del propio plan, son exactamente los mismos bytes.
      const r = await planificar({
        activo: m.activos[id]!,
        instantanea: m.instantanea,
        formula: m.formula,
        entornos: m.entornos,
        fecha: plan.fecha_emision,
      });
      if (!r.emitido) throw new Error("plan esperado");
      expect(`${JSON.stringify(r.plan, null, 2)}\n`).toBe(planTexto);
      expect(`${JSON.stringify(r.paquete, null, 2)}\n`).toBe(paqueteTexto);
    },
  );
});

describe("los datos del planificador", () => {
  it("los motivos de exclusión son los tres del motor, con rol y símbolo del design system", () => {
    const motivos = Motivos.parse(
      JSON.parse(leer("datos/planificador/motivos.json")),
    );
    expect(motivos.motivos.map((x) => x.id).sort()).toEqual(
      [...MOTIVOS_DE_EXCLUSION].sort(),
    );
    for (const x of motivos.motivos) {
      expect(ROLES).toContain(x.rol);
      expect(SIMBOLOS).toContain(x.simbolo);
    }
  });

  it("la plantilla para activos propios", () => {
    const p = Plantilla.parse(
      JSON.parse(leer("datos/planificador/plantilla.json")),
    );
    expect(p.alcance.length).toBeGreaterThan(0);
    expect(p.reglas.length).toBeGreaterThan(0);
  });

  it("los activos versionados son todos demo (los reales viven en datos/privado/)", async () => {
    const m = await mundo();
    expect(Object.values(m.activos).every((a) => a.origen === "demo")).toBe(
      true,
    );
  });

  it("cada dato del planificador trae su texto en español y en inglés", async () => {
    const m = await mundo();
    for (const t of [
      m.formula.origen,
      m.entornos.nota,
      ...m.formula.ajustes.map((a) => a.razon),
      ...m.entornos.entornos.map((e) => e.nombre),
    ]) {
      expect(t.es.length).toBeGreaterThan(0);
      expect(t.en.length).toBeGreaterThan(0);
      expect(t.es).not.toBe(t.en);
    }
  });
});
