// La cadena de cierre de un hallazgo: hallazgo → corrección → re-prueba → cierre, y un ciclo más por cada reapertura (D5). Función
// pura sobre lo que el motor calculó (`evaluarHallazgo`); sin JSON importado, para que el CLI (`hallazgo:cadena`) y la pantalla dibujen
// la MISMA cadena (una cuenta, un cálculo). `vista.ts` la reexporta.
import type { SobreEfectivo } from "../../engine/evidencia/esquemas.ts";
import { cotaDeFalla } from "../../engine/evidencia/veredicto.ts";
import type {
  CicloDeHallazgo,
  EvaluacionDeHallazgo,
  ReaperturaDeHallazgo,
} from "../../engine/hallazgos/ciclo.ts";
import type {
  EtiquetasDeHallazgo,
  Hallazgo,
} from "../../engine/hallazgos/esquemas.ts";
import type { SituacionDeHallazgo } from "../../engine/hallazgos/situacion.ts";
import type {
  Bilingue,
  Etiqueta,
  EslabonDeCadena,
  LineaDeEslabon,
} from "./tipos.ts";

export const plural = (n: number, uno: string, varios: string) =>
  n === 1 ? uno : varios;

/** Una etiqueta propia de las pantallas de hallazgo (`datos/hallazgos/etiquetas.json`). */
export function etiquetaPropia(
  etiquetas: EtiquetasDeHallazgo,
  id: string,
): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/hallazgos/etiquetas.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

/** Lo que dio un sobre, en palabras: su razón, o su conteo con la cota si no falló nada, o lo que midió. */
export function conteoDeSobre(s: SobreEfectivo): Bilingue {
  if (s.razon !== null) return s.razon;
  const { fallidas: f, evaluadas: n, alertas: a, metrica: m } = s.resultado;
  if (f !== null && n !== null) {
    if (f > 0)
      return {
        es: `${f} de ${n} salidas ${plural(f, "falló", "fallaron")}`,
        en: `${f} of ${n} outputs failed`,
      };
    const cota = cotaDeFalla(n);
    return {
      es: `0 de ${n} fallaron · cota: hasta ${cota} %`,
      en: `0 of ${n} failed · upper bound: ${cota}%`,
    };
  }
  if (a !== null)
    return {
      es: `${a} ${plural(a, "alerta", "alertas")}`,
      en: `${a} ${plural(a, "alert", "alerts")}`,
    };
  if (m !== null)
    return {
      es: `${m.nombre.es}: ${m.valor} (umbral ${m.umbral})`,
      en: `${m.nombre.en}: ${m.valor} (threshold ${m.umbral})`,
    };
  return { es: "Sin conteo registrado", en: "No count recorded" };
}

function eslabon(
  etiquetas: EtiquetasDeHallazgo,
  id: string,
  lineas: LineaDeEslabon[] = [],
  pendiente = false,
): EslabonDeCadena {
  return { etiqueta: etiquetaPropia(etiquetas, id), pendiente, lineas };
}

const fecha = (valor: string): LineaDeEslabon => ({ tipo: "fecha", valor });
const menor = (texto: Bilingue): LineaDeEslabon => ({
  tipo: "texto",
  menor: true,
  texto,
});

/** El cuerpo de un eslabón que cuenta un sobre: fecha, lo que dio, su identificador, su huella y quién lo confirmó. */
function lineasDeSobre(
  s: SobreEfectivo,
  firma: Etiqueta,
  intermedio: LineaDeEslabon[] = [],
): LineaDeEslabon[] {
  return [
    fecha(s.fecha),
    menor(conteoDeSobre(s)),
    ...intermedio,
    { tipo: "sobre", id: s.id },
    { tipo: "huella", hex: s.huellas.sobre },
    ...(s.confirmacion === null
      ? []
      : [
          {
            tipo: "firma",
            fecha: s.confirmacion.fecha,
            etiqueta: firma,
          } as const,
        ]),
  ];
}

/** La cadena de cierre: hallazgo → corrección → re-prueba → cierre. Lo que falta se ve punteado; lo hecho lleva fecha, sobre y firma. */
export function construirCadena(
  h: Hallazgo,
  s: SituacionDeHallazgo,
  etiquetas: EtiquetasDeHallazgo,
  motivos: Map<string, Bilingue>,
): EslabonDeCadena[] {
  const e: EvaluacionDeHallazgo = s.evaluacion;
  const origen = e.sobreOrigen;
  const firma = etiquetaPropia(etiquetas, "firma_confirmada");
  const abierto = eslabon(etiquetas, "cadena_abierto", [
    fecha(e.apertura),
    menor(conteoDeSobre(origen)),
    { tipo: "sobre", id: origen.id },
    { tipo: "huella", hex: origen.huellas.sobre },
    { tipo: "firma", fecha: e.apertura, etiqueta: firma },
  ]);

  const decision = (tipo: "eliminacion" | "no_reproducible") =>
    [...h.eventos].reverse().find((x) => x.tipo === tipo);

  if (
    e.ciclos.length === 1 &&
    e.cierre !== null &&
    e.cierre.tipo !== "reprueba"
  ) {
    const ev = decision(e.cierre.tipo);
    return [
      abierto,
      eslabon(
        etiquetas,
        e.cierre.tipo === "eliminacion"
          ? "cadena_eliminacion"
          : "cadena_no_reproducible",
        [
          fecha(e.cierre.fecha),
          ...(ev !== undefined && "justificacion" in ev
            ? [menor(ev.justificacion)]
            : []),
        ],
      ),
      eslabon(etiquetas, "cadena_sin_reprueba", [], true),
      eslabon(etiquetas, "cadena_cerrado_sin_reprueba", [
        fecha(e.cierre.fecha),
      ]),
    ];
  }

  const aceptado = e.estado === "aceptado_con_riesgo" && e.aceptacion !== null;
  const kDelOriginal = origen.k;
  const cierreDe = (sobre: string | null) =>
    sobre === null
      ? null
      : (e.candidatas.find((c) => c.sobre.id === sobre)?.sobre ?? null);

  /** Los eslabones de UN ciclo tras su apertura: corrección, re-prueba y cierre. Solo el último ciclo puede estar pendiente. */
  const eslabonesDelCiclo = (
    c: CicloDeHallazgo,
    ultimoCiclo: boolean,
  ): EslabonDeCadena[] => {
    const aceptadoAqui = ultimoCiclo && aceptado;
    const segundo = aceptadoAqui
      ? eslabon(etiquetas, "cadena_riesgo_aceptado", [
          fecha(e.aceptacion!.fecha),
          menor(e.aceptacion!.justificacion),
        ])
      : c.correccion !== null
        ? eslabon(etiquetas, "cadena_correccion_declarada", [
            fecha(c.correccion.fecha),
            menor(c.correccion.nota),
          ])
        : eslabon(etiquetas, "cadena_correccion_pendiente", [], true);

    const valida = cierreDe(c.cierre?.sobre ?? null);
    const fallidas = c.candidatas.filter((x) => x.motivos.length > 0);
    let tercero: EslabonDeCadena;
    if (aceptadoAqui) {
      tercero = eslabon(
        etiquetas,
        "cadena_sin_correccion_ni_reprueba",
        [],
        true,
      );
    } else if (valida !== null) {
      tercero = eslabon(
        etiquetas,
        "cadena_reprueba_superada",
        lineasDeSobre(valida, firma, [
          menor(
            kDelOriginal !== null && valida.k !== null
              ? {
                  es: `Misma configuración, k = ${valida.k} (el original usó ${kDelOriginal}).`,
                  en: `Same configuration, k = ${valida.k} (the original used ${kDelOriginal}).`,
                }
              : {
                  es: "Misma configuración que la prueba original.",
                  en: "Same configuration as the original test.",
                },
          ),
        ]),
      );
    } else if (ultimoCiclo && e.porConfirmar.length > 0) {
      const p = e.porConfirmar[0]!;
      tercero = eslabon(etiquetas, "cadena_reprueba_por_confirmar", [
        {
          tipo: "sobre",
          id: p.id,
          ...(p.razon === null ? {} : { nota: p.razon }),
        },
        menor({
          es: "Está sin confirmar: todavía no cuenta.",
          en: "It is unconfirmed: it does not count yet.",
        }),
      ]);
    } else if (fallidas.length > 0) {
      const ultima = fallidas[fallidas.length - 1]!;
      tercero = eslabon(
        etiquetas,
        "cadena_reprueba_no_cierra",
        lineasDeSobre(ultima.sobre, firma, [
          {
            tipo: "motivos",
            motivos: ultima.motivos.map(
              (m) => motivos.get(m) ?? { es: m, en: m },
            ),
          },
        ]),
      );
    } else {
      tercero = eslabon(
        etiquetas,
        "cadena_reprueba_pendiente",
        [
          menor(
            kDelOriginal !== null
              ? {
                  es: `Misma configuración y al menos k = ${kDelOriginal}.`,
                  en: `Same configuration and at least k = ${kDelOriginal}.`,
                }
              : {
                  es: "Misma configuración que la prueba original.",
                  en: "Same configuration as the original test.",
                },
          ),
        ],
        true,
      );
    }

    const cuarto =
      c.cierre !== null
        ? eslabon(etiquetas, "cadena_cerrado", [fecha(c.cierre.fecha)])
        : aceptadoAqui
          ? eslabon(etiquetas, "cadena_sin_cerrar_cuenta_como_falla", [], true)
          : eslabon(etiquetas, "cadena_sin_cerrar", [], true);
    return [segundo, tercero, cuarto];
  };

  /** La reapertura: la re-prueba que volvió a fallar, con su sobre, su huella y quién la confirmó, y el cierre que deshizo. */
  const eslabonDeReapertura = (r: ReaperturaDeHallazgo): EslabonDeCadena => {
    const sobre = cierreDe(r.sobre);
    const cerrado = e.cierres.find((c) => c.sobre === r.cierre);
    const deshizo = menor({
      es: `Deshizo el cierre${cerrado === undefined ? "" : ` del ${cerrado.fecha}`} (${r.cierre}).`,
      en: `It undid the closure${cerrado === undefined ? "" : ` of ${cerrado.fecha}`} (${r.cierre}).`,
    });
    return eslabon(
      etiquetas,
      "cadena_reabierto",
      sobre === null
        ? [fecha(r.fecha), deshizo]
        : lineasDeSobre(sobre, firma, [deshizo]),
    );
  };

  const cadena: EslabonDeCadena[] = [abierto];
  e.ciclos.forEach((c, i) => {
    const ultimoCiclo = i === e.ciclos.length - 1;
    if (c.reapertura !== null) cadena.push(eslabonDeReapertura(c.reapertura));
    if (ultimoCiclo && e.cierre !== null && e.cierre.tipo !== "reprueba") {
      // Reabierto y luego eliminado o «no se reproduce»: el cierre alternativo cierra el último ciclo.
      const ev = decision(e.cierre.tipo);
      cadena.push(
        eslabon(
          etiquetas,
          e.cierre.tipo === "eliminacion"
            ? "cadena_eliminacion"
            : "cadena_no_reproducible",
          [
            fecha(e.cierre.fecha),
            ...(ev !== undefined && "justificacion" in ev
              ? [menor(ev.justificacion)]
              : []),
          ],
        ),
        eslabon(etiquetas, "cadena_sin_reprueba", [], true),
        eslabon(etiquetas, "cadena_cerrado_sin_reprueba", [
          fecha(e.cierre.fecha),
        ]),
      );
      return;
    }
    cadena.push(...eslabonesDelCiclo(c, ultimoCiclo));
  });
  return cadena;
}
