// Ayudas de las pruebas de lotes: el mundo demo (sobres, hallazgos, planes, plan de muestreo y los dos lotes demo) leído
// una vez, y constructores de lotes editados, con y sin volver a sellar.
import {
  Lote,
  type ConfirmacionDeLote,
  type PlanDeMuestreo,
} from "../../../src/engine/lotes/esquemas.ts";
import {
  sellarLote,
  sinHuellasDeLote,
} from "../../../src/engine/lotes/huellas.ts";
import type {
  ArchivoDeLote,
  ContextoDeLotes,
  ResultadoDeValidacionDeLotes,
} from "../../../src/engine/lotes/validar.ts";
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import {
  cargarLotesPublicos,
  cargarMuestreo,
} from "../../../src/lib/evidencia/cargar-evidencia.ts";
import {
  ASISTENTE,
  RAIZ,
  copia,
  mundo,
  rutaDemo,
  type MundoDeEvidencia,
} from "../evidencia/ayuda.ts";

export { ASISTENTE, RAIZ, copia, rutaDemo };

export interface MundoDeLotes extends MundoDeEvidencia {
  lotes: Record<string, Lote>;
  muestreo: PlanDeMuestreo;
}

let memo: Promise<MundoDeLotes> | null = null;

export function mundoDeLotes(): Promise<MundoDeLotes> {
  memo ??= (async () => {
    const m = await mundo();
    const lotes: Record<string, Lote> = {};
    for (const a of cargarLotesPublicos(RAIZ)) {
      const l = Lote.parse(JSON.parse(a.texto));
      lotes[l.id] = l;
    }
    return { ...m, lotes, muestreo: cargarMuestreo(RAIZ) };
  })();
  return memo;
}

export const rutaDeLote = (id: string) => `datos/lotes/demo/${id}.json`;
export const rutaPrivadaDeLote = (id: string) =>
  `datos/privado/lotes/${id}.json`;

export const archivoDeLote = (
  l: Lote | Record<string, unknown>,
  ruta = rutaDeLote(String((l as { id: string }).id)),
): ArchivoDeLote => ({ ruta, texto: JSON.stringify(l) });

/** Un lote cambiado y vuelto a sellar: sus huellas cuadran con su contenido nuevo (el archivo no cambia). */
export const loteSellado = (
  l: Lote,
  cambios: Partial<Omit<Lote, "huellas">>,
  archivo = l.huellas.archivo,
): Promise<Lote> =>
  sellarLote({ ...copia(sinHuellasDeLote(l)), ...cambios }, archivo);

/** Un lote cambiado SIN volver a sellar: simula una edición a mano después de sellarse. */
export const loteEditado = (
  l: Lote,
  cambios: Partial<Omit<Lote, "huellas">>,
): Lote => ({ ...copia(l), ...cambios });

/** Un lote confirmado con lo que se diga (sin pasar por el motor: para fabricar lotes que el motor no dejaría). */
export const loteConfirmado = (
  l: Lote,
  c: Partial<ConfirmacionDeLote> = {},
): Promise<Lote> =>
  loteSellado(l, {
    confirmacion: {
      por: "Revisora demo",
      fecha: "2026-10-03",
      decision: "confirmado",
      revisados: l.sobres.map((s) => s.id),
      separados: [],
      ...c,
    },
  });

/** El contexto del validador: los sobres demo (más los que se pasen) con el plan y el plan de muestreo reales. */
export function contextoDeLotes(
  m: MundoDeLotes,
  cambios: { sobres?: Sobre[]; reemplazos?: Sobre[] } = {},
): ContextoDeLotes {
  const reemplazos = new Map((cambios.reemplazos ?? []).map((s) => [s.id, s]));
  const todos = [
    ...Object.values(m.sobres).map((s) => reemplazos.get(s.id) ?? s),
    ...(cambios.sobres ?? []),
  ];
  return {
    sobres: todos.map((sobre) => ({ ruta: rutaDemo(sobre.id), sobre })),
    planes: m.contexto.planes,
    muestreo: m.muestreo,
  };
}

/** Las reglas que el validador nombró, sin repetir y en orden. */
export const reglasDe = (r: ResultadoDeValidacionDeLotes): string[] => [
  ...new Set(r.hallazgos.map((h) => h.regla)),
];
export const erroresDe = (r: ResultadoDeValidacionDeLotes): string[] => [
  ...new Set(
    r.hallazgos.filter((h) => h.severidad === "error").map((h) => h.regla),
  ),
];
