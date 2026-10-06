// @vitest-environment node
// Validación del instrumento para el catálogo (C18 parcial: RF-10.1 y E-15). Cada semilla del kit de prueba
// se agrega SOLA al catálogo real y el validador tiene que responder lo que el manifiesto espera: las
// inválidas se rechazan nombrando su regla, la sin control se acepta con advertencia y las que tienen forma
// de procedimiento quedan marcadas sin rechazarse. Se cuenta cuántas bloquea sobre cuántas se sembraron.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { catalogoReal, RAIZ, SEMILLAS } from "../catalogo/ayuda.ts";

interface Semilla {
  archivo: string;
  requisito: string;
  que_siembra: { es: string; en: string };
  espera: {
    estado: "ok" | "con_advertencias" | "invalido";
    errores: string[];
    advertencias: string[];
    detalle_contiene?: string;
  };
}

const manifiesto = JSON.parse(
  readFileSync(`${RAIZ}/${SEMILLAS}/semillas.json`, "utf8"),
) as { semillas: Semilla[] };

async function correr(semilla: Semilla) {
  const ruta = `${SEMILLAS}/${semilla.archivo}`;
  const c = catalogoReal();
  c.pruebas.push({ ruta, texto: readFileSync(`${RAIZ}/${ruta}`, "utf8") });
  const r = await validarCatalogo(c);
  const propios = r.hallazgos.filter((h) => h.ruta === ruta);
  const reglas = (severidad: string) =>
    [
      ...new Set(
        propios.filter((h) => h.severidad === severidad).map((h) => h.regla),
      ),
    ].sort();
  const errores = reglas("error");
  const advertencias = reglas("advertencia");
  const estado =
    errores.length > 0
      ? "invalido"
      : advertencias.length > 0
        ? "con_advertencias"
        : "ok";
  const evaluada = r.catalogo.pruebas.find((p) => p.ruta === ruta);
  return { r, propios, errores, advertencias, estado, evaluada };
}

describe("semillas del catálogo (C18 · RF-10.1 · E-15)", () => {
  it.each(manifiesto.semillas)("$archivo ($requisito)", async (semilla) => {
    const { errores, advertencias, estado, propios, r } = await correr(semilla);
    expect({ estado, errores, advertencias }).toEqual({
      estado: semilla.espera.estado,
      errores: semilla.espera.errores,
      advertencias: semilla.espera.advertencias,
    });
    if (semilla.espera.detalle_contiene !== undefined) {
      expect(
        propios.some((h) =>
          h.detalle?.es.includes(semilla.espera.detalle_contiene!),
        ),
      ).toBe(true);
    }
    // El estado del catálogo entero sigue al de la semilla: el catálogo real por sí solo no tiene errores.
    expect(r.estado === "invalido").toBe(estado === "invalido");
  });

  it("las marcadas por el filtro nunca se rechazan por eso, y no entran a una instantánea", async () => {
    const marcadas = manifiesto.semillas.filter((s) =>
      s.espera.advertencias.includes("filtro/marcada"),
    );
    expect(marcadas.length).toBeGreaterThanOrEqual(4);
    for (const s of marcadas) {
      const { errores, evaluada } = await correr(s);
      expect(errores).toEqual([]);
      expect(evaluada?.publicable).toBe(false);
    }
  });

  it("bloquea N de N sembradas: toda semilla que espera rechazo es rechazada", async () => {
    const invalidas = manifiesto.semillas.filter(
      (s) => s.espera.estado === "invalido",
    );
    let bloqueadas = 0;
    for (const s of invalidas)
      if ((await correr(s)).estado === "invalido") bloqueadas++;
    console.info(
      `C18 catálogo: bloquea ${bloqueadas} de ${invalidas.length} semillas inválidas sembradas`,
    );
    expect(invalidas.length).toBeGreaterThanOrEqual(11);
    expect(bloqueadas).toBe(invalidas.length);
  });

  it("el manifiesto nombra cada semilla del directorio, y cada semilla tiene textos en los dos idiomas", () => {
    const enCarpeta = readdirSync(`${RAIZ}/${SEMILLAS}`)
      .filter((n) => n.startsWith("SEMILLA-") && n.endsWith(".json"))
      .sort();
    expect(manifiesto.semillas.map((s) => s.archivo).sort()).toEqual(enCarpeta);
    for (const s of manifiesto.semillas) {
      expect(s.que_siembra.es).not.toBe(s.que_siembra.en);
    }
    expect(new Set(manifiesto.semillas.map((s) => s.archivo)).size).toBe(
      manifiesto.semillas.length,
    );
  });
});
