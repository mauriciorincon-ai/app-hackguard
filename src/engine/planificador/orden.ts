// Orden por punto de código: el mismo en Node y en cualquier navegador, sin `localeCompare` (que depende del
// idioma de la máquina). Todo lo que el planificador ordena pasa por aquí.
export const comparar = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export const ordenado = (valores: readonly string[]): string[] =>
  [...valores].sort(comparar);

export const ordenadoPor = <T>(
  valores: readonly T[],
  clave: (v: T) => string,
): T[] => [...valores].sort((a, b) => comparar(clave(a), clave(b)));
