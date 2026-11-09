// CLI de los supuestos del plan v2 de los agentes: `pnpm supuestos:generar`, `pnpm supuestos:s3` y `pnpm lotes:metricas`.
// Solo lee y escribe archivos del repo: no corre herramientas, no llama a ningún modelo y no lanza `/extraer` (eso lo hace una persona).
// Corre con el TypeScript nativo de Node: `node src/cli/supuestos.ts <comando> [opciones]`.
//
//   generar [--comprobar]                      escribe el kit (20 de S3 y el lote de 200) · con --comprobar solo lo compara
//   s3 <hoja.json> [--json] [--idioma es|en]   compara la hoja de la persona con la regla: S3 probado si coincide ≥ 90 %
//   lotes [--registro <archivo>] [--json]      el plan de las 10 tandas de 20 · con --registro, la cuota medida y la proyección
//
// Códigos de salida: 0 bien (S3 probado, kit al día) · 1 S3 refutado o kit desviado · 3 error de uso o de archivo.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  casosDelLoteDe200,
  metricasDeTandas,
  tandasDe,
  type CorridaDeTanda,
} from "../engine/supuestos/lotes.ts";
import {
  CASOS_S3,
  compararConPersona,
  ErrorDeHoja,
  HojaS3,
  MINIMO_DE_COINCIDENCIA,
} from "../engine/supuestos/s3.ts";
import { archivosDelKit } from "../lib/supuestos/kit.ts";
import { z } from "zod";

class ErrorDeUso extends Error {}

const USO = {
  es: "uso: supuestos generar [--comprobar] | supuestos s3 <hoja.json> [--json] | supuestos lotes [--registro <archivo>] [--json]",
  en: "usage: supuestos generar [--comprobar] | supuestos s3 <sheet.json> [--json] | supuestos lotes [--registro <file>] [--json]",
};

const Registro = z.strictObject({
  formato: z.literal("hackguard/registro-de-tandas@1"),
  tandas: z.array(
    z.strictObject({
      tanda: z.int().min(1),
      cuota_antes_pct: z.number().min(0).max(100),
      cuota_despues_pct: z.number().min(0),
      minutos: z.number().min(0),
      propuestas_selladas: z.int().min(0),
      corregidas_por_persona: z.int().min(0),
    }),
  ),
});

const pct = (x: number) => `${Math.round(x * 1000) / 10} %`;
const leerJson = (ruta: string): unknown => {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    throw new ErrorDeUso(`no se pudo leer ${ruta}: ${(e as Error).message}`);
  }
};

async function ejecutar(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
      comprobar: { type: "boolean", default: false },
      registro: { type: "string" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  const en = values.idioma === "en";
  const [comando, arg] = positionals;
  const raiz = process.cwd();

  if (comando === "generar") {
    const archivos = await archivosDelKit(raiz);
    if (values.comprobar) {
      const desviados = [...archivos].filter(([ruta, contenido]) => {
        try {
          return readFileSync(path.join(raiz, ruta), "utf8") !== contenido;
        } catch {
          return true;
        }
      });
      if (desviados.length === 0) {
        process.stdout.write(
          en
            ? `The kit is up to date (${archivos.size} files).\n`
            : `El kit está al día (${archivos.size} archivos).\n`,
        );
        return 0;
      }
      for (const [ruta] of desviados) process.stdout.write(`${ruta}\n`);
      process.stdout.write(
        en
          ? `${desviados.length} files differ: run pnpm supuestos:generar.\n`
          : `${desviados.length} archivos difieren: corre pnpm supuestos:generar.\n`,
      );
      return 1;
    }
    for (const [ruta, contenido] of archivos) {
      mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true });
      writeFileSync(path.join(raiz, ruta), contenido);
    }
    process.stdout.write(
      en
        ? `${archivos.size} files written.\n`
        : `${archivos.size} archivos escritos.\n`,
    );
    return 0;
  }

  if (comando === "s3") {
    if (arg === undefined) throw new ErrorDeUso(USO[en ? "en" : "es"]);
    const analisis = HojaS3.safeParse(leerJson(path.resolve(arg)));
    if (!analisis.success)
      throw new ErrorDeUso(
        `${arg}: ${analisis.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" | ")}`,
      );
    let c;
    try {
      c = compararConPersona(analisis.data, CASOS_S3);
    } catch (e) {
      if (e instanceof ErrorDeHoja) throw new ErrorDeUso(e.message);
      throw e;
    }
    if (values.json) {
      process.stdout.write(`${JSON.stringify(c, null, 2)}\n`);
    } else {
      process.stdout.write(
        en
          ? `S3: ${c.coinciden} of ${c.total} match (${pct(c.coincidencia)}; the minimum is ${pct(MINIMO_DE_COINCIDENCIA)}) → S3 ${c.estado === "probado" ? "PROVEN" : "REFUTED"}.\n`
          : `S3: ${c.coinciden} de ${c.total} coinciden (${pct(c.coincidencia)}; el mínimo es ${pct(MINIMO_DE_COINCIDENCIA)}) → S3 ${c.estado.toUpperCase()}.\n`,
      );
      for (const d of c.discrepancias)
        process.stdout.write(
          en
            ? `  ${d.id} ${d.prueba}: you said ${d.persona}, the rule says ${d.regla}${d.borde ? " (edge case)" : ""}\n`
            : `  ${d.id} ${d.prueba}: dijiste ${d.persona}, la regla dice ${d.regla}${d.borde ? " (caso de borde)" : ""}\n`,
        );
      if (c.discrepancias.length > 0)
        process.stdout.write(
          en
            ? `  ${c.enElBorde} of ${c.discrepancias.length} disagreements are edge cases.\n`
            : `  ${c.enElBorde} de ${c.discrepancias.length} discrepancias son casos de borde.\n`,
        );
    }
    return c.estado === "probado" ? 0 : 1;
  }

  if (comando === "lotes") {
    const casos = casosDelLoteDe200();
    const tandas = tandasDe(casos);
    const registro =
      values.registro === undefined
        ? null
        : Registro.safeParse(leerJson(path.resolve(values.registro)));
    if (registro !== null && !registro.success)
      throw new ErrorDeUso(
        `${values.registro}: ${registro.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" | ")}`,
      );
    const metricas =
      registro === null
        ? null
        : metricasDeTandas(
            registro.data.tandas as CorridaDeTanda[],
            tandas.length,
          );
    if (values.json) {
      process.stdout.write(
        `${JSON.stringify({ tandas, metricas }, null, 2)}\n`,
      );
      return 0;
    }
    process.stdout.write(
      en
        ? `Batch of ${casos.length}: ${tandas.length} runs of ${tandas[0]!.ids.length}.\n`
        : `Lote de ${casos.length}: ${tandas.length} tandas de ${tandas[0]!.ids.length}.\n`,
    );
    for (const t of tandas)
      process.stdout.write(
        `  ${String(t.numero).padStart(2)} ${t.desde}–${t.hasta}  superada ${t.porVeredicto.superada} · fallida ${t.porVeredicto.fallida} · parcial ${t.porVeredicto.parcial} · no_ejecutada ${t.porVeredicto.no_ejecutada}\n`,
      );
    if (metricas !== null) {
      process.stdout.write(
        en
          ? `Measured: ${metricas.corridas} runs, mean quota ${metricas.cuotaMedia} % per run, ${pct(metricas.correccionMedia)} of proposals corrected by a person.\n`
          : `Medido: ${metricas.corridas} corridas, cuota media ${metricas.cuotaMedia} % por corrida, ${pct(metricas.correccionMedia)} de las propuestas corregidas por una persona.\n`,
      );
      for (const m of metricas.cuotaPorTanda)
        process.stdout.write(
          `  tanda ${m.tanda}: ${m.pct} % (${m.porTexto} % por texto)\n`,
        );
      process.stdout.write(
        en
          ? `${metricas.tandasQueFaltan} runs remain: about ${metricas.proyeccionDeLasQueFaltan} % of a window (${metricas.cabenEnUnaVentana ? "fits in one window" : "does not fit in one window"}).\n`
          : `Faltan ${metricas.tandasQueFaltan} tandas: cerca de ${metricas.proyeccionDeLasQueFaltan} % de una ventana (${metricas.cabenEnUnaVentana ? "caben en una ventana" : "no caben en una ventana"}).\n`,
      );
    }
    return 0;
  }
  throw new ErrorDeUso(USO[en ? "en" : "es"]);
}

ejecutar(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = e instanceof ErrorDeUso ? 3 : 1;
  },
);
