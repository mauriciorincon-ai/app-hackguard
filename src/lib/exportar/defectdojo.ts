// Arma la exportación a DefectDojo de un activo desde el mundo del build (hallazgos, libro, instantánea oficial). Solo corre en Node
// (build y CLI): la web recibe el archivo ya hecho. El cálculo vive en `src/engine/exportar/defectdojo.ts`.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  exportarADefectDojo,
  TablaDeExportacion,
  type EntradaDeExportacion,
  type ExportacionDeDefectDojo,
} from "../../engine/exportar/defectdojo.ts";
import { situacionDeHallazgo } from "../../engine/hallazgos/situacion.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import type { MundoDeHallazgos } from "../evidencia/cargar.ts";

/** Lo que el export lee del mundo: el CLI lo arma con los archivos propios (privados) y la web con los demo. */
export type MundoParaExportar = Pick<
  MundoDeHallazgos,
  "hallazgos" | "libro" | "escala" | "plazos"
>;

export const RUTA_DE_LA_TABLA = "datos/exportacion/defectdojo.json";

export const cargarTablaDeExportacion = (
  raiz: string = process.cwd(),
): TablaDeExportacion =>
  TablaDeExportacion.parse(
    JSON.parse(readFileSync(path.join(raiz, RUTA_DE_LA_TABLA), "utf8")),
  );

/** Las entradas del export: los hallazgos de ese activo, con su situación a la fecha de consulta y los controles de su prueba. */
export function entradasDeExportacion(
  activoId: string,
  mundo: MundoParaExportar,
  activos: MundoDeActivos,
  instantanea: Instantanea,
  consulta: string,
): EntradaDeExportacion[] {
  const activo = activos.activos.find((a) => a.activo.id === activoId);
  if (activo === undefined)
    throw new Error(
      `el activo «${activoId}» no está registrado / is not registered`,
    );
  const datos = { escala: mundo.escala, plazos: mundo.plazos, fecha: consulta };
  const c = instantanea.catalogo;
  const todos = c.controles.flatMap((capa) =>
    capa.areas.flatMap((a) => a.controles),
  );
  const entradas: EntradaDeExportacion[] = [];
  for (const hallazgo of mundo.hallazgos) {
    // Un hallazgo de OTRO activo no se sitúa aquí: si no se pudiera situar, no debe bloquear el export de este (auditoría S12, B8).
    const origen = mundo.libro.find((x) => x.id === hallazgo.sobre_origen);
    if (origen !== undefined && origen.activo !== activoId) continue;
    const r = situacionDeHallazgo(hallazgo, mundo.libro, datos);
    if (!r.ok)
      throw new Error(
        `${hallazgo.id}: no se pudo situar (${r.motivo}: ${r.detalle}) / could not be placed`,
      );
    if (r.situacion.evaluacion.activo !== activoId) continue;
    const prueba = c.pruebas.find(
      (p) => p.id === r.situacion.evaluacion.prueba,
    );
    if (prueba === undefined)
      throw new Error(
        `${hallazgo.id}: la prueba «${r.situacion.evaluacion.prueba}» no está en la instantánea / is not in the snapshot`,
      );
    entradas.push({
      hallazgo,
      situacion: r.situacion,
      libro: mundo.libro,
      controles: prueba.controles.map((id) => {
        const control = todos.find((x) => x.id === id);
        if (control === undefined)
          throw new Error(
            `el control «${id}» no está en la instantánea / is not in the snapshot`,
          );
        return { id, nombre: control.nombre };
      }),
      prueba: { id: prueba.id, nombre: prueba.nombre },
      activo: { id: activoId, nombre: activo.activo.nombre },
    });
  }
  return entradas;
}

export const exportacionDeActivo = (
  activoId: string,
  mundo: MundoParaExportar,
  activos: MundoDeActivos,
  instantanea: Instantanea,
  consulta: string,
  tabla: TablaDeExportacion = cargarTablaDeExportacion(),
): ExportacionDeDefectDojo =>
  exportarADefectDojo(
    entradasDeExportacion(activoId, mundo, activos, instantanea, consulta),
    tabla,
  );

/** Los bytes del archivo: los mismos que descarga la web y escribe el CLI. */
export const textoDeExportacion = (e: ExportacionDeDefectDojo): string =>
  `${JSON.stringify(e, null, 2)}\n`;

/** Los activos que tienen al menos un hallazgo: solo esos tienen archivo que descargar. */
export function activosConHallazgos(
  mundo: MundoParaExportar,
  activos: MundoDeActivos,
  consulta: string,
): string[] {
  const datos = { escala: mundo.escala, plazos: mundo.plazos, fecha: consulta };
  const ids = new Set<string>();
  for (const h of mundo.hallazgos) {
    const r = situacionDeHallazgo(h, mundo.libro, datos);
    if (r.ok) ids.add(r.situacion.evaluacion.activo);
  }
  return activos.activos.map((a) => a.activo.id).filter((id) => ids.has(id));
}
