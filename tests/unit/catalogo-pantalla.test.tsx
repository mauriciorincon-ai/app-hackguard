// @vitest-environment node
// La pantalla `/catalogo` tal como la ve quien la abre en producción, en cada fecha en que algo cambia de estado (regla 23).
// Lo que se garantiza: (1) muestra exactamente las pruebas y las cuentas de la instantánea oficial; (2) cada estado lleva
// símbolo + texto + color y sus dos idiomas, y nada queda sin etiqueta; (3) cuando algo envejece, la pantalla lo dice con
// el estado y los días, no lo calla.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { CatalogoPantalla } from "../../src/components/catalogo/catalogo-pantalla";
import { construirVista } from "../../src/lib/catalogo/vista.ts";

const RAIZ = join(__dirname, "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const NOMBRE = archivo.replace(/\.json$/, "");
const MAS_ANTIGUA = [
  ...snap.catalogo.pruebas,
  ...snap.catalogo.marcos,
  ...snap.catalogo.herramientas,
]
  .map((x) => x.fecha_verificacion)
  .sort()[0]!;
const { por_revisar, vencido } = snap.catalogo.umbrales.vigencia;

const pantalla = (fecha: string) =>
  renderToStaticMarkup(
    <CatalogoPantalla vista={construirVista(snap, NOMBRE, fecha)} />,
  );
const cuantas = (html: string, patron: RegExp) =>
  (html.match(patron) ?? []).length;

describe("la pantalla muestra lo que la instantánea oficial dice", () => {
  const html = pantalla(snap.fecha_evaluacion);

  it("una fila por prueba, con el identificador de cada una y el enlace a SU ficha", () => {
    const ids = [...html.matchAll(/data-prueba="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(snap.catalogo.pruebas.map((p) => p.id).sort());
    for (const id of ids) expect(html).toContain(`href="/catalogo/${id}"`);
  });

  it("dice qué instantánea lee, su huella abreviada y la fecha de consulta", () => {
    expect(html).toContain(NOMBRE);
    expect(html).toContain(
      `${snap.huella.slice(0, 8)}…${snap.huella.slice(-4)}`,
    );
    expect(html).toContain(snap.fecha_evaluacion);
  });

  it("cuenta lo mismo que el semáforo publicado: todo vigente a la fecha de la instantánea", () => {
    const vigentes = snap.semaforo.pruebas.filter(
      (v) => v.estado === "vigente",
    ).length;
    expect(cuantas(html, /data-estado-fechado="vigente"/g)).toBe(vigentes);
    expect(
      cuantas(
        html,
        /class="hg-chip es-atencion"[^>]*><svg[^>]*>.*?<\/svg><span><span lang="es">Por revisar/g,
      ),
    ).toBe(0);
  });
});

describe("cuando algo envejece, la pantalla lo dice y no lo calla", () => {
  it("en el día del primer umbral, las pruebas «por revisar» salen con chip, su símbolo y su nombre en los dos idiomas", () => {
    const html = pantalla(fechaMasDias(MAS_ANTIGUA, por_revisar));
    expect(html).toContain('data-estado-fechado="por_revisar"');
    expect(html).toMatch(
      /hg-chip es-atencion"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span><span lang="es">Por revisar<\/span><span lang="en">Review due<\/span>/,
    );
    expect(html).toContain(`hace ${por_revisar} días`);
  });

  it("en el día del segundo umbral, las «vencidas» salen con chip rojo, su aspa y los días que llevan", () => {
    const html = pantalla(fechaMasDias(MAS_ANTIGUA, vencido));
    expect(html).toContain('data-estado-fechado="vencido"');
    expect(html).toMatch(
      /hg-chip es-falla"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span><span lang="es">Vencido<\/span><span lang="en">Overdue<\/span>/,
    );
    expect(html).toContain(`hace ${vencido} días`);
  });

  it("a +100 días todo está vencido, ninguna fila queda sin estado y las cuentas siguen sumando", () => {
    const fecha = fechaMasDias(MAS_ANTIGUA, 100);
    const html = pantalla(fecha);
    expect(cuantas(html, /data-estado-fechado="vencido"/g)).toBe(38);
    expect(cuantas(html, /data-prueba=/g)).toBe(38);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it.each([
    snap.fecha_evaluacion,
    fechaMasDias(MAS_ANTIGUA, por_revisar),
    fechaMasDias(MAS_ANTIGUA, vencido),
    fechaMasDias(MAS_ANTIGUA, 100),
  ])(
    "el %s: todo estado lleva símbolo, texto y color (regla dura 12) y los dos idiomas",
    (fecha) => {
      const html = pantalla(fecha);
      const estados = [
        ...html.matchAll(
          /<span class="hg-(?:estado|chip) es-(\w+)">(.*?)<\/span><\/span>/g,
        ),
      ];
      expect(estados.length).toBeGreaterThan(0);
      for (const [, rol, dentro] of estados) {
        expect(["positivo", "atencion", "falla", "neutro", "acento"]).toContain(
          rol,
        );
        expect(dentro).toMatch(/^<svg[^>]*aria-hidden="true"/); // símbolo
        expect(dentro).toMatch(
          /<span lang="es">[^<]+<\/span><span lang="en">[^<]+$/,
        ); // texto en los dos idiomas
      }
    },
  );
});

describe("lo que la maqueta no dibuja pero el producto puede mostrar (AU-14)", () => {
  it("pruebas que esperan revisión salen en su panel, con el motivo y su marca", () => {
    const copia = structuredClone(snap);
    copia.pendientes_de_revision = [
      { id: "PR-X-001", motivo: "marcada_para_revision" },
    ];
    const html = renderToStaticMarkup(
      <CatalogoPantalla vista={construirVista(copia, NOMBRE, snap.fecha_evaluacion)} />,
    );
    expect(html).toContain("Pruebas que esperan revisión");
    expect(html).toContain("Tests awaiting review");
    expect(html).toContain("PR-X-001");
    expect(html).toContain("Marcada para revisión");
  });

  it("sin pendientes no hay panel", () => {
    expect(pantalla(snap.fecha_evaluacion)).not.toContain("Pruebas que esperan revisión");
  });

  it("una familia sin pruebas publicadas sale «Sin pruebas publicadas», con su marca, y sin días", () => {
    const copia = structuredClone(snap);
    const familia = copia.catalogo.familias[0]!.id;
    copia.catalogo.pruebas = copia.catalogo.pruebas.filter(
      (p) => p.familia !== familia,
    );
    const html = renderToStaticMarkup(
      <CatalogoPantalla vista={construirVista(copia, NOMBRE, snap.fecha_evaluacion)} />,
    );
    expect(html).toMatch(
      new RegExp(
        `data-familia-vigencia="${familia}" data-pruebas="0".*?Sin pruebas publicadas.*?No published tests`,
      ),
    );
  });
});

describe("los estados de pantalla", () => {
  it("un catálogo sin pruebas dice que está vacío, con qué hacer", () => {
    const vista = construirVista(snap, NOMBRE, snap.fecha_evaluacion);
    const html = renderToStaticMarkup(
      <CatalogoPantalla vista={{ ...vista, total: 0, filas: [] }} />,
    );
    expect(html).toContain("El catálogo está vacío");
    expect(html).toContain("The catalog is empty");
    expect(html).not.toContain("<table");
  });

  it("«sin resultados» está en la página, oculto, y sale cuando los filtros no dejan nada", () => {
    const html = pantalla(snap.fecha_evaluacion);
    expect(html).toMatch(
      /<div class="hg-aviso es-neutro" hidden="">.*Ninguna prueba cumple esos filtros/,
    );
  });
});
