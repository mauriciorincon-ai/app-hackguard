// La lista del catálogo tal como la usa quien la abre: 20 filas en la primera página, las demás ocultas pero presentes, los
// botones de página que mueven la ventana y todo filtro que devuelve a la página 1. Las filas se pintan como en producción
// (`Tabla`, en el servidor) y la lista las muestra u oculta.
import { fireEvent, render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { ListaFiltrable } from "../../src/components/catalogo/lista-filtrable";
import { Tabla } from "../../src/components/catalogo/tabla";
import { construirVista } from "../../src/lib/catalogo/vista.ts";

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

function lista() {
  return render(
    <ListaFiltrable
      familias={vista.familias}
      listas={vista.listas}
      indice={vista.filas.map((f) => ({
        id: f.id,
        familia: f.familia,
        marcoId: f.marcoId,
        herramientaId: f.herramientaId,
        controles: f.controles,
        madurez: f.madurez,
        revision: f.revision,
        vigencia: { estado: f.vigencia.estado },
      }))}
    >
      <Tabla filas={vista.filas} oculta={false} />
    </ListaFiltrable>,
  );
}

const visibles = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLElement>("tr[data-prueba]")].filter(
    (tr) => !tr.hidden,
  );
const boton = (nombre: RegExp) =>
  screen.getAllByRole("button", { name: nombre })[0]!;

describe("la lista paginada del catálogo", () => {
  it("el servidor ya dibuja ocultas las filas que no son de la página 1: 38 en el documento, 20 a la vista", () => {
    const { container } = lista();
    expect(container.querySelectorAll("tr[data-prueba]")).toHaveLength(38);
    expect(visibles(container)).toHaveLength(20);
    expect(
      [...container.querySelectorAll<HTMLElement>("tr[data-prueba]")]
        .slice(20)
        .every((tr) => tr.hidden),
    ).toBe(true);
  });

  it("«Siguiente» muestra las 18 restantes y «Anterior» vuelve a las 20, sin repetir filas", () => {
    const { container } = lista();
    const primera = visibles(container).map((tr) => tr.dataset.prueba);
    fireEvent.click(boton(/Siguiente/));
    const segunda = visibles(container).map((tr) => tr.dataset.prueba);
    expect(segunda).toHaveLength(18);
    expect(segunda.some((id) => primera.includes(id))).toBe(false);
    expect([...primera, ...segunda].sort()).toEqual(
      vista.filas.map((f) => f.id).sort(),
    );
    fireEvent.click(boton(/Anterior/));
    expect(visibles(container).map((tr) => tr.dataset.prueba)).toEqual(primera);
  });

  it("los botones se desactivan en los extremos y el rótulo dice la página y las filas, en los dos idiomas", () => {
    const { container } = lista();
    expect(boton(/Anterior/)).toBeDisabled();
    expect(boton(/Siguiente/)).toBeEnabled();
    const texto = () =>
      container.querySelector(".hg-paginacion p")!.textContent ?? "";
    expect(texto()).toContain("Página 1 de 2 · filas 1 a 20 de 38");
    expect(texto()).toContain("Page 1 of 2 · rows 1 to 20 of 38");
    fireEvent.click(boton(/Siguiente/));
    expect(boton(/Siguiente/)).toBeDisabled();
    expect(texto()).toContain("filas 21 a 38 de 38");
  });

  it("un filtro devuelve a la página 1, y con una sola página no hay controles de página", () => {
    const { container } = lista();
    fireEvent.click(boton(/Siguiente/));
    fireEvent.click(screen.getByRole("button", { name: /Modelo de decisión/ }));
    const quedan = visibles(container);
    expect(quedan.length).toBeGreaterThan(0);
    expect(quedan.length).toBeLessThan(20);
    expect(container.querySelector<HTMLElement>(".hg-paginacion")!.hidden).toBe(
      true,
    );
    fireEvent.click(boton(/Quitar filtros/));
    expect(visibles(container)).toHaveLength(20);
    expect(boton(/Anterior/)).toBeDisabled();
  });

  it("la cuenta de arriba es la de lo que cumple los filtros, no la de la página", () => {
    const { container } = lista();
    const cuentas = [
      ...container.querySelectorAll("[data-cuenta-filtrada]"),
    ].map((c) => c.textContent);
    expect(cuentas).toEqual(["38", "38"]);
  });
});
