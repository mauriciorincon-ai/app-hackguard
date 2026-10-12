// @vitest-environment node
// S1 y S2 del plan v2 como semillas del instrumento (C18): S1 marca exactamente las citas inventadas; S2 deja el veredicto igual con una
// instrucción sembrada. Se prueban con controles negativos (un verificador roto las pone en rojo) y de punta a punta: con el mundo de la
// brecha, el instrumento da 4 de 4 y, si una semilla falla, el build se detiene.
import { describe, expect, it } from "vitest";
import { verificarCita } from "../../../src/engine/propuestas/citas.ts";
import {
  SemillasDeAgentes,
  validarSemillasDeAgentes,
} from "../../../src/engine/propuestas/semillas.ts";
import {
  cargarPatronesDeInstrucciones,
  cargarSemillasDeAgentes,
} from "../../../src/lib/propuestas/cargar.ts";
import { armarMundoDeBrecha } from "../../../src/lib/brecha/mundo.ts";
import {
  activos,
  etiquetasDeBrecha,
  instantanea,
  mundoDeHallazgos,
  semillasDeCierre,
  umbralesDeBrecha,
} from "../lib/mundo-de-brecha";
import { nombreDeLaInstantanea } from "../lib/mundo-de-activos";
import { copia, RAIZ } from "./ayuda.ts";

const semillas = cargarSemillasDeAgentes(RAIZ);
const patrones = cargarPatronesDeInstrucciones(RAIZ);
const [s1, s2] = validarSemillasDeAgentes(semillas, patrones) as [
  ReturnType<typeof validarSemillasDeAgentes>[number],
  ReturnType<typeof validarSemillasDeAgentes>[number],
];

describe("S1 — comprobar que la cita es literal basta para detectar una inventada", () => {
  it("siembra 20 citas, 10 inventadas, y el verificador responde lo esperado en las 20", () => {
    expect(s1.requisito).toBe("S1");
    expect(s1.sembradas).toBe(20);
    expect(s1.obtenidas).toBe(20);
    expect(s1.semillas.every((x) => x.pasa)).toBe(true);
  });
  it("marca exactamente las 10 inventadas y deja pasar las 10 literales", () => {
    const { texto, citas } = semillas.s1;
    const marcadas = citas.filter(
      (c) =>
        verificarCita("fecha", c.cita, undefined, texto).estado !==
        "verificada",
    );
    expect(marcadas).toHaveLength(10);
    expect(marcadas.every((c) => !c.es_literal)).toBe(true);
  });
  it("las inventadas incluyen cambios de una sola palabra o cifra, no solo frases ajenas", () => {
    const { texto, citas } = semillas.s1;
    const casiLiterales = citas.filter(
      (c) =>
        !c.es_literal &&
        verificarCita("fecha", c.cita, undefined, texto).similitud > 0.5,
    );
    expect(casiLiterales.length).toBeGreaterThanOrEqual(3);
  });
  it("control negativo: si se invierte lo esperado de una sola cita, la semilla se pone en rojo y dice cuál", () => {
    const rota = copia(semillas);
    rota.s1.citas[0]!.es_literal = false;
    const [c] = validarSemillasDeAgentes(rota, patrones);
    expect(c!.obtenidas).toBe(19);
    const roja = c!.semillas.find((x) => !x.pasa)!;
    expect(roja.id).toBe(rota.s1.citas[0]!.id);
    expect(roja.diferencias[0]).toContain("inventada se dio por verificada");
  });
  it("control negativo: una cita literal que quedara sin verificar también se nombra", () => {
    const rota = copia(semillas);
    const i = rota.s1.citas.findIndex((c) => !c.es_literal);
    rota.s1.citas[i]!.es_literal = true;
    const [c] = validarSemillasDeAgentes(rota, patrones);
    expect(c!.semillas.find((x) => !x.pasa)!.diferencias[0]).toContain(
      "literal quedó sin verificar",
    );
  });
});

describe("S2 — una instrucción sembrada en el texto no cambia el veredicto", () => {
  it("los 3 casos pasan: instrucción marcada, texto limpio sin marca, mismo veredicto, salida secuestrada sin veredicto", () => {
    expect(s2.requisito).toBe("S2");
    expect(s2.sembradas).toBe(3);
    expect(s2.obtenidas).toBe(3);
  });
  it("control negativo: sin los patrones de instrucciones, la instrucción sembrada queda sin marcar y el caso se pone en rojo", () => {
    const [, sin] = validarSemillasDeAgentes(semillas, []);
    expect(sin!.obtenidas).toBe(0);
    expect(sin!.semillas[0]!.diferencias).toContain(
      "la instrucción sembrada no quedó marcada",
    );
  });
  it("control negativo: si el texto con instrucción dejara de respaldar las citas, el veredicto cambia y se nombra", () => {
    const rota = copia(semillas);
    const caso = rota.s2.casos[0]!;
    caso.texto_con_instruccion = caso.texto_con_instruccion.replaceAll(
      /\d+/g,
      "N",
    );
    const [, c] = validarSemillasDeAgentes(rota, patrones);
    const roja = c!.semillas.find((x) => x.id === caso.id)!;
    expect(roja.pasa).toBe(false);
    expect(roja.diferencias.join(" ")).toContain("cambió el veredicto");
  });
  it("control negativo: una salida secuestrada que dijera un veredicto con conteos sin cita se detecta", () => {
    const rota = copia(semillas);
    const caso = rota.s2.casos[0]!;
    // la salida «secuestrada» pasa a traer las mismas citas que la honrada: ahora SÍ tendría respaldo y daría veredicto
    caso.candidata_secuestrada = caso.candidata;
    const [, c] = validarSemillasDeAgentes(rota, patrones);
    expect(
      c!.semillas.find((x) => x.id === caso.id)!.diferencias.join(" "),
    ).toContain("salida secuestrada");
  });
});

describe("el archivo de semillas cumple su esquema", () => {
  it("un campo de más se rechaza (strictObject)", () => {
    const con = { ...copia(semillas), sobra: true };
    expect(SemillasDeAgentes.safeParse(con).success).toBe(false);
  });
  it("un identificador que no es de S1 o S2 se rechaza", () => {
    const mal = copia(semillas);
    mal.s1.citas[0]!.id = "S3-01";
    expect(SemillasDeAgentes.safeParse(mal).success).toBe(false);
  });
});

describe("el instrumento de la brecha suma S1 y S2 a los cierres y se detiene si una falla", () => {
  const entrada = (
    agentes?: Parameters<typeof armarMundoDeBrecha>[0]["agentes"],
  ) => ({
    instantanea,
    nombre: nombreDeLaInstantanea,
    consulta: instantanea.fecha_evaluacion,
    activos,
    evidencia: mundoDeHallazgos,
    umbrales: umbralesDeBrecha,
    etiquetas: etiquetasDeBrecha,
    semillas: semillasDeCierre,
    ...(agentes === undefined ? {} : { agentes }),
  });
  it("sin las semillas de los agentes quedan las 2 comprobaciones de los cierres", async () => {
    const m = await armarMundoDeBrecha(entrada());
    expect(m.instrumento.map((c) => c.requisito)).toEqual(["E-6", "RF-10.3"]);
  });
  it("con ellas son 4 de 4: cada comprobación obtuvo todo lo que sembró", async () => {
    const m = await armarMundoDeBrecha(
      entrada({ semillas, patronesDeInstrucciones: patrones }),
    );
    expect(m.instrumento.map((c) => c.requisito)).toEqual([
      "E-6",
      "RF-10.3",
      "S1",
      "S2",
    ]);
    expect(m.instrumento.every((c) => c.obtenidas === c.sembradas)).toBe(true);
    expect(
      m.instrumento
        .map((c) => c.nombre ?? null)
        .every((n) => n === null || n.es !== ""),
    ).toBe(true);
  });
  it("la huella del informe cambia cuando suman las semillas (el instrumento forma parte del informe)", async () => {
    const solo = await armarMundoDeBrecha(entrada());
    const todo = await armarMundoDeBrecha(
      entrada({ semillas, patronesDeInstrucciones: patrones }),
    );
    expect(todo.huellaDelInforme).not.toBe(solo.huellaDelInforme);
    expect(todo.brecha.huella).toBe(solo.brecha.huella);
  });
  it("si una semilla de S1 falla, el build se detiene y nombra la semilla (regla 9)", async () => {
    const rota = copia(semillas);
    rota.s1.citas[0]!.es_literal = false;
    await expect(
      armarMundoDeBrecha(
        entrada({ semillas: rota, patronesDeInstrucciones: patrones }),
      ),
    ).rejects.toThrowError(rota.s1.citas[0]!.id);
  });
  it("si una de S2 falla, también", async () => {
    await expect(
      armarMundoDeBrecha(entrada({ semillas, patronesDeInstrucciones: [] })),
    ).rejects.toThrowError("S2-");
  });
});
