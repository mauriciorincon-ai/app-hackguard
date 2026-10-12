// @vitest-environment node
// Las cinco vistas de la brecha se construyen con los datos reales y dicen lo que el motor calculó: ninguna recalcula.
import { describe, expect, it } from "vitest";
import {
  construirVistaDeBrecha,
  construirVistaDeControl,
  construirVistaDeControles,
  construirVistaDeInforme,
  construirVistaDeTablero,
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
