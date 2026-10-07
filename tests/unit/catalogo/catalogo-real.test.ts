// @vitest-environment node
// El catálogo real de `datos/` (fase 2 del S1): lo que tiene que cumplir como dato, además de pasar el
// validador. Cada familia cubre todas sus categorías; los controles del Anexo A nacen sin contrastar con la
// norma (G-Plan P1); cada prueba vive en la carpeta de su familia; y las únicas advertencias admitidas son
// las que el plan espera: pruebas sin control y pruebas que el filtro marcó.
import { describe, expect, it } from "vitest";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import * as maqueta from "../../../scripts/maqueta/nucleo/estados.mjs";
import { catalogoReal } from "./ayuda.ts";

const resultado = await validarCatalogo(catalogoReal());
const { catalogo } = resultado;

describe("el catálogo real", () => {
  it("no tiene errores, y solo advierte lo que el plan espera", () => {
    expect(resultado.hallazgos.filter((h) => h.severidad === "error")).toEqual(
      [],
    );
    const advertencias = new Set(
      resultado.hallazgos
        .filter((h) => h.severidad === "advertencia")
        .map((h) => h.regla),
    );
    expect(
      [...advertencias].filter(
        (r) => r !== "prueba/sin-control" && r !== "filtro/marcada",
      ),
    ).toEqual([]);
  });

  it.each(
    catalogo.familias.flatMap((f) =>
      f.categorias.map((c) => [f.id, c.id] as const),
    ),
  )("%s · %s tiene al menos una prueba", (familia, categoria) => {
    expect(
      catalogo.pruebas.some(
        (p) => p.prueba.familia === familia && p.prueba.categoria === categoria,
      ),
    ).toBe(true);
  });

  it("el nombre de cada marco es su título propio, sin glosas en español (regla 20)", () => {
    // Lo redactado por nosotros va en `notas` como { es, en }; el nombre es el título que publica el editor.
    expect(catalogo.marcos.length).toBeGreaterThan(0);
    for (const m of catalogo.marcos)
      expect(m.nombre, m.id).not.toMatch(
        /[áéíóúñ¿¡]|\b(y|de|del|la|los|las|el|lista|documentación)\b/i,
      );
  });

  it("cada prueba vive en datos/pruebas/<su familia>/", () => {
    for (const p of catalogo.pruebas)
      expect(p.ruta).toBe(
        `datos/pruebas/${p.prueba.familia}/${p.prueba.id}.json`,
      );
  });

  it("ningún control del Anexo A dice estar verificado contra la norma (G-Plan P1)", () => {
    const controles = catalogo.controles.flatMap((capa) =>
      capa.areas.flatMap((a) => a.controles),
    );
    expect(controles.length).toBeGreaterThan(0);
    expect(controles.filter((c) => c.verificado_contra_norma)).toEqual([]);
  });

  it("toda herramienta pública tiene su registro consultado con 200", () => {
    for (const h of catalogo.herramientas.filter((x) => x.tipo === "publica")) {
      expect(h.registro?.http, h.id).toBe(200);
    }
  });

  it("toda prueba de una familia estocástica que mide sobre el activo declara k", () => {
    const estocasticas = new Set(
      catalogo.familias.filter((f) => f.estocastica).map((f) => f.id),
    );
    const conK = new Set(
      catalogo.reglas_de_veredicto.filter((r) => r.requiere_k).map((r) => r.id),
    );
    for (const { prueba } of catalogo.pruebas) {
      if (
        estocasticas.has(prueba.familia) &&
        conK.has(prueba.criterio_de_veredicto.regla)
      ) {
        expect(
          prueba.criterio_de_veredicto.repeticiones_k,
          prueba.id,
        ).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("los umbrales de vigencia son los de RF-01.5: por revisar desde 30 días, vencido desde 60", () => {
    expect(catalogo.umbrales?.vigencia).toMatchObject({
      por_revisar: 30,
      vencido: 60,
    });
  });

  it("el vocabulario de estados es el de la maqueta aprobada en G-Diseño, estado por estado", () => {
    type Entrada = {
      rol: string;
      simbolo: string;
      nombre: { es: string; en: string };
    };
    const deLaMaqueta: Record<string, Record<string, Entrada>> = {
      veredicto: maqueta.VEREDICTO,
      vigencia: maqueta.VIGENCIA,
      revision_de_riesgo: maqueta.REVISION,
      equivalencia: { parcial: maqueta.MAPA_INCOMPLETO },
      estado_de_control: maqueta.ESTADO_DE_CONTROL,
      severidad: maqueta.SEVERIDAD,
      confirmacion: maqueta.CONFIRMACION,
      estado_de_activo: maqueta.ESTADO_DE_ACTIVO,
      estado_de_hallazgo: maqueta.ESTADO_DE_HALLAZGO,
    };
    const deDatos = Object.fromEntries(
      catalogo.estados.map((v) => [
        v.id,
        Object.fromEntries(
          v.estados.map(({ id, rol, simbolo, nombre }) => [
            id,
            { rol, simbolo, nombre },
          ]),
        ),
      ]),
    );
    expect(deDatos).toEqual(deLaMaqueta);
  });
});
