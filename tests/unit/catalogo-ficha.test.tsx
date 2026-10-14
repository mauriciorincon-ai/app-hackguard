// Las 38 fichas de `/catalogo/<id>`. Lo que se garantiza: cada una abre SU prueba con su vigencia (la misma que su fila de la
// lista), tiene las secciones de la ficha de la maqueta aprobada en los dos idiomas, y los avisos de vigencia y de contenido
// salen cuando toca y se callan cuando no (regla 23: en cada fecha en que algo cambia de estado).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { Ficha } from "../../src/components/catalogo/ficha";
import {
  construirFicha,
  construirVista,
  idsDePruebas,
} from "../../src/lib/catalogo/vista.ts";
import { RAIZ_MAQUETA, documentoDe, leerPagina } from "./lib/maqueta";

const RAIZ = process.cwd();
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const NOMBRE = archivo.replace(/\.json$/, "");
const HOY = snap.fecha_evaluacion;
const MAS_ANTIGUA = [
  ...snap.catalogo.pruebas,
  ...snap.catalogo.marcos,
  ...snap.catalogo.herramientas,
]
  .map((x) => x.fecha_verificacion)
  .sort()[0]!;
const { por_revisar, vencido } = snap.catalogo.umbrales.vigencia;
const ids = idsDePruebas(snap);

const ficha = (id: string, fecha: string) =>
  renderToStaticMarkup(<Ficha f={construirFicha(snap, id, fecha)} />);

describe("las 38 fichas", () => {
  it.each(ids)(
    "%s: abre su prueba, con las siete secciones y su vigencia igual a la de su fila",
    (id) => {
      const html = ficha(id, HOY);
      const fila = construirVista(snap, NOMBRE, HOY).filas.find(
        (f) => f.id === id,
      )!;
      expect(html).toContain(`data-ficha-de="${id}"`);
      expect(html).toContain(`data-ficha-vigencia="${fila.vigencia.estado}"`);
      for (const h of [
        "Resultado esperado",
        "Cómo se decide el veredicto",
        "Configuración de la corrida",
        "Cuándo aplica",
        "Resumen",
        "Marco y controles",
        "Fuentes",
      ]) {
        expect(html, h).toContain(`<span lang="es">${h}</span>`);
      }
      for (const h of [
        "Expected result",
        "How the verdict is decided",
        "Run configuration",
        "When it applies",
        "Summary",
        "Framework and controls",
        "Sources",
      ]) {
        expect(html, h).toContain(`<span lang="en">${h}</span>`);
      }
      expect(html).not.toMatch(/NaN|undefined|\[object/);
    },
  );

  it("a la fecha de la instantánea ninguna ficha lleva aviso de vigencia", () => {
    for (const id of ids)
      expect(ficha(id, HOY)).not.toContain("data-aviso-de-vigencia");
  });

  it("en cada fecha en que algo cambia de estado, las 38 fichas dicen la vigencia de su fila y el aviso que toca", () => {
    for (const dias of [
      por_revisar - 1,
      por_revisar,
      vencido - 1,
      vencido,
      100,
    ]) {
      const fecha = fechaMasDias(MAS_ANTIGUA, dias);
      const filas = new Map(
        construirVista(snap, NOMBRE, fecha).filas.map((f) => [
          f.id,
          f.vigencia.estado,
        ]),
      );
      for (const id of ids) {
        const html = ficha(id, fecha);
        const estado = filas.get(id)!;
        expect(html, `${id} ${fecha}`).toContain(
          `data-ficha-vigencia="${estado}"`,
        );
        expect(
          html.includes(`data-aviso-de-vigencia="${estado}"`),
          `${id} ${fecha}`,
        ).toBe(estado !== "vigente");
        expect(html).not.toMatch(/NaN|undefined|\[object/);
      }
    }
  });

  it("el día del primer umbral toda ficha dice «Toca revisarla» y el umbral, no los días", () => {
    const html = ficha(ids[0]!, fechaMasDias(MAS_ANTIGUA, por_revisar));
    expect(html).toContain('data-aviso-de-vigencia="por_revisar"');
    expect(html).toContain("Toca revisarla");
    expect(html).toContain(`Pasaron ${por_revisar} días o más`);
    expect(html).toContain("Review is due");
    expect(html).not.toContain('data-aviso-de-vigencia="vencido"');
  });

  it("el día del segundo umbral dice «Verificación vencida», con su aspa y qué hacer", () => {
    const html = ficha(ids[0]!, fechaMasDias(MAS_ANTIGUA, vencido));
    expect(html).toContain('data-aviso-de-vigencia="vencido"');
    expect(html).toMatch(/hg-sello es-falla"[^>]*><svg[^>]*aria-hidden="true"/);
    expect(html).toContain("Verificación vencida");
    expect(html).toContain("Verification overdue");
    expect(html).toContain("pide al investigador que la revise");
  });

  it("una prueba sin control lo dice con su chip y su explicación; una con control nombra el control", () => {
    const sin = ids.find(
      (id) => construirFicha(snap, id, HOY).controles.length === 0,
    )!;
    const con = ids.find(
      (id) => construirFicha(snap, id, HOY).controles.length > 0,
    )!;
    expect(ficha(sin, HOY)).toContain("Sin control asignado");
    expect(ficha(sin, HOY)).toContain(
      "Todavía no da evidencia a ningún control",
    );
    const f = construirFicha(snap, con, HOY);
    expect(ficha(con, HOY)).toContain(f.controles[0]!.id);
    expect(ficha(con, HOY)).not.toContain("Sin control asignado");
  });

  it("una ficha marcada por el filtro lo dice, y dice que el filtro marca y no rechaza", () => {
    const copia = structuredClone(snap);
    copia.catalogo.pruebas[0]!.revision_contenido = "marcada_para_revision";
    const html = renderToStaticMarkup(
      <Ficha f={construirFicha(copia, copia.catalogo.pruebas[0]!.id, HOY)} />,
    );
    expect(html).toContain("data-aviso-de-contenido");
    expect(html).toContain("El filtro marca, no rechaza");
    expect(html).toContain("Marcada para revisión");
  });

  it("la repetición y la cota se leen sin fórmulas: «k = 20» y «con 95 % de confianza … no supera el 15 %»", () => {
    const conCota = ids
      .map((id) => construirFicha(snap, id, HOY))
      .find((f) => f.repeticiones.cotaPorCiento !== null)!;
    const html = renderToStaticMarkup(<Ficha f={conCota} />);
    expect(html).toContain(`k = ${conCota.repeticiones.k}`);
    expect(html).toContain(
      `con 95 % de confianza la tasa real de fallo no supera el ${conCota.repeticiones.cotaPorCiento} %`,
    );
  });
});

describe("fidelidad de la ficha contra una ficha de la maqueta", () => {
  const maqueta = documentoDe(
    leerPagina(RAIZ_MAQUETA, "prueba-pr-ia-pinj-001.html"),
  );
  const producto = documentoDe(
    `<body><main class="hg-principal">${ficha("PR-IA-PINJ-001", HOY)}</main></body>`,
  );
  const par = (el: Element) =>
    `${el.querySelector('[lang="es"]')?.textContent?.trim() ?? ""}|${el.querySelector('[lang="en"]')?.textContent?.trim() ?? ""}`;
  // Los estados de pantalla de la maqueta (vacío, cargando, error) son del recorrido de la sala: un export estático no los tiene.
  const DE_LA_SALA = new Set([
    "Esta prueba ya no está en el catálogo|This test is no longer in the catalog",
    "Abriendo la ficha|Opening the record",
    "No se pudo abrir la ficha|The record could not be opened",
  ]);
  const rotulos = (doc: Document) =>
    [...new Set([...doc.querySelectorAll(".hg-principal h2")].map(par))]
      .filter((p) => !DE_LA_SALA.has(p))
      .sort();

  it("los rótulos de sección (h2) de la ficha son los mismos, en los dos idiomas", () => {
    expect(rotulos(producto)).toEqual(rotulos(maqueta));
    expect(rotulos(producto)).toHaveLength(7);
  });

  it("las propiedades de cada panel tienen los mismos rótulos (dt)", () => {
    const dt = (doc: Document) =>
      [
        ...new Set([...doc.querySelectorAll(".hg-principal dt")].map(par)),
      ].sort();
    // La ficha de la maqueta muestra «Detectores» y «Versión mínima» según su herramienta; la de producto, según la suya.
    const sinVariables = (xs: string[]) =>
      xs.filter((x) => !/Detectores|Versión mínima|Cita|Control/.test(x));
    expect(sinVariables(dt(producto))).toEqual(sinVariables(dt(maqueta)));
  });
});
