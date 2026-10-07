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
import { catalogoBase, conPrueba, CUENTAS_BASE, referencia } from "./ayuda.ts";

const { marcos, mapas, controles, herramientas, familias, notas } = CUENTAS_BASE;
const inventario = `${marcos} marcos · ${mapas} mapa${mapas === 1 ? "" : "s"} de equivalencias · ${controles} controles · ${herramientas} herramientas`;

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
      `${inventario} · 0 pruebas`,
    );
    expect(texto).toContain(`1 error · 0 advertencias · ${notas} notas`);
    expect(texto).toContain("Errores (1)");
    expect(texto).toContain(
      "  ✗ datos/pruebas/SEMILLA-REFERENCIA.json · marco_id",
    );
    expect(texto).toContain("prueba/sin-marco: La prueba no cita un marco");
    expect(texto).toContain(`Notas (${notas})`);
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
    expect(texto).toContain("  · datos/marcos/owasp-top10.json · fecha_version");
  });

  it("un catálogo sin hallazgos no imprime secciones vacías", async () => {
    const r = await validarCatalogo(catalogoBase());
    const sinNotas = {
      ...r,
      hallazgos: [],
      conteos: { ...r.conteos, notas: 0 },
    };
    expect(informeDeValidacion(sinNotas, "es")).toBe(
      `Catálogo: ok\n  ${inventario} · 0 pruebas (0 publicables, 0 pendientes de revisión)\n  0 errores · 0 advertencias · 0 notas\n`,
    );
  });

  it("concuerda en número: una prueba publicable, una pendiente de revisión", async () => {
    const c = catalogoBase();
    const limpia = referencia();
    limpia.id = "PR-CASO-001";
    const marcada = {
      ...referencia(),
      id: "PR-CASO-002",
      notas: { es: "Ejemplo:\n$ ls", en: "Example:\n$ ls -a" },
    };
    conPrueba(c, limpia);
    conPrueba(c, marcada);
    const texto = informeDeValidacion(await validarCatalogo(c), "es");
    expect(texto).toContain(
      "2 pruebas (1 publicable, 1 pendiente de revisión)",
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
      `pruebas publicadas: 0 · pendientes de revisión: 0 · advertencias y notas: ${notas}`,
    );
    expect(es).toContain(
      [
        "  vigencia (por revisar desde 30 días, vencido desde 60):",
        "    pruebas: ninguna",
        `    marcos: ✓ Vigente ${marcos}`,
        `    herramientas: ✓ Vigente ${herramientas}`,
        `    familias: ninguna · sin pruebas publicadas ${familias}`,
      ].join("\n"),
    );
    const en = informeDeInstantanea(r, null, "en");
    expect(en).toContain(`Snapshot written: ${r.archivo}`);
    expect(en).toContain("evaluation date: 2026-10-15");
    expect(en).toContain(
      `  freshness (review due from 30 days, overdue from 60):\n    tests: none\n    frameworks: ✓ Current ${marcos}`,
    );
    expect(salidaJsonDeInstantanea(r, null)).toMatchObject({
      emitida: true,
      codigo_de_salida: 0,
      archivo: r.archivo,
      huella: r.instantanea.huella,
      vigencia: {
        pruebas: { vigente: 0, por_revisar: 0, vencido: 0 },
        marcos: { vigente: marcos, por_revisar: 0, vencido: 0 },
      },
    });
    expect(salidaJsonDeInstantanea(r, "a/b.json").archivo).toBe("a/b.json");
  });

  it("la vigencia muestra cada estado con su marca y su nombre, y no dibuja los ceros", async () => {
    const c = await conSemilla((p) => (p.fecha_verificacion = "2026-08-20"));
    const r = await construirInstantanea(c, "2026-10-15");
    if (!r.emitida) throw new Error("debía emitirse");
    const es = informeDeInstantanea(r, null, "es");
    expect(es).toContain("    pruebas: ! Por revisar 1\n");
    expect(es).toContain(
      `    familias: ! Por revisar 1 · sin pruebas publicadas ${familias - 1}\n`,
    );
    const tarde = await construirInstantanea(c, "2026-12-15");
    if (!tarde.emitida) throw new Error("debía emitirse");
    expect(informeDeInstantanea(tarde, null, "en")).toContain(
      `    frameworks: ✗ Overdue ${marcos}\n`,
    );
    expect(informeDeInstantanea(tarde, null, "en")).toContain(
      `    families: ✗ Overdue 1 · no published tests ${familias - 1}\n`,
    );
  });

  it("un estado sin etiqueta en el vocabulario se muestra por su id, nunca en blanco", async () => {
    const r = await construirInstantanea(catalogoBase(), "2026-10-15");
    if (!r.emitida) throw new Error("debía emitirse");
    const sinEtiquetas = structuredClone(r);
    sinEtiquetas.instantanea.catalogo.estados = [];
    expect(informeDeInstantanea(sinEtiquetas, null, "es")).toContain(
      `    marcos: vigente ${marcos}\n`,
    );
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
