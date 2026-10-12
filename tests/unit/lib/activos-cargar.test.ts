// @vitest-environment node
// El cargador del build cierra en falla: un plan que no es lo que dice ser rompe el build en vez de mostrarse. Cada comprobación
// se demuestra con una copia de `datos/` a la que se le rompe algo. Y la vista rechaza lo que no puede nombrar.
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  cargarActivosDelBuild,
  textoDelPaquete,
} from "../../../src/lib/activos/cargar.ts";
import {
  ACCESO,
  DATOS,
  EXPOSICION,
  PRIMER_ACTIVO,
} from "../../../src/lib/activos/etiquetas.ts";
import {
  construirVistaDeActivo,
  construirVistaDePlan,
  vigenciaDeFecha,
} from "../../../src/lib/activos/vista.ts";
import { copia } from "../planificador/ayuda.ts";
import {
  instantanea,
  mundo,
  nombreDeLaInstantanea,
} from "./mundo-de-activos.ts";

const RAIZ = process.cwd();
const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

/** Una copia de lo que lee el cargador, para romperle algo. */
function raiz() {
  const r = mkdtempSync(path.join(tmpdir(), "hackguard-cargar-"));
  temporales.push(r);
  for (const c of ["activos", "planes", "planificador"])
    cpSync(path.join(RAIZ, "datos", c), path.join(r, "datos", c), {
      recursive: true,
    });
  return r;
}
const leer = (r: string, ruta: string) =>
  readFileSync(path.join(r, ruta), "utf8");
const escribir = (r: string, ruta: string, texto: string) =>
  writeFileSync(path.join(r, ruta), texto);
const ASISTENTE = "act-demo-asistente";

describe("cargarActivosDelBuild", () => {
  it("con lo versionado carga los tres activos y solo los autorizados traen plan y paquete", () => {
    expect(
      mundo.activos.map((a) => [
        a.activo.id,
        a.plan !== null,
        a.paquete !== null,
      ]),
    ).toEqual([
      ["act-demo-asistente", true, true],
      ["act-demo-clasificador", true, true],
      ["act-demo-portal", false, false],
    ]);
  });

  it("un plan sin su huella verdadera rompe el build", async () => {
    const r = raiz();
    const ruta = `datos/planes/${ASISTENTE}.plan.json`;
    const plan = JSON.parse(leer(r, ruta));
    plan.fecha_emision = "2026-12-31";
    escribir(r, ruta, JSON.stringify(plan));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /huella declarada/,
    );
  });

  it("un activo que cambió después de emitir su plan rompe el build", async () => {
    const r = raiz();
    const ruta = "datos/activos/demo/act-demo-asistente.json";
    const activo = JSON.parse(leer(r, ruta));
    activo.perfil.datos = "personales";
    escribir(r, ruta, JSON.stringify(activo));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /cambió desde que se emitió/,
    );
  });

  it("un plan que cita otra instantánea que la oficial rompe el build", async () => {
    const otra = { ...copia(instantanea), huella: "0".repeat(64) };
    await expect(cargarActivosDelBuild(otra, RAIZ)).rejects.toThrow(
      /otra instantánea/,
    );
  });

  it("una fórmula distinta de la que usó el plan rompe el build", async () => {
    const r = raiz();
    const ruta = "datos/planificador/formula.json";
    const f = JSON.parse(leer(r, ruta));
    f.techo = 4;
    escribir(r, ruta, JSON.stringify(f));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /fórmula o los entornos cambiaron/,
    );
  });

  it("un paquete que no es el que cita el plan rompe el build", async () => {
    const r = raiz();
    const ruta = `datos/planes/${ASISTENTE}.paquete.json`;
    const p = JSON.parse(leer(r, ruta));
    p.alcance.ventana.es = "Siempre";
    escribir(r, ruta, JSON.stringify(p));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /paquete no es el que cita/,
    );
  });

  it("un activo autorizado sin plan emitido dice qué comando correr", async () => {
    const r = raiz();
    rmSync(path.join(r, `datos/planes/${ASISTENTE}.plan.json`));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /pnpm plan:emitir act-demo-asistente/,
    );
  });

  it("un activo sin autorización con un plan emitido rompe el build (regla dura 5)", async () => {
    const r = raiz();
    cpSync(
      path.join(r, `datos/planes/${ASISTENTE}.plan.json`),
      path.join(r, "datos/planes/act-demo-portal.plan.json"),
    );
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /no está autorizado y tiene un plan/,
    );
  });

  it("un activo que no pasa su validación rompe el build", async () => {
    const r = raiz();
    const ruta = "datos/activos/demo/act-demo-portal.json";
    const a = JSON.parse(leer(r, ruta));
    a.rasgos.rasgo_imaginario = true;
    escribir(r, ruta, JSON.stringify(a));
    await expect(cargarActivosDelBuild(instantanea, r)).rejects.toThrow(
      /no pasan su validación/,
    );
  });

  it("la descarga son los bytes del archivo versionado", () => {
    expect(textoDelPaquete(ASISTENTE, RAIZ)).toBe(
      leer(RAIZ, `datos/planes/${ASISTENTE}.paquete.json`),
    );
  });
});

describe("la vista", () => {
  it("no nombra lo que no existe", () => {
    expect(() =>
      construirVistaDeActivo(
        "act-fantasma",
        mundo,
        instantanea,
        nombreDeLaInstantanea,
        "2026-10-11",
      ),
    ).toThrow(/no hay un activo/);
    const sinEtiqueta = {
      ...mundo,
      datos: {
        ...mundo.datos,
        etiquetas: { ...mundo.datos.etiquetas, etiquetas: [] },
      },
    };
    expect(() =>
      construirVistaDePlan(
        ASISTENTE,
        sinEtiqueta,
        instantanea,
        nombreDeLaInstantanea,
        "2026-10-11",
      ),
    ).toThrow(/etiquetas.json/);
    const sinMotivos = {
      ...mundo,
      datos: {
        ...mundo.datos,
        motivos: { ...mundo.datos.motivos, motivos: [] },
      },
    };
    expect(() =>
      construirVistaDePlan(
        ASISTENTE,
        sinMotivos,
        instantanea,
        nombreDeLaInstantanea,
        "2026-10-11",
      ),
    ).toThrow(/sin definir/);
  });

  it("la vigencia de una fecha propia cuenta días y rechaza una consulta anterior", () => {
    expect(
      vigenciaDeFecha(instantanea.catalogo, "2026-09-20", "2026-10-11"),
    ).toMatchObject({ dias: 21, estado: "vigente" });
    expect(
      vigenciaDeFecha(instantanea.catalogo, "2026-09-20", "2026-10-20"),
    ).toMatchObject({ estado: "por_revisar" });
    expect(() =>
      vigenciaDeFecha(instantanea.catalogo, "2026-09-20", "2026-09-01"),
    ).toThrow(RangeError);
  });

  it("el selector marca el activo abierto y el estado de cada uno sale de su plan", () => {
    const v = construirVistaDeActivo(
      ASISTENTE,
      mundo,
      instantanea,
      nombreDeLaInstantanea,
      "2026-10-11",
    );
    expect(v.selector.map((s) => [s.id, s.actual])).toEqual([
      ["act-demo-asistente", true],
      ["act-demo-clasificador", false],
      ["act-demo-portal", false],
    ]);
    expect(v.selector.map((s) => s.estado.nombre.es)).toEqual([
      "Con plan",
      "Con plan",
      "Registrado, sin plan",
    ]);
  });

  it("el activo que abre «Activos» existe, y cada valor del perfil tiene su texto", () => {
    expect(mundo.activos.map((a) => a.activo.id)).toContain(PRIMER_ACTIVO);
    for (const a of mundo.activos) {
      expect(EXPOSICION[a.activo.perfil.exposicion]).toBeDefined();
      expect(DATOS[a.activo.perfil.datos]).toBeDefined();
      expect(ACCESO[a.activo.acceso]).toBeDefined();
    }
  });
});
