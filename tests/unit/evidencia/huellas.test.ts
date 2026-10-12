// @vitest-environment node
// Las tres huellas del sobre (E-9): el crudo, el sobre canónico y el resultado sin identificadores de corrida.
import { describe, expect, it } from "vitest";
import {
  cuerpoDelResultado,
  huellaDelCrudo,
  huellaDelCrudoSintetico,
  huellaDelResultado,
  huellaDelSobre,
  resellar,
  sellar,
  sinHuellas,
  textoDelCrudoSintetico,
} from "../../../src/engine/evidencia/huellas.ts";
import { sha256 } from "../../../src/engine/huella.ts";
import { ASISTENTE, con, copia, mundo } from "./ayuda.ts";

describe("la huella del resultado compara corridas, no identificadores", () => {
  it("no cambia con la fecha, quien ejecutó, el id, las advertencias, la razón ni el extracto", async () => {
    const m = await mundo();
    const s = sinHuellas(m.sobres["SOB-0012"]!);
    const igual = await huellaDelResultado(s);
    for (const otro of [
      { ...s, fecha: "2026-12-31" },
      { ...s, id: "SOB-9999" },
      { ...s, ejecutado_por: "Otra persona" },
      { ...s, zona_horaria: "UTC" },
      { ...s, advertencias: [{ es: "a", en: "a" }] },
      { ...s, razon: { es: "x", en: "x" } },
      { ...s, extracto_redactado: "otro texto" },
      { ...s, confirmacion: null },
    ])
      expect(await huellaDelResultado(otro)).toBe(igual);
  });

  it("sí cambia con la prueba, el activo, la herramienta, la versión, el selector, k, el resultado o el veredicto", async () => {
    const m = await mundo();
    const s = sinHuellas(m.sobres["SOB-0012"]!);
    const base = await huellaDelResultado(s);
    const variantes = [
      { ...s, prueba: "PR-IA-ENC-002" },
      { ...s, activo: "otro-activo" },
      { ...s, herramienta: { ...s.herramienta, id: "otra" } },
      { ...s, herramienta: { ...s.herramienta, version: "9.9.9" } },
      { ...s, selector: { ...copia(s.selector), probes: ["otra"] } },
      { ...s, k: 21 },
      { ...s, resultado: { ...s.resultado, fallidas: 7 } },
      { ...s, veredicto: "superada" as const },
    ];
    for (const v of variantes) expect(await huellaDelResultado(v), JSON.stringify(v).slice(0, 60)).not.toBe(base);
  });

  it("el cuerpo del resultado no trae ningún campo de identificación de la corrida", async () => {
    const m = await mundo();
    const claves = Object.keys(cuerpoDelResultado(sinHuellas(m.sobres["SOB-0012"]!))).sort();
    expect(claves).toEqual(["activo", "herramienta", "k", "prueba", "regla", "resultado", "selector", "veredicto"]);
  });
});

describe("la huella del sobre es la del sobre entero, sin sus huellas", () => {
  it("confirmar cambia el sobre canónico y no el resultado", async () => {
    const m = await mundo();
    const confirmado = m.sobres["SOB-0012"]!;
    const sinConfirmar = await con(confirmado, { confirmacion: null });
    expect(sinConfirmar.huellas.sobre).not.toBe(confirmado.huellas.sobre);
    expect(sinConfirmar.huellas.resultado).toBe(confirmado.huellas.resultado);
  });

  it("cualquier cambio de contenido rompe la huella del sobre", async () => {
    const m = await mundo();
    const s = m.sobres["SOB-0012"]!;
    expect(await huellaDelSobre(sinHuellas({ ...s, fecha: "2026-08-19" }))).not.toBe(s.huellas.sobre);
  });

  it("los sobres demo versionados están sellados con lo que dicen", async () => {
    const m = await mundo();
    for (const s of Object.values(m.sobres)) {
      expect(s.huellas.sobre, s.id).toBe(await huellaDelSobre(sinHuellas(s)));
      expect(s.huellas.resultado, s.id).toBe(await huellaDelResultado(sinHuellas(s)));
    }
  });
});

describe("el crudo", () => {
  it("su huella es la de los bytes, igual que la de un texto con los mismos bytes", async () => {
    const texto = "salida de la herramienta, con tildes: añoñó";
    expect(await huellaDelCrudo(new TextEncoder().encode(texto))).toBe(await sha256(texto));
  });

  it("el crudo sintético de un demo se declara y se verifica", async () => {
    expect(textoDelCrudoSintetico("SOB-0012")).toBe("crudo-sintetico:SOB-0012");
    expect(await huellaDelCrudoSintetico("SOB-0012")).toBe(await sha256("crudo-sintetico:SOB-0012"));
    expect(await huellaDelCrudoSintetico("SOB-0012")).not.toBe(await huellaDelCrudoSintetico("SOB-0013"));
  });
});

describe("sellar y resellar", () => {
  it("sellar pone las tres huellas; resellar conserva la del crudo", async () => {
    const m = await mundo();
    const s = m.sobres["SOB-0012"]!;
    const sellado = await sellar(sinHuellas(s), s.huellas.crudo);
    expect(sellado).toEqual(s);
    const otro = await resellar({ ...s, fecha: "2026-08-19" });
    expect(otro.huellas.crudo).toBe(s.huellas.crudo);
    expect(otro.huellas.sobre).not.toBe(s.huellas.sobre);
    expect(otro.activo).toBe(ASISTENTE);
  });
});
