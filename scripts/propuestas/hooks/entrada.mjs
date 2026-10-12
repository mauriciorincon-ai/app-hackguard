// Lectura común de los hooks de los dos agentes: el JSON que Claude Code manda por stdin, y las salidas. Un hook que BLOQUEA sale con 2 y
// explica en stderr (Claude Code se lo muestra al agente); uno que deja pasar sale con 0. Los hooks informan `agent_type` cuando quien
// llama es un subagente.
import { readFileSync } from "node:fs";

export const AGENTES = ["investigador", "extractor"];

export const entrada = () => {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
};

/**
 * ¿Qué agente llama? Lo dice `agent_type`; y los hooks declarados en el propio agente (.claude/agents/<agente>.md) pasan `--investigador`
 * o `--extractor`, por si algún día `agent_type` no llegara. `null` si quien llama es la sesión principal.
 */
export const agenteDe = (e) =>
  AGENTES.find((a) => e.agent_type === a) ?? AGENTES.find((a) => process.argv.includes(`--${a}`)) ?? null;

// Con la marca de un agente, un hook que se rompe BLOQUEA (sale con 2): un hook roto que deja pasar es un candado abierto. Registrado en
// settings.json no se marca así, para no dejar a la sesión principal sin herramientas por un hook roto; ahí el filtro es `agent_type`.
if (AGENTES.some((a) => process.argv.includes(`--${a}`)))
  for (const evento of ["uncaughtException", "unhandledRejection"])
    process.on(evento, (err) => {
      process.stderr.write(`BLOQUEADO: el hook del agente falló (${err?.message ?? err}); por seguridad no deja pasar.\n`);
      process.exit(2);
    });

export function bloquear(motivo) {
  process.stderr.write(`${motivo}\n`);
  process.exit(2);
}

export const pasar = () => process.exit(0);
