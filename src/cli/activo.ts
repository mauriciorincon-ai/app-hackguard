// CLI de un activo: `pnpm activo:historial <id>` y `pnpm activo:desde-ficha <ficha.json>`. Solo lee archivos; las versiones, las diferencias y el estado del plan
// los calcula el motor (`src/engine/activos/historial.ts`). Corre con el TypeScript nativo de Node: `node src/cli/activo.ts historial <id>`.
//
//   historial <id> [--json] [--idioma es|en]
//   desde-ficha <ficha.json> [--json] [--idioma es|en]
//       [--aceptar <rasgo,rasgo|todos> --por <persona> --id <id> --fecha AAAA-MM-DD --salida datos/privado/activos/<id>.perfil.json]
//
// `desde-ficha` (D2) propone los rasgos del perfil desde la ficha técnica de CV Viva, cada uno con su fragmento; sin fragmento no hay
// propuesta. Con `--aceptar` guarda SOLO los rasgos que la persona aceptó, en `datos/privado/` (modo 600), y se niega dentro de una
// sesión de Claude Code (confirmar lo hace una persona, regla dura 2). La ficha no se guarda: solo su huella.
//
// Códigos de salida: 0 ok (el plan, vigente o no, se dice en la salida) · 2 el historial no cuadra con el activo (huella, versiones o activo
// cambiado sin versión) · 3 error de uso o de lectura.
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  FichaLeida,
  TablaFichaARasgos,
  armarPerfilPropuesto,
  proponerDesdeFicha,
  type RasgoDeFicha,
} from "../engine/activos/desde-ficha.ts";
import { sha256 } from "../engine/huella.ts";
import { Plan } from "../engine/planificador/esquemas.ts";
import { puedeDecidir } from "../lib/propuestas/frontera.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";

const USO = {
  es: "uso: activo historial <id> [--json] [--idioma es|en]\n     activo desde-ficha <ficha.json> [--json] [--idioma es|en] [--aceptar <rasgos|todos> --por <persona> --id <id> --fecha AAAA-MM-DD --salida <ruta>]",
  en: "usage: activo historial <id> [--json] [--idioma es|en]\n       activo desde-ficha <ficha.json> [--json] [--idioma es|en] [--aceptar <traits|all> --por <person> --id <id> --fecha YYYY-MM-DD --salida <path>]",
};

class ErrorDeUso extends Error {}
class HistorialQueNoCuadra extends Error {}
class Bloqueado extends Error {}

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

const leerJson = (ruta: string): unknown =>
  JSON.parse(readFileSync(ruta, "utf8"));

/** El texto de la ficha es dato ajeno: sin caracteres de control (ni secuencias de escape de terminal) al imprimirlo. */
const inerte = (texto: string): string =>
  texto.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");

/** Una línea por rasgo: el rasgo, lo que se propone y el texto de la ficha que lo respalda (o por qué no se propone). */
function lineaDeRasgo(r: RasgoDeFicha, idioma: Idioma): string {
  const t = (es: string, en: string) => (idioma === "es" ? es : en);
  if (r.estado === "propuesto")
    return `  ${r.rasgo}: ${r.valor ? t("sí", "yes") : "no"}  ← ${r.cita.fragmento.ruta}: «${inerte(r.cita.fragmento.texto)}»`;
  if (r.motivo === "conflicto")
    return `  ${r.rasgo}: ${t("sin responder (la ficha se contradice)", "unanswered (the ficha contradicts itself)")}\n${r.citas
      .map(
        (c) =>
          `      ${c.valor ? t("sí", "yes") : "no"}  ← ${c.fragmento.ruta}: «${inerte(c.fragmento.texto)}»`,
      )
      .join("\n")}`;
  if (r.motivo === "no_es_si_o_no")
    return `  ${r.rasgo}: ${t("sin responder (no es de sí o no: lo dices tú)", "unanswered (not a yes/no trait: you say it)")}`;
  return `  ${r.rasgo}: ${t("sin responder (ningún texto de la ficha lo respalda)", "unanswered (no text in the ficha backs it)")}`;
}

async function desdeFicha(
  raiz: string,
  rutaFicha: string,
  o: {
    json: boolean;
    idioma: Idioma;
    aceptar?: string;
    por?: string;
    id?: string;
    fecha?: string;
    salida?: string;
  },
) {
  const t = (es: string, en: string) => (o.idioma === "es" ? es : en);
  if (!existsSync(rutaFicha))
    throw new ErrorDeUso(
      `no existe la ficha ${rutaFicha} / the ficha ${rutaFicha} does not exist`,
    );
  const bytes = readFileSync(rutaFicha, "utf8");
  const ficha = FichaLeida.safeParse(JSON.parse(bytes));
  if (!ficha.success)
    throw new ErrorDeUso(
      `la ficha no cumple el contrato 1.x de CV Viva / the ficha does not meet the CV Viva 1.x contract: ${ficha.error.issues
        .slice(0, 3)
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  const tabla = TablaFichaARasgos.parse(
    leerJson(path.join(raiz, "datos/planificador/ficha-a-rasgos.json")),
  );
  const rasgos = (
    leerJson(path.join(raiz, "datos/rasgos-de-perfil.json")) as {
      rasgos: { id: string; tipo: "booleano" | "opcion" }[];
    }
  ).rasgos;
  const propuestas = proponerDesdeFicha(ficha.data, tabla, rasgos);

  if (o.aceptar === undefined) {
    if (o.json)
      process.stdout.write(`${JSON.stringify(propuestas, null, 2)}\n`);
    else {
      const n = propuestas.filter((p) => p.estado === "propuesto").length;
      process.stdout.write(
        `${[
          t(
            `Perfil desde la ficha: ${n} propuestos, ${propuestas.length - n} sin responder`,
            `Profile from the ficha: ${n} proposed, ${propuestas.length - n} unanswered`,
          ),
          ...propuestas.map((p) => lineaDeRasgo(p, o.idioma)),
          t(
            "Para guardar los que aceptes: --aceptar <rasgos|todos> --por <persona> --id <id> --fecha AAAA-MM-DD --salida datos/privado/activos/<id>.perfil.json",
            "To save the ones you accept: --aceptar <traits|all> --por <person> --id <id> --fecha YYYY-MM-DD --salida datos/privado/activos/<id>.perfil.json",
          ),
        ].join("\n")}\n`,
      );
    }
    return;
  }

  // Confirmar lo hace una persona, no una sesión de Claude Code (regla dura 2).
  const frontera = puedeDecidir({
    raiz,
    repo: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
    env: process.env,
    tty: Boolean(process.stdin.isTTY),
  });
  if (!frontera.ok)
    throw new Bloqueado(
      `Confirmar los rasgos lo hace una persona: ${frontera.motivo}.\nNo se guardó nada / Nothing was saved.`,
    );
  for (const [bandera, valor] of [
    ["--por", o.por],
    ["--id", o.id],
    ["--fecha", o.fecha],
    ["--salida", o.salida],
  ] as const)
    if (valor === undefined)
      throw new ErrorDeUso(`falta ${bandera} / ${bandera} is missing`);
  const propuestosIds = new Set(
    propuestas.filter((p) => p.estado === "propuesto").map((p) => p.rasgo),
  );
  const pedidos =
    o.aceptar === "todos" || o.aceptar === "all"
      ? propuestosIds
      : new Set(
          o.aceptar
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        );
  const noPropuestos = [...pedidos].filter((r) => !propuestosIds.has(r));
  if (noPropuestos.length > 0)
    throw new Bloqueado(
      `No se acepta lo que la ficha no respalda: ${noPropuestos.join(", ")}.\nSin fragmento no hay propuesta / No fragment, no proposal. No se guardó nada / Nothing was saved.`,
    );
  // Un derivado jamás nace menos privado que su fuente (regla 17-bis): solo en `datos/privado/`, que git ignora.
  const salida = path.resolve(raiz, o.salida!);
  const privado = path.resolve(raiz, "datos/privado");
  if (!salida.startsWith(`${privado}${path.sep}`))
    throw new Bloqueado(
      `--salida va dentro de datos/privado/ (la evidencia real no viaja al repo público) / --salida goes inside datos/privado/.\nNo se guardó nada / Nothing was saved.`,
    );
  if (existsSync(salida))
    throw new Bloqueado(
      `Ya existe ${o.salida}; no se sobrescribe / ${o.salida} already exists; it is not overwritten.`,
    );
  const perfil = armarPerfilPropuesto({
    id: o.id!,
    por: o.por!,
    fecha: o.fecha!,
    fichaVersion: ficha.data.schema_version,
    fichaHuella: await sha256(bytes),
    propuestas,
    confirmados: pedidos,
  });
  mkdirSync(path.dirname(salida), { recursive: true, mode: 0o700 });
  writeFileSync(salida, `${JSON.stringify(perfil, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(salida, 0o600);
  process.stdout.write(
    `${t(
      `Guardado ${o.salida} con ${Object.keys(perfil.rasgos).length} rasgos; ${perfil.sin_responder.length} sin responder.`,
      `Saved ${o.salida} with ${Object.keys(perfil.rasgos).length} traits; ${perfil.sin_responder.length} unanswered.`,
    )}\n${perfil.nota[o.idioma]}\n`,
  );
}

async function principal(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
      aceptar: { type: "string" },
      por: { type: "string" },
      id: { type: "string" },
      fecha: { type: "string" },
      salida: { type: "string" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  const [comando, id, ...sobra] = positionals;
  if (comando === "desde-ficha" && id !== undefined && sobra.length === 0) {
    await desdeFicha(process.cwd(), path.resolve(id), {
      json: values.json,
      idioma: values.idioma,
      aceptar: values.aceptar,
      por: values.por,
      id: values.id,
      fecha: values.fecha,
      salida: values.salida,
    });
    return 0;
  }
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
    if (error instanceof Bloqueado) {
      process.stderr.write(`${detalle}\n`);
      process.exitCode = 2;
    } else if (error instanceof HistorialQueNoCuadra) {
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
