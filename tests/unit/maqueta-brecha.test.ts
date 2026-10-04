// Gate de la BRECHA de la maqueta (mirada 5, C16): las cifras de arriba son las de la tabla de abajo, «no
// detectado» nunca cuenta como ejecutada, lo que espera confirmación no mueve ningún número (criterio de
// M5) y el tablero, la brecha y el informe dicen las mismas cifras. Lo que la tabla dice se re-deduce aquí
// de los DATOS (los sobres confirmados), no del módulo que calcula la brecha: si ese módulo contara un
// sobre propuesto, este gate lo nombra.
import { describe, expect, it } from "vitest";
import { SOBRES } from "../../scripts/maqueta/datos/mundo.mjs";
import { documentoDe, leerPagina, RAIZ_MAQUETA } from "./lib/maqueta";

const doc = (pagina: string) => documentoDe(leerPagina(RAIZ_MAQUETA, pagina));
const brecha = doc("brecha.html");
const tablero = doc("tablero.html");
const informe = doc("informe.html");

const filas = [...brecha.querySelectorAll("[data-fila-brecha]")];
const veredicto = (f: Element) => f.getAttribute("data-veredicto")!;
const cuenta = (v: string) => filas.filter((f) => veredicto(f) === v).length;
const ejecutadas = cuenta("superada") + cuenta("fallida") + cuenta("parcial");
const cifra = (d: Document, clave: string) =>
  d.querySelector(`[data-cifra="${clave}"] .hg-cifra`)?.textContent;
const suma = (d: Document, agrupacion: string, campo: string) =>
  [
    ...d.querySelectorAll(`[data-cobertura="${agrupacion}"][data-${campo}]`),
  ].reduce((n, el) => n + Number(el.getAttribute(`data-${campo}`)), 0);

/** El veredicto que manda el último sobre CONFIRMADO de una prueba, leído de los datos. */
function confirmado(prueba: string) {
  const suyos = (
    SOBRES as { prueba: string; fecha: string; veredicto: string }[]
  )
    .filter((s) => s.prueba === prueba)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return suyos.at(-1)?.veredicto ?? "no_ejecutada";
}

describe("maqueta: la brecha cuadra y dice lo mismo en cada pantalla", () => {
  it("hay pruebas planeadas en la brecha", () =>
    expect(filas.length).toBeGreaterThan(0));

  it("las cifras de la brecha son las de su tabla", () => {
    expect(cifra(brecha, "ejecutadas")).toBe(`${ejecutadas} / ${filas.length}`);
    expect(cifra(brecha, "superadas")).toBe(String(cuenta("superada")));
    expect(cifra(brecha, "fallidas")).toBe(
      String(cuenta("fallida") + cuenta("parcial")),
    );
    expect(cifra(brecha, "no_ejecutadas")).toBe(
      String(filas.length - ejecutadas),
    );
  });

  it("cada fila dice el veredicto de su último sobre confirmado, haya o no uno esperando confirmación", () => {
    for (const f of filas) {
      const prueba = f.getAttribute("data-prueba")!;
      expect(
        veredicto(f),
        `${prueba}: la fila no dice lo que su último sobre confirmado`,
      ).toBe(confirmado(prueba));
    }
    // Y la maqueta muestra el caso: alguna fila tiene un sobre propuesto que sugiere otra cosa.
    expect(filas.some((f) => f.hasAttribute("data-propuesto"))).toBe(true);
  });

  it("«no detectado» no es «verificado»: una prueba con sobre pero sin constancia cuenta como no ejecutada", () => {
    const noDetectadas = filas.filter(
      (f) =>
        veredicto(f) === "no_ejecutada" &&
        /SOB-\d{4}/.test(f.querySelector("td:nth-child(3)")?.textContent ?? ""),
    );
    expect(
      noDetectadas.length,
      "la maqueta debe mostrar al menos un «no detectado» con su sobre",
    ).toBeGreaterThan(0);
  });

  it("la cobertura por activo y por familia suma lo mismo que la tabla", () => {
    for (const agrupacion of ["activo", "familia"]) {
      expect(
        suma(brecha, agrupacion, "planeadas"),
        `por ${agrupacion}: planeadas`,
      ).toBe(filas.length);
      expect(
        suma(brecha, agrupacion, "ejecutadas"),
        `por ${agrupacion}: ejecutadas`,
      ).toBe(ejecutadas);
    }
  });

  it("el tablero y el informe dicen las mismas cifras que la brecha", () => {
    expect(
      suma(tablero, "activo", "planeadas"),
      "tablero: planeadas por activo",
    ).toBe(filas.length);
    expect(
      suma(tablero, "activo", "ejecutadas"),
      "tablero: ejecutadas por activo",
    ).toBe(ejecutadas);
    expect(
      suma(informe, "familia", "planeadas"),
      "informe: planeadas por familia",
    ).toBe(filas.length);
    expect(
      suma(informe, "familia", "ejecutadas"),
      "informe: ejecutadas por familia",
    ).toBe(ejecutadas);
    expect(cifra(informe, "ejecutadas"), "informe: cifra de ejecutadas").toBe(
      `${ejecutadas} / ${filas.length}`,
    );
    expect(
      informe.querySelectorAll("[data-fila-brecha]").length,
      "informe: filas de esperado contra obtenido",
    ).toBe(filas.length);
    expect(cifra(informe, "vencidos"), "informe y tablero: vencidos").toBe(
      cifra(tablero, "vencidos"),
    );
  });
});
