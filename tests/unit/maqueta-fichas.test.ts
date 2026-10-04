// Gate «cada fila abre SU ficha»: en el catálogo de la maqueta, el enlace de cada prueba lleva a la
// página de esa prueba —no a una ficha de ejemplo— y la ficha dice la MISMA vigencia que la fila, con
// su aviso cuando no está vigente. Origen: mirada 2 de la Etapa de Diseño, 2026-10-04 — todas las filas
// abrían la ficha de PR-IA-PINJ-001 y una prueba vencida se leía «Vigente» al abrirla; lo vio el usuario,
// no una prueba. Corre también 45 días después, cuando varias filas ya cambiaron de estado.
import { readFileSync, rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import {
  documentoDe,
  generarEnTemporal,
  leerPagina,
  paginasDe,
  RAIZ_MAQUETA,
} from "./lib/maqueta";

const DIA = 86_400_000;
const hoy: string = JSON.parse(
  readFileSync("scripts/maqueta/datos/consulta.json", "utf8"),
).fecha;
const despues = new Date(Date.parse(`${hoy}T00:00:00Z`) + 45 * DIA)
  .toISOString()
  .slice(0, 10);

const futuro = generarEnTemporal(despues);
afterAll(() => rmSync(futuro, { recursive: true, force: true }));

function filasDe(dir: string) {
  const catalogo = documentoDe(leerPagina(dir, "catalogo.html"));
  return [...catalogo.querySelectorAll("[data-filtrable]")].map((fila) => ({
    id: fila.getAttribute("data-prueba"),
    vigencia: fila.getAttribute("data-vigencia"),
    destino: fila.querySelector("a")?.getAttribute("href") ?? null,
  }));
}

describe.each([
  ["versionada", RAIZ_MAQUETA],
  [`a ${despues}`, futuro],
])("maqueta %s: cada fila del catálogo abre su ficha", (_nombre, dir) => {
  const filas = filasDe(dir);
  const paginas = paginasDe(dir);

  it("el catálogo tiene filas, y cada una con su identificador y su enlace", () => {
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.id, "fila sin data-prueba").toBeTruthy();
      expect(
        fila.destino,
        `${fila.id}: fila sin enlace a su ficha`,
      ).toBeTruthy();
    }
    expect(
      new Set(filas.map((f) => f.destino)).size,
      "dos filas abren la misma ficha",
    ).toBe(filas.length);
  });

  it("la ficha que abre cada fila es la de esa prueba y dice su misma vigencia", () => {
    for (const fila of filas) {
      expect(paginas, `${fila.id}: su ficha no existe`).toContain(fila.destino);
      const ficha = documentoDe(leerPagina(dir, fila.destino!));
      const cuerpo = ficha.querySelector("[data-ficha-de]");
      expect(
        cuerpo?.getAttribute("data-ficha-de"),
        `${fila.id} abre la ficha de otra prueba (${fila.destino})`,
      ).toBe(fila.id);
      expect(
        cuerpo?.getAttribute("data-ficha-vigencia"),
        `${fila.id}: la fila y la ficha no dicen la misma vigencia`,
      ).toBe(fila.vigencia);

      // La vigencia se LEE en la cabecera: el primer dato fechado de la cabecera es el de la prueba.
      const leida = ficha.querySelector(
        ".hg-cabecera [data-fechado='vigencia']",
      );
      expect(
        leida?.getAttribute("data-estado-fechado"),
        `${fila.id}: el encabezado de la ficha dice otra vigencia`,
      ).toBe(fila.vigencia);

      // Y el aviso: lo lleva quien no está vigente, y solo quien no lo está.
      const aviso =
        ficha
          .querySelector("[data-aviso-de-vigencia]")
          ?.getAttribute("data-aviso-de-vigencia") ?? "vigente";
      expect(aviso, `${fila.id}: el aviso de vigencia de la ficha`).toBe(
        fila.vigencia,
      );
    }
    // Lee y analiza cada ficha: con la máquina cargada pasaba de los 5 s por defecto (2026-10-04).
  }, 30_000);

  it("cada familia dice la vigencia de su prueba más atrasada, y cuántas pruebas tiene (RF-01.5)", () => {
    const catalogo = documentoDe(leerPagina(dir, "catalogo.html"));
    const familias = [...catalogo.querySelectorAll("[data-familia-vigencia]")];
    expect(
      familias.length,
      "el catálogo no dibuja la vigencia por familia",
    ).toBeGreaterThan(0);
    const ORDEN = ["vigente", "por_revisar", "vencido"];
    for (const familia of familias) {
      const id = familia.getAttribute("data-familia-vigencia");
      const suyas = [
        ...catalogo.querySelectorAll(`[data-filtrable][data-familia="${id}"]`),
      ].map((f) => f.getAttribute("data-vigencia")!);
      const peor = suyas.reduce(
        (a, b) => (ORDEN.indexOf(b) > ORDEN.indexOf(a) ? b : a),
        "vigente",
      );
      expect(
        familia.getAttribute("data-pruebas"),
        `${id}: cuántas pruebas`,
      ).toBe(String(suyas.length));
      expect(
        familia
          .querySelector("[data-fechado='vigencia']")
          ?.getAttribute("data-estado-fechado"),
        `${id}: la familia no dice la vigencia de su prueba más atrasada`,
      ).toBe(peor);
    }
  });
});

it("la matriz de fichas vio los tres estados de vigencia", () => {
  const vistos = new Set(
    [...filasDe(RAIZ_MAQUETA), ...filasDe(futuro)].map((f) => f.vigencia),
  );
  expect([...vistos].sort()).toEqual(["por_revisar", "vencido", "vigente"]);
});
