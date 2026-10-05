// @vitest-environment node
// La salida de los comandos: texto para una persona en los dos idiomas (cada severidad con símbolo Y
// palabra, nunca solo color) y JSON para una máquina, con el código de salida de cada estado.
import { describe, expect, it } from "vitest";
import {
  CODIGOS_DE_SALIDA,
  codigoDeValidacion,
  informeDeInstantanea,
  informeDeValidacion,
  salidaJsonDeInstantanea,
  salidaJsonDeValidacion,
} from "../../../src/engine/catalogo/informe.ts";
import { construirInstantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { catalogoBase, conPrueba, referencia } from "./ayuda.ts";

async function conSemilla(cambio: (p: Record<string, unknown>) => void) {
  const c = catalogoBase();
  const p = referencia();
  cambio(p);
  conPrueba(c, p);
  return c;
}

describe("códigos de salida", () => {
  it("ok 0 · con advertencias 1 · inválido 2 · bloqueada 2 · uso 3", () => {
    expect(codigoDeValidacion("ok")).toBe(0);
    expect(codigoDeValidacion("con_advertencias")).toBe(1);
    expect(codigoDeValidacion("invalido")).toBe(2);
    expect(CODIGOS_DE_SALIDA.bloqueada).toBe(2);
    expect(CODIGOS_DE_SALIDA.uso).toBe(3);
  });
});

describe("informeDeValidacion", () => {
  it("en español: estado, conteos y cada hallazgo con símbolo, regla y nombre", async () => {
    const r = await validarCatalogo(await conSemilla((p) => delete p.marco_id));
    const texto = informeDeValidacion(r, "es");
    expect(texto.split("\n")[0]).toBe("Catálogo: inválido");
    expect(texto).toContain(
      "14 marcos · 1 mapa de equivalencias · 38 controles · 13 herramientas · 0 pruebas",
    );
    expect(texto).toContain("1 error · 0 advertencias · 4 notas");
    expect(texto).toContain("Errores (1)");
    expect(texto).toContain(
      "  ✗ datos/pruebas/SEMILLA-REFERENCIA.json · marco_id",
    );
    expect(texto).toContain("prueba/sin-marco: La prueba no cita un marco");
    expect(texto).toContain("Notas (4)");
    expect(texto.endsWith("\n")).toBe(true);
  });

  it("en inglés, con advertencias y detalle", async () => {
    const r = await validarCatalogo(
      await conSemilla((p) =>
        Object.assign(p, {
          version_marco: "2025",
          referencia_en_marco: "LLM07",
        }),
      ),
    );
    const texto = informeDeValidacion(r, "en");
    expect(texto.split("\n")[0]).toBe("Catalog: with warnings");
    expect(texto).toContain("1 test (1 publishable, 0 awaiting review)");
    expect(texto).toContain("Warnings (1)");
    expect(texto).toContain(
      "  ! datos/pruebas/SEMILLA-REFERENCIA.json · version_marco",
    );
    expect(texto).toContain(
      "“owasp-llm-top10 2025 LLM07” is LLM08 in version 2026",
    );
    expect(texto).toContain("  · datos/marcos/cwe.json · fecha_version");
  });

  it("un catálogo sin hallazgos no imprime secciones vacías", async () => {
    const r = await validarCatalogo(catalogoBase());
    const sinNotas = {
      ...r,
      hallazgos: [],
      conteos: { ...r.conteos, notas: 0 },
    };
    expect(informeDeValidacion(sinNotas, "es")).toBe(
      "Catálogo: ok\n  14 marcos · 1 mapa de equivalencias · 38 controles · 13 herramientas · 0 pruebas (0 publicables, 0 pendientes de revisión)\n  0 errores · 0 advertencias · 0 notas\n",
    );
  });

  it("un hallazgo del archivo entero no lleva campo", async () => {
    const c = catalogoBase();
    c.familias = null;
    const texto = informeDeValidacion(await validarCatalogo(c), "es");
    expect(texto).toContain("  ✗ datos/familias.json\n      archivo/falta:");
  });

  it("en JSON: estado, código, conteos y hallazgos con los dos idiomas", async () => {
    const r = await validarCatalogo(catalogoBase());
    const json = salidaJsonDeValidacion(r);
    expect(json).toMatchObject({ estado: "ok", codigo_de_salida: 0 });
    expect(json.hallazgos[0].nombre).toEqual({
      es: "Un dato del marco está por verificar",
      en: "A framework field is pending verification",
    });
  });
});

describe("informe de la instantánea", () => {
  it("emitida: dice dónde quedó y su huella, en los dos idiomas", async () => {
    const r = await construirInstantanea(catalogoBase(), "2026-10-15");
    if (!r.emitida) throw new Error("debía emitirse");
    const es = informeDeInstantanea(r, "datos/instantaneas/x.json", "es");
    expect(es).toContain("Instantánea emitida: datos/instantaneas/x.json");
    expect(es).toContain(`  huella: ${r.instantanea.huella}`);
    expect(es).toContain(
      "pruebas publicadas: 0 · pendientes de revisión: 0 · advertencias y notas: 4",
    );
    const en = informeDeInstantanea(r, null, "en");
    expect(en).toContain(`Snapshot written: ${r.archivo}`);
    expect(en).toContain("evaluation date: 2026-10-15");
    expect(salidaJsonDeInstantanea(r, null)).toMatchObject({
      emitida: true,
      codigo_de_salida: 0,
      archivo: r.archivo,
      huella: r.instantanea.huella,
    });
    expect(salidaJsonDeInstantanea(r, "a/b.json").archivo).toBe("a/b.json");
  });

  it("bloqueada: dice que no escribió nada y por qué", async () => {
    const r = await construirInstantanea(
      await conSemilla((p) => delete p.marco_id),
      "2026-10-15",
    );
    expect(informeDeInstantanea(r, null, "es")).toMatch(
      /^Instantánea bloqueada: el catálogo es inválido \(1 error\)\. No se escribió nada\.\n\nCatálogo: inválido/,
    );
    expect(informeDeInstantanea(r, null, "en")).toMatch(
      /^Snapshot blocked: the catalog is invalid \(1 error\)\. Nothing was written\./,
    );
    expect(salidaJsonDeInstantanea(r, null)).toMatchObject({
      emitida: false,
      codigo_de_salida: 2,
    });
  });
});
