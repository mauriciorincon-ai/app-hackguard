// Lee del disco lo que el libro de evidencia necesita: los sobres y los hallazgos (los demo versionados en
// `datos/evidencia/demo/` y `datos/hallazgos/demo/`, y los propios, ignorados por git, en `datos/privado/`), los
// planes emitidos que los sobres citan y los datos que gobiernan a los hallazgos. Es la única pieza de la evidencia
// que toca el sistema de archivos: el motor recibe textos y objetos y no sabe de dónde vinieron. Las rutas salen
// relativas a la raíz y con «/».
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { huella } from "../../engine/huella.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import type {
  ArchivoDeSobre,
  PlanDeActivo,
  PruebaConocida,
} from "../../engine/evidencia/validar.ts";
import type { ArchivoDeHallazgo } from "../../engine/hallazgos/validar.ts";
import {
  EtiquetasDeHallazgo,
  Plazos,
} from "../../engine/hallazgos/esquemas.ts";
import { Paquete, Plan } from "../../engine/planificador/esquemas.ts";
import {
  EscalaIa,
  validarEscalaIa,
} from "../../engine/severidad/escala-ia.ts";
import {
  EtiquetasDeCvss,
  validarEtiquetasDeCvss,
} from "../../engine/severidad/etiquetas-cvss.ts";

/** Dónde viven los sobres y los hallazgos: la primera carpeta es pública y solo admite demos (regla dura 8). */
export const CARPETA_DE_SOBRES_DEMO = "datos/evidencia/demo";
export const CARPETA_DE_SOBRES_PRIVADA = "datos/privado/evidencia";
export const CARPETA_DE_HALLAZGOS_DEMO = "datos/hallazgos/demo";
export const CARPETA_DE_HALLAZGOS_PRIVADA = "datos/privado/hallazgos";
const CARPETAS_DE_PLANES = ["datos/planes", "datos/privado/planes"] as const;

function jsonsDe(
  raiz: string,
  relativa: string,
): { ruta: string; texto: string }[] {
  const absoluta = path.join(raiz, relativa);
  if (!existsSync(absoluta)) return [];
  const archivos: { ruta: string; texto: string }[] = [];
  for (const nombre of readdirSync(absoluta).sort()) {
    const hijo = path.join(absoluta, nombre);
    const ruta = `${relativa}/${nombre}`;
    if (statSync(hijo).isDirectory()) archivos.push(...jsonsDe(raiz, ruta));
    else if (nombre.endsWith(".json"))
      archivos.push({ ruta, texto: readFileSync(hijo, "utf8") });
  }
  return archivos;
}

export const cargarSobres = (raiz: string): ArchivoDeSobre[] => [
  ...jsonsDe(raiz, CARPETA_DE_SOBRES_DEMO),
  ...jsonsDe(raiz, CARPETA_DE_SOBRES_PRIVADA),
];
export const cargarHallazgos = (raiz: string): ArchivoDeHallazgo[] => [
  ...jsonsDe(raiz, CARPETA_DE_HALLAZGOS_DEMO),
  ...jsonsDe(raiz, CARPETA_DE_HALLAZGOS_PRIVADA),
];
/** Solo los versionados (demo): lo único que las pantallas del build leen. Lo propio no sale de la CLI. */
export const cargarSobresPublicos = (raiz: string): ArchivoDeSobre[] =>
  jsonsDe(raiz, CARPETA_DE_SOBRES_DEMO);
export const cargarHallazgosPublicos = (raiz: string): ArchivoDeHallazgo[] =>
  jsonsDe(raiz, CARPETA_DE_HALLAZGOS_DEMO);

function leerJson(raiz: string, relativa: string): unknown {
  return JSON.parse(readFileSync(path.join(raiz, relativa), "utf8")) as unknown;
}

export const cargarPlazos = (raiz: string): Plazos =>
  Plazos.parse(leerJson(raiz, "datos/hallazgos/plazos.json"));
/** La tabla de severidad de IA, validada: una que viola su piso o su techo no se carga (regla dura 7). */
export function cargarEscalaIa(raiz: string): EscalaIa {
  const ruta = "datos/severidad/escala-ia.json";
  const escala = EscalaIa.parse(leerJson(raiz, ruta));
  const { hallazgos } = validarEscalaIa(escala, ruta);
  const errores = hallazgos.filter((h) => h.severidad === "error");
  if (errores.length > 0)
    throw new Error(
      `${ruta}: ${errores.map((h) => `${h.regla}${h.detalle === null ? "" : ` (${h.detalle.es})`}`).join("; ")}`,
    );
  return escala;
}
/** Los nombres de las métricas de CVSS 4.0, validados contra la tabla del validador estricto. */
export function cargarEtiquetasDeCvss(raiz: string): EtiquetasDeCvss {
  const ruta = "datos/severidad/cvss-etiquetas.json";
  const etiquetas = EtiquetasDeCvss.parse(leerJson(raiz, ruta));
  const errores = validarEtiquetasDeCvss(etiquetas, ruta).hallazgos.filter(
    (h) => h.severidad === "error",
  );
  if (errores.length > 0)
    throw new Error(
      `${ruta}: ${errores.map((h) => `${h.regla}${h.detalle === null ? "" : ` (${h.detalle.es})`}`).join("; ")}`,
    );
  return etiquetas;
}
export const cargarEtiquetasDeHallazgo = (raiz: string): EtiquetasDeHallazgo =>
  EtiquetasDeHallazgo.parse(leerJson(raiz, "datos/hallazgos/etiquetas.json"));

/**
 * Los planes emitidos de los activos, con su paquete, verificados contra su huella: un plan o un paquete editados
 * a mano rompen la carga (más vale un error que un sobre validado contra un plan que nadie puede reproducir).
 * La clave es el id del activo; si un activo está en las dos carpetas manda la privada.
 */
export async function cargarPlanesEmitidos(
  raiz: string,
  { privados = true }: { privados?: boolean } = {},
): Promise<Record<string, PlanDeActivo>> {
  const planes: Record<string, PlanDeActivo> = {};
  for (const carpeta of CARPETAS_DE_PLANES.filter(
    (c) => privados || !c.startsWith("datos/privado/"),
  )) {
    for (const { ruta, texto } of jsonsDe(raiz, carpeta)) {
      if (!ruta.endsWith(".plan.json")) continue;
      const plan = Plan.parse(JSON.parse(texto) as unknown);
      const rutaPaquete = ruta.replace(/\.plan\.json$/, ".paquete.json");
      const paquete = Paquete.parse(
        JSON.parse(
          readFileSync(path.join(raiz, rutaPaquete), "utf8"),
        ) as unknown,
      );
      const sinHuella = (o: object) =>
        Object.fromEntries(Object.entries(o).filter(([k]) => k !== "huella"));
      if ((await huella(sinHuella(plan))) !== plan.huella)
        throw new Error(
          `${ruta}: la huella del plan no es la de su contenido / the plan fingerprint is not its content's`,
        );
      if ((await huella(sinHuella(paquete))) !== paquete.huella)
        throw new Error(
          `${rutaPaquete}: la huella del paquete no es la de su contenido / the package fingerprint is not its content's`,
        );
      if (plan.paquete.huella !== paquete.huella)
        throw new Error(
          `${ruta}: el plan cita otro paquete / the plan cites another package`,
        );
      planes[plan.activo.id] = { plan, paquete };
    }
  }
  return planes;
}

/** Lo que el libro necesita saber del catálogo: la regla de veredicto de cada prueba y su familia. */
export const pruebasConocidas = (instantanea: Instantanea): PruebaConocida[] =>
  instantanea.catalogo.pruebas.map((p) => ({
    id: p.id,
    familia: p.familia,
    regla: p.criterio_de_veredicto.regla,
  }));

/** De dónde viene un activo: los de `datos/privado/activos/` son propios; el resto, demo. */
export function origenDelActivo(
  raiz: string,
  activo: string,
): "demo" | "propio" | null {
  if (existsSync(path.join(raiz, "datos/privado/activos", `${activo}.json`)))
    return "propio";
  if (existsSync(path.join(raiz, "datos/activos/demo", `${activo}.json`)))
    return "demo";
  return null;
}

/** Escribe un archivo de datos; lo propio nace 0600 en carpetas 0700 y un archivo existente conserva el modo que le toca. */
export function escribirDato(
  raiz: string,
  relativa: string,
  contenido: string,
  privado: boolean,
): string {
  const ruta = path.join(raiz, relativa);
  mkdirSync(path.dirname(ruta), {
    recursive: true,
    mode: privado ? 0o700 : 0o755,
  });
  const modo = privado ? 0o600 : 0o644;
  if (!existsSync(ruta) || readFileSync(ruta, "utf8") !== contenido)
    writeFileSync(ruta, contenido, { mode: modo });
  chmodSync(ruta, modo);
  return relativa;
}
