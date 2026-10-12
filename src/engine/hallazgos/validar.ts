// Validador de hallazgos: comprueba cada archivo contra el esquema y contra el libro (el sobre de origen existe,
// está confirmado y es una falla) y contra el catálogo (la entrada de severidad es la de la familia de la prueba).
// El motor no toca el disco: los textos llegan de `src/lib/evidencia/cargar-evidencia.ts`.
//
// «Cerrado» no se escribe: no existe en el archivo. Lo único que puede cerrar un hallazgo es la regla del ciclo.
import type { Sobre } from "../evidencia/esquemas.ts";
import {
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
} from "../evidencia/molde.ts";
import { VEREDICTOS_QUE_FALLAN } from "../evidencia/esquemas.ts";
import type { PruebaConocida } from "../evidencia/validar.ts";
import { comparar } from "../planificador/orden.ts";
import { Hallazgo } from "./esquemas.ts";

export const REGLAS_DE_HALLAZGO = {
  "archivo/json-invalido": r(
    "error",
    "El archivo no es JSON válido",
    "The file is not valid JSON",
  ),
  "esquema/campo-invalido": r(
    "error",
    "Un campo del hallazgo no cumple el esquema (o hay un campo que no existe, como un estado escrito a mano)",
    "A field of the finding does not meet the schema (or there is a field that does not exist, such as a hand-written status)",
  ),
  "archivo/nombre-no-coincide": r(
    "error",
    "El nombre del archivo no coincide con el id del hallazgo",
    "The file name does not match the finding id",
  ),
  "hallazgo/id-duplicado": r(
    "error",
    "Dos hallazgos tienen el mismo id",
    "Two findings share an id",
  ),
  "hallazgo/origen-no-demo-en-datos-publicos": r(
    "error",
    "Un hallazgo que no es demo está en una carpeta versionada: los reales viven en datos/privado/hallazgos/",
    "A non-demo finding is in a versioned folder: real ones live in datos/privado/hallazgos/",
  ),
  "hallazgo/demo-en-carpeta-privada": r(
    "error",
    "Un hallazgo demo está en datos/privado/: los demos viven en datos/hallazgos/demo/",
    "A demo finding is in datos/privado/: demo findings live in datos/hallazgos/demo/",
  ),
  "hallazgo/sobre-origen-inexistente": r(
    "error",
    "El sobre del que nace el hallazgo no existe en el libro",
    "The envelope the finding comes from is not in the book",
  ),
  "hallazgo/sobre-origen-sin-confirmar": r(
    "error",
    "El sobre del que nace el hallazgo no está confirmado: un sobre sin confirmar no abre nada",
    "The envelope the finding comes from is not confirmed: an unconfirmed envelope opens nothing",
  ),
  "hallazgo/sobre-origen-no-es-falla": r(
    "error",
    "Un hallazgo nace de un sobre «fallida» o «parcial»",
    "A finding comes from a “failed” or “partial” envelope",
  ),
  "hallazgo/origen-distinto-del-sobre": r(
    "error",
    "El origen del hallazgo (demo o propio) no es el de su sobre",
    "The finding's origin (demo or own) is not its envelope's",
  ),
  "hallazgo/severidad-no-es-la-de-la-familia": r(
    "error",
    "La entrada de severidad no es la de la familia de la prueba (CVSS para software, escala de IA para las demás)",
    "The severity input is not the test family's (CVSS for software, AI scale for the others)",
  ),
  "hallazgo/vector-invalido": r(
    "error",
    "El vector CVSS 4.0 no pasa el validador estricto",
    "The CVSS 4.0 vector does not pass the strict validator",
  ),
  "hallazgo/evento-anterior-a-la-apertura": r(
    "error",
    "Un evento es anterior a la apertura del hallazgo",
    "An event predates the opening of the finding",
  ),
  "hallazgo/eventos-fuera-de-orden": r(
    "error",
    "Los eventos no están en orden de fecha",
    "The events are not in date order",
  ),
  "hallazgo/reprueba-huerfana": r(
    "error",
    "Un sobre dice re-probar un hallazgo que no existe",
    "An envelope says it re-tests a finding that does not exist",
  ),
} as const;
export type IdReglaDeHallazgo = keyof typeof REGLAS_DE_HALLAZGO;
export type HallazgoDeValidacionDeHallazgo =
  HallazgoDeValidacion<IdReglaDeHallazgo>;

export interface ArchivoDeHallazgo {
  ruta: string;
  texto: string;
}

export interface ContextoDeHallazgos {
  /** El libro ya validado, con la ruta de cada sobre. */
  libro: readonly { ruta: string; sobre: Sobre }[];
  pruebas: readonly PruebaConocida[];
  /** Devuelve el motivo si el vector CVSS no pasa el validador estricto, o null si pasa. */
  vectorInvalido?: (vector: string) => string | null;
}

export interface ResultadoDeValidacionDeHallazgos {
  estado: EstadoDeValidacion;
  hallazgos: HallazgoDeValidacionDeHallazgo[];
  validos: Hallazgo[];
}

const CARPETA_PUBLICA = "datos/hallazgos/";
const CARPETA_PRIVADA = "datos/privado/";
/** La familia que se mide con CVSS 4.0; las otras usan la tabla de prioridad de IA (regla dura 7). */
export const FAMILIA_CON_CVSS = "software";

export function validarHallazgos(
  archivos: readonly ArchivoDeHallazgo[],
  contexto: ContextoDeHallazgos,
): ResultadoDeValidacionDeHallazgos {
  const hallazgos: HallazgoDeValidacionDeHallazgo[] = [];
  const agregar = (
    regla: IdReglaDeHallazgo,
    ruta: string,
    campo = "",
    detalle: TextoBilingue | null = null,
  ) => {
    const { severidad, nombre } = REGLAS_DE_HALLAZGO[regla];
    hallazgos.push({ regla, severidad, ruta, campo, nombre, detalle });
  };
  const validos: Hallazgo[] = [];
  const ids = new Map<string, string>();
  const sobres = new Map(contexto.libro.map((l) => [l.sobre.id, l.sobre]));
  const pruebas = new Map(contexto.pruebas.map((p) => [p.id, p]));
  const idsDeHallazgo = new Set<string>();
  const leidos: { ruta: string; h: Hallazgo }[] = [];

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
    const lectura = Hallazgo.safeParse(bruto);
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
    leidos.push({ ruta: archivo.ruta, h: lectura.data });
    idsDeHallazgo.add(lectura.data.id);
  }

  for (const { ruta, h } of leidos) {
    const errores = hallazgos.filter((x) => x.severidad === "error").length;
    if (nombreDeArchivo(ruta) !== `${h.id}.json`)
      agregar(
        "archivo/nombre-no-coincide",
        ruta,
        "id",
        comillas(`${h.id}.json`),
      );
    const previa = ids.get(h.id);
    if (previa !== undefined)
      agregar("hallazgo/id-duplicado", ruta, "id", comillas(previa));
    else ids.set(h.id, ruta);

    if (ruta.startsWith(CARPETA_PUBLICA) && h.origen !== "demo")
      agregar("hallazgo/origen-no-demo-en-datos-publicos", ruta, "origen");
    if (ruta.startsWith(CARPETA_PRIVADA) && h.origen === "demo")
      agregar("hallazgo/demo-en-carpeta-privada", ruta, "origen");

    const origen = sobres.get(h.sobre_origen);
    if (origen === undefined) {
      agregar(
        "hallazgo/sobre-origen-inexistente",
        ruta,
        "sobre_origen",
        comillas(h.sobre_origen),
      );
    } else {
      if (origen.confirmacion === null)
        agregar(
          "hallazgo/sobre-origen-sin-confirmar",
          ruta,
          "sobre_origen",
          comillas(origen.id),
        );
      if (
        !(VEREDICTOS_QUE_FALLAN as readonly string[]).includes(origen.veredicto)
      )
        agregar(
          "hallazgo/sobre-origen-no-es-falla",
          ruta,
          "sobre_origen",
          comillas(origen.id),
        );
      if (origen.origen !== h.origen)
        agregar("hallazgo/origen-distinto-del-sobre", ruta, "origen");
      const familia = pruebas.get(origen.prueba)?.familia;
      if (familia !== undefined) {
        const esperada = familia === FAMILIA_CON_CVSS ? "cvss" : "escala_ia";
        if (h.severidad.tipo !== esperada)
          agregar(
            "hallazgo/severidad-no-es-la-de-la-familia",
            ruta,
            "severidad.tipo",
            comillas(esperada),
          );
      }
      if (
        h.severidad.tipo === "cvss" &&
        contexto.vectorInvalido !== undefined
      ) {
        const motivo = contexto.vectorInvalido(h.severidad.vector);
        if (motivo !== null)
          agregar(
            "hallazgo/vector-invalido",
            ruta,
            "severidad.vector",
            t(motivo, motivo),
          );
      }
      const apertura = origen.confirmacion?.fecha ?? origen.fecha;
      let anterior = apertura;
      for (const [i, e] of h.eventos.entries()) {
        if (e.fecha < apertura)
          agregar(
            "hallazgo/evento-anterior-a-la-apertura",
            ruta,
            `eventos.${i}.fecha`,
          );
        else if (e.fecha < anterior)
          agregar(
            "hallazgo/eventos-fuera-de-orden",
            ruta,
            `eventos.${i}.fecha`,
          );
        anterior = e.fecha > anterior ? e.fecha : anterior;
      }
    }
    if (hallazgos.filter((x) => x.severidad === "error").length === errores)
      validos.push(h);
  }

  // Una re-prueba que cita un hallazgo que no existe: el libro lo sabe y el hallazgo no está.
  for (const { ruta, sobre } of contexto.libro)
    if (sobre.reprueba_de !== null && !idsDeHallazgo.has(sobre.reprueba_de))
      agregar(
        "hallazgo/reprueba-huerfana",
        ruta,
        "reprueba_de",
        comillas(sobre.reprueba_de),
      );

  ordenarHallazgos(hallazgos);
  return { estado: estadoDe(hallazgos), hallazgos, validos };
}
