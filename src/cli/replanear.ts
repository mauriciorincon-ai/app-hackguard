// `plan replanear <id> --fecha AAAA-MM-DD`: emite de nuevo el plan desactualizado de un activo. El motor calcula (`engine/planificador/replanear.ts`);
// aquí solo se leen y se escriben archivos. Antes de escribir, ARCHIVA el plan y el paquete anteriores en `datos/planes/anteriores/` con el
// nombre `<id>.<12 primeros de la huella>.plan.json`: jamás se borran ni se sobrescriben con otro contenido.
//
//   replanear <id> --fecha AAAA-MM-DD [--demo] [--sin-escribir] [--json] [--idioma es|en]
//
// `--demo` re-planea contra la instantánea demo («no oficial») y solo muestra: un plan que cite la demo no se emite. `--sin-escribir` muestra
// sin tocar nada. Códigos de salida: 0 re-planeado (o mostrado) · 1 re-planeado con textos del dueño marcados por el filtro (una persona los revisa) · 2 bloqueado (el plan está vigente, no hay base que reproducir, la fórmula o
// los entornos cambiaron, o el activo no está autorizado; no escribe nada) · 3 error de uso o de lectura.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Idioma } from "../engine/catalogo/informe.ts";
import {
  informeDeReplan,
  salidaJsonDeReplan,
  type RutasDeReplan,
} from "../engine/planificador/informe-replan.ts";
import { ErrorDeReplan, replanear } from "../engine/planificador/replanear.ts";
import { cargarActivosDelBuild } from "../lib/activos/cargar.ts";
import {
  CARPETA_DE_PLANES,
  cargarPatrones,
} from "../lib/activos/cargar-activos.ts";
import {
  SinBaseParaReplanear,
  entradaDeReplan,
} from "../lib/activos/replan.ts";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
} from "../lib/catalogo/cargar-instantanea.ts";
import { CARPETA_DE_PLANES_ARCHIVADOS } from "../lib/evidencia/cargar-evidencia.ts";
import { escribir } from "./escribir.ts";

export class ErrorDeUso extends Error {}
export const CODIGO_DE_REPLAN = {
  ok: 0,
  con_advertencias: 1,
  bloqueado: 2,
  uso: 3,
} as const;

const imprimir = (valor: unknown) =>
  process.stdout.write(`${JSON.stringify(valor, null, 2)}\n`);

export interface OpcionesDeReplan {
  id: string | undefined;
  fecha: string | undefined;
  demo: boolean;
  sinEscribir: boolean;
  json: boolean;
  idioma: Idioma;
}

export async function replanearComando(
  raiz: string,
  o: OpcionesDeReplan,
): Promise<number> {
  if (o.id === undefined)
    throw new ErrorDeUso("falta el id del activo / the asset id is missing");
  if (o.fecha === undefined)
    throw new ErrorDeUso("--fecha AAAA-MM-DD / --fecha YYYY-MM-DD");
  const oficial = await cargarInstantaneaOficial(raiz);
  const mundo = await cargarActivosDelBuild(oficial.instantanea, raiz);
  const cargado = mundo.activos.find((a) => a.activo.id === o.id);
  if (cargado === undefined)
    throw new ErrorDeUso(
      `no hay un activo «${o.id}» / there is no asset “${o.id}”`,
    );
  // `es` puede venir ya bilingüe («es / en»), como los mensajes de ErrorDeReplan: `en` es opcional.
  // Con `--json` el motivo sale en stdout como JSON (quien parsea la salida no recibe un archivo vacío); sin él, como texto en stderr.
  const bloqueado = (es: string, en?: string) => {
    const motivo = en === undefined ? es : `${es} / ${en}`;
    if (o.json)
      imprimir({
        bloqueado: true,
        codigo: CODIGO_DE_REPLAN.bloqueado,
        motivo,
      });
    else process.stderr.write(`${motivo}\n`);
    return CODIGO_DE_REPLAN.bloqueado;
  };
  if (cargado.veredicto?.estado !== "plan_desactualizado")
    return bloqueado(
      `${o.id}: su plan está vigente (o no tiene plan): no hay nada que re-planear`,
      `${o.id}: its plan is current (or it has none): there is nothing to re-plan`,
    );
  const nueva = o.demo ? await cargarInstantaneaDemo(raiz) : oficial;
  if (nueva === null)
    throw new ErrorDeUso(
      "no hay instantánea demo en datos/instantaneas/demo/ / there is no demo snapshot in datos/instantaneas/demo/",
    );

  let resultado;
  try {
    resultado = await replanear(
      await entradaDeReplan(
        cargado,
        mundo.datos,
        nueva.instantanea,
        o.fecha,
        raiz,
      ).then((entrada) => ({ ...entrada, patrones: cargarPatrones(raiz) })),
    );
  } catch (error) {
    if (error instanceof ErrorDeReplan || error instanceof SinBaseParaReplanear)
      return bloqueado(error.message);
    throw error;
  }

  // Solo el catálogo oficial se emite; la base demo y `--sin-escribir` solo muestran.
  let rutas: RutasDeReplan | null = null;
  if (!o.demo && !o.sinEscribir) {
    const plan = cargado.plan!;
    const carpeta = path.join(raiz, CARPETA_DE_PLANES);
    const archivo = path.join(carpeta, CARPETA_DE_PLANES_ARCHIVADOS);
    mkdirSync(archivo, { recursive: true, mode: 0o755 });
    const corto = plan.huella.slice(0, 12);
    const de = (ext: string) => path.join(carpeta, `${o.id}.${ext}.json`);
    const aparte = (ext: string) =>
      path.join(archivo, `${o.id}.${corto}.${ext}.json`);
    for (const ext of ["plan", "paquete"]) {
      const viejo = readFileSync(de(ext), "utf8");
      // Un archivo archivado jamás se sobrescribe con otro contenido: si existe, debe ser el mismo.
      if (
        existsSync(aparte(ext)) &&
        readFileSync(aparte(ext), "utf8") !== viejo
      )
        throw new Error(
          `${aparte(ext)} ya existe con otro contenido: no se sobrescribe / already exists with other content: it is not overwritten`,
        );
      escribir(aparte(ext), viejo, 0o644);
    }
    escribir(de("plan"), `${JSON.stringify(resultado.plan, null, 2)}\n`, 0o644);
    escribir(
      de("paquete"),
      `${JSON.stringify(resultado.paquete, null, 2)}\n`,
      0o644,
    );
    const relativa = (p: string) =>
      path.relative(raiz, p).split(path.sep).join("/");
    rutas = {
      plan: relativa(de("plan")),
      paquete: relativa(de("paquete")),
      archivado: {
        plan: relativa(aparte("plan")),
        paquete: relativa(aparte("paquete")),
      },
    };
  }
  if (o.json) imprimir(salidaJsonDeReplan(resultado.replan, rutas));
  else process.stdout.write(informeDeReplan(resultado.replan, o.idioma, rutas));
  if (resultado.marcas.length > 0) {
    process.stderr.write(
      o.idioma === "es"
        ? `! El filtro de contenido marcó ${resultado.marcas.length} textos del dueño en el paquete nuevo; una persona los revisa.\n`
        : `! The content filter flagged ${resultado.marcas.length} owner texts in the new package; a person reviews them.\n`,
    );
    return CODIGO_DE_REPLAN.con_advertencias;
  }
  return CODIGO_DE_REPLAN.ok;
}
