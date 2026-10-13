// @vitest-environment node
// El gate de contrato del adaptador de ZAP (regla 19). Las fixtures son las salidas oficiales de prueba de
// zap-extensions y dos derivadas declaradas (sin Docker aquí no se corrió ZAP). Lo que se prueba:
// - sin constancia de que la regla corrió, un reporte sin alertas NO es «superada» (E-6/E-7);
// - `attack`, `evidence` y los cuerpos de la variante «plus» jamás salen del adaptador (reglas duras 3 y 4);
// - un campo renombrado, una versión que no se puede comparar o un reporte que no es de ZAP no arman lote.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Selector } from "../../../src/engine/adaptadores/interfaz.ts";
import { ADAPTADOR_DE_ZAP } from "../../../src/engine/adaptadores/zap.ts";
import { Paquete } from "../../../src/engine/planificador/esquemas.ts";
import { RAIZ } from "../evidencia/ayuda.ts";

const leerFixture = (nombre: string) =>
  readFileSync(path.join(RAIZ, "tests/fixtures/adaptadores", nombre), "utf8");
const OFICIAL = leerFixture("zap-traditional-json.oficial.json");
const OFICIAL_PLUS = leerFixture("zap-traditional-json-plus.oficial.json");
const DERIVADA = leerFixture("zap-traditional-json.derivada.json");
const DERIVADA_PLUS = leerFixture("zap-traditional-json-plus.derivada.json");

const zap = (
  pluginids: number[],
  agregacion: "cualquier_regla" | "todas_las_reglas" = "cualquier_regla",
): Selector => ({ tipo: "zap", pluginids, agregacion });
const leer = (t: string, minima: string | null = "2.17.0") =>
  ADAPTADOR_DE_ZAP.leer(t, minima);
function corrida(t: string, minima: string | null = "2.17.0") {
  const l = leer(t, minima);
  if (!l.ok) throw new Error(`${l.motivo}: ${l.detalle}`);
  return l.corrida;
}
const motivo = (t: string, minima: string | null = "2.17.0") => {
  const l = leer(t, minima);
  return l.ok ? "ok" : l.motivo;
};
const medido = (t: string, s: Selector, minima: string | null = "2.17.0") => {
  const m = corrida(t, minima).medir(s);
  if (m.tipo !== "medido") throw new Error("no_aplica");
  return m;
};
/** El reporte derivado «plus» con otra forma, para los casos que las fixtures no traen. */
// Regla 1: un `any` con su razón. Es un reporte JSON arbitrario que cada prueba muta en la ruta que necesita.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
const cambiado = (base: string, f: (r: Json) => void) => {
  const r = JSON.parse(base) as Json;
  f(r);
  return JSON.stringify(r);
};

describe("las salidas oficiales de prueba de zap-extensions", () => {
  it("traen «Dev Build»: contra la versión mínima del paquete no se pueden comparar y no arman lote", () => {
    expect(motivo(OFICIAL)).toBe("version_no_comparable");
    expect(motivo(OFICIAL_PLUS)).toBe("version_no_comparable");
  });

  it("sin mínima se leen, y el reporte simple no trae estadísticas: nada se da por ejecutado", () => {
    const c = corrida(OFICIAL, null);
    expect(c.herramienta.version).toBe("Dev Build");
    expect(c.fecha).toBe("2025-10-29");
    expect(c.hora).toBe("10:53");
    expect(c.zonaHoraria).toBe("UTC");
    expect(c.advertencias.map((a) => a.es).join(" ")).toContain(
      "no trae estadísticas",
    );
    // Una regla que levantó alerta corrió; la que no, no tiene constancia.
    expect(medido(OFICIAL, zap([1]), null).resultado.ejecutada).toBe(true);
    expect(medido(OFICIAL, zap([99999]), null).resultado.ejecutada).toBe(false);
  });

  it("la variante «plus» trae estadísticas vacías y un plan de automatización sin errores", () => {
    const c = corrida(OFICIAL_PLUS, null);
    expect(c.advertencias.map((a) => a.es).join(" ")).toContain(
      "no trae estadísticas",
    );
    expect(c.advertencias.map((a) => a.es).join(" ")).not.toContain(
      "plan de automatización",
    );
  });
});

describe("la variante derivada simple (sin estadísticas)", () => {
  it("una alerta de la regla del plan es una falla; sin alertas y sin constancia, no se ejecutó", () => {
    const falla = medido(DERIVADA, zap([10035]));
    expect(falla.resultado).toMatchObject({ ejecutada: true, alertas: 1 });
    const sinConstancia = medido(DERIVADA, zap([10038]));
    expect(sinConstancia.resultado).toEqual({
      ejecutada: false,
      evaluadas: null,
      fallidas: null,
      alertas: null,
      metrica: null,
    });
    expect(sinConstancia.advertencias[0]?.es).toContain("sin constancia");
  });

  it("una alerta de confianza 0 es un falso positivo: no cuenta, avisa, pero la regla sí corrió", () => {
    const m = medido(DERIVADA, zap([10020]));
    expect(m.resultado).toMatchObject({ ejecutada: true, alertas: 0 });
    expect(m.advertencias[0]?.es).toContain("falso positivo");
  });

  it("una alerta de un pluginid que no está en el selector no le toca", () => {
    expect(medido(DERIVADA, zap([10038])).resultado.alertas).toBeNull();
    expect(medido(DERIVADA, zap([10096])).resultado).toMatchObject({
      ejecutada: true,
      alertas: 1,
    });
  });
});

describe("la variante derivada «plus» (con estadísticas de ejecución por regla)", () => {
  it("una regla sin alertas pero con su estadística corrió: es un cero verificado", () => {
    for (const id of [10038, 10003, 90022]) {
      const m = medido(DERIVADA_PLUS, zap([id]));
      expect(m.resultado, String(id)).toMatchObject({
        ejecutada: true,
        alertas: 0,
      });
      expect(m.advertencias).toEqual([]);
    }
  });
  it("una regla sin alertas y sin su estadística (el XSS activo) no se ejecutó", () => {
    expect(medido(DERIVADA_PLUS, zap([40012, 40014])).resultado.ejecutada).toBe(
      false,
    );
  });
  it("una de las dos reglas del selector sin constancia basta para no dar el cero por verificado", () => {
    const t = cambiado(DERIVADA_PLUS, (r) => {
      r.statistics["stats.ascan.40012.started"] = "1";
    });
    expect(medido(t, zap([40012, 40014])).resultado.ejecutada).toBe(false);
    const t2 = cambiado(t, (r) => {
      r.statistics["stats.ascan.40014.urls"] = 34;
    });
    expect(medido(t2, zap([40012, 40014])).resultado).toMatchObject({
      ejecutada: true,
      alertas: 0,
    });
  });
  it("una estadística en cero o que no es número no es constancia", () => {
    const t = cambiado(DERIVADA_PLUS, (r) => {
      r.statistics = {
        "stats.pscan.10038.time": "0",
        "stats.pscan.10003.time": "mucho",
      };
    });
    expect(medido(t, zap([10038])).resultado.ejecutada).toBe(false);
    expect(medido(t, zap([10003])).resultado.ejecutada).toBe(false);
  });
  it("las estadísticas de un sitio también cuentan", () => {
    const t = cambiado(DERIVADA_PLUS, (r) => {
      r.statistics = {};
      r.site[0].statistics = { "stats.pscan.10038.time": "5" };
    });
    expect(medido(t, zap([10038])).resultado.ejecutada).toBe(true);
  });
  it("el plan de automatización con avisos o errores se dice en el lote", () => {
    const c = corrida(DERIVADA_PLUS);
    expect(c.advertencias.map((a) => a.es).join(" ")).toContain("1 aviso(s)");
    const e = corrida(
      cambiado(DERIVADA_PLUS, (r) => (r.afPlanErrors = ["x", "y"])),
    );
    expect(e.advertencias.map((a) => a.es).join(" ")).toContain("2 error(es)");
  });
  it("lee la fecha y la hora de «created», en UTC", () => {
    const c = corrida(DERIVADA_PLUS);
    expect([c.fecha, c.hora, c.zonaHoraria]).toEqual([
      "2026-10-12",
      "14:05",
      "UTC",
    ]);
    expect(c.herramienta).toEqual({ id: "zap", version: "2.17.0" });
  });
});

describe("la agregación del selector", () => {
  it("todas_las_reglas: falla solo si todas levantan alerta, y exige constancia de todas", () => {
    const base = cambiado(DERIVADA_PLUS, (r) => {
      r.statistics["stats.pscan.10038.time"] = "5";
    });
    // 10035 alertó (1), 10038 corrió sin alertas: no todas alertan → cero alertas, ejecutada.
    expect(
      medido(base, zap([10035, 10038], "todas_las_reglas")).resultado,
    ).toMatchObject({
      ejecutada: true,
      alertas: 0,
    });
    // 10035 alertó y 10003 también (lo agregamos): todas alertan → 2.
    const dos = cambiado(base, (r) => {
      r.site[0].alerts.push({ ...r.site[0].alerts[0], pluginid: "10003" });
    });
    expect(
      medido(dos, zap([10035, 10003], "todas_las_reglas")).resultado.alertas,
    ).toBe(2);
    // sin constancia de una de ellas: no ejecutada.
    expect(
      medido(base, zap([10035, 40012], "todas_las_reglas")).resultado.ejecutada,
    ).toBe(false);
  });
  it("los pluginid llegan como cadena o como número", () => {
    const t = cambiado(DERIVADA, (r) => {
      r.site[0].alerts[0].pluginid = 10035;
      r.site[0].alerts[0].confidence = 3;
    });
    expect(medido(t, zap([10035])).resultado.alertas).toBe(1);
  });
  it("un pluginid o una confianza que no son enteros no se cuentan", () => {
    const t = cambiado(DERIVADA, (r) => {
      r.site[0].alerts[0].pluginid = "no-es-un-numero";
    });
    expect(medido(t, zap([10035])).resultado.ejecutada).toBe(false);
  });
});

describe("la frontera de contenido: attack, evidence, cuerpos y encabezados nunca salen", () => {
  it("ninguna medida de ninguna regla del paquete lleva un marcador sensible", () => {
    const paquete = Paquete.parse(
      JSON.parse(
        readFileSync(
          path.join(RAIZ, "datos/planes/act-demo-asistente.paquete.json"),
          "utf8",
        ),
      ),
    );
    const delZap = paquete.herramientas
      .filter((h) => h.herramienta === "zap")
      .flatMap((h) => h.pruebas);
    expect(delZap).toHaveLength(6);
    for (const t of [DERIVADA, DERIVADA_PLUS]) {
      const c = corrida(t);
      for (const p of delZap) {
        const salida = JSON.stringify(c.medir(p.selector));
        expect(salida, p.prueba).not.toMatch(
          /MARCADOR|Attack|CUERPO|CABECERA|AVISO-DEL-PLAN/,
        );
      }
      expect(JSON.stringify(c)).not.toMatch(
        /MARCADOR|CUERPO|CABECERA|AVISO-DEL-PLAN/,
      );
    }
  });
  it("las fixtures sí traen los marcadores: el gate no pasa por estar vacío", () => {
    for (const t of [DERIVADA, DERIVADA_PLUS]) {
      expect(t).toContain("ATAQUE-MARCADOR-NO-DEBE-PASAR");
      expect(t).toContain("EVIDENCIA-MARCADOR-NO-DEBE-PASAR");
    }
    expect(DERIVADA_PLUS).toContain("CUERPO-DE-PETICION-MARCADOR");
  });
  it("un selector de otra herramienta no le toca a este adaptador", () => {
    expect(
      corrida(DERIVADA).medir({
        tipo: "garak",
        probes: ["dan"],
        detectores: ["dan.DAN"],
        agregacion: "cualquier_detector",
      }),
    ).toEqual({ tipo: "no_aplica" });
  });
});

describe("el contrato: si ZAP cambia, el adaptador lo dice y el lote no se arma", () => {
  it("un campo renombrado (@version, site) → campo_ausente", () => {
    expect(
      motivo(
        cambiado(DERIVADA, (r) => {
          r.version = r["@version"];
          delete r["@version"];
        }),
      ),
    ).toBe("campo_ausente");
    expect(
      motivo(
        cambiado(DERIVADA, (r) => {
          r.sitios = r.site;
          delete r.site;
        }),
      ),
    ).toBe("campo_ausente");
  });
  it("una alerta sin pluginid o sin confidence → no_es_el_formato", () => {
    expect(
      motivo(
        cambiado(DERIVADA, (r) => {
          delete r.site[0].alerts[0].pluginid;
        }),
      ),
    ).toBe("no_es_el_formato");
    expect(
      motivo(
        cambiado(DERIVADA, (r) => {
          delete r.site[0].alerts[0].confidence;
        }),
      ),
    ).toBe("no_es_el_formato");
  });
  it("lo que no es JSON, o es JSON de otra cosa → no_es_el_formato", () => {
    expect(motivo("esto no es ZAP")).toBe("no_es_el_formato");
    expect(motivo("[1, 2]")).toBe("no_es_el_formato");
  });
  it("menor que la mínima → version_menor_que_la_minima", () => {
    expect(motivo(DERIVADA, "2.18.0")).toBe("version_menor_que_la_minima");
  });
  it("sin «created» no inventa la fecha ni la zona, y lo avisa", () => {
    const c = corrida(
      cambiado(DERIVADA, (r) => {
        delete r.created;
      }),
    );
    expect([c.fecha, c.hora, c.zonaHoraria]).toEqual([null, null, null]);
    expect(c.advertencias.map((a) => a.es).join(" ")).toContain("«created»");
  });
  it("sin «@programName» (add-on viejo) lo avisa", () => {
    const c = corrida(
      cambiado(DERIVADA, (r) => {
        delete r["@programName"];
      }),
    );
    expect(c.advertencias.map((a) => a.es).join(" ")).toContain("@programName");
  });
  it("un «created» sin zona no declara UTC", () => {
    const c = corrida(
      cambiado(DERIVADA, (r) => {
        r.created = "2026-10-12T14:05:00";
      }),
    );
    expect([c.fecha, c.zonaHoraria]).toEqual(["2026-10-12", null]);
  });
});

describe("la versión de ZAP fuera del rango probado avisa (S6-B6)", () => {
  const conVersion = (version: string) =>
    DERIVADA.replace(/"@version"\s*:\s*"[^"]*"/, `"@version": "${version}"`);
  const avisos = (t: string) =>
    corrida(t)
      .advertencias.map((a) => a.es)
      .join(" | ");
  it("la versión probada no avisa", () => {
    expect(avisos(DERIVADA)).not.toContain("fuera del rango probado");
  });
  it("una versión más nueva o más vieja avisa con su número", () => {
    expect(avisos(conVersion("2.18.0"))).toContain(
      "ZAP 2.18.0 está fuera del rango probado",
    );
  });
  it("«Dev Build» no se puede comparar y lo dice", () => {
    const l = ADAPTADOR_DE_ZAP.leer(OFICIAL, null);
    if (!l.ok) throw new Error(l.motivo);
    expect(l.corrida.advertencias.map((a) => a.es).join(" | ")).toContain(
      "no se puede comparar con la probada",
    );
  });
});
