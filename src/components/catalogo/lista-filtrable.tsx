"use client";

import { useEffect, useRef, useState } from "react";
import {
  SIN_FILTROS,
  filtrar,
  type Campo,
  type Filtros as EstadoDeFiltros,
  type FilaFiltrable,
} from "@/lib/catalogo/filtros";
import type { ListaDeFiltro, OpcionDeFiltro } from "@/lib/catalogo/tipos";
import { T } from "../texto";
import { Filtros } from "./filtros";

/**
 * Los filtros de la lista del catálogo. Las FILAS se pintan en el servidor (children) y llegan al navegador ya hechas: aquí
 * no se vuelven a pintar ni a hidratar una por una, solo se muestran u ocultan según los filtros (con 38 filas con los dos
 * idiomas, hidratarlas costaba más del presupuesto de bloqueo del hilo principal). El navegador recibe solo lo que el
 * filtro lee de cada fila.
 */
export function ListaFiltrable({
  familias,
  listas,
  indice,
  children,
}: {
  familias: OpcionDeFiltro[];
  listas: ListaDeFiltro[];
  indice: FilaFiltrable[];
  children: React.ReactNode;
}) {
  const [filtros, setFiltros] = useState<EstadoDeFiltros>(SIN_FILTROS);
  const cambiar = (campo: Campo, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor }));
  const visibles = filtrar(indice, filtros).map((f) => f.id);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quedan = new Set(visibles);
    contenedor.current
      ?.querySelectorAll<HTMLElement>("tr[data-prueba]")
      .forEach((fila) => {
        fila.hidden = !quedan.has(fila.dataset.prueba ?? "");
      });
    // `visibles` se recalcula en cada render a partir de `filtros`: basta con depender de ellos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  return (
    <>
      <Filtros
        familias={familias}
        listas={listas}
        total={indice.length}
        visibles={visibles.length}
        filtros={filtros}
        cambiar={cambiar}
      />
      <div ref={contenedor} hidden={visibles.length === 0}>
        {children}
      </div>
      <div className="hg-aviso es-neutro" hidden={visibles.length > 0}>
        <h2>
          <T
            t={{
              es: "Ninguna prueba cumple esos filtros",
              en: "No test matches those filters",
            }}
          />
        </h2>
        <p>
          <T
            t={{
              es: "Quita un filtro o vuelve a «Todas» para ver el catálogo completo.",
              en: "Remove a filter or go back to “All” to see the whole catalog.",
            }}
          />
        </p>
      </div>
    </>
  );
}
