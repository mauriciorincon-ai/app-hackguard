// Gate de FIDELIDAD de `/catalogo/marcos` contra `docs/diseno/marcos.html` (design-system § 9 y § 11): los rótulos de
// sección, las cabeceras de columna y las etiquetas de las cifras de arriba son, en español y en inglés, los mismos
// conjuntos que en la maqueta. La mirada del usuario es el juicio; este gate impide que el producto derive en silencio.
// Se renderiza sin `out/`: `pnpm test` corre antes que `pnpm build` en la CI.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import {
  MarcosPantalla,
  MarcosVacio,
} from "../../src/components/marcos/marcos-pantalla";
import { construirVistaDeMarcos } from "../../src/lib/catalogo/marcos.ts";
import { propuestasSinAvisos } from "./lib/mundo-de-brecha";
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
const vista = construirVistaDeMarcos(
  snap,
  archivo.replace(/\.json$/, ""),
  snap.fecha_evaluacion,
  [
    {
      nombre: archivo.replace(/\.json$/, ""),
      fecha: snap.fecha_evaluacion,
      pruebas: snap.catalogo.pruebas.length,
      huella: snap.huella,
    },
  ],
  propuestasSinAvisos,
);

// Lo que la maqueta dibuja y el producto no. Cada excepción lleva su razón.
const SOLO_DE_LA_MAQUETA = new Set([
  // Un export estático no carga nada en el navegador, y un catálogo inválido rompe el build en vez de mostrarse.
  "Comprobando los marcos|Checking the frameworks",
  "Los marcos no se cargaron|The frameworks did not load",
  // La instantánea no trae el nombre de las entradas de cada versión: el producto no inventa una columna vacía.
  "Nombre anterior|Previous name",
  // La instantánea no dice si la fuente oficial publica una versión más nueva: el producto cuenta lo que sabe.
  "con versión más nueva|with a newer version",
]);
// Y lo que el producto dibuja y la maqueta no.
const SOLO_DEL_PRODUCTO = new Set([
  "con la fuente fuera del alcance del agente|with a source out of the agent's reach",
]);

const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, "marcos.html"));
const producto = documentoDelProducto(
  renderToStaticMarkup(
    <>
      <MarcosPantalla vista={vista} />
      <MarcosVacio />
    </>,
  ),
);

describe("fidelidad de /catalogo/marcos contra docs/diseno/marcos.html", () => {
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
    expect(rotulos(producto)).toContain(
      "Marcos y versiones|Frameworks and versions",
    );
  });

  it("las cabeceras de las tablas son las mismas (salvo la columna que la instantánea no puede llenar)", () => {
    // «Entrada en la 2025»: la versión es un dato de cada mapa (la maqueta dibuja otra), el rótulo es lo que se compara.
    const sinVersion = (p: string) =>
      p.replace(
        /^Entrada en la \S+\|Entry in \S+$/,
        "Entrada en la {v}|Entry in {v}",
      );
    const cabeceras = (doc: Document) => [
      ...new Set(
        conjunto(doc, dentroDe("thead th"), SOLO_DE_LA_MAQUETA).map(sinVersion),
      ),
    ];
    expect(cabeceras(producto)).toEqual(cabeceras(maqueta));
    expect(cabeceras(producto)).toContain(
      "Frente a la fuente|Against the source",
    );
  });

  it("las etiquetas de las cifras de arriba son las mismas (salvo las dos que cuentan otra cosa, dicho en el gate)", () => {
    const cifras = (doc: Document, ignorar: ReadonlySet<string>) =>
      conjunto(doc, dentroDe(".hg-resumen li > span:not(.hg-cifra)"), ignorar);
    expect(cifras(producto, SOLO_DEL_PRODUCTO)).toEqual(
      cifras(maqueta, SOLO_DE_LA_MAQUETA),
    );
    expect(cifras(producto, new Set())).toHaveLength(4);
  });

  it("el estado vacío es el de la maqueta, con su título y su texto", () => {
    const vacio = (doc: Document) =>
      conjunto(doc, dentroDe(".hg-aviso h2"), SOLO_DE_LA_MAQUETA);
    expect(vacio(producto)).toEqual(vacio(maqueta));
    expect(vacio(producto)).toEqual([
      "No hay marcos cargados|No frameworks loaded",
    ]);
  });
});
