// Fechas civiles AAAA-MM-DD con aritmética entera. El núcleo jamás lee el reloj (regla dura 1, RNF-01): la
// fecha de evaluación es una entrada, y los días entre dos fechas se cuentan con el algoritmo civil de días
// desde la época (Howard Hinnant, «chrono-Compatible Low-Level Date Algorithms»), sin `Date` ni zona horaria.

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_PARCIAL = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

const esBisiesto = (anio: number): boolean =>
  (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

const diasDelMes = (anio: number, mes: number): number =>
  mes === 2
    ? esBisiesto(anio)
      ? 29
      : 28
    : [4, 6, 9, 11].includes(mes)
      ? 30
      : 31;

const valida = (anio: number, mes: number, dia: number): boolean =>
  anio >= 1 &&
  mes >= 1 &&
  mes <= 12 &&
  dia >= 1 &&
  dia <= diasDelMes(anio, mes);

/** `true` si el texto es una fecha civil completa que existe (2026-02-29 no existe). */
export function esFechaCivil(texto: string): boolean {
  const m = FECHA.exec(texto);
  return m !== null && valida(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Año, año-mes o fecha completa: la precisión con que un editor publica una versión. */
export function esFechaParcial(texto: string): boolean {
  const m = FECHA_PARCIAL.exec(texto);
  if (m === null) return false;
  const anio = Number(m[1]);
  if (m[2] === undefined) return anio >= 1;
  const mes = Number(m[2]);
  if (m[3] === undefined) return anio >= 1 && mes >= 1 && mes <= 12;
  return valida(anio, mes, Number(m[3]));
}

/** Días desde 1970-01-01 (negativos antes). Lanza si la fecha no es civil. */
export function diasDesdeEpoca(texto: string): number {
  if (!esFechaCivil(texto)) throw new Error(`fecha no civil: ${texto}`);
  const [a, m, d] = texto.split("-").map(Number);
  const anio = m <= 2 ? a - 1 : a;
  const era = Math.floor(anio / 400);
  const anioDeEra = anio - era * 400;
  const diaDelAnio = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const diaDeEra =
    anioDeEra * 365 +
    Math.floor(anioDeEra / 4) -
    Math.floor(anioDeEra / 100) +
    diaDelAnio;
  return era * 146097 + diaDeEra - 719468;
}

/** Días de `desde` a `hasta` (negativo si `hasta` es anterior). */
export const diasEntre = (desde: string, hasta: string): number =>
  diasDesdeEpoca(hasta) - diasDesdeEpoca(desde);

/** La fecha civil `dias` días después de `fecha` (antes, si es negativo). El inverso de `diasDesdeEpoca`. */
export function fechaMasDias(fecha: string, dias: number): string {
  if (!Number.isSafeInteger(dias)) throw new Error(`días no enteros: ${dias}`);
  const z = diasDesdeEpoca(fecha) + dias + 719468;
  const era = Math.floor(z / 146097);
  const diaDeEra = z - era * 146097;
  const anioDeEra = Math.floor(
    (diaDeEra -
      Math.floor(diaDeEra / 1460) +
      Math.floor(diaDeEra / 36524) -
      Math.floor(diaDeEra / 146096)) /
      365,
  );
  const diaDelAnio =
    diaDeEra -
    (365 * anioDeEra + Math.floor(anioDeEra / 4) - Math.floor(anioDeEra / 100));
  const mesDesdeMarzo = Math.floor((5 * diaDelAnio + 2) / 153);
  const dia = diaDelAnio - Math.floor((153 * mesDesdeMarzo + 2) / 5) + 1;
  const mes = mesDesdeMarzo < 10 ? mesDesdeMarzo + 3 : mesDesdeMarzo - 9;
  const anio = anioDeEra + era * 400 + (mes <= 2 ? 1 : 0);
  const texto = `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  if (!esFechaCivil(texto))
    throw new Error(`fuera del rango 0001–9999: ${fecha} + ${dias}`);
  return texto;
}
