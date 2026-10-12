// Matriz de envejecimiento de la pantalla del hallazgo (regla 23): un hallazgo cambia de estado en una fecha que no es la de ningún
// commit —el plazo vence, la revisión de un riesgo aceptado toca—. Se construye la pantalla la víspera y el día de cada una de esas
// fechas (sacadas de los datos, comparando FECHAS y no días para no repetir la cuenta del motor) y a +100 días; en cada celda lo
// «fechado» está en el estado que le toca, ningún día es negativo ni NaN, y lo que pide atención lleva sello con marca y texto en
// los dos idiomas.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { HallazgoPantalla } from "../../src/components/hallazgo/hallazgo-pantalla";
import { documentoDelProducto } from "./lib/fidelidad";
import { instantanea } from "./lib/mundo-de-activos";
import {
  IDS_DE_HALLAZGOS,
  mundoDeHallazgos,
  vistaDeHallazgo,
} from "./lib/mundo-de-hallazgos";

const { plazos } = mundoDeHallazgos;
const hoy = instantanea.fecha_evaluacion;

/** Cuándo vence el plazo de cada hallazgo y cuándo toca revisar cada riesgo aceptado, por los datos. */
const vencimientos: Record<string, string> = {};
const revisiones: Record<string, string> = {};
for (const id of IDS_DE_HALLAZGOS) {
  const v = vistaDeHallazgo(id, hoy);
  const p = v.propiedades;
  if (p.plazo.corre) vencimientos[id] = p.plazo.vence;
  if (p.revision !== null) revisiones[id] = p.revision.fecha;
}

const FECHAS = [
  ...new Set([
    hoy,
    ...Object.values(vencimientos).flatMap((f) => [fechaMasDias(f, -1), f, fechaMasDias(f, 1)]),
    ...Object.values(revisiones).flatMap((f) => [fechaMasDias(f, -1), f, fechaMasDias(f, 1)]),
    fechaMasDias(hoy, 100),
  ]),
]
  .filter((f) => f >= hoy)
  .sort();

describe("la matriz cubre fechas que cambian algo", () => {
  it("los datos dan al menos un plazo que vence y una revisión que toca después de la fecha de la instantánea", () => {
    expect(plazos.dias.alto).toBe(30);
    expect(Object.values(vencimientos).some((f) => f > hoy)).toBe(true);
    expect(Object.values(revisiones).some((f) => f > hoy)).toBe(true);
    // Lo que se conoce de la demo: vence HZ-0009 el 2026-12-04 y toca revisar HZ-0005 el 2026-11-30.
    expect(vencimientos["HZ-0009"]).toBe("2026-12-04");
    expect(revisiones["HZ-0005"]).toBe("2026-11-30");
    expect(FECHAS).toEqual(
      expect.arrayContaining(["2026-11-29", "2026-11-30", "2026-12-03", "2026-12-04", "2026-12-05"]),
    );
  });
});

describe.each(FECHAS)("la pantalla del hallazgo construida el %s", (fecha) => {
  for (const id of IDS_DE_HALLAZGOS) {
    it(`${id}: el plazo y la revisión están en el estado que les toca`, () => {
      const doc = documentoDelProducto(
        renderToStaticMarkup(<HallazgoPantalla v={vistaDeHallazgo(id, fecha)} />),
      );
      const plazo = doc.querySelector('[data-fechado="plazo"]');
      if (vencimientos[id] === undefined) expect(plazo).toBeNull();
      else {
        const vence = vencimientos[id];
        const esperado = fecha > vence ? "vencido" : "en_plazo";
        expect(plazo?.getAttribute("data-estado-fechado"), `${id} · vence ${vence}`).toBe(esperado);
        const dias = Number(plazo?.getAttribute("data-dias"));
        const atraso = Number(plazo?.getAttribute("data-atraso"));
        expect(Number.isInteger(dias) && dias >= 0 && Number.isInteger(atraso) && atraso >= 0).toBe(true);
        expect(atraso > 0).toBe(esperado === "vencido");
        // El sello de plazo vencido aparece cuando vence y no antes; lleva marca y texto en los dos idiomas.
        const sello = doc.querySelector("[data-aviso-de-plazo]");
        expect(sello !== null, `${id} · sello de plazo`).toBe(esperado === "vencido");
        if (sello !== null) {
          expect(sello.querySelector("svg")).not.toBeNull();
          for (const idioma of ["es", "en"])
            expect(sello.querySelector(`.hg-sello-titulo [lang="${idioma}"]`)?.textContent?.length).toBeGreaterThan(0);
        }
        expect(doc.querySelector('[data-fechado="plazo"] .hg-estado svg')).not.toBeNull();
      }
      const revision = doc.querySelector('[data-fechado="revision"]');
      if (revisiones[id] === undefined) {
        expect(revision).toBeNull();
        expect(doc.querySelector("[data-aviso-de-revision]")).toBeNull();
      } else {
        const toca = fecha >= revisiones[id];
        expect(revision?.getAttribute("data-estado-fechado"), `${id} · revisión ${revisiones[id]}`).toBe(
          toca ? "toca_revisar" : "vigente",
        );
        expect(doc.querySelector("[data-aviso-de-revision]") !== null).toBe(toca);
        expect(Number(revision?.getAttribute("data-dias"))).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe("lo que una persona lee en cada fecha", () => {
  const texto = (id: string, fecha: string) =>
    documentoDelProducto(renderToStaticMarkup(<HallazgoPantalla v={vistaDeHallazgo(id, fecha)} />)).body.textContent ?? "";
  it("HZ-0009 vence el 2026-12-04: la víspera «vence el 2026-12-04», el día siguiente «venció hace 1 día»", () => {
    expect(texto("HZ-0009", "2026-12-04")).toContain("vence el 2026-12-04");
    expect(texto("HZ-0009", "2026-12-05")).toContain("venció hace 1 día");
  });
  it("HZ-0005 se revisa el 2026-11-30: ese día el aviso dice que toca revisar", () => {
    expect(texto("HZ-0005", "2026-11-29")).not.toContain("Toca revisar el riesgo aceptado");
    expect(texto("HZ-0005", "2026-11-30")).toContain("Toca revisar el riesgo aceptado");
  });
});
