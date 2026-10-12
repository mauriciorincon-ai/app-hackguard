// La muestra de la confirmación por lote (E-5, RF-04.2): calidad límite y aceptación con cero errores.
//
// Las fallidas y parciales se revisan SIEMPRE; el resto del lote (lo que la herramienta dice que pasó o no corrió) se
// revisa por muestra. El plan es un DATO (`datos/evidencia/muestreo.json`) y se valida con aritmética entera exacta:
// un lote de r sobres «del resto» con una fracción LQ mal tiene D = ceil(r·LQ) sobres mal; una muestra de n sin errores
// lo acepta con probabilidad C(r−D, n)/C(r, n). El tramo es válido si esa probabilidad no pasa del riesgo del consumidor
// para CADA r del tramo (el mínimo exacto no es monótono: el salto de ceil(r·LQ) lo mueve).
//
// La elección es determinista (regla dura 1): se ordena el resto por SHA-256(huella del lote + id) y se toman los
// primeros n. Sin azar, sin reloj; la huella del lote es la semilla y la misma en Node y en los navegadores. Un lote
// trae un sobre por prueba del plan, así que cada estrato (prueba) tiene un solo elemento: la muestra es simple.
import { sha256 } from "../huella.ts";
import { comparar } from "../planificador/orden.ts";
import type { PlanDeMuestreo } from "./esquemas.ts";

/** Hasta qué tamaño del resto se comprueba el último tramo uno por uno; más allá vale la cota binomial. */
const LIMITE_DE_COMPROBACION = 5000;

/** Cuántos sobres «mal» tiene un resto de r en la calidad límite: ceil(r · LQ / 100). */
export const malosDelResto = (r: number, lqPorCiento: number): number =>
  Math.ceil((r * lqPorCiento) / 100);

/** P(aceptar) = ∏ (r − D − i)/(r − i), i < n, como fracción de BigInt (sin decimales). */
export function probabilidadDeAceptar(
  r: number,
  n: number,
  lqPorCiento: number,
): { numerador: bigint; denominador: bigint } {
  const malos = malosDelResto(r, lqPorCiento);
  let numerador = BigInt(1);
  let denominador = BigInt(1);
  for (let i = 0; i < n; i += 1) {
    const buenos = r - malos - i;
    if (buenos <= 0) return { numerador: BigInt(0), denominador: BigInt(1) };
    numerador *= BigInt(buenos);
    denominador *= BigInt(r - i);
  }
  return { numerador, denominador };
}

/** ¿Una muestra de n sin errores sobre un resto de r cumple el riesgo del consumidor? */
export function cumpleElRiesgo(
  r: number,
  n: number,
  plan: Pick<
    PlanDeMuestreo,
    "calidad_limite_por_ciento" | "riesgo_del_consumidor_por_ciento"
  >,
): boolean {
  const { numerador, denominador } = probabilidadDeAceptar(
    r,
    n,
    plan.calidad_limite_por_ciento,
  );
  return (
    numerador * BigInt(100) <=
    denominador * BigInt(plan.riesgo_del_consumidor_por_ciento)
  );
}

/** Para un lote infinito vale la cota binomial: (1 − LQ)^n ≤ riesgo, también en enteros. */
export function cumpleLaCotaBinomial(
  n: number,
  plan: Pick<
    PlanDeMuestreo,
    "calidad_limite_por_ciento" | "riesgo_del_consumidor_por_ciento"
  >,
): boolean {
  const buenos = BigInt(100 - plan.calidad_limite_por_ciento) ** BigInt(n);
  const todos = BigInt(100) ** BigInt(n);
  return (
    buenos * BigInt(100) <=
    todos * BigInt(plan.riesgo_del_consumidor_por_ciento)
  );
}

/** Cuántos sobres del resto se revisan en un lote cuyo resto tiene ese tamaño. */
export function tamanoDeMuestra(resto: number, plan: PlanDeMuestreo): number {
  if (resto <= 0) return 0;
  const tramo =
    plan.tramos.find((t) => t.hasta === null || resto <= t.hasta) ??
    plan.tramos[plan.tramos.length - 1];
  if (tramo === undefined || tramo.muestra === null) return resto;
  return Math.min(resto, tramo.muestra);
}

export type ErrorDePlanDeMuestreo =
  | "tramos_fuera_de_orden"
  | "ultimo_tramo_con_tope"
  | "tramo_no_cumple_el_riesgo"
  | "tramo_pide_mas_que_su_tope";

/**
 * Comprueba que cada tramo del plan cumple el riesgo declarado para TODO tamaño del resto que cubre. Devuelve los
 * errores con el tramo (índice) y el tamaño que lo rompe; vacío = el plan es válido.
 */
export function validarPlanDeMuestreo(
  plan: PlanDeMuestreo,
): { error: ErrorDePlanDeMuestreo; tramo: number; r: number | null }[] {
  const errores: {
    error: ErrorDePlanDeMuestreo;
    tramo: number;
    r: number | null;
  }[] = [];
  let anterior = 0;
  plan.tramos.forEach((t, i) => {
    const ultimo = i === plan.tramos.length - 1;
    if (ultimo && t.hasta !== null)
      errores.push({ error: "ultimo_tramo_con_tope", tramo: i, r: null });
    if (!ultimo && (t.hasta === null || t.hasta <= anterior))
      errores.push({ error: "tramos_fuera_de_orden", tramo: i, r: null });
    const hasta = t.hasta ?? LIMITE_DE_COMPROBACION;
    if (t.muestra !== null) {
      if (t.hasta !== null && t.muestra > t.hasta)
        errores.push({
          error: "tramo_pide_mas_que_su_tope",
          tramo: i,
          r: t.hasta,
        });
      for (let r = anterior + 1; r <= hasta; r += 1)
        if (r >= t.muestra && !cumpleElRiesgo(r, t.muestra, plan)) {
          errores.push({ error: "tramo_no_cumple_el_riesgo", tramo: i, r });
          break;
        }
      if (t.hasta === null && !cumpleLaCotaBinomial(t.muestra, plan))
        errores.push({
          error: "tramo_no_cumple_el_riesgo",
          tramo: i,
          r: null,
        });
    }
    if (t.hasta !== null) anterior = t.hasta;
  });
  return errores;
}

/**
 * Los n sobres de la muestra: el resto ordenado por SHA-256(semilla:id), los n primeros, y devueltos en el orden del
 * libro. La misma lista, en cualquier orden de entrada, da la misma muestra.
 */
export async function elegirMuestra(
  ids: readonly string[],
  n: number,
  semilla: string,
): Promise<string[]> {
  const claves = await Promise.all(
    ids.map(async (id) => ({ id, clave: await sha256(`${semilla}:${id}`) })),
  );
  return claves
    .sort((a, b) => comparar(a.clave, b.clave) || comparar(a.id, b.id))
    .slice(0, n)
    .map((c) => c.id)
    .sort(comparar);
}
