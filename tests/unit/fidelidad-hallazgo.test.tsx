// Gate de FIDELIDAD de `/evidencia/hallazgos/<id>` contra `docs/diseno/hallazgo-hz-*.html` (design-system § 9 y § 11): los
// rótulos de sección, los de las propiedades, las cabeceras de la tabla de prioridad, los eslabones de la cadena de cierre y
// sus estados, las celdas de la tabla y las métricas del vector son, en español y en inglés, los mismos que en la maqueta.
// Lo que el producto hace distinto (la re-prueba que se registra por CLI, el reabrir que no existe, el aviso de revisión) se
// declara abajo con su razón. Sin `out/`.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HallazgoPantalla } from "../../src/components/hallazgo/hallazgo-pantalla";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { IDS_DE_HALLAZGOS, vistaDeHallazgo } from "./lib/mundo-de-hallazgos";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const SOLO_DE_LA_MAQUETA = new Set([
  // Los estados de pantalla de la sala de la maqueta: un export estático no carga nada, y un hallazgo que no cuadra con su libro
  // rompe el build en vez de mostrarse.
  "No hay hallazgos|No findings",
  "Abriendo el hallazgo|Opening the finding",
  "El hallazgo no se pudo abrir|The finding could not be opened",
  "El vector de severidad está incompleto|The severity vector is incomplete",
  // La matriz «qué revisar» y el pie de la sala: en el producto viven en la barra lateral.
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Fecha de consulta|Query date",
  "Instantánea del catálogo|Catalog snapshot",
]);
// Lo que el producto dibuja y la maqueta no.
const SOLO_DEL_PRODUCTO = new Set([
  // La maqueta dibuja botones que decide una persona en pantalla; el producto es de solo lectura y cada salida trae su comando.
  "Registrar la re-prueba|Record the retest",
  // Un riesgo aceptado no está cerrado: se corrige igual, y la corrección habilita la re-prueba que lo cierra (S5-2, Sprint 9). La
  // maqueta solo ofrecía eliminar o «no se reproduce» en HZ-0005.
  "Registrar la corrección|Record the fix",
]);

// Dónde la maqueta y el catálogo oficial no dicen lo mismo de los controles (el producto lee el catálogo): la maqueta dejaba
// PR-AG-LIM-001 sin control y el catálogo la une a iso42001-A.6.2.6, así que HZ-0005 muestra el control en vez del chip.
const CONTROL_DEL_CATALOGO = new Set(["HZ-0005"]);

describe.each(IDS_DE_HALLAZGOS)(
  "fidelidad del hallazgo %s contra su página de la maqueta",
  (id) => {
    const maqueta = documentoDe(
      leerPagina(RAIZ_MAQUETA, `hallazgo-${id.toLowerCase()}.html`),
    );
    const v = vistaDeHallazgo(id);
    const producto = documentoDelProducto(
      renderToStaticMarkup(<HallazgoPantalla v={v} />),
    );
    const de = (
      doc: Document,
      selector: string,
      ignorar: ReadonlySet<string>,
    ) => conjunto(doc, dentroDe(selector), ignorar);
    const textos = (doc: Document, selector: string) =>
      [...doc.querySelectorAll(dentroDe(selector))].map((e) =>
        e.textContent?.replace(/\s+/g, " ").trim(),
      );

    it("la maqueta y el producto se pudieron leer: ningún conjunto está vacío", () => {
      expect(de(maqueta, "h1", SOLO_DE_LA_MAQUETA).length).toBeGreaterThan(0);
      expect(de(producto, "h1", SOLO_DEL_PRODUCTO).length).toBeGreaterThan(0);
    });

    it("los rótulos de sección (h1 y h2) son los mismos, en los dos idiomas", () => {
      expect(de(producto, "h1, h2", SOLO_DEL_PRODUCTO)).toEqual(
        de(maqueta, "h1, h2", SOLO_DE_LA_MAQUETA),
      );
      expect(de(producto, "h2", new Set())).toEqual(
        expect.arrayContaining([
          "Cadena de cierre|Closure chain",
          "Qué control falla|Which control fails",
          "Qué puedes hacer|What you can do",
          "Severidad|Severity",
        ]),
      );
    });

    it("los rótulos de las propiedades y del contraste son los mismos", () => {
      expect(de(producto, "dt, .hg-rotulo", SOLO_DEL_PRODUCTO)).toEqual(
        de(maqueta, "dt, .hg-rotulo", SOLO_DE_LA_MAQUETA),
      );
    });

    it("el selector, la cabecera y los avisos dicen lo mismo", () => {
      expect(textos(producto, ".hg-selector .hg-opcion-titulo")).toEqual(
        textos(maqueta, ".hg-selector .hg-opcion-titulo"),
      );
      expect(de(producto, ".hg-selector .hg-opcion", new Set())).toEqual(
        de(maqueta, ".hg-selector .hg-opcion", new Set()),
      );
      expect(de(producto, ".hg-cabecera-linea .hg-chip", new Set())).toEqual(
        de(maqueta, ".hg-cabecera-linea .hg-chip", new Set()),
      );
      expect(de(producto, "h1", new Set())).toEqual(de(maqueta, "h1", SOLO_DE_LA_MAQUETA));
      expect(de(producto, ".hg-bajada", new Set())).toEqual(de(maqueta, ".hg-bajada", new Set()));
      for (const aviso of ["data-aviso-de-plazo", "data-aviso-de-revision"])
        expect(producto.querySelectorAll(`[${aviso}]`).length, aviso).toBe(
          maqueta.querySelectorAll(`.hg-principal [${aviso}]`).length,
        );
      expect(de(producto, ".hg-sello-titulo", new Set())).toEqual(
        de(maqueta, ".hg-sello-titulo", SOLO_DE_LA_MAQUETA),
      );
    });

    it("la cadena de cierre tiene los mismos eslabones, en el mismo estado (hecho, por hacer, punteado)", () => {
      const clases = (doc: Document) =>
        [...doc.querySelectorAll(dentroDe(".hg-eslabon"))].map((e) =>
          [...e.classList].find((c) => c.startsWith("es-")),
        );
      expect(clases(producto)).toEqual(clases(maqueta));
      expect(textos(producto, ".hg-eslabon .hg-eslabon-titulo")).toEqual(
        textos(maqueta, ".hg-eslabon .hg-eslabon-titulo"),
      );
      // Cada eslabón hecho lleva marca (trazo), texto y color: nunca el color solo (regla dura 12).
      for (const li of producto.querySelectorAll(dentroDe(".hg-eslabon")))
        expect(li.querySelector("svg"), "la marca es un trazo").not.toBeNull();
    });

    it("la severidad es la misma: el puntaje o la tabla entera, celda por celda", () => {
      expect(textos(producto, ".hg-puntaje .hg-cifra")).toEqual(
        textos(maqueta, ".hg-puntaje .hg-cifra"),
      );
      expect(textos(producto, ".hg-metricas li")).toEqual(
        textos(maqueta, ".hg-metricas li"),
      );
      expect(textos(producto, '[aria-labelledby="severidad"] .hg-vector')).toEqual(
        textos(maqueta, '[aria-labelledby="severidad"] .hg-vector'),
      );
      expect(de(producto, ".hg-matriz thead th", new Set())).toEqual(
        de(maqueta, ".hg-matriz thead th", new Set()),
      );
      const celdas = (doc: Document) =>
        [...doc.querySelectorAll(dentroDe(".hg-matriz tbody tr"))].map((tr) =>
          [...tr.querySelectorAll("td")].map((td) =>
            [
              td.querySelector(".hg-estado")?.textContent?.trim(),
              td.hasAttribute("data-esta-celda"),
            ].join("·"),
          ),
        );
      expect(celdas(producto)).toEqual(celdas(maqueta));
      expect(
        producto.querySelector("[data-nivel-de-tabla]")?.getAttribute("data-nivel-de-tabla"),
      ).toBe(
        maqueta
          .querySelector(".hg-principal [data-nivel-de-tabla]")
          ?.getAttribute("data-nivel-de-tabla"),
      );
    });

    it("el control que falla y lo obtenido son los mismos (el nombre del control y lo esperado los manda el catálogo oficial)", () => {
      // La maqueta nombraba los controles y lo esperado con su propio diccionario; el producto lee la instantánea oficial.
      if (CONTROL_DEL_CATALOGO.has(id)) {
        expect(textos(producto, '[aria-labelledby="control"] .hg-junto .hg-dato')).toEqual(["iso42001-A.6.2.6"]);
        expect(textos(maqueta, '[aria-labelledby="control"] .hg-junto .hg-chip')[0]).toContain("Sin control asignado");
      } else {
        expect(textos(producto, '[aria-labelledby="control"] .hg-junto .hg-dato')).toEqual(
          textos(maqueta, '[aria-labelledby="control"] .hg-junto .hg-dato'),
        );
        expect(textos(producto, '[aria-labelledby="control"] .hg-junto .hg-chip')).toEqual(
          textos(maqueta, '[aria-labelledby="control"] .hg-junto .hg-chip'),
        );
      }
      for (const s of [
        ".hg-contraste > div:nth-child(2) p",
        ".hg-contraste .hg-rotulo",
      ])
        expect(textos(producto, s), s).toEqual(textos(maqueta, s));
      expect(textos(producto, ".hg-contraste > div:nth-child(1) p:not(.hg-rotulo)")).toHaveLength(1);
    });

    it("las salidas del producto son un subconjunto de las de la maqueta, salvo las declaradas", () => {
      const nombres = (doc: Document, selector: string) =>
        de(doc, selector, new Set());
      const delaMaqueta = new Set([
        ...nombres(maqueta, ".hg-acciones .hg-boton"),
        "Reabrir|Reopen",
      ]);
      for (const n of nombres(producto, ".hg-tarjeta-accion .hg-junto > strong"))
        if (!SOLO_DEL_PRODUCTO.has(n)) expect(delaMaqueta, n).toContain(n);
    });
  },
);
