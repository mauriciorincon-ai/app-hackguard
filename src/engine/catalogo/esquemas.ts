// Esquemas del catálogo (§ 6 de la especificación + los campos que añadió la F1). Zod 4.
//
// Regla de estos esquemas: VALIDAN y nunca TRANSFORMAN. Ni `.trim()`, ni `.default()`, ni coerción: lo que
// sale del parseo es estructuralmente lo que entró, y la huella de la instantánea se calcula sobre lo que
// está escrito en `datos/`, no sobre una versión retocada. Todo texto de producto es un mapa `{ es, en }`
// (regla 20); los nombres propios citados de un marco (el título de una entrada de OWASP) van tal como los
// publica su editor.
import { z } from "zod";
import { esFechaCivil, esFechaParcial } from "../fecha.ts";

const MAX_TEXTO = 2000;

const textoNoVacio = z
  .string()
  .min(1)
  .max(MAX_TEXTO)
  .refine((s) => s.trim().length > 0, { message: "formato:en-blanco" });

export const Texto = z.strictObject({ es: textoNoVacio, en: textoNoVacio });
export type Texto = z.infer<typeof Texto>;

export const Nombre = textoNoVacio;

export const Fecha = z
  .string()
  .refine(esFechaCivil, { message: "formato:fecha" });
export const FechaParcial = z
  .string()
  .refine(esFechaParcial, { message: "formato:fecha-parcial" });

export const Url = z
  .string()
  .regex(/^https:\/\/[^\s]+$/, { message: "formato:url" });
export const CodigoHttp = z.int().min(100).max(599);

/** Identificador en minúsculas con guiones: marcos, herramientas, familias, reglas, rasgos. */
export const IdMinusculas = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, {
  message: "formato:id",
});
/** Identificador de prueba: PR-SW-XSS-001, SEMILLA-SIN-MARCO. */
export const IdPrueba = z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, {
  message: "formato:id-prueba",
});
/** Identificador de control: iso42001-A.6.2.4 (prefijo de la capa + identificador de la norma). */
export const IdControl = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-[A-Z](?:\.\d+)+$/, {
    message: "formato:id-control",
  });

export const Huella = z
  .string()
  .regex(/^[0-9a-f]{64}$/, { message: "formato:huella" });

/** Una consulta a una fuente: dirección, código HTTP que devolvió a un agente y fecha. */
export const Consulta = z.strictObject({
  url: Url,
  http: CodigoHttp,
  consultada: Fecha,
});

export const MADUREZ = ["estandar", "emergente", "propia"] as const;
export const ENTORNOS = ["portatil", "contenedor", "plan_gratuito"] as const;
export const ESTADOS_DE_APROBACION = [
  "propuesta",
  "aprobada",
  "retirada",
] as const;
export const REVISIONES_DE_CONTENIDO = [
  "limpia",
  "marcada_para_revision",
  "revisada_y_aprobada",
] as const;

// ── Marco de referencia (§ 6.1, DA-01, DA-10, E-14) ──────────────────────────────────────────────

export const EntradaDeMarco = z.strictObject({ id: Nombre, nombre: Nombre });

export const Marco = z.strictObject({
  id: IdMinusculas,
  nombre: Nombre,
  editor: Nombre,
  version_vigente: Nombre,
  fecha_version: FechaParcial.nullable(),
  versiones_anteriores: z.array(
    z.strictObject({
      version: Nombre,
      fecha: FechaParcial,
      equivalencias: IdMinusculas.optional(),
      entradas: z.array(EntradaDeMarco).min(1).optional(),
    }),
  ),
  fuente_oficial: Consulta,
  familias_aplicables: z.array(IdMinusculas).min(1),
  fecha_verificacion: Fecha,
  licencia: z.strictObject({
    nombre: Nombre,
    url: Url,
    exige: Texto,
    como_cumple: Texto,
  }),
  vias_de_acceso: z
    .array(
      z.strictObject({
        tipo: z.enum([
          "pagina",
          "repositorio",
          "archivo",
          "canal_de_novedades",
          "interfaz",
          "descarga",
        ]),
        url: Url,
        http: CodigoHttp,
        consultada: Fecha,
        nota: Texto.optional(),
      }),
    )
    .min(1),
  lista_blanca_de_fuentes: z.array(Nombre).min(1),
  entradas: z.array(EntradaDeMarco).min(1).optional(),
  estado: z.enum(["verificado", "fuente_no_accesible_al_agente"]),
  por_verificar: z.array(
    z.enum(["fecha_version", "fuente_oficial", "version_vigente", "licencia"]),
  ),
  notas: Texto.optional(),
});
export type Marco = z.infer<typeof Marco>;

// ── Mapa de equivalencias entre dos versiones de un marco (RF-01.6, E-15) ───────────────────────

export const Equivalencias = z.strictObject({
  id: IdMinusculas,
  marco_id: IdMinusculas,
  desde: Nombre,
  hacia: Nombre,
  fuente: Consulta,
  fecha_verificacion: Fecha,
  pares: z
    .array(
      z.strictObject({
        desde: Nombre,
        // Más de una entrada si la vieja se dividió; ninguna si se retiró sin sucesora.
        hacia: z.array(Nombre),
        cambios: z.array(z.enum(["numero", "nombre", "alcance"])),
        nota: Texto.optional(),
      }),
    )
    .min(1),
  notas: Texto.optional(),
});
export type Equivalencias = z.infer<typeof Equivalencias>;

// ── Familias, reglas de veredicto y rasgos del perfil: vocabulario del catálogo como dato ─────────

export const Familias = z.strictObject({
  familias: z
    .array(
      z.strictObject({
        id: IdMinusculas,
        nombre: Texto,
        descripcion: Texto,
        // Una familia estocástica no da el mismo resultado dos veces: sus pruebas declaran k (E-2).
        estocastica: z.boolean(),
        madurez_admitida: z.array(z.enum(MADUREZ)).min(1),
        categorias: z
          .array(z.strictObject({ id: IdMinusculas, nombre: Texto }))
          .min(1),
      }),
    )
    .min(1),
});
export type Familias = z.infer<typeof Familias>;

export const ReglasDeVeredicto = z.strictObject({
  reglas: z
    .array(
      z.strictObject({
        id: IdMinusculas,
        nombre: Texto,
        descripcion: Texto,
        // En qué familias tiene sentido: una regla determinista no decide sobre un activo estocástico.
        ambito: z.enum(["estocastica", "determinista", "cualquiera"]),
        requiere_k: z.boolean(),
      }),
    )
    .min(1),
});
export type ReglasDeVeredicto = z.infer<typeof ReglasDeVeredicto>;

export const RasgosDePerfil = z.strictObject({
  rasgos: z
    .array(
      z.discriminatedUnion("tipo", [
        z.strictObject({
          id: IdMinusculas,
          tipo: z.literal("booleano"),
          nombre: Texto,
          pregunta: Texto,
        }),
        z.strictObject({
          id: IdMinusculas,
          tipo: z.literal("opcion"),
          nombre: Texto,
          pregunta: Texto,
          opciones: z
            .array(z.strictObject({ id: IdMinusculas, nombre: Texto }))
            .min(2),
        }),
      ]),
    )
    .min(1),
});
export type RasgosDePerfil = z.infer<typeof RasgosDePerfil>;

// ── Controles de gobierno (§ 6.2, E-16): una capa por archivo ────────────────────────────────────

export const ReferenciaAMarco = z.strictObject({
  marco_id: IdMinusculas,
  version_marco: Nombre,
  referencia_en_marco: Nombre,
});

export const Control = z.strictObject({
  id: IdControl,
  nombre: Texto,
  resumen_llano: Texto,
  // De ISO/IEC solo hay identificadores y resúmenes propios; `false` hasta contrastarlos con la norma.
  verificado_contra_norma: z.boolean(),
  controles_equivalentes: z.array(
    z.strictObject({
      marco_id: IdMinusculas,
      version_marco: Nombre,
      referencia_en_marco: Nombre,
      fuente: Consulta,
      cobertura: z.enum(["completa", "parcial"]),
      nota_de_incompletitud: Texto.optional(),
    }),
  ),
});
export type Control = z.infer<typeof Control>;

export const CapaDeControles = z.strictObject({
  id: IdMinusculas,
  capa: z.enum(["por_defecto", "propia"]),
  nombre: Texto,
  descripcion: Texto,
  marco_id: IdMinusculas,
  version_marco: Nombre,
  fuentes_de_los_resumenes: z.array(Consulta).min(1),
  areas: z
    .array(
      z.strictObject({
        id: Nombre,
        nombre: Texto,
        controles: z.array(Control).min(1),
      }),
    )
    .min(1),
});
export type CapaDeControles = z.infer<typeof CapaDeControles>;

// ── Herramienta de prueba (§ 6.3, E-26) ──────────────────────────────────────────────────────────

export const TIPOS_DE_SELECTOR = [
  "garak",
  "zap",
  "modulo",
  "revision",
] as const;

export const Herramienta = z.strictObject({
  id: IdMinusculas,
  nombre: Nombre,
  editor: Nombre,
  tipo: z.enum(["publica", "herramienta_propia"]),
  descripcion: Texto,
  licencia: z.strictObject({ spdx: Nombre, url: Url }),
  familias: z.array(IdMinusculas).min(1),
  entornos_soportados: z.array(z.enum(ENTORNOS)).min(1),
  formato_salida: Nombre.optional(),
  tiene_adaptador: z.boolean(),
  // Qué forma tiene el selector legible por máquina de las pruebas que la recomiendan (E-7).
  selector: z.enum(TIPOS_DE_SELECTOR),
  version_verificada: Nombre,
  registro: z
    .strictObject({
      tipo: z.enum(["pypi", "npm", "github", "docker"]),
      url: Url,
      http: CodigoHttp,
      consultada: Fecha,
    })
    .optional(),
  repositorio: Url.optional(),
  fuente: Consulta,
  fecha_verificacion: Fecha,
  alias: z.array(z.strictObject({ nombre: Nombre, nota: Texto.optional() })),
  cambio_de_editor: z.array(
    z.strictObject({
      fecha: FechaParcial,
      de: Nombre,
      a: Nombre,
      fuente: Consulta,
      nota: Texto.optional(),
    }),
  ),
  notas: Texto.optional(),
});
export type Herramienta = z.infer<typeof Herramienta>;

// ── Prueba: entrada del catálogo (§ 6.4 + E-2, E-7, E-15, E-23) ─────────────────────────────────

export const Selector = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("garak"),
    probes: z.array(Nombre).min(1),
    detectores: z.array(Nombre).min(1),
    agregacion: z.enum(["cualquier_detector", "todos_los_detectores"]),
  }),
  z.strictObject({
    tipo: z.literal("zap"),
    pluginids: z.array(z.int().positive()).min(1),
    agregacion: z.enum(["cualquier_regla", "todas_las_reglas"]),
  }),
  z.strictObject({ tipo: z.literal("modulo"), referencia: Nombre }),
  z.strictObject({ tipo: z.literal("revision"), que_se_revisa: Texto }),
]);

export const Prueba = z.strictObject({
  id: IdPrueba,
  nombre: Texto,
  familia: IdMinusculas,
  categoria: IdMinusculas,
  que_verifica: Texto,
  por_que_importa: Texto,
  marco_id: IdMinusculas,
  version_marco: Nombre,
  referencia_en_marco: Nombre,
  referencias_adicionales: z.array(ReferenciaAMarco).optional(),
  controles: z.array(IdControl),
  control_pendiente: z.boolean(),
  herramientas_recomendadas: z
    .array(
      z.strictObject({
        herramienta: IdMinusculas,
        entorno: z.enum(ENTORNOS),
        version_minima: Nombre.optional(),
        selector: Selector,
        nota: Texto.optional(),
      }),
    )
    .min(1),
  // La configuración del arnés con que se mide (herramienta, versión, selector) es parte del esperado (E-2):
  // `medido_con` nombra cuál de las herramientas recomendadas.
  resultado_esperado: z.strictObject({
    descripcion: Texto,
    medido_con: IdMinusculas,
  }),
  criterio_de_veredicto: z.strictObject({
    regla: IdMinusculas,
    repeticiones_k: z.int().min(1).max(100000).optional(),
    descripcion: Texto,
  }),
  aplicabilidad: z.strictObject({
    modo: z.enum(["todas", "alguna"]),
    condiciones: z
      .array(
        z.strictObject({
          rasgo: IdMinusculas,
          valor: z.union([z.boolean(), IdMinusculas]),
        }),
      )
      .min(1),
    descripcion: Texto,
  }),
  prioridad_base: z.int().min(1).max(5),
  madurez: z.enum(MADUREZ),
  fuentes: z.array(Consulta.extend({ titulo: Nombre })).min(1),
  fecha_verificacion: Fecha,
  estado_aprobacion: z.enum(ESTADOS_DE_APROBACION),
  revision_contenido: z.enum(REVISIONES_DE_CONTENIDO),
  // Registro de la revisión humana: quién, cuándo, qué decidió y la huella del contenido que revisó.
  revision: z
    .strictObject({
      fecha: Fecha,
      por: Nombre,
      decision: Texto,
      huella: Huella,
    })
    .optional(),
  notas: Texto.optional(),
});
export type Prueba = z.infer<typeof Prueba>;

// ── Patrones del filtro de contenido (DA-03, RF-01.3) ────────────────────────────────────────────

export const PatronesDelFiltro = z.strictObject({
  version: Nombre,
  fecha: Fecha,
  proposito: Texto,
  patrones: z
    .array(
      z.strictObject({
        id: IdMinusculas,
        nombre: Texto,
        por_que: Texto,
        // Tope de longitud: el patrón es dato y no puede crecer sin que alguien lo lea.
        expresion: z.string().min(1).max(400),
        // Sin `g` ni `y`: con ellas `RegExp.test` guarda estado entre llamadas.
        banderas: z
          .string()
          .regex(/^[imsu]*$/, { message: "formato:banderas" }),
        carnadas: z.array(textoNoVacio).min(1),
        contraejemplos: z.array(textoNoVacio).min(1),
      }),
    )
    .min(1),
  contraejemplos_generales: z.strictObject({
    es: textoNoVacio,
    en: textoNoVacio,
    casos: z.array(textoNoVacio).min(1),
  }),
});
export type PatronesDelFiltro = z.infer<typeof PatronesDelFiltro>;
