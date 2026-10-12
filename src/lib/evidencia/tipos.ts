// La vista del hallazgo: lo que la pantalla necesita, ya calculado y serializable. La pantalla no recalcula nada
// (design-system § 9, «una cuenta, un cálculo»): el estado, la severidad, el plazo y la revisión los calculó
// `situacionDeHallazgo` del motor; aquí solo se leen, se nombran con los textos del catálogo y se ordenan.
import type { Bilingue, Etiqueta } from "../catalogo/tipos.ts";
import type { EstadoDeHallazgo } from "../../engine/hallazgos/esquemas.ts";

export type { Bilingue, Etiqueta };

export interface ItemDeSelectorDeHallazgo {
  id: string;
  estado: Etiqueta;
  actual: boolean;
}

/** Una línea del cuerpo de un eslabón de la cadena de cierre. */
export type LineaDeEslabon =
  | { tipo: "fecha"; valor: string }
  | { tipo: "texto"; menor: boolean; texto: Bilingue }
  | { tipo: "sobre"; id: string; nota?: Bilingue }
  | { tipo: "huella"; hex: string }
  | { tipo: "firma"; fecha: string }
  | { tipo: "motivos"; motivos: Bilingue[] };

export interface EslabonDeCadena {
  etiqueta: Etiqueta;
  /** Lo que falta se dibuja punteado: ni hecho ni con color de estado. */
  pendiente: boolean;
  lineas: LineaDeEslabon[];
}

/** Una celda de la tabla de prioridad de acción: el nivel que dice la tabla, y si es la de este hallazgo. */
export interface CeldaDeMatriz {
  etiqueta: Etiqueta;
  esta: boolean;
}

export interface FilaDeMatriz {
  impacto: number;
  ancla: Bilingue;
  /** «Piso: nunca menos de alto» / «Techo: nunca más de medio», si los datos declaran uno para esta fila. */
  limite: Bilingue | null;
  celdas: CeldaDeMatriz[];
}

export interface DetalleDeEscalaIa {
  tipo: "escala_ia";
  nota: Bilingue;
  /** El nivel que dice la tabla (data-nivel-de-tabla). */
  nivel: string;
  columnas: Bilingue[];
  filas: FilaDeMatriz[];
  impacto: { valor: number; de: number; descripcion: Bilingue };
  frecuencia: {
    porCiento: number;
    fallidas: number;
    evaluadas: number;
    deConteo: boolean;
    sobre: string;
  };
  alcance: Bilingue;
  detectabilidad: Bilingue;
}

export interface DetalleDeCvss {
  tipo: "cvss";
  puntaje: string;
  vector: string;
  etiquetaDelVector: Etiqueta;
  metricas: {
    clave: string;
    valor: string;
    metrica: Bilingue;
    nombreDelValor: Bilingue | null;
  }[];
  referencia: string;
}

export interface AccionDeHallazgo {
  id: "corregir" | "reprobar" | "aceptar" | "eliminar" | "no_reproducible";
  nombre: Bilingue;
  consecuencia: Bilingue;
  /** El comando que la registra: la pantalla es de solo lectura. */
  comando: string;
}

/** El plazo corre mientras el hallazgo espera trabajo; si no corre, se dice por qué. */
export type VistaDePlazo =
  | {
      corre: true;
      estadoId: "en_plazo" | "vencido";
      etiqueta: Etiqueta;
      total: number;
      dias: number;
      atraso: number;
      vence: string;
      apertura: string;
      /** El id del nivel de severidad que fija el plazo. */
      severidad: string;
      /** «venció hace 17 días» / «vence el 2026-12-04». */
      frase: Bilingue;
    }
  | {
      corre: false;
      estadoId: "sin_plazo" | "no_corre";
      etiqueta: Etiqueta;
      razon: "sin_plazo" | "riesgo_aceptado" | "cerrado";
    };

export interface VistaDeRevision {
  etiqueta: Etiqueta;
  estadoId: "toca_revisar" | "programada";
  aceptadoEn: string;
  dias: number;
  total: number;
  fecha: string;
}

export interface VistaDeHallazgo {
  id: string;
  titulo: Bilingue;
  descripcion: Bilingue;
  estadoId: EstadoDeHallazgo;
  estado: Etiqueta;
  cuentaComoFalla: boolean;
  nivel: Etiqueta;
  nivelId: string;
  /** «CVSS 4.0 · 5.1» o «escala de IA». */
  escala: { tipo: "cvss"; puntaje: string } | { tipo: "escala_ia" };
  selector: ItemDeSelectorDeHallazgo[];
  avisos: {
    plazoVencido: null | {
      etiqueta: Etiqueta;
      nivel: Bilingue;
      total: number;
    };
    revisionVencida: null | { etiqueta: Etiqueta; dias: number };
  };
  cadena: EslabonDeCadena[];
  severidad: DetalleDeEscalaIa | DetalleDeCvss;
  control: {
    controles: { id: string; nombre: Bilingue }[];
    sinControl: Etiqueta;
    esperado: Bilingue;
    obtenido: { veredicto: Etiqueta; conteo: Bilingue };
  };
  acciones: {
    /** `cerrado` por re-prueba, o por eliminación o no reproducible: no hay nada que hacer. */
    nada: Bilingue | null;
    lista: AccionDeHallazgo[];
  };
  propiedades: {
    plazo: VistaDePlazo;
    revision: VistaDeRevision | null;
    abierto: string;
    activo: { id: string; nombre: Bilingue };
    prueba: { id: string; nombre: Bilingue; familia: Bilingue };
  };
  /** Nombre de la instantánea oficial y fecha de consulta: lo que lleva el pie del lateral. */
  instantanea: string;
  consulta: string;
}
