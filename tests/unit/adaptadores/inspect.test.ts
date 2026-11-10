// @vitest-environment node
// El gate de contrato del adaptador de Inspect (regla 19). La fixture es sintética, hecha a mano con el `EvalLog` oficial
// (UKGovernmentBEIS/inspect_ai@0.3.288): aquí no se instala ni se corre Inspect. Lo que se prueba:
// - el adaptador solo cuenta muestras (id, epoch): ni el puntaje ni las métricas agregadas del log son el veredicto (ADR-008);
// - una muestra con error, sin puntaje, «N» o NaN no evaluó nada; el crédito parcial cuenta como no resistido y se avisa;
// - la constante NaN que Inspect escribe en el log no rompe la lectura;
// - la entrada, la meta, la salida, la explicación del juez, el modelo y las rutas jamás salen (reglas 3 y 4);
// - un log que no es de Inspect, sin versión, sin éxito o sin muestras no arma lote.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Selector } from "../../../src/engine/adaptadores/interfaz.ts";
import { ADAPTADOR_DE_INSPECT } from "../../../src/engine/adaptadores/inspect.ts";
import { adaptadorDe } from "../../../src/engine/adaptadores/index.ts";
import { RAIZ } from "../evidencia/ayuda.ts";

const FIXTURE = readFileSync(
  path.join(RAIZ, "tests/fixtures/adaptadores/inspect-0.3.288.sintetico.json"),
  "utf8",
);
const TAREA = "inspect_evals/agentdojo";

const modulo = (referencia: string): Selector => ({
  tipo: "modulo",
  referencia,
});
const leer = (t: string, minima: string | null = "0.3.276") =>
  ADAPTADOR_DE_INSPECT.leer(t, minima);
function corrida(t: string, minima: string | null = "0.3.276") {
  const l = leer(t, minima);
  if (!l.ok) throw new Error(`${l.motivo}: ${l.detalle}`);
  return l.corrida;
}
const motivo = (t: string, minima: string | null = "0.3.276") => {
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
const conValor = (valor: unknown) =>
  cambiado((r) => {
    r.samples = [{ id: 1, epoch: 1, scores: { match: { value: valor } } }];
  });

describe("el adaptador de Inspect", () => {
  it("está en el registro por su herramienta", () => {
    expect(adaptadorDe("inspect")).toBe(ADAPTADOR_DE_INSPECT);
  });

  it("lee la corrida: versión de Inspect (no la del formato del log), fecha, hora y zona", () => {
    const c = corrida(FIXTURE);
    expect(c.herramienta).toEqual({ id: "inspect", version: "0.3.288" });
    expect([c.fecha, c.hora, c.zonaHoraria]).toEqual([
      "2026-10-12",
      "12:00",
      "UTC",
    ]);
    expect(c.advertencias).toEqual([]);
  });

  it("cuenta las muestras de la tarea: 5 evaluadas (C, C, I, C, P) y 2 no resistidas; N y error no cuentan", () => {
    const m = medido(FIXTURE, TAREA);
    expect(m.resultado).toEqual({
      ejecutada: true,
      evaluadas: 5,
      fallidas: 2,
      alertas: null,
      metrica: null,
    });
    expect(m.extracto).toBe(
      `Inspect · ${TAREA} · 5 muestras evaluadas · 2 no resistidas · 2 sin evaluar`,
    );
    const a = m.advertencias.map((x) => x.es).join(" ");
    expect(a).toContain("2 muestra(s) con error");
    expect(a).toContain("crédito parcial");
  });

  it("el selector también se encuentra por el nombre corto de la tarea", () => {
    expect(medido(FIXTURE, "agentdojo").resultado.evaluadas).toBe(5);
  });

  it("la tarea de otro selector no se mide: el sobre es `no_ejecutada`, jamás superada", () => {
    const m = medido(FIXTURE, "inspect_evals/otra");
    expect(m.resultado.ejecutada).toBe(false);
    expect(m.advertencias[0]?.es).toContain("no se puede decir");
  });

  it("si ninguna muestra quedó evaluada el sobre es `no_ejecutada`", () => {
    const t = cambiado((r) => {
      r.samples = r.samples.filter(
        (s: Json) => s.error !== null || s.scores.match.value === "N",
      );
    });
    const m = medido(t, TAREA);
    expect(m.resultado.ejecutada).toBe(false);
    expect(m.advertencias[0]?.es).toContain("Ninguna muestra");
  });

  it("un selector de otra herramienta no es de este adaptador", () => {
    expect(
      corrida(FIXTURE).medir({
        tipo: "zap",
        pluginids: [1],
        agregacion: "cualquier_regla",
      }).tipo,
    ).toBe("no_aplica");
  });
});

describe("cómo se lee un valor de puntaje", () => {
  const cuenta = (v: unknown) => medido(conValor(v), TAREA).resultado;
  it("«C», true, 1 y «yes» resisten; «I», false, 0 y «no» fallan", () => {
    for (const v of ["C", true, 1, "yes"])
      expect(cuenta(v), String(v)).toMatchObject({ evaluadas: 1, fallidas: 0 });
    for (const v of ["I", false, 0, "no"])
      expect(cuenta(v), String(v)).toMatchObject({ evaluadas: 1, fallidas: 1 });
  });
  it("«P» y un número entre 0 y 1 son parciales: cuentan como no resistidos", () => {
    for (const v of ["P", 0.5])
      expect(cuenta(v), String(v)).toMatchObject({ evaluadas: 1, fallidas: 1 });
  });
  it("«N», null, un mapa y una lista no se interpretan: no se evaluó", () => {
    for (const v of ["N", null, { a: 1 }, [1, 2]])
      expect(cuenta(v), JSON.stringify(v)).toMatchObject({ ejecutada: false });
  });
  it("una muestra con varios puntajes falla si alguno falla", () => {
    const t = cambiado((r) => {
      r.samples = [
        {
          id: 1,
          epoch: 1,
          scores: { a: { value: "C" }, b: { value: "I" } },
        },
      ];
    });
    expect(medido(t, TAREA).resultado).toMatchObject({
      evaluadas: 1,
      fallidas: 1,
    });
  });
  it("la constante NaN del «sin puntuar» se lee sin romper, y esa muestra no se evalúa", () => {
    const t = FIXTURE.replace('"value": "N"', '"value": NaN');
    expect(t).toContain("NaN");
    expect(() => JSON.parse(t)).toThrow();
    expect(medido(t, TAREA).resultado).toMatchObject({
      evaluadas: 5,
      fallidas: 2,
    });
  });
  it("un NaN dentro de una cadena no se toca", () => {
    const t = FIXTURE.replace("meta-MARCADOR", "NaN y Infinity MARCADOR");
    expect(medido(t, TAREA).resultado.evaluadas).toBe(5);
  });
});

describe("la herramienta no decide", () => {
  it("las métricas agregadas del log no se leen: cambiar `accuracy` no cambia la cuenta", () => {
    const t = cambiado((r) => {
      r.results.scores[0].metrics.accuracy.value = 1;
    });
    expect(medido(t, TAREA).resultado).toEqual(
      medido(FIXTURE, TAREA).resultado,
    );
  });

  it("lo que entrega son conteos, nunca un veredicto", () => {
    const m = medido(FIXTURE, TAREA);
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
});

describe("el material sensible no sale", () => {
  it("ningún marcador de la entrada, la meta, la salida, el juez, el modelo ni las rutas llega a una medida", () => {
    const c = corrida(FIXTURE);
    const todo = JSON.stringify([
      c,
      c.medir(modulo(TAREA)),
      c.medir(modulo("otra")),
    ]);
    expect(FIXTURE).toContain("MARCADOR-NO-DEBE-PASAR");
    expect(todo).not.toContain("MARCADOR");
  });
});

describe("lo que no arma lote", () => {
  it("el texto que no es JSON", () => {
    expect(motivo("no soy json")).toBe("no_es_el_formato");
  });
  it("un JSON que no es de Inspect", () => {
    expect(motivo('{"hola": 1}')).toBe("no_es_el_formato");
  });
  it("un log sin la versión de la herramienta (la `version: 2` es la del formato, no sirve)", () => {
    expect(
      motivo(
        cambiado((r) => {
          r.eval.packages = {};
        }),
      ),
    ).toBe("campo_ausente");
  });
  it("una versión menor que la mínima del plan, o que no se puede comparar", () => {
    expect(motivo(FIXTURE, "0.4.0")).toBe("version_menor_que_la_minima");
    const rara = cambiado((r) => {
      r.eval.packages.inspect_ai = "dev";
    });
    expect(motivo(rara, null)).toBe("ok");
    expect(motivo(rara, "0.3.276")).toBe("version_no_comparable");
  });
  it("un log cancelado, con error o sin terminar trae muestras a medias: no se lee", () => {
    for (const status of ["started", "cancelled", "error"]) {
      const l = leer(
        cambiado((r) => {
          r.status = status;
        }),
      );
      expect(l.ok, status).toBe(false);
      if (!l.ok) expect(l.motivo).toBe("sin_resultados");
    }
  });
  it("un log solo con encabezado, sin muestras", () => {
    expect(
      motivo(
        cambiado((r) => {
          r.samples = null;
        }),
      ),
    ).toBe("sin_resultados");
  });
});

describe("las advertencias de la corrida", () => {
  it("un log recortado, una versión fuera del rango y una fecha ausente se avisan", () => {
    const t = cambiado((r) => {
      r.results.completed_samples = 99;
      r.eval.packages.inspect_ai = "0.4.0";
      delete r.eval.created;
    });
    const a = corrida(t, null).advertencias.map((x) => x.es);
    expect(a.join(" ")).toContain("99 muestras completadas");
    expect(a.join(" ")).toContain("fuera del rango probado");
    expect(a.join(" ")).toContain("fecha legible");
    expect(corrida(t, null).fecha).toBeNull();
  });
});
