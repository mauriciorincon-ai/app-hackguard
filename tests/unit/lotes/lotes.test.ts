// @vitest-environment node
// El motor de lotes (ADR-009): armar un lote desde lo que un adaptador leyó, qué revisa una persona antes de confirmar,
// la confirmación (con cada motivo de bloqueo), el libro efectivo que presta esa confirmación a los sobres en memoria y
// el validador con cada una de sus reglas. Las pruebas de los lotes demo son el recorrido que la pantalla muestra.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADAPTADOR_DE_GARAK } from "../../../src/engine/adaptadores/garak.ts";
import type {
  Adaptador,
  Corrida,
} from "../../../src/engine/adaptadores/interfaz.ts";
import {
  ADAPTADORES,
  adaptadorDe,
} from "../../../src/engine/adaptadores/index.ts";
import { ADAPTADOR_DE_ZAP } from "../../../src/engine/adaptadores/zap.ts";
import type { Veredicto } from "../../../src/engine/evidencia/esquemas.ts";
import { sha256 } from "../../../src/engine/huella.ts";
import {
  confirmar,
  huellaDelLibro,
} from "../../../src/engine/evidencia/libro.ts";
import { evaluarHallazgo } from "../../../src/engine/hallazgos/ciclo.ts";
import { decidirApertura } from "../../../src/engine/hallazgos/apertura.ts";
import {
  armarLote,
  siguienteIdDeLote,
  type EntradaDeLote,
} from "../../../src/engine/lotes/armar.ts";
import { confirmarLote } from "../../../src/engine/lotes/confirmar.ts";
import {
  confirmadosPorLote,
  libroEfectivo,
} from "../../../src/engine/lotes/efectivo.ts";
import type { Lote } from "../../../src/engine/lotes/esquemas.ts";
import {
  resellarLote,
  sinHuellasDeLote,
} from "../../../src/engine/lotes/huellas.ts";
import { revisionDelLote } from "../../../src/engine/lotes/revision.ts";
import {
  REGLAS_DE_LOTE,
  fallasSinHallazgo,
  validarLotes,
} from "../../../src/engine/lotes/validar.ts";
import { con } from "../evidencia/ayuda.ts";
import {
  ASISTENTE,
  archivoDeLote,
  contextoDeLotes,
  copia,
  erroresDe,
  loteConfirmado,
  loteEditado,
  loteSellado,
  mundoDeLotes,
  reglasDe,
  rutaDeLote,
  rutaPrivadaDeLote,
  RAIZ,
} from "./ayuda.ts";

const FIXTURES = path.join(RAIZ, "tests/fixtures/adaptadores");
const leerFixture = (n: string) => readFileSync(path.join(FIXTURES, n), "utf8");
const GARAK = leerFixture("garak-0.17.0.report.redactado.jsonl");
const ZAP_PLUS = leerFixture("zap-traditional-json-plus.derivada.json");

/** Las reglas del validador que algún caso de este archivo hizo saltar: al final, deben ser todas. */
const vistas = new Set<string>();
const anotar = (r: { hallazgos: { regla: string }[] }) => {
  for (const h of r.hallazgos) vistas.add(h.regla);
};

function corridaDe(
  adaptador: Adaptador,
  texto: string,
  minima: string,
): Corrida {
  const l = adaptador.leer(texto, minima);
  if (!l.ok) throw new Error(`${l.motivo}: ${l.detalle}`);
  return l.corrida;
}

async function entradaDe(
  adaptador: Adaptador,
  corrida: Corrida,
  cambios: Partial<EntradaDeLote> = {},
): Promise<EntradaDeLote> {
  const m = await mundoDeLotes();
  return {
    adaptador,
    corrida,
    archivo: {
      nombre: "reporte.sintetico",
      huella: await sha256("un-reporte-de-prueba"),
    },
    activo: ASISTENTE,
    origen: "propio",
    emitido: m.contexto.planes[ASISTENTE]!,
    pruebas: m.contexto.pruebas,
    idDeLote: "LOTE-0009",
    existentes: Object.values(m.sobres),
    ejecutadoPor: "Operadora de prueba",
    fecha: null,
    zonaHoraria: null,
    ...cambios,
  };
}

async function armadoOk(entrada: EntradaDeLote) {
  const r = await armarLote(entrada);
  if (!r.ok) throw new Error(`${r.motivo} ${r.prueba ?? ""}`);
  return r;
}

describe("armar un lote desde el reporte de garak", () => {
  it("un sobre por cada prueba del paquete que corre garak, con el veredicto que calcula su regla", async () => {
    const c = corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0");
    const { lote, sobres } = await armadoOk(
      await entradaDe(ADAPTADOR_DE_GARAK, c, { zonaHoraria: "America/Bogota" }),
    );
    expect(sobres.map((s) => [s.id, s.prueba, s.veredicto])).toEqual([
      ["SOB-0037", "PR-IA-CONT-001", "fallida"],
      ["SOB-0038", "PR-IA-ENC-002", "superada"],
      ["SOB-0039", "PR-IA-PINJ-001", "fallida"],
    ]);
    // Nada nace confirmado y todos llevan el mismo crudo: la huella del archivo.
    for (const s of sobres) {
      expect(s.confirmacion).toBeNull();
      expect(s.origen).toBe("propio");
      expect(s.huellas.crudo).toBe(lote.huellas.archivo);
      expect(s.herramienta).toEqual({ id: "garak", version: "0.17.0" });
      expect(s.zona_horaria).toBe("America/Bogota");
    }
    expect(lote.confirmacion).toBeNull();
    expect(lote.sobres).toEqual(
      sobres.map((s) => ({ id: s.id, huella: s.huellas.sobre })),
    );
    expect(lote.adaptador).toEqual({
      id: "garak-report-jsonl",
      version: "1.0.0",
    });
    expect(lote.herramienta).toEqual({ id: "garak", version: "0.17.0" });
    expect(lote.archivo).toEqual({ nombre: "reporte.sintetico" });
    expect(lote.fecha).toBe(c.fecha);
    expect(lote.hora).toBe(c.hora);
    expect(lote.advertencias).toEqual(c.advertencias);
  });

  it("las tres huellas son distintas y la del lote no depende de la confirmación", async () => {
    const c = corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0");
    const { lote } = await armadoOk(
      await entradaDe(ADAPTADOR_DE_GARAK, c, { zonaHoraria: "UTC" }),
    );
    const { archivo, lote: delLote, registro } = lote.huellas;
    expect(new Set([archivo, delLote, registro]).size).toBe(3);
    const confirmado = await loteConfirmado(lote);
    expect(confirmado.huellas.lote).toBe(delLote);
    expect(confirmado.huellas.registro).not.toBe(registro);
    expect(confirmado.huellas.archivo).toBe(archivo);
  });

  it("es determinista: la misma entrada da el mismo lote y los mismos sobres", async () => {
    const e = await entradaDe(
      ADAPTADOR_DE_GARAK,
      corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0"),
      { zonaHoraria: "UTC" },
    );
    const a = await armadoOk(e);
    const b = await armadoOk(e);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("el lote armado pasa el validador de lotes (solo la nota de que no está confirmado)", async () => {
    const m = await mundoDeLotes();
    const { lote, sobres } = await armadoOk(
      await entradaDe(
        ADAPTADOR_DE_GARAK,
        corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0"),
        { zonaHoraria: "UTC" },
      ),
    );
    const r = await validarLotes(
      [archivoDeLote(lote, rutaPrivadaDeLote(lote.id))],
      contextoDeLotes(m, { sobres }),
    );
    expect(erroresDe(r)).toEqual([]);
    expect(reglasDe(r)).toEqual(["lote/sin-confirmar"]);
    expect(r.lotes).toHaveLength(1);
  });

  it("usa la fecha y la zona que da quien importa cuando el reporte no las trae", async () => {
    const c = corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0");
    const sinFecha: Corrida = {
      herramienta: c.herramienta,
      fecha: null,
      hora: null,
      zonaHoraria: null,
      advertencias: [],
      medir: (s) => c.medir(s),
    };
    const { lote } = await armadoOk(
      await entradaDe(ADAPTADOR_DE_GARAK, sinFecha, {
        fecha: "2026-10-05",
        zonaHoraria: "Europe/Madrid",
      }),
    );
    expect(lote.fecha).toBe("2026-10-05");
    expect(lote.zona_horaria).toBe("Europe/Madrid");
    expect(lote.hora).toBeNull();
  });
});

describe("armar un lote desde el reporte de ZAP", () => {
  it("la variante «plus» con estadísticas arma seis sobres: una fallida, cuatro superadas y una no ejecutada", async () => {
    const c = corridaDe(ADAPTADOR_DE_ZAP, ZAP_PLUS, "2.17.0");
    const { lote, sobres } = await armadoOk(
      await entradaDe(ADAPTADOR_DE_ZAP, c),
    );
    expect(sobres).toHaveLength(6);
    const porPrueba = Object.fromEntries(
      sobres.map((s) => [s.prueba, s.veredicto]),
    );
    expect(Object.values(porPrueba).sort()).toEqual([
      "fallida",
      "no_ejecutada",
      "superada",
      "superada",
      "superada",
      "superada",
    ]);
    expect(porPrueba["PR-SW-TS-001"]).toBe("fallida");
    expect(porPrueba["PR-SW-XSS-001"]).toBe("no_ejecutada");
    expect(lote.zona_horaria).toBe("UTC");
    expect(lote.herramienta).toEqual({ id: "zap", version: "2.17.0" });
  });

  it("ningún texto del ataque, de la evidencia ni de los cuerpos llega a un sobre ni al lote", async () => {
    const c = corridaDe(ADAPTADOR_DE_ZAP, ZAP_PLUS, "2.17.0");
    const { lote, sobres } = await armadoOk(
      await entradaDe(ADAPTADOR_DE_ZAP, c),
    );
    const todo = JSON.stringify({ lote, sobres });
    for (const marca of [
      "ATAQUE-MARCADOR",
      "EVIDENCIA-",
      "CUERPO-DE-PETICION",
      "AVISO-DEL-PLAN",
    ])
      expect(todo).not.toContain(marca);
  });
});

describe("armar un lote: por qué no se arma", () => {
  const garak = () => corridaDe(ADAPTADOR_DE_GARAK, GARAK, "0.17.0");
  const motivo = async (e: EntradaDeLote) => {
    const r = await armarLote(e);
    return r.ok ? "ok" : r.motivo;
  };

  it("sin fecha ni en el reporte ni de quien importa → falta_fecha", async () => {
    const c = garak();
    const sinFecha: Corrida = { ...c, fecha: null, medir: (s) => c.medir(s) };
    expect(
      await motivo(
        await entradaDe(ADAPTADOR_DE_GARAK, sinFecha, { zonaHoraria: "UTC" }),
      ),
    ).toBe("falta_fecha");
  });

  it("sin zona (garak escribe la hora local sin zona) → falta_zona", async () => {
    expect(await motivo(await entradaDe(ADAPTADOR_DE_GARAK, garak()))).toBe(
      "falta_zona",
    );
  });

  it("un paquete que no corre la herramienta → sin_pruebas_de_la_herramienta", async () => {
    const m = await mundoDeLotes();
    const emitido = m.contexto.planes[ASISTENTE]!;
    const sinGarak = {
      ...emitido,
      paquete: {
        ...emitido.paquete,
        herramientas: emitido.paquete.herramientas.filter(
          (h) => h.herramienta !== "garak",
        ),
      },
    };
    expect(
      await motivo(
        await entradaDe(ADAPTADOR_DE_GARAK, garak(), {
          zonaHoraria: "UTC",
          emitido: sinGarak,
        }),
      ),
    ).toBe("sin_pruebas_de_la_herramienta");
  });

  it("una corrida que no mide ninguna de las pruebas → sin_pruebas_de_la_herramienta", async () => {
    const c = garak();
    const ninguna: Corrida = { ...c, medir: () => ({ tipo: "no_aplica" }) };
    expect(
      await motivo(
        await entradaDe(ADAPTADOR_DE_GARAK, ninguna, { zonaHoraria: "UTC" }),
      ),
    ).toBe("sin_pruebas_de_la_herramienta");
  });

  it("una prueba del paquete que el catálogo no conoce → prueba_desconocida, con su nombre", async () => {
    const r = await armarLote(
      await entradaDe(ADAPTADOR_DE_GARAK, garak(), {
        zonaHoraria: "UTC",
        pruebas: [],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toBe("prueba_desconocida");
      expect(r.prueba).toBe("PR-IA-CONT-001");
    }
  });

  it("una medida a la que le faltan conteos no inventa un veredicto: el motivo es el del libro", async () => {
    const c = garak();
    const incompleta: Corrida = {
      ...c,
      medir: (s) => {
        const m = c.medir(s);
        return m.tipo === "medido"
          ? {
              ...m,
              resultado: { ...m.resultado, evaluadas: null, fallidas: null },
            }
          : m;
      },
    };
    const r = await armarLote(
      await entradaDe(ADAPTADOR_DE_GARAK, incompleta, { zonaHoraria: "UTC" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("faltan_conteos");
  });

  it("el siguiente id de lote es el mayor más uno", () => {
    expect(siguienteIdDeLote([])).toBe("LOTE-0001");
    expect(siguienteIdDeLote([{ id: "LOTE-0007" }, { id: "LOTE-0008" }])).toBe(
      "LOTE-0009",
    );
  });
});

describe("qué revisa una persona (E-5)", () => {
  /** Un lote de n sobres con SOB-1001…; los que se digan fallan o son parciales. */
  function loteDe(
    n: number,
    fallidas: number[] = [],
    parciales: number[] = [],
  ) {
    const ids = Array.from({ length: n }, (_, i) => `SOB-${1001 + i}`);
    const veredictos = new Map<string, Veredicto>(
      ids.map((id, i) => [
        id,
        fallidas.includes(i)
          ? "fallida"
          : parciales.includes(i)
            ? "parcial"
            : i % 7 === 3
              ? "no_ejecutada"
              : "superada",
      ]),
    );
    return {
      lote: {
        huellas: { lote: "ab".repeat(32) },
        sobres: ids.map((id) => ({ id, huella: "cd".repeat(32) })),
      },
      veredictos,
      ids,
    };
  }

  it("un lote de 60 con 4 fallidas y 2 parciales: las 6 siempre, y 25 de los otros 54", async () => {
    const m = await mundoDeLotes();
    const { lote, veredictos, ids } = loteDe(60, [2, 17, 33, 48], [9, 55]);
    const r = await revisionDelLote(lote, veredictos, m.muestreo);
    expect(r.siempre).toEqual(
      [
        "SOB-1003",
        "SOB-1010",
        "SOB-1018",
        "SOB-1034",
        "SOB-1049",
        "SOB-1056",
      ].sort(),
    );
    expect(r.resto).toBe(54);
    expect(r.muestra).toHaveLength(25);
    for (const id of r.muestra) {
      expect(ids).toContain(id);
      expect(r.siempre).not.toContain(id);
    }
    expect(new Set(r.muestra).size).toBe(25);
    expect(r.revisados).toHaveLength(31);
    expect(r.revisados).toEqual([...r.revisados].sort());
  });

  it("no depende del orden en que llegan los sobres", async () => {
    const m = await mundoDeLotes();
    const { lote, veredictos } = loteDe(60, [2, 17], [9]);
    const al_reves = {
      ...lote,
      sobres: [...lote.sobres].reverse(),
    };
    expect(await revisionDelLote(al_reves, veredictos, m.muestreo)).toEqual(
      await revisionDelLote(lote, veredictos, m.muestreo),
    );
  });

  it("la semilla es la huella del lote: otra huella, otra muestra", async () => {
    const m = await mundoDeLotes();
    const { lote, veredictos } = loteDe(60);
    const otra = { ...lote, huellas: { lote: "ef".repeat(32) } };
    const a = await revisionDelLote(lote, veredictos, m.muestreo);
    const b = await revisionDelLote(otra, veredictos, m.muestreo);
    expect(a.muestra).toHaveLength(b.muestra.length);
    expect(a.muestra).not.toEqual(b.muestra);
  });

  it("un resto de 25 o menos se revisa entero", async () => {
    const m = await mundoDeLotes();
    const { lote, veredictos, ids } = loteDe(25);
    const r = await revisionDelLote(lote, veredictos, m.muestreo);
    expect(r.muestra).toEqual(ids);
    expect(r.revisados).toEqual(ids);
  });

  it("si todo falla no hay resto que muestrear", async () => {
    const m = await mundoDeLotes();
    const { lote, veredictos, ids } = loteDe(4, [0, 1], [2, 3]);
    const r = await revisionDelLote(lote, veredictos, m.muestreo);
    expect(r.resto).toBe(0);
    expect(r.muestra).toEqual([]);
    expect(r.siempre).toEqual(ids);
  });

  it("la tabla del plan de muestreo da 22, 25, 26 y 29 al subir el resto", async () => {
    const m = await mundoDeLotes();
    const tamano = async (n: number) =>
      (await revisionDelLote(loteDe(n).lote, loteDe(n).veredictos, m.muestreo))
        .muestra.length;
    expect(await tamano(30)).toBe(22);
    expect(await tamano(60)).toBe(25);
    expect(await tamano(120)).toBe(26);
    expect(await tamano(300)).toBe(29);
  });
});

describe("el libro efectivo", () => {
  it("un lote confirmado presta su confirmación a sus sobres, solo en memoria", async () => {
    const m = await mundoDeLotes();
    const base = m.lotes["LOTE-0007"]!;
    const lote = await loteConfirmado(base, {
      por: "Ana",
      fecha: "2026-10-04",
    });
    const sobres = Object.values(m.sobres);
    const antes = JSON.stringify(sobres);
    const libro = libroEfectivo(sobres, [lote]);
    expect(JSON.stringify(sobres)).toBe(antes);
    for (const id of ["SOB-0031", "SOB-0032", "SOB-0033"]) {
      const s = libro.find((x) => x.id === id)!;
      expect(s.confirmacion).toEqual({
        por: "Ana",
        fecha: "2026-10-04",
        modo: "lote",
        lote: "LOTE-0007",
      });
    }
    // Los de otros lotes y los ya confirmados no cambian.
    expect(libro.find((x) => x.id === "SOB-0034")!.confirmacion).toBeNull();
    expect(libro.find((x) => x.id === "SOB-0003")!.confirmacion?.modo).toBe(
      "individual",
    );
  });

  it("un lote por confirmar, o mandado a revisión individual, no confirma a nadie", async () => {
    const m = await mundoDeLotes();
    const sobres = Object.values(m.sobres);
    const sinConfirmar = m.lotes["LOTE-0007"]!;
    const individual = await loteConfirmado(sinConfirmar, {
      decision: "a_revision_individual",
      revisados: [],
    });
    for (const lote of [sinConfirmar, individual]) {
      expect(confirmadosPorLote(lote)).toEqual([]);
      const libro = libroEfectivo(sobres, [lote]);
      expect(libro.find((x) => x.id === "SOB-0032")!.confirmacion).toBeNull();
    }
  });

  it("un sobre separado no queda confirmado por el lote", async () => {
    const m = await mundoDeLotes();
    const lote = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      separados: ["SOB-0032"],
    });
    expect(confirmadosPorLote(lote)).toEqual(["SOB-0031", "SOB-0033"]);
    const libro = libroEfectivo(Object.values(m.sobres), [lote]);
    expect(libro.find((x) => x.id === "SOB-0032")!.confirmacion).toBeNull();
    expect(libro.find((x) => x.id === "SOB-0031")!.confirmacion?.modo).toBe(
      "lote",
    );
  });

  it("la confirmación individual de un archivo gana a la de un lote", async () => {
    const m = await mundoDeLotes();
    const lote = await loteConfirmado(m.lotes["LOTE-0007"]!);
    const propio = await con(m.sobres["SOB-0031"]!, {
      confirmacion: { por: "Beto", fecha: "2026-10-03", modo: "individual" },
    });
    const libro = libroEfectivo(
      Object.values(m.sobres).map((s) => (s.id === "SOB-0031" ? propio : s)),
      [lote],
    );
    expect(libro.find((x) => x.id === "SOB-0031")!.confirmacion).toEqual({
      por: "Beto",
      fecha: "2026-10-03",
      modo: "individual",
    });
  });

  it("un sobre listado en dos lotes confirmados lo confirma el de id menor, sin importar el orden", async () => {
    const m = await mundoDeLotes();
    const a = await loteConfirmado(m.lotes["LOTE-0007"]!, { por: "Ana" });
    const copiaB = await loteSellado(
      a,
      { id: "LOTE-0003" as string },
      a.huellas.archivo,
    );
    const b = await loteConfirmado(copiaB, { por: "Beto" });
    const sobres = Object.values(m.sobres);
    for (const lotes of [
      [a, b],
      [b, a],
    ]) {
      const c = libroEfectivo(sobres, lotes).find(
        (x) => x.id === "SOB-0031",
      )!.confirmacion;
      expect(c?.lote).toBe("LOTE-0003");
      expect(c?.por).toBe("Beto");
    }
  });
});

describe("confirmar un lote", () => {
  async function ante(id: string) {
    const m = await mundoDeLotes();
    const lote = m.lotes[id]!;
    const sobres = lote.sobres.map((s) => m.sobres[s.id]!);
    const todos = Object.values(m.sobres);
    return {
      m,
      lote,
      sobres,
      entrada: {
        lote,
        sobres,
        plan: m.muestreo,
        libro: libroEfectivo(todos, Object.values(m.lotes)),
        hallazgos: Object.values(m.hallazgos),
        por: "Revisora demo",
        fecha: "2026-10-03",
        decision: "confirmado" as const,
        separar: [] as string[],
      },
    };
  }

  it("LOTE-0007 se confirma sin separar nada: su falla (SOB-0032) ya tiene hallazgo vivo, HZ-0007", async () => {
    const { entrada, m } = await ante("LOTE-0007");
    const r = await confirmarLote(entrada);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lote.confirmacion).toEqual({
      por: "Revisora demo",
      fecha: "2026-10-03",
      decision: "confirmado",
      revisados: ["SOB-0031", "SOB-0032", "SOB-0033"],
      separados: [],
    });
    expect(r.revision.siempre).toEqual(["SOB-0032"]);
    expect(r.revision.muestra).toEqual(["SOB-0031", "SOB-0033"]);
    // Confirmar no toca la semilla de la muestra, el archivo ni los sobres citados.
    expect(r.lote.huellas.lote).toBe(m.lotes["LOTE-0007"]!.huellas.lote);
    expect(r.lote.huellas.archivo).toBe(m.lotes["LOTE-0007"]!.huellas.archivo);
    expect(r.lote.huellas.registro).not.toBe(
      m.lotes["LOTE-0007"]!.huellas.registro,
    );
    expect(r.lote.sobres).toEqual(m.lotes["LOTE-0007"]!.sobres);
    // El HZ-0007 sigue siendo el único: el sobre confirmado por lote no abre otro.
    const libro = libroEfectivo(Object.values(m.sobres), [r.lote]);
    const s32 = libro.find((x) => x.id === "SOB-0032")!;
    expect(s32.confirmacion?.modo).toBe("lote");
    const d = decidirApertura(s32, libro, Object.values(m.hallazgos));
    expect(d).toEqual({
      abre: false,
      motivo: "ya_hay_uno",
      existente: "HZ-0007",
    });
  });

  it("separar una fallida la saca del lote: queda por confirmar una por una", async () => {
    const { entrada, m } = await ante("LOTE-0007");
    const r = await confirmarLote({ ...entrada, separar: ["SOB-0032"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lote.confirmacion?.separados).toEqual(["SOB-0032"]);
    const libro = libroEfectivo(Object.values(m.sobres), [r.lote]);
    expect(libro.find((x) => x.id === "SOB-0032")!.confirmacion).toBeNull();
    expect(libro.find((x) => x.id === "SOB-0031")!.confirmacion?.modo).toBe(
      "lote",
    );
  });

  it("revisión uno por uno: el lote queda decidido sin confirmar a nadie", async () => {
    const { entrada, m, lote } = await ante("LOTE-0007");
    const r = await confirmarLote({
      ...entrada,
      decision: "a_revision_individual",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lote.confirmacion).toEqual({
      por: "Revisora demo",
      fecha: "2026-10-03",
      decision: "a_revision_individual",
      revisados: [],
      separados: [],
    });
    expect(r.lote.huellas.lote).toBe(lote.huellas.lote);
    expect(
      libroEfectivo(Object.values(m.sobres), [r.lote]).filter(
        (s) => s.confirmacion?.modo === "lote",
      ),
    ).toEqual([]);
  });

  it("ya_decidido: un lote confirmado no se confirma otra vez", async () => {
    const { entrada } = await ante("LOTE-0007");
    const r = await confirmarLote(entrada);
    if (!r.ok) throw new Error("debía confirmarse");
    const otra = await confirmarLote({ ...entrada, lote: r.lote });
    expect(otra).toEqual({ ok: false, motivo: "ya_decidido", ids: [] });
  });

  it("fecha_anterior_a_la_corrida: no se confirma antes de la corrida", async () => {
    const { entrada } = await ante("LOTE-0007");
    const r = await confirmarLote({ ...entrada, fecha: "2026-10-01" });
    expect(r).toEqual({
      ok: false,
      motivo: "fecha_anterior_a_la_corrida",
      ids: [],
    });
  });

  it("sobre_inexistente: un sobre del lote que no está entre los dados", async () => {
    const { entrada, sobres } = await ante("LOTE-0007");
    const r = await confirmarLote({ ...entrada, sobres: sobres.slice(0, 2) });
    expect(r).toEqual({
      ok: false,
      motivo: "sobre_inexistente",
      ids: ["SOB-0033"],
    });
  });

  it("separa_lo_que_no_se_revisa_siempre: solo las fallidas y parciales pueden separarse", async () => {
    const { entrada } = await ante("LOTE-0007");
    const r = await confirmarLote({ ...entrada, separar: ["SOB-0031"] });
    expect(r).toEqual({
      ok: false,
      motivo: "separa_lo_que_no_se_revisa_siempre",
      ids: ["SOB-0031"],
    });
  });

  it("sobre_ya_confirmado: un sobre del lote con confirmación individual se confirmaría dos veces", async () => {
    const { entrada, sobres, m } = await ante("LOTE-0007");
    const ya = await con(sobres[0]!, {
      confirmacion: { por: "Beto", fecha: "2026-10-03", modo: "individual" },
    });
    const r = await confirmarLote({
      ...entrada,
      sobres: [ya, sobres[1]!, sobres[2]!],
      libro: libroEfectivo(
        Object.values(m.sobres).map((s) => (s.id === ya.id ? ya : s)),
        [],
      ),
    });
    expect(r).toEqual({
      ok: false,
      motivo: "sobre_ya_confirmado",
      ids: ["SOB-0031"],
    });
  });

  it("LOTE-0008 exige separar SOB-0034: su falla abriría un hallazgo que pide la severidad de una persona", async () => {
    const { entrada } = await ante("LOTE-0008");
    const r = await confirmarLote(entrada);
    expect(r).toEqual({
      ok: false,
      motivo: "falla_que_abre_hallazgo",
      ids: ["SOB-0034"],
    });
  });

  it("LOTE-0008 separando SOB-0034 se confirma, y entonces SOB-0036 cierra HZ-0009", async () => {
    const { entrada, m } = await ante("LOTE-0008");
    const hz9 = m.hallazgos["HZ-0009"]!;
    const todos = Object.values(m.sobres);
    // Antes: SOB-0036 es una propuesta y HZ-0009 sigue corregido, esperando su re-prueba.
    const antes = evaluarHallazgo(hz9, libroEfectivo(todos, []));
    expect(antes.ok && antes.evaluacion.estado).toBe("corregido");
    expect(antes.ok && antes.evaluacion.porConfirmar.map((s) => s.id)).toEqual([
      "SOB-0036",
    ]);

    const r = await confirmarLote({ ...entrada, separar: ["SOB-0034"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.revision.siempre).toEqual(["SOB-0034"]);
    expect(r.lote.confirmacion?.revisados).toEqual([
      "SOB-0034",
      "SOB-0035",
      "SOB-0036",
    ]);
    const libro = libroEfectivo(todos, [r.lote]);
    const despues = evaluarHallazgo(hz9, libro);
    expect(despues.ok && despues.evaluacion.estado).toBe("cerrado");
    expect(despues.ok && despues.evaluacion.cierre?.sobre).toBe("SOB-0036");
    // SOB-0035 (no ejecutada) cuenta como sobre, pero jamás es una superada.
    const s35 = libro.find((x) => x.id === "SOB-0035")!;
    expect(s35.confirmacion?.modo).toBe("lote");
    expect(s35.veredicto).toBe("no_ejecutada");
    // SOB-0034 queda por confirmar solo: sin severidad de una persona no abre nada.
    expect(libro.find((x) => x.id === "SOB-0034")!.confirmacion).toBeNull();
  });

  it("el separado se confirma después uno por uno: abre su hallazgo y no rompe al lote", async () => {
    const { entrada, m } = await ante("LOTE-0008");
    const r = await confirmarLote({ ...entrada, separar: ["SOB-0034"] });
    if (!r.ok) throw new Error("debía confirmarse");
    const c = await confirmar(
      m.sobres["SOB-0034"]!,
      "Revisora demo",
      "2026-10-04",
    );
    if (!c.ok) throw new Error("debía confirmarse");
    const sobresDespues = Object.values(m.sobres).map((s) =>
      s.id === "SOB-0034" ? c.sobre : s,
    );
    const libro = libroEfectivo(sobresDespues, [r.lote]);
    const s34 = libro.find((x) => x.id === "SOB-0034")!;
    expect(s34.confirmacion?.modo).toBe("individual");
    expect(decidirApertura(s34, libro, Object.values(m.hallazgos))).toEqual({
      abre: true,
    });
    // El lote cita al sobre sin confirmación: confirmarlo después no lo invalida.
    const v = await validarLotes(
      [archivoDeLote(r.lote)],
      contextoDeLotes(m, { reemplazos: [c.sobre] }),
    );
    expect(erroresDe(v)).toEqual([]);
    expect(v.lotes).toHaveLength(1);
  });
});

describe("el validador de lotes", () => {
  const validar = async (
    lotes: { texto?: string; ruta?: string; lote?: unknown }[],
    cambios: Parameters<typeof contextoDeLotes>[1] = {},
  ) => {
    const m = await mundoDeLotes();
    const r = await validarLotes(
      lotes.map((l) =>
        l.texto !== undefined
          ? { ruta: l.ruta ?? rutaDeLote("LOTE-0007"), texto: l.texto }
          : archivoDeLote(l.lote as Lote, l.ruta),
      ),
      contextoDeLotes(m, cambios),
    );
    anotar(r);
    return r;
  };
  const uno = (l: Lote | Record<string, unknown>, ruta?: string) => ({
    lote: l,
    ruta,
  });

  it("los dos lotes demo son válidos: solo la nota de que están por confirmar", async () => {
    const m = await mundoDeLotes();
    const r = await validar([
      uno(m.lotes["LOTE-0007"]!),
      uno(m.lotes["LOTE-0008"]!),
    ]);
    expect(r.estado).toBe("ok");
    expect(erroresDe(r)).toEqual([]);
    expect(reglasDe(r)).toEqual(["lote/sin-confirmar"]);
    expect(r.lotes.map((x) => x.lote.id)).toEqual(["LOTE-0007", "LOTE-0008"]);
  });

  it("un lote confirmado por el motor es válido y no trae la nota", async () => {
    const m = await mundoDeLotes();
    const todos = Object.values(m.sobres);
    const lote = m.lotes["LOTE-0008"]!;
    const r = await confirmarLote({
      lote,
      sobres: lote.sobres.map((s) => m.sobres[s.id]!),
      plan: m.muestreo,
      libro: libroEfectivo(todos, []),
      hallazgos: Object.values(m.hallazgos),
      por: "Revisora demo",
      fecha: "2026-10-03",
      decision: "confirmado",
      separar: ["SOB-0034"],
    });
    if (!r.ok) throw new Error("debía confirmarse");
    const v = await validar([uno(r.lote)]);
    expect(erroresDe(v)).toEqual([]);
    expect(reglasDe(v)).toEqual([]);
  });

  it("archivo/json-invalido", async () => {
    const r = await validar([{ texto: "{no es json" }]);
    expect(erroresDe(r)).toEqual(["archivo/json-invalido"]);
  });

  it("esquema/campo-invalido: un campo que sobra o que falta", async () => {
    const m = await mundoDeLotes();
    const sobra = await validar([
      uno({ ...copia(m.lotes["LOTE-0007"]!), extra: 1 }),
    ]);
    expect(erroresDe(sobra)).toEqual(["esquema/campo-invalido"]);
    const sinId = copia(m.lotes["LOTE-0007"]!) as Record<string, unknown>;
    delete sinId["activo"];
    const falta = await validar([uno(sinId)]);
    expect(erroresDe(falta)).toEqual(["esquema/campo-invalido"]);
    expect(falta.lotes).toEqual([]);
  });

  it("archivo/nombre-no-coincide", async () => {
    const m = await mundoDeLotes();
    const r = await validar([
      uno(m.lotes["LOTE-0007"]!, "datos/lotes/demo/LOTE-0099.json"),
    ]);
    expect(erroresDe(r)).toContain("archivo/nombre-no-coincide");
  });

  it("lote/id-duplicado", async () => {
    const m = await mundoDeLotes();
    const l = m.lotes["LOTE-0007"]!;
    const r = await validar([
      uno(l),
      uno(l, "datos/lotes/demo/otra/LOTE-0007.json"),
    ]);
    expect(erroresDe(r)).toContain("lote/id-duplicado");
  });

  it("lote/origen-no-demo-en-datos-publicos y lote/demo-en-carpeta-privada: la carpeta decide dónde va cada cosa", async () => {
    const m = await mundoDeLotes();
    const l = m.lotes["LOTE-0007"]!;
    const propioPublico = await loteSellado(l, { origen: "propio" });
    const a = await validar([uno(propioPublico)]);
    expect(erroresDe(a)).toContain("lote/origen-no-demo-en-datos-publicos");
    const b = await validar([uno(l, rutaPrivadaDeLote(l.id))]);
    expect(erroresDe(b)).toContain("lote/demo-en-carpeta-privada");
  });

  it("lote/activo-sin-plan", async () => {
    const m = await mundoDeLotes();
    const l = await loteSellado(m.lotes["LOTE-0007"]!, {
      activo: "act-no-existe",
    });
    expect(erroresDe(await validar([uno(l)]))).toContain(
      "lote/activo-sin-plan",
    );
  });

  it("lote/plan-no-cuadra y lote/paquete-no-cuadra", async () => {
    const m = await mundoDeLotes();
    const otra = "9".repeat(64);
    const plan = await loteSellado(m.lotes["LOTE-0007"]!, {
      plan: { huella: otra },
    });
    expect(erroresDe(await validar([uno(plan)]))).toContain(
      "lote/plan-no-cuadra",
    );
    const paquete = await loteSellado(m.lotes["LOTE-0007"]!, {
      paquete: { huella: otra },
    });
    expect(erroresDe(await validar([uno(paquete)]))).toContain(
      "lote/paquete-no-cuadra",
    );
  });

  it("lote/herramienta-fuera-del-paquete", async () => {
    const m = await mundoDeLotes();
    const l = await loteSellado(m.lotes["LOTE-0007"]!, {
      herramienta: { id: "nikto", version: "2.5.0" },
    });
    expect(erroresDe(await validar([uno(l)]))).toContain(
      "lote/herramienta-fuera-del-paquete",
    );
  });

  it("lote/adaptador-desconocido: no existe, o no lee esa herramienta", async () => {
    const m = await mundoDeLotes();
    const noExiste = await loteSellado(m.lotes["LOTE-0007"]!, {
      adaptador: { id: "nada-de-nada", version: "1.0.0" },
    });
    expect(erroresDe(await validar([uno(noExiste)]))).toContain(
      "lote/adaptador-desconocido",
    );
    const deOtra = await loteSellado(m.lotes["LOTE-0007"]!, {
      adaptador: { id: "zap-traditional-json", version: "1.0.0" },
    });
    expect(erroresDe(await validar([uno(deOtra)]))).toContain(
      "lote/adaptador-desconocido",
    );
  });

  it("lote/sobre-inexistente", async () => {
    const m = await mundoDeLotes();
    const l = m.lotes["LOTE-0007"]!;
    const conFantasma = await loteSellado(l, {
      sobres: [...l.sobres, { id: "SOB-9999", huella: "1".repeat(64) }],
    });
    expect(erroresDe(await validar([uno(conFantasma)]))).toContain(
      "lote/sobre-inexistente",
    );
  });

  it("lote/sobre-en-dos-lotes: el segundo lote, por id, es el que sobra", async () => {
    const m = await mundoDeLotes();
    const gemelo = await loteSellado(m.lotes["LOTE-0007"]!, {
      id: "LOTE-0009",
    });
    const r = await validar([uno(m.lotes["LOTE-0007"]!), uno(gemelo)]);
    expect(erroresDe(r)).toContain("lote/sobre-en-dos-lotes");
    const rutas = r.hallazgos
      .filter((h) => h.regla === "lote/sobre-en-dos-lotes")
      .map((h) => h.ruta);
    expect(new Set(rutas)).toEqual(new Set([rutaDeLote("LOTE-0009")]));
    expect(r.lotes.map((x) => x.lote.id)).toEqual(["LOTE-0007"]);
  });

  it("lote/sobre-no-cuadra: un sobre editado después de armarse el lote", async () => {
    const m = await mundoDeLotes();
    const editadoSobre = await con(m.sobres["SOB-0031"]!, {
      ejecutado_por: "Otra persona",
    });
    const r = await validar([uno(m.lotes["LOTE-0007"]!)], {
      reemplazos: [editadoSobre],
    });
    expect(erroresDe(r)).toContain("lote/sobre-no-cuadra");
  });

  it("lote/sobre-ajeno: un sobre del lote es de otro activo, plan, paquete o herramienta", async () => {
    const m = await mundoDeLotes();
    const ajeno = await con(m.sobres["SOB-0031"]!, {
      activo: "act-demo-clasificador",
    });
    const r = await validar([uno(m.lotes["LOTE-0007"]!)], {
      reemplazos: [ajeno],
    });
    expect(erroresDe(r)).toContain("lote/sobre-ajeno");
  });

  it("lote/crudo-distinto-del-archivo: en un lote propio, todo sobre lleva la huella del archivo", async () => {
    const m = await mundoDeLotes();
    const l = await loteSellado(m.lotes["LOTE-0007"]!, { origen: "propio" });
    const r = await validar([uno(l, rutaPrivadaDeLote(l.id))]);
    expect(erroresDe(r)).toContain("lote/crudo-distinto-del-archivo");
  });

  it("lote/crudo-demo-no-sintetico: un lote demo no puede traer la huella de una corrida real", async () => {
    const m = await mundoDeLotes();
    const real = await loteSellado(m.lotes["LOTE-0007"]!, {}, "7".repeat(64));
    expect(erroresDe(await validar([uno(real)]))).toContain(
      "lote/crudo-demo-no-sintetico",
    );
  });

  it("lote/huella-no-cuadra: editar el lote sin volver a sellarlo, o la huella misma", async () => {
    const m = await mundoDeLotes();
    const base = m.lotes["LOTE-0007"]!;
    const editadoCampo = loteEditado(base, { ejecutado_por: "Otra persona" });
    const a = await validar([uno(editadoCampo)]);
    expect(erroresDe(a)).toEqual(["lote/huella-no-cuadra"]);
    const huellaCambiada = {
      ...copia(base),
      huellas: { ...base.huellas, registro: "3".repeat(64) },
    };
    const b = await validar([uno(huellaCambiada)]);
    expect(erroresDe(b)).toEqual(["lote/huella-no-cuadra"]);
  });

  it("lote/confirmacion-anterior-a-la-corrida", async () => {
    const m = await mundoDeLotes();
    const l = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      fecha: "2026-09-01",
    });
    expect(erroresDe(await validar([uno(l)]))).toContain(
      "lote/confirmacion-anterior-a-la-corrida",
    );
  });

  it("lote/decision-incoherente: «a revisión individual» no lleva revisados ni separados", async () => {
    const m = await mundoDeLotes();
    const l = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      decision: "a_revision_individual",
      revisados: ["SOB-0031"],
      separados: [],
    });
    expect(erroresDe(await validar([uno(l)]))).toContain(
      "lote/decision-incoherente",
    );
    const ok = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      decision: "a_revision_individual",
      revisados: [],
      separados: [],
    });
    expect(erroresDe(await validar([uno(ok)]))).toEqual([]);
  });

  it("lote/revisados-no-cuadran: la lista de revisados es la que calcula el motor, no la que se escriba", async () => {
    const m = await mundoDeLotes();
    const corto = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      revisados: ["SOB-0032"],
    });
    expect(erroresDe(await validar([uno(corto)]))).toContain(
      "lote/revisados-no-cuadran",
    );
    const largo = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      revisados: ["SOB-0031", "SOB-0032", "SOB-0033", "SOB-0034"],
    });
    expect(erroresDe(await validar([uno(largo)]))).toContain(
      "lote/revisados-no-cuadran",
    );
  });

  it("lote/separado-que-no-se-revisa-siempre", async () => {
    const m = await mundoDeLotes();
    const l = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      separados: ["SOB-0031"],
    });
    expect(erroresDe(await validar([uno(l)]))).toContain(
      "lote/separado-que-no-se-revisa-siempre",
    );
  });

  it("lote/sobre-confirmado-dos-veces: el sobre ya tenía confirmación individual y el lote lo confirmó también", async () => {
    const m = await mundoDeLotes();
    const l = await loteConfirmado(m.lotes["LOTE-0007"]!);
    const ya = await con(m.sobres["SOB-0031"]!, {
      confirmacion: { por: "Beto", fecha: "2026-10-03", modo: "individual" },
    });
    const r = await validar([uno(l)], { reemplazos: [ya] });
    expect(erroresDe(r)).toContain("lote/sobre-confirmado-dos-veces");
    // Separándolo, no hay doble confirmación (pero separar solo vale para fallidas y parciales).
    const separado = await loteConfirmado(m.lotes["LOTE-0007"]!, {
      separados: ["SOB-0032"],
    });
    const ya32 = await con(m.sobres["SOB-0032"]!, {
      confirmacion: { por: "Beto", fecha: "2026-10-03", modo: "individual" },
    });
    const sinDoble = await validar([uno(separado)], { reemplazos: [ya32] });
    expect(erroresDe(sinDoble)).toEqual([]);
  });

  it("lote/sin-confirmar es una nota, no un error", async () => {
    const m = await mundoDeLotes();
    const r = await validar([uno(m.lotes["LOTE-0007"]!)]);
    expect(r.hallazgos.map((h) => [h.regla, h.severidad])).toEqual([
      ["lote/sin-confirmar", "nota"],
    ]);
  });

  it("un lote con un error no aparece entre los válidos, aunque otro del mismo conjunto sí", async () => {
    const m = await mundoDeLotes();
    const roto = loteEditado(m.lotes["LOTE-0007"]!, {
      ejecutado_por: "Otra persona",
    });
    const r = await validar([uno(roto), uno(m.lotes["LOTE-0008"]!)]);
    expect(r.estado).toBe("invalido");
    expect(r.lotes.map((x) => x.lote.id)).toEqual(["LOTE-0008"]);
  });

  it("los hallazgos salen en un orden estable, sin importar el orden de los archivos", async () => {
    const m = await mundoDeLotes();
    const roto = loteEditado(m.lotes["LOTE-0007"]!, {
      ejecutado_por: "Otra persona",
    });
    const a = await validar([uno(roto), uno(m.lotes["LOTE-0008"]!)]);
    const b = await validar([uno(m.lotes["LOTE-0008"]!), uno(roto)]);
    expect(JSON.stringify(a.hallazgos)).toBe(JSON.stringify(b.hallazgos));
  });
});

describe("las fallas que un lote confirmó sin separar", () => {
  it("lote/falla-sin-hallazgo: una falla que abriría un hallazgo y se quedó en el lote", async () => {
    const m = await mundoDeLotes();
    // Un lote que el motor no dejaría confirmar (se fabrica a mano): SOB-0034 falla y no tiene hallazgo.
    const forzado = await loteConfirmado(m.lotes["LOTE-0008"]!);
    const r = fallasSinHallazgo(
      [{ ruta: rutaDeLote(forzado.id), lote: forzado }],
      Object.values(m.sobres),
      Object.values(m.hallazgos),
    );
    anotar({ hallazgos: r });
    expect(r.map((h) => [h.regla, h.severidad, h.detalle?.es])).toEqual([
      ["lote/falla-sin-hallazgo", "error", "«SOB-0034»"],
    ]);
  });

  it("una falla que un hallazgo ya cerrado cubría cuando el lote se confirmó sigue cubierta", async () => {
    const m = await mundoDeLotes();
    // SOB-0012 es una fallida de PR-IA-PINJ-001 y HZ-0003 (cerrado por re-prueba) nació de ella: el lote se confirmó
    // cuando esa falla tenía hallazgo, y cerrarlo después no puede volver inválido al lote.
    const base = m.lotes["LOTE-0007"]!;
    const confirmado = await loteConfirmado(
      {
        ...base,
        sobres: [{ id: "SOB-0012", huella: base.sobres[0]!.huella }],
      } as Lote,
      { revisados: ["SOB-0012"] },
    );
    expect(
      fallasSinHallazgo(
        [{ ruta: rutaDeLote(confirmado.id), lote: confirmado }],
        Object.values(m.sobres),
        Object.values(m.hallazgos),
      ),
    ).toEqual([]);
  });

  it("separada, o con hallazgo vivo, no es un problema", async () => {
    const m = await mundoDeLotes();
    const sobres = Object.values(m.sobres);
    const hallazgos = Object.values(m.hallazgos);
    const separada = await loteConfirmado(m.lotes["LOTE-0008"]!, {
      separados: ["SOB-0034"],
    });
    expect(
      fallasSinHallazgo([{ ruta: "x", lote: separada }], sobres, hallazgos),
    ).toEqual([]);
    // SOB-0032 es una falla, pero su hallazgo (HZ-0007) está vivo.
    const conHallazgo = await loteConfirmado(m.lotes["LOTE-0007"]!);
    expect(
      fallasSinHallazgo([{ ruta: "x", lote: conHallazgo }], sobres, hallazgos),
    ).toEqual([]);
    // Sin lotes confirmados no hay nada que revisar.
    expect(
      fallasSinHallazgo(
        [{ ruta: "x", lote: m.lotes["LOTE-0008"]! }],
        sobres,
        hallazgos,
      ),
    ).toEqual([]);
  });
});

describe("la huella del libro con lotes", () => {
  it("sin lotes es la de siempre: el libro del S5 conserva su huella", async () => {
    const m = await mundoDeLotes();
    const sobres = Object.values(m.sobres);
    expect(await huellaDelLibro(sobres, [])).toBe(await huellaDelLibro(sobres));
  });

  it("con lotes cambia, y confirmar un lote la cambia otra vez; el orden de los lotes no importa", async () => {
    const m = await mundoDeLotes();
    const sobres = Object.values(m.sobres);
    const lotes = [m.lotes["LOTE-0007"]!, m.lotes["LOTE-0008"]!];
    const sin = await huellaDelLibro(sobres);
    const con2 = await huellaDelLibro(sobres, lotes);
    expect(con2).not.toBe(sin);
    expect(await huellaDelLibro(sobres, [...lotes].reverse())).toBe(con2);
    const confirmado = await loteConfirmado(lotes[0]!);
    expect(await huellaDelLibro(sobres, [confirmado, lotes[1]!])).not.toBe(
      con2,
    );
  });
});

describe("los sellos del lote", () => {
  it("resellar con confirmación cambia el registro y deja el archivo y la semilla", async () => {
    const m = await mundoDeLotes();
    const base = m.lotes["LOTE-0007"]!;
    const r = await resellarLote(base, {
      por: "Ana",
      fecha: "2026-10-03",
      decision: "confirmado",
      revisados: [],
      separados: [],
    });
    expect(r.huellas.archivo).toBe(base.huellas.archivo);
    expect(r.huellas.lote).toBe(base.huellas.lote);
    expect(r.huellas.registro).not.toBe(base.huellas.registro);
    // Quitar la confirmación devuelve las huellas de origen.
    const vuelta = await resellarLote(r, null);
    expect(vuelta.huellas).toEqual(base.huellas);
    expect(sinHuellasDeLote(vuelta)).toEqual(sinHuellasDeLote(base));
  });
});

describe("el registro de adaptadores", () => {
  it("cada herramienta del paquete tiene el suyo, y una desconocida no", () => {
    expect(ADAPTADORES.map((a) => a.id).sort()).toEqual([
      "garak-report-jsonl",
      "zap-traditional-json",
    ]);
    expect(adaptadorDe("garak")).toBe(ADAPTADOR_DE_GARAK);
    expect(adaptadorDe("zap")).toBe(ADAPTADOR_DE_ZAP);
    expect(adaptadorDe("nikto")).toBeUndefined();
  });
});

describe("las reglas del validador", () => {
  it("cada regla de REGLAS_DE_LOTE hizo saltar un caso de este archivo", () => {
    expect([...vistas].sort()).toEqual(Object.keys(REGLAS_DE_LOTE).sort());
  });
});
