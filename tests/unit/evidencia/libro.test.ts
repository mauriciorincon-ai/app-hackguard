// @vitest-environment node
// El libro: solo agrega, un sobre se confirma una vez y lo que no está confirmado no cuenta (regla dura 6).
import { describe, expect, it } from "vitest";
import {
  confirmar,
  contados,
  enOrden,
  estaConfirmado,
  huellaDelLibro,
  siguienteId,
  vigentes,
} from "../../../src/engine/evidencia/libro.ts";
import { sinHuellas } from "../../../src/engine/evidencia/huellas.ts";
import { con, mundo, nuevo } from "./ayuda.ts";

describe("lo que cuenta", () => {
  it("solo los confirmados: un sobre propuesto no cuenta", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    expect(libro).toHaveLength(16);
    expect(contados(libro)).toHaveLength(10);
    expect(estaConfirmado(m.sobres["SOB-0036"]!)).toBe(false);
    expect(contados(libro).map((s) => s.id)).not.toContain("SOB-0036");
  });

  it("un sobre corregido por otro confirmado deja de valer; si el corrector no está confirmado, sigue valiendo", async () => {
    const m = await mundo();
    const original = m.sobres["SOB-0012"]!;
    const corrector = await nuevo(original, "SOB-0040", { corrige: "SOB-0012" });
    const sinConfirmar = await con(corrector, { confirmacion: null });
    expect(vigentes([original, corrector]).map((s) => s.id)).toEqual(["SOB-0040"]);
    expect(vigentes([original, sinConfirmar]).map((s) => s.id)).toEqual(["SOB-0012"]);
  });
});

describe("identificadores y orden", () => {
  it("el siguiente id sale del mayor, no de la cuenta", () => {
    expect(siguienteId([])).toBe("SOB-0001");
    expect(siguienteId([{ id: "SOB-0003" }, { id: "SOB-0036" }, { id: "SOB-0012" }])).toBe("SOB-0037");
    expect(siguienteId([{ id: "SOB-9999" }])).toBe("SOB-10000");
  });

  it("el libro se ordena por identificador, por punto de código", async () => {
    const m = await mundo();
    const al_reves = Object.values(m.sobres).reverse();
    expect(enOrden(al_reves).map((s) => s.id)).toEqual(Object.keys(m.sobres).sort());
  });
});

describe("confirmar", () => {
  it("confirma un sobre propuesto, lo vuelve a sellar y no cambia su veredicto ni su resultado", async () => {
    const m = await mundo();
    const propuesto = m.sobres["SOB-0036"]!;
    const hecho = await confirmar(propuesto, "Operador demo", "2026-10-03");
    expect(hecho.ok).toBe(true);
    if (!hecho.ok) return;
    expect(hecho.sobre.confirmacion).toEqual({ por: "Operador demo", fecha: "2026-10-03", modo: "individual" });
    expect(hecho.sobre.veredicto).toBe(propuesto.veredicto);
    expect(hecho.sobre.huellas.resultado).toBe(propuesto.huellas.resultado);
    expect(hecho.sobre.huellas.sobre).not.toBe(propuesto.huellas.sobre);
    expect(hecho.sobre.huellas.crudo).toBe(propuesto.huellas.crudo);
    expect(hecho.sobre).toEqual({ ...sinHuellas(hecho.sobre), huellas: hecho.sobre.huellas });
  });

  it("un sobre confirmado no se confirma otra vez: la evidencia confirmada es inmutable", async () => {
    const m = await mundo();
    expect(await confirmar(m.sobres["SOB-0012"]!, "Otra persona", "2026-12-01")).toEqual({ ok: false, motivo: "ya_confirmado" });
  });

  it("no se confirma antes de la corrida; el mismo día sí", async () => {
    const m = await mundo();
    const propuesto = m.sobres["SOB-0036"]!;
    expect(await confirmar(propuesto, "x", "2026-10-01")).toEqual({ ok: false, motivo: "fecha_anterior_a_la_corrida" });
    expect((await confirmar(propuesto, "x", propuesto.fecha)).ok).toBe(true);
  });
});

describe("la huella del libro", () => {
  it("no depende del orden en que se lean los sobres", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    expect(await huellaDelLibro([...libro].reverse())).toBe(await huellaDelLibro(libro));
  });

  it("cambia si cambia un sobre o si se agrega uno", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    const base = await huellaDelLibro(libro);
    const cambiado = await con(m.sobres["SOB-0012"]!, { fecha: "2026-08-19" });
    expect(await huellaDelLibro([cambiado, ...libro.slice(1).filter((s) => s.id !== "SOB-0012")])).not.toBe(base);
    expect(await huellaDelLibro(libro.slice(1))).not.toBe(base);
  });
});
