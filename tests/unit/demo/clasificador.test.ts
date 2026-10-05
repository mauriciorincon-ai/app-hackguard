// @vitest-environment node
// Clasificador demo (activo de `modelo_decision`): el contrato de Jev que imita, distribuciones que suman
// exactamente 1, la misma respuesta para la misma petición y semilla, y ninguna dependencia del orden de las
// opciones. También fija las imperfecciones sembradas, para que nadie las «arregle» sin que se vea.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  aDiezmilesimos,
  clasificar,
  MODELO_DEMO,
  type EstadoDeSolicitud,
  type PeticionDemo,
  type RespuestaChoice,
  type RespuestaNoul,
} from "../../../src/engine/demo/clasificador.ts";
import { huella } from "../../../src/engine/huella.ts";
import { RAIZ } from "../catalogo/ayuda.ts";

const conjunto = JSON.parse(
  readFileSync(
    `${RAIZ}/docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`,
    "utf8",
  ),
) as {
  casos: {
    id: string;
    estado: Omit<EstadoDeSolicitud, "nota">;
    nota: { es: string; en: string };
  }[];
};

const ESTADO: EstadoDeSolicitud = {
  tipo: "renovacion",
  prestamos_activos: 2,
  dias_de_retraso: 0,
  multa_pendiente: 0,
  anios_como_socio: 3,
  nota: "",
};

const peticion = (
  estado: Partial<EstadoDeSolicitud> = {},
  opciones: string[] = ["aprobar", "rechazar", "revisar"],
): PeticionDemo => ({
  state: { ...ESTADO, ...estado },
  questions: [
    {
      id: "decision",
      type: "choice",
      options: opciones as ("aprobar" | "rechazar" | "revisar")[],
    },
    { id: "urgente", type: "noul" },
  ],
});

const decision = (r: ReturnType<typeof clasificar>) =>
  r.answers.decision as RespuestaChoice;
const noul = (r: ReturnType<typeof clasificar>) =>
  (r.answers.urgente as RespuestaNoul).noul;
const diezmilesimos = (p: Record<string, number>) =>
  Object.values(p).reduce((s, x) => s + Math.round(x * 10000), 0);

describe("el contrato de respuesta", () => {
  it("devuelve {model, answers, usage}, con Choice y Noul como los documenta el fabricante", () => {
    const r = clasificar(peticion());
    expect(Object.keys(r)).toEqual(["model", "answers", "usage"]);
    expect(r.model).toBe(MODELO_DEMO);
    expect(r.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(decision(r)).toEqual({
      type: "choice",
      choice: "aprobar",
      probabilities: { aprobar: 0.75, rechazar: 0.125, revisar: 0.125 },
      confidence: 0.625,
    });
    expect(r.answers.urgente).toEqual({ type: "noul", noul: 0.2 });
  });

  it("confidence = (p_max − 1/n)/(1 − 1/n), también con dos opciones", () => {
    for (const opciones of [
      ["aprobar", "rechazar", "revisar"],
      ["aprobar", "revisar"],
    ]) {
      const d = decision(
        clasificar(peticion({ dias_de_retraso: 15 }, opciones)),
      );
      const n = opciones.length;
      const pMax = Math.max(...Object.values(d.probabilities));
      expect(d.confidence).toBeCloseTo((pMax - 1 / n) / (1 - 1 / n), 12);
    }
  });

  it("solo responde las preguntas que recibe", () => {
    const r = clasificar({
      state: ESTADO,
      questions: [{ id: "urgente", type: "noul" }],
    });
    expect(Object.keys(r.answers)).toEqual(["urgente"]);
  });
});

describe("las distribuciones suman exactamente 1", () => {
  it("en cada caso del conjunto, en los dos idiomas, sin ruido y con ruido en cinco semillas", () => {
    let revisadas = 0;
    for (const caso of conjunto.casos) {
      for (const idioma of ["es", "en"] as const) {
        for (const ejecucion of [
          {},
          ...[0, 1, 2, 3, 4].map((k) => ({
            semilla: 20261004 + k,
            ruido_por_mil: 150,
          })),
        ]) {
          const r = clasificar(
            peticion({ ...caso.estado, nota: caso.nota[idioma] }),
            ejecucion,
          );
          const p = decision(r).probabilities;
          expect(diezmilesimos(p), `${caso.id} ${idioma}`).toBe(10000);
          expect(Object.values(p).every((x) => x > 0 && x < 1)).toBe(true);
          expect(noul(r) > 0 && noul(r) < 1).toBe(true);
          revisadas += 1;
        }
      }
    }
    expect(revisadas).toBe(conjunto.casos.length * 2 * 6);
  });

  it("el resto mayor reparte los diezmilésimos que faltan y desempata por id", () => {
    expect(aDiezmilesimos({ c: 1, a: 1, b: 1 })).toEqual({
      a: 3334,
      b: 3333,
      c: 3333,
    });
    expect(aDiezmilesimos({ x: 2, y: 1 })).toEqual({ x: 6667, y: 3333 });
    expect(aDiezmilesimos({ solo: 7 })).toEqual({ solo: 10000 });
  });

  it.each([{ a: 0 }, { a: 1.5 }, { a: -2 }])(
    "rechaza pesos que no son enteros positivos: %j",
    (pesos) => {
      expect(() => aDiezmilesimos(pesos)).toThrow(/peso no entero positivo/);
    },
  );
});

describe("determinismo", () => {
  it("la misma petición con la misma semilla da la misma respuesta y la misma huella, tres veces", async () => {
    const p = peticion({ dias_de_retraso: 15, nota: "I was ill" });
    const huellas = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const r = clasificar(p, { semilla: 7, ruido_por_mil: 150 });
      expect(r).toEqual(clasificar(p, { semilla: 7, ruido_por_mil: 150 }));
      huellas.add(await huella(r));
    }
    expect(huellas.size).toBe(1);
  });

  it("otra semilla mueve las probabilidades; ruido cero es lo mismo que sin semilla", () => {
    const p = peticion({ dias_de_retraso: 15 });
    expect(
      decision(clasificar(p, { semilla: 1, ruido_por_mil: 150 })),
    ).not.toEqual(decision(clasificar(p, { semilla: 2, ruido_por_mil: 150 })));
    expect(clasificar(p, { semilla: 1, ruido_por_mil: 0 })).toEqual(
      clasificar(p),
    );
  });

  it("el orden de las opciones no cambia nada, con ruido o sin él", () => {
    for (const ejecucion of [{}, { semilla: 99, ruido_por_mil: 150 }]) {
      const a = clasificar(
        peticion({ multa_pendiente: 3000 }, ["aprobar", "rechazar", "revisar"]),
        ejecucion,
      );
      const b = clasificar(
        peticion({ multa_pendiente: 3000 }, ["revisar", "aprobar", "rechazar"]),
        ejecucion,
      );
      expect(b).toEqual(a);
    }
  });

  it("un empate se rompe por id, no por posición", () => {
    for (const opciones of [
      ["rechazar", "revisar"],
      ["revisar", "rechazar"],
    ]) {
      const d = decision(clasificar(peticion({}, opciones)));
      expect(d.probabilities).toEqual({ rechazar: 0.5, revisar: 0.5 });
      expect(d.choice).toBe("rechazar");
      expect(d.confidence).toBe(0);
    }
  });
});

describe("las imperfecciones sembradas (a propósito, documentadas en el conjunto)", () => {
  const eleccion = (nota: string, estado: Partial<EstadoDeSolicitud> = {}) =>
    decision(clasificar(peticion({ dias_de_retraso: 20, ...estado, nota })))
      .choice;

  it("el léxico entiende el inglés y solo parte del español", () => {
    expect(eleccion("I was ill for three weeks.")).toBe("aprobar");
    expect(eleccion("Estuve enferma tres semanas.")).toBe("revisar");
    expect(eleccion("Estuve en el hospital.")).toBe("aprobar");
  });

  it("no entiende la negación", () => {
    expect(eleccion("I wasn't ill; I simply forgot.")).toBe("aprobar");
    expect(
      noul(clasificar(peticion({ nota: "It is not urgent." }))),
    ).toBeGreaterThan(0.5);
  });

  it("premia la antigüedad del socio, que la política no menciona", () => {
    const p = (anios: number) =>
      decision(clasificar(peticion({ anios_como_socio: anios }))).probabilities
        .aprobar;
    expect(p(10)).toBeGreaterThan(p(9));
  });

  it("reconoce frases de varias palabras, no solo palabras sueltas", () => {
    const multa = {
      tipo: "condonacion_de_multa" as const,
      multa_pendiente: 1200,
      dias_de_retraso: 0,
    };
    expect(eleccion("The fine is a library error.", multa)).toBe("aprobar");
    expect(eleccion("The library has an error.", multa)).toBe("revisar");
  });
});

describe("peticiones inválidas", () => {
  it.each([
    ["una opción que no existe", peticion({}, ["aprobar", "otra"])],
    ["opciones repetidas", peticion({}, ["aprobar", "aprobar"])],
    ["una sola opción", peticion({}, ["aprobar"])],
    ["préstamos negativos", peticion({ prestamos_activos: -1 })],
    [
      "preguntas repetidas",
      {
        state: ESTADO,
        questions: [
          { id: "urgente", type: "noul" },
          { id: "urgente", type: "noul" },
        ],
      },
    ],
    ["sin preguntas", { state: ESTADO, questions: [] }],
  ] as [string, PeticionDemo][])("%s", (_, p) => {
    expect(() => clasificar(p)).toThrow(/^petición inválida: /);
  });

  it.each([
    [{ ruido_por_mil: 501 }, /ruido_por_mil/],
    [{ ruido_por_mil: 1.5 }, /ruido_por_mil/],
    [{ semilla: -1 }, /semilla/],
    [{ semilla: 2 ** 32 }, /semilla/],
    [{ semilla: 0.5 }, /semilla/],
  ])("una ejecución fuera de rango: %j", (ejecucion, error) => {
    expect(() => clasificar(peticion(), ejecucion)).toThrow(error);
  });
});
