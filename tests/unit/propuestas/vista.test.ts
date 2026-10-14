// @vitest-environment node
// La vista de la bandeja: lo que la pantalla dibuja sale del motor y de los datos, nada se recalcula. Sobre las siete propuestas demo
// selladas (y variantes con decisiones, corridas ilegibles o sin corridas) se comprueba el estado de cada una, las cifras, el carril de
// la última corrida de cada agente, las decisiones que se ofrecen y el comando que las registra.
import { describe, expect, it } from "vitest";
import {
  armarMundoDePropuestas,
  type MundoDePropuestas,
} from "../../../src/lib/propuestas/pagina.ts";
import { avisosDeMarco } from "../../../src/lib/propuestas/avisos.ts";
import {
  comandoDeDecision,
  partesDelComando,
} from "../../../src/lib/propuestas/comando.ts";
import { construirVistaDePropuestas } from "../../../src/lib/propuestas/vista.ts";
import type { Decision } from "../../../src/engine/propuestas/esquemas.ts";
import { propuestasDemo as base } from "../lib/mundo-de-brecha";

const mundo = (
  cambios: Partial<
    Pick<MundoDePropuestas, "corridas" | "problemasDeCarga" | "decisiones">
  > = {},
) =>
  armarMundoDePropuestas({
    instantanea: base.instantanea,
    nombre: base.nombre,
    consulta: base.consulta,
    activos: base.activos,
    etiquetas: base.etiquetas,
    umbrales: base.umbrales,
    corridas: base.corridas,
    problemasDeCarga: [],
    decisiones: [],
    ...cambios,
  });
const decision = (
  propuesta: string,
  d: Decision["decision"],
  extra: Partial<Decision> = {},
): Decision => ({
  formato: "hackguard/decision@1",
  propuesta,
  decision: d,
  por: "Ana",
  fecha: "2026-10-12",
  ...extra,
});
const v = construirVistaDePropuestas(base);
const fila = (id: string, vista = v) => vista.filas.find((f) => f.id === id)!;

describe("las siete propuestas demo, como las ve la pantalla", () => {
  it("salen en orden, todas por decidir, y la cuenta de arriba es la del motor", () => {
    expect(v.filas.map((f) => f.id)).toEqual([
      "PROP-0031",
      "PROP-0032",
      "PROP-0033",
      "PROP-0034",
      "PROP-0035",
      "PROP-0036",
      "PROP-0037",
    ]);
    expect(v.filas.every((f) => f.estado === "por_decidir")).toBe(true);
    expect(v.cifras.porDecidir).toBe(base.porDecidir);
    expect(v.cifras).toEqual({ porDecidir: 7, sinVerificar: 1, marcadas: 1 });
    expect(v.total).toBe(7);
    expect(v.vacio).toBe(false);
  });
  it("cada fuente trae lo que el código comprobó, y solo la que no se verificó dice por qué", () => {
    const f = fila("PROP-0033");
    expect(f.fuentes).toHaveLength(1);
    expect(f.fuentes[0]).toMatchObject({ verificada: false });
    expect(f.fuentes[0]!.detalle?.es).toContain("no está en ella");
    for (const x of fila("PROP-0031").fuentes) {
      expect(x.verificada).toBe(true);
      expect(x.detalle).toBeNull();
    }
  });
  it("los motivos de la pausa llevan su umbral; contenido e instrucción tienen su propio aviso y no se repiten como motivo", () => {
    expect(
      fila("PROP-0033").motivos.map((m) => [m.etiqueta.nombre.es, m.umbral]),
    ).toEqual([
      ["Fuentes verificadas insuficientes", 2],
      ["Una cita o una fuente sin verificar", 0],
      ["Marco con versión desactualizada", 180],
    ]);
    const marcada = fila("PROP-0034");
    expect(marcada.marcaDeContenido).toBe(true);
    expect(marcada.motivos).toEqual([]);
    expect(fila("PROP-0031").motivos).toEqual([]);
  });
  it("las decisiones que ofrece: aprobar o rechazar; «tras revisar» si está marcada; separar si mezcla pruebas", () => {
    expect(fila("PROP-0031").decisiones).toEqual(["aprobar", "rechazar"]);
    expect(fila("PROP-0034").decisiones).toEqual([
      "aprobar_tras_revisar",
      "rechazar",
    ]);
    expect(fila("PROP-0037").decisiones).toEqual(["separar", "rechazar"]);
    expect(fila("PROP-0036").decisiones).toEqual(["aprobar", "rechazar"]);
  });
  it("aprobar una propuesta de demostración que escribe datos pide la bandera; un cambio de versión o de herramienta no", () => {
    expect(
      ["PROP-0031", "PROP-0036", "PROP-0037"].map(
        (id) => fila(id).pideBanderaDeDemo,
      ),
    ).toEqual([true, true, true]);
    expect(
      ["PROP-0032", "PROP-0035"].map((id) => fila(id).pideBanderaDeDemo),
    ).toEqual([false, false]);
  });
  it("lo que cada tipo cambia y lo que provoca aprobarlo se dicen con palabras", () => {
    expect(fila("PROP-0032").cambio?.es).toContain("lista-decision-14");
    expect(fila("PROP-0032").cambio?.es).toContain("v2");
    expect(fila("PROP-0035").cambio?.en).toContain("pyrit");
    expect(fila("PROP-0036").alAprobar.es).toContain("sobre por confirmar");
    expect(fila("PROP-0032").alAprobar.es).toContain("datos/marcos/");
    // «Aprobar» a secas no escribe la revisión en la prueba: la firma y la fecha quedan en el libro de decisiones (auditoría S8).
    const prueba = fila("PROP-0031").alAprobar;
    expect(prueba.es).not.toContain("con tu firma");
    expect(prueba.es).toContain("libro de decisiones");
    expect(prueba.en).toContain("decision ledger");
  });
  it("un sobre trae el activo con su plan, la asociación, los veredictos que calculó la regla y la huella del texto, nunca el texto", () => {
    const s = fila("PROP-0036").sobre!;
    expect(s.asociacion).toBe("alternativas");
    expect(s.activo).toMatchObject({
      id: "act-demo-asistente",
      ruta: "/activos/act-demo-asistente/plan",
    });
    expect(s.activo.plan).toMatch(/^[0-9a-f]{64}$/);
    expect(
      s.candidatas.map((c) => [c.prueba, c.veredicto?.etiqueta.nombre.es]),
    ).toEqual([
      ["PR-IA-PINJ-001", "Fallida"],
      ["PR-IA-ENC-002", "Fallida"],
    ]);
    expect(s.candidatas[0]!.veredicto).toMatchObject({
      regla: "asimetrica_k",
      fallidas: 3,
      evaluadas: 20,
    });
    expect(s.citas.verificadas).toBe(s.citas.total);
    expect(s.citas.etiqueta.nombre.es).toBe("Cita verificada");
    expect(Object.keys(s.texto).sort()).toEqual([
      "caracteres",
      "extracto",
      "huella",
    ]);
    expect(
      fila("PROP-0037").sobre!.candidatas.map(
        (c) => c.veredicto?.etiqueta.nombre.es,
      ),
    ).toEqual(["Superada", "Fallida"]);
    expect(fila("PROP-0031").sobre).toBeNull();
  });
  it("una candidata sin veredicto dice por qué, con palabras; con citas sin verificar las lista", () => {
    const m = mundo();
    const corrida = structuredClone(
      m.corridas.find((c) => c.corrida.id.startsWith("EXT"))!,
    );
    const p = corrida.corrida.propuestas[0]!;
    if (p.tipo !== "sobre") throw new Error();
    p.candidatas[0]!.veredicto_sugerido = null;
    p.candidatas[0]!.sin_veredicto = "sin_conteos_verificados";
    p.candidatas[0]!.verificacion.citas[3]!.estado = "no_literal";
    const w = construirVistaDePropuestas(
      mundo({
        corridas: [
          m.corridas.find((c) => c.corrida.id.startsWith("INV"))!,
          corrida,
        ],
      }),
    );
    const c = w.filas.find((f) => f.id === p.id)!.sobre!.candidatas[0]!;
    expect(c.veredicto).toBeNull();
    expect(c.sinVeredicto?.es).toContain("no hay veredicto");
    expect(
      c.citas.detalle.filter((x) => !x.verificada).map((x) => x.campo),
    ).toEqual(["resultado.fallidas"]);
    expect(w.filas.find((f) => f.id === p.id)!.pideConteoAMano).toBe(true);
  });
});

describe("el carril de la última corrida de cada agente", () => {
  it("la más reciente primero; el investigador cuenta lo consultado y lo que no pudo leer, con su motivo", () => {
    expect(v.corridas.map((c) => c.id)).toEqual([
      "EXT-2026-10-03-01",
      "INV-2026-10-02-01",
    ]);
    const inv = v.corridas.find((c) => c.agente === "investigador")!;
    expect(inv.consultadas).toBe(10);
    expect(inv.noAccesibles.map((n) => n.razon.es)).toEqual([
      "Respondió 403: el sitio no deja leerlo desde aquí.",
      "Pide iniciar sesión.",
    ]);
    expect(inv.contradicciones).toHaveLength(1);
    expect(inv.criterios).toEqual({ cumplen: 5, total: 5 });
    expect(inv.lugar).toBe("demo");
    expect(inv.huella).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("lo que cambia con el libro de decisiones", () => {
  it("una propuesta rechazada pasa a «rechazada», dice quién y cuándo, y no ofrece más decisiones; la cuenta baja", () => {
    const w = construirVistaDePropuestas(
      mundo({
        decisiones: [
          decision("PROP-0033", "rechazar", { motivo: "una sola fuente" }),
        ],
      }),
    );
    const f = fila("PROP-0033", w);
    expect(f.estado).toBe("rechazada");
    expect(f.decidida).toEqual({
      por: "Ana",
      fecha: "2026-10-12",
      motivo: "una sola fuente",
      efecto: null,
    });
    expect(f.decisiones).toEqual([]);
    expect(f.etiquetaDeEstado.nombre.es).toBe("Rechazada");
    expect(w.cifras.porDecidir).toBe(6);
    expect(w.cifras.sinVerificar).toBe(0);
  });
  it("separar un texto que mezcla pruebas deja a sus hijas por decidir, con su identificador y su propio veredicto", () => {
    const w = construirVistaDePropuestas(
      mundo({
        decisiones: [
          decision("PROP-0037", "separar", {
            hijas: ["PROP-0037.1", "PROP-0037.2"],
          }),
        ],
      }),
    );
    expect(fila("PROP-0037", w).estado).toBe("separada");
    expect(
      w.filas
        .filter((f) => f.padre === "PROP-0037")
        .map((f) => [f.id, f.estado]),
    ).toEqual([
      ["PROP-0037", "separada"],
      ["PROP-0037.1", "por_decidir"],
      ["PROP-0037.2", "por_decidir"],
    ]);
    expect(fila("PROP-0037.1", w).sobre!.candidatas).toHaveLength(1);
    expect(fila("PROP-0037.1", w).decisiones).toEqual(["aprobar", "rechazar"]);
    expect(w.cifras.porDecidir).toBe(8);
    expect(w.total).toBe(9);
  });
  it("un libro que no cuadra con las propuestas detiene la carga en vez de mostrarse", () => {
    expect(() =>
      mundo({ decisiones: [decision("PROP-9999", "aprobar")] }),
    ).toThrowError(/no cuadra con las propuestas/);
  });
});

describe("los campos del contrato tienen su lector en la pantalla (auditoría S8)", () => {
  it("el efecto de una decisión se ve: el sobre que nació y el veredicto que la persona corrigió", () => {
    const w = construirVistaDePropuestas(
      mundo({
        decisiones: [
          decision("PROP-0036", "aprobar", {
            prueba: "PR-IA-PINJ-001",
            efecto: {
              sobre: "SOB-9001",
              veredicto_sugerido: "superada",
              veredicto_resultante: "fallida",
            },
            veredicto_corregido_por_persona: true,
          }),
        ],
      }),
    );
    const e = fila("PROP-0036", w).decidida?.efecto;
    expect(e?.sobre).toBe("SOB-9001");
    expect(e?.corregido?.de.nombre.es).toBe("Superada");
    expect(e?.corregido?.a.nombre.es).toBe("Fallida");
  });
  it("una decisión sin efecto ni corrección no inventa uno", () => {
    const w = construirVistaDePropuestas(
      mundo({
        decisiones: [decision("PROP-0033", "rechazar", { motivo: "x" })],
      }),
    );
    expect(fila("PROP-0033", w).decidida?.efecto).toBeNull();
  });
  it("cada fuente dice cuándo se leyó, y cada marca dice qué patrón la dio", () => {
    for (const f of v.filas)
      for (const x of f.fuentes) expect(x.leida).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const marcada = v.filas.find((f) => f.marcaDeContenido)!;
    expect(marcada.marcas.contenido.length).toBeGreaterThan(0);
    for (const m of marcada.marcas.contenido) {
      expect(m.patron).not.toBe("");
      expect(m.campo).not.toBe("");
    }
  });
  it("una fuente que una persona aportó lo dice, con quién y cuándo (RF-07.2b)", () => {
    const original = base.corridas.find(
      (c) => c.corrida.agente === "investigador",
    )!;
    const p = original.corrida.propuestas.find((x) => x.id === "PROP-0032")!;
    if (p.tipo !== "version_de_marco") throw new Error();
    const f = p.fuentes[0]!;
    const conAporte = {
      ...original,
      aportes: [
        {
          url: f.url,
          huella_de_la_pagina: f.huella_de_la_pagina,
          caracteres: 10,
          fecha: "2026-10-12",
          por: "Ana",
        },
      ],
    };
    const w = construirVistaDePropuestas(
      mundo({
        corridas: base.corridas.map((c) => (c === original ? conAporte : c)),
      }),
    );
    expect(fila("PROP-0032", w).fuentes[0]!.aportada).toEqual({
      por: "Ana",
      fecha: "2026-10-12",
      caracteres: 10,
    });
    expect(fila("PROP-0032", w).fuentes[1]!.aportada).toBeNull();
    expect(fila("PROP-0032").fuentes[0]!.aportada).toBeNull();
  });
  it("la corrida dice lo que costó cuando lo midió", () => {
    const conCosto = v.corridas.filter((c) => c.ejecucion !== null);
    for (const c of conCosto)
      expect(c.ejecucion!.nodos.length).toBeGreaterThan(0);
  });
});

describe("corridas ilegibles y bandeja vacía", () => {
  it("una corrida que no se pudo leer se reporta y no se muestra; las demás siguen", () => {
    const w = construirVistaDePropuestas(
      mundo({
        problemasDeCarga: [
          {
            ruta: "propuestas/corridas/x/corrida.json",
            detalle: "su huella no es la de su contenido",
          },
        ],
      }),
    );
    expect(w.ilegibles).toHaveLength(1);
    expect(w.ilegibles[0]!.etiqueta.nombre.es).toBe(
      "Una propuesta no se pudo leer",
    );
    expect(w.filas).toHaveLength(7);
  });
  it("sin corridas la bandeja está vacía y no hay nada por decidir", () => {
    const w = construirVistaDePropuestas(mundo({ corridas: [] }));
    expect(w.vacio).toBe(true);
    expect(w.filas).toEqual([]);
    expect(w.cifras).toEqual({ porDecidir: 0, sinVerificar: 0, marcadas: 0 });
    expect(w.corridas).toEqual([]);
  });
});

describe("el comando que registra una decisión", () => {
  const f = { id: "PROP-0031", pideBanderaDeDemo: true };
  it("lleva el identificador, la decisión, y deja el nombre y la fecha a la persona", () => {
    expect(comandoDeDecision(f, "aprobar")).toBe(
      'pnpm propuestas:decidir PROP-0031 --decision aprobar --por "<tu nombre>" --fecha AAAA-MM-DD --aplicar-a-demo',
    );
    expect(
      comandoDeDecision({ ...f, pideBanderaDeDemo: false }, "aprobar"),
    ).not.toContain("--aplicar-a-demo");
  });
  it("«aprobar tras revisar» usa el guion del CLI; rechazar pide un motivo y nunca lleva la bandera de demostración", () => {
    expect(comandoDeDecision(f, "aprobar_tras_revisar")).toContain(
      "--decision aprobar-tras-revisar",
    );
    const r = comandoDeDecision(f, "rechazar");
    expect(r).toContain('--motivo "<por qué>"');
    expect(r).not.toContain("--aplicar-a-demo");
  });
  it("con alternativas lleva la prueba elegida; separar no lleva nada más", () => {
    expect(
      comandoDeDecision(f, "aprobar", { prueba: "PR-IA-ENC-002" }),
    ).toContain("--prueba PR-IA-ENC-002");
    expect(comandoDeDecision(f, "separar")).toBe(
      'pnpm propuestas:decidir PROP-0031 --decision separar --por "<tu nombre>" --fecha AAAA-MM-DD',
    );
  });
  it("va en partes que no se rompen, para que un teléfono lo parta entre palabras", () => {
    const partes = partesDelComando(f, "rechazar");
    expect(partes.join(" ")).toBe(comandoDeDecision(f, "rechazar"));
    expect(partes).toContain('"<tu nombre>"');
    expect(partes.every((p) => p.length < 40)).toBe(true);
  });
});

describe("los avisos de versión como los ven las pantallas", () => {
  it("nombran el marco con su nombre y llevan la ruta a la propuesta en la bandeja", () => {
    const [a] = avisosDeMarco(base.avisos, (id) => `Nombre de ${id}`);
    expect(a).toMatchObject({
      marco: "lista-decision-14",
      nombre: "Nombre de lista-decision-14",
      vigente: "v1",
      publicada: "v2",
      propuesta: "PROP-0032",
      fuentes: 2,
      verificadas: 2,
      ruta: "/catalogo/propuestas#prop-0032",
    });
  });
  it("el mundo guarda la última corrida del investigador: sin ella, «ninguno» no se puede decir", () => {
    // La demo consultó 10 páginas y 2 no se pudieron leer: «leyó 8 y no pudo leer 2».
    expect(base.investigacion).toEqual({
      corrida: "INV-2026-10-02-01",
      fecha: "2026-10-02",
      leidas: 8,
      noLeidas: 2,
    });
    expect(
      mundo({
        corridas: base.corridas.filter((c) => c.corrida.agente === "extractor"),
      }).investigacion,
    ).toBeNull();
  });
});
