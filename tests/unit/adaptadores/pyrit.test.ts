// @vitest-environment node
// El gate de contrato del adaptador de PyRIT (regla 19). La fixture es sintética, hecha a mano con el objeto oficial
// (`ScenarioResult`, microsoft/PyRIT@v1.1.0): aquí no se instala ni se corre PyRIT. Lo que se prueba:
// - el adaptador solo cuenta ataques: ni `outcome` ni el puntaje son el veredicto, que sale de la regla de la prueba (ADR-008);
// - `success` es «el ataque logró su objetivo» = el control falló; `error` y `undetermined` no evaluaron nada;
// - el objetivo, la conversación, el motivo del juez y la identidad del evaluador jamás salen del adaptador (reglas 3 y 4);
// - un archivo que no es de PyRIT, sin versión o sin ataques no arma lote.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Selector } from "../../../src/engine/adaptadores/interfaz.ts";
import { ADAPTADOR_DE_PYRIT } from "../../../src/engine/adaptadores/pyrit.ts";
import { adaptadorDe } from "../../../src/engine/adaptadores/index.ts";
import { RAIZ } from "../evidencia/ayuda.ts";

const FIXTURE = readFileSync(
  path.join(RAIZ, "tests/fixtures/adaptadores/pyrit-1.1.0.sintetico.json"),
  "utf8",
);

const modulo = (referencia: string): Selector => ({
  tipo: "modulo",
  referencia,
});
const leer = (t: string, minima: string | null = "1.1.0") =>
  ADAPTADOR_DE_PYRIT.leer(t, minima);
function corrida(t: string, minima: string | null = "1.1.0") {
  const l = leer(t, minima);
  if (!l.ok) throw new Error(`${l.motivo}: ${l.detalle}`);
  return l.corrida;
}
const motivo = (t: string, minima: string | null = "1.1.0") => {
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

describe("el adaptador de PyRIT", () => {
  it("está en el registro por su herramienta", () => {
    expect(adaptadorDe("pyrit")).toBe(ADAPTADOR_DE_PYRIT);
  });

  it("lee la corrida: versión, fecha, hora y zona salen del archivo", () => {
    const c = corrida(FIXTURE);
    expect(c.herramienta).toEqual({ id: "pyrit", version: "1.1.0" });
    expect([c.fecha, c.hora, c.zonaHoraria]).toEqual([
      "2026-10-12",
      "12:00",
      "UTC",
    ]);
    expect(c.advertencias).toEqual([]);
  });

  it("cuenta los ataques de un grupo: 4 evaluados y 1 con objetivo logrado; el error no cuenta", () => {
    const m = medido(FIXTURE, "jailbreak");
    expect(m.resultado).toEqual({
      ejecutada: true,
      evaluadas: 4,
      fallidas: 1,
      alertas: null,
      metrica: null,
    });
    expect(m.extracto).toBe(
      "PyRIT · jailbreak · 4 evaluados · 1 con objetivo logrado · 1 sin evaluar",
    );
    expect(m.advertencias[0]?.es).toContain("no cuentan como evaluados");
  });

  it("un ataque `undetermined` no se evaluó: ni superado ni fallido", () => {
    const m = medido(FIXTURE, "crescendo");
    expect(m.resultado).toMatchObject({
      ejecutada: true,
      evaluadas: 1,
      fallidas: 0,
    });
  });

  it("si todos terminaron en error el sobre es `no_ejecutada`, jamás superada", () => {
    const m = medido(FIXTURE, "multi_turn");
    expect(m.resultado).toEqual({
      ejecutada: false,
      evaluadas: null,
      fallidas: null,
      alertas: null,
      metrica: null,
    });
    expect(m.advertencias[0]?.es).toContain("ninguno se evaluó");
  });

  it("sin ningún ataque del selector tampoco se dice que se superó", () => {
    const m = medido(FIXTURE, "xpia");
    expect(m.resultado.ejecutada).toBe(false);
    expect(m.advertencias[0]?.es).toContain("no se puede decir");
  });

  it("un selector también se encuentra por la categoría del puntaje", () => {
    const t = cambiado((r) => {
      r.attack_results.otro = structuredClone(
        r.attack_results.jailbreak.slice(0, 2),
      );
      for (const a of r.attack_results.otro)
        a.last_score.score_category = ["categoria-x"];
    });
    expect(medido(t, "categoria-x").resultado).toMatchObject({
      evaluadas: 2,
      fallidas: 1,
    });
  });

  it("un selector de otra herramienta no es de este adaptador", () => {
    const c = corrida(FIXTURE);
    expect(
      c.medir({ tipo: "garak", probes: ["a"], detectores: ["b"] } as Selector)
        .tipo,
    ).toBe("no_aplica");
  });
});

describe("la herramienta no decide", () => {
  it("lo que entrega son conteos: ni `outcome` ni el puntaje viajan como veredicto", () => {
    const m = medido(FIXTURE, "jailbreak");
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

  it("`success` es el control que falló: invertir el sentido de la cuenta cambia el resultado y el test lo nota", () => {
    const m = medido(FIXTURE, "jailbreak");
    // 1 success y 3 failure: si «success» contara como superado serían 3 fallidas.
    expect(m.resultado.fallidas).toBe(1);
  });

  it("un puntaje que contradice al resultado no lo cambia: se cuenta el resultado y se avisa", () => {
    const t = cambiado((r) => {
      r.attack_results.jailbreak[1].last_score.score_value = "true";
    });
    const m = medido(t, "jailbreak");
    expect(m.resultado.fallidas).toBe(1);
    expect(m.advertencias.map((a) => a.es).join(" ")).toContain("contradice");
  });
});

describe("el material sensible no sale", () => {
  it("ningún marcador del objetivo, la conversación, el juez ni la identidad llega a una medida", () => {
    const c = corrida(FIXTURE);
    const todo = JSON.stringify([
      c,
      ...["jailbreak", "crescendo", "multi_turn", "xpia"].map((r) =>
        c.medir(modulo(r)),
      ),
    ]);
    expect(FIXTURE).toContain("MARCADOR-NO-DEBE-PASAR");
    expect(todo).not.toContain("MARCADOR");
  });
});

describe("lo que no arma lote", () => {
  it("el texto que no es JSON", () => {
    expect(motivo("no soy json")).toBe("no_es_el_formato");
  });
  it("un JSON que no es de PyRIT", () => {
    expect(motivo('{"hola": 1}')).toBe("no_es_el_formato");
  });
  it("un resultado con un `outcome` que PyRIT no define", () => {
    expect(
      motivo(
        cambiado((r) => {
          r.attack_results.jailbreak[0].outcome = "pass";
        }),
      ),
    ).toBe("no_es_el_formato");
  });
  it("un archivo sin la versión de la herramienta", () => {
    expect(
      motivo(
        cambiado((r) => {
          delete r.pyrit_version;
        }),
      ),
    ).toBe("campo_ausente");
  });
  it("una versión menor que la mínima del plan, o que no se puede comparar", () => {
    expect(motivo(FIXTURE, "1.2.0")).toBe("version_menor_que_la_minima");
    const nocturna = cambiado((r) => {
      r.pyrit_version = "dev";
    });
    expect(motivo(nocturna, null)).toBe("ok");
    expect(motivo(nocturna, "1.1.0")).toBe("version_no_comparable");
  });
  it("un escenario sin ataques", () => {
    expect(
      motivo(
        cambiado((r) => {
          r.attack_results = {};
        }),
      ),
    ).toBe("sin_resultados");
  });
});

describe("las advertencias de la corrida", () => {
  it("un estado distinto de COMPLETED, una versión fuera del rango y una fecha ausente se avisan", () => {
    const t = cambiado((r) => {
      r.scenario_run_state = "FAILED";
      r.pyrit_version = "1.2.0";
      delete r.creation_time;
      delete r.completion_time;
    });
    const a = corrida(t, null).advertencias.map((x) => x.es);
    expect(a.join(" ")).toContain("FAILED");
    expect(a.join(" ")).toContain("fuera del rango probado");
    expect(a.join(" ")).toContain("fecha legible");
    expect(corrida(t, null).fecha).toBeNull();
  });
});
