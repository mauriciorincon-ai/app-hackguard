// Situar los hallazgos para listarlos: la situación de cada uno (estado, severidad, plazo) y, aparte, los que NO se pudieron situar con
// su motivo. Un hallazgo que no se puede situar jamás se oculta en silencio (ADR-010 §5: se dice, no se esconde).
import {
  situacionDeHallazgo,
  type SituacionDeHallazgo,
} from "../../engine/hallazgos/situacion.ts";
import type { Hallazgo } from "../../engine/hallazgos/esquemas.ts";
import type { SobreEfectivo } from "../../engine/evidencia/esquemas.ts";

type Datos = Parameters<typeof situacionDeHallazgo>[2];

export interface HallazgoOmitido {
  id: string;
  motivo: string;
  detalle: string;
}

export function situarParaListar(
  hallazgos: readonly Hallazgo[],
  libro: readonly SobreEfectivo[],
  datos: Datos,
): { situaciones: SituacionDeHallazgo[]; omitidos: HallazgoOmitido[] } {
  const situaciones: SituacionDeHallazgo[] = [];
  const omitidos: HallazgoOmitido[] = [];
  for (const h of hallazgos) {
    const r = situacionDeHallazgo(h, libro, datos);
    if (r.ok) situaciones.push(r.situacion);
    else omitidos.push({ id: h.id, motivo: r.motivo, detalle: r.detalle });
  }
  return { situaciones, omitidos };
}
