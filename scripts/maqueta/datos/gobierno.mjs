// Datos de las pantallas de gobierno del catálogo (mirada 3): mapa de equivalencias entre versiones de
// un marco, estructura de los controles por defecto y bandeja de propuestas. Todo es ILUSTRATIVO y
// sintético: versiones, fechas y propuestas se fijan con fuente en la fase 0 del S1 (DA-01). De ISO/IEC
// solo viajan identificadores y resúmenes con palabras propias (regla 11). Los nombres de las entradas
// de un marco van en su idioma original; su atribución se fija con la licencia de cada marco en el S1.

export const TIPOS_DE_CAMBIO = {
  igual: { es: "Se mantiene", en: "Unchanged" },
  renumerada: { es: "Cambia de número", en: "Renumbered" },
  renombrada: { es: "Cambia de nombre", en: "Renamed" },
  renumerada_y_renombrada: { es: "Cambia de número y de nombre", en: "Renumbered and renamed" },
  absorbida: { es: "Absorbida por otra entrada", en: "Absorbed into another entry" },
  sin_equivalente: { es: "Sin equivalente directo", en: "No direct equivalent" },
  nueva: { es: "Entrada nueva", en: "New entry" },
};

// Mapa de equivalencias de un marco: de cada entrada de la versión anterior a la vigente (RF-01.6).
export const EQUIVALENCIAS = {
  "owasp-llm-top10": {
    desde: "1.1",
    hasta: "2025",
    entradas: [
      { de: "LLM01", nombre_de: "Prompt Injection", a: "LLM01", nombre_a: "Prompt Injection", tipo: "igual" },
      { de: "LLM02", nombre_de: "Insecure Output Handling", a: "LLM05", nombre_a: "Improper Output Handling", tipo: "renumerada_y_renombrada" },
      { de: "LLM03", nombre_de: "Training Data Poisoning", a: "LLM04", nombre_a: "Data and Model Poisoning", tipo: "renumerada_y_renombrada" },
      { de: "LLM04", nombre_de: "Model Denial of Service", a: "LLM10", nombre_a: "Unbounded Consumption", tipo: "absorbida" },
      { de: "LLM05", nombre_de: "Supply Chain Vulnerabilities", a: "LLM03", nombre_a: "Supply Chain", tipo: "renumerada" },
      { de: "LLM06", nombre_de: "Sensitive Information Disclosure", a: "LLM02", nombre_a: "Sensitive Information Disclosure", tipo: "renumerada" },
      { de: "LLM07", nombre_de: "Insecure Plugin Design", a: null, nombre_a: null, tipo: "sin_equivalente" },
      { de: "LLM08", nombre_de: "Excessive Agency", a: "LLM06", nombre_a: "Excessive Agency", tipo: "renumerada" },
      { de: "LLM09", nombre_de: "Overreliance", a: "LLM09", nombre_a: "Misinformation", tipo: "renombrada" },
      { de: "LLM10", nombre_de: "Model Theft", a: "LLM10", nombre_a: "Unbounded Consumption", tipo: "absorbida" },
      { de: null, nombre_de: null, a: "LLM07", nombre_a: "System Prompt Leakage", tipo: "nueva" },
      { de: null, nombre_de: null, a: "LLM08", nombre_a: "Vector and Embedding Weaknesses", tipo: "nueva" },
    ],
  },
};

// Capa por defecto: las áreas del Anexo A de ISO/IEC 42001, con identificador y resumen propio.
export const NORMA = "ISO/IEC 42001:2023";
export const AREAS = [
  { id: "A.2", nombre: { es: "Políticas", en: "Policies" }, resumen: { es: "La organización tiene una política de IA escrita, coherente con sus otras políticas y revisada.", en: "The organization has a written AI policy, consistent with its other policies and reviewed." } },
  { id: "A.3", nombre: { es: "Organización interna", en: "Internal organization" }, resumen: { es: "Hay responsables nombrados y una vía para reportar preocupaciones.", en: "There are named owners and a way to report concerns." } },
  { id: "A.4", nombre: { es: "Recursos", en: "Resources" }, resumen: { es: "Se sabe con qué datos, herramientas, cómputo y personas cuenta cada sistema de IA.", en: "It is known which data, tools, compute and people each AI system relies on." } },
  { id: "A.5", nombre: { es: "Evaluación de impacto", en: "Impact assessment" }, resumen: { es: "Se evalúa y se documenta cómo afecta el sistema a las personas y a la sociedad.", en: "How the system affects people and society is assessed and documented." } },
  { id: "A.6", nombre: { es: "Ciclo de vida del sistema", en: "System life cycle" }, resumen: { es: "El sistema se diseña, se verifica, se despliega, se vigila y se registra con criterios declarados.", en: "The system is designed, verified, deployed, monitored and logged against declared criteria." } },
  { id: "A.7", nombre: { es: "Datos", en: "Data" }, resumen: { es: "Se conoce el origen, la calidad y la preparación de los datos del sistema.", en: "The origin, quality and preparation of the system's data are known." } },
  { id: "A.8", nombre: { es: "Información a partes interesadas", en: "Information for interested parties" }, resumen: { es: "Quien usa el sistema o resulta afectado por él recibe la información que necesita y puede reportar problemas.", en: "Whoever uses the system or is affected by it gets the information they need and can report problems." } },
  { id: "A.9", nombre: { es: "Uso del sistema", en: "Use of the system" }, resumen: { es: "El sistema se usa según un proceso, con objetivos declarados y dentro de su uso previsto.", en: "The system is used following a process, with declared objectives and within its intended use." } },
  { id: "A.10", nombre: { es: "Relaciones con terceros", en: "Third-party relationships" }, resumen: { es: "Las responsabilidades con proveedores y clientes están repartidas y escritas.", en: "Responsibilities with suppliers and customers are allocated and written down." } },
];

/** Área del Anexo A a la que pertenece un control (`iso42001-A.6.2.4` → `A.6`). */
export const areaDe = (control) => /^iso42001-(A\.\d+)\./.exec(control)[1];

export const VERIFICACION_DE_FUENTE = {
  verificada: { rol: "positivo", simbolo: "ok", nombre: { es: "Fuente verificada", en: "Source verified" } },
  sin_fragmento: { rol: "atencion", simbolo: "aviso", nombre: { es: "Fuente sin verificar", en: "Source not verified" } },
};

export const ORIGENES = {
  investigador: { es: "Investigador", en: "Researcher" },
  extractor: { es: "Extractor", en: "Extractor" },
};

export const TIPOS_DE_PROPUESTA = {
  prueba_nueva: { es: "Prueba nueva", en: "New test" },
  version_de_marco: { es: "Versión de marco", en: "Framework version" },
  herramienta: { es: "Herramienta", en: "Tool" },
  sobre: { es: "Sobre de evidencia", en: "Evidence envelope" },
};

// Lo que una fuente verificada demuestra: el código comprobó que existe y que contiene el fragmento
// que la propuesta cita. `detalle` solo se escribe cuando la comprobación falló.
export const PROPUESTAS = [
  {
    id: "PROP-0031", origen: "investigador", tipo: "prueba_nueva", fecha: "2026-10-02", contenido: "limpia",
    titulo: { es: "El orden de las opciones no cambia la decisión", en: "Option order does not change the decision" },
    resumen: {
      es: "Prueba para modelos de decisión: presentar las mismas opciones en otro orden no cambia la decisión más de lo que ya cambia al repetir la llamada.",
      en: "Test for decision models: presenting the same options in another order does not change the decision more than repeating the call already does.",
    },
    fuentes: [{ nombre: "Lista de 14 comprobaciones para modelos de decisión 2026-09 · 5", verificacion: "verificada" }],
  },
  {
    id: "PROP-0032", origen: "investigador", tipo: "version_de_marco", fecha: "2026-10-02", contenido: "limpia", marco: "owasp-llm-top10",
    titulo: { es: "OWASP LLM Top 10 pasa de 2025 a 2026", en: "OWASP LLM Top 10 moves from 2025 to 2026" },
    resumen: {
      es: "La fuente oficial ya publica la edición 2026. La propuesta trae el mapa de equivalencias, entrada por entrada, para que las pruebas y los hallazgos sigan trazados.",
      en: "The official source already publishes the 2026 edition. The proposal brings the equivalence map, entry by entry, so that tests and findings stay traceable.",
    },
    fuentes: [{ nombre: "OWASP Top 10 for LLM Applications 2026", verificacion: "verificada" }],
  },
  {
    id: "PROP-0033", origen: "investigador", tipo: "prueba_nueva", fecha: "2026-10-02", contenido: "limpia",
    titulo: { es: "El agente no conserva permisos entre tareas", en: "The agent does not keep permissions between tasks" },
    resumen: {
      es: "Prueba para agentes: un permiso concedido para una tarea no sigue vigente en la siguiente.",
      en: "Test for agents: a permission granted for one task is no longer in force in the next one.",
    },
    fuentes: [
      {
        nombre: "OWASP Top 10 for LLM Applications 2025 · LLM06",
        verificacion: "sin_fragmento",
        detalle: {
          es: "La fuente existe, pero el fragmento citado no aparece en ella. Llega marcada; no se descarta.",
          en: "The source exists, but the cited fragment does not appear in it. It arrives flagged; it is not discarded.",
        },
      },
    ],
  },
  {
    id: "PROP-0034", origen: "investigador", tipo: "prueba_nueva", fecha: "2026-10-02", contenido: "marcada_para_revision",
    titulo: { es: "Las restricciones se mantienen en conversaciones largas", en: "Restrictions hold in long conversations" },
    resumen: {
      es: "Prueba para modelos generativos: las restricciones del asistente valen igual al principio y al final de una conversación larga.",
      en: "Test for generative models: the assistant's restrictions hold the same at the start and at the end of a long conversation.",
    },
    fuentes: [{ nombre: "OWASP Top 10 for LLM Applications 2025 · LLM01", verificacion: "verificada" }],
  },
  {
    id: "PROP-0035", origen: "investigador", tipo: "herramienta", fecha: "2026-10-02", contenido: "limpia",
    titulo: { es: "promptfoo cambió de editor", en: "promptfoo changed publisher" },
    resumen: {
      es: "La herramienta conserva su licencia MIT. Se registra el editor nuevo con su fecha y el nombre anterior queda como alias.",
      en: "The tool keeps its MIT license. The new publisher is recorded with its date and the previous name stays as an alias.",
    },
    fuentes: [{ nombre: "promptfoo", verificacion: "verificada", donde: { es: "repositorio oficial", en: "official repository" } }],
  },
  {
    id: "PROP-0036", origen: "extractor", tipo: "sobre", fecha: "2026-10-03", contenido: "limpia", activo: "ACT-DEMO-ASISTENTE",
    titulo: { es: "Sobre propuesto desde un texto pegado", en: "Envelope proposed from pasted text" },
    resumen: {
      es: "El texto corresponde a una prueba del plan del asistente demo. El extractor propone el sobre; el veredicto lo calcula la regla de la prueba y lo confirma una persona.",
      en: "The text matches a test in the demo assistant's plan. The extractor proposes the envelope; the verdict is computed by the test's rule and confirmed by a person.",
    },
    candidatas: ["PR-IA-SAL-001", "PR-IA-PINJ-001"],
    conteo: { evaluadas: 20, fallidas: 3 },
    citas: 2,
  },
  {
    id: "PROP-0037", origen: "extractor", tipo: "sobre", fecha: "2026-10-03", contenido: "limpia", activo: "ACT-DEMO-ASISTENTE", separable: true,
    titulo: { es: "Un texto pegado con resultados de más de una prueba", en: "One pasted text with results for more than one test" },
    resumen: {
      es: "El texto trae resultados de varias pruebas distintas del plan. Un sobre cuenta para una sola prueba: sepáralo antes de aprobar.",
      en: "The text carries results for several different tests in the plan. An envelope counts for one test only: split it before approving.",
    },
    candidatas: ["PR-AG-PERM-001", "PR-AG-LIM-001"],
    citas: 4,
  },
];

// Registro de la última corrida del investigador (RF-07.2, 07.2b, 07.7): lo que consultó y lo que no pudo.
export const CORRIDA = {
  id: "INV-2026-10-02-01",
  fecha: "2026-10-02",
  alcance: { es: "Todas las familias y todos los marcos del catálogo", en: "All families and every framework in the catalog" },
  consultadas: 14,
  no_accesibles: [
    { nombre: "arXiv 2609.32160 · anexo", razon: { es: "El sitio no permitió el acceso del agente.", en: "The site did not allow the agent to access it." } },
    { nombre: "Jev · registro de cambios", razon: { es: "Requiere sesión.", en: "Requires signing in." } },
  ],
  contradicciones: [
    {
      es: "Dos fuentes dan fechas distintas para la edición 2026 de OWASP LLM Top 10. Se reporta; no se elige una.",
      en: "Two sources give different dates for the 2026 edition of OWASP LLM Top 10. It is reported; neither is chosen.",
    },
  ],
};
