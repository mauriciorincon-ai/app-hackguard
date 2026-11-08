// CLI de la brecha: `pnpm brecha:tendencia`. Solo lee archivos del repo (lo versionado, igual que el build) y escribe en la salida estándar:
// la tendencia de la brecha en varias fechas de corte y, control por control de ISO/IEC 42001, qué mejoró, qué empeoró y qué hallazgo lo
// movió. Lo calcula `engine/brecha/tendencia.ts` (la misma `armarBrecha` de las pantallas); aquí no hay cuentas. Corre con el TypeScript
// nativo de Node: `node src/cli/brecha.ts <comando> [opciones]`.
//
//   tendencia [--hasta AAAA-MM-DD] [--json] [--idioma es|en]
//
// La fecha de consulta es HACKGUARD_CONSULTA o la del commit (jamás el reloj); `--hasta` la adelanta o la atrasa.
// Códigos de salida: 0 calculada · 2 con problemas que no se pudieron calcular (se dicen) · 3 error de uso.
import { parseArgs } from "node:util";
import { informeDeTendencia } from "../engine/brecha/informe-tendencia.ts";
import { calcularTendencia } from "../engine/brecha/tendencia.ts";
import type { Idioma } from "../engine/catalogo/informe.ts";
import { cargarParaPaginaDeHallazgo } from "../lib/evidencia/pagina.ts";
import { etiquetaDeEstadoDeHallazgo } from "../lib/evidencia/etiqueta-de-estado.ts";
import { cargarEtiquetasDeHallazgo } from "../lib/evidencia/cargar-evidencia.ts";
import { cargarUmbralesDeBrecha } from "../lib/brecha/cargar.ts";
import { entradaDeBrecha } from "../lib/brecha/entrada.ts";

class ErrorDeUso extends Error {}

const USO = {
  es: "uso: brecha tendencia [--hasta AAAA-MM-DD] [--json] [--idioma es|en]",
  en: "usage: brecha tendencia [--until YYYY-MM-DD] [--json] [--idioma es|en]",
};

async function ejecutar(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
      hasta: { type: "string" },
    },
  });
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new ErrorDeUso("--idioma es|en");
  const idioma = values.idioma as Idioma;
  if (positionals[0] !== "tendencia" || positionals.length > 1)
    throw new ErrorDeUso(USO[idioma]);
  if (values.hasta !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(values.hasta))
    throw new ErrorDeUso("--hasta AAAA-MM-DD");

  const { instantanea, consulta, activos, mundo } =
    await cargarParaPaginaDeHallazgo();
  const entrada = entradaDeBrecha(
    instantanea,
    activos,
    mundo,
    cargarUmbralesDeBrecha(),
    values.hasta ?? consulta,
  );
  const cortes = (await import("../engine/brecha/tendencia.ts")).fechasDeCorte(
    entrada,
  );
  const t = await calcularTendencia(entrada, cortes);
  if (values.json) {
    process.stdout.write(`${JSON.stringify(t, null, 2)}\n`);
  } else {
    const c = instantanea.catalogo;
    const controles = new Map(
      c.controles.flatMap((capa) =>
        capa.areas.flatMap((a) =>
          a.controles.map((x) => [x.id, x.nombre] as const),
        ),
      ),
    );
    const etiquetas = cargarEtiquetasDeHallazgo(process.cwd());
    const estado = (vocabulario: string, id: string) =>
      c.estados
        .find((v) => v.id === vocabulario)
        ?.estados.find((e) => e.id === id)?.nombre ?? { es: id, en: id };
    process.stdout.write(
      informeDeTendencia(t, idioma, {
        control: (id) => controles.get(id) ?? null,
        estadoDeControl: (id) => estado("estado_de_control", id),
        estadoDeHallazgo: (id) =>
          etiquetaDeEstadoDeHallazgo(c, etiquetas, id).nombre,
      }),
    );
    process.stdout.write(`huella: ${t.huella}\n`);
  }
  return t.problemas.length > 0 ? 2 : 0;
}

ejecutar(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    const m = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${m}\n`);
    process.exitCode =
      error instanceof ErrorDeUso || error instanceof RangeError ? 3 : 2;
  },
);
