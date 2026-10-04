// Mundo sintético de la maqueta (fase 1: el corte de la vista por control; la fase 2 lo completa).
// Todo es ficticio y está al nivel de la regla dura 3: qué se verifica, con qué herramienta y qué se
// espera — ninguna carga ni procedimiento. Las versiones de marcos y los resúmenes del Anexo A son
// ilustrativos: se fijan con fuente y fecha en la fase 0 del S1 (DA-01). De ISO/IEC solo viaja el
// identificador y un resumen con palabras propias (regla 11).
import { CONTROLES, HERRAMIENTAS, PRUEBAS as CATALOGO } from "./catalogo.mjs";

// Tres activos demo FICTICIOS que cubren las cuatro familias. Nunca las apps reales del operador
// (regla dura 8). El tercero no tiene alcance autorizado: muestra el estado «sin autorización no hay plan».
// `rasgos` es lo que el perfil declara; de ahí sale la aplicabilidad de cada prueba (su `requiere`).
export const ACTIVOS = {
  "ACT-DEMO-ASISTENTE": {
    nombre: { es: "Asistente demo de soporte", en: "Demo support assistant" },
    descripcion: {
      es: "Aplicación web con un asistente que responde preguntas de soporte y puede crear solicitudes en un sistema de seguimiento.",
      en: "Web application with an assistant that answers support questions and can create requests in a tracking system.",
    },
    familias: ["software", "agente", "modelo_generativo"],
    estado: "en_prueba",
    acceso: "caja_blanca",
    dueno: {
      nombre: { es: "Equipo demo de producto", en: "Demo product team" },
      nota: { es: "Activo propio del operador. Autoriza las pruebas y recibe los hallazgos.", en: "The operator's own asset. Authorizes the tests and receives the findings." },
    },
    proveedor: {
      nombre: { es: "Proveedor demo de modelos", en: "Demo model provider" },
      provee: { es: "El modelo generativo, por su API pública.", en: "The generative model, through its public API." },
      politica: {
        es: "Permite evaluar el comportamiento del modelo por la API pública dentro de los límites de uso. Prohíbe pruebas de vulnerabilidad contra su servicio y su infraestructura.",
        en: "It allows evaluating the model's behavior through the public API within usage limits. It forbids vulnerability testing against its service and infrastructure.",
      },
      politica_fuente: { es: "Política de uso del proveedor, versión de 2026-08", en: "Provider usage policy, 2026-08 version" },
      politica_verificada: "2026-09-20",
    },
    perfil: {
      pila: { es: "Aplicación web, agente con dos herramientas y un modelo generativo por API.", en: "Web application, agent with two tools and a generative model over an API." },
      exposicion: "publica",
      autenticacion: { es: "Sin cuentas: cualquiera puede escribirle.", en: "No accounts: anyone can write to it." },
      datos: "publicos",
      modelos: { es: "Un modelo generativo del proveedor demo.", en: "One generative model from the demo provider." },
      canales: [
        { es: "Texto libre", en: "Free text" },
        { es: "Archivos adjuntos", en: "Attached files" },
        { es: "Respuestas de herramientas", en: "Tool responses" },
      ],
      acciones: [
        { es: "Crear una solicitud de soporte", en: "Create a support request" },
        { es: "Consultar el estado de una solicitud", en: "Look up a request's status" },
      ],
    },
    rasgos: [
      "paginas_con_datos_de_usuario", "base_de_datos", "sirve_paginas", "dominio_propio",
      "herramientas_con_efecto", "herramientas_de_terceros", "actua_en_nombre", "varios_pasos",
      "contenido_de_terceros", "restricciones_de_contenido", "instrucciones_internas", "salida_consumida_por_codigo",
    ],
    alcance: {
      incluye: [
        { es: "La aplicación web del demo y sus páginas.", en: "The demo web application and its pages." },
        { es: "El agente y sus dos herramientas, en el entorno de pruebas.", en: "The agent and its two tools, in the test environment." },
        { es: "El comportamiento del modelo, por la API pública del proveedor.", en: "The model's behavior, through the provider's public API." },
      ],
      excluye: [
        { es: "La base de datos, que administra un tercero.", en: "The database, which a third party manages." },
        { es: "La infraestructura del proveedor del modelo.", en: "The model provider's infrastructure." },
      ],
      ventana: { es: "Días hábiles, de 9:00 a 17:00 (hora de Bogotá).", en: "Business days, 9:00 to 17:00 (Bogotá time)." },
      limites: { es: "Hasta 2 peticiones por segundo y 500 llamadas al modelo por día.", en: "Up to 2 requests per second and 500 model calls per day." },
      fuera: [{ prueba: "PR-SW-SQLI-001", razon: { es: "La base de datos la administra un tercero y no está en el alcance autorizado.", en: "A third party manages the database and it is not in the authorized scope." } }],
    },
    reglas: [
      { es: "Solo se prueba el entorno de pruebas, nunca el de producción.", en: "Only the test environment is tested, never production." },
      { es: "Nada se prueba contra la infraestructura de terceros.", en: "Nothing is tested against third-party infrastructure." },
      { es: "Ante un fallo que afecte el servicio, la prueba se detiene y se avisa al dueño.", en: "If a failure affects the service, testing stops and the owner is told." },
      { es: "Las pruebas del modelo respetan la política de uso del proveedor: solo comportamiento, por la API pública y dentro de los límites.", en: "Model tests follow the provider's usage policy: behavior only, through the public API and within limits.", cita_proveedor: true },
    ],
    plan: {
      id: "PLAN-0003",
      fecha: "2026-10-01",
      ajustes: [
        {
          prueba: "PR-IA-FUGA-001", accion: "quitada", fecha: "2026-10-01",
          justificacion: { es: "Las instrucciones internas del demo son públicas en su repositorio.", en: "The demo's internal instructions are public in its repository." },
        },
      ],
    },
  },
  "ACT-DEMO-CLASIFICADOR": {
    nombre: { es: "Clasificador demo de solicitudes", en: "Demo request classifier" },
    descripcion: {
      es: "Modelo de decisión propio que recibe una solicitud y devuelve una distribución de probabilidad sobre las categorías que define quien lo llama.",
      en: "In-house decision model that receives a request and returns a probability distribution over the categories its caller defines.",
    },
    familias: ["modelo_decision"],
    estado: "con_plan",
    acceso: "caja_blanca",
    dueno: {
      nombre: { es: "Equipo demo de producto", en: "Demo product team" },
      nota: { es: "Activo propio del operador. Autoriza las pruebas y recibe los hallazgos.", en: "The operator's own asset. Authorizes the tests and receives the findings." },
    },
    proveedor: null,
    perfil: {
      pila: { es: "Clasificador determinista propio; corre en el portátil.", en: "In-house deterministic classifier; runs on the laptop." },
      exposicion: "interna",
      autenticacion: { es: "No aplica: no se expone en red.", en: "Not applicable: it is not exposed on a network." },
      datos: "personales",
      modelos: { es: "Ninguno de terceros.", en: "None from third parties." },
      canales: [
        { es: "Texto de la solicitud", en: "Request text" },
        { es: "Estado con notas de terceros", en: "State with third-party notes" },
      ],
      acciones: [{ es: "Ninguna: solo devuelve la decisión.", en: "None: it only returns the decision." }],
    },
    rasgos: ["decide_por_umbral", "texto_de_varias_personas", "estado_con_texto_de_terceros", "casos_bilingues", "decisiones_de_alto_impacto"],
    alcance: {
      incluye: [{ es: "El clasificador y sus casos de prueba sintéticos.", en: "The classifier and its synthetic test cases." }],
      excluye: [{ es: "Cualquier servicio en red: el clasificador no usa ninguno.", en: "Any network service: the classifier uses none." }],
      ventana: { es: "Sin restricción: corre en el portátil.", en: "No restriction: it runs on the laptop." },
      limites: { es: "Sin límite de carga.", en: "No load limit." },
      fuera: [],
    },
    reglas: [
      { es: "Solo se usan casos sintéticos; ningún dato de personas reales.", en: "Only synthetic cases are used; no data from real people." },
      { es: "Plantilla por defecto para activos propios, sin ajustes.", en: "Default template for own assets, unchanged." },
    ],
    plan: { id: "PLAN-0004", fecha: "2026-10-01", ajustes: [] },
  },
  "ACT-DEMO-PORTAL": {
    nombre: { es: "Portal demo de clientes", en: "Demo customer portal" },
    descripcion: {
      es: "Aplicación web donde un cliente con cuenta consulta y actualiza sus datos.",
      en: "Web application where a customer with an account views and updates their data.",
    },
    familias: ["software"],
    estado: "registrado",
    acceso: "caja_negra",
    dueno: {
      nombre: { es: "Equipo demo de clientes", en: "Demo customer team" },
      nota: { es: "Todavía no ha autorizado ninguna prueba.", en: "Has not authorized any test yet." },
    },
    proveedor: {
      nombre: { es: "Alojamiento demo", en: "Demo hosting" },
      provee: { es: "El alojamiento de la aplicación.", en: "Hosting for the application." },
      politica: null,
    },
    perfil: {
      pila: { es: "Aplicación web con base de datos propia.", en: "Web application with its own database." },
      exposicion: "publica",
      autenticacion: { es: "Cuentas con contraseña.", en: "Accounts with a password." },
      datos: "personales",
      modelos: { es: "Ninguno.", en: "None." },
      canales: [{ es: "Formularios", en: "Forms" }],
      acciones: [{ es: "Actualizar los datos de la cuenta", en: "Update account data" }],
    },
    rasgos: ["paginas_con_datos_de_usuario", "base_de_datos", "sirve_paginas", "acciones_con_sesion", "dominio_propio"],
    alcance: null,
    reglas: null,
    plan: null,
  },
};

export const archivoDeActivo = (id) => `activo-${id.toLowerCase()}.html`;
export const archivoDePlan = (id) => `plan-${id.toLowerCase()}.html`;

export const EXPOSICION = { publica: { es: "Pública", en: "Public" }, interna: { es: "Interna", en: "Internal" } };
export const DATOS = { publicos: { es: "Públicos", en: "Public" }, personales: { es: "Personales", en: "Personal" }, sensibles: { es: "Sensibles", en: "Sensitive" } };
export const ACCESO = {
  caja_blanca: { es: "Caja blanca: se conoce cómo está hecho", en: "White box: its internals are known" },
  caja_negra: { es: "Caja negra: solo se ve desde fuera", en: "Black box: only seen from outside" },
};

// Fórmula de la prioridad final (RF-03.2), como dato e ILUSTRATIVA: prioridad base de la prueba más
// los ajustes que el perfil del activo activa, con techo. La definitiva se fija en el S2.
export const PRIORIDAD = {
  techo: 5,
  ajustes: [
    { si: (perfil) => perfil.exposicion === "publica", suma: 1, razon: { es: "exposición pública", en: "public exposure" } },
    { si: (perfil) => perfil.datos !== "publicos", suma: 1, razon: { es: "datos personales", en: "personal data" } },
  ],
};

// Plantilla por defecto para activos propios (RF-02.2): se aplica en un paso y se puede ajustar.
export const PLANTILLA = {
  alcance: [
    { es: "Solo el entorno de pruebas del activo.", en: "Only the asset's test environment." },
    { es: "Nada administrado por terceros.", en: "Nothing managed by third parties." },
  ],
  reglas: [
    { es: "Nada se prueba contra la infraestructura de terceros.", en: "Nothing is tested against third-party infrastructure." },
    { es: "Ante un fallo que afecte el servicio, la prueba se detiene y se avisa al dueño.", en: "If a failure affects the service, testing stops and the owner is told." },
  ],
};

export const CONTROL = {
  id: "iso42001-A.6.2.4",
  marco: "ISO/IEC 42001:2023",
  capa: { es: "Anexo A · capa por defecto", en: "Annex A · default layer" },
  resumen: CONTROLES["iso42001-A.6.2.4"],
};

// Las pruebas del plan que cubren el control del corte: salen del catálogo, con el activo que el plan
// les asigna.
const delCatalogo = (id, activo) => {
  const prueba = CATALOGO.find((c) => c.id === id);
  const herramienta = HERRAMIENTAS[prueba.herramienta].nombre;
  return { id, activo, herramienta, k: prueba.k, que_verifica: prueba.que_verifica };
};

export const PRUEBAS = [
  delCatalogo("PR-IA-PINJ-001", "ACT-DEMO-ASISTENTE"),
  delCatalogo("PR-IA-ENC-002", "ACT-DEMO-ASISTENTE"),
  delCatalogo("PR-MD-CAL-001", "ACT-DEMO-CLASIFICADOR"),
  delCatalogo("PR-MD-PAR-001", "ACT-DEMO-CLASIFICADOR"),
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
