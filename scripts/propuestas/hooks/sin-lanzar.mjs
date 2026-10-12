// Hook PreToolUse (Agent / Task) — el investigador y el extractor solo los lanza una PERSONA escribiendo /investigar o /extraer.
// `disable-model-invocation` impide que el modelo invoque la skill, pero no que lance el subagente directamente con la herramienta Agent.
// La skill corre en su propio contexto (`context: fork` + `agent: …`) y no pasa por aquí.
import { AGENTES, bloquear, entrada, pasar } from "./entrada.mjs";

const e = entrada();
const tipo = String(e.tool_input?.subagent_type ?? "").trim().toLowerCase();
if (["Agent", "Task"].includes(e.tool_name) && AGENTES.includes(tipo))
  bloquear(`BLOQUEADO: el ${tipo} solo lo lanza una persona con /${tipo === "investigador" ? "investigar" : "extraer"} (la IA propone cuando alguien se lo pide; jamás corre sola).`);
pasar();
