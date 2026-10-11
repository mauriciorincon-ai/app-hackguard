// La vista de «Controles»: la capa por defecto de ISO/IEC 42001 (Anexo A) con las pruebas que dan evidencia a cada control, y
// la deuda a la vista (pruebas sin control). Solo identificadores y resúmenes con palabras propias, jamás el texto de la
// norma (regla dura 11). Función pura sobre la instantánea oficial.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { Bilingue, Etiqueta } from "./tipos.ts";
import { etiqueta, porId } from "./vista.ts";

export interface AreaDelAnexo {
  id: string;
  nombre: Bilingue;
  /** Los controles del área, por su nombre en palabras propias. */
  controles: { id: string; nombre: Bilingue }[];
  /** Cuántas pruebas distintas dan evidencia a algún control del área. */
  pruebas: number;
}

export interface EquivalenteDeControl {
  /** «NIST AI RMF 1.0», marco y versión. */
  marco: string;
  referencia: string;
  /** El estado del vocabulario `equivalencia` cuando el mapa no cubre el control entero. */
  incompleto: Etiqueta | null;
}

export interface ControlConPruebas {
  id: string;
  area: Bilingue;
  nombre: Bilingue;
  resumen: Bilingue;
  pruebas: { id: string; nombre: Bilingue }[];
  equivalentes: EquivalenteDeControl[];
}

export interface PruebaSinControl {
  id: string;
  nombre: Bilingue;
  queVerifica: Bilingue;
  /** `true` si el dato la marca «control pendiente» (una persona decidirá cuál). */
  pendiente: boolean;
}

export interface VistaDeControles {
  instantanea: string;
  huella: string;
  consulta: string;
  capa: {
    nombre: Bilingue;
    descripcion: Bilingue;
    marco: string;
    version: string;
    /** `true` si no hay ninguna capa propia además de la por defecto. */
    sinCapaPropia: boolean;
    controles: number;
    /** Cuántos resúmenes todavía no se contrastaron con el texto de la norma. */
    sinContrastar: number;
  };
  areas: AreaDelAnexo[];
  conPruebas: ControlConPruebas[];
  sinControl: PruebaSinControl[];
}

export function construirVistaDeControles(
  i: Instantanea,
  nombre: string,
  consulta: string,
): VistaDeControles {
  const c = i.catalogo;
  const capa = c.controles.find((x) => x.capa === "por_defecto");
  if (!capa) {
    throw new Error(
      "la instantánea no trae la capa de controles por defecto / the snapshot lacks the default control layer",
    );
  }
  const citan = (control: string) =>
    c.pruebas.filter((p) => p.controles.includes(control));
  const todos = capa.areas.flatMap((a) =>
    a.controles.map((x) => ({ ...x, area: a.nombre })),
  );
  return {
    instantanea: nombre,
    huella: i.huella,
    consulta,
    capa: {
      nombre: capa.nombre,
      descripcion: capa.descripcion,
      marco: porId(c.marcos, capa.marco_id).nombre,
      version: capa.version_marco,
      sinCapaPropia: c.controles.every((x) => x.capa === "por_defecto"),
      controles: todos.length,
      sinContrastar: todos.filter((x) => !x.verificado_contra_norma).length,
    },
    areas: capa.areas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      controles: a.controles.map((x) => ({ id: x.id, nombre: x.nombre })),
      pruebas: new Set(a.controles.flatMap((x) => citan(x.id).map((p) => p.id)))
        .size,
    })),
    conPruebas: todos
      .filter((x) => citan(x.id).length > 0)
      .map((x) => ({
        id: x.id,
        area: x.area,
        nombre: x.nombre,
        resumen: x.resumen_llano,
        pruebas: citan(x.id).map((p) => ({ id: p.id, nombre: p.nombre })),
        equivalentes: x.controles_equivalentes.map((e) => ({
          marco: `${porId(c.marcos, e.marco_id).nombre} ${e.version_marco}`,
          referencia: e.referencia_en_marco,
          incompleto:
            e.cobertura === "parcial"
              ? etiqueta(c, "equivalencia", "parcial")
              : null,
        })),
      })),
    sinControl: c.pruebas
      .filter((p) => p.controles.length === 0)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        queVerifica: p.que_verifica,
        pendiente: p.control_pendiente === true,
      })),
  };
}
