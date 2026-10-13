// La vista de la bandeja de propuestas: lo que la pantalla necesita ya calculado y serializable. Nada se recalcula en el componente
// (design-system § 9): los estados salen del motor (`bandeja`, `porDecidir`), los nombres de `datos/propuestas/etiquetas.json` y del
// vocabulario de estados del catálogo.
import type { EstadoDeBandeja } from "../../engine/propuestas/decisiones.ts";
import type { Bilingue, Etiqueta } from "../catalogo/tipos.ts";

export type { Bilingue, Etiqueta };

export type AgenteDePropuesta = "investigador" | "extractor";
/** Lo que una persona puede decidir sobre una propuesta de la bandeja. */
export type DecisionDeBandeja =
  "aprobar" | "aprobar_tras_revisar" | "rechazar" | "separar";
export type AsociacionDeSobre = "una" | "alternativas" | "mezcla";

/** Una marca del filtro: dónde la encontró y qué patrón (del dato) la dio. */
export interface MarcaVista {
  campo: string;
  patron: string;
}

/** Lo que una decisión ya provocó: el sobre por confirmar, la prueba escrita, o el veredicto que la persona corrigió (R5). */
export interface EfectoVista {
  sobre: string | null;
  prueba: string | null;
  corregido: { de: Etiqueta; a: Etiqueta } | null;
}

export interface FuenteVista {
  nombre: string;
  /** El día en que el investigador leyó la página. */
  leida: string;
  /** Si la página la aportó una persona porque el agente no pudo leerla (RF-07.2b): quién y cuándo. */
  aportada: { por: string; fecha: string } | null;
  /** Dónde está la fuente (sitio oficial, registro…), si la propuesta lo dice. */
  donde: Bilingue | null;
  url: string;
  etiqueta: Etiqueta;
  verificada: boolean;
  /** Por qué no se pudo verificar; solo cuando no se verificó. */
  detalle: Bilingue | null;
}

export interface CitaVista {
  campo: string;
  etiqueta: Etiqueta;
  verificada: boolean;
  texto: string;
}

export interface VeredictoVista {
  etiqueta: Etiqueta;
  regla: string;
  /** Lo que la regla leyó de los campos verificados. */
  evaluadas: number | null;
  fallidas: number | null;
  /** Cómo decide la regla, con las palabras del catálogo. */
  decide: Bilingue | null;
}

export interface CandidataVista {
  prueba: string;
  nombre: Bilingue;
  razon: Bilingue | null;
  veredicto: VeredictoVista | null;
  /** Por qué no hay veredicto, si no lo hay. */
  sinVeredicto: Bilingue | null;
  enElPlan: boolean;
  citas: { verificadas: number; total: number; detalle: CitaVista[] };
}

export interface SobreVista {
  activo: {
    id: string;
    nombre: Bilingue;
    /** La huella del plan emitido, o `null` si el activo no tiene plan. */
    plan: string | null;
    ruta: string;
  };
  asociacion: AsociacionDeSobre;
  candidatas: CandidataVista[];
  /** Las citas de todas las candidatas: cuántas verificó el código. La marca es la de «cita verificada» si todas, o la de aviso si no. */
  citas: { verificadas: number; total: number; etiqueta: Etiqueta };
  texto: { huella: string; caracteres: number; extracto: string };
}

export interface MotivoVista {
  etiqueta: Etiqueta;
  /** El umbral que no se cumplió, si el motivo es de un umbral. */
  umbral: number | null;
}

export interface FilaDePropuesta {
  id: string;
  /** La propuesta de la que sale (la misma, salvo en una hija de un texto separado). */
  padre: string;
  origen: AgenteDePropuesta;
  origenNombre: Bilingue;
  tipo:
    "prueba_nueva" | "version_de_marco" | "retiro" | "herramienta" | "sobre";
  tipoNombre: Bilingue;
  fecha: string;
  corrida: string;
  titulo: Bilingue;
  resumen: Bilingue;
  estado: EstadoDeBandeja;
  etiquetaDeEstado: Etiqueta;
  decidida: {
    por: string;
    fecha: string;
    motivo: string | null;
    efecto: EfectoVista | null;
  } | null;
  fuentes: FuenteVista[];
  marcaDeContenido: boolean;
  marcaDeInstruccion: boolean;
  /** Los patrones que dieron cada marca, para que la persona vea por qué (el aviso solo dice que la hay). */
  marcas: { contenido: MarcaVista[]; instruccion: MarcaVista[] };
  motivos: MotivoVista[];
  sobre: SobreVista | null;
  /** Lo que una versión de marco, un retiro o una herramienta cambia: una frase con sus datos. */
  cambio: Bilingue | null;
  separable: boolean;
  /** Las decisiones que ofrece: vacío si ya está decidida. */
  decisiones: DecisionDeBandeja[];
  /** Aprobarla escribiría en datos de demostración: el comando lleva `--aplicar-a-demo`. */
  pideBanderaDeDemo: boolean;
  /** Qué pasa al aprobar, con palabras. */
  alAprobar: Bilingue;
  /** Con un conteo sin verificar, aprobar pide que la persona lo corrija a mano. */
  pideConteoAMano: boolean;
}

export interface CorridaVista {
  id: string;
  agente: AgenteDePropuesta;
  fecha: string;
  alcance: Bilingue;
  modelo: string;
  reintentos: number;
  /** Páginas consultadas (solo el investigador consulta). */
  consultadas: number;
  noAccesibles: { nombre: string; razon: Bilingue }[];
  contradicciones: Bilingue[];
  propuestas: number;
  /** Lo que costó la corrida (latencia, tokens y los nodos que visitó); `null` si no lo midió. */
  ejecucion: {
    latenciaS: number | null;
    tokens: number | null;
    nodos: string[];
  } | null;
  huella: string;
  /** Las reglas del plan (C1 a C5) que esta corrida cumple, de cuántas. */
  criterios: { cumplen: number; total: number };
  lugar: "demo" | "real";
}

export interface VistaDePropuestas {
  instantanea: string;
  consulta: string;
  cifras: { porDecidir: number; sinVerificar: number; marcadas: number };
  /** Cómo se nombran (y con qué marca) las dos cifras que son un estado. */
  etiquetasDeCifras: { sinVerificar: Etiqueta; marcadas: Etiqueta };
  /** El nombre y la marca de los dos avisos de un panel marcado. */
  etiquetasDeMarcas: { contenido: Etiqueta; instruccion: Etiqueta };
  total: number;
  origenes: { valor: "" | AgenteDePropuesta; nombre: Bilingue }[];
  filas: FilaDePropuesta[];
  corridas: CorridaVista[];
  /** Corridas que no se pudieron leer (esquema o huella): no se muestran para aprobar. */
  ilegibles: { ruta: string; detalle: string; etiqueta: Etiqueta }[];
  vacio: boolean;
}

/** Un marco cuya fuente oficial publica una versión distinta de la del catálogo (RF-05.5), según una propuesta del investigador. */
export interface AvisoDeMarco {
  marco: string;
  nombre: string;
  vigente: string;
  publicada: string;
  fecha: string;
  propuesta: string;
  fuentes: number;
  verificadas: number;
  /** La propuesta en la bandeja, donde la decide una persona. */
  ruta: string;
}
