// Lo que el CLI y la pantalla de re-plan comparten: de un activo cargado y la instantánea contra la que se re-planea, la entrada del motor
// (`engine/planificador/replanear.ts`). El activo anterior sale de su historial y la instantánea anterior de `datos/instantaneas/`, buscados
// por las huellas que el plan cita: si alguna no se encuentra, no hay base y se dice cuál. Solo corre en Node.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { versionDelPlan } from "../../engine/activos/historial.ts";
import type { EntradaDeReplan } from "../../engine/planificador/replanear.ts";
import { cargarInstantaneaPorHuella } from "../catalogo/cargar-instantanea.ts";
import type { ActivoCargado, DatosDelPlanificador } from "./cargar.ts";

export class SinBaseParaReplanear extends Error {}

/** `fecha` es la de emisión: una entrada, jamás el reloj (el motor la rechaza si es anterior a la instantánea). */
export async function entradaDeReplan(
  cargado: ActivoCargado,
  datos: Pick<DatosDelPlanificador, "formula" | "entornos">,
  instantaneaNueva: Instantanea,
  fecha: string,
  raiz: string = process.cwd(),
): Promise<EntradaDeReplan> {
  const id = cargado.activo.id;
  const { plan, versiones } = cargado;
  if (plan === null)
    throw new SinBaseParaReplanear(
      `${id}: no tiene un plan emitido que re-planear / ${id}: has no issued plan to re-plan`,
    );
  const anterior = versiones === null ? null : versionDelPlan(versiones, plan);
  if (anterior === null)
    throw new SinBaseParaReplanear(
      `${id}: la versión del activo con la que se emitió el plan no está en su historial / ${id}: the asset version the plan was issued with is not in its history`,
    );
  const instantanea = await cargarInstantaneaPorHuella(
    plan.instantanea.huella,
    raiz,
  );
  if (instantanea === null)
    throw new SinBaseParaReplanear(
      `${id}: la instantánea que el plan cita no está en datos/instantaneas/ / ${id}: the snapshot the plan cites is not in datos/instantaneas/`,
    );
  return {
    plan,
    activoAnterior: anterior.activo,
    instantaneaAnterior: instantanea.instantanea,
    activoNuevo: cargado.activo,
    instantaneaNueva,
    formula: datos.formula,
    entornos: datos.entornos,
    fecha,
  };
}
