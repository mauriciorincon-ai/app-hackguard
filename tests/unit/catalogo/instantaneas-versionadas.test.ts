// @vitest-environment node
// Las instantáneas versionadas en `datos/instantaneas/` (RF-01.7). Cada una es autoconsistente: su huella es la
// de su contenido, su nombre es su fecha más los 12 primeros caracteres de su huella y sus bytes son los que
// escribe el CLI, sin reformatear. Su propio catálogo, reconstruido desde el archivo, pasa el validador de hoy;
// y si el filtro de hoy es la versión que ella cita, re-emitirla da su misma huella. Una edición a mano que deje
// el catálogo inválido, o que toque el semáforo, los pendientes o las advertencias, no pasa aunque recalcule la
// huella; una que lo deje válido sí pasa, y su registro es git. No se exige que coincida con el catálogo de hoy.
// Una instantánea que el validador de hoy rechaza se reemplaza en el mismo PR por una re-emitida, mientras
// ningún plan la cite (ADR-002).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  construirInstantanea,
  FORMATO_DE_INSTANTANEA,
  huellaDeInstantanea,
  nombreDeInstantanea,
  type Instantanea,
} from "../../../src/engine/catalogo/instantanea.ts";
import type {
  ArchivoDeDatos,
  CatalogoEnBruto,
} from "../../../src/engine/catalogo/tipos.ts";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { RAIZ } from "./ayuda.ts";

const CARPETA = path.join(RAIZ, "datos", "instantaneas");
const archivos = readdirSync(CARPETA)
  .filter((n) => n.endsWith(".json"))
  .sort();

const deDatos = (relativa: string) =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8")) as Record<
    string,
    unknown
  >;

/**
 * Los archivos de `datos/` que darían esta instantánea. Ella no lleva los patrones del filtro ni el propósito de
 * los estados: se toman de hoy, y `mismoFiltro` dice si el filtro de hoy es la versión y fecha que ella cita.
 */
function reconstruir(s: Instantanea): {
  bruto: CatalogoEnBruto;
  mismoFiltro: boolean;
} {
  const filtro = deDatos("datos/filtro/patrones.json");
  const c = s.catalogo;
  const a = (ruta: string, v: unknown): ArchivoDeDatos => ({
    ruta,
    texto: JSON.stringify(v),
  });
  const conId = (carpeta: string, xs: { id: string }[]) =>
    xs.map((x) => a(`${carpeta}/${x.id}.json`, x));
  return {
    mismoFiltro:
      filtro.version === c.filtro?.version && filtro.fecha === c.filtro?.fecha,
    bruto: {
      familias: a("datos/familias.json", { familias: c.familias }),
      reglas_de_veredicto: a("datos/reglas-de-veredicto.json", {
        reglas: c.reglas_de_veredicto,
      }),
      rasgos: a("datos/rasgos-de-perfil.json", { rasgos: c.rasgos }),
      filtro: a("datos/filtro/patrones.json", filtro),
      umbrales: a("datos/umbrales.json", c.umbrales),
      estados: a("datos/estados.json", {
        proposito: deDatos("datos/estados.json").proposito,
        vocabularios: c.estados,
      }),
      marcos: conId("datos/marcos", c.marcos),
      equivalencias: conId("datos/marcos/equivalencias", c.equivalencias),
      controles: conId("datos/controles", c.controles),
      herramientas: conId("datos/herramientas", c.herramientas),
      pruebas: c.pruebas.map((p) =>
        a(`datos/pruebas/${p.familia}/${p.id}.json`, p),
      ),
    },
  };
}

describe("las instantáneas versionadas", () => {
  it("existe al menos una (la primera oficial nace en el S1)", () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)(
    "%s: su huella es la de su contenido y su nombre lleva su fecha y su huella",
    async (nombre) => {
      const texto = readFileSync(path.join(CARPETA, nombre), "utf8");
      const instantanea = JSON.parse(texto) as Instantanea;
      const { huella, ...cuerpo } = instantanea;
      expect(instantanea.formato).toBe(FORMATO_DE_INSTANTANEA);
      expect(await huellaDeInstantanea(cuerpo)).toBe(huella);
      expect(nombre).toBe(
        nombreDeInstantanea(instantanea.fecha_evaluacion, huella),
      );
      expect(texto).toBe(`${JSON.stringify(instantanea, null, 2)}\n`);
    },
  );

  it.each(archivos)(
    "%s: su propio catálogo pasa hoy el validador y, con el mismo filtro, se re-emite idéntica",
    async (nombre) => {
      const s = JSON.parse(
        readFileSync(path.join(CARPETA, nombre), "utf8"),
      ) as Instantanea;
      const { bruto, mismoFiltro } = reconstruir(s);
      const v = await validarCatalogo(bruto);
      expect(
        v.hallazgos
          .filter((h) => h.severidad === "error")
          .map((h) => `${h.regla} ${h.ruta}`),
      ).toEqual([]);
      if (mismoFiltro) {
        const r = await construirInstantanea(bruto, s.fecha_evaluacion);
        expect(r.emitida && r.instantanea.huella).toBe(s.huella);
      }
    },
  );
});
