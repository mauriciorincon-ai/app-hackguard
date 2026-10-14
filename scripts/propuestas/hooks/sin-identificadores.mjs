// Hook PreToolUse (Bash, Write, Edit) de los agentes: nada de lo que un agente manda o escribe lleva un identificador de quien corre (correo
// y nombre de git, usuario y equipo del sistema, carpeta personal). El agente no tiene herramientas de red: lo único que sale de su sesión
// es el comando que corre y lo que escribe en propuestas/, que viaja al repositorio público. El mensaje no repite el identificador.
import { identificadores, plegar } from "../comun.mjs";
import { agenteDe, bloquear, entrada, pasar } from "./entrada.mjs";

const e = entrada();
if (agenteDe(e) === null) pasar();
const ti = e.tool_input ?? {};
// De una escritura solo importa el contenido (la ruta absoluta lleva la carpeta personal en cualquier máquina); de Bash, el comando.
const saliente = [ti.command, ti.content, ti.new_string, ti.old_string, ...(Array.isArray(ti.edits) ? ti.edits.flatMap((x) => [x?.new_string, x?.old_string]) : [])]
  .filter((x) => typeof x === "string")
  .map((x) => plegar(x))
  .join("\n");
if (identificadores().some((id) => saliente.includes(id)))
  bloquear("BLOQUEADO: lo que vas a enviar o escribir lleva un identificador de quien corre la skill. Las propuestas van al repositorio público: sin nombres, correos ni rutas personales.");
pasar();
