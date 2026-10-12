// Redacta el `report.jsonl` crudo de garak antes de que toque el repo (regla dura 3: ninguna carga de ataque se versiona).
//
// El crudo trae los prompts de ataque, las salidas del generador (aquí, el eco del prompt), los disparadores
// (`notes.triggers`) y rutas absolutas del equipo. Este redactor sustituye cada texto por un marcador y las rutas locales
// por `<fixture>` / `<home>`, y CONSERVA estructura, orden de líneas, cantidades, conteos y puntajes: lo que el adaptador
// lee. Es determinista. Después de redactar comprueba que ningún texto original sobrevivió y falla si alguno quedó.
//
// Uso: node scripts/adaptadores/redactar-garak.mjs <crudo.jsonl> <salida.jsonl> [ruta=<marcador>…]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MARCADOR_DE_PROBE = "<texto-de-probe>";
export const MARCADOR_DE_SALIDA = "<texto-de-salida>";
export const MARCADOR_DE_DISPARADOR = "<disparador>";

const texto = (mensaje, marcador, vistos) => {
  if (mensaje === null || typeof mensaje !== "object" || !("text" in mensaje))
    return mensaje;
  if (typeof mensaje.text === "string") vistos.add(mensaje.text);
  return { ...mensaje, text: mensaje.text === null ? null : marcador };
};

const turnos = (conversacion, vistos) =>
  conversacion !== null &&
  typeof conversacion === "object" &&
  Array.isArray(conversacion.turns)
    ? {
        ...conversacion,
        turns: conversacion.turns.map((turno) => ({
          ...turno,
          content: texto(
            turno.content,
            turno.role === "assistant" ? MARCADOR_DE_SALIDA : MARCADOR_DE_PROBE,
            vistos,
          ),
        })),
      }
    : conversacion;

const notas = (n, vistos) => {
  if (n === null || typeof n !== "object" || !Array.isArray(n.triggers))
    return n;
  for (const t of n.triggers) if (typeof t === "string") vistos.add(t);
  return { ...n, triggers: n.triggers.map(() => MARCADOR_DE_DISPARADOR) };
};

function redactarIntento(a, vistos) {
  return {
    ...a,
    prompt: turnos(a.prompt, vistos),
    outputs: (a.outputs ?? []).map((o) => texto(o, MARCADOR_DE_SALIDA, vistos)),
    conversations: (a.conversations ?? []).map((c) => turnos(c, vistos)),
    reverse_translation_outputs: (a.reverse_translation_outputs ?? []).map(
      (o) => texto(o, MARCADOR_DE_SALIDA, vistos),
    ),
    notes: notas(a.notes, vistos),
  };
}

/** Cambia las rutas locales (las dadas y cualquier `/Users/<quien>` o `/home/<quien>`) por marcadores. */
function sinRutas(valor, locales) {
  if (typeof valor === "string") {
    let s = valor;
    for (const [ruta, marcador] of locales) s = s.split(ruta).join(marcador);
    return s
      .replace(/\/Users\/[^/"\\\s]+/g, "<home>")
      .replace(/\/home\/[^/"\\\s]+/g, "<home>");
  }
  if (Array.isArray(valor)) return valor.map((v) => sinRutas(v, locales));
  if (valor !== null && typeof valor === "object")
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, sinRutas(v, locales)]),
    );
  return valor;
}

/**
 * @param {string} crudo el `report.jsonl` tal como lo escribió garak
 * @param {[string, string][]} locales rutas del equipo y el marcador con que se reemplazan (las más largas primero)
 * @returns {{ texto: string, lineas: number, fugas: string[] }}
 */
export function redactarGarak(crudo, locales = []) {
  const vistos = new Set();
  const ordenadas = [...locales].sort((a, b) => b[0].length - a[0].length);
  const lineas = crudo.split("\n").filter((l) => l !== "");
  const salida = lineas.map((linea) => {
    const registro = JSON.parse(linea);
    const redactado =
      registro.entry_type === "attempt"
        ? redactarIntento(registro, vistos)
        : registro;
    return JSON.stringify(sinRutas(redactado, ordenadas));
  });
  const resultado = `${salida.join("\n")}\n`;
  // Ningún texto original (de 6 caracteres o más) puede seguir en la salida, ni escapado como lo escribe JSON.
  const fugas = [...vistos].filter(
    (t) => t.length >= 6 && resultado.includes(JSON.stringify(t).slice(1, -1)),
  );
  return { texto: resultado, lineas: salida.length, fugas };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [entrada, destino, ...rutas] = process.argv.slice(2);
  if (!entrada || !destino) {
    process.stderr.write(
      "uso: redactar-garak.mjs <crudo.jsonl> <salida.jsonl> [ruta=<marcador>…]\n",
    );
    process.exit(3);
  }
  const locales = rutas.map((r) => {
    const corte = r.lastIndexOf("=<");
    return corte < 0 ? [r, "<home>"] : [r.slice(0, corte), r.slice(corte + 1)];
  });
  const {
    texto: redactado,
    lineas,
    fugas,
  } = redactarGarak(readFileSync(entrada, "utf8"), locales);
  if (fugas.length > 0) {
    process.stderr.write(
      `redacción incompleta: ${fugas.length} texto(s) original(es) siguen en la salida. No se escribió nada.\n`,
    );
    process.exit(2);
  }
  writeFileSync(destino, redactado);
  process.stdout.write(`${destino}: ${lineas} líneas, 0 textos originales\n`);
}
