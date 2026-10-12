// La vista de la carga de evidencia, calculada desde el libro efectivo, los lotes, los hallazgos y la instantánea
// oficial. Función pura: ni reloj, ni archivos, ni azar. Nada se recalcula aquí: qué revisa una persona lo calculó
// `revisionDelLote`, lo que cuenta `libroEfectivo`, y qué fallas abrirían un hallazgo `sobresQueAbririanHallazgo` (la
// cuenta del CLI al confirmar); esta capa los lee, los nombra con el vocabulario de datos y arma lo que la pantalla dibuja.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type { SobreEfectivo } from "../../engine/evidencia/esquemas.ts";
import { evaluarHallazgo } from "../../engine/hallazgos/ciclo.ts";
import { decidirApertura } from "../../engine/hallazgos/apertura.ts";
import type { Hallazgo } from "../../engine/hallazgos/esquemas.ts";
import { sobresQueAbririanHallazgo } from "../../engine/lotes/confirmar.ts";
import {
  IDS_DE_ETIQUETAS_DE_CARGA,
  type EtiquetasDeCarga,
  type IdDeEtiquetaDeCarga,
  type Lote,
} from "../../engine/lotes/esquemas.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import { etiqueta } from "../catalogo/vista.ts";
import type { MundoDeHallazgos } from "./cargar.ts";
import { conteoDeSobre } from "./vista.ts";
import type {
  Bilingue,
  ConfirmacionDeSobre,
  DecisionDelLote,
  Etiqueta,
  FilaDeMuestreo,
  HallazgoDelSobre,
  NotaConHallazgo,
  PasoDeRecorrido,
  SobreDeLote,
  VistaDeCarga,
  VistaDeLote,
} from "./tipos-de-carga.ts";

type Selector = SobreEfectivo["selector"];

/** Una etiqueta propia de la pantalla de carga (`datos/evidencia/etiquetas-de-carga.json`). */
export function etiquetaDeCarga(
  etiquetas: EtiquetasDeCarga,
  id: IdDeEtiquetaDeCarga,
): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/evidencia/etiquetas-de-carga.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

const selectorTexto = (s: Selector): string => {
  switch (s.tipo) {
    case "garak":
      return `${s.probes.join(", ")} · ${s.detectores.join(", ")}`;
    case "zap":
      return `plugin ${s.pluginids.join(", ")}`;
    case "modulo":
      return s.referencia;
    case "revision":
      return s.que_se_revisa.es;
  }
};

const decisionDe = (l: Lote): DecisionDelLote =>
  l.confirmacion === null
    ? "por_confirmar"
    : l.confirmacion.decision === "confirmado"
      ? "confirmado"
      : "a_revision_individual";

const plural = (n: number, uno: string, varios: string) =>
  n === 1 ? uno : varios;

/** La nota de un sobre: lo que pasa con el hallazgo si el lote se confirma, o lo que pasó. */
function notaDeSobre(
  s: SobreEfectivo,
  hipotetico: readonly SobreEfectivo[],
  hallazgos: readonly Hallazgo[],
  yaCuenta: boolean,
): NotaConHallazgo | null {
  // Una re-prueba se suma a su hallazgo: nunca abre otro, falle o supere.
  if (s.reprueba_de !== null) {
    const hz = hallazgos.find((h) => h.id === s.reprueba_de);
    const ev = hz === undefined ? null : evaluarHallazgo(hz, hipotetico);
    const cierra =
      ev !== null &&
      ev.ok &&
      ev.evaluacion.estado === "cerrado" &&
      ev.evaluacion.cierre?.sobre === s.id;
    if (cierra)
      return yaCuenta
        ? {
            es: "Es la re-prueba de {h}: cerró el hallazgo.",
            en: "It is the retest of {h}: it closed the finding.",
            hallazgo: s.reprueba_de,
          }
        : {
            es: "Es la re-prueba de {h}: al confirmarla, el hallazgo se cierra.",
            en: "It is the retest of {h}: once confirmed, the finding closes.",
            hallazgo: s.reprueba_de,
          };
    return s.veredicto === "superada"
      ? {
          es: "Es la re-prueba de {h}: no cumple todo lo que pide el cierre, así que el hallazgo sigue abierto.",
          en: "It is the retest of {h}: it does not meet everything closure asks for, so the finding stays open.",
          hallazgo: s.reprueba_de,
        }
      : {
          es: "Es la re-prueba de {h}: no la supera, así que el hallazgo sigue abierto.",
          en: "It is the retest of {h}: it does not pass, so the finding stays open.",
          hallazgo: s.reprueba_de,
        };
  }
  const d = decidirApertura(
    hipotetico.find((x) => x.id === s.id) ?? s,
    hipotetico,
    hallazgos,
  );
  if (!d.abre && d.motivo === "ya_hay_uno")
    return {
      es: "Coincide con el hallazgo abierto {h}: no abre uno nuevo.",
      en: "It matches the open finding {h}: it does not open a new one.",
      hallazgo: d.existente ?? null,
    };
  if (d.abre)
    return {
      es: "Al confirmarlo se abre un hallazgo.",
      en: "Confirming it opens a finding.",
      hallazgo: null,
    };
  if (s.veredicto === "no_ejecutada")
    return {
      es: "No cuenta como superada: falta la constancia de que corrió.",
      en: "It does not count as passed: proof that it ran is missing.",
      hallazgo: null,
    };
  return null;
}

function vistaDeLote(
  lote: Lote,
  mundo: MundoDeHallazgos,
  i: Instantanea,
  herramientaNombre: string,
): VistaDeLote {
  const c = i.catalogo;
  const et = (id: IdDeEtiquetaDeCarga) =>
    etiquetaDeCarga(mundo.etiquetasDeCarga, id);
  const revision = mundo.revisiones[lote.id];
  if (revision === undefined)
    throw new Error(
      `${lote.id}: el mundo no trae su revisión / the world has no review for it`,
    );
  const siempre = new Set(revision.siempre);
  const muestra = new Set(revision.muestra);
  const separados = new Set(lote.confirmacion?.separados ?? []);
  const delLote = new Set(lote.sobres.map((s) => s.id));
  // El libro como quedaría con el lote confirmado entero: para decir qué hace cada sobre cuando se confirme.
  const hipotetico: SobreEfectivo[] = mundo.libro.map((s) =>
    delLote.has(s.id) && s.confirmacion === null
      ? {
          ...s,
          confirmacion: {
            por: "—",
            fecha: lote.fecha,
            modo: "lote",
            lote: lote.id,
          },
        }
      : s,
  );

  const sobres = lote.sobres.map((ref): SobreDeLote => {
    const s = mundo.libro.find((x) => x.id === ref.id);
    if (s === undefined)
      throw new Error(
        `${lote.id}: el sobre ${ref.id} no está en el libro / the envelope is not in the ledger`,
      );
    const prueba = c.pruebas.find((p) => p.id === s.prueba);
    if (prueba === undefined)
      throw new Error(
        `${s.id}: la prueba ${s.prueba} no está en la instantánea / the test is not in the snapshot`,
      );
    const revisa: "siempre" | "muestra" | "fuera" = siempre.has(s.id)
      ? "siempre"
      : muestra.has(s.id)
        ? "muestra"
        : "fuera";
    const confirmacion: ConfirmacionDeSobre =
      s.confirmacion === null
        ? separados.has(s.id)
          ? { tipo: "separado" }
          : { tipo: "propuesta" }
        : s.confirmacion.modo === "lote"
          ? {
              tipo: "por_lote",
              lote: s.confirmacion.lote ?? lote.id,
              por: s.confirmacion.por,
              fecha: s.confirmacion.fecha,
            }
          : {
              tipo: "individual",
              por: s.confirmacion.por,
              fecha: s.confirmacion.fecha,
            };
    const nota = notaDeSobre(
      s,
      hipotetico,
      mundo.hallazgos,
      s.confirmacion !== null,
    );
    const ligado = nota?.hallazgo ?? s.reprueba_de ?? null;
    let hallazgo: HallazgoDelSobre | null = null;
    const hz =
      ligado === null
        ? undefined
        : mundo.hallazgos.find((h) => h.id === ligado);
    if (hz !== undefined) {
      // Su estado HOY (con el libro efectivo real), no el que tendría con el lote confirmado.
      const ev = evaluarHallazgo(hz, mundo.libro);
      if (ev.ok)
        hallazgo = {
          id: hz.id,
          estado: etiqueta(c, "estado_de_hallazgo", ev.evaluacion.estado),
          titulo: hz.titulo,
        };
    }
    const { fallidas: f, evaluadas: n } = s.resultado;
    return {
      id: s.id,
      prueba: { id: prueba.id, nombre: prueba.nombre },
      veredicto: etiqueta(c, "veredicto", s.veredicto),
      revision: revisa,
      revisionCorta: et(
        revisa === "siempre"
          ? "siempre"
          : revisa === "muestra"
            ? "en_muestra"
            : "fuera_de_la_muestra",
      ),
      revisionLarga: et(
        revisa === "siempre"
          ? "siempre_larga"
          : revisa === "muestra"
            ? "en_muestra_larga"
            : "fuera_de_la_muestra_larga",
      ),
      proporcion:
        f !== null && n !== null && n > 0
          ? { fallidas: f, evaluadas: n }
          : null,
      conteo: conteoDeSobre(s),
      nota,
      hallazgo,
      regla: s.regla,
      selector: selectorTexto(s.selector),
      huellaSobre: s.huellas.sobre,
      huellaResultado: s.huellas.resultado,
      confirmacion,
    };
  });

  const abren =
    lote.confirmacion === null
      ? sobresQueAbririanHallazgo({
          lote,
          libro: mundo.libro,
          hallazgos: mundo.hallazgos,
          separados: new Set<string>(),
          por: "—",
          fecha: lote.fecha,
        })
      : [];
  const decision = decisionDe(lote);
  const reparto = (
    ["fallida", "parcial", "no_ejecutada", "superada", "no_aplicable"] as const
  )
    .map((v) => ({
      veredicto: etiqueta(c, "veredicto", v),
      n: sobres.filter(
        (s) => s.veredicto.nombre === etiqueta(c, "veredicto", v).nombre,
      ).length,
    }))
    .filter((x) => x.n > 0);
  const cuentanPorElLote = sobres.filter(
    (s) => s.confirmacion.tipo === "por_lote",
  ).length;
  const decididoPor =
    lote.confirmacion === null
      ? null
      : { por: lote.confirmacion.por, fecha: lote.confirmacion.fecha };

  const recorrido: PasoDeRecorrido[] = [
    {
      ...paso(et("paso_hecho")),
      titulo: { es: "Archivo leído", en: "File read" },
      detalle: {
        es: "Se leyó una vez: no se guarda, solo su huella.",
        en: "Read once: it is not stored, only its fingerprint.",
      },
    },
    {
      ...paso(et("paso_hecho")),
      titulo: { es: "Veredictos sugeridos", en: "Verdicts suggested" },
      detalle: {
        es: "Los calculó la regla de cada prueba.",
        en: "Computed by each test's rule.",
      },
    },
    decision === "por_confirmar"
      ? {
          ...paso(et("lote_sin_confirmar")),
          titulo: { es: "Tu revisión", en: "Your review" },
          detalle: {
            es: "Hasta aquí, nada cuenta.",
            en: "Until here, nothing counts.",
          },
        }
      : decision === "confirmado"
        ? {
            ...paso(et("lote_confirmado")),
            titulo: et("lote_confirmado").nombre,
            detalle: {
              es: `${cuentanPorElLote} ${plural(cuentanPorElLote, "sobre cuenta", "sobres cuentan")} desde ${decididoPor?.fecha ?? ""}${separados.size > 0 ? `; ${separados.size} se ${plural(separados.size, "confirma", "confirman")} por separado.` : "."}`,
              en: `${cuentanPorElLote} ${plural(cuentanPorElLote, "envelope counts", "envelopes count")} from ${decididoPor?.fecha ?? ""}${separados.size > 0 ? `; ${separados.size} ${plural(separados.size, "is", "are")} confirmed separately.` : "."}`,
            },
          }
        : {
            ...paso(et("lote_a_revision_individual")),
            titulo: et("lote_a_revision_individual").nombre,
            detalle: {
              es: "Cada sobre se confirma por separado.",
              en: "Each envelope is confirmed separately.",
            },
          },
  ];

  const seleccionado =
    sobres.find((s) => s.revision === "siempre")?.id ?? sobres[0]!.id;
  const base = `pnpm evidencia:confirmar-lote ${lote.id} --por <persona> --fecha AAAA-MM-DD`;
  return {
    id: lote.id,
    herramienta: {
      nombre: herramientaNombre,
      version: lote.herramienta.version,
    },
    fecha: lote.fecha,
    hora: lote.hora,
    zona: lote.zona_horaria,
    decision,
    decisionEtiqueta: et(
      decision === "por_confirmar"
        ? "lote_sin_confirmar"
        : decision === "confirmado"
          ? "lote_confirmado"
          : "lote_a_revision_individual",
    ),
    decididoPor,
    reparto,
    advertencias: lote.advertencias,
    sobres,
    seleccionado,
    obligatorias: revision.siempre.length,
    rePruebas: revision.rePruebas,
    resto: revision.resto,
    muestra: revision.muestra.length,
    abren,
    separados: [...separados].sort(),
    cuentanPorElLote,
    recorrido,
    ficha: {
      archivo: lote.archivo.nombre,
      huellaDelArchivo: lote.huellas.archivo,
      huellaDelLote: lote.huellas.lote,
      huellaDelRegistro: lote.huellas.registro,
      adaptador: `${lote.adaptador.id} ${lote.adaptador.version}`,
      ejecutadoPor: lote.ejecutado_por,
    },
    comandos: {
      confirmar: `${base}${abren.map((id) => ` --separar ${id}`).join("")}`,
      unoPorUno: `${base} --revisar-uno-por-uno`,
    },
  };
}

const paso = (e: Etiqueta) => ({ rol: e.rol, simbolo: e.simbolo });

export function filasDeMuestreo(
  tramos: readonly { hasta: number | null; muestra: number | null }[],
): FilaDeMuestreo[] {
  return tramos.map((t, k) => ({
    desde: k === 0 ? 1 : (tramos[k - 1]!.hasta ?? 0) + 1,
    hasta: t.hasta,
    muestra: t.muestra,
  }));
}

export function construirVistaDeCarga(
  mundo: MundoDeHallazgos,
  activos: MundoDeActivos,
  i: Instantanea,
  nombreInstantanea: string,
  consulta: string,
): VistaDeCarga {
  const c = i.catalogo;
  const lotes = mundo.lotes.map((l) => {
    const herramienta = c.herramientas.find((h) => h.id === l.herramienta.id);
    if (herramienta === undefined)
      throw new Error(
        `${l.id}: la herramienta ${l.herramienta.id} no está en la instantánea / the tool is not in the snapshot`,
      );
    return vistaDeLote(l, mundo, i, herramienta.nombre);
  });
  const ids = [...new Set(mundo.lotes.map((l) => l.activo))];
  const todos = lotes.flatMap((l) => l.sobres);
  const cuenta = (v: string) =>
    todos.filter(
      (s) => s.veredicto.nombre === etiqueta(c, "veredicto", v).nombre,
    ).length;
  const m = mundo.muestreo;
  const nombreDe = (id: string): Bilingue => {
    const a = activos.activos.find((x) => x.activo.id === id);
    if (a === undefined)
      throw new Error(
        `el activo ${id} de un lote no está en los activos / a batch's asset is not among the assets`,
      );
    return a.activo.nombre;
  };
  return {
    etiquetas: Object.fromEntries(
      IDS_DE_ETIQUETAS_DE_CARGA.map((id) => [
        id,
        etiquetaDeCarga(mundo.etiquetasDeCarga, id),
      ]),
    ) as Record<IdDeEtiquetaDeCarga, Etiqueta>,
    instantanea: nombreInstantanea,
    consulta,
    activos: ids.map((id) => ({
      id,
      nombre: nombreDe(id),
      huellaDelPlan:
        activos.activos.find((x) => x.activo.id === id)?.plan?.huella ?? null,
    })),
    resumen: {
      lotesPorConfirmar: lotes.filter((l) => l.decision === "por_confirmar")
        .length,
      sobres: todos.length,
      fallidas: {
        ...etiqueta(c, "veredicto", "fallida"),
        nombre: { es: "fallidas", en: "failed" },
      },
      nFallidas: cuenta("fallida"),
      noEjecutada: {
        ...etiqueta(c, "veredicto", "no_ejecutada"),
        nombre: { es: "no ejecutada", en: "not run" },
      },
      nNoEjecutadas: cuenta("no_ejecutada"),
    },
    lotes,
    muestreo: {
      filas: filasDeMuestreo(m.tramos),
      procedimiento: m.procedimiento,
      calidadLimite: m.calidad_limite_por_ciento,
      riesgoDelConsumidor: m.riesgo_del_consumidor_por_ciento,
    },
  };
}
