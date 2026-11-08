// El esquema Zod de una instantánea LEÍDA de disco (deuda del S10, «`diferencias` sin Zod al leer»). Una instantánea se emite con el validador
// del catálogo, pero se lee más tarde de un archivo que cualquiera pudo tocar: antes de compararla, planear contra ella o mostrarla, se
// comprueba su forma completa (cada sección con el esquema de su dato) y no solo su formato y su huella. Valida; no transforma: quien llama
// sigue usando el objeto leído tal cual, porque su huella se calcula sobre esos bytes.
import { z } from "zod";
import {
  CapaDeControles,
  Equivalencias,
  Estados,
  Familias,
  Fecha,
  Herramienta,
  Huella,
  Marco,
  RasgosDePerfil,
  ReglasDeVeredicto,
  Prueba,
  Umbrales,
} from "./esquemas.ts";
import { FORMATO_DE_INSTANTANEA, type Instantanea } from "./instantanea.ts";
import { ESTADOS_DE_VIGENCIA } from "./semaforo.ts";

const Vigencia = z.strictObject({
  id: z.string().min(1),
  fecha_verificacion: Fecha,
  dias: z.int(),
  estado: z.enum(ESTADOS_DE_VIGENCIA),
});

const VigenciaDeFamilia = z.strictObject({
  id: z.string().min(1),
  estado: z.enum(ESTADOS_DE_VIGENCIA).nullable(),
  dias: z.int().nullable(),
  desglose: z.strictObject({
    vigente: z.int().min(0),
    por_revisar: z.int().min(0),
    vencido: z.int().min(0),
  }),
});

export const EsquemaDeInstantanea = z.strictObject({
  formato: z.literal(FORMATO_DE_INSTANTANEA),
  fecha_evaluacion: Fecha,
  catalogo: z.strictObject({
    familias: Familias.shape.familias,
    reglas_de_veredicto: ReglasDeVeredicto.shape.reglas,
    rasgos: RasgosDePerfil.shape.rasgos,
    filtro: z
      .strictObject({ version: z.string().min(1), fecha: Fecha })
      .nullable(),
    marcos: z.array(Marco),
    equivalencias: z.array(Equivalencias),
    controles: z.array(CapaDeControles),
    herramientas: z.array(Herramienta),
    umbrales: Umbrales,
    estados: Estados.shape.vocabularios,
    pruebas: z.array(Prueba),
  }),
  semaforo: z.strictObject({
    pruebas: z.array(Vigencia),
    marcos: z.array(Vigencia),
    herramientas: z.array(Vigencia),
    familias: z.array(VigenciaDeFamilia),
  }),
  pendientes_de_revision: z.array(
    z.strictObject({
      id: z.string().min(1),
      motivo: z.enum([
        "propuesta",
        "marcada_para_revision",
        "revision_desactualizada",
      ]),
    }),
  ),
  advertencias: z.array(
    z.strictObject({
      regla: z.string(),
      severidad: z.string(),
      ruta: z.string(),
      campo: z.string(),
      detalle: z.strictObject({ es: z.string(), en: z.string() }).nullable(),
    }),
  ),
  huella: Huella,
});

/**
 * Comprueba la forma de lo que se leyó de `nombre` y lo devuelve como `Instantanea` SIN transformarlo. Si no la cumple, lanza un error en los
 * dos idiomas con las primeras rutas que fallan.
 */
export function comprobarInstantanea(
  leido: unknown,
  nombre: string,
): Instantanea {
  const r = EsquemaDeInstantanea.safeParse(leido);
  if (r.success) return leido as Instantanea;
  const rutas = r.error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ");
  const mas =
    r.error.issues.length > 3 ? ` (+${r.error.issues.length - 3})` : "";
  throw new Error(
    `${nombre}: no es una instantánea válida, ${rutas}${mas} / is not a valid snapshot`,
  );
}
