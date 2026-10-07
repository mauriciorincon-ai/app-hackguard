// Instantánea del catálogo (RF-01.7): el catálogo aprobado completo y su semáforo de vigencia en la fecha de
// evaluación, con su huella JCS + SHA-256. Todo plan referenciará una. Gate de publicación (RF-10.6): si el
// validador da «inválido», no se emite nada. La fecha de evaluación es una entrada (RNF-01): la misma fecha y
// los mismos datos dan la misma huella en Node y en cualquier navegador.
import { esFechaCivil } from "../fecha.ts";
import { huella } from "../huella.ts";
import { semaforo, type Semaforo } from "./semaforo.ts";
import type { Prueba, Umbrales } from "./esquemas.ts";
import type { CatalogoEnBruto } from "./tipos.ts";
import {
  validarCatalogo,
  type CatalogoValidado,
  type MotivoPendiente,
  type ResultadoDeValidacion,
} from "./validar.ts";

export const FORMATO_DE_INSTANTANEA = "hackguard/instantanea@1";

/** El catálogo aprobado tal como viaja en la instantánea: solo las pruebas publicables, sin su evaluación. */
export interface CatalogoDeInstantanea extends Omit<
  CatalogoValidado,
  "umbrales" | "pruebas"
> {
  umbrales: Umbrales;
  pruebas: Prueba[];
}

export interface Instantanea {
  formato: typeof FORMATO_DE_INSTANTANEA;
  fecha_evaluacion: string;
  catalogo: CatalogoDeInstantanea;
  /** La vigencia de cada prueba publicada, marco, herramienta y familia en `fecha_evaluacion`. */
  semaforo: Semaforo;
  pendientes_de_revision: { id: string; motivo: MotivoPendiente }[];
  advertencias: {
    regla: string;
    severidad: string;
    ruta: string;
    campo: string;
    detalle: { es: string; en: string } | null;
  }[];
  /** SHA-256 del JCS de todos los campos anteriores. */
  huella: string;
}

export type ResultadoDeInstantanea =
  | {
      emitida: true;
      instantanea: Instantanea;
      archivo: string;
      validacion: ResultadoDeValidacion;
    }
  | { emitida: false; validacion: ResultadoDeValidacion };

/** Nombre del archivo de una instantánea: fecha de evaluación y los primeros 12 caracteres de su huella. */
export const nombreDeInstantanea = (fecha: string, huellaCompleta: string) =>
  `${fecha}-${huellaCompleta.slice(0, 12)}.json`;

/**
 * La huella de una instantánea se calcula sobre todo menos el propio campo `huella`. Se quita ese campo en vez
 * de elegir los demás: un campo nuevo entra solo en la huella.
 */
export function huellaDeInstantanea(
  instantanea: Omit<Instantanea, "huella"> | Instantanea,
): Promise<string> {
  const cuerpo: Record<string, unknown> = { ...instantanea };
  delete cuerpo.huella;
  return huella(cuerpo);
}

/**
 * Lanza `RangeError` si la fecha no existe o es anterior a la última verificación del catálogo: las dos son
 * errores de quien la pide, no del catálogo.
 */
export async function construirInstantanea(
  entrada: CatalogoEnBruto,
  fechaEvaluacion: string,
): Promise<ResultadoDeInstantanea> {
  if (!esFechaCivil(fechaEvaluacion)) {
    throw new RangeError(`fecha de evaluación inválida: ${fechaEvaluacion}`);
  }
  const validacion = await validarCatalogo(entrada);
  const c = validacion.catalogo;
  // Sin umbrales el catálogo ya es inválido («archivo/falta» o el esquema); el segundo término solo estrecha
  // el tipo.
  if (validacion.estado === "invalido" || c.umbrales === null)
    return { emitida: false, validacion };

  const publicables = c.pruebas
    .filter((p) => p.publicable)
    .map((p) => p.prueba);
  const cuerpo: Omit<Instantanea, "huella"> = {
    formato: FORMATO_DE_INSTANTANEA,
    fecha_evaluacion: fechaEvaluacion,
    catalogo: {
      familias: c.familias,
      reglas_de_veredicto: c.reglas_de_veredicto,
      rasgos: c.rasgos,
      filtro: c.filtro,
      marcos: c.marcos,
      equivalencias: c.equivalencias,
      controles: c.controles,
      herramientas: c.herramientas,
      umbrales: c.umbrales,
      estados: c.estados,
      pruebas: publicables,
    },
    semaforo: semaforo(
      {
        familias: c.familias,
        pruebas: publicables,
        marcos: c.marcos,
        herramientas: c.herramientas,
      },
      fechaEvaluacion,
      c.umbrales.vigencia,
    ),
    pendientes_de_revision: c.pruebas.flatMap((p) =>
      p.pendiente === null ? [] : [{ id: p.prueba.id, motivo: p.pendiente }],
    ),
    advertencias: validacion.hallazgos
      .filter((h) => h.severidad !== "error")
      .map(({ regla, severidad, ruta, campo, detalle }) => ({
        regla,
        severidad,
        ruta,
        campo,
        detalle,
      })),
  };
  const huellaCompleta = await huellaDeInstantanea(cuerpo);
  return {
    emitida: true,
    instantanea: { ...cuerpo, huella: huellaCompleta },
    archivo: nombreDeInstantanea(fechaEvaluacion, huellaCompleta),
    validacion,
  };
}
