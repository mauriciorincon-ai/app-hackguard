// Vocabulario de estados de HackGuard: cada valor del modelo de datos (§ 6 de la especificación) con su
// papel de color, su símbolo y su nombre en los dos idiomas. Es DATO: una pantalla nunca decide cómo se
// ve un estado, lo pregunta aquí.
export const VEREDICTO = {
  superada: { rol: "positivo", simbolo: "ok", nombre: { es: "Superada", en: "Passed" } },
  fallida: { rol: "falla", simbolo: "falla", nombre: { es: "Fallida", en: "Failed" } },
  parcial: { rol: "atencion", simbolo: "parcial", nombre: { es: "Parcial", en: "Partial" } },
  no_aplicable: { rol: "neutro", simbolo: "no_aplica", nombre: { es: "No aplicable", en: "Not applicable" } },
  no_ejecutada: { rol: "neutro", simbolo: "vacio", nombre: { es: "No ejecutada", en: "Not run" } },
};

export const VIGENCIA = {
  vigente: { rol: "positivo", simbolo: "ok", nombre: { es: "Vigente", en: "Current" } },
  por_revisar: { rol: "atencion", simbolo: "aviso", nombre: { es: "Por revisar", en: "Review due" } },
  vencido: { rol: "falla", simbolo: "falla", nombre: { es: "Vencido", en: "Overdue" } },
};

export const ESTADO_DE_CONTROL = {
  con_evidencia_vigente: { rol: "positivo", simbolo: "ok", nombre: { es: "Con evidencia vigente", en: "Current evidence" } },
  evidencia_antigua: { rol: "atencion", simbolo: "reloj", nombre: { es: "Evidencia antigua", en: "Stale evidence" } },
  con_fallas: { rol: "falla", simbolo: "falla", nombre: { es: "Con fallas", en: "Has failures" } },
  sin_evidencia: { rol: "neutro", simbolo: "vacio", nombre: { es: "Sin evidencia", en: "No evidence" } },
};

export const SEVERIDAD = {
  critico: { rol: "falla", simbolo: "barras4", nombre: { es: "Crítico", en: "Critical" } },
  alto: { rol: "falla", simbolo: "barras3", nombre: { es: "Alto", en: "High" } },
  medio: { rol: "atencion", simbolo: "barras2", nombre: { es: "Medio", en: "Medium" } },
  bajo: { rol: "neutro", simbolo: "barras1", nombre: { es: "Bajo", en: "Low" } },
  informativo: { rol: "neutro", simbolo: "barras0", nombre: { es: "Informativo", en: "Informational" } },
};

export const CONFIRMACION = {
  confirmada: { rol: "acento", simbolo: "firma", nombre: { es: "Confirmada por una persona", en: "Confirmed by a person" } },
  propuesta: { rol: "neutro", simbolo: "vacio", nombre: { es: "Propuesta, sin confirmar", en: "Proposed, not confirmed" } },
};

// Ciclo de un activo (§ 6.5): no es un juicio, es en qué punto va. Solo el ciclo cerrado es «positivo».
export const ESTADO_DE_ACTIVO = {
  registrado: { rol: "neutro", simbolo: "vacio", nombre: { es: "Registrado, sin plan", en: "Registered, no plan" } },
  con_plan: { rol: "neutro", simbolo: "parcial", nombre: { es: "Con plan", en: "Has a plan" } },
  en_prueba: { rol: "neutro", simbolo: "reloj", nombre: { es: "En prueba", en: "Under test" } },
  cerrado_ciclo: { rol: "positivo", simbolo: "ok", nombre: { es: "Ciclo cerrado", en: "Cycle closed" } },
};
