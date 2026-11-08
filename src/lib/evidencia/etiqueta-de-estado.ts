// La etiqueta de un estado de hallazgo: UN solo lugar para las pantallas y la CLI. Los estados que el vocabulario de la instantánea
// oficial ya nombra salen de ella; los que nacieron después (`reabierto`, D5) salen de `datos/hallazgos/etiquetas.json`, porque
// añadirlos al vocabulario cambiaría la huella de la instantánea oficial. Un estado sin etiqueta en NINGUNO de los dos es un error:
// el test lo exige para todos los de `ESTADOS_DE_HALLAZGO`, y en exactamente uno.
import { etiquetaDe } from "../../engine/catalogo/semaforo.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type {
  EstadoDeHallazgo,
  EtiquetasDeHallazgo,
} from "../../engine/hallazgos/esquemas.ts";
import type { Etiqueta } from "../catalogo/tipos.ts";

/** De dónde sale la etiqueta de cada estado: el vocabulario de la instantánea, o las etiquetas propias del hallazgo. */
export function origenDeLaEtiquetaDeEstado(
  c: Instantanea["catalogo"],
  etiquetas: EtiquetasDeHallazgo,
  estado: EstadoDeHallazgo,
): ("instantanea" | "propias")[] {
  const origenes: ("instantanea" | "propias")[] = [];
  if (etiquetaDe(c.estados, "estado_de_hallazgo", estado))
    origenes.push("instantanea");
  if (etiquetas.etiquetas.some((e) => e.id === estado))
    origenes.push("propias");
  return origenes;
}

export function etiquetaDeEstadoDeHallazgo(
  c: Instantanea["catalogo"],
  etiquetas: EtiquetasDeHallazgo,
  estado: EstadoDeHallazgo,
): Etiqueta {
  const e =
    etiquetaDe(c.estados, "estado_de_hallazgo", estado) ??
    etiquetas.etiquetas.find((x) => x.id === estado);
  if (e === undefined || e === null)
    throw new Error(
      `ni el vocabulario de estados ni datos/hallazgos/etiquetas.json nombran «${estado}» / neither the state vocabulary nor the finding labels name it`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}
