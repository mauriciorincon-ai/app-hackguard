// CLI del historial de un activo: `pnpm activo:historial <id>`. Solo lee archivos; las versiones, las diferencias y el estado del plan
// los calcula el motor (`src/engine/activos/historial.ts`). Corre con el TypeScript nativo de Node: `node src/cli/activo.ts historial <id>`.
//
//   historial <id> [--json] [--idioma es|en]
//
// Códigos de salida: 0 ok (el plan, vigente o no, se dice en la salida) · 2 el historial no cuadra con el activo (huella, versiones o activo
// cambiado sin versión) · 3 error de uso o de lectura.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { Activo } from "../engine/activos/esquemas.ts";
import {
  Historial,
  diferenciasDeActivo,
  estadoDelPlan,
  huellaDelActivo,
  versionDelPlan,
  versionesDe,
} from "../engine/activos/historial.ts";
import { Plan } from "../engine/planificador/esquemas.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";

const USO = {
  es: "uso: activo historial <id> [--json] [--idioma es|en]",
  en: "usage: activo historial <id> [--json] [--idioma es|en]",
};

class ErrorDeUso extends Error {}
class HistorialQueNoCuadra extends Error {}

type Idioma = "es" | "en";
const corto = (h: string) => h.slice(0, 12);
const valor = (v: unknown, idioma: Idioma): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object" && "es" in v && "en" in v)
    return String((v as Record<Idioma, unknown>)[idioma]);
  return typeof v === "string" ? v : JSON.stringify(v);
};

async function historial(
  raiz: string,
  id: string,
  json: boolean,
  idioma: Idioma,
) {
  const rutaActivo = path.join(raiz, "datos/activos/demo", `${id}.json`);
  const rutaHistorial = path.join(
    raiz,
    "datos/historial/activos",
    `${id}.json`,
  );
  if (!existsSync(rutaActivo))
    throw new ErrorDeUso(
      `no existe el activo ${id} / the asset ${id} does not exist`,
    );
  if (!existsSync(rutaHistorial))
    throw new ErrorDeUso(
      `el activo ${id} no tiene historial / the asset ${id} has no history`,
    );
  const activo = Activo.parse(JSON.parse(readFileSync(rutaActivo, "utf8")));
  let versiones;
  try {
    versiones = await versionesDe(
      Historial.parse(JSON.parse(readFileSync(rutaHistorial, "utf8"))),
      activo,
    );
  } catch (e) {
    throw new HistorialQueNoCuadra(e instanceof Error ? e.message : String(e));
  }
  const rutaPlan = path.join(raiz, "datos/planes", `${id}.plan.json`);
  const plan = existsSync(rutaPlan)
    ? Plan.parse(JSON.parse(readFileSync(rutaPlan, "utf8")))
    : null;
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const veredicto =
    plan === null
      ? null
      : estadoDelPlan(plan, {
          huella_del_activo: await huellaDelActivo(activo),
          huella_de_la_instantanea: instantanea.huella,
        });
  const conCambios = await Promise.all(
    versiones.map(async (v, i) => ({
      n: v.n,
      fecha: v.fecha,
      huella: v.huella,
      cambio: v.cambio,
      vigente: v.vigente,
      cambios:
        versiones[i + 1] === undefined
          ? []
          : await diferenciasDeActivo(versiones[i + 1]!.activo, v.activo),
    })),
  );
  const delPlan = plan === null ? null : versionDelPlan(versiones, plan);
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ activo: id, versiones: conCambios, plan: plan === null ? null : { huella: plan.huella, versionDelActivo: delPlan?.n ?? null, ...veredicto } }, null, 2)}\n`,
    );
    return;
  }
  const t = (es: string, en: string) => (idioma === "es" ? es : en);
  const lineas = [
    t(`Historial de ${id}`, `History of ${id}`),
    ...conCambios.flatMap((v) => [
      `  v${v.n}${v.vigente ? t(" (vigente)", " (current)") : ""}  ${v.fecha}  sha256:${corto(v.huella)}`,
      `      ${valor(v.cambio, idioma)}`,
      ...v.cambios.map(
        (c) =>
          `      ${c.campo}: ${valor(c.antes, idioma)} → ${valor(c.despues, idioma)}`,
      ),
    ]),
  ];
  if (plan !== null && veredicto !== null)
    lineas.push(
      veredicto.estado === "vigente"
        ? t("Plan: vigente", "Plan: current")
        : t(
            `Plan: desactualizado por ${veredicto.por.map((p) => (p === "perfil" ? "perfil" : "catálogo")).join(" y ")}` +
              (delPlan === null
                ? ""
                : ` (emitido con la versión ${delPlan.n})`),
            `Plan: out of date because of ${veredicto.por.map((p) => (p === "perfil" ? "profile" : "catalog")).join(" and ")}` +
              (delPlan === null ? "" : ` (issued with version ${delPlan.n})`),
          ),
    );
  else lineas.push(t("Plan: ninguno", "Plan: none"));
  process.stdout.write(`${lineas.join("\n")}\n`);
}

async function principal(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  const [comando, id, ...sobra] = positionals;
  if (comando !== "historial" || id === undefined || sobra.length > 0)
    throw new ErrorDeUso(positionals.join(" "));
  await historial(process.cwd(), id, values.json, values.idioma);
  return 0;
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    const detalle = error instanceof Error ? error.message : String(error);
    if (error instanceof HistorialQueNoCuadra) {
      process.stderr.write(`${detalle}\n`);
      process.exitCode = 2;
    } else if (
      error instanceof ErrorDeUso ||
      (error instanceof Error &&
        "code" in error &&
        String(error.code).startsWith("ERR_PARSE_ARGS"))
    ) {
      process.stderr.write(`${detalle}\n\n${USO.es}\n\n${USO.en}\n`);
      process.exitCode = 3;
    } else {
      process.stderr.write(`${detalle}\n`);
      process.exitCode = 3;
    }
  },
);
