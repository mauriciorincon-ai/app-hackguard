// @vitest-environment node
// Registrar a mano: la persona escribe lo que la herramienta midió; el motor arma el sobre con lo que sale del plan,
// del paquete y de la regla. Nace SIN confirmar y con el veredicto de la regla, no con el que la persona crea.
import { describe, expect, it } from "vitest";
import { huellaDelCrudoSintetico } from "../../../src/engine/evidencia/huellas.ts";
import { armarSobre, EntradaDeRegistro, type EntradaDeRegistro as Entrada } from "../../../src/engine/evidencia/registro.ts";
import { validarEvidencia } from "../../../src/engine/evidencia/validar.ts";
import { archivoDe, ASISTENTE, copia, mundo, rutaDemo } from "./ayuda.ts";

const entrada = (c: Partial<Entrada> = {}): Entrada => ({
  activo: ASISTENTE,
  prueba: "PR-IA-PINJ-001",
  herramienta: { id: "garak", version: "0.17.0" },
  fecha: "2026-10-12",
  zona_horaria: "America/Bogota",
  ejecutado_por: "Operador demo",
  resultado: { ejecutada: true, evaluadas: 20, fallidas: 3, alertas: null, metrica: null },
  ...c,
});

async function armar(e: Entrada, regla = "asimetrica_k") {
  const m = await mundo();
  return armarSobre(e, {
    id: "SOB-0040",
    origen: "demo",
    emitido: m.contexto.planes[e.activo]!,
    regla,
    crudo: await huellaDelCrudoSintetico("SOB-0040"),
  });
}

describe("el sobre que sale", () => {
  it("lo que no escribe la persona sale del plan, del paquete y de la regla", async () => {
    const m = await mundo();
    const r = await armar(entrada());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.sobre;
    const emitido = m.contexto.planes[ASISTENTE]!;
    expect(s.plan.huella).toBe(emitido.plan.huella);
    expect(s.paquete.huella).toBe(emitido.paquete.huella);
    expect(s.k).toBe(20);
    expect(s.regla).toBe("asimetrica_k");
    expect(s.selector).toEqual(m.sobres["SOB-0012"]!.selector);
    expect(s.veredicto).toBe("fallida");
  });

  it("nace sin confirmar y sin los campos opcionales", async () => {
    const r = await armar(entrada());
    if (!r.ok) throw new Error("debía armarse");
    expect(r.sobre.confirmacion).toBeNull();
    expect(r.sobre).toMatchObject({ razon: null, extracto_redactado: null, corrige: null, reprueba_de: null, advertencias: [] });
  });

  it("lleva lo opcional que la persona dio", async () => {
    const r = await armar(entrada({ razon: { es: "r", en: "r" }, extracto_redactado: "e", advertencias: [{ es: "a", en: "a" }], corrige: "SOB-0012", reprueba_de: "HZ-0003" }));
    if (!r.ok) throw new Error("debía armarse");
    expect(r.sobre).toMatchObject({ razon: { es: "r", en: "r" }, extracto_redactado: "e", corrige: "SOB-0012", reprueba_de: "HZ-0003" });
  });

  it("el veredicto sale de la regla aunque la persona escriba otro", async () => {
    // El campo `veredicto` de la entrada solo se usa en una revisión de diseño; en las demás se ignora.
    const r = await armar(entrada({ veredicto: "superada" }));
    if (!r.ok) throw new Error("debía armarse");
    expect(r.sobre.veredicto).toBe("fallida");
  });

  it("un sobre armado pasa el validador del libro sin errores", async () => {
    const m = await mundo();
    const r = await armar(entrada());
    if (!r.ok) throw new Error("debía armarse");
    const v = await validarEvidencia([...m.archivosDeSobres, archivoDe(rutaDemo("SOB-0040"), r.sobre)], m.contexto);
    expect(v.hallazgos.filter((h) => h.ruta === rutaDemo("SOB-0040") && h.severidad === "error")).toEqual([]);
  });
});

describe("lo que no se puede registrar", () => {
  it("una prueba que no está en el paquete del activo", async () => {
    expect(await armar(entrada({ prueba: "PR-SW-SQLI-001" }))).toEqual({ ok: false, motivo: "prueba_fuera_del_plan" });
  });

  it("sin los conteos que la regla pide", async () => {
    const e = entrada({ resultado: { ejecutada: true, evaluadas: null, fallidas: null, alertas: null, metrica: null } });
    expect(await armar(e)).toEqual({ ok: false, motivo: "faltan_conteos" });
  });

  it("una revisión de diseño sin veredicto declarado", async () => {
    expect(await armar(entrada(), "revision_de_diseno")).toEqual({ ok: false, motivo: "veredicto_declarado_requerido" });
  });

  it("una revisión de diseño con veredicto declarado lo lleva tal cual", async () => {
    const r = await armar(entrada({ veredicto: "parcial", razon: { es: "r", en: "r" } }), "revision_de_diseno");
    if (!r.ok) throw new Error("debía armarse");
    expect(r.sobre.veredicto).toBe("parcial");
  });
});

describe("la entrada es estricta", () => {
  it("rechaza un campo que no existe, como el crudo", () => {
    expect(EntradaDeRegistro.safeParse({ ...copia(entrada()), crudo: "x" }).success).toBe(false);
    expect(EntradaDeRegistro.safeParse(entrada()).success).toBe(true);
  });
});
