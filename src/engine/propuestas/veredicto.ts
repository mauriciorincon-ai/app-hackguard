// El veredicto sugerido de una candidata del extractor (D2 y C2 del plan v2): lo calcula la REGLA de la prueba en el catálogo, y solo
// sobre los campos cuya cita verificó el código. El modelo no emite veredicto: el esquema de su borrador no tiene dónde ponerlo.
// Sin un conteo verificado no hay veredicto: la propuesta llega a una persona diciendo qué falta.
import { calcularVeredicto } from "../evidencia/veredicto.ts";
import type { Resultado } from "../evidencia/esquemas.ts";
import type {
  CampoCitable,
  CandidataDeSobre,
  EstadoDeCita,
  VeredictoSugerido,
} from "./esquemas.ts";

export type MotivoSinVeredicto =
  | "sin_conteos_verificados"
  | "faltan_conteos"
  | "regla_desconocida"
  | "falta_k"
  | "falta_metrica"
  | "declarado_por_persona"
  | "prueba_fuera_del_plan";

export type VeredictoDeCandidata =
  | { veredicto_sugerido: VeredictoSugerido; sin_veredicto: null }
  | { veredicto_sugerido: null; sin_veredicto: MotivoSinVeredicto };

/** Los campos que, verificados, prueban que la herramienta corrió y dicen lo que midió. */
const CAMPOS_DE_RESULTADO: readonly CampoCitable[] = [
  "resultado.ejecutada",
  "resultado.evaluadas",
  "resultado.fallidas",
  "resultado.alertas",
  "resultado.metrica",
];

export interface ReglaDeLaPrueba {
  regla: string;
  k: number | null;
}

/**
 * El resultado con SOLO los campos cuya cita verificó el código; `null` si ninguno de los que prueban que la herramienta corrió se
 * verificó. Un conteo citado (evaluadas, fallidas, alertas o métrica) prueba que corrió; una cita de «ejecutada» dice si corrió.
 * Es también lo que lleva el sobre que nace de aprobar la propuesta: ningún valor sin su cita.
 */
export function resultadoVerificado(
  candidata: Pick<CandidataDeSobre, "entrada">,
  citas: readonly { campo: CampoCitable; estado: EstadoDeCita }[],
): { resultado: Resultado; campos: CampoCitable[] } | null {
  const verificados = new Set(
    citas.filter((c) => c.estado === "verificada").map((c) => c.campo),
  );
  if (!CAMPOS_DE_RESULTADO.some((c) => verificados.has(c))) return null;
  const propuesto = candidata.entrada.resultado;
  const conteoVerificado = (
    [
      "resultado.evaluadas",
      "resultado.fallidas",
      "resultado.alertas",
      "resultado.metrica",
    ] as const
  ).some((c) => verificados.has(c));
  return {
    resultado: {
      ejecutada: verificados.has("resultado.ejecutada")
        ? propuesto.ejecutada
        : conteoVerificado,
      evaluadas: verificados.has("resultado.evaluadas")
        ? propuesto.evaluadas
        : null,
      fallidas: verificados.has("resultado.fallidas")
        ? propuesto.fallidas
        : null,
      alertas: verificados.has("resultado.alertas") ? propuesto.alertas : null,
      metrica: verificados.has("resultado.metrica") ? propuesto.metrica : null,
    },
    campos: CAMPOS_DE_RESULTADO.filter((c) => verificados.has(c)),
  };
}

/** Le pide el veredicto a la regla de la prueba, con el resultado verificado. Sin un conteo verificado no hay veredicto. */
export function veredictoDeCandidata(
  candidata: Pick<CandidataDeSobre, "entrada">,
  citas: readonly { campo: CampoCitable; estado: EstadoDeCita }[],
  prueba: ReglaDeLaPrueba | undefined,
): VeredictoDeCandidata {
  if (prueba === undefined)
    return { veredicto_sugerido: null, sin_veredicto: "prueba_fuera_del_plan" };
  const verificado = resultadoVerificado(candidata, citas);
  if (verificado === null)
    return {
      veredicto_sugerido: null,
      sin_veredicto: "sin_conteos_verificados",
    };
  const calculo = calcularVeredicto(
    prueba.regla,
    verificado.resultado,
    prueba.k,
  );
  if (calculo.tipo === "calculado")
    return {
      veredicto_sugerido: {
        veredicto: calculo.veredicto,
        regla: prueba.regla,
        k: prueba.k,
        campos: verificado.campos,
      },
      sin_veredicto: null,
    };
  if (calculo.tipo === "declarado")
    return { veredicto_sugerido: null, sin_veredicto: "declarado_por_persona" };
  return { veredicto_sugerido: null, sin_veredicto: calculo.motivo };
}
