// La antigüedad de la versión de un marco (U3 = 180 días; D4 del plan v2): pasado el plazo, una persona la mira antes de usarla. Es el
// mismo plazo que HackGuard usa para la evidencia antigua. La fecha de la corrida es una entrada: jamás el reloj.
import { diasEntre } from "../fecha.ts";

/**
 * Días entre la fecha de la versión y la de la corrida. Una fecha parcial cuenta desde el PRIMER día de su periodo (`2026` →
 * `2026-01-01`), que es lo más conservador: nunca hace parecer más joven a un marco. Sin fecha de versión no hay cuenta: `null`.
 */
export function antiguedadDelMarco(
  fechaVersion: string | null,
  fechaDeLaCorrida: string,
): number | null {
  if (fechaVersion === null) return null;
  const [anio, mes = "01", dia = "01"] = fechaVersion.split("-");
  return diasEntre(`${anio}-${mes}-${dia}`, fechaDeLaCorrida);
}
