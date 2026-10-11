"use client";

import { en as texto, useIdioma } from "../consola/idioma";
import { T } from "../texto";
import {
  SIN_FILTROS,
  hayFiltros,
  type Campo,
  type Filtros as EstadoDeFiltros,
} from "@/lib/catalogo/filtros";
import type { ListaDeFiltro, OpcionDeFiltro } from "@/lib/catalogo/tipos";

/** Las píldoras de familia, la cuenta de lo que se ve, «quitar filtros» y las listas de los demás filtros. */
export function Filtros({
  familias,
  listas,
  total,
  visibles,
  filtros,
  cambiar,
}: {
  familias: OpcionDeFiltro[];
  listas: ListaDeFiltro[];
  total: number;
  visibles: number;
  filtros: EstadoDeFiltros;
  cambiar: (campo: Campo, valor: string) => void;
}) {
  const idioma = useIdioma();
  const quien = (t: OpcionDeFiltro["texto"]) =>
    typeof t === "string" ? t : texto(idioma, t);
  return (
    <div className="hg-herramientas">
      <div className="hg-herramientas-linea">
        <div
          className="hg-grupo"
          role="group"
          aria-label={texto(idioma, { es: "Familia", en: "Family" })}
        >
          {familias.map((f) => (
            <button
              key={f.valor}
              type="button"
              className="hg-boton hg-filtro"
              aria-pressed={filtros.familia === f.valor}
              onClick={() => cambiar("familia", f.valor)}
            >
              {typeof f.texto === "string" ? f.texto : <T t={f.texto} />}
            </button>
          ))}
        </div>
        <div className="hg-grupo">
          <p className="hg-menor">
            <span lang="es">
              Se muestran{" "}
              <span data-cuenta-filtrada data-neutro>
                {visibles}
              </span>{" "}
              de {total} pruebas
            </span>
            <span lang="en">
              Showing{" "}
              <span data-cuenta-filtrada data-neutro>
                {visibles}
              </span>{" "}
              of {total} tests
            </span>
          </p>
          <button
            type="button"
            className="hg-boton hg-boton-discreto"
            hidden={!hayFiltros(filtros)}
            onClick={() =>
              (Object.keys(SIN_FILTROS) as Campo[]).forEach((c) =>
                cambiar(c, ""),
              )
            }
          >
            <T t={{ es: "Quitar filtros", en: "Clear filters" }} />
          </button>
        </div>
      </div>
      <div className="hg-campos">
        {listas.map((l) => (
          <label
            key={l.campo}
            className="hg-campo"
            htmlFor={`filtro-${l.campo}`}
          >
            <span>
              <T t={l.rotulo} />
            </span>
            <select
              id={`filtro-${l.campo}`}
              value={filtros[l.campo]}
              onChange={(e) => cambiar(l.campo, e.target.value)}
            >
              {l.opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {quien(o.texto)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
