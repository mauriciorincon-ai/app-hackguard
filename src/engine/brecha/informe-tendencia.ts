// La tendencia de la brecha en texto para la terminal. Solo redacta lo que `armarTendencia` calculó: ninguna cuenta nueva. Los nombres de
// los controles y de los estados llegan de fuera (vocabulario de la instantánea y etiquetas), así que el motor no lee archivos.
import type { Idioma } from "../catalogo/informe.ts";
import type { EstadoDeHallazgo } from "../hallazgos/esquemas.ts";
import type { EstadoDeControl } from "./esquemas.ts";
import type { Sentido, Tendencia } from "./tendencia.ts";

type Texto = { es: string; en: string };

export interface NombresParaLaTendencia {
  control: (id: string) => Texto | null;
  estadoDeControl: (id: EstadoDeControl) => Texto;
  estadoDeHallazgo: (id: EstadoDeHallazgo) => Texto;
}

const SENTIDO: Record<Sentido, Texto> = {
  mejoro: { es: "mejoró", en: "improved" },
  empeoro: { es: "empeoró", en: "got worse" },
  igual: { es: "igual", en: "unchanged" },
};

export function informeDeTendencia(
  t: Tendencia,
  idioma: Idioma,
  n: NombresParaLaTendencia,
): string {
  const es = idioma === "es";
  const r = t.resumen;
  const lineas = [
    es
      ? `Tendencia de la brecha · ${t.cortes.length} cortes · ${t.cortes[0]} → ${t.cortes.at(-1)}`
      : `Gap trend · ${t.cortes.length} cut-offs · ${t.cortes[0]} → ${t.cortes.at(-1)}`,
    es
      ? `Controles de ISO/IEC 42001: ${r.mejoraron} mejoraron · ${r.empeoraron} empeoraron · ${r.igual} igual · ${r.conRegresion} con regresión (un hallazgo reabierto)`
      : `ISO/IEC 42001 controls: ${r.mejoraron} improved · ${r.empeoraron} got worse · ${r.igual} unchanged · ${r.conRegresion} with a regression (a reopened finding)`,
    "",
    es
      ? "Por corte: abiertos · reabiertos · aceptados · cerrados · vencidos · controles con falla"
      : "By cut-off: open · reopened · accepted · closed · overdue · controls failing",
  ];
  for (const p of t.puntos)
    lineas.push(
      `  ${p.corte}  ${p.abiertos} · ${p.reabiertos} · ${p.aceptados} · ${p.cerrados} · ${p.vencidos} · ${p.controlesConFalla}`,
    );
  const quienes = t.controles.filter(
    (c) => c.movimientos.length > 0 || c.regresiones.length > 0,
  );
  lineas.push(
    "",
    es
      ? `Control por control (solo los que cambiaron: ${quienes.length} de ${t.controles.length})`
      : `Control by control (only those that changed: ${quienes.length} of ${t.controles.length})`,
  );
  for (const c of quienes) {
    const nombre = n.control(c.id);
    lineas.push(
      "",
      `${c.id}${nombre === null ? "" : ` · ${nombre[idioma]}`} · ${SENTIDO[c.sentido][idioma]}${c.regresiones.length > 0 ? (es ? " · REGRESIÓN" : " · REGRESSION") : ""}`,
    );
    for (const m of c.movimientos)
      lineas.push(
        `  ${m.corte} ${SENTIDO[m.sentido][idioma]}: ${n.estadoDeControl(m.de)[idioma]} → ${n.estadoDeControl(m.a)[idioma]}${
          m.hallazgos.length === 0
            ? es
              ? " · lo movió la evidencia, no un hallazgo"
              : " · moved by evidence, not by a finding"
            : ` · ${m.hallazgos
                .map(
                  (h) =>
                    `${h.id} (${h.de === null ? "—" : n.estadoDeHallazgo(h.de)[idioma]} → ${h.a === null ? "—" : n.estadoDeHallazgo(h.a)[idioma]})`,
                )
                .join(", ")}`
        }`,
      );
    for (const g of c.regresiones)
      lineas.push(
        es
          ? `  regresión: ${g.hallazgo} se reabrió el ${g.corte}`
          : `  regression: ${g.hallazgo} was reopened on ${g.corte}`,
      );
  }
  if (t.problemas.length > 0)
    lineas.push(
      "",
      es
        ? `No se pudo calcular en algún corte (no se esconde): ${t.problemas.join(" | ")}`
        : `Could not be calculated at some cut-off (not hidden): ${t.problemas.join(" | ")}`,
    );
  return `${lineas.join("\n")}\n`;
}
