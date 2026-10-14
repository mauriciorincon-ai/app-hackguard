// @vitest-environment node
// La vista de la carga (`/evidencia/carga`): lo que la pantalla dice de cada lote sale del motor (la revisión, el libro
// efectivo, qué fallas abrirían un hallazgo) y no se recalcula en el componente. Con los dos lotes demo —el de garak y el de
// ZAP— y con un lote ya decidido de las dos maneras.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CargaPantalla } from "../../src/components/carga/carga-pantalla";
import { RAIZ } from "./evidencia/ayuda.ts";
import {
  conLoteDecidido,
  conMuestreo,
  mundoDeCarga,
  vistaDeCarga,
} from "./lib/mundo-de-carga";

const sobre = (v: ReturnType<typeof vistaDeCarga>, lote: string, id: string) =>
  v.lotes.find((l) => l.id === lote)!.sobres.find((s) => s.id === id)!;

describe("la vista de la carga con los dos lotes demo", () => {
  const v = vistaDeCarga();

  it("el resumen cuenta los lotes por confirmar, los sobres propuestos, las fallidas y la que no se ejecutó", () => {
    expect(v.resumen.lotesPorConfirmar).toBe(2);
    expect(v.resumen.sobres).toBe(6);
    expect(v.resumen.nFallidas).toBe(2);
    expect(v.resumen.nNoEjecutadas).toBe(1);
    expect(v.resumen.fallidas.nombre).toEqual({ es: "fallidas", en: "failed" });
    expect(v.resumen.fallidas.simbolo).toBe("falla");
  });

  it("los lotes salen en orden de identificador, del mismo activo, con su herramienta y su plan", () => {
    expect(v.lotes.map((l) => l.id)).toEqual(["LOTE-0007", "LOTE-0008"]);
    expect(v.activos.map((a) => a.id)).toEqual(["act-demo-asistente"]);
    expect(v.activos[0]!.huellaDelPlan).toMatch(/^[0-9a-f]{64}$/);
    expect(v.lotes[0]!.herramienta).toEqual({
      nombre: "garak",
      version: "0.17.0",
    });
    expect(v.lotes[1]!.herramienta.version).toBe("2.17.0");
  });

  it("LOTE-0007: una fallida que se revisa siempre, dos superadas en la muestra y nada que abra un hallazgo", () => {
    const l = v.lotes[0]!;
    expect(l.decision).toBe("por_confirmar");
    expect(l.decisionEtiqueta.nombre.es).toBe("Sin confirmar");
    expect(l.obligatorias).toBe(1);
    expect(l.resto).toBe(2);
    expect(l.muestra).toBe(2);
    expect(l.seleccionado).toBe("SOB-0032");
    expect(l.abren).toEqual([]);
    expect(l.reparto.map((r) => [r.veredicto.nombre.es, r.n])).toEqual([
      ["Fallida", 1],
      ["Superada", 2],
    ]);
    expect(l.sobres.map((s) => [s.id, s.revision])).toEqual([
      ["SOB-0031", "muestra"],
      ["SOB-0032", "siempre"],
      ["SOB-0033", "muestra"],
    ]);
    const s32 = sobre(v, "LOTE-0007", "SOB-0032");
    expect(s32.nota?.hallazgo).toBe("HZ-0007");
    expect(s32.nota?.es).toContain("no abre uno nuevo");
    expect(s32.hallazgo?.id).toBe("HZ-0007");
    expect(s32.proporcion).toEqual({ fallidas: 38, evaluadas: 116 });
    expect(s32.selector).toContain("encoding");
    expect(s32.confirmacion).toEqual({ tipo: "propuesta" });
  });

  it("LOTE-0008: SOB-0034 abriría un hallazgo y hay que separarla; el comando ya lo dice", () => {
    const l = v.lotes[1]!;
    expect(l.abren).toEqual(["SOB-0034"]);
    expect(l.comandos.confirmar).toBe(
      "pnpm evidencia:confirmar-lote LOTE-0008 --por <persona> --fecha AAAA-MM-DD --separar SOB-0034 --revisados 3",
    );
    expect(l.comandos.unoPorUno).toBe(
      "pnpm evidencia:confirmar-lote LOTE-0008 --por <persona> --fecha AAAA-MM-DD --revisar-uno-por-uno",
    );
    expect(l.seleccionado).toBe("SOB-0034");
    expect(sobre(v, "LOTE-0008", "SOB-0034").nota?.es).toBe(
      "Al confirmarlo se abre un hallazgo.",
    );
    expect(sobre(v, "LOTE-0008", "SOB-0034").proporcion).toBeNull();
  });

  it("«no ejecutada» no es «superada» y dice por qué no cuenta", () => {
    const s = sobre(v, "LOTE-0008", "SOB-0035");
    expect(s.veredicto.nombre.es).toBe("No ejecutada");
    expect(s.nota?.es).toContain("falta la constancia de que corrió");
    expect(s.revision).toBe("muestra");
  });

  it("SOB-0036 es la re-prueba de HZ-0009: al confirmarla el hallazgo se cierra, y hoy sigue corregido", () => {
    const s = sobre(v, "LOTE-0008", "SOB-0036");
    expect(s.nota?.hallazgo).toBe("HZ-0009");
    expect(s.nota?.es).toContain("al confirmarla, el hallazgo se cierra");
    expect(s.hallazgo?.id).toBe("HZ-0009");
    expect(s.hallazgo?.estado.nombre.es).toBe("Corregido, falta la re-prueba");
  });

  it("B2: la re-prueba SOB-0036 se revisa siempre aunque sea una superada, y el lote cuenta dos obligatorias", () => {
    expect(sobre(v, "LOTE-0008", "SOB-0036").revision).toBe("siempre");
    expect(sobre(v, "LOTE-0008", "SOB-0035").revision).toBe("muestra");
    const l8 = v.lotes[1]!;
    expect(l8.obligatorias).toBe(2);
    expect(l8.rePruebas).toEqual(["SOB-0036"]);
    expect(l8.resto).toBe(1);
    expect(l8.muestra).toBe(1);
    // LOTE-0007 no trae ninguna re-prueba: su cuenta no cambia.
    expect(v.lotes[0]!.rePruebas).toEqual([]);
  });

  it("el plan de muestreo se dice por tramos: 25 o menos, todos; después 22, 25, 26 y 29", () => {
    expect(v.muestreo.filas).toEqual([
      { desde: 1, hasta: 25, muestra: null },
      { desde: 26, hasta: 50, muestra: 22 },
      { desde: 51, hasta: 90, muestra: 25 },
      { desde: 91, hasta: 150, muestra: 26 },
      { desde: 151, hasta: null, muestra: 29 },
    ]);
    expect(v.muestreo.calidadLimite).toBe(10);
    expect(v.muestreo.riesgoDelConsumidor).toBe(5);
    expect(v.muestreo.procedimiento).toContain("2859");
  });

  it("el recorrido de un lote por confirmar termina en «Tu revisión: hasta aquí, nada cuenta»", () => {
    const r = v.lotes[0]!.recorrido;
    expect(r.map((p) => p.titulo.es)).toEqual([
      "Archivo leído",
      "Veredictos sugeridos",
      "Tu revisión",
    ]);
    expect(r[2]!.detalle.es).toBe("Hasta aquí, nada cuenta.");
    expect(r.every((p) => p.simbolo.length > 0 && p.rol.length > 0)).toBe(true);
  });

  it("cada sobre trae el identificador de su veredicto y las cuentas salen de él, no del nombre", () => {
    for (const l of v.lotes)
      for (const s of l.sobres)
        expect([
          "fallida",
          "parcial",
          "no_ejecutada",
          "superada",
          "no_aplicable",
        ]).toContain(s.veredictoId);
    expect(v.lotes.flatMap((l) => l.reparto).reduce((a, r) => a + r.n, 0)).toBe(
      v.resumen.sobres,
    );
  });

  it("la nota del plan de muestreo sale de los datos y es la que la pantalla muestra", () => {
    const m = JSON.parse(
      readFileSync(path.join(RAIZ, "datos/evidencia/muestreo.json"), "utf8"),
    ) as { nota: { es: string; en: string } };
    expect(v.muestreo.nota).toEqual(m.nota);
    const html = renderToStaticMarkup(createElement(CargaPantalla, { v }));
    expect(html).toContain(m.nota.es.slice(0, 60));
    expect(html).toContain(m.nota.en.slice(0, 60));
  });

  it("es una función pura: dos llamadas dan lo mismo", () => {
    expect(JSON.stringify(vistaDeCarga())).toBe(JSON.stringify(v));
  });
});

describe("la vista con un lote ya decidido", () => {
  const confirmado = {
    por: "Revisora demo",
    fecha: "2026-10-03",
    decision: "confirmado" as const,
    revisados: ["SOB-0034", "SOB-0035", "SOB-0036"],
    separados: ["SOB-0034"],
  };

  it("confirmado separando SOB-0034: dos sobres cuentan por el lote y HZ-0009 queda cerrado", async () => {
    const v = vistaDeCarga(await conLoteDecidido("LOTE-0008", confirmado));
    const l = v.lotes[1]!;
    expect(l.decision).toBe("confirmado");
    expect(l.decisionEtiqueta.nombre.es).toBe("Confirmado");
    expect(l.decididoPor).toEqual({
      por: "Revisora demo",
      fecha: "2026-10-03",
    });
    expect(l.cuentanPorElLote).toBe(2);
    expect(l.separados).toEqual(["SOB-0034"]);
    expect(l.abren).toEqual([]);
    expect(l.recorrido[2]!.titulo.es).toBe("Confirmado");
    expect(l.recorrido[2]!.detalle.es).toContain(
      "2 sobres cuentan desde 2026-10-03",
    );
    expect(l.recorrido[2]!.detalle.es).toContain("1 se confirma por separado");
    expect(sobre(v, "LOTE-0008", "SOB-0034").confirmacion).toEqual({
      tipo: "separado",
    });
    expect(sobre(v, "LOTE-0008", "SOB-0036").confirmacion).toEqual({
      tipo: "por_lote",
      lote: "LOTE-0008",
      por: "Revisora demo",
      fecha: "2026-10-03",
    });
    const s36 = sobre(v, "LOTE-0008", "SOB-0036");
    expect(s36.nota?.es).toContain("cerró el hallazgo");
    expect(s36.hallazgo?.estado.nombre.es).toBe("Cerrado por re-prueba");
    expect(v.resumen.lotesPorConfirmar).toBe(1);
  });

  it("«sobres propuestos» no cuenta los que el lote ya confirmó, y las fallidas y la no ejecutada se cuentan sobre los mismos", async () => {
    const antes = vistaDeCarga();
    const v = vistaDeCarga(await conLoteDecidido("LOTE-0008", confirmado));
    const todos = v.lotes.flatMap((l) => l.sobres);
    const propuestos = todos.filter(
      (s) =>
        s.confirmacion.tipo === "propuesta" ||
        s.confirmacion.tipo === "separado",
    );
    expect(todos).toHaveLength(antes.resumen.sobres);
    // dos sobres del lote 8 cuentan por el lote: ya no son una propuesta
    expect(v.resumen.sobres).toBe(antes.resumen.sobres - 2);
    expect(v.resumen.sobres).toBe(propuestos.length);
    expect(v.resumen.lotesPorConfirmar).toBe(1);
    expect(v.resumen.nFallidas).toBe(
      propuestos.filter((s) => s.veredictoId === "fallida").length,
    );
    expect(v.resumen.nNoEjecutadas).toBe(
      propuestos.filter((s) => s.veredictoId === "no_ejecutada").length,
    );
  });

  it("mandado a revisión individual: nadie cuenta y el recorrido lo dice", async () => {
    const v = vistaDeCarga(
      await conLoteDecidido("LOTE-0007", {
        por: "Revisora demo",
        fecha: "2026-10-03",
        decision: "a_revision_individual",
        revisados: [],
        separados: [],
      }),
    );
    const l = v.lotes[0]!;
    expect(l.decision).toBe("a_revision_individual");
    expect(l.cuentanPorElLote).toBe(0);
    expect(l.recorrido[2]!.titulo.es).toBe("A revisión individual");
    expect(l.sobres.every((s) => s.confirmacion.tipo === "propuesta")).toBe(
      true,
    );
  });
});

describe("la revisión que la pantalla muestra es la del motor", () => {
  it("con un plan de muestreo de uno, un sobre del resto queda «fuera de la muestra»", async () => {
    const plan = {
      ...mundoDeCarga.muestreo,
      tramos: [{ hasta: null, muestra: 1 }],
    };
    const v = vistaDeCarga(await conMuestreo(plan));
    const l = v.lotes[0]!;
    expect(l.muestra).toBe(1);
    expect(l.sobres.filter((s) => s.revision === "muestra")).toHaveLength(1);
    const fuera = l.sobres.filter((s) => s.revision === "fuera");
    expect(fuera).toHaveLength(1);
    expect(fuera[0]!.revisionCorta.nombre.es).toBe("Fuera");
    expect(fuera[0]!.revisionLarga.nombre.es).toBe("Fuera de la muestra");
    expect(fuera[0]!.revisionCorta.simbolo).toBe("vacio");
  });

  it("la fallida se revisa siempre aunque el plan pida una muestra de uno", async () => {
    const plan = {
      ...mundoDeCarga.muestreo,
      tramos: [{ hasta: null, muestra: 1 }],
    };
    const v = vistaDeCarga(await conMuestreo(plan));
    expect(sobre(v, "LOTE-0007", "SOB-0032").revision).toBe("siempre");
  });
});
