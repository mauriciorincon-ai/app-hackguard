// Gate de FIDELIDAD de `/evidencia/carga` contra `docs/diseno/evidencia.html` (design-system § 9 y § 11): los rótulos de sección,
// los de las propiedades y de la tabla, las pestañas de vía, el selector de lote, el resumen, el recorrido, «Para confirmar», las
// notas de cada sobre y las filas del plan de muestreo son, en español y en inglés, los de la maqueta. Lo que el producto hace
// distinto (los botones de decisión y los formularios de la maqueta son comandos del CLI; el plan de muestreo trae sus tamaños
// calculados) se declara abajo con su razón. Sin `out/`.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CargaPantalla } from "../../src/components/carga/carga-pantalla";
import { conjunto, dentroDe, documentoDelProducto } from "./lib/fidelidad";
import { vistaDeCarga } from "./lib/mundo-de-carga";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const SOLO_DE_LA_MAQUETA = new Set([
  // Los estados de pantalla de la sala de la maqueta: un export estático no carga nada, y un lote que no cuadra con su libro
  // rompe el build en vez de mostrarse. «Vacío» solo se dibuja sin lotes (otra prueba lo comprueba).
  "No hay nada por confirmar|Nothing to confirm",
  "Leyendo el archivo en tu equipo|Reading the file on your machine",
  "El archivo no se pudo cargar|The file could not be loaded",
  "Versión de la herramienta fuera del rango probado|Tool version outside the tested range",
  // La matriz «qué revisar» y el pie de la sala: en el producto viven en la barra lateral.
  "Qué revisar y qué deberías ver|What to check and what you should see",
  "Fecha de consulta|Query date",
  "Instantánea del catálogo|Catalog snapshot",
  // Los formularios de «Texto pegado» y de «Sobre manual» son de la maqueta: el producto es de solo lectura y esas vías se
  // dicen con su estado y con los comandos del CLI.
  "Proponer|Propose",
  "Qué pasa con el texto|What happens to the text",
  "Guardar|Save",
  "El sobre mínimo|The minimum envelope",
  // Los campos de esos formularios.
  "Pega aquí lo que te devolvió la herramienta|Paste here what the tool returned",
  "Prueba del plan|Test in the plan",
  "Veredicto|Verdict",
  "Fecha de ejecución|Run date",
  "Herramienta y versión|Tool and version",
  "Qué se obtuvo, en una o dos frases|What was obtained, in one or two sentences",
  "Diferencia con lo esperado|Difference from the expected result",
  // Los dos estados del lote que la maqueta dibuja ocultos a la vez; el producto dibuja solo el que tiene el lote.
  "Confirmado por ti|Confirmed by you",
]);
// Lo que el producto dibuja y la maqueta no.
const SOLO_DEL_PRODUCTO = new Set([
  // La tercera huella del lote (el registro, con la confirmación) y cómo cuenta cada sobre hoy: la maqueta enseñaba dos huellas.
  "Huella del registro|Record fingerprint",
  "Confirmación|Confirmation",
  // «Confirmado» a secas: la persona que firma y la fecha vienen del lote, no de «ti».
  "Confirmado|Confirmed",
  // Las dos vías que el producto no construye dicen su estado.
  "Esta vía no existe en esta versión|This route does not exist in this version",
  "Registrar el resultado|Record the result",
  "Confirmarlo, uno por uno|Confirm it, one by one",
]);

describe("fidelidad de la carga contra su página de la maqueta", () => {
  const maqueta = documentoDe(leerPagina(RAIZ_MAQUETA, "evidencia.html"));
  const v = vistaDeCarga();
  const producto = documentoDelProducto(
    renderToStaticMarkup(<CargaPantalla v={v} />),
  );
  const de = (
    doc: Document,
    selector: string,
    ignorar: ReadonlySet<string> = new Set(),
  ) => conjunto(doc, dentroDe(selector), ignorar);
  const textos = (doc: Document, selector: string) =>
    [...doc.querySelectorAll(dentroDe(selector))].map((e) =>
      e.textContent?.replace(/\s+/g, " ").trim(),
    );

  it("la maqueta y el producto se pudieron leer: ningún conjunto está vacío", () => {
    expect(de(maqueta, "h1, h2").length).toBeGreaterThan(5);
    expect(de(producto, "h1, h2").length).toBeGreaterThan(5);
    expect(textos(producto, "[data-lote]").length).toBe(2);
  });

  it("los rótulos de sección (h1 y h2) son los mismos, en los dos idiomas", () => {
    expect(de(producto, "h1, h2", SOLO_DEL_PRODUCTO)).toEqual(
      de(maqueta, "h1, h2", SOLO_DE_LA_MAQUETA),
    );
    expect(de(producto, "h2")).toEqual(
      expect.arrayContaining([
        "Ficha del lote|Batch record",
        "Para confirmar|To confirm",
        "Sobre seleccionado|Selected envelope",
        "Cómo se elige la muestra|How the sample is chosen",
        "Texto de la herramienta|Tool output",
        "Sobre manual|Manual envelope",
      ]),
    );
  });

  it("los rótulos de las propiedades y de las columnas son los mismos", () => {
    expect(de(producto, "dt", SOLO_DEL_PRODUCTO)).toEqual(
      de(maqueta, "dt", SOLO_DE_LA_MAQUETA),
    );
    expect(de(producto, "thead th")).toEqual(de(maqueta, "thead th"));
  });

  it("la bajada, el activo y el resumen dicen lo mismo", () => {
    expect(de(producto, ".hg-bajada")).toEqual(de(maqueta, ".hg-bajada"));
    expect(textos(producto, ".hg-resumen li")).toEqual(
      textos(maqueta, ".hg-resumen li"),
    );
    // Las cuatro cifras salen de los sobres: dos lotes, seis sobres, dos fallidas, una no ejecutada.
    expect(textos(producto, ".hg-resumen .hg-cifra")).toEqual([
      "2",
      "6",
      "2",
      "1",
    ]);
    expect(textos(producto, ".hg-resumen .hg-cifra")).toEqual(
      textos(maqueta, ".hg-resumen .hg-cifra"),
    );
  });

  it("las pestañas de vía y el selector de lote son los mismos, y abre en la primera de cada uno", () => {
    expect(textos(producto, ".hg-pestanas .hg-pestana")).toEqual(
      textos(maqueta, ".hg-pestanas .hg-pestana"),
    );
    expect(textos(producto, ".hg-selector .hg-opcion")).toEqual(
      textos(maqueta, ".hg-selector .hg-opcion"),
    );
    const abre = (doc: Document, selector: string) =>
      [...doc.querySelectorAll(dentroDe(selector))].map((b) =>
        b.getAttribute("aria-pressed"),
      );
    expect(abre(producto, ".hg-pestanas .hg-pestana")).toEqual(
      abre(maqueta, ".hg-pestanas .hg-pestana"),
    );
    expect(abre(producto, ".hg-selector .hg-opcion")).toEqual(
      abre(maqueta, ".hg-selector .hg-opcion"),
    );
  });

  it("cada lote dice lo mismo: su cabecera, su recorrido, qué falta para confirmar y sus sobres", () => {
    const lotes = (doc: Document) => [
      ...doc.querySelectorAll(dentroDe("[data-lote]")),
    ];
    const delLote = (el: Element, selector: string) =>
      [...el.querySelectorAll(selector)].map((e) =>
        e.textContent?.replace(/\s+/g, " ").trim(),
      );
    const ms = lotes(maqueta);
    const ps = lotes(producto);
    expect(ps.map((l) => l.getAttribute("data-lote"))).toEqual(
      ms.map((l) => l.getAttribute("data-lote")),
    );
    ps.forEach((p, i) => {
      const m = ms[i]!;
      const id = p.getAttribute("data-lote");
      // La cabecera: el identificador, la herramienta con su versión, el reparto por veredicto (la maqueta dibuja las tres
      // decisiones posibles ocultas; el producto, la que tiene el lote: «Sin confirmar»).
      expect(delLote(p, ".hg-panel-linea h2"), id ?? "").toEqual(
        delLote(m, ".hg-panel-linea h2"),
      );
      expect(delLote(p, ".hg-panel-cab .hg-chips li"), id ?? "").toEqual(
        delLote(m, ".hg-panel-cab .hg-chips li"),
      );
      expect(
        delLote(p, ".hg-panel-linea [data-estado-del-lote] .hg-chip"),
        id ?? "",
      ).toEqual(["Sin confirmarNot confirmed"]);
      expect(
        delLote(m, '.hg-panel-linea [data-si-decision=""] .hg-chip'),
        id ?? "",
      ).toEqual(["Sin confirmarNot confirmed"]);
      // El recorrido: los dos primeros pasos son los de la maqueta; el tercero cambia con la decisión del lote.
      expect(delLote(p, ".hg-eslabon-titulo").slice(0, 2), id ?? "").toEqual(
        delLote(m, ".hg-eslabon-titulo").slice(0, 2),
      );
      // Qué falta para confirmar.
      expect(delLote(p, ".hg-pendientes li"), id ?? "").toEqual(
        delLote(m, ".hg-pendientes li"),
      );
      // Los sobres: el identificador, el veredicto sugerido y la revisión de cada fila.
      const filas = (el: Element) =>
        [...el.querySelectorAll("tbody tr")].map((tr) => [
          tr.getAttribute("data-sobre"),
          tr.querySelector('[data-celda="estado"]')?.textContent?.trim(),
          tr.getAttribute("data-revision") === "obligatoria"
            ? "siempre"
            : tr.getAttribute("data-revision"),
          tr.querySelector("td:last-child")?.textContent?.trim(),
        ]);
      expect(filas(p), id ?? "").toEqual(filas(m));
      // Cada sobre dice qué pasa con su hallazgo con las mismas palabras.
      const notas = (el: Element) =>
        [...el.querySelectorAll("[data-si-seleccion]")].map((d) => [
          d.getAttribute("data-si-seleccion"),
          d
            .querySelector(".hg-tarjeta-nombre ~ .hg-menor")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        ]);
      expect(notas(p), id ?? "").toEqual(notas(m));
      // La ficha: el archivo, el adaptador y cuándo. «Ejecutado por» es el nombre de una persona, que viene del archivo del lote
      // y no se traduce: la maqueta lo dibujaba como texto bilingüe.
      const ficha = (el: Element) =>
        [...el.querySelectorAll(".hg-propiedades-en-tres > div")]
          .filter(
            (d) =>
              !/Huella|Ejecutado por/.test(
                d.querySelector("dt")?.textContent ?? "",
              ),
          )
          .map((d) => d.textContent?.replace(/\s+/g, " ").trim());
      expect(ficha(p), id ?? "").toEqual(ficha(m));
      expect(
        [...p.querySelectorAll(".hg-propiedades-en-tres > div")]
          .filter((d) => /Ejecutado por/.test(d.textContent ?? ""))
          .map((d) => d.querySelector("dd")?.textContent),
        id ?? "",
      ).toEqual(["Operador demo"]);
    });
  });

  it("donde la maqueta dibuja botones de decisión el producto dibuja los mismos nombres con su comando, y no hay botón que decida", () => {
    const nombres = (doc: Document, selector: string) => de(doc, selector);
    expect(nombres(producto, ".hg-tarjeta-accion .hg-junto > strong")).toEqual(
      nombres(maqueta, ".hg-acciones .hg-boton"),
    );
    for (const l of producto.querySelectorAll("[data-lote]")) {
      const comandos = [...l.querySelectorAll(".hg-junto .hg-vector")].map(
        (c) => c.textContent,
      );
      expect(comandos).toHaveLength(2);
      expect(
        comandos.every((c) => c?.startsWith("pnpm evidencia:confirmar-lote ")),
      ).toBe(true);
    }
    // Los únicos botones son los que cambian lo que se ve: pestañas, selector y fila.
    const botones = [...producto.querySelectorAll("button")];
    expect(botones.length).toBeGreaterThan(0);
    expect(botones.every((b) => b.hasAttribute("aria-pressed"))).toBe(true);
    expect(producto.querySelector("form, input, textarea, select")).toBeNull();
  });

  it("el plan de muestreo tiene las mismas filas que la maqueta, salvo el tramo que el cálculo exacto corrigió", () => {
    const filas = (doc: Document) =>
      [
        ...doc.querySelectorAll(
          dentroDe('[aria-labelledby="muestra"] dl > div'),
        ),
      ].map((d) => d.textContent?.replace(/\s+/g, " ").trim() ?? "");
    const m = filas(maqueta);
    const p = filas(producto);
    expect(p).toHaveLength(m.length);
    const corregida = (f: string) => f.startsWith("Lote de 51 a 90");
    expect(p.filter((f) => !corregida(f))).toEqual(
      m.filter((f) => !corregida(f)),
    );
    // «Lote de 51 a 90»: la maqueta ilustraba 24; el cálculo con aritmética exacta (riesgo del consumidor 5 %) pide 25.
    expect(m.find(corregida)).toContain("Se revisan 24");
    expect(p.find(corregida)).toContain("Se revisan 25");
  });

  it("las advertencias del lote se dicen en un sello con marca (nunca el color solo)", () => {
    for (const l of producto.querySelectorAll("[data-lote]")) {
      const sellos = [...l.querySelectorAll(".hg-sello-menor")];
      expect(sellos.length).toBeGreaterThan(0);
      for (const s of sellos) expect(s.querySelector("svg")).not.toBeNull();
    }
  });
});
