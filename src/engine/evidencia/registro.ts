// Registrar un resultado a mano (vía manual, E-6): la persona escribe lo que la herramienta midió (los conteos, no su
// salida) y el motor arma el sobre con todo lo demás, que sale del plan y del paquete: selector, repeticiones k,
// regla y las huellas que cita. El veredicto sale de la regla de la prueba. El sobre nace SIN confirmar: una
// propuesta que no cuenta hasta que otra persona (o la misma, a propósito) la confirme.
//
// El crudo de la herramienta jamás llega aquí: solo su huella, que el CLI calcula y descarta el archivo.
import { z } from "zod";
import {
  Fecha,
  IdMinusculas,
  IdPrueba,
  Nombre,
  Texto,
} from "../catalogo/esquemas.ts";
import {
  IdHallazgo,
  IdSobre,
  ORIGENES_DE_SOBRE,
  Resultado,
  VEREDICTOS,
  FORMATO_DE_SOBRE,
  type Sobre,
} from "./esquemas.ts";
import { sellar } from "./huellas.ts";
import type { PlanDeActivo } from "./validar.ts";
import {
  calcularVeredicto,
  type MotivoDeErrorDeVeredicto,
} from "./veredicto.ts";

/** Lo que una persona escribe para registrar una corrida. */
export const EntradaDeRegistro = z.strictObject({
  activo: IdMinusculas,
  prueba: IdPrueba,
  herramienta: z.strictObject({ id: IdMinusculas, version: Nombre }),
  fecha: Fecha,
  zona_horaria: Nombre,
  ejecutado_por: Nombre,
  resultado: Resultado,
  /** Solo para una revisión de diseño, que no tiene conteo que decida: la declara la persona. */
  veredicto: z.enum(VEREDICTOS).optional(),
  razon: Texto.optional(),
  extracto_redactado: z.string().min(1).max(1500).optional(),
  advertencias: z.array(Texto).optional(),
  corrige: IdSobre.optional(),
  reprueba_de: IdHallazgo.optional(),
});
export type EntradaDeRegistro = z.infer<typeof EntradaDeRegistro>;

export type MotivoDeNoRegistrar =
  | "prueba_fuera_del_plan"
  | "veredicto_declarado_requerido"
  | MotivoDeErrorDeVeredicto;

export type ResultadoDeRegistro =
  { ok: true; sobre: Sobre } | { ok: false; motivo: MotivoDeNoRegistrar };

export async function armarSobre(
  entrada: EntradaDeRegistro,
  contexto: {
    id: string;
    origen: (typeof ORIGENES_DE_SOBRE)[number];
    emitido: PlanDeActivo;
    /** La regla de veredicto de la prueba en el catálogo. */
    regla: string;
    /** La huella del crudo (o la del sintético): el crudo mismo no entra. */
    crudo: string;
  },
): Promise<ResultadoDeRegistro> {
  let delPaquete: { selector: Sobre["selector"]; k: number | null } | null =
    null;
  for (const h of contexto.emitido.paquete.herramientas) {
    const p = h.pruebas.find((x) => x.prueba === entrada.prueba);
    if (p !== undefined) delPaquete = { selector: p.selector, k: p.k };
  }
  if (delPaquete === null)
    return { ok: false, motivo: "prueba_fuera_del_plan" };

  const calculo = calcularVeredicto(
    contexto.regla,
    entrada.resultado,
    delPaquete.k,
  );
  if (calculo.tipo === "error") return { ok: false, motivo: calculo.motivo };
  let veredicto;
  if (calculo.tipo === "calculado") veredicto = calculo.veredicto;
  else if (entrada.veredicto === undefined)
    return { ok: false, motivo: "veredicto_declarado_requerido" };
  else veredicto = entrada.veredicto;

  const sinHuellas: Omit<Sobre, "huellas"> = {
    formato: FORMATO_DE_SOBRE,
    id: contexto.id,
    origen: contexto.origen,
    activo: entrada.activo,
    prueba: entrada.prueba,
    plan: { huella: contexto.emitido.plan.huella },
    paquete: { huella: contexto.emitido.plan.paquete.huella },
    herramienta: entrada.herramienta,
    selector: delPaquete.selector,
    regla: contexto.regla,
    k: delPaquete.k,
    resultado: entrada.resultado,
    veredicto,
    fecha: entrada.fecha,
    zona_horaria: entrada.zona_horaria,
    ejecutado_por: entrada.ejecutado_por,
    advertencias: entrada.advertencias ?? [],
    razon: entrada.razon ?? null,
    extracto_redactado: entrada.extracto_redactado ?? null,
    corrige: entrada.corrige ?? null,
    reprueba_de: entrada.reprueba_de ?? null,
    confirmacion: null,
  };
  return { ok: true, sobre: await sellar(sinHuellas, contexto.crudo) };
}
