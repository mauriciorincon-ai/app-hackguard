// El texto pegado: de lo que una herramienta devolvió al sobre propuesto y a la brecha antes y después de confirmarlo. Lo que se
// prueba es lo que lo hace honesto: UNA cuenta (el «antes» es la brecha de la consulta, con su huella; el «después» se compara contra una
// entrada armada a mano en este archivo), una falla confirmada mueve el control porque abre un hallazgo, el texto pegado no sale en
// ningún campo, y cada motivo de no leer lo dice una persona en los dos idiomas.
import { describe, expect, it } from "vitest";
import {
  armarBrecha,
  calcularBrecha,
  type EntradaDeBrecha,
} from "../../../src/engine/brecha/calcular.ts";
import { MOTIVOS_DE_NO_LEER } from "../../../src/engine/adaptadores/interfaz.ts";
import type { SobreEfectivo } from "../../../src/engine/evidencia/esquemas.ts";
import { huellaDelCrudo } from "../../../src/engine/evidencia/huellas.ts";
import { hallazgoNuevo } from "../../../src/engine/hallazgos/apertura.ts";
import {
  proponerDesdeTexto,
  TEXTO_DE_MOTIVO,
  type MundoDePegado,
  type PedidoDePegado,
} from "../../../src/lib/evidencia/pegado.ts";
import {
  GARAK,
  PROMPTFOO,
  ZAP,
  mundoDePegado,
  textoDeFixture,
} from "../lib/mundo-de-pegado";

// La consulta del build real es la fecha del commit; la corrida de los fixtures es del 2026-10-12.
const CONSULTA = "2026-11-08";
const M = mundoDePegado(CONSULTA);
const ASISTENTE = "act-demo-asistente";
const garak = (extra: Partial<PedidoDePegado> = {}): PedidoDePegado => ({
  texto: textoDeFixture(GARAK),
  activo: ASISTENTE,
  herramienta: "garak",
  fecha: null,
  zona: "America/Bogota",
  ...extra,
});
const promptfoo = (extra: Partial<PedidoDePegado> = {}): PedidoDePegado => ({
  texto: textoDeFixture(PROMPTFOO),
  activo: ASISTENTE,
  herramienta: "promptfoo",
  fecha: null,
  zona: null,
  ...extra,
});
const zap = (extra: Partial<PedidoDePegado> = {}): PedidoDePegado => ({
  texto: textoDeFixture("zap-traditional-json.derivada.json"),
  activo: ASISTENTE,
  herramienta: "zap",
  fecha: null,
  zona: null,
  ...extra,
});

async function propuesta(m: MundoDePegado, p: PedidoDePegado) {
  const r = await proponerDesdeTexto(m, p);
  if (!r.ok) throw new Error(`no se propuso: ${r.motivo}`);
  return r.propuesta;
}

/** La entrada del «después» armada A MANO (sin `brechaSiConfirmas`): cada sobre confirmado a la fecha de consulta y, por cada falla sin
 *  hallazgo vivo de la misma prueba, un hallazgo escrito aquí. */
function aMano(
  e: EntradaDeBrecha,
  sobres: readonly SobreEfectivo[],
  conHallazgo: readonly string[],
): EntradaDeBrecha {
  const confirmados = sobres.map((s) => ({
    ...s,
    confirmacion: {
      por: "x",
      fecha: e.consulta,
      modo: "individual" as const,
    },
  }));
  return {
    ...e,
    libro: [...e.libro, ...confirmados],
    hallazgos: [
      ...e.hallazgos,
      ...confirmados
        .filter((s) => conHallazgo.includes(s.id))
        .map((s, i) =>
          hallazgoNuevo(
            `HZ-${String(900 + i)}`.replace("HZ-", "HZ-0"),
            s,
            { es: "a mano", en: "by hand" },
            { es: "a mano", en: "by hand" },
            { tipo: "escala_ia", impacto: 1, alcance: 1, detectabilidad: 1 },
          ),
        ),
    ],
  };
}

describe("lo que propone el texto pegado", () => {
  it("un reporte de Garak da un sobre por prueba del plan que midió, con el veredicto que calcula la regla y sin confirmar", async () => {
    const p = await propuesta(M, garak());
    expect(p.sobres).toHaveLength(3);
    expect(p.resumen.map((s) => [s.prueba, s.veredicto])).toEqual([
      ["PR-IA-CONT-001", "fallida"],
      ["PR-IA-ENC-002", "superada"],
      ["PR-IA-PINJ-001", "fallida"],
    ]);
    expect(p.sobres.every((s) => s.confirmacion === null)).toBe(true);
    expect(p.fecha).toBe("2026-10-12");
    expect(p.huellaDelCrudo).toBe(
      await huellaDelCrudo(new TextEncoder().encode(textoDeFixture(GARAK))),
    );
    expect(p.noAplican).toBe(0);
  });

  it("un archivo de promptfoo también: sobres propuestos con el veredicto de la regla, jamás el de la herramienta", async () => {
    const p = await propuesta(M, promptfoo());
    expect(p.sobres).toHaveLength(3);
    expect(p.sobres.every((s) => s.confirmacion === null)).toBe(true);
    expect(p.fecha).toBe("2026-10-12");
    // `is-json` salió 1 de 1 en la herramienta; la regla de la prueba (que pide más repeticiones) dice «parcial», no «superada».
    // Una prueba cuyas filas terminaron todas en error y otra sin filas del plan no se dan por superadas.
    expect(p.resumen.map((s) => [s.prueba, s.veredicto])).toEqual([
      ["PR-AG-LIM-001", "no_ejecutada"],
      ["PR-AG-PERM-001", "no_ejecutada"],
      ["PR-IA-SAL-001", "parcial"],
    ]);
    expect(p.noAplican).toBe(0);
  });

  it("un reporte de ZAP también: «no ejecutada» no es «superada»", async () => {
    const p = await propuesta(M, zap());
    expect(p.sobres).toHaveLength(6);
    const veredictos = new Set(p.resumen.map((s) => s.veredicto));
    expect(veredictos.has("no_ejecutada")).toBe(true);
    expect(
      p.resumen.filter((s) => s.veredicto === "superada").length,
    ).toBeLessThan(p.sobres.length);
  });

  it("el texto pegado no sale en ningún campo: solo su huella y lo que el adaptador escribe", async () => {
    const canario = "CANARIO-DEL-CRUDO-0f3a9c";
    const lineas = textoDeFixture(GARAK).trimEnd().split("\n");
    const conCanario = [
      ...lineas,
      JSON.stringify({ entry_type: "comentario", texto: canario }),
    ].join("\n");
    const p = await propuesta(M, garak({ texto: conCanario }));
    expect(JSON.stringify(p)).not.toContain(canario);
    expect(p.sobres).toHaveLength(3);
  });

  it("la misma entrada da los mismos bytes: dos veces, el mismo lote y la misma brecha", async () => {
    const a = await propuesta(M, garak());
    const b = await propuesta(M, garak());
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe("la brecha antes y después: una cuenta, un cálculo", () => {
  it("el «antes» es la brecha de la consulta, con la huella del informe", async () => {
    const p = await propuesta(M, garak());
    const informe = await calcularBrecha(M.entrada);
    expect(p.brecha.antes.huella).toBe(informe.huella);
    expect(p.brecha.antes.planeadas).toBe(informe.resumen.planeadas);
    expect(p.brecha.antes.fallidas).toBe(informe.resumen.fallidas);
    expect(p.brecha.antes.porConfirmar).toBe(informe.porConfirmar.sobres);
  });

  it("el «después» es la brecha de siempre sobre una entrada armada a mano con los sobres confirmados y sus hallazgos", async () => {
    const p = await propuesta(M, garak());
    const sobres = p.sobres as unknown as SobreEfectivo[];
    const abren = p.brecha.abririan.map((x) => x.sobre);
    expect(abren).toEqual(["SOB-0040", "SOB-0042"]);
    const oraculo = armarBrecha(aMano(M.entrada, sobres, abren));
    expect(p.brecha.despues.planeadas).toBe(oraculo.resumen.planeadas);
    expect(p.brecha.despues.ejecutadas).toBe(oraculo.resumen.ejecutadas);
    expect(p.brecha.despues.superadas).toBe(oraculo.resumen.superadas);
    expect(p.brecha.despues.fallidas).toBe(oraculo.resumen.fallidas);
    expect(p.brecha.despues.noEjecutadas).toBe(oraculo.resumen.no_ejecutadas);
    expect(p.brecha.despues.hallazgosQueCuentan).toBe(
      oraculo.hallazgos.filter((h) => h.cuentaComoFalla).length,
    );
    expect(p.brecha.despues.controlesConFalla).toBe(
      oraculo.controles.filter((c) => c.estado === "con_fallas").length,
    );
    expect(p.brecha.despues.porConfirmar).toBe(oraculo.porConfirmar.sobres);
  });

  it("una falla confirmada mueve el control porque abre un hallazgo; sin ese hallazgo el control no se movería", async () => {
    const p = await propuesta(M, garak());
    expect(p.brecha.controles).toEqual([
      {
        id: "iso42001-A.9.4",
        de: "con_evidencia_vigente",
        a: "con_fallas",
        sentido: "empeoro",
      },
    ]);
    expect(p.brecha.despues.hallazgosQueCuentan).toBe(
      p.brecha.antes.hallazgosQueCuentan + 2,
    );
    // El oráculo SIN hallazgos nuevos: la falla sola, sin hallazgo, no deja el control con fallas.
    const sobres = p.sobres as unknown as SobreEfectivo[];
    const sinHallazgo = armarBrecha(aMano(M.entrada, sobres, []));
    const a94 = sinHallazgo.controles.find((c) => c.id === "iso42001-A.9.4")!;
    expect(a94.estado).not.toBe("con_fallas");
  });

  it("una falla de una prueba que ya tiene un hallazgo vivo no abre otro", async () => {
    const e = M.entrada;
    const previo = e.libro.find(
      (s) =>
        s.activo === ASISTENTE &&
        s.prueba === "PR-IA-PINJ-001" &&
        s.confirmacion !== null,
    )!;
    // Un sobre confirmado y fallido de la misma prueba, con su hallazgo vivo: pegar otra falla no abre un segundo.
    const falla = { ...previo, veredicto: "fallida" as const };
    const vivo = hallazgoNuevo(
      "HZ-0999",
      falla,
      { es: "a mano", en: "by hand" },
      { es: "a mano", en: "by hand" },
      { tipo: "escala_ia", impacto: 1, alcance: 1, detectabilidad: 1 },
    );
    const m: MundoDePegado = {
      ...M,
      entrada: {
        ...e,
        libro: e.libro.map((s) => (s.id === previo.id ? falla : s)),
        hallazgos: [...e.hallazgos, vivo],
      },
    };
    const p = await propuesta(m, garak());
    expect(p.brecha.abririan.map((x) => x.prueba)).not.toContain(
      "PR-IA-PINJ-001",
    );
  });

  it("un reporte posterior a la fecha de consulta no se calcula: dice el motivo en vez de fallar", async () => {
    const m = mundoDePegado("2026-10-05");
    const r = await proponerDesdeTexto(m, garak());
    expect(r).toMatchObject({ ok: false, motivo: "posterior_a_la_consulta" });
  });
});

describe("lo que no se lee, se dice", () => {
  it.each([
    ["no hay texto", garak({ texto: "  \n" }), "sin_texto"],
    [
      "el activo no es del plan",
      garak({ activo: "otro" }),
      "activo_desconocido",
    ],
    [
      "la herramienta no tiene adaptador",
      garak({ herramienta: "nikto" }),
      "activo_desconocido",
    ],
    [
      "un reporte de ZAP pegado como Garak",
      garak({ texto: textoDeFixture(ZAP) }),
      "no_leyo_no_es_el_formato",
    ],
    ["Garak no declara su zona", garak({ zona: null }), "falta_zona"],
    [
      "una fecha mal escrita",
      garak({ fecha: "12/10/2026" }),
      "fecha_con_formato_incorrecto",
    ],
    [
      "una versión de ZAP que no se puede comparar",
      zap({ texto: textoDeFixture(ZAP) }),
      "no_leyo_version_no_comparable",
    ],
  ])("%s", async (_n, pedido, motivo) => {
    const r = await proponerDesdeTexto(M, pedido);
    expect(r).toMatchObject({ ok: false, motivo });
  });

  it("el mismo texto no se importa dos veces: lo dice con el lote", async () => {
    const huella = await huellaDelCrudo(
      new TextEncoder().encode(textoDeFixture(GARAK)),
    );
    const m: MundoDePegado = {
      ...M,
      lotes: [
        ...M.lotes,
        { id: "LOTE-0009", activo: ASISTENTE, archivo: huella },
      ],
    };
    const r = await proponerDesdeTexto(m, garak());
    expect(r).toEqual({
      ok: false,
      motivo: "ya_importado",
      detalle: "LOTE-0009",
    });
  });

  it("cada motivo se dice en los dos idiomas, sin un código pelado", () => {
    const motivos = [
      "sin_texto",
      "activo_desconocido",
      "herramienta_sin_adaptador",
      "ya_importado",
      ...MOTIVOS_DE_NO_LEER.map((x) => `no_leyo_${x}`),
      "falta_fecha",
      "falta_zona",
      "sin_pruebas_de_la_herramienta",
      "prueba_desconocida",
      "prueba_fuera_del_plan",
      "veredicto_declarado_requerido",
      "regla_desconocida",
      "falta_k",
      "faltan_conteos",
      "falta_metrica",
      "fecha_con_formato_incorrecto",
      "posterior_a_la_consulta",
      "lectura_fallida",
    ];
    for (const m of motivos) {
      const t = TEXTO_DE_MOTIVO[m];
      expect(t, m).toBeDefined();
      expect(t!.es.length, m).toBeGreaterThan(20);
      expect(t!.en.length, m).toBeGreaterThan(20);
      expect(t!.es, m).not.toBe(t!.en);
      expect(`${t!.es} ${t!.en}`, m).not.toContain("_");
    }
    expect(Object.keys(TEXTO_DE_MOTIVO).sort()).toEqual([...motivos].sort());
  });
});
