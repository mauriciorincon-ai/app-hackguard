// @vitest-environment node
// U1 = 1,0 (plan v2, supuesto S1): una cita vale si y solo si es subcadena LITERAL del texto tras normalizar los espacios.
import { describe, expect, it } from "vitest";
import {
  cifraEnElTexto,
  citaEsLiteral,
  huellaDeTexto,
  normalizarEspacios,
  numeroEnElTexto,
  similitudDeCita,
  verificarCita,
  versionEnElTexto,
} from "../../../src/engine/propuestas/citas.ts";

const TEXTO =
  "garak v0.17.0 run 2026-10-03.\n  Summary: 20 attempts evaluated,\t3 failed.";

describe("normalizar y huellar", () => {
  it("todo tramo de espacios pasa a uno y se recortan los bordes", () => {
    expect(normalizarEspacios("  a \n\t b  c  ")).toBe("a b c");
  });
  it("dos copias que solo difieren en los espacios tienen la misma huella", async () => {
    expect(await huellaDeTexto(TEXTO)).toBe(
      await huellaDeTexto(normalizarEspacios(TEXTO)),
    );
  });
});

describe("una cita es literal o no vale", () => {
  it("la subcadena exacta vale, también con espacios distintos", () => {
    expect(citaEsLiteral("20 attempts evaluated", TEXTO)).toBe(true);
    expect(citaEsLiteral("Summary:   20\nattempts evaluated,", TEXTO)).toBe(
      true,
    );
  });
  it("no vale lo parafraseado, ni cambiar una palabra, ni un número, ni las mayúsculas", () => {
    for (const cita of [
      "20 attempts were evaluated",
      "21 attempts evaluated",
      "20 attempts EVALUATED",
      "3 passed",
      "run 2026-10-04",
    ])
      expect(citaEsLiteral(cita, TEXTO), cita).toBe(false);
  });
  it("una cita vacía no es literal de nada", () => {
    expect(citaEsLiteral("   ", TEXTO)).toBe(false);
  });
});

describe("la similitud es solo un diagnóstico", () => {
  it("es 1 solo si la cita es literal", () => {
    expect(similitudDeCita("3 failed", TEXTO)).toBe(1);
    expect(similitudDeCita("3 failed twice", TEXTO)).toBeLessThan(1);
  });
  it("nunca llega a 1 sin ser literal, aunque todos sus tramos estén en el texto", () => {
    const parecida = "failed. Summary: 20 attempts evaluated, 3";
    expect(citaEsLiteral(parecida, TEXTO)).toBe(false);
    expect(similitudDeCita(parecida, TEXTO)).toBeLessThanOrEqual(0.99);
  });
  it("es 0 para un texto que no se parece y para una cita de menos de un tramo", () => {
    expect(similitudDeCita("zzzzzzzzzzzz", TEXTO)).toBe(0);
    expect(similitudDeCita("xyz", TEXTO)).toBe(0);
  });
});

describe("el número tiene que estar en la cita", () => {
  it("un número entero propio, no dentro de otro", () => {
    expect(numeroEnElTexto(20, "20 cases, 0 failed")).toBe(true);
    expect(numeroEnElTexto(0, "20 cases, 0 failed")).toBe(true);
    expect(numeroEnElTexto(20, "year 2026")).toBe(false);
    expect(numeroEnElTexto(0, "20 cases")).toBe(false);
    expect(numeroEnElTexto(2.5, "2.5 cases")).toBe(false);
  });

  it("una cita real que no contiene el valor del campo no verifica (riesgo R5)", () => {
    expect(
      verificarCita("resultado.fallidas", "3 failed", 3, TEXTO).estado,
    ).toBe("verificada");
    // la cita existe en el texto, pero respalda otro número
    expect(
      verificarCita("resultado.fallidas", "3 failed", 7, TEXTO).estado,
    ).toBe("valor_sin_respaldo");
  });
  it("un campo que no es numérico solo exige que la cita sea literal", () => {
    expect(
      verificarCita("herramienta.version", "garak v0.17.0", "0.17.0", TEXTO)
        .estado,
    ).toBe("verificada");
    expect(
      verificarCita("fecha", "run 2026-10-09", "2026-10-09", TEXTO).estado,
    ).toBe("no_literal");
  });
});

describe("una versión está en el texto como palabra propia (RF-07.5)", () => {
  it("la encuentra cuando es una palabra suelta", () => {
    expect(
      versionEnElTexto("v2", "Revised v2 (2026-10-01): adds check C5."),
    ).toBe(true);
    expect(versionEnElTexto("2.0", "Version 2.0 released today")).toBe(true);
    expect(versionEnElTexto("1.1+", "Version 1.1+ is out")).toBe(true);
  });
  it("no la encuentra dentro de otra versión, de una palabra ni de un número", () => {
    expect(versionEnElTexto("v2", "Revised v20 of the list")).toBe(false);
    expect(versionEnElTexto("v2", "the rev2 branch")).toBe(false);
    expect(versionEnElTexto("2", "Version 2.0 released")).toBe(false);
    expect(versionEnElTexto("2.0", "Version 2.0.1 released")).toBe(false);
  });
  it("una versión vacía no está en ningún texto", () => {
    expect(versionEnElTexto("", "cualquier texto")).toBe(false);
    expect(versionEnElTexto("   ", "cualquier texto")).toBe(false);
  });
});

describe("la métrica, la fecha y la versión tienen que estar en su cita (auditoría S8)", () => {
  const texto =
    "garak LLM vulnerability scanner v0.17.0 run 2026-10-12. Metric: latency 0,5 s against a limit of 2 s.";
  const metrica = {
    nombre: "latencia",
    valor: 0.5,
    umbral: 2,
    sentido: "maximo",
  };
  it("una cifra decimal se encuentra con punto o con coma, y como número propio", () => {
    expect(cifraEnElTexto(0.5, "limit of 0.5 s")).toBe(true);
    expect(cifraEnElTexto(0.5, "limit of 0,5 s")).toBe(true);
    expect(cifraEnElTexto(0.5, "limit of 10.55 s")).toBe(false);
    expect(cifraEnElTexto(2, "against a limit of 2 s")).toBe(true);
  });
  it("la métrica se verifica solo si la cita trae su valor y su umbral", () => {
    const completa = "Metric: latency 0,5 s against a limit of 2 s.";
    expect(
      verificarCita("resultado.metrica", completa, metrica, texto).estado,
    ).toBe("verificada");
    const sinUmbral = "Metric: latency 0,5 s";
    expect(
      verificarCita("resultado.metrica", sinUmbral, metrica, texto).estado,
    ).toBe("valor_sin_respaldo");
  });
  it("la fecha propuesta tiene que estar en la cita tal cual (AAAA-MM-DD)", () => {
    expect(
      verificarCita("fecha", "run 2026-10-12", "2026-10-12", texto).estado,
    ).toBe("verificada");
    expect(
      verificarCita(
        "fecha",
        "garak LLM vulnerability scanner",
        "2026-10-12",
        texto,
      ).estado,
    ).toBe("valor_sin_respaldo");
  });
  it("la versión de la herramienta tiene que estar en la cita, también con prefijo v", () => {
    expect(
      verificarCita(
        "herramienta.version",
        "scanner v0.17.0 run",
        "0.17.0",
        texto,
      ).estado,
    ).toBe("verificada");
    expect(
      verificarCita(
        "herramienta.version",
        "garak LLM vulnerability scanner",
        "0.17.0",
        texto,
      ).estado,
    ).toBe("valor_sin_respaldo");
  });
});
