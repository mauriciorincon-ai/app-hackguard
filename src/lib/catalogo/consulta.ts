// La fecha de consulta: la fecha con que se calcula el semáforo de vigencia. Es una ENTRADA del build, jamás el reloj
// (regla dura 1 y 10). Precedencia:
//   1. `HACKGUARD_CONSULTA` (AAAA-MM-DD): la perilla de la matriz de envejecimiento (regla 23).
//   2. La fecha del commit que se construye: así lo que se publica «ya envejeció» hasta el día en que se hizo ese commit, y
//      todos los builds de un mismo commit (la CI, el proveedor, el preview) dan los mismos bytes.
//   3. La fecha de evaluación de la instantánea, si el commit es anterior a ella o no se pudo leer.
import { esFechaCivil } from "../../engine/fecha.ts";

export function fechaDeConsulta(
  fechaDeLaInstantanea: string,
  perilla?: string,
  fechaDelCommit?: string,
): string {
  const pedida = perilla?.trim();
  if (pedida) {
    if (!esFechaCivil(pedida)) {
      throw new RangeError(
        `la fecha de consulta «${pedida}» no es una fecha AAAA-MM-DD / the query date «${pedida}» is not a YYYY-MM-DD date`,
      );
    }
    return pedida;
  }
  // Fechas AAAA-MM-DD: el orden de las cadenas es el orden del calendario.
  if (
    fechaDelCommit &&
    esFechaCivil(fechaDelCommit) &&
    fechaDelCommit > fechaDeLaInstantanea
  )
    return fechaDelCommit;
  return fechaDeLaInstantanea;
}
