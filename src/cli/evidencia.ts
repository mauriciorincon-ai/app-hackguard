// CLI del libro de evidencia: `pnpm evidencia:registrar`, `evidencia:confirmar`, `evidencia:validar`,
// `hallazgos:listar` y `hallazgos:declarar`. Solo lee y escribe archivos; lo demás (armar el sobre, calcular el
// veredicto, las huellas, abrir y cerrar hallazgos, redactar la salida) lo hace el motor. Corre con el TypeScript
// nativo de Node: `node src/cli/evidencia.ts <comando> [opciones]`.
//
//   registrar         <resultado.json> --crudo <archivo>
//   confirmar         <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]
//                     [--titulo-es --titulo-en --descripcion-es --descripcion-en]
//   importar          --garak <report.jsonl> | --zap <report.json> --activo <id> --por <persona> [--zona <IANA>] [--fecha AAAA-MM-DD]
//   confirmar-lote    <LOTE-NNNN> --por <persona> --fecha AAAA-MM-DD [--separar <SOB-NNNN>]… | --revisar-uno-por-uno
//   validar           [--json] [--idioma es|en]
//   hallazgos-listar  --fecha AAAA-MM-DD [--json] [--idioma es|en]
//   hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <persona> --fecha AAAA-MM-DD
//                     --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]
//
// Nada de lo que esta CLI escribe lleva el crudo de una herramienta: `registrar` e `importar` lo leen solo para
// resumirlo en una huella y lo descartan; el campo `attack` de ZAP y los textos de garak nunca llegan a un sobre. Lo de un activo propio va a `datos/privado/` (archivos 0600, carpetas 0700; regla 17-bis).
// Códigos de salida: 0 ok · 1 con algo que mirar (advertencias) · 2 bloqueado (inválido, o lo pedido contradice una
// regla del libro; no escribe nada) · 3 error de uso o de lectura.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { Idioma } from "../engine/catalogo/informe.ts";
import type { Instantanea } from "../engine/catalogo/instantanea.ts";
import { Sobre, type Sobre as SobreT } from "../engine/evidencia/esquemas.ts";
import { huellaDelCrudo } from "../engine/evidencia/huellas.ts";
import {
  CODIGOS_DEL_LIBRO,
  codigoDeValidacion,
  informeDeHallazgos,
  informeDeValidacion,
  salidaJsonDeHallazgos,
  type FilaDeListadoDeHallazgo,
} from "../engine/evidencia/informe.ts";
import { adaptadorDe } from "../engine/adaptadores/index.ts";
import { huella } from "../engine/huella.ts";
import {
  confirmar,
  huellaDelLibro,
  siguienteId,
} from "../engine/evidencia/libro.ts";
import {
  nombreDeArchivo,
  type TextoBilingue,
} from "../engine/evidencia/molde.ts";
import { armarSobre, EntradaDeRegistro } from "../engine/evidencia/registro.ts";
import { validarEvidencia } from "../engine/evidencia/validar.ts";
import {
  decidirApertura,
  hallazgoNuevo,
  siguienteIdDeHallazgo,
} from "../engine/hallazgos/apertura.ts";
import { evaluarHallazgo } from "../engine/hallazgos/ciclo.ts";
import { armarLote, siguienteIdDeLote } from "../engine/lotes/armar.ts";
import { confirmarLote } from "../engine/lotes/confirmar.ts";
import { revisionDelLote } from "../engine/lotes/revision.ts";
import { fallasSinHallazgo, validarLotes } from "../engine/lotes/validar.ts";
import { situacionDeHallazgo } from "../engine/hallazgos/situacion.ts";
import { motivoDeVectorInvalido } from "../engine/severidad/cvss.ts";
import {
  Hallazgo,
  type Evento,
  type SeveridadDeEntrada,
} from "../engine/hallazgos/esquemas.ts";
import {
  FAMILIA_CON_CVSS,
  validarHallazgos,
} from "../engine/hallazgos/validar.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";
import { cargarLibroValidado } from "../lib/evidencia/cargar-libro.ts";
import {
  CARPETA_DE_HALLAZGOS_DEMO,
  CARPETA_DE_HALLAZGOS_PRIVADA,
  CARPETA_DE_LOTES_DEMO,
  CARPETA_DE_LOTES_PRIVADA,
  CARPETA_DE_SOBRES_DEMO,
  CARPETA_DE_SOBRES_PRIVADA,
  cargarEscalaIa,
  cargarPlazos,
  escribirDato,
  origenDelActivo,
} from "../lib/evidencia/cargar-evidencia.ts";

const USO = {
  es: "uso: evidencia registrar <resultado.json> --crudo <archivo>\n     evidencia importar --garak <report.jsonl> | --zap <report.json> --activo <id> --por <persona> [--zona <IANA>] [--fecha AAAA-MM-DD]\n     evidencia confirmar-lote <LOTE-NNNN> --por <persona> --fecha AAAA-MM-DD [--separar <SOB-NNNN>]… | --revisar-uno-por-uno\n     evidencia confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]\n     evidencia validar [--json] [--idioma es|en]\n     evidencia hallazgos-listar --fecha AAAA-MM-DD [--json] [--idioma es|en]\n     evidencia hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <persona> --fecha AAAA-MM-DD --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]",
  en: "usage: evidencia registrar <result.json> --crudo <file>\n       evidencia importar --garak <report.jsonl> | --zap <report.json> --activo <id> --por <person> [--zona <IANA>] [--fecha YYYY-MM-DD]\n       evidencia confirmar-lote <LOTE-NNNN> --por <person> --fecha YYYY-MM-DD [--separar <SOB-NNNN>]… | --revisar-uno-por-uno\n       evidencia confirmar <SOB-NNNN> --por <person> --fecha YYYY-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]\n       evidencia validar [--json] [--idioma es|en]\n       evidencia hallazgos-listar --fecha YYYY-MM-DD [--json] [--idioma es|en]\n       evidencia hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <person> --fecha YYYY-MM-DD --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]",
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
      por: { type: "string" },
      crudo: { type: "string" },
      garak: { type: "string" },
      zap: { type: "string" },
      activo: { type: "string" },
      zona: { type: "string" },
      separar: { type: "string", multiple: true },
      "revisar-uno-por-uno": { type: "boolean", default: false },
      cvss: { type: "string" },
      impacto: { type: "string" },
      alcance: { type: "string" },
      detectabilidad: { type: "string" },
      "titulo-es": { type: "string" },
      "titulo-en": { type: "string" },
      "descripcion-es": { type: "string" },
      "descripcion-en": { type: "string" },
      "justificacion-es": { type: "string" },
      "justificacion-en": { type: "string" },
      "revision-en-dias": { type: "string" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  return {
    ...values,
    idioma: values.idioma as Idioma,
    comando: positionals[0],
    objetivo: positionals[1],
    accion: positionals[2],
    sobrantes: positionals.slice(3),
  };
}

const imprimir = (valor: unknown) =>
  process.stdout.write(`${JSON.stringify(valor, null, 2)}\n`);
const escribirTexto = (texto: string) => process.stdout.write(texto);
/** Los estados de los que ya no se declara nada: cerrados por re-prueba, por eliminación o no reproducibles. */
const ESTADOS_TERMINALES = new Set<string>([
  "cerrado",
  "cerrado_por_eliminacion",
  "no_reproducible",
]);
const json = (valor: unknown) => `${JSON.stringify(valor, null, 2)}\n`;

const entero = (texto: string | undefined, bandera: string): number => {
  const n = Number(texto);
  if (texto === undefined || !Number.isInteger(n))
    throw new ErrorDeUso(`${bandera} n`);
  return n;
};

function requerido(valor: string | undefined, bandera: string): string {
  if (valor === undefined || valor.trim() === "") throw new ErrorDeUso(bandera);
  return valor;
}

/** El nombre de un estado en el vocabulario de la instantánea oficial. */
function nombreDeEstado(
  i: Instantanea,
  vocabulario: string,
  id: string,
): TextoBilingue {
  const v = i.catalogo.estados.find((x) => x.id === vocabulario);
  const e = v?.estados.find((x) => x.id === id);
  return e?.nombre ?? { es: id, en: id };
}

async function cargarLibro(raiz: string) {
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  return cargarLibroValidado(raiz, instantanea, { privados: true });
}

const CUENTA = {
  sobres: (n: number, c: number): TextoBilingue => ({
    es: `${n} sobres válidos · ${c} confirmados · ${n - c} por confirmar`,
    en: `${n} valid envelopes · ${c} confirmed · ${n - c} to confirm`,
  }),
  lotes: (n: number, c: number): TextoBilingue => ({
    es: `${n} lotes válidos · ${c} confirmados · ${n - c} por confirmar`,
    en: `${n} valid batches · ${c} confirmed · ${n - c} to confirm`,
  }),
  hallazgos: (n: number): TextoBilingue => ({
    es: `${n} hallazgos válidos`,
    en: `${n} valid findings`,
  }),
};

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (o.sobrantes.length > 0) throw new ErrorDeUso(o.sobrantes.join(" "));
  const raiz = process.cwd();
  const L = await cargarLibro(raiz);

  if (o.comando === "validar") {
    const estados = [L.sobres.estado, L.lotes.estado, L.hallazgos.estado];
    const estado = estados.includes("invalido")
      ? "invalido"
      : estados.includes("con_advertencias")
        ? "con_advertencias"
        : "ok";
    if (o.json)
      imprimir({
        estado,
        codigo_de_salida: codigoDeValidacion(estado),
        sobres: {
          estado: L.sobres.estado,
          validos: L.sobres.sobres.map((s) => s.sobre.id),
          hallazgos: L.sobres.hallazgos,
        },
        lotes: {
          estado: L.lotes.estado,
          validos: L.lotes.lotes.map((l) => l.lote.id),
          hallazgos: L.lotes.hallazgos,
        },
        hallazgos: {
          estado: L.hallazgos.estado,
          validos: L.hallazgos.validos.map((h) => h.id),
          hallazgos: L.hallazgos.hallazgos,
        },
      });
    else {
      const confirmados = L.libro.filter(
        (s) => s.sobre.confirmacion !== null,
      ).length;
      const lotesConfirmados = L.lotes.lotes.filter(
        (l) => l.lote.confirmacion !== null,
      ).length;
      escribirTexto(
        informeDeValidacion(
          { es: "Sobres", en: "Envelopes" },
          L.sobres.estado,
          CUENTA.sobres(L.sobres.sobres.length, confirmados),
          L.sobres.hallazgos,
          o.idioma,
        ),
      );
      escribirTexto("\n");
      escribirTexto(
        informeDeValidacion(
          { es: "Lotes", en: "Batches" },
          L.lotes.estado,
          CUENTA.lotes(L.lotes.lotes.length, lotesConfirmados),
          L.lotes.hallazgos,
          o.idioma,
        ),
      );
      escribirTexto("\n");
      escribirTexto(
        informeDeValidacion(
          { es: "Hallazgos", en: "Findings" },
          L.hallazgos.estado,
          CUENTA.hallazgos(L.hallazgos.validos.length),
          L.hallazgos.hallazgos,
          o.idioma,
        ),
      );
    }
    return codigoDeValidacion(estado);
  }

  if (o.comando === "registrar") {
    const archivoDeEntrada = requerido(o.objetivo, "<resultado.json>");
    const archivoCrudo = requerido(o.crudo, "--crudo <archivo>");
    const entrada = EntradaDeRegistro.safeParse(
      JSON.parse(
        readFileSync(path.resolve(archivoDeEntrada), "utf8"),
      ) as unknown,
    );
    if (!entrada.success)
      throw new ErrorDeUso(
        `el resultado no cumple el esquema / the result does not meet the schema: ${entrada.error.issues.map((p) => `${p.path.join(".")}: ${p.message}`).join("; ")}`,
      );
    const e = entrada.data;
    // El crudo se lee SOLO para resumirlo: sus bytes se descartan al terminar este bloque (regla dura 4).
    const huellaDelCrudoLeido = await huellaDelCrudo(
      readFileSync(path.resolve(archivoCrudo)),
    );
    const origen = origenDelActivo(raiz, e.activo);
    if (origen === null)
      throw new ErrorDeUso(
        `no hay un activo «${e.activo}» / there is no asset “${e.activo}”`,
      );
    const emitido = L.planes[e.activo];
    if (emitido === undefined) {
      escribirTexto(
        `El activo «${e.activo}» no tiene plan emitido: sin plan no hay evidencia que registrar.\nAsset “${e.activo}” has no issued plan: with no plan there is no evidence to record.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const regla = L.contexto.pruebas.find((p) => p.id === e.prueba)?.regla;
    if (regla === undefined)
      throw new ErrorDeUso(
        `la prueba «${e.prueba}» no está en el catálogo / test “${e.prueba}” is not in the catalog`,
      );
    const id = siguienteId(
      L.archivosDeSobres.map((a) => ({
        id: nombreDeArchivo(a.ruta).replace(/\.json$/, ""),
      })),
    );
    const armado = await armarSobre(e, {
      id,
      origen,
      emitido,
      regla,
      crudo: huellaDelCrudoLeido,
    });
    if (!armado.ok) {
      escribirTexto(
        `No se registró nada: ${armado.motivo}.\nNothing was recorded: ${armado.motivo}.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const carpeta =
      origen === "propio" ? CARPETA_DE_SOBRES_PRIVADA : CARPETA_DE_SOBRES_DEMO;
    const ruta = `${carpeta}/${id}.json`;
    const texto = json(armado.sobre);
    // El sobre nuevo se valida con el libro entero ANTES de escribir nada.
    const prueba = await validarEvidencia(
      [...L.archivosDeSobres, { ruta, texto }],
      L.contexto,
    );
    const suyos = prueba.hallazgos.filter((h) => h.ruta === ruta);
    if (suyos.some((h) => h.severidad === "error")) {
      escribirTexto(
        informeDeValidacion(
          { es: "Sobre", en: "Envelope" },
          "invalido",
          { es: id, en: id },
          suyos,
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    escribirDato(raiz, ruta, texto, origen === "propio");
    escribirTexto(
      o.idioma === "es"
        ? `Sobre ${id} registrado en ${ruta}: veredicto «${armado.sobre.veredicto}», SIN confirmar (no cuenta).\nConfírmalo con: pnpm evidencia:confirmar ${id} --por <persona> --fecha AAAA-MM-DD\n`
        : `Envelope ${id} recorded in ${ruta}: verdict “${armado.sobre.veredicto}”, NOT confirmed (it does not count).\nConfirm it with: pnpm evidencia:confirmar ${id} --por <person> --fecha YYYY-MM-DD\n`,
    );
    return suyos.some((h) => h.severidad === "advertencia")
      ? CODIGOS_DEL_LIBRO.con_advertencias
      : CODIGOS_DEL_LIBRO.ok;
  }

  if (o.comando === "importar") {
    const herramienta =
      o.garak !== undefined ? "garak" : o.zap !== undefined ? "zap" : null;
    if (herramienta === null || (o.garak !== undefined && o.zap !== undefined))
      throw new ErrorDeUso("--garak <report.jsonl> | --zap <report.json>");
    const archivoDeLaHerramienta = path.resolve(o.garak ?? o.zap ?? "");
    const activo = requerido(o.activo, "--activo <id>");
    const por = requerido(o.por, "--por <persona>");
    const adaptador = adaptadorDe(herramienta);
    if (adaptador === undefined) throw new ErrorDeUso(herramienta);
    // El archivo de la herramienta se lee UNA vez: se resume en una huella y se descarta (regla dura 4).
    const bytes = readFileSync(archivoDeLaHerramienta);
    const huellaDelArchivo = await huellaDelCrudo(bytes);
    const textoDelArchivo = bytes.toString("utf8");
    const origen = origenDelActivo(raiz, activo);
    if (origen === null)
      throw new ErrorDeUso(
        `no hay un activo «${activo}» / there is no asset “${activo}”`,
      );
    if (origen === "demo") {
      escribirTexto(
        `Un activo demo no recibe archivos reales de una herramienta: lo real va a un activo propio (datos/privado/activos/).\nA demo asset takes no real tool files: real data goes to an own asset (datos/privado/activos/).\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const emitido = L.planes[activo];
    if (emitido === undefined) {
      escribirTexto(
        `El activo «${activo}» no tiene plan emitido: sin plan no hay evidencia que importar.\nAsset “${activo}” has no issued plan: with no plan there is no evidence to import.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const minima =
      emitido.paquete.herramientas.find((h) => h.herramienta === herramienta)
        ?.version_minima ?? null;
    const lectura = adaptador.leer(textoDelArchivo, minima);
    if (!lectura.ok) {
      escribirTexto(
        `No se armó ningún lote: el archivo no se pudo leer como ${adaptador.id} (${lectura.motivo}): ${lectura.detalle}.\nNo batch was built: the file could not be read as ${adaptador.id} (${lectura.motivo}): ${lectura.detalle}.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const previo = L.lotes.lotes.find(
      (l) =>
        l.lote.activo === activo && l.lote.huellas.archivo === huellaDelArchivo,
    );
    if (previo !== undefined) {
      escribirTexto(
        `Ese archivo ya se importó como ${previo.lote.id}: la misma corrida no se importa dos veces.\nThat file was already imported as ${previo.lote.id}: the same run is not imported twice.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const idsDe = (archivos: { ruta: string }[]) =>
      archivos.map((a) => ({
        id: nombreDeArchivo(a.ruta).replace(/\.json$/, ""),
      }));
    const armado = await armarLote({
      adaptador,
      corrida: lectura.corrida,
      archivo: {
        nombre: path.basename(archivoDeLaHerramienta),
        huella: huellaDelArchivo,
      },
      activo,
      origen,
      emitido,
      pruebas: L.contexto.pruebas,
      idDeLote: siguienteIdDeLote(idsDe(L.archivosDeLotes)),
      existentes: idsDe(L.archivosDeSobres),
      ejecutadoPor: por,
      fecha: o.fecha ?? null,
      zonaHoraria: o.zona ?? null,
    });
    if (!armado.ok) {
      if (armado.motivo === "falta_fecha")
        throw new ErrorDeUso(
          "--fecha AAAA-MM-DD (el reporte no trae la fecha)",
        );
      if (armado.motivo === "falta_zona")
        throw new ErrorDeUso(
          "--zona <IANA> (el reporte no declara su zona horaria)",
        );
      escribirTexto(
        `No se armó ningún lote: ${armado.motivo}${armado.prueba === undefined ? "" : ` (${armado.prueba})`}.\nNo batch was built: ${armado.motivo}${armado.prueba === undefined ? "" : ` (${armado.prueba})`}.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const carpetaDeSobres =
      origen === "propio" ? CARPETA_DE_SOBRES_PRIVADA : CARPETA_DE_SOBRES_DEMO;
    const rutaDelLote = `${origen === "propio" ? CARPETA_DE_LOTES_PRIVADA : CARPETA_DE_LOTES_DEMO}/${armado.lote.id}.json`;
    const nuevosSobres = armado.sobres.map((x) => ({
      ruta: `${carpetaDeSobres}/${x.id}.json`,
      texto: json(x),
    }));
    // Todo se valida con el libro entero ANTES de escribir nada.
    const pruebaDeSobres = await validarEvidencia(
      [...L.archivosDeSobres, ...nuevosSobres],
      L.contexto,
    );
    const nuevosSuyos = pruebaDeSobres.hallazgos.filter((h) =>
      nuevosSobres.some((n) => n.ruta === h.ruta),
    );
    const pruebaDeLotes = await validarLotes(
      [...L.archivosDeLotes, { ruta: rutaDelLote, texto: json(armado.lote) }],
      { sobres: pruebaDeSobres.sobres, planes: L.planes, muestreo: L.muestreo },
    );
    const loteSuyo = pruebaDeLotes.hallazgos.filter(
      (h) => h.ruta === rutaDelLote,
    );
    const errores = [...nuevosSuyos, ...loteSuyo].filter(
      (h) => h.severidad === "error",
    );
    if (errores.length > 0) {
      escribirTexto(
        informeDeValidacion(
          { es: "Lote", en: "Batch" },
          "invalido",
          { es: armado.lote.id, en: armado.lote.id },
          [...nuevosSuyos, ...loteSuyo],
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    for (const n of nuevosSobres)
      escribirDato(raiz, n.ruta, n.texto, origen === "propio");
    escribirDato(raiz, rutaDelLote, json(armado.lote), origen === "propio");
    const revision = await revisionDelLote(
      armado.lote,
      new Map(armado.sobres.map((x) => [x.id, x])),
      L.muestreo,
    );
    const cuenta = (v: string) =>
      armado.sobres.filter((x) => x.veredicto === v).length;
    escribirTexto(
      o.idioma === "es"
        ? `Lote ${armado.lote.id} armado en ${rutaDelLote} con ${armado.sobres.length} sobres (${cuenta("fallida")} fallidas, ${cuenta("parcial")} parciales, ${cuenta("no_ejecutada")} no ejecutadas, ${cuenta("superada")} superadas), SIN confirmar (no cuentan).\nSe revisan siempre ${revision.siempre.length} y ${revision.muestra.length} de los otros ${revision.resto}: ${revision.revisados.join(", ")}.\nConfírmalo con: pnpm evidencia:confirmar-lote ${armado.lote.id} --por <persona> --fecha AAAA-MM-DD\n`
        : `Batch ${armado.lote.id} built at ${rutaDelLote} with ${armado.sobres.length} envelopes (${cuenta("fallida")} failed, ${cuenta("parcial")} partial, ${cuenta("no_ejecutada")} not run, ${cuenta("superada")} passed), NOT confirmed (they do not count).\n${revision.siempre.length} are always reviewed, plus ${revision.muestra.length} of the other ${revision.resto}: ${revision.revisados.join(", ")}.\nConfirm it with: pnpm evidencia:confirmar-lote ${armado.lote.id} --por <person> --fecha YYYY-MM-DD\n`,
    );
    return [...nuevosSuyos, ...loteSuyo].some(
      (h) => h.severidad === "advertencia",
    )
      ? CODIGOS_DEL_LIBRO.con_advertencias
      : CODIGOS_DEL_LIBRO.ok;
  }

  if (o.comando === "confirmar-lote") {
    const id = requerido(o.objetivo, "<LOTE-NNNN>").toUpperCase();
    const por = requerido(o.por, "--por <persona>");
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    const delArchivo = L.archivosDeLotes.find(
      (a) => nombreDeArchivo(a.ruta) === `${id}.json`,
    );
    if (delArchivo === undefined)
      throw new ErrorDeUso(
        `no hay un lote «${id}» / there is no batch “${id}”`,
      );
    const valido = L.lotes.lotes.find((l) => l.lote.id === id);
    if (valido === undefined) {
      escribirTexto(
        informeDeValidacion(
          { es: "Lotes", en: "Batches" },
          L.lotes.estado,
          CUENTA.lotes(L.lotes.lotes.length, 0),
          L.lotes.hallazgos.filter((h) => h.ruta === delArchivo.ruta),
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const separar = o.separar ?? [];
    if (o["revisar-uno-por-uno"] && separar.length > 0)
      throw new ErrorDeUso("--separar y --revisar-uno-por-uno no van juntos");
    const delLote = valido.lote.sobres.flatMap((c) => {
      const s = L.sobres.sobres.find((x) => x.sobre.id === c.id);
      return s === undefined ? [] : [s.sobre];
    });
    const decidido = await confirmarLote({
      lote: valido.lote,
      sobres: delLote,
      plan: L.muestreo,
      libro: L.libro.map((x) => x.sobre),
      hallazgos: L.hallazgos.validos,
      por,
      fecha,
      decision: o["revisar-uno-por-uno"]
        ? "a_revision_individual"
        : "confirmado",
      separar: separar.map((x) => x.toUpperCase()),
    });
    if (!decidido.ok) {
      const lista = decidido.ids.join(", ");
      const mensajes = {
        ya_decidido: [
          `El lote ${id} ya se decidió: la confirmación es inmutable.`,
          `Batch ${id} was already decided: the confirmation is immutable.`,
        ],
        fecha_anterior_a_la_corrida: [
          `La fecha de confirmación es anterior a la corrida (${valido.lote.fecha}).`,
          `The confirmation date predates the run (${valido.lote.fecha}).`,
        ],
        sobre_inexistente: [
          `El lote lista sobres que no están en el libro: ${lista}.`,
          `The batch lists envelopes that are not in the ledger: ${lista}.`,
        ],
        separa_lo_que_no_se_revisa_siempre: [
          `Solo se separan fallidas y parciales; no lo son: ${lista}.`,
          `Only failures and partials can be separated; these are not: ${lista}.`,
        ],
        sobre_ya_confirmado: [
          `Estos sobres ya tienen una confirmación individual y se confirmarían dos veces: ${lista}. Sepáralos del lote.`,
          `These envelopes already have an individual confirmation and would be confirmed twice: ${lista}. Separate them from the batch.`,
        ],
        falla_que_abre_hallazgo: [
          `Estas fallas abrirían un hallazgo y piden la severidad de una persona: sepáralas con --separar y confírmalas una por una (pnpm evidencia:confirmar): ${lista}.`,
          `These failures would open a finding and need a person's severity: separate them with --separar and confirm them one by one (pnpm evidencia:confirmar): ${lista}.`,
        ],
      } as const;
      const m = mensajes[decidido.motivo];
      escribirTexto(`${m[0]}\n${m[1]}\n`);
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const textoDelLote = json(decidido.lote);
    const prueba = await validarLotes(
      L.archivosDeLotes.map((a) =>
        a.ruta === delArchivo.ruta ? { ruta: a.ruta, texto: textoDelLote } : a,
      ),
      {
        sobres: L.sobres.sobres,
        planes: L.planes,
        muestreo: L.muestreo,
      },
    );
    const suyos = prueba.hallazgos.filter((h) => h.ruta === delArchivo.ruta);
    if (suyos.some((h) => h.severidad === "error")) {
      escribirTexto(
        informeDeValidacion(
          { es: "Lote", en: "Batch" },
          "invalido",
          { es: id, en: id },
          suyos,
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const sinHallazgo = fallasSinHallazgo(
      prueba.lotes,
      L.sobres.sobres.map((x) => x.sobre),
      L.hallazgos.validos,
    ).filter((h) => h.ruta === delArchivo.ruta);
    if (sinHallazgo.length > 0) {
      escribirTexto(
        informeDeValidacion(
          { es: "Lote", en: "Batch" },
          "invalido",
          { es: id, en: id },
          sinHallazgo,
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    escribirDato(
      raiz,
      delArchivo.ruta,
      textoDelLote,
      decidido.lote.origen === "propio",
    );
    const c = decidido.lote.confirmacion;
    const cuentan =
      c?.decision === "confirmado"
        ? decidido.lote.sobres.length - c.separados.length
        : 0;
    const aparte =
      c?.decision === "confirmado"
        ? c.separados
        : decidido.lote.sobres.map((x) => x.id);
    escribirTexto(
      o.idioma === "es"
        ? `Lote ${id} ${c?.decision === "confirmado" ? "confirmado" : "enviado a revisión individual"} por ${por} el ${fecha}: ${cuentan} sobres cuentan desde hoy${aparte.length > 0 ? `; ${aparte.length} se confirman uno por uno (${aparte.join(", ")}) con pnpm evidencia:confirmar` : ""}.\n`
        : `Batch ${id} ${c?.decision === "confirmado" ? "confirmed" : "sent to individual review"} by ${por} on ${fecha}: ${cuentan} envelopes count from today${aparte.length > 0 ? `; ${aparte.length} are confirmed one by one (${aparte.join(", ")}) with pnpm evidencia:confirmar` : ""}.\n`,
    );
    return CODIGOS_DEL_LIBRO.ok;
  }

  if (o.comando === "confirmar") {
    const id = requerido(o.objetivo, "<SOB-NNNN>").toUpperCase();
    const por = requerido(o.por, "--por <persona>");
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    const delArchivo = L.archivosDeSobres.find(
      (a) => nombreDeArchivo(a.ruta) === `${id}.json`,
    );
    if (delArchivo === undefined)
      throw new ErrorDeUso(
        `no hay un sobre «${id}» / there is no envelope “${id}”`,
      );
    const valido = L.sobres.sobres.find((s) => s.sobre.id === id);
    if (valido === undefined) {
      escribirTexto(
        informeDeValidacion(
          { es: "Sobres", en: "Envelopes" },
          L.sobres.estado,
          CUENTA.sobres(L.sobres.sobres.length, 0),
          L.sobres.hallazgos.filter((h) => h.ruta === delArchivo.ruta),
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const delLote = L.libro.find((x) => x.sobre.id === id)?.sobre.confirmacion;
    if (valido.sobre.confirmacion === null && delLote?.modo === "lote") {
      escribirTexto(
        `El sobre ${id} ya lo confirmó el lote ${delLote.lote ?? "?"}: no se confirma otra vez. Para discrepar, registra un sobre nuevo que lo corrija.\nEnvelope ${id} was already confirmed by batch ${delLote.lote ?? "?"}: it is not confirmed twice. To disagree, record a new envelope that corrects it.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const hecho = await confirmar(valido.sobre, por, fecha);
    if (!hecho.ok) {
      escribirTexto(
        hecho.motivo === "ya_confirmado"
          ? `El sobre ${id} ya está confirmado: la evidencia confirmada es inmutable. Para corregirlo, registra un sobre nuevo que lo cite.\nEnvelope ${id} is already confirmed: confirmed evidence is immutable. To correct it, record a new envelope that cites it.\n`
          : `La fecha de confirmación es anterior a la corrida (${valido.sobre.fecha}).\nThe confirmation date predates the run (${valido.sobre.fecha}).\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const confirmado: SobreT = Sobre.parse(hecho.sobre);
    const libro = L.libro.map((s) =>
      s.sobre.id === id ? confirmado : s.sobre,
    );
    const decision = decidirApertura(confirmado, libro, L.hallazgos.validos);
    const mensajes: string[] = [];
    let aEscribir: { ruta: string; texto: string; privado: boolean } | null =
      null;
    if (decision.abre) {
      const familia = L.contexto.pruebas.find(
        (p) => p.id === confirmado.prueba,
      )?.familia;
      const prueba = L.instantanea.catalogo.pruebas.find(
        (p) => p.id === confirmado.prueba,
      );
      if (familia === undefined || prueba === undefined)
        throw new ErrorDeUso(confirmado.prueba);
      // La severidad se calcula de lo que la persona aporta: el vector (software) o las tres escalas (las demás familias).
      let severidad: SeveridadDeEntrada;
      if (familia === FAMILIA_CON_CVSS)
        severidad = {
          tipo: "cvss",
          vector: requerido(
            o.cvss,
            "--cvss <vector CVSS:4.0/…> (la prueba es de software)",
          ),
        };
      else
        severidad = {
          tipo: "escala_ia",
          impacto: entero(o.impacto, "--impacto n"),
          alcance: entero(o.alcance, "--alcance n"),
          detectabilidad: entero(o.detectabilidad, "--detectabilidad n"),
        };
      const hid = siguienteIdDeHallazgo(
        L.archivosDeHallazgos.map((a) => ({
          id: nombreDeArchivo(a.ruta).replace(/\.json$/, ""),
        })),
      );
      const titulo = {
        es: o["titulo-es"] ?? prueba.nombre.es,
        en: o["titulo-en"] ?? prueba.nombre.en,
      };
      const descripcion = {
        es:
          o["descripcion-es"] ??
          `Se esperaba: ${prueba.resultado_esperado.descripcion.es} La corrida del ${confirmado.fecha} dio «${confirmado.veredicto}».`,
        en:
          o["descripcion-en"] ??
          `Expected: ${prueba.resultado_esperado.descripcion.en} The run of ${confirmado.fecha} gave “${confirmado.veredicto}”.`,
      };
      const nuevo = hallazgoNuevo(
        hid,
        confirmado,
        titulo,
        descripcion,
        severidad,
      );
      const privado = confirmado.origen === "propio";
      const ruta = `${privado ? CARPETA_DE_HALLAZGOS_PRIVADA : CARPETA_DE_HALLAZGOS_DEMO}/${hid}.json`;
      const texto = json(nuevo);
      const prueba2 = validarHallazgos(
        [...L.archivosDeHallazgos, { ruta, texto }],
        {
          libro: L.libro.map((x) =>
            x.sobre.id === id ? { ruta: x.ruta, sobre: confirmado } : x,
          ),
          pruebas: L.contexto.pruebas,
          vectorInvalido: motivoDeVectorInvalido,
        },
      );
      const suyos = prueba2.hallazgos.filter((h) => h.ruta === ruta);
      if (suyos.some((h) => h.severidad === "error")) {
        escribirTexto(
          informeDeValidacion(
            { es: "Hallazgo", en: "Finding" },
            "invalido",
            { es: hid, en: hid },
            suyos,
            o.idioma,
          ),
        );
        return CODIGOS_DEL_LIBRO.bloqueado;
      }
      aEscribir = { ruta, texto, privado };
      mensajes.push(
        o.idioma === "es"
          ? `Se abre el hallazgo ${hid} (${ruta}).`
          : `Finding ${hid} is opened (${ruta}).`,
      );
    } else {
      const razones = {
        no_falla: [
          "El sobre no es una falla: no abre ningún hallazgo.",
          "The envelope is not a failure: it opens no finding.",
        ],
        es_reprueba: [
          "El sobre es una re-prueba: se suma al hallazgo que cita, no abre otro.",
          "The envelope is a re-test: it adds to the finding it cites and opens no other.",
        ],
        ya_hay_uno: [
          `Ya hay un hallazgo vivo para esa prueba y ese activo (${decision.existente ?? "?"}): no se abre otro.`,
          `There is already a live finding for that test and asset (${decision.existente ?? "?"}): no other is opened.`,
        ],
        sin_confirmar: ["", ""],
      } as const;
      const r = razones[decision.motivo];
      mensajes.push(o.idioma === "es" ? r[0] : r[1]);
    }
    escribirDato(
      raiz,
      valido.ruta,
      json(confirmado),
      confirmado.origen === "propio",
    );
    if (aEscribir !== null)
      escribirDato(raiz, aEscribir.ruta, aEscribir.texto, aEscribir.privado);
    escribirTexto(
      `${o.idioma === "es" ? `Sobre ${id} confirmado por ${por} el ${fecha}: veredicto «${confirmado.veredicto}».` : `Envelope ${id} confirmed by ${por} on ${fecha}: verdict “${confirmado.veredicto}”.`}\n${mensajes.filter((m) => m !== "").join("\n")}\n`,
    );
    return CODIGOS_DEL_LIBRO.ok;
  }

  if (o.comando === "hallazgos-listar") {
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    const libro = L.libro.map((s) => s.sobre);
    const datos = {
      escala: cargarEscalaIa(raiz),
      plazos: cargarPlazos(raiz),
      fecha,
    };
    const filas: FilaDeListadoDeHallazgo[] = [];
    for (const h of L.hallazgos.validos) {
      const r = situacionDeHallazgo(h, libro, datos);
      if (!r.ok) {
        // Un sobre de origen que no cuenta ya lo dijo la validación; la fecha o el vector sí son cosa de quien pregunta.
        if (r.motivo.startsWith("fecha_anterior"))
          throw new ErrorDeUso(`--fecha: ${r.motivo} (${r.detalle})`);
        continue;
      }
      filas.push({
        situacion: r.situacion,
        estado: nombreDeEstado(
          L.instantanea,
          "estado_de_hallazgo",
          r.situacion.evaluacion.estado,
        ),
        nivel: nombreDeEstado(
          L.instantanea,
          "severidad",
          r.situacion.severidad.nivel,
        ),
      });
    }
    if (o.json) {
      const salida = salidaJsonDeHallazgos(filas, fecha);
      // Las dos huellas que los navegadores deben reproducir con las listas en otro orden (RNF-01).
      imprimir({
        ...salida,
        huella_del_libro: await huellaDelLibro(
          L.sobres.sobres.map((x) => x.sobre),
          L.lotes.lotes.map((x) => x.lote),
        ),
        huella_de_los_hallazgos: await huella(salida.hallazgos),
      });
    } else escribirTexto(informeDeHallazgos(filas, fecha, o.idioma));
    return L.sobres.estado === "invalido" || L.hallazgos.estado === "invalido"
      ? CODIGOS_DEL_LIBRO.invalido
      : L.sobres.estado === "con_advertencias" ||
          L.hallazgos.estado === "con_advertencias"
        ? CODIGOS_DEL_LIBRO.con_advertencias
        : CODIGOS_DEL_LIBRO.ok;
  }

  if (o.comando === "hallazgos-declarar") {
    const id = requerido(o.objetivo, "<HZ-NNNN>").toUpperCase();
    const accion = requerido(
      o.accion,
      "<corregido|aceptado|eliminado|no-reproducible>",
    );
    const por = requerido(o.por, "--por <persona>");
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    // Un hallazgo no se "cierra" a mano: solo una re-prueba válida lo cierra (regla dura 6).
    if (accion === "cerrado") {
      escribirTexto(
        'Un hallazgo solo se cierra con una re-prueba válida: un sobre confirmado, «superada», de la misma prueba y activo, posterior a la corrección y con la misma configuración. Registra la re-prueba con evidencia:registrar (con "reprueba_de": "' +
          id +
          '") y confírmala.\nA finding is only closed by a valid re-test: a confirmed, “passed” envelope of the same test and asset, after the correction and with the same configuration. Record the re-test with evidencia:registrar (with "reprueba_de": "' +
          id +
          '") and confirm it.\n',
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const archivo = L.archivosDeHallazgos.find(
      (a) => nombreDeArchivo(a.ruta) === `${id}.json`,
    );
    if (archivo === undefined)
      throw new ErrorDeUso(
        `no hay un hallazgo «${id}» / there is no finding “${id}”`,
      );
    const h = L.hallazgos.validos.find((x) => x.id === id);
    if (h === undefined) {
      escribirTexto(
        informeDeValidacion(
          { es: "Hallazgos", en: "Findings" },
          L.hallazgos.estado,
          CUENTA.hallazgos(L.hallazgos.validos.length),
          L.hallazgos.hallazgos.filter((x) => x.ruta === archivo.ruta),
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    // Un hallazgo ya cerrado no admite otra declaración: reabrirlo por esta puerta saltaría la regla de cierre (regla 6).
    const actual = evaluarHallazgo(
      h,
      L.libro.map((s) => s.sobre),
    );
    if (actual.ok && ESTADOS_TERMINALES.has(actual.evaluacion.estado)) {
      const estado = nombreDeEstado(
        L.instantanea,
        "estado_de_hallazgo",
        actual.evaluacion.estado,
      );
      escribirTexto(
        o.idioma === "es"
          ? `${id} ya está «${estado.es}»: no admite otra declaración. Si una prueba posterior vuelve a fallar, abre un hallazgo nuevo.\n`
          : `${id} is already “${estado.en}”: it takes no further declaration. If a later test fails again, it opens a new finding.\n`,
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    const justificacion = {
      es: requerido(o["justificacion-es"], "--justificacion-es <texto>"),
      en: requerido(o["justificacion-en"], "--justificacion-en <text>"),
    };
    let evento: Evento;
    if (accion === "corregido")
      evento = { tipo: "correccion", fecha, por, nota: justificacion };
    else if (accion === "aceptado")
      evento = {
        tipo: "aceptacion",
        fecha,
        por,
        revision_en_dias: entero(o["revision-en-dias"], "--revision-en-dias n"),
        justificacion,
      };
    else if (accion === "eliminado")
      evento = { tipo: "eliminacion", fecha, por, justificacion };
    else if (accion === "no-reproducible")
      evento = { tipo: "no_reproducible", fecha, por, justificacion };
    else throw new ErrorDeUso(accion);
    const nuevo = Hallazgo.parse({ ...h, eventos: [...h.eventos, evento] });
    const texto = json(nuevo);
    const prueba = validarHallazgos(
      L.archivosDeHallazgos.map((a) =>
        a.ruta === archivo.ruta ? { ruta: a.ruta, texto } : a,
      ),
      {
        libro: L.libro,
        pruebas: L.contexto.pruebas,
        vectorInvalido: motivoDeVectorInvalido,
      },
    );
    const suyos = prueba.hallazgos.filter((x) => x.ruta === archivo.ruta);
    if (suyos.some((x) => x.severidad === "error")) {
      escribirTexto(
        informeDeValidacion(
          { es: "Hallazgo", en: "Finding" },
          "invalido",
          { es: id, en: id },
          suyos,
          o.idioma,
        ),
      );
      return CODIGOS_DEL_LIBRO.bloqueado;
    }
    escribirDato(raiz, archivo.ruta, texto, nuevo.origen === "propio");
    const r = evaluarHallazgo(
      nuevo,
      L.libro.map((s) => s.sobre),
    );
    const estado = r.ok
      ? nombreDeEstado(L.instantanea, "estado_de_hallazgo", r.evaluacion.estado)
      : { es: "?", en: "?" };
    escribirTexto(
      o.idioma === "es"
        ? `${id}: ${evento.tipo} declarado por ${por} el ${fecha}. Estado ahora: ${estado.es}.\n`
        : `${id}: ${evento.tipo} declared by ${por} on ${fecha}. State now: ${estado.en}.\n`,
    );
    return CODIGOS_DEL_LIBRO.ok;
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
    process.exitCode = CODIGOS_DEL_LIBRO.uso;
  },
);
