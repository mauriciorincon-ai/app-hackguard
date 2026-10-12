// La vista de un hallazgo, calculada desde el libro, los hallazgos y la instantánea oficial. Función pura: ni reloj, ni
// archivos, ni azar. Nada se recalcula aquí: el estado, la severidad, el plazo y la revisión los calcula
// `situacionDeHallazgo` del motor (la misma función que usa el CLI y el e2e de determinismo); esta capa los lee, los
// nombra con los textos del catálogo y de `datos/hallazgos/etiquetas.json`, y arma la cadena de cierre.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { Sobre } from "../../engine/evidencia/esquemas.ts";
import { cotaDeFalla } from "../../engine/evidencia/veredicto.ts";
import type { EvaluacionDeHallazgo } from "../../engine/hallazgos/ciclo.ts";
import type {
  EstadoDeHallazgo,
  EtiquetasDeHallazgo,
  Hallazgo,
} from "../../engine/hallazgos/esquemas.ts";
import {
  situacionDeHallazgo,
  type SituacionDeHallazgo,
} from "../../engine/hallazgos/situacion.ts";
import { comparar } from "../../engine/planificador/orden.ts";
import { nombreDeMetrica } from "../../engine/severidad/etiquetas-cvss.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import { construirFicha, etiqueta } from "../catalogo/vista.ts";
import type { MundoDeHallazgos } from "./cargar.ts";
import { PISO_Y_TECHO } from "./etiquetas.ts";
import type {
  AccionDeHallazgo,
  Bilingue,
  DetalleDeCvss,
  DetalleDeEscalaIa,
  Etiqueta,
  EslabonDeCadena,
  ItemDeSelectorDeHallazgo,
  LineaDeEslabon,
  VistaDeHallazgo,
  VistaDePlazo,
  VistaDeRevision,
} from "./tipos.ts";

type Catalogo = Instantanea["catalogo"];

const plural = (n: number, uno: string, varios: string) =>
  n === 1 ? uno : varios;

/** Una etiqueta propia de las pantallas de hallazgo (`datos/hallazgos/etiquetas.json`). */
export function etiquetaPropia(
  etiquetas: EtiquetasDeHallazgo,
  id: string,
): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/hallazgos/etiquetas.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

/** Lo que dio un sobre, en palabras: su razón, o su conteo con la cota si no falló nada, o lo que midió. */
export function conteoDeSobre(s: Sobre): Bilingue {
  if (s.razon !== null) return s.razon;
  const { fallidas: f, evaluadas: n, alertas: a, metrica: m } = s.resultado;
  if (f !== null && n !== null) {
    if (f > 0)
      return {
        es: `${f} de ${n} salidas ${plural(f, "falló", "fallaron")}`,
        en: `${f} of ${n} outputs failed`,
      };
    const cota = cotaDeFalla(n);
    return {
      es: `0 de ${n} fallaron · cota: hasta ${cota} %`,
      en: `0 of ${n} failed · upper bound: ${cota}%`,
    };
  }
  if (a !== null)
    return {
      es: `${a} ${plural(a, "alerta", "alertas")}`,
      en: `${a} ${plural(a, "alert", "alerts")}`,
    };
  if (m !== null)
    return {
      es: `${m.nombre.es}: ${m.valor} (umbral ${m.umbral})`,
      en: `${m.nombre.en}: ${m.valor} (threshold ${m.umbral})`,
    };
  return { es: "Sin conteo registrado", en: "No count recorded" };
}

const minusculas = (t: Bilingue): Bilingue => ({
  es: t.es.toLowerCase(),
  en: t.en.toLowerCase(),
});

function eslabon(
  etiquetas: EtiquetasDeHallazgo,
  id: string,
  lineas: LineaDeEslabon[] = [],
  pendiente = false,
): EslabonDeCadena {
  return { etiqueta: etiquetaPropia(etiquetas, id), pendiente, lineas };
}

const fecha = (valor: string): LineaDeEslabon => ({ tipo: "fecha", valor });
const menor = (texto: Bilingue): LineaDeEslabon => ({
  tipo: "texto",
  menor: true,
  texto,
});

/** El cuerpo de un eslabón que cuenta un sobre: fecha, lo que dio, su identificador, su huella y quién lo confirmó. */
function lineasDeSobre(
  s: Sobre,
  intermedio: LineaDeEslabon[] = [],
): LineaDeEslabon[] {
  return [
    fecha(s.fecha),
    menor(conteoDeSobre(s)),
    ...intermedio,
    { tipo: "sobre", id: s.id },
    { tipo: "huella", hex: s.huellas.sobre },
    ...(s.confirmacion === null
      ? []
      : [{ tipo: "firma", fecha: s.confirmacion.fecha } as const]),
  ];
}

/** La cadena de cierre: hallazgo → corrección → re-prueba → cierre. Lo que falta se ve punteado; lo hecho lleva fecha, sobre y firma. */
export function construirCadena(
  h: Hallazgo,
  s: SituacionDeHallazgo,
  etiquetas: EtiquetasDeHallazgo,
  motivos: Map<string, Bilingue>,
): EslabonDeCadena[] {
  const e: EvaluacionDeHallazgo = s.evaluacion;
  const origen = e.sobreOrigen;
  const abierto = eslabon(etiquetas, "cadena_abierto", [
    fecha(e.apertura),
    menor(conteoDeSobre(origen)),
    { tipo: "sobre", id: origen.id },
    { tipo: "huella", hex: origen.huellas.sobre },
    { tipo: "firma", fecha: e.apertura },
  ]);

  const decision = (tipo: "eliminacion" | "no_reproducible") =>
    [...h.eventos].reverse().find((x) => x.tipo === tipo);

  if (e.cierre !== null && e.cierre.tipo !== "reprueba") {
    const ev = decision(e.cierre.tipo);
    return [
      abierto,
      eslabon(
        etiquetas,
        e.cierre.tipo === "eliminacion"
          ? "cadena_eliminacion"
          : "cadena_no_reproducible",
        [
          fecha(e.cierre.fecha),
          ...(ev !== undefined && "justificacion" in ev
            ? [menor(ev.justificacion)]
            : []),
        ],
      ),
      eslabon(etiquetas, "cadena_sin_reprueba", [], true),
      eslabon(etiquetas, "cadena_cerrado_sin_reprueba", [
        fecha(e.cierre.fecha),
      ]),
    ];
  }

  const aceptado = e.estado === "aceptado_con_riesgo" && e.aceptacion !== null;
  const segundo = aceptado
    ? eslabon(etiquetas, "cadena_riesgo_aceptado", [
        fecha(e.aceptacion!.fecha),
        menor(e.aceptacion!.justificacion),
      ])
    : e.correccion !== null
      ? eslabon(etiquetas, "cadena_correccion_declarada", [
          fecha(e.correccion.fecha),
          menor(e.correccion.nota),
        ])
      : eslabon(etiquetas, "cadena_correccion_pendiente", [], true);

  const kDelOriginal = origen.k;
  const valida =
    e.cierre === null
      ? null
      : (e.candidatas.find((c) => c.sobre.id === e.cierre?.sobre)?.sobre ??
        null);
  const fallidas = e.candidatas.filter((c) => c.motivos.length > 0);
  let tercero: EslabonDeCadena;
  if (aceptado) {
    tercero = eslabon(etiquetas, "cadena_sin_correccion_ni_reprueba", [], true);
  } else if (valida !== null) {
    tercero = eslabon(
      etiquetas,
      "cadena_reprueba_superada",
      lineasDeSobre(valida, [
        menor(
          kDelOriginal !== null && valida.k !== null
            ? {
                es: `Misma configuración, k = ${valida.k} (el original usó ${kDelOriginal}).`,
                en: `Same configuration, k = ${valida.k} (the original used ${kDelOriginal}).`,
              }
            : {
                es: "Misma configuración que la prueba original.",
                en: "Same configuration as the original test.",
              },
        ),
      ]),
    );
  } else if (e.porConfirmar.length > 0) {
    const p = e.porConfirmar[0]!;
    tercero = eslabon(etiquetas, "cadena_reprueba_por_confirmar", [
      {
        tipo: "sobre",
        id: p.id,
        ...(p.razon === null ? {} : { nota: p.razon }),
      },
      menor({
        es: "Está sin confirmar: todavía no cuenta.",
        en: "It is unconfirmed: it does not count yet.",
      }),
    ]);
  } else if (fallidas.length > 0) {
    const ultima = fallidas[fallidas.length - 1]!;
    tercero = eslabon(
      etiquetas,
      "cadena_reprueba_no_cierra",
      lineasDeSobre(ultima.sobre, [
        {
          tipo: "motivos",
          motivos: ultima.motivos.map(
            (m) => motivos.get(m) ?? { es: m, en: m },
          ),
        },
      ]),
    );
  } else {
    tercero = eslabon(
      etiquetas,
      "cadena_reprueba_pendiente",
      [
        menor(
          kDelOriginal !== null
            ? {
                es: `Misma configuración y al menos k = ${kDelOriginal}.`,
                en: `Same configuration and at least k = ${kDelOriginal}.`,
              }
            : {
                es: "Misma configuración que la prueba original.",
                en: "Same configuration as the original test.",
              },
        ),
      ],
      true,
    );
  }

  const cuarto =
    e.cierre !== null
      ? eslabon(etiquetas, "cadena_cerrado", [fecha(e.cierre.fecha)])
      : aceptado
        ? eslabon(etiquetas, "cadena_sin_cerrar_cuenta_como_falla", [], true)
        : eslabon(etiquetas, "cadena_sin_cerrar", [], true);
  return [abierto, segundo, tercero, cuarto];
}

function vistaDePlazo(
  s: SituacionDeHallazgo,
  etiquetas: EtiquetasDeHallazgo,
): VistaDePlazo {
  const p = s.plazo;
  const id = p.estado;
  if (
    (id === "en_plazo" || id === "vencido") &&
    p.total !== null &&
    p.vence !== null
  ) {
    const frase: Bilingue =
      id === "vencido"
        ? {
            es: `venció hace ${p.atraso} ${plural(p.atraso, "día", "días")}`,
            en: `${p.atraso} ${plural(p.atraso, "day", "days")} overdue`,
          }
        : { es: `vence el ${p.vence}`, en: `due on ${p.vence}` };
    return {
      corre: true,
      estadoId: id,
      etiqueta: etiquetaPropia(etiquetas, id),
      total: p.total,
      dias: p.dias,
      atraso: p.atraso,
      vence: p.vence,
      apertura: s.evaluacion.apertura,
      severidad: s.severidad.nivel,
      frase,
    };
  }
  const aceptado = s.evaluacion.estado === "aceptado_con_riesgo";
  return {
    corre: false,
    estadoId: id === "sin_plazo" ? "sin_plazo" : "no_corre",
    etiqueta: etiquetaPropia(
      etiquetas,
      id === "sin_plazo" ? "sin_plazo" : "no_corre",
    ),
    razon:
      id === "sin_plazo"
        ? "sin_plazo"
        : aceptado
          ? "riesgo_aceptado"
          : "cerrado",
  };
}

function vistaDeRevision(
  c: Catalogo,
  s: SituacionDeHallazgo,
): VistaDeRevision | null {
  const r = s.revision;
  if (r === null || s.evaluacion.aceptacion === null) return null;
  return {
    etiqueta: etiqueta(c, "revision_de_riesgo", r.estado),
    estadoId: r.estado,
    aceptadoEn: s.evaluacion.aceptacion.fecha,
    dias: r.dias,
    total: r.total,
    fecha: r.fecha,
  };
}

function detalleDeIa(
  c: Catalogo,
  s: SituacionDeHallazgo,
  mundo: MundoDeHallazgos,
): DetalleDeEscalaIa {
  const sev = s.severidad;
  if (sev.metodo !== "escala_ia") throw new Error("no es una severidad de IA");
  const escala = mundo.escala;
  const impactos = [...escala.tabla].sort((a, b) => b.impacto - a.impacto);
  const ancla = (nivel: number) =>
    escala.impacto.find((a) => a.nivel === nivel)!.descripcion;
  const nombreDeNivel = (n: string) => etiqueta(c, "severidad", n).nombre;
  const filas = impactos.map((fila) => {
    const limite = escala.limites.find((l) => l.impacto === fila.impacto);
    const nombre =
      limite === undefined ? null : minusculas(nombreDeNivel(limite.nivel));
    return {
      impacto: fila.impacto,
      ancla: ancla(fila.impacto),
      limite:
        limite === undefined || nombre === null
          ? null
          : limite.tipo === "piso"
            ? PISO_Y_TECHO.piso(nombre)
            : PISO_Y_TECHO.techo(nombre),
      celdas: fila.niveles.map((n, i) => ({
        etiqueta: etiqueta(c, "severidad", n),
        esta: fila.impacto === sev.impacto && i === sev.banda - 1,
      })),
    };
  });
  return {
    tipo: "escala_ia",
    nota: escala.nota,
    nivel: sev.nivel,
    columnas: escala.frecuencia.map((b) => b.nombre),
    filas,
    impacto: {
      valor: sev.impacto,
      de: Math.max(...escala.impacto.map((a) => a.nivel)),
      descripcion: ancla(sev.impacto),
    },
    frecuencia: {
      porCiento: sev.frecuencia.porCiento,
      fallidas: sev.frecuencia.fallidas,
      evaluadas: sev.frecuencia.evaluadas,
      deConteo: sev.frecuencia.deConteo,
      sobre: s.evaluacion.sobreOrigen.id,
    },
    alcance: escala.alcance.find((a) => a.nivel === sev.alcance)!.descripcion,
    detectabilidad: escala.detectabilidad.find(
      (a) => a.nivel === sev.detectabilidad,
    )!.descripcion,
  };
}

function detalleDeCvss(
  s: SituacionDeHallazgo,
  mundo: MundoDeHallazgos,
  etiquetas: EtiquetasDeHallazgo,
): DetalleDeCvss {
  const sev = s.severidad;
  if (sev.metodo !== "cvss") throw new Error("no es una severidad CVSS");
  return {
    tipo: "cvss",
    puntaje: sev.puntaje.toFixed(1),
    vector: sev.vector,
    etiquetaDelVector: etiquetaPropia(etiquetas, "vector_valido"),
    metricas: sev.metricas.map(({ clave, valor }) => {
      const n = nombreDeMetrica(mundo.cvss, clave, valor);
      return {
        clave,
        valor,
        metrica: n.metrica,
        nombreDelValor: n.valor,
      };
    }),
    referencia: sev.referencia,
  };
}

/** Qué se puede hacer con el hallazgo hoy, según su estado: la pantalla es de solo lectura y cada salida trae su comando. */
export function accionesDe(
  id: string,
  e: EvaluacionDeHallazgo,
): { nada: Bilingue | null; lista: AccionDeHallazgo[] } {
  if (
    e.estado === "cerrado" ||
    e.estado === "cerrado_por_eliminacion" ||
    e.estado === "no_reproducible"
  )
    return {
      nada: {
        es: "Nada: la evidencia confirmada es inmutable. Si una prueba posterior vuelve a fallar, esa falla abre un hallazgo nuevo con su propia evidencia.",
        en: "Nothing: confirmed evidence is immutable. If a later test fails again, that failure opens a new finding with its own evidence.",
      },
      lista: [],
    };
  const declarar = (accion: string, extra = "") =>
    `pnpm hallazgos:declarar ${id} ${accion} --por <persona> --fecha AAAA-MM-DD${extra} --justificacion-es "<texto>" --justificacion-en "<text>"`;
  const lista: AccionDeHallazgo[] = [];
  if (e.estado === "abierto" || e.estado === "re_probado")
    lista.push({
      id: "corregir",
      nombre: { es: "Registrar la corrección", en: "Record the fix" },
      consecuencia: {
        es: "Pide qué se hizo y cuándo. El hallazgo pasa a «corregido», pero no se cierra: falta la re-prueba, con la misma configuración.",
        en: "It asks what was done and when. The finding moves to “fixed”, but it does not close: the retest is still needed, with the same configuration.",
      },
      comando: declarar("corregido"),
    });
  if (e.estado === "corregido" || e.estado === "re_probado")
    lista.push({
      id: "reprobar",
      nombre: { es: "Registrar la re-prueba", en: "Record the retest" },
      consecuencia: {
        es: "Un sobre nuevo de la misma prueba, con la misma herramienta, versión y selector y al menos el mismo k, que cite este hallazgo en «reprueba_de». Solo cuenta cuando una persona lo confirma; si da «superada», cierra el hallazgo.",
        en: "A new envelope of the same test, with the same tool, version and selector and at least the same k, that cites this finding in “reprueba_de”. It counts only once a person confirms it; if it gives “passed”, it closes the finding.",
      },
      comando: `pnpm evidencia:registrar <resultado.json> --crudo <archivo>  ·  pnpm evidencia:confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD`,
    });
  if (e.estado !== "aceptado_con_riesgo")
    lista.push({
      id: "aceptar",
      nombre: { es: "Aceptar el riesgo", en: "Accept the risk" },
      consecuencia: {
        es: "Exige una justificación y una fecha de revisión. No lo cierra: sigue contando como falla del control hasta que se corrija.",
        en: "It requires a justification and a review date. It does not close it: it keeps counting as a control failure until it is fixed.",
      },
      comando: declarar("aceptado", " --revision-en-dias <n>"),
    });
  lista.push(
    {
      id: "eliminar",
      nombre: { es: "Cerrar por eliminación", en: "Close by removal" },
      consecuencia: {
        es: "Solo si el componente o el activo ya no existe. Exige justificación, y en la brecha se muestra aparte de los cierres por re-prueba.",
        en: "Only if the component or the asset no longer exists. It requires a justification, and the gap view shows it apart from closures by retest.",
      },
      comando: declarar("eliminado"),
    },
    {
      id: "no_reproducible",
      nombre: { es: "No se reproduce", en: "Cannot reproduce" },
      consecuencia:
        e.sobreOrigen.k !== null
          ? {
              es: "Exige justificación y los intentos registrados que la frecuencia original pide; dos intentos no bastan en una prueba que varía entre corridas.",
              en: "It requires a justification and the recorded attempts that the original frequency calls for; two attempts are not enough for a test that varies between runs.",
            }
          : {
              es: "Exige justificación y dos intentos registrados con la misma configuración.",
              en: "It requires a justification and two recorded attempts with the same configuration.",
            },
      comando: declarar("no-reproducible"),
    },
  );
  return { nada: null, lista };
}

/** El orden del selector: lo que pide acción primero (el de `datos/hallazgos/etiquetas.json`) y, a igual estado, por identificador. */
export function ordenarParaSelector(
  situaciones: readonly SituacionDeHallazgo[],
  orden: readonly EstadoDeHallazgo[],
): SituacionDeHallazgo[] {
  const rango = (e: EstadoDeHallazgo) => orden.indexOf(e);
  return [...situaciones].sort(
    (a, b) =>
      rango(a.evaluacion.estado) - rango(b.evaluacion.estado) ||
      comparar(a.evaluacion.id, b.evaluacion.id),
  );
}

export function construirVistaDeHallazgo(
  id: string,
  mundo: MundoDeHallazgos,
  activos: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
): VistaDeHallazgo {
  const c = i.catalogo;
  const datos = { escala: mundo.escala, plazos: mundo.plazos, fecha: consulta };
  const situaciones = mundo.hallazgos.map((h) => {
    const r = situacionDeHallazgo(h, mundo.libro, datos);
    if (!r.ok)
      throw new Error(
        `${h.id}: no se pudo situar (${r.motivo}: ${r.detalle}) / could not be placed`,
      );
    return r.situacion;
  });
  const h = mundo.hallazgos.find((x) => x.id === id);
  const s = situaciones.find((x) => x.evaluacion.id === id);
  if (h === undefined || s === undefined)
    throw new Error(`no hay un hallazgo «${id}» / there is no finding “${id}”`);
  const e = s.evaluacion;

  const ficha = construirFicha(i, e.prueba, consulta);
  const activo = activos.activos.find((a) => a.activo.id === e.activo);
  if (activo === undefined)
    throw new Error(
      `${id}: el activo «${e.activo}» no está registrado / is not registered`,
    );
  const motivos = new Map<string, Bilingue>(
    mundo.etiquetas.motivos_de_rechazo.map((m) => [m.id, m.nombre]),
  );
  const nivel = etiqueta(c, "severidad", s.severidad.nivel);
  const plazo = vistaDePlazo(s, mundo.etiquetas);
  const revision = vistaDeRevision(c, s);

  return {
    id,
    titulo: h.titulo,
    descripcion: h.descripcion,
    estadoId: e.estado,
    estado: etiqueta(c, "estado_de_hallazgo", e.estado),
    cuentaComoFalla: e.cuentaComoFalla,
    nivel,
    nivelId: s.severidad.nivel,
    escala:
      s.severidad.metodo === "cvss"
        ? { tipo: "cvss", puntaje: s.severidad.puntaje.toFixed(1) }
        : { tipo: "escala_ia" },
    selector: ordenarParaSelector(
      situaciones,
      mundo.etiquetas.orden_del_selector,
    ).map((x): ItemDeSelectorDeHallazgo => ({
      id: x.evaluacion.id,
      estado: etiqueta(c, "estado_de_hallazgo", x.evaluacion.estado),
      actual: x.evaluacion.id === id,
    })),
    avisos: {
      plazoVencido:
        plazo.corre && plazo.estadoId === "vencido"
          ? {
              etiqueta: etiquetaPropia(mundo.etiquetas, "aviso_plazo_vencido"),
              nivel: minusculas(nivel.nombre),
              total: plazo.total,
            }
          : null,
      revisionVencida:
        revision !== null && revision.estadoId === "toca_revisar"
          ? {
              etiqueta: etiquetaPropia(
                mundo.etiquetas,
                "aviso_revision_vencida",
              ),
              dias: revision.total,
            }
          : null,
    },
    cadena: construirCadena(h, s, mundo.etiquetas, motivos),
    severidad:
      s.severidad.metodo === "cvss"
        ? detalleDeCvss(s, mundo, mundo.etiquetas)
        : detalleDeIa(c, s, mundo),
    control: {
      controles: ficha.controles,
      sinControl: etiquetaPropia(mundo.etiquetas, "sin_control"),
      esperado: ficha.resultadoEsperado,
      obtenido: {
        veredicto: etiqueta(c, "veredicto", e.sobreOrigen.veredicto),
        conteo: conteoDeSobre(e.sobreOrigen),
      },
    },
    acciones: accionesDe(id, e),
    propiedades: {
      plazo,
      revision,
      abierto: e.apertura,
      activo: { id: e.activo, nombre: activo.activo.nombre },
      prueba: { id: e.prueba, nombre: ficha.nombre, familia: ficha.familia },
    },
    instantanea: nombre,
    consulta,
  };
}

/** El hallazgo que abre «Evidencia» en la barra lateral: el que el selector pone primero. */
export function primerHallazgo(
  mundo: MundoDeHallazgos,
  consulta: string,
): string {
  const datos = { escala: mundo.escala, plazos: mundo.plazos, fecha: consulta };
  const situaciones = mundo.hallazgos.flatMap((h) => {
    const r = situacionDeHallazgo(h, mundo.libro, datos);
    return r.ok ? [r.situacion] : [];
  });
  return ordenarParaSelector(
    situaciones,
    mundo.etiquetas.orden_del_selector,
  )[0]!.evaluacion.id;
}
