// Importar el archivo de una herramienta: lo leen dos CLIs, `evidencia importar` (el archivo que una persona ya tiene) y
// `ejecutor --ejecutar` (el archivo que la herramienta de la persona acaba de escribir). Una sola implementación, para que las dos
// vías armen exactamente el mismo lote: el adaptador traduce, la regla de la prueba da el veredicto (ADR-008), y todo nace SIN
// CONFIRMAR (no cuenta hasta que una persona lo confirme, regla dura 6). El archivo se lee UNA vez, se resume en una huella y se
// descarta: el crudo jamás entra al almacén (regla dura 4). Un activo demo no recibe archivos reales de una herramienta.
import { readFileSync } from "node:fs";
import path from "node:path";
import { adaptadorDe } from "../../engine/adaptadores/index.ts";
import type { Idioma } from "../../engine/catalogo/informe.ts";
import { huellaDelCrudo } from "../../engine/evidencia/huellas.ts";
import {
  CODIGOS_DEL_LIBRO,
  informeDeValidacion,
} from "../../engine/evidencia/informe.ts";
import { nombreDeArchivo } from "../../engine/evidencia/molde.ts";
import { validarEvidencia } from "../../engine/evidencia/validar.ts";
import { armarLote, siguienteIdDeLote } from "../../engine/lotes/armar.ts";
import { revisionDelLote } from "../../engine/lotes/revision.ts";
import { validarLotes } from "../../engine/lotes/validar.ts";
import {
  CARPETA_DE_LOTES_DEMO,
  CARPETA_DE_LOTES_PRIVADA,
  CARPETA_DE_SOBRES_DEMO,
  CARPETA_DE_SOBRES_PRIVADA,
  escribirDatosJuntos,
  origenDelActivo,
} from "./cargar-evidencia.ts";
import type { cargarLibroValidado } from "./cargar-libro.ts";

type Libro = Awaited<ReturnType<typeof cargarLibroValidado>>;

export interface PeticionDeImportacion {
  raiz: string;
  libro: Libro;
  herramienta: string;
  /** Ruta del archivo que escribió la herramienta. */
  archivo: string;
  activo: string;
  por: string;
  fecha: string | null;
  zona: string | null;
  idioma: Idioma;
}

/** `uso`: el que pide está mal (código 3). `salida`: lo que se imprime y el código con el que termina el comando. */
export type ResultadoDeImportacion =
  | { tipo: "uso"; mensaje: string }
  | { tipo: "salida"; texto: string; codigo: number };

const json = (valor: unknown) => `${JSON.stringify(valor, null, 2)}\n`;

export async function importarCorrida(
  p: PeticionDeImportacion,
): Promise<ResultadoDeImportacion> {
  const { raiz, libro: L, herramienta, activo, por } = p;
  const salida = (texto: string, codigo: number): ResultadoDeImportacion => ({
    tipo: "salida",
    texto,
    codigo,
  });
  const uso = (mensaje: string): ResultadoDeImportacion => ({
    tipo: "uso",
    mensaje,
  });
  const archivoDeLaHerramienta = path.resolve(p.archivo);
  const adaptador = adaptadorDe(herramienta);
  if (adaptador === undefined)
    return uso(
      `no hay un adaptador para «${herramienta}» / there is no adapter for “${herramienta}”`,
    );
  // El archivo de la herramienta se lee UNA vez: se resume en una huella y se descarta (regla dura 4).
  const bytes = readFileSync(archivoDeLaHerramienta);
  const huellaDelArchivo = await huellaDelCrudo(bytes);
  const textoDelArchivo = bytes.toString("utf8");
  const origen = origenDelActivo(raiz, activo);
  if (origen === null)
    return uso(`no hay un activo «${activo}» / there is no asset “${activo}”`);
  if (origen === "demo")
    return salida(
      `Un activo demo no recibe archivos reales de una herramienta: lo real va a un activo propio (datos/privado/activos/).\nA demo asset takes no real tool files: real data goes to an own asset (datos/privado/activos/).\n`,
      CODIGOS_DEL_LIBRO.bloqueado,
    );
  const emitido = L.planes[activo];
  if (emitido === undefined)
    return salida(
      `El activo «${activo}» no tiene plan emitido: sin plan no hay evidencia que importar.\nAsset “${activo}” has no issued plan: with no plan there is no evidence to import.\n`,
      CODIGOS_DEL_LIBRO.bloqueado,
    );
  const minima =
    emitido.paquete.herramientas.find((h) => h.herramienta === herramienta)
      ?.version_minima ?? null;
  const lectura = adaptador.leer(textoDelArchivo, minima);
  if (!lectura.ok)
    return salida(
      `No se armó ningún lote: el archivo no se pudo leer como ${adaptador.id} (${lectura.motivo}): ${lectura.detalle}.\nNo batch was built: the file could not be read as ${adaptador.id} (${lectura.motivo}): ${lectura.detalle}.\n`,
      CODIGOS_DEL_LIBRO.bloqueado,
    );
  const previo = L.lotes.lotes.find(
    (l) =>
      l.lote.activo === activo && l.lote.huellas.archivo === huellaDelArchivo,
  );
  if (previo !== undefined)
    return salida(
      `Ese archivo ya se importó como ${previo.lote.id}: la misma corrida no se importa dos veces.\nThat file was already imported as ${previo.lote.id}: the same run is not imported twice.\n`,
      CODIGOS_DEL_LIBRO.bloqueado,
    );
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
    fecha: p.fecha,
    zonaHoraria: p.zona,
  });
  if (!armado.ok) {
    if (armado.motivo === "falta_fecha")
      return uso("--fecha AAAA-MM-DD (el reporte no trae la fecha)");
    if (armado.motivo === "falta_zona")
      return uso("--zona <IANA> (el reporte no declara su zona horaria)");
    return salida(
      `No se armó ningún lote: ${armado.motivo}${armado.prueba === undefined ? "" : ` (${armado.prueba})`}.\nNo batch was built: ${armado.motivo}${armado.prueba === undefined ? "" : ` (${armado.prueba})`}.\n`,
      CODIGOS_DEL_LIBRO.bloqueado,
    );
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
  if (errores.length > 0)
    return salida(
      informeDeValidacion(
        { es: "Lote", en: "Batch" },
        "invalido",
        { es: armado.lote.id, en: armado.lote.id },
        [...nuevosSuyos, ...loteSuyo],
        p.idioma,
      ),
      CODIGOS_DEL_LIBRO.bloqueado,
    );
  // Los sobres y su lote son uno: si el lote no se escribe, no quedan propuestas huérfanas.
  escribirDatosJuntos(raiz, [
    ...nuevosSobres.map((n) => ({
      relativa: n.ruta,
      contenido: n.texto,
      privado: origen === "propio",
    })),
    {
      relativa: rutaDelLote,
      contenido: json(armado.lote),
      privado: origen === "propio",
    },
  ]);
  const revision = await revisionDelLote(
    armado.lote,
    new Map(armado.sobres.map((x) => [x.id, x])),
    L.muestreo,
  );
  const cuenta = (v: string) =>
    armado.sobres.filter((x) => x.veredicto === v).length;
  const texto =
    p.idioma === "es"
      ? `Lote ${armado.lote.id} armado en ${rutaDelLote} con ${armado.sobres.length} sobres (${cuenta("fallida")} fallidas, ${cuenta("parcial")} parciales, ${cuenta("no_ejecutada")} no ejecutadas, ${cuenta("superada")} superadas), SIN confirmar (no cuentan).\nSe revisan siempre ${revision.siempre.length} y ${revision.muestra.length} de los otros ${revision.resto}: ${revision.revisados.join(", ")}.\nConfírmalo con: pnpm evidencia:confirmar-lote ${armado.lote.id} --por <persona> --fecha AAAA-MM-DD --revisados ${revision.revisados.length}\n`
      : `Batch ${armado.lote.id} built at ${rutaDelLote} with ${armado.sobres.length} envelopes (${cuenta("fallida")} failed, ${cuenta("parcial")} partial, ${cuenta("no_ejecutada")} not run, ${cuenta("superada")} passed), NOT confirmed (they do not count).\n${revision.siempre.length} are always reviewed, plus ${revision.muestra.length} of the other ${revision.resto}: ${revision.revisados.join(", ")}.\nConfirm it with: pnpm evidencia:confirmar-lote ${armado.lote.id} --por <person> --fecha YYYY-MM-DD --revisados ${revision.revisados.length}\n`;
  return salida(
    texto,
    [...nuevosSuyos, ...loteSuyo].some((h) => h.severidad === "advertencia")
      ? CODIGOS_DEL_LIBRO.con_advertencias
      : CODIGOS_DEL_LIBRO.ok,
  );
}
