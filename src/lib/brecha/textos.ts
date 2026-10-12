// Textos de dominio de las pantallas de la brecha que no son estado: cómo se dice una desviación, un plural, la frase de un
// control. Lo que es estado (rol, símbolo) vive en datos (`datos/estados.json`, `datos/brecha/etiquetas.json`), no aquí.
import type { Desviacion } from "../../engine/brecha/calcular.ts";
import type { EstadoDeControl } from "../../engine/brecha/esquemas.ts";
import type { Bilingue } from "../catalogo/tipos.ts";

export const plural = (n: number, uno: string, varios: string): string =>
  n === 1 ? uno : varios;

/** La norma y la advertencia que acompañan a toda vista por control (E-16): evidencia organizada, no aseguramiento. */
export const EVIDENCIA_ORGANIZADA: Bilingue = {
  es: "Esto es evidencia organizada para quien deba evaluarla. No mide el nivel de aseguramiento ni certifica cumplimiento.",
  en: "This is evidence organized for whoever must assess it. It does not measure assurance or certify compliance.",
};

/** Cuánto se apartó lo obtenido de lo esperado (RF-05.1). «No detectado» nunca se lee como «ninguna». */
export function textoDeDesviacion(d: Desviacion): Bilingue {
  switch (d.tipo) {
    case "sin_medir":
      return {
        es: "Sin medir: no hay resultado confirmado",
        en: "Not measured: no confirmed result",
      };
    case "no_medible":
      return {
        es: "No medible: no detectado no es verificado",
        en: "Not measurable: not detected is not verified",
      };
    case "no_aplicable":
      return {
        es: "No aplica a este activo",
        en: "Does not apply to this asset",
      };
    case "fallas":
      return {
        es: `${d.n} ${plural(d.n, "falla", "fallas")} donde la regla admite 0`,
        en: `${d.n} ${plural(d.n, "failure", "failures")} where the rule allows 0`,
      };
    case "alertas":
      return {
        es: "Alertas donde no debía haber ninguna",
        en: "Alerts where there should be none",
      };
    case "fuera_del_limite":
      return { es: "Fuera del límite fijado", en: "Outside the set limit" };
    case "dentro_del_limite":
      return { es: "Dentro del límite fijado", en: "Within the set limit" };
    case "ninguna":
      return { es: "Ninguna", en: "None" };
  }
}

/** El plural de «día» en los dos idiomas. */
export const dias = (n: number): Bilingue => ({
  es: `${n} ${plural(n, "día", "días")}`,
  en: `${n} ${plural(n, "day", "days")}`,
});

/** La frase que acompaña al sello de un control: por qué está en el estado en que está. */
export function fraseDeControl(e: {
  estado: EstadoDeControl;
  pruebas: number;
  conFallas: number;
  sinEvidencia: number;
  atrasoMaximo: number;
  umbral: number;
}): Bilingue {
  const { pruebas: total, conFallas: fallas } = e;
  if (total === 0)
    return {
      es: "Ninguna prueba de los planes lo cubre: las que lo harían quedaron fuera.",
      en: "No test in the plans covers it: the ones that would were left out.",
    };
  if (e.estado === "con_fallas")
    return {
      es:
        `${fallas} de ${total} pruebas ${plural(fallas, "falló", "fallaron")}. ` +
        (e.atrasoMaximo > 0
          ? `El hallazgo más atrasado lleva ${e.atrasoMaximo} ${plural(e.atrasoMaximo, "día", "días")} vencido.`
          : "Sus hallazgos siguen dentro del plazo."),
      en:
        `${fallas} of ${total} tests failed. ` +
        (e.atrasoMaximo > 0
          ? `The most overdue finding is ${e.atrasoMaximo} ${plural(e.atrasoMaximo, "day", "days")} past its deadline.`
          : "Its findings are still within their deadlines."),
    };
  if (e.estado === "sin_evidencia")
    return {
      es: `Ninguna de sus ${total} pruebas tiene resultado confirmado.`,
      en: `None of its ${total} tests has a confirmed result.`,
    };
  if (e.estado === "evidencia_antigua")
    return {
      es: `Toda su evidencia tiene ${e.umbral} días o más.`,
      en: `All its evidence is ${e.umbral} days old or more.`,
    };
  return e.sinEvidencia > 0
    ? {
        es: `Hay evidencia reciente y ninguna prueba falló; ${e.sinEvidencia} de ${total} todavía no tienen resultado.`,
        en: `There is recent evidence and no test failed; ${e.sinEvidencia} of ${total} have no result yet.`,
      }
    : {
        es: "Hay evidencia reciente y ninguna prueba falló.",
        en: "There is recent evidence and no test failed.",
      };
}
