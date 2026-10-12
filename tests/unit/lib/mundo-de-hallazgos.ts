// El mundo de los hallazgos para los gates de fidelidad y de envejecimiento: la instantánea oficial, los activos, el libro y
// los cuatro hallazgos demo ya validados, y la vista de cada uno en una fecha de consulta.
import type { VistaDeHallazgo } from "../../../src/lib/evidencia/tipos.ts";
import { cargarHallazgosDelBuild } from "../../../src/lib/evidencia/cargar.ts";
import { construirVistaDeHallazgo } from "../../../src/lib/evidencia/vista.ts";
import {
  instantanea,
  mundo as activos,
  nombreDeLaInstantanea,
} from "./mundo-de-activos";

export const mundoDeHallazgos = await cargarHallazgosDelBuild(
  instantanea,
  process.cwd(),
);
export const IDS_DE_HALLAZGOS = mundoDeHallazgos.hallazgos.map((h) => h.id);

export const vistaDeHallazgo = (
  id: string,
  consulta = instantanea.fecha_evaluacion,
): VistaDeHallazgo =>
  construirVistaDeHallazgo(
    id,
    mundoDeHallazgos,
    activos,
    instantanea,
    nombreDeLaInstantanea,
    consulta,
  );
