// @vitest-environment node
// Los filtros de la lista: cada uno reduce, se suman, «quitar filtros» restaura, y la cuenta es la de las filas que quedan.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import {
  CAMPOS,
  SIN_CONTROL,
  SIN_FILTROS,
  filtrar,
  hayFiltros,
  type Filtros,
} from "../../src/lib/catalogo/filtros.ts";
import { construirVista } from "../../src/lib/catalogo/vista.ts";

const RAIZ = join(__dirname, "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
// Una fecha con los tres estados presentes, para que el filtro de vigencia tenga qué separar.
const vista = construirVista(snap, archivo, "2026-11-04");
const todas = vista.filas;
const con = (parcial: Partial<Filtros>): Filtros => ({
  ...SIN_FILTROS,
  ...parcial,
});

describe("filtros del catálogo", () => {
  it("sin filtros se ven las 38 y no hay filtros activos", () => {
    expect(filtrar(todas, SIN_FILTROS)).toHaveLength(38);
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
  });

  it.each(["familia", "marco", "madurez", "vigencia", "revision"] as const)(
    "el filtro de %s deja solo las filas que tienen cada uno de sus valores, y entre todos suman las 38",
    (campo) => {
      const valores = [
        ...new Set(
          todas.map(
            (f) =>
              ({
                familia: f.familia,
                marco: f.marcoId,
                madurez: f.madurez,
                vigencia: f.vigencia.estado,
                revision: f.revision,
              })[campo],
          ),
        ),
      ];
      let suma = 0;
      for (const valor of valores) {
        const quedan = filtrar(todas, con({ [campo]: valor }));
        expect(quedan.length).toBeGreaterThan(0);
        suma += quedan.length;
      }
      expect(suma).toBe(38);
      expect(hayFiltros(con({ [campo]: valores[0] }))).toBe(true);
    },
  );

  it("el filtro de control separa las que tienen ese control, y «ninguno» deja las que no tienen ninguno", () => {
    const sinControl = filtrar(todas, con({ control: SIN_CONTROL }));
    expect(sinControl).toHaveLength(vista.cifras[3]!.n);
    expect(sinControl.every((f) => f.controles.length === 0)).toBe(true);
    const unControl = todas.find((f) => f.controles.length > 0)!.controles[0]!;
    const conEseControl = filtrar(todas, con({ control: unControl }));
    expect(conEseControl.length).toBeGreaterThan(0);
    expect(conEseControl.every((f) => f.controles.includes(unControl))).toBe(
      true,
    );
  });

  it("los filtros se suman: cada uno añadido deja igual o menos filas, y al quitarlos vuelven las 38", () => {
    const familia = todas[0]!.familia;
    const uno = filtrar(todas, con({ familia }));
    const dos = filtrar(todas, con({ familia, vigencia: "vencido" }));
    const tres = filtrar(
      todas,
      con({ familia, vigencia: "vencido", madurez: "estandar" }),
    );
    expect(uno.length).toBeGreaterThan(0);
    expect(dos.length).toBeLessThanOrEqual(uno.length);
    expect(tres.length).toBeLessThanOrEqual(dos.length);
    expect(
      dos.every(
        (f) => f.familia === familia && f.vigencia.estado === "vencido",
      ),
    ).toBe(true);
    expect(filtrar(todas, SIN_FILTROS)).toHaveLength(38);
  });

  it("una combinación imposible no deja ninguna fila (el estado «sin resultados»)", () => {
    const algo = todas[0]!;
    const otraFamilia = todas.find((f) => f.familia !== algo.familia)!.familia;
    expect(
      filtrar(
        todas,
        con({
          familia: algo.familia,
          marco: todas.find((f) => f.familia === otraFamilia)!.marcoId,
          control: SIN_CONTROL,
          revision: "marcada_para_revision",
        }),
      ),
    ).toEqual([]);
  });

  it("los seis campos son los de la maqueta aprobada", () => {
    expect([...CAMPOS]).toEqual([
      "familia",
      "marco",
      "control",
      "madurez",
      "vigencia",
      "revision",
    ]);
  });
});
