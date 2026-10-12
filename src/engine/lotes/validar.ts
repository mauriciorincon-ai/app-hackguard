// Validador de lotes (ADR-009): lee los archivos de lotes, comprueba cada uno contra el esquema, contra el plan y el
// paquete que cita, contra los sobres que lista y contra el plan de muestreo, recalcula sus huellas y dice qué encontró,
// con la regla que lo encontró. El motor no toca el disco: los textos llegan de `src/lib/evidencia/cargar-evidencia.ts`.
//
// Un lote sin confirmar es válido (es una propuesta): solo que no confirma a nadie. Lo que es error es un lote que
// contradice al plan, a sus sobres, al plan de muestreo o a sus propias huellas.
import { ADAPTADORES } from "../adaptadores/index.ts";
import type { Sobre } from "../evidencia/esquemas.ts";
import { huellaDelSobre, sinHuellas } from "../evidencia/huellas.ts";
import {
  comillas,
  describir,
  estadoDe,
  nombreDeArchivo,
  ordenarHallazgos,
  regla as r,
  type EstadoDeValidacion,
  type HallazgoDeValidacion,
  type TextoBilingue,
} from "../evidencia/molde.ts";
import type { PlanDeActivo } from "../evidencia/validar.ts";
import { decidirApertura } from "../hallazgos/apertura.ts";
import type { Hallazgo } from "../hallazgos/esquemas.ts";
import { sha256 } from "../huella.ts";
import { comparar } from "../planificador/orden.ts";
import { confirmadosPorLote, libroEfectivo } from "./efectivo.ts";
import { Lote, type PlanDeMuestreo } from "./esquemas.ts";
import {
  huellaDelLote,
  huellaDelRegistro,
  textoDelArchivoSintetico,
} from "./huellas.ts";
import { revisionDelLote } from "./revision.ts";

export const REGLAS_DE_LOTE = {
  "archivo/json-invalido": r(
    "error",
    "El archivo no es JSON válido",
    "The file is not valid JSON",
  ),
  "esquema/campo-invalido": r(
    "error",
    "Un campo del lote no cumple el esquema (o hay un campo que no existe)",
    "A field of the batch does not meet the schema (or there is a field that does not exist)",
  ),
  "archivo/nombre-no-coincide": r(
    "error",
    "El nombre del archivo no coincide con el id del lote",
    "The file name does not match the batch id",
  ),
  "lote/id-duplicado": r(
    "error",
    "Hay dos lotes con el mismo id",
    "There are two batches with the same id",
  ),
  "lote/origen-no-demo-en-datos-publicos": r(
    "error",
    "Un lote propio está en una carpeta versionada: lo real vive en datos/privado/",
    "An own batch is in a versioned folder: real data lives in datos/privado/",
  ),
  "lote/demo-en-carpeta-privada": r(
    "error",
    "Un lote demo está en datos/privado/: la carpeta decide dónde va cada cosa",
    "A demo batch is in datos/privado/: the folder decides where each thing goes",
  ),
  "lote/activo-sin-plan": r(
    "error",
    "El activo del lote no tiene plan emitido",
    "The batch's asset has no issued plan",
  ),
  "lote/plan-no-cuadra": r(
    "error",
    "La huella del plan que cita el lote no es la del plan emitido",
    "The plan fingerprint the batch cites is not the issued plan's",
  ),
  "lote/paquete-no-cuadra": r(
    "error",
    "La huella del paquete que cita el lote no es la del paquete emitido",
    "The package fingerprint the batch cites is not the issued package's",
  ),
  "lote/herramienta-fuera-del-paquete": r(
    "error",
    "El paquete del activo no corre la herramienta del lote",
    "The asset's package does not run the batch's tool",
  ),
  "lote/adaptador-desconocido": r(
    "error",
    "El adaptador del lote no existe o no lee esa herramienta",
    "The batch's adapter does not exist or does not read that tool",
  ),
  "lote/sobre-inexistente": r(
    "error",
    "El lote lista un sobre que no está en el libro",
    "The batch lists an envelope that is not in the ledger",
  ),
  "lote/sobre-en-dos-lotes": r(
    "error",
    "Un sobre está en dos lotes",
    "An envelope is in two batches",
  ),
  "lote/sobre-no-cuadra": r(
    "error",
    "La huella que el lote cita de un sobre no es la de ese sobre sin confirmar: el sobre se editó",
    "The fingerprint the batch cites for an envelope is not that envelope's unconfirmed one: the envelope was edited",
  ),
  "lote/sobre-ajeno": r(
    "error",
    "Un sobre del lote es de otro activo, plan, paquete o herramienta",
    "An envelope in the batch is from another asset, plan, package or tool",
  ),
  "lote/crudo-distinto-del-archivo": r(
    "error",
    "El crudo de un sobre no es el archivo del lote",
    "An envelope's raw fingerprint is not the batch's file",
  ),
  "lote/crudo-demo-no-sintetico": r(
    "error",
    "Un lote demo debe llevar la huella del archivo sintético, no la de una corrida real",
    "A demo batch must carry the synthetic file's fingerprint, not a real run's",
  ),
  "lote/huella-no-cuadra": r(
    "error",
    "Una huella del lote no coincide con el contenido: el lote se editó",
    "A batch fingerprint does not match the content: the batch was edited",
  ),
  "lote/confirmacion-anterior-a-la-corrida": r(
    "error",
    "La confirmación del lote es anterior a la corrida",
    "The batch's confirmation is earlier than the run",
  ),
  "lote/decision-incoherente": r(
    "error",
    "Un lote mandado a revisión individual no lleva revisados ni separados",
    "A batch sent to individual review carries no reviewed or separated envelopes",
  ),
  "lote/revisados-no-cuadran": r(
    "error",
    "Los sobres revisados no son las fallidas y parciales más la muestra que dice el plan de muestreo",
    "The reviewed envelopes are not the failures and partials plus the sample the sampling plan says",
  ),
  "lote/separado-que-no-se-revisa-siempre": r(
    "error",
    "Solo se separan fallidas y parciales; un separado no lo es",
    "Only failures and partials can be separated; a separated one is not",
  ),
  "lote/sobre-confirmado-dos-veces": r(
    "error",
    "Un sobre confirmado por el lote ya tenía una confirmación individual",
    "An envelope confirmed by the batch already had an individual confirmation",
  ),
  "lote/falla-sin-hallazgo": r(
    "error",
    "El lote confirmó una falla que abriría un hallazgo y no se separó: abrirlo pide la severidad de una persona",
    "The batch confirmed a failure that would open a finding and was not separated: opening it needs a person's severity",
  ),
  "lote/sin-confirmar": r(
    "nota",
    "El lote no está confirmado: sus sobres son propuestas y no cuentan",
    "The batch is not confirmed: its envelopes are proposals and do not count",
  ),
} as const;
export type IdReglaDeLote = keyof typeof REGLAS_DE_LOTE;
export type HallazgoDeLote = HallazgoDeValidacion<IdReglaDeLote>;

export interface ArchivoDeLote {
  /** Ruta relativa a la raíz, con «/». */
  ruta: string;
  texto: string;
}

export interface LoteConRuta {
  ruta: string;
  lote: Lote;
}

export interface ContextoDeLotes {
  /** Los sobres que pasaron su validación, con su archivo. */
  sobres: readonly { ruta: string; sobre: Sobre }[];
  planes: Readonly<Record<string, PlanDeActivo>>;
  muestreo: PlanDeMuestreo;
}

export interface ResultadoDeValidacionDeLotes {
  estado: EstadoDeValidacion;
  hallazgos: HallazgoDeLote[];
  /** Solo los que pasaron la validación sin errores. */
  lotes: LoteConRuta[];
}

const CARPETA_PUBLICA = "datos/lotes/";
const CARPETA_PRIVADA = "datos/privado/";

export async function validarLotes(
  archivos: readonly ArchivoDeLote[],
  contexto: ContextoDeLotes,
): Promise<ResultadoDeValidacionDeLotes> {
  const hallazgos: HallazgoDeLote[] = [];
  const agregar = (
    regla: IdReglaDeLote,
    ruta: string,
    campo = "",
    detalle: TextoBilingue | null = null,
  ) => {
    const { severidad, nombre } = REGLAS_DE_LOTE[regla];
    hallazgos.push({ regla, severidad, ruta, campo, nombre, detalle });
  };
  const validos: LoteConRuta[] = [];
  const ids = new Map<string, string>();
  const sobres = new Map(contexto.sobres.map((s) => [s.sobre.id, s.sobre]));
  const leidos: LoteConRuta[] = [];

  for (const archivo of [...archivos].sort((a, b) =>
    comparar(a.ruta, b.ruta),
  )) {
    let bruto: unknown;
    try {
      bruto = JSON.parse(archivo.texto) as unknown;
    } catch {
      agregar("archivo/json-invalido", archivo.ruta);
      continue;
    }
    const lectura = Lote.safeParse(bruto);
    if (!lectura.success) {
      for (const problema of lectura.error.issues)
        agregar(
          "esquema/campo-invalido",
          archivo.ruta,
          problema.path.join("."),
          describir(problema),
        );
      continue;
    }
    leidos.push({ ruta: archivo.ruta, lote: lectura.data });
  }

  // Un sobre en dos lotes: el segundo lote (por id) es el que sobra.
  const duenos = new Map<string, string>();
  for (const { lote } of [...leidos].sort((a, b) =>
    comparar(a.lote.id, b.lote.id),
  ))
    for (const s of lote.sobres)
      if (!duenos.has(s.id)) duenos.set(s.id, lote.id);

  for (const { ruta, lote: l } of leidos) {
    const errores = hallazgos.filter((h) => h.severidad === "error").length;
    if (nombreDeArchivo(ruta) !== `${l.id}.json`)
      agregar(
        "archivo/nombre-no-coincide",
        ruta,
        "id",
        comillas(`${l.id}.json`),
      );
    const previa = ids.get(l.id);
    if (previa !== undefined)
      agregar("lote/id-duplicado", ruta, "id", comillas(previa));
    else ids.set(l.id, ruta);

    if (ruta.startsWith(CARPETA_PUBLICA) && l.origen !== "demo")
      agregar("lote/origen-no-demo-en-datos-publicos", ruta, "origen");
    if (ruta.startsWith(CARPETA_PRIVADA) && l.origen === "demo")
      agregar("lote/demo-en-carpeta-privada", ruta, "origen");

    const emitido = contexto.planes[l.activo];
    if (emitido === undefined) {
      agregar("lote/activo-sin-plan", ruta, "activo", comillas(l.activo));
    } else {
      if (emitido.plan.huella !== l.plan.huella)
        agregar("lote/plan-no-cuadra", ruta, "plan.huella");
      if (emitido.plan.paquete.huella !== l.paquete.huella)
        agregar("lote/paquete-no-cuadra", ruta, "paquete.huella");
      if (
        !emitido.paquete.herramientas.some(
          (h) => h.herramienta === l.herramienta.id,
        )
      )
        agregar(
          "lote/herramienta-fuera-del-paquete",
          ruta,
          "herramienta.id",
          comillas(l.herramienta.id),
        );
    }
    const adaptador = ADAPTADORES.find((a) => a.id === l.adaptador.id);
    if (adaptador === undefined || adaptador.herramienta !== l.herramienta.id)
      agregar(
        "lote/adaptador-desconocido",
        ruta,
        "adaptador.id",
        comillas(l.adaptador.id),
      );

    // Los sobres que lista.
    const delLote: Sobre[] = [];
    for (const [i, c] of l.sobres.entries()) {
      const s = sobres.get(c.id);
      if (s === undefined) {
        agregar(
          "lote/sobre-inexistente",
          ruta,
          `sobres.${i}.id`,
          comillas(c.id),
        );
        continue;
      }
      delLote.push(s);
      if (duenos.get(c.id) !== l.id)
        agregar(
          "lote/sobre-en-dos-lotes",
          ruta,
          `sobres.${i}.id`,
          comillas(c.id),
        );
      if (
        s.activo !== l.activo ||
        s.plan.huella !== l.plan.huella ||
        s.paquete.huella !== l.paquete.huella ||
        s.herramienta.id !== l.herramienta.id ||
        s.herramienta.version !== l.herramienta.version
      )
        agregar("lote/sobre-ajeno", ruta, `sobres.${i}.id`, comillas(c.id));
      const sinConfirmar = { ...sinHuellas(s), confirmacion: null };
      if (c.huella !== (await huellaDelSobre(sinConfirmar)))
        agregar(
          "lote/sobre-no-cuadra",
          ruta,
          `sobres.${i}.huella`,
          comillas(c.id),
        );
      if (l.origen === "propio" && s.huellas.crudo !== l.huellas.archivo)
        agregar(
          "lote/crudo-distinto-del-archivo",
          ruta,
          `sobres.${i}.id`,
          comillas(c.id),
        );
    }
    if (
      l.origen === "demo" &&
      l.huellas.archivo !== (await sha256(textoDelArchivoSintetico(l.id)))
    )
      agregar("lote/crudo-demo-no-sintetico", ruta, "huellas.archivo");

    // Las huellas del lote se recalculan: quien edite un lote sellado la rompe.
    if (l.huellas.lote !== (await huellaDelLote(l)))
      agregar("lote/huella-no-cuadra", ruta, "huellas.lote");
    if (l.huellas.registro !== (await huellaDelRegistro(l)))
      agregar("lote/huella-no-cuadra", ruta, "huellas.registro");

    const c = l.confirmacion;
    if (c === null) {
      agregar("lote/sin-confirmar", ruta, "confirmacion");
    } else {
      if (c.fecha < l.fecha)
        agregar(
          "lote/confirmacion-anterior-a-la-corrida",
          ruta,
          "confirmacion.fecha",
        );
      if (c.decision === "a_revision_individual") {
        if (c.revisados.length > 0 || c.separados.length > 0)
          agregar("lote/decision-incoherente", ruta, "confirmacion.decision");
      } else if (delLote.length === l.sobres.length) {
        const veredictos = new Map(delLote.map((s) => [s.id, s.veredicto]));
        const revision = await revisionDelLote(
          l,
          veredictos,
          contexto.muestreo,
        );
        if (
          comparar(
            JSON.stringify([...c.revisados].sort(comparar)),
            JSON.stringify(revision.revisados),
          ) !== 0
        )
          agregar("lote/revisados-no-cuadran", ruta, "confirmacion.revisados");
        for (const [i, id] of c.separados.entries())
          if (!revision.siempre.includes(id))
            agregar(
              "lote/separado-que-no-se-revisa-siempre",
              ruta,
              `confirmacion.separados.${i}`,
              comillas(id),
            );
        const separados = new Set(c.separados);
        for (const s of delLote)
          if (!separados.has(s.id) && s.confirmacion !== null)
            agregar(
              "lote/sobre-confirmado-dos-veces",
              ruta,
              "sobres",
              comillas(s.id),
            );
      }
    }
    if (hallazgos.filter((x) => x.severidad === "error").length === errores)
      validos.push({ ruta, lote: l });
  }

  ordenarHallazgos(hallazgos);
  const sinError = new Set(
    hallazgos.filter((h) => h.severidad === "error").map((h) => h.ruta),
  );
  return {
    estado: estadoDe(hallazgos),
    hallazgos,
    lotes: validos.filter((v) => !sinError.has(v.ruta)),
  };
}

/**
 * Una falla que el lote confirmó y que abriría un hallazgo nuevo: abrirlo pide la severidad de una persona, y esa se da
 * al confirmar el sobre solo. Va aparte de `validarLotes` porque necesita los hallazgos, que a su vez se validan contra
 * el libro efectivo (que ya conoce los lotes válidos).
 */
export function fallasSinHallazgo(
  lotes: readonly LoteConRuta[],
  sobres: readonly Sobre[],
  hallazgos: readonly Hallazgo[],
): HallazgoDeLote[] {
  const efectivo = libroEfectivo(
    sobres,
    lotes.map((v) => v.lote),
  );
  const { severidad, nombre } = REGLAS_DE_LOTE["lote/falla-sin-hallazgo"];
  const resultado: HallazgoDeLote[] = [];
  for (const { ruta, lote } of lotes)
    for (const id of confirmadosPorLote(lote)) {
      const s = efectivo.find((x) => x.id === id);
      if (s !== undefined && decidirApertura(s, efectivo, hallazgos).abre)
        resultado.push({
          regla: "lote/falla-sin-hallazgo",
          severidad,
          ruta,
          campo: "sobres",
          nombre,
          detalle: comillas(id),
        });
    }
  return resultado;
}
