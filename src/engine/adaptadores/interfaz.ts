// La interfaz común de los adaptadores (C14, regla 19): lo único que un adaptador hace es TRADUCIR el archivo de una
// herramienta a lo que midió, por selector. El veredicto lo calcula la regla de la prueba (ADR-008), el sobre lo arma
// `armarSobre` y las huellas las pone el núcleo: un adaptador nuevo es un archivo más y una entrada en el registro.
//
// Frontera de contenido (reglas duras 3 y 4): el adaptador lee el archivo de la herramienta —que trae cargas de ataque,
// rutas locales y cuerpos de peticiones— y entrega SOLO conteos y un extracto que él mismo escribe con números e
// identificadores. Ningún texto de la herramienta pasa al resultado.
import type { z } from "zod";
import type { Selector as EsquemaDeSelector } from "../catalogo/esquemas.ts";
import type { Resultado } from "../evidencia/esquemas.ts";

export type Selector = z.infer<typeof EsquemaDeSelector>;

export type TextoBilingue = { es: string; en: string };

/** Por qué un adaptador no leyó el archivo: el lote no se arma. */
export const MOTIVOS_DE_NO_LEER = [
  "no_es_el_formato",
  "version_incoherente",
  "version_no_comparable",
  "version_menor_que_la_minima",
  "campo_ausente",
  "conteos_no_cuadran",
  "sin_resultados",
] as const;
export type MotivoDeNoLeer = (typeof MOTIVOS_DE_NO_LEER)[number];

/** Lo que la corrida midió para UN selector del plan. */
export type MedidaDeSelector =
  | {
      tipo: "medido";
      resultado: Resultado;
      /** Números e identificadores, nunca texto de la herramienta. */
      extracto: string;
      advertencias: TextoBilingue[];
    }
  /** La prueba no es de esta herramienta o su selector no es de este adaptador. */
  | { tipo: "no_aplica" };

export interface Corrida {
  herramienta: { id: string; version: string };
  /** AAAA-MM-DD si el reporte la trae. */
  fecha: string | null;
  /** HH:MM si el reporte la trae. */
  hora: string | null;
  /** Zona del reporte si la declara (ZAP: «UTC» en `created`); garak no la trae. */
  zonaHoraria: string | null;
  advertencias: TextoBilingue[];
  medir(selector: Selector): MedidaDeSelector;
}

export type LecturaDeAdaptador =
  | { ok: true; corrida: Corrida }
  | { ok: false; motivo: MotivoDeNoLeer; detalle: string };

export interface Adaptador {
  /** `garak-report-jsonl`, `zap-traditional-json`. */
  id: string;
  /** Versión del adaptador: viaja en el lote para poder reproducir la conversión (E-8). */
  version: string;
  /** La herramienta del paquete cuyo archivo lee. */
  herramienta: string;
  /** El rango de versiones de la herramienta que se probó contra su serializador real. */
  rangoProbado: { desde: string; hasta: string };
  /** Lee los bytes ya decodificados. No toca el disco ni el reloj. */
  leer(texto: string, minima: string | null): LecturaDeAdaptador;
}

export const advertencia = (es: string, en: string): TextoBilingue => ({
  es,
  en,
});
