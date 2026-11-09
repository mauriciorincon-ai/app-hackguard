// @vitest-environment node
// D5 — un hallazgo REABIERTO (RF-04.9): un cerrado por re-prueba vuelve a abrirse solo si una persona confirma un sobre
// posterior que lo cita como re-prueba, con la misma configuración y al menos el mismo k, y que FALLA. La regla dura 6 sigue
// entera: una ausencia, un «no ejecutada» o una declaración jamás reabren (ni cierran). Cada camino que NO reabre se demuestra
// con su motivo; cada cadena (cerrar → reabrir → cerrar) con sus fechas.
import { describe, expect, it } from "vitest";
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import {
  cuentaComoFalla,
  ESTADOS_CON_PLAZO,
  ESTADOS_QUE_CUENTAN_COMO_FALLA,
  evaluarHallazgo,
} from "../../../src/engine/hallazgos/ciclo.ts";
import {
  ESTADOS_DE_HALLAZGO,
  MOTIVOS_DE_RECHAZO,
  type Evento,
} from "../../../src/engine/hallazgos/esquemas.ts";
import { situacionDeHallazgo } from "../../../src/engine/hallazgos/situacion.ts";
import {
  etiquetaDeEstadoDeHallazgo,
  origenDeLaEtiquetaDeEstado,
} from "../../../src/lib/evidencia/etiqueta-de-estado.ts";
import { copia, mundo, nuevo } from "../evidencia/ayuda.ts";

const POR = "Operador demo";
const nota = { es: "n", en: "n" };
const firma = (fecha: string) => ({
  por: POR,
  fecha,
  modo: "individual" as const,
});
const resultado = (fallidas: number, ejecutada = true) => ({
  ejecutada,
  evaluadas: 20,
  fallidas,
  alertas: null,
  metrica: null,
});

/** HZ-0003: cerrado el 2026-09-24 por SOB-0027 (k = 20, garak 0.17.0). */
async function base() {
  const m = await mundo();
  return { m, h: copia(m.hallazgos["HZ-0003"]!), s27: m.sobres["SOB-0027"]! };
}
/** Una re-prueba nueva de HZ-0003 con lo que cambie (por defecto: FALLA, confirmada, dos meses después del cierre). */
async function sobre(
  id: string,
  cambios: Partial<Omit<Sobre, "huellas" | "id">> = {},
): Promise<Sobre> {
  const { m } = await base();
  const fecha = cambios.fecha ?? "2026-10-05";
  return nuevo(m.sobres["SOB-0027"]!, id, {
    fecha,
    resultado: resultado(2),
    veredicto: "fallida",
    confirmacion: firma(fecha),
    ...cambios,
  });
}
async function evaluar(
  cambios: Sobre[],
  eventos?: Evento[],
  quitar: string[] = [],
) {
  const { m, h } = await base();
  const libro = [...Object.values(m.sobres), ...cambios].filter(
    (s) => !quitar.includes(s.id),
  );
  const r = evaluarHallazgo(eventos ? { ...h, eventos } : h, libro);
  if (!r.ok) throw new Error(r.motivo);
  return r.evaluacion;
}
const correccion = (fecha: string): Evento => ({
  tipo: "correccion",
  fecha,
  por: POR,
  nota,
});

describe("lo que reabre un cerrado", () => {
  it("una re-prueba confirmada, posterior al cierre, con la misma configuración, que FALLA lo reabre", async () => {
    const e = await evaluar([await sobre("SOB-0040")]);
    expect(e.estado).toBe("reabierto");
    expect(e.cuentaComoFalla).toBe(true);
    expect(e.cierre).toBeNull();
    expect(e.apertura).toBe("2026-08-18");
    expect(e.reapertura).toEqual({ sobre: "SOB-0040", fecha: "2026-10-05" });
    expect(e.reaperturas).toEqual([
      { sobre: "SOB-0040", fecha: "2026-10-05", cierre: "SOB-0027" },
    ]);
    expect(e.cierres.map((c) => c.sobre)).toEqual(["SOB-0027"]);
    expect(e.candidatas.find((c) => c.sobre.id === "SOB-0040")?.reabre).toBe(
      true,
    );
  });

  it("un veredicto «parcial» también reabre: es una falla", async () => {
    const e = await evaluar([
      await sobre("SOB-0040", {
        veredicto: "parcial",
        resultado: resultado(1),
      }),
    ]);
    expect(e.estado).toBe("reabierto");
  });

  it("sin reabrir, el cerrado de siempre sigue idéntico: sin reaperturas ni reapertura", async () => {
    const e = await evaluar([]);
    expect(e.estado).toBe("cerrado");
    expect(e.reaperturas).toEqual([]);
    expect(e.reapertura).toBeNull();
    expect(e.cierres.map((c) => c.sobre)).toEqual(["SOB-0027"]);
  });
});

describe("lo que NO reabre un cerrado (cada motivo, nombrado)", () => {
  const casos: [string, Partial<Omit<Sobre, "huellas" | "id">>][] = [
    ["sin confirmar (una propuesta no cuenta)", { confirmacion: null }],
    ["de otro activo", { activo: "act-demo-clasificador" }],
    ["de otra prueba", { prueba: "PR-IA-ENC-002" }],
    [
      "de otra versión de la herramienta",
      { herramienta: { id: "garak", version: "0.18.0" } },
    ],
    ["de otra herramienta", { herramienta: { id: "zap", version: "0.17.0" } }],
    [
      "con otro selector",
      {
        selector: {
          tipo: "garak",
          probes: ["encoding"],
          detectores: ["base.TriggerListDetector"],
          agregacion: "cualquier_detector",
        },
      },
    ],
    [
      "con menos repeticiones que el original (k menor)",
      { k: 5, resultado: { ...resultado(2), evaluadas: 5 } },
    ],
    [
      "que no falló: «superada»",
      { veredicto: "superada", resultado: resultado(0) },
    ],
    [
      "«no_aplicable» no es una falla",
      { veredicto: "no_aplicable", resultado: resultado(0) },
    ],
  ];
  it.each(casos)("una re-prueba %s", async (_n, cambios) => {
    const e = await evaluar([await sobre("SOB-0040", cambios)]);
    expect(e.estado).toBe("cerrado");
    expect(e.reaperturas).toEqual([]);
    expect(
      e.candidatas.find((c) => c.sobre.id === "SOB-0040")?.reabre ?? false,
    ).toBe(false);
  });

  // Los tres «rojos» de la regla dura 6, nombrados.
  it("ROJO 1 · un sobre «no_ejecutada» jamás reabre (ni es una falla ni es evidencia)", async () => {
    const e = await evaluar([
      await sobre("SOB-0040", {
        resultado: resultado(0, false),
        veredicto: "no_ejecutada",
      }),
    ]);
    expect(e.estado).toBe("cerrado");
    expect(e.reaperturas).toEqual([]);
  });

  it("ROJO 2 · la ausencia (o la presencia) en un escaneo posterior que NO cita al hallazgo no lo reabre", async () => {
    // Un escaneo posterior de la misma prueba y configuración que falla, pero sin `reprueba_de`: no es una re-prueba.
    const e = await evaluar([await sobre("SOB-0040", { reprueba_de: null })]);
    expect(e.estado).toBe("cerrado");
    expect(e.reaperturas).toEqual([]);
    expect(e.candidatas.map((c) => c.sobre.id)).toEqual(["SOB-0027"]);
  });

  it("ROJO 3 · una declaración (eliminar, no se reproduce, aceptar el riesgo) jamás reabre ni cierra distinto: el cierre por re-prueba manda", async () => {
    const { h } = await base();
    for (const ev of [
      {
        tipo: "eliminacion",
        fecha: "2026-10-01",
        por: POR,
        justificacion: nota,
      },
      {
        tipo: "no_reproducible",
        fecha: "2026-10-01",
        por: POR,
        justificacion: nota,
      },
      {
        tipo: "aceptacion",
        fecha: "2026-10-01",
        por: POR,
        revision_en_dias: 30,
        justificacion: nota,
      },
    ] as Evento[]) {
      const e = await evaluar([], [...h.eventos, ev]);
      expect(e.estado).toBe("cerrado");
      expect(e.reaperturas).toEqual([]);
    }
  });

  it("una re-prueba que falla el MISMO día del cierre o antes no reabre (posterior es estrictamente mayor)", async () => {
    for (const fecha of ["2026-09-24", "2026-09-20"]) {
      const e = await evaluar([await sobre("SOB-0040", { fecha })]);
      expect(e.estado).toBe("cerrado");
      expect(e.reaperturas).toEqual([]);
    }
  });

  it("una re-prueba sin confirmar queda aparte: «por confirmar», no reabre", async () => {
    const e = await evaluar([await sobre("SOB-0040", { confirmacion: null })]);
    expect(e.porConfirmar.map((s) => s.id)).toEqual(["SOB-0040"]);
    expect(e.estado).toBe("cerrado");
  });
});

describe("la cadena: cerrar → reabrir → cerrar", () => {
  it("una corrección posterior a la reapertura y una re-prueba superada posterior lo cierran DE NUEVO", async () => {
    const { h } = await base();
    const e = await evaluar(
      [
        await sobre("SOB-0040"),
        await sobre("SOB-0041", {
          fecha: "2026-10-20",
          resultado: resultado(0),
          veredicto: "superada",
          confirmacion: firma("2026-10-21"),
        }),
      ],
      [...h.eventos, correccion("2026-10-10")],
    );
    expect(e.estado).toBe("cerrado");
    expect(e.cierre).toEqual({
      tipo: "reprueba",
      fecha: "2026-10-21",
      sobre: "SOB-0041",
    });
    expect(e.reapertura).toBeNull();
    expect(e.cierres.map((c) => c.sobre)).toEqual(["SOB-0027", "SOB-0041"]);
    expect(e.reaperturas.map((r) => r.sobre)).toEqual(["SOB-0040"]);
  });

  it("la corrección ANTERIOR a la reapertura ya no cuenta: sin una nueva, la re-prueba superada no cierra", async () => {
    const e = await evaluar([
      await sobre("SOB-0040"),
      await sobre("SOB-0041", {
        fecha: "2026-10-20",
        resultado: resultado(0),
        veredicto: "superada",
        confirmacion: firma("2026-10-21"),
      }),
    ]);
    expect(e.estado).toBe("reabierto");
    const c41 = e.candidatas.find((c) => c.sobre.id === "SOB-0041")!;
    expect(c41.motivos).toContain("sin_correccion");
  });

  it("una re-prueba superada ANTERIOR a la nueva corrección tampoco cierra", async () => {
    const { h } = await base();
    const e = await evaluar(
      [
        await sobre("SOB-0040"),
        await sobre("SOB-0041", {
          fecha: "2026-10-12",
          resultado: resultado(0),
          veredicto: "superada",
          confirmacion: firma("2026-10-12"),
        }),
      ],
      [...h.eventos, correccion("2026-10-15")],
    );
    expect(e.estado).toBe("reabierto");
    expect(
      e.candidatas.find((c) => c.sobre.id === "SOB-0041")?.motivos,
    ).toContain("anterior_a_la_correccion");
  });

  it("puede reabrirse otra vez: cuatro eslabones se vuelven seis, y la última reapertura es la vigente", async () => {
    const { h } = await base();
    const e = await evaluar(
      [
        await sobre("SOB-0040"),
        await sobre("SOB-0041", {
          fecha: "2026-10-20",
          resultado: resultado(0),
          veredicto: "superada",
          confirmacion: firma("2026-10-21"),
        }),
        await sobre("SOB-0042", {
          fecha: "2026-11-02",
          confirmacion: firma("2026-11-03"),
        }),
      ],
      [...h.eventos, correccion("2026-10-10")],
    );
    expect(e.estado).toBe("reabierto");
    expect(e.reaperturas.map((r) => r.sobre)).toEqual(["SOB-0040", "SOB-0042"]);
    expect(e.reaperturas[1]).toEqual({
      sobre: "SOB-0042",
      fecha: "2026-11-03",
      cierre: "SOB-0041",
    });
    expect(e.reapertura).toEqual({ sobre: "SOB-0042", fecha: "2026-11-03" });
  });

  it("el orden es el de las FECHAS, no el de los identificadores", async () => {
    const { h } = await base();
    // El que falla tiene el id MENOR pero la fecha posterior; el que cierra, el id mayor y la fecha anterior a la falla.
    const e = await evaluar(
      [
        await sobre("SOB-0050", { fecha: "2026-10-05" }),
        await sobre("SOB-0051", {
          fecha: "2026-10-01",
          resultado: resultado(0),
          veredicto: "superada",
        }),
      ],
      h.eventos,
      [],
    );
    expect(e.reaperturas.map((r) => r.sobre)).toEqual(["SOB-0050"]);
    expect(e.estado).toBe("reabierto");
  });
});

describe("las declaraciones después de una reapertura", () => {
  it("aceptar el riesgo DESPUÉS de reabrir deja el hallazgo aceptado", async () => {
    const { h } = await base();
    const e = await evaluar(
      [await sobre("SOB-0040")],
      [
        ...h.eventos,
        {
          tipo: "aceptacion",
          fecha: "2026-10-08",
          por: POR,
          revision_en_dias: 30,
          justificacion: nota,
        },
      ],
    );
    expect(e.estado).toBe("aceptado_con_riesgo");
  });

  it("una declaración hecha ENTRE el sobre y su confirmación no la tapa: la reapertura rige desde que una persona la confirmó", async () => {
    const { h } = await base();
    // El sobre es del 2026-10-05 pero una persona lo confirma el 2026-10-09; el 2026-10-07 el hallazgo seguía cerrado.
    const reabre = await sobre("SOB-0040", {
      confirmacion: firma("2026-10-09"),
    });
    const aceptar = (fecha: string): Evento => ({
      tipo: "aceptacion",
      fecha,
      por: POR,
      revision_en_dias: 30,
      justificacion: nota,
    });
    const antes = await evaluar(
      [reabre],
      [...h.eventos, aceptar("2026-10-07")],
    );
    expect(antes.estado).toBe("reabierto");
    const despues = await evaluar(
      [reabre],
      [...h.eventos, aceptar("2026-10-10")],
    );
    expect(despues.estado).toBe("aceptado_con_riesgo");
  });

  it("una declaración ANTERIOR a la reapertura no la tapa: la reapertura manda", async () => {
    const { h } = await base();
    const e = await evaluar(
      [await sobre("SOB-0040")],
      [
        ...h.eventos,
        {
          tipo: "eliminacion",
          fecha: "2026-09-30",
          por: POR,
          justificacion: nota,
        },
      ],
    );
    expect(e.estado).toBe("reabierto");
  });

  it("eliminar el componente DESPUÉS de reabrir lo cierra por eliminación", async () => {
    const { h } = await base();
    const e = await evaluar(
      [await sobre("SOB-0040")],
      [
        ...h.eventos,
        {
          tipo: "eliminacion",
          fecha: "2026-10-09",
          por: POR,
          justificacion: nota,
        },
      ],
    );
    expect(e.estado).toBe("cerrado_por_eliminacion");
    expect(e.cierre?.tipo).toBe("eliminacion");
  });
});

describe("el plazo corre desde la reapertura", () => {
  it("un reabierto cuenta como falla y el plazo corre", () => {
    expect(ESTADOS_DE_HALLAZGO).toContain("reabierto");
    expect(cuentaComoFalla("reabierto")).toBe(true);
    expect(ESTADOS_QUE_CUENTAN_COMO_FALLA).toContain("reabierto");
    expect(ESTADOS_CON_PLAZO).toContain("reabierto");
  });

  it("la situación mide el plazo desde que una persona confirmó la reapertura, no desde la apertura original", async () => {
    const { m, h } = await base();
    const libro = [...Object.values(m.sobres), await sobre("SOB-0040")];
    const r = situacionDeHallazgo(h, libro, {
      escala: m.escala,
      plazos: m.plazos,
      fecha: "2026-10-08",
    });
    if (!r.ok) throw new Error(r.motivo);
    expect(r.situacion.evaluacion.estado).toBe("reabierto");
    // 3 días desde el 2026-10-05, no 51 desde el 2026-08-18.
    expect(r.situacion.plazo).toMatchObject({ dias: 3, estado: "en_plazo" });
    const tarde = situacionDeHallazgo(h, libro, {
      escala: m.escala,
      plazos: m.plazos,
      fecha: "2026-12-30",
    });
    if (!tarde.ok) throw new Error(tarde.motivo);
    expect(tarde.situacion.plazo.estado).toBe("vencido");
  });

  it("una fecha anterior a la reapertura (pero posterior a la apertura) se rechaza con su motivo", async () => {
    const { m, h } = await base();
    const libro = [...Object.values(m.sobres), await sobre("SOB-0040")];
    const r = situacionDeHallazgo(h, libro, {
      escala: m.escala,
      plazos: m.plazos,
      fecha: "2026-10-01",
    });
    // Antes de la reapertura el hallazgo estaba cerrado en la cuenta de ese día, pero esta cuenta lo evalúa con TODO el libro: se pide el corte.
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("fecha_anterior_a_la_reapertura");
  });
});

describe("el vocabulario", () => {
  it("«anterior_al_cierre» y «no_falla» son motivos con nombre propio", () => {
    expect(MOTIVOS_DE_RECHAZO).toContain("anterior_al_cierre");
    expect(MOTIVOS_DE_RECHAZO).toContain("no_falla");
  });

  it("cada candidata que no reabre tras un cierre lleva su motivo para no reabrir", async () => {
    const e = await evaluar([
      await sobre("SOB-0040", {
        veredicto: "superada",
        resultado: resultado(0),
      }),
      await sobre("SOB-0041", { fecha: "2026-09-20" }),
    ]);
    const c40 = e.candidatas.find((c) => c.sobre.id === "SOB-0040")!;
    const c41 = e.candidatas.find((c) => c.sobre.id === "SOB-0041")!;
    expect(c40.noReabre).toEqual(["no_falla"]);
    expect(c41.noReabre).toEqual(["anterior_al_cierre"]);
  });
});

describe("la etiqueta de cada estado vive en UN solo lugar", () => {
  it("cada estado de ESTADOS_DE_HALLAZGO tiene etiqueta en exactamente uno: la instantánea oficial o etiquetas.json", async () => {
    const { m } = await base();
    for (const e of ESTADOS_DE_HALLAZGO)
      expect(
        origenDeLaEtiquetaDeEstado(m.instantanea.catalogo, m.etiquetas, e),
        e,
      ).toHaveLength(1);
  });

  it("«reabierto» sale de etiquetas.json (la huella oficial no se mueve) con símbolo, rol y nombre en los dos idiomas; los demás, de la instantánea", async () => {
    const { m } = await base();
    expect(
      origenDeLaEtiquetaDeEstado(
        m.instantanea.catalogo,
        m.etiquetas,
        "reabierto",
      ),
    ).toEqual(["propias"]);
    expect(
      origenDeLaEtiquetaDeEstado(
        m.instantanea.catalogo,
        m.etiquetas,
        "cerrado",
      ),
    ).toEqual(["instantanea"]);
    const r = etiquetaDeEstadoDeHallazgo(
      m.instantanea.catalogo,
      m.etiquetas,
      "reabierto",
    );
    expect(r.rol).toBe("falla");
    expect(r.simbolo).toBeTruthy();
    expect(r.nombre.es.length).toBeGreaterThan(3);
    expect(r.nombre.en.length).toBeGreaterThan(3);
    // Distinta de «abierto» por forma y por texto, no solo por color (regla dura 12).
    const abierto = etiquetaDeEstadoDeHallazgo(
      m.instantanea.catalogo,
      m.etiquetas,
      "abierto",
    );
    expect(r.simbolo).not.toBe(abierto.simbolo);
    expect(r.nombre.es).not.toBe(abierto.nombre.es);
  });

  it("un estado que ninguno de los dos nombra es un error, no un texto vacío", async () => {
    const { m } = await base();
    expect(() =>
      etiquetaDeEstadoDeHallazgo(
        m.instantanea.catalogo,
        m.etiquetas,
        "inventado" as never,
      ),
    ).toThrow(/inventado/);
  });
});

describe("los ciclos: lo que la cadena dibuja", () => {
  it("sin reaperturas hay un solo ciclo, con su corrección, su cierre y sus re-pruebas", async () => {
    const e = await evaluar([]);
    expect(e.ciclos).toHaveLength(1);
    expect(e.ciclos[0]).toMatchObject({
      reapertura: null,
      correccion: { fecha: "2026-09-10" },
      cierre: { sobre: "SOB-0027" },
    });
    expect(e.ciclos[0]!.candidatas.map((c) => c.sobre.id)).toEqual([
      "SOB-0027",
    ]);
  });

  it("una reapertura parte la historia en dos ciclos: el primero conserva su cierre, el segundo nace de la falla y la falla no cuenta como re-prueba del segundo", async () => {
    const e = await evaluar([await sobre("SOB-0040")]);
    expect(e.ciclos).toHaveLength(2);
    expect(e.ciclos[0]!.cierre?.sobre).toBe("SOB-0027");
    expect(e.ciclos[1]).toMatchObject({
      reapertura: {
        sobre: "SOB-0040",
        fecha: "2026-10-05",
        cierre: "SOB-0027",
      },
      correccion: null,
      cierre: null,
      candidatas: [],
    });
  });

  it("cerrar de nuevo: el segundo ciclo guarda su corrección y su cierre", async () => {
    const { h } = await base();
    const e = await evaluar(
      [
        await sobre("SOB-0040"),
        await sobre("SOB-0041", {
          fecha: "2026-10-20",
          resultado: resultado(0),
          veredicto: "superada",
          confirmacion: firma("2026-10-21"),
        }),
      ],
      [...h.eventos, correccion("2026-10-10")],
    );
    expect(e.ciclos).toHaveLength(2);
    expect(e.ciclos[0]!.correccion?.fecha).toBe("2026-09-10");
    expect(e.ciclos[1]!.correccion?.fecha).toBe("2026-10-10");
    expect(e.ciclos[1]!.cierre?.sobre).toBe("SOB-0041");
    expect(e.ciclos[1]!.candidatas.map((c) => c.sobre.id)).toEqual([
      "SOB-0041",
    ]);
  });
});
