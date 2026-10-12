// UNA cuenta, un cálculo (design-system § 9): «por decidir» y los avisos de versión salen de las funciones del motor de propuestas y
// los dicen igual la bandeja, el tablero, la brecha, el informe y Marcos. Si una decisión del libro cambia la cuenta, cambia en las
// cinco; sin ninguna corrida del investigador, ninguna pantalla dice «ninguno» (dice que no hay registro).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraLateral } from "../../../src/components/consola/barra-lateral";
import { BrechaPantalla } from "../../../src/components/brecha/brecha-pantalla";
import { InformePantalla } from "../../../src/components/informe/informe-pantalla";
import { MarcosPantalla } from "../../../src/components/marcos/marcos-pantalla";
import { TableroPantalla } from "../../../src/components/tablero/tablero-pantalla";
import {
  construirVistaDeBrecha,
  construirVistaDeInforme,
  construirVistaDeTablero,
} from "../../../src/lib/brecha/vista";
import { construirVistaDeMarcos } from "../../../src/lib/catalogo/marcos";
import type { Decision } from "../../../src/engine/propuestas/esquemas";
import { armarMundoDePropuestas } from "../../../src/lib/propuestas/pagina";
import { etiquetaDePropuesta } from "../../../src/lib/propuestas/etiquetas";
import {
  resumenDePropuestas,
  SIN_PROPUESTAS,
} from "../../../src/lib/propuestas/resumen";
import { construirVistaDePropuestas } from "../../../src/lib/propuestas/vista";
import {
  mundoDeBrecha,
  propuestasDelRepo,
  propuestasDemo as base,
} from "../lib/mundo-de-brecha";

const sinPropuestas = await mundoDeBrecha(undefined, { propuestas: false });
const conPropuestas = (resumen: Parameters<typeof resumenDePropuestas>[0]) => ({
  ...sinPropuestas,
  propuestas: resumenDePropuestas(resumen),
});
const libro = (...ds: Decision[]) =>
  armarMundoDePropuestas({
    instantanea: base.instantanea,
    nombre: base.nombre,
    consulta: base.consulta,
    activos: base.activos,
    etiquetas: base.etiquetas,
    umbrales: base.umbrales,
    corridas: base.corridas,
    problemasDeCarga: [],
    decisiones: ds,
  });
const rechazar = (propuesta: string): Decision => ({
  formato: "hackguard/decision@1",
  propuesta,
  decision: "rechazar",
  por: "Ana",
  fecha: "2026-10-12",
  motivo: "x",
});

/** Todo lo que cada pantalla dice de «por decidir» y de los avisos, de un mundo de propuestas. */
function lasCinco(mp: ReturnType<typeof libro>) {
  const m = conPropuestas(mp);
  const tablero = construirVistaDeTablero(m);
  const brecha = construirVistaDeBrecha(m);
  const informe = construirVistaDeInforme(m);
  const bandeja = construirVistaDePropuestas(mp);
  const marcos = construirVistaDeMarcos(
    m.instantanea,
    m.nombre,
    m.consulta,
    [],
    {
      resumen: resumenDePropuestas(mp),
      etiquetaDeAviso: etiquetaDePropuesta(mp.etiquetas, "aviso_de_version"),
    },
  );
  return { tablero, brecha, informe, bandeja, marcos, m };
}

describe("«por decidir» es una sola cuenta", () => {
  it("la bandeja, el tablero y el motor dicen 7; el pie del tablero la nombra y lleva a la bandeja", () => {
    const { tablero, bandeja } = lasCinco(base);
    expect(base.porDecidir).toBe(7);
    expect(bandeja.cifras.porDecidir).toBe(7);
    expect(tablero.cifras.find((c) => c.clave === "por_decidir")!.valor).toBe(
      "7",
    );
    expect(tablero.bandeja).toMatchObject({
      porDecidir: 7,
      ruta: "/catalogo/propuestas",
    });
    const html = renderToStaticMarkup(<TableroPantalla v={tablero} />);
    expect(html).toContain("7 propuestas esperan tu decisión");
    expect(html).toContain('href="/catalogo/propuestas"');
    expect(html).toContain('data-bandeja="pendientes"');
  });
  it("una decisión del libro baja la cuenta en las dos a la vez", () => {
    const { tablero, bandeja } = lasCinco(libro(rechazar("PROP-0033")));
    expect(bandeja.cifras.porDecidir).toBe(6);
    expect(tablero.cifras.find((c) => c.clave === "por_decidir")!.valor).toBe(
      "6",
    );
    expect(renderToStaticMarkup(<TableroPantalla v={tablero} />)).toContain(
      "6 propuestas esperan tu decisión",
    );
  });
  it("sin nada por decidir el tablero lo dice, con el singular cuando es una", () => {
    const todas = libro(
      ...[
        "PROP-0031",
        "PROP-0032",
        "PROP-0033",
        "PROP-0034",
        "PROP-0035",
        "PROP-0036",
        "PROP-0037",
      ].map(rechazar),
    );
    const { tablero } = lasCinco(todas);
    expect(tablero.bandeja.porDecidir).toBe(0);
    expect(renderToStaticMarkup(<TableroPantalla v={tablero} />)).toContain(
      "Nada espera tu decisión",
    );
    const una = libro(
      ...[
        "PROP-0031",
        "PROP-0032",
        "PROP-0033",
        "PROP-0034",
        "PROP-0035",
        "PROP-0036",
      ].map(rechazar),
    );
    expect(
      renderToStaticMarkup(<TableroPantalla v={lasCinco(una).tablero} />),
    ).toContain("1 propuesta espera tu decisión");
  });
  it("sin propuestas cargadas (el mundo de antes del S8) el tablero dice 0", () => {
    const t = construirVistaDeTablero({
      ...sinPropuestas,
      propuestas: SIN_PROPUESTAS,
    });
    expect(t.cifras.find((c) => c.clave === "por_decidir")!.valor).toBe("0");
  });
});

describe("«marcos con versión nueva» es una sola cuenta", () => {
  it("PROP-0032 avisa en la brecha, el informe y Marcos, con el mismo marco y la misma propuesta", () => {
    const { brecha, informe, marcos } = lasCinco(base);
    for (const e of [brecha.marcos, informe.marcos]) {
      expect(e.tipo).toBe("avisos");
      if (e.tipo !== "avisos") throw new Error();
      expect(
        e.avisos.map((a) => [a.marco, a.vigente, a.publicada, a.propuesta]),
      ).toEqual([["lista-decision-14", "v1", "v2", "PROP-0032"]]);
    }
    expect(marcos.avisos.map((a) => a.propuesta)).toEqual(["PROP-0032"]);
    expect(
      marcos.filas.find((f) => f.id === "lista-decision-14")!.aviso?.propuesta,
    ).toBe("PROP-0032");
    expect(marcos.filas.filter((f) => f.aviso !== null)).toHaveLength(1);
  });
  it("las tres pantallas lo dibujan, con el enlace a la propuesta en la bandeja", () => {
    const { brecha, informe, marcos } = lasCinco(base);
    for (const html of [
      renderToStaticMarkup(<BrechaPantalla v={brecha} />),
      renderToStaticMarkup(<InformePantalla v={informe} />),
      renderToStaticMarkup(<MarcosPantalla vista={marcos} />),
    ]) {
      expect(html).toContain('data-aviso-de-version="lista-decision-14"');
      expect(html).toContain('href="/catalogo/propuestas#prop-0032"');
    }
    expect(renderToStaticMarkup(<BrechaPantalla v={brecha} />)).toContain(
      "2 de 2 fuentes verificadas por código",
    );
  });
  it("rechazar la propuesta apaga el aviso en todas y deja «ninguno» con la corrida que lo respalda", () => {
    const { brecha, informe, marcos } = lasCinco(libro(rechazar("PROP-0032")));
    for (const e of [brecha.marcos, informe.marcos])
      expect(e).toMatchObject({
        tipo: "ninguno",
        corrida: "INV-2026-10-02-01",
        fecha: "2026-10-02",
      });
    expect(marcos.avisos).toEqual([]);
    expect(marcos.investigacion).toEqual({
      corrida: "INV-2026-10-02-01",
      fecha: "2026-10-02",
    });
    const html = renderToStaticMarkup(<BrechaPantalla v={brecha} />);
    expect(html).toContain('data-marcos="ninguno"');
    expect(html).toContain("INV-2026-10-02-01");
  });
  it("sin ninguna corrida del investigador, ninguna dice «ninguno»: dicen que no hay registro", () => {
    const sin = armarMundoDePropuestas({
      instantanea: base.instantanea,
      nombre: base.nombre,
      consulta: base.consulta,
      activos: base.activos,
      etiquetas: base.etiquetas,
      umbrales: base.umbrales,
      corridas: base.corridas.filter((c) => c.corrida.agente === "extractor"),
      problemasDeCarga: [],
      decisiones: [],
    });
    const { brecha, informe, marcos } = lasCinco(sin);
    expect(brecha.marcos.tipo).toBe("sin_registro");
    expect(informe.marcos.tipo).toBe("sin_registro");
    expect(marcos.avisos).toEqual([]);
    expect(marcos.investigacion).toBeNull();
    expect(renderToStaticMarkup(<MarcosPantalla vista={marcos} />)).toContain(
      "Ninguna corrida del investigador ha leído las fuentes",
    );
    expect(renderToStaticMarkup(<InformePantalla v={informe} />)).toContain(
      'data-marcos="sin-registro"',
    );
  });
  it("la huella del informe cubre las propuestas: con otros avisos o con otra cuenta, es otro informe", async () => {
    const con = await mundoDeBrecha();
    expect(con.propuestas).toEqual(resumenDePropuestas(propuestasDelRepo));
    expect(con.huellaDelInforme).not.toBe(sinPropuestas.huellaDelInforme);
    // la misma entrada da la misma huella
    expect((await mundoDeBrecha()).huellaDelInforme).toBe(con.huellaDelInforme);
    // y la brecha en sí no cambia: lo que cambia es lo que el informe dice de las propuestas
    expect(con.brecha.huella).toBe(sinPropuestas.brecha.huella);
  });
});

describe("«Propuestas» está en la barra lateral, con pantalla", () => {
  const html = renderToStaticMarkup(
    <BarraLateral abierta="catalogo" paginaAbierta="/catalogo/propuestas" />,
  );
  it("es un enlace a la bandeja, marcado como la página abierta, y ya no dice «pronto»", () => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const enlace = [...doc.querySelectorAll("a")].find(
      (a) => a.getAttribute("href") === "/catalogo/propuestas",
    )!;
    expect(enlace).toBeDefined();
    expect(enlace.getAttribute("aria-current")).toBe("page");
    expect(enlace.textContent).toContain("Propuestas");
    expect(html).not.toContain("pronto");
  });
});
