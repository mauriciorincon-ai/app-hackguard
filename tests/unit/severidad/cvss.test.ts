// @vitest-environment node
// CVSS 4.0 (regla dura 7): el puntaje lo calcula el código de FIRST fijado; el validador estricto va antes y rechaza
// lo que la calculadora de FIRST acepta sin ser un vector (truncados, desordenados). El corpus de cada PR: los 59
// ejemplos publicados por first.org, 500 vectores sembrados contra los puntajes de FIRST, 14 carnadas y 3 límites.
import { describe, expect, it } from "vitest";
import {
  REFERENCIA_DE_CVSS,
  motivoDeVectorInvalido,
  nivelDeCvss,
  puntuarCvss,
} from "../../../src/engine/severidad/cvss.ts";
import {
  METRICAS_BASE,
  METRICAS_DE_CVSS,
  METRICAS_OPCIONALES,
  MOTIVOS_DE_VECTOR_INVALIDO,
  validarVector,
} from "../../../src/engine/severidad/validar-vector.ts";
import { expectedMetricOrder } from "../../../src/engine/severidad/vendor/first.generated.js";
import carnadas from "../../fixtures/cvss/carnadas.json";
import ejemplos from "../../fixtures/cvss/first-ejemplos.json";
import oraculo from "../../fixtures/cvss/puntajes-sembrados-500.json";
import sembrados from "../../fixtures/cvss/vectores-sembrados-500.json";

const BASE = "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N";

/** Reordena un vector al orden de la Tabla 23: para los dos ejemplos que first.org publicó fuera de orden. */
function reordenado(vector: string): string {
  const [prefijo, ...partes] = vector.split("/");
  const orden = METRICAS_DE_CVSS.map(([k]) => k);
  const clave = (p: string) => orden.indexOf(p.split(":")[0]);
  return [prefijo, ...partes.slice().sort((a, b) => clave(a) - clave(b))].join("/");
}

describe("la tabla del validador es la de FIRST", () => {
  it("coincide con expectedMetricOrder clave a clave, valor a valor y en el mismo orden", () => {
    expect(METRICAS_DE_CVSS.map(([k, v]) => [k, [...v]])).toEqual(
      Object.entries(expectedMetricOrder).map(([k, v]) => [k, [...v]]),
    );
  });
  it("tiene 11 métricas base sin «X» y 21 opcionales con «X»", () => {
    expect(METRICAS_BASE).toHaveLength(11);
    expect(METRICAS_OPCIONALES).toHaveLength(21);
    for (const [k, valores] of METRICAS_BASE) expect(valores, k).not.toContain("X");
    for (const [k, valores] of METRICAS_OPCIONALES) expect(valores[0], k).toBe("X");
  });
  it("la referencia fijada es el commit de la ficha del vendor", async () => {
    const { default: ficha } = await import(
      "../../../src/engine/severidad/vendor/first-c5b0d40/VENDOR.json"
    );
    expect(ficha.commit.startsWith(REFERENCIA_DE_CVSS.split("@")[1])).toBe(true);
    expect(REFERENCIA_DE_CVSS).toBe("FIRSTdotorg/cvss-v4-calculator@c5b0d40");
  });
});

describe("los 59 ejemplos de first.org", () => {
  const publicados = ejemplos.pares;
  const enOrden = publicados.filter((p) => validarVector(p.vector).ok);
  const fueraDeOrden = publicados.filter((p) => !validarVector(p.vector).ok);

  it("son 59 pares, 57 en orden y 2 publicados fuera de orden", () => {
    expect(publicados).toHaveLength(59);
    expect(enOrden).toHaveLength(57);
    expect(fueraDeOrden).toHaveLength(2);
  });
  it("los 57 en orden dan el puntaje publicado", () => {
    for (const p of enOrden) {
      const r = puntuarCvss(p.vector);
      expect(r.ok && r.puntaje, `${p.ejemplo} ${p.vector}`).toBe(p.puntaje_publicado);
    }
  });
  it("los 2 fuera de orden se rechazan tal cual, por orden, y reordenados dan 7.4 y 8.7", () => {
    expect(fueraDeOrden.map((p) => p.puntaje_publicado).sort()).toEqual([7.4, 8.7]);
    for (const p of fueraDeOrden) {
      const r = puntuarCvss(p.vector);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.motivo).toBe("fuera_de_orden");
      const bien = puntuarCvss(reordenado(p.vector));
      expect(bien.ok && bien.puntaje).toBe(p.puntaje_publicado);
    }
  });
});

describe("500 vectores sembrados contra los puntajes de FIRST", () => {
  it("el oráculo es de 500 puntajes del mismo lote", () => {
    expect(sembrados.vectores).toHaveLength(500);
    expect(oraculo.puntajes).toHaveLength(500);
    expect(oraculo.semilla).toBe(sembrados.semilla);
  });
  it("los 500 son válidos y dan el puntaje de FIRST", () => {
    sembrados.vectores.forEach((v, i) => {
      const r = puntuarCvss(v);
      expect(r.ok && r.puntaje, v).toBe(oraculo.puntajes[i]);
    });
  });
  it("el puntaje no depende del orden de las llamadas (las variables de FIRST no filtran estado)", () => {
    const alReves = sembrados.vectores.map((v, i) => [v, i] as const).reverse();
    for (const [v, i] of alReves) {
      const r = puntuarCvss(v);
      expect(r.ok && r.puntaje, v).toBe(oraculo.puntajes[i]);
    }
  });
});

describe("las carnadas y los límites", () => {
  it("son 14 carnadas y 3 límites válidos", () => {
    expect(carnadas.carnadas).toHaveLength(14);
    expect(carnadas.limite_validos).toHaveLength(3);
  });
  it.each(carnadas.carnadas)("rechaza «$caso» por $motivo", ({ vector, motivo }) => {
    const r = puntuarCvss(vector);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toBe(motivo);
    expect(motivoDeVectorInvalido(vector)).toMatch(new RegExp(`^${motivo}: `));
  });
  it.each(carnadas.limite_validos)("acepta «$caso» y da $puntaje", ({ vector, puntaje }) => {
    const r = puntuarCvss(vector);
    expect(r.ok && r.puntaje).toBe(puntaje);
    expect(motivoDeVectorInvalido(vector)).toBeNull();
  });
  it("todos los motivos que el validador conoce tienen una carnada que lo prueba o un caso propio", () => {
    const cubiertos = new Set(carnadas.carnadas.map((c) => c.motivo));
    // «sin_valor» no tiene carnada del spike: se prueba abajo.
    expect(MOTIVOS_DE_VECTOR_INVALIDO.filter((m) => !cubiertos.has(m))).toEqual(["sin_valor"]);
  });
});

describe("el validador estricto", () => {
  it("un vector completo entra con sus 32 métricas, «X» donde no se define", () => {
    const v = validarVector(BASE);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(Object.keys(v.seleccion)).toEqual(METRICAS_DE_CVSS.map(([k]) => k));
    expect(v.seleccion.AV).toBe("N");
    expect(v.seleccion.E).toBe("X");
    expect(v.presentes).toHaveLength(11);
    expect(v.presentes[0]).toEqual({ clave: "AV", valor: "N" });
  });
  it("rechaza lo vacío, lo con espacios y lo sin barra tras el prefijo", () => {
    for (const v of ["", "CVSS:4.0", " CVSS:4.0/AV:N", `${BASE} `, `${BASE}/ E:A`])
      expect(validarVector(v).ok, JSON.stringify(v)).toBe(false);
    const sinBarra = validarVector("CVSS:4.0");
    expect(!sinBarra.ok && sinBarra.motivo).toBe("prefijo");
    const solo = validarVector("CVSS:4.0/");
    expect(!solo.ok && solo.motivo).toBe("segmento_vacio");
  });
  it("rechaza dos barras seguidas", () => {
    const r = validarVector(BASE.replace("/AC:L", "//AC:L"));
    expect(!r.ok && r.motivo).toBe("segmento_vacio");
  });
  it("rechaza un segmento sin valor, con dos puntos de más o sin dos puntos", () => {
    for (const v of [`${BASE}/E`, `${BASE}/E:`, `${BASE}/E:A:A`, BASE.replace("AV:N", "AV")]) {
      const r = validarVector(v);
      expect(!r.ok && r.motivo, v).toBe("sin_valor");
    }
  });
  it("distingue mayúsculas de minúsculas en claves y en valores", () => {
    const clave = validarVector(BASE.replace("AV:N", "av:N"));
    expect(!clave.ok && clave.motivo).toBe("metrica_desconocida");
    const valor = validarVector(`${BASE}/U:clear`);
    expect(!valor.ok && valor.motivo).toBe("valor_invalido");
    expect(validarVector(`${BASE}/U:Clear`).ok).toBe(true);
  });
  it("una métrica repetida lejos de la primera también es duplicada", () => {
    const r = validarVector(`${BASE}/E:A/CR:H/E:A`);
    expect(!r.ok && r.motivo).toBe("metrica_duplicada");
  });
  it("la base no admite «X»", () => {
    const r = validarVector(BASE.replace("SA:N", "SA:X"));
    expect(!r.ok && r.motivo).toBe("valor_invalido");
    expect(!r.ok && r.detalle).toBe("SA:X");
  });
  it("dice qué métricas base faltan", () => {
    const r = validarVector("CVSS:4.0/AV:N/AC:L");
    expect(!r.ok && r.detalle).toBe("AT, PR, UI, VC, VI, VA, SC, SI, SA");
  });
});

describe("el nivel", () => {
  it.each([
    [0, "informativo"],
    [0.1, "bajo"],
    [3.9, "bajo"],
    [4, "medio"],
    [6.9, "medio"],
    [7, "alto"],
    [8.9, "alto"],
    [9, "critico"],
    [10, "critico"],
  ] as const)("%s es %s", (puntaje, nivel) => {
    expect(nivelDeCvss(puntaje)).toBe(nivel);
  });
  it("el vector del hallazgo HZ-0009 da 5.1, medio, con sus métricas en orden", () => {
    const r = puntuarCvss("CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.puntaje).toBe(5.1);
    expect(r.nivel).toBe("medio");
    expect(r.metricas.map((m) => `${m.clave}:${m.valor}`).join("/")).toBe(
      "AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N",
    );
  });
  it("sin impacto alguno es 0.0 e informativo (la «None» de FIRST)", () => {
    const r = puntuarCvss(carnadas.limite_validos[2].vector);
    expect(r.ok && r.nivel).toBe("informativo");
  });
});
