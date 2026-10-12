// Las cinco vistas de la brecha (tablero, brecha, lista de controles, un control e informe), calculadas desde UN solo objeto:
// `MundoDeBrecha`. Función pura: ni reloj, ni archivos, ni azar. Nada se recalcula aquí: las cifras, los estados de control y los
// plazos salen de `armarBrecha` y de `situacionDeHallazgo` (la misma función que usa la página del hallazgo). Esta capa los
// lee, los nombra con el vocabulario de estados y con `datos/brecha/etiquetas.json`, y los ordena. Como todas las pantallas
// leen la misma brecha, dicen las mismas cifras en cada fecha (design-system § 9).
import {
  edadDe,
  type Brecha,
  type ControlDeBrecha,
  type FilaDeBrecha,
} from "../../engine/brecha/calcular.ts";
import { ESTADOS_DE_CONTROL } from "../../engine/brecha/esquemas.ts";
import { estadoDeVigencia } from "../../engine/catalogo/semaforo.ts";
import { diasEntre } from "../../engine/fecha.ts";
import { ESTADOS_DE_HALLAZGO } from "../../engine/hallazgos/esquemas.ts";
import {
  situacionDeHallazgo,
  type SituacionDeHallazgo,
} from "../../engine/hallazgos/situacion.ts";
import { comparar } from "../../engine/planificador/orden.ts";
import { etiqueta, porId } from "../catalogo/vista.ts";
import {
  construirCadena,
  conteoDeSobre,
  vistaDePlazo,
  vistaDeRevision,
} from "../evidencia/vista.ts";
import { etiquetaDeBrecha } from "./etiquetas.ts";
import type { MundoDeBrecha } from "./mundo.ts";
import {
  EVIDENCIA_ORGANIZADA,
  dias,
  fraseDeControl,
  plural,
  textoDeDesviacion,
} from "./textos.ts";
import type {
  AccionDeControl,
  Bilingue,
  Cifra,
  ComprobacionDeInstrumento,
  EnlaceAHallazgo,
  Etiqueta,
  EvidenciaVista,
  EquivalenteVista,
  FilaDeActivoDeTablero,
  FilaDeAlerta,
  FilaDeControlDeInforme,
  FilaDeControlDeLista,
  FilaDeEsperadoObtenido,
  FilaDeHallazgoDeInforme,
  FilaDePruebaDeControl,
  PruebaSinControlDeLista,
  VistaDeBrecha,
  VistaDeControl,
  VistaDeControles,
  VistaDeInforme,
  VistaDeTablero,
} from "./tipos.ts";

const NORMA = "ISO/IEC 42001";
const VEREDICTOS_DEL_FILTRO = ["superada", "fallida", "no_ejecutada"] as const;
/** El orden en que el informe cuenta los hallazgos por estado. */
const ORDEN_DE_ESTADO = [
  "abierto",
  "corregido",
  "re_probado",
  "aceptado_con_riesgo",
  "cerrado",
  "cerrado_por_eliminacion",
  "no_reproducible",
] as const satisfies readonly (typeof ESTADOS_DE_HALLAZGO)[number][];

// ── Lo que todas las vistas comparten ───────────────────────────────────────────────────────────

function contexto(m: MundoDeBrecha) {
  const c = m.instantanea.catalogo;
  const b = m.brecha;
  const et = (vocabulario: string, id: string): Etiqueta =>
    etiqueta(c, vocabulario, id);
  const prop = (id: Parameters<typeof etiquetaDeBrecha>[1]): Etiqueta =>
    etiquetaDeBrecha(m.etiquetas, id);

  const datos = {
    escala: m.evidencia.escala,
    plazos: m.evidencia.plazos,
    fecha: m.consulta,
  };
  const situaciones = new Map<string, SituacionDeHallazgo>();
  for (const h of m.evidencia.hallazgos) {
    const r = situacionDeHallazgo(h, m.evidencia.libro, datos);
    if (r.ok) situaciones.set(h.id, r.situacion);
  }
  const sit = (id: string): SituacionDeHallazgo => {
    const s = situaciones.get(id);
    if (s === undefined)
      throw new Error(`${id}: no se pudo situar / could not be placed`);
    return s;
  };
  const hallazgo = (id: string) => {
    const h = m.evidencia.hallazgos.find((x) => x.id === id);
    if (h === undefined)
      throw new Error(
        `no hay un hallazgo «${id}» / there is no finding “${id}”`,
      );
    return h;
  };
  const libro = new Map(m.evidencia.libro.map((s) => [s.id, s] as const));
  const sobre = (id: string) => {
    const s = libro.get(id);
    if (s === undefined)
      throw new Error(`no hay un sobre «${id}» / there is no envelope “${id}”`);
    return s;
  };
  const activoCargado = (id: string) => {
    const a = m.activos.activos.find((x) => x.activo.id === id);
    if (a === undefined)
      throw new Error(
        `el activo «${id}» no está registrado / is not registered`,
      );
    return a;
  };
  const prueba = (id: string) => porId(c.pruebas, id);
  const familia = (id: string) => porId(c.familias, id);
  const capa = c.controles.find((x) => x.capa === "por_defecto");
  if (capa === undefined)
    throw new Error(
      "la instantánea no trae la capa de controles por defecto / the snapshot lacks the default control layer",
    );
  const controles = capa.areas.flatMap((area) =>
    area.controles.map((x) => ({ ...x, area })),
  );
  const control = (id: string) => {
    const x = controles.find((k) => k.id === id);
    if (x === undefined)
      throw new Error(
        `el control «${id}» no está en la capa / is not in the layer`,
      );
    return x;
  };

  const enlace = (id: string): EnlaceAHallazgo => {
    const s = sit(id);
    return {
      id,
      titulo: hallazgo(id).titulo,
      severidad: et("severidad", s.severidad.nivel),
      nivel: s.severidad.nivel,
      estado: et("estado_de_hallazgo", s.evaluacion.estado),
      estadoId: s.evaluacion.estado,
    };
  };
  const evidencia = (fecha: string): EvidenciaVista => {
    const e = edadDe(fecha, m.consulta, m.umbrales.evidencia_antigua);
    return {
      fecha,
      dias: e.dias,
      estado: e.estado,
      marca: e.estado === "antigua" ? prop("antigua") : null,
    };
  };
  const fila = (activo: string, p: string): FilaDeBrecha =>
    b.filas.find((f) => f.activo === activo && f.prueba === p)!;
  const nombreDeActivo = (id: string) => activoCargado(id).activo.nombre;

  return {
    c,
    b,
    et,
    prop,
    sit,
    hallazgo,
    sobre,
    activoCargado,
    prueba,
    familia,
    capa,
    controles,
    control,
    enlace,
    evidencia,
    fila,
    nombreDeActivo,
    base: {
      instantanea: m.nombre,
      consulta: m.consulta,
      vacio: prop("vacio"),
    },
    veredictos: {
      superada: et("veredicto", "superada"),
      fallida: et("veredicto", "fallida"),
      no_ejecutada: et("veredicto", "no_ejecutada"),
    },
    plazoDe: (id: string) => vistaDePlazo(sit(id), m.evidencia.etiquetas),
    revisionDe: (id: string) => vistaDeRevision(c, sit(id)),
  };
}
type Ctx = ReturnType<typeof contexto>;

/** Una cifra que es un estado: su marca y su nombre salen del vocabulario. */
const cifraDeEstado = (clave: string, n: number, marca: Etiqueta): Cifra => ({
  clave,
  valor: String(n),
  texto: marca.nombre,
  marca,
});

/** Las filas de alerta, lo más urgente primero: plazos vencidos, riesgos que tocan revisión, fichas vencidas, evidencia antigua. */
function alertasDe(
  m: MundoDeBrecha,
  k: Ctx,
  conPlazos: boolean,
): FilaDeAlerta[] {
  const filas: FilaDeAlerta[] = [];
  if (conPlazos)
    for (const id of k.b.vencidos)
      filas.push({
        clase: "plazo",
        id,
        tipo: tipoDePlazo(m),
        hallazgo: k.enlace(id),
        plazo: k.plazoDe(id),
      });
  for (const id of k.b.alertas.revision) {
    const revision = k.revisionDe(id);
    if (revision === null) continue;
    filas.push({
      clase: "revision",
      id,
      tipo: k.et("revision_de_riesgo", "toca_revisar"),
      hallazgo: k.enlace(id),
      revision,
    });
  }
  for (const { activo, prueba } of k.b.alertas.fichasVencidas) {
    const p = k.prueba(prueba);
    const diasDeFicha = diasEntre(p.fecha_verificacion, m.consulta);
    filas.push({
      clase: "catalogo",
      id: prueba,
      tipo: k.prop("ficha_vencida"),
      prueba: { id: prueba, nombre: p.nombre },
      activo: k.nombreDeActivo(activo),
      ficha: {
        desde: p.fecha_verificacion,
        dias: diasDeFicha,
        etiqueta: k.et(
          "vigencia",
          estadoDeVigencia(diasDeFicha, k.c.umbrales.vigencia),
        ),
      },
    });
  }
  for (const { activo, prueba } of k.b.alertas.antiguas) {
    const f = k.fila(activo, prueba);
    filas.push({
      clase: "antigua",
      id: prueba,
      tipo: k.prop("evidencia_antigua_alerta"),
      prueba: { id: prueba, nombre: k.prueba(prueba).nombre },
      activo: k.nombreDeActivo(activo),
      evidencia: k.evidencia(f.fecha!),
    });
  }
  return filas;
}

/** «Plazo vencido»: la etiqueta de la página del hallazgo, la misma en todas partes. */
function tipoDePlazo(m: MundoDeBrecha): Etiqueta {
  const e = m.evidencia.etiquetas.etiquetas.find(
    (x) => x.id === "aviso_plazo_vencido",
  );
  if (e === undefined)
    throw new Error(
      "datos/hallazgos/etiquetas.json no tiene «aviso_plazo_vencido» / does not have it",
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

const filaDeEsperado = (
  m: MundoDeBrecha,
  k: Ctx,
  f: FilaDeBrecha,
): FilaDeEsperadoObtenido => {
  const p = k.prueba(f.prueba);
  const veredictoId = f.veredicto ?? "no_ejecutada";
  const s = f.sobre === null ? null : k.sobre(f.sobre);
  const idPropuesto = f.propuestos[0];
  const propuesto = idPropuesto === undefined ? null : k.sobre(idPropuesto);
  return {
    prueba: { id: p.id, nombre: p.nombre },
    activo: { id: f.activo, nombre: k.nombreDeActivo(f.activo) },
    familia: { id: f.familia, nombre: k.familia(f.familia).nombre },
    esperado: p.resultado_esperado.descripcion,
    veredicto: k.et("veredicto", veredictoId),
    veredictoId,
    obtenido: {
      sobre: s === null ? null : s.id,
      evidencia: s === null ? null : k.evidencia(s.fecha),
      conteo: s === null ? null : conteoDeSobre(s),
      propuesto:
        propuesto === null
          ? null
          : {
              sobre: propuesto.id,
              lote:
                m.evidencia.lotes.find((l) =>
                  l.sobres.some((x) => x.id === propuesto.id),
                )?.id ?? null,
              sugiere: k.et("veredicto", propuesto.veredicto).nombre,
            },
    },
    desviacion: textoDeDesviacion(f.desviacion),
    hallazgo: f.hallazgo === null ? null : k.enlace(f.hallazgo),
  };
};

const comprobaciones = (
  m: MundoDeBrecha,
  k: Ctx,
): ComprobacionDeInstrumento[] =>
  m.instrumento.map((c) => ({
    requisito: c.requisito,
    nombre:
      c.requisito === "RF-10.3"
        ? { es: "Cierres prohibidos", en: "Forbidden closures" }
        : {
            es: "«No detectado» no es verificado",
            en: "“Not detected” is not verified",
          },
    sembradas: c.sembradas,
    obtenidas: c.obtenidas,
    pasa: c.obtenidas === c.sembradas,
    estado: k.prop(
      c.obtenidas === c.sembradas ? "comprobacion_verde" : "comprobacion_roja",
    ),
  }));

// ── Tablero ─────────────────────────────────────────────────────────────────────────────────────

export function construirVistaDeTablero(m: MundoDeBrecha): VistaDeTablero {
  const k = contexto(m);
  const { b } = k;
  const pideTrabajo = b.hallazgos.filter((h) => h.pideTrabajo);
  const lotesPorConfirmar = m.evidencia.lotes.filter(
    (l) => l.confirmacion === null,
  );
  const lotes: FilaDeAlerta[] = lotesPorConfirmar.map((l) => {
    const herramienta = k.c.herramientas.find((h) => h.id === l.herramienta.id);
    return {
      clase: "lote",
      id: l.id,
      tipo: k.prop("por_confirmar"),
      sobres: l.sobres.length,
      herramienta:
        herramienta === undefined ? l.herramienta.id : herramienta.nombre,
      fallidas: l.sobres.filter((x) => k.sobre(x.id).veredicto === "fallida")
        .length,
    };
  });
  const urgentes = alertasDe(m, k, true);
  const comp = comprobaciones(m, k);
  const verdes = comp.filter((x) => x.pasa).length;
  const verde = verdes === comp.length;

  const vigencias = k.c.pruebas.map((p) =>
    estadoDeVigencia(
      diasEntre(p.fecha_verificacion, m.consulta),
      k.c.umbrales.vigencia,
    ),
  );
  const nivelesDeSeveridad =
    k.c.estados.find((v) => v.id === "severidad")?.estados.map((e) => e.id) ??
    [];

  return {
    ...k.base,
    cifras: [
      {
        clave: "sin_cerrar",
        valor: String(pideTrabajo.length),
        texto: { es: "hallazgos sin cerrar", en: "open findings" },
        marca: null,
      },
      {
        clave: "vencidos",
        valor: String(b.vencidos.length),
        texto: { es: "fuera de plazo", en: "past their deadline" },
        marca: null,
      },
      {
        clave: "por_confirmar",
        valor: String(b.porConfirmar.sobres),
        texto: { es: "sobres por confirmar", en: "envelopes to confirm" },
        marca: null,
      },
      {
        clave: "por_decidir",
        valor: "0",
        texto: { es: "propuestas por decidir", en: "proposals to decide" },
        marca: null,
      },
    ],
    validacion: {
      verde,
      sello: k.prop(verde ? "instrumento_verde" : "instrumento_rojo"),
      verdes,
      total: comp.length,
      comprobaciones: comp,
    },
    atencion: [
      ...urgentes.filter((f) => f.clase === "plazo"),
      ...lotes,
      ...urgentes.filter((f) => f.clase !== "plazo"),
    ],
    bandeja: k.prop("por_decidir"),
    activos: b.porActivo.map(({ activo, totales }): FilaDeActivoDeTablero => {
      const a = k.activoCargado(activo);
      return {
        id: activo,
        nombre: a.activo.nombre,
        familias: a.activo.familias.map((f) => k.familia(f).nombre),
        totales,
        hallazgos: pideTrabajo
          .filter((h) => h.activo === activo)
          .map((h) => k.enlace(h.id)),
        estado:
          a.plan === null
            ? k.prop("sin_plan")
            : k.et("estado_de_activo", "con_plan"),
      };
    }),
    severidades: nivelesDeSeveridad.map((id) => ({
      id,
      etiqueta: k.et("severidad", id),
      n: pideTrabajo.filter((h) => h.severidad === id).length,
    })),
    abiertos: pideTrabajo.map((h) => ({
      hallazgo: k.enlace(h.id),
      plazo: k.plazoDe(h.id),
    })),
    aceptados: b.aceptados.length,
    controles: ESTADOS_DE_CONTROL.map((id) => ({
      id,
      etiqueta: k.et("estado_de_control", id),
      n: b.controles.filter((c) => c.estado === id).length,
    })),
    catalogo: {
      total: k.c.pruebas.length,
      filas: [
        ...(["vencido", "por_revisar", "vigente"] as const).map((id) => ({
          etiqueta: k.et("vigencia", id),
          n: vigencias.filter((v) => v === id).length,
        })),
        {
          etiqueta: k.prop("marcadas_para_revision"),
          n: m.instantanea.pendientes_de_revision.filter(
            (p) => p.motivo === "marcada_para_revision",
          ).length,
        },
      ],
    },
  };
}

// ── Brecha ──────────────────────────────────────────────────────────────────────────────────────

export function construirVistaDeBrecha(m: MundoDeBrecha): VistaDeBrecha {
  const k = contexto(m);
  const { b } = k;
  const r = b.resumen;
  const conPlan = b.porActivo.filter((x) => x.totales !== null);
  return {
    ...k.base,
    veredictos: k.veredictos,
    activosConPlan: conPlan.length,
    activosTotal: b.porActivo.length,
    cifras: [
      {
        clave: "ejecutadas",
        valor: `${r.ejecutadas} / ${r.planeadas}`,
        texto: { es: "ejecutadas de las planeadas", en: "run out of planned" },
        marca: null,
      },
      {
        ...cifraDeEstado(
          "superadas",
          r.superadas,
          k.et("veredicto", "superada"),
        ),
        texto: { es: "superadas", en: "passed" },
      },
      {
        ...cifraDeEstado("fallidas", r.fallidas, k.et("veredicto", "fallida")),
        texto: { es: "fallidas", en: "failed" },
      },
      {
        ...cifraDeEstado(
          "no_ejecutadas",
          r.no_ejecutadas,
          k.et("veredicto", "no_ejecutada"),
        ),
        texto: { es: "sin ejecutar", en: "not run" },
      },
    ],
    porConfirmar: { ...b.porConfirmar, sello: k.prop("evidencia_esperando") },
    porActivo: b.porActivo.map(({ activo, totales }) => {
      const a = k.activoCargado(activo);
      return {
        id: activo,
        nombre: a.activo.nombre,
        plan:
          a.plan === null
            ? null
            : { huella: a.plan.huella, fecha: a.plan.fecha_emision },
        totales,
        estado:
          a.plan === null
            ? k.prop("sin_plan")
            : k.et("estado_de_activo", "con_plan"),
      };
    }),
    porFamilia: b.porFamilia.map(({ familia, totales }) => ({
      id: familia,
      nombre: k.familia(familia).nombre,
      totales,
    })),
    porControl: b.controles.map((c) => ({
      id: c.id,
      nombre: k.control(c.id).nombre,
      totales: c.totales,
      estado: k.et("estado_de_control", c.estado),
      estadoId: c.estado,
    })),
    sinControl: b.sinControl.map((x) => x.prueba),
    filas: b.filas.map((f) => filaDeEsperado(m, k, f)),
    filtros: {
      activos: conPlan.map(({ activo }) => ({
        id: activo,
        nombre: k.nombreDeActivo(activo),
      })),
      veredictos: VEREDICTOS_DEL_FILTRO.map((id) => ({
        id,
        etiqueta: k.et("veredicto", id),
      })),
    },
    alertas: alertasDe(m, k, true),
    marcos: k.prop("sin_registro"),
  };
}

// ── Vista por control: la lista ─────────────────────────────────────────────────────────────────

export function construirVistaDeControles(m: MundoDeBrecha): VistaDeControles {
  const k = contexto(m);
  const { b } = k;
  return {
    ...k.base,
    veredictos: k.veredictos,
    norma: NORMA,
    capa: k.capa.nombre,
    cifras: (
      [
        "con_evidencia_vigente",
        "evidencia_antigua",
        "con_fallas",
        "sin_evidencia",
      ] as const
    ).map((id) =>
      cifraDeEstado(
        id,
        b.controles.filter((c) => c.estado === id).length,
        k.et("estado_de_control", id),
      ),
    ),
    controles: b.controles.map((c): FilaDeControlDeLista => {
      const x = k.control(c.id);
      return {
        id: c.id,
        nombre: x.nombre,
        area: { id: x.area.id, nombre: x.area.nombre },
        totales: c.totales,
        ultima: c.ultima === null ? null : k.evidencia(c.ultima),
        fallas: c.fallas.map((id) => k.enlace(id)),
        estado: k.et("estado_de_control", c.estado),
        estadoId: c.estado,
      };
    }),
    sinControl: b.sinControl.map(
      ({ activo, prueba }): PruebaSinControlDeLista => {
        const f = k.fila(activo, prueba);
        return {
          id: prueba,
          nombre: k.prueba(prueba).nombre,
          activo: k.nombreDeActivo(activo),
          familia: k.familia(f.familia).nombre,
          veredicto: k.et("veredicto", f.veredicto ?? "no_ejecutada"),
          veredictoId: f.veredicto ?? "no_ejecutada",
        };
      },
    ),
  };
}

// ── Vista por control: un control ───────────────────────────────────────────────────────────────

export function idsDeControles(m: MundoDeBrecha): string[] {
  return m.brecha.controles.map((c) => c.id);
}

function accionDe(
  c: ControlDeBrecha,
  filas: FilaDeBrecha[],
  k: Ctx,
): AccionDeControl {
  if (c.estado === "con_fallas") {
    const h = c.fallas.find(
      (id) => k.sit(id).evaluacion.estado !== "aceptado_con_riesgo",
    );
    return h === undefined
      ? { tipo: "aceptado" }
      : { tipo: "hallazgo", hallazgo: h };
  }
  if (c.estado === "evidencia_antigua")
    return { tipo: "plan", activo: filas[0]!.activo };
  if (c.totales.planeadas === 0) return { tipo: "catalogo" };
  return {
    tipo: "carga",
    sinResultado: filas.filter((f) => f.estado === "sin_evidencia").length,
    total: filas.length,
  };
}

export function construirVistaDeControl(
  id: string,
  m: MundoDeBrecha,
): VistaDeControl {
  const k = contexto(m);
  const { b } = k;
  const c = b.controles.find((x) => x.id === id);
  if (c === undefined)
    throw new Error(
      `no hay un control aplicable «${id}» / there is no applicable control “${id}”`,
    );
  const x = k.control(id);
  const filas = c.filas.map((f) => k.fila(f.activo, f.prueba));
  const cuenta = (e: string) => filas.filter((f) => f.estado === e).length;
  const atrasoMaximo = Math.max(
    0,
    ...c.fallas.map((h) => k.sit(h).plazo.atraso),
  );

  const delControl = (h: string) => ({
    enlace: k.enlace(h),
    plazo: k.sit(h).plazo.estado === "no_corre" ? null : k.plazoDe(h),
  });
  const pruebas = filas.map((f): FilaDePruebaDeControl => {
    const s = f.sobre === null ? null : k.sobre(f.sobre);
    const veredictoId = f.veredicto ?? "no_ejecutada";
    return {
      prueba: { id: f.prueba, nombre: k.prueba(f.prueba).nombre },
      activo: k.nombreDeActivo(f.activo),
      veredicto: k.et("veredicto", veredictoId),
      veredictoId,
      conteo: s === null ? null : conteoDeSobre(s),
      repruebaDe: f.repruebaDe,
      hallazgo: f.hallazgo === null ? null : delControl(f.hallazgo),
      sinPlazo:
        f.hallazgo !== null && k.sit(f.hallazgo).plazo.estado === "no_corre",
      sobre:
        s === null || s.confirmacion === null
          ? null
          : {
              id: s.id,
              evidencia: k.evidencia(s.fecha),
              huella: s.huellas.sobre,
              confirmadaPor: s.confirmacion.por,
              confirmadaEl: s.confirmacion.fecha,
            },
    };
  });

  const motivos = new Map<string, Bilingue>(
    m.evidencia.etiquetas.motivos_de_rechazo.map((x2) => [x2.id, x2.nombre]),
  );
  const cadenas = [...c.hallazgos]
    .sort(
      (a, z) =>
        Number(k.sit(z).evaluacion.cierre !== null) -
          Number(k.sit(a).evaluacion.cierre !== null) || comparar(a, z),
    )
    .map((h) => ({
      hallazgo: k.enlace(h),
      plazo: k.sit(h).plazo.estado === "no_corre" ? null : k.plazoDe(h),
      cadena: construirCadena(
        k.hallazgo(h),
        k.sit(h),
        m.evidencia.etiquetas,
        motivos,
      ),
    }));

  const equivalentes = x.controles_equivalentes.map((e): EquivalenteVista => ({
    marco: `${porId(k.c.marcos, e.marco_id).nombre} ${e.version_marco}`,
    referencia: e.referencia_en_marco,
    fuente: {
      sitio: new URL(e.fuente.url).hostname,
      consultada: e.fuente.consultada,
    },
    incompleto:
      e.cobertura === "parcial"
        ? {
            etiqueta: k.et("equivalencia", "parcial"),
            nota: e.nota_de_incompletitud ?? null,
          }
        : null,
  }));

  return {
    ...k.base,
    veredictos: k.veredictos,
    firma: k.et("confirmacion", "confirmada"),
    id,
    nombre: x.nombre,
    norma: NORMA,
    capa: k.capa.nombre,
    selector: b.controles.map((o) => ({
      id: o.id,
      estado: k.et("estado_de_control", o.estado),
      actual: o.id === id,
    })),
    cifras: (
      [
        "con_evidencia_vigente",
        "evidencia_antigua",
        "con_fallas",
        "sin_evidencia",
      ] as const
    ).map((e) => cifraDeEstado(e, cuenta(e), k.et("estado_de_control", e))),
    sello: {
      estado: k.et("estado_de_control", c.estado),
      estadoId: c.estado,
      frase: fraseDeControl({
        estado: c.estado,
        pruebas: filas.length,
        conFallas: cuenta("con_fallas"),
        sinEvidencia: cuenta("sin_evidencia"),
        atrasoMaximo,
        umbral: m.umbrales.evidencia_antigua,
      }),
    },
    pruebas,
    delCatalogo:
      filas.length > 0
        ? []
        : k.c.pruebas
            .filter((p) => p.controles.includes(id))
            .map((p) => ({ id: p.id, nombre: p.nombre })),
    cadenas,
    accion: accionDe(c, filas, k),
    propiedades: {
      area: { id: x.area.id, nombre: x.area.nombre },
      pruebasEnPlanes: c.totales.planeadas,
      conResultado: c.totales.ejecutadas,
      activos: [...new Set(filas.map((f) => f.activo))].map((a) => ({
        id: a,
        nombre: k.nombreDeActivo(a),
      })),
      ultima: c.ultima === null ? null : k.evidencia(c.ultima),
    },
    equivalentes,
  };
}

// ── Informe ─────────────────────────────────────────────────────────────────────────────────────

export function construirVistaDeInforme(m: MundoDeBrecha): VistaDeInforme {
  const k = contexto(m);
  const { b } = k;
  const r = b.resumen;
  const pideTrabajo = b.hallazgos.filter((h) => h.pideTrabajo);
  const graves = pideTrabajo.filter(
    (h) => h.severidad === "critico" || h.severidad === "alto",
  );
  const sinEvidencia = b.controles.filter((c) => c.estado === "sin_evidencia");
  const masAtrasado = b.vencidos[0] === undefined ? null : k.sit(b.vencidos[0]);

  const n = pideTrabajo.length;
  const frase: Bilingue = {
    es:
      `De ${r.planeadas} pruebas planeadas se ejecutaron ${r.ejecutadas}: ${r.superadas} superadas y ${r.fallidas} fallidas. ` +
      `Hay ${n} ${plural(n, "hallazgo", "hallazgos")} sin cerrar` +
      (masAtrasado
        ? `, y el más atrasado lleva ${masAtrasado.plazo.atraso} ${plural(masAtrasado.plazo.atraso, "día", "días")} vencido. `
        : ". ") +
      `${sinEvidencia.length} de ${b.controles.length} controles aplicables no tienen evidencia.`,
    en:
      `Of ${r.planeadas} planned tests, ${r.ejecutadas} were run: ${r.superadas} passed and ${r.fallidas} failed. ` +
      `There ${n === 1 ? "is" : "are"} ${n} open ${plural(n, "finding", "findings")}` +
      (masAtrasado
        ? `, and the most overdue is ${masAtrasado.plazo.atraso} ${plural(masAtrasado.plazo.atraso, "day", "days")} past its deadline. `
        : ". ") +
      `${sinEvidencia.length} of ${b.controles.length} applicable controls have no evidence.`,
  };
  const decidir: Bilingue[] = [
    ...b.vencidos.map((id): Bilingue => {
      const s = k.sit(id);
      const nivel = k.et("severidad", s.severidad.nivel).nombre;
      return {
        es: `${id} (${nivel.es.toLowerCase()}) lleva ${dias(s.plazo.atraso).es} vencido: corregir y re-probar, o decidir un cierre alternativo justificado.`,
        en: `${id} (${nivel.en.toLowerCase()}) is ${dias(s.plazo.atraso).en} overdue: fix and retest, or decide a justified alternative closure.`,
      };
    }),
    ...sinEvidencia.map((c): Bilingue => ({
      es: `${c.id} no tiene evidencia: ${c.totales.planeadas ? "sus pruebas no se han ejecutado" : "ninguna prueba de los planes lo cubre"}.`,
      en: `${c.id} has no evidence: ${c.totales.planeadas ? "its tests have not been run" : "no test in the plans covers it"}.`,
    })),
    ...b.aceptados.map((id): Bilingue => {
      const rev = k.sit(id).revision;
      const fecha = rev === null ? "" : rev.fecha;
      return {
        es: `${id} tiene el riesgo aceptado; se revisa el ${fecha}.`,
        en: `${id} has its risk accepted; it is reviewed on ${fecha}.`,
      };
    }),
  ];

  const ordenados = [...b.hallazgos].sort(
    (a, z) =>
      ORDEN_DE_ESTADO.indexOf(a.estado as (typeof ORDEN_DE_ESTADO)[number]) -
        ORDEN_DE_ESTADO.indexOf(z.estado as (typeof ORDEN_DE_ESTADO)[number]) ||
      comparar(a.id, z.id),
  );
  const hallazgos = ordenados.map((h): FilaDeHallazgoDeInforme => {
    const s = k.sit(h.id);
    const e = s.evaluacion;
    return {
      hallazgo: k.enlace(h.id),
      activo: k.nombreDeActivo(h.activo),
      prueba: h.prueba,
      tiempo: h.pideTrabajo
        ? { tipo: "plazo", plazo: k.plazoDe(h.id) }
        : h.estado === "aceptado_con_riesgo" && k.revisionDe(h.id) !== null
          ? { tipo: "revision", revision: k.revisionDe(h.id)! }
          : {
              tipo: "cerrado",
              fecha: e.cierre?.fecha ?? e.apertura,
              sobre: e.cierre?.sobre ?? null,
            },
    };
  });
  const comp = comprobaciones(m, k);
  const verdes = comp.filter((x) => x.pasa).length;
  const conSobre = b.filas.filter((f) => f.sobre !== null).length;

  return {
    ...k.base,
    veredictos: k.veredictos,
    huellaDelInforme: m.huellaDelInforme,
    resumen: {
      frase,
      cifras: [
        {
          clave: "graves",
          valor: String(graves.length),
          texto: {
            es: "críticos o altos sin cerrar",
            en: "critical or high still open",
          },
          marca: null,
        },
        {
          clave: "vencidos",
          valor: String(b.vencidos.length),
          texto: { es: "fuera de plazo", en: "past their deadline" },
          marca: null,
        },
        {
          clave: "sin_evidencia",
          valor: String(sinEvidencia.length),
          texto: {
            es: "controles sin evidencia",
            en: "controls with no evidence",
          },
          marca: null,
        },
        {
          clave: "ejecutadas",
          valor: `${r.ejecutadas} / ${r.planeadas}`,
          texto: { es: "pruebas ejecutadas", en: "tests run" },
          marca: null,
        },
      ],
      decidir,
    },
    porFamilia: b.porFamilia.map(({ familia, totales }) => ({
      id: familia,
      nombre: k.familia(familia).nombre,
      totales,
    })),
    controlesCobertura: b.controles.map((c) => ({
      id: c.id,
      nombre: k.control(c.id).nombre,
      totales: c.totales,
    })),
    filas: b.filas.map((f) => filaDeEsperado(m, k, f)),
    hallazgosPorEstado: ORDEN_DE_ESTADO.filter((e) =>
      b.hallazgos.some((h) => h.estado === e),
    ).map((e) => ({
      etiqueta: k.et("estado_de_hallazgo", e),
      n: b.hallazgos.filter((h) => h.estado === e).length,
    })),
    hallazgos,
    controles: b.controles.map((c): FilaDeControlDeInforme => ({
      id: c.id,
      nombre: k.control(c.id).nombre,
      estado: k.et("estado_de_control", c.estado),
      estadoId: c.estado,
      ultima: c.ultima === null ? null : k.evidencia(c.ultima),
      conSobre: c.filas.filter((f) => k.fila(f.activo, f.prueba).sobre !== null)
        .length,
    })),
    alertas: alertasDe(m, k, false),
    marcos: k.prop("sin_registro"),
    riesgos: b.aceptados.flatMap((id) => {
      const rev = k.revisionDe(id);
      const ev = k.sit(id).evaluacion;
      return rev === null || ev.aceptacion === null
        ? []
        : [
            {
              hallazgo: k.enlace(id),
              justificacion: ev.aceptacion.justificacion,
              revision: rev,
            },
          ];
    }),
    ficha: {
      huellaDelCatalogo: m.instantanea.huella,
      planes: m.activos.activos.flatMap((a) =>
        a.plan === null
          ? []
          : [
              {
                activo: { id: a.activo.id, nombre: a.activo.nombre },
                huella: a.plan.huella,
                fecha: a.plan.fecha_emision,
              },
            ],
      ),
      sobresQueCuentan: conSobre,
      sobresEnElLibro: m.evidencia.libro.length,
      instrumento: {
        verde: verdes === comp.length,
        etiqueta: k.prop(
          verdes === comp.length ? "instrumento_verde" : "instrumento_rojo",
        ),
        verdes,
        total: comp.length,
      },
    },
    activos: b.porActivo.map(({ activo, totales }) => ({
      id: activo,
      nombre: k.nombreDeActivo(activo),
      conPlan: totales !== null,
    })),
  };
}

export { EVIDENCIA_ORGANIZADA, type Brecha };
