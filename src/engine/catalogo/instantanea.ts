// Instantánea del catálogo (RF-01.7): el catálogo aprobado completo, con su huella JCS + SHA-256. Todo plan
// referenciará una. Gate de publicación (RF-10.6): si el validador da «inválido», no se emite nada.
// La fecha de evaluación es una entrada (RNF-01): la misma fecha y los mismos datos dan la misma huella en
// Node y en cualquier navegador.
import { esFechaCivil } from "../fecha.ts";
import { huella } from "../huella.ts";
import type { CatalogoEnBruto } from "./tipos.ts";
import {
  validarCatalogo,
  type MotivoPendiente,
  type ResultadoDeValidacion,
} from "./validar.ts";

export const FORMATO_DE_INSTANTANEA = "hackguard/instantanea@1";

export interface Instantanea {
  formato: typeof FORMATO_DE_INSTANTANEA;
  fecha_evaluacion: string;
  catalogo: Record<string, unknown>;
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

/** La huella de una instantánea se calcula sobre todo menos el propio campo `huella`. */
export function huellaDeInstantanea(
  instantanea: Omit<Instantanea, "huella">,
): Promise<string> {
  const {
    formato,
    fecha_evaluacion,
    catalogo,
    pendientes_de_revision,
    advertencias,
  } = instantanea;
  return huella({
    formato,
    fecha_evaluacion,
    catalogo,
    pendientes_de_revision,
    advertencias,
  });
}

export async function construirInstantanea(
  entrada: CatalogoEnBruto,
  fechaEvaluacion: string,
): Promise<ResultadoDeInstantanea> {
  if (!esFechaCivil(fechaEvaluacion)) {
    throw new RangeError(`fecha de evaluación inválida: ${fechaEvaluacion}`);
  }
  const validacion = await validarCatalogo(entrada);
  if (validacion.estado === "invalido") return { emitida: false, validacion };

  const c = validacion.catalogo;
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
      pruebas: c.pruebas.filter((p) => p.publicable).map((p) => p.prueba),
    },
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
