// La vista de `/catalogo/propuestas`, calculada desde UN objeto: `MundoDePropuestas`. Función pura: ni reloj, ni archivos, ni azar. Nada
// se recalcula aquí: el estado de cada propuesta, la cuenta de «por decidir», los avisos y el veredicto de cada candidata salen del motor
// (`bandeja`, `porDecidir`, la regla del catálogo); esta capa los nombra con `datos/propuestas/etiquetas.json` y el vocabulario de
// estados del catálogo y los ordena. Aprobar o rechazar NO se hace aquí: la pantalla arma el comando que registra la decisión.
import { SENAL_VERSION_EN_LA_CITA } from "../../engine/propuestas/senales.ts";
import { senalesConDecision } from "../../engine/propuestas/decisiones.ts";
import type {
  Aporte,
  Decision,
  MotivoDePausa,
  PropuestaSellada,
} from "../../engine/propuestas/esquemas.ts";
import { evaluarCriterios } from "../../engine/propuestas/traza.ts";
import { etiqueta } from "../catalogo/vista.ts";
import { etiquetaDePropuesta } from "./etiquetas.ts";
import type { MundoDePropuestas } from "./pagina.ts";
import type {
  AgenteDePropuesta,
  Bilingue,
  CandidataVista,
  CorridaVista,
  DecisionDeBandeja,
  EfectoVista,
  Etiqueta,
  FilaDePropuesta,
  FuenteVista,
  MotivoVista,
  SobreVista,
  VistaDePropuestas,
} from "./tipos.ts";

const ORIGENES: Record<AgenteDePropuesta, Bilingue> = {
  investigador: { es: "Investigador", en: "Researcher" },
  extractor: { es: "Extractor", en: "Extractor" },
};

const TIPOS: Record<FilaDePropuesta["tipo"], Bilingue> = {
  prueba_nueva: { es: "Prueba nueva", en: "New test" },
  version_de_marco: { es: "Versión de marco", en: "Framework version" },
  retiro: { es: "Retiro de prueba", en: "Test retirement" },
  herramienta: { es: "Herramienta", en: "Tool" },
  sobre: { es: "Sobre de evidencia", en: "Evidence envelope" },
};

/** Por qué el código no pudo verificar una fuente: se dice con palabras, junto a la fuente. */
const DETALLE_DE_FUENTE: Record<string, Bilingue> = {
  sin_fragmento: {
    es: "El código leyó la página y el fragmento que se cita no está en ella.",
    en: "Code read the page and the fragment that is quoted is not in it.",
  },
  fuera_de_lista_blanca: {
    es: "La dirección no está en la lista blanca de fuentes del marco: no se leyó.",
    en: "The address is not in the framework's source whitelist: it was not read.",
  },
  sin_lectura: {
    es: "No hay una lectura guardada de esta página con la que comprobarla.",
    en: "There is no saved reading of this page to check it against.",
  },
  pagina_distinta: {
    es: "La lectura guardada no es la que la propuesta cita: su huella no coincide.",
    en: "The saved reading is not the one the proposal cites: its fingerprint does not match.",
  },
  url_no_consultada: {
    es: "La dirección no está entre las que el investigador leyó en esta corrida: no cuenta, aunque el fragmento exista en otra lectura.",
    en: "The address is not among those the researcher read in this run: it does not count, even if the fragment exists in another reading.",
  },
};

const MOTIVOS_DE_NO_ACCESO: Record<string, Bilingue> = {
  http_401: {
    es: "Respondió 401: pide credenciales.",
    en: "It answered 401: it asks for credentials.",
  },
  http_403: {
    es: "Respondió 403: el sitio no deja leerlo desde aquí.",
    en: "It answered 403: the site does not allow reading it from here.",
  },
  http_429: {
    es: "Respondió 429: demasiadas peticiones.",
    en: "It answered 429: too many requests.",
  },
  http_otro: {
    es: "Respondió con un código o un tipo de contenido inesperados.",
    en: "It answered with an unexpected code or content type.",
  },
  requiere_sesion: {
    es: "Pide iniciar sesión.",
    en: "It asks you to sign in.",
  },
  sin_red: { es: "No hubo conexión.", en: "There was no connection." },
};

const SIN_VEREDICTO: Record<string, Bilingue> = {
  sin_conteos_verificados: {
    es: "Ningún conteo de este texto tiene una cita verificada: no hay veredicto.",
    en: "No count in this text has a verified quote: there is no verdict.",
  },
  faltan_conteos: {
    es: "Faltan conteos para que la regla decida.",
    en: "Counts are missing for the rule to decide.",
  },
  regla_desconocida: {
    es: "La regla de la prueba no se conoce.",
    en: "The test's rule is not known.",
  },
  falta_k: {
    es: "A la regla le falta el número de repeticiones.",
    en: "The rule is missing its number of repetitions.",
  },
  falta_metrica: {
    es: "A la regla le falta la métrica.",
    en: "The rule is missing its metric.",
  },
  declarado_por_persona: {
    es: "Este veredicto lo declara una persona, no se calcula.",
    en: "A person declares this verdict; it is not computed.",
  },
  prueba_fuera_del_plan: {
    es: "La prueba no está en el plan de este activo: no hay veredicto.",
    en: "The test is not in this asset's plan: there is no verdict.",
  },
};

/** Qué pasa al aprobar cada tipo: se dice con palabras, antes de que nada se escriba. */
const AL_APROBAR: Record<FilaDePropuesta["tipo"], Bilingue> = {
  sobre: {
    es: "Aprobada. Pasa a la carga de evidencia como sobre por confirmar: todavía no cuenta.",
    en: "Approved. It moves to evidence intake as an envelope to confirm: it does not count yet.",
  },
  prueba_nueva: {
    es: "Aprobada. Queda «aprobada» en datos/pruebas/ y entra al catálogo en la próxima instantánea; tu firma y la fecha quedan en el libro de decisiones.",
    en: "Approved. It becomes “approved” in datos/pruebas/ and enters the catalog in the next snapshot; your signature and the date stay in the decision ledger.",
  },
  version_de_marco: {
    es: "Aprobada. Queda registrada tu decisión; el cambio de versión y su mapa de equivalencias lo haces tú en datos/marcos/.",
    en: "Approved. Your decision is recorded; you make the version change and its equivalence map in datos/marcos/.",
  },
  retiro: {
    es: "Aprobada. Queda registrada tu decisión; retirar la prueba lo haces tú en datos/pruebas/.",
    en: "Approved. Your decision is recorded; you retire the test in datos/pruebas/.",
  },
  herramienta: {
    es: "Aprobada. Queda registrada tu decisión; el cambio de la herramienta lo haces tú en datos/herramientas/.",
    en: "Approved. Your decision is recorded; you make the tool change in datos/herramientas/.",
  },
};

const motivoDe = (m: MundoDePropuestas, motivo: MotivoDePausa): Etiqueta =>
  etiquetaDePropuesta(m.etiquetas, `motivo_${motivo}`);

function fuentesDe(
  p: PropuestaSellada,
  m: MundoDePropuestas,
  aportes: readonly Aporte[],
): FuenteVista[] {
  if (p.tipo === "sobre") return [];
  return p.fuentes.map((f, i): FuenteVista => {
    const estado = p.verificacion.fuentes[i]?.estado ?? "sin_lectura";
    const aporte = aportes.find(
      (a) => a.url === f.url && a.huella_de_la_pagina === f.huella_de_la_pagina,
    );
    return {
      nombre: f.nombre,
      leida: f.leida,
      aportada:
        aporte === undefined
          ? null
          : {
              por: aporte.por,
              fecha: aporte.fecha,
              caracteres: aporte.caracteres,
            },
      donde: f.donde ?? null,
      url: f.url,
      etiqueta: etiquetaDePropuesta(m.etiquetas, `fuente_${estado}`),
      verificada: estado === "verificada",
      detalle:
        estado === "verificada" ? null : (DETALLE_DE_FUENTE[estado] ?? null),
    };
  });
}

function sobreDe(
  p: Extract<PropuestaSellada, { tipo: "sobre" }>,
  m: MundoDePropuestas,
): SobreVista {
  const c = m.instantanea.catalogo;
  const activo = m.activos.activos.find((a) => a.activo.id === p.activo);
  const candidatas = p.candidatas.map((cand): CandidataVista => {
    const prueba = c.pruebas.find((x) => x.id === cand.prueba);
    const v = cand.veredicto_sugerido;
    const campos = new Set(v?.campos ?? []);
    const resultado = cand.entrada.resultado;
    return {
      prueba: cand.prueba,
      nombre: prueba?.nombre ?? { es: cand.prueba, en: cand.prueba },
      razon: cand.razon ?? null,
      veredicto:
        v === null
          ? null
          : {
              etiqueta: etiqueta(c, "veredicto", v.veredicto),
              regla: v.regla,
              evaluadas: campos.has("resultado.evaluadas")
                ? resultado.evaluadas
                : null,
              fallidas: campos.has("resultado.fallidas")
                ? resultado.fallidas
                : null,
              decide: prueba?.criterio_de_veredicto.descripcion ?? null,
            },
      sinVeredicto:
        cand.sin_veredicto === null
          ? null
          : (SIN_VEREDICTO[cand.sin_veredicto] ?? null),
      enElPlan: cand.verificacion.en_el_plan,
      citas: {
        verificadas: cand.verificacion.citas.filter(
          (x) => x.estado === "verificada",
        ).length,
        total: cand.verificacion.citas.length,
        detalle: cand.verificacion.citas.map((x, i) => ({
          campo: x.campo,
          etiqueta: etiquetaDePropuesta(m.etiquetas, `cita_${x.estado}`),
          verificada: x.estado === "verificada",
          texto: cand.citas[i]?.texto ?? "",
        })),
      },
    };
  });
  return {
    activo: {
      id: p.activo,
      nombre: activo?.activo.nombre ?? { es: p.activo, en: p.activo },
      plan: activo?.plan?.huella ?? null,
      ruta: `/activos/${p.activo}/plan`,
    },
    asociacion: p.asociacion,
    candidatas,
    citas: (() => {
      const verificadas = candidatas.reduce(
        (n, x) => n + x.citas.verificadas,
        0,
      );
      const total = candidatas.reduce((n, x) => n + x.citas.total, 0);
      return {
        verificadas,
        total,
        etiqueta: etiquetaDePropuesta(
          m.etiquetas,
          verificadas === total ? "cita_verificada" : "cita_no_literal",
        ),
      };
    })(),
    texto: p.texto,
  };
}

function cambioDe(p: PropuestaSellada): Bilingue | null {
  if (p.tipo === "version_de_marco")
    return {
      es: `El marco ${p.marco_id} pasa a la versión ${p.version_nueva} (publicada el ${p.fecha_version}); el mapa trae ${p.equivalencias.length} entradas.`,
      en: `Framework ${p.marco_id} moves to version ${p.version_nueva} (published ${p.fecha_version}); the map has ${p.equivalencias.length} entries.`,
    };
  if (p.tipo === "retiro")
    return {
      es: `Retira la prueba ${p.prueba_id}.`,
      en: `Retires test ${p.prueba_id}.`,
    };
  if (p.tipo === "herramienta")
    return {
      es: `${p.herramienta_id}: ${p.cambio.campo} de ${p.cambio.de ?? "—"} a ${p.cambio.a} (${p.cambio.fecha}).`,
      en: `${p.herramienta_id}: ${p.cambio.campo} from ${p.cambio.de ?? "—"} to ${p.cambio.a} (${p.cambio.fecha}).`,
    };
  return null;
}

/** Las decisiones que ofrece una propuesta por decidir. Lo marcado por el filtro o por una orden sembrada se aprueba «tras revisar». */
function decisionesDe(
  p: PropuestaSellada,
  porDecidir: boolean,
): DecisionDeBandeja[] {
  if (!porDecidir) return [];
  if (p.tipo === "sobre" && p.asociacion === "mezcla")
    return ["separar", "rechazar"];
  const marcada =
    p.contenido === "marcada_para_revision" || p.senales.marca_instruccion;
  return [marcada ? "aprobar_tras_revisar" : "aprobar", "rechazar"];
}

/** Lo que la decisión ya provocó, tal como lo escribió el libro: el sobre, la prueba, o la corrección del veredicto. */
function efectoDe(
  p: PropuestaSellada,
  d: Decision,
  m: MundoDePropuestas,
): EfectoVista | null {
  const corregido =
    senalesConDecision(p.senales, d).veredicto_corregido_por_persona === true;
  const e = d.efecto;
  if (e === undefined && !corregido) return null;
  const c = m.instantanea.catalogo;
  return {
    sobre: e?.sobre ?? null,
    prueba: e?.prueba ?? null,
    corregido:
      corregido && e?.veredicto_sugerido && e.veredicto_resultante
        ? {
            de: etiqueta(c, "veredicto", e.veredicto_sugerido),
            a: etiqueta(c, "veredicto", e.veredicto_resultante),
          }
        : null,
  };
}

function filaDe(
  fila: MundoDePropuestas["filas"][number],
  m: MundoDePropuestas,
): FilaDePropuesta {
  const p = fila.propuesta;
  const padre = p.id.split(".")[0] ?? p.id;
  const corrida = m.corridas.find((c) =>
    c.corrida.propuestas.some((x) => x.id === padre),
  );
  const activoDemo =
    p.tipo === "sobre" &&
    m.activos.activos.find((a) => a.activo.id === p.activo)?.activo.origen ===
      "demo";
  const escribeDatos = p.tipo === "sobre" || p.tipo === "prueba_nueva";
  const d = fila.decision;
  const sobre = p.tipo === "sobre" ? sobreDe(p, m) : null;
  return {
    id: p.id,
    padre,
    origen: p.origen,
    origenNombre: ORIGENES[p.origen],
    tipo: p.tipo,
    tipoNombre: TIPOS[p.tipo],
    fecha: p.fecha,
    corrida: corrida?.corrida.id ?? "",
    titulo: p.titulo,
    resumen: p.resumen,
    estado: fila.estado,
    etiquetaDeEstado: etiquetaDePropuesta(m.etiquetas, fila.estado),
    decidida:
      d === null
        ? null
        : {
            por: d.por,
            fecha: d.fecha,
            motivo: d.motivo ?? null,
            efecto: efectoDe(p, d, m),
          },
    fuentes: fuentesDe(p, m, corrida?.aportes ?? []),
    marcaDeContenido: p.contenido === "marcada_para_revision",
    marcaDeInstruccion: p.senales.marca_instruccion,
    marcas: {
      contenido: p.marcas_de_contenido.map((x) => ({ ...x })),
      instruccion: p.marcas_de_instruccion.map((x) => ({ ...x })),
    },
    motivos: (p.pausa?.motivos ?? [])
      // Estos dos tienen su propio aviso en el panel: no se repiten como motivo.
      .filter(
        (x) =>
          x.motivo !== "contenido_marcado" &&
          x.motivo !== "instruccion_marcada",
      )
      .map((x): MotivoVista => ({
        // La versión fuera de la cita entra como `cita_no_verificada` con su señal, pero dice su propia razón (todas las fuentes pueden
        // estar verificadas y la versión nueva no estar en ningún pasaje).
        etiqueta:
          x.senal === SENAL_VERSION_EN_LA_CITA
            ? etiquetaDePropuesta(
                m.etiquetas,
                "motivo_version_fuera_de_la_cita",
              )
            : motivoDe(m, x.motivo),
        umbral: x.umbral,
      })),
    sobre,
    cambio: cambioDe(p),
    separable: p.tipo === "sobre" && p.asociacion === "mezcla",
    decisiones: decisionesDe(p, fila.estado === "por_decidir"),
    pideBanderaDeDemo:
      escribeDatos && (corrida?.lugar === "demo" || activoDemo === true),
    alAprobar: AL_APROBAR[p.tipo],
    pideConteoAMano:
      p.tipo === "sobre" &&
      p.candidatas.some((c) => c.veredicto_sugerido === null),
  };
}

/** Lo que costó la corrida: las señales de ejecución son las mismas en todas sus propuestas (se miden una vez por corrida). */
function ejecucionDe(
  propuestas: readonly PropuestaSellada[],
): CorridaVista["ejecucion"] {
  const s = propuestas[0]?.senales;
  if (s === undefined) return null;
  if (s.latencia_total_s === null && s.tokens === null) return null;
  return {
    latenciaS: s.latencia_total_s,
    tokens: s.tokens,
    nodos: s.nodos_visitados,
  };
}

function corridaDe(
  c: MundoDePropuestas["corridas"][number],
  m: MundoDePropuestas,
): CorridaVista {
  const k = c.corrida;
  const criterios = evaluarCriterios(
    k.propuestas,
    m.umbrales.antiguedad_marco_dias,
  );
  return {
    id: k.id,
    agente: k.agente,
    fecha: k.fecha,
    alcance: k.alcance,
    modelo: k.modelo,
    reintentos: k.reintentos,
    consultadas: k.consulta.consultadas,
    noAccesibles: k.consulta.no_accesibles.map((f) => ({
      nombre: f.nombre,
      razon: MOTIVOS_DE_NO_ACCESO[f.motivo] ?? MOTIVOS_DE_NO_ACCESO.sin_red!,
    })),
    contradicciones: k.contradicciones,
    propuestas: k.propuestas.length,
    ejecucion: ejecucionDe(k.propuestas),
    huella: k.huella,
    criterios: {
      cumplen: criterios.filter((x) => x.cumple).length,
      total: criterios.length,
    },
    lugar: c.lugar,
  };
}

export function construirVistaDePropuestas(
  m: MundoDePropuestas,
): VistaDePropuestas {
  const filas = m.filas.map((f) => filaDe(f, m));
  const sinVerificar = filas.filter(
    (f) => f.estado === "por_decidir" && f.fuentes.some((x) => !x.verificada),
  ).length;
  const marcadas = filas.filter(
    (f) => f.estado === "por_decidir" && f.marcaDeContenido,
  ).length;
  const corridas = m.corridas
    .map((c) => corridaDe(c, m))
    // La más reciente primero: por fecha y, el mismo día, por nombre (el prefijo INV/EXT no manda sobre la fecha).
    .sort(
      (a, b) =>
        (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0) ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );
  return {
    instantanea: m.nombre,
    consulta: m.consulta,
    cifras: { porDecidir: m.porDecidir, sinVerificar, marcadas },
    etiquetasDeMarcas: {
      contenido: etiquetaDePropuesta(m.etiquetas, "marcada_por_el_filtro"),
      instruccion: etiquetaDePropuesta(m.etiquetas, "instruccion_sembrada"),
    },
    etiquetasDeCifras: {
      sinVerificar: etiquetaDePropuesta(
        m.etiquetas,
        "cifra_fuente_sin_verificar",
      ),
      marcadas: etiquetaDePropuesta(m.etiquetas, "cifra_marcada_por_el_filtro"),
    },
    total: filas.length,
    origenes: [
      { valor: "", nombre: { es: "Todas", en: "All" } },
      { valor: "investigador", nombre: ORIGENES.investigador },
      { valor: "extractor", nombre: ORIGENES.extractor },
    ],
    filas,
    corridas,
    ilegibles: m.problemasDeCarga.map((p) => ({
      ruta: p.ruta,
      detalle: p.detalle,
      etiqueta: etiquetaDePropuesta(m.etiquetas, "propuesta_ilegible"),
    })),
    vacio: filas.length === 0,
    etiquetaDeVacio: etiquetaDePropuesta(m.etiquetas, "bandeja_vacia"),
  };
}
