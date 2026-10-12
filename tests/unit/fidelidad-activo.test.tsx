// Gate de FIDELIDAD de `/activos/<id>` contra `docs/diseno/activo-<id>.html` (design-system § 9 y § 11): los rótulos de sección, de
// panel y de propiedad, y los textos del selector son, en español y en inglés, los mismos conjuntos que en la maqueta, para los
// tres activos demo. La mirada del usuario es el juicio; este gate impide que el producto derive en silencio. Sin `out/`.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivoPantalla } from "../../src/components/activos/activo-pantalla";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { IDS, vistaDeActivo } from "./lib/mundo-de-activos";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

// Lo que la maqueta dibuja y el producto no. Cada excepción lleva su razón.
const SOLO_DE_LA_MAQUETA = new Set([
  // Estados de pantalla de la sala de la maqueta: un export estático no carga nada en el navegador y un activo inválido rompe
  // el build en vez de mostrarse (como el catálogo inválido).
  "No hay activos registrados|No assets registered",
  "Abriendo el activo|Opening the asset",
  "El activo no se pudo abrir|The asset could not be opened",
  // «En prueba» no se deriva todavía: el estado del activo sale de su plan, y el libro de evidencia no lo cambia en este sprint.
  "En prueba|Under test",
  // El marco de la sala de la maqueta: la matriz «qué revisar» y el pie con la consulta y la instantánea, que en el producto
  // viven en la barra lateral y no en la página.
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Fecha de consulta|Query date",
  "Instantánea del catálogo|Catalog snapshot",
]);

// Lo que el producto dibuja y la maqueta no.
const SOLO_DEL_PRODUCTO = new Set([
  // El estado del asistente se deriva de su plan emitido («Con plan»); la maqueta le escribió «En prueba» a mano.
  "Con plan|Has a plan",
]);

// Los textos del selector son los nombres de los activos y su estado: el estado del producto se deriva (Con plan / Registrado).
const textos = (doc: Document, selector: string) =>
  conjunto(doc, dentroDe(selector), SOLO_DE_LA_MAQUETA);

describe.each(IDS)(
  "fidelidad de /activos/%s contra su página de la maqueta",
  (id) => {
    const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, `activo-${id}.html`));
    const producto = documentoDelProducto(
      renderToStaticMarkup(<ActivoPantalla v={vistaDeActivo(id)} />),
    );

    it("la maqueta y el producto se pudieron leer: ningún conjunto está vacío", () => {
      expect(textos(maqueta, "h2").length).toBeGreaterThan(0);
      expect(textos(producto, "h2").length).toBeGreaterThan(0);
    });

    it("los rótulos de sección, de panel y de tarjeta (h1, h2) son los mismos, en los dos idiomas", () => {
      const rotulos = (doc: Document) => textos(doc, "h1, h2");
      expect(rotulos(producto)).toEqual(rotulos(maqueta));
      expect(rotulos(producto)).toContain(
        "Dueño y proveedor|Owner and provider",
      );
      expect(rotulos(producto)).toContain(
        "Reglas de enfrentamiento|Rules of engagement",
      );
    });

    it("los rótulos de propiedad y de columna del contraste (dt, .hg-rotulo) son los mismos", () => {
      expect(textos(producto, "dt")).toEqual(textos(maqueta, "dt"));
      expect(textos(producto, ".hg-rotulo")).toEqual(
        textos(maqueta, ".hg-rotulo"),
      );
    });

    it("los chips y sellos con título (qué falta, qué se declaró) son los mismos", () => {
      const chips = (doc: Document) =>
        conjunto(
          doc,
          dentroDe(".hg-chip > span, .hg-sello-titulo"),
          SOLO_DE_LA_MAQUETA,
        );
      // Los de la maqueta incluyen los de sus estados de sala (error): solo se comparan los que el producto puede mostrar.
      const delProducto = chips(producto);
      const delaMaqueta = new Set(chips(maqueta));
      for (const c of delProducto)
        if (!SOLO_DEL_PRODUCTO.has(c)) expect(delaMaqueta, c).toContain(c);
      expect(delProducto.length).toBeGreaterThan(0);
    });

    it("el selector lista los mismos activos, con el mismo nombre", () => {
      const nombres = (doc: Document) =>
        conjunto(doc, dentroDe(".hg-selector .hg-opcion-nombre"));
      expect(nombres(producto)).toEqual(nombres(maqueta));
      expect(nombres(producto)).toHaveLength(IDS.length);
    });
  },
);
