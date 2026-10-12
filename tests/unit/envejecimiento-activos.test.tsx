// Matriz de envejecimiento de las pantallas de activo y plan (regla 23): la política que leyó el proveedor y cada herramienta del
// plan tienen una fecha de verificación, y la pantalla cambia de estado en una fecha que no es la de ningún commit. Se construyen
// las dos pantallas la víspera y el día de cada umbral de cada fecha de verificación, y a +100 días; en cada celda todo lo
// «fechado» está en el estado que le toca (comparando FECHAS, no días, para no repetir la cuenta del motor), ningún día es
// negativo ni NaN, y lo que pide atención lleva chip con su marca y su texto en los dos idiomas.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { ActivoPantalla } from "../../src/components/activos/activo-pantalla";
import { PlanPantalla } from "../../src/components/plan/plan-pantalla";
import { documentoDelProducto } from "./lib/fidelidad";
import {
  IDS,
  instantanea,
  mundo,
  vistaDeActivo,
  vistaDePlan,
} from "./lib/mundo-de-activos";

const { por_revisar, vencido } = instantanea.catalogo.umbrales.vigencia;
const verificaciones = [
  ...new Set([
    ...instantanea.catalogo.herramientas.map((h) => h.fecha_verificacion),
    ...instantanea.catalogo.pruebas.map((p) => p.fecha_verificacion),
    ...instantanea.catalogo.marcos.map((m) => m.fecha_verificacion),
    ...mundo.activos.flatMap((a) =>
      a.activo.proveedor?.politica_verificada
        ? [a.activo.proveedor.politica_verificada]
        : [],
    ),
  ]),
].sort();
const hoy = verificaciones.at(-1)!;
// La instantánea no se construye antes de la última verificación del catálogo: solo se cubren las fechas desde ahí.
const FECHAS = [
  ...new Set([
    hoy,
    ...verificaciones.flatMap((v) => [
      fechaMasDias(v, por_revisar - 1),
      fechaMasDias(v, por_revisar),
      fechaMasDias(v, vencido - 1),
      fechaMasDias(v, vencido),
    ]),
    fechaMasDias(hoy, 100),
  ]),
]
  .filter((f) => f >= hoy)
  .sort();

function esperado(verificada: string, fecha: string) {
  if (fecha >= fechaMasDias(verificada, vencido)) return "vencido";
  if (fecha >= fechaMasDias(verificada, por_revisar)) return "por_revisar";
  return "vigente";
}

describe("la matriz cubre fechas que cambian algo", () => {
  it("hay varias fechas, y la política del proveedor cruza al menos un umbral dentro de ellas", () => {
    expect(FECHAS.length).toBeGreaterThan(4);
    const politica = mundo.activos.flatMap((a) =>
      a.activo.proveedor?.politica_verificada
        ? [a.activo.proveedor.politica_verificada]
        : [],
    );
    expect(politica.length).toBeGreaterThan(0);
    const estados = new Set(FECHAS.map((f) => esperado(politica[0]!, f)));
    expect(estados.size).toBeGreaterThan(1);
  });
});

describe.each(FECHAS)("las pantallas construidas el %s", (fecha) => {
  for (const id of IDS) {
    it(`${id}: todo lo fechado está en el estado que le toca`, () => {
      const paginas = [
        renderToStaticMarkup(<ActivoPantalla v={vistaDeActivo(id, fecha)} />),
        renderToStaticMarkup(<PlanPantalla v={vistaDePlan(id, fecha)} />),
      ];
      for (const html of paginas) {
        const doc = documentoDelProducto(html);
        for (const el of doc.querySelectorAll('[data-fechado="vigencia"]')) {
          const desde = el.getAttribute("data-desde")!;
          const estado = el.getAttribute("data-estado-fechado");
          const dias = Number(el.getAttribute("data-dias"));
          expect(estado, `${id} · ${desde}`).toBe(esperado(desde, fecha));
          expect(
            Number.isInteger(dias) && dias >= 0,
            `${id} · ${desde} · ${dias} días`,
          ).toBe(true);
          const marca = el.querySelector(".hg-chip, .hg-estado");
          expect(
            marca?.querySelector("svg"),
            "la marca es un trazo, no un carácter",
          ).not.toBeNull();
          for (const idioma of ["es", "en"])
            expect(
              marca?.querySelector(`[lang="${idioma}"]`)?.textContent?.trim()
                .length,
            ).toBeGreaterThan(0);
          // Lo que no es noticia va en línea; lo que pide atención, en chip.
          expect(Boolean(el.querySelector(".hg-chip"))).toBe(
            estado !== "vigente",
          );
        }
      }
    });
  }
});

describe("la política del proveedor se ve fechada", () => {
  it("el asistente la lleva en su página; sus herramientas, en el plan", () => {
    const activo = documentoDelProducto(
      renderToStaticMarkup(
        <ActivoPantalla v={vistaDeActivo("act-demo-asistente")} />,
      ),
    );
    expect(
      activo.querySelectorAll(
        '[data-fechado="vigencia"][data-desde="2026-09-20"]',
      ),
    ).toHaveLength(1);
    const plan = documentoDelProducto(
      renderToStaticMarkup(
        <PlanPantalla v={vistaDePlan("act-demo-asistente")} />,
      ),
    );
    expect(
      plan.querySelectorAll('[data-fechado="vigencia"]').length,
    ).toBeGreaterThan(0);
  });
});
