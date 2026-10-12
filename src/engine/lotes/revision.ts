// Qué revisa una persona antes de confirmar un lote (E-5): TODAS las fallidas y parciales, TODA re-prueba de un hallazgo
// (cerrarlo es más grave que cualquier superada) y una muestra del resto.
// Es una cuenta del motor —una sola para el CLI, la pantalla y el validador— y no depende de quién la pida: el resto
// se ordena por SHA-256(huella del lote + id) y se toman los primeros n que dice el plan de muestreo.
import type { Sobre, Veredicto } from "../evidencia/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import type { PlanDeMuestreo } from "./esquemas.ts";
import { elegirMuestra, tamanoDeMuestra } from "./muestra.ts";

/** Los veredictos que se revisan siempre: los que fallan. */
export const SE_REVISAN_SIEMPRE: readonly Veredicto[] = ["fallida", "parcial"];

/** Lo único que la revisión necesita de un sobre: su veredicto y si es la re-prueba de un hallazgo. */
export type SobreParaRevisar = Pick<Sobre, "veredicto" | "reprueba_de">;

/**
 * ¿Una persona lo revisa siempre? Si falla (fallida o parcial), o si es la re-prueba de un hallazgo: una re-prueba
 * superada cierra el hallazgo, y nadie lo cierra por haber caído fuera de una muestra (B2, auditoría del Sprint 6).
 */
export const seRevisaSiempre = (s: SobreParaRevisar): boolean =>
  SE_REVISAN_SIEMPRE.includes(s.veredicto) || s.reprueba_de !== null;

export interface RevisionDelLote {
  /** Fallidas, parciales y re-pruebas de un hallazgo: se revisan todas, siempre. */
  siempre: string[];
  /** De los de `siempre`, los que lo son solo por ser la re-prueba de un hallazgo (no fallan): lo que añade B2. */
  rePruebas: string[];
  /** Los sobres del resto que entran a la muestra. */
  muestra: string[];
  /** Cuántos sobres tiene el resto (lo que no se revisa siempre). */
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
  sobres: ReadonlyMap<string, SobreParaRevisar>,
  plan: PlanDeMuestreo,
): Promise<RevisionDelLote> {
  const ids = lote.sobres.map((s) => s.id);
  const siempre = ids
    .filter((id) => {
      const s = sobres.get(id);
      return s !== undefined && seRevisaSiempre(s);
    })
    .sort(comparar);
  const delResto = ids.filter((id) => !siempre.includes(id));
  const muestra = await elegirMuestra(
    delResto,
    tamanoDeMuestra(delResto.length, plan),
    lote.huellas.lote,
  );
  return {
    siempre,
    rePruebas: siempre.filter(
      (id) => !SE_REVISAN_SIEMPRE.includes(sobres.get(id)!.veredicto),
    ),
    muestra,
    resto: delResto.length,
    revisados: [...siempre, ...muestra].sort(comparar),
  };
}
