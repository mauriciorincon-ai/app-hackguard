// @vitest-environment node
// La brecha (Sprint 7): una sola cuenta para el tablero, la brecha, la vista por control y el informe. Estas pruebas fijan lo
// que cuenta y lo que NO cuenta: un «no ejecutada» nunca es evidencia (E-6), una propuesta no mueve ninguna cifra, aceptar un
// riesgo no cierra un hallazgo, y la misma entrada da los mismos bytes en cualquier orden.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  armarBrecha,
  calcularBrecha,
  desviacionDe,
  totalesDe,
  type EntradaDeBrecha,
} from "../../../src/engine/brecha/calcular.ts";
import {
  ESTADOS_DE_CONTROL,
  UmbralesDeBrecha,
} from "../../../src/engine/brecha/esquemas.ts";
import type {
  Sobre,
  SobreEfectivo,
} from "../../../src/engine/evidencia/esquemas.ts";
import { libroEfectivo } from "../../../src/engine/lotes/efectivo.ts";
import { loteConfirmado } from "../lotes/ayuda.ts";
import { mundoDeLotes } from "../lotes/ayuda.ts";
import { entradaDemo, mundoDeHallazgos } from "../lib/mundo-de-brecha";

const ENTRADA = entradaDemo();

/** Los sobres tal como están en sus archivos. Vale porque en el demo ningún lote está confirmado: toda confirmación es individual. */
const sobresDelArchivo = (libro: readonly SobreEfectivo[]): Sobre[] =>
  libro.map((s) => ({
    ...s,
    confirmacion:
      s.confirmacion === null
        ? null
        : {
            por: s.confirmacion.por,
            fecha: s.confirmacion.fecha,
            modo: "individual" as const,
          },
  }));

/** La entrada del demo con el libro cambiado: para ver qué mueve cada sobre. */
const con = (cambios: Partial<EntradaDeBrecha>): EntradaDeBrecha => ({
  ...ENTRADA,
  ...cambios,
});
const fila = (
  b: ReturnType<typeof armarBrecha>,
  activo: string,
  prueba: string,
) => b.filas.find((f) => f.activo === activo && f.prueba === prueba)!;

describe("la brecha del demo, tal como la calcula el motor", () => {
  const b = armarBrecha(ENTRADA);

  it("cuenta lo planeado, lo ejecutado y lo que falló en el demo (cifras tomadas de la corrida)", () => {
    expect(b.consulta).toBe("2026-10-05");
    expect(b.resumen).toEqual({
      planeadas: 25,
      ejecutadas: 8,
      superadas: 5,
      fallidas: 3,
      no_ejecutadas: 17,
    });
    expect(b.porActivo).toEqual([
      {
        activo: "act-demo-asistente",
        totales: {
          planeadas: 14,
          ejecutadas: 6,
          superadas: 3,
          fallidas: 3,
          no_ejecutadas: 8,
        },
      },
      {
        activo: "act-demo-clasificador",
        totales: {
          planeadas: 11,
          ejecutadas: 2,
          superadas: 2,
          fallidas: 0,
          no_ejecutadas: 9,
        },
      },
      // Sin alcance autorizado no hay plan: el activo se cuenta, sin filas.
      { activo: "act-demo-portal", totales: null },
    ]);
    expect(b.problemas).toEqual([]);
  });

  it("una sola cuenta: la suma por activo y la suma por familia son el resumen", () => {
    const suma = (xs: { planeadas: number }[]) =>
      xs.reduce((n, t) => n + t.planeadas, 0);
    expect(
      suma(b.porActivo.flatMap((a) => (a.totales ? [a.totales] : []))),
    ).toBe(b.resumen.planeadas);
    expect(suma(b.porFamilia.map((f) => f.totales))).toBe(b.resumen.planeadas);
    for (const t of [b.resumen, ...b.porFamilia.map((f) => f.totales)]) {
      expect(t.ejecutadas + t.no_ejecutadas).toBe(t.planeadas);
      expect(t.superadas + t.fallidas).toBe(t.ejecutadas);
    }
  });

  it("los siete controles aplicables salen de la cobertura de los planes, con su estado", () => {
    expect(b.controles.map((c) => [c.id, c.estado, c.filas.length])).toEqual([
      ["iso42001-A.6.2.2", "sin_evidencia", 1],
      ["iso42001-A.6.2.4", "con_fallas", 9],
      ["iso42001-A.6.2.6", "con_fallas", 3],
      ["iso42001-A.6.2.8", "sin_evidencia", 1],
      ["iso42001-A.7.4", "sin_evidencia", 0],
      ["iso42001-A.7.5", "sin_evidencia", 0],
      ["iso42001-A.9.2", "sin_evidencia", 3],
      ["iso42001-A.9.4", "con_evidencia_vigente", 2],
    ]);
    // Un control sin prueba en el plan es aplicable y sin evidencia, no ausente.
    const sinPrueba = b.controles.find((c) => c.id === "iso42001-A.7.4")!;
    expect(sinPrueba.filas).toEqual([]);
    expect(sinPrueba.ultima).toBeNull();
    expect(b.sinControl).toHaveLength(6);
  });

  it("todos los estados de control que emite el motor tienen su etiqueta en datos/estados.json, y ninguna sobra", () => {
    const estados = JSON.parse(readFileSync("datos/estados.json", "utf8")) as {
      vocabularios: { id: string; estados: { id: string }[] }[];
    };
    const ids = estados.vocabularios
      .find((v) => v.id === "estado_de_control")!
      .estados.map((e) => e.id);
    expect([...ESTADOS_DE_CONTROL].sort()).toEqual([...ids].sort());
    for (const c of b.controles) expect(ids).toContain(c.estado);
  });

  it("un hallazgo vencido se cuenta con sus días de atraso; el riesgo aceptado no pide trabajo pero sigue siendo falla", () => {
    expect(b.vencidos).toEqual(["HZ-0007"]);
    const hz7 = b.hallazgos.find((h) => h.id === "HZ-0007")!;
    expect(hz7.plazo).toMatchObject({ estado: "vencido", atraso: 19 });
    expect(b.aceptados).toEqual(["HZ-0005"]);
    const hz5 = b.hallazgos.find((h) => h.id === "HZ-0005")!;
    expect(hz5.cuentaComoFalla).toBe(true);
    expect(hz5.pideTrabajo).toBe(false);
    expect(b.vencidos).not.toContain("HZ-0005");
    // El control del riesgo aceptado sigue con fallas: aceptar no cierra.
    expect(
      b.controles.find((c) => c.id === "iso42001-A.6.2.6")!.fallas,
    ).toContain("HZ-0005");
    // Un hallazgo cerrado ya no cuenta como falla de ningún control.
    expect(b.hallazgos.find((h) => h.id === "HZ-0003")!.cuentaComoFalla).toBe(
      false,
    );
    for (const c of b.controles) expect(c.fallas).not.toContain("HZ-0003");
  });

  it("«no detectado» no es verificado: una prueba cuyo último sobre es no_ejecutada no es evidencia", () => {
    const f = fila(b, "act-demo-asistente", "PR-SW-XSS-001");
    expect(f.veredicto).toBe("no_ejecutada");
    expect(f.ejecutada).toBe(false);
    expect(f.edad).toBeNull();
    expect(f.desviacion).toEqual({ tipo: "no_medible" });
    // Cuenta como «no ejecutada», jamás como superada.
    expect(b.filas.filter((x) => x.veredicto === "superada")).not.toContain(f);
  });

  it("cada fila dice su estado con la misma regla que el control: sus fallas primero, luego su evidencia", () => {
    const f = (prueba: string) => fila(b, "act-demo-asistente", prueba);
    // Con hallazgo sin cerrar (abierto, o el riesgo aceptado): con fallas.
    expect(f("PR-IA-ENC-002").estado).toBe("con_fallas");
    expect(f("PR-AG-LIM-001").estado).toBe("con_fallas");
    // Un «no ejecutada» y una sin sobre no son evidencia.
    expect(f("PR-SW-XSS-001").estado).toBe("sin_evidencia");
    expect(
      b.filas
        .filter((x) => x.veredicto === null)
        .every((x) => x.estado === "sin_evidencia"),
    ).toBe(true);
    // Con resultado superado y reciente: con evidencia vigente.
    expect(f("PR-AG-PERM-001").estado).toBe("con_evidencia_vigente");
    // Y la re-prueba se nombra en la fila: el último sobre de PINJ-001 cierra HZ-0003.
    expect(f("PR-IA-PINJ-001").repruebaDe).toBe("HZ-0003");
    expect(f("PR-IA-ENC-002").repruebaDe).toBeNull();
  });

  it("una prueba sin sobre confirmado se dice «sin medir», no «ninguna desviación»", () => {
    const f = b.filas.find((x) => x.veredicto === null)!;
    expect(f.ejecutada).toBe(false);
    expect(f.desviacion).toEqual({ tipo: "sin_medir" });
    expect(f.sobre).toBeNull();
  });

  it("lo que espera confirmación se ve, pero no mueve ninguna cifra", () => {
    // SOB-0036 (propuesta) es la re-prueba de la prueba CSP: la fila la muestra aparte y su último confirmado sigue siendo SOB-0021.
    const f = fila(b, "act-demo-asistente", "PR-SW-CSP-001");
    expect(f.propuestos).toEqual(["SOB-0036"]);
    expect(f.sobre).toBe("SOB-0021");
    expect(b.porConfirmar).toEqual({ lotes: 2, sobres: 6 });
    // Sin ninguna propuesta en el libro las cifras de cobertura son las mismas.
    const sinPropuestas = armarBrecha(
      con({ libro: ENTRADA.libro.filter((s) => s.confirmacion !== null) }),
    );
    expect(sinPropuestas.resumen).toEqual(b.resumen);
    expect(sinPropuestas.controles.map((c) => c.estado)).toEqual(
      b.controles.map((c) => c.estado),
    );
  });
});

describe("qué mueve a la brecha", () => {
  it("un lote confirmado cuenta como sus sobres confirmados, y se confirma una sola vez", async () => {
    const m = await mundoDeLotes();
    const lote = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      separados: [],
    });
    const libro = libroEfectivo(sobresDelArchivo(mundoDeHallazgos.libro), [
      lote,
    ]) as SobreEfectivo[];
    const antes = armarBrecha(ENTRADA);
    const despues = armarBrecha(
      con({ libro, lotes: [lote, m.lotes["LOTE-0008"]!] }),
    );
    expect(despues.porConfirmar).toEqual({ lotes: 1, sobres: 3 });
    expect(antes.porConfirmar.sobres - despues.porConfirmar.sobres).toBe(3);
    // Los tres sobres del lote ahora son el último confirmado de su fila.
    for (const id of ["SOB-0031", "SOB-0032", "SOB-0033"])
      expect(despues.filas.some((f) => f.sobre === id)).toBe(true);
    expect(despues.resumen.ejecutadas).toBeGreaterThan(
      antes.resumen.ejecutadas,
    );
  });

  it("una re-prueba confirmada que cierra su hallazgo lo saca de las fallas del control", async () => {
    const m = await mundoDeLotes();
    const lote = await loteConfirmado(m.lotes["LOTE-0008"]!, {
      separados: ["SOB-0034"],
    });
    const libro = libroEfectivo(sobresDelArchivo(mundoDeHallazgos.libro), [
      lote,
    ]) as SobreEfectivo[];
    const antes = armarBrecha(ENTRADA);
    const despues = armarBrecha(
      con({ libro, lotes: [m.lotes["LOTE-0007"]!, lote] }),
    );
    expect(
      antes.hallazgos.find((h) => h.id === "HZ-0009")!.cuentaComoFalla,
    ).toBe(true);
    expect(despues.hallazgos.find((h) => h.id === "HZ-0009")!.estado).toBe(
      "cerrado",
    );
    expect(
      despues.hallazgos.find((h) => h.id === "HZ-0009")!.cuentaComoFalla,
    ).toBe(false);
    for (const c of despues.controles)
      expect(c.fallas).not.toContain("HZ-0009");
  });

  it("una falla cuyo hallazgo una persona cerró por eliminación o «no reproducible» sigue siendo una fila fallida, pero ya no hace «con fallas» al control (ADR-010 §4; S7-M1)", () => {
    const antes = armarBrecha(ENTRADA);
    const f0 = antes.filas.find((f) => f.hallazgo === "HZ-0007")!;
    expect(f0.veredicto).toBe("fallida");
    for (const tipo of ["eliminacion", "no_reproducible"] as const) {
      const hallazgos = ENTRADA.hallazgos.map((h) =>
        h.id === "HZ-0007"
          ? {
              ...h,
              eventos: [
                ...h.eventos,
                {
                  tipo,
                  fecha: "2026-10-05",
                  por: "Ana",
                  justificacion: {
                    es: "decisión de la persona",
                    en: "the person's decision",
                  },
                },
              ],
            }
          : h,
      );
      const despues = armarBrecha(con({ hallazgos }));
      expect(
        despues.hallazgos.find((h) => h.id === "HZ-0007")!.cuentaComoFalla,
      ).toBe(false);
      const fila0 = fila(despues, f0.activo, f0.prueba);
      // Lo dice el último sobre: la cobertura la cuenta como fallida. Lo que cambia es el hallazgo y el estado del control.
      expect(fila0.veredicto).toBe("fallida");
      expect(fila0.hallazgo).toBeNull();
      expect(despues.resumen.fallidas).toBe(antes.resumen.fallidas);
      for (const c of despues.controles.filter((x) =>
        f0.controles.includes(x.id),
      )) {
        expect(c.fallas).not.toContain("HZ-0007");
      }
      // Incondicional (S9-E-B2): el control de esa falla, que no tiene otro hallazgo, ya no queda «con fallas». Si los datos cambian y esto
      // deja de ser cierto, la prueba falla en voz alta en vez de saltarse la aserción.
      expect(f0.controles).toEqual(["iso42001-A.6.2.4"]);
      const control = despues.controles.find(
        (x) => x.id === "iso42001-A.6.2.4",
      )!;
      expect(control.fallas).toEqual([]);
      expect(control.estado).not.toBe("con_fallas");
    }
  });

  it("si todas las pruebas de un control quedan en «no ejecutada», el control queda sin evidencia", () => {
    const base = armarBrecha(ENTRADA);
    const control = base.controles.find((c) => c.id === "iso42001-A.9.4")!;
    expect(control.estado).toBe("con_evidencia_vigente");
    const suyas = new Set(control.filas.map((f) => `${f.activo}/${f.prueba}`));
    const libro = ENTRADA.libro.map((s) =>
      s.confirmacion !== null && suyas.has(`${s.activo}/${s.prueba}`)
        ? {
            ...s,
            veredicto: "no_ejecutada" as const,
            resultado: { ...s.resultado, ejecutada: false },
          }
        : s,
    );
    const b = armarBrecha(con({ libro }));
    // Sin ningún resultado ejecutado, «no detectado» no cuenta como evidencia: el control queda sin ella.
    expect(b.controles.find((c) => c.id === "iso42001-A.9.4")!.estado).toBe(
      "sin_evidencia",
    );
    expect(
      b.controles.find((c) => c.id === "iso42001-A.9.4")!.ultima,
    ).toBeNull();
    for (const f of b.filas.filter((x) => suyas.has(`${x.activo}/${x.prueba}`)))
      expect(f.ejecutada).toBe(false);
  });

  it("un sobre que otro confirmado corrige ya no vale", () => {
    const base = ENTRADA.libro.find((s) => s.id === "SOB-0027")!; // PINJ-001 superada
    const corrector: SobreEfectivo = {
      ...base,
      id: "SOB-9001",
      corrige: "SOB-0027",
      veredicto: "fallida",
      fecha: "2026-10-02",
      resultado: { ...base.resultado, fallidas: 3 },
    };
    const b = armarBrecha(con({ libro: [...ENTRADA.libro, corrector] }));
    expect(fila(b, base.activo, base.prueba).sobre).toBe("SOB-9001");
    expect(fila(b, base.activo, base.prueba).veredicto).toBe("fallida");
  });

  it("una fecha de consulta anterior a la evidencia es un error, no una cifra", () => {
    expect(() => armarBrecha(entradaDemo("2026-01-01"))).toThrow(RangeError);
  });

  it("un hallazgo que no se puede situar queda en los problemas, nunca oculto ni inventado", () => {
    const huerfano = { ...ENTRADA.hallazgos[0]!, sobre_origen: "SOB-9999" };
    const b = armarBrecha(con({ hallazgos: [...ENTRADA.hallazgos, huerfano] }));
    expect(b.problemas).toHaveLength(1);
    expect(b.problemas[0]).toContain("sobre_origen_inexistente");
  });
});

describe("determinismo de la brecha", () => {
  it("la misma entrada da la misma huella, en cualquier orden de entrada", async () => {
    const a = await calcularBrecha(ENTRADA);
    const alReves = await calcularBrecha(
      con({
        libro: [...ENTRADA.libro].reverse(),
        hallazgos: [...ENTRADA.hallazgos].reverse(),
        activos: [...ENTRADA.activos].reverse(),
        pruebas: [...ENTRADA.pruebas].reverse(),
        lotes: [...ENTRADA.lotes].reverse(),
      }),
    );
    expect(alReves.huella).toBe(a.huella);
    expect(JSON.stringify(alReves)).toBe(JSON.stringify(a));
    expect(a.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it("las familias salen en el orden del catálogo: es una lista ordenada, no un conjunto", () => {
    const b = armarBrecha(ENTRADA);
    expect(b.porFamilia.map((f) => f.familia)).toEqual(
      ENTRADA.familias.map((f) => f.id),
    );
    const alReves = armarBrecha(
      con({ familias: [...ENTRADA.familias].reverse() }),
    );
    expect(alReves.porFamilia.map((f) => f.familia)).toEqual(
      [...ENTRADA.familias].reverse().map((f) => f.id),
    );
  });

  it("cambiar una cifra cambia la huella", async () => {
    const a = await calcularBrecha(ENTRADA);
    const otra = await calcularBrecha(entradaDemo("2026-10-06"));
    expect(otra.huella).not.toBe(a.huella);
  });
});

describe("las piezas de la cuenta", () => {
  it("totalesDe cuenta las parciales entre las fallidas", () => {
    expect(
      totalesDe([
        { veredicto: "superada", ejecutada: true },
        { veredicto: "fallida", ejecutada: true },
        { veredicto: "parcial", ejecutada: true },
        { veredicto: "no_ejecutada", ejecutada: false },
        { veredicto: null, ejecutada: false },
      ]),
    ).toEqual({
      planeadas: 5,
      ejecutadas: 3,
      superadas: 1,
      fallidas: 2,
      no_ejecutadas: 2,
    });
  });

  it("desviacionDe: sin sobre, no detectado, fallas, alertas y límite", () => {
    const s = (cambios: Record<string, unknown>) =>
      ({
        veredicto: "superada",
        resultado: {
          ejecutada: true,
          evaluadas: null,
          fallidas: null,
          alertas: null,
          metrica: null,
        },
        ...cambios,
      }) as unknown as SobreEfectivo;
    const r = (resultado: Record<string, unknown>, veredicto = "superada") =>
      s({
        veredicto,
        resultado: {
          ejecutada: true,
          evaluadas: null,
          fallidas: null,
          alertas: null,
          metrica: null,
          ...resultado,
        },
      });
    expect(desviacionDe(null)).toEqual({ tipo: "sin_medir" });
    expect(desviacionDe(r({ ejecutada: false }, "no_ejecutada"))).toEqual({
      tipo: "no_medible",
    });
    expect(desviacionDe(r({ ejecutada: false }, "superada"))).toEqual({
      tipo: "no_medible",
    });
    expect(desviacionDe(r({}, "no_aplicable"))).toEqual({
      tipo: "no_aplicable",
    });
    expect(desviacionDe(r({ evaluadas: 20, fallidas: 3 }, "fallida"))).toEqual({
      tipo: "fallas",
      n: 3,
    });
    expect(desviacionDe(r({ evaluadas: 20, fallidas: 0 }))).toEqual({
      tipo: "ninguna",
    });
    expect(desviacionDe(r({ alertas: 2 }, "fallida"))).toEqual({
      tipo: "alertas",
    });
    expect(desviacionDe(r({ alertas: 0 }))).toEqual({ tipo: "ninguna" });
    const metrica = (valor: number, sentido: "maximo" | "minimo") => ({
      metrica: { nombre: "m", valor, umbral: 5, sentido },
    });
    expect(desviacionDe(r(metrica(4, "maximo")))).toEqual({
      tipo: "dentro_del_limite",
    });
    expect(desviacionDe(r(metrica(6, "maximo"), "fallida"))).toEqual({
      tipo: "fuera_del_limite",
    });
    expect(desviacionDe(r(metrica(6, "minimo")))).toEqual({
      tipo: "dentro_del_limite",
    });
    expect(desviacionDe(r({}, "fallida"))).toEqual({
      tipo: "fuera_del_limite",
    });
    expect(desviacionDe(r({}))).toEqual({ tipo: "dentro_del_limite" });
  });

  it("los umbrales de la brecha son un dato validado, con la evidencia antigua a los 180 días", () => {
    const u = UmbralesDeBrecha.parse(
      JSON.parse(readFileSync("datos/brecha/umbrales.json", "utf8")),
    );
    expect(u.evidencia_antigua).toBe(180);
    expect(() =>
      UmbralesDeBrecha.parse({ ...u, evidencia_antigua: 0 }),
    ).toThrow();
    expect(() => UmbralesDeBrecha.parse({ ...u, extra: 1 })).toThrow();
  });
});
