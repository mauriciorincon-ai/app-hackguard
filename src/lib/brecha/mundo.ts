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
import type { PatronCompilado } from "../../engine/catalogo/filtro.ts";
import { huella } from "../../engine/huella.ts";
import {
  validarSemillasDeAgentes,
  type SemillasDeAgentes,
} from "../../engine/propuestas/semillas.ts";
import {
  validarInstrumento,
  type ComprobacionDeInstrumento,
} from "../../engine/instrumento/cierres.ts";
import type { SemillasDeCierre } from "../../engine/instrumento/esquemas.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import type { MundoDeHallazgos } from "../evidencia/cargar.ts";
import {
  SIN_PROPUESTAS,
  type ResumenDePropuestas,
} from "../propuestas/resumen.ts";
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
  /** Lo que las propuestas de los agentes aportan: la cuenta de «por decidir» y los avisos de versión (S8). */
  propuestas: ResumenDePropuestas;
  /** SHA-256 del informe: la brecha, la instantánea, la validación del instrumento y las propuestas, en forma canónica. */
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
  /** Las semillas S1 y S2 de los agentes, con los patrones de instrucciones con que se corren (S8). Sin ellas, solo los cierres. */
  agentes?: {
    semillas: SemillasDeAgentes;
    patronesDeInstrucciones: PatronCompilado[];
  };
  /** Lo que las propuestas aportan (UNA cuenta, la del motor de propuestas). Sin ellas, nada por decidir y ningún aviso. */
  propuestas?: ResumenDePropuestas;
}): Promise<MundoDeBrecha> {
  const propuestas = e.propuestas ?? SIN_PROPUESTAS;
  const entrada = entradaDeBrecha(
    e.instantanea,
    e.activos,
    e.evidencia,
    e.umbrales,
    e.consulta,
  );
  // Las semillas se corren contra el mundo de HOY: el libro demo de la instantánea oficial y la fecha de su consulta.
  const instrumento = [
    ...validarInstrumento(e.semillas.semillas, entrada),
    ...(e.agentes === undefined
      ? []
      : validarSemillasDeAgentes(
          e.agentes.semillas,
          e.agentes.patronesDeInstrucciones,
        )),
  ];
  exigirInstrumentoVerde(instrumento);
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
    propuestas: [
      propuestas.porDecidir,
      propuestas.avisos.map((a) => [a.marco, a.publicada, a.propuesta]),
    ],
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
    propuestas,
    huellaDelInforme,
  };
}

/**
 * La regla 9 (C18): si una semilla del instrumento no responde lo que espera, nada se publica. El build se detiene y
 * nombra la semilla y su diferencia; las pantallas nunca se emiten con un instrumento que no pasa.
 */
export function exigirInstrumentoVerde(
  instrumento: ComprobacionDeInstrumento[],
): void {
  const rojas = instrumento.flatMap((c) => c.semillas.filter((s) => !s.pasa));
  if (rojas.length === 0) return;
  throw new Error(
    `la validación del instrumento falló: ${rojas.map((s) => `${s.id} (${s.diferencias.join("; ")})`).join(" | ")} · the instrument validation failed: nothing is published`,
  );
}

export { armarBrecha };
