// Gate de FIDELIDAD de `/activos/<id>/plan` contra `docs/diseno/plan-<id>.html` (design-system § 9 y § 11): los rótulos de
// sección, las cabeceras de las tablas, las etiquetas de las cifras y los motivos de exclusión son, en español y en inglés, los
// mismos conjuntos que en la maqueta. Lo que el motor calcula distinto (otras pruebas, otras cifras) NO se compara aquí: manda el
// motor, y el cierre del sprint lista la diferencia por prueba. Sin `out/`.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanPantalla } from "../../src/components/plan/plan-pantalla";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { IDS, vistaDePlan } from "./lib/mundo-de-activos";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const SOLO_DE_LA_MAQUETA = new Set([
  // Estados de pantalla de la sala de la maqueta: un export estático no carga nada, y un plan que no cuadra con su huella rompe
  // el build en vez de mostrarse.
  "Este activo todavía no tiene plan|This asset has no plan yet",
  "Planeando|Planning",
  "El plan no se pudo emitir|The plan could not be issued",
  "La instantánea del catálogo no coincide con su huella|The catalog snapshot does not match its fingerprint",
  // El producto no tiene todavía la pantalla de carga de evidencia (S6): el pie lleva la descarga del paquete.
  "Ir a la carga de evidencia|Go to evidence intake",
  // El marco de la sala de la maqueta: la matriz «qué revisar» y el pie con la consulta y la instantánea, que en el producto
  // viven en la barra lateral y no en la página.
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Fecha de consulta|Query date",
  "Instantánea del catálogo|Catalog snapshot",
  // Solo se dibuja si la herramienta declara versión mínima: depende de los datos, no de la pantalla.
  "Versión mínima|Minimum version",
]);
// Lo que el producto dibuja y la maqueta no.
const SOLO_DEL_PRODUCTO = new Set([
  // La huella completa del paquete y de la instantánea, y la descarga: la maqueta solo enseñaba la huella abreviada del plan.
  "Huella del paquete|Package fingerprint",
  "Huella de la instantánea|Snapshot fingerprint",
  "Versión mínima|Minimum version",
]);

describe.each(IDS)(
  "fidelidad del plan de %s contra su página de la maqueta",
  (id) => {
    const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, `plan-${id}.html`));
    const producto = documentoDelProducto(
      renderToStaticMarkup(<PlanPantalla v={vistaDePlan(id)} />),
    );
    const de = (
      doc: Document,
      selector: string,
      ignorar: ReadonlySet<string>,
    ) => conjunto(doc, dentroDe(selector), ignorar);

    it("la maqueta y el producto se pudieron leer: ningún conjunto está vacío", () => {
      expect(de(maqueta, "h1", SOLO_DE_LA_MAQUETA).length).toBeGreaterThan(0);
      expect(de(producto, "h1", SOLO_DEL_PRODUCTO).length).toBeGreaterThan(0);
    });

    it("los rótulos de sección (h1 y h2) son los mismos, en los dos idiomas", () => {
      const rotulos = (doc: Document, ignorar: ReadonlySet<string>) =>
        de(doc, "h1, h2", ignorar);
      expect(rotulos(producto, SOLO_DEL_PRODUCTO)).toEqual(
        rotulos(maqueta, SOLO_DE_LA_MAQUETA),
      );
      expect(rotulos(producto, new Set())).toContain(
        "Plan de pruebas|Test plan",
      );
    });

    it("las cabeceras de las tablas y las etiquetas de las cifras son las mismas", () => {
      expect(de(producto, "thead th", SOLO_DEL_PRODUCTO)).toEqual(
        de(maqueta, "thead th", SOLO_DE_LA_MAQUETA),
      );
      expect(
        de(producto, ".hg-resumen li > span:not(.hg-cifra)", new Set()),
      ).toEqual(
        de(maqueta, ".hg-resumen li > span:not(.hg-cifra)", SOLO_DE_LA_MAQUETA),
      );
    });

    it("los rótulos del paquete y del alcance son los mismos (salvo las huellas completas)", () => {
      expect(de(producto, "dt, .hg-rotulo", SOLO_DEL_PRODUCTO)).toEqual(
        de(maqueta, "dt, .hg-rotulo", SOLO_DE_LA_MAQUETA),
      );
    });

    it("los motivos de exclusión y los chips son un subconjunto de los de la maqueta", () => {
      const chips = (doc: Document) =>
        de(doc, ".hg-chip > span, .hg-sello-titulo", SOLO_DE_LA_MAQUETA);
      const delaMaqueta = new Set(chips(maqueta));
      for (const c of chips(producto)) expect(delaMaqueta, c).toContain(c);
    });
  },
);
