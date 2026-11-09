// @vitest-environment node
// El supuesto S3 y el lote de 200 (S11): los textos son sintéticos y salen de una plantilla; el veredicto de la regla se calcula al
// comparar, jamás se guarda junto a los textos; y el comparador solo cuenta: no califica. Los textos se amarran al cálculo real del
// extractor (citas verificadas por código → veredicto de la regla), así que S3 mide el mismo camino que usará `/extraer`.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { citasDeCandidata } from "../../../src/engine/propuestas/verificar.ts";
import { veredictoDeCandidata } from "../../../src/engine/propuestas/veredicto.ts";
import {
  CASOS_S3,
  compararConPersona,
  ErrorDeHoja,
  hojaEnBlanco,
  HojaS3,
  textoDelCaso,
  veredictoDeLaRegla,
  type CasoDePegado,
} from "../../../src/engine/supuestos/s3.ts";
import { casosDelLoteDe200 } from "../../../src/engine/supuestos/lotes.ts";
import { instantanea } from "../lib/mundo-de-brecha";

const RAIZ = process.cwd();
const leerJson = (f: string) =>
  JSON.parse(readFileSync(path.join(RAIZ, f), "utf8")) as Record<
    string,
    unknown
  >;

/** La hoja de una persona que coincide con la regla en todo, salvo en los ids dados. */
const hojaCon = (distintos: readonly string[] = []) => {
  const hoja = hojaEnBlanco(
    CASOS_S3,
    "x",
    Object.fromEntries(
      CASOS_S3.map((c) => [
        c.prueba,
        { es: "se espera algo", en: "something is expected" },
      ]),
    ),
  );
  return {
    ...hoja,
    calificaciones: hoja.calificaciones.map((f) => {
      const caso = CASOS_S3.find((c) => c.id === f.id)!;
      const regla = veredictoDeLaRegla(caso);
      return {
        ...f,
        tu_veredicto: distintos.includes(f.id)
          ? regla === "fallida"
            ? ("superada" as const)
            : ("fallida" as const)
          : regla,
      };
    }),
  };
};

describe("el set de 20 resultados pegados", () => {
  it("son 20, con ids R01…R20 distintos, tres reglas, dos casos de borde y los cuatro veredictos", () => {
    expect(CASOS_S3).toHaveLength(20);
    expect(CASOS_S3.map((c) => c.id)).toEqual(
      Array.from(
        { length: 20 },
        (_, i) => `R${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(new Set(CASOS_S3.map((c) => c.regla.regla)).size).toBe(3);
    expect(CASOS_S3.filter((c) => c.borde).map((c) => c.id)).toEqual([
      "R05",
      "R20",
    ]);
    const cuenta: Record<string, number> = {};
    for (const c of CASOS_S3)
      cuenta[veredictoDeLaRegla(c)] = (cuenta[veredictoDeLaRegla(c)] ?? 0) + 1;
    expect(cuenta).toEqual({
      superada: 8,
      fallida: 7,
      parcial: 3,
      no_ejecutada: 2,
    });
  });

  it("cada caso es una prueba del plan de su activo demo, con la regla, la repetición y la herramienta que dice el catálogo", () => {
    const pruebas = new Map(
      instantanea.catalogo.pruebas.map((p) => [p.id, p] as const),
    );
    for (const c of CASOS_S3) {
      const p = pruebas.get(c.prueba);
      expect(p, c.id).toBeDefined();
      expect(p!.criterio_de_veredicto.regla, c.id).toBe(c.regla.regla);
      if (c.regla.k !== null)
        expect(p!.criterio_de_veredicto.repeticiones_k, c.id).toBe(c.regla.k);
      expect(
        p!.herramientas_recomendadas.map((h) => h.herramienta),
        c.id,
      ).toContain(c.herramienta.id);
      const plan = leerJson(`datos/planes/${c.activo}.plan.json`) as {
        planeadas: { prueba: string }[];
      };
      expect(
        plan.planeadas.map((x) => x.prueba),
        `${c.id}: ${c.prueba} no está en el plan de ${c.activo}`,
      ).toContain(c.prueba);
    }
  });

  it("el texto lleva el rótulo de sintético y jamás dice el veredicto de la regla", () => {
    for (const c of CASOS_S3) {
      const t = textoDelCaso(c);
      expect(t, c.id).toContain("ninguna herramienta lo produjo");
      expect(t, c.id).not.toMatch(/superada|parcial|no_ejecutada|fallida/);
    }
  });

  it("la misma entrada da los mismos bytes", () => {
    expect(CASOS_S3.map(textoDelCaso)).toEqual(CASOS_S3.map(textoDelCaso));
  });
});

describe("el camino del extractor: las citas del texto dan el mismo veredicto que la regla", () => {
  const citasDe = (c: CasoDePegado, t: string) => {
    const r = c.resultado;
    const cuerpo = (re: RegExp) => re.exec(t)?.[0];
    const citas: { campo: string; texto: string }[] = [
      { campo: "herramienta.version", texto: c.herramienta.version },
      { campo: "fecha", texto: c.fecha },
    ];
    if (!r.ejecutada)
      citas.push({
        campo: "resultado.ejecutada",
        texto: cuerpo(
          /(interrupted before|did not start|could not be reached|did not run)[^.]*\./,
        )!,
      });
    if (r.evaluadas !== null)
      citas.push(
        {
          campo: "resultado.evaluadas",
          texto: cuerpo(/\d+ (attempts evaluated|cases)/)!,
        },
        { campo: "resultado.fallidas", texto: cuerpo(/\d+ failed/)! },
      );
    if (r.alertas !== null)
      citas.push({
        campo: "resultado.alertas",
        texto: cuerpo(/Alerts raised for [A-Z]+ checks: \d+/)!,
      });
    if (r.metrica !== null)
      citas.push({
        campo: "resultado.metrica",
        texto: cuerpo(
          /Measured[^\n]*\n[^\n]*declared before the test: [\d.]+/,
        )!,
      });
    return citas;
  };
  it.each(CASOS_S3.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const texto = textoDelCaso(c);
    const candidata = {
      prueba: c.prueba,
      entrada: {
        herramienta: c.herramienta,
        fecha: c.fecha,
        zona_horaria: "America/Bogota",
        resultado: c.resultado,
      },
      citas: citasDe(c, texto),
    } as unknown as Parameters<typeof citasDeCandidata>[0];
    const citas = citasDeCandidata(candidata, texto);
    expect(
      citas.map((x) => x.estado),
      `${c.id}: alguna cita no es literal`,
    ).toEqual(citas.map(() => "verificada"));
    const v = veredictoDeCandidata(candidata, citas, c.regla);
    expect(v.veredicto_sugerido?.veredicto).toBe(veredictoDeLaRegla(c));
  });
});

describe("el comparador solo cuenta", () => {
  it("una hoja que coincide en todo: 20 de 20, S3 probado", () => {
    const c = compararConPersona(HojaS3.parse(hojaCon()), CASOS_S3);
    expect(c).toMatchObject({ total: 20, coinciden: 20, estado: "probado" });
    expect(c.discrepancias).toEqual([]);
  });
  it("18 de 20 es exactamente el 90 %: probado; 17 de 20 es 85 %: refutado", () => {
    const dos = compararConPersona(
      HojaS3.parse(hojaCon(["R01", "R02"])),
      CASOS_S3,
    );
    expect(dos.coincidencia).toBe(0.9);
    expect(dos.estado).toBe("probado");
    const tres = compararConPersona(
      HojaS3.parse(hojaCon(["R01", "R02", "R03"])),
      CASOS_S3,
    );
    expect(tres.coincidencia).toBe(0.85);
    expect(tres.estado).toBe("refutado");
    expect(tres.discrepancias.map((d) => d.id)).toEqual(["R01", "R02", "R03"]);
  });
  it("cuenta cuántas discrepancias caen en un caso de borde", () => {
    const c = compararConPersona(
      HojaS3.parse(hojaCon(["R05", "R20", "R01"])),
      CASOS_S3,
    );
    expect(c.enElBorde).toBe(2);
    expect(c.discrepancias.find((d) => d.id === "R05")).toMatchObject({
      borde: true,
      regla: "parcial",
    });
  });
  it("una hoja incompleta, repetida, ajena o sin llenar se nombra: jamás se calcula a medias", () => {
    const hoja = hojaCon();
    const sin = (f: (h: typeof hoja) => void) => {
      const h = structuredClone(hoja);
      f(h);
      return () => compararConPersona(HojaS3.parse(h), CASOS_S3);
    };
    expect(sin((h) => h.calificaciones.pop())).toThrow(/le faltan: R20/);
    expect(
      sin((h) => h.calificaciones.push({ ...h.calificaciones[0]! })),
    ).toThrow(/repite «R01»/);
    expect(sin((h) => (h.calificaciones[0]!.id = "R99"))).toThrow(
      /no es del set/,
    );
    expect(sin((h) => (h.calificaciones[0]!.prueba = "PR-OTRA-001"))).toThrow(
      /dice la prueba/,
    );
    expect(
      sin((h) => {
        (h.calificaciones[0] as { tu_veredicto: unknown }).tu_veredicto = null;
      }),
    ).toThrow(ErrorDeHoja);
  });
  it("una prueba sin su descripción no entra a la hoja: se nombra", () => {
    expect(() => hojaEnBlanco(CASOS_S3, "x", {})).toThrow(
      /falta lo que espera/,
    );
  });
  it("la hoja en blanco del kit no trae el veredicto de la regla ni nada llenado", () => {
    const hoja = HojaS3.parse(
      leerJson("docs/kit-de-prueba/supuesto-s3/hoja-de-calificacion.json"),
    );
    expect(hoja.calificaciones).toHaveLength(20);
    expect(hoja.calificaciones.every((f) => f.tu_veredicto === null)).toBe(
      true,
    );
    expect(hoja.calificaciones.every((f) => f.que_se_espera.es !== "")).toBe(
      true,
    );
    expect(() => compararConPersona(hoja, CASOS_S3)).toThrow(
      /no tiene tu_veredicto/,
    );
  });
});

describe("el lote de 200", () => {
  const lote = casosDelLoteDe200();
  it("son 200 distintos, L001…L200, los mismos siempre, y cada uno tiene un veredicto calculable", () => {
    expect(lote).toHaveLength(200);
    expect(new Set(lote.map((c) => c.id)).size).toBe(200);
    expect(lote[0]!.id).toBe("L001");
    expect(lote[199]!.id).toBe("L200");
    expect(casosDelLoteDe200()).toEqual(lote);
    for (const c of lote)
      expect(() => veredictoDeLaRegla(c), c.id).not.toThrow();
  });
  it("cubre los cuatro veredictos y las tres reglas, y todo texto lleva el rótulo de sintético", () => {
    expect(new Set(lote.map(veredictoDeLaRegla))).toEqual(
      new Set(["superada", "fallida", "parcial", "no_ejecutada"]),
    );
    expect(new Set(lote.map((c) => c.regla.regla)).size).toBe(3);
    for (const c of lote)
      expect(textoDelCaso(c), c.id).toContain("ninguna herramienta lo produjo");
  });
});
