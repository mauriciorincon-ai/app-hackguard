// CLI del catálogo: `pnpm catalogo:validar` y `pnpm catalogo:instantanea`. Solo lee y escribe archivos; lo
// demás (validar, armar la instantánea, redactar la salida) lo hace el motor. Corre con el TypeScript
// nativo de Node: `node src/cli/catalogo.ts <comando> [opciones]`.
//
//   validar      [--json] [--idioma es|en] [--agregar <prueba.json>]...
//   instantanea  --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>] [--agregar <prueba.json>]...
//
// Códigos de salida — validar: 0 ok · 1 con advertencias · 2 inválido · 3 error de uso o de lectura.
// instantanea: 0 emitida · 2 bloqueada (catálogo inválido; no escribe nada) · 3 error de uso o de lectura
// (también una fecha anterior a la última verificación del catálogo).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  CODIGOS_DE_SALIDA,
  codigoDeValidacion,
  informeDeInstantanea,
  informeDeValidacion,
  salidaJsonDeInstantanea,
  salidaJsonDeValidacion,
  type Idioma,
} from "../engine/catalogo/informe.ts";
import { construirInstantanea } from "../engine/catalogo/instantanea.ts";
import { validarCatalogo } from "../engine/catalogo/validar.ts";
import { esFechaCivil } from "../engine/fecha.ts";
import { cargarCatalogo } from "./cargar.ts";

const USO = {
  es: "uso: catalogo validar [--json] [--idioma es|en] [--agregar <prueba.json>]…\n     catalogo instantanea --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>] [--agregar <prueba.json>]…",
  en: "usage: catalogo validar [--json] [--idioma es|en] [--agregar <test.json>]…\n       catalogo instantanea --fecha YYYY-MM-DD [--json] [--idioma es|en] [--salida <folder>] [--agregar <test.json>]…",
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
      agregar: { type: "string", multiple: true, default: [] },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  return {
    ...values,
    idioma: values.idioma as Idioma,
    comando: positionals[0],
    sobrantes: positionals.slice(1),
  };
}

const imprimir = (valor: unknown) =>
  process.stdout.write(`${JSON.stringify(valor, null, 2)}\n`);

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (o.sobrantes.length > 0) throw new ErrorDeUso(o.sobrantes.join(" "));
  const raiz = process.cwd();
  for (const archivo of o.agregar) {
    if (!existsSync(archivo)) throw new ErrorDeUso(`--agregar ${archivo}`);
  }
  const entrada = cargarCatalogo(raiz, o.agregar);

  if (o.comando === "validar") {
    const resultado = await validarCatalogo(entrada);
    if (o.json) imprimir(salidaJsonDeValidacion(resultado));
    else process.stdout.write(informeDeValidacion(resultado, o.idioma));
    return codigoDeValidacion(resultado.estado);
  }

  if (o.comando === "instantanea") {
    // La fecha de evaluación es una entrada; jamás se toma del reloj (RNF-01).
    if (o.fecha === undefined || !esFechaCivil(o.fecha))
      throw new ErrorDeUso("--fecha AAAA-MM-DD");
    const resultado = await construirInstantanea(entrada, o.fecha);
    let ruta: string | null = null;
    if (resultado.emitida) {
      const carpeta = o.salida ?? path.join("datos", "instantaneas");
      mkdirSync(carpeta, { recursive: true });
      ruta = path.join(carpeta, resultado.archivo).split(path.sep).join("/");
      const contenido = `${JSON.stringify(resultado.instantanea, null, 2)}\n`;
      // El nombre lleva la huella: si ya existe, el contenido es el mismo y no se reescribe.
      if (!existsSync(ruta) || readFileSync(ruta, "utf8") !== contenido)
        writeFileSync(ruta, contenido);
    }
    if (o.json) imprimir(salidaJsonDeInstantanea(resultado, ruta));
    else process.stdout.write(informeDeInstantanea(resultado, ruta, o.idioma));
    return resultado.emitida
      ? CODIGOS_DE_SALIDA.ok
      : CODIGOS_DE_SALIDA.bloqueada;
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
    process.exitCode = CODIGOS_DE_SALIDA.uso;
  },
);
