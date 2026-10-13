"use client";

import { useEffect, useRef, useState } from "react";
import {
  SIN_FILTROS,
  filtrar,
  type Campo,
  type Filtros as EstadoDeFiltros,
  type FilaFiltrable,
} from "@/lib/catalogo/filtros";
import {
  acotar,
  porcion,
  rango,
  totalDePaginas,
} from "@/lib/catalogo/paginacion";
import { ETIQUETAS_DE_VISTAS as E } from "@/lib/catalogo/etiquetas";
import type { ListaDeFiltro, OpcionDeFiltro } from "@/lib/catalogo/tipos";
import { T } from "../texto";
import { Filtros } from "./filtros";
import { Paginacion } from "./paginacion";

/**
 * Los filtros y la paginación de la lista del catálogo. Las FILAS se pintan en el servidor (children) y llegan al navegador ya hechas: aquí
 * no se vuelven a pintar ni a hidratar una por una, solo se muestran u ocultan según los filtros (con 38 filas con los dos
 * idiomas, hidratarlas costaba más del presupuesto de bloqueo del hilo principal). El navegador recibe solo lo que el
 * filtro lee de cada fila. Se ven `POR_PAGINA` por página; las demás siguen en el documento, ocultas (la primera pintura ya
 * trae ocultas las que no son de la página 1: el servidor las dibuja con `hidden`). Paginar recorta la primera pintura, pero por sí
 * solo no cumplió el presupuesto de rendimiento (ver `paginacion.ts`).
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
  const [pedida, setPedida] = useState(1);
  // Todo cambio de filtro devuelve a la página 1.
  const cambiar = (campo: Campo, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPedida(1);
  };
  const visibles = filtrar(indice, filtros).map((f) => f.id);
  const actual = acotar(pedida, visibles.length);
  const { desde, hasta } = rango(actual, visibles.length);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quedan = new Set(porcion(visibles, actual));
    contenedor.current
      ?.querySelectorAll<HTMLElement>("tr[data-prueba]")
      .forEach((fila) => {
        fila.hidden = !quedan.has(fila.dataset.prueba ?? "");
      });
    // `visibles` se recalcula en cada render a partir de `filtros`: basta con depender de ellos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, actual]);

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
      <Paginacion
        actual={actual}
        total={totalDePaginas(visibles.length)}
        desde={desde}
        hasta={hasta}
        cuenta={visibles.length}
        irA={setPedida}
      />
      <div
        className={`hg-aviso es-${E.filtros_sin_resultados.rol}`}
        hidden={visibles.length > 0}
      >
        <h2>
          <T t={E.filtros_sin_resultados.nombre} />
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
