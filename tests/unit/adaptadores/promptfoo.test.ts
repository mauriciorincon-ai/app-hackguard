// @vitest-environment node
// El gate de contrato del adaptador de promptfoo (regla 19). La fixture es sintética, hecha a mano con el formato oficial
// (src/types/index.ts@0.123.1): aquí no se instala ni se corre promptfoo. Lo que se prueba:
// - el adaptador solo cuenta filas: ni `success` ni `score` son el veredicto, que sale de la regla de la prueba (ADR-008);
// - una fila con error de la corrida no se evaluó: no es superada ni fallida, y sin filas evaluadas el sobre es `no_ejecutada`;
// - el prompt, las variables, la respuesta, el motivo del evaluador y la configuración jamás salen del adaptador (reglas 3 y 4);
// - un archivo que no es de promptfoo, sin versión, de otra versión del resumen o editado no arma lote.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Selector } from "../../../src/engine/adaptadores/interfaz.ts";
import { ADAPTADOR_DE_PROMPTFOO } from "../../../src/engine/adaptadores/promptfoo.ts";
import { adaptadorDe } from "../../../src/engine/adaptadores/index.ts";
import { RAIZ } from "../evidencia/ayuda.ts";

const FIXTURE = readFileSync(
  path.join(
    RAIZ,
    "tests/fixtures/adaptadores/promptfoo-0.123.1.sintetico.json",
  ),
  "utf8",
);

const modulo = (referencia: string): Selector => ({
  tipo: "modulo",
  referencia,
});
const leer = (t: string, minima: string | null = "0.123.1") =>
  ADAPTADOR_DE_PROMPTFOO.leer(t, minima);
function corrida(t: string, minima: string | null = "0.123.1") {
  const l = leer(t, minima);
  if (!l.ok) throw new Error(`${l.motivo}: ${l.detalle}`);
  return l.corrida;
}
const motivo = (t: string, minima: string | null = "0.123.1") => {
  const l = leer(t, minima);
  return l.ok ? "ok" : l.motivo;
};
const medido = (t: string, referencia: string) => {
  const m = corrida(t).medir(modulo(referencia));
  if (m.tipo !== "medido") throw new Error("no_aplica");
  return m;
};
// Regla 1: un `any` con su razón. Es un archivo JSON arbitrario que cada prueba muta en la ruta que necesita.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
const cambiado = (f: (r: Json) => void) => {
  const r = JSON.parse(FIXTURE) as Json;
  f(r);
  return JSON.stringify(r);
};

describe("el adaptador de promptfoo", () => {
  it("está en el registro por su herramienta", () => {
    expect(adaptadorDe("promptfoo")).toBe(ADAPTADOR_DE_PROMPTFOO);
  });

  it("lee la corrida: versión, fecha, hora y zona salen del archivo", () => {
    const c = corrida(FIXTURE);
    expect(c.herramienta).toEqual({ id: "promptfoo", version: "0.123.1" });
    expect([c.fecha, c.hora, c.zonaHoraria]).toEqual([
      "2026-10-12",
      "12:00",
      "UTC",
    ]);
    expect(c.advertencias).toEqual([]);
  });

  it("cuenta las filas de un plugin: 3 evaluadas y 1 fallida", () => {
    const m = medido(FIXTURE, "prompt-extraction");
    expect(m.resultado).toEqual({
      ejecutada: true,
      evaluadas: 3,
      fallidas: 1,
      alertas: null,
      metrica: null,
    });
    expect(m.extracto).toBe(
      "promptfoo · prompt-extraction · 3 evaluadas · 1 fallida",
    );
  });

  it("cuenta por el tipo de la aserción cuando el selector no es un plugin", () => {
    const m = medido(FIXTURE, "is-json");
    expect(m.resultado).toMatchObject({
      ejecutada: true,
      evaluadas: 1,
      fallidas: 0,
    });
  });

  it("una fila con error de la corrida no se evaluó: ni superada ni fallida", () => {
    const m = medido(FIXTURE, "bfla");
    expect(m.resultado).toEqual({
      ejecutada: false,
      evaluadas: null,
      fallidas: null,
      alertas: null,
      metrica: null,
    });
    expect(m.advertencias[0]?.es).toContain("error de la corrida");
  });

  it("si junto a las evaluadas hay filas con error, no cuentan y se avisa", () => {
    const t = cambiado((r) => {
      r.results.results[3].failureReason = 2;
      r.results.results[3].success = false;
      r.results.stats = { successes: 4, failures: 1, errors: 2 };
    });
    const m = medido(t, "indirect-prompt-injection");
    expect(m.resultado).toMatchObject({
      ejecutada: true,
      evaluadas: 1,
      fallidas: 0,
    });
    expect(m.advertencias.map((a) => a.es).join(" ")).toContain("1 fila(s)");
  });

  it("sin ninguna fila del selector el sobre es `no_ejecutada`, jamás superada", () => {
    const m = medido(FIXTURE, "excessive-agency");
    expect(m.resultado.ejecutada).toBe(false);
    expect(m.resultado.fallidas).toBeNull();
    expect(m.advertencias[0]?.es).toContain("no se puede decir");
  });

  it("un selector de otra herramienta no es de este adaptador", () => {
    const c = corrida(FIXTURE);
    expect(
      c.medir({ tipo: "garak", probes: ["a"], detectores: ["b"] } as Selector)
        .tipo,
    ).toBe("no_aplica");
    expect(
      c.medir({ tipo: "zap", pluginids: [1], agregacion: "cualquier_regla" })
        .tipo,
    ).toBe("no_aplica");
  });
});

describe("la herramienta no decide", () => {
  it("lo que entrega son conteos: ni `success` ni `score` viajan como veredicto", () => {
    const m = medido(FIXTURE, "prompt-extraction");
    expect(Object.keys(m).sort()).toEqual([
      "advertencias",
      "extracto",
      "resultado",
      "tipo",
    ]);
    expect(Object.keys(m.resultado).sort()).toEqual([
      "alertas",
      "ejecutada",
      "evaluadas",
      "fallidas",
      "metrica",
    ]);
  });

  it("un `success` que se contradice con su `failureReason` no cambia la cuenta de la fila con error", () => {
    // Una fila con error trae success: false; si el adaptador contara `success` y no `failureReason`, sería una fallida.
    const m = medido(FIXTURE, "bfla");
    expect(m.resultado.fallidas).toBeNull();
  });
});

describe("el material sensible no sale", () => {
  it("ningún marcador del prompt, la respuesta, las variables, el motivo ni la configuración llega a una medida", () => {
    const c = corrida(FIXTURE);
    const todo = JSON.stringify([
      c,
      ...[
        "prompt-extraction",
        "indirect-prompt-injection",
        "is-json",
        "bfla",
        "excessive-agency",
      ].map((r) => c.medir(modulo(r))),
    ]);
    expect(FIXTURE).toContain("MARCADOR-NO-DEBE-PASAR");
    expect(todo).not.toContain("MARCADOR");
  });
});

describe("lo que no arma lote", () => {
  it("el texto que no es JSON", () => {
    expect(motivo("no soy json")).toBe("no_es_el_formato");
  });
  it("un JSON que no es de promptfoo", () => {
    expect(motivo('{"hola": 1}')).toBe("no_es_el_formato");
  });
  it("un resumen que no es V3", () => {
    const l = leer(
      cambiado((r) => {
        r.results.version = 2;
      }),
    );
    expect(l.ok).toBe(false);
    if (!l.ok) expect(l.detalle).toContain("V3");
  });
  it("un archivo sin la versión de la herramienta", () => {
    expect(
      motivo(
        cambiado((r) => {
          delete r.metadata;
        }),
      ),
    ).toBe("campo_ausente");
  });
  it("una versión menor que la mínima del plan, o que no se puede comparar", () => {
    expect(motivo(FIXTURE, "0.200.0")).toBe("version_menor_que_la_minima");
    const nocturna = cambiado((r) => {
      r.metadata.promptfooVersion = "nightly";
    });
    // Sin mínima en el plan se lee (y se avisa que está fuera del rango); con mínima no se puede comparar.
    expect(motivo(nocturna, null)).toBe("ok");
    expect(motivo(nocturna, "0.123.1")).toBe("version_no_comparable");
  });
  it("un archivo sin filas", () => {
    expect(
      motivo(
        cambiado((r) => {
          r.results.results = [];
          r.results.stats = { successes: 0, failures: 0, errors: 0 };
        }),
      ),
    ).toBe("sin_resultados");
  });
});

describe("las advertencias de la corrida", () => {
  it("estadísticas que no suman las filas, una versión fuera del rango y una marca de tiempo ausente se avisan", () => {
    const t = cambiado((r) => {
      r.results.stats = { successes: 1, failures: 1, errors: 1 };
      r.metadata.promptfooVersion = "0.130.0";
      delete r.results.timestamp;
    });
    const a = corrida(t, null).advertencias.map((x) => x.es);
    expect(a.join(" ")).toContain("no suman");
    expect(a.join(" ")).toContain("fuera del rango probado");
    expect(a.join(" ")).toContain("marca de tiempo");
    expect(corrida(t, null).fecha).toBeNull();
  });
});
