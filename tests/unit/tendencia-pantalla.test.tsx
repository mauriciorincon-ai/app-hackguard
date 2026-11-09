// La pantalla de la tendencia por dentro: lo que una persona comprueba al abrirla, leído del HTML. El motor ya calculó; aquí se ve
// que la pantalla lo dice (con símbolo, texto y color, nunca el color solo), que un reabierto es una regresión del control, y —regla 23—
// que en cada fecha de la matriz de envejecimiento la última fila ES la brecha de la consulta, la de las otras cinco pantallas.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TendenciaPantalla } from "../../src/components/tendencia/tendencia-pantalla";
import { armarBrecha } from "../../src/engine/brecha/calcular.ts";
import {
  armarTendencia,
  calcularTendencia,
} from "../../src/engine/brecha/tendencia.ts";
import { entradaDeBrecha } from "../../src/lib/brecha/entrada.ts";
import { construirVistaDeTendencia } from "../../src/lib/brecha/vista.ts";
import { FECHAS } from "./lib/fechas-de-la-matriz";
import { documentoDelProducto } from "./lib/fidelidad";
import {
  activos,
  instantanea,
  mundoDeBrecha,
  mundoDeHallazgos,
  umbralesDeBrecha,
} from "./lib/mundo-de-brecha";

type Mundo = Awaited<ReturnType<typeof mundoDeBrecha>>;
const tendenciaDe = (m: Mundo) =>
  calcularTendencia(
    entradaDeBrecha(
      m.instantanea,
      m.activos,
      m.evidencia,
      m.umbrales,
      m.consulta,
    ),
  );
const pantalla = async (m: Mundo) =>
  documentoDelProducto(
    renderToStaticMarkup(
      <TendenciaPantalla
        v={construirVistaDeTendencia(m, await tendenciaDe(m))}
      />,
    ),
  );
const texto = (e: Element | null) =>
  e?.textContent?.replace(/\s+/g, " ").trim() ?? "";

describe("la pantalla de la tendencia en la fecha de la demo", async () => {
  const m = await mundoDeBrecha();
  const d = await pantalla(m);

  it("dice qué es, de qué fecha habla y su huella", () => {
    expect(texto(d.querySelector("h1"))).toBe(
      "Tendencia de la brechaGap trend",
    );
    expect(d.body.textContent).toContain(m.consulta);
    expect(d.querySelector(".hg-huella")).not.toBeNull();
  });

  it("trae las cuatro cifras de los controles, cada una con su marca", () => {
    for (const clave of [
      "tendencia-mejoraron",
      "tendencia-empeoraron",
      "tendencia-igual",
      "tendencia-regresion",
    ]) {
      const li = d.querySelector(`[data-cifra="${clave}"]`);
      expect(li, clave).not.toBeNull();
      expect(li!.querySelector("svg"), clave).not.toBeNull();
    }
  });

  it("una fila por control, y la A.6.2.8 dice que empeoró con la regresión de HZ-0011", () => {
    const filas = [...d.querySelectorAll("[data-tendencia-control]")];
    expect(filas.length).toBe(m.brecha.controles.length);
    const a628 = d.querySelector(
      '[data-tendencia-control="iso42001-A.6.2.8"]',
    )!;
    expect(a628.getAttribute("data-sentido")).toBe("empeoro");
    expect(a628.getAttribute("data-regresion")).toBe("true");
    expect(texto(a628)).toContain("Empeoró");
    expect(texto(a628)).toContain("Regresión: un hallazgo se reabrió");
    expect(
      a628.querySelector('a[href="/evidencia/hallazgos/HZ-0011"]'),
    ).not.toBeNull();
    expect(
      a628.querySelector('a[href="/brecha/control/iso42001-a-6-2-8"]'),
    ).not.toBeNull();
  });

  it("cuenta la historia de HZ-0011 corte por corte: abre, cierra y se reabre", () => {
    const pasos = d.querySelector('[data-pasos-de="iso42001-A.6.2.8"]')!;
    const lista = [...pasos.querySelectorAll("[data-paso]")].map((p) => [
      p.getAttribute("data-paso"),
      p.getAttribute("data-sentido"),
    ]);
    expect(lista).toEqual([
      ["2026-09-12", "empeoro"],
      ["2026-09-25", "mejoro"],
      ["2026-10-01", "empeoro"],
    ]);
    expect(texto(pasos)).toContain("Reabierto: volvió a fallar");
    expect(pasos.querySelector('[data-regresion-de="HZ-0011"]')).not.toBeNull();
  });

  it("un control que mejoró por la evidencia lo dice, sin inventar un hallazgo", () => {
    const pasos = d.querySelector('[data-pasos-de="iso42001-A.9.4"]')!;
    expect(texto(pasos)).toContain("Lo movió la evidencia, no un hallazgo.");
  });

  it("la serie tiene una fila por corte y su última fila es la brecha de la consulta", () => {
    const filas = [...d.querySelectorAll("tr[data-corte]")];
    expect(filas.at(-1)!.getAttribute("data-corte")).toBe(m.consulta);
    const celda = (c: string) =>
      Number(filas.at(-1)!.querySelector(`[data-celda="${c}"]`)!.textContent);
    expect(celda("vencidos")).toBe(m.brecha.vencidos.length);
    expect(celda("reabiertos")).toBe(
      m.brecha.hallazgos.filter((h) => h.estado === "reabierto").length,
    );
  });

  it("ningún estado va solo en color: cada marca trae su símbolo y su texto", () => {
    for (const marca of d.querySelectorAll(".hg-chip, .hg-estado")) {
      expect(marca.querySelector("svg"), texto(marca)).not.toBeNull();
      expect(texto(marca).length, "texto de la marca").toBeGreaterThan(0);
    }
  });

  it("enlaza al informe de brecha", () => {
    expect(d.querySelector('a[href="/brecha/informe"]')).not.toBeNull();
  });
});

describe("la vista no muestra dos cuentas", () => {
  it("una tendencia que no termina en la brecha de la consulta rompe la vista, en vez de pintarse", async () => {
    const m = await mundoDeBrecha();
    const buena = await tendenciaDe(m);
    const otra = armarTendencia(
      entradaDeBrecha(
        instantanea,
        activos,
        mundoDeHallazgos,
        umbralesDeBrecha,
        "2026-10-01",
      ),
    );
    expect(() =>
      construirVistaDeTendencia(m, { ...otra, huella: buena.huella }),
    ).toThrow(/no termina en la brecha de la consulta/);
    const mutada = {
      ...buena,
      puntos: buena.puntos.map((p, i) =>
        i === buena.puntos.length - 1
          ? {
              ...p,
              resumen: { ...p.resumen, fallidas: p.resumen.fallidas + 1 },
            }
          : p,
      ),
    };
    expect(() => construirVistaDeTendencia(m, mutada)).toThrow(
      /no termina en la brecha de la consulta/,
    );
  });
});

describe("matriz de envejecimiento (regla 23): la tendencia en cada fecha en que algo cambia", async () => {
  const mundos = await Promise.all(
    FECHAS.map(async (f) => [f, await mundoDeBrecha(f)] as const),
  );

  it("son muchas fechas, y la tendencia cambia con ellas", async () => {
    expect(mundos.length).toBeGreaterThan(20);
    const huellas = await Promise.all(mundos.map(([, m]) => tendenciaDe(m)));
    expect(new Set(huellas.map((t) => t.huella)).size).toBeGreaterThan(1);
  });

  it.each(mundos)(
    "%s",
    async (fecha, m) => {
      const t = await tendenciaDe(m);
      const b = armarBrecha(
        entradaDeBrecha(
          instantanea,
          activos,
          mundoDeHallazgos,
          umbralesDeBrecha,
          fecha,
        ),
      );
      expect(t.problemas).toEqual([]);
      expect(t.cortes.at(-1)).toBe(fecha);
      expect(t.puntos.at(-1)!.resumen).toEqual(b.resumen);
      const d = await pantalla(m);
      const filas = [...d.querySelectorAll("tr[data-corte]")];
      expect(filas.at(-1)!.getAttribute("data-corte")).toBe(fecha);
      const celda = (c: string) =>
        Number(filas.at(-1)!.querySelector(`[data-celda="${c}"]`)!.textContent);
      expect(celda("vencidos"), `vencidos al ${fecha}`).toBe(b.vencidos.length);
      expect(
        celda("abiertos") +
          celda("reabiertos") +
          celda("aceptados") +
          celda("cerrados"),
      ).toBe(b.hallazgos.length);
      // La regresión solo existe desde que la re-prueba que reabrió HZ-0011 está confirmada.
      const regresion = d.querySelector('[data-regresion="true"]') !== null;
      expect(regresion, `regresión al ${fecha}`).toBe(fecha >= "2026-10-01");
    },
    60_000,
  );
});
