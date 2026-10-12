// @vitest-environment node
// El ciclo de vida del hallazgo. El estado se CALCULA; solo una re-prueba válida cierra; y cada camino por el que una
// re-prueba NO cierra se demuestra con su motivo (regla dura 6: la ausencia en un escaneo posterior nunca lo cierra).
import { describe, expect, it } from "vitest";
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import {
  cuentaComoFalla,
  ESTADOS_CON_PLAZO,
  ESTADOS_QUE_CUENTAN_COMO_FALLA,
  evaluarHallazgo,
  motivosDeRechazo,
  sobreVigente,
} from "../../../src/engine/hallazgos/ciclo.ts";
import { ESTADOS_DE_HALLAZGO, MOTIVOS_DE_RECHAZO, type Evento, type Hallazgo } from "../../../src/engine/hallazgos/esquemas.ts";
import { copia, mundo, nuevo } from "../evidencia/ayuda.ts";

const POR = "Operador demo";
const nota = { es: "n", en: "n" };

/** El libro demo con un sobre cambiado o agregado. */
async function libroCon(...cambios: Sobre[]) {
  const m = await mundo();
  const porId = new Map(Object.values(m.sobres).map((s) => [s.id, s]));
  for (const c of cambios) porId.set(c.id, c);
  return [...porId.values()];
}
const hz = async (id: string, eventos?: Evento[]): Promise<Hallazgo> => {
  const m = await mundo();
  return { ...copia(m.hallazgos[id]!), ...(eventos ? { eventos } : {}) };
};
function evaluar(h: Hallazgo, libro: readonly Sobre[]) {
  const r = evaluarHallazgo(h, libro);
  if (!r.ok) throw new Error(r.motivo);
  return r.evaluacion;
}
/** La re-prueba demo de HZ-0003 (SOB-0027) con lo que cambie, sellada con su crudo sintético. */
async function reprueba(cambios: Partial<Omit<Sobre, "huellas" | "id">> = {}): Promise<Sobre> {
  const m = await mundo();
  return nuevo(m.sobres["SOB-0027"]!, "SOB-0027", cambios);
}

describe("los cuatro hallazgos demo recorren los estados de la maqueta", () => {
  it.each([
    ["HZ-0007", "abierto", true],
    ["HZ-0009", "corregido", true],
    ["HZ-0005", "aceptado_con_riesgo", true],
    ["HZ-0003", "cerrado", false],
  ] as const)("%s está %s (cuenta como falla del control: %s)", async (id, estado, cuenta) => {
    const m = await mundo();
    const e = evaluar(m.hallazgos[id]!, Object.values(m.sobres));
    expect(e.estado).toBe(estado);
    expect(e.cuentaComoFalla).toBe(cuenta);
  });

  it("HZ-0003 se cierra por la re-prueba SOB-0027, con la fecha en que una persona la confirmó", async () => {
    const m = await mundo();
    const e = evaluar(m.hallazgos["HZ-0003"]!, Object.values(m.sobres));
    expect(e.cierre).toEqual({ tipo: "reprueba", fecha: "2026-09-24", sobre: "SOB-0027" });
    expect(e.apertura).toBe("2026-08-18");
    expect(e.activo).toBe("act-demo-asistente");
    expect(e.prueba).toBe("PR-IA-PINJ-001");
  });

  it("HZ-0009 tiene su re-prueba SIN confirmar: no cuenta y se ve como «por confirmar»", async () => {
    const m = await mundo();
    const e = evaluar(m.hallazgos["HZ-0009"]!, Object.values(m.sobres));
    expect(e.porConfirmar.map((s) => s.id)).toEqual(["SOB-0036"]);
    expect(e.candidatas).toEqual([]);
    expect(e.cierre).toBeNull();
  });

  it("HZ-0005 conserva su aceptación y HZ-0007 no tiene nada", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    expect(evaluar(m.hallazgos["HZ-0005"]!, libro).aceptacion?.revision_en_dias).toBe(90);
    expect(evaluar(m.hallazgos["HZ-0007"]!, libro)).toMatchObject({ correccion: null, aceptacion: null, cierre: null });
  });
});

describe("una re-prueba que NO cierra, con su motivo", () => {
  const casos: [string, (typeof MOTIVOS_DE_RECHAZO)[number], Partial<Omit<Sobre, "huellas" | "id">> | (() => Promise<Partial<Omit<Sobre, "huellas" | "id">>>)][] = [
    ["sin confirmar", "sin_confirmar", { confirmacion: null }],
    ["de otro activo", "otro_activo", { activo: "act-demo-clasificador" }],
    ["de otra prueba", "otra_prueba", { prueba: "PR-IA-ENC-002" }],
    ["sin constancia de ejecución", "no_ejecutada", { resultado: { ejecutada: false, evaluadas: 20, fallidas: 0, alertas: null, metrica: null }, veredicto: "no_ejecutada" }],
    ["que sigue fallando", "no_superada", { resultado: { ejecutada: true, evaluadas: 20, fallidas: 2, alertas: null, metrica: null }, veredicto: "fallida" }],
    ["el mismo día de la corrección", "anterior_a_la_correccion", { fecha: "2026-09-10" }],
    ["antes de la corrección", "anterior_a_la_correccion", { fecha: "2026-09-09" }],
    ["con otra herramienta", "otra_herramienta", { herramienta: { id: "promptfoo", version: "0.17.0" } }],
    ["con otra versión de la herramienta", "otra_version", { herramienta: { id: "garak", version: "0.18.0" } }],
    ["con otro selector", "otro_selector", async () => ({ selector: { ...(await mundo()).sobres["SOB-0012"]!.selector, probes: ["otra"] } as Sobre["selector"] })],
    ["con menos repeticiones", "k_menor", { k: 10 }],
    ["sin repeticiones", "k_menor", { k: null }],
  ];

  it.each(casos)("%s → %s", async (_c, motivo, cambios) => {
    const c = typeof cambios === "function" ? await cambios() : cambios;
    const libro = await libroCon(await reprueba(c));
    const m = await mundo();
    const e = evaluar(m.hallazgos["HZ-0003"]!, libro);
    expect(e.estado).not.toBe("cerrado");
    expect(e.cierre).toBeNull();
    expect(e.cuentaComoFalla).toBe(true);
    if (motivo === "sin_confirmar") {
      expect(e.porConfirmar.map((s) => s.id)).toEqual(["SOB-0027"]);
      expect(e.estado).toBe("corregido");
      return;
    }
    expect(e.estado).toBe("re_probado");
    expect(e.candidatas.map((x) => x.motivos)).toContainEqual(expect.arrayContaining([motivo]));
  });

  it("sin una corrección declarada ninguna re-prueba cierra, aunque sea perfecta", async () => {
    const libro = await libroCon();
    const e = evaluar(await hz("HZ-0003", []), libro);
    expect(e.estado).toBe("re_probado");
    expect(e.candidatas[0]!.motivos).toEqual(["sin_correccion"]);
  });

  it("la última corrección es la que cuenta: una corrección posterior a la re-prueba la deja sin cerrar", async () => {
    const libro = await libroCon();
    const h = await hz("HZ-0003", [
      { tipo: "correccion", fecha: "2026-09-10", por: POR, nota },
      { tipo: "correccion", fecha: "2026-09-25", por: POR, nota },
    ]);
    const e = evaluar(h, libro);
    expect(e.estado).toBe("re_probado");
    expect(e.candidatas[0]!.motivos).toEqual(["anterior_a_la_correccion"]);
  });

  it("varios fallos a la vez se dicen todos", async () => {
    const m = await mundo();
    const s = await reprueba({ activo: "act-demo-clasificador", prueba: "PR-IA-ENC-002", k: 5, fecha: "2026-09-01" });
    const motivos = motivosDeRechazo(m.sobres["SOB-0012"]!, m.hallazgos["HZ-0003"]!.eventos[0] as Extract<Evento, { tipo: "correccion" }>, s);
    expect(motivos).toEqual(["otro_activo", "otra_prueba", "anterior_a_la_correccion", "k_menor"]);
  });
});

describe("una re-prueba que SÍ cierra", () => {
  it("con más repeticiones que la original cierra", async () => {
    const m = await mundo();
    const libro = await libroCon(await reprueba({ k: 30, resultado: { ejecutada: true, evaluadas: 30, fallidas: 0, alertas: null, metrica: null } }));
    expect(evaluar(m.hallazgos["HZ-0003"]!, libro).estado).toBe("cerrado");
  });

  it("el día siguiente a la corrección cierra", async () => {
    const m = await mundo();
    const libro = await libroCon(await reprueba({ fecha: "2026-09-11", confirmacion: { por: POR, fecha: "2026-09-11", modo: "individual" } }));
    const e = evaluar(m.hallazgos["HZ-0003"]!, libro);
    expect(e.estado).toBe("cerrado");
    expect(e.cierre?.fecha).toBe("2026-09-11");
  });

  it("una mala y una buena: cierra la buena y la mala sigue explicada", async () => {
    const m = await mundo();
    const mala = await nuevo(m.sobres["SOB-0027"]!, "SOB-0030", {
      fecha: "2026-09-15",
      resultado: { ejecutada: true, evaluadas: 20, fallidas: 4, alertas: null, metrica: null },
      veredicto: "fallida",
    });
    const e = evaluar(m.hallazgos["HZ-0003"]!, [...(await libroCon()), mala]);
    expect(e.estado).toBe("cerrado");
    expect(e.cierre?.sobre).toBe("SOB-0027");
    expect(e.candidatas.map((c) => [c.sobre.id, c.motivos])).toEqual([["SOB-0027", []], ["SOB-0030", ["no_superada"]]]);
  });

  it("una re-prueba superada que otro sobre confirmado corrige ya no cierra: vale el corrector", async () => {
    const m = await mundo();
    const corrector = await nuevo(m.sobres["SOB-0027"]!, "SOB-0100", {
      corrige: "SOB-0027",
      fecha: "2026-09-25",
      resultado: { ejecutada: true, evaluadas: 20, fallidas: 4, alertas: null, metrica: null },
      veredicto: "fallida",
      confirmacion: { por: POR, fecha: "2026-09-25", modo: "individual" },
    });
    const e = evaluar(m.hallazgos["HZ-0003"]!, [...Object.values(m.sobres), corrector]);
    expect(e.estado).toBe("re_probado");
    expect(e.cierre).toBeNull();
  });

  it("en una prueba determinista (sin k) cierra con una corrida posterior que la supere", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres).map((s) =>
      s.id === "SOB-0036" ? { ...s, confirmacion: { por: POR, fecha: "2026-10-03", modo: "individual" as const } } : s,
    );
    // El sello cambia con la confirmación; el motor evalúa el contenido, no las huellas.
    expect(evaluar(m.hallazgos["HZ-0009"]!, libro).estado).toBe("cerrado");
  });
});

describe("la ausencia en un escaneo posterior NUNCA cierra un hallazgo", () => {
  it("un sobre «superada» posterior, de la misma prueba y configuración, que no cita al hallazgo, no lo cierra", async () => {
    const m = await mundo();
    const posterior = await nuevo(m.sobres["SOB-0012"]!, "SOB-0050", {
      fecha: "2026-10-05",
      resultado: { ejecutada: true, evaluadas: 116, fallidas: 0, alertas: null, metrica: null },
      veredicto: "superada",
      confirmacion: { por: POR, fecha: "2026-10-05", modo: "individual" },
    });
    const e = evaluar(m.hallazgos["HZ-0007"]!, [...Object.values(m.sobres), posterior]);
    expect(e.estado).toBe("abierto");
    expect(e.cuentaComoFalla).toBe(true);
    expect(e.cierre).toBeNull();
  });

  it("un escaneo posterior «no_ejecutada» (sin alertas, sin constancia) tampoco", async () => {
    const m = await mundo();
    // Reemplaza a la re-prueba válida: la que cita al hallazgo no tiene constancia de que la prueba corrió.
    const libro = await libroCon(await reprueba({ resultado: { ejecutada: false, evaluadas: null, fallidas: null, alertas: 0, metrica: null }, veredicto: "no_ejecutada" }));
    const e = evaluar(m.hallazgos["HZ-0003"]!, libro);
    expect(e.estado).toBe("re_probado");
    expect(e.candidatas[0]!.motivos).toEqual(["no_ejecutada"]);
  });

  it("un sobre sin confirmar jamás cierra, por perfecto que sea", async () => {
    const m = await mundo();
    // SOB-0036 es perfecto y está sin confirmar: HZ-0009 sigue corregido.
    expect(evaluar(m.hallazgos["HZ-0009"]!, Object.values(m.sobres)).estado).toBe("corregido");
  });
});

describe("los cierres alternativos y el riesgo aceptado", () => {
  it("eliminado, con su justificación, cierra por eliminación", async () => {
    const libro = await libroCon();
    const e = evaluar(await hz("HZ-0007", [{ tipo: "eliminacion", fecha: "2026-09-20", por: POR, justificacion: nota }]), libro);
    expect(e).toMatchObject({ estado: "cerrado_por_eliminacion", cuentaComoFalla: false, cierre: { tipo: "eliminacion", fecha: "2026-09-20", sobre: null } });
  });

  it("no se reproduce cierra como no_reproducible", async () => {
    const libro = await libroCon();
    const e = evaluar(await hz("HZ-0007", [{ tipo: "no_reproducible", fecha: "2026-09-20", por: POR, justificacion: nota }]), libro);
    expect(e).toMatchObject({ estado: "no_reproducible", cuentaComoFalla: false, cierre: { tipo: "no_reproducible" } });
  });

  it("aceptar el riesgo NO cierra: sigue contando como falla del control", async () => {
    const libro = await libroCon();
    const e = evaluar(await hz("HZ-0007", [{ tipo: "aceptacion", fecha: "2026-09-20", por: POR, revision_en_dias: 30, justificacion: nota }]), libro);
    expect(e).toMatchObject({ estado: "aceptado_con_riesgo", cuentaComoFalla: true, cierre: null });
    expect(e.aceptacion?.revision_en_dias).toBe(30);
  });

  it("manda la última declaración: aceptar después de eliminar deja el hallazgo aceptado; eliminar después, eliminado", async () => {
    const libro = await libroCon();
    const eli: Evento = { tipo: "eliminacion", fecha: "2026-09-20", por: POR, justificacion: nota };
    const ace: Evento = { tipo: "aceptacion", fecha: "2026-09-21", por: POR, revision_en_dias: 30, justificacion: nota };
    expect(evaluar(await hz("HZ-0007", [eli, ace]), libro).estado).toBe("aceptado_con_riesgo");
    expect(evaluar(await hz("HZ-0007", [ace, { ...eli, fecha: "2026-09-22" }]), libro).estado).toBe("cerrado_por_eliminacion");
  });

  it("una re-prueba válida cierra aunque antes se haya aceptado el riesgo", async () => {
    const m = await mundo();
    const ace: Evento = { tipo: "aceptacion", fecha: "2026-09-12", por: POR, revision_en_dias: 30, justificacion: nota };
    const h = await hz("HZ-0003", [...m.hallazgos["HZ-0003"]!.eventos, ace]);
    expect(evaluar(h, Object.values(m.sobres)).estado).toBe("cerrado");
  });

  it("con una corrección y una re-prueba que falla, el riesgo aceptado manda sobre re_probado", async () => {
    const libro = await libroCon(await reprueba({ fecha: "2026-09-15", resultado: { ejecutada: true, evaluadas: 20, fallidas: 1, alertas: null, metrica: null }, veredicto: "fallida" }));
    const m = await mundo();
    const ace: Evento = { tipo: "aceptacion", fecha: "2026-09-16", por: POR, revision_en_dias: 30, justificacion: nota };
    expect(evaluar(await hz("HZ-0003", [...m.hallazgos["HZ-0003"]!.eventos, ace]), libro).estado).toBe("aceptado_con_riesgo");
  });
});

describe("el sobre de origen", () => {
  it("si no existe, o no está confirmado, no hay hallazgo que evaluar", async () => {
    const libro = await libroCon();
    const h = await hz("HZ-0007");
    expect(evaluarHallazgo({ ...h, sobre_origen: "SOB-9999" }, libro)).toEqual({ ok: false, motivo: "sobre_origen_inexistente" });
    expect(evaluarHallazgo({ ...h, sobre_origen: "SOB-0036" }, libro)).toEqual({ ok: false, motivo: "sobre_origen_sin_confirmar" });
  });

  it("si otro sobre confirmado lo corrige, vale el corrector; la apertura sigue siendo la del original", async () => {
    const m = await mundo();
    const corrector = await nuevo(m.sobres["SOB-0012"]!, "SOB-0040", {
      corrige: "SOB-0012",
      fecha: "2026-08-19",
      confirmacion: { por: POR, fecha: "2026-08-19", modo: "individual" },
    });
    const libro = [...Object.values(m.sobres), corrector];
    expect(sobreVigente(libro, "SOB-0012")?.id).toBe("SOB-0040");
    const e = evaluar(m.hallazgos["HZ-0003"]!, libro);
    expect(e.sobreOrigen.id).toBe("SOB-0040");
    expect(e.apertura).toBe("2026-08-18");
  });

  it("un corrector sin confirmar no reemplaza al original", async () => {
    const m = await mundo();
    const corrector = await nuevo(m.sobres["SOB-0012"]!, "SOB-0040", { corrige: "SOB-0012", confirmacion: null });
    expect(sobreVigente([...Object.values(m.sobres), corrector], "SOB-0012")?.id).toBe("SOB-0012");
  });

  it("una cadena que se cita a sí misma no cuelga el motor", async () => {
    const m = await mundo();
    const a = await nuevo(m.sobres["SOB-0012"]!, "SOB-0041", { corrige: "SOB-0042" });
    const b = await nuevo(m.sobres["SOB-0012"]!, "SOB-0042", { corrige: "SOB-0041" });
    expect(sobreVigente([a, b], "SOB-0041")).not.toBeNull();
  });

  it("sobre inexistente → null", () => {
    expect(sobreVigente([], "SOB-0001")).toBeNull();
  });
});

describe("los conjuntos de estados", () => {
  it("cuentan como falla exactamente los que siguen sin resolverse", () => {
    expect([...ESTADOS_QUE_CUENTAN_COMO_FALLA].sort()).toEqual(["abierto", "aceptado_con_riesgo", "corregido", "re_probado"]);
    expect(ESTADOS_DE_HALLAZGO.filter((e) => !cuentaComoFalla(e)).sort()).toEqual(["cerrado", "cerrado_por_eliminacion", "no_reproducible"]);
  });
  it("el plazo corre solo mientras el hallazgo espera trabajo", () => {
    expect([...ESTADOS_CON_PLAZO].sort()).toEqual(["abierto", "corregido", "re_probado"]);
  });
});
