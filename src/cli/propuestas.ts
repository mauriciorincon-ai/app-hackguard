// CLI de las propuestas de los dos agentes: `pnpm propuestas:buscar`, `propuestas:verificar`, `propuestas:validar`, `propuestas:listar` y
// `propuestas:decidir`. Solo lee y escribe archivos; verificar, calcular el veredicto y decidir lo hace el motor (src/engine/propuestas/).
// Corre con el TypeScript nativo de Node: `node src/cli/propuestas.ts <comando> [opciones]`.
//
//   buscar    --marco <id> | --familia <id> | --todos  --fecha AAAA-MM-DD     (la ÚNICA pieza con red; la usa el investigador)
//   leer      <archivo> --activo <id> --fecha AAAA-MM-DD                  (el texto pegado del extractor: lo guarda y da su huella)
//   verificar <propuestas/corridas/<corrida>>  [--json] [--desde n]                        (sella la corrida: sin red)
//   validar   [--json]                                                          (todas las corridas selladas y el libro)
//   listar    [--json]                                                          (la bandeja)
//   decidir   <PROP-NNNN> --decision aprobar|aprobar-tras-revisar|rechazar|separar --por <persona> --fecha AAAA-MM-DD
//             [--motivo <texto>] [--prueba <PR-…>] [--evaluadas n --fallidas n --alertas n] [--aplicar-a-demo]
//
// El libro de decisiones (`datos/propuestas/decisiones.jsonl`) es de SOLO AGREGAR. Aprobar un sobre crea un sobre POR CONFIRMAR (no lo
// confirma); una propuesta de demostración no escribe en el catálogo ni en el libro de evidencia sin `--aplicar-a-demo`.
// Decidir lo hace una persona en su terminal: dentro de una sesión de Claude Code, o sin terminal, se niega (regla dura 2).
// Códigos de salida: 0 ok · 2 bloqueado (inválido, o lo pedido contradice una regla; no escribe nada) · 3 error de uso o de lectura.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { huella } from "../engine/huella.ts";
import {
  bandeja,
  hijasDe,
  pruebaAprobada,
  sobreDeUnaAprobacion,
  validarDecisiones,
} from "../engine/propuestas/decisiones.ts";
import {
  Decision,
  FORMATO_DE_DECISION,
  type PropuestaSellada,
} from "../engine/propuestas/esquemas.ts";
import { evaluarCriterios } from "../engine/propuestas/traza.ts";
import { sellarCorrida } from "../engine/propuestas/verificar.ts";
import { cargarActivosDelBuild } from "../lib/activos/cargar.ts";
import { origenDelActivo } from "../lib/evidencia/cargar-evidencia.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";
import { buscar } from "../lib/propuestas/buscar.ts";
import {
  CARPETA_DE_CORRIDAS,
  CARPETA_DE_DEMO,
  CARPETA_DE_LECTURAS,
  LIBRO_DE_DECISIONES,
  cargarBorrador,
  cargarConsulta,
  cargarCorridas,
  cargarDecisiones,
  contextoDeVerificacion,
  type CorridaCargada,
} from "../lib/propuestas/cargar.ts";
import {
  crearSobrePorConfirmar,
  escribirPruebaAprobada,
} from "../lib/propuestas/aplicar.ts";
import { puedeDecidir } from "../lib/propuestas/frontera.ts";
import { leerTextoPegado } from "../lib/propuestas/leer.ts";
import { guardarLectura } from "../lib/propuestas/lecturas.ts";

const CODIGOS = { ok: 0, bloqueado: 2, uso: 3 } as const;

const USO = {
  es: "uso: propuestas buscar --marco <id> | --familia <id> | --todos --fecha AAAA-MM-DD\n     propuestas leer <archivo> --activo <id> --fecha AAAA-MM-DD\n     propuestas verificar <propuestas/corridas/<corrida>> [--json] [--desde n]\n     propuestas validar [--json]\n     propuestas listar [--json]\n     propuestas decidir <PROP-NNNN> --decision aprobar|aprobar-tras-revisar|rechazar|separar --por <persona> --fecha AAAA-MM-DD [--motivo <texto>] [--prueba <PR-…>] [--evaluadas n --fallidas n --alertas n] [--aplicar-a-demo]",
  en: "usage: propuestas buscar --marco <id> | --familia <id> | --todos --fecha YYYY-MM-DD\n       propuestas leer <file> --activo <id> --fecha YYYY-MM-DD\n       propuestas verificar <propuestas/corridas/<run>> [--json]\n       propuestas validar [--json]\n       propuestas listar [--json]\n       propuestas decidir <PROP-NNNN> --decision aprobar|aprobar-tras-revisar|rechazar|separar --por <person> --fecha YYYY-MM-DD [--motivo <text>] [--prueba <PR-…>] [--evaluadas n --fallidas n --alertas n] [--aplicar-a-demo]",
};

class ErrorDeUso extends Error {}

function opciones(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      marco: { type: "string" },
      familia: { type: "string" },
      todos: { type: "boolean", default: false },
      activo: { type: "string" },
      fecha: { type: "string" },
      decision: { type: "string" },
      por: { type: "string" },
      motivo: { type: "string" },
      prueba: { type: "string" },
      evaluadas: { type: "string" },
      fallidas: { type: "string" },
      alertas: { type: "string" },
      "aplicar-a-demo": { type: "boolean", default: false },
      desde: { type: "string" },
    },
  });
  return {
    ...values,
    comando: positionals[0],
    objetivo: positionals[1],
    sobrantes: positionals.slice(2),
  };
}

const escribirTexto = (texto: string) => process.stdout.write(texto);
const json = (valor: unknown) => `${JSON.stringify(valor, null, 2)}\n`;

function requerido(valor: string | undefined, bandera: string): string {
  if (valor === undefined || valor.trim() === "") throw new ErrorDeUso(bandera);
  return valor;
}

function entero(
  texto: string | undefined,
  bandera: string,
): number | undefined {
  if (texto === undefined) return undefined;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 0) throw new ErrorDeUso(`${bandera} n`);
  return n;
}

/** La carpeta de una corrida, relativa a la raíz y con «/», y solo dentro de las dos carpetas de propuestas. */
function carpetaDeCorrida(raiz: string, argumento: string): string {
  const relativa = path
    .relative(raiz, path.resolve(raiz, argumento))
    .split(path.sep)
    .join("/");
  const valida = [CARPETA_DE_CORRIDAS, CARPETA_DE_DEMO].some((base) =>
    new RegExp(`^${base}/[A-Za-z0-9][A-Za-z0-9._-]*$`).test(relativa),
  );
  if (!valida)
    throw new ErrorDeUso(
      `la carpeta debe ser ${CARPETA_DE_CORRIDAS}/<corrida> o ${CARPETA_DE_DEMO}/<corrida>`,
    );
  return relativa;
}

const numeroDe = (id: string): number => Number(id.slice(5, 9));

async function mundo(raiz: string) {
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const activos = await cargarActivosDelBuild(instantanea, raiz);
  return {
    instantanea,
    activos,
    ctx: contextoDeVerificacion(instantanea, activos, raiz),
  };
}

const todasLasPropuestas = (corridas: CorridaCargada[]): PropuestaSellada[] =>
  corridas.flatMap((c) => c.corrida.propuestas);

/** Los nombres de las carpetas de corrida, selladas o no: una consulta de hoy que aún no se selló también ocupa su número. */
function carpetasDeCorrida(raiz: string): string[] {
  return [CARPETA_DE_CORRIDAS, CARPETA_DE_DEMO].flatMap((base) => {
    const carpeta = path.join(raiz, base);
    return existsSync(carpeta)
      ? readdirSync(carpeta, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : [];
  });
}

/** `INV-2026-10-02-01`: la corrida siguiente de ese agente y ese día. */
function siguienteCorrida(
  existentes: readonly string[],
  prefijo: "INV" | "EXT",
  fecha: string,
): string {
  const base = `${prefijo}-${fecha}-`;
  const mayor = existentes
    .filter((c) => c.startsWith(base))
    .reduce((m, c) => Math.max(m, Number(c.slice(base.length))), 0);
  return `${base}${String(mayor + 1).padStart(2, "0")}`;
}

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (o.sobrantes.length > 0) throw new ErrorDeUso(o.sobrantes.join(" "));
  const raiz = process.cwd();

  if (o.comando === "buscar") {
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    if (o.marco === undefined && o.familia === undefined && !o.todos)
      throw new ErrorDeUso("--marco <id> | --familia <id> | --todos");
    const { instantanea } = await cargarInstantaneaOficial(raiz);
    const corrida = siguienteCorrida(carpetasDeCorrida(raiz), "INV", fecha);
    const alcance =
      o.marco !== undefined
        ? { es: `El marco ${o.marco}`, en: `The framework ${o.marco}` }
        : o.familia !== undefined
          ? {
              es: `Los marcos de la familia ${o.familia}`,
              en: `The frameworks of the ${o.familia} family`,
            }
          : {
              es: "Todos los marcos del catálogo",
              en: "Every framework in the catalog",
            };
    const consulta = await buscar(
      instantanea,
      { marco: o.marco, familia: o.familia, fecha, corrida, alcance },
      (url, init) => fetch(url, init),
      raiz,
    );
    const carpeta = `${CARPETA_DE_CORRIDAS}/${corrida}`;
    mkdirSync(path.join(raiz, carpeta), { recursive: true });
    writeFileSync(path.join(raiz, carpeta, "consulta.json"), json(consulta));
    const leidas = consulta.fuentes.filter((f) => f.estado === "leida").length;
    const noAccesibles = consulta.fuentes.filter(
      (f) => f.estado === "no_accesible",
    );
    escribirTexto(
      `Corrida ${corrida}: ${leidas} páginas leídas, ${noAccesibles.length} no accesibles al agente. Consulta en ${carpeta}/consulta.json.\nRun ${corrida}: ${leidas} pages read, ${noAccesibles.length} not accessible to the agent. Query in ${carpeta}/consulta.json.\n`,
    );
    for (const f of noAccesibles)
      escribirTexto(
        `  fuente_no_accesible_al_agente: ${f.nombre} (${f.motivo ?? "?"}). No se rodea: si necesitas ese documento, léelo tú y haz el cambio a mano.\n`,
      );
    return CODIGOS.ok;
  }

  const { ctx } = await mundo(raiz);
  const cargadas = await cargarCorridas(raiz);

  if (o.comando === "leer") {
    const archivo = requerido(o.objetivo, "<archivo con el texto>");
    const activo = requerido(o.activo, "--activo <id>");
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      throw new ErrorDeUso("--fecha AAAA-MM-DD");
    // El extractor solo corre sobre un activo demo con plan (regla dura 8): el plan de uno propio no se le da a un modelo.
    if (origenDelActivo(raiz, activo) !== "demo" || !ctx.planes.has(activo)) {
      escribirTexto(
        `«${activo}» no es un activo demo con plan emitido: el extractor no corre sobre activos propios en este sprint.\n"${activo}" is not a demo asset with an issued plan: the extractor does not run on own assets in this sprint.\n`,
      );
      return CODIGOS.bloqueado;
    }
    const leido = leerTextoPegado(raiz, archivo);
    if (!leido.ok) {
      escribirTexto(`${leido.motivo}.\nNo se leyó nada / Nothing was read.\n`);
      return CODIGOS.bloqueado;
    }
    const huellaDelTexto = await guardarLectura(raiz, leido.texto);
    const corrida = siguienteCorrida(carpetasDeCorrida(raiz), "EXT", fecha);
    const carpeta = `${CARPETA_DE_CORRIDAS}/${corrida}`;
    mkdirSync(path.join(raiz, carpeta), { recursive: true });
    const salida = {
      corrida,
      carpeta,
      activo,
      archivo: leido.ruta,
      texto: {
        huella: huellaDelTexto,
        caracteres: leido.texto.replace(/\s+/gu, " ").trim().length,
      },
      plan: [...(ctx.planes.get(activo) ?? [])].sort(),
    };
    if (o.json) escribirTexto(json(salida));
    else
      escribirTexto(
        `Corrida ${corrida}: texto leído de ${leido.ruta} (${salida.texto.caracteres} caracteres, huella ${huellaDelTexto}).\nEscribe ${carpeta}/propuesta.json con esa huella y esos caracteres; el plan de ${activo} tiene ${salida.plan.length} pruebas.\nRun ${corrida}: text read. Write ${carpeta}/propuesta.json with that fingerprint and character count.\n`,
      );
    return CODIGOS.ok;
  }

  if (o.comando === "verificar") {
    const carpeta = carpetaDeCorrida(
      raiz,
      requerido(o.objetivo, "<carpeta de la corrida>"),
    );
    const borrador = cargarBorrador(raiz, carpeta);
    const consulta = cargarConsulta(raiz, carpeta);
    const previa = cargadas.corridas.find((c) => c.carpeta === carpeta);
    const otras = cargadas.corridas.filter((c) => c.carpeta !== carpeta);
    const mayor = todasLasPropuestas(otras).reduce(
      (m, p) => Math.max(m, numeroDe(p.id)),
      0,
    );
    const primero = previa?.corrida.propuestas[0];
    const r = await sellarCorrida(
      borrador,
      consulta,
      ctx,
      primero === undefined
        ? (entero(o.desde, "--desde") ?? mayor + 1)
        : numeroDe(primero.id),
    );
    if (!r.ok) {
      for (const p of r.problemas)
        escribirTexto(
          `${p.regla}${p.ref === null ? "" : ` [${p.ref}]`}: ${p.detalle}\n`,
        );
      escribirTexto("No se selló nada / Nothing was sealed.\n");
      return CODIGOS.bloqueado;
    }
    const criterios = evaluarCriterios(
      r.corrida.propuestas,
      ctx.umbrales.antiguedad_marco_dias,
    );
    const rotos = criterios.filter((c) => !c.cumple);
    if (rotos.length > 0) {
      escribirTexto(
        `Un criterio del plan se rompe (${rotos.map((c) => `${c.id}: ${c.incumplen.join(", ")}`).join("; ")}): no se selló nada.\nA plan criterion is broken: nothing was sealed.\n`,
      );
      return CODIGOS.bloqueado;
    }
    const ya = cargarDecisiones(raiz);
    const ids = new Set(previa?.corrida.propuestas.map((p) => p.id) ?? []);
    if (
      previa !== undefined &&
      previa.corrida.huella !== r.corrida.huella &&
      ya.some((d) => ids.has(d.propuesta.split(".")[0] ?? ""))
    ) {
      escribirTexto(
        "Esta corrida ya tiene decisiones: no se vuelve a sellar con otro contenido.\nThis run already has decisions: it is not sealed again with other content.\n",
      );
      return CODIGOS.bloqueado;
    }
    writeFileSync(path.join(raiz, carpeta, "corrida.json"), json(r.corrida));
    if (o.json) escribirTexto(json({ corrida: r.corrida.id, criterios }));
    else {
      escribirTexto(
        `Corrida ${r.corrida.id} sellada en ${carpeta}/corrida.json: ${r.corrida.propuestas.length} propuestas, huella ${r.corrida.huella.slice(0, 12)}…\nRun ${r.corrida.id} sealed.\n`,
      );
      for (const p of r.corrida.propuestas)
        escribirTexto(
          `  ${p.id} ${p.tipo}: ${p.pausa === null ? "sin marca" : `marcada (${p.pausa.motivos.map((m) => m.motivo).join(", ")})`}\n`,
        );
      escribirTexto(
        `Criterios: ${criterios.map((c) => `${c.id} ${c.cumple ? "✓" : "✗"}`).join(" · ")}\n`,
      );
    }
    return CODIGOS.ok;
  }

  if (o.comando === "validar") {
    const problemas: string[] = cargadas.problemas.map(
      (p) => `${p.ruta}: ${p.detalle}`,
    );
    const avisos: string[] = [];
    const ids = new Map<string, string>();
    for (const c of cargadas.corridas) {
      for (const p of c.corrida.propuestas) {
        const otro = ids.get(p.id);
        if (otro !== undefined)
          problemas.push(`${p.id} está en ${otro} y en ${c.carpeta}`);
        ids.set(p.id, c.carpeta);
      }
      // Si el borrador sigue junto a la corrida, sellarlo otra vez da la misma huella: nadie editó lo sellado ni cambió el catálogo.
      if (!existsSync(path.join(raiz, c.carpeta, "propuesta.json"))) continue;
      // Las lecturas de una corrida real (páginas o texto pegado) viven en `propuestas/.lecturas/`, que git ignora: en un clon limpio no están y el
      // re-sellado daría otra huella por una razón que no es un defecto. Se dice, no se falla.
      if (
        c.lugar === "real" &&
        !existsSync(path.join(raiz, CARPETA_DE_LECTURAS))
      ) {
        avisos.push(
          `${c.carpeta}: no se pudo sellar otra vez aquí (faltan las lecturas de ${CARPETA_DE_LECTURAS}/, que git ignora); se comprobó solo lo sellado`,
        );
        continue;
      }
      try {
        const borrador = cargarBorrador(raiz, c.carpeta);
        const primero = c.corrida.propuestas[0];
        const r = await sellarCorrida(
          borrador,
          cargarConsulta(raiz, c.carpeta),
          ctx,
          primero === undefined ? 1 : numeroDe(primero.id),
        );
        if (!r.ok)
          problemas.push(`${c.carpeta}: el borrador ya no se puede sellar`);
        else if (r.corrida.huella !== c.corrida.huella)
          problemas.push(
            `${c.carpeta}: sellar otra vez el borrador da otra huella; corre pnpm propuestas:verificar ${c.carpeta}`,
          );
      } catch (e) {
        problemas.push(
          `${c.carpeta}: no se pudo sellar otra vez el borrador (${e instanceof Error ? e.message : String(e)})`,
        );
      }
    }
    const propuestas = todasLasPropuestas(cargadas.corridas);
    const criterios = evaluarCriterios(
      propuestas,
      ctx.umbrales.antiguedad_marco_dias,
    );
    for (const c of criterios.filter((x) => !x.cumple))
      problemas.push(`criterio ${c.id}: ${c.incumplen.join(", ")}`);
    let decisiones: ReturnType<typeof cargarDecisiones> = [];
    try {
      decisiones = cargarDecisiones(raiz);
    } catch (e) {
      problemas.push(e instanceof Error ? e.message : String(e));
    }
    for (const d of validarDecisiones(propuestas, decisiones))
      problemas.push(`${d.propuesta}: ${d.regla} (${d.detalle})`);
    if (o.json) escribirTexto(json({ problemas, avisos, criterios }));
    else if (problemas.length === 0)
      escribirTexto(
        `Propuestas: ok · ${cargadas.corridas.length} corridas · ${propuestas.length} propuestas · ${decisiones.length} decisiones · criterios ${criterios.map((c) => `${c.id} ${c.cumple ? "✓" : "✗"}`).join(" ")}\nProposals: ok.\n${avisos.map((a) => `  - ${a}\n`).join("")}`,
      );
    else
      escribirTexto(
        `Propuestas: inválido / invalid\n${problemas.map((p) => `  - ${p}`).join("\n")}\n`,
      );
    return problemas.length === 0 ? CODIGOS.ok : CODIGOS.bloqueado;
  }

  if (o.comando === "listar") {
    const filas = bandeja(
      todasLasPropuestas(cargadas.corridas),
      cargarDecisiones(raiz),
    );
    if (o.json)
      escribirTexto(
        json(
          filas.map((f) => ({
            id: f.propuesta.id,
            origen: f.propuesta.origen,
            tipo: f.propuesta.tipo,
            estado: f.estado,
            marcada: f.propuesta.pausa !== null,
          })),
        ),
      );
    else
      for (const f of filas)
        escribirTexto(
          `${f.propuesta.id}\t${f.propuesta.origen}\t${f.propuesta.tipo}\t${f.estado}${f.propuesta.pausa === null ? "" : "\tmarcada"}\n`,
        );
    return CODIGOS.ok;
  }

  if (o.comando === "decidir") {
    const frontera = puedeDecidir({
      raiz,
      repo: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
      env: process.env,
      tty: Boolean(process.stdin.isTTY),
    });
    if (!frontera.ok) {
      escribirTexto(
        `Decidir una propuesta lo hace una persona: ${frontera.motivo}.\nNo se registró nada / Nothing was recorded.\n`,
      );
      return CODIGOS.bloqueado;
    }
    const id = requerido(o.objetivo, "<PROP-NNNN>");
    const tipo = requerido(o.decision, "--decision").replace(/-/g, "_");
    const por = requerido(o.por, "--por <persona>");
    const fecha = requerido(o.fecha, "--fecha AAAA-MM-DD");
    const propuestas = todasLasPropuestas(cargadas.corridas);
    const decisiones = cargarDecisiones(raiz);
    const raizDeLaId = id.split(".")[0] ?? id;
    const dePropuesta = cargadas.corridas.find((c) =>
      c.corrida.propuestas.some((p) => p.id === raizDeLaId),
    );
    const padre = propuestas.find((p) => p.id === raizDeLaId);
    const p =
      padre === undefined
        ? undefined
        : id === padre.id
          ? padre
          : padre.tipo === "sobre"
            ? hijasDe(padre).find((h) => h.id === id)
            : undefined;
    if (p === undefined || dePropuesta === undefined)
      throw new ErrorDeUso(`no hay una propuesta ${id}`);
    const nueva = Decision.safeParse({
      formato: FORMATO_DE_DECISION,
      propuesta: id,
      decision: tipo,
      por,
      fecha,
      ...(o.motivo === undefined ? {} : { motivo: o.motivo }),
      ...(o.prueba === undefined ? {} : { prueba: o.prueba }),
      ...(tipo === "separar" && p.tipo === "sobre"
        ? { hijas: hijasDe(p).map((h) => h.id) }
        : {}),
    });
    if (!nueva.success)
      throw new ErrorDeUso(
        `la decisión no cumple el esquema: ${nueva.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    let decision = nueva.data;
    const suyos = validarDecisiones(propuestas, [
      ...decisiones,
      decision,
    ]).filter((d) => d.propuesta === id);
    if (suyos.length > 0) {
      for (const s of suyos) escribirTexto(`${s.regla}: ${s.detalle}\n`);
      escribirTexto("No se registró nada / Nothing was recorded.\n");
      return CODIGOS.bloqueado;
    }

    const aprueba =
      decision.decision === "aprobar" ||
      decision.decision === "aprobar_tras_revisar";
    const efectosReales =
      aprueba && (p.tipo === "sobre" || p.tipo === "prueba_nueva");
    // Una corrida de demostración, o un sobre de un activo demo (aunque la corrida sea real), escribe en datos de demostración.
    const esDeDemo =
      dePropuesta.lugar === "demo" ||
      (p.tipo === "sobre" && origenDelActivo(raiz, p.activo) === "demo");
    if (efectosReales && esDeDemo && !o["aplicar-a-demo"]) {
      escribirTexto(
        "Esta propuesta es de demostración: aprobarla escribiría en el catálogo o en el libro de evidencia de demostración. Añade --aplicar-a-demo si es lo que quieres.\nThis proposal is a demonstration: approving it would write to the demo catalog or evidence ledger. Add --aplicar-a-demo if that is what you want.\n",
      );
      return CODIGOS.bloqueado;
    }

    if (aprueba && p.tipo === "sobre") {
      const r = sobreDeUnaAprobacion(
        p,
        decision,
        {
          evaluadas: entero(o.evaluadas, "--evaluadas"),
          fallidas: entero(o.fallidas, "--fallidas"),
          alertas: entero(o.alertas, "--alertas"),
        },
        ctx.pruebas,
      );
      if (!r.ok) {
        escribirTexto(
          `No se creó el sobre: ${r.motivo}.\nThe envelope was not created: ${r.motivo}.\n`,
        );
        return CODIGOS.bloqueado;
      }
      const hecho = await crearSobrePorConfirmar(
        raiz,
        r.entrada,
        p.texto.huella,
      );
      if (!hecho.ok) {
        escribirTexto(
          `No se creó el sobre: ${hecho.motivo}.\nThe envelope was not created.\n`,
        );
        return CODIGOS.bloqueado;
      }
      decision = {
        ...decision,
        efecto: {
          sobre: hecho.id,
          ...(r.veredicto_sugerido === null
            ? {}
            : { veredicto_sugerido: r.veredicto_sugerido }),
          veredicto_resultante: r.veredicto_resultante,
        },
        veredicto_corregido_por_persona: r.corregido,
      };
      escribirTexto(
        `Sobre ${hecho.id} creado en ${hecho.ruta}: ${hecho.detalle}.\nConfírmalo con: pnpm evidencia:confirmar ${hecho.id} --por <persona> --fecha AAAA-MM-DD\n`,
      );
    } else if (aprueba && p.tipo === "prueba_nueva") {
      const prueba = await pruebaAprobada(p, decision);
      const hecho = await escribirPruebaAprobada(raiz, prueba);
      if (!hecho.ok) {
        escribirTexto(
          `No se aprobó la prueba: ${hecho.motivo}.\nThe test was not approved.\n`,
        );
        return CODIGOS.bloqueado;
      }
      decision = { ...decision, efecto: { prueba: prueba.id } };
      escribirTexto(
        `Prueba ${prueba.id} escrita en ${hecho.ruta}: ${hecho.detalle}.\n`,
      );
    } else if (aprueba) {
      escribirTexto(
        "Decisión registrada. El cambio en datos/ lo haces tú; entra al catálogo en la próxima instantánea.\nDecision recorded. The change in datos/ is yours to make; it enters the catalog in the next snapshot.\n",
      );
    }

    mkdirSync(path.join(raiz, "datos/propuestas"), { recursive: true });
    appendFileSync(
      path.join(raiz, LIBRO_DE_DECISIONES),
      `${JSON.stringify(decision)}\n`,
      {
        encoding: "utf8",
      },
    );
    escribirTexto(
      `${id}: ${decision.decision} registrada por ${por} el ${fecha} (huella ${(await huella(decision)).slice(0, 12)}…).\n`,
    );
    return CODIGOS.ok;
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
      (error instanceof Error &&
        "code" in error &&
        String(error.code).startsWith("ERR_PARSE_ARGS"))
    ) {
      process.stderr.write(`${detalle}\n\n${USO.es}\n\n${USO.en}\n`);
    } else {
      process.stderr.write(`error de lectura / read error: ${detalle}\n`);
    }
    process.exitCode = CODIGOS.uso;
  },
);
