// El mundo de la brecha: todo lo que el build cargó y comprobó, más la brecha ya calculada (una sola vez, con su huella) y la
// validación del instrumento que corrió el motor. Las cinco vistas leen ESTE objeto y ninguna otra cosa.
import {
  armarBrecha,
  calcularBrecha,
  type Brecha,
} from "../../engine/brecha/calcular.ts";
import type {
  EtiquetasDeBrecha,
  UmbralesDeBrecha,
} from "../../engine/brecha/esquemas.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { huella } from "../../engine/huella.ts";
import {
  validarInstrumento,
  type ComprobacionDeInstrumento,
} from "../../engine/instrumento/cierres.ts";
import type { SemillasDeCierre } from "../../engine/instrumento/esquemas.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import type { MundoDeHallazgos } from "../evidencia/cargar.ts";
import { entradaDeBrecha } from "./entrada.ts";

export interface MundoDeBrecha {
  instantanea: Instantanea;
  nombre: string;
  consulta: string;
  activos: MundoDeActivos;
  evidencia: MundoDeHallazgos;
  umbrales: UmbralesDeBrecha;
  etiquetas: EtiquetasDeBrecha;
  brecha: Brecha;
  /** Lo que el motor respondió a cada semilla de cierre (C18), agrupado por requisito. */
  instrumento: ComprobacionDeInstrumento[];
  /** SHA-256 del informe: la brecha, la instantánea y la validación del instrumento, en forma canónica. */
  huellaDelInforme: string;
}

export async function armarMundoDeBrecha(e: {
  instantanea: Instantanea;
  nombre: string;
  consulta: string;
  activos: MundoDeActivos;
  evidencia: MundoDeHallazgos;
  umbrales: UmbralesDeBrecha;
  etiquetas: EtiquetasDeBrecha;
  semillas: SemillasDeCierre;
}): Promise<MundoDeBrecha> {
  const entrada = entradaDeBrecha(
    e.instantanea,
    e.activos,
    e.evidencia,
    e.umbrales,
    e.consulta,
  );
  // Las semillas se corren contra el mundo de HOY: el libro demo de la instantánea oficial y la fecha de su consulta.
  const instrumento = validarInstrumento(e.semillas.semillas, entrada);
  const brecha = await calcularBrecha(entrada);
  if (brecha.problemas.length > 0)
    throw new Error(
      `la brecha no se pudo calcular: ${brecha.problemas.join(" | ")} / the gap could not be calculated`,
    );
  const huellaDelInforme = await huella({
    brecha: brecha.huella,
    instantanea: e.instantanea.huella,
    instrumento: instrumento.map((c) => [
      c.requisito,
      c.sembradas,
      c.obtenidas,
    ]),
  });
  return {
    instantanea: e.instantanea,
    nombre: e.nombre,
    consulta: e.consulta,
    activos: e.activos,
    evidencia: e.evidencia,
    umbrales: e.umbrales,
    etiquetas: e.etiquetas,
    brecha,
    instrumento,
    huellaDelInforme,
  };
}

export { armarBrecha };
