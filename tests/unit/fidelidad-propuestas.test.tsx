// Gate de FIDELIDAD de `/catalogo/propuestas` contra `docs/diseno/propuestas.html` (design-system § 9 y § 11): los rótulos de sección,
// las cifras de arriba, los filtros, las filas del sobre, los botones de decisión, lo que cada decisión provoca y el carril de la última
// corrida son, en español y en inglés, los de la maqueta. Lo que el producto hace distinto se declara abajo, con su razón, y está en la
// tabla «Sprint 8» de docs/diseno/README.md. Las CIFRAS y los TÍTULOS no se comparan: la maqueta usa propuestas ilustrativas y el
// producto las corridas selladas del repositorio. Sin `out/`: `pnpm test` corre antes que `pnpm build` en la CI.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PropuestasPantalla } from "../../src/components/propuestas/propuestas-pantalla";
import { armarMundoDePropuestas } from "../../src/lib/propuestas/pagina";
import { construirVistaDePropuestas } from "../../src/lib/propuestas/vista";
import { conjunto, dentroDe, documentoDelProducto, par } from "./lib/fidelidad";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";
import { propuestasDelRepo } from "./lib/mundo-de-brecha";

const maq = documentoDe(leerPagina(RAIZ_MAQUETA, "propuestas.html"));
const vista = construirVistaDePropuestas(propuestasDelRepo);
const prod = documentoDelProducto(
  renderToStaticMarkup(<PropuestasPantalla v={vista} />),
);

const de = (doc: Document, selector: string, ignorar = new Set<string>()) =>
  conjunto(doc, dentroDe(selector), ignorar);
const rotulosDeCifras = (doc: Document) =>
  [...doc.querySelectorAll(dentroDe(".hg-resumen li"))].map((li) =>
    [...li.children]
      .filter((c) => !c.classList.contains("hg-cifra"))
      .map((c) => c.textContent?.replace(/\s+/g, " ").trim())
      .join(""),
  );

// Los estados de pantalla de la sala de la maqueta: un export estático no carga nada («Verificando las fuentes»), y lo demás se prueba
// aparte (el vacío y el error, abajo). Y la matriz «qué revisar» de la sala.
const DE_LA_SALA = new Set([
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Verificando las fuentes|Verifying sources",
]);

describe("fidelidad de la bandeja contra propuestas.html", () => {
  it("el título y la bajada son los de la maqueta", () => {
    expect(de(prod, "h1")).toEqual(de(maq, "h1"));
    expect(de(prod, ".hg-bajada")).toEqual(de(maq, ".hg-bajada"));
  });
  it("las tres cifras de arriba dicen lo mismo, sin sus números", () => {
    expect(rotulosDeCifras(prod)).toEqual(rotulosDeCifras(maq));
    expect(
      [...prod.querySelectorAll("[data-cifra]")].map((li) =>
        li.getAttribute("data-cifra"),
      ),
    ).toEqual(["por_decidir", "sin_verificar", "marcadas"]);
  });
  it("los filtros de «quién propone» son los mismos y abren en «Todas»", () => {
    expect(de(prod, '[data-controlador="filtro"]')).toEqual(
      de(maq, '[data-controlador="filtro"]'),
    );
    const abiertos = (doc: Document) =>
      [...doc.querySelectorAll('[data-controlador="filtro"]')]
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map(par);
    expect(abiertos(prod)).toEqual(abiertos(maq));
  });
  it("los botones de decisión son los mismos, con el mismo nombre", () => {
    expect(de(prod, '[data-controlador="decidir"]')).toEqual(
      de(maq, '[data-controlador="decidir"]'),
    );
  });
  it("lo que cada decisión provoca se dice con las palabras de la maqueta (rechazar, separar, sobre aprobado y sin decidir)", () => {
    const deMaqueta = de(maq, ".hg-consecuencia, [data-si-decision]");
    const delProducto = new Set(
      de(prod, ".hg-consecuencia, [data-si-decision]"),
    );
    // La maqueta dice «Separada. Vuelve a la bandeja como 2 propuestas…»: el producto dice el número de pruebas de cada texto.
    for (const f of deMaqueta.filter(
      (x) =>
        !x.startsWith("Aprobada. Entra al catálogo") &&
        !x.includes("tu revisión"),
    ))
      expect(delProducto.has(f), f).toBe(true);
  });
  it("las filas del sobre propuesto por el extractor son las de la maqueta, en el mismo orden", () => {
    const filas = (doc: Document) => {
      const vistos = new Set<string>();
      const salida: string[] = [];
      for (const e of doc.querySelectorAll(
        dentroDe(".hg-propiedades-en-columnas dt"),
      )) {
        const p = par(e);
        if (vistos.has(p)) continue;
        vistos.add(p);
        salida.push(p);
      }
      return salida;
    };
    expect(filas(prod)).toEqual(filas(maq));
  });
  it("el carril trae el título de la maqueta y todas sus filas, más las que el producto agrega", () => {
    const filas = (doc: Document) => de(doc, ".hg-carril dt");
    const delProducto = new Set(filas(prod));
    for (const f of filas(maq)) expect(delProducto.has(f), f).toBe(true);
    expect(de(prod, ".hg-carril .hg-tarjeta-titulo")).toEqual(
      expect.arrayContaining(de(maq, ".hg-carril .hg-tarjeta-titulo")),
    );
  });
  it("el aviso de una propuesta marcada y el de una fuente sin verificar dicen lo mismo que en la maqueta", () => {
    const sellos = new Set(de(prod, ".hg-sello-titulo"));
    for (const f of de(maq, ".hg-sello-titulo").filter((x) =>
      x.startsWith("Marcada por el filtro"),
    ))
      expect(sellos.has(f), f).toBe(true);
    const estados = new Set(de(prod, ".hg-estado, .hg-chip"));
    for (const f of [
      "Fuente verificada|Source verified",
      "Fuente sin verificar|Source not verified",
    ])
      expect(estados.has(f), f).toBe(true);
  });
  it("cada propuesta lleva su línea (identificador, quién propone, tipo y fecha) y su título", () => {
    const articulos = [...prod.querySelectorAll("[data-propuesta]")];
    expect(articulos).toHaveLength(vista.filas.length);
    for (const a of articulos) {
      expect(
        a.querySelector(".hg-propuesta-linea"),
        a.getAttribute("data-propuesta")!,
      ).not.toBeNull();
      expect(a.querySelector("h2.hg-tarjeta-nombre")).not.toBeNull();
      expect(a.querySelector(".hg-decision")).not.toBeNull();
    }
  });
  it("el orden de las secciones es el de la maqueta: cabecera, filtros, propuestas y carril", () => {
    const orden = (doc: Document) =>
      [
        "h1",
        ".hg-resumen",
        ".hg-herramientas-linea",
        ".hg-propuestas",
        ".hg-carril",
      ].map((s) => {
        const e = doc.querySelector(dentroDe(s));
        return e === null ? -1 : [...doc.querySelectorAll("*")].indexOf(e);
      });
    const o = orden(prod);
    expect(o.every((n) => n >= 0)).toBe(true);
    expect([...o].sort((a, b) => a - b)).toEqual(o);
    expect(orden(maq).every((n) => n >= 0)).toBe(true);
  });
});

describe("los estados de pantalla de la maqueta que el producto sí dibuja", () => {
  const raiz = propuestasDelRepo;
  const mundo = (
    corridas: typeof raiz.corridas,
    problemas: typeof raiz.problemasDeCarga,
  ) =>
    armarMundoDePropuestas({
      instantanea: raiz.instantanea,
      nombre: raiz.nombre,
      consulta: raiz.consulta,
      activos: raiz.activos,
      etiquetas: raiz.etiquetas,
      umbrales: raiz.umbrales,
      corridas,
      problemasDeCarga: problemas,
      decisiones: [],
    });
  const render = (
    corridas: typeof raiz.corridas,
    problemas: typeof raiz.problemasDeCarga,
  ) =>
    documentoDelProducto(
      renderToStaticMarkup(
        <PropuestasPantalla
          v={construirVistaDePropuestas(mundo(corridas, problemas))}
        />,
      ),
    );

  it("«La bandeja está vacía» y «Una propuesta no se pudo leer» llevan los títulos de la maqueta", () => {
    const titulosDeEstados = de(maq, ".hg-aviso h2").filter(
      (x) => !DE_LA_SALA.has(x),
    );
    const vacio = new Set(de(render([], []), ".hg-aviso h2"));
    const error = new Set(
      de(
        render(raiz.corridas, [
          {
            ruta: "propuestas/corridas/x/corrida.json",
            detalle: "su huella no es la de su contenido",
          },
        ]),
        ".hg-aviso h2",
      ),
    );
    expect(vacio.has("La bandeja está vacía|The inbox is empty")).toBe(true);
    expect(
      error.has("Una propuesta no se pudo leer|A proposal could not be read"),
    ).toBe(true);
    for (const t of [
      "La bandeja está vacía|The inbox is empty",
      "Una propuesta no se pudo leer|A proposal could not be read",
    ])
      expect(titulosDeEstados).toContain(t);
  });
  it("vacía no dibuja filtros ni cifras ni carril; con una corrida ilegible, las demás siguen en la bandeja", () => {
    const vacia = render([], []);
    expect(vacia.querySelector("[data-propuesta]")).toBeNull();
    expect(vacia.querySelector(".hg-resumen")).toBeNull();
    expect(vacia.querySelector(".hg-carril")).toBeNull();
    const con = render(raiz.corridas, [
      {
        ruta: "propuestas/corridas/x/corrida.json",
        detalle: "no cumple su esquema",
      },
    ]);
    expect(con.querySelectorAll("[data-propuesta]").length).toBe(
      vista.filas.length,
    );
    expect(con.querySelector("[data-ilegibles]")?.textContent).toContain(
      "propuestas/corridas/x/corrida.json",
    );
  });
});

describe("lo que el producto dice y la maqueta no (tabla «Sprint 8» de docs/diseno/README.md)", () => {
  it("la bandeja muestra lo que el código verificó de cada propuesta real: motivos de la pausa, citas sin verificar y las reglas del plan", () => {
    expect(prod.querySelectorAll("[data-motivos]").length).toBeGreaterThan(0);
    expect(prod.querySelector("[data-comando]")).toBeNull();
    expect(de(prod, ".hg-carril dt")).toEqual(
      expect.arrayContaining([
        "Reglas del plan|Plan rules",
        "Modelo|Model",
        "Huella|Fingerprint",
      ]),
    );
  });
  it("el carril trae también la última corrida del extractor", () => {
    expect(de(prod, ".hg-carril .hg-tarjeta-titulo")).toEqual(
      expect.arrayContaining([
        "Última corrida del extractor|The extractor's last run",
      ]),
    );
  });
});
