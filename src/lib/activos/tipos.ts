// La vista de los activos y sus planes: lo que las dos pantallas necesitan, ya calculado y serializable. Las
// pantallas no recalculan nada (design-system § 9, «una cuenta, un cálculo»): el plan lo calculó el motor, se
// emitió con huella y aquí solo se lee, se ordena y se nombra.
import type { Bilingue, Etiqueta, VigenciaVista } from "../catalogo/tipos.ts";

export type { Bilingue, Etiqueta, VigenciaVista };

export interface ItemDeSelector {
  id: string;
  nombre: Bilingue;
  estado: Etiqueta;
  actual: boolean;
}

/** Lo que las dos pantallas comparten: quién es el activo y en qué estado está su plan. */
export interface CabeceraDeActivo {
  id: string;
  nombre: Bilingue;
  descripcion: Bilingue;
  estado: Etiqueta;
  autorizado: boolean;
  selector: ItemDeSelector[];
  /** Nombre de la instantánea oficial y fecha de consulta: lo que lleva el pie del lateral. */
  instantanea: string;
  consulta: string;
}

export interface VistaDeActivo extends CabeceraDeActivo {
  dueno: { nombre: Bilingue; nota: Bilingue };
  proveedor: null | {
    nombre: Bilingue;
    provee: Bilingue;
    politica: Bilingue | null;
    fuente: Bilingue | null;
    vigencia: VigenciaVista | null;
  };
  perfil: {
    pila: Bilingue;
    modelos: Bilingue;
    exposicion: Bilingue;
    datos: Bilingue;
    autenticacion: Bilingue;
    acceso: Bilingue;
    canales: Bilingue[];
    acciones: Bilingue[];
  };
  alcance: null | {
    incluye: Bilingue[];
    excluye: Bilingue[];
    ventana: Bilingue;
    limites: Bilingue;
  };
  reglas: null | { texto: Bilingue; citaProveedor: boolean }[];
  familias: Bilingue[];
  /** El plan emitido, o `null` si el activo no está autorizado. */
  plan: null | { huella: string; fecha: string };
  /** La plantilla para activos propios: solo se muestra donde falta la autorización. */
  plantilla: { alcance: Bilingue[]; reglas: Bilingue[] };
  etiquetas: {
    autorizado: Etiqueta;
    sinAutorizacion: Etiqueta;
    faltaAutorizacion: Etiqueta;
    sinDeclarar: Etiqueta;
    politicaSinLeer: Etiqueta;
  };
}

export interface FilaPlaneada {
  id: string;
  nombre: Bilingue;
  esperado: Bilingue;
  /** Por qué aplica; `null` si el operador la agregó. */
  razon: Bilingue | null;
  agregada: null | { justificacion: Bilingue };
  prioridad: {
    base: number;
    final: number;
    ajuste: number;
    /** Las razones de los ajustes que aplicaron. */
    razones: Bilingue[];
  };
  herramienta: null | {
    id: string;
    nombre: string;
    entorno: Bilingue;
    k: number | null;
    vigencia: VigenciaVista;
  };
  controles: string[];
}

export interface FilaExcluida {
  id: string;
  nombre: Bilingue;
  motivo: string;
  etiqueta: Etiqueta;
  razon: Bilingue;
  /** «El perfil no declara esta condición:» para el motivo `perfil`; nulo en los otros. */
  introduce: Bilingue | null;
}

export interface FilaDeCobertura {
  control: string;
  resumen: Bilingue;
  pruebas: string[];
}

export interface CajaDelPaquete {
  clave: string;
  nombre: string;
  versionMinima: string | null;
  entorno: Bilingue;
  adaptador: boolean;
  pruebas: {
    id: string;
    selector: Bilingue | string;
    k: number | null;
    regla: Bilingue;
  }[];
}

export interface VistaDePlan extends CabeceraDeActivo {
  /** `null` si el activo no está autorizado: la página dice por qué y qué hacer. */
  plan: null | {
    huella: string;
    fecha: string;
    instantanea: { nombre: string; huella: string; fecha: string };
    paquete: { huella: string; href: string };
    resumen: {
      planeadas: number;
      excluidas: number;
      conPrueba: number;
      sinPrueba: number;
      otrasFamilias: number;
      planeadasSinControl: number;
    };
    planeadas: FilaPlaneada[];
    excluidas: FilaExcluida[];
    cobertura: FilaDeCobertura[];
    paquetes: CajaDelPaquete[];
    alcance: { ventana: Bilingue; limites: Bilingue };
    reglas: Bilingue[];
  };
  etiquetas: {
    sinAutorizacion: Etiqueta;
    sinPlan: Etiqueta;
    autorizado: Etiqueta;
    agregada: Etiqueta;
    sinPruebaCorto: Etiqueta;
    resumenConPrueba: Etiqueta;
    resumenSinPrueba: Etiqueta;
    conPrueba: Etiqueta;
  };
}
