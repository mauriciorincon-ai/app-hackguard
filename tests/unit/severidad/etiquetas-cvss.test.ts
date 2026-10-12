// @vitest-environment node
// Los nombres de las métricas de CVSS 4.0 son dato: cubren cada métrica base y cada valor del validador estricto.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EtiquetasDeCvss,
  REGLAS_DE_ETIQUETAS_DE_CVSS,
  nombreDeMetrica,
  validarEtiquetasDeCvss,
} from "../../../src/engine/severidad/etiquetas-cvss.ts";
import { METRICAS_BASE, METRICAS_OPCIONALES } from "../../../src/engine/severidad/validar-vector.ts";

const E = EtiquetasDeCvss.parse(JSON.parse(readFileSync("datos/severidad/cvss-etiquetas.json", "utf8")));
const copia = () => structuredClone(E);
const reglas = (e: EtiquetasDeCvss) => validarEtiquetasDeCvss(e).hallazgos.map((h) => h.regla);

describe("los nombres de las métricas de CVSS 4.0", () => {
  it("la tabla de datos es válida", () => {
    expect(validarEtiquetasDeCvss(E)).toEqual({ estado: "ok", hallazgos: [] });
  });
  it("nombra las 11 métricas base con todos sus valores, en los dos idiomas", () => {
    expect(E.metricas.map((m) => m.clave)).toEqual(METRICAS_BASE.map(([k]) => k));
    for (const m of E.metricas) {
      expect(m.nombre.es.length, m.clave).toBeGreaterThan(2);
      expect(m.nombre.en.length, m.clave).toBeGreaterThan(2);
      for (const v of m.valores) expect(v.nombre.es && v.nombre.en, `${m.clave}:${v.valor}`).toBeTruthy();
    }
  });
  it("las 21 opcionales están en un grupo cada una", () => {
    const claves = E.grupos.flatMap((g) => g.claves).sort();
    expect(claves).toEqual(METRICAS_OPCIONALES.map(([k]) => k).sort());
  });
  it("el nombre de una base sale con el de su valor; una opcional, por grupo y sin valor", () => {
    expect(nombreDeMetrica(E, "AV", "N")).toEqual({
      metrica: { es: "Vector de ataque", en: "Attack vector" },
      valor: { es: "Red", en: "Network" },
    });
    expect(nombreDeMetrica(E, "SC", "L").valor).toEqual({ es: "Bajo", en: "Low" });
    expect(nombreDeMetrica(E, "E", "A")).toEqual({ metrica: { es: "Métrica de amenaza", en: "Threat metric" }, valor: null });
    expect(nombreDeMetrica(E, "MAV", "N").metrica.en).toBe("Environmental metric");
    expect(nombreDeMetrica(E, "U", "Red").metrica.es).toBe("Métrica suplementaria");
  });
  it("una clave que no existe se devuelve tal cual, y un valor sin nombre queda en null", () => {
    expect(nombreDeMetrica(E, "ZZ", "Q")).toEqual({ metrica: { es: "ZZ", en: "ZZ" }, valor: null });
    expect(nombreDeMetrica(E, "AV", "Z").valor).toBeNull();
  });
});

describe("la que no cubre al validador no es válida", () => {
  it("a una base le falta su nombre", () => {
    const e = copia();
    e.metricas = e.metricas.filter((m) => m.clave !== "AT");
    expect(reglas(e)).toEqual(["etiquetas-cvss/metrica-base-sin-nombre"]);
  });
  it("a una base le falta el nombre de un valor", () => {
    const e = copia();
    e.metricas.find((m) => m.clave === "PR")!.valores.pop();
    expect(reglas(e)).toEqual(["etiquetas-cvss/metrica-base-sin-nombre"]);
  });
  it("se nombra lo que CVSS 4.0 no tiene", () => {
    const e = copia();
    e.metricas.push({ clave: "ZZ", nombre: { es: "x", en: "x" }, valores: [] });
    e.metricas.find((m) => m.clave === "AC")!.valores.push({ valor: "Q", nombre: { es: "q", en: "q" } });
    e.grupos[0]!.claves.push("QQ");
    expect(reglas(e)).toEqual(Array(3).fill("etiquetas-cvss/metrica-desconocida"));
  });
  it("una opcional sin grupo o en dos", () => {
    const sin = copia();
    sin.grupos[0]!.claves = [];
    expect(reglas(sin)).toEqual(["etiquetas-cvss/opcional-sin-grupo"]);
    const dos = copia();
    dos.grupos[1]!.claves.push("E");
    expect(reglas(dos)).toEqual(["etiquetas-cvss/opcional-sin-grupo"]);
  });
  it("cada regla tiene nombre en los dos idiomas", () => {
    for (const r of Object.values(REGLAS_DE_ETIQUETAS_DE_CVSS)) {
      expect(r.nombre.es).not.toBe("");
      expect(r.nombre.en).not.toBe("");
    }
  });
});
