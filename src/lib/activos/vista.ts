// La vista de «Activo» y «Plan», calculada desde los activos cargados, sus planes emitidos y la instantánea
// oficial. Función pura: ni reloj, ni archivos, ni azar. El plan NO se recalcula aquí (lo calculó el motor y se
// emitió con huella); se lee, se nombra con los textos del catálogo y se ordena para la pantalla. La vigencia de
// la política del proveedor y de cada herramienta sale de las mismas funciones que la del catálogo.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { estadoDeVigencia } from "../../engine/catalogo/semaforo.ts";
import type { Prueba } from "../../engine/catalogo/esquemas.ts";
import { diasEntre } from "../../engine/fecha.ts";
import type { Etiquetas } from "../../engine/planificador/esquemas.ts";
import {
  etiqueta,
  porId,
  semaforoDe,
  vigenciaVista,
} from "../catalogo/vista.ts";
import type { MundoDeActivos } from "./cargar.ts";
import { ACCESO, DATOS, EXPOSICION } from "./etiquetas.ts";
import type {
  Bilingue,
  CabeceraDeActivo,
  CajaDelPaquete,
  Etiqueta,
  FilaDeCobertura,
  FilaExcluida,
  FilaPlaneada,
  VigenciaVista,
  VistaDeActivo,
  VistaDePlan,
} from "./tipos.ts";

type Catalogo = Instantanea["catalogo"];
type Selector = Prueba["herramientas_recomendadas"][number]["selector"];

function etiquetaPropia(etiquetas: Etiquetas, id: string): Etiqueta {
  const e = etiquetas.etiquetas.find((x) => x.id === id);
  if (e === undefined)
    throw new Error(
      `datos/planificador/etiquetas.json no tiene «${id}» / does not have “${id}”`,
    );
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

/** La vigencia de una fecha de verificación propia (la política de un proveedor) con los umbrales del catálogo. */
export function vigenciaDeFecha(
  c: Catalogo,
  desde: string,
  consulta: string,
): VigenciaVista {
  const dias = diasEntre(desde, consulta);
  if (dias < 0)
    throw new RangeError(
      `la fecha de consulta (${consulta}) es anterior a la verificación (${desde}) / the query date is earlier than the verification`,
    );
  const estado = estadoDeVigencia(dias, c.umbrales.vigencia);
  return { estado, dias, desde, etiqueta: etiqueta(c, "vigencia", estado) };
}

const selectorTexto = (s: Selector): Bilingue | string => {
  switch (s.tipo) {
    case "garak":
      return s.probes.join(", ");
    case "zap":
      return `plugin ${s.pluginids.join(", ")}`;
    case "modulo":
      return s.referencia;
    case "revision":
      return s.que_se_revisa;
  }
};

function cabecera(
  id: string,
  mundo: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
  hacia: "activo" | "plan",
): CabeceraDeActivo & { cargado: MundoDeActivos["activos"][number] } {
  const c = i.catalogo;
  const estadoDe = (con: boolean) =>
    etiqueta(c, "estado_de_activo", con ? "con_plan" : "registrado");
  const cargado = mundo.activos.find((a) => a.activo.id === id);
  if (cargado === undefined)
    throw new Error(`no hay un activo «${id}» / there is no asset “${id}”`);
  void hacia;
  return {
    id,
    nombre: cargado.activo.nombre,
    descripcion: cargado.activo.descripcion,
    estado: estadoDe(cargado.plan !== null),
    autorizado: cargado.plan !== null,
    selector: mundo.activos.map((a) => ({
      id: a.activo.id,
      nombre: a.activo.nombre,
      estado: estadoDe(a.plan !== null),
      actual: a.activo.id === id,
    })),
    instantanea: nombre,
    consulta,
    cargado,
  };
}

export function construirVistaDeActivo(
  id: string,
  mundo: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
): VistaDeActivo {
  const c = i.catalogo;
  const { cargado, ...cab } = cabecera(
    id,
    mundo,
    i,
    nombre,
    consulta,
    "activo",
  );
  const a = cargado.activo;
  const e = (x: string) => etiquetaPropia(mundo.datos.etiquetas, x);
  return {
    ...cab,
    dueno: a.dueno,
    proveedor:
      a.proveedor === null
        ? null
        : {
            nombre: a.proveedor.nombre,
            provee: a.proveedor.provee,
            politica: a.proveedor.politica,
            fuente: a.proveedor.politica_fuente,
            vigencia:
              a.proveedor.politica_verificada === null
                ? null
                : vigenciaDeFecha(c, a.proveedor.politica_verificada, consulta),
          },
    perfil: {
      pila: a.perfil.pila,
      modelos: a.perfil.modelos,
      exposicion: EXPOSICION[a.perfil.exposicion]!,
      datos: DATOS[a.perfil.datos]!,
      autenticacion: a.perfil.autenticacion,
      acceso: ACCESO[a.acceso]!,
      canales: a.perfil.canales,
      acciones: a.perfil.acciones,
    },
    alcance:
      a.alcance === null
        ? null
        : {
            incluye: a.alcance.incluye,
            excluye: a.alcance.excluye,
            ventana: a.alcance.ventana,
            limites: a.alcance.limites,
          },
    reglas:
      a.reglas === null
        ? null
        : a.reglas.map((r) => ({
            texto: r.texto,
            citaProveedor: r.cita_proveedor,
          })),
    familias: a.familias.map((f) => porId(c.familias, f).nombre),
    plan:
      cargado.plan === null
        ? null
        : { huella: cargado.plan.huella, fecha: cargado.plan.fecha_emision },
    plantilla: {
      alcance: mundo.datos.plantilla.alcance,
      reglas: mundo.datos.plantilla.reglas,
    },
    etiquetas: {
      autorizado: e("autorizado"),
      sinAutorizacion: e("sin_autorizacion"),
      faltaAutorizacion: e("falta_autorizacion"),
      sinDeclarar: e("sin_declarar"),
      politicaSinLeer: e("politica_sin_leer"),
    },
  };
}

export function construirVistaDePlan(
  id: string,
  mundo: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
): VistaDePlan {
  const c = i.catalogo;
  const { cargado, ...cab } = cabecera(id, mundo, i, nombre, consulta, "plan");
  const e = (x: string) => etiquetaPropia(mundo.datos.etiquetas, x);
  const etiquetas = {
    sinAutorizacion: e("sin_autorizacion"),
    sinPlan: e("sin_plan"),
    autorizado: e("autorizado"),
    agregada: e("agregada"),
    sinPruebaCorto: e("sin_prueba"),
    resumenConPrueba: e("resumen_con_prueba"),
    resumenSinPrueba: e("resumen_sin_prueba"),
    conPrueba: e("con_prueba"),
  };
  const { plan, paquete } = cargado;
  if (plan === null || paquete === null)
    return { ...cab, plan: null, etiquetas };

  const semaforo = semaforoDe(i, consulta);
  const entorno = (x: string): Bilingue =>
    mundo.datos.entornos.entornos.find((n) => n.id === x)?.nombre ?? {
      es: x,
      en: x,
    };
  const controles = new Map(
    c.controles.flatMap((capa) =>
      capa.areas.flatMap((area) =>
        area.controles.map((x) => [x.id, x.resumen_llano] as const),
      ),
    ),
  );

  const planeadas: FilaPlaneada[] = plan.planeadas.map((p) => {
    const prueba = porId(c.pruebas, p.prueba);
    const h = p.herramienta;
    const herramienta = h === null ? null : porId(c.herramientas, h.id);
    return {
      id: p.prueba,
      nombre: prueba.nombre,
      esperado: prueba.resultado_esperado.descripcion,
      razon: p.razon,
      agregada:
        p.agregada === null
          ? null
          : { justificacion: p.agregada.justificacion },
      prioridad: {
        base: p.prioridad.base,
        final: p.prioridad.final,
        ajuste: p.prioridad.ajuste,
        razones: p.prioridad.ajustes.map((x) => x.razon),
      },
      herramienta:
        h === null || herramienta === null
          ? null
          : {
              id: h.id,
              nombre: herramienta.nombre,
              entorno: entorno(h.entorno),
              k: prueba.criterio_de_veredicto.repeticiones_k ?? null,
              vigencia: vigenciaVista(c, porId(semaforo.herramientas, h.id)),
            },
      controles: p.controles,
    };
  });

  const motivos = new Map(mundo.datos.motivos.motivos.map((m) => [m.id, m]));
  const excluidas: FilaExcluida[] = plan.excluidas.map((x) => {
    const m = motivos.get(x.motivo);
    if (m === undefined)
      throw new Error(`motivo «${x.motivo}» sin definir / undefined reason`);
    return {
      id: x.prueba,
      nombre: porId(c.pruebas, x.prueba).nombre,
      motivo: x.motivo,
      etiqueta: { rol: m.rol, simbolo: m.simbolo, nombre: m.nombre },
      razon: x.razon,
      introduce: m.introduce,
    };
  });

  const cobertura: FilaDeCobertura[] = plan.cobertura.map((x) => ({
    control: x.control,
    resumen: controles.get(x.control) ?? { es: x.control, en: x.control },
    pruebas: x.pruebas,
  }));

  const paquetes: CajaDelPaquete[] = paquete.herramientas.map((g) => {
    const h = porId(c.herramientas, g.herramienta);
    return {
      clave: `${g.herramienta}-${g.entorno}-${g.version_minima ?? "sin-version"}`,
      nombre: h.nombre,
      versionMinima: g.version_minima,
      entorno: entorno(g.entorno),
      adaptador: h.tiene_adaptador,
      pruebas: g.pruebas.map((p) => ({
        id: p.prueba,
        selector: selectorTexto(p.selector),
        k: p.k,
        regla: c.reglas_de_veredicto.find((r) => r.id === p.criterio.regla)
          ?.nombre ?? {
          es: p.criterio.regla,
          en: p.criterio.regla,
        },
      })),
    };
  });

  return {
    ...cab,
    etiquetas,
    plan: {
      huella: plan.huella,
      fecha: plan.fecha_emision,
      instantanea: {
        nombre,
        huella: plan.instantanea.huella,
        fecha: plan.instantanea.fecha,
      },
      paquete: { huella: paquete.huella, href: `/activos/${id}/paquete.json` },
      resumen: {
        planeadas: plan.resumen.planeadas,
        excluidas: plan.resumen.excluidas,
        conPrueba: plan.resumen.controles_con_prueba,
        sinPrueba: plan.resumen.controles_sin_prueba,
        otrasFamilias: plan.resumen.otras_familias,
        planeadasSinControl: plan.resumen.planeadas_sin_control,
      },
      planeadas,
      excluidas,
      cobertura,
      paquetes,
      alcance: {
        ventana: paquete.alcance.ventana,
        limites: paquete.alcance.limites,
      },
      reglas: paquete.reglas.map((r) => r.texto),
    },
  };
}
