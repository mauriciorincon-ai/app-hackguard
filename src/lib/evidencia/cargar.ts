// Carga los sobres y los hallazgos demo del build y los comprueba contra el libro y la instantánea oficial. Se ejecuta en
// el build (Node), jamás en el navegador. Si algo no cuadra (una huella de sobre que no es la de su contenido, un
// hallazgo cuyo sobre de origen no cuenta, un vector CVSS incompleto), lanza: más vale un build roto que una pantalla
// que muestra una cadena de cierre que nadie puede reproducir. Solo lee lo versionado (demo): lo propio, ignorado por
// git, no sale del CLI de quien lo registró (regla dura 8).
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { SobreEfectivo } from "../../engine/evidencia/esquemas.ts";
import type {
  EtiquetasDeHallazgo,
  Hallazgo,
  Plazos,
} from "../../engine/hallazgos/esquemas.ts";
import type {
  EtiquetasDeCarga,
  Lote,
  PlanDeMuestreo,
} from "../../engine/lotes/esquemas.ts";
import {
  revisionDelLote,
  type RevisionDelLote,
} from "../../engine/lotes/revision.ts";
import type { EscalaIa } from "../../engine/severidad/escala-ia.ts";
import type { EtiquetasDeCvss } from "../../engine/severidad/etiquetas-cvss.ts";
import {
  cargarEscalaIa,
  cargarEtiquetasDeCarga,
  cargarEtiquetasDeCvss,
  cargarEtiquetasDeHallazgo,
  cargarPlazos,
} from "./cargar-evidencia.ts";
import { cargarLibroValidado } from "./cargar-libro.ts";

export interface MundoDeHallazgos {
  /**
   * Todos los sobres válidos, confirmados o no (una propuesta se ve, pero no cuenta), con la confirmación que cuenta: la de
   * su archivo o la de su lote confirmado (el libro efectivo, ADR-009).
   */
  libro: SobreEfectivo[];
  /** Los lotes demo válidos, por identificador: lo que la pantalla de carga muestra. */
  lotes: Lote[];
  /** El plan de muestreo (E-5), ya comprobado con aritmética exacta. */
  muestreo: PlanDeMuestreo;
  /** Qué revisa una persona de cada lote (id del lote → todas las que fallan y la muestra): una cuenta, la del motor. */
  revisiones: Record<string, RevisionDelLote>;
  etiquetasDeCarga: EtiquetasDeCarga;
  hallazgos: Hallazgo[];
  escala: EscalaIa;
  plazos: Plazos;
  etiquetas: EtiquetasDeHallazgo;
  cvss: EtiquetasDeCvss;
}

export async function cargarHallazgosDelBuild(
  instantanea: Instantanea,
  raiz: string = process.cwd(),
): Promise<MundoDeHallazgos> {
  const L = await cargarLibroValidado(raiz, instantanea, { privados: false });
  for (const [nombre, v] of [
    ["los sobres", L.sobres],
    ["los hallazgos", L.hallazgos],
    ["los lotes", L.lotes],
  ] as const) {
    if (v.estado !== "invalido") continue;
    const errores = v.hallazgos
      .filter((h) => h.severidad === "error")
      .slice(0, 5)
      .map((h) => `${h.ruta} · ${h.campo || h.regla}: ${h.nombre.es}`);
    throw new Error(
      `${nombre} no pasan su validación (pnpm evidencia:validar): ${errores.join(" | ")} / ${nombre === "los sobres" ? "the envelopes" : nombre === "los lotes" ? "the batches" : "the findings"} do not pass validation`,
    );
  }
  const libro = L.libro.map((s) => s.sobre);
  const lotes = L.lotes.lotes
    .map((v) => v.lote)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const veredictos = new Map(libro.map((s) => [s.id, s.veredicto] as const));
  const revisiones: Record<string, RevisionDelLote> = {};
  for (const l of lotes)
    revisiones[l.id] = await revisionDelLote(l, veredictos, L.muestreo);
  return {
    libro,
    lotes,
    muestreo: L.muestreo,
    revisiones,
    etiquetasDeCarga: cargarEtiquetasDeCarga(raiz),
    hallazgos: [...L.hallazgos.validos].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
    escala: cargarEscalaIa(raiz),
    plazos: cargarPlazos(raiz),
    etiquetas: cargarEtiquetasDeHallazgo(raiz),
    cvss: cargarEtiquetasDeCvss(raiz),
  };
}
