// ¿Está una prueba dentro del alcance autorizado? Fuera si su familia no está entre las que el dueño autorizó
// o si el dueño la nombró en `fuera`. El catálogo no tiene «canal»: lo que no se autorizó por canal se dice por
// prueba. Devuelve la razón (bilingüe) o `null` si está dentro.
import type { Alcance } from "../activos/esquemas.ts";
import type { Prueba } from "../catalogo/esquemas.ts";

const FAMILIA_FUERA = {
  es: "La familia de esta prueba no está en el alcance autorizado.",
  en: "This test's family is not in the authorized scope.",
};

export function fueraDeAlcance(
  alcance: Alcance,
  prueba: Pick<Prueba, "id" | "familia">,
): { es: string; en: string } | null {
  const nombrada = alcance.fuera.find((f) => f.prueba === prueba.id);
  if (nombrada !== undefined) return nombrada.razon;
  return alcance.familias.includes(prueba.familia) ? null : FAMILIA_FUERA;
}
