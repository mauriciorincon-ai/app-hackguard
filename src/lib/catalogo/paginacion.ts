// La paginación de la lista del catálogo: pura y sin estado, para que la pantalla y los tests digan lo mismo. La página
// que se ve es una porción de lo que cumple los filtros; cualquier cambio de filtro devuelve a la página 1.

/**
 * Cuántas pruebas se ven por página. Recorta lo que la primera pintura dibuja, pero la paginación SOLA no cumplió el presupuesto de
 * rendimiento (LCP 3.151 ms y TBT 354 ms al cierre del S3): lo cumplió, además, cargar Sentry aparte (`instrumentation-client.ts`).
 */
export const POR_PAGINA = 20;

/** Cuántas páginas hacen falta para `n` elementos (siempre al menos una, aunque no haya ninguno). */
export const totalDePaginas = (n: number, por = POR_PAGINA): number =>
  Math.max(1, Math.ceil(n / por));

/** La página pedida, llevada al rango que existe (1 a la última): un filtro puede dejar menos páginas que antes. */
export const acotar = (pagina: number, n: number, por = POR_PAGINA): number =>
  Math.min(Math.max(1, Math.trunc(pagina) || 1), totalDePaginas(n, por));

/** Los elementos de la página `pagina` (empieza en 1). */
export const porcion = <T>(
  elementos: readonly T[],
  pagina: number,
  por = POR_PAGINA,
): T[] => {
  const actual = acotar(pagina, elementos.length, por);
  return elementos.slice((actual - 1) * por, actual * por);
};

/** «Filas 21 a 38 de 38»: de la primera a la última fila de la página, o 0 a 0 si no hay ninguna. */
export const rango = (
  pagina: number,
  n: number,
  por = POR_PAGINA,
): { desde: number; hasta: number } => {
  if (n === 0) return { desde: 0, hasta: 0 };
  const actual = acotar(pagina, n, por);
  return {
    desde: (actual - 1) * por + 1,
    hasta: Math.min(actual * por, n),
  };
};
