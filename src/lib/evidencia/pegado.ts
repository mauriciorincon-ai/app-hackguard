// El texto pegado en el navegador (H-2): lo que una herramienta devolvió se pega, el adaptador lo lee EN LA PÁGINA, y se ve el sobre
// que se propondría, el veredicto que calcula la regla de la prueba y la brecha ANTES y DESPUÉS de confirmarlo. Código puro y sin
// archivos: corre en el navegador (nada sale de él: ni red, ni almacenamiento) y en las pruebas de Node con los mismos bytes.
//
// Una cuenta, un cálculo: ningún conteo propio. Leer el texto es `adaptador.leer`; armar los sobres es `armarLote` (el del CLI
// `pnpm evidencia:importar`); qué fallas abrirían un hallazgo es `decidirApertura`; y la brecha de antes y de después es
// `calcularBrecha` sobre la entrada de la consulta, con los sobres propuestos añadidos como si una persona los confirmara.
//
// Qué NO hace: no guarda nada, no confirma nada (una propuesta no cuenta hasta que una persona la confirma con el CLI), no calcula la
// severidad del hallazgo que se abriría (la pone la persona al confirmar: aquí va un valor de referencia que no mueve ninguna cifra) y
// no muestra el texto pegado: solo su huella y el extracto que el adaptador escribe con números e identificadores.
import { ADAPTADORES } from "../../engine/adaptadores/index.ts";
import type { MotivoDeNoLeer } from "../../engine/adaptadores/interfaz.ts";
import {
  calcularBrecha,
  ErrorDeEntradaDeBrecha,
  type Brecha,
  type EntradaDeBrecha,
} from "../../engine/brecha/calcular.ts";
import type { EstadoDeControl } from "../../engine/brecha/esquemas.ts";
import type { Sobre, SobreEfectivo } from "../../engine/evidencia/esquemas.ts";
import { huellaDelCrudo } from "../../engine/evidencia/huellas.ts";
import type {
  PlanDeActivo,
  PruebaConocida,
} from "../../engine/evidencia/validar.ts";
import {
  decidirApertura,
  hallazgoNuevo,
  siguienteIdDeHallazgo,
} from "../../engine/hallazgos/apertura.ts";
import type { Hallazgo } from "../../engine/hallazgos/esquemas.ts";
import {
  armarLote,
  siguienteIdDeLote,
  type MotivoDeNoArmarLote,
} from "../../engine/lotes/armar.ts";
import type { Lote } from "../../engine/lotes/esquemas.ts";
import type { Etiqueta } from "../catalogo/tipos.ts";

type Bilingue = { es: string; en: string };

/** Lo que el navegador necesita de un activo para leer un texto contra su plan: nada más. */
export interface ActivoParaPegar {
  id: string;
  nombre: Bilingue;
  /** El plan emitido con su paquete, ya comprobado contra su huella por quien armó el mundo (el build). */
  emitido: PlanDeActivo;
  /** La herramienta que el paquete corre y cuyo adaptador existe: «garak», «zap». */
  herramientas: { id: string; nombre: Bilingue }[];
}

/** Todo lo que la pantalla del texto pegado lee: el mundo del build, serializable. Sin el crudo de nadie. */
export interface MundoDePegado {
  consulta: string;
  /** La MISMA entrada de la brecha que arma el informe (`entradaDeBrecha`): por eso el «antes» es la brecha de la consulta. */
  entrada: EntradaDeBrecha;
  activos: ActivoParaPegar[];
  /** La regla de veredicto de cada prueba del catálogo que algún plan cita. */
  pruebas: PruebaConocida[];
  /** Los lotes que ya existen: un archivo con la misma huella no se importa dos veces. */
  lotes: { id: string; activo: string; archivo: string }[];
  etiquetas: {
    veredictos: Record<string, Etiqueta>;
    controles: Record<EstadoDeControl, Etiqueta>;
  };
  /** Nombre de cada prueba (catálogo) para decir qué se midió. */
  nombresDePruebas: Record<string, Bilingue>;
  /** Nombre de cada control de la brecha. */
  nombresDeControles: Record<string, Bilingue>;
}

/** Quien pega: qué herramienta, para qué activo y lo que el reporte no declara. */
export interface PedidoDePegado {
  texto: string;
  activo: string;
  herramienta: string;
  /** Solo si el reporte no trae la fecha (garak la trae sin zona; ZAP antes de 0.41.0 no la trae). */
  fecha: string | null;
  /** Solo si el reporte no declara su zona horaria (garak no la declara). */
  zona: string | null;
}

export type MotivoDePegado =
  | "sin_texto"
  | "activo_desconocido"
  | "herramienta_sin_adaptador"
  | "ya_importado"
  | `no_leyo_${MotivoDeNoLeer}`
  | MotivoDeNoArmarLote
  | "fecha_con_formato_incorrecto"
  | "posterior_a_la_consulta";

/** Los textos de cada motivo, en los dos idiomas: lo que pasó y qué hacer. Nunca un código pelado. */
export const TEXTO_DE_MOTIVO: Record<string, Bilingue> = {
  sin_texto: {
    es: "No hay texto que leer: pega lo que devolvió la herramienta.",
    en: "There is no text to read: paste what the tool returned.",
  },
  activo_desconocido: {
    es: "Ese activo no tiene un plan emitido con esta herramienta.",
    en: "That asset has no issued plan with this tool.",
  },
  herramienta_sin_adaptador: {
    es: "HackGuard solo lee los reportes de Garak y de ZAP. Para otra herramienta usa «Sobre manual».",
    en: "HackGuard only reads Garak and ZAP reports. For another tool use “Manual envelope”.",
  },
  ya_importado: {
    es: "Ese mismo texto ya se importó como un lote: la misma corrida no se importa dos veces.",
    en: "That same text was already imported as a batch: the same run is not imported twice.",
  },
  no_leyo_no_es_el_formato: {
    es: "El texto no tiene el formato de esa herramienta. Pega el reporte entero, tal como lo escribió: para Garak el archivo report.jsonl, para ZAP el JSON del reporte.",
    en: "The text does not have that tool's format. Paste the whole report as the tool wrote it: for Garak the report.jsonl file, for ZAP the report's JSON.",
  },
  no_leyo_version_incoherente: {
    es: "El reporte dice dos versiones de la herramienta que no coinciden: no se arma ningún sobre con un dato en el que el propio archivo no se pone de acuerdo.",
    en: "The report states two tool versions that disagree: no envelope is built from data the file itself does not agree on.",
  },
  no_leyo_version_no_comparable: {
    es: "La versión de la herramienta no se puede comparar con la mínima del paquete: actualiza la herramienta o carga el resultado como sobre manual.",
    en: "The tool version cannot be compared with the package's minimum: update the tool or load the result as a manual envelope.",
  },
  no_leyo_version_menor_que_la_minima: {
    es: "La versión de la herramienta es menor que la que pide el paquete del activo: no se arma ningún sobre con un formato que nadie verificó.",
    en: "The tool version is lower than the one the asset's package asks for: no envelope is built from a format nobody verified.",
  },
  no_leyo_campo_ausente: {
    es: "Al reporte le falta un campo que el adaptador necesita: se pegó incompleto o es de otra versión.",
    en: "The report lacks a field the adapter needs: it was pasted incomplete or is from another version.",
  },
  no_leyo_conteos_no_cuadran: {
    es: "Los conteos del reporte no cuadran entre sí: no se arma ningún sobre con números que se contradicen.",
    en: "The report's counts do not add up: no envelope is built from numbers that contradict each other.",
  },
  no_leyo_sin_resultados: {
    es: "El reporte no trae resultados: una corrida sin resultados no es una prueba superada.",
    en: "The report carries no results: a run with no results is not a passed test.",
  },
  falta_fecha: {
    es: "El reporte no trae la fecha de la corrida: escríbela en «Fecha de la corrida».",
    en: "The report does not carry the run date: type it in “Run date”.",
  },
  falta_zona: {
    es: "El reporte no declara su zona horaria: escríbela en «Zona horaria» (por ejemplo America/Bogota).",
    en: "The report does not declare its time zone: type it in “Time zone” (for example America/Bogota).",
  },
  sin_pruebas_de_la_herramienta: {
    es: "El reporte se leyó, pero ninguna prueba del plan de este activo es de esta herramienta o de lo que midió: no hay sobre que proponer.",
    en: "The report was read, but no test of this asset's plan is from this tool or from what it measured: there is no envelope to propose.",
  },
  prueba_desconocida: {
    es: "Una prueba del paquete no está en el catálogo de la instantánea: el plan y el catálogo no coinciden.",
    en: "A test in the package is not in the snapshot's catalog: the plan and the catalog disagree.",
  },
  prueba_fuera_del_plan: {
    es: "Una prueba que el adaptador midió no está en el plan de este activo: el plan y el paquete no coinciden.",
    en: "A test the adapter measured is not in this asset's plan: the plan and the package disagree.",
  },
  veredicto_declarado_requerido: {
    es: "Una prueba del paquete es una revisión de diseño: no tiene conteo que decida su veredicto y lo declara una persona. Usa «Sobre manual».",
    en: "A test in the package is a design review: no count decides its verdict and a person declares it. Use “Manual envelope”.",
  },
  regla_desconocida: {
    es: "La regla de veredicto de una prueba no existe en el motor: el catálogo y el motor no coinciden.",
    en: "A test's verdict rule does not exist in the engine: the catalog and the engine disagree.",
  },
  falta_k: {
    es: "Una prueba estocástica del paquete no trae sus repeticiones k: el plan está incompleto.",
    en: "A stochastic test in the package carries no repetitions k: the plan is incomplete.",
  },
  faltan_conteos: {
    es: "Lo que midió el adaptador no trae los conteos que pide la regla de la prueba.",
    en: "What the adapter measured lacks the counts the test's rule asks for.",
  },
  falta_metrica: {
    es: "Lo que midió el adaptador no trae la métrica que pide la regla de la prueba.",
    en: "What the adapter measured lacks the metric the test's rule asks for.",
  },
  fecha_con_formato_incorrecto: {
    es: "La fecha debe escribirse AAAA-MM-DD.",
    en: "The date must be written YYYY-MM-DD.",
  },
  posterior_a_la_consulta: {
    es: "La corrida es posterior a la fecha de consulta de esta instantánea: la brecha no se puede calcular con evidencia de un día que todavía no pasa. Reconstruye con una fecha de consulta posterior.",
    en: "The run is later than this snapshot's query date: the gap cannot be computed with evidence from a day that has not happened. Rebuild with a later query date.",
  },
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type Sentido = "mejoro" | "empeoro";

/** Un control cuyo estado cambia si se confirma lo propuesto. */
export interface CambioDeControl {
  id: string;
  de: EstadoDeControl;
  a: EstadoDeControl;
  sentido: Sentido;
}

/** Una prueba del plan cuyo último sobre confirmado sería otro. */
export interface CambioDePrueba {
  prueba: string;
  de: string | null;
  a: string | null;
}

export interface CifrasDeBrecha {
  planeadas: number;
  ejecutadas: number;
  superadas: number;
  fallidas: number;
  noEjecutadas: number;
  hallazgosQueCuentan: number;
  controlesConFalla: number;
  porConfirmar: number;
}

export interface BrechaSiConfirmas {
  antes: CifrasDeBrecha & { huella: string };
  despues: CifrasDeBrecha & { huella: string };
  controles: CambioDeControl[];
  pruebas: CambioDePrueba[];
  /** Las fallas que, confirmadas, abrirían un hallazgo (la severidad la pone quien confirma). */
  abririan: { sobre: string; prueba: string }[];
}

export interface SobrePropuesto {
  id: string;
  prueba: string;
  veredicto: Sobre["veredicto"];
  resultado: Sobre["resultado"];
  extracto: string | null;
  advertencias: Bilingue[];
  huella: string;
}

export interface PropuestaDePegado {
  lote: Lote;
  sobres: Sobre[];
  /** Lo que la pantalla dibuja de cada sobre, sin el texto pegado. */
  resumen: SobrePropuesto[];
  huellaDelCrudo: string;
  fecha: string;
  /** Las pruebas del plan cuyo selector no es de lo que midió el reporte. */
  noAplican: number;
  /** El texto pegado y el archivo pueden diferir en los saltos de línea: la huella es la de lo pegado. */
  advertencias: Bilingue[];
  brecha: BrechaSiConfirmas;
}

export type ResultadoDePegado =
  | { ok: true; propuesta: PropuestaDePegado }
  | { ok: false; motivo: MotivoDePegado; detalle: string | null };

const SEVERIDAD_DE_REFERENCIA: Hallazgo["severidad"] = {
  tipo: "escala_ia",
  impacto: 1,
  alcance: 1,
  detectabilidad: 1,
};

const cifrasDe = (b: Brecha): CifrasDeBrecha => ({
  planeadas: b.resumen.planeadas,
  ejecutadas: b.resumen.ejecutadas,
  superadas: b.resumen.superadas,
  fallidas: b.resumen.fallidas,
  noEjecutadas: b.resumen.no_ejecutadas,
  hallazgosQueCuentan: b.hallazgos.filter((h) => h.cuentaComoFalla).length,
  controlesConFalla: b.controles.filter((c) => c.estado === "con_fallas")
    .length,
  porConfirmar: b.porConfirmar.sobres,
});

/** Lo que dice el orden del vocabulario de estados de control: con fallas < sin evidencia < antigua < vigente. */
const PESO: readonly EstadoDeControl[] = [
  "con_fallas",
  "sin_evidencia",
  "evidencia_antigua",
  "con_evidencia_vigente",
];

/**
 * La brecha antes y después de confirmar los sobres propuestos. `antes` es `calcularBrecha(entrada)` (la de la consulta, con su
 * huella: la del informe); `después` es la misma función con los sobres añadidos como confirmados en la fecha de consulta y con los
 * hallazgos que `decidirApertura` dice que se abrirían. Lanza `ErrorDeEntradaDeBrecha` si un sobre es posterior a la consulta.
 */
export async function brechaSiConfirmas(
  entrada: EntradaDeBrecha,
  lote: Pick<Lote, "id">,
  sobres: readonly Sobre[],
): Promise<BrechaSiConfirmas> {
  const antes = await calcularBrecha(entrada);
  const confirmados: SobreEfectivo[] = sobres.map((s) => ({
    ...s,
    confirmacion: {
      por: "vista previa",
      fecha: entrada.consulta,
      modo: "lote",
      lote: lote.id,
    },
  }));
  const libro = [...entrada.libro, ...confirmados];
  // Qué fallas abrirían un hallazgo: la regla del CLI (`decidirApertura`), una por una, con el libro ya con todos.
  const abririan: BrechaSiConfirmas["abririan"] = [];
  const nuevos: Hallazgo[] = [];
  for (const s of confirmados) {
    const d = decidirApertura(s, libro, [...entrada.hallazgos, ...nuevos]);
    if (!d.abre) continue;
    abririan.push({ sobre: s.id, prueba: s.prueba });
    nuevos.push(
      hallazgoNuevo(
        siguienteIdDeHallazgo([...entrada.hallazgos, ...nuevos]),
        s,
        {
          es: "Hallazgo propuesto (vista previa)",
          en: "Proposed finding (preview)",
        },
        { es: "Solo en la vista previa.", en: "Preview only." },
        SEVERIDAD_DE_REFERENCIA,
      ),
    );
  }
  const despues = await calcularBrecha({
    ...entrada,
    libro,
    hallazgos: [...entrada.hallazgos, ...nuevos],
  });
  const controles: CambioDeControl[] = [];
  for (const c of despues.controles) {
    const antesDe = antes.controles.find((x) => x.id === c.id)?.estado;
    if (antesDe === undefined || antesDe === c.estado) continue;
    controles.push({
      id: c.id,
      de: antesDe,
      a: c.estado,
      sentido:
        PESO.indexOf(c.estado) > PESO.indexOf(antesDe) ? "mejoro" : "empeoro",
    });
  }
  const pruebas: CambioDePrueba[] = [];
  for (const f of despues.filas) {
    const antesDe = antes.filas.find(
      (x) => x.activo === f.activo && x.prueba === f.prueba,
    );
    const de = antesDe?.veredicto ?? null;
    if (de !== f.veredicto)
      pruebas.push({ prueba: f.prueba, de, a: f.veredicto });
  }
  return {
    antes: { ...cifrasDe(antes), huella: antes.huella },
    despues: { ...cifrasDe(despues), huella: despues.huella },
    controles,
    pruebas,
    abririan,
  };
}

/**
 * Lee el texto pegado y arma lo que se propondría. No confirma nada y no guarda nada. El texto entra, se resume en una huella y no
 * sale en ningún campo del resultado (reglas duras 3 y 4).
 */
export async function proponerDesdeTexto(
  mundo: MundoDePegado,
  pedido: PedidoDePegado,
): Promise<ResultadoDePegado> {
  const falla = (
    motivo: MotivoDePegado,
    detalle: string | null = null,
  ): ResultadoDePegado => ({ ok: false, motivo, detalle });
  if (pedido.texto.trim() === "") return falla("sin_texto");
  const activo = mundo.activos.find((a) => a.id === pedido.activo);
  const herramienta = activo?.herramientas.find(
    (h) => h.id === pedido.herramienta,
  );
  if (activo === undefined || herramienta === undefined)
    return falla("activo_desconocido");
  const adaptador = ADAPTADORES.find(
    (a) => a.herramienta === pedido.herramienta,
  );
  if (adaptador === undefined) return falla("herramienta_sin_adaptador");
  if (pedido.fecha !== null && pedido.fecha !== "" && !FECHA.test(pedido.fecha))
    return falla("fecha_con_formato_incorrecto");

  const crudo = await huellaDelCrudo(new TextEncoder().encode(pedido.texto));
  const previo = mundo.lotes.find(
    (l) => l.activo === activo.id && l.archivo === crudo,
  );
  if (previo !== undefined) return falla("ya_importado", previo.id);

  const minima =
    activo.emitido.paquete.herramientas.find(
      (h) => h.herramienta === pedido.herramienta,
    )?.version_minima ?? null;
  const lectura = adaptador.leer(pedido.texto, minima);
  if (!lectura.ok) return falla(`no_leyo_${lectura.motivo}`, lectura.detalle);

  const armado = await armarLote({
    adaptador,
    corrida: lectura.corrida,
    archivo: { nombre: `texto-pegado.${adaptador.herramienta}`, huella: crudo },
    activo: activo.id,
    origen: "demo",
    emitido: activo.emitido,
    pruebas: mundo.pruebas,
    idDeLote: siguienteIdDeLote(mundo.lotes),
    existentes: mundo.entrada.libro.map((s) => ({ id: s.id })),
    ejecutadoPor: "vista previa",
    fecha: pedido.fecha === null || pedido.fecha === "" ? null : pedido.fecha,
    zonaHoraria:
      pedido.zona === null || pedido.zona.trim() === ""
        ? null
        : pedido.zona.trim(),
  });
  if (!armado.ok) return falla(armado.motivo, armado.prueba ?? null);

  let brecha: BrechaSiConfirmas;
  try {
    brecha = await brechaSiConfirmas(mundo.entrada, armado.lote, armado.sobres);
  } catch (e) {
    if (e instanceof ErrorDeEntradaDeBrecha)
      return falla("posterior_a_la_consulta", e.message);
    throw e;
  }
  const delPaquete = activo.emitido.paquete.herramientas
    .filter((h) => h.herramienta === pedido.herramienta)
    .flatMap((h) => h.pruebas).length;
  return {
    ok: true,
    propuesta: {
      lote: armado.lote,
      sobres: armado.sobres,
      resumen: armado.sobres.map((s) => ({
        id: s.id,
        prueba: s.prueba,
        veredicto: s.veredicto,
        resultado: s.resultado,
        extracto: s.extracto_redactado,
        advertencias: s.advertencias,
        huella: s.huellas.sobre,
      })),
      huellaDelCrudo: crudo,
      fecha: armado.lote.fecha,
      noAplican: delPaquete - armado.sobres.length,
      advertencias: [
        {
          es: "La huella es la del texto tal como se pegó. Si el archivo trae saltos de línea de Windows, su huella en el CLI puede ser otra.",
          en: "The fingerprint is that of the text as pasted. If the file carries Windows line breaks, its fingerprint in the CLI may differ.",
        },
        ...armado.lote.advertencias,
      ],
      brecha,
    },
  };
}
