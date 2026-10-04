// @vitest-environment node
// Referencias con versión (E-15): «LLM07» de 2025 resuelve por el mapa oficial a LLM08 de 2026; sin versión,
// con una versión o una entrada que no existen, la referencia es inválida.
import { describe, expect, it } from "vitest";
import { resolverReferencia } from "../../../src/engine/catalogo/equivalencias.ts";
import { Equivalencias, Marco } from "../../../src/engine/catalogo/esquemas.ts";
import { buscar, catalogoReal } from "./ayuda.ts";

const c = catalogoReal();
const llm = Marco.parse(
  JSON.parse(buscar(c.marcos, "datos/marcos/owasp-llm-top10.json").texto),
);
const mapa = Equivalencias.parse(
  JSON.parse(
    buscar(
      c.equivalencias,
      "datos/marcos/equivalencias/owasp-llm-2025-a-2026.json",
    ).texto,
  ),
);
const marcos = new Map([[llm.id, llm]]);
const mapas = new Map([[mapa.id, mapa]]);
const ref = (
  version_marco: string,
  referencia_en_marco: string,
  marco_id = "owasp-llm-top10",
) => ({
  marco_id,
  version_marco,
  referencia_en_marco,
});

describe("resolverReferencia con el mapa oficial OWASP LLM 2025 → 2026", () => {
  it("una entrada de la versión vigente es vigente", () => {
    expect(resolverReferencia(ref("2026", "LLM01"), marcos, mapas)).toEqual({
      tipo: "vigente",
    });
  });

  it.each([
    ["LLM07", "LLM08"],
    ["LLM09", "LLM07"],
    ["LLM05", "LLM10"],
    ["LLM06", "LLM03"],
    ["LLM01", "LLM01"],
  ])("%s de 2025 resuelve a %s de 2026", (vieja, nueva) => {
    expect(resolverReferencia(ref("2025", vieja), marcos, mapas)).toEqual({
      tipo: "anterior",
      vigentes: [nueva],
      version_vigente: "2026",
    });
  });

  it.each([
    [ref("2026", "LLM11"), "referencia/entrada-inexistente"],
    [ref("2025", "LLM11"), "referencia/entrada-inexistente"],
    [ref("2019", "LLM01"), "referencia/version-inexistente"],
    [ref("2026", "LLM01", "otro-marco"), "referencia/marco-inexistente"],
  ])("%o es inválida: %s", (r, regla) => {
    expect(resolverReferencia(r, marcos, mapas)).toEqual({
      tipo: "invalida",
      regla,
    });
  });
});

describe("resolverReferencia sobre mapas armados para la prueba", () => {
  const marcoDe = (
    versiones: {
      version: string;
      equivalencias?: string;
      entradas?: { id: string; nombre: string }[];
    }[],
  ) =>
    ({
      ...llm,
      id: "m",
      version_vigente: "3",
      entradas: [
        { id: "C1", nombre: "c1" },
        { id: "C2", nombre: "c2" },
      ],
      versiones_anteriores: versiones.map((v) => ({ fecha: "2020", ...v })),
    }) as Marco;
  const mapaDe = (
    id: string,
    desde: string,
    hacia: string,
    pares: [string, string[]][],
  ) =>
    ({
      ...mapa,
      id,
      marco_id: "m",
      desde,
      hacia,
      pares: pares.map(([d, h]) => ({ desde: d, hacia: h, cambios: [] })),
    }) as Equivalencias;

  it("sigue los mapas salto a salto hasta la vigente, y una división da varias entradas", () => {
    const m = marcoDe([
      { version: "1", equivalencias: "uno-a-dos" },
      { version: "2", equivalencias: "dos-a-tres" },
    ]);
    const ms = new Map([
      ["uno-a-dos", mapaDe("uno-a-dos", "1", "2", [["A", ["B"]]])],
      ["dos-a-tres", mapaDe("dos-a-tres", "2", "3", [["B", ["C2", "C1"]]])],
    ]);
    expect(
      resolverReferencia(
        { marco_id: "m", version_marco: "1", referencia_en_marco: "A" },
        new Map([["m", m]]),
        ms,
      ),
    ).toEqual({
      tipo: "anterior",
      vigentes: ["C1", "C2"],
      version_vigente: "3",
    });
  });

  it("una entrada retirada sin sucesora resuelve a ninguna", () => {
    const m = marcoDe([{ version: "2", equivalencias: "dos-a-tres" }]);
    const ms = new Map([
      ["dos-a-tres", mapaDe("dos-a-tres", "2", "3", [["B", []]])],
    ]);
    const r = resolverReferencia(
      { marco_id: "m", version_marco: "2", referencia_en_marco: "B" },
      new Map([["m", m]]),
      ms,
    );
    expect(r).toEqual({ tipo: "anterior", vigentes: [], version_vigente: "3" });
  });

  it.each([
    ["sin mapa", [{ version: "2" }], []],
    [
      "con un mapa que no está cargado",
      [{ version: "2", equivalencias: "perdido" }],
      [],
    ],
    [
      "con un mapa que sale de otra versión",
      [{ version: "2", equivalencias: "uno-a-tres" }],
      [mapaDe("uno-a-tres", "1", "3", [["B", ["C1"]]])],
    ],
    [
      "con un mapa hacia una versión que no existe",
      [{ version: "2", equivalencias: "dos-a-x" }],
      [mapaDe("dos-a-x", "2", "x", [["B", ["C1"]]])],
    ],
  ])(
    "una versión anterior %s no se resuelve, pero no es inválida",
    (_, versiones, lista) => {
      const m = marcoDe(versiones);
      const ms = new Map(lista.map((x) => [x.id, x]));
      const r = resolverReferencia(
        { marco_id: "m", version_marco: "2", referencia_en_marco: "B" },
        new Map([["m", m]]),
        ms,
      );
      expect(r).toEqual({
        tipo: "anterior",
        vigentes: null,
        version_vigente: "3",
      });
    },
  );

  it("un mapa circular no cuelga", () => {
    const m = marcoDe([
      { version: "1", equivalencias: "uno-a-dos" },
      { version: "2", equivalencias: "dos-a-uno" },
    ]);
    const ms = new Map([
      ["uno-a-dos", mapaDe("uno-a-dos", "1", "2", [["A", ["B"]]])],
      ["dos-a-uno", mapaDe("dos-a-uno", "2", "1", [["B", ["A"]]])],
    ]);
    const r = resolverReferencia(
      { marco_id: "m", version_marco: "1", referencia_en_marco: "A" },
      new Map([["m", m]]),
      ms,
    );
    expect(r).toEqual({
      tipo: "anterior",
      vigentes: null,
      version_vigente: "3",
    });
  });
});
