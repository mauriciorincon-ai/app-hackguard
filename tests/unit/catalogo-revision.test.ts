// @vitest-environment node
// La revisión de contenido de una prueba (S2-M3): «revisada y aprobada» —lo que escribe `decidir` cuando una persona aprueba una
// propuesta que el filtro había marcado— no se muestra como «limpia»: es otra cosa, y el filtro de la lista la ofrece.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { SIN_FILTROS, filtrar } from "../../src/lib/catalogo/filtros.ts";
import { construirVista } from "../../src/lib/catalogo/vista.ts";

const RAIZ = join(__dirname, "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;

/** La instantánea oficial con la prueba `i` marcada como la dejaría una persona al aprobarla tras revisarla. */
const conRevisada = (i: number): Instantanea => ({
  ...snap,
  catalogo: {
    ...snap.catalogo,
    pruebas: snap.catalogo.pruebas.map((p, j) =>
      j === i
        ? { ...p, revision_contenido: "revisada_y_aprobada" as const }
        : p,
    ),
  },
});

describe("la revisión de contenido en la lista", () => {
  const vista = construirVista(conRevisada(0), archivo, "2026-10-05");

  it("una prueba revisada y aprobada se ve como tal, no como limpia", () => {
    expect(vista.filas[0]!.revision).toBe("revisada_y_aprobada");
    expect(
      vista.filas.slice(1).every((f) => f.revision !== "revisada_y_aprobada"),
    ).toBe(true);
  });

  it("el filtro de revisión ofrece las tres, con su nombre en los dos idiomas", () => {
    const lista = vista.listas.find((l) => l.campo === "revision")!;
    expect(lista.opciones.map((o) => o.valor)).toEqual([
      "",
      "limpia",
      "marcada_para_revision",
      "revisada_y_aprobada",
    ]);
    const r = lista.opciones.find((o) => o.valor === "revisada_y_aprobada")!;
    expect(r.texto).toEqual({
      es: "Revisada y aprobada",
      en: "Reviewed and approved",
    });
  });

  it("filtrar por «revisada y aprobada» deja solo esa prueba, y «limpia» ya no la incluye", () => {
    const aprobadas = filtrar(vista.filas, {
      ...SIN_FILTROS,
      revision: "revisada_y_aprobada",
    });
    expect(aprobadas.map((f) => f.id)).toEqual([vista.filas[0]!.id]);
    const limpias = filtrar(vista.filas, {
      ...SIN_FILTROS,
      revision: "limpia",
    });
    expect(limpias.map((f) => f.id)).not.toContain(vista.filas[0]!.id);
  });
});
