// @vitest-environment node
// Instantánea (RF-01.7) y su gate de publicación (RF-10.6): la misma entrada y la misma fecha dan la misma
// huella; un catálogo inválido no emite nada.
import { describe, expect, it } from "vitest";
import {
  construirInstantanea,
  FORMATO_DE_INSTANTANEA,
  huellaDeInstantanea,
  nombreDeInstantanea,
} from "../../../src/engine/catalogo/instantanea.ts";
import { catalogoReal, conPrueba, referencia } from "./ayuda.ts";

const FECHA = "2026-10-15";

describe("construirInstantanea", () => {
  it("emite el catálogo con su huella, y la huella se recalcula igual", async () => {
    const r = await construirInstantanea(catalogoReal(), FECHA);
    if (!r.emitida) throw new Error("debía emitirse");
    const { huella, ...cuerpo } = r.instantanea;
    expect(r.instantanea.formato).toBe(FORMATO_DE_INSTANTANEA);
    expect(r.instantanea.fecha_evaluacion).toBe(FECHA);
    expect(huella).toBe(await huellaDeInstantanea(cuerpo));
    expect(r.archivo).toBe(`${FECHA}-${huella.slice(0, 12)}.json`);
    expect(Object.keys(r.instantanea.catalogo).sort()).toEqual([
      "controles",
      "equivalencias",
      "familias",
      "filtro",
      "herramientas",
      "marcos",
      "pruebas",
      "rasgos",
      "reglas_de_veredicto",
    ]);
  });

  it("tres corridas dan la misma huella, sin importar el orden de los archivos", async () => {
    const huellas = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const c = catalogoReal();
      if (i === 1) c.marcos.reverse();
      if (i === 2) c.herramientas.reverse();
      const r = await construirInstantanea(c, FECHA);
      if (r.emitida) huellas.add(r.instantanea.huella);
    }
    expect(huellas.size).toBe(1);
  });

  it("otra fecha de evaluación da otra huella", async () => {
    const a = await construirInstantanea(catalogoReal(), FECHA);
    const b = await construirInstantanea(catalogoReal(), "2026-12-01");
    expect(
      a.emitida && b.emitida && a.instantanea.huella !== b.instantanea.huella,
    ).toBe(true);
  });

  it("publica las pruebas aprobadas y lista aparte las que esperan revisión", async () => {
    const c = catalogoReal();
    const aprobada = referencia();
    aprobada.id = "PR-CASO-001";
    const propuesta = {
      ...referencia(),
      id: "PR-CASO-002",
      estado_aprobacion: "propuesta",
    };
    const marcada = {
      ...referencia(),
      id: "PR-CASO-003",
      notas: { es: "Ejemplo:\n$ ls", en: "Example:\n$ ls -a" },
    };
    const retirada = {
      ...referencia(),
      id: "PR-CASO-004",
      estado_aprobacion: "retirada",
    };
    for (const p of [aprobada, propuesta, marcada, retirada]) conPrueba(c, p);
    const r = await construirInstantanea(c, FECHA);
    if (!r.emitida) throw new Error("debía emitirse");
    expect(
      (r.instantanea.catalogo.pruebas as { id: string }[]).map((p) => p.id),
    ).toEqual(["PR-CASO-001"]);
    expect(r.instantanea.pendientes_de_revision).toEqual([
      { id: "PR-CASO-002", motivo: "propuesta" },
      { id: "PR-CASO-003", motivo: "marcada_para_revision" },
    ]);
    expect(
      r.instantanea.advertencias.every((a) => a.severidad !== "error"),
    ).toBe(true);
    expect(
      r.instantanea.advertencias.some((a) => a.regla === "filtro/marcada"),
    ).toBe(true);
  });

  it("no emite nada si el catálogo es inválido (gate de publicación)", async () => {
    const c = catalogoReal();
    const p = referencia();
    delete p.marco_id;
    conPrueba(c, p);
    const r = await construirInstantanea(c, FECHA);
    expect(r.emitida).toBe(false);
    expect(r.validacion.estado).toBe("invalido");
    expect("instantanea" in r).toBe(false);
  });

  it.each(["2026-02-30", "15/10/2026", "", "hoy"])(
    "rechaza la fecha «%s»: la fecha es una entrada, no el reloj",
    async (fecha) => {
      await expect(construirInstantanea(catalogoReal(), fecha)).rejects.toThrow(
        /fecha de evaluación inválida/,
      );
    },
  );

  it("nombra el archivo con la fecha y 12 caracteres de la huella", () => {
    expect(nombreDeInstantanea("2026-10-15", "abcdef0123456789")).toBe(
      "2026-10-15-abcdef012345.json",
    );
  });
});
