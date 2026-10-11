// La fecha de consulta: la fecha con que se calcula el semáforo de vigencia. Es una ENTRADA del build, jamás el reloj
// (regla dura 1 y 10). Por defecto, la fecha de evaluación de la instantánea oficial; la perilla `HACKGUARD_CONSULTA`
// (AAAA-MM-DD) permite construir la pantalla en cada fecha en que algo cambia de estado (regla 23).
import { esFechaCivil } from "../../engine/fecha.ts";

export function fechaDeConsulta(
  fechaDeLaInstantanea: string,
  perilla?: string,
): string {
  const fecha = perilla?.trim() ? perilla.trim() : fechaDeLaInstantanea;
  if (!esFechaCivil(fecha)) {
    throw new RangeError(
      `la fecha de consulta «${fecha}» no es una fecha AAAA-MM-DD / the query date «${fecha}» is not a YYYY-MM-DD date`,
    );
  }
  return fecha;
}
