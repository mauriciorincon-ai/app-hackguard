// La severidad de un hallazgo, calculada y explicada (regla dura 7). Software: CVSS 4.0 con el vector completo guardado
// y el puntaje de la referencia oficial. Las otras familias: la tabla de prioridad de acción en datos, con el impacto
// primero y la frecuencia que salió de la evidencia. Lo que la persona aporta es la ENTRADA; el nivel lo calcula este
// módulo, y por eso un hallazgo no lleva su severidad escrita (no puede contradecir a su vector ni a su tabla).
import type {
  NivelDeSeveridad,
  SeveridadDeEntrada,
} from "../hallazgos/esquemas.ts";
import type { Resultado } from "../evidencia/esquemas.ts";
import { REFERENCIA_DE_CVSS, puntuarCvss } from "./cvss.ts";
import {
  bandaDeFrecuencia,
  frecuenciaObservada,
  nivelDeEscala,
  type EscalaIa,
  type FrecuenciaObservada,
} from "./escala-ia.ts";
import type {
  MetricaDeVector,
  MotivoDeVectorInvalido,
} from "./validar-vector.ts";

export type SeveridadCalculada =
  | {
      metodo: "cvss";
      nivel: NivelDeSeveridad;
      /** La calculadora de first.org fijada por commit. */
      referencia: string;
      puntaje: number;
      vector: string;
      metricas: MetricaDeVector[];
    }
  | {
      metodo: "escala_ia";
      nivel: NivelDeSeveridad;
      /** La versión de la tabla en datos con la que se calculó. */
      referencia: string;
      impacto: number;
      alcance: number;
      detectabilidad: number;
      frecuencia: FrecuenciaObservada;
      /** El nivel (desde 1) de la banda de frecuencia que eligió la columna. */
      banda: number;
    };

export type MotivoDeNoCalcular =
  MotivoDeVectorInvalido | "impacto_fuera_de_escala";

export type ResultadoDeSeveridad =
  | { ok: true; severidad: SeveridadCalculada }
  | { ok: false; motivo: MotivoDeNoCalcular; detalle: string };

export function calcularSeveridad(
  entrada: SeveridadDeEntrada,
  /** Lo que midió el sobre que abrió el hallazgo: de ahí sale la frecuencia observada. */
  origen: Pick<Resultado, "evaluadas" | "fallidas">,
  escala: EscalaIa,
): ResultadoDeSeveridad {
  if (entrada.tipo === "cvss") {
    const p = puntuarCvss(entrada.vector);
    if (!p.ok) return p;
    return {
      ok: true,
      severidad: {
        metodo: "cvss",
        nivel: p.nivel,
        referencia: REFERENCIA_DE_CVSS,
        puntaje: p.puntaje,
        vector: p.vector,
        metricas: p.metricas,
      },
    };
  }
  const frecuencia = frecuenciaObservada(origen);
  const banda = bandaDeFrecuencia(escala, frecuencia);
  const nivel = nivelDeEscala(escala, entrada.impacto, banda);
  if (nivel === null)
    return {
      ok: false,
      motivo: "impacto_fuera_de_escala",
      detalle: `${entrada.impacto}`,
    };
  return {
    ok: true,
    severidad: {
      metodo: "escala_ia",
      nivel,
      referencia: `escala-ia@${escala.version}`,
      impacto: entrada.impacto,
      alcance: entrada.alcance,
      detectabilidad: entrada.detectabilidad,
      frecuencia,
      banda,
    },
  };
}
