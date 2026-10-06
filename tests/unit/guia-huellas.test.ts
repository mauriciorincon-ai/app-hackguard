// @vitest-environment node
// Las huellas que prometen la guía de prueba y el ADR-002 son las que da el motor hoy. Cambiar un dato del
// catálogo, el clasificador o su conjunto mueve las huellas; sin esta prueba, la guía seguiría prometiendo las
// viejas y el usuario las vería fallar en el gate (hallazgo AU-44).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { construirInstantanea } from "../../src/engine/catalogo/instantanea.ts";
import { evaluarConjunto } from "../../src/engine/demo/conjunto.ts";
import { catalogoReal, RAIZ, ULTIMA_VERIFICACION } from "./catalogo/ayuda.ts";

const leer = (relativa: string) => readFileSync(`${RAIZ}/${relativa}`, "utf8");

const DOCUMENTOS = [
  "docs/GUIA-DE-PRUEBA.html",
  "decisions/002-catalog-data-format-and-canonical-fingerprint.md",
];

/** Las huellas de instantánea de cada fecha evaluable que el documento menciona. */
async function huellasDeSusFechas(texto: string): Promise<Map<string, string>> {
  const fechas = [...new Set(texto.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [])]
    .filter((f) => f >= ULTIMA_VERIFICACION)
    .sort();
  const huellas = new Map<string, string>();
  for (const fecha of fechas) {
    const r = await construirInstantanea(catalogoReal(), fecha);
    if (r.emitida) huellas.set(fecha, r.instantanea.huella);
  }
  return huellas;
}

const clasificador = (
  await evaluarConjunto(
    JSON.parse(
      leer("docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json"),
    ),
  )
).huella_de_respuestas;

describe("las huellas que citan los documentos son las del motor", () => {
  it.each(DOCUMENTOS)(
    "%s: cada huella completa es la de una instantánea de una fecha que cita, o la del clasificador",
    async (relativa) => {
      const texto = leer(relativa);
      const validas = new Set([
        ...(await huellasDeSusFechas(texto)).values(),
        clasificador,
      ]);
      const citadas = [...new Set(texto.match(/\b[0-9a-f]{64}\b/g) ?? [])];
      expect(citadas.filter((h) => !validas.has(h))).toEqual([]);
    },
  );

  it.each(DOCUMENTOS)(
    "%s: cada huella abreviada y cada nombre de instantánea corresponde a su fecha",
    async (relativa) => {
      const texto = leer(relativa);
      const porFecha = await huellasDeSusFechas(texto);
      const validas = [...porFecha.values(), clasificador];
      // «e2858e62cd9e…»: los 12 primeros caracteres seguidos de puntos suspensivos.
      for (const [, prefijo] of texto.matchAll(/\b([0-9a-f]{12})…/g))
        expect(
          validas.some((h) => h.startsWith(prefijo)),
          prefijo,
        ).toBe(true);
      // «2026-10-15-5bcb8a75e5ec.json»: la fecha y los 12 primeros caracteres de su huella. Un nombre con una
      // fecha anterior a la última verificación es un registro histórico (una instantánea reemplazada) y no se
      // puede recalcular.
      for (const [, fecha, prefijo] of texto.matchAll(
        /\b(\d{4}-\d{2}-\d{2})-([0-9a-f]{12})\.json\b/g,
      ))
        if (fecha >= ULTIMA_VERIFICACION)
          expect(
            porFecha.get(fecha)?.slice(0, 12),
            `${fecha}-${prefijo}`,
          ).toBe(prefijo);
    },
  );
});
