// CLI del catálogo: `pnpm catalogo:validar` y `pnpm catalogo:instantanea`. Solo lee y escribe archivos; lo
// demás (validar, armar la instantánea, redactar la salida) lo hace el motor. Corre con el TypeScript
// nativo de Node: `node src/cli/catalogo.ts <comando> [opciones]`.
//
//   validar      [--json] [--idioma es|en] [--agregar <prueba.json>]...
//   instantanea  --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>] [--agregar <prueba.json>]...
//   instantanea  --demo [--json] [--idioma es|en]      emite la instantánea DEMO (no oficial) en datos/instantaneas/demo/
//   diferencias  <instantánea-A> <instantánea-B> [--json] [--idioma es|en]    qué entra, sale y cambia de A a B
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
import {
  diferenciasEntreInstantaneas,
  type Licencias,
} from "../engine/catalogo/diferencias.ts";
import { comprobarInstantanea } from "../engine/catalogo/esquema-de-instantanea.ts";
import { informeDeDiferencias } from "../engine/catalogo/informe-diferencias.ts";
import {
  construirInstantanea,
  huellaDeInstantanea,
  type Instantanea,
} from "../engine/catalogo/instantanea.ts";
import {
  FECHA_DE_LA_INSTANTANEA_DEMO,
  aplicarRecetaDemo,
} from "../engine/catalogo/instantanea-demo.ts";
import { validarCatalogo } from "../engine/catalogo/validar.ts";
import { esFechaCivil } from "../engine/fecha.ts";
import { cargarCatalogo, noLeidos } from "./cargar.ts";

const USO = {
  es: "uso: catalogo validar [--json] [--idioma es|en] [--agregar <prueba.json>]…\n     catalogo instantanea --fecha AAAA-MM-DD [--json] [--idioma es|en] [--salida <carpeta>] [--agregar <prueba.json>]…\n     catalogo instantanea --demo [--json] [--idioma es|en]\n     catalogo diferencias <instantánea-A> <instantánea-B> [--json] [--idioma es|en]",
  en: "usage: catalogo validar [--json] [--idioma es|en] [--agregar <test.json>]…\n       catalogo instantanea --fecha YYYY-MM-DD [--json] [--idioma es|en] [--salida <folder>] [--agregar <test.json>]…\n       catalogo instantanea --demo [--json] [--idioma es|en]\n       catalogo diferencias <snapshot-A> <snapshot-B> [--json] [--idioma es|en]",
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
      demo: { type: "boolean", default: false },
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

/** Una instantánea por ruta de archivo, o por nombre (con o sin `.json`) dentro de `datos/instantaneas/` y de su carpeta `demo/`. */
function rutaDeInstantanea(raiz: string, quien: string): string {
  const candidatas = [
    quien,
    path.join(raiz, "datos", "instantaneas", quien),
    path.join(raiz, "datos", "instantaneas", "demo", quien),
    path.join(raiz, "datos", "instantaneas", `${quien}.json`),
    path.join(raiz, "datos", "instantaneas", "demo", `${quien}.json`),
  ];
  const hallada = candidatas.find((c) => existsSync(c));
  if (hallada === undefined)
    throw new ErrorDeUso(
      `no existe la instantánea ${quien} / the snapshot ${quien} does not exist`,
    );
  return hallada;
}

async function diferencias(
  raiz: string,
  o: ReturnType<typeof opciones>,
): Promise<number> {
  const [a, b, ...sobra] = o.sobrantes;
  if (a === undefined || b === undefined || sobra.length > 0)
    throw new ErrorDeUso("diferencias <A> <B>");
  const leer = async (quien: string) => {
    const ruta = rutaDeInstantanea(raiz, quien);
    let i: Instantanea;
    try {
      i = comprobarInstantanea(JSON.parse(readFileSync(ruta, "utf8")), quien);
    } catch (error) {
      throw new ErrorDeUso(
        error instanceof Error ? error.message : String(error),
      );
    }
    if ((await huellaDeInstantanea(i)) !== i.huella)
      throw new ErrorDeUso(
        `${quien}: su huella declarada no es la de su contenido / its declared fingerprint is not its content's`,
      );
    return i;
  };
  const licencias = JSON.parse(
    readFileSync(path.join(raiz, "datos/propuestas/licencias.json"), "utf8"),
  ) as { marcos: Licencias };
  const d = await diferenciasEntreInstantaneas(
    await leer(a),
    await leer(b),
    licencias.marcos,
  );
  if (o.json) imprimir(d);
  else process.stdout.write(informeDeDiferencias(d, o.idioma));
  return CODIGOS_DE_SALIDA.ok;
}

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  const raiz = process.cwd();
  if (o.comando === "diferencias") return diferencias(raiz, o);
  if (o.sobrantes.length > 0) throw new ErrorDeUso(o.sobrantes.join(" "));
  for (const archivo of o.agregar) {
    if (!existsSync(archivo))
      throw new ErrorDeUso(
        `--agregar: no existe ${archivo} / does not exist: ${archivo}`,
      );
  }
  const real = cargarCatalogo(raiz, o.agregar);
  // La instantánea demo parte del catálogo real y le aplica la receta: no es una instantánea del catálogo.
  const entrada = o.demo ? aplicarRecetaDemo(real) : real;
  for (const ruta of noLeidos(raiz, real))
    process.stderr.write(
      `aviso: ${ruta} no se lee (el catálogo solo lee los .json de sus carpetas) / ` +
        `warning: ${ruta} is not read (the catalog only reads the .json files in its folders)\n`,
    );

  if (o.comando === "validar") {
    const resultado = await validarCatalogo(entrada);
    if (o.json) imprimir(salidaJsonDeValidacion(resultado));
    else process.stdout.write(informeDeValidacion(resultado, o.idioma));
    return codigoDeValidacion(resultado.estado);
  }

  if (o.comando === "instantanea") {
    // La fecha de evaluación es una entrada; jamás se toma del reloj (RNF-01). La demo trae la suya.
    if (o.demo && (o.agregar.length > 0 || o.salida !== undefined))
      throw new ErrorDeUso("--demo no se combina con --agregar ni --salida");
    const fecha = o.demo ? FECHA_DE_LA_INSTANTANEA_DEMO : o.fecha;
    if (fecha === undefined || !esFechaCivil(fecha))
      throw new ErrorDeUso("--fecha AAAA-MM-DD / --fecha YYYY-MM-DD");
    // Una prueba agregada desde fuera de `datos/` no puede terminar en la carpeta versionada: la instantánea
    // diría que es del catálogo.
    if (o.agregar.length > 0) {
      const datos = path.resolve(raiz, "datos");
      const salida = o.salida === undefined ? null : path.resolve(o.salida);
      if (
        salida === null ||
        salida === datos ||
        salida.startsWith(`${datos}${path.sep}`)
      )
        throw new ErrorDeUso(
          "--agregar con instantanea exige --salida fuera de datos/ / --agregar with instantanea requires --salida outside datos/",
        );
    }
    const resultado = await construirInstantanea(entrada, fecha);
    let ruta: string | null = null;
    if (resultado.emitida) {
      const carpeta =
        o.salida ??
        (o.demo
          ? path.join("datos", "instantaneas", "demo")
          : path.join("datos", "instantaneas"));
      mkdirSync(carpeta, { recursive: true });
      ruta = path.join(carpeta, resultado.archivo).split(path.sep).join("/");
      const contenido = `${JSON.stringify(resultado.instantanea, null, 2)}\n`;
      // El nombre lleva la huella: si ya existe, el contenido es el mismo y no se reescribe. Con `--agregar`, lo
      // agregado puede venir de `datos/privado/`: el derivado nace solo legible por su dueño (regla 17-bis a).
      if (!existsSync(ruta) || readFileSync(ruta, "utf8") !== contenido)
        writeFileSync(ruta, contenido, {
          mode: o.agregar.length > 0 ? 0o600 : 0o644,
        });
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
