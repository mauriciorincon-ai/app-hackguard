// La vista de «Marcos y versiones»: lo que la pantalla necesita de la instantánea oficial, ya calculado y serializable. Misma
// cuenta que el catálogo (design-sync § 9): la vigencia de un marco sale de `semaforoDe`, no se recalcula aquí. Función pura.
// Lo que la maqueta dibujó con datos ilustrativos y la instantánea no trae (una versión más nueva publicada por la fuente,
// los nombres de las entradas de cada versión, la historia de instantáneas) no se inventa: se dice que no hay registro.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { avisosDeMarco } from "../propuestas/avisos.ts";
import {
  SIN_PROPUESTAS,
  type ResumenDePropuestas,
} from "../propuestas/resumen.ts";
import type { AvisoDeMarco } from "../propuestas/tipos.ts";
import type { Bilingue, Etiqueta, VigenciaVista } from "./tipos.ts";
import { etiqueta, porId, semaforoDe, vigenciaVista } from "./vista.ts";

/** Los tres cambios que el mapa de equivalencias registra entre una versión y la siguiente. */
export const CAMBIOS: Record<string, Bilingue> = {
  numero: { es: "Cambia de número", en: "Renumbered" },
  nombre: { es: "Cambia de nombre", en: "Renamed" },
  alcance: { es: "Cambia de alcance", en: "Scope changed" },
};
export const SE_MANTIENE: Bilingue = { es: "Se mantiene", en: "Unchanged" };
export const SIN_EQUIVALENTE: Bilingue = {
  es: "Sin equivalente directo",
  en: "No direct equivalent",
};

// Estados que son dato de un marco y no están en el vocabulario `datos/estados.json` (deuda del lote del hito, como las
// etiquetas locales del S2): que su fuente oficial no la pueda leer el agente, y que nadie haya registrado un aviso.
export const FUENTE_NO_ACCESIBLE: Etiqueta = {
  rol: "atencion",
  simbolo: "aviso",
  nombre: {
    es: "Fuente no accesible al agente",
    en: "Source not reachable by the agent",
  },
};

export interface FilaDeMarco {
  id: string;
  nombre: string;
  editor: string;
  familias: Bilingue[];
  version: string;
  fechaVersion: string | null;
  /** `true` cuando el dato declara esa fecha «por verificar» (ISO/IEC 42001: el usuario no tiene el texto de la norma). */
  fechaPorVerificar: boolean;
  vigencia: VigenciaVista;
  /** Cuántas pruebas del catálogo lo citan. */
  citan: number;
  /** Etiqueta cuando su fuente oficial no se pudo leer; `null` si se verificó. */
  fuente: Etiqueta | null;
  /** La versión nueva que una propuesta del investigador dice que publica la fuente, si la hay. */
  aviso: AvisoDeMarco | null;
  licencia: { nombre: Bilingue; exige: Bilingue };
}

export interface ParDelMapa {
  desde: string;
  hacia: string[];
  /** Qué cambió, uno por cada cambio registrado (vacío = se mantiene). */
  cambios: Bilingue[];
  nota: Bilingue | null;
  /** Pruebas del catálogo que citan la entrada nueva (en la versión nueva del marco). */
  citadaPor: string[];
}

export interface MapaDeEquivalencias {
  id: string;
  marco: string;
  desde: string;
  hasta: string;
  pares: ParDelMapa[];
  /** Entradas de la versión anterior sin equivalente directo. */
  sinEquivalente: number;
  notas: Bilingue | null;
}

export interface InstantaneaListada {
  nombre: string;
  fecha: string;
  pruebas: number;
  huella: string;
}

export interface VistaDeMarcos {
  /** Los avisos de versión (RF-05.5): lo que dicen las propuestas del investigador, nunca una comparación a ciegas. */
  avisos: AvisoDeMarco[];
  /** La corrida del investigador que respalda «sin avisos», o `null` si ninguna corrió. */
  investigacion: { corrida: string; fecha: string } | null;
  etiquetaDeAviso: Etiqueta;
  instantanea: string;
  huella: string;
  consulta: string;
  filas: FilaDeMarco[];
  mapas: MapaDeEquivalencias[];
  instantaneas: (InstantaneaListada & { oficial: boolean })[];
}

type Catalogo = Instantanea["catalogo"];

function mapas(c: Catalogo): MapaDeEquivalencias[] {
  return c.equivalencias.map((m) => ({
    id: m.id,
    marco: porId(c.marcos, m.marco_id).nombre,
    desde: m.desde,
    hasta: m.hacia,
    pares: m.pares.map((p) => ({
      desde: p.desde,
      hacia: p.hacia,
      cambios: p.cambios.map((x) => CAMBIOS[x] ?? { es: x, en: x }),
      nota: p.nota ?? null,
      citadaPor: c.pruebas
        .filter(
          (t) =>
            t.marco_id === m.marco_id &&
            t.version_marco === m.hacia &&
            p.hacia.includes(t.referencia_en_marco),
        )
        .map((t) => t.id),
    })),
    sinEquivalente: m.pares.filter((p) => p.hacia.length === 0).length,
    notas: m.notas ?? null,
  }));
}

export function construirVistaDeMarcos(
  i: Instantanea,
  nombre: string,
  consulta: string,
  listadas: readonly InstantaneaListada[],
  propuestas: { resumen: ResumenDePropuestas; etiquetaDeAviso: Etiqueta },
): VistaDeMarcos {
  const c = i.catalogo;
  const s = semaforoDe(i, consulta);
  const avisos = avisosDeMarco(
    propuestas.resumen.avisos,
    (id) => porId(c.marcos, id).nombre,
  );
  return {
    avisos,
    investigacion: propuestas.resumen.investigacion,
    etiquetaDeAviso: propuestas.etiquetaDeAviso,
    instantanea: nombre,
    huella: i.huella,
    consulta,
    filas: c.marcos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      editor: m.editor,
      familias: m.familias_aplicables.map((f) => porId(c.familias, f).nombre),
      version: m.version_vigente,
      fechaVersion: m.fecha_version ?? null,
      fechaPorVerificar: m.por_verificar.includes("fecha_version"),
      vigencia: vigenciaVista(
        c,
        s.marcos.find((v) => v.id === m.id)!,
      ),
      citan: c.pruebas.filter((p) => p.marco_id === m.id).length,
      fuente: m.estado === "verificado" ? null : { ...FUENTE_NO_ACCESIBLE },
      aviso: avisos.find((a) => a.marco === m.id) ?? null,
      licencia: { nombre: m.licencia.nombre, exige: m.licencia.exige },
    })),
    mapas: mapas(c),
    instantaneas: listadas.map((l) => ({
      ...l,
      oficial: l.nombre === nombre,
    })),
  };
}

// `etiqueta` se reexporta para que la pantalla de marcos pida los estados del vocabulario por el mismo camino que el catálogo.
export { etiqueta };
