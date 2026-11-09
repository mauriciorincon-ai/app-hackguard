// Los pares CONSECUTIVOS de una secuencia de instantáneas ordenada del pasado al presente (D1, deuda del S10 «selector»): con N instantáneas hay
// N−1 comparaciones, cada una entre una y la que le sigue. El export es estático y no tiene servidor, así que cada par se genera en el build
// y la pantalla los enlaza; escala con N sin una línea de JavaScript en el navegador. PURO: no sabe de archivos ni de reloj.
export interface Par<T> {
  de: T;
  a: T;
}

/** `[a, b, c]` → `[(a,b), (b,c)]`; con una sola o ninguna, no hay con qué comparar. */
export function paresConsecutivos<T>(secuencia: readonly T[]): Par<T>[] {
  return secuencia.slice(1).map((a, i) => ({ de: secuencia[i]!, a }));
}
