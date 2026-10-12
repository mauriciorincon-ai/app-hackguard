// Textos de dominio de las pantallas de activo y plan: los valores del perfil que la persona lee. Lo que es
// estado (rol, símbolo) vive en datos (`datos/planificador/{etiquetas,motivos}.json`), no aquí.
import type { Bilingue } from "../catalogo/tipos.ts";

export const EXPOSICION: Record<string, Bilingue> = {
  publica: { es: "Pública", en: "Public" },
  interna: { es: "Interna", en: "Internal" },
};

export const DATOS: Record<string, Bilingue> = {
  publicos: { es: "Públicos", en: "Public" },
  personales: { es: "Personales", en: "Personal" },
  sensibles: { es: "Sensibles", en: "Sensitive" },
};

export const ACCESO: Record<string, Bilingue> = {
  caja_blanca: {
    es: "Caja blanca: se conoce cómo está hecho",
    en: "White box: its internals are known",
  },
  caja_negra: {
    es: "Caja negra: solo se ve desde fuera",
    en: "Black box: only seen from outside",
  },
};

/** El activo que abre «Activos» en la barra lateral: el primero de los registrados (un test lo ata a los datos). */
export const PRIMER_ACTIVO = "act-demo-asistente";
