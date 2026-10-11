// La vista del catálogo: lo que la pantalla necesita de la instantánea oficial, ya calculado y serializable. Las
// pantallas no recalculan nada (design-system § 9, «una cuenta, un cálculo»): lo que varias muestran sale de aquí.
export interface Bilingue {
  es: string;
  en: string;
}

/** Símbolo, papel de color y nombre de un estado, leídos del vocabulario `datos/estados.json` (regla dura 12). */
export interface Etiqueta {
  rol: string;
  simbolo: string;
  nombre: Bilingue;
}

export type EstadoDeVigencia = "vigente" | "por_revisar" | "vencido";

export interface VigenciaVista {
  estado: EstadoDeVigencia;
  dias: number;
  /** Fecha de la última verificación (AAAA-MM-DD). */
  desde: string;
  etiqueta: Etiqueta;
}

export type Revision = "limpia" | "marcada_para_revision";

export interface FilaDePrueba {
  id: string;
  nombre: Bilingue;
  queVerifica: Bilingue;
  familia: string;
  familiaNombre: Bilingue;
  /** Nombre de la herramienta con la que se mide (un nombre propio: no cambia con el idioma). */
  herramienta: string;
  /** Identificador de esa herramienta: lo que lee el filtro «herramienta» (la fila muestra el nombre). */
  herramientaId: string;
  repeticiones: Bilingue;
  marcoId: string;
  /** «OWASP … 2025 · A05»: marco, versión que cita la prueba y su referencia. */
  marco: string;
  controles: string[];
  vigencia: VigenciaVista;
  madurez: string;
  madurezNombre: Bilingue;
  revision: Revision;
}

export interface OpcionDeFiltro {
  valor: string;
  /** Un texto por idioma, o un identificador que no cambia con el idioma. */
  texto: Bilingue | string;
}

export type CampoDeLista =
  "marco" | "control" | "herramienta" | "madurez" | "vigencia" | "revision";

export interface ListaDeFiltro {
  campo: CampoDeLista;
  rotulo: Bilingue;
  opciones: OpcionDeFiltro[];
}

export interface CifraDeVigencia {
  etiqueta: Etiqueta;
  n: number;
}

export interface FilaDeFamilia {
  id: string;
  nombre: Bilingue;
  pruebas: number;
  /** El estado de su prueba más atrasada, o «sin pruebas publicadas» (vocabulario `familia`, AU-14) si no tiene ninguna. */
  estado: Etiqueta;
  dias: number | null;
  desde: string | null;
  desglose: { etiqueta: Etiqueta; n: number }[];
}

export interface VistaDeCatalogo {
  /** Nombre de la instantánea oficial que se lee, sin extensión. */
  instantanea: string;
  huella: string;
  consulta: string;
  total: number;
  totalDeFamilias: number;
  cifras: CifraDeVigencia[];
  familias: OpcionDeFiltro[];
  listas: ListaDeFiltro[];
  filas: FilaDePrueba[];
  panel: FilaDeFamilia[];
  /** Pruebas que esperan revisión (no están publicadas en la instantánea) y por qué. */
  pendientes: { id: string; etiqueta: Etiqueta }[];
}

export interface ControlDeFicha {
  id: string;
  nombre: Bilingue;
}

export interface FuenteDeFicha {
  nombre: string;
  /** Quién la publica, o «documentación oficial» cuando la herramienta no la tiene propia. */
  donde: string | Bilingue;
  vigencia: VigenciaVista;
}

export interface FichaDePrueba {
  id: string;
  nombre: Bilingue;
  queVerifica: Bilingue;
  porQueImporta: Bilingue;
  resultadoEsperado: Bilingue;
  familia: Bilingue;
  madurez: Bilingue;
  prioridadBase: number;
  aprobadaEl: string;
  vigencia: VigenciaVista;
  /** Los umbrales de vigencia, para los avisos (la cifra que envejece vive solo en `vigencia`). */
  umbrales: { por_revisar: number; vencido: number };
  marcada: boolean;
  regla: { id: string; decide: Bilingue; sinEjecucion: Bilingue };
  repeticiones: {
    k: number | null;
    cotaPorCiento: number | null;
    descripcion: Bilingue;
  };
  corrida: {
    herramienta: string;
    licencia: string | null;
    vigencia: VigenciaVista;
    conAdaptador: boolean;
    versionMinima: string | null;
    selector: {
      texto: string | null;
      revision: Bilingue | null;
      detectores: string | null;
      agregacion: string | null;
    };
  };
  aplicabilidad: {
    descripcion: Bilingue;
    condiciones: { rasgo: Bilingue; valor: Bilingue | string }[];
  };
  marco: {
    nombre: string;
    version: string;
    referencia: string;
    vigencia: VigenciaVista;
  };
  controles: ControlDeFicha[];
  fuentes: FuenteDeFicha[];
  /** Fuentes que la propia ficha cita (título y fecha de consulta). */
  citas: { titulo: string; consultada: string }[];
}
