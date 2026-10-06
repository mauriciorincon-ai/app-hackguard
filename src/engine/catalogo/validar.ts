// Validador de carga del catálogo (RF-01.2, RF-10.1, E-2, E-7, E-15, E-16, E-26). Recibe los archivos de
// `datos/` como texto y devuelve hallazgos con regla, severidad, archivo y campo, más el catálogo parseado.
// Puro y determinista: no lee disco ni reloj, y el resultado no depende del orden de los archivos.
import type { z } from "zod";
import { huella } from "../huella.ts";
import { resolverReferencia, type Referencia } from "./equivalencias.ts";
import * as E from "./esquemas.ts";
import { compilarPatrones, filtrar, type PatronCompilado } from "./filtro.ts";
import { REGLAS, type IdRegla, type Severidad } from "./reglas.ts";
import { ESTADOS_QUE_CALCULA_EL_MOTOR } from "./semaforo.ts";
import {
  RUTAS_UNICAS,
  type ArchivoDeDatos,
  type CatalogoEnBruto,
} from "./tipos.ts";

type Texto = E.Texto;

export interface Hallazgo {
  regla: IdRegla;
  severidad: Severidad;
  /** Archivo donde está el problema. */
  ruta: string;
  /** Campo dentro del archivo (`criterio_de_veredicto.repeticiones_k`); vacío si es el archivo entero. */
  campo: string;
  nombre: Texto;
  detalle: Texto | null;
}

/** Por qué una prueba aprobada todavía no entra a una instantánea. */
export type MotivoPendiente =
  "propuesta" | "marcada_para_revision" | "revision_desactualizada";

export interface PruebaEvaluada {
  prueba: E.Prueba;
  ruta: string;
  /** Aprobada, sin errores y con su revisión de contenido al día: entra a la instantánea. */
  publicable: boolean;
  pendiente: MotivoPendiente | null;
}

export interface CatalogoValidado {
  familias: E.Familias["familias"];
  reglas_de_veredicto: E.ReglasDeVeredicto["reglas"];
  rasgos: E.RasgosDePerfil["rasgos"];
  filtro: { version: string; fecha: string } | null;
  umbrales: E.Umbrales | null;
  estados: E.Estados["vocabularios"];
  marcos: E.Marco[];
  equivalencias: E.Equivalencias[];
  controles: E.CapaDeControles[];
  herramientas: E.Herramienta[];
  pruebas: PruebaEvaluada[];
}

export type EstadoDeValidacion = "ok" | "con_advertencias" | "invalido";

export interface ResultadoDeValidacion {
  estado: EstadoDeValidacion;
  conteos: {
    marcos: number;
    equivalencias: number;
    controles: number;
    herramientas: number;
    pruebas: number;
    publicables: number;
    pendientes: number;
    errores: number;
    advertencias: number;
    notas: number;
  };
  hallazgos: Hallazgo[];
  catalogo: CatalogoValidado;
}

// ── Registro de hallazgos ───────────────────────────────────────────────────────────────────────

class Registro {
  readonly hallazgos: Hallazgo[] = [];

  agregar(
    regla: IdRegla,
    ruta: string,
    campo = "",
    detalle: Texto | null = null,
  ): void {
    const { severidad, nombre } = REGLAS[regla];
    this.hallazgos.push({ regla, severidad, ruta, campo, nombre, detalle });
  }

  erroresEn(ruta: string): number {
    return this.hallazgos.filter(
      (h) => h.ruta === ruta && h.severidad === "error",
    ).length;
  }
}

const t = (es: string, en: string): Texto => ({ es, en });
const comillas = (s: string) => t(`«${s}»`, `“${s}”`);

// ── Lectura y esquema ───────────────────────────────────────────────────────────────────────────

const NO_LEIDO = Symbol("no leído");

function leerJson(archivo: ArchivoDeDatos, registro: Registro): unknown {
  try {
    return JSON.parse(archivo.texto) as unknown;
  } catch {
    // Un BOM delante es JSON inválido para `JSON.parse`, y quien lo ve no sabe por qué: se dice.
    registro.agregar(
      "archivo/json-invalido",
      archivo.ruta,
      "",
      archivo.texto.startsWith("\uFEFF")
        ? t(
            "empieza con una marca de orden de bytes (BOM): guárdalo como UTF-8 sin BOM",
            "starts with a byte order mark (BOM): save it as UTF-8 without a BOM",
          )
        : null,
    );
    return NO_LEIDO;
  }
}

/** Un campo obligatorio cuya ausencia tiene regla propia: la semilla espera esa regla, no «esquema». */
type Faltante = readonly [readonly string[], IdRegla];

const ausente = (v: unknown): boolean =>
  v === undefined ||
  v === null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length === 0);

function buscarFaltantes(
  datos: unknown,
  faltantes: readonly Faltante[],
): { campo: string; regla: IdRegla }[] {
  const encontrados: { campo: string; regla: IdRegla }[] = [];
  const recorrer = (
    valor: unknown,
    segmentos: readonly string[],
    ruta: string[],
    regla: IdRegla,
  ) => {
    const [primero, ...resto] = segmentos;
    if (primero === "*") {
      if (Array.isArray(valor))
        valor.forEach((v, i) =>
          recorrer(v, resto, [...ruta, String(i)], regla),
        );
      return;
    }
    if (valor === null || typeof valor !== "object" || Array.isArray(valor))
      return;
    const hijo = (valor as Record<string, unknown>)[primero];
    if (resto.length > 0) {
      recorrer(hijo, resto, [...ruta, primero], regla);
    } else if (ausente(hijo)) {
      encontrados.push({ campo: [...ruta, primero].join("."), regla });
    }
  };
  for (const [patron, regla] of faltantes) recorrer(datos, patron, [], regla);
  // Si falta el padre, el hijo no se reporta aparte: `resultado_esperado` ya dice lo que falta.
  return encontrados.filter(
    (f) =>
      !encontrados.some((g) => g !== f && f.campo.startsWith(`${g.campo}.`)),
  );
}

const TIPOS: Record<string, [string, string]> = {
  string: ["un texto", "a text"],
  number: ["un número", "a number"],
  int: ["un entero", "an integer"],
  boolean: ["sí o no (booleano)", "yes or no (boolean)"],
  object: ["un objeto", "an object"],
  array: ["una lista", "a list"],
};

const FORMATOS: Record<string, Texto> = {
  "formato:en-blanco": t("el texto está en blanco", "the text is blank"),
  "formato:fecha": t(
    "se esperaba una fecha AAAA-MM-DD que exista",
    "expected an existing YYYY-MM-DD date",
  ),
  "formato:fecha-parcial": t(
    "se esperaba AAAA, AAAA-MM o AAAA-MM-DD",
    "expected YYYY, YYYY-MM or YYYY-MM-DD",
  ),
  "formato:url": t(
    "se esperaba una dirección https",
    "expected an https address",
  ),
  "formato:id": t(
    "se esperaba un id en minúsculas, dígitos y guiones",
    "expected an id in lowercase letters, digits and hyphens",
  ),
  "formato:id-prueba": t(
    "se esperaba un id en mayúsculas, dígitos y guiones",
    "expected an id in uppercase letters, digits and hyphens",
  ),
  "formato:id-control": t(
    "se esperaba un id de control como iso42001-A.6.2.4",
    "expected a control id such as iso42001-A.6.2.4",
  ),
  "formato:huella": t(
    "se esperaba una huella SHA-256 en hexadecimal",
    "expected a hexadecimal SHA-256 fingerprint",
  ),
  "formato:banderas": t(
    "banderas admitidas: i, m, s, u",
    "allowed flags: i, m, s, u",
  ),
};

function describir(problema: z.core.$ZodIssue): Texto {
  switch (problema.code) {
    case "invalid_type": {
      const [es, en] = TIPOS[problema.expected] ?? [
        problema.expected,
        problema.expected,
      ];
      return t(`se esperaba ${es}`, `expected ${en}`);
    }
    case "too_small":
    case "too_big": {
      const limite = String(
        problema.code === "too_small" ? problema.minimum : problema.maximum,
      );
      const [es, en] =
        problema.code === "too_small"
          ? ["al menos", "at least"]
          : ["como mucho", "at most"];
      if (problema.origin === "string")
        return t(`${es} ${limite} caracteres`, `${en} ${limite} characters`);
      if (problema.origin === "array")
        return t(`${es} ${limite} elementos`, `${en} ${limite} items`);
      return t(`${es} ${limite}`, `${en} ${limite}`);
    }
    case "invalid_value": {
      const valores = problema.values.map(String).join(", ");
      return t(`valores admitidos: ${valores}`, `allowed values: ${valores}`);
    }
    case "invalid_union":
      return t(
        "no coincide con ninguna de las formas admitidas",
        "matches none of the allowed shapes",
      );
    case "invalid_format":
    case "custom":
      return (
        FORMATOS[problema.message] ??
        t(`no cumple el formato`, `does not match the format`)
      );
    default:
      return t(
        `no cumple el esquema (${problema.code})`,
        `does not match the schema (${problema.code})`,
      );
  }
}

/** Parsea contra un esquema; los campos ausentes con regla propia se reportan con esa regla. */
function revisarEsquema<T>(
  esquema: z.ZodType<T>,
  datos: unknown,
  ruta: string,
  registro: Registro,
  faltantes: readonly Faltante[] = [],
): T | null {
  const ausentes = buscarFaltantes(datos, faltantes);
  for (const a of ausentes) registro.agregar(a.regla, ruta, a.campo);
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;
  for (const problema of resultado.error.issues) {
    const campo = problema.path.map(String).join(".");
    if (
      ausentes.some((a) => campo === a.campo || campo.startsWith(`${a.campo}.`))
    )
      continue;
    if (problema.code === "unrecognized_keys") {
      for (const clave of problema.keys) {
        registro.agregar(
          "esquema/campo-desconocido",
          ruta,
          campo === "" ? clave : `${campo}.${clave}`,
        );
      }
    } else {
      registro.agregar(
        "esquema/campo-invalido",
        ruta,
        campo,
        describir(problema),
      );
    }
  }
  return null;
}

/** Textos `{ es, en }` largos idénticos en los dos idiomas: uno está sin redactar (regla 20). */
function idiomasRepetidos(valor: unknown, ruta: string[] = []): string[] {
  if (Array.isArray(valor))
    return valor.flatMap((v, i) => idiomasRepetidos(v, [...ruta, String(i)]));
  if (valor === null || typeof valor !== "object") return [];
  const registro = valor as Record<string, unknown>;
  const claves = Object.keys(registro).sort();
  if (
    claves.length === 2 &&
    claves[0] === "en" &&
    claves[1] === "es" &&
    typeof registro.es === "string" &&
    registro.es === registro.en &&
    registro.es.length >= 24
  ) {
    return [ruta.join(".")];
  }
  return claves.flatMap((c) => idiomasRepetidos(registro[c], [...ruta, c]));
}

function leerYRevisar<T>(
  archivo: ArchivoDeDatos,
  esquema: z.ZodType<T>,
  registro: Registro,
  faltantes: readonly Faltante[] = [],
): { datos: unknown; valor: T | null } {
  const datos = leerJson(archivo, registro);
  if (datos === NO_LEIDO) return { datos, valor: null };
  for (const campo of idiomasRepetidos(datos))
    registro.agregar("texto/idioma-repetido", archivo.ruta, campo);
  return {
    datos,
    valor: revisarEsquema(esquema, datos, archivo.ruta, registro, faltantes),
  };
}

const nombreDeArchivo = (ruta: string) => ruta.slice(ruta.lastIndexOf("/") + 1);

/** Lee una carpeta de entidades con id: valida, exige `<id>.json` y descarta ids duplicados. */
function leerColeccion<T extends { id: string }>(
  archivos: ArchivoDeDatos[],
  esquema: z.ZodType<T>,
  registro: Registro,
  faltantes: readonly Faltante[] = [],
): { valor: T; ruta: string; datos: unknown }[] {
  const ordenados = [...archivos].sort((a, b) =>
    a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0,
  );
  const vistos = new Map<string, string>();
  const salida: { valor: T; ruta: string; datos: unknown }[] = [];
  for (const archivo of ordenados) {
    const { datos, valor } = leerYRevisar(
      archivo,
      esquema,
      registro,
      faltantes,
    );
    if (valor === null) continue;
    if (nombreDeArchivo(archivo.ruta) !== `${valor.id}.json`) {
      registro.agregar(
        "archivo/nombre-no-coincide",
        archivo.ruta,
        "id",
        comillas(`${valor.id}.json`),
      );
    }
    const previo = vistos.get(valor.id);
    if (previo !== undefined) {
      registro.agregar(
        "catalogo/id-duplicado",
        archivo.ruta,
        "id",
        t(`también en ${previo}`, `also in ${previo}`),
      );
      continue;
    }
    vistos.set(valor.id, archivo.ruta);
    salida.push({ valor, ruta: archivo.ruta, datos });
  }
  return salida.sort((a, b) => (a.valor.id < b.valor.id ? -1 : 1));
}

function leerUnico<T>(
  archivo: ArchivoDeDatos | null,
  rutaEsperada: string,
  esquema: z.ZodType<T>,
  registro: Registro,
): T | null {
  if (archivo === null) {
    registro.agregar("archivo/falta", rutaEsperada);
    return null;
  }
  return leerYRevisar(archivo, esquema, registro).valor;
}

function indicePorId<T extends { id: string }>(
  items: readonly T[],
  ruta: string,
  campo: string,
  registro: Registro,
): Map<string, T> {
  const indice = new Map<string, T>();
  items.forEach((item, i) => {
    if (indice.has(item.id)) {
      registro.agregar(
        "catalogo/id-duplicado",
        ruta,
        `${campo}.${i}.id`,
        comillas(item.id),
      );
    } else {
      indice.set(item.id, item);
    }
  });
  return indice;
}

// ── Faltantes con regla propia ──────────────────────────────────────────────────────────────────

const FALTANTES_DE_PRUEBA: readonly Faltante[] = [
  [["marco_id"], "prueba/sin-marco"],
  [["version_marco"], "referencia/sin-version"],
  [["referencia_en_marco"], "prueba/sin-referencia-en-marco"],
  [["referencias_adicionales", "*", "version_marco"], "referencia/sin-version"],
  [["resultado_esperado"], "prueba/sin-resultado-esperado"],
  [["resultado_esperado", "descripcion"], "prueba/sin-resultado-esperado"],
  [["criterio_de_veredicto"], "prueba/sin-criterio"],
  [["criterio_de_veredicto", "regla"], "prueba/sin-criterio"],
  [["aplicabilidad"], "prueba/sin-aplicabilidad"],
  [["aplicabilidad", "condiciones"], "prueba/sin-aplicabilidad"],
];

const FALTANTES_DE_MARCO: readonly Faltante[] = [
  [["fuente_oficial"], "marco/sin-procedencia"],
  [["fuente_oficial", "http"], "marco/sin-procedencia"],
  [["licencia"], "marco/sin-licencia"],
];

const FALTANTES_DE_CONTROLES: readonly Faltante[] = [
  [
    [
      "areas",
      "*",
      "controles",
      "*",
      "controles_equivalentes",
      "*",
      "version_marco",
    ],
    "referencia/sin-version",
  ],
];

// ── Revisión de contenido ───────────────────────────────────────────────────────────────────────

/**
 * La huella de lo que una persona revisa en una prueba: todo menos el propio registro de la revisión,
 * los estados de aprobación y la fecha de verificación. Si el contenido cambia después, la revisión deja
 * de valer y la prueba vuelve a esperar revisión.
 */
export function huellaDeRevision(prueba: E.Prueba): Promise<string> {
  const contenido: Record<string, unknown> = { ...prueba };
  for (const campo of [
    "revision",
    "revision_contenido",
    "estado_aprobacion",
    "fecha_verificacion",
  ]) {
    delete contenido[campo];
  }
  return huella(contenido);
}

// ── El validador ────────────────────────────────────────────────────────────────────────────────

const esDosCientos = (http: number) => http >= 200 && http < 300;

export async function validarCatalogo(
  entrada: CatalogoEnBruto,
): Promise<ResultadoDeValidacion> {
  const registro = new Registro();

  // Vocabulario y filtro.
  const familiasDatos = leerUnico(
    entrada.familias,
    RUTAS_UNICAS.familias,
    E.Familias,
    registro,
  );
  const reglasDatos = leerUnico(
    entrada.reglas_de_veredicto,
    RUTAS_UNICAS.reglas_de_veredicto,
    E.ReglasDeVeredicto,
    registro,
  );
  const rasgosDatos = leerUnico(
    entrada.rasgos,
    RUTAS_UNICAS.rasgos,
    E.RasgosDePerfil,
    registro,
  );
  const filtroDatos = leerUnico(
    entrada.filtro,
    RUTAS_UNICAS.filtro,
    E.PatronesDelFiltro,
    registro,
  );
  const umbralesDatos = leerUnico(
    entrada.umbrales,
    RUTAS_UNICAS.umbrales,
    E.Umbrales,
    registro,
  );
  const estadosDatos = leerUnico(
    entrada.estados,
    RUTAS_UNICAS.estados,
    E.Estados,
    registro,
  );

  const familias = indicePorId(
    familiasDatos?.familias ?? [],
    RUTAS_UNICAS.familias,
    "familias",
    registro,
  );
  for (const [i, f] of (familiasDatos?.familias ?? []).entries()) {
    indicePorId(
      f.categorias,
      RUTAS_UNICAS.familias,
      `familias.${i}.categorias`,
      registro,
    );
  }
  const reglas = indicePorId(
    reglasDatos?.reglas ?? [],
    RUTAS_UNICAS.reglas_de_veredicto,
    "reglas",
    registro,
  );
  const rasgos = indicePorId(
    rasgosDatos?.rasgos ?? [],
    RUTAS_UNICAS.rasgos,
    "rasgos",
    registro,
  );

  if (
    umbralesDatos !== null &&
    umbralesDatos.vigencia.vencido <= umbralesDatos.vigencia.por_revisar
  ) {
    const { por_revisar, vencido } = umbralesDatos.vigencia;
    registro.agregar(
      "umbrales/orden-invalido",
      RUTAS_UNICAS.umbrales,
      "vigencia.vencido",
      t(
        `vencido ${vencido} ≤ por revisar ${por_revisar}`,
        `overdue ${vencido} ≤ review due ${por_revisar}`,
      ),
    );
  }

  const vocabularios = indicePorId(
    estadosDatos?.vocabularios ?? [],
    RUTAS_UNICAS.estados,
    "vocabularios",
    registro,
  );
  for (const [i, v] of (estadosDatos?.vocabularios ?? []).entries()) {
    indicePorId(
      v.estados,
      RUTAS_UNICAS.estados,
      `vocabularios.${i}.estados`,
      registro,
    );
  }
  if (estadosDatos !== null) {
    for (const [vocabulario, ids] of Object.entries(
      ESTADOS_QUE_CALCULA_EL_MOTOR,
    )) {
      for (const id of ids) {
        if (!vocabularios.get(vocabulario)?.estados.some((e) => e.id === id)) {
          registro.agregar(
            "estados/sin-etiqueta",
            RUTAS_UNICAS.estados,
            "vocabularios",
            comillas(`${vocabulario}.${id}`),
          );
        }
      }
    }
  }

  let patrones: PatronCompilado[] = [];
  // El hallazgo `filtro/marcada` nombra el patrón con su nombre en cada idioma, no con su id.
  const nombresDePatron = new Map(
    (filtroDatos?.patrones ?? []).map((p) => [p.id, p.nombre]),
  );
  const patronMarcado = (id: string): Texto => {
    const nombre = nombresDePatron.get(id);
    return nombre === undefined
      ? comillas(id)
      : t(`«${nombre.es}»`, `“${nombre.en}”`);
  };
  if (filtroDatos !== null) {
    const compilado = compilarPatrones(filtroDatos);
    patrones = compilado.patrones;
    for (const p of compilado.problemas) {
      registro.agregar(
        p.regla,
        RUTAS_UNICAS.filtro,
        p.campo,
        comillas(p.patron),
      );
    }
  }

  // Marcos y mapas de equivalencias.
  const marcosLeidos = leerColeccion(
    entrada.marcos,
    E.Marco,
    registro,
    FALTANTES_DE_MARCO,
  );
  const mapasLeidos = leerColeccion(
    entrada.equivalencias,
    E.Equivalencias,
    registro,
  );
  const marcos = new Map(marcosLeidos.map((m) => [m.valor.id, m.valor]));
  const mapas = new Map(mapasLeidos.map((m) => [m.valor.id, m.valor]));

  for (const { valor: m, ruta } of marcosLeidos) {
    if (
      m.fecha_version === null &&
      !m.por_verificar.includes("fecha_version")
    ) {
      registro.agregar("marco/nulo-sin-declarar", ruta, "fecha_version");
    }
    if (
      !esDosCientos(m.fuente_oficial.http) &&
      (m.estado !== "fuente_no_accesible_al_agente" ||
        !m.por_verificar.includes("fuente_oficial"))
    ) {
      registro.agregar(
        "marco/fuente-no-accesible-sin-declarar",
        ruta,
        "fuente_oficial.http",
        comillas(String(m.fuente_oficial.http)),
      );
    }
    m.familias_aplicables.forEach((f, i) => {
      if (!familias.has(f))
        registro.agregar(
          "marco/familia-inexistente",
          ruta,
          `familias_aplicables.${i}`,
          comillas(f),
        );
    });
    m.versiones_anteriores.forEach((v, i) => {
      if (v.equivalencias !== undefined && !mapas.has(v.equivalencias)) {
        registro.agregar(
          "marco/equivalencias-inexistentes",
          ruta,
          `versiones_anteriores.${i}.equivalencias`,
          comillas(v.equivalencias),
        );
      }
    });
    for (const campo of m.por_verificar)
      registro.agregar("marco/por-verificar", ruta, campo);
  }

  for (const { valor: mapa, ruta } of mapasLeidos) {
    const marco = marcos.get(mapa.marco_id);
    if (marco === undefined) {
      registro.agregar(
        "equivalencias/marco-inexistente",
        ruta,
        "marco_id",
        comillas(mapa.marco_id),
      );
      continue;
    }
    const entradasDe = (
      version: string,
    ): { id: string }[] | undefined | null => {
      if (version === marco.version_vigente) return marco.entradas;
      const anterior = marco.versiones_anteriores.find(
        (v) => v.version === version,
      );
      return anterior === undefined ? null : anterior.entradas;
    };
    const desde = entradasDe(mapa.desde);
    const hacia = entradasDe(mapa.hacia);
    if (desde === null)
      registro.agregar(
        "equivalencias/version-inexistente",
        ruta,
        "desde",
        comillas(mapa.desde),
      );
    if (hacia === null)
      registro.agregar(
        "equivalencias/version-inexistente",
        ruta,
        "hacia",
        comillas(mapa.hacia),
      );
    mapa.pares.forEach((par, i) => {
      if (desde && !desde.some((e) => e.id === par.desde)) {
        registro.agregar(
          "equivalencias/entrada-inexistente",
          ruta,
          `pares.${i}.desde`,
          comillas(par.desde),
        );
      }
      par.hacia.forEach((h, j) => {
        if (hacia && !hacia.some((e) => e.id === h)) {
          registro.agregar(
            "equivalencias/entrada-inexistente",
            ruta,
            `pares.${i}.hacia.${j}`,
            comillas(h),
          );
        }
      });
    });
    for (const e of desde ?? []) {
      if (!mapa.pares.some((p) => p.desde === e.id)) {
        registro.agregar(
          "equivalencias/entrada-sin-mapa",
          ruta,
          "pares",
          comillas(e.id),
        );
      }
    }
    if (!marco.versiones_anteriores.some((v) => v.equivalencias === mapa.id)) {
      registro.agregar(
        "equivalencias/no-citado",
        ruta,
        "id",
        comillas(mapa.id),
      );
    }
  }

  const revisarReferencia = (
    ref: Referencia,
    ruta: string,
    prefijo: string,
  ): void => {
    const resolucion = resolverReferencia(ref, marcos, mapas);
    const cita = `${ref.marco_id} ${ref.version_marco} ${ref.referencia_en_marco}`;
    if (resolucion.tipo === "invalida") {
      const campo =
        resolucion.regla === "referencia/marco-inexistente"
          ? "marco_id"
          : resolucion.regla === "referencia/version-inexistente"
            ? "version_marco"
            : "referencia_en_marco";
      registro.agregar(
        resolucion.regla,
        ruta,
        `${prefijo}${campo}`,
        comillas(cita),
      );
    } else if (resolucion.tipo === "anterior") {
      const campo = `${prefijo}version_marco`;
      const vigente = resolucion.version_vigente;
      if (resolucion.vigentes === null) {
        registro.agregar(
          "referencia/version-anterior",
          ruta,
          campo,
          t(
            `«${cita}»: no hay mapa hasta la versión vigente ${vigente}`,
            `“${cita}”: there is no map up to the current version ${vigente}`,
          ),
        );
      } else if (resolucion.vigentes.length === 0) {
        registro.agregar(
          "referencia/sin-sucesora",
          ruta,
          campo,
          comillas(cita),
        );
      } else {
        const destino = resolucion.vigentes.join(", ");
        registro.agregar(
          "referencia/version-anterior",
          ruta,
          campo,
          t(
            `«${cita}» es ${destino} en la versión ${vigente}`,
            `“${cita}” is ${destino} in version ${vigente}`,
          ),
        );
      }
    }
  };

  // Controles.
  const capasLeidas = leerColeccion(
    entrada.controles,
    E.CapaDeControles,
    registro,
    FALTANTES_DE_CONTROLES,
  );
  const controles = new Map<string, string>();
  for (const { valor: capa, ruta } of capasLeidas) {
    const marco = marcos.get(capa.marco_id);
    if (marco === undefined) {
      registro.agregar(
        "referencia/marco-inexistente",
        ruta,
        "marco_id",
        comillas(capa.marco_id),
      );
    } else if (
      capa.version_marco !== marco.version_vigente &&
      !marco.versiones_anteriores.some((v) => v.version === capa.version_marco)
    ) {
      registro.agregar(
        "referencia/version-inexistente",
        ruta,
        "version_marco",
        comillas(capa.version_marco),
      );
    }
    capa.areas.forEach((area, a) => {
      area.controles.forEach((control, c) => {
        const campo = `areas.${a}.controles.${c}`;
        if (controles.has(control.id)) {
          registro.agregar(
            "catalogo/id-duplicado",
            ruta,
            `${campo}.id`,
            comillas(control.id),
          );
        } else {
          controles.set(control.id, capa.id);
        }
        control.controles_equivalentes.forEach((eq, e) => {
          const prefijo = `${campo}.controles_equivalentes.${e}.`;
          if (
            eq.cobertura === "parcial" &&
            eq.nota_de_incompletitud === undefined
          ) {
            registro.agregar(
              "control/equivalente-parcial-sin-nota",
              ruta,
              `${prefijo}cobertura`,
            );
          }
          revisarReferencia(eq, ruta, prefijo);
        });
      });
    });
  }

  // Herramientas.
  const herramientasLeidas = leerColeccion(
    entrada.herramientas,
    E.Herramienta,
    registro,
  );
  const herramientas = new Map(
    herramientasLeidas.map((h) => [h.valor.id, h.valor]),
  );
  for (const { valor: h, ruta } of herramientasLeidas) {
    h.familias.forEach((f, i) => {
      if (!familias.has(f))
        registro.agregar(
          "herramienta/familia-inexistente",
          ruta,
          `familias.${i}`,
          comillas(f),
        );
    });
    if (h.tipo === "publica" && h.registro === undefined)
      registro.agregar("herramienta/sin-registro", ruta, "registro");
    if (h.tipo === "herramienta_propia" && h.repositorio === undefined) {
      registro.agregar(
        "herramienta/propia-sin-repositorio",
        ruta,
        "repositorio",
      );
    }
  }

  // El filtro recorre también el resto del catálogo: marcos, mapas, controles, herramientas y vocabulario.
  // Ahí no hay estado de aprobación que cambiar; la marca queda como advertencia para que una persona lo lea.
  const vocabulario: [ArchivoDeDatos | null, unknown][] = [
    [entrada.familias, familiasDatos],
    [entrada.reglas_de_veredicto, reglasDatos],
    [entrada.rasgos, rasgosDatos],
    [entrada.umbrales, umbralesDatos],
    [entrada.estados, estadosDatos],
  ];
  const resto: { ruta: string; datos: unknown }[] = [
    ...vocabulario.flatMap(([archivo, valor]) =>
      archivo !== null && valor !== null
        ? [{ ruta: archivo.ruta, datos: valor }]
        : [],
    ),
    ...marcosLeidos,
    ...mapasLeidos,
    ...capasLeidas,
    ...herramientasLeidas,
  ];
  for (const { ruta, datos } of resto) {
    for (const m of filtrar(datos, patrones)) {
      registro.agregar("filtro/marcada", ruta, m.campo, patronMarcado(m.patron));
    }
  }

  // Pruebas.
  const pruebasLeidas = leerColeccion(
    entrada.pruebas,
    E.Prueba,
    registro,
    FALTANTES_DE_PRUEBA,
  );
  // El filtro corre también sobre las pruebas que no pasaron el esquema: marcar no depende de la forma.
  const pruebasValidas = new Set(pruebasLeidas.map((p) => p.ruta));
  for (const archivo of entrada.pruebas) {
    if (pruebasValidas.has(archivo.ruta)) continue;
    let datos: unknown;
    try {
      datos = JSON.parse(archivo.texto) as unknown;
    } catch {
      continue;
    }
    for (const m of filtrar(datos, patrones)) {
      registro.agregar(
        "filtro/marcada",
        archivo.ruta,
        m.campo,
        patronMarcado(m.patron),
      );
    }
  }

  const evaluadas: PruebaEvaluada[] = [];
  for (const { valor: p, ruta, datos } of pruebasLeidas) {
    const familia = familias.get(p.familia);
    if (familia === undefined) {
      registro.agregar(
        "prueba/familia-inexistente",
        ruta,
        "familia",
        comillas(p.familia),
      );
    } else {
      if (!familia.categorias.some((c) => c.id === p.categoria)) {
        registro.agregar(
          "prueba/categoria-inexistente",
          ruta,
          "categoria",
          comillas(p.categoria),
        );
      }
      if (!familia.madurez_admitida.includes(p.madurez)) {
        registro.agregar(
          "prueba/madurez-no-admitida",
          ruta,
          "madurez",
          comillas(p.madurez),
        );
      }
    }

    revisarReferencia(p, ruta, "");
    p.referencias_adicionales?.forEach((r, i) =>
      revisarReferencia(r, ruta, `referencias_adicionales.${i}.`),
    );
    const marco = marcos.get(p.marco_id);
    if (
      marco !== undefined &&
      familia !== undefined &&
      !marco.familias_aplicables.includes(p.familia)
    ) {
      registro.agregar(
        "prueba/marco-no-aplica",
        ruta,
        "marco_id",
        comillas(p.marco_id),
      );
    }

    p.controles.forEach((c, i) => {
      if (!controles.has(c))
        registro.agregar(
          "prueba/control-inexistente",
          ruta,
          `controles.${i}`,
          comillas(c),
        );
    });
    if (p.control_pendiente !== (p.controles.length === 0)) {
      registro.agregar(
        "prueba/control-pendiente-incoherente",
        ruta,
        "control_pendiente",
      );
    }
    if (p.controles.length === 0)
      registro.agregar("prueba/sin-control", ruta, "controles");

    p.herramientas_recomendadas.forEach((recomendada, i) => {
      const campo = `herramientas_recomendadas.${i}`;
      const h = herramientas.get(recomendada.herramienta);
      if (h === undefined) {
        registro.agregar(
          "prueba/herramienta-inexistente",
          ruta,
          `${campo}.herramienta`,
          comillas(recomendada.herramienta),
        );
        return;
      }
      if (familia !== undefined && !h.familias.includes(p.familia)) {
        registro.agregar(
          "prueba/herramienta-no-cubre-la-familia",
          ruta,
          `${campo}.herramienta`,
          comillas(h.id),
        );
      }
      if (!h.entornos_soportados.includes(recomendada.entorno)) {
        registro.agregar(
          "prueba/entorno-no-soportado",
          ruta,
          `${campo}.entorno`,
          comillas(recomendada.entorno),
        );
      }
      if (recomendada.selector.tipo !== h.selector) {
        registro.agregar(
          "prueba/selector-no-corresponde",
          ruta,
          `${campo}.selector.tipo`,
          t(
            `${h.id} pide un selector «${h.selector}»`,
            `${h.id} requires a “${h.selector}” selector`,
          ),
        );
      }
    });
    if (
      !p.herramientas_recomendadas.some(
        (h) => h.herramienta === p.resultado_esperado.medido_con,
      )
    ) {
      registro.agregar(
        "prueba/arnes-no-recomendado",
        ruta,
        "resultado_esperado.medido_con",
        comillas(p.resultado_esperado.medido_con),
      );
    }

    const regla = reglas.get(p.criterio_de_veredicto.regla);
    if (regla === undefined) {
      registro.agregar(
        "prueba/regla-inexistente",
        ruta,
        "criterio_de_veredicto.regla",
        comillas(p.criterio_de_veredicto.regla),
      );
    } else if (familia !== undefined) {
      const choca =
        (regla.ambito === "determinista" && familia.estocastica) ||
        (regla.ambito === "estocastica" && !familia.estocastica);
      if (choca) {
        registro.agregar(
          "prueba/regla-no-admitida",
          ruta,
          "criterio_de_veredicto.regla",
          comillas(regla.id),
        );
      }
      if (
        familia.estocastica &&
        regla.requiere_k &&
        p.criterio_de_veredicto.repeticiones_k === undefined
      ) {
        registro.agregar(
          "prueba/estocastica-sin-k",
          ruta,
          "criterio_de_veredicto.repeticiones_k",
        );
      }
    }

    p.aplicabilidad.condiciones.forEach((c, i) => {
      const campo = `aplicabilidad.condiciones.${i}`;
      const rasgo = rasgos.get(c.rasgo);
      if (rasgo === undefined) {
        registro.agregar(
          "prueba/rasgo-inexistente",
          ruta,
          `${campo}.rasgo`,
          comillas(c.rasgo),
        );
        return;
      }
      const valido =
        rasgo.tipo === "booleano"
          ? typeof c.valor === "boolean"
          : typeof c.valor === "string" &&
            rasgo.opciones.some((o) => o.id === c.valor);
      if (!valido)
        registro.agregar(
          "prueba/condicion-invalida",
          ruta,
          `${campo}.valor`,
          comillas(String(c.valor)),
        );
    });

    // Revisión de contenido (§ 6.4): el filtro marca; solo una persona aprueba lo marcado.
    // La huella del contenido revisado se muestra en el detalle: es lo que la persona registra en
    // `revision.huella` al aprobar, y no hay otra forma de obtenerla sin escribir código.
    const huellaActual = await huellaDeRevision(p);
    const revisionAlDia =
      p.revision !== undefined && huellaActual === p.revision.huella;
    const conHuella = t(
      `huella del contenido a revisar: ${huellaActual}`,
      `fingerprint of the content to review: ${huellaActual}`,
    );
    if (
      p.estado_aprobacion === "aprobada" &&
      p.revision_contenido === "marcada_para_revision"
    ) {
      registro.agregar(
        "prueba/aprobada-sin-revision",
        ruta,
        "revision_contenido",
        conHuella,
      );
    }
    if (
      p.revision_contenido === "revisada_y_aprobada" &&
      p.revision === undefined
    ) {
      registro.agregar(
        "prueba/revision-sin-registro",
        ruta,
        "revision",
        conHuella,
      );
    } else if (
      p.revision_contenido === "revisada_y_aprobada" &&
      !revisionAlDia
    ) {
      registro.agregar(
        "prueba/revision-desactualizada",
        ruta,
        "revision.huella",
        conHuella,
      );
    }
    const revisadaAlDia =
      p.revision_contenido === "revisada_y_aprobada" && revisionAlDia;
    const marcas = filtrar(datos, patrones);
    for (const m of marcas) {
      registro.agregar(
        revisadaAlDia ? "filtro/marcada-y-revisada" : "filtro/marcada",
        ruta,
        m.campo,
        patronMarcado(m.patron),
      );
    }

    let pendiente: MotivoPendiente | null = null;
    if (p.estado_aprobacion === "propuesta") pendiente = "propuesta";
    else if (p.estado_aprobacion === "aprobada") {
      if (p.revision_contenido === "marcada_para_revision")
        pendiente = "marcada_para_revision";
      else if (p.revision_contenido === "revisada_y_aprobada" && !revisionAlDia)
        pendiente = "revision_desactualizada";
      else if (p.revision_contenido === "limpia" && marcas.length > 0)
        pendiente = "marcada_para_revision";
    }
    evaluadas.push({
      prueba: p,
      ruta,
      publicable:
        p.estado_aprobacion === "aprobada" &&
        pendiente === null &&
        registro.erroresEn(ruta) === 0,
      pendiente,
    });
  }

  const hallazgos = [...registro.hallazgos].sort(compararHallazgos);
  const cuenta = (s: Severidad) =>
    hallazgos.filter((h) => h.severidad === s).length;
  const errores = cuenta("error");
  const advertencias = cuenta("advertencia");
  return {
    estado:
      errores > 0 ? "invalido" : advertencias > 0 ? "con_advertencias" : "ok",
    conteos: {
      marcos: marcosLeidos.length,
      equivalencias: mapasLeidos.length,
      controles: controles.size,
      herramientas: herramientasLeidas.length,
      pruebas: evaluadas.length,
      publicables: evaluadas.filter((e) => e.publicable).length,
      pendientes: evaluadas.filter((e) => e.pendiente !== null).length,
      errores,
      advertencias,
      notas: cuenta("nota"),
    },
    hallazgos,
    catalogo: {
      familias: familiasDatos?.familias ?? [],
      reglas_de_veredicto: reglasDatos?.reglas ?? [],
      rasgos: rasgosDatos?.rasgos ?? [],
      filtro:
        filtroDatos === null
          ? null
          : { version: filtroDatos.version, fecha: filtroDatos.fecha },
      umbrales: umbralesDatos,
      estados: estadosDatos?.vocabularios ?? [],
      marcos: marcosLeidos.map((m) => m.valor),
      equivalencias: mapasLeidos.map((m) => m.valor),
      controles: capasLeidas.map((c) => c.valor),
      herramientas: herramientasLeidas.map((h) => h.valor),
      pruebas: evaluadas,
    },
  };
}

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function compararHallazgos(a: Hallazgo, b: Hallazgo): number {
  return (
    comparar(a.ruta, b.ruta) ||
    comparar(a.campo, b.campo) ||
    comparar(a.regla, b.regla) ||
    comparar(a.detalle?.es ?? "", b.detalle?.es ?? "")
  );
}
