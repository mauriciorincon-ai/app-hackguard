// Validador del libro de evidencia: lee los archivos de sobres, comprueba cada uno contra el esquema, contra el
// plan y el paquete que cita (ADR-007) y contra la regla de veredicto del catálogo, recalcula sus huellas y dice
// qué encontró, con la regla que lo encontró. El motor no toca el disco: los textos llegan de
// `src/lib/evidencia/cargar-evidencia.ts`.
//
// Un sobre sin confirmar es válido (es una propuesta): solo que no cuenta. Lo que es error es un sobre que
// contradice al catálogo, al plan, a su regla o a sus propias huellas.
import { canonicalizar } from "../huella.ts";
import type { PatronCompilado } from "../catalogo/filtro.ts";
import { filtrar } from "../catalogo/filtro.ts";
import { comparar } from "../planificador/orden.ts";
import type { Paquete, Plan } from "../planificador/esquemas.ts";
import { Sobre } from "./esquemas.ts";
import {
  huellaDelCrudoSintetico,
  huellaDelResultado,
  huellaDelSobre,
  sinHuellas,
} from "./huellas.ts";
import {
  compararVersiones,
  comillas,
  describir,
  estadoDe,
  nombreDeArchivo,
  ordenarHallazgos,
  regla as r,
  t,
  type EstadoDeValidacion,
  type HallazgoDeValidacion,
  type TextoBilingue,
} from "./molde.ts";
import { calcularVeredicto } from "./veredicto.ts";

export const REGLAS_DE_SOBRE = {
  "archivo/json-invalido": r(
    "error",
    "El archivo no es JSON válido",
    "The file is not valid JSON",
  ),
  "esquema/campo-invalido": r(
    "error",
    "Un campo del sobre no cumple el esquema (o hay un campo que no existe)",
    "A field of the envelope does not meet the schema (or there is a field that does not exist)",
  ),
  "archivo/nombre-no-coincide": r(
    "error",
    "El nombre del archivo no coincide con el id del sobre",
    "The file name does not match the envelope id",
  ),
  "sobre/id-duplicado": r(
    "error",
    "Dos sobres tienen el mismo id",
    "Two envelopes share an id",
  ),
  "sobre/origen-no-demo-en-datos-publicos": r(
    "error",
    "Un sobre que no es demo está en una carpeta versionada: la evidencia real vive en datos/privado/evidencia/",
    "A non-demo envelope is in a versioned folder: real evidence lives in datos/privado/evidencia/",
  ),
  "sobre/demo-en-carpeta-privada": r(
    "error",
    "Un sobre demo está en datos/privado/: los demos viven en datos/evidencia/demo/",
    "A demo envelope is in datos/privado/: demo envelopes live in datos/evidencia/demo/",
  ),
  "sobre/activo-sin-plan": r(
    "error",
    "El sobre cita un activo que no tiene plan emitido: sin plan no hay evidencia que registrar",
    "The envelope cites an asset with no issued plan: with no plan there is no evidence to record",
  ),
  "sobre/plan-no-cuadra": r(
    "error",
    "La huella del plan que cita el sobre no es la del plan emitido",
    "The plan fingerprint the envelope cites is not the issued plan's",
  ),
  "sobre/paquete-no-cuadra": r(
    "error",
    "La huella del paquete que cita el sobre no es la del paquete del plan",
    "The package fingerprint the envelope cites is not the plan's package",
  ),
  "sobre/prueba-fuera-del-plan": r(
    "error",
    "La prueba del sobre no está en el paquete de ejecución del activo",
    "The envelope's test is not in the asset's execution package",
  ),
  "sobre/regla-distinta-del-catalogo": r(
    "error",
    "La regla de veredicto del sobre no es la que el catálogo fija para esa prueba",
    "The envelope's verdict rule is not the one the catalog sets for that test",
  ),
  "sobre/k-distinto-del-paquete": r(
    "error",
    "Las repeticiones k del sobre no son las del paquete de ejecución",
    "The envelope's k repetitions are not the execution package's",
  ),
  "sobre/herramienta-distinta-del-paquete": r(
    "error",
    "La herramienta del sobre no es la que el paquete fija para esa prueba",
    "The envelope's tool is not the one the package sets for that test",
  ),
  "sobre/version-menor-que-la-minima": r(
    "error",
    "La versión de la herramienta es menor que la mínima del paquete",
    "The tool version is lower than the package's minimum",
  ),
  "sobre/selector-distinto-del-paquete": r(
    "error",
    "El selector del sobre no es el del paquete de ejecución",
    "The envelope's selector is not the execution package's",
  ),
  "sobre/faltan-datos-de-la-regla": r(
    "error",
    "Faltan los conteos o la métrica que la regla de veredicto necesita",
    "The counts or the metric the verdict rule needs are missing",
  ),
  "sobre/veredicto-no-es-el-de-la-regla": r(
    "error",
    "El veredicto del sobre no es el que sale de aplicar la regla a lo medido",
    "The envelope's verdict is not the one that comes from applying the rule to what was measured",
  ),
  "sobre/veredicto-declarado-sin-razon": r(
    "error",
    "Una revisión de diseño la declara una persona y exige la razón",
    "A design review is declared by a person and requires the reason",
  ),
  "sobre/huella-no-cuadra": r(
    "error",
    "Una huella del sobre no es la que sale de su contenido: se editó después de sellarse",
    "A fingerprint of the envelope is not the one its content gives: it was edited after sealing",
  ),
  "sobre/crudo-demo-no-sintetico": r(
    "error",
    "La huella del crudo de un sobre demo debe ser la del crudo sintético declarado",
    "A demo envelope's raw fingerprint must be that of the declared synthetic raw",
  ),
  "sobre/confirmacion-anterior-a-la-corrida": r(
    "error",
    "La confirmación es anterior a la corrida que confirma",
    "The confirmation predates the run it confirms",
  ),
  "sobre/corrige-inexistente": r(
    "error",
    "El sobre dice corregir a otro que no existe en el libro",
    "The envelope says it corrects another that is not in the book",
  ),
  "sobre/corrige-otra-prueba": r(
    "error",
    "Un sobre solo corrige a otro de la misma prueba y del mismo activo",
    "An envelope only corrects another of the same test and the same asset",
  ),
  "sobre/anterior-al-plan": r(
    "advertencia",
    "La corrida es anterior a la fecha de emisión del plan que cita",
    "The run predates the issue date of the plan it cites",
  ),
  "sobre/demo-anterior-al-plan": r(
    "nota",
    "El sobre demo es anterior al plan que cita: conserva las fechas del mundo de la maqueta a propósito",
    "The demo envelope predates the plan it cites: it keeps the mockup world's dates on purpose",
  ),
  "sobre/extracto-marcado": r(
    "advertencia",
    "El filtro de contenido marcó un texto del sobre: una persona lo revisa (marca, no rechaza)",
    "The content filter flagged a text in the envelope: a person reviews it (it flags, it does not reject)",
  ),
  "sobre/sin-confirmar": r(
    "nota",
    "El sobre no está confirmado: es una propuesta y no cuenta",
    "The envelope is not confirmed: it is a proposal and does not count",
  ),
} as const;
export type IdReglaDeSobre = keyof typeof REGLAS_DE_SOBRE;
export type HallazgoDeSobre = HallazgoDeValidacion<IdReglaDeSobre>;

export interface ArchivoDeSobre {
  /** Ruta relativa a la raíz, con «/». */
  ruta: string;
  texto: string;
}

/** Lo que el validador necesita del catálogo: la regla de veredicto de cada prueba. */
export interface PruebaConocida {
  id: string;
  familia: string;
  regla: string;
}

/** El plan emitido de un activo y su paquete, ya verificados contra su huella por quien los cargó. */
export interface PlanDeActivo {
  plan: Plan;
  paquete: Paquete;
}

export interface ContextoDeEvidencia {
  pruebas: readonly PruebaConocida[];
  planes: Readonly<Record<string, PlanDeActivo>>;
  patrones?: readonly PatronCompilado[];
}

/** Un sobre válido con el archivo del que salió. */
export interface SobreConRuta {
  ruta: string;
  sobre: Sobre;
}

export interface ResultadoDeValidacionDeEvidencia {
  estado: EstadoDeValidacion;
  hallazgos: HallazgoDeSobre[];
  /** Solo los que pasaron la validación sin errores. */
  sobres: SobreConRuta[];
}

const CARPETA_PUBLICA = "datos/evidencia/";
const CARPETA_PRIVADA = "datos/privado/";

/** Cada prueba del paquete con la herramienta que la corre: es lo que el sobre tiene que cumplir. */
function pruebasDelPaquete(paquete: Paquete) {
  const mapa = new Map<
    string,
    {
      herramienta: string;
      version_minima: string | null;
      selector: unknown;
      k: number | null;
    }
  >();
  for (const h of paquete.herramientas)
    for (const p of h.pruebas)
      mapa.set(p.prueba, {
        herramienta: h.herramienta,
        version_minima: h.version_minima,
        selector: p.selector,
        k: p.k,
      });
  return mapa;
}

export async function validarEvidencia(
  archivos: readonly ArchivoDeSobre[],
  contexto: ContextoDeEvidencia,
): Promise<ResultadoDeValidacionDeEvidencia> {
  const hallazgos: HallazgoDeSobre[] = [];
  const agregar = (
    regla: IdReglaDeSobre,
    ruta: string,
    campo = "",
    detalle: TextoBilingue | null = null,
  ) => {
    const { severidad, nombre } = REGLAS_DE_SOBRE[regla];
    hallazgos.push({ regla, severidad, ruta, campo, nombre, detalle });
  };
  const sobres: SobreConRuta[] = [];
  const ids = new Map<string, string>();
  const pruebas = new Map(contexto.pruebas.map((p) => [p.id, p]));
  const delPaquete = new Map(
    Object.entries(contexto.planes).map(([activo, p]) => [
      activo,
      pruebasDelPaquete(p.paquete),
    ]),
  );
  // Primero se lee todo: «corrige» necesita ver el libro entero.
  const leidos: { ruta: string; sobre: Sobre }[] = [];

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
    const lectura = Sobre.safeParse(bruto);
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
    leidos.push({ ruta: archivo.ruta, sobre: lectura.data });
  }

  const porId = new Map(leidos.map((l) => [l.sobre.id, l.sobre]));
  for (const { ruta, sobre: s } of leidos) {
    const errores = hallazgos.filter((h) => h.severidad === "error").length;

    if (nombreDeArchivo(ruta) !== `${s.id}.json`)
      agregar(
        "archivo/nombre-no-coincide",
        ruta,
        "id",
        comillas(`${s.id}.json`),
      );
    const previa = ids.get(s.id);
    if (previa !== undefined)
      agregar("sobre/id-duplicado", ruta, "id", comillas(previa));
    else ids.set(s.id, ruta);

    if (ruta.startsWith(CARPETA_PUBLICA) && s.origen !== "demo")
      agregar("sobre/origen-no-demo-en-datos-publicos", ruta, "origen");
    // La carpeta decide dónde vive la evidencia: un demo en la carpeta privada saldría como público.
    if (ruta.startsWith(CARPETA_PRIVADA) && s.origen === "demo")
      agregar("sobre/demo-en-carpeta-privada", ruta, "origen");

    // El sobre contra el plan, el paquete y el catálogo.
    const emitido = contexto.planes[s.activo];
    if (emitido === undefined) {
      agregar("sobre/activo-sin-plan", ruta, "activo", comillas(s.activo));
    } else {
      if (s.plan.huella !== emitido.plan.huella)
        agregar("sobre/plan-no-cuadra", ruta, "plan.huella");
      if (s.paquete.huella !== emitido.plan.paquete.huella)
        agregar("sobre/paquete-no-cuadra", ruta, "paquete.huella");
      const delPlan = delPaquete.get(s.activo)?.get(s.prueba);
      if (delPlan === undefined) {
        agregar(
          "sobre/prueba-fuera-del-plan",
          ruta,
          "prueba",
          comillas(s.prueba),
        );
      } else {
        if (s.herramienta.id !== delPlan.herramienta)
          agregar(
            "sobre/herramienta-distinta-del-paquete",
            ruta,
            "herramienta.id",
            comillas(delPlan.herramienta),
          );
        else if (
          delPlan.version_minima !== null &&
          compararVersiones(s.herramienta.version, delPlan.version_minima) ===
            -1
        )
          agregar(
            "sobre/version-menor-que-la-minima",
            ruta,
            "herramienta.version",
            comillas(delPlan.version_minima),
          );
        if (s.k !== delPlan.k)
          agregar("sobre/k-distinto-del-paquete", ruta, "k");
        if (canonicalizar(s.selector) !== canonicalizar(delPlan.selector))
          agregar("sobre/selector-distinto-del-paquete", ruta, "selector");
      }
      if (s.fecha < emitido.plan.fecha_emision)
        agregar(
          s.origen === "demo" ? "sobre/demo-anterior-al-plan" : "sobre/anterior-al-plan",
          ruta,
          "fecha",
        );
    }
    const delCatalogo = pruebas.get(s.prueba);
    if (delCatalogo !== undefined && delCatalogo.regla !== s.regla)
      agregar(
        "sobre/regla-distinta-del-catalogo",
        ruta,
        "regla",
        comillas(delCatalogo.regla),
      );

    // El veredicto sale de la regla, nunca de quien registra el sobre.
    const calculo = calcularVeredicto(s.regla, s.resultado, s.k);
    if (calculo.tipo === "error") {
      agregar(
        "sobre/faltan-datos-de-la-regla",
        ruta,
        "resultado",
        comillas(calculo.motivo),
      );
    } else if (calculo.tipo === "calculado") {
      if (calculo.veredicto !== s.veredicto)
        agregar(
          "sobre/veredicto-no-es-el-de-la-regla",
          ruta,
          "veredicto",
          comillas(calculo.veredicto),
        );
    } else if (s.razon === null) {
      agregar("sobre/veredicto-declarado-sin-razon", ruta, "razon");
    }

    // Las huellas se recalculan: quien edite un sobre sellado la rompe.
    const sin = sinHuellas(s);
    if (s.huellas.sobre !== (await huellaDelSobre(sin)))
      agregar("sobre/huella-no-cuadra", ruta, "huellas.sobre");
    if (s.huellas.resultado !== (await huellaDelResultado(sin)))
      agregar("sobre/huella-no-cuadra", ruta, "huellas.resultado");
    if (
      s.origen === "demo" &&
      s.huellas.crudo !== (await huellaDelCrudoSintetico(s.id))
    )
      agregar("sobre/crudo-demo-no-sintetico", ruta, "huellas.crudo");

    if (s.confirmacion === null)
      agregar("sobre/sin-confirmar", ruta, "confirmacion");
    else if (s.confirmacion.fecha < s.fecha)
      agregar(
        "sobre/confirmacion-anterior-a-la-corrida",
        ruta,
        "confirmacion.fecha",
      );

    if (s.corrige !== null) {
      const otro = porId.get(s.corrige);
      if (otro === undefined || otro.id === s.id)
        agregar(
          "sobre/corrige-inexistente",
          ruta,
          "corrige",
          comillas(s.corrige),
        );
      else if (otro.prueba !== s.prueba || otro.activo !== s.activo)
        agregar(
          "sobre/corrige-otra-prueba",
          ruta,
          "corrige",
          comillas(s.corrige),
        );
    }

    // El filtro de contenido del S1 marca el texto libre; la persona decide (regla dura 3).
    if (contexto.patrones !== undefined)
      for (const marca of filtrar(
        {
          extracto: s.extracto_redactado,
          razon: s.razon,
          advertencias: s.advertencias,
        },
        [...contexto.patrones],
      ))
        agregar(
          "sobre/extracto-marcado",
          ruta,
          marca.campo,
          t(`patrón ${marca.patron}`, `pattern ${marca.patron}`),
        );

    if (hallazgos.filter((h) => h.severidad === "error").length === errores)
      sobres.push({ ruta, sobre: s });
  }

  ordenarHallazgos(hallazgos);
  return { estado: estadoDe(hallazgos), hallazgos, sobres };
}
