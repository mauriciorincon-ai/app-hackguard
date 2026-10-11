// Gate de FIDELIDAD de `/catalogo/controles` contra `docs/diseno/controles.html` (design-system § 9 y § 11): los rótulos de
// sección, las cabeceras de columna y las etiquetas de las cifras son, en español y en inglés, los mismos conjuntos que en
// la maqueta. Se renderiza sin `out/`: `pnpm test` corre antes que `pnpm build` en la CI.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import {
  ControlesPantalla,
  ControlesVacio,
} from "../../src/components/controles/controles-pantalla";
import { construirVistaDeControles } from "../../src/lib/catalogo/controles.ts";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const RAIZ = process.cwd();
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const vista = construirVistaDeControles(
  snap,
  archivo.replace(/\.json$/, ""),
  snap.fecha_evaluacion,
);

// Lo que la maqueta dibuja y el producto no (un export estático no carga nada en el navegador, y un catálogo inválido
// rompe el build en vez de mostrarse).
const SOLO_DE_LA_MAQUETA = new Set([
  "Cruzando pruebas y controles|Matching tests and controls",
  "Los controles no se cargaron|The controls did not load",
]);

const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, "controles.html"));
const producto = documentoDelProducto(
  renderToStaticMarkup(
    <>
      <ControlesPantalla vista={vista} />
      <ControlesVacio />
    </>,
  ),
);

describe("fidelidad de /catalogo/controles contra docs/diseno/controles.html", () => {
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
    expect(rotulos(producto)).toContain("Controles|Controls");
  });

  it("las cabeceras de las tres tablas son las mismas", () => {
    expect(conjunto(producto, dentroDe("thead th"))).toEqual(
      conjunto(maqueta, dentroDe("thead th")),
    );
  });

  it("las etiquetas de las cuatro cifras de arriba son las mismas", () => {
    const cifras = (doc: Document) =>
      conjunto(doc, dentroDe(".hg-resumen li > span:not(.hg-cifra)"));
    expect(cifras(producto)).toEqual(cifras(maqueta));
    expect(cifras(producto)).toHaveLength(4);
  });

  it("el estado vacío es el de la maqueta, con su título", () => {
    const vacio = (doc: Document) =>
      conjunto(doc, dentroDe(".hg-aviso h2"), SOLO_DE_LA_MAQUETA);
    expect(vacio(producto)).toEqual(vacio(maqueta));
    expect(vacio(producto)).toEqual([
      "No hay controles cargados|No controls loaded",
    ]);
  });
});
