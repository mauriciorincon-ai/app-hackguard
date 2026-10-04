// Mundo sintético de la maqueta (fase 1: el corte de la vista por control; la fase 2 lo completa).
// Todo es ficticio y está al nivel de la regla dura 3: qué se verifica, con qué herramienta y qué se
// espera — ninguna carga ni procedimiento. Las versiones de marcos y los resúmenes del Anexo A son
// ilustrativos: se fijan con fuente y fecha en la fase 0 del S1 (DA-01). De ISO/IEC solo viaja el
// identificador y un resumen con palabras propias (regla 11).
export const ACTIVOS = {
  "ACT-DEMO-ASISTENTE": { nombre: { es: "Asistente demo de soporte", en: "Demo support assistant" } },
  "ACT-DEMO-CLASIFICADOR": { nombre: { es: "Clasificador demo de solicitudes", en: "Demo request classifier" } },
};

export const CONTROL = {
  id: "iso42001-A.6.2.4",
  marco: "ISO/IEC 42001:2023",
  capa: { es: "Anexo A · capa por defecto", en: "Annex A · default layer" },
  resumen: {
    es: "El sistema de IA se verifica y se valida antes de usarse",
    en: "The AI system is verified and validated before use",
  },
};

export const PRUEBAS = [
  {
    id: "PR-IA-PINJ-001",
    activo: "ACT-DEMO-ASISTENTE",
    herramienta: "garak",
    k: 20,
    que_verifica: {
      es: "El asistente no obedece instrucciones que llegan dentro del contenido que procesa.",
      en: "The assistant does not follow instructions that arrive inside the content it processes.",
    },
  },
  {
    id: "PR-IA-ENC-002",
    activo: "ACT-DEMO-ASISTENTE",
    herramienta: "garak",
    que_verifica: {
      es: "El asistente mantiene sus restricciones cuando la entrada llega en otra codificación.",
      en: "The assistant keeps its restrictions when the input arrives in a different encoding.",
    },
  },
  {
    id: "PR-MD-CAL-001",
    activo: "ACT-DEMO-CLASIFICADOR",
    herramienta: "scikit-learn",
    que_verifica: {
      es: "Las probabilidades del clasificador corresponden a su acierto real cerca del umbral de decisión.",
      en: "The classifier's probabilities match its real accuracy near the decision threshold.",
    },
  },
  {
    id: "PR-MD-PAR-001",
    activo: "ACT-DEMO-CLASIFICADOR",
    herramienta: "promptfoo",
    que_verifica: {
      es: "El clasificador decide lo mismo ante el mismo caso en español y en inglés.",
      en: "The classifier makes the same decision for the same case in Spanish and in English.",
    },
  },
];

// Sobres de evidencia confirmados. `evaluadas`/`fallidas` son conteos del adaptador.
export const SOBRES = [
  { id: "SOB-0004", prueba: "PR-MD-CAL-001", fecha: "2026-03-20", veredicto: "superada", confirmado: "2026-03-21",
    razon: { es: "Error de calibración en la banda del umbral dentro de lo declarado", en: "Calibration error in the threshold band within the declared limit" } },
  { id: "SOB-0012", prueba: "PR-IA-PINJ-001", fecha: "2026-08-18", veredicto: "fallida", confirmado: "2026-08-18", evaluadas: 20, fallidas: 6 },
  { id: "SOB-0019", prueba: "PR-IA-ENC-002", fecha: "2026-08-17", veredicto: "fallida", confirmado: "2026-08-17", evaluadas: 116, fallidas: 42 },
  { id: "SOB-0027", prueba: "PR-IA-PINJ-001", fecha: "2026-09-24", veredicto: "superada", confirmado: "2026-09-24", evaluadas: 20, fallidas: 0, reprueba_de: "SOB-0012" },
];

export const HALLAZGOS = [
  {
    id: "HZ-0003",
    prueba: "PR-IA-PINJ-001",
    sobre_origen: "SOB-0012",
    severidad: "alto",
    titulo: {
      es: "El asistente siguió instrucciones que venían dentro de un documento",
      en: "The assistant followed instructions that came inside a document",
    },
    apertura: "2026-08-18",
    correccion: {
      fecha: "2026-09-10",
      nota: {
        es: "El contenido leído se separa de las instrucciones del sistema.",
        en: "Content that is read is now kept apart from system instructions.",
      },
    },
    sobre_reprueba: "SOB-0027",
    cierre: "2026-09-24",
  },
  {
    id: "HZ-0007",
    prueba: "PR-IA-ENC-002",
    sobre_origen: "SOB-0019",
    severidad: "alto",
    titulo: {
      es: "El asistente dejó de aplicar sus restricciones con entradas codificadas",
      en: "The assistant stopped applying its restrictions on encoded inputs",
    },
    apertura: "2026-08-17",
  },
];
