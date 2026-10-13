// @vitest-environment node
// Los patrones de instrucciones sembradas (`datos/propuestas/instrucciones.json`): cada carnada se marca y ningún contraejemplo (ni el
// general) marca. El filtro solo MARCA; esta prueba es lo que impide que un patrón nuevo calle o grite de más.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compilarPatrones,
  filtrar,
} from "../../../src/engine/catalogo/filtro.ts";
import { RAIZ } from "./ayuda.ts";

const dato = JSON.parse(
  readFileSync(`${RAIZ}/datos/propuestas/instrucciones.json`, "utf8"),
) as {
  patrones: {
    id: string;
    expresion: string;
    banderas: string;
    carnadas: string[];
    contraejemplos: string[];
  }[];
};

describe("los patrones de instrucciones sembradas", () => {
  for (const p of dato.patrones)
    describe(p.id, () => {
      const { patrones: compilados, problemas } = compilarPatrones({
        ...dato,
        patrones: [p],
      } as never);
      it("compila sin problemas", () => expect(problemas).toEqual([]));
      it.each(p.carnadas)("marca la carnada «%s»", (texto) => {
        expect(filtrar({ texto }, compilados)).not.toEqual([]);
      });
      it.each(p.contraejemplos)("no marca «%s»", (texto) => {
        expect(filtrar({ texto }, compilados)).toEqual([]);
      });
    });
  it("el índice dirigido a agentes (RF-07.4) es un patrón del dato", () => {
    expect(dato.patrones.map((p) => p.id)).toContain("indice-para-agentes");
  });
});
