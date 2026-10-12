// Las tres huellas del lote (ADR-009). Todo pasa por `huella` (JCS + SHA-256): la misma entrada da los mismos bytes en
// Node y en los navegadores.
// - `archivo`: los bytes de la herramienta (el archivo se lee, se resume y se descarta);
// - `lote`: el lote SIN su confirmación ni sus huellas. Es la semilla de la muestra: confirmar no la cambia;
// - `registro`: el lote entero sin sus huellas, confirmación incluida. Quien lo edite después de confirmarlo la rompe.
import { huella } from "../huella.ts";
import type { ConfirmacionDeLote, HuellasDelLote, Lote } from "./esquemas.ts";

/** Un lote antes de sellarlo: todo menos sus huellas. */
export type LoteSinHuellas = Omit<Lote, "huellas">;

export const sinHuellasDeLote = (l: Lote | LoteSinHuellas): LoteSinHuellas =>
  Object.fromEntries(
    Object.entries(l).filter(([clave]) => clave !== "huellas"),
  ) as LoteSinHuellas;

/** El cuerpo que fija la semilla: sin la confirmación (que se escribe después) ni las huellas. */
export const cuerpoDelLote = (l: Lote | LoteSinHuellas) => {
  const { confirmacion: _confirmacion, ...resto } = sinHuellasDeLote(l);
  void _confirmacion;
  return resto;
};

export const huellaDelLote = (l: Lote | LoteSinHuellas): Promise<string> =>
  huella(cuerpoDelLote(l));

export const huellaDelRegistro = (l: Lote | LoteSinHuellas): Promise<string> =>
  huella(sinHuellasDeLote(l));

export async function sellarLote(
  l: LoteSinHuellas,
  archivo: string,
): Promise<Lote> {
  const huellas: HuellasDelLote = {
    archivo,
    lote: await huellaDelLote(l),
    registro: await huellaDelRegistro(l),
  };
  return { ...l, huellas };
}

/** Vuelve a sellar un lote al que se le puso (o quitó) la confirmación, conservando `archivo` y `lote`. */
export async function resellarLote(
  l: Lote,
  confirmacion: ConfirmacionDeLote | null,
): Promise<Lote> {
  const cambiado = { ...sinHuellasDeLote(l), confirmacion };
  return sellarLote(cambiado, l.huellas.archivo);
}

/** La huella del crudo SINTÉTICO de un lote demo: no viene de ninguna herramienta (regla dura 8). */
export const textoDelArchivoSintetico = (id: string): string =>
  `crudo-sintetico:${id}`;
