// El libro de evidencia: la lista de sobres de una app. Reglas que lo hacen un libro y no una carpeta:
// - SOLO AGREGA: un sobre confirmado no se edita; corregirlo es registrar uno nuevo que lo cita (`corrige`);
// - un sobre se confirma UNA vez, de forma individual, por una persona (no hay confirmación por lote en este sprint);
// - un sobre SIN confirmar no cuenta: ni abre un hallazgo ni cierra uno ni entra a ninguna cuenta (regla dura 6).
import { huella } from "../huella.ts";
import { comparar } from "../planificador/orden.ts";
import type { Sobre } from "./esquemas.ts";
import { resellar } from "./huellas.ts";

export const estaConfirmado = (s: Sobre): boolean => s.confirmacion !== null;

/** Los sobres que cuentan: los confirmados por una persona. */
export const contados = (libro: readonly Sobre[]): Sobre[] =>
  libro.filter(estaConfirmado);

/** Los sobres en el orden del libro (identificador, por punto de código). */
export const enOrden = (libro: readonly Sobre[]): Sobre[] =>
  [...libro].sort((a, b) => comparar(a.id, b.id));

/**
 * Los sobres confirmados que ningún otro sobre confirmado corrige. Un sobre corregido sigue en el libro, pero lo
 * que vale es su corrección.
 */
export function vigentes(libro: readonly Sobre[]): Sobre[] {
  const corregidos = new Set(
    contados(libro)
      .map((s) => s.corrige)
      .filter((id): id is string => id !== null),
  );
  return contados(libro).filter((s) => !corregidos.has(s.id));
}

/** El siguiente identificador libre: SOB-0037 si el mayor es SOB-0036. */
export function siguienteId(libro: readonly { id: string }[]): string {
  const mayor = libro.reduce((m, s) => Math.max(m, Number(s.id.slice(4))), 0);
  return `SOB-${String(mayor + 1).padStart(4, "0")}`;
}

export type ResultadoDeConfirmar =
  | { ok: true; sobre: Sobre }
  | { ok: false; motivo: "ya_confirmado" | "fecha_anterior_a_la_corrida" };

/**
 * Confirma un sobre: una persona, una fecha, modo individual. Vuelve a sellar el sobre (la confirmación forma
 * parte del sobre canónico). No cambia el veredicto: lo que hay que corregir se corrige con un sobre nuevo.
 */
export async function confirmar(
  s: Sobre,
  por: string,
  fecha: string,
): Promise<ResultadoDeConfirmar> {
  if (s.confirmacion !== null) return { ok: false, motivo: "ya_confirmado" };
  // Fechas civiles AAAA-MM-DD: comparar el texto es comparar el calendario.
  if (fecha < s.fecha)
    return { ok: false, motivo: "fecha_anterior_a_la_corrida" };
  return {
    ok: true,
    sobre: await resellar({
      ...s,
      confirmacion: { por, fecha, modo: "individual" },
    }),
  };
}

/** La huella del libro entero: la de la lista ordenada de identificador y huella de cada sobre. */
export function huellaDelLibro(libro: readonly Sobre[]): Promise<string> {
  return huella(enOrden(libro).map((s) => [s.id, s.huellas.sobre]));
}
