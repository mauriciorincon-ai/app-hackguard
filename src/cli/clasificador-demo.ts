// CLI del clasificador demo: `pnpm clasificador:demo`. Lee el conjunto de referencia del kit de prueba, lo
// corre por el clasificador y muestra sus medidas. Solo lee el archivo; lo demás lo hace el motor.
//
//   clasificador-demo [--json] [--idioma es|en] [--conjunto <archivo.json>]
//
// Códigos de salida: 0 medido · 3 error de uso, de lectura o un conjunto inválido.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  evaluarConjunto,
  informeDelDemo,
  type Idioma,
} from "../engine/demo/conjunto.ts";

const CONJUNTO =
  "docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json";

const USO =
  "uso / usage: clasificador-demo [--json] [--idioma es|en] [--conjunto <archivo.json>]";

async function principal(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      idioma: { type: "string", default: "es" },
      conjunto: { type: "string", default: CONJUNTO },
    },
  });
  if (positionals.length > 0) throw new RangeError(positionals.join(" "));
  if (values.idioma !== "es" && values.idioma !== "en")
    throw new RangeError("--idioma es|en");
  let datos: unknown;
  try {
    datos = JSON.parse(readFileSync(values.conjunto, "utf8")) as unknown;
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    throw new Error(`error de lectura / read error: ${values.conjunto}: ${detalle}`);
  }
  const evaluacion = await evaluarConjunto(datos);
  process.stdout.write(
    values.json
      ? `${JSON.stringify(evaluacion, null, 2)}\n`
      : informeDelDemo(evaluacion, values.idioma as Idioma),
  );
  return 0;
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    const detalle = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${detalle}\n\n${USO}\n`);
    process.exitCode = 3;
  },
);
