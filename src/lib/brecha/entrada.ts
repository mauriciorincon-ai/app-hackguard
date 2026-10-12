// Arma la entrada de la brecha desde los mundos que el build ya cargó y comprobó (la instantánea oficial, los activos con
// sus planes y el libro con sus hallazgos). Es la única traducción: las cinco pantallas de la brecha, el informe y los
// tests la usan, así que ninguna cuenta con otra entrada (design-system § 9, «una cuenta, un cálculo»).
import type { UmbralesDeBrecha } from "../../engine/brecha/esquemas.ts";
import type { EntradaDeBrecha } from "../../engine/brecha/calcular.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import type { MundoDeHallazgos } from "../evidencia/cargar.ts";

export function entradaDeBrecha(
  instantanea: Instantanea,
  activos: MundoDeActivos,
  evidencia: MundoDeHallazgos,
  umbrales: UmbralesDeBrecha,
  consulta: string = instantanea.fecha_evaluacion,
): EntradaDeBrecha {
  const c = instantanea.catalogo;
  return {
    consulta,
    umbrales,
    vigencia: c.umbrales.vigencia,
    familias: c.familias,
    pruebas: c.pruebas.map((p) => ({
      id: p.id,
      familia: p.familia,
      controles: p.controles,
      fecha_verificacion: p.fecha_verificacion,
    })),
    activos: activos.activos.map((a) => ({ id: a.activo.id, plan: a.plan })),
    libro: evidencia.libro,
    hallazgos: evidencia.hallazgos,
    lotes: evidencia.lotes,
    escala: evidencia.escala,
    plazos: evidencia.plazos,
  };
}
