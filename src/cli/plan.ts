// CLI del planificador: `pnpm activo:validar` y `pnpm plan:emitir`. Solo lee y escribe archivos; lo demás
// (validar el activo, planear, armar el paquete, redactar la salida) lo hace el motor. Corre con el TypeScript
// nativo de Node: `node src/cli/plan.ts <comando> [opciones]`.
//
//   activo-validar  [<id>] [--json] [--idioma es|en]
//   emitir          <id> --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>]
//
// Códigos de salida — activo-validar: 0 ok · 1 con advertencias · 2 inválido · 3 error de uso o de lectura.
// emitir: 0 emitido · 1 emitido con algo que mirar (advertencias del activo, texto marcado por el filtro o pruebas
// sin herramienta) · 2 bloqueado (el activo no está autorizado o es inválido; no escribe nada) · 3 error de uso
// o de lectura (también una fecha anterior a la instantánea).
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { Idioma } from "../engine/catalogo/informe.ts";
import {
  validarActivos,
  type EstadoDeValidacionDeActivos,
  type ResultadoDeValidacionDeActivos,
} from "../engine/activos/validar.ts";
import {
  CODIGOS_DEL_PLAN,
  codigoDeActivos,
  codigoDePlan,
  informeDeActivos,
  informeDePlan,
  salidaJsonDeActivos,
  salidaJsonDePlan,
} from "../engine/planificador/informe.ts";
import { planificar } from "../engine/planificador/planificar.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";
import {
  CARPETA_DE_PLANES,
  CARPETA_PRIVADA_DE_PLANES,
  cargarActivos,
  cargarDatosDelPlanificador,
  cargarPatrones,
} from "../lib/activos/cargar-activos.ts";

const USO = {
  es: "uso: plan activo-validar [<id>] [--json] [--idioma es|en]\n     plan emitir <id> --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>]",
  en: "usage: plan activo-validar [<id>] [--json] [--idioma es|en]\n       plan emitir <id> --fecha YYYY-MM-DD [--json] [--idioma es|en] [--salida <folder>]",
};

class ErrorDeUso extends Error {}

function opciones(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
      fecha: { type: "string" },
      salida: { type: "string" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  return {
    ...values,
    idioma: values.idioma as Idioma,
    comando: positionals[0],
    id: positionals[1]?.toLowerCase(),
    sobrantes: positionals.slice(2),
  };
}

const imprimir = (valor: unknown) =>
  process.stdout.write(`${JSON.stringify(valor, null, 2)}\n`);

/** Escribe un derivado solo si cambió (su nombre no lleva la huella, así que se compara el contenido). */
function escribir(ruta: string, contenido: string, modo: number) {
  if (!existsSync(ruta) || readFileSync(ruta, "utf8") !== contenido)
    writeFileSync(ruta, contenido, { mode: modo });
  // Un archivo que ya existía conserva su modo: se fija el que corresponde (regla 17-bis).
  chmodSync(ruta, modo);
}

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (o.sobrantes.length > 0) throw new ErrorDeUso(o.sobrantes.join(" "));
  const raiz = process.cwd();
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const archivos = cargarActivos(raiz);
  const validacion = validarActivos(archivos, {
    familias: instantanea.catalogo.familias.map((f) => f.id),
    rasgos: instantanea.catalogo.rasgos,
    pruebas: instantanea.catalogo.pruebas,
  });

  if (o.comando === "activo-validar") {
    if (
      o.id !== undefined &&
      !archivos.some((a) => a.ruta.endsWith(`/${o.id}.json`))
    )
      throw new ErrorDeUso(
        `no hay un activo «${o.id}» / there is no asset “${o.id}”`,
      );
    // Con un id, se informa de ese activo y de su código; sin id, de todos.
    const visto = o.id === undefined ? validacion : delActivo(validacion, o.id);
    if (o.json) imprimir(salidaJsonDeActivos(visto));
    else process.stdout.write(informeDeActivos(visto, o.idioma));
    return codigoDeActivos(visto.estado);
  }

  if (o.comando === "emitir") {
    if (o.id === undefined)
      throw new ErrorDeUso("falta el id del activo / the asset id is missing");
    // La fecha de emisión es una entrada; jamás se toma del reloj (RNF-01).
    if (o.fecha === undefined)
      throw new ErrorDeUso("--fecha AAAA-MM-DD / --fecha YYYY-MM-DD");
    const encontrado = validacion.activos.find((a) => a.activo.id === o.id);
    if (encontrado === undefined) {
      // O no existe, o no pasó la validación: en el segundo caso se muestra por qué.
      if (!archivos.some((a) => a.ruta.endsWith(`/${o.id}.json`)))
        throw new ErrorDeUso(
          `no hay un activo «${o.id}» / there is no asset “${o.id}”`,
        );
      if (o.json) imprimir(salidaJsonDeActivos(validacion));
      else process.stdout.write(informeDeActivos(validacion, o.idioma));
      return CODIGOS_DEL_PLAN.bloqueado;
    }
    const { formula, entornos } = cargarDatosDelPlanificador(raiz);
    const resultado = await planificar({
      activo: encontrado.activo,
      instantanea,
      formula,
      entornos,
      fecha: o.fecha,
      patrones: cargarPatrones(raiz),
    });

    let rutas: { plan: string; paquete: string } | null = null;
    if (resultado.emitido) {
      // Un activo es propio por su origen y, además, por su carpeta: lo que está en datos/privado/ no sale a datos/planes/.
      const ruta = archivos.find((a) => a.ruta.endsWith(`/${o.id}.json`))?.ruta ?? "";
      const propio =
        encontrado.activo.origen === "propio" || ruta.startsWith("datos/privado/");
      const privada = path.resolve(raiz, CARPETA_PRIVADA_DE_PLANES);
      const salida = path.resolve(
        raiz,
        o.salida ?? (propio ? CARPETA_PRIVADA_DE_PLANES : CARPETA_DE_PLANES),
      );
      // Un derivado jamás nace menos privado que su fuente (regla 17-bis): el plan de un activo propio no
      // puede quedar dentro del repositorio fuera de datos/privado/ (ni en docs/, ni en out/, ni en la raíz).
      const raizAbs = path.resolve(raiz);
      const dentroDeRaiz =
        salida === raizAbs || salida.startsWith(`${raizAbs}${path.sep}`);
      const enPrivada =
        salida === privada || salida.startsWith(`${privada}${path.sep}`);
      if (propio && dentroDeRaiz && !enPrivada)
        throw new ErrorDeUso(
          "el plan de un activo propio solo se escribe en datos/privado/ / the plan of an own asset is only written in datos/privado/",
        );
      mkdirSync(salida, { recursive: true, mode: propio ? 0o700 : 0o755 });
      const modo = propio ? 0o600 : 0o644;
      const plan = path.join(salida, `${o.id}.plan.json`);
      const paquete = path.join(salida, `${o.id}.paquete.json`);
      escribir(plan, `${JSON.stringify(resultado.plan, null, 2)}\n`, modo);
      escribir(
        paquete,
        `${JSON.stringify(resultado.paquete, null, 2)}\n`,
        modo,
      );
      const relativa = (p: string) =>
        path.relative(raiz, p).split(path.sep).join("/");
      rutas = {
        plan: path.isAbsolute(o.salida ?? "") ? plan : relativa(plan),
        paquete: path.isAbsolute(o.salida ?? "") ? paquete : relativa(paquete),
      };
    }
    if (o.json) imprimir(salidaJsonDePlan(resultado, rutas));
    else process.stdout.write(informeDePlan(resultado, rutas, o.idioma));
    const advertenciasDelActivo = validacion.hallazgos.some(
      (h) => h.severidad === "advertencia" && h.ruta === encontrado.ruta,
    );
    return Math.max(
      codigoDePlan(resultado),
      resultado.emitido && advertenciasDelActivo ? 1 : 0,
    );
  }

  throw new ErrorDeUso(o.comando ?? "");
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    const detalle = error instanceof Error ? error.message : String(error);
    if (
      error instanceof ErrorDeUso ||
      error instanceof RangeError ||
      (error instanceof Error &&
        "code" in error &&
        String(error.code).startsWith("ERR_PARSE_ARGS"))
    ) {
      process.stderr.write(`${detalle}\n\n${USO.es}\n\n${USO.en}\n`);
    } else {
      process.stderr.write(`error de lectura / read error: ${detalle}\n`);
    }
    process.exitCode = CODIGOS_DEL_PLAN.uso;
  },
);

/** Los hallazgos y el estado de un solo activo: su ruta acaba en `<id>.json`. */
function delActivo(
  v: ResultadoDeValidacionDeActivos,
  id: string,
): ResultadoDeValidacionDeActivos {
  const hallazgos = v.hallazgos.filter((h) => h.ruta.endsWith(`/${id}.json`));
  const estado: EstadoDeValidacionDeActivos = hallazgos.some(
    (h) => h.severidad === "error",
  )
    ? "invalido"
    : hallazgos.some((h) => h.severidad === "advertencia")
      ? "con_advertencias"
      : "ok";
  return {
    estado,
    hallazgos,
    activos: v.activos.filter((a) => a.activo.id === id),
  };
}
