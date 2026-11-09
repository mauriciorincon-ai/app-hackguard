// @vitest-environment node
// La cadena de un hallazgo en texto para la terminal, probada directamente: una línea por eslabón, lo pendiente con su marca de texto
// aparte del color y la cuenta de reaperturas que da el motor (no la que adivinaría un color).
import { describe, expect, it } from "vitest";
import { informeDeCadena } from "../../../src/lib/evidencia/informe-cadena.ts";
import type {
  EslabonDeCadena,
  Etiqueta,
} from "../../../src/lib/evidencia/tipos.ts";

const etiqueta = (es: string, en: string): Etiqueta => ({
  rol: "ok",
  simbolo: "check",
  nombre: { es, en },
});
const cadena: EslabonDeCadena[] = [
  {
    etiqueta: etiqueta("Hallazgo abierto", "Finding opened"),
    pendiente: false,
    lineas: [
      { tipo: "fecha", valor: "2026-09-12" },
      { tipo: "sobre", id: "SOB-0037" },
      {
        tipo: "sobre",
        id: "SOB-0038",
        nota: { es: "la re-prueba", en: "the retest" },
      },
      { tipo: "huella", hex: "abc123" },
    ],
  },
  {
    etiqueta: etiqueta("Corregido", "Fixed"),
    pendiente: false,
    lineas: [
      {
        tipo: "texto",
        menor: false,
        texto: { es: "Se corrigió", en: "Fixed" },
      },
      {
        tipo: "firma",
        fecha: "2026-09-18",
        etiqueta: etiqueta(
          "Confirmado por una persona",
          "Confirmed by a person",
        ),
      },
      {
        tipo: "motivos",
        motivos: [
          { es: "otra versión", en: "another version" },
          { es: "k menor", en: "lower k" },
        ],
      },
    ],
  },
  {
    etiqueta: etiqueta("Cierre", "Closure"),
    pendiente: true,
    lineas: [],
  },
];

describe("informeDeCadena", () => {
  it("en español numera los eslabones, marca el pendiente y dice cada tipo de línea", () => {
    const s = informeDeCadena("HZ-0011", "reabierto", cadena, 1, "es");
    expect(s.split("\n")[0]).toBe(
      "Cadena de HZ-0011 · reabierto · 3 eslabones · reabierto 1 vez",
    );
    expect(s).toContain("1. Hallazgo abierto");
    expect(s).toContain("   2026-09-12");
    expect(s).toContain("   SOB-0037\n");
    expect(s).toContain("   SOB-0038 · la re-prueba");
    expect(s).toContain("   huella abc123");
    expect(s).toContain("   Confirmado por una persona · 2026-09-18");
    expect(s).toContain("   otra versión; k menor");
    expect(s).toContain("3. [por hacer] Cierre");
    expect(s).not.toContain("1. [por hacer]");
  });

  it("en inglés dice lo mismo, y varias reaperturas van en plural", () => {
    const s = informeDeCadena("HZ-0011", "reabierto", cadena, 2, "en");
    expect(s.split("\n")[0]).toBe(
      "Chain of HZ-0011 · reabierto · 3 links · reopened 2 times",
    );
    expect(s).toContain("   fingerprint abc123");
    expect(s).toContain("   SOB-0038 · the retest");
    expect(s).toContain("3. [to do] Closure");
    expect(informeDeCadena("HZ-0011", "x", cadena, 1, "en")).toContain(
      "reopened 1 time\n",
    );
  });

  it("sin reaperturas no dice nada de reabrir", () => {
    expect(
      informeDeCadena("HZ-0003", "cerrado", cadena, 0, "es"),
    ).not.toContain("reabierto 0");
    expect(
      informeDeCadena("HZ-0003", "cerrado", cadena, 0, "en"),
    ).not.toContain("reopened");
    expect(informeDeCadena("HZ-0011", "reabierto", cadena, 2, "es")).toContain(
      "reabierto 2 veces",
    );
  });
});
