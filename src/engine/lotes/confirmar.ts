// Confirmar un lote (E-5, regla dura 6): una persona revisa TODAS las fallidas y parciales y la muestra del resto, y
// confirma el lote, o separa algunas fallidas/parciales para confirmarlas una por una, o manda el lote entero a revisión
// individual. El veredicto no cambia: lo calculó la regla de cada prueba.
//
// Lo que el motor no deja pasar:
// - confirmar un lote ya decidido, o con fecha anterior a la corrida;
// - separar algo que no es una fallida o parcial (lo que se revisa siempre es lo que puede separarse);
// - una falla que abriría un hallazgo nuevo sin separarla: abrir un hallazgo pide la severidad de una persona, y esa
//   se da al confirmar el sobre solo (como en el S5);
// - un sobre del lote que ya tiene confirmación individual: se confirmaría dos veces.
import type { Sobre, SobreEfectivo, Veredicto } from "../evidencia/esquemas.ts";
import { decidirApertura } from "../hallazgos/apertura.ts";
import type { Hallazgo } from "../hallazgos/esquemas.ts";
import type { DecisionDeLote, Lote, PlanDeMuestreo } from "./esquemas.ts";
import { resellarLote } from "./huellas.ts";
import { revisionDelLote, type RevisionDelLote } from "./revision.ts";

export type MotivoDeNoConfirmarLote =
  | "ya_decidido"
  | "fecha_anterior_a_la_corrida"
  | "sobre_inexistente"
  | "separa_lo_que_no_se_revisa_siempre"
  | "sobre_ya_confirmado"
  | "falla_que_abre_hallazgo";

export type ResultadoDeConfirmarLote =
  | { ok: true; lote: Lote; revision: RevisionDelLote }
  | { ok: false; motivo: MotivoDeNoConfirmarLote; ids: string[] };

export async function confirmarLote(e: {
  lote: Lote;
  /** Los sobres del lote, como están en sus archivos. */
  sobres: readonly Sobre[];
  plan: PlanDeMuestreo;
  /** El libro efectivo de hoy y los hallazgos: para saber qué falla abriría uno nuevo. */
  libro: readonly SobreEfectivo[];
  hallazgos: readonly Hallazgo[];
  por: string;
  fecha: string;
  decision: DecisionDeLote;
  separar: readonly string[];
}): Promise<ResultadoDeConfirmarLote> {
  const bloqueo = (
    motivo: MotivoDeNoConfirmarLote,
    ids: string[] = [],
  ): ResultadoDeConfirmarLote => ({ ok: false, motivo, ids });
  if (e.lote.confirmacion !== null) return bloqueo("ya_decidido");
  if (e.fecha < e.lote.fecha) return bloqueo("fecha_anterior_a_la_corrida");

  const porId = new Map(e.sobres.map((s) => [s.id, s]));
  const faltan = e.lote.sobres.map((s) => s.id).filter((id) => !porId.has(id));
  if (faltan.length > 0) return bloqueo("sobre_inexistente", faltan);

  const veredictos = new Map<string, Veredicto>(
    e.sobres.map((s) => [s.id, s.veredicto]),
  );
  const revision = await revisionDelLote(e.lote, veredictos, e.plan);

  if (e.decision === "a_revision_individual") {
    const lote = await resellarLote(e.lote, {
      por: e.por,
      fecha: e.fecha,
      decision: "a_revision_individual",
      revisados: [],
      separados: [],
    });
    return { ok: true, lote, revision };
  }

  const ajenos = e.separar.filter((id) => !revision.siempre.includes(id));
  if (ajenos.length > 0)
    return bloqueo("separa_lo_que_no_se_revisa_siempre", ajenos);
  const separados = new Set(e.separar);
  const ya = e.lote.sobres
    .map((s) => porId.get(s.id))
    .filter(
      (s): s is Sobre =>
        s !== undefined && !separados.has(s.id) && s.confirmacion !== null,
    )
    .map((s) => s.id);
  if (ya.length > 0) return bloqueo("sobre_ya_confirmado", ya);

  const abren = sobresQueAbririanHallazgo({
    lote: e.lote,
    libro: e.libro,
    hallazgos: e.hallazgos,
    separados,
    por: e.por,
    fecha: e.fecha,
  });
  if (abren.length > 0) return bloqueo("falla_que_abre_hallazgo", abren);

  const lote = await resellarLote(e.lote, {
    por: e.por,
    fecha: e.fecha,
    decision: "confirmado",
    revisados: revision.revisados,
    separados: [...separados].sort(),
  });
  return { ok: true, lote, revision };
}

/**
 * Las fallas de un lote que, confirmado el lote (menos los separados), abrirían un hallazgo nuevo: no hay otro vivo de
 * la misma prueba y activo, y no son una re-prueba. La confirmación del lote se presta al libro EN MEMORIA, como lo hace
 * `libroEfectivo`. Es la única cuenta: la usan `confirmarLote` y la pantalla de carga.
 */
export function sobresQueAbririanHallazgo(e: {
  lote: Pick<Lote, "id" | "sobres">;
  libro: readonly SobreEfectivo[];
  hallazgos: readonly Hallazgo[];
  separados: ReadonlySet<string>;
  por: string;
  fecha: string;
}): string[] {
  const delLote = new Set(e.lote.sobres.map((s) => s.id));
  const hipotetico: SobreEfectivo[] = e.libro.map((s) =>
    delLote.has(s.id) && !e.separados.has(s.id) && s.confirmacion === null
      ? {
          ...s,
          confirmacion: {
            por: e.por,
            fecha: e.fecha,
            modo: "lote",
            lote: e.lote.id,
          },
        }
      : s,
  );
  return hipotetico
    .filter((s) => delLote.has(s.id) && !e.separados.has(s.id))
    .filter((s) => decidirApertura(s, hipotetico, e.hallazgos).abre)
    .map((s) => s.id);
}
