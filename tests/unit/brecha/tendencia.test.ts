// La tendencia de la brecha: la misma brecha en varias fechas de corte, y lo que cambió control por control. Aquí se prueba lo que
// la hace honesta: UNA cuenta (cada punto es la brecha de siempre armada sobre el libro de ese día, comparada contra una entrada
// armada a mano en este archivo), lo que todavía no pasaba no cuenta, y un hallazgo reabierto es una regresión del control.
import { describe, expect, it } from "vitest";
import { armarBrecha } from "../../../src/engine/brecha/calcular.ts";
import type { EntradaDeBrecha } from "../../../src/engine/brecha/calcular.ts";
import {
  armarTendencia,
  calcularTendencia,
  entradaEnElCorte,
  fechasDeCorte,
} from "../../../src/engine/brecha/tendencia.ts";
import { entradaDemo } from "../lib/mundo-de-brecha";

const E = entradaDemo();

/** La entrada de un corte armada A MANO (sin `entradaEnElCorte`): el oráculo contra el que se compara la tendencia. */
function aMano(corte: string): EntradaDeBrecha {
  const libro = E.libro
    .filter((s) => s.fecha <= corte)
    .map((s) =>
      s.confirmacion !== null && s.confirmacion.fecha > corte
        ? { ...s, confirmacion: null }
        : s,
    );
  return {
    ...E,
    consulta: corte,
    pruebas: E.pruebas.map((p) => ({
      ...p,
      fecha_verificacion:
        p.fecha_verificacion > corte ? corte : p.fecha_verificacion,
    })),
    libro,
    hallazgos: E.hallazgos
      .filter((h) =>
        libro.some((s) => s.id === h.sobre_origen && s.confirmacion !== null),
      )
      .map((h) => ({
        ...h,
        eventos: h.eventos.filter((ev) => ev.fecha <= corte),
      })),
  };
}

describe("fechasDeCorte", () => {
  it("son los días en que algo cambió en el libro, hasta la consulta, sin repetir y en orden", () => {
    const cortes = fechasDeCorte(E);
    expect(cortes).toEqual([...new Set(cortes)].sort());
    expect(cortes.at(-1)).toBe(E.consulta);
    for (const s of E.libro)
      if (s.confirmacion !== null && s.confirmacion.fecha <= E.consulta)
        expect(cortes, s.id).toContain(s.confirmacion.fecha);
    for (const h of E.hallazgos)
      for (const ev of h.eventos)
        if (ev.fecha <= E.consulta) expect(cortes, h.id).toContain(ev.fecha);
  });

  it("lo posterior a la consulta no es un corte, y la consulta lo es aunque nada pasara ese día", () => {
    const antes = { ...E, consulta: "2026-09-15" };
    const cortes = fechasDeCorte(antes);
    expect(cortes.at(-1)).toBe("2026-09-15");
    expect(cortes.every((c) => c <= "2026-09-15")).toBe(true);
    expect(cortes).not.toContain("2026-09-18");
  });

  it("no mira el reloj: la misma entrada da las mismas fechas", () => {
    expect(fechasDeCorte(E)).toEqual(fechasDeCorte(E));
  });
});

describe("una cuenta, un cálculo: cada punto es la brecha de siempre en su corte", () => {
  const t = armarTendencia(E);

  it("el último punto es la brecha de la consulta, sin tocarla", () => {
    const b = armarBrecha(E);
    const ultimo = t.puntos.at(-1)!;
    expect(ultimo.corte).toBe(E.consulta);
    expect(ultimo.resumen).toEqual(b.resumen);
    expect(ultimo.hallazgos).toEqual(
      b.hallazgos.map((h) => ({ id: h.id, estado: h.estado })),
    );
    expect(ultimo.controles).toEqual(
      b.controles.map((c) => ({ id: c.id, estado: c.estado })),
    );
    expect(ultimo.vencidos).toBe(b.vencidos.length);
  });

  it.each(t.cortes)(
    "%s: los números y los controles son los de una brecha armada a mano",
    (corte) => {
      const p = t.puntos[t.cortes.indexOf(corte)]!;
      const b = armarBrecha(aMano(corte));
      expect(p.resumen).toEqual(b.resumen);
      expect(p.vencidos).toBe(b.vencidos.length);
      expect(p.controles).toEqual(
        b.controles.map((c) => ({ id: c.id, estado: c.estado })),
      );
      const de = (e: string) =>
        b.hallazgos.filter((h) => h.estado === e).length;
      expect(p.reabiertos).toBe(de("reabierto"));
      expect(p.aceptados).toBe(de("aceptado_con_riesgo"));
      // Los cuatro grupos reparten a todos los hallazgos: ninguno se cuenta dos veces ni se pierde.
      expect(p.abiertos + p.reabiertos + p.aceptados + p.cerrados).toBe(
        b.hallazgos.length,
      );
      expect(p.controlesConFalla).toBe(
        b.controles.filter((c) => c.estado === "con_fallas").length,
      );
    },
  );

  it("no tiene problemas que esconder en la demo", () => {
    expect(t.problemas).toEqual([]);
  });
});

describe("lo que todavía no pasaba, no cuenta", () => {
  it("un sobre confirmado después del corte está sin confirmar ese día, aunque su fecha sea anterior", () => {
    const tarde = {
      ...E,
      libro: E.libro.map((s) =>
        s.id === "SOB-0016" && s.confirmacion !== null
          ? { ...s, confirmacion: { ...s.confirmacion, fecha: "2026-09-02" } }
          : s,
      ),
    };
    const base = armarTendencia(E);
    const t = armarTendencia(tarde);
    const a94 = (x: typeof t) =>
      x.controles.find((c) => c.id === "iso42001-A.9.4")!;
    expect(a94(base).movimientos[0]!.corte).toBe("2026-08-20");
    expect(a94(t).movimientos[0]!.corte).toBe("2026-09-02");
    expect(t.cortes).toContain("2026-09-02");
  });

  it("un evento del hallazgo posterior al corte todavía no pasó: la corrección de HZ-0011 no se ve el 2026-09-12", () => {
    const corte = entradaEnElCorte(E, "2026-09-12");
    const hz = corte.hallazgos.find((h) => h.id === "HZ-0011")!;
    expect(hz.eventos).toEqual([]);
    expect(E.hallazgos.find((h) => h.id === "HZ-0011")!.eventos).toHaveLength(
      1,
    );
    // Y el hallazgo cuyo sobre de origen aún no estaba confirmado todavía no existía.
    expect(
      entradaEnElCorte(E, "2026-09-01").hallazgos.map((h) => h.id),
    ).not.toContain("HZ-0011");
  });

  it("la ficha del catálogo es la de hoy: no se lee en un corte y no hace fallar la brecha de un día anterior", () => {
    const antes = entradaEnElCorte(E, "2026-03-21");
    expect(
      antes.pruebas.every((p) => p.fecha_verificacion <= "2026-03-21"),
    ).toBe(true);
    expect(() => armarBrecha(antes)).not.toThrow();
    // La entrada original no se toca.
    expect(E.pruebas.some((p) => p.fecha_verificacion > "2026-03-21")).toBe(
      true,
    );
  });
});

describe("control por control: mejoró, empeoró, igual, y qué lo movió", () => {
  const t = armarTendencia(E);
  const control = (id: string) => t.controles.find((c) => c.id === id)!;

  it("A.6.2.8 cuenta la historia de HZ-0011: falla, mejora al cerrarse y vuelve a empeorar al reabrirse (regresión)", () => {
    const c = control("iso42001-A.6.2.8");
    expect(c.movimientos.map((m) => [m.corte, m.de, m.a, m.sentido])).toEqual([
      ["2026-09-12", "sin_evidencia", "con_fallas", "empeoro"],
      ["2026-09-25", "con_fallas", "con_evidencia_vigente", "mejoro"],
      ["2026-10-01", "con_evidencia_vigente", "con_fallas", "empeoro"],
    ]);
    expect(c.movimientos.map((m) => m.hallazgos)).toEqual([
      [{ id: "HZ-0011", de: null, a: "abierto" }],
      [{ id: "HZ-0011", de: "corregido", a: "cerrado" }],
      [{ id: "HZ-0011", de: "cerrado", a: "reabierto" }],
    ]);
    expect(c.regresiones).toEqual([
      { corte: "2026-10-01", hallazgo: "HZ-0011" },
    ]);
    expect(c.hallazgoQueLoMovio).toBe("HZ-0011");
    expect(c.sentido).toBe("empeoro");
  });

  it("un control que mejora sin que un hallazgo lo mueva lo dice: fue la evidencia (A.9.4)", () => {
    const c = control("iso42001-A.9.4");
    expect(c.sentido).toBe("mejoro");
    expect(c.movimientos).toEqual([
      {
        corte: "2026-08-20",
        de: "sin_evidencia",
        a: "con_evidencia_vigente",
        sentido: "mejoro",
        hallazgos: [],
      },
    ]);
    expect(c.hallazgoQueLoMovio).toBeNull();
    expect(c.regresiones).toEqual([]);
  });

  it("un control que no cambió sale «igual», con un estado por corte", () => {
    for (const c of t.controles.filter((x) => x.movimientos.length === 0)) {
      expect(c.sentido, c.id).toBe("igual");
      expect(c.estados).toHaveLength(t.cortes.length);
    }
  });

  it("el resumen suma los controles y la regresión es solo la de los que se reabrieron", () => {
    expect(t.resumen.mejoraron + t.resumen.empeoraron + t.resumen.igual).toBe(
      t.controles.length,
    );
    expect(t.resumen.conRegresion).toBe(
      t.controles.filter((c) => c.regresiones.length > 0).length,
    );
    expect(t.resumen.conRegresion).toBe(1);
  });

  it("sin la reapertura (la re-prueba que falla no existe) no hay regresión y A.6.2.8 termina mejor", () => {
    const sinReapertura = {
      ...E,
      libro: E.libro.filter((s) => s.id !== "SOB-0039"),
    };
    const c = armarTendencia(sinReapertura).controles.find(
      (x) => x.id === "iso42001-A.6.2.8",
    )!;
    expect(c.regresiones).toEqual([]);
    expect(c.sentido).toBe("mejoro");
  });
});

describe("determinismo y entradas inválidas", () => {
  it("la misma entrada da los mismos bytes y la misma huella, pida los cortes como los pida", async () => {
    const a = await calcularTendencia(E);
    const b = await calcularTendencia(E, [...a.cortes].reverse());
    const c = await calcularTendencia(E, [...a.cortes, ...a.cortes]);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(a.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(a)).toBe(JSON.stringify(await calcularTendencia(E)));
  });

  it("un corte posterior a la consulta, o ninguno, es un error de quien pregunta", () => {
    expect(() => armarTendencia(E, ["2099-01-01"])).toThrow(
      /posterior a la fecha de consulta/,
    );
    expect(() => armarTendencia(E, [])).toThrow(/al menos un corte/);
  });

  it("un solo corte da una tendencia sin movimientos", () => {
    const t = armarTendencia(E, [E.consulta]);
    expect(t.cortes).toEqual([E.consulta]);
    expect(t.controles.every((c) => c.movimientos.length === 0)).toBe(true);
    expect(t.resumen.igual).toBe(t.controles.length);
  });
});
