// Esquemas de las propuestas de los dos agentes (ADR-011; plan v2.0.0 de los agentes): lo que el MODELO escribe (el borrador),
// lo que el CÓDIGO sella (la corrida con sus propuestas verificadas y su traza) y el libro de decisiones de la persona.
// Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
//
// La frontera está en el esquema: el borrador del modelo NO tiene campo para un veredicto, una severidad, un identificador ni un
// resultado de verificación. Un modelo que escribe uno falla el esquema (C2: ningún veredicto emitido por el modelo).
import { z } from "zod";
import {
  Fecha,
  FechaParcial,
  Huella,
  IdMinusculas,
  IdPrueba,
  Nombre,
  Prueba,
  Texto,
  Url,
} from "../catalogo/esquemas.ts";
import { Resultado, VEREDICTOS } from "../evidencia/esquemas.ts";

export const FORMATO_DE_BORRADOR = "hackguard/borrador@1";
export const FORMATO_DE_CONSULTA = "hackguard/consulta@1";
export const FORMATO_DE_CORRIDA = "hackguard/corrida@1";
export const FORMATO_DE_DECISION = "hackguard/decision@1";

export const AGENTES = ["investigador", "extractor"] as const;
export type Agente = (typeof AGENTES)[number];
export const TIPOS_DE_PROPUESTA = [
  "prueba_nueva",
  "version_de_marco",
  "retiro",
  "herramienta",
  "sobre",
] as const;
export type TipoDePropuesta = (typeof TIPOS_DE_PROPUESTA)[number];

/** INV-2026-10-02-01 (investigador) o EXT-2026-10-03-01 (extractor). */
export const IdCorrida = z
  .string()
  .regex(/^(?:INV|EXT)-\d{4}-\d{2}-\d{2}-\d{2,}$/, {
    message: "formato:id-corrida",
  });
/** PROP-0031; una hija de «separar» lleva su número: PROP-0037.1. */
export const IdPropuesta = z.string().regex(/^PROP-\d{4,}(?:\.\d+)?$/, {
  message: "formato:id-propuesta",
});

// ── Lo que el modelo escribe: el borrador ─────────────────────────────────────────────────────────

/** Una fuente de una propuesta del investigador: el pasaje LITERAL en que se apoya, y la huella de la página que lo contiene. */
export const FuenteCitada = z.strictObject({
  url: Url,
  nombre: Nombre,
  donde: Texto.optional(),
  /** El pasaje, copiado tal cual de la página; el código comprueba que es subcadena de ella. */
  fragmento: z.string().min(1).max(600),
  /** SHA-256 del texto de la página tras normalizar espacios. La página no se guarda en el repositorio. */
  huella_de_la_pagina: Huella,
  leida: Fecha,
});
export type FuenteCitada = z.infer<typeof FuenteCitada>;

export const CAMPOS_CITABLES = [
  "herramienta.version",
  "fecha",
  "resultado.ejecutada",
  "resultado.evaluadas",
  "resultado.fallidas",
  "resultado.alertas",
  "resultado.metrica",
] as const;
export type CampoCitable = (typeof CAMPOS_CITABLES)[number];

/** La cita literal que respalda un campo propuesto por el extractor. */
export const CitaDeCampo = z.strictObject({
  campo: z.enum(CAMPOS_CITABLES),
  texto: z.string().min(1).max(600),
});
export type CitaDeCampo = z.infer<typeof CitaDeCampo>;

/** Lo que el extractor propone para UNA prueba del plan: los campos del sobre y la cita de cada uno. NO lleva veredicto. */
export const CandidataDeSobre = z.strictObject({
  prueba: IdPrueba,
  razon: Texto.optional(),
  entrada: z.strictObject({
    herramienta: z.strictObject({ id: IdMinusculas, version: Nombre }),
    fecha: Fecha,
    zona_horaria: Nombre,
    ejecutado_por: Nombre.optional(),
    resultado: Resultado,
  }),
  citas: z.array(CitaDeCampo).min(1),
});
export type CandidataDeSobre = z.infer<typeof CandidataDeSobre>;

const Encabezado = {
  titulo: Texto,
  resumen: Texto,
};

const CuerpoDePruebaNueva = z.strictObject({
  tipo: z.literal("prueba_nueva"),
  ...Encabezado,
  /** La prueba completa tal como entraría al catálogo: nace `propuesta` y sin revisión. */
  prueba: Prueba.refine(
    (p) => p.estado_aprobacion === "propuesta" && p.revision === undefined,
    { message: "propuesta:prueba-ya-aprobada" },
  ),
  fuentes: z.array(FuenteCitada).min(1),
});

const CuerpoDeVersionDeMarco = z.strictObject({
  tipo: z.literal("version_de_marco"),
  ...Encabezado,
  marco_id: IdMinusculas,
  version_nueva: Nombre,
  fecha_version: FechaParcial,
  /** El mapa de equivalencias entrada por entrada (RF-01.6): de la versión vigente a la nueva. */
  equivalencias: z
    .array(
      z.strictObject({
        desde: Nombre.nullable(),
        hacia: z.array(Nombre),
        cambios: z.array(z.enum(["numero", "nombre", "alcance"])),
      }),
    )
    .min(1),
  fuentes: z.array(FuenteCitada).min(1),
});

const CuerpoDeRetiro = z.strictObject({
  tipo: z.literal("retiro"),
  ...Encabezado,
  prueba_id: IdPrueba,
  motivo: Texto,
  fuentes: z.array(FuenteCitada).min(1),
});

const CuerpoDeHerramienta = z.strictObject({
  tipo: z.literal("herramienta"),
  ...Encabezado,
  herramienta_id: IdMinusculas,
  cambio: z.strictObject({
    campo: z.enum(["editor", "version_verificada", "licencia", "alias"]),
    de: Nombre.nullable(),
    a: Nombre,
    fecha: FechaParcial,
  }),
  fuentes: z.array(FuenteCitada).min(1),
});

/** `una`: una sola prueba candidata · `alternativas`: la persona elige una de hasta tres · `mezcla`: el texto trae resultados de varias y se separa. */
export const ASOCIACIONES = ["una", "alternativas", "mezcla"] as const;

const CuerpoDeSobre = z.strictObject({
  tipo: z.literal("sobre"),
  ...Encabezado,
  activo: IdMinusculas,
  texto: z.strictObject({
    /** SHA-256 del texto pegado tras normalizar espacios: el texto mismo no se guarda. */
    huella: Huella,
    caracteres: z.int().min(1),
    /** Un extracto redactado, inerte (regla dura 4). */
    extracto: z.string().min(1).max(1500),
  }),
  asociacion: z.enum(ASOCIACIONES),
  candidatas: z.array(CandidataDeSobre).min(1).max(3),
});

export const CuerpoDePropuesta = z.discriminatedUnion("tipo", [
  CuerpoDePruebaNueva,
  CuerpoDeVersionDeMarco,
  CuerpoDeRetiro,
  CuerpoDeHerramienta,
  CuerpoDeSobre,
]);
export type CuerpoDePropuesta = z.infer<typeof CuerpoDePropuesta>;

/** `ref` es solo local a la corrida: el identificador de verdad lo pone el código al sellar. */
const Ref = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "formato:ref",
});

/** Una propuesta como la escribe el modelo: sin identificador, sin verificación, sin veredicto. */
export const BorradorDePropuesta = z.discriminatedUnion("tipo", [
  CuerpoDePruebaNueva.extend({ ref: Ref }),
  CuerpoDeVersionDeMarco.extend({ ref: Ref }),
  CuerpoDeRetiro.extend({ ref: Ref }),
  CuerpoDeHerramienta.extend({ ref: Ref }),
  CuerpoDeSobre.extend({ ref: Ref }),
]);
export type BorradorDePropuesta = z.infer<typeof BorradorDePropuesta>;

/** El archivo que escribe el modelo: `propuestas/corridas/<corrida>/propuesta.json`. */
export const Borrador = z.strictObject({
  formato: z.literal(FORMATO_DE_BORRADOR),
  agente: z.enum(AGENTES),
  corrida: IdCorrida,
  fecha: Fecha,
  alcance: Texto,
  /** Lo que la sesión informa de sí misma (no lo verifica el código): el modelo, y los reintentos que usó (hasta 2). */
  ejecucion: z.strictObject({
    modelo: Nombre,
    reintentos: z.int().min(0).max(2),
    latencia_total_s: z.number().min(0).optional(),
    tokens: z.int().min(0).optional(),
  }),
  /** Contradicciones entre fuentes y vacíos: se reportan, no se resuelven (RF-07.7). */
  contradicciones: z.array(Texto),
  propuestas: z.array(BorradorDePropuesta).min(1),
});
export type Borrador = z.infer<typeof Borrador>;

// ── Lo que el código escribe: la consulta y la corrida sellada ────────────────────────────────────

export const MOTIVOS_DE_NO_ACCESO = [
  "http_401",
  "http_403",
  "http_429",
  "http_otro",
  "requiere_sesion",
  "sin_red",
] as const;

/** Lo que `propuestas:buscar` consultó: cada página, su código HTTP y la huella de lo que leyó. Lo escribe el código. */
export const Consulta = z.strictObject({
  formato: z.literal(FORMATO_DE_CONSULTA),
  corrida: IdCorrida,
  fecha: Fecha,
  alcance: Texto,
  fuentes: z.array(
    z.strictObject({
      marco: IdMinusculas.nullable(),
      nombre: Nombre,
      url: Url,
      estado: z.enum(["leida", "no_accesible", "fuera_de_lista_blanca"]),
      http: z.int().min(100).max(599).nullable(),
      huella_de_la_pagina: Huella.nullable(),
      caracteres: z.int().min(0),
      motivo: z.enum(MOTIVOS_DE_NO_ACCESO).nullable(),
    }),
  ),
});
export type Consulta = z.infer<typeof Consulta>;

export const ESTADOS_DE_FUENTE = [
  "verificada",
  "sin_fragmento",
  "fuera_de_lista_blanca",
  "sin_lectura",
  "pagina_distinta",
  "url_no_consultada",
] as const;
export type EstadoDeFuente = (typeof ESTADOS_DE_FUENTE)[number];

export const ESTADOS_DE_CITA = [
  "verificada",
  "no_literal",
  "valor_sin_respaldo",
] as const;
export type EstadoDeCita = (typeof ESTADOS_DE_CITA)[number];

export const MOTIVOS_DE_PAUSA = [
  "fuentes_insuficientes",
  "cita_no_verificada",
  "marco_antiguo",
  "marco_sin_fecha",
  "instruccion_marcada",
  "contenido_marcado",
  "sin_conteos_verificados",
  "prueba_fuera_del_plan",
  "asociacion_a_elegir",
  "texto_sin_lectura",
] as const;
export type MotivoDePausa = (typeof MOTIVOS_DE_PAUSA)[number];

export const MOTIVOS_SIN_VEREDICTO = [
  "sin_conteos_verificados",
  "faltan_conteos",
  "regla_desconocida",
  "falta_k",
  "falta_metrica",
  "declarado_por_persona",
  "prueba_fuera_del_plan",
] as const;

export const VeredictoSugerido = z.strictObject({
  veredicto: z.enum(VEREDICTOS),
  /** La regla del catálogo que lo calculó, y las repeticiones k con que se calculó. */
  regla: IdMinusculas,
  k: z.int().min(1).nullable(),
  /** Los campos cuya cita verificó el código y con los que se calculó. */
  campos: z.array(z.enum(CAMPOS_CITABLES)),
});
export type VeredictoSugerido = z.infer<typeof VeredictoSugerido>;

/** Las 17 señales que el contrato de grafo del plan v2 exige en toda traza. */
export const Senales = z.strictObject({
  tarea: z.enum(["investigar", "extraer"]),
  fuentes_verificadas: z.int().min(0).nullable(),
  antiguedad_marco_dias: z.int().nullable(),
  citas_sin_verificar: z.int().min(0),
  marca_instruccion: z.boolean(),
  similitud_cita: z.number().min(0).max(1).nullable(),
  veredicto_por_regla: z.boolean(),
  prueba_nueva: z.boolean(),
  control_asociado: z.boolean().nullable(),
  hallazgo_cerrado: z.boolean(),
  reprueba_hecha: z.boolean(),
  pausa_humana: z.boolean(),
  nodos_visitados: z.array(z.string().min(1)),
  latencia_total_s: z.number().min(0).nullable(),
  tokens: z.int().min(0).nullable(),
  error_proveedor: z.boolean(),
  /** `null` hasta que una persona decide; `true` si corrigió el veredicto que calculó la regla (R5). */
  veredicto_corregido_por_persona: z.boolean().nullable(),
});
export type Senales = z.infer<typeof Senales>;

export const Pausa = z.strictObject({
  motivos: z
    .array(
      z.strictObject({
        motivo: z.enum(MOTIVOS_DE_PAUSA),
        /** La señal que la causó y el umbral, cuando lo hay. */
        senal: z.string().min(1),
        umbral: z.number().nullable(),
      }),
    )
    .min(1),
  marca_instruccion: z.boolean(),
  veredicto_sugerido: VeredictoSugerido.nullable(),
});
export type Pausa = z.infer<typeof Pausa>;

const VerificacionDeFuente = z.strictObject({
  url: Url,
  estado: z.enum(ESTADOS_DE_FUENTE),
});
const VerificacionDeCita = z.strictObject({
  campo: z.enum(CAMPOS_CITABLES),
  estado: z.enum(ESTADOS_DE_CITA),
  similitud: z.number().min(0).max(1),
});

const Marca = z.strictObject({
  campo: z.string().min(1),
  patron: IdMinusculas,
});

/** Una candidata del extractor ya verificada: el estado de cada cita y el veredicto que calculó la regla, nunca el modelo. */
export const CandidataSellada = z.strictObject({
  ...CandidataDeSobre.shape,
  verificacion: z.strictObject({
    en_el_plan: z.boolean(),
    citas: z.array(VerificacionDeCita),
  }),
  veredicto_sugerido: VeredictoSugerido.nullable(),
  sin_veredicto: z.enum(MOTIVOS_SIN_VEREDICTO).nullable(),
});
export type CandidataSellada = z.infer<typeof CandidataSellada>;

/** Lo que el código añade a una propuesta al sellarla. */
const SelloShape = {
  formato: z.literal("hackguard/propuesta@1"),
  id: IdPropuesta,
  origen: z.enum(AGENTES),
  fecha: Fecha,
  contenido: z.enum(["limpia", "marcada_para_revision"]),
  marcas_de_contenido: z.array(Marca),
  marcas_de_instruccion: z.array(Marca),
  verificacion: z.strictObject({ fuentes: z.array(VerificacionDeFuente) }),
  senales: Senales,
  pausa: Pausa.nullable(),
};

/** Una propuesta sellada: el cuerpo que escribió el modelo más lo que verificó y calculó el código. */
export const PropuestaSellada = z.discriminatedUnion("tipo", [
  CuerpoDePruebaNueva.extend(SelloShape),
  CuerpoDeVersionDeMarco.extend(SelloShape),
  CuerpoDeRetiro.extend(SelloShape),
  CuerpoDeHerramienta.extend(SelloShape),
  CuerpoDeSobre.extend({
    candidatas: z.array(CandidataSellada).min(1).max(3),
    ...SelloShape,
  }),
]);
export type PropuestaSellada = z.infer<typeof PropuestaSellada>;

/** La corrida sellada por el código: la consulta, las propuestas verificadas y la huella de todo. */
export const Corrida = z.strictObject({
  formato: z.literal(FORMATO_DE_CORRIDA),
  id: IdCorrida,
  agente: z.enum(AGENTES),
  fecha: Fecha,
  alcance: Texto,
  modelo: Nombre,
  reintentos: z.int().min(0).max(2),
  consulta: z.strictObject({
    consultadas: z.int().min(0),
    no_accesibles: z.array(
      z.strictObject({
        nombre: Nombre,
        url: Url,
        motivo: z.enum(MOTIVOS_DE_NO_ACCESO),
      }),
    ),
  }),
  contradicciones: z.array(Texto),
  propuestas: z.array(PropuestaSellada).min(1),
  /** SHA-256 del JCS de todos los campos anteriores. */
  huella: Huella,
});
export type Corrida = z.infer<typeof Corrida>;

// ── Lo que una persona decide: el libro de solo agregar ───────────────────────────────────────────

export const DECISIONES = [
  "aprobar",
  "aprobar_tras_revisar",
  "rechazar",
  "separar",
] as const;
export type TipoDeDecision = (typeof DECISIONES)[number];

export const Decision = z.strictObject({
  formato: z.literal(FORMATO_DE_DECISION),
  propuesta: IdPropuesta,
  decision: z.enum(DECISIONES),
  por: Nombre,
  fecha: Fecha,
  /** Obligatorio al rechazar. */
  motivo: z.string().min(1).max(600).optional(),
  /** Con `alternativas`: la prueba que la persona eligió de entre las candidatas. */
  prueba: IdPrueba.optional(),
  /** Con `separar`: las hijas que nacen, una por candidata. */
  hijas: z.array(IdPropuesta).optional(),
  /** Con un sobre aprobado: el sobre por confirmar que nació, o el veredicto que la persona corrigió (R5). */
  efecto: z
    .strictObject({
      sobre: z
        .string()
        .regex(/^SOB-\d{4,}$/)
        .optional(),
      prueba: IdPrueba.optional(),
      veredicto_sugerido: z.enum(VEREDICTOS).optional(),
      veredicto_resultante: z.enum(VEREDICTOS).optional(),
    })
    .optional(),
  veredicto_corregido_por_persona: z.boolean().optional(),
});
export type Decision = z.infer<typeof Decision>;

// ── Datos: umbrales y semillas ────────────────────────────────────────────────────────────────────

/** Los umbrales del plan v2 como dato (regla dura 10): U1, U2 y U3. */
export const UmbralesDePropuestas = z.strictObject({
  version: Nombre,
  plan: z.strictObject({ id: IdMinusculas, version: Nombre, huella: Huella }),
  /** U1 del plan v2: la cita es literal o no vale. El dato solo admite 1; el motor lo lee en cada cita. */
  similitud_cita: z.literal(1),
  fuentes_verificadas: z.int().min(1).max(5),
  antiguedad_marco_dias: z.int().min(30).max(365),
  origen: Texto,
});
export type UmbralesDePropuestas = z.infer<typeof UmbralesDePropuestas>;
