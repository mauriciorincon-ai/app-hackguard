// @vitest-environment node
// Las cinco vistas de la brecha se construyen con los datos reales y dicen lo que el motor calculó: ninguna recalcula.
import { describe, expect, it } from "vitest";
import {
  construirVistaDeBrecha,
  construirVistaDeControl,
  construirVistaDeControles,
  construirVistaDeInforme,
  construirVistaDeTablero,
  filtroDeVeredicto,
  idsDeControles,
} from "../../../src/lib/brecha/vista.ts";
import { mundoDeBrecha } from "../lib/mundo-de-brecha";

const m = await mundoDeBrecha();

describe("las cinco vistas de la brecha, con los datos reales", () => {
  it("se construyen sin lanzar y hablan de la misma fecha y de la misma instantánea", () => {
    const vistas = [
      construirVistaDeTablero(m),
      construirVistaDeBrecha(m),
      construirVistaDeControles(m),
      construirVistaDeInforme(m),
      ...idsDeControles(m).map((id) => construirVistaDeControl(id, m)),
    ];
    expect(vistas).toHaveLength(4 + 8);
    for (const v of vistas) {
      expect(v.consulta).toBe(m.consulta);
      expect(v.instantanea).toBe(m.nombre);
    }
    console.log(
      JSON.stringify(
        construirVistaDeTablero(m).cifras.map((c) => [c.clave, c.valor]),
      ),
    );
    console.log(
      JSON.stringify(
        construirVistaDeTablero(m).validacion.comprobaciones.map((c) => [
          c.requisito,
          c.obtenidas,
          c.sembradas,
        ]),
      ),
    );
    console.log(m.brecha.huella.slice(0, 12), m.huellaDelInforme.slice(0, 12));
  });
});

describe("el filtro «Veredicto» de la brecha (S7-M2)", () => {
  const v = construirVistaDeBrecha(m);
  it("una parcial cuenta como fallida, igual que en las cifras de arriba, y las demás opciones son ellas mismas", () => {
    expect(filtroDeVeredicto("parcial")).toBe("fallida");
    for (const id of ["superada", "fallida", "no_ejecutada", "no_aplicable"])
      expect(filtroDeVeredicto(id)).toBe(id);
  });
  it("ofrece «no aplicable», y cada fila cae en exactamente una opción (ninguna se pierde ni se cuenta dos veces)", () => {
    const opciones = v.filtros.veredictos.map((o) => o.id);
    expect(opciones).toContain("no_aplicable");
    const porOpcion = opciones.map(
      (id) => v.filas.filter((f) => f.filtroId === id).length,
    );
    expect(porOpcion.reduce((a, b) => a + b, 0)).toBe(v.filas.length);
    // Las «fallidas» del filtro son las que las cifras de arriba cuentan como fallidas (parciales incluidas).
    const fallidas = v.filas.filter((f) => f.filtroId === "fallida").length;
    expect(fallidas).toBe(m.brecha.resumen.fallidas);
  });
});
