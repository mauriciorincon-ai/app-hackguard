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
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import {
  catalogoBase,
  catalogoReal,
  conPrueba,
  CUENTAS_BASE,
  referencia,
  ULTIMA_VERIFICACION,
} from "./ayuda.ts";

const FECHA = "2026-10-15";

describe("construirInstantanea", () => {
  it("emite el catálogo con su huella, y la huella se recalcula igual", async () => {
    const r = await construirInstantanea(catalogoBase(), FECHA);
    if (!r.emitida) throw new Error("debía emitirse");
    const { huella, ...cuerpo } = r.instantanea;
    expect(r.instantanea.formato).toBe(FORMATO_DE_INSTANTANEA);
    expect(r.instantanea.fecha_evaluacion).toBe(FECHA);
    expect(huella).toBe(await huellaDeInstantanea(cuerpo));
    expect(r.archivo).toBe(`${FECHA}-${huella.slice(0, 12)}.json`);
    expect(Object.keys(r.instantanea.catalogo).sort()).toEqual([
      "controles",
      "equivalencias",
      "estados",
      "familias",
      "filtro",
      "herramientas",
      "marcos",
      "pruebas",
      "rasgos",
      "reglas_de_veredicto",
      "umbrales",
    ]);
  });

  it("lleva el semáforo de la fecha, y la huella lo cubre", async () => {
    const r = await construirInstantanea(catalogoBase(), FECHA);
    if (!r.emitida) throw new Error("debía emitirse");
    const { semaforo } = r.instantanea;
    expect(semaforo.marcos).toHaveLength(CUENTAS_BASE.marcos);
    expect(semaforo.herramientas).toHaveLength(CUENTAS_BASE.herramientas);
    expect(semaforo.marcos.every((m) => m.estado === "vigente")).toBe(true);
    expect(semaforo.familias.map((f) => f.estado)).toEqual(
      Array<null>(CUENTAS_BASE.familias).fill(null),
    );
    const { huella, ...cuerpo } = r.instantanea;
    const otro = structuredClone(cuerpo);
    otro.semaforo.marcos[0].estado = "vencido";
    expect(await huellaDeInstantanea(otro)).not.toBe(huella);
  });

  it("rechaza una fecha anterior a la última verificación del catálogo", async () => {
    await expect(
      construirInstantanea(catalogoBase(), "2026-10-03"),
    ).rejects.toThrow(
      /anterior a la última verificación del catálogo \(2026-10-04\)/,
    );
  });

  it("tres corridas dan la misma huella, sin importar el orden de los archivos", async () => {
    const huellas = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const c = catalogoBase();
      if (i === 1) c.marcos.reverse();
      if (i === 2) c.herramientas.reverse();
      const r = await construirInstantanea(c, FECHA);
      if (r.emitida) huellas.add(r.instantanea.huella);
    }
    expect(huellas.size).toBe(1);
  });

  it("otra fecha de evaluación cambia el semáforo, no solo la huella", async () => {
    // La huella cambia siempre, porque la fecha está en el contenido: lo que se mide es el estado.
    const estados = async (fecha: string) => {
      const r = await construirInstantanea(catalogoBase(), fecha);
      if (!r.emitida) throw new Error("debía emitirse");
      const s = r.instantanea.semaforo;
      return new Set([...s.marcos, ...s.herramientas].map((v) => v.estado));
    };
    expect(await estados(FECHA)).toEqual(new Set(["vigente"]));
    expect(await estados("2026-12-01")).toEqual(new Set(["por_revisar"]));
  });

  it("el catálogo real, con cada lista invertida, da la misma huella", async () => {
    const fecha = fechaMasDias(ULTIMA_VERIFICACION, 11);
    const directo = await construirInstantanea(catalogoReal(), fecha);
    const c = catalogoReal();
    for (const lista of [
      c.marcos,
      c.equivalencias,
      c.controles,
      c.herramientas,
      c.pruebas,
    ])
      lista.reverse();
    const invertido = await construirInstantanea(c, fecha);
    if (!directo.emitida || !invertido.emitida)
      throw new Error("debía emitirse");
    expect(invertido.instantanea.huella).toBe(directo.instantanea.huella);
  });

  it("publica las pruebas aprobadas y lista aparte las que esperan revisión", async () => {
    const c = catalogoBase();
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
    const c = catalogoBase();
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
      await expect(construirInstantanea(catalogoBase(), fecha)).rejects.toThrow(
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
