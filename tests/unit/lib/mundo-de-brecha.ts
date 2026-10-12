// El mundo de la brecha para los tests: la instantánea oficial, los activos con sus planes, el libro con sus hallazgos y los
// umbrales de la brecha, ya cargados y comprobados como los carga el build.
import type { EntradaDeBrecha } from "../../../src/engine/brecha/calcular.ts";
import {
  cargarEtiquetasDeBrecha,
  cargarSemillasDeCierre,
  cargarUmbralesDeBrecha,
} from "../../../src/lib/brecha/cargar.ts";
import { entradaDeBrecha } from "../../../src/lib/brecha/entrada.ts";
import {
  armarMundoDeBrecha,
  type MundoDeBrecha,
} from "../../../src/lib/brecha/mundo.ts";
import {
  instantanea,
  mundo as activos,
  nombreDeLaInstantanea,
} from "./mundo-de-activos";
import { mundoDeHallazgos } from "./mundo-de-hallazgos";
import {
  armarMundoDePropuestas,
  cargarMundoDePropuestas,
} from "../../../src/lib/propuestas/pagina.ts";
import { resumenDePropuestas } from "../../../src/lib/propuestas/resumen.ts";

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

export const etiquetasDeBrecha = cargarEtiquetasDeBrecha(process.cwd());
export const semillasDeCierre = cargarSemillasDeCierre(process.cwd());

/** Las propuestas reales del repositorio (las corridas demo selladas y el libro): lo mismo que lee el build. */
export const propuestasDelRepo = await cargarMundoDePropuestas(
  {
    instantanea,
    nombre: nombreDeLaInstantanea,
    consulta: instantanea.fecha_evaluacion,
    activos,
  },
  process.cwd(),
);

/**
 * Solo las corridas demo (`propuestas/demo/`): las cifras que las pruebas fijan. El repositorio versiona corridas reales que cambian
 * esas cuentas (la bandeja y el build las muestran todas), así que las pruebas de cifras no leen el mundo entero.
 */
export const propuestasDemo = armarMundoDePropuestas({
  instantanea: propuestasDelRepo.instantanea,
  nombre: propuestasDelRepo.nombre,
  consulta: propuestasDelRepo.consulta,
  activos: propuestasDelRepo.activos,
  etiquetas: propuestasDelRepo.etiquetas,
  umbrales: propuestasDelRepo.umbrales,
  corridas: propuestasDelRepo.corridas.filter((c) => c.lugar === "demo"),
  problemasDeCarga: propuestasDelRepo.problemasDeCarga,
  decisiones: propuestasDelRepo.decisiones,
});

/**
 * El mundo completo de la brecha en una fecha de consulta (por omisión, la de la instantánea): la entrada de las cinco vistas. Con las
 * propuestas del repositorio, como el build; con `propuestas: false`, sin ellas (el mundo de antes del S8).
 */
export const mundoDeBrecha = (
  consulta: string = instantanea.fecha_evaluacion,
  { propuestas = true }: { propuestas?: boolean } = {},
): Promise<MundoDeBrecha> =>
  armarMundoDeBrecha({
    instantanea,
    nombre: nombreDeLaInstantanea,
    consulta,
    activos,
    evidencia: mundoDeHallazgos,
    umbrales: umbralesDeBrecha,
    etiquetas: etiquetasDeBrecha,
    semillas: semillasDeCierre,
    ...(propuestas
      ? { propuestas: resumenDePropuestas(propuestasDelRepo) }
      : {}),
  });
