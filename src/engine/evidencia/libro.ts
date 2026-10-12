// El libro de evidencia: la lista de sobres de una app. Reglas que lo hacen un libro y no una carpeta:
// - SOLO AGREGA: un sobre confirmado no se edita; corregirlo es registrar uno nuevo que lo cita (`corrige`);
// - un sobre se confirma UNA vez, por una persona: individualmente (su archivo) o por lote (el lote que lo cita,
//   ADR-009; ver `src/engine/lotes/efectivo.ts`);
// - un sobre SIN confirmar no cuenta: ni abre un hallazgo ni cierra uno ni entra a ninguna cuenta (regla dura 6).
import { huella } from "../huella.ts";
import { comparar } from "../planificador/orden.ts";
import type { Lote } from "../lotes/esquemas.ts";
import type { Sobre } from "./esquemas.ts";
import { resellar } from "./huellas.ts";

/** Lo mínimo que el libro necesita de un sobre: el del archivo o el efectivo (con la confirmación de su lote). */
interface DeLibro {
  id: string;
  corrige: string | null;
  confirmacion: unknown;
}

export const estaConfirmado = (s: { confirmacion: unknown }): boolean =>
  s.confirmacion !== null;

/** Los sobres que cuentan: los confirmados por una persona. */
export const contados = <S extends { confirmacion: unknown }>(
  libro: readonly S[],
): S[] => libro.filter(estaConfirmado);

/** Los sobres en el orden del libro (identificador, por punto de código). */
export const enOrden = <S extends { id: string }>(libro: readonly S[]): S[] =>
  [...libro].sort((a, b) => comparar(a.id, b.id));

/**
 * Los sobres confirmados que ningún otro sobre confirmado corrige. Un sobre corregido sigue en el libro, pero lo
 * que vale es su corrección.
 */
export function vigentes<S extends DeLibro>(libro: readonly S[]): S[] {
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

/**
 * La huella del libro entero: la de la lista ordenada de identificador y huella de cada sobre. Con lotes, también la
 * de los lotes (su registro lleva la confirmación). Sin lotes, es la misma de siempre.
 */
export function huellaDelLibro(
  libro: readonly Sobre[],
  lotes: readonly Lote[] = [],
): Promise<string> {
  const sobres = enOrden(libro).map((s) => [s.id, s.huellas.sobre]);
  if (lotes.length === 0) return huella(sobres);
  return huella({
    sobres,
    lotes: enOrden(lotes).map((l) => [l.id, l.huellas.registro]),
  });
}
