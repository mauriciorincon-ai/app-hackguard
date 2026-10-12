// El mundo de la brecha para los tests: la instantánea oficial, los activos con sus planes, el libro con sus hallazgos y los
// umbrales de la brecha, ya cargados y comprobados como los carga el build.
import type { EntradaDeBrecha } from "../../../src/engine/brecha/calcular.ts";
import { cargarUmbralesDeBrecha } from "../../../src/lib/brecha/cargar.ts";
import { entradaDeBrecha } from "../../../src/lib/brecha/entrada.ts";
import { instantanea, mundo as activos } from "./mundo-de-activos";
import { mundoDeHallazgos } from "./mundo-de-hallazgos";

export { activos, instantanea, mundoDeHallazgos };
export const umbralesDeBrecha = cargarUmbralesDeBrecha(process.cwd());

/** La entrada de la brecha con los datos demo en una fecha de consulta (por omisión, la de la instantánea). */
export const entradaDemo = (
  consulta: string = instantanea.fecha_evaluacion,
): EntradaDeBrecha =>
  entradaDeBrecha(
    instantanea,
    activos,
    mundoDeHallazgos,
    umbralesDeBrecha,
    consulta,
  );
