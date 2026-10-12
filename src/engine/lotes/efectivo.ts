// El libro efectivo (ADR-009): los sobres tal como cuentan. Un sobre cuenta si su archivo trae la confirmación
// individual de una persona, o si el lote que lo cita está confirmado y no lo separó. La confirmación del lote se
// presta al sobre solo EN MEMORIA: el archivo del sobre no cambia (ADR-008) y su esquema no admite `modo: "lote"`.
//
// Un lote por confirmar o mandado a revisión individual no confirma a nadie; un separado se confirma uno por uno.
import type { Sobre, SobreEfectivo } from "../evidencia/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import type { Lote } from "./esquemas.ts";

/** Los sobres que un lote confirmó: los suyos menos los separados. Vacío si el lote no está `confirmado`. */
export function confirmadosPorLote(lote: Lote): string[] {
  const c = lote.confirmacion;
  if (c === null || c.decision !== "confirmado") return [];
  const separados = new Set(c.separados);
  return lote.sobres.map((s) => s.id).filter((id) => !separados.has(id));
}

export function libroEfectivo(
  sobres: readonly Sobre[],
  lotes: readonly Lote[],
): SobreEfectivo[] {
  const delLote = new Map<string, Lote>();
  for (const l of [...lotes].sort((a, b) => comparar(a.id, b.id)))
    for (const id of confirmadosPorLote(l))
      if (!delLote.has(id)) delLote.set(id, l);
  return sobres.map((s) => {
    if (s.confirmacion !== null) return s;
    const l = delLote.get(s.id);
    const c = l?.confirmacion;
    if (l === undefined || c === null || c === undefined) return s;
    return {
      ...s,
      confirmacion: { por: c.por, fecha: c.fecha, modo: "lote", lote: l.id },
    };
  });
}
