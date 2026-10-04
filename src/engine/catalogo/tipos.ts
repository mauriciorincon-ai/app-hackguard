// La entrada del motor del catálogo: los archivos de `datos/` como texto, con su ruta. El motor no lee
// disco (corre igual en Node y en un navegador): quien lo llama le pasa los textos, y el motor los parsea,
// los valida y los ordena por id, así que el orden en que llegaron no cambia el resultado.

export interface ArchivoDeDatos {
  /** Ruta relativa a la raíz del repo con «/», p. ej. `datos/marcos/cwe.json`. */
  ruta: string;
  texto: string;
}

export interface CatalogoEnBruto {
  familias: ArchivoDeDatos | null;
  reglas_de_veredicto: ArchivoDeDatos | null;
  rasgos: ArchivoDeDatos | null;
  filtro: ArchivoDeDatos | null;
  marcos: ArchivoDeDatos[];
  equivalencias: ArchivoDeDatos[];
  controles: ArchivoDeDatos[];
  herramientas: ArchivoDeDatos[];
  pruebas: ArchivoDeDatos[];
}

/** Los archivos únicos del catálogo y dónde viven. */
export const RUTAS_UNICAS = {
  familias: "datos/familias.json",
  reglas_de_veredicto: "datos/reglas-de-veredicto.json",
  rasgos: "datos/rasgos-de-perfil.json",
  filtro: "datos/filtro/patrones.json",
} as const;

/** Las carpetas con un archivo por entidad. `datos/pruebas/` se recorre con sus subcarpetas por familia. */
export const CARPETAS = {
  marcos: "datos/marcos",
  equivalencias: "datos/marcos/equivalencias",
  controles: "datos/controles",
  herramientas: "datos/herramientas",
  pruebas: "datos/pruebas",
} as const;
