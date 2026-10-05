// @vitest-environment node
// El conjunto de referencia del clasificador demo y su evaluación: el conjunto es válido, la evaluación da
// siempre la misma huella, y sus cifras son las que la guía de prueba promete. Si el clasificador o el
// conjunto cambian, estas cifras cambian aquí a la vista, y la guía se actualiza con ellas.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluarConjunto,
  informeDelDemo,
} from "../../../src/engine/demo/conjunto.ts";
import { RAIZ } from "../catalogo/ayuda.ts";

const RUTA = "docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json";
const leer = () =>
  JSON.parse(readFileSync(`${RAIZ}/${RUTA}`, "utf8")) as Record<
    string,
    unknown
  > & {
    casos: Record<string, unknown>[];
    parametros: Record<string, unknown>;
  };

const evaluacion = await evaluarConjunto(leer());

describe("la evaluación del conjunto de referencia", () => {
  it("da la misma huella de respuestas en tres corridas", async () => {
    const huellas = new Set([evaluacion.huella_de_respuestas]);
    for (let i = 0; i < 2; i++)
      huellas.add((await evaluarConjunto(leer())).huella_de_respuestas);
    expect(huellas.size).toBe(1);
    expect(evaluacion.huella_de_respuestas).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mide 26 casos en los dos idiomas con los parámetros del conjunto", () => {
    expect(evaluacion.conjunto).toEqual({
      id: "biblioteca-municipal",
      version: "1.0.0",
      casos: 26,
    });
    expect(evaluacion.parametros).toMatchObject({
      semilla: 20261004,
      repeticiones: 5,
      ruido_por_mil: 150,
      bins_ece: 4,
    });
    expect(evaluacion.casos).toHaveLength(52);
  });

  it("el español falla donde su léxico no llega, y el inglés en la negación", () => {
    const fallos = (idioma: "es" | "en") =>
      evaluacion.casos
        .filter((c) => c.idioma === idioma && c.eleccion !== c.etiqueta)
        .map((c) => c.id);
    expect(fallos("es")).toEqual([
      "BIB-007",
      "BIB-008",
      "BIB-013",
      "BIB-018",
      "BIB-019",
      "BIB-023",
    ]);
    expect(fallos("en")).toEqual(["BIB-025"]);
  });

  it("las cifras que promete la guía de prueba", () => {
    const d = evaluacion.decision;
    expect(d.es.exactitud).toMatchObject({ n: 26, cuenta: 20 });
    expect(d.en.exactitud).toMatchObject({ n: 26, cuenta: 25 });
    expect(d.es.banda).toMatchObject({ n: 7, cuenta: 1 });
    expect(d.en.banda).toMatchObject({ n: 9, cuenta: 1 });
    expect(d.reejecucion).toMatchObject({
      n: 52,
      cuenta: 1,
      k: 5,
      vectores_identicos: 0,
    });
    expect(d.paridad.concordancia).toMatchObject({ n: 26, cuenta: 19 });
    expect(d.paridad.diferencia_pp).toBeCloseTo(19.23, 2);
    expect(d.es.brier).toBeCloseTo(0.3742, 4);
    expect(d.en.brier).toBeCloseTo(0.2267, 4);
    expect(d.es.ece.valor).toBeCloseTo(0.0855, 4);
    expect(d.en.ece.valor).toBeCloseTo(0.2914, 4);
    expect(evaluacion.urgencia.es.exactitud).toMatchObject({ cuenta: 23 });
    expect(evaluacion.urgencia.en.exactitud).toMatchObject({ cuenta: 25 });
  });

  it("exporta el margen de cada caso al umbral de la banda (E-18)", () => {
    const c = evaluacion.casos.find(
      (x) => x.id === "BIB-001" && x.idioma === "es",
    );
    expect(c?.margen).toBeCloseTo((c?.probabilidades.aprobar ?? 0) - 0.7, 12);
  });
});

describe("un conjunto inválido no se evalúa", () => {
  it.each([
    [
      "un caso repetido",
      (c: ReturnType<typeof leer>) => c.casos.push(c.casos[0]),
      /casos: casos con id repetido/,
    ],
    [
      "una regla que la política no tiene",
      (c: ReturnType<typeof leer>) => (c.casos[0].regla = "otra"),
      /casos\.0\.regla: regla inexistente: otra/,
    ],
    [
      "una nota igual en los dos idiomas",
      (c: ReturnType<typeof leer>) =>
        (c.casos[0].nota = { es: "Lo mismo.", en: "Lo mismo." }),
      /casos\.0\.nota: la nota es igual en los dos idiomas/,
    ],
    [
      "una banda que no contiene su umbral",
      (c: ReturnType<typeof leer>) =>
        (c.parametros.banda = {
          opcion: "aprobar",
          umbral: 0.9,
          desde: 0.6,
          hasta: 0.8,
        }),
      /parametros\.banda: la banda no contiene el umbral/,
    ],
    [
      "un campo que no existe",
      (c: ReturnType<typeof leer>) => (c.extra = 1),
      /conjunto inválido: \(raíz\)/,
    ],
  ])("%s", async (_, cambio, error) => {
    const c = leer();
    cambio(c);
    await expect(evaluarConjunto(c)).rejects.toThrow(error);
  });
});

describe("el informe", () => {
  it("en español, con coma decimal y cada cifra con su cuenta", () => {
    const texto = informeDelDemo(evaluacion, "es");
    expect(texto.split("\n")[0]).toBe(
      "Clasificador demo hackguard-demo-1.0.0 sobre «biblioteca-municipal» 1.0.0",
    );
    expect(texto).toContain(
      `  huella de las respuestas: ${evaluacion.huella_de_respuestas}`,
    );
    expect(texto).toMatch(/ {2}exactitud +20 de 26 +25 de 26\n/);
    expect(texto).toMatch(/ {2}Brier +0,3742 +0,2267\n/);
    expect(texto).toContain("se mira entre 0,60 y 0,80");
    expect(texto).toContain(
      "la exactitud en inglés menos la de español da 19,2 puntos; los dos idiomas eligen lo mismo en 19 de 26 casos.",
    );
    expect(texto).toContain(
      "cambia la decisión en 1 de 52 respuestas (1,92 %); 0 de 52 distribuciones salen idénticas.",
    );
  });

  it("en inglés, con punto decimal", () => {
    const texto = informeDelDemo(evaluacion, "en");
    expect(texto).toMatch(/ {2}accuracy +20 of 26 +25 of 26\n/);
    expect(texto).toContain(
      "English accuracy minus Spanish accuracy is 19.2 points",
    );
    expect(texto).toContain("(1.92 %)");
  });

  it("sin datos para una cifra, un guion; sin diferencia de paridad, lo dice", () => {
    const vacia = structuredClone(evaluacion);
    vacia.decision.es.brier = null;
    vacia.decision.paridad.diferencia_pp = null;
    vacia.decision.reejecucion.tasa = null;
    expect(informeDelDemo(vacia, "es")).toMatch(/ {2}Brier +— +0,2267\n/);
    expect(informeDelDemo(vacia, "es")).toContain("Paridad ES/EN: sin datos;");
    expect(informeDelDemo(vacia, "en")).toContain("ES/EN parity: no data;");
  });
});

describe("pnpm clasificador:demo", () => {
  const demo = (...argumentos: string[]) => {
    const r = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "src/cli/clasificador-demo.ts",
        ...argumentos,
      ],
      { cwd: RAIZ, encoding: "utf8" },
    );
    return { codigo: r.status, salida: r.stdout, errores: r.stderr };
  };

  it("imprime el informe en español por defecto, o en inglés, o en JSON con la misma huella", () => {
    const es = demo();
    expect(es.codigo).toBe(0);
    expect(es.salida).toBe(informeDelDemo(evaluacion, "es"));
    expect(demo("--idioma", "en").salida).toBe(
      informeDelDemo(evaluacion, "en"),
    );
    const json = JSON.parse(demo("--json").salida) as {
      huella_de_respuestas: string;
    };
    expect(json.huella_de_respuestas).toBe(evaluacion.huella_de_respuestas);
  });

  it.each([
    [["--idioma", "fr"], "--idioma es|en"],
    [["sobra"], "sobra"],
    [["--conjunto", "no-existe.json"], "no-existe.json"],
    [["--conjunto", "package.json"], "conjunto inválido"],
    [["--opcion-que-no-existe"], "opcion-que-no-existe"],
  ])("sale 3 y dice por qué: %j", (argumentos, menciona) => {
    const r = demo(...argumentos);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain(menciona);
    expect(r.errores).toContain("uso / usage:");
    expect(r.salida).toBe("");
  });
});
