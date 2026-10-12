// El mundo de la carga de evidencia para los gates de fidelidad, de interacción y de la vista: el mismo mundo de los
// hallazgos (libro efectivo, lotes demo, plan de muestreo, revisiones) y la vista de la carga, más constructores de mundos
// con un lote decidido o con otro plan de muestreo, que recalculan lo que depende de ellos con las funciones del motor.
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import { libroEfectivo } from "../../../src/engine/lotes/efectivo.ts";
import type {
  ConfirmacionDeLote,
  PlanDeMuestreo,
} from "../../../src/engine/lotes/esquemas.ts";
import { resellarLote } from "../../../src/engine/lotes/huellas.ts";
import { revisionDelLote } from "../../../src/engine/lotes/revision.ts";
import type { MundoDeHallazgos } from "../../../src/lib/evidencia/cargar.ts";
import type { VistaDeCarga } from "../../../src/lib/evidencia/tipos-de-carga.ts";
import { construirVistaDeCarga } from "../../../src/lib/evidencia/vista-de-carga.ts";
import { mundoDeHallazgos } from "./mundo-de-hallazgos";
import {
  instantanea,
  mundo as activos,
  nombreDeLaInstantanea,
} from "./mundo-de-activos";

export { mundoDeHallazgos as mundoDeCarga };

export const vistaDeCarga = (
  mundo: MundoDeHallazgos = mundoDeHallazgos,
  consulta = instantanea.fecha_evaluacion,
): VistaDeCarga =>
  construirVistaDeCarga(
    mundo,
    activos,
    instantanea,
    nombreDeLaInstantanea,
    consulta,
  );

/** Los sobres tal como están en sus archivos (sin la confirmación que les presta un lote). */
const sobresDeArchivo = (m: MundoDeHallazgos): Sobre[] =>
  m.libro.map((s) =>
    s.confirmacion?.modo === "lote" ? { ...s, confirmacion: null } : s,
  ) as Sobre[];

/** Un mundo en el que un lote demo ya está decidido: el libro efectivo y la revisión se recalculan con el motor. */
export function conLoteDecidido(
  id: string,
  confirmacion: ConfirmacionDeLote,
): Promise<MundoDeHallazgos> {
  return (async () => {
    const lotes = await Promise.all(
      mundoDeHallazgos.lotes.map((l) =>
        l.id === id ? resellarLote(l, confirmacion) : l,
      ),
    );
    return {
      ...mundoDeHallazgos,
      lotes,
      libro: libroEfectivo(sobresDeArchivo(mundoDeHallazgos), lotes),
    };
  })();
}

/** Un mundo con otro plan de muestreo: las revisiones se recalculan (lo que decide qué cae en la muestra). */
export async function conMuestreo(
  muestreo: PlanDeMuestreo,
): Promise<MundoDeHallazgos> {
  const sobres = new Map(mundoDeHallazgos.libro.map((s) => [s.id, s] as const));
  const revisiones = Object.fromEntries(
    await Promise.all(
      mundoDeHallazgos.lotes.map(
        async (l) =>
          [l.id, await revisionDelLote(l, sobres, muestreo)] as const,
      ),
    ),
  );
  return { ...mundoDeHallazgos, muestreo, revisiones };
}
