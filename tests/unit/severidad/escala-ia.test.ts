// @vitest-environment node
// La escala de severidad de IA (regla dura 7, E-12): una tabla en datos con el impacto primero. Aquí se prueba la tabla
// de verdad (la de datos/severidad/escala-ia.json), la elección de la banda con enteros en el límite exacto, y que la
// tabla que viola su piso o su techo no se carga.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EscalaIa,
  REGLAS_DE_ESCALA,
  bandaDeFrecuencia,
  frecuenciaObservada,
  nivelDeEscala,
  validarEscalaIa,
} from "../../../src/engine/severidad/escala-ia.ts";

const ESCALA = EscalaIa.parse(
  JSON.parse(readFileSync("datos/severidad/escala-ia.json", "utf8")),
);
const copia = (): EscalaIa => structuredClone(ESCALA);
const reglas = (e: EscalaIa) => validarEscalaIa(e).hallazgos.map((h) => h.regla);

describe("la tabla de datos", () => {
  it("es válida: cero hallazgos de validación", () => {
    expect(validarEscalaIa(ESCALA)).toEqual({ estado: "ok", hallazgos: [] });
  });
  it("tiene 4 impactos, 4 bandas desde 0, 5, 20 y 50 por ciento, y una fila por impacto", () => {
    expect(ESCALA.impacto.map((a) => a.nivel)).toEqual([1, 2, 3, 4]);
    expect(ESCALA.frecuencia.map((b) => b.desde)).toEqual([0, 5, 20, 50]);
    expect(ESCALA.tabla.map((f) => f.impacto)).toEqual([1, 2, 3, 4]);
  });
  it("declara el piso (impacto 4, no menos de alto) y el techo (impacto 1, no más de medio) de E-12", () => {
    expect(ESCALA.limites).toContainEqual({ impacto: 4, tipo: "piso", nivel: "alto" });
    expect(ESCALA.limites).toContainEqual({ impacto: 1, tipo: "techo", nivel: "medio" });
  });
  it.each([
    [4, ["alto", "alto", "critico", "critico"]],
    [3, ["medio", "alto", "alto", "critico"]],
    [2, ["bajo", "medio", "medio", "alto"]],
    [1, ["bajo", "bajo", "medio", "medio"]],
  ] as const)("la fila del impacto %i es %j", (impacto, fila) => {
    expect([1, 2, 3, 4].map((b) => nivelDeEscala(ESCALA, impacto, b))).toEqual(fila);
  });
  it("todo el texto es bilingüe", () => {
    for (const a of [...ESCALA.impacto, ...ESCALA.alcance, ...ESCALA.detectabilidad])
      expect(Object.keys(a.descripcion).sort()).toEqual(["en", "es"]);
    for (const b of ESCALA.frecuencia) expect(Object.keys(b.nombre).sort()).toEqual(["en", "es"]);
  });
  it("el esquema es estricto: un campo de más no cabe", () => {
    expect(EscalaIa.safeParse({ ...ESCALA, suma: 1 }).success).toBe(false);
  });
});

describe("la frecuencia se observa, no se opina", () => {
  it("sale de fallidas sobre evaluadas, redondeada solo para mostrar", () => {
    expect(frecuenciaObservada({ evaluadas: 116, fallidas: 42 })).toEqual({
      fallidas: 42,
      evaluadas: 116,
      porCiento: 36,
      deConteo: true,
    });
  });
  it("sin conteo (una métrica contra su umbral) falló 1 de 1, y se dice", () => {
    for (const r of [
      { evaluadas: null, fallidas: null },
      { evaluadas: 20, fallidas: null },
      { evaluadas: null, fallidas: 3 },
      { evaluadas: 0, fallidas: 0 },
    ])
      expect(frecuenciaObservada(r)).toEqual({
        fallidas: 1,
        evaluadas: 1,
        porCiento: 100,
        deConteo: false,
      });
  });
});

describe("la banda se elige con enteros, en el límite exacto", () => {
  const banda = (fallidas: number, evaluadas: number) =>
    bandaDeFrecuencia(ESCALA, { fallidas, evaluadas });
  it.each([
    [0, 20, 1],
    [4, 87, 1], // 4,6 %: menos del 5 %
    [49, 1000, 1], // 4,9 %
    [1, 20, 2], // 5 % exacto
    [5, 100, 2],
    [19, 100, 2],
    [199, 1000, 2], // 19,9 %
    [20, 100, 3], // 20 % exacto
    [6, 20, 3], // 30 %
    [42, 116, 3], // 36,2 %
    [49, 100, 3],
    [499, 1000, 3], // 49,9 %
    [50, 100, 4], // 50 % exacto
    [1, 1, 4],
    [20, 20, 4],
  ])("%i de %i cae en la banda %i", (f, e, esperada) => {
    expect(banda(f, e)).toBe(esperada);
  });
  it("un impacto fuera de la escala no tiene celda", () => {
    expect(nivelDeEscala(ESCALA, 9, 1)).toBeNull();
    expect(nivelDeEscala(ESCALA, 3, 9)).toBeNull();
  });
});

describe("la tabla que viola sus reglas no se carga", () => {
  it("el piso: una celda del impacto 4 por debajo de «alto» (la demo en rojo)", () => {
    const e = copia();
    e.tabla.find((f) => f.impacto === 4)!.niveles[0] = "medio";
    expect(reglas(e)).toContain("escala/viola-piso");
    expect(validarEscalaIa(e).estado).toBe("invalido");
  });
  it("el techo: una celda del impacto 1 por encima de «medio»", () => {
    const e = copia();
    e.tabla.find((f) => f.impacto === 1)!.niveles[3] = "critico";
    expect(reglas(e)).toContain("escala/viola-techo");
  });
  it("no puede quitar el piso ni el techo para esquivarlos", () => {
    const e = copia();
    e.limites = [];
    expect(reglas(e).sort()).toEqual(["escala/sin-piso", "escala/sin-techo"]);
  });
  it("más impacto o más frecuencia no pueden dar menos nivel", () => {
    const porFrecuencia = copia();
    porFrecuencia.tabla.find((f) => f.impacto === 2)!.niveles[1] = "bajo";
    porFrecuencia.tabla.find((f) => f.impacto === 2)!.niveles[0] = "medio";
    expect(reglas(porFrecuencia)).toContain("escala/no-monotona");
    const porImpacto = copia();
    porImpacto.tabla.find((f) => f.impacto === 3)!.niveles[0] = "bajo";
    porImpacto.tabla.find((f) => f.impacto === 3)!.niveles[1] = "bajo";
    expect(reglas(porImpacto)).toContain("escala/no-monotona");
  });
  it("un límite sobre una fila que no existe", () => {
    const e = copia();
    e.limites.push({ impacto: 9, tipo: "piso", nivel: "alto" });
    expect(reglas(e)).toContain("escala/limite-sin-fila");
  });
  it("la tabla debe tener una fila por impacto y un nivel por banda", () => {
    const sinFila = copia();
    sinFila.tabla = sinFila.tabla.filter((f) => f.impacto !== 3);
    expect(reglas(sinFila)).toEqual(["escala/tabla-incompleta"]);
    const cortaFila = copia();
    cortaFila.tabla[0].niveles = ["bajo", "bajo"];
    expect(reglas(cortaFila)).toEqual(["escala/tabla-incompleta"]);
    const repetida = copia();
    repetida.tabla[1].impacto = 1;
    expect(reglas(repetida)).toEqual(["escala/tabla-incompleta"]);
  });
  it("los impactos, el alcance y la detectabilidad van de 1 en 1", () => {
    const e = copia();
    e.impacto[3].nivel = 5;
    e.alcance[1].nivel = 3;
    e.detectabilidad[0].nivel = 2;
    expect(reglas(e)).toEqual(
      expect.arrayContaining([
        "escala/impacto-no-contiguo",
        "escala/alcance-no-contiguo",
        "escala/detectabilidad-no-contigua",
      ]),
    );
  });
  it("las bandas empiezan en 0 y crecen", () => {
    const noCero = copia();
    noCero.frecuencia[0].desde = 1;
    expect(reglas(noCero)).toContain("escala/frecuencia-desordenada");
    const noCrece = copia();
    noCrece.frecuencia[2].desde = 5;
    expect(reglas(noCrece)).toContain("escala/frecuencia-desordenada");
    const salto = copia();
    salto.frecuencia[3].nivel = 5;
    expect(reglas(salto)).toContain("escala/frecuencia-desordenada");
  });
  it("cada regla tiene nombre en los dos idiomas", () => {
    for (const [id, r] of Object.entries(REGLAS_DE_ESCALA)) {
      expect(r.nombre.es, id).not.toBe("");
      expect(r.nombre.en, id).not.toBe("");
      expect(r.severidad).toBe("error");
    }
  });
});
