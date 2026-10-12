// Las cinco pantallas de la brecha dicen las mismas cifras en cada fecha (Sprint 7, riesgo 1 del plan): se construye el mundo en
// cada fecha de la matriz de envejecimiento, se dibujan el tablero, la brecha, la lista de controles, cada página de control y el
// informe, y se lee del HTML lo que cada una DICE —no de las vistas—. Ninguna cifra puede diferir entre pantallas ni del motor, y
// cada marca de fecha (evidencia, plazo, ficha) está en el estado que le toca ese día.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrechaPantalla } from "../../../src/components/brecha/brecha-pantalla";
import { ControlPantalla } from "../../../src/components/control/control-pantalla";
import { ListaDeControles } from "../../../src/components/control/lista-de-controles";
import { InformePantalla } from "../../../src/components/informe/informe-pantalla";
import { TableroPantalla } from "../../../src/components/tablero/tablero-pantalla";
import { ESTADOS_DE_CONTROL } from "../../../src/engine/brecha/esquemas.ts";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import {
  construirVistaDeBrecha,
  construirVistaDeControl,
  construirVistaDeControles,
  construirVistaDeInforme,
  construirVistaDeTablero,
  idsDeControles,
} from "../../../src/lib/brecha/vista.ts";
import { documentoDelProducto } from "../lib/fidelidad";
import { ANTIGUA, FECHAS } from "../lib/fechas-de-la-matriz";
import { mundoDeBrecha } from "../lib/mundo-de-brecha";

const html = (el: React.ReactElement) =>
  documentoDelProducto(renderToStaticMarkup(el));
const cifra = (doc: Document, clave: string): string =>
  doc.querySelector(`[data-cifra="${clave}"] .hg-cifra`)?.textContent?.trim() ??
  "(sin cifra)";

const mundos = await Promise.all(
  FECHAS.map(async (f) => [f, await mundoDeBrecha(f)] as const),
);

describe("las cinco pantallas dicen lo mismo en cada fecha de la matriz", () => {
  it("son muchas fechas, y las pantallas leen lo que el motor calculó para cada una", () => {
    expect(mundos.length).toBeGreaterThan(20);
    expect(
      new Set(mundos.map(([, m]) => m.brecha.huella)).size,
    ).toBeGreaterThan(1);
  });

  it.each(mundos)(
    "%s",
    (fecha, m) => {
      const b = m.brecha;
      const tablero = html(<TableroPantalla v={construirVistaDeTablero(m)} />);
      const brecha = html(<BrechaPantalla v={construirVistaDeBrecha(m)} />);
      const lista = html(<ListaDeControles v={construirVistaDeControles(m)} />);
      const informe = html(<InformePantalla v={construirVistaDeInforme(m)} />);
      const ids = idsDeControles(m);
      const paginas = new Map(
        ids.map((id) => [
          id,
          html(<ControlPantalla v={construirVistaDeControl(id, m)} />),
        ]),
      );
      const todas = [tablero, brecha, lista, informe, ...paginas.values()];

      // 1. Ejecutadas de planeadas: la brecha, el informe y la suma del tablero dicen lo mismo que el motor.
      const dicho = `${b.resumen.ejecutadas} / ${b.resumen.planeadas}`;
      expect(cifra(brecha, "ejecutadas"), "brecha").toBe(dicho);
      expect(cifra(informe, "ejecutadas"), "informe").toBe(dicho);
      const filasDeActivo = [
        ...tablero.querySelectorAll('tr[data-cobertura="activo"]'),
      ];
      const suma = (atributo: string) =>
        filasDeActivo.reduce(
          (n, f) => n + Number(f.getAttribute(atributo) ?? 0),
          0,
        );
      expect(suma("data-planeadas"), "tablero, planeadas").toBe(
        b.resumen.planeadas,
      );
      expect(suma("data-ejecutadas"), "tablero, ejecutadas").toBe(
        b.resumen.ejecutadas,
      );
      expect(cifra(brecha, "superadas")).toBe(String(b.resumen.superadas));
      expect(cifra(brecha, "fallidas")).toBe(String(b.resumen.fallidas));
      expect(cifra(brecha, "no_ejecutadas")).toBe(
        String(b.resumen.no_ejecutadas),
      );
      expect(
        brecha.querySelectorAll("tr[data-fila-brecha]").length,
        "filas de la brecha",
      ).toBe(b.filas.length);
      expect(
        informe.querySelectorAll("#informe-esperado tbody tr").length,
        "filas del informe",
      ).toBe(b.filas.length);

      // 2. Vencidos: el tablero, el informe y las alertas de la brecha.
      expect(cifra(tablero, "vencidos"), "tablero").toBe(
        String(b.vencidos.length),
      );
      expect(cifra(informe, "vencidos"), "informe").toBe(
        String(b.vencidos.length),
      );
      expect(
        brecha.querySelectorAll('tr[data-alerta="plazo"]').length,
        "alertas de la brecha",
      ).toBe(b.vencidos.length);
      expect(
        tablero.querySelectorAll('tr[data-alerta="plazo"]').length,
        "alertas del tablero",
      ).toBe(b.vencidos.length);

      // 3. Hallazgos sin cerrar y sobres por confirmar.
      expect(cifra(tablero, "sin_cerrar")).toBe(
        String(b.hallazgos.filter((h) => h.pideTrabajo).length),
      );
      expect(tablero.querySelectorAll(".hg-abiertos li").length).toBe(
        b.hallazgos.filter((h) => h.pideTrabajo).length,
      );
      expect(cifra(tablero, "por_confirmar")).toBe(
        String(b.porConfirmar.sobres),
      );
      expect(
        brecha
          .querySelector("[data-por-confirmar]")
          ?.getAttribute("data-por-confirmar") ?? "0",
      ).toBe(String(b.porConfirmar.sobres));

      // 4. Controles: la misma cuenta por estado en el tablero y en la lista, y el mismo estado de cada control en TODAS las pantallas.
      const cuentaDelTablero = [
        ...tablero.querySelectorAll(
          'ul[aria-label^="Controles por estado"] li',
        ),
      ].map((li) => Number(li.querySelector(".hg-cifra-menor")?.textContent));
      const esperada = ESTADOS_DE_CONTROL.map(
        (e) => b.controles.filter((c) => c.estado === e).length,
      );
      expect(cuentaDelTablero).toEqual(esperada);
      for (const e of ESTADOS_DE_CONTROL)
        expect(cifra(lista, e), `lista, ${e}`).toBe(
          String(b.controles.filter((c) => c.estado === e).length),
        );
      for (const c of b.controles) {
        const dichos = todas.flatMap((d) =>
          [...d.querySelectorAll(`[data-control="${c.id}"]`)].map((e) =>
            e.getAttribute("data-control-estado"),
          ),
        );
        // Aparece en la brecha, en la lista, en el informe y en su propia página: al menos cuatro veces, siempre igual.
        expect(dichos.length, c.id).toBeGreaterThanOrEqual(4);
        expect(new Set(dichos), `${c.id} el ${fecha}`).toEqual(
          new Set([c.estado]),
        );
      }

      // 5. Las marcas de fecha están en el estado que les toca ese día, en todas las pantallas.
      // Un selector que no encuentra nada no puede dar verde: tiene que haber marcas que mirar.
      expect(
        todas.flatMap((d) => [
          ...d.querySelectorAll('[data-fechado="evidencia"]'),
        ]).length,
        "marcas de evidencia",
      ).toBeGreaterThan(0);
      if (b.hallazgos.some((h) => h.pideTrabajo))
        expect(
          todas.flatMap((d) => [
            ...d.querySelectorAll('[data-fechado="plazo"]'),
          ]).length,
          "marcas de plazo",
        ).toBeGreaterThan(0);
      for (const d of todas) {
        for (const e of d.querySelectorAll('[data-fechado="evidencia"]')) {
          const desde = e.getAttribute("data-desde")!;
          expect(
            e.getAttribute("data-estado-fechado"),
            `evidencia ${desde} el ${fecha}`,
          ).toBe(fecha >= fechaMasDias(desde, ANTIGUA) ? "antigua" : "vigente");
        }
        for (const e of d.querySelectorAll('[data-fechado="plazo"]')) {
          const desde = e.getAttribute("data-desde")!;
          const total = Number(e.getAttribute("data-plazo"));
          expect(
            e.getAttribute("data-estado-fechado"),
            `plazo ${desde} el ${fecha}`,
          ).toBe(fecha > fechaMasDias(desde, total) ? "vencido" : "en_plazo");
        }
      }
    },
    60_000,
  );
});
