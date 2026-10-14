// Lee del disco lo que las propuestas necesitan: los umbrales del plan, los patrones de instrucciones, las corridas selladas (las de
// demostración, versionadas en `propuestas/demo/`, y las reales, en `propuestas/corridas/`), las lecturas de páginas y el libro de
// decisiones. Es la única pieza de las propuestas que toca el sistema de archivos: el motor recibe objetos y no sabe de dónde vinieron.
// Se ejecuta en el build y en el CLI (Node), jamás en el navegador.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { PatronesDelFiltro } from "../../engine/catalogo/esquemas.ts";
import {
  compilarPatrones,
  type PatronCompilado,
} from "../../engine/catalogo/filtro.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { huella } from "../../engine/huella.ts";
import { EtiquetasDePropuestas } from "../../engine/propuestas/etiquetas.ts";
import { SemillasDeAgentes } from "../../engine/propuestas/semillas.ts";
import {
  Aportes,
  Borrador,
  Consulta,
  Corrida,
  Decision,
  UmbralesDePropuestas,
  type Aporte,
} from "../../engine/propuestas/esquemas.ts";
import type { Lecturas } from "../../engine/propuestas/fuentes.ts";
import type {
  ContextoDeVerificacion,
  DatosDeMarco,
  DatosDePrueba,
} from "../../engine/propuestas/verificar.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";

/** Dónde viven las corridas: las de demostración son datos públicos; las reales las escriben las skills. */
export const CARPETA_DE_DEMO = "propuestas/demo";
export const CARPETA_DE_CORRIDAS = "propuestas/corridas";
/** Las páginas que el investigador leyó: ignoradas por git. Solo viaja la huella y el pasaje citado (ADR-011). */
export const CARPETA_DE_LECTURAS = "propuestas/.lecturas";
/** Las lecturas sintéticas de las propuestas demo: el kit de prueba, para que la CI las re-verifique sin red. */
export const CARPETA_DE_LECTURAS_DEMO =
  "docs/kit-de-prueba/propuestas-demo/lecturas";
export const LIBRO_DE_DECISIONES = "datos/propuestas/decisiones.jsonl";

const leerJson = (raiz: string, relativa: string): unknown =>
  JSON.parse(readFileSync(join(raiz, relativa), "utf8")) as unknown;

export const cargarUmbralesDePropuestas = (
  raiz: string = process.cwd(),
): UmbralesDePropuestas =>
  UmbralesDePropuestas.parse(leerJson(raiz, "datos/propuestas/umbrales.json"));

function compilar(datos: unknown, donde: string): PatronCompilado[] {
  const { patrones, problemas } = compilarPatrones(
    PatronesDelFiltro.parse(datos),
  );
  if (problemas.length > 0)
    throw new Error(
      `los patrones de ${donde} no cumplen sus carnadas y contraejemplos: ${problemas.map((p) => `${p.patron} (${p.regla})`).join("; ")} / the patterns of ${donde} do not meet their bait and counter-examples`,
    );
  return patrones;
}

/** Las etiquetas de estado de la bandeja (`datos/propuestas/etiquetas.json`): rol y símbolo salen de datos (regla dura 12). */
export const cargarEtiquetasDePropuestas = (
  raiz: string = process.cwd(),
): EtiquetasDePropuestas =>
  EtiquetasDePropuestas.parse(
    leerJson(raiz, "datos/propuestas/etiquetas.json"),
  );

/** Las semillas S1 y S2 de los agentes: el kit de prueba del repo, comprobado contra su esquema. */
export const cargarSemillasDeAgentes = (
  raiz: string = process.cwd(),
): SemillasDeAgentes =>
  SemillasDeAgentes.parse(
    leerJson(raiz, "docs/kit-de-prueba/semillas-de-agentes/semillas.json"),
  );

export const cargarPatronesDeInstrucciones = (
  raiz: string = process.cwd(),
): PatronCompilado[] =>
  compilar(
    leerJson(raiz, "datos/propuestas/instrucciones.json"),
    "datos/propuestas/instrucciones.json",
  );

export const cargarPatronesDeContenido = (
  raiz: string = process.cwd(),
): PatronCompilado[] =>
  compilar(
    leerJson(raiz, "datos/filtro/patrones.json"),
    "datos/filtro/patrones.json",
  );

/** El texto de una página o de un texto pegado, por su huella: de `propuestas/.lecturas/` o de las lecturas demo del kit. */
export function lecturasDeDisco(raiz: string = process.cwd()): Lecturas {
  return (huellaDeLaPagina) => {
    if (!/^[0-9a-f]{64}$/.test(huellaDeLaPagina)) return undefined;
    for (const carpeta of [CARPETA_DE_LECTURAS, CARPETA_DE_LECTURAS_DEMO]) {
      const archivo = join(raiz, carpeta, `${huellaDeLaPagina}.txt`);
      if (existsSync(archivo)) return readFileSync(archivo, "utf8");
    }
    return undefined;
  };
}

/** Los hosts de una lista de direcciones: la lista blanca de una herramienta es su sitio oficial, su registro y su repositorio. */
const hostsDe = (urls: (string | undefined)[]): string[] => [
  ...new Set(
    urls.flatMap((u) => {
      try {
        return u === undefined ? [] : [new URL(u).hostname.toLowerCase()];
      } catch {
        return [];
      }
    }),
  ),
];

/** Lo que el sellado y los avisos de versión saben de cada marco del catálogo. */
export const datosDeMarcos = (
  instantanea: Instantanea,
): Map<string, DatosDeMarco> =>
  new Map(
    instantanea.catalogo.marcos.map((m) => [
      m.id,
      {
        version_vigente: m.version_vigente,
        fecha_version: m.fecha_version,
        lista_blanca: m.lista_blanca_de_fuentes,
      },
    ]),
  );

/** Todo lo que el sellado necesita del mundo, armado desde la instantánea oficial y los activos con plan. */
export function contextoDeVerificacion(
  instantanea: Instantanea,
  activos: MundoDeActivos,
  raiz: string = process.cwd(),
): ContextoDeVerificacion {
  const c = instantanea.catalogo;
  const marcos = datosDeMarcos(instantanea);
  const pruebas = new Map<string, DatosDePrueba>(
    c.pruebas.map((p) => [
      p.id,
      {
        regla: p.criterio_de_veredicto.regla,
        k: p.criterio_de_veredicto.repeticiones_k ?? null,
        marco_id: p.marco_id,
      },
    ]),
  );
  const herramientas = new Map(
    c.herramientas.map((h) => [
      h.id,
      {
        lista_blanca: hostsDe([h.fuente.url, h.registro?.url, h.repositorio]),
      },
    ]),
  );
  const planes = new Map<string, ReadonlySet<string>>(
    activos.activos.flatMap((a) =>
      a.plan === null
        ? []
        : [
            [
              a.activo.id,
              new Set(a.plan.planeadas.map((p) => p.prueba)),
            ] as const,
          ],
    ),
  );
  return {
    umbrales: cargarUmbralesDePropuestas(raiz),
    marcos,
    herramientas,
    pruebas,
    planes,
    patronesDeContenido: cargarPatronesDeContenido(raiz),
    patronesDeInstrucciones: cargarPatronesDeInstrucciones(raiz),
    lecturas: lecturasDeDisco(raiz),
  };
}

export interface CorridaCargada {
  corrida: Corrida;
  /** La carpeta de la corrida, relativa a la raíz. */
  carpeta: string;
  /** `demo` si vive en `propuestas/demo/`: sus efectos exigen `--aplicar-a-demo`. */
  lugar: "demo" | "real";
  /** Los documentos que una persona aportó a esta corrida porque una fuente no se pudo leer (RF-07.2b). */
  aportes: Aporte[];
}

export interface ProblemaDeCarga {
  ruta: string;
  detalle: string;
}

/** Las subcarpetas de una carpeta, en orden. */
function subcarpetas(raiz: string, relativa: string): string[] {
  const absoluta = join(raiz, relativa);
  if (!existsSync(absoluta)) return [];
  return readdirSync(absoluta, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * Las corridas selladas de `propuestas/demo/` y `propuestas/corridas/`. Una que no cumple su esquema, o cuya huella no es la de su
 * contenido (alguien la editó a mano), va a `problemas`: nunca se muestra para aprobar.
 */
export async function cargarCorridas(
  raiz: string = process.cwd(),
): Promise<{ corridas: CorridaCargada[]; problemas: ProblemaDeCarga[] }> {
  const corridas: CorridaCargada[] = [];
  const problemas: ProblemaDeCarga[] = [];
  for (const [base, lugar] of [
    [CARPETA_DE_DEMO, "demo"],
    [CARPETA_DE_CORRIDAS, "real"],
  ] as const) {
    for (const nombre of subcarpetas(raiz, base)) {
      const carpeta = `${base}/${nombre}`;
      const archivo = join(raiz, carpeta, "corrida.json");
      if (!existsSync(archivo)) continue;
      let crudo: unknown;
      try {
        crudo = JSON.parse(readFileSync(archivo, "utf8")) as unknown;
      } catch {
        problemas.push({
          ruta: `${carpeta}/corrida.json`,
          detalle: "no es un JSON válido",
        });
        continue;
      }
      const lectura = Corrida.safeParse(crudo);
      if (!lectura.success) {
        problemas.push({
          ruta: `${carpeta}/corrida.json`,
          detalle: lectura.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
        continue;
      }
      const { huella: declarada, ...cuerpo } = lectura.data;
      if ((await huella(cuerpo)) !== declarada) {
        problemas.push({
          ruta: `${carpeta}/corrida.json`,
          detalle:
            "su huella no es la de su contenido: se editó después de sellarla",
        });
        continue;
      }
      let aportes: Aporte[] = [];
      try {
        aportes = cargarAportes(raiz, carpeta);
      } catch (e) {
        problemas.push({
          ruta: `${carpeta}/aportes.json`,
          detalle:
            e instanceof Error && e.message.startsWith(MENSAJE_DE_OTRA_CORRIDA)
              ? e.message
              : "no cumple su esquema o no es un JSON válido",
        });
        continue;
      }
      corridas.push({ corrida: lectura.data, carpeta, lugar, aportes });
    }
  }
  corridas.sort((a, b) =>
    (a.corrida.propuestas[0]?.id ?? "") < (b.corrida.propuestas[0]?.id ?? "")
      ? -1
      : 1,
  );
  return { corridas, problemas };
}

const MENSAJE_DE_OTRA_CORRIDA = "aportes.json es de otra corrida";

/** El borrador que escribió el modelo y la consulta que escribió el código, de una carpeta de corrida. */
export function cargarBorrador(raiz: string, carpeta: string): Borrador {
  return Borrador.parse(leerJson(raiz, `${carpeta}/propuesta.json`));
}

/** Los documentos que una persona aportó a una corrida (RF-07.2b); vacío si no hay `aportes.json`. */
export function cargarAportes(raiz: string, carpeta: string): Aporte[] {
  const ruta = join(raiz, carpeta, "aportes.json");
  if (!existsSync(ruta)) return [];
  const leidos = Aportes.parse(
    JSON.parse(readFileSync(ruta, "utf8")) as unknown,
  );
  // Un aportes.json copiado a otra corrida se rechaza: lo aportado es de la corrida que lo nombra, no de la carpeta donde cayó.
  if (leidos.corrida !== basename(carpeta))
    throw new Error(
      `${MENSAJE_DE_OTRA_CORRIDA} (${leidos.corrida}, no ${basename(carpeta)})`,
    );
  return leidos.aportes;
}

export function cargarConsulta(raiz: string, carpeta: string): Consulta | null {
  const ruta = join(raiz, carpeta, "consulta.json");
  return existsSync(ruta)
    ? Consulta.parse(JSON.parse(readFileSync(ruta, "utf8")) as unknown)
    : null;
}

/** El libro de decisiones: un JSON por línea, de solo agregar. Una línea que no cumple su esquema detiene la carga. */
export function cargarDecisiones(raiz: string = process.cwd()): Decision[] {
  const ruta = join(raiz, LIBRO_DE_DECISIONES);
  if (!existsSync(ruta)) return [];
  return readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((linea, i) => {
      const lectura = Decision.safeParse(JSON.parse(linea) as unknown);
      if (!lectura.success)
        throw new Error(
          `${LIBRO_DE_DECISIONES}:${i + 1}: ${lectura.error.issues.map((p) => `${p.path.join(".")}: ${p.message}`).join("; ")}`,
        );
      return lectura.data;
    });
}
