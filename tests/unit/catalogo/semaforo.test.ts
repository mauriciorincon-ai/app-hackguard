// @vitest-environment node
// Semáforo de vigencia (RF-01.5): los bordes de cada umbral, la familia como su prueba más atrasada y la
// fecha que no puede ser anterior a una verificación. Casos armados a mano, con fechas distintas por
// entidad (el catálogo real tiene una sola fecha de verificación y no los tendría).
import { describe, expect, it } from "vitest";
import {
  desglose,
  estadoDeVigencia,
  etiquetaDe,
  semaforo,
  type EntradaDelSemaforo,
} from "../../../src/engine/catalogo/semaforo.ts";
import { catalogoReal } from "./ayuda.ts";

const UMBRALES = { por_revisar: 30, vencido: 60 };

describe("estadoDeVigencia", () => {
  it.each([
    [0, "vigente"],
    [29, "vigente"],
    [30, "por_revisar"],
    [59, "por_revisar"],
    [60, "vencido"],
    [100, "vencido"],
  ] as const)("%i días → %s", (dias, estado) => {
    expect(estadoDeVigencia(dias, UMBRALES)).toBe(estado);
  });

  it("lee los umbrales que recibe, no unos fijos", () => {
    expect(estadoDeVigencia(10, { por_revisar: 10, vencido: 11 })).toBe(
      "por_revisar",
    );
    expect(estadoDeVigencia(11, { por_revisar: 10, vencido: 11 })).toBe(
      "vencido",
    );
  });
});

const ENTRADA: EntradaDelSemaforo = {
  familias: [{ id: "agente" }, { id: "software" }, { id: "vacia" }],
  pruebas: [
    { id: "PR-A-1", familia: "agente", fecha_verificacion: "2026-10-04" },
    { id: "PR-A-2", familia: "agente", fecha_verificacion: "2026-08-20" },
    { id: "PR-S-1", familia: "software", fecha_verificacion: "2026-09-10" },
  ],
  marcos: [{ id: "marco-a", fecha_verificacion: "2026-07-01" }],
  herramientas: [{ id: "herr-a", fecha_verificacion: "2026-10-01" }],
};

describe("semaforo", () => {
  const s = semaforo(ENTRADA, "2026-10-15", UMBRALES);

  it("calcula días y estado de cada prueba, marco y herramienta", () => {
    expect(s.pruebas).toEqual([
      {
        id: "PR-A-1",
        fecha_verificacion: "2026-10-04",
        dias: 11,
        estado: "vigente",
      },
      {
        id: "PR-A-2",
        fecha_verificacion: "2026-08-20",
        dias: 56,
        estado: "por_revisar",
      },
      {
        id: "PR-S-1",
        fecha_verificacion: "2026-09-10",
        dias: 35,
        estado: "por_revisar",
      },
    ]);
    expect(s.marcos[0]).toMatchObject({ dias: 106, estado: "vencido" });
    expect(s.herramientas[0]).toMatchObject({ dias: 14, estado: "vigente" });
  });

  it("la familia está como su prueba más atrasada, con el desglose de todas", () => {
    expect(s.familias).toEqual([
      {
        id: "agente",
        estado: "por_revisar",
        dias: 56,
        desglose: { vigente: 1, por_revisar: 1, vencido: 0 },
      },
      {
        id: "software",
        estado: "por_revisar",
        dias: 35,
        desglose: { vigente: 0, por_revisar: 1, vencido: 0 },
      },
      {
        id: "vacia",
        estado: null,
        dias: null,
        desglose: { vigente: 0, por_revisar: 0, vencido: 0 },
      },
    ]);
  });

  it("la familia pasa a vencida el día en que su prueba más vieja cumple 60", () => {
    const antes = semaforo(ENTRADA, "2026-10-18", UMBRALES);
    const el = semaforo(ENTRADA, "2026-10-19", UMBRALES);
    expect(antes.familias[0]).toMatchObject({
      estado: "por_revisar",
      dias: 59,
    });
    expect(el.familias[0]).toMatchObject({ estado: "vencido", dias: 60 });
  });

  it("rechaza una fecha anterior a la última verificación, en los dos idiomas", () => {
    expect(() => semaforo(ENTRADA, "2026-10-03", UMBRALES)).toThrow(RangeError);
    expect(() => semaforo(ENTRADA, "2026-10-03", UMBRALES)).toThrow(
      "la fecha de evaluación 2026-10-03 es anterior a la última verificación del catálogo (2026-10-04) / the evaluation date 2026-10-03 is earlier than the catalog's latest verification (2026-10-04)",
    );
    expect(semaforo(ENTRADA, "2026-10-04", UMBRALES).pruebas[0].dias).toBe(0);
  });

  it("un catálogo sin nada fechado acepta cualquier fecha", () => {
    expect(
      semaforo(
        { familias: [], pruebas: [], marcos: [], herramientas: [] },
        "0001-01-01",
        UMBRALES,
      ),
    ).toEqual({ pruebas: [], marcos: [], herramientas: [], familias: [] });
  });
});

describe("desglose y etiquetas", () => {
  it("cuenta por estado y deja fuera a la familia sin pruebas", () => {
    expect(
      desglose([
        { estado: "vencido" },
        { estado: null },
        { estado: "vencido" },
      ]),
    ).toEqual({ vigente: 0, por_revisar: 0, vencido: 2 });
  });

  it("lee el símbolo, el papel y el nombre del vocabulario de datos/", () => {
    const vocabularios = (
      JSON.parse(catalogoReal().estados?.texto ?? "{}") as {
        vocabularios: Parameters<typeof etiquetaDe>[0];
      }
    ).vocabularios;
    expect(etiquetaDe(vocabularios, "vigencia", "por_revisar")).toEqual({
      id: "por_revisar",
      rol: "atencion",
      simbolo: "aviso",
      nombre: { es: "Por revisar", en: "Review due" },
    });
    expect(etiquetaDe(vocabularios, "vigencia", "no-existe")).toBeUndefined();
    expect(etiquetaDe(vocabularios, "no-existe", "vigente")).toBeUndefined();
  });
});
