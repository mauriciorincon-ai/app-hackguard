// Gate de FIDELIDAD de `/catalogo` contra su página de la maqueta (design-system § 9 y § 11; regla 10 de la constitución):
// la primera pantalla construida es la que se aprobó. La mirada del usuario es el juicio; este gate impide que el producto
// derive en silencio: los rótulos de sección, las cabeceras de columna, los nombres de filtro, las etiquetas de estado y
// las opciones de las listas son, en español y en inglés, los mismos conjuntos que en `docs/diseno/catalogo.html`.
// El producto se renderiza aquí, sin `out/`: `pnpm test` corre antes que `pnpm build` en la CI.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { CatalogoPantalla } from "../../src/components/catalogo/catalogo-pantalla";
import {
  CatalogoConError,
  CatalogoVacio,
} from "../../src/components/catalogo/estado-vacio";
import { construirVista } from "../../src/lib/catalogo/vista.ts";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const RAIZ = process.cwd();
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const vista = construirVista(
  snap,
  archivo.replace(/\.json$/, ""),
  snap.fecha_evaluacion,
);

// Lo que la maqueta dibuja y el producto no: el estado «cargando» (un export estático no carga nada en el navegador) y las
// piezas de la sala de diseño. Cada excepción lleva su razón.
const SOLO_DE_LA_MAQUETA = new Set([
  "Validando el catálogo|Validating the catalog",
]);

const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, "catalogo.html"));
const producto = documentoDe(
  "<body><main class='hg-principal'>" +
    renderToStaticMarkup(
      <>
        <CatalogoPantalla vista={vista} />
        <CatalogoVacio />
        <CatalogoConError
          rechazadas={[
            {
              id: "PR-X-001",
              razon: {
                es: "cita su marco sin versión.",
                en: "cites its framework without a version.",
              },
            },
          ]}
        />
      </>,
    ) +
    "</main></body>",
);

/** «español|inglés» de un elemento que lleva sus dos idiomas en spans con `lang`. */
const par = (el: Element) =>
  `${el.querySelector('[lang="es"]')?.textContent?.trim() ?? ""}|${el.querySelector('[lang="en"]')?.textContent?.trim() ?? ""}`;
const conjunto = (
  doc: Document,
  selector: string,
  ignorar = new Set<string>(),
) =>
  [...new Set([...doc.querySelectorAll(selector)].map(par))]
    .filter((p) => !ignorar.has(p))
    .sort();

const dentroDe = (selector: string) => `.hg-principal ${selector}`;

describe("fidelidad de /catalogo contra docs/diseno/catalogo.html", () => {
  it("la maqueta y el producto se pudieron leer: ningún conjunto está vacío", () => {
    expect(conjunto(maqueta, dentroDe("h2")).length).toBeGreaterThan(0);
    expect(conjunto(producto, dentroDe("h2")).length).toBeGreaterThan(0);
  });

  it("los rótulos de sección (h1 y h2) son los mismos, en los dos idiomas", () => {
    const rotulos = (doc: Document) =>
      conjunto(
        doc,
        [dentroDe("h1"), dentroDe("h2")].join(", "),
        SOLO_DE_LA_MAQUETA,
      );
    expect(rotulos(producto)).toEqual(rotulos(maqueta));
  });

  it("las cabeceras de las dos tablas son las mismas", () => {
    expect(conjunto(producto, dentroDe("thead th"))).toEqual(
      conjunto(maqueta, dentroDe("thead th")),
    );
  });

  it("los nombres de los filtros son los mismos: las píldoras de familia y los rótulos de las listas", () => {
    const pildoras = (doc: Document) =>
      conjunto(doc, dentroDe(".hg-grupo .hg-filtro"));
    const listas = (doc: Document) =>
      conjunto(doc, dentroDe("label.hg-campo > span"));
    expect(pildoras(producto)).toEqual(pildoras(maqueta));
    expect(listas(producto)).toEqual(listas(maqueta));
    expect(listas(producto)).toHaveLength(5);
  });

  it("las etiquetas de estado de las cifras de arriba son las mismas", () => {
    const cifras = (doc: Document) =>
      conjunto(doc, dentroDe(".hg-resumen li .hg-estado > span"));
    expect(cifras(producto)).toEqual(cifras(maqueta));
    expect(cifras(producto)).toHaveLength(4);
  });

  it("las opciones de las listas de vigencia, madurez y revisión son las mismas que en la maqueta", () => {
    const deLaMaqueta = (campo: string) =>
      [
        ...maqueta.querySelectorAll(
          `select[data-campo="${campo}"] option[data-es]`,
        ),
      ]
        .map((o) => `${o.getAttribute("data-es")}|${o.getAttribute("data-en")}`)
        .sort();
    for (const campo of ["madurez", "vigencia", "revision"] as const) {
      const lista = vista.listas.find((l) => l.campo === campo)!;
      const deLaVista = lista.opciones
        .map((o) =>
          typeof o.texto === "string" ? o.texto : `${o.texto.es}|${o.texto.en}`,
        )
        .sort();
      expect(deLaVista, campo).toEqual(deLaMaqueta(campo));
    }
  });

  it("el botón «Quitar filtros» y el contador de lo que se ve existen en los dos", () => {
    for (const doc of [maqueta, producto]) {
      expect(doc.querySelector("[data-cuenta-filtrada]")).not.toBeNull();
      expect(doc.body.textContent).toContain("Quitar filtros");
    }
  });
});
