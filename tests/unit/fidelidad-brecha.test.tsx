// Gate de FIDELIDAD de las cinco pantallas de la brecha contra sus páginas de la maqueta (design-system § 9 y § 11): `/tablero`,
// `/brecha`, `/brecha/control`, `/brecha/control/<id>` y `/brecha/informe`. Los rótulos de sección, los de las propiedades y de
// las columnas, la bajada, las cifras, las pestañas, los filtros y el orden de las secciones son, en español y en inglés, los de la
// maqueta. Lo que el producto hace distinto se declara abajo con su razón. Las CIFRAS no se comparan con las de la maqueta: ella
// usa aritmética ilustrativa («NO es el planificador del producto») y el producto, el plan emitido y el libro reales; lo que sí se
// comprueba es que las cinco pantallas dicen las mismas (tests/unit/brecha/cinco-pantallas.test.tsx). Sin `out/`.
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrechaPantalla } from "../../src/components/brecha/brecha-pantalla";
import { ControlPantalla } from "../../src/components/control/control-pantalla";
import { ListaDeControles } from "../../src/components/control/lista-de-controles";
import { InformePantalla } from "../../src/components/informe/informe-pantalla";
import { TableroPantalla } from "../../src/components/tablero/tablero-pantalla";
import {
  construirVistaDeBrecha,
  construirVistaDeControl,
  construirVistaDeControles,
  construirVistaDeInforme,
  construirVistaDeTablero,
} from "../../src/lib/brecha/vista";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";
import { mundoDeBrecha } from "./lib/mundo-de-brecha";

const m = await mundoDeBrecha();

// Los estados de pantalla de la sala de la maqueta: un export estático no carga nada y una brecha que no se puede calcular rompe
// el build en vez de mostrarse; «vacío» solo se dibuja sin datos (otra prueba lo comprueba). Y la matriz «qué revisar» de la sala.
const DE_LA_SALA = new Set([
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Abriendo el tablero|Opening the dashboard",
  "La validación del instrumento falló|The instrument validation failed",
  "Todavía no hay nada que vigilar|There is nothing to watch yet",
  "Calculando la brecha|Calculating the gap",
  "La brecha no se pudo calcular|The gap could not be calculated",
  "Todavía no hay brecha que medir|There is no gap to measure yet",
  "Leyendo el libro de evidencia|Reading the evidence ledger",
  "No se pudo leer el libro de evidencia|The evidence ledger could not be read",
  "Ningún control es aplicable todavía|No control applies yet",
  "Ninguna prueba cubre este control todavía|No test covers this control yet",
  "Armando el informe|Building the report",
  "El informe no se generó|The report was not generated",
  "Todavía no hay informe|There is no report yet",
]);

// Lo que el producto dice y la maqueta no. Marcos con versión nueva: la maqueta inventa una publicada; el producto no tiene registro
// de lo que publica cada fuente y lo dice, en vez de decir «ninguno» (RF-05.5).
const SOLO_DEL_PRODUCTO = new Set([
  "Sin registro de la fuente|No source record",
]);

const maqueta = (archivo: string) =>
  documentoDe(leerPagina(RAIZ_MAQUETA, archivo));
const producto = (el: ReactElement) =>
  documentoDelProducto(renderToStaticMarkup(el));

const de = (doc: Document, selector: string, ignorar = new Set<string>()) =>
  conjunto(doc, dentroDe(selector), ignorar);
/** Los pares en el orden del documento, sin repetidos: el orden de las secciones es parte de la pantalla. */
const enOrden = (
  doc: Document,
  selector: string,
  ignorar = new Set<string>(),
) => {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const e of doc.querySelectorAll(dentroDe(selector))) {
    const p = `${e.querySelector('[lang="es"]')?.textContent?.trim() ?? ""}|${e.querySelector('[lang="en"]')?.textContent?.trim() ?? ""}`;
    if (ignorar.has(p) || vistos.has(p)) continue;
    vistos.add(p);
    salida.push(p);
  }
  return salida;
};
const textos = (doc: Document, selector: string) =>
  [...doc.querySelectorAll(dentroDe(selector))].map((e) =>
    e.textContent?.replace(/\s+/g, " ").trim(),
  );
/** Lo que dice cada cifra sin su número: el número lo calcula el motor de cada lado. */
const rotulosDeCifras = (doc: Document) =>
  [...doc.querySelectorAll(dentroDe(".hg-resumen li"))].map((li) => [
    li.getAttribute("data-cifra"),
    [...li.children]
      .filter((c) => !c.classList.contains("hg-cifra"))
      .map((c) => c.textContent?.replace(/\s+/g, " ").trim())
      .join(""),
  ]);
/** Una cuenta de pruebas del catálogo («21 pruebas»): es dato, no rótulo. */
const CUENTA_DE_PRUEBAS = /^\d+ pruebas\|\d+ tests$/;
const sinCuentas = (xs: string[]) =>
  xs.filter((x) => !CUENTA_DE_PRUEBAS.test(x));

describe("fidelidad del tablero contra tablero.html", () => {
  const maq = maqueta("tablero.html");
  const prod = producto(<TableroPantalla v={construirVistaDeTablero(m)} />);

  it("los rótulos de sección, en los dos idiomas y en el mismo orden", () => {
    expect(de(maq, "h1, h2").length).toBeGreaterThan(4);
    expect(enOrden(prod, "h1, h2")).toEqual(enOrden(maq, "h1, h2", DE_LA_SALA));
  });
  it("las columnas, la bajada y las subtítulos de panel dicen lo mismo", () => {
    expect(de(prod, "thead th")).toEqual(de(maq, "thead th"));
    expect(de(prod, ".hg-bajada")).toEqual(de(maq, ".hg-bajada"));
    expect(sinCuentas(de(prod, ".hg-panel-cab .hg-menor"))).toEqual(
      sinCuentas(de(maq, ".hg-panel-cab .hg-menor")),
    );
  });
  it("las cuatro cifras de arriba dicen lo mismo, sin sus números", () => {
    expect(rotulosDeCifras(prod)).toEqual(rotulosDeCifras(maq));
    expect(rotulosDeCifras(prod).map((c) => c[0])).toEqual([
      "sin_cerrar",
      "vencidos",
      "por_confirmar",
      "por_decidir",
    ]);
  });
  it("la banda de validación, las cuentas por severidad, por estado de control y por vigencia tienen las mismas filas", () => {
    const filas = (doc: Document, sel: string) =>
      textos(doc, sel).map((t) => t?.replace(/\d+$/, "").trim());
    // El rótulo de «cuentas»: severidades, controles por estado, vigencia del catálogo.
    expect(filas(prod, ".hg-cuentas li")).toEqual(filas(maq, ".hg-cuentas li"));
    expect(de(prod, ".hg-sello-titulo")).toEqual(
      expect.arrayContaining([
        "El instrumento pasó su validación|The instrument passed its validation",
      ]),
    );
    expect(textos(prod, "[data-validacion]").length).toBe(1);
  });
  it("«Ver las comprobaciones» es el mismo botón", () => {
    expect(textos(prod, '[data-controlador="alternar"]')).toEqual(
      textos(maq, '[data-controlador="alternar"]'),
    );
  });
});

describe("fidelidad de la brecha contra brecha.html", () => {
  const maq = maqueta("brecha.html");
  const prod = producto(<BrechaPantalla v={construirVistaDeBrecha(m)} />);

  it("los rótulos de sección, en los dos idiomas y en el mismo orden", () => {
    expect(enOrden(prod, "h1, h2")).toEqual(enOrden(maq, "h1, h2", DE_LA_SALA));
  });
  it("las columnas, la bajada, los subtítulos y los pies dicen lo mismo", () => {
    expect(de(prod, "thead th")).toEqual(de(maq, "thead th"));
    expect(de(prod, ".hg-bajada")).toEqual(de(maq, ".hg-bajada"));
    expect(de(prod, ".hg-panel-cab .hg-menor")).toEqual(
      de(maq, ".hg-panel-cab .hg-menor"),
    );
    expect(de(prod, "caption")).toEqual(de(maq, "caption"));
  });
  it("las cuatro cifras de arriba dicen lo mismo, sin sus números", () => {
    expect(rotulosDeCifras(prod)).toEqual(rotulosDeCifras(maq));
  });
  it("las pestañas de cobertura y los filtros son los mismos, y abren en el primero", () => {
    expect(textos(prod, ".hg-pestanas .hg-pestana")).toEqual(
      textos(maq, ".hg-pestanas .hg-pestana"),
    );
    const abre = (doc: Document, sel: string) =>
      [...doc.querySelectorAll(dentroDe(sel))].map((b) =>
        b.getAttribute("aria-pressed"),
      );
    expect(abre(prod, ".hg-pestana")).toEqual(abre(maq, ".hg-pestana"));
    expect(textos(prod, ".hg-filtro")).toEqual(textos(maq, ".hg-filtro"));
    expect(abre(prod, ".hg-filtro")).toEqual(abre(maq, ".hg-filtro"));
    expect(textos(prod, ".hg-campo > span")).toEqual(
      textos(maq, ".hg-campo > span"),
    );
  });
  it("cada fila de «esperado contra obtenido» trae los atributos que la pantalla filtra", () => {
    const filas = [...prod.querySelectorAll(dentroDe("tr[data-fila-brecha]"))];
    expect(filas.length).toBe(25);
    for (const f of filas)
      for (const a of [
        "data-prueba",
        "data-activo",
        "data-familia",
        "data-veredicto",
      ])
        expect(f.getAttribute(a), a).toBeTruthy();
  });
});

describe("fidelidad de la lista de controles contra control.html", () => {
  const maq = maqueta("control.html");
  const prod = producto(<ListaDeControles v={construirVistaDeControles(m)} />);

  it("los rótulos de sección, las columnas y la bajada son los mismos", () => {
    expect(enOrden(prod, "h1, h2")).toEqual(enOrden(maq, "h1, h2", DE_LA_SALA));
    expect(de(prod, "thead th")).toEqual(de(maq, "thead th"));
    expect(de(prod, ".hg-bajada")).toEqual(de(maq, ".hg-bajada"));
    expect(de(prod, ".hg-panel-cab .hg-menor")).toEqual(
      de(maq, ".hg-panel-cab .hg-menor"),
    );
  });
  it("las cuatro cifras son los cuatro estados de un control, en el mismo orden", () => {
    expect(rotulosDeCifras(prod)).toEqual(rotulosDeCifras(maq));
    expect(rotulosDeCifras(prod).map((c) => c[0])).toEqual([
      "con_evidencia_vigente",
      "evidencia_antigua",
      "con_fallas",
      "sin_evidencia",
    ]);
  });
});

describe("fidelidad de la página de un control contra control-iso42001-a-6-2-4.html", () => {
  const maq = maqueta("control-iso42001-a-6-2-4.html");
  const prod = producto(
    <ControlPantalla v={construirVistaDeControl("iso42001-A.6.2.4", m)} />,
  );
  // El nombre del control es dato del catálogo del producto, que lo escribió con otras palabras que la maqueta.
  const SIN_NOMBRE = (doc: Document) =>
    enOrden(doc, "h2, h3", DE_LA_SALA).filter(
      (x) => !x.startsWith("El sistema") && !x.startsWith("Se verifica"),
    );

  it("los rótulos de sección y del carril son los mismos y van en el mismo orden", () => {
    expect(SIN_NOMBRE(prod)).toEqual(SIN_NOMBRE(maq));
    expect(de(prod, "dt")).toEqual(de(maq, "dt"));
    expect(de(prod, "thead th")).toEqual(de(maq, "thead th"));
  });
  it("las cifras y el sello dicen lo mismo sin sus números", () => {
    expect(rotulosDeCifras(prod).map((c) => c[1])).toEqual(
      rotulosDeCifras(maq).map((c) => c[1]),
    );
    expect(textos(prod, ".hg-bajada")).toEqual(textos(maq, ".hg-bajada"));
  });
  it("trae el selector de todos los controles aplicables y marca el actual", () => {
    expect(
      prod.querySelectorAll(dentroDe(".hg-selector .hg-opcion")).length,
    ).toBe(8);
    expect(
      prod.querySelectorAll(dentroDe('.hg-selector [aria-current="page"]'))
        .length,
    ).toBe(1);
  });
});

describe("fidelidad del informe contra informe.html", () => {
  const maq = maqueta("informe.html");
  const prod = producto(<InformePantalla v={construirVistaDeInforme(m)} />);

  it("las ocho secciones del § 12 y sus rótulos son los mismos, en el mismo orden", () => {
    expect(enOrden(prod, "h1, h2, h3")).toEqual(
      enOrden(maq, "h1, h2, h3", DE_LA_SALA),
    );
    expect(textos(prod, ".hg-informe-seccion > h2")).toEqual(
      textos(maq, ".hg-informe-seccion > h2"),
    );
    expect(textos(prod, ".hg-informe-seccion > h2").length).toBe(8);
  });
  it("las columnas, las propiedades de la ficha y las bajadas dicen lo mismo", () => {
    expect(de(prod, "thead th")).toEqual(de(maq, "thead th"));
    expect(de(prod, "dt")).toEqual(de(maq, "dt"));
    expect(
      de(prod, ".hg-informe-seccion .hg-menor", SOLO_DEL_PRODUCTO),
    ).toEqual(
      expect.arrayContaining(de(maq, ".hg-informe-seccion > .hg-menor")),
    );
  });
  it("las cifras del resumen y el índice del carril son los mismos", () => {
    expect(rotulosDeCifras(prod)).toEqual(rotulosDeCifras(maq));
    expect(textos(prod, ".hg-indice li")).toEqual(textos(maq, ".hg-indice li"));
    expect(textos(prod, ".hg-tarjeta-titulo")).toEqual(
      textos(maq, ".hg-tarjeta-titulo"),
    );
  });
  it("el botón de imprimir es el mismo y el aviso de impresión empieza oculto", () => {
    expect(textos(prod, '[data-controlador="imprimir"]')).toEqual(
      textos(maq, '[data-controlador="imprimir"]'),
    );
    const aviso = prod.querySelector("[data-aviso-impresion]");
    expect(aviso?.hasAttribute("hidden")).toBe(true);
  });
});

describe("los estados vacíos se dibujan solo sin datos", () => {
  const dice = (el: ReactElement, titulo: string) =>
    renderToStaticMarkup(el).includes(titulo);

  it("sin activos el tablero dice que no hay nada que vigilar, y con ellos no lo dice", () => {
    const v = construirVistaDeTablero(m);
    expect(
      dice(<TableroPantalla v={v} />, "Todavía no hay nada que vigilar"),
    ).toBe(false);
    expect(
      dice(
        <TableroPantalla v={{ ...v, activos: [] }} />,
        "Todavía no hay nada que vigilar",
      ),
    ).toBe(true);
  });
  it("sin ningún activo con plan la brecha dice que no hay brecha que medir", () => {
    const v = construirVistaDeBrecha(m);
    expect(
      dice(<BrechaPantalla v={v} />, "Todavía no hay brecha que medir"),
    ).toBe(false);
    const sinPlanes = {
      ...v,
      porActivo: v.porActivo.map((a) => ({ ...a, totales: null, plan: null })),
    };
    expect(
      dice(<BrechaPantalla v={sinPlanes} />, "Todavía no hay brecha que medir"),
    ).toBe(true);
  });
  it("sin controles aplicables la lista dice que ninguno aplica todavía", () => {
    const v = construirVistaDeControles(m);
    expect(
      dice(<ListaDeControles v={v} />, "Ningún control es aplicable todavía"),
    ).toBe(false);
    expect(
      dice(
        <ListaDeControles v={{ ...v, controles: [] }} />,
        "Ningún control es aplicable todavía",
      ),
    ).toBe(true);
  });
  it("sin pruebas el informe dice que todavía no hay informe", () => {
    const v = construirVistaDeInforme(m);
    expect(dice(<InformePantalla v={v} />, "Todavía no hay informe")).toBe(
      false,
    );
    expect(
      dice(
        <InformePantalla v={{ ...v, filas: [] }} />,
        "Todavía no hay informe",
      ),
    ).toBe(true);
  });
});
