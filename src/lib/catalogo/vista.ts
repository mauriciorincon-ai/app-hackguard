// La vista del catálogo y la ficha de cada prueba, calculadas desde la instantánea oficial con el motor del S1. Es la
// ÚNICA cuenta que las pantallas muestran (design-system § 9): `semaforo()` recalcula la vigencia en la fecha de consulta
// y a la fecha de la instantánea reproduce su `semaforo` publicado (tests/unit/lib/catalogo-vista.test.ts lo exige).
// Función pura: ni reloj, ni archivos, ni azar.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { cotaDeFalla } from "../../engine/evidencia/veredicto.ts";
import {
  desglose,
  etiquetaDe,
  semaforo as calcularSemaforo,
  type Semaforo,
  type Vigencia,
} from "../../engine/catalogo/semaforo.ts";
import {
  MADUREZ,
  REVISION,
  SIN_CONTROL,
  SIN_CONTROL_CORTO,
  conCuenta,
} from "./etiquetas.ts";
import { SIN_CONTROL as FILTRO_SIN_CONTROL } from "./filtros.ts";
import type {
  Bilingue,
  CifraDeVigencia,
  Etiqueta,
  EstadoDeVigencia,
  FichaDePrueba,
  FilaDeFamilia,
  FilaDePrueba,
  ListaDeFiltro,
  VigenciaVista,
  VistaDeCatalogo,
} from "./tipos.ts";

type Catalogo = Instantanea["catalogo"];

const ESTADOS: readonly EstadoDeVigencia[] = [
  "vigente",
  "por_revisar",
  "vencido",
];

/** La regla de veredicto que da una cota visible de la tasa de fallo con cero fallas en k repeticiones (E-2). */
const REGLA_CON_COTA = "asimetrica_k";

const SIN_EJECUCION: Bilingue = {
  es: "Sin evidencia de ejecución el veredicto es «no ejecutada», nunca «superada».",
  en: "Without evidence that it ran, the verdict is “not run”, never “passed”.",
};

export function etiqueta(
  c: Catalogo,
  vocabulario: string,
  estado: string,
): Etiqueta {
  const e = etiquetaDe(c.estados, vocabulario, estado);
  if (!e) {
    throw new Error(
      `el vocabulario de estados no nombra «${vocabulario}.${estado}» / the state vocabulary does not name it`,
    );
  }
  return { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre };
}

/** El semáforo del catálogo en la fecha de consulta, con las entradas que el motor pide. */
export function semaforoDe(i: Instantanea, consulta: string): Semaforo {
  const c = i.catalogo;
  return calcularSemaforo(
    {
      familias: c.familias,
      pruebas: c.pruebas,
      marcos: c.marcos,
      herramientas: c.herramientas,
    },
    consulta,
    c.umbrales.vigencia,
  );
}

export function vigenciaVista(c: Catalogo, v: Vigencia): VigenciaVista {
  return {
    estado: v.estado,
    dias: v.dias,
    desde: v.fecha_verificacion,
    etiqueta: etiqueta(c, "vigencia", v.estado),
  };
}

export const porId = <T extends { id: string }>(
  xs: readonly T[],
  id: string,
): T => {
  const x = xs.find((e) => e.id === id);
  if (!x)
    throw new Error(
      `«${id}» no está en la instantánea / is not in the snapshot`,
    );
  return x;
};

function herramientaDe(c: Catalogo, p: Catalogo["pruebas"][number]) {
  return porId(c.herramientas, p.resultado_esperado.medido_con);
}

function repeticiones(k: number | undefined): Bilingue {
  return k
    ? { es: `k = ${k}`, en: `k = ${k}` }
    : { es: "determinista", en: "deterministic" };
}

function fila(
  c: Catalogo,
  p: Catalogo["pruebas"][number],
  v: Vigencia,
): FilaDePrueba {
  const marco = porId(c.marcos, p.marco_id);
  return {
    id: p.id,
    nombre: p.nombre,
    queVerifica: p.que_verifica,
    familia: p.familia,
    familiaNombre: porId(c.familias, p.familia).nombre,
    herramienta: herramientaDe(c, p).nombre,
    herramientaId: p.resultado_esperado.medido_con,
    repeticiones: repeticiones(p.criterio_de_veredicto.repeticiones_k),
    marcoId: p.marco_id,
    marco: `${marco.nombre} ${p.version_marco} · ${p.referencia_en_marco}`,
    controles: p.controles,
    vigencia: vigenciaVista(c, v),
    madurez: p.madurez,
    madurezNombre: MADUREZ[p.madurez]!,
    revision:
      p.revision_contenido === "marcada_para_revision"
        ? "marcada_para_revision"
        : "limpia",
  };
}

function listas(c: Catalogo): ListaDeFiltro[] {
  const controles = c.controles.flatMap((capa) =>
    capa.areas.flatMap((a) => a.controles.map((x) => x.id)),
  );
  return [
    {
      campo: "marco",
      rotulo: { es: "Marco", en: "Framework" },
      opciones: [
        { valor: "", texto: { es: "Todos", en: "All" } },
        ...c.marcos.map((m) => ({
          valor: m.id,
          texto: `${m.nombre} ${m.version_vigente}`,
        })),
      ],
    },
    {
      campo: "control",
      rotulo: { es: "Control", en: "Control" },
      opciones: [
        { valor: "", texto: { es: "Todos", en: "All" } },
        ...controles.map((id) => ({ valor: id, texto: id })),
        { valor: FILTRO_SIN_CONTROL, texto: SIN_CONTROL.nombre },
      ],
    },
    {
      campo: "herramienta",
      rotulo: { es: "Herramienta", en: "Tool" },
      opciones: [
        { valor: "", texto: { es: "Todas", en: "All" } },
        // Solo las que miden alguna prueba: una lista con herramientas sin pruebas llevaría a una pantalla vacía.
        ...c.herramientas
          .filter((h) =>
            c.pruebas.some((p) => p.resultado_esperado.medido_con === h.id),
          )
          .map((h) => ({ valor: h.id, texto: h.nombre }))
          .sort((a, b) => a.texto.localeCompare(b.texto, "en")),
      ],
    },
    {
      campo: "madurez",
      rotulo: { es: "Madurez", en: "Maturity" },
      opciones: [
        { valor: "", texto: { es: "Todos", en: "All" } },
        ...Object.entries(MADUREZ).map(([valor, texto]) => ({ valor, texto })),
      ],
    },
    {
      campo: "vigencia",
      rotulo: { es: "Vigencia", en: "Freshness" },
      opciones: [
        { valor: "", texto: { es: "Todos", en: "All" } },
        ...ESTADOS.map((e) => ({
          valor: e,
          texto: etiqueta(c, "vigencia", e).nombre,
        })),
      ],
    },
    {
      campo: "revision",
      rotulo: { es: "Revisión de contenido", en: "Content review" },
      opciones: [
        { valor: "", texto: { es: "Todos", en: "All" } },
        ...Object.entries(REVISION).map(([valor, texto]) => ({ valor, texto })),
      ],
    },
  ];
}

function panelDeFamilias(c: Catalogo, s: Semaforo): FilaDeFamilia[] {
  return c.familias.map((f) => {
    const suyas = c.pruebas.filter((p) => p.familia === f.id);
    const v = s.familias.find((x) => x.id === f.id);
    if (!v)
      throw new Error(
        `el semáforo no trae la familia «${f.id}» / the semaphore lacks the family`,
      );
    const desde = suyas.map((p) => p.fecha_verificacion).sort()[0] ?? null;
    return {
      id: f.id,
      nombre: f.nombre,
      pruebas: suyas.length,
      estado: v.estado
        ? etiqueta(c, "vigencia", v.estado)
        : etiqueta(c, "familia", "sin_pruebas"),
      dias: v.dias,
      desde,
      desglose: ESTADOS.map((e) => ({ e, n: v.desglose[e] }))
        .filter(({ n }) => n > 0)
        .map(({ e, n }) => ({
          etiqueta: { ...etiqueta(c, "vigencia", e), nombre: conCuenta(e, n) },
          n,
        })),
    };
  });
}

export function construirVista(
  i: Instantanea,
  nombre: string,
  consulta: string,
): VistaDeCatalogo {
  const c = i.catalogo;
  const s = semaforoDe(i, consulta);
  const vigenciaDe = new Map(s.pruebas.map((v) => [v.id, v]));
  const filas = c.pruebas.map((p) => fila(c, p, vigenciaDe.get(p.id)!));
  const cuenta = desglose(s.pruebas);
  const cifras: CifraDeVigencia[] = [
    ...ESTADOS.map((e) => ({
      etiqueta: etiqueta(c, "vigencia", e),
      n: cuenta[e],
    })),
    {
      etiqueta: SIN_CONTROL_CORTO,
      n: filas.filter((f) => f.controles.length === 0).length,
    },
  ];
  return {
    instantanea: nombre,
    huella: i.huella,
    consulta,
    total: filas.length,
    totalDeFamilias: c.familias.length,
    cifras,
    familias: [
      { valor: "", texto: { es: "Todas", en: "All" } },
      ...c.familias.map((f) => ({ valor: f.id, texto: f.nombre })),
    ],
    listas: listas(c),
    filas,
    panel: panelDeFamilias(c, s),
    pendientes: i.pendientes_de_revision.map((p) => ({
      id: p.id,
      etiqueta: etiqueta(c, "pendiente_de_revision", p.motivo),
    })),
  };
}

export const idsDePruebas = (i: Instantanea): string[] =>
  i.catalogo.pruebas.map((p) => p.id);

export function construirFicha(
  i: Instantanea,
  id: string,
  consulta: string,
): FichaDePrueba {
  const c = i.catalogo;
  const s = semaforoDe(i, consulta);
  const p = porId(c.pruebas, id);
  const marco = porId(c.marcos, p.marco_id);
  const herramienta = herramientaDe(c, p);
  const recomendada = p.herramientas_recomendadas.find(
    (h) => h.herramienta === herramienta.id,
  )!;
  const regla = porId(c.reglas_de_veredicto, p.criterio_de_veredicto.regla);
  const k = p.criterio_de_veredicto.repeticiones_k ?? null;
  // Regla del tres (E-2): con cero fallas en k repeticiones, con 95 % de confianza la tasa real de fallo no supera 3/k.
  // Una sola cuenta, con tope de 100 %: con k < 3 la regla no dice nada útil y no se pasa del total.
  const cota = k && regla.id === REGLA_CON_COTA ? cotaDeFalla(k) : null;
  const sel = recomendada.selector;
  const controles = c.controles.flatMap((capa) =>
    capa.areas.flatMap((a) => a.controles),
  );
  const vigDe = (lista: Vigencia[], x: string) =>
    vigenciaVista(c, porId(lista, x));

  const valorDeRasgo = (
    rasgo: (typeof c.rasgos)[number],
    valor: boolean | string,
  ): Bilingue | string => {
    if (rasgo.tipo === "booleano")
      return valor ? { es: "sí", en: "yes" } : { es: "no", en: "no" };
    return rasgo.opciones.find((o) => o.id === valor)?.nombre ?? String(valor);
  };

  return {
    id: p.id,
    nombre: p.nombre,
    queVerifica: p.que_verifica,
    porQueImporta: p.por_que_importa,
    resultadoEsperado: p.resultado_esperado.descripcion,
    familia: porId(c.familias, p.familia).nombre,
    madurez: MADUREZ[p.madurez]!,
    prioridadBase: p.prioridad_base,
    aprobadaEl: p.fecha_verificacion,
    vigencia: vigDe(s.pruebas, p.id),
    umbrales: c.umbrales.vigencia,
    marcada: p.revision_contenido === "marcada_para_revision",
    regla: {
      id: regla.id,
      decide: regla.descripcion,
      sinEjecucion: SIN_EJECUCION,
    },
    repeticiones: {
      k,
      cotaPorCiento: cota,
      descripcion: !k
        ? {
            es: "La misma entrada da el mismo resultado: una corrida basta.",
            en: "The same input gives the same result: one run is enough.",
          }
        : cota !== null
          ? {
              es: `Con 0 fallas en ${k}, con 95 % de confianza la tasa real de fallo no supera el ${cota} %.`,
              en: `With 0 failures in ${k}, with 95% confidence the real failure rate does not exceed ${cota}%.`,
            }
          : {
              es: "Repeticiones idénticas, con la misma configuración, para medir cuánto cambia el modelo por sí solo.",
              en: "Identical repetitions, with the same configuration, to measure how much the model changes on its own.",
            },
    },
    corrida: {
      herramienta: herramienta.nombre,
      licencia: herramienta.licencia.spdx,
      vigencia: vigDe(s.herramientas, herramienta.id),
      conAdaptador: herramienta.tiene_adaptador,
      versionMinima: recomendada.version_minima ?? null,
      selector: {
        texto:
          sel.tipo === "garak"
            ? sel.probes.join(", ")
            : sel.tipo === "zap"
              ? sel.pluginids.join(", ")
              : sel.tipo === "modulo"
                ? sel.referencia
                : null,
        revision: sel.tipo === "revision" ? sel.que_se_revisa : null,
        detectores: sel.tipo === "garak" ? sel.detectores.join(", ") : null,
        agregacion:
          sel.tipo === "garak" || sel.tipo === "zap" ? sel.agregacion : null,
      },
    },
    aplicabilidad: {
      descripcion: p.aplicabilidad.descripcion,
      condiciones: p.aplicabilidad.condiciones.map((cond) => {
        const rasgo = porId(c.rasgos, cond.rasgo);
        return { rasgo: rasgo.nombre, valor: valorDeRasgo(rasgo, cond.valor) };
      }),
    },
    marco: {
      nombre: marco.nombre,
      version: p.version_marco,
      referencia: p.referencia_en_marco,
      vigencia: vigDe(s.marcos, marco.id),
    },
    controles: p.controles.map((cid) => {
      const control = controles.find((x) => x.id === cid);
      if (!control)
        throw new Error(
          `el control «${cid}» no está en la instantánea / is not in the snapshot`,
        );
      return { id: cid, nombre: control.nombre };
    }),
    fuentes: [
      {
        nombre: `${marco.nombre} ${p.version_marco} · ${p.referencia_en_marco}`,
        donde: marco.editor,
        vigencia: vigDe(s.marcos, marco.id),
      },
      ...(herramienta.id === "propia"
        ? []
        : [
            {
              nombre: herramienta.nombre,
              donde: {
                es: "documentación oficial",
                en: "official documentation",
              } as Bilingue,
              vigencia: vigDe(s.herramientas, herramienta.id),
            },
          ]),
    ],
    citas: p.fuentes.map((f) => ({
      titulo: f.titulo,
      consultada: f.consultada,
    })),
  };
}
