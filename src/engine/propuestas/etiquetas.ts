// Las etiquetas de estado de la bandeja de propuestas (`datos/propuestas/etiquetas.json`): estado de una propuesta, estado de una fuente y
// de una cita, marcas del filtro y motivos de la pausa. El rol de color y el símbolo salen de datos, nunca de un componente (regla dura 12:
// símbolo + texto + color, y el color es un rol). Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import { Nombre, ROLES, SIMBOLOS, Texto } from "../catalogo/esquemas.ts";

export const IDS_DE_ETIQUETAS_DE_PROPUESTAS = [
  // El estado de una propuesta en la bandeja
  "por_decidir",
  "aprobada",
  "rechazada",
  "separada",
  // Lo que el código comprobó de una fuente
  "fuente_verificada",
  "fuente_sin_fragmento",
  "fuente_fuera_de_lista_blanca",
  "fuente_sin_lectura",
  "fuente_pagina_distinta",
  "fuente_url_no_consultada",
  // Lo que el código comprobó de una cita
  "cita_verificada",
  "cita_no_literal",
  "cita_valor_sin_respaldo",
  // Las marcas
  "marcada_por_el_filtro",
  "instruccion_sembrada",
  // Por qué una propuesta llega marcada (los motivos de la pausa)
  "motivo_fuentes_insuficientes",
  "motivo_cita_no_verificada",
  "motivo_version_fuera_de_la_cita",
  "motivo_marco_antiguo",
  "motivo_marco_sin_fecha",
  "motivo_instruccion_marcada",
  "motivo_contenido_marcado",
  "motivo_sin_conteos_verificados",
  "motivo_prueba_fuera_del_plan",
  "motivo_asociacion_a_elegir",
  "motivo_texto_sin_lectura",
  // Las cifras de arriba de la bandeja
  "cifra_fuente_sin_verificar",
  "cifra_marcada_por_el_filtro",
  // Avisos de versión y errores
  "aviso_de_version",
  "sin_avisos",
  "bandeja_vacia",
  "propuesta_ilegible",
] as const;
export type IdDeEtiquetaDePropuestas =
  (typeof IDS_DE_ETIQUETAS_DE_PROPUESTAS)[number];

export const EtiquetasDePropuestas = z.strictObject({
  version: Nombre,
  nota: Texto,
  etiquetas: z
    .array(
      z.strictObject({
        id: z.enum(IDS_DE_ETIQUETAS_DE_PROPUESTAS),
        rol: z.enum(ROLES),
        simbolo: z.enum(SIMBOLOS),
        nombre: Texto,
      }),
    )
    .refine(
      (es) =>
        IDS_DE_ETIQUETAS_DE_PROPUESTAS.every((id) =>
          es.some((e) => e.id === id),
        ) && new Set(es.map((e) => e.id)).size === es.length,
      { message: "etiquetas-de-propuestas:cada-id-una-vez" },
    ),
});
export type EtiquetasDePropuestas = z.infer<typeof EtiquetasDePropuestas>;
