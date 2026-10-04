// Fechas civiles (AAAA-MM-DD) sin reloj del sistema. La fecha de consulta es una ENTRADA del
// generador: sale de datos/consulta.json o de MAQUETA_FECHA (perilla de la matriz de envejecimiento).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATOS = join(dirname(fileURLToPath(import.meta.url)), "..", "datos");
const FORMA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Número de día (días desde 1970-01-01, UTC) de una fecha civil; lanza si la fecha no existe. */
function numeroDeDia(fecha) {
  const m = FORMA.exec(fecha);
  if (!m) throw new Error(`fecha con forma inválida: «${fecha}» (se espera AAAA-MM-DD)`);
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(a, mes - 1, d);
  const vuelta = new Date(ms);
  if (vuelta.getUTCFullYear() !== a || vuelta.getUTCMonth() !== mes - 1 || vuelta.getUTCDate() !== d) {
    throw new Error(`fecha que no existe en el calendario: «${fecha}»`);
  }
  return ms / 86_400_000;
}

/** Días civiles de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde, hasta) {
  return numeroDeDia(hasta) - numeroDeDia(desde);
}

/** Fecha civil `dias` después de `fecha`. */
export function sumarDias(fecha, dias) {
  return new Date((numeroDeDia(fecha) + dias) * 86_400_000).toISOString().slice(0, 10);
}

export function fechaDeConsulta() {
  const fecha = process.env.MAQUETA_FECHA ?? JSON.parse(readFileSync(join(DATOS, "consulta.json"), "utf8")).fecha;
  numeroDeDia(fecha);
  return fecha;
}
