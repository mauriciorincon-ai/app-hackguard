// @vitest-environment node
// Las piezas del planificador una por una: aplicabilidad, herramienta y entorno, alcance, cobertura, prioridad
// y los informes. Lo que el plan entero prueba en conjunto, aquí con sus casos de borde.
import { describe, expect, it } from "vitest";
import { fueraDeAlcance } from "../../../src/engine/planificador/alcance.ts";
import { aplicaPorPerfil } from "../../../src/engine/planificador/aplicabilidad.ts";
import { coberturaDe } from "../../../src/engine/planificador/cobertura.ts";
import { elegirHerramienta } from "../../../src/engine/planificador/herramienta.ts";
import {
  codigoDeActivos,
  informeDeActivos,
  informeDePlan,
  salidaJsonDeActivos,
  salidaJsonDePlan,
} from "../../../src/engine/planificador/informe.ts";
import {
  comparar,
  ordenado,
  ordenadoPor,
} from "../../../src/engine/planificador/orden.ts";
import { planificar } from "../../../src/engine/planificador/planificar.ts";
import { prioridadDe } from "../../../src/engine/planificador/prioridad.ts";
import { validarActivos } from "../../../src/engine/activos/validar.ts";
import { normalizarActivo } from "../../../src/engine/activos/normalizar.ts";
import { ASISTENTE, copia, FECHA, mundo, PORTAL } from "./ayuda.ts";

const cond = (rasgo: string, valor: boolean | string) => ({ rasgo, valor });
const aplicabilidad = (
  modo: "todas" | "alguna",
  ...condiciones: ReturnType<typeof cond>[]
) => ({
  modo,
  condiciones,
  descripcion: { es: "x", en: "x" },
});

describe("aplicabilidad", () => {
  const activo = {
    rasgos: { a: true, b: false },
    acceso: "caja_blanca" as const,
  };
  it("«todas» pide todas; «alguna» pide una; el rasgo ausente es falso", () => {
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("todas", cond("a", true), cond("b", false)),
      ),
    ).toBe(true);
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("todas", cond("a", true), cond("c", true)),
      ),
    ).toBe(false);
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("alguna", cond("c", true), cond("a", true)),
      ),
    ).toBe(true);
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("alguna", cond("c", true), cond("b", true)),
      ),
    ).toBe(false);
    expect(
      aplicaPorPerfil(activo, aplicabilidad("todas", cond("c", false))),
    ).toBe(true);
  });
  it("tipo_de_acceso sale del campo «acceso» del activo", () => {
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("todas", cond("tipo_de_acceso", "caja_blanca")),
      ),
    ).toBe(true);
    expect(
      aplicaPorPerfil(
        activo,
        aplicabilidad("todas", cond("tipo_de_acceso", "caja_negra")),
      ),
    ).toBe(false);
  });
});

describe("herramienta y entorno (RF-03.3)", () => {
  const rec = (
    herramienta: string,
    entorno: "portatil" | "contenedor" | "plan_gratuito",
    version_minima?: string,
  ) => ({
    herramienta,
    entorno,
    ...(version_minima === undefined ? {} : { version_minima }),
    selector: { tipo: "modulo" as const, referencia: herramienta },
  });
  const prueba = (
    medido_con: string,
    ...herramientas_recomendadas: ReturnType<typeof rec>[]
  ) => ({
    herramientas_recomendadas,
    resultado_esperado: { descripcion: { es: "x", en: "x" }, medido_con },
  });

  it("primero la que mide el resultado esperado", async () => {
    const m = await mundo();
    const e = elegirHerramienta(
      prueba("b", rec("a", "portatil"), rec("b", "contenedor", "2.0")),
      ["portatil", "contenedor"],
      m.entornos,
    );
    expect(e).toMatchObject({
      id: "b",
      entorno: "contenedor",
      version_minima: "2.0",
    });
  });

  it("sin ella disponible, el entorno de menor orden: lo local antes que el plan gratuito", async () => {
    const m = await mundo();
    const e = elegirHerramienta(
      prueba("z", rec("a", "plan_gratuito"), rec("b", "contenedor")),
      ["plan_gratuito", "contenedor"],
      m.entornos,
    );
    expect(e?.id).toBe("b");
  });

  it("a igualdad, el orden del catálogo; sin entorno disponible, ninguna", async () => {
    const m = await mundo();
    const dos = prueba("z", rec("a", "portatil"), rec("b", "portatil"));
    expect(elegirHerramienta(dos, ["portatil"], m.entornos)?.id).toBe("a");
    expect(elegirHerramienta(dos, ["contenedor"], m.entornos)).toBeNull();
    expect(
      elegirHerramienta(dos, ["portatil"], m.entornos)?.version_minima,
    ).toBeNull();
  });
});

describe("alcance", () => {
  const alcance = {
    incluye: [],
    excluye: [],
    familias: ["software"],
    ventana: { es: "v", en: "v" },
    limites: { es: "l", en: "l" },
    fuera: [
      {
        prueba: "PR-SW-X-001",
        razon: { es: "razón del dueño", en: "owner's reason" },
      },
    ],
  };
  it("la razón del dueño manda; luego la familia; si no, dentro", () => {
    expect(
      fueraDeAlcance(alcance, { id: "PR-SW-X-001", familia: "software" })?.es,
    ).toBe("razón del dueño");
    expect(
      fueraDeAlcance(alcance, { id: "PR-AG-Y-001", familia: "agente" })?.es,
    ).toMatch(/familia/);
    expect(
      fueraDeAlcance(alcance, { id: "PR-SW-Z-001", familia: "software" }),
    ).toBeNull();
  });
});

describe("cobertura", () => {
  it("el universo son los controles de las candidatas; cubre quien está planeada", () => {
    const c = coberturaDe(
      [{ controles: ["c2", "c1"] }, { controles: ["c3"] }, { controles: [] }],
      [
        { prueba: "P-2", controles: ["c1"] },
        { prueba: "P-1", controles: ["c1", "c2"] },
      ],
    );
    expect(c).toEqual([
      { control: "c1", estado: "con_prueba", pruebas: ["P-1", "P-2"] },
      { control: "c2", estado: "con_prueba", pruebas: ["P-1"] },
      { control: "c3", estado: "sin_prueba", pruebas: [] },
    ]);
  });
});

describe("normalizar el activo", () => {
  it("ordena los conjuntos y deja en su sitio las listas con sentido propio", async () => {
    const m = await mundo();
    const a = copia(m.activos[ASISTENTE]!);
    a.familias.reverse();
    a.ajustes.reverse();
    const n = normalizarActivo(a);
    expect(n.familias).toEqual([...a.familias].sort());
    expect(n.ajustes.map((x) => x.prueba)).toEqual([...n.ajustes.map((x) => x.prueba)].sort());
    expect(n.reglas).toEqual(a.reglas);
    expect(Object.keys(n.rasgos)).toEqual(Object.keys(n.rasgos).sort());
  });
  it("un activo sin alcance sigue sin alcance", async () => {
    const m = await mundo();
    expect(normalizarActivo(m.activos[PORTAL]!).alcance).toBeNull();
  });
});

describe("prioridad y orden", () => {
  it("el techo corta aunque el tope deje pasar", async () => {
    const m = await mundo();
    const perfil = m.activos[ASISTENTE]!.perfil;
    const alta = prioridadDe(5, perfil, { ...m.formula, tope_de_ajuste: 3 });
    expect(alta).toMatchObject({ base: 5, ajuste: 2, final: 5 });
    expect(
      prioridadDe(
        3,
        { ...perfil, exposicion: "interna", actua: false, datos: "publicos" },
        m.formula,
      ).ajustes,
    ).toEqual([]);
  });
  it("el orden es por punto de código, sin idioma", () => {
    expect(comparar("a", "b")).toBe(-1);
    expect(comparar("b", "a")).toBe(1);
    expect(comparar("a", "a")).toBe(0);
    expect(ordenado(["b", "B", "a"])).toEqual(["B", "a", "b"]);
    expect(ordenadoPor([{ k: "2" }, { k: "1" }], (x) => x.k)).toEqual([
      { k: "1" },
      { k: "2" },
    ]);
  });
});

describe("informes", () => {
  async function resultados() {
    const m = await mundo();
    const base = {
      instantanea: m.instantanea,
      formula: m.formula,
      entornos: m.entornos,
      fecha: FECHA,
      patrones: m.patrones,
    };
    return {
      m,
      ok: await planificar({ ...base, activo: m.activos[ASISTENTE]! }),
      bloqueado: await planificar({ ...base, activo: m.activos[PORTAL]! }),
      sinHerramienta: await planificar({
        ...base,
        activo: {
          ...copia(m.activos[ASISTENTE]!),
          entornos: ["portatil" as const],
        },
      }),
    };
  }
  const rutas = {
    plan: "datos/planes/x.plan.json",
    paquete: "datos/planes/x.paquete.json",
  };

  it("el plan emitido en los dos idiomas", async () => {
    const { ok } = await resultados();
    const es = informeDePlan(ok, rutas, "es");
    expect(es).toContain("Plan emitido: datos/planes/x.plan.json");
    expect(es).toContain("14 planeadas · 12 excluidas");
    expect(informeDePlan(ok, rutas, "en")).toContain(
      "14 planned · 12 excluded",
    );
    expect(informeDePlan(ok, null, "es")).toContain("(sin escribir)");
    expect(informeDePlan(ok, null, "en")).toContain("(not written)");
  });

  it("el bloqueo dice por qué y que no escribió nada", async () => {
    const { bloqueado } = await resultados();
    expect(informeDePlan(bloqueado, null, "es")).toMatch(
      /sin ellos no hay plan[\s\S]*No se escribió nada/,
    );
    expect(informeDePlan(bloqueado, null, "en")).toMatch(
      /without them there is no plan[\s\S]*Nothing was written/,
    );
  });

  it("las pruebas sin herramienta y el texto marcado se dicen", async () => {
    const { sinHerramienta, ok, m } = await resultados();
    expect(informeDePlan(sinHerramienta, rutas, "es")).toContain(
      "6 planeadas sin herramienta",
    );
    expect(informeDePlan(sinHerramienta, rutas, "en")).toContain(
      "6 planned without a tool",
    );
    if (!ok.emitido) throw new Error("plan esperado");
    const marcado = {
      ...ok,
      marcas: [
        { campo: "alcance.limites.es", patron: "bloque-con-interprete" },
      ],
    };
    expect(informeDePlan(marcado, rutas, "es")).toContain(
      "alcance.limites.es · bloque-con-interprete",
    );
    expect(informeDePlan(marcado, rutas, "en")).toContain(
      "flagged 1 owner texts",
    );
    expect(m).toBeTruthy();
  });

  it("la salida de máquina", async () => {
    const { ok, bloqueado } = await resultados();
    expect(salidaJsonDePlan(ok, rutas)).toMatchObject({
      emitido: true,
      codigo_de_salida: 0,
      plan: rutas.plan,
    });
    expect(salidaJsonDePlan(ok, null)).toMatchObject({
      plan: null,
      paquete: null,
    });
    expect(salidaJsonDePlan(bloqueado, null)).toEqual({
      emitido: false,
      codigo_de_salida: 2,
      motivo: "sin_autorizacion",
      activo: PORTAL,
    });
  });

  it("los activos en los dos idiomas y en JSON", async () => {
    const m = await mundo();
    const v = validarActivos(m.archivos, {
      familias: m.instantanea.catalogo.familias.map((f) => f.id),
      rasgos: m.instantanea.catalogo.rasgos,
      pruebas: m.instantanea.catalogo.pruebas,
    });
    expect(informeDeActivos(v, "es")).toMatch(
      /Activos: con advertencias[\s\S]*3 válidos · 2 con alcance y reglas · 1 sin autorización/,
    );
    expect(informeDeActivos(v, "en")).toMatch(
      /Assets: with warnings[\s\S]*3 valid · 2 with scope and rules · 1 not authorized/,
    );
    expect(salidaJsonDeActivos(v)).toMatchObject({
      estado: "con_advertencias",
      codigo_de_salida: 1,
    });
    expect(codigoDeActivos("invalido")).toBe(2);
    const roto = validarActivos(
      [{ ruta: "datos/activos/demo/x.json", texto: "{" }],
      { familias: [], rasgos: [], pruebas: [] },
    );
    expect(informeDeActivos(roto, "es")).toContain("✗");
    expect(informeDeActivos(roto, "es")).toContain("Errores (1)");
  });
});
