// CLI del libro de evidencia: `pnpm evidencia:registrar`, `evidencia:confirmar`, `evidencia:validar`,
// `hallazgos:listar` y `hallazgos:declarar`. Solo lee y escribe archivos; lo demás (armar el sobre, calcular el
// veredicto, las huellas, abrir y cerrar hallazgos, redactar la salida) lo hace el motor. Corre con el TypeScript
// nativo de Node: `node src/cli/evidencia.ts <comando> [opciones]`.
//
//   registrar         <resultado.json> --crudo <archivo>
//   confirmar         <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]
//                     [--titulo-es --titulo-en --descripcion-es --descripcion-en]
//   validar           [--json] [--idioma es|en]
//   hallazgos-listar  --fecha AAAA-MM-DD [--json] [--idioma es|en]
//   hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <persona> --fecha AAAA-MM-DD
//                     --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]
//
// Nada de lo que esta CLI escribe lleva el crudo de una herramienta: `registrar` lo lee solo para resumirlo en una
// huella y lo descarta. Lo de un activo propio va a `datos/privado/` (archivos 0600, carpetas 0700; regla 17-bis).
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
  CARPETA_DE_SOBRES_DEMO,
  CARPETA_DE_SOBRES_PRIVADA,
  cargarEscalaIa,
  cargarPlazos,
  escribirDato,
  origenDelActivo,
} from "../lib/evidencia/cargar-evidencia.ts";

const USO = {
  es: "uso: evidencia registrar <resultado.json> --crudo <archivo>\n     evidencia confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]\n     evidencia validar [--json] [--idioma es|en]\n     evidencia hallazgos-listar --fecha AAAA-MM-DD [--json] [--idioma es|en]\n     evidencia hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <persona> --fecha AAAA-MM-DD --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]",
  en: "usage: evidencia registrar <result.json> --crudo <file>\n       evidencia confirmar <SOB-NNNN> --por <person> --fecha YYYY-MM-DD [--cvss <vector> | --impacto n --alcance n --detectabilidad n]\n       evidencia validar [--json] [--idioma es|en]\n       evidencia hallazgos-listar --fecha YYYY-MM-DD [--json] [--idioma es|en]\n       evidencia hallazgos-declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible> --por <person> --fecha YYYY-MM-DD --justificacion-es <texto> --justificacion-en <text> [--revision-en-dias n]",
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
    const estado = [L.sobres.estado, L.hallazgos.estado].includes("invalido")
      ? "invalido"
      : [L.sobres.estado, L.hallazgos.estado].includes("con_advertencias")
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
        hallazgos: {
          estado: L.hallazgos.estado,
          validos: L.hallazgos.validos.map((h) => h.id),
          hallazgos: L.hallazgos.hallazgos,
        },
      });
    else {
      const confirmados = L.sobres.sobres.filter(
        (s) => s.sobre.confirmacion !== null,
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
    const libro = L.sobres.sobres.map((s) =>
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
          libro: libro.map((s) => ({
            ruta: L.sobres.sobres.find((x) => x.sobre.id === s.id)?.ruta ?? "",
            sobre: s,
          })),
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
    const libro = L.sobres.sobres.map((s) => s.sobre);
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
        huella_del_libro: await huellaDelLibro(libro),
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
      L.sobres.sobres.map((s) => s.sobre),
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
        libro: L.sobres.sobres,
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
      L.sobres.sobres.map((s) => s.sobre),
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
