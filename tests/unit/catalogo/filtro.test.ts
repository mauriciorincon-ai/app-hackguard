// @vitest-environment node
// Filtro de contenido (RF-01.3, DA-03): los patrones de `datos/filtro/patrones.json` marcan sus carnadas y
// ningún contraejemplo, en los dos idiomas; nombrar una técnica, un marco o un módulo nunca marca.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PatronesDelFiltro } from "../../../src/engine/catalogo/esquemas.ts";
import {
  compilarPatrones,
  filtrar,
  textosDe,
} from "../../../src/engine/catalogo/filtro.ts";
import { RAIZ } from "./ayuda.ts";

const datos = PatronesDelFiltro.parse(
  JSON.parse(readFileSync(`${RAIZ}/datos/filtro/patrones.json`, "utf8")),
);
const { patrones, problemas } = compilarPatrones(datos);

describe("los patrones del repo", () => {
  it("compilan y se comprueban a sí mismos sin problemas", () => {
    expect(problemas).toEqual([]);
    expect(patrones.map((p) => p.id)).toEqual(datos.patrones.map((p) => p.id));
  });

  it.each(
    datos.patrones.flatMap((p) => p.carnadas.map((c) => [p.id, c] as const)),
  )("%s marca su carnada", (id, carnada) => {
    expect(
      filtrar({ texto: carnada }, patrones).map((m) => m.patron),
    ).toContain(id);
  });

  it.each([
    ...datos.patrones.flatMap((p) => p.contraejemplos),
    ...datos.contraejemplos_generales.casos,
    "La prueba cita OWASP LLM01 y MITRE ATLAS AML.T0051 con la sonda promptinject de garak.",
    "El resultado esperado: cero activaciones en 20 repeticiones (cota 3/20).",
    "Revisa https://genai.owasp.org/llmrisk/llm01-prompt-injection/ y su versión.",
  ])("no marca «%s»", (texto) => {
    expect(filtrar({ es: texto, en: texto }, patrones)).toEqual([]);
  });
});

describe("compilarPatrones nombra cada falla del propio filtro", () => {
  const copia = () => structuredClone(datos);

  it("una expresión inválida", () => {
    const d = copia();
    d.patrones[0].expresion = "(";
    const r = compilarPatrones(d);
    expect(r.problemas).toContainEqual({
      regla: "filtro/expresion-invalida",
      patron: d.patrones[0].id,
      campo: "patrones.0.expresion",
    });
    expect(r.patrones.map((p) => p.id)).not.toContain(d.patrones[0].id);
  });

  it("un patrón que no marca su carnada", () => {
    const d = copia();
    d.patrones[1].expresion = "^nunca-coincide$";
    expect(compilarPatrones(d).problemas).toContainEqual({
      regla: "filtro/carnada-no-marca",
      patron: d.patrones[1].id,
      campo: "patrones.1.carnadas.0",
    });
  });

  it("un patrón que marca un contraejemplo, propio o general", () => {
    const d = copia();
    d.patrones[0].contraejemplos.push("```bash\nx\n```");
    d.contraejemplos_generales.casos.push("$ ls");
    const r = compilarPatrones(d).problemas.map((p) => p.campo);
    expect(r).toContain(
      `patrones.0.contraejemplos.${d.patrones[0].contraejemplos.length - 1}`,
    );
    expect(r).toContain(
      `contraejemplos_generales.casos.${d.contraejemplos_generales.casos.length - 1}`,
    );
  });
});

describe("filtrar", () => {
  it("dice qué patrón marcó y en qué campo, nunca el fragmento", () => {
    const marcas = filtrar(
      {
        que_verifica: { es: "Ejemplo:\n$ ls", en: "Nada que marcar." },
        notas: ["ok"],
      },
      patrones,
    );
    expect(marcas).toEqual([
      { campo: "que_verifica.es", patron: "bloque-con-interprete" },
    ]);
  });

  it("textosDe recorre objetos y listas en orden de clave, y salta lo que no es texto", () => {
    expect(
      textosDe({ b: ["x", 1, { c: "y" }], a: "z", n: null, v: true }),
    ).toEqual([
      { campo: "a", texto: "z" },
      { campo: "b.0", texto: "x" },
      { campo: "b.2.c", texto: "y" },
    ]);
    expect(textosDe("solo")).toEqual([{ campo: "", texto: "solo" }]);
    expect(textosDe([["a"]])).toEqual([{ campo: "0.0", texto: "a" }]);
  });
});
