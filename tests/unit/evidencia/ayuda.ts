// Ayudas de las pruebas del libro de evidencia: el mundo real de `datos/` (instantánea oficial, planes emitidos,
// sobres y hallazgos demo) leído una vez, y copias que cada prueba puede mutar sin tocar a las demás.
import path from "node:path";
import { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import { huellaDelCrudoSintetico, resellar, sellar, sinHuellas } from "../../../src/engine/evidencia/huellas.ts";
import type { ContextoDeEvidencia } from "../../../src/engine/evidencia/validar.ts";
import { Hallazgo } from "../../../src/engine/hallazgos/esquemas.ts";
import { cargarPatrones } from "../../../src/lib/activos/cargar-activos.ts";
import { cargarInstantaneaOficial } from "../../../src/lib/catalogo/cargar-instantanea.ts";
import type { EscalaIa } from "../../../src/engine/severidad/escala-ia.ts";
import {
  cargarEscalaIa,
  cargarEtiquetasDeHallazgo,
  cargarHallazgos,
  cargarPlanesEmitidos,
  cargarPlazos,
  cargarSobres,
  pruebasConocidas,
} from "../../../src/lib/evidencia/cargar-evidencia.ts";

export const RAIZ = path.resolve(__dirname, "../../..");
export const ASISTENTE = "act-demo-asistente";
export const CLASIFICADOR = "act-demo-clasificador";

export interface MundoDeEvidencia {
  instantanea: Awaited<ReturnType<typeof cargarInstantaneaOficial>>["instantanea"];
  contexto: ContextoDeEvidencia;
  archivosDeSobres: ReturnType<typeof cargarSobres>;
  archivosDeHallazgos: ReturnType<typeof cargarHallazgos>;
  sobres: Record<string, Sobre>;
  hallazgos: Record<string, Hallazgo>;
  plazos: ReturnType<typeof cargarPlazos>;
  escala: EscalaIa;
  etiquetas: ReturnType<typeof cargarEtiquetasDeHallazgo>;
}

let memo: Promise<MundoDeEvidencia> | null = null;

export function mundo(): Promise<MundoDeEvidencia> {
  memo ??= (async () => {
    const { instantanea } = await cargarInstantaneaOficial(RAIZ);
    const archivosDeSobres = cargarSobres(RAIZ);
    const archivosDeHallazgos = cargarHallazgos(RAIZ);
    const sobres: Record<string, Sobre> = {};
    for (const a of archivosDeSobres) {
      const s = Sobre.parse(JSON.parse(a.texto));
      sobres[s.id] = s;
    }
    const hallazgos: Record<string, Hallazgo> = {};
    for (const a of archivosDeHallazgos) {
      const h = Hallazgo.parse(JSON.parse(a.texto));
      hallazgos[h.id] = h;
    }
    return {
      instantanea,
      contexto: {
        pruebas: pruebasConocidas(instantanea),
        planes: await cargarPlanesEmitidos(RAIZ),
        patrones: cargarPatrones(RAIZ),
      },
      archivosDeSobres,
      archivosDeHallazgos,
      sobres,
      hallazgos,
      plazos: cargarPlazos(RAIZ),
      escala: cargarEscalaIa(RAIZ),
      etiquetas: cargarEtiquetasDeHallazgo(RAIZ),
    };
  })();
  return memo;
}

/** Una copia profunda: cada prueba muta la suya. */
export const copia = <T>(valor: T): T => structuredClone(valor);

/** Un sobre cambiado y vuelto a sellar: sus huellas cuadran con su contenido nuevo. */
export async function con(s: Sobre, cambios: Partial<Omit<Sobre, "huellas">>): Promise<Sobre> {
  return resellar({ ...copia(s), ...cambios });
}

/** Un sobre demo nuevo con otro id, sellado con SU crudo sintético: lo que el validador exige a un demo. */
export async function nuevo(base: Sobre, id: string, cambios: Partial<Omit<Sobre, "huellas" | "id">> = {}): Promise<Sobre> {
  return sellar({ ...sinHuellas(copia(base)), ...cambios, id }, await huellaDelCrudoSintetico(id));
}

/** Un sobre cambiado SIN volver a sellar: simula una edición a mano después de sellarse. */
export const editado = (s: Sobre, cambios: Partial<Omit<Sobre, "huellas">>): Sobre => ({
  ...copia(s),
  ...cambios,
});

export const sinSello = sinHuellas;

/** El texto de un archivo de sobre, como lo lee el validador. */
export const archivoDe = (ruta: string, s: Sobre | Record<string, unknown>) => ({
  ruta,
  texto: JSON.stringify(s),
});
export const rutaDemo = (id: string) => `datos/evidencia/demo/${id}.json`;
export const rutaPrivada = (id: string) => `datos/privado/evidencia/${id}.json`;
