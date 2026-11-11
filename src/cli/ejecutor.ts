// CLI del ejecutor opcional (S12, D11): `pnpm ejecutor <activo> --fecha AAAA-MM-DD --objetivo <url> [--config herramienta=ruta]…
// [--herramienta <id>]… [--ejecutar --por <persona>]`. HackGuard no ataca por su cuenta: este comando corre TUS herramientas, en tu
// equipo, dentro de lo que autorizaste. Está APAGADO por defecto: sin `--ejecutar` solo muestra los comandos (y los rechazos que la
// corrida real tendría) y no lanza nada. La web no ejecuta nada y no importa este archivo.
//
// Lo que hace con `--ejecutar`, por cada herramienta del plan que se pueda lanzar: crea una carpeta temporal 0700, lanza la
// herramienta SIN shell (`spawn` con la lista de argumentos de `datos/ejecutor/comandos.json`, con tu configuración), lee el archivo
// que escribió con el adaptador de siempre y arma un lote PROPUESTO (sin confirmar: no cuenta hasta que una persona lo confirme).
// El crudo vive solo en esa carpeta temporal, que se borra al terminar; al libro solo llegan huellas y extractos (regla dura 4).
// El ejecutor NO lee tu configuración: lo que ella apunte es tu responsabilidad; él exige `--objetivo`, lo compara con
// `alcance.objetivos` y se lo pasa a la herramienta (como argumento o en HACKGUARD_OBJETIVO).
// Lo que la herramienta recibe: SOLO las variables que `datos/ejecutor/comandos.json` le declara (la base y sus claves de proveedor),
// más el objetivo; tokens y claves de nube del resto de tu entorno no viajan. La herramienta corre en su propio grupo de procesos: al
// vencer `--tiempo`, o con Ctrl-C, se mata el grupo entero (también lo que ella lanzó) y la carpeta con el crudo se borra.
// Con `--ejecutar`, `--fecha` debe ser la de hoy (±1 día): la vigencia de la autorización se compara con el reloj, no con lo que se escriba.
// Códigos de salida: 0 ok · 1 con algo que mirar (una herramienta omitida o con fallo) · 2 rechazado (una guarda; no lanza nada) · 3 error de uso o error inesperado.
import { spawn } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { huellaDelActivo } from "../engine/activos/historial.ts";
import { ADAPTADORES } from "../engine/adaptadores/index.ts";
import { esFechaCivil } from "../engine/fecha.ts";
import {
  decidirEjecucion,
  type Orden,
  type Rechazo,
} from "../engine/ejecutor/decidir.ts";
import { TablaDeComandos } from "../engine/ejecutor/esquemas.ts";
import { cargarActivos } from "../lib/activos/cargar-activos.ts";
import { cargarActivosDelBuild } from "../lib/activos/cargar.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";
import { origenDelActivo } from "../lib/evidencia/cargar-evidencia.ts";
import { cargarLibroValidado } from "../lib/evidencia/cargar-libro.ts";
import { importarCorrida } from "../lib/evidencia/importar.ts";

class ErrorDeUso extends Error {}

export const CODIGOS_DEL_EJECUTOR = {
  ok: 0,
  con_algo_que_mirar: 1,
  rechazado: 2,
  uso: 3,
} as const;

/** Qué pasó con el proceso lanzado. `bytesDeStderr` es solo una cuenta: lo que la herramienta escribe ahí no se muestra ni se guarda. */
interface Termino {
  error: string | null;
  status: number | null;
  signal: string | null;
  bytesDeStderr: number;
  vencio: boolean;
}

/** Lo que está corriendo ahora, para que una señal (Ctrl-C) mate el grupo y borre el crudo antes de salir. */
const enCurso = new Set<{ pid: number; carpeta: string }>();

function matarGrupo(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* ya terminó */
    }
  }
}

for (const senal of ["SIGINT", "SIGTERM"] as const)
  process.on(senal, () => {
    for (const c of enCurso) {
      matarGrupo(c.pid);
      rmSync(c.carpeta, { recursive: true, force: true });
    }
    process.exit(senal === "SIGINT" ? 130 : 143);
  });

/** Lanza SIN shell, en su propio grupo de procesos. La salida estándar no se guarda en ninguna parte. */
function lanzar(
  orden: Orden,
  carpeta: string,
  env: Record<string, string>,
  tiempoMs: number,
): Promise<Termino> {
  return new Promise((resolver) => {
    const hijo = spawn(orden.ejecutable, orden.argumentos, {
      shell: false,
      cwd: carpeta,
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "ignore", "pipe"],
      detached: true,
    });
    const registro = { pid: hijo.pid ?? -1, carpeta };
    if (hijo.pid !== undefined) enCurso.add(registro);
    let bytes = 0;
    let vencio = false;
    hijo.stderr.on("data", (d: Buffer) => {
      bytes += d.length;
    });
    const reloj = setTimeout(() => {
      vencio = true;
      matarGrupo(hijo.pid);
    }, tiempoMs);
    const terminar = (t: Omit<Termino, "bytesDeStderr" | "vencio">) => {
      clearTimeout(reloj);
      // Lo que la herramienta dejó vivo (un daemon de ZAP, un hijo dormido) no sobrevive a la corrida.
      matarGrupo(hijo.pid);
      enCurso.delete(registro);
      resolver({ ...t, bytesDeStderr: bytes, vencio });
    };
    hijo.on("error", (e) =>
      terminar({ error: e.message, status: null, signal: null }),
    );
    hijo.on("close", (status, signal) =>
      terminar({ error: null, status, signal }),
    );
  });
}

/** Hoy según el reloj del sistema (la única lectura del reloj del ejecutor; el motor sigue recibiendo la fecha como entrada). */
const hoyDelSistema = () => new Date().toISOString().slice(0, 10);
const DIA_MS = 24 * 60 * 60 * 1000;
const diasEntre = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
  DIA_MS;

const RUTA_DE_LOS_COMANDOS = "datos/ejecutor/comandos.json";
const TIEMPO_POR_DEFECTO_S = 600;

const USO =
  "uso: ejecutor <activo> --fecha AAAA-MM-DD --objetivo <url> [--config herramienta=ruta]… [--herramienta <id>]… [--ejecutar --por <persona> [--zona <IANA>] [--tiempo <segundos>]] [--idioma es|en]\nusage: ejecutor <asset> --fecha YYYY-MM-DD --objetivo <url> [--config tool=path]… [--herramienta <id>]… [--ejecutar --por <person> [--zona <IANA>] [--tiempo <seconds>]] [--idioma es|en]\nSin --ejecutar solo muestra los comandos / Without --ejecutar it only shows the commands.";

function opciones(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      fecha: { type: "string" },
      objetivo: { type: "string" },
      config: { type: "string", multiple: true },
      herramienta: { type: "string", multiple: true },
      ejecutar: { type: "boolean", default: false },
      por: { type: "string" },
      zona: { type: "string" },
      tiempo: { type: "string" },
      idioma: { type: "string", default: "es" },
    },
  });
  return {
    ...values,
    id: positionals[0]?.toLowerCase(),
    sobrantes: positionals.slice(1),
  };
}

/** Busca el ejecutable en el PATH sin pasar por un shell: la primera carpeta que lo tenga como archivo ejecutable. */
function buscarEnElPath(
  nombre: string,
  entorno: NodeJS.ProcessEnv,
): string | null {
  for (const carpeta of (entorno.PATH ?? "").split(path.delimiter)) {
    if (carpeta === "") continue;
    const candidato = path.join(carpeta, nombre);
    try {
      if (!statSync(candidato).isFile()) continue;
      accessSync(candidato, constants.X_OK);
      return candidato;
    } catch {
      continue;
    }
  }
  return null;
}

/** Cada argumento entre comillas JSON: lo que se ve es lo que se lanza, sin ambigüedad de espacios ni de shell. */
const mostrar = (o: Orden) =>
  [o.ejecutable, ...o.argumentos].map((a) => JSON.stringify(a)).join(" ");

/** Si el objetivo no viaja en los argumentos, la herramienta lo toma de TU configuración y HackGuard no puede verificarlo. */
const avisoDelObjetivo = (o: Orden) =>
  o.objetivo_en_argumento
    ? ""
    : `    ⚠ ${o.herramienta} toma su objetivo de TU configuración: HackGuard no puede verificarlo; asegúrate de que apunte a «${o.entorno.HACKGUARD_OBJETIVO ?? ""}» / ${o.herramienta} takes its target from YOUR configuration: HackGuard cannot verify it; make sure it points to that target\n`;

const linea = (r: Rechazo) =>
  `  ✗ [${r.guarda}]${r.herramienta === null ? "" : ` ${r.herramienta}`}: ${r.mensaje.es}\n    ${r.mensaje.en}\n`;

/** El archivo que escribió la herramienta: el que dice su comando o el único .json de la carpeta. */
function archivoDeSalida(carpeta: string, orden: Orden): string | null {
  if (orden.salida !== null) {
    const ruta = path.join(carpeta, orden.salida);
    return existsSync(ruta) ? ruta : null;
  }
  const jsons = readdirSync(carpeta).filter((n) => n.endsWith(".json"));
  return jsons.length === 1 ? path.join(carpeta, jsons[0]!) : null;
}

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (o.id === undefined || o.sobrantes.length > 0) throw new ErrorDeUso(USO);
  if (o.fecha === undefined || !esFechaCivil(o.fecha))
    throw new ErrorDeUso("--fecha AAAA-MM-DD / --fecha YYYY-MM-DD");
  if (o.objetivo === undefined || o.objetivo === "")
    throw new ErrorDeUso(
      "--objetivo <url>: el ejecutor no adivina qué se ataca / the executor does not guess what is attacked",
    );
  const configuraciones: Record<string, string> = {};
  for (const c of o.config ?? []) {
    const i = c.indexOf("=");
    if (i <= 0 || i === c.length - 1)
      throw new ErrorDeUso(`--config herramienta=ruta (recibí «${c}»)`);
    configuraciones[c.slice(0, i)] = path.resolve(c.slice(i + 1));
  }
  if (o.idioma !== "es" && o.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  if (o.ejecutar && diasEntre(o.fecha, hoyDelSistema()) > 1)
    throw new ErrorDeUso(
      `--fecha ${o.fecha} no es la de hoy (${hoyDelSistema()}): con --ejecutar la fecha de la corrida es la del reloj, porque la vigencia de la autorización se compara con ella / with --ejecutar the run date is the clock's, because the authorization's validity is compared with it`,
    );
  if (o.ejecutar && (o.por === undefined || o.por.trim() === ""))
    throw new ErrorDeUso(
      "--por <persona>: quién lanza la corrida queda en el lote / who launches the run is recorded in the batch",
    );
  const tiempoS =
    o.tiempo === undefined ? TIEMPO_POR_DEFECTO_S : Number(o.tiempo);
  if (!Number.isInteger(tiempoS) || tiempoS < 1)
    throw new ErrorDeUso(
      "--tiempo <segundos> entero positivo / positive integer",
    );

  const raiz = process.cwd();
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const archivo = cargarActivos(raiz).find((a) =>
    a.ruta.endsWith(`/${o.id}.json`),
  );
  if (archivo === undefined)
    throw new ErrorDeUso(
      `no hay un activo «${o.id}» / there is no asset “${o.id}”`,
    );
  const activos = await cargarActivosDelBuild(instantanea, raiz, {
    privados: true,
  });
  const cargado = activos.activos.find((a) => a.activo.id === o.id);
  if (cargado === undefined)
    throw new ErrorDeUso(
      `el activo «${o.id}» no pasa su validación / does not pass validation`,
    );
  const tabla = TablaDeComandos.parse(
    JSON.parse(readFileSync(path.join(raiz, RUTA_DE_LOS_COMANDOS), "utf8")),
  );
  const libro = await cargarLibroValidado(raiz, instantanea, {
    privados: true,
  });
  const emitido = libro.planes[o.id];
  const instaladas: Record<string, string | null> = {};
  for (const [id, comando] of Object.entries(tabla.herramientas))
    instaladas[id] =
      comando === null ? null : buscarEnElPath(comando.ejecutable, process.env);

  const huellaVigente = await huellaDelActivo(cargado.activo);
  const decidir = (carpeta: string) =>
    decidirEjecucion({
      activo: cargado.activo,
      origenDeLaCarpeta: origenDelActivo(raiz, o.id!),
      plan:
        emitido === undefined
          ? null
          : {
              paquete: emitido.paquete,
              huellaDelActivoVigente: huellaVigente,
            },
      fecha: o.fecha!,
      objetivo: o.objetivo!,
      configuraciones,
      soloEstas: o.herramienta ?? [],
      tabla,
      instaladas,
      conAdaptador: new Set(ADAPTADORES.map((a) => a.herramienta)),
      carpeta,
    });

  // Sin --ejecutar: el ensayo. Las mismas guardas, ningún proceso.
  const ensayo = decidir("<carpeta temporal / temporary folder>");
  if (!ensayo.ok) {
    process.stdout.write(
      `RECHAZADO: el ejecutor no lanza nada / REJECTED: the executor launches nothing\n${ensayo.rechazos.map(linea).join("")}`,
    );
    return CODIGOS_DEL_EJECUTOR.rechazado;
  }
  if (!o.ejecutar) {
    process.stdout.write(
      `ENSAYO (no se lanza nada; agrega --ejecutar para correr tus herramientas) / DRY RUN (nothing is launched; add --ejecutar to run your tools)\nObjetivo autorizado / authorized target: ${ensayo.objetivo}\n`,
    );
    for (const orden of ensayo.ordenes)
      process.stdout.write(
        `  → ${orden.herramienta} (${orden.pruebas.length} pruebas / tests): ${mostrar(orden)}\n${avisoDelObjetivo(orden)}`,
      );
    process.stdout.write(ensayo.omitidas.map(linea).join(""));
    if (ensayo.ordenes.length === 0)
      process.stdout.write("Nada que lanzar / Nothing to launch\n");
    return ensayo.omitidas.length > 0
      ? CODIGOS_DEL_EJECUTOR.con_algo_que_mirar
      : CODIGOS_DEL_EJECUTOR.ok;
  }

  // Con --ejecutar: cada herramienta en su carpeta temporal 0700, que se borra pase lo que pase.
  let miralo = ensayo.omitidas.length > 0;
  process.stdout.write(ensayo.omitidas.map(linea).join(""));
  for (const previa of ensayo.ordenes) {
    const carpeta = mkdtempSync(path.join(tmpdir(), "hackguard-ejecutor-"));
    try {
      const decidido = decidir(carpeta);
      const orden = decidido.ok
        ? decidido.ordenes.find((x) => x.herramienta === previa.herramienta)
        : undefined;
      if (orden === undefined) continue;
      process.stdout.write(
        `Lanzando / Launching ${orden.herramienta}: ${mostrar(orden)}\n${avisoDelObjetivo(orden)}`,
      );
      // Entorno de la herramienta: solo lo que su comando declara, más el objetivo (M4: nada más de tu entorno viaja).
      const env: Record<string, string> = {};
      for (const nombre of orden.hereda)
        if (process.env[nombre] !== undefined)
          env[nombre] = process.env[nombre];
      Object.assign(env, orden.entorno);
      const r = await lanzar(orden, carpeta, env, tiempoS * 1000);
      const salioBien =
        r.error === null &&
        !r.vencio &&
        r.status !== null &&
        orden.codigos_ok.includes(r.status);
      if (!salioBien) {
        miralo = true;
        const motivo = r.vencio
          ? `venció --tiempo (${tiempoS} s)`
          : r.error !== null
            ? r.error
            : `salió con código ${r.status ?? r.signal}`;
        process.stdout.write(
          `  ✗ ${orden.herramienta} no terminó bien (${motivo}); no se importó nada de ella / did not finish well; nothing was imported\n`,
        );
        // Lo que la herramienta escribe en stderr puede traer prompts, respuestas o claves: aquí solo su tamaño.
        if (r.bytesDeStderr > 0)
          process.stdout.write(
            `    stderr: ${r.bytesDeStderr} bytes (no se muestran ni se guardan / not shown, not stored)\n`,
          );
        continue;
      }
      const salida = archivoDeSalida(carpeta, orden);
      if (salida === null) {
        miralo = true;
        process.stdout.write(
          `  ✗ ${orden.herramienta} terminó pero no dejó su archivo de resultados; no se importó nada / finished but left no result file; nothing was imported\n`,
        );
        continue;
      }
      // El libro se recarga por herramienta: el lote anterior ya cuenta para los ids del siguiente.
      const r2 = await importarCorrida({
        raiz,
        libro: await cargarLibroValidado(raiz, instantanea, { privados: true }),
        herramienta: orden.herramienta,
        archivo: salida,
        activo: o.id,
        por: o.por!,
        fecha: o.fecha,
        zona: o.zona ?? null,
        idioma: o.idioma,
      });
      if (r2.tipo === "uso") {
        miralo = true;
        process.stdout.write(`  ✗ ${r2.mensaje}\n`);
        continue;
      }
      process.stdout.write(r2.texto);
      if (r2.codigo !== 0) miralo = true;
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  }
  process.stdout.write(
    "El ejecutor no confirma nada: lo propuesto cuenta cuando una persona lo confirme (pnpm evidencia:confirmar-lote) / The executor confirms nothing: what it proposes counts once a person confirms it\n",
  );
  return miralo
    ? CODIGOS_DEL_EJECUTOR.con_algo_que_mirar
    : CODIGOS_DEL_EJECUTOR.ok;
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (e: unknown) => {
    const detalle = e instanceof Error ? e.message : String(e);
    if (e instanceof ErrorDeUso) process.stderr.write(`${detalle}\n`);
    else process.stderr.write(`error / error: ${detalle}\n`);
    // Un error inesperado (un JSON de datos roto, un archivo ilegible) no es un rechazo de guarda: sale con el 3, no con el 2.
    process.exitCode = CODIGOS_DEL_EJECUTOR.uso;
  },
);
