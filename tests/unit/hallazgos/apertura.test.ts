// @vitest-environment node
// Cuándo un sobre abre un hallazgo: solo uno CONFIRMADO, con veredicto «fallida» o «parcial», que no es una
// re-prueba y para el que no hay ya un hallazgo vivo de la misma prueba y activo.
import { describe, expect, it } from "vitest";
import { decidirApertura, hallazgoNuevo, siguienteIdDeHallazgo } from "../../../src/engine/hallazgos/apertura.ts";
import { Hallazgo } from "../../../src/engine/hallazgos/esquemas.ts";
import { con, mundo, nuevo } from "../evidencia/ayuda.ts";

describe("decidirApertura", () => {
  it("un sobre confirmado «fallida» sin hallazgo vivo abre uno", async () => {
    const m = await mundo();
    const s = await nuevo(m.sobres["SOB-0016"]!, "SOB-0050", {
      resultado: { ejecutada: true, evaluadas: 20, fallidas: 4, alertas: null, metrica: null },
      veredicto: "fallida",
    });
    expect(decidirApertura(s, Object.values(m.sobres), Object.values(m.hallazgos))).toEqual({ abre: true });
  });

  it("«parcial» también abre", async () => {
    const m = await mundo();
    const s = await nuevo(m.sobres["SOB-0016"]!, "SOB-0050", { veredicto: "parcial" });
    expect(decidirApertura(s, [], [])).toEqual({ abre: true });
  });

  it("un sobre sin confirmar no abre nada", async () => {
    const m = await mundo();
    const s = await con(m.sobres["SOB-0012"]!, { confirmacion: null });
    expect(decidirApertura(s, [], [])).toEqual({ abre: false, motivo: "sin_confirmar" });
  });

  it.each(["superada", "no_ejecutada", "no_aplicable"] as const)("un sobre «%s» no es una falla", async (v) => {
    const m = await mundo();
    const s = await con(m.sobres["SOB-0012"]!, { veredicto: v });
    expect(decidirApertura(s, [], [])).toEqual({ abre: false, motivo: "no_falla" });
  });

  it("una re-prueba que falla se suma al hallazgo que cita: no abre otro", async () => {
    const m = await mundo();
    const s = await con(m.sobres["SOB-0012"]!, { reprueba_de: "HZ-0003" });
    expect(decidirApertura(s, [], [])).toEqual({ abre: false, motivo: "es_reprueba" });
  });

  it("si ya hay un hallazgo vivo de esa prueba y ese activo no se abre otro", async () => {
    const m = await mundo();
    const repetido = await nuevo(m.sobres["SOB-0019"]!, "SOB-0051", { fecha: "2026-10-01", confirmacion: { por: "x", fecha: "2026-10-01", modo: "individual" } });
    expect(decidirApertura(repetido, Object.values(m.sobres), Object.values(m.hallazgos))).toEqual({ abre: false, motivo: "ya_hay_uno", existente: "HZ-0007" });
  });

  it("si el hallazgo anterior de esa prueba ya se cerró, sí se abre uno nuevo", async () => {
    const m = await mundo();
    const otra = await nuevo(m.sobres["SOB-0012"]!, "SOB-0052", { fecha: "2026-10-02", confirmacion: { por: "x", fecha: "2026-10-02", modo: "individual" } });
    expect(decidirApertura(otra, Object.values(m.sobres), Object.values(m.hallazgos))).toEqual({ abre: true });
  });
});

describe("el hallazgo que se abre", () => {
  it("hereda el origen del sobre, lo cita y nace sin eventos", async () => {
    const m = await mundo();
    const h = hallazgoNuevo("HZ-0010", m.sobres["SOB-0012"]!, { es: "t", en: "t" }, { es: "d", en: "d" }, { tipo: "escala_ia", impacto: 3, alcance: 2, detectabilidad: 3 });
    expect(h).toMatchObject({ formato: "hackguard/hallazgo@1", id: "HZ-0010", origen: "demo", sobre_origen: "SOB-0012", eventos: [] });
    expect(Hallazgo.safeParse(h).success).toBe(true);
  });

  it("el siguiente identificador sale del mayor", () => {
    expect(siguienteIdDeHallazgo([])).toBe("HZ-0001");
    expect(siguienteIdDeHallazgo([{ id: "HZ-0003" }, { id: "HZ-0009" }, { id: "HZ-0005" }])).toBe("HZ-0010");
  });
});
