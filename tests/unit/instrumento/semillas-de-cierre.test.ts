// @vitest-environment node
// Validación del instrumento para el libro y la brecha (C18 · RF-10.3 · E-6). Cada semilla de cierre toma el mundo demo,
// cambia uno o dos sobres y el motor tiene que responder lo que la semilla espera: un cierre prohibido se niega nombrando su
// motivo, una propuesta no cuenta, aceptar un riesgo no cierra y «no detectado» no cuenta como verificado. Se cuenta cuántas
// bloquea sobre cuántas se sembraron, y se demuestra que el runner SABE fallar: una expectativa cambiada lo pone en rojo.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  correrSemilla,
  libroSembrado,
  validarInstrumento,
} from "../../../src/engine/instrumento/cierres.ts";
import {
  SemillaDeCierre,
  SemillasDeCierre,
} from "../../../src/engine/instrumento/esquemas.ts";
import { entradaDemo } from "../lib/mundo-de-brecha";

const RUTA = "docs/kit-de-prueba/semillas-de-cierre/semillas.json";
const manifiesto = SemillasDeCierre.parse(
  JSON.parse(readFileSync(RUTA, "utf8")),
);
const BASE = entradaDemo();

describe("semillas de cierre (C18 · RF-10.3 · E-6)", () => {
  it.each(manifiesto.semillas)("$id ($requisito)", (semilla) => {
    const r = correrSemilla(semilla, BASE);
    expect(r.diferencias).toEqual([]);
    expect(r.pasa).toBe(true);
  });

  it("el manifiesto tiene las ocho semillas, con identificador único y su requisito", () => {
    const ids = manifiesto.semillas.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(8);
    expect(manifiesto.semillas.map((s) => s.requisito).sort()).toEqual([
      "E-6",
      "E-6",
      "RF-10.3",
      "RF-10.3",
      "RF-10.3",
      "RF-10.3",
      "RF-10.3",
      "RF-10.3",
    ]);
  });

  it("agrupa por requisito: RF-10.3 bloquea 6 de 6 y E-6 bloquea 2 de 2", () => {
    const r = validarInstrumento(manifiesto.semillas, BASE);
    expect(r.map((c) => [c.requisito, c.obtenidas, c.sembradas])).toEqual([
      ["E-6", 2, 2],
      ["RF-10.3", 6, 6],
    ]);
  });

  it("el runner sabe fallar: una expectativa cambiada pone la semilla en rojo y dice cuál", () => {
    const original = manifiesto.semillas.find(
      (s) => s.id === "CIERRE-REPRUEBA-NO-EJECUTADA",
    )!;
    const mala = SemillaDeCierre.parse({
      ...original,
      espera: { hallazgos: [{ id: "HZ-0009", estado: "cerrado" }] },
    });
    const r = correrSemilla(mala, BASE);
    expect(r.pasa).toBe(false);
    expect(r.diferencias).toEqual([
      "HZ-0009: esperado cerrado, obtenido re_probado",
    ]);
    // Y si el motor dejara cerrar con una re-prueba «no ejecutada», la semilla correcta lo atraparía: se simula quitando la
    // marca de que no corrió.
    const engañosa = SemillaDeCierre.parse({
      ...original,
      sobres: [
        {
          id: "SOB-0036",
          cambios: {
            ...original.sobres[0]!.cambios,
            veredicto: "superada",
            "resultado.ejecutada": true,
          },
        },
      ],
    });
    expect(correrSemilla(engañosa, BASE).pasa).toBe(false);
  });

  it("una semilla que apunta a un campo o a un sobre que no existe es un error, no un verde", () => {
    const base = manifiesto.semillas[1]!;
    expect(() =>
      libroSembrado(BASE.libro, [
        { id: "SOB-0036", cambios: { "resultado.no_existe": 1 } },
      ]),
    ).toThrow(/no existe/);
    expect(() =>
      libroSembrado(BASE.libro, [{ id: "SOB-0999", cambios: {} }]),
    ).toThrow(/no existe/);
    expect(() =>
      libroSembrado(BASE.libro, [
        { id: "SOB-0036", copia_de: "SOB-0019", cambios: {} },
      ]),
    ).toThrow(/ya existe/);
    expect(base.sobres.length).toBeGreaterThan(0);
  });

  it("la semilla no cambia el mundo demo: el libro de la base queda intacto", () => {
    const antes = JSON.stringify(BASE.libro);
    libroSembrado(
      BASE.libro,
      manifiesto.semillas
        .flatMap((s) => s.sobres)
        .slice(0, 3)
        .map((s) => ({ ...s, id: s.id })),
    );
    expect(JSON.stringify(BASE.libro)).toBe(antes);
  });

  it("el esquema rechaza campos de más, un requisito inventado y un estado que no existe", () => {
    const s = manifiesto.semillas[0]!;
    expect(() => SemillaDeCierre.parse({ ...s, extra: 1 })).toThrow();
    expect(() => SemillaDeCierre.parse({ ...s, requisito: "RF-99" })).toThrow();
    expect(() =>
      SemillaDeCierre.parse({
        ...s,
        espera: { hallazgos: [{ id: "HZ-0009", estado: "cerradisimo" }] },
      }),
    ).toThrow();
    expect(() =>
      SemillaDeCierre.parse({
        ...s,
        espera: { controles: [{ id: "iso42001-A.9.4", estado: "casi" }] },
      }),
    ).toThrow();
  });
});
