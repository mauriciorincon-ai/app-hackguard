// Validación del instrumento (C18, M10): las semillas que el repo trae para comprobar que HackGuard hace lo
// que promete, y lo que obtuvo cada una en la última corrida. Corre antes de publicar cualquier
// instantánea o vitrina; si una comprobación falla, no se publica nada (RF-10.6). ILUSTRATIVO: las
// semillas reales nacen en el S1 (kit de prueba del repo). Las dos cifras de CVSS son las del spike
// (59 ejemplos curados de FIRST y 14 vectores inválidos). Ningún caso lleva carga ni procedimiento.
export const VALIDACION = [
  {
    id: "RF-10.1",
    nombre: { es: "Catálogo sembrado", en: "Seeded catalog" },
    casos: [
      { que: { es: "Entradas inválidas (sin marco, sin resultado esperado, sin criterio, estocástica sin k) que deben rechazarse", en: "Invalid entries (no framework, no expected result, no criterion, stochastic without k) that must be rejected" }, sembrados: 4, obtenidos: 4 },
      { que: { es: "Entradas sin control que deben aceptarse con advertencia", en: "Entries with no control that must be accepted with a warning" }, sembrados: 2, obtenidos: 2 },
      { que: { es: "Entradas con forma de prueba ofensiva que deben quedar marcadas, sin rechazarse", en: "Entries shaped like an offensive test that must be flagged, not rejected" }, sembrados: 3, obtenidos: 3 },
    ],
  },
  {
    id: "RF-10.2",
    nombre: { es: "Planes de referencia", en: "Reference plans" },
    casos: [{ que: { es: "Activos con su plan esperado conocido, que el planificador debe reproducir byte a byte", en: "Assets with a known expected plan, which the planner must reproduce byte for byte" }, sembrados: 3, obtenidos: 3 }],
  },
  {
    id: "RF-10.3",
    nombre: { es: "Cierres prohibidos", en: "Forbidden closures" },
    casos: [
      { que: { es: "Sobres sin confirmación que no deben contar", en: "Unconfirmed envelopes that must not count" }, sembrados: 2, obtenidos: 2 },
      { que: { es: "Re-pruebas con fecha anterior a la corrección", en: "Retests dated before the fix" }, sembrados: 1, obtenidos: 1 },
      { que: { es: "Cierres normales sin re-prueba", en: "Normal closures without a retest" }, sembrados: 2, obtenidos: 2 },
      { que: { es: "Cierres alternativos sin justificación", en: "Alternative closures without a justification" }, sembrados: 3, obtenidos: 3 },
    ],
  },
  {
    id: "RF-10.4",
    nombre: { es: "Separación de lo público", en: "Public separation" },
    casos: [
      { que: { es: "Contenido no marcado como publicable que no debe aparecer en el modo público", en: "Content not marked publishable that must not appear in public mode" }, sembrados: 7, obtenidos: 7 },
      { que: { es: "Paquetes de ejecución marcados como publicables que deben rechazarse", en: "Execution packages marked publishable that must be rejected" }, sembrados: 2, obtenidos: 2 },
    ],
  },
  {
    id: "RF-10.5",
    nombre: { es: "Severidad contra referencia", en: "Severity against reference" },
    casos: [
      { que: { es: "Ejemplos de CVSS 4.0 publicados por FIRST con su puntaje", en: "CVSS 4.0 examples published by FIRST with their score" }, sembrados: 59, obtenidos: 59 },
      { que: { es: "Vectores inválidos que el validador debe rechazar", en: "Invalid vectors the validator must reject" }, sembrados: 14, obtenidos: 14 },
    ],
  },
];

/** Una comprobación pasa si cada uno de sus casos obtuvo lo que se sembró. */
export const pasa = (comprobacion) => comprobacion.casos.every((c) => c.obtenidos === c.sembrados);
