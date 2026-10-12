// Lo que las cinco pantallas de la brecha necesitan, ya calculado y serializable. Ninguna recalcula nada (design-system § 9,
// «una cuenta, un cálculo»): todo sale de `armarBrecha` y se nombra aquí con los textos del catálogo y de los datos.
import type { Totales } from "../../engine/brecha/calcular.ts";
import type { EstadoDeControl } from "../../engine/brecha/esquemas.ts";
import type { Bilingue, Etiqueta } from "../catalogo/tipos.ts";
import type {
  EslabonDeCadena,
  VistaDePlazo,
  VistaDeRevision,
} from "../evidencia/tipos.ts";

export type { Bilingue, Etiqueta, EstadoDeControl, Totales };

export interface ObjetoNombrado {
  id: string;
  nombre: Bilingue;
}

/** Un hallazgo como referencia: su identificador enlazado, su título, su severidad y su estado. */
export interface EnlaceAHallazgo {
  id: string;
  titulo: Bilingue;
  severidad: Etiqueta;
  nivel: string;
  estado: Etiqueta;
  estadoId: string;
}

/** La fecha de una evidencia con su edad, con el protocolo que vigila la matriz de envejecimiento (data-fechado…). */
export interface EvidenciaVista {
  fecha: string;
  dias: number;
  estado: "vigente" | "antigua";
  /** «Antigua», con su forma y su papel, si la evidencia pasó del umbral. */
  marca: Etiqueta | null;
}

/** Las tres marcas del desglose de lo planeado: superadas, fallidas y sin ejecutar. */
export interface MarcasDeVeredicto {
  superada: Etiqueta;
  fallida: Etiqueta;
  no_ejecutada: Etiqueta;
}

/** Lo que toda vista trae: de qué instantánea y de qué fecha habla, y cómo se dice «nada que mostrar». */
export interface BaseDeVista {
  instantanea: string;
  consulta: string;
  vacio: Etiqueta;
}

/** Una cifra de arriba: el valor, lo que dice y, si es un estado, su marca (símbolo, rol y color salen de datos). */
export interface Cifra {
  clave: string;
  valor: string;
  texto: Bilingue;
  marca: Etiqueta | null;
}

/** Una fila de «Pide tu atención» o de «Vencidos y alertas». */
export type FilaDeAlerta =
  | {
      clase: "plazo";
      id: string;
      tipo: Etiqueta;
      hallazgo: EnlaceAHallazgo;
      plazo: VistaDePlazo;
    }
  | {
      clase: "lote";
      id: string;
      tipo: Etiqueta;
      sobres: number;
      herramienta: string;
      fallidas: number;
    }
  | {
      clase: "revision";
      id: string;
      tipo: Etiqueta;
      hallazgo: EnlaceAHallazgo;
      revision: VistaDeRevision;
    }
  | {
      clase: "catalogo";
      id: string;
      tipo: Etiqueta;
      prueba: ObjetoNombrado;
      activo: Bilingue;
      ficha: { desde: string; dias: number; etiqueta: Etiqueta };
    }
  | {
      clase: "antigua";
      id: string;
      tipo: Etiqueta;
      prueba: ObjetoNombrado;
      activo: Bilingue;
      evidencia: EvidenciaVista;
    };

// ── Tablero ─────────────────────────────────────────────────────────────────────────────────────

export interface FilaDeActivoDeTablero {
  id: string;
  nombre: Bilingue;
  familias: Bilingue[];
  totales: Totales | null;
  hallazgos: EnlaceAHallazgo[];
  estado: Etiqueta;
}

export interface ComprobacionDeInstrumento {
  requisito: string;
  nombre: Bilingue;
  sembradas: number;
  obtenidas: number;
  pasa: boolean;
  estado: Etiqueta;
}

export interface VistaDeTablero extends BaseDeVista {
  cifras: Cifra[];
  validacion: {
    verde: boolean;
    sello: Etiqueta;
    verdes: number;
    total: number;
    comprobaciones: ComprobacionDeInstrumento[];
  };
  atencion: FilaDeAlerta[];
  /** La bandeja de propuestas llega con el investigador y el extractor: hoy no hay nada por decidir. */
  bandeja: Etiqueta;
  activos: FilaDeActivoDeTablero[];
  severidades: { id: string; etiqueta: Etiqueta; n: number }[];
  abiertos: { hallazgo: EnlaceAHallazgo; plazo: VistaDePlazo }[];
  aceptados: number;
  controles: { id: string; etiqueta: Etiqueta; n: number }[];
  catalogo: { total: number; filas: { etiqueta: Etiqueta; n: number }[] };
}

// ── Brecha ──────────────────────────────────────────────────────────────────────────────────────

export interface FilaDeCoberturaPorActivo {
  id: string;
  nombre: Bilingue;
  plan: { huella: string; fecha: string } | null;
  totales: Totales | null;
  estado: Etiqueta;
}

export interface FilaDeCoberturaPorFamilia {
  id: string;
  nombre: Bilingue;
  totales: Totales;
}

export interface FilaDeCoberturaPorControl {
  id: string;
  nombre: Bilingue;
  totales: Totales;
  estado: Etiqueta;
  estadoId: EstadoDeControl;
}

export interface FilaDeEsperadoObtenido {
  prueba: ObjetoNombrado;
  activo: ObjetoNombrado;
  familia: ObjetoNombrado;
  esperado: Bilingue;
  veredicto: Etiqueta;
  veredictoId: string;
  obtenido: {
    sobre: string | null;
    evidencia: EvidenciaVista | null;
    conteo: Bilingue | null;
    /** Un sobre propuesto de esta prueba: se ve, pero no cuenta todavía. */
    propuesto: { sobre: string; lote: string | null; sugiere: Bilingue } | null;
  };
  desviacion: Bilingue;
  hallazgo: EnlaceAHallazgo | null;
}

export interface VistaDeBrecha extends BaseDeVista {
  veredictos: MarcasDeVeredicto;
  activosConPlan: number;
  activosTotal: number;
  cifras: Cifra[];
  porConfirmar: { sobres: number; lotes: number; sello: Etiqueta };
  porActivo: FilaDeCoberturaPorActivo[];
  porFamilia: FilaDeCoberturaPorFamilia[];
  porControl: FilaDeCoberturaPorControl[];
  sinControl: string[];
  filas: FilaDeEsperadoObtenido[];
  filtros: {
    activos: ObjetoNombrado[];
    veredictos: { id: string; etiqueta: Etiqueta }[];
  };
  alertas: FilaDeAlerta[];
  marcos: Etiqueta;
}

// ── Vista por control ───────────────────────────────────────────────────────────────────────────

export interface FilaDeControlDeLista {
  id: string;
  nombre: Bilingue;
  area: { id: string; nombre: Bilingue };
  totales: Totales;
  ultima: EvidenciaVista | null;
  fallas: EnlaceAHallazgo[];
  estado: Etiqueta;
  estadoId: EstadoDeControl;
}

export interface PruebaSinControlDeLista {
  id: string;
  nombre: Bilingue;
  activo: Bilingue;
  familia: Bilingue;
  veredicto: Etiqueta;
  veredictoId: string;
}

export interface VistaDeControles extends BaseDeVista {
  veredictos: MarcasDeVeredicto;
  norma: string;
  capa: Bilingue;
  cifras: Cifra[];
  controles: FilaDeControlDeLista[];
  sinControl: PruebaSinControlDeLista[];
}

export interface FilaDePruebaDeControl {
  prueba: ObjetoNombrado;
  activo: Bilingue;
  veredicto: Etiqueta;
  veredictoId: string;
  conteo: Bilingue | null;
  repruebaDe: string | null;
  hallazgo: { enlace: EnlaceAHallazgo; plazo: VistaDePlazo | null } | null;
  sinPlazo: boolean;
  sobre: {
    id: string;
    evidencia: EvidenciaVista;
    huella: string;
    confirmadaPor: string;
    confirmadaEl: string;
  } | null;
}

export interface EquivalenteVista {
  marco: string;
  referencia: string;
  fuente: { sitio: string; consultada: string };
  incompleto: { etiqueta: Etiqueta; nota: Bilingue | null } | null;
}

export type AccionDeControl =
  | { tipo: "hallazgo"; hallazgo: string }
  | { tipo: "aceptado" }
  | { tipo: "plan"; activo: string }
  | { tipo: "catalogo" }
  | { tipo: "carga"; sinResultado: number; total: number };

export interface VistaDeControl extends BaseDeVista {
  veredictos: MarcasDeVeredicto;
  /** La marca de una confirmación humana (símbolo y rol), del vocabulario de estados. */
  firma: Etiqueta;
  id: string;
  nombre: Bilingue;
  norma: string;
  capa: Bilingue;
  selector: { id: string; estado: Etiqueta; actual: boolean }[];
  cifras: Cifra[];
  sello: { estado: Etiqueta; estadoId: EstadoDeControl; frase: Bilingue };
  pruebas: FilaDePruebaDeControl[];
  /** Si ningún plan lo cubre: las pruebas del catálogo que lo harían. */
  delCatalogo: ObjetoNombrado[];
  cadenas: {
    hallazgo: EnlaceAHallazgo;
    plazo: VistaDePlazo | null;
    cadena: EslabonDeCadena[];
  }[];
  accion: AccionDeControl;
  propiedades: {
    area: { id: string; nombre: Bilingue };
    pruebasEnPlanes: number;
    conResultado: number;
    activos: ObjetoNombrado[];
    ultima: EvidenciaVista | null;
  };
  equivalentes: EquivalenteVista[];
}

// ── Informe ─────────────────────────────────────────────────────────────────────────────────────

export interface FilaDeHallazgoDeInforme {
  hallazgo: EnlaceAHallazgo;
  activo: Bilingue;
  prueba: string;
  tiempo:
    | { tipo: "plazo"; plazo: VistaDePlazo }
    | { tipo: "revision"; revision: VistaDeRevision }
    | { tipo: "cerrado"; fecha: string; sobre: string | null };
}

export interface FilaDeControlDeInforme {
  id: string;
  nombre: Bilingue;
  estado: Etiqueta;
  estadoId: EstadoDeControl;
  ultima: EvidenciaVista | null;
  conSobre: number;
}

export interface VistaDeInforme extends BaseDeVista {
  veredictos: MarcasDeVeredicto;
  huellaDelInforme: string;
  resumen: {
    frase: Bilingue;
    cifras: Cifra[];
    decidir: Bilingue[];
  };
  porFamilia: FilaDeCoberturaPorFamilia[];
  controlesCobertura: {
    id: string;
    nombre: Bilingue;
    totales: Totales;
  }[];
  filas: FilaDeEsperadoObtenido[];
  hallazgosPorEstado: { etiqueta: Etiqueta; n: number }[];
  hallazgos: FilaDeHallazgoDeInforme[];
  controles: FilaDeControlDeInforme[];
  alertas: FilaDeAlerta[];
  marcos: Etiqueta;
  riesgos: {
    hallazgo: EnlaceAHallazgo;
    justificacion: Bilingue;
    revision: VistaDeRevision;
  }[];
  ficha: {
    huellaDelCatalogo: string;
    planes: { activo: ObjetoNombrado; huella: string; fecha: string }[];
    sobresQueCuentan: number;
    sobresEnElLibro: number;
    instrumento: {
      verde: boolean;
      etiqueta: Etiqueta;
      verdes: number;
      total: number;
    };
  };
  activos: { id: string; nombre: Bilingue; conPlan: boolean }[];
}
