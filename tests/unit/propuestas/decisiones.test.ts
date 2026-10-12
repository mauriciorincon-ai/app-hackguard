// @vitest-environment node
// El libro de decisiones y lo que cada decisión provoca: la bandeja y su cuenta única, las reglas del libro, el sobre por confirmar que
// nace de aprobar (solo con valores de cita verificada), la prueba aprobada que pasa el validador del catálogo y el aviso de versión.
import { describe, expect, it } from "vitest";
import { cargarCatalogo } from "../../../src/cli/cargar.ts";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { avisosDeVersion } from "../../../src/engine/propuestas/avisos.ts";
import {
  bandeja,
  hijasDe,
  porDecidir,
  pruebaAprobada,
  senalesConDecision,
  sobreDeUnaAprobacion,
  validarDecisiones,
} from "../../../src/engine/propuestas/decisiones.ts";
import { Decision } from "../../../src/engine/propuestas/esquemas.ts";
import { copia, ctx, deId, propuestas, RAIZ } from "./ayuda.ts";

type Corte = Decision["decision"];
const decision = (
  propuesta: string,
  cual: Corte,
  extra: Partial<Decision> = {},
): Decision => ({
  formato: "hackguard/decision@1",
  propuesta,
  decision: cual,
  por: "Mauricio",
  fecha: "2026-10-12",
  ...extra,
});
const reglas = (ds: Decision[]) =>
  validarDecisiones(propuestas, ds).map((p) => p.regla);
const sobre = (id: string) => {
  const p = deId(id);
  if (p.tipo !== "sobre") throw new Error(`${id} no es un sobre`);
  return p;
};

describe("la bandeja y la cuenta de «por decidir»", () => {
  it("sin decisiones, las siete esperan", () => {
    expect(bandeja(propuestas, [])).toHaveLength(7);
    expect(porDecidir(propuestas, [])).toBe(7);
  });
  it("rechazar una baja la cuenta a seis y deja la fila como rechazada", () => {
    const ds = [decision("PROP-0033", "rechazar", { motivo: "sin fuente" })];
    expect(porDecidir(propuestas, ds)).toBe(6);
    expect(
      bandeja(propuestas, ds).find((f) => f.propuesta.id === "PROP-0033")!
        .estado,
    ).toBe("rechazada");
  });
  it("aprobar baja la cuenta y la fila queda aprobada", () => {
    const ds = [decision("PROP-0031", "aprobar")];
    expect(porDecidir(propuestas, ds)).toBe(6);
    expect(
      bandeja(propuestas, ds).find((f) => f.propuesta.id === "PROP-0031")!
        .estado,
    ).toBe("aprobada");
  });
  it("separar el texto que mezcla pruebas sube la cuenta a ocho: sale el padre, entran dos hijas", () => {
    const ds = [
      decision("PROP-0037", "separar", {
        hijas: ["PROP-0037.1", "PROP-0037.2"],
      }),
    ];
    const filas = bandeja(propuestas, ds);
    expect(filas).toHaveLength(9);
    expect(porDecidir(propuestas, ds)).toBe(8);
    expect(filas.find((f) => f.propuesta.id === "PROP-0037")!.estado).toBe(
      "separada",
    );
    expect(
      filas
        .filter((f) => f.propuesta.id.startsWith("PROP-0037."))
        .map((f) => f.estado),
    ).toEqual(["por_decidir", "por_decidir"]);
  });
  it("decidir una hija la saca de la cuenta", () => {
    const ds = [
      decision("PROP-0037", "separar", {
        hijas: ["PROP-0037.1", "PROP-0037.2"],
      }),
      decision("PROP-0037.1", "aprobar"),
    ];
    expect(porDecidir(propuestas, ds)).toBe(7);
  });
  it("la última decisión de una propuesta es la que cuenta", () => {
    const ds = [
      decision("PROP-0031", "rechazar", { motivo: "x" }),
      decision("PROP-0031", "aprobar"),
    ];
    expect(
      bandeja(propuestas, ds).find((f) => f.propuesta.id === "PROP-0031")!
        .estado,
    ).toBe("aprobada");
  });
});

describe("las hijas de un texto que mezcla pruebas", () => {
  const hijas = hijasDe(sobre("PROP-0037"));
  it("nace una por candidata, con su propio identificador y su propio veredicto", () => {
    expect(hijas.map((h) => h.id)).toEqual(["PROP-0037.1", "PROP-0037.2"]);
    expect(
      hijas.map((h) => {
        if (h.tipo !== "sobre") throw new Error();
        return h.candidatas[0]!.veredicto_sugerido?.veredicto;
      }),
    ).toEqual(["superada", "fallida"]);
  });
  it("cada hija es una asociación a una sola prueba y no hereda la pausa de elegir", () => {
    for (const h of hijas) {
      if (h.tipo !== "sobre") throw new Error();
      expect(h.asociacion).toBe("una");
      expect(h.pausa?.motivos.map((m) => m.motivo) ?? []).not.toContain(
        "asociacion_a_elegir",
      );
    }
  });
  it("un texto que no mezcla no se separa", () => {
    expect(hijasDe(sobre("PROP-0036"))).toEqual([]);
  });
});

describe("las reglas del libro", () => {
  it("un libro vacío y uno coherente no traen problemas", () => {
    expect(validarDecisiones(propuestas, [])).toEqual([]);
    expect(
      validarDecisiones(propuestas, [
        decision("PROP-0031", "aprobar"),
        decision("PROP-0033", "rechazar", { motivo: "sin fuente" }),
      ]),
    ).toEqual([]);
  });
  it("una propuesta que no existe", () => {
    expect(reglas([decision("PROP-9999", "aprobar")])).toEqual([
      "decision/propuesta-desconocida",
    ]);
  });
  it("una propuesta decidida dos veces", () => {
    expect(
      reglas([
        decision("PROP-0031", "aprobar"),
        decision("PROP-0031", "aprobar"),
      ]),
    ).toContain("decision/repetida");
  });
  it("rechazar exige un motivo", () => {
    expect(reglas([decision("PROP-0031", "rechazar")])).toContain(
      "decision/rechazo-sin-motivo",
    );
    expect(
      reglas([decision("PROP-0031", "rechazar", { motivo: "   " })]),
    ).toContain("decision/rechazo-sin-motivo");
  });
  it("una propuesta marcada por el filtro no se aprueba a secas: se aprueba tras revisar", () => {
    expect(reglas([decision("PROP-0034", "aprobar")])).toContain(
      "decision/marcada-sin-revision",
    );
    expect(reglas([decision("PROP-0034", "aprobar_tras_revisar")])).toEqual([]);
  });
  it("un texto que mezcla pruebas no se aprueba sin separar", () => {
    expect(reglas([decision("PROP-0037", "aprobar")])).toContain(
      "decision/mezcla-sin-separar",
    );
  });
  it("solo se separa lo que mezcla, y con sus hijas en orden", () => {
    expect(reglas([decision("PROP-0031", "separar")])).toContain(
      "decision/separar-no-aplica",
    );
    expect(
      reglas([decision("PROP-0037", "separar", { hijas: ["PROP-0037.2"] })]),
    ).toContain("decision/hijas-no-coinciden");
    expect(
      reglas([
        decision("PROP-0037", "separar", {
          hijas: ["PROP-0037.2", "PROP-0037.1"],
        }),
      ]),
    ).toContain("decision/hijas-no-coinciden");
  });
  it("con alternativas la persona elige una de las candidatas", () => {
    expect(reglas([decision("PROP-0036", "aprobar")])).toContain(
      "decision/alternativa-sin-elegir",
    );
    expect(
      reglas([decision("PROP-0036", "aprobar", { prueba: "PR-AG-PERM-001" })]),
    ).toContain("decision/prueba-no-es-candidata");
    expect(
      reglas([decision("PROP-0036", "aprobar", { prueba: "PR-IA-ENC-002" })]),
    ).toEqual([]);
  });
  it("una hija se puede decidir; el libro la conoce", () => {
    expect(
      reglas([
        decision("PROP-0037", "separar", {
          hijas: ["PROP-0037.1", "PROP-0037.2"],
        }),
        decision("PROP-0037.1", "aprobar"),
      ]),
    ).toEqual([]);
  });
});

describe("la decisión es lo único que mueve «veredicto_corregido_por_persona»", () => {
  const base = deId("PROP-0036").senales;
  it("sin decisión sigue en null", () => {
    expect(
      senalesConDecision(base, null).veredicto_corregido_por_persona,
    ).toBeNull();
  });
  it("con decisión pasa a falso, o a verdadero si la persona corrigió el veredicto", () => {
    expect(
      senalesConDecision(base, decision("PROP-0036", "aprobar"))
        .veredicto_corregido_por_persona,
    ).toBe(false);
    expect(
      senalesConDecision(
        base,
        decision("PROP-0036", "aprobar", {
          veredicto_corregido_por_persona: true,
        }),
      ).veredicto_corregido_por_persona,
    ).toBe(true);
  });
});

describe("aprobar un sobre crea un sobre por confirmar, no una confirmación", () => {
  const p = sobre("PROP-0036");
  const d = { por: "Mauricio", prueba: "PR-IA-PINJ-001" } as const;
  it("lleva solo los valores con cita verificada, la advertencia de origen y a quien aprobó", () => {
    const r = sobreDeUnaAprobacion(p, d, {}, ctx.pruebas);
    if (!r.ok) throw new Error(r.motivo);
    expect(r.entrada.prueba).toBe("PR-IA-PINJ-001");
    expect(r.entrada.resultado.evaluadas).toBe(20);
    expect(r.entrada.resultado.fallidas).toBe(3);
    expect(r.entrada.extracto_redactado).toBe(p.texto.extracto);
    expect(r.entrada.advertencias![0]!.es).toContain("PROP-0036");
    expect(r.entrada.advertencias![0]!.es).toContain(
      p.texto.huella.slice(0, 12),
    );
    expect(r.entrada.ejecutado_por).toBe("Mauricio");
    expect(r.veredicto_resultante).toBe("fallida");
    expect(r.veredicto_sugerido).toBe("fallida");
    expect(r.corregido).toBe(false);
  });
  it("la persona que corrige un conteo deja la corrección dicha y el veredicto recalculado por la regla", () => {
    const r = sobreDeUnaAprobacion(p, d, { fallidas: 0 }, ctx.pruebas);
    if (!r.ok) throw new Error(r.motivo);
    expect(r.entrada.resultado.fallidas).toBe(0);
    expect(r.veredicto_resultante).toBe("superada");
    expect(r.corregido).toBe(true);
    expect(r.entrada.advertencias!.map((a) => a.es).join(" ")).toContain(
      "corrigió a mano",
    );
  });
  it("sin conteo verificado y sin corrección no hay sobre", () => {
    const sinCitas = copia(p);
    for (const c of sinCitas.candidatas)
      c.verificacion.citas = c.verificacion.citas.map((x) => ({
        ...x,
        estado: "no_literal" as const,
      }));
    expect(sobreDeUnaAprobacion(sinCitas, d, {}, ctx.pruebas)).toEqual({
      ok: false,
      motivo: "sin_conteos_verificados",
    });
  });
  it("con la corrección de la persona, ese mismo sobre sí nace, y lo dice", () => {
    const sinCitas = copia(p);
    for (const c of sinCitas.candidatas)
      c.verificacion.citas = c.verificacion.citas.map((x) => ({
        ...x,
        estado: "no_literal" as const,
      }));
    const r = sobreDeUnaAprobacion(
      sinCitas,
      d,
      { evaluadas: 20, fallidas: 3 },
      ctx.pruebas,
    );
    expect(r.ok).toBe(true);
  });
  it("sin la candidata elegida no hay sobre", () => {
    expect(
      sobreDeUnaAprobacion(
        p,
        { por: "x", prueba: "PR-AG-PERM-001" },
        {},
        ctx.pruebas,
      ),
    ).toEqual({ ok: false, motivo: "sin_candidata" });
  });
  it("una prueba sin regla en el catálogo no recibe veredicto", () => {
    expect(sobreDeUnaAprobacion(p, d, {}, new Map())).toEqual({
      ok: false,
      motivo: "sin_veredicto",
    });
  });
});

describe("aprobar una prueba nueva la deja aprobada y válida para el catálogo", () => {
  const catalogo = cargarCatalogo(RAIZ);
  const nueva = (id: string) => {
    const p = deId(id);
    if (p.tipo !== "prueba_nueva") throw new Error(`${id} no es una prueba`);
    return p;
  };
  const errores = async (id: string, cual: Corte) => {
    const prueba = await pruebaAprobada(nueva(id), {
      decision: cual,
      por: "Mauricio",
      fecha: "2026-10-12",
    });
    const ruta = `datos/pruebas/${prueba.familia}/${prueba.id}.json`;
    const r = await validarCatalogo({
      ...catalogo,
      pruebas: [
        ...catalogo.pruebas.filter((a) => a.ruta !== ruta),
        { ruta, texto: `${JSON.stringify(prueba, null, 2)}\n` },
      ],
    });
    return {
      prueba,
      errores: r.hallazgos.filter((h) => h.severidad === "error"),
    };
  };
  it("PROP-0031 y PROP-0033 limpias: aprobadas, sin errores del validador", async () => {
    for (const id of ["PROP-0031", "PROP-0033"]) {
      const r = await errores(id, "aprobar");
      expect(r.prueba.estado_aprobacion, id).toBe("aprobada");
      expect(r.prueba.revision_contenido, id).toBe("limpia");
      expect(r.errores, id).toEqual([]);
    }
  });
  it("PROP-0034, marcada por el filtro: aprobada tras revisar, con la revisión y su huella", async () => {
    const r = await errores("PROP-0034", "aprobar_tras_revisar");
    expect(r.prueba.revision_contenido).toBe("revisada_y_aprobada");
    expect(r.prueba.revision?.por).toBe("Mauricio");
    expect(r.prueba.revision?.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(r.errores).toEqual([]);
  });
  it("lo que aprobó una persona no cambia lo que propuso el investigador", async () => {
    const p = nueva("PROP-0031");
    const aprobada = await pruebaAprobada(p, {
      decision: "aprobar",
      por: "M",
      fecha: "2026-10-12",
    });
    expect({
      ...aprobada,
      estado_aprobacion: "propuesta",
      revision_contenido: p.prueba.revision_contenido,
    }).toEqual(p.prueba);
  });
});

describe("el aviso de versión sale de la propuesta, no de una comparación a ciegas", () => {
  it("PROP-0032 avisa que el marco publicó v2 y que sus dos fuentes se verificaron", () => {
    const avisos = avisosDeVersion(propuestas, ctx.marcos);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      marco: "lista-decision-14",
      vigente: "v1",
      publicada: "v2",
      propuesta: "PROP-0032",
      fuentes: 2,
      fuentes_verificadas: 2,
    });
  });
  it("una propuesta rechazada ya no avisa", () => {
    expect(
      avisosDeVersion(propuestas, ctx.marcos, new Set(["PROP-0032"])),
    ).toEqual([]);
  });
  it("el aviso se apaga solo cuando el catálogo ya tiene esa versión", () => {
    const marcos = new Map(ctx.marcos);
    marcos.set("lista-decision-14", {
      ...marcos.get("lista-decision-14")!,
      version_vigente: "v2",
    });
    expect(avisosDeVersion(propuestas, marcos)).toEqual([]);
  });
});
