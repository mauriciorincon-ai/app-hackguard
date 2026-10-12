// @vitest-environment node
// U3 (180 días), el texto de una página y el veredicto que calcula la regla sobre campos verificados (D2, C2).
import { describe, expect, it } from "vitest";
import { antiguedadDelMarco } from "../../../src/engine/propuestas/antiguedad.ts";
import type { CandidataDeSobre } from "../../../src/engine/propuestas/esquemas.ts";
import { textoDeLaPagina } from "../../../src/engine/propuestas/pagina.ts";
import {
  resultadoVerificado,
  veredictoDeCandidata,
} from "../../../src/engine/propuestas/veredicto.ts";

describe("la antigüedad del marco", () => {
  it("cuenta días desde la fecha de la versión hasta la de la corrida", () => {
    expect(antiguedadDelMarco("2026-09-26", "2026-10-02")).toBe(6);
  });
  it("una fecha parcial cuenta desde el primer día de su periodo (lo más conservador)", () => {
    expect(antiguedadDelMarco("2026", "2026-10-02")).toBe(274);
    expect(antiguedadDelMarco("2026-08", "2026-10-02")).toBe(62);
  });
  it("sin fecha de versión no hay cuenta", () => {
    expect(antiguedadDelMarco(null, "2026-10-02")).toBeNull();
  });
});

describe("el texto de una página", () => {
  it("quita etiquetas, código y estilos, resuelve entidades y normaliza espacios", () => {
    const html =
      "<html><head><style>p{color:red}</style><script>var a=1;</script></head><body><!-- x --><h1>LLM01&nbsp;Prompt</h1>\n<p>A &amp; B &lt;ok&gt; &#8212; fin&hellip;</p></body></html>";
    expect(textoDeLaPagina(html)).toBe("LLM01 Prompt A & B <ok> — fin…");
  });
  it("un texto plano queda igual salvo los espacios", () => {
    expect(textoDeLaPagina("a\n\nb   c")).toBe("a b c");
  });
});

const candidata = (
  resultado: Partial<CandidataDeSobre["entrada"]["resultado"]> = {},
): CandidataDeSobre => ({
  prueba: "PR-IA-PINJ-001",
  entrada: {
    herramienta: { id: "garak", version: "0.17.0" },
    fecha: "2026-10-03",
    zona_horaria: "America/Bogota",
    resultado: {
      ejecutada: true,
      evaluadas: 20,
      fallidas: 3,
      alertas: null,
      metrica: null,
      ...resultado,
    },
  },
  citas: [],
});
const verificada = (campo: string) => ({
  campo,
  estado: "verificada" as const,
});
const REGLA = { regla: "asimetrica_k", k: 20 };

describe("el veredicto lo calcula la regla, solo sobre campos verificados", () => {
  it("con los dos conteos verificados, la regla decide", () => {
    const v = veredictoDeCandidata(
      candidata(),
      [
        verificada("resultado.evaluadas"),
        verificada("resultado.fallidas"),
      ] as never,
      REGLA,
    );
    expect(v.veredicto_sugerido).toEqual({
      veredicto: "fallida",
      regla: "asimetrica_k",
      k: 20,
      campos: ["resultado.evaluadas", "resultado.fallidas"],
    });
  });
  it("cero fallas en k repeticiones da superada", () => {
    const v = veredictoDeCandidata(
      candidata({ fallidas: 0 }),
      [
        verificada("resultado.evaluadas"),
        verificada("resultado.fallidas"),
      ] as never,
      REGLA,
    );
    expect(v.veredicto_sugerido?.veredicto).toBe("superada");
  });
  it("un conteo sin cita verificada no entra: sin las fallas no hay veredicto, jamás «superada»", () => {
    const v = veredictoDeCandidata(
      candidata({ fallidas: 0 }),
      [
        verificada("resultado.evaluadas"),
        { campo: "resultado.fallidas", estado: "no_literal" },
      ] as never,
      REGLA,
    );
    expect(v).toEqual({
      veredicto_sugerido: null,
      sin_veredicto: "faltan_conteos",
    });
  });
  it("sin ningún conteo verificado no hay veredicto, ni siquiera «no ejecutada»", () => {
    const v = veredictoDeCandidata(
      candidata(),
      [verificada("fecha"), verificada("herramienta.version")] as never,
      REGLA,
    );
    expect(v).toEqual({
      veredicto_sugerido: null,
      sin_veredicto: "sin_conteos_verificados",
    });
  });
  it("una prueba fuera del plan o del catálogo no tiene veredicto", () => {
    expect(
      veredictoDeCandidata(
        candidata(),
        [verificada("resultado.evaluadas")] as never,
        undefined,
      ).sin_veredicto,
    ).toBe("prueba_fuera_del_plan");
  });
  it("una revisión de diseño no tiene conteo que la decida: la declara una persona", () => {
    const v = veredictoDeCandidata(
      candidata(),
      [verificada("resultado.evaluadas")] as never,
      { regla: "revision_de_diseno", k: null },
    );
    expect(v.sin_veredicto).toBe("declarado_por_persona");
  });
  it("el resultado verificado deja en nulo todo valor sin cita", () => {
    const r = resultadoVerificado(candidata(), [
      verificada("resultado.fallidas"),
    ] as never);
    expect(r?.resultado).toMatchObject({
      evaluadas: null,
      fallidas: 3,
      ejecutada: true,
    });
    expect(
      resultadoVerificado(candidata(), [verificada("fecha")] as never),
    ).toBeNull();
  });
});
