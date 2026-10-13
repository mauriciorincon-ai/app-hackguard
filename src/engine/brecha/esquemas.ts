// Esquema de los umbrales de la brecha: el dato que dice desde cuándo la evidencia de un control es antigua (RF-05.5).
// Es DATO (regla dura 10) y vive en `datos/brecha/umbrales.json`, aparte de los umbrales de vigencia del catálogo: así la
// instantánea del catálogo, que copia aquellos, no cambia. Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import { Nombre, ROLES, SIMBOLOS, Texto } from "../catalogo/esquemas.ts";

export const UmbralesDeBrecha = z.strictObject({
  version: Nombre,
  /** Días desde la evidencia más reciente de un control a partir de los cuales deja de ser vigente. */
  evidencia_antigua: z.int().min(1).max(3650),
  origen: Texto,
});
export type UmbralesDeBrecha = z.infer<typeof UmbralesDeBrecha>;

/** Los estados de un control que el motor calcula: cada uno tiene su etiqueta en `datos/estados.json`. */
export const ESTADOS_DE_CONTROL = [
  "con_fallas",
  "sin_evidencia",
  "evidencia_antigua",
  "con_evidencia_vigente",
] as const;
export type EstadoDeControl = (typeof ESTADOS_DE_CONTROL)[number];

/** Las etiquetas de estado propias de las pantallas de la brecha: todo lo que no es un vocabulario del catálogo. */
export const IDS_DE_ETIQUETAS_DE_BRECHA = [
  "por_confirmar",
  "por_decidir",
  "sin_plan",
  "ficha_vencida",
  "version_nueva",
  "evidencia_antigua_alerta",
  "antigua",
  "marcadas_para_revision",
  "instrumento_verde",
  "instrumento_rojo",
  "comprobacion_verde",
  "comprobacion_roja",
  "sin_registro",
  "vacio",
  "evidencia_esperando",
] as const;
export type IdDeEtiquetaDeBrecha = (typeof IDS_DE_ETIQUETAS_DE_BRECHA)[number];

/** Los textos sueltos de las pantallas de la brecha (las cifras de arriba y el nombre de las comprobaciones): dato, no código. */
export const IDS_DE_TEXTOS_DE_BRECHA = [
  "cifra_sin_cerrar",
  "cifra_vencidos",
  "cifra_por_confirmar",
  "cifra_por_decidir",
  "cifra_graves",
  "cifra_sin_evidencia",
  "cifra_ejecutadas",
  "comprobacion_cierres_prohibidos",
  "comprobacion_no_detectado",
] as const;
export type IdDeTextoDeBrecha = (typeof IDS_DE_TEXTOS_DE_BRECHA)[number];

export const EtiquetasDeBrecha = z.strictObject({
  version: Nombre,
  nota: Texto,
  etiquetas: z
    .array(
      z.strictObject({
        id: z.enum(IDS_DE_ETIQUETAS_DE_BRECHA),
        rol: z.enum(ROLES),
        simbolo: z.enum(SIMBOLOS),
        nombre: Texto,
      }),
    )
    .refine(
      (es) =>
        IDS_DE_ETIQUETAS_DE_BRECHA.every((id) => es.some((e) => e.id === id)) &&
        new Set(es.map((e) => e.id)).size === es.length,
      { message: "etiquetas-de-brecha:cada-id-una-vez" },
    ),
  textos: z.record(z.enum(IDS_DE_TEXTOS_DE_BRECHA), Texto),
});
export type EtiquetasDeBrecha = z.infer<typeof EtiquetasDeBrecha>;
