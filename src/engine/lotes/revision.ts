// Qué revisa una persona antes de confirmar un lote (E-5): TODAS las fallidas y parciales, y una muestra del resto.
// Es una cuenta del motor —una sola para el CLI, la pantalla y el validador— y no depende de quién la pida: el resto
// se ordena por SHA-256(huella del lote + id) y se toman los primeros n que dice el plan de muestreo.
import type { Veredicto } from "../evidencia/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import type { PlanDeMuestreo } from "./esquemas.ts";
import { elegirMuestra, tamanoDeMuestra } from "./muestra.ts";

/** Los veredictos que se revisan siempre: los que fallan. */
export const SE_REVISAN_SIEMPRE: readonly Veredicto[] = ["fallida", "parcial"];

export interface RevisionDelLote {
  /** Fallidas y parciales: se revisan todas, siempre. */
  siempre: string[];
  /** Los sobres del resto que entran a la muestra. */
  muestra: string[];
  /** Cuántos sobres tiene el resto (lo que no es fallida ni parcial). */
  resto: number;
  /** Siempre + muestra, en el orden del libro: lo que una persona revisa. */
  revisados: string[];
}

/** Lo único que la revisión necesita de un lote: su semilla (la huella del lote) y los sobres que cita. */
export interface LoteParaRevisar {
  huellas: { lote: string };
  sobres: readonly { id: string }[];
}

export async function revisionDelLote(
  lote: LoteParaRevisar,
  veredictos: ReadonlyMap<string, Veredicto>,
  plan: PlanDeMuestreo,
): Promise<RevisionDelLote> {
  const ids = lote.sobres.map((s) => s.id);
  const siempre = ids
    .filter((id) =>
      SE_REVISAN_SIEMPRE.includes(veredictos.get(id) ?? "superada"),
    )
    .sort(comparar);
  const delResto = ids.filter((id) => !siempre.includes(id));
  const muestra = await elegirMuestra(
    delResto,
    tamanoDeMuestra(delResto.length, plan),
    lote.huellas.lote,
  );
  return {
    siempre,
    muestra,
    resto: delResto.length,
    revisados: [...siempre, ...muestra].sort(comparar),
  };
}
