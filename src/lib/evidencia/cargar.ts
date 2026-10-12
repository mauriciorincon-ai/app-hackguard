// Carga los sobres y los hallazgos demo del build y los comprueba contra el libro y la instantánea oficial. Se ejecuta en
// el build (Node), jamás en el navegador. Si algo no cuadra (una huella de sobre que no es la de su contenido, un
// hallazgo cuyo sobre de origen no cuenta, un vector CVSS incompleto), lanza: más vale un build roto que una pantalla
// que muestra una cadena de cierre que nadie puede reproducir. Solo lee lo versionado (demo): lo propio, ignorado por
// git, no sale del CLI de quien lo registró (regla dura 8).
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { SobreEfectivo } from "../../engine/evidencia/esquemas.ts";
import type { EtiquetasDeHallazgo, Hallazgo, Plazos } from "../../engine/hallazgos/esquemas.ts";
import type { EscalaIa } from "../../engine/severidad/escala-ia.ts";
import type { EtiquetasDeCvss } from "../../engine/severidad/etiquetas-cvss.ts";
import {
  cargarEscalaIa,
  cargarEtiquetasDeCvss,
  cargarEtiquetasDeHallazgo,
  cargarPlazos,
} from "./cargar-evidencia.ts";
import { cargarLibroValidado } from "./cargar-libro.ts";

export interface MundoDeHallazgos {
  /** Todos los sobres válidos, confirmados o no (una propuesta se ve, pero no cuenta). */
  libro: SobreEfectivo[];
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
  ] as const) {
    if (v.estado !== "invalido") continue;
    const errores = v.hallazgos
      .filter((h) => h.severidad === "error")
      .slice(0, 5)
      .map((h) => `${h.ruta} · ${h.campo || h.regla}: ${h.nombre.es}`);
    throw new Error(
      `${nombre} no pasan su validación (pnpm evidencia:validar): ${errores.join(" | ")} / ${nombre === "los sobres" ? "the envelopes" : "the findings"} do not pass validation`,
    );
  }
  return {
    libro: L.sobres.sobres.map((s) => s.sobre),
    hallazgos: [...L.hallazgos.validos].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
    escala: cargarEscalaIa(raiz),
    plazos: cargarPlazos(raiz),
    etiquetas: cargarEtiquetasDeHallazgo(raiz),
    cvss: cargarEtiquetasDeCvss(raiz),
  };
}
