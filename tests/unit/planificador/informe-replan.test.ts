// @vitest-environment node
// El informe del re-plan, directo (hasta ahora solo corría dentro del subproceso del CLI, donde la cobertura no lo ve): en los dos idiomas,
// con y sin archivos escritos, y la salida JSON. Lo que dice es lo que `replanear` calculó, sin decidir nada.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { Historial } from "../../../src/engine/activos/historial.ts";
import {
  informeDeReplan,
  salidaJsonDeReplan,
} from "../../../src/engine/planificador/informe-replan.ts";
import { Plan } from "../../../src/engine/planificador/esquemas.ts";
import { replanear } from "../../../src/engine/planificador/replanear.ts";
import {
  cargarDatosDelPlanificador,
  cargarPatrones,
} from "../../../src/lib/activos/cargar-activos.ts";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
} from "../../../src/lib/catalogo/cargar-instantanea.ts";

const RAIZ = process.cwd();
const ID = "act-demo-clasificador";
const json = (r: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, r), "utf8"));

async function replan(contra: "oficial" | "demo") {
  const oficial = (await cargarInstantaneaOficial(RAIZ)).instantanea;
  const demo = (await cargarInstantaneaDemo(RAIZ))!.instantanea;
  const historial = Historial.parse(json(`datos/historial/activos/${ID}.json`));
  const { formula, entornos } = cargarDatosDelPlanificador(RAIZ);
  const r = await replanear({
    plan: Plan.parse(json(`datos/planes/${ID}.plan.json`)),
    activoAnterior: historial.anteriores[0]!.activo,
    instantaneaAnterior: oficial,
    activoNuevo: Activo.parse(json(`datos/activos/demo/${ID}.json`)),
    instantaneaNueva: contra === "oficial" ? oficial : demo,
    formula,
    entornos,
    fecha: "2026-11-08",
    patrones: cargarPatrones(RAIZ),
  });
  return r.replan;
}

describe("informeDeReplan", () => {
  it("en español: los movimientos con su causa, la cuenta y los controles; sin escribir lo dice", async () => {
    const r = await replan("demo");
    const t = informeDeReplan(r, "es", null);
    expect(t).toContain(`Re-plan de ${ID}`);
    expect(t).toContain("ENTRAN (");
    expect(t).toContain("SALEN (");
    expect(t).toContain("SE QUEDAN (con algo que cambió)");
    expect(t).toContain(
      "PR-MD-DEMO-002  catálogo + perfil del activo (conjunta)",
    );
    expect(t).toContain("CONTROLES DE ISO/IEC 42001");
    expect(t).toContain("gana cobertura  iso42001-A.7.4");
    expect(t).toContain("pierde cobertura");
    expect(t).toContain("No se escribió nada.");
  });

  it("en inglés: mismas cuentas, otras palabras", async () => {
    const r = await replan("demo");
    const t = informeDeReplan(r, "en", null);
    expect(t).toContain(`Re-plan of ${ID}`);
    expect(t).toContain("ENTER (");
    expect(t).toContain("LEAVE (");
    expect(t).toContain("STAY (with something that changed)");
    expect(t).toContain("catalog + asset profile (joint)");
    expect(t).toContain("ISO/IEC 42001 CONTROLS");
    expect(t).toContain("gains coverage");
    expect(t).toContain("Nothing was written.");
    expect(t).toContain(
      `enter ${r.entran.length} · leave ${r.salen.length} · stay ${r.se_quedan.length}`,
    );
  });

  it("contra el mismo catálogo solo cambia el perfil del activo: la causa es «perfil», sin controles de más", async () => {
    const r = await replan("oficial");
    const t = informeDeReplan(r, "es", null);
    expect(t).toContain("PR-MD-DER-001  perfil del activo");
    expect(t).not.toContain("(conjunta)");
  });

  it("con archivos: dice lo archivado y lo escrito, en los dos idiomas", async () => {
    const r = await replan("demo");
    const rutas = {
      plan: "datos/planes/x.plan.json",
      paquete: "datos/planes/x.paquete.json",
      archivado: {
        plan: "datos/planes/anteriores/x.abc.plan.json",
        paquete: "datos/planes/anteriores/x.abc.paquete.json",
      },
    };
    const es = informeDeReplan(r, "es", rutas);
    expect(es).toContain("Archivado: datos/planes/anteriores/x.abc.plan.json");
    expect(es).toContain("Escrito: datos/planes/x.plan.json");
    expect(es).not.toContain("No se escribió nada.");
    const en = informeDeReplan(r, "en", rutas);
    expect(en).toContain(
      "Archived: datos/planes/anteriores/x.abc.paquete.json",
    );
    expect(en).toContain("Written: datos/planes/x.paquete.json");
  });

  it("con otra carpeta de salida no hay archivado: el anterior sigue donde estaba", async () => {
    const r = await replan("demo");
    const rutas = {
      plan: "o/x.plan.json",
      paquete: "o/x.paquete.json",
      archivado: null,
    };
    const es = informeDeReplan(r, "es", rutas);
    expect(es).toContain(
      "El plan anterior sigue donde estaba: no se reemplazó nada.",
    );
    expect(es).not.toContain("Archivado:");
    expect(es).toContain("Escrito: o/x.plan.json");
    expect(informeDeReplan(r, "en", rutas)).toContain(
      "The earlier plan stays where it was: nothing was replaced.",
    );
  });

  it("la salida JSON trae el re-plan tal cual y lo escrito (o null)", async () => {
    const r = await replan("demo");
    expect(salidaJsonDeReplan(r, null)).toEqual({ replan: r, escrito: null });
    const rutas = { plan: "p", paquete: "q", archivado: null };
    expect(salidaJsonDeReplan(r, rutas).escrito).toEqual(rutas);
  });
});
