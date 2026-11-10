// Decidir qué se lanza (S12, D11). Función PURA: no abre archivos, no lanza procesos, no mira el reloj ni el PATH. Recibe el activo,
// su plan, la fecha, el objetivo y lo que el CLI averiguó del equipo (dónde están instaladas las herramientas), y devuelve las
// órdenes que se pueden lanzar o los rechazos con su guarda. El lanzamiento vive SOLO en `src/cli/ejecutor.ts`: la web no importa
// esta carpeta (hay un test de frontera).
//
// Las guardas se evalúan SIEMPRE, también sin `--ejecutar`: el ensayo enseña los rechazos tal como los viviría la corrida real.
// Un rechazo de activo (guardas 1-6) detiene todo; una herramienta que no se puede lanzar (guardas 7-10) se omite con su razón.
// El ejecutor NO lee la configuración de la herramienta: lo que la configuración del usuario apunte es responsabilidad del usuario;
// lo que sí hace es exigir `--objetivo`, compararlo con `alcance.objetivos` y pasárselo a la herramienta (argumento o entorno).
import type { Activo } from "../activos/esquemas.ts";
import { estaAutorizado } from "../activos/esquemas.ts";
import type { Texto } from "../catalogo/esquemas.ts";
import type { Paquete } from "../planificador/esquemas.ts";
import type { TablaDeComandos } from "./esquemas.ts";
import {
  esObjetivoNormal,
  hostEsDe,
  normalizarObjetivo,
  objetivoEnAlcance,
  textoDeObjetivo,
} from "./objetivo.ts";

export const GUARDAS = [
  "activo_demo",
  "sin_autorizacion",
  "sin_plan",
  "plan_desactualizado",
  "sin_vigencia",
  "autorizacion_vencida",
  "sin_objetivos_autorizados",
  "objetivo_invalido",
  "objetivo_fuera_de_alcance",
  "infraestructura_de_terceros",
  "herramienta_fuera_del_paquete",
  "sin_adaptador",
  "sin_comando",
  "sin_configuracion",
  "no_instalada",
] as const;
export type Guarda = (typeof GUARDAS)[number];

export interface Rechazo {
  guarda: Guarda;
  /** La herramienta afectada, si la guarda es de una herramienta. */
  herramienta: string | null;
  mensaje: Texto;
}

export interface Orden {
  herramienta: string;
  version_minima: string | null;
  /** Ruta absoluta del ejecutable (resuelta por el CLI; el motor no mira el PATH). */
  ejecutable: string;
  argumentos: string[];
  /** Nombre del archivo que escribe la herramienta dentro de la carpeta, o null = el único .json. */
  salida: string | null;
  entorno: Record<string, string>;
  pruebas: string[];
}

export interface EntradaDeEjecucion {
  activo: Activo;
  /** `origen` según la carpeta donde vive el archivo del activo (null = no se encontró). */
  origenDeLaCarpeta: "demo" | "propio" | null;
  plan: { paquete: Paquete; huellaDelActivoVigente: string } | null;
  /** Fecha de la corrida (entrada, jamás el reloj). */
  fecha: string;
  objetivo: string;
  /** `--config herramienta=ruta`. */
  configuraciones: Readonly<Record<string, string>>;
  /** `--herramienta`: si se da, solo esas. */
  soloEstas: readonly string[];
  tabla: TablaDeComandos;
  /** Dónde está instalada cada herramienta (ruta absoluta) o null. */
  instaladas: Readonly<Record<string, string | null>>;
  /** Las herramientas que tienen adaptador (para leer su salida). */
  conAdaptador: ReadonlySet<string>;
  /** Carpeta temporal de la corrida (o un texto que la represente en el ensayo). */
  carpeta: string;
}

export type Decision =
  | { ok: false; rechazos: Rechazo[] }
  | { ok: true; objetivo: string; ordenes: Orden[]; omitidas: Rechazo[] };

const t = (es: string, en: string): Texto => ({ es, en });

export function decidirEjecucion(x: EntradaDeEjecucion): Decision {
  const { activo } = x;
  const rechazos: Rechazo[] = [];
  const rechazar = (guarda: Guarda, mensaje: Texto) =>
    rechazos.push({ guarda, herramienta: null, mensaje });

  // 1. Un activo demo jamás se ataca: por su origen o por su carpeta, lo que diga «demo» gana; si no coinciden, se rechaza igual.
  if (
    activo.origen === "demo" ||
    x.origenDeLaCarpeta === "demo" ||
    x.origenDeLaCarpeta === null ||
    activo.origen !== x.origenDeLaCarpeta
  )
    rechazar(
      "activo_demo",
      t(
        `«${activo.id}» es un activo demo (o su origen no cuadra con su carpeta): el ejecutor solo corre contra un activo propio de datos/privado/activos/.`,
        `“${activo.id}” is a demo asset (or its origin does not match its folder): the executor only runs against an own asset in datos/privado/activos/.`,
      ),
    );
  // 2. Sin alcance autorizado y reglas de enfrentamiento no hay nada que lanzar (regla dura 5).
  if (!estaAutorizado(activo))
    rechazar(
      "sin_autorizacion",
      t(
        "El activo no tiene alcance autorizado y reglas de enfrentamiento.",
        "The asset has no authorized scope and rules of engagement.",
      ),
    );
  // 3. El plan existe y es el de este activo tal como está hoy: las herramientas salen del paquete, el alcance del archivo.
  if (x.plan === null)
    rechazar(
      "sin_plan",
      t(
        "El activo no tiene plan emitido: pnpm plan:emitir primero.",
        "The asset has no issued plan: run pnpm plan:emitir first.",
      ),
    );
  else if (x.plan.paquete.activo.huella !== x.plan.huellaDelActivoVigente)
    rechazar(
      "plan_desactualizado",
      t(
        "El plan se emitió con una versión anterior del activo: vuelve a emitirlo (pnpm plan:emitir) antes de correr nada.",
        "The plan was issued with an earlier version of the asset: issue it again (pnpm plan:emitir) before running anything.",
      ),
    );
  // 4. La autorización tiene vigencia, y la fecha de la corrida está dentro (inclusive).
  const alcance = activo.alcance;
  if (alcance !== null) {
    if (alcance.vigente_hasta === undefined)
      rechazar(
        "sin_vigencia",
        t(
          "El alcance no declara vigente_hasta: sin una fecha de fin de la autorización el ejecutor no corre.",
          "The scope declares no vigente_hasta: without an end date for the authorization the executor does not run.",
        ),
      );
    else if (x.fecha > alcance.vigente_hasta)
      rechazar(
        "autorizacion_vencida",
        t(
          `La autorización venció el ${alcance.vigente_hasta} y la corrida es del ${x.fecha}.`,
          `The authorization expired on ${alcance.vigente_hasta} and the run is on ${x.fecha}.`,
        ),
      );
    // 5. El objetivo: normalizado y comparado EXACTO con lo autorizado.
    if (alcance.objetivos === undefined)
      rechazar(
        "sin_objetivos_autorizados",
        t(
          "El alcance no declara objetivos (URL autorizadas): el ejecutor no adivina qué se puede atacar.",
          "The scope declares no objetivos (authorized URLs): the executor does not guess what may be attacked.",
        ),
      );
  }
  const objetivo = normalizarObjetivo(x.objetivo);
  let canonico = "";
  if (!esObjetivoNormal(objetivo))
    rechazar(
      "objetivo_invalido",
      t(
        `El objetivo «${x.objetivo}» no es una URL http(s) simple (${objetivo.invalido}): sin credenciales, consulta ni fragmento.`,
        `The target “${x.objetivo}” is not a plain http(s) URL (${objetivo.invalido}): no credentials, query or fragment.`,
      ),
    );
  else {
    canonico = textoDeObjetivo(objetivo);
    if (
      alcance !== null &&
      alcance.objetivos !== undefined &&
      !objetivoEnAlcance(objetivo, alcance.objetivos)
    )
      rechazar(
        "objetivo_fuera_de_alcance",
        t(
          `El objetivo ${canonico} no está entre los autorizados del alcance.`,
          `The target ${canonico} is not among the authorized targets of the scope.`,
        ),
      );
    // 6. Infraestructura de terceros (E-24): ni aunque alguien la haya escrito en el alcance.
    if (hostEsDe(objetivo.host, x.tabla.infraestructura_de_terceros.dominios))
      rechazar(
        "infraestructura_de_terceros",
        t(
          `${objetivo.host} es infraestructura de un tercero (proveedor de modelos o nube): nada se prueba contra ella (E-24).`,
          `${objetivo.host} is third-party infrastructure (model provider or cloud): nothing is tested against it (E-24).`,
        ),
      );
  }
  if (rechazos.length > 0) return { ok: false, rechazos };

  // Guardas por herramienta (7-11): una que no se puede lanzar se omite con su razón y no detiene a las demás.
  const paquete = x.plan!.paquete;
  const omitidas: Rechazo[] = [];
  const ordenes: Orden[] = [];
  const omitir = (herramienta: string, guarda: Guarda, mensaje: Texto) =>
    omitidas.push({ guarda, herramienta, mensaje });
  for (const pedida of x.soloEstas)
    if (!paquete.herramientas.some((h) => h.herramienta === pedida))
      omitir(
        pedida,
        "herramienta_fuera_del_paquete",
        t(
          `«${pedida}» no está en el paquete del plan de este activo.`,
          `“${pedida}” is not in this asset's plan package.`,
        ),
      );
  for (const grupo of paquete.herramientas) {
    const id = grupo.herramienta;
    if (x.soloEstas.length > 0 && !x.soloEstas.includes(id)) continue;
    if (!x.conAdaptador.has(id)) {
      omitir(
        id,
        "sin_adaptador",
        t(
          `«${id}» no tiene adaptador: su salida no se podría leer.`,
          `“${id}” has no adapter: its output could not be read.`,
        ),
      );
      continue;
    }
    const comando = x.tabla.herramientas[id] ?? null;
    if (comando === null) {
      omitir(
        id,
        "sin_comando",
        t(
          `«${id}» no tiene comando de lanzamiento en datos/ejecutor/comandos.json: córrela tú y usa evidencia:importar.`,
          `“${id}” has no launch command in datos/ejecutor/comandos.json: run it yourself and use evidencia:importar.`,
        ),
      );
      continue;
    }
    const usaConfig = comando.argumentos.some((a) => a.includes("{config}"));
    const config = x.configuraciones[id];
    if (usaConfig && (config === undefined || config === "")) {
      omitir(
        id,
        "sin_configuracion",
        t(
          `Falta la configuración de «${id}»: --config ${id}=<ruta>. El repo no trae configuraciones de ataque; la tuya es la que se usa.`,
          `The configuration for “${id}” is missing: --config ${id}=<path>. The repo ships no attack configurations; yours is the one used.`,
        ),
      );
      continue;
    }
    const ejecutable = x.instaladas[id] ?? null;
    if (ejecutable === null) {
      omitir(
        id,
        "no_instalada",
        t(
          `«${comando.ejecutable}» no está instalada en tu PATH: HackGuard no instala herramientas.`,
          `“${comando.ejecutable}” is not installed on your PATH: HackGuard does not install tools.`,
        ),
      );
      continue;
    }
    const salida = comando.salida;
    const puesto = (a: string) =>
      a
        .replaceAll("{config}", config ?? "")
        .replaceAll("{objetivo}", canonico)
        .replaceAll("{carpeta}", x.carpeta)
        .replaceAll("{salida}", `${x.carpeta}/${salida ?? ""}`);
    ordenes.push({
      herramienta: id,
      version_minima: grupo.version_minima,
      ejecutable,
      argumentos: comando.argumentos.map(puesto),
      salida,
      entorno: { [x.tabla.objetivo_en_el_entorno]: canonico },
      pruebas: grupo.pruebas.map((p) => p.prueba),
    });
  }
  return { ok: true, objetivo: canonico, ordenes, omitidas };
}
