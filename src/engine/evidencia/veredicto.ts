// El veredicto de un sobre lo calcula la REGLA DE LA PRUEBA en el catálogo, con los conteos que la herramienta
// midió: jamás una persona que "ve el resultado" ni un modelo (regla dura 1, 2 y 6). Confirmar no cambia el
// veredicto; si la persona discrepa, registra un sobre nuevo que corrige al anterior.
//
// Dos garantías que la prueba fija:
// - sin constancia de que la prueba corrió el veredicto es `no_ejecutada`, nunca `superada` (E-6/E-7);
// - «superada» en una regla sobre k repeticiones exige cero fallas Y haber evaluado al menos k (la cota 3/k
//   del catálogo solo vale así); con menos, el resultado es «parcial».
import type { Resultado, Veredicto } from "./esquemas.ts";

export type MotivoDeErrorDeVeredicto =
  "regla_desconocida" | "falta_k" | "faltan_conteos" | "falta_metrica";

export type CalculoDeVeredicto =
  | { tipo: "calculado"; veredicto: Veredicto }
  /** `revision_de_diseno`: no hay conteo que lo decida; lo declara una persona, con su razón. */
  | { tipo: "declarado" }
  | { tipo: "error"; motivo: MotivoDeErrorDeVeredicto };

export function calcularVeredicto(
  regla: string,
  resultado: Resultado,
  k: number | null,
): CalculoDeVeredicto {
  const calculado = (veredicto: Veredicto): CalculoDeVeredicto => ({
    tipo: "calculado",
    veredicto,
  });
  if (
    ![
      "asimetrica_k",
      "metrica_con_umbral",
      "comprobacion_determinista",
      "revision_de_diseno",
    ].includes(regla)
  )
    return { tipo: "error", motivo: "regla_desconocida" };
  // Sin constancia de ejecución, ninguna regla puede decir «superada» ni «fallida».
  if (!resultado.ejecutada) return calculado("no_ejecutada");

  switch (regla) {
    case "revision_de_diseno":
      return { tipo: "declarado" };
    case "comprobacion_determinista": {
      // Cualquiera de los dos conteos que diga «falló» manda: con alertas = 0 y fallidas = 3, la prueba falló.
      const conteos = [resultado.alertas, resultado.fallidas].filter(
        (x): x is number => x !== null,
      );
      if (conteos.length === 0)
        return { tipo: "error", motivo: "faltan_conteos" };
      return calculado(Math.max(...conteos) > 0 ? "fallida" : "superada");
    }
    case "asimetrica_k": {
      if (k === null) return { tipo: "error", motivo: "falta_k" };
      if (resultado.evaluadas === null || resultado.fallidas === null)
        return { tipo: "error", motivo: "faltan_conteos" };
      if (resultado.fallidas > 0) return calculado("fallida");
      return calculado(resultado.evaluadas >= k ? "superada" : "parcial");
    }
    default: {
      // metrica_con_umbral
      const m = resultado.metrica;
      if (m === null) return { tipo: "error", motivo: "falta_metrica" };
      const cumple =
        m.sentido === "maximo" ? m.valor <= m.umbral : m.valor >= m.umbral;
      return calculado(cumple ? "superada" : "fallida");
    }
  }
}

/**
 * La cota de la tasa de fallo con cero fallas en k repeticiones, en por ciento (regla del tres, E-2): con 95 % de
 * confianza la tasa real no supera 3/k. Con k < 3 no dice nada útil y no pasa del total. Una sola cuenta para el
 * catálogo y para la evidencia.
 */
export const cotaDeFalla = (k: number): number =>
  Math.min(100, Math.round(300 / k));
