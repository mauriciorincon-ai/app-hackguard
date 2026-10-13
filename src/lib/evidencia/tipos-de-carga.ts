// La vista de la carga de evidencia: lo que la pantalla `/evidencia/carga` necesita, ya calculado y serializable. La
// pantalla no recalcula nada (design-system § 9, «una cuenta, un cálculo»): la revisión (qué se revisa siempre y la
// muestra) la calculó `revisionDelLote`, el libro con lo que cuenta `libroEfectivo`, y qué fallas abrirían un hallazgo
// `sobresQueAbririanHallazgo`; la misma que usa el CLI al confirmar. Aquí solo se leen, se nombran y se ordenan.
import type { IdDeEtiquetaDeCarga } from "../../engine/lotes/esquemas.ts";
import type { Bilingue, Etiqueta } from "../catalogo/tipos.ts";

export type { Bilingue, Etiqueta };

/** Una frase con el identificador de un hallazgo adentro: «{h}» es donde va el enlace. */
export interface NotaConHallazgo extends Bilingue {
  /** El hallazgo que cita, si lo cita. La pantalla lo enlaza donde la frase dice «{h}». */
  hallazgo: string | null;
}

export interface HallazgoDelSobre {
  id: string;
  estado: Etiqueta;
  titulo: Bilingue;
}

/** Cómo cuenta (o no) un sobre del lote hoy. */
export type ConfirmacionDeSobre =
  /** Nada lo ha confirmado: es una propuesta y no cuenta. */
  | { tipo: "propuesta" }
  /** Lo confirmó el lote. */
  | { tipo: "por_lote"; lote: string; por: string; fecha: string }
  /** Lo confirmó una persona, sobre por sobre. */
  | { tipo: "individual"; por: string; fecha: string }
  /** El lote lo separó y todavía no lo confirma nadie. */
  | { tipo: "separado" };

export interface SobreDeLote {
  id: string;
  prueba: { id: string; nombre: Bilingue };
  veredicto: Etiqueta;
  /** El identificador del veredicto: con él se cuenta, nunca con su nombre. */
  veredictoId: string;
  /** Si una persona lo revisa siempre (fallida o parcial), porque cae en la muestra, o no entra a la revisión. */
  revision: "siempre" | "muestra" | "fuera";
  /** La revisión dicha en una palabra (celda de tabla) y en una frase (ficha). */
  revisionCorta: Etiqueta;
  revisionLarga: Etiqueta;
  /** La barra de proporción: fallidas sobre evaluadas, si el sobre las trae. */
  proporcion: { fallidas: number; evaluadas: number } | null;
  conteo: Bilingue;
  nota: NotaConHallazgo | null;
  hallazgo: HallazgoDelSobre | null;
  regla: string;
  selector: string | null;
  huellaSobre: string;
  huellaResultado: string;
  confirmacion: ConfirmacionDeSobre;
}

/** Lo que dice cada decisión del lote en su recorrido y en «Para confirmar». */
export type DecisionDelLote =
  "por_confirmar" | "confirmado" | "a_revision_individual";

/** Un paso del recorrido del lote: marca (símbolo y rol de color, de datos), título y lo que quiere decir. */
export interface PasoDeRecorrido {
  rol: string;
  simbolo: string;
  titulo: Bilingue;
  detalle: Bilingue;
}

export interface VistaDeLote {
  id: string;
  herramienta: { nombre: string; version: string };
  fecha: string;
  hora: string | null;
  zona: string;
  decision: DecisionDelLote;
  decisionEtiqueta: Etiqueta;
  /** Quién y cuándo lo decidió, si lo decidió. */
  decididoPor: { por: string; fecha: string } | null;
  reparto: { veredicto: Etiqueta; n: number }[];
  advertencias: Bilingue[];
  sobres: SobreDeLote[];
  /** El sobre que se ve en «Sobre seleccionado» al abrir el lote: la primera que se revisa siempre. */
  seleccionado: string;
  /** Las fallidas y parciales (se revisan todas), el resto, y cuántos de ese resto entran a la muestra. */
  obligatorias: number;
  /** De las obligatorias, las que lo son solo por ser la re-prueba de un hallazgo (no fallan). */
  rePruebas: string[];
  resto: number;
  muestra: number;
  /** Las fallas que abrirían un hallazgo nuevo si el lote se confirma: hay que separarlas y confirmarlas una por una. */
  abren: string[];
  /** Los sobres que se confirmaron aparte (separados) y los que cuentan por el lote. */
  separados: string[];
  cuentanPorElLote: number;
  recorrido: PasoDeRecorrido[];
  ficha: {
    archivo: string;
    huellaDelArchivo: string;
    huellaDelLote: string;
    huellaDelRegistro: string;
    adaptador: string;
    ejecutadoPor: string;
  };
  /** Los comandos que deciden el lote: la pantalla es de solo lectura. */
  comandos: { confirmar: string; unoPorUno: string };
}

export interface FilaDeMuestreo {
  desde: number;
  hasta: number | null;
  /** `null` = se revisan todos. */
  muestra: number | null;
}

export interface VistaDeCarga {
  /** Todo el vocabulario de estado de la pantalla (`datos/evidencia/etiquetas-de-carga.json`): el color y la marca salen de aquí. */
  etiquetas: Record<IdDeEtiquetaDeCarga, Etiqueta>;
  instantanea: string;
  consulta: string;
  /** Los activos de los lotes, con la huella de su plan. */
  activos: { id: string; nombre: Bilingue; huellaDelPlan: string | null }[];
  resumen: {
    lotesPorConfirmar: number;
    /** Los sobres que todavía son una propuesta (ni el lote ni una persona los han confirmado); las dos cifras de abajo cuentan sobre ellos. */
    sobres: number;
    fallidas: Etiqueta;
    nFallidas: number;
    noEjecutada: Etiqueta;
    nNoEjecutadas: number;
  };
  lotes: VistaDeLote[];
  muestreo: {
    filas: FilaDeMuestreo[];
    /** La nota del plan de muestreo (`datos/evidencia/muestreo.json`): la pantalla la muestra tal cual, no la repite. */
    nota: Bilingue;
    procedimiento: string;
    calidadLimite: number;
    riesgoDelConsumidor: number;
  };
}
