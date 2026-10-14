// Sellar una corrida (plan v2 de los agentes; ADR-011): el modelo escribió un BORRADOR sin identificador, sin verificación y sin veredicto;
// el código verifica cada fuente y cada cita, calcula el veredicto con la regla del catálogo, marca instrucciones y contenido, arma las 17
// señales de la traza y le pone su identificador. Puro: la fecha de la corrida, el catálogo, los planes y las lecturas son entradas.
//
// Una propuesta que no verifica NO se descarta: llega MARCADA con su motivo (D1). Solo un borrador que no se puede sellar de forma
// coherente (un marco que no existe, un agente con un tipo que no es suyo) devuelve problemas y no sella nada.
import type { PatronCompilado } from "../catalogo/filtro.ts";
import { filtrar, type Marca } from "../catalogo/filtro.ts";
import { huella } from "../huella.ts";
import { antiguedadDelMarco } from "./antiguedad.ts";
import { SENAL_VERSION_EN_LA_CITA } from "./senales.ts";
import {
  huellaDeTexto,
  normalizarEspacios,
  similitudDeCita,
  verificarCita,
  versionEnElTexto,
} from "./citas.ts";
import {
  FORMATO_DE_CORRIDA,
  type Agente,
  type Borrador,
  type BorradorDePropuesta,
  type CampoCitable,
  type CandidataDeSobre,
  type CandidataSellada,
  type Consulta,
  type Corrida,
  type CuerpoDePropuesta,
  type EstadoDeFuente,
  type MotivoDePausa,
  type Pausa,
  type PermisoDeCita,
  type PropuestaSellada,
  type Senales,
  type UmbralesDePropuestas,
  type VeredictoSugerido,
} from "./esquemas.ts";
import {
  enListaBlanca,
  lecturasConsultadas,
  verificarFuente,
  type Lecturas,
} from "./fuentes.ts";
import { veredictoDeCandidata, type ReglaDeLaPrueba } from "./veredicto.ts";

export interface DatosDeMarco {
  version_vigente: string;
  fecha_version: string | null;
  lista_blanca: readonly string[];
}

export interface DatosDePrueba extends ReglaDeLaPrueba {
  marco_id: string;
}

/** Todo lo que el sellado necesita saber del mundo, ya cargado: el motor no lee archivos ni red. */
export interface ContextoDeVerificacion {
  umbrales: UmbralesDePropuestas;
  marcos: ReadonlyMap<string, DatosDeMarco>;
  herramientas: ReadonlyMap<string, { lista_blanca: readonly string[] }>;
  pruebas: ReadonlyMap<string, DatosDePrueba>;
  /** Las pruebas del plan vigente de cada activo con plan. */
  planes: ReadonlyMap<string, ReadonlySet<string>>;
  patronesDeContenido: PatronCompilado[];
  patronesDeInstrucciones: PatronCompilado[];
  /** El texto de una página o de un texto pegado, por la huella con que una propuesta lo nombra. */
  lecturas: Lecturas;
  /** Lo que la licencia de cada marco deja llevar a una propuesta (`datos/propuestas/licencias.json`). */
  licencias: Readonly<Record<string, PermisoDeCita>>;
}

/**
 * Si la licencia del marco deja citar un pasaje suyo con atribución (regla dura 11). Un marco sin clasificar cuenta como «solo
 * identificadores»: ante la duda, su texto no entra a una corrida, que se publica con el repositorio.
 */
export const dejaCitarSuTexto = (
  licencias: Readonly<Record<string, PermisoDeCita>>,
  marco: string,
): boolean =>
  Object.hasOwn(licencias, marco) && licencias[marco] === "cita_con_atribucion";

export interface ProblemaDelBorrador {
  regla:
    | "borrador/agente-y-tipo"
    | "borrador/id-de-corrida"
    | "borrador/ref-repetida"
    | "borrador/marco-desconocido"
    | "borrador/herramienta-desconocida"
    | "borrador/prueba-desconocida"
    | "borrador/prueba-ya-existe"
    | "borrador/activo-sin-plan"
    | "borrador/licencia-sin-texto";
  ref: string | null;
  detalle: string;
}

const NODOS: Record<Agente, readonly string[]> = {
  investigador: [
    "enrutador",
    "investigador",
    "verificador_fuentes",
    "catalogo_borrador",
  ],
  extractor: [
    "enrutador",
    "filtro_instrucciones",
    "extractor",
    "verificador_citas",
    "calculo_veredicto",
  ],
};

const identificador = (n: number): string =>
  `PROP-${String(n).padStart(4, "0")}`;

function sinRef(p: BorradorDePropuesta): CuerpoDePropuesta {
  return Object.fromEntries(
    Object.entries(p).filter(([clave]) => clave !== "ref"),
  ) as CuerpoDePropuesta;
}

/** El marco al que pertenece lo que una propuesta del investigador toca, para su antigüedad y su lista blanca. */
function marcoDe(
  p: CuerpoDePropuesta,
  ctx: ContextoDeVerificacion,
): string | null {
  if (p.tipo === "prueba_nueva") return p.prueba.marco_id;
  if (p.tipo === "version_de_marco") return p.marco_id;
  if (p.tipo === "retiro")
    return ctx.pruebas.get(p.prueba_id)?.marco_id ?? null;
  return null;
}

function listaBlancaDe(
  p: CuerpoDePropuesta,
  ctx: ContextoDeVerificacion,
): readonly string[] {
  if (p.tipo === "herramienta")
    return ctx.herramientas.get(p.herramienta_id)?.lista_blanca ?? [];
  const marco = marcoDe(p, ctx);
  return marco === null ? [] : (ctx.marcos.get(marco)?.lista_blanca ?? []);
}

export function problemasDelBorrador(
  borrador: Borrador,
  ctx: ContextoDeVerificacion,
): ProblemaDelBorrador[] {
  const problemas: ProblemaDelBorrador[] = [];
  const prefijo = borrador.agente === "investigador" ? "INV-" : "EXT-";
  if (!borrador.corrida.startsWith(prefijo))
    problemas.push({
      regla: "borrador/id-de-corrida",
      ref: null,
      detalle: `la corrida ${borrador.corrida} no es de un ${borrador.agente}`,
    });
  // Regla dura 11 (S9-E-M2): una propuesta lleva pasajes literales y la corrida sellada se publica con el repositorio. Un marco cuya
  // licencia no deja reproducir su texto no puede ser el de la propuesta ni el dueño de la dirección de una de sus fuentes. No se marca:
  // marcar dejaría el pasaje dentro de la corrida.
  const sinTexto = [...ctx.marcos.keys()].filter(
    (id) => !dejaCitarSuTexto(ctx.licencias, id),
  );
  const vistas = new Set<string>();
  for (const p of borrador.propuestas) {
    if (p.tipo !== "sobre") {
      const propio = marcoDe(p, ctx);
      const ajeno = sinTexto.find((id) =>
        p.fuentes.some((f) =>
          enListaBlanca(f.url, ctx.marcos.get(id)?.lista_blanca ?? []),
        ),
      );
      const marco =
        propio !== null && sinTexto.includes(propio) ? propio : ajeno;
      if (marco !== undefined)
        problemas.push({
          regla: "borrador/licencia-sin-texto",
          ref: p.ref,
          detalle: `la licencia de ${marco} no deja reproducir su texto: una propuesta no lleva pasajes suyos`,
        });
    }
    if (vistas.has(p.ref))
      problemas.push({
        regla: "borrador/ref-repetida",
        ref: p.ref,
        detalle: `la referencia ${p.ref} se repite`,
      });
    vistas.add(p.ref);
    const esSobre = p.tipo === "sobre";
    if (esSobre !== (borrador.agente === "extractor"))
      problemas.push({
        regla: "borrador/agente-y-tipo",
        ref: p.ref,
        detalle: `un ${borrador.agente} no propone «${p.tipo}»`,
      });
    if (p.tipo === "prueba_nueva") {
      if (!ctx.marcos.has(p.prueba.marco_id))
        problemas.push({
          regla: "borrador/marco-desconocido",
          ref: p.ref,
          detalle: p.prueba.marco_id,
        });
      if (ctx.pruebas.has(p.prueba.id))
        problemas.push({
          regla: "borrador/prueba-ya-existe",
          ref: p.ref,
          detalle: p.prueba.id,
        });
    }
    if (p.tipo === "version_de_marco" && !ctx.marcos.has(p.marco_id))
      problemas.push({
        regla: "borrador/marco-desconocido",
        ref: p.ref,
        detalle: p.marco_id,
      });
    if (p.tipo === "retiro" && !ctx.pruebas.has(p.prueba_id))
      problemas.push({
        regla: "borrador/prueba-desconocida",
        ref: p.ref,
        detalle: p.prueba_id,
      });
    if (p.tipo === "herramienta" && !ctx.herramientas.has(p.herramienta_id))
      problemas.push({
        regla: "borrador/herramienta-desconocida",
        ref: p.ref,
        detalle: p.herramienta_id,
      });
    if (p.tipo === "sobre" && !ctx.planes.has(p.activo))
      problemas.push({
        regla: "borrador/activo-sin-plan",
        ref: p.ref,
        detalle: p.activo,
      });
  }
  return problemas;
}

/** Los textos que el filtro de contenido revisa de una propuesta: lo que redactó el modelo, no las direcciones ni las huellas. */
function paraElFiltro(cuerpo: CuerpoDePropuesta): unknown {
  if (cuerpo.tipo === "sobre")
    return {
      titulo: cuerpo.titulo,
      resumen: cuerpo.resumen,
      extracto: cuerpo.texto.extracto,
      candidatas: cuerpo.candidatas.map((c) => ({
        razon: c.razon ?? null,
        citas: c.citas.map((x) => x.texto),
      })),
    };
  const { fuentes, ...resto } = cuerpo;
  return {
    ...resto,
    fuentes: fuentes.map((f) => ({ nombre: f.nombre, fragmento: f.fragmento })),
  };
}

function valorDelCampo(c: CandidataDeSobre, campo: CampoCitable): unknown {
  switch (campo) {
    case "herramienta.version":
      return c.entrada.herramienta.version;
    case "fecha":
      return c.entrada.fecha;
    case "resultado.ejecutada":
      return c.entrada.resultado.ejecutada;
    case "resultado.evaluadas":
      return c.entrada.resultado.evaluadas;
    case "resultado.fallidas":
      return c.entrada.resultado.fallidas;
    case "resultado.alertas":
      return c.entrada.resultado.alertas;
    case "resultado.metrica":
      return c.entrada.resultado.metrica;
  }
}

/** El estado de cada cita de una candidata contra el texto pegado. Sin lectura del texto, ninguna cita se puede verificar. */
export function citasDeCandidata(
  c: CandidataDeSobre,
  texto: string | undefined,
  umbral: number = 1,
): CandidataSellada["verificacion"]["citas"] {
  return c.citas.map((cita) => {
    if (texto === undefined)
      return { campo: cita.campo, estado: "no_literal" as const, similitud: 0 };
    const r = verificarCita(
      cita.campo,
      cita.texto,
      valorDelCampo(c, cita.campo),
      texto,
      umbral,
    );
    return { campo: cita.campo, estado: r.estado, similitud: r.similitud };
  });
}

/** Verifica y sella una candidata del extractor contra el texto pegado. `texto` es `undefined` si no hay lectura. */

/** Una marca por (campo, patrón): dos páginas que disparan el mismo patrón no la repiten en el sello. */
const sinRepetir = (marcas: Marca[]): Marca[] => {
  const vistas = new Set<string>();
  return marcas.filter((m) => {
    const clave = `${m.campo}\u0000${m.patron}`;
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
};

function sellarCandidata(
  c: CandidataDeSobre,
  activo: string,
  texto: string | undefined,
  ctx: ContextoDeVerificacion,
): CandidataSellada {
  const citas = citasDeCandidata(c, texto, ctx.umbrales.similitud_cita);
  const enElPlan = ctx.planes.get(activo)?.has(c.prueba) ?? false;
  const v = veredictoDeCandidata(
    c,
    citas,
    enElPlan ? ctx.pruebas.get(c.prueba) : undefined,
  );
  return {
    ...c,
    verificacion: { en_el_plan: enElPlan, citas },
    veredicto_sugerido: v.veredicto_sugerido,
    sin_veredicto: v.sin_veredicto,
  };
}

function minimo(valores: number[]): number | null {
  return valores.length === 0 ? null : Math.min(...valores);
}

function pausaDe(
  motivos: Pausa["motivos"],
  marcaInstruccion: boolean,
  veredicto: VeredictoSugerido | null,
): Pausa | null {
  return motivos.length === 0
    ? null
    : {
        motivos,
        marca_instruccion: marcaInstruccion,
        veredicto_sugerido: veredicto,
      };
}

interface Ejecucion {
  latencia_total_s: number | null;
  tokens: number | null;
}

async function sellarPropuesta(
  p: BorradorDePropuesta,
  id: string,
  borrador: Borrador,
  ctx: ContextoDeVerificacion,
  consultadas: ReadonlySet<string>,
): Promise<PropuestaSellada> {
  const cuerpo = sinRef(p);
  const u = ctx.umbrales;
  const ejecucion: Ejecucion = {
    latencia_total_s: borrador.ejecucion.latencia_total_s ?? null,
    tokens: borrador.ejecucion.tokens ?? null,
  };
  const marcasDeContenido = filtrar(
    paraElFiltro(cuerpo),
    ctx.patronesDeContenido,
  );
  const motivos: Pausa["motivos"] = [];
  const agregar = (
    motivo: MotivoDePausa,
    senal: string,
    umbral: number | null,
  ) => motivos.push({ motivo, senal, umbral });
  if (marcasDeContenido.length > 0)
    agregar("contenido_marcado", "contenido", null);

  const comun = {
    formato: "hackguard/propuesta@1" as const,
    id,
    origen: borrador.agente,
    fecha: borrador.fecha,
    contenido:
      marcasDeContenido.length > 0
        ? ("marcada_para_revision" as const)
        : ("limpia" as const),
    marcas_de_contenido: marcasDeContenido,
  };

  if (cuerpo.tipo !== "sobre") {
    // ── Investigador: fuentes (U2), citas (U1) y antigüedad del marco (U3) ──
    const lista = listaBlancaDe(cuerpo, ctx);
    const fuentes: { url: string; estado: EstadoDeFuente }[] = [];
    const similitudes: number[] = [];
    for (const f of cuerpo.fuentes) {
      const estado = await verificarFuente(f, lista, ctx.lecturas, consultadas);
      fuentes.push({ url: f.url, estado });
      const pagina = ctx.lecturas(f.huella_de_la_pagina);
      similitudes.push(
        pagina === undefined ? 0 : similitudDeCita(f.fragmento, pagina),
      );
    }
    // U2 cuenta páginas distintas: dos fuentes con la misma dirección cuentan como una.
    const verificadas = new Set(
      fuentes.filter((f) => f.estado === "verificada").map((f) => f.url),
    ).size;
    const sinVerificar =
      fuentes.length - fuentes.filter((f) => f.estado === "verificada").length;
    // Las páginas que el agente leyó son datos no confiables: una orden dirigida a él en CUALQUIER parte de la página marca la propuesta
    // (RF-07.4), no solo lo que escribió el modelo ni el pasaje que citó.
    // La página se filtra con los espacios normalizados: en disco va envuelta a ~100 columnas y una orden puede cruzar un salto de línea.
    const marcasDeInstruccion = sinRepetir([
      ...filtrar(paraElFiltro(cuerpo), ctx.patronesDeInstrucciones),
      ...[...new Set(cuerpo.fuentes.map((f) => f.huella_de_la_pagina))].flatMap(
        (h) => {
          const pagina = ctx.lecturas(h);
          return pagina === undefined
            ? []
            : filtrar(
                { pagina: normalizarEspacios(pagina) },
                ctx.patronesDeInstrucciones,
              );
        },
      ),
    ]);
    const idMarco = marcoDe(cuerpo, ctx);
    const marco = idMarco === null ? undefined : ctx.marcos.get(idMarco);
    const antiguedad =
      marco === undefined
        ? null
        : antiguedadDelMarco(marco.fecha_version, borrador.fecha);
    if (verificadas < u.fuentes_verificadas)
      agregar(
        "fuentes_insuficientes",
        "fuentes_verificadas",
        u.fuentes_verificadas,
      );
    if (sinVerificar > 0)
      agregar("cita_no_verificada", "citas_sin_verificar", 0);
    // RF-07.5: un aviso de versión solo vale si la versión nueva está dentro de un pasaje que el código verificó. Sin eso la
    // propuesta llega a la bandeja con su pausa, pero no avisa (`avisosDeVersion`).
    if (
      cuerpo.tipo === "version_de_marco" &&
      !cuerpo.fuentes.some(
        (f, i) =>
          fuentes[i]?.estado === "verificada" &&
          versionEnElTexto(cuerpo.version_nueva, f.fragmento),
      )
    )
      agregar("cita_no_verificada", SENAL_VERSION_EN_LA_CITA, 0);
    if (marco !== undefined && marco.fecha_version === null)
      agregar(
        "marco_sin_fecha",
        "antiguedad_marco_dias",
        u.antiguedad_marco_dias,
      );
    else if (antiguedad !== null && antiguedad > u.antiguedad_marco_dias)
      agregar(
        "marco_antiguo",
        "antiguedad_marco_dias",
        u.antiguedad_marco_dias,
      );
    if (marcasDeInstruccion.length > 0)
      agregar("instruccion_marcada", "marca_instruccion", null);
    const control =
      cuerpo.tipo === "prueba_nueva"
        ? cuerpo.prueba.controles.length > 0 || cuerpo.prueba.control_pendiente
        : null;
    const senales: Senales = {
      tarea: "investigar",
      fuentes_verificadas: verificadas,
      antiguedad_marco_dias: antiguedad,
      citas_sin_verificar: sinVerificar,
      marca_instruccion: marcasDeInstruccion.length > 0,
      similitud_cita: minimo(similitudes),
      veredicto_por_regla: true,
      prueba_nueva: cuerpo.tipo === "prueba_nueva",
      control_asociado: control,
      hallazgo_cerrado: false,
      reprueba_hecha: false,
      pausa_humana: motivos.length > 0,
      nodos_visitados: [
        ...NODOS.investigador,
        ...(motivos.length > 0 ? ["pausa_humana"] : []),
      ],
      ...ejecucion,
      error_proveedor: false,
      veredicto_corregido_por_persona: null,
    };
    return {
      ...cuerpo,
      ...comun,
      marcas_de_instruccion: marcasDeInstruccion,
      verificacion: { fuentes },
      senales,
      pausa: pausaDe(motivos, marcasDeInstruccion.length > 0, null),
    } as PropuestaSellada;
  }

  // ── Extractor: texto pegado, citas (U1), plan y veredicto por regla ──
  const bruto = ctx.lecturas(cuerpo.texto.huella);
  const texto =
    bruto !== undefined && (await huellaDeTexto(bruto)) === cuerpo.texto.huella
      ? bruto
      : undefined;
  if (texto === undefined) agregar("texto_sin_lectura", "texto", null);
  const candidatas = cuerpo.candidatas.map((c) =>
    sellarCandidata(c, cuerpo.activo, texto, ctx),
  );
  const marcasDeInstruccion = sinRepetir([
    ...filtrar(paraElFiltro(cuerpo), ctx.patronesDeInstrucciones),
    ...(texto === undefined
      ? []
      : filtrar(
          { texto_pegado: normalizarEspacios(texto) },
          ctx.patronesDeInstrucciones,
        )),
  ]);
  const citas = candidatas.flatMap((c) => c.verificacion.citas);
  const sinVerificar = citas.filter((c) => c.estado !== "verificada").length;
  const principal = candidatas[0];
  if (sinVerificar > 0) agregar("cita_no_verificada", "citas_sin_verificar", 0);
  if (candidatas.some((c) => !c.verificacion.en_el_plan))
    agregar("prueba_fuera_del_plan", "plan", null);
  if (cuerpo.asociacion !== "una")
    agregar("asociacion_a_elegir", "candidatas", null);
  if (
    cuerpo.asociacion !== "mezcla" &&
    principal !== undefined &&
    principal.veredicto_sugerido === null &&
    principal.sin_veredicto !== "prueba_fuera_del_plan"
  )
    agregar("sin_conteos_verificados", "veredicto_por_regla", null);
  if (marcasDeInstruccion.length > 0)
    agregar("instruccion_marcada", "marca_instruccion", null);
  const senales: Senales = {
    tarea: "extraer",
    fuentes_verificadas: null,
    antiguedad_marco_dias: null,
    citas_sin_verificar: sinVerificar,
    marca_instruccion: marcasDeInstruccion.length > 0,
    similitud_cita: minimo(citas.map((c) => c.similitud)),
    veredicto_por_regla: true,
    prueba_nueva: false,
    control_asociado: null,
    hallazgo_cerrado: false,
    reprueba_hecha: false,
    pausa_humana: motivos.length > 0,
    nodos_visitados: [
      ...NODOS.extractor,
      ...(motivos.length > 0 ? ["pausa_humana"] : []),
    ],
    ...ejecucion,
    error_proveedor: false,
    veredicto_corregido_por_persona: null,
  };
  return {
    ...cuerpo,
    ...comun,
    candidatas,
    marcas_de_instruccion: marcasDeInstruccion,
    verificacion: { fuentes: [] },
    senales,
    pausa: pausaDe(
      motivos,
      marcasDeInstruccion.length > 0,
      cuerpo.asociacion === "mezcla"
        ? null
        : (principal?.veredicto_sugerido ?? null),
    ),
  } as PropuestaSellada;
}

export type ResultadoDeSellado =
  | { ok: true; corrida: Corrida }
  | { ok: false; problemas: ProblemaDelBorrador[] };

/**
 * Sella una corrida. `primerNumero` es el número de la primera propuesta: los identificadores salen en orden del borrador. `consulta`
 * es lo que `propuestas:buscar` leyó (el extractor no consulta nada: `null`).
 */
export async function sellarCorrida(
  borrador: Borrador,
  consulta: Consulta | null,
  ctx: ContextoDeVerificacion,
  primerNumero: number,
  /** Los documentos que una persona aportó a esta corrida (RF-07.2b); vacío si ninguno. */
  aportes: readonly { url: string; huella_de_la_pagina: string }[] = [],
): Promise<ResultadoDeSellado> {
  const problemas = problemasDelBorrador(borrador, ctx);
  if (problemas.length > 0) return { ok: false, problemas };
  const propuestas: PropuestaSellada[] = [];
  // Sin consulta, ninguna fuente se leyó: cada URL citada queda como «url_no_consultada».
  const consultadas = lecturasConsultadas(consulta?.fuentes ?? [], aportes);
  for (const [i, p] of borrador.propuestas.entries())
    propuestas.push(
      await sellarPropuesta(
        p,
        identificador(primerNumero + i),
        borrador,
        ctx,
        consultadas,
      ),
    );
  const fuentes = consulta?.fuentes ?? [];
  const cuerpo = {
    formato: FORMATO_DE_CORRIDA,
    id: borrador.corrida,
    agente: borrador.agente,
    fecha: borrador.fecha,
    alcance: borrador.alcance,
    modelo: borrador.ejecucion.modelo,
    reintentos: borrador.ejecucion.reintentos,
    consulta: {
      consultadas: fuentes.filter((f) => f.estado !== "fuera_de_lista_blanca")
        .length,
      no_accesibles: fuentes
        .filter((f) => f.estado === "no_accesible")
        .map((f) => ({
          nombre: f.nombre,
          url: f.url,
          motivo: f.motivo ?? "sin_red",
        })),
    },
    contradicciones: borrador.contradicciones,
    propuestas,
  };
  return {
    ok: true,
    corrida: { ...cuerpo, huella: await huella(cuerpo) } as Corrida,
  };
}
