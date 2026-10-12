// Lo que identifica a quien corre las skills: correo y nombre de git, usuario y equipo del sistema, carpeta personal. Ninguna petición
// ni escritura de un agente puede llevarlo (regla del sprint 8: «ninguna petición lleva identificadores míos»).
import { execFileSync } from "node:child_process";
import { homedir, hostname, userInfo } from "node:os";
import { basename } from "node:path";

function git(clave) {
  try {
    return execFileSync("git", ["config", "--get", clave], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Los identificadores en minúsculas y de al menos 4 caracteres (uno más corto daría falsos positivos en cualquier texto). */
export function identificadores() {
  const email = git("user.email");
  const nombre = git("user.name");
  const extra = (process.env.HACKGUARD_IDENTIFICADORES ?? "").split(",");
  const todos = [email, email.split("@")[0], nombre, ...nombre.split(/\s+/), userInfo().username, hostname().split(".")[0], basename(homedir()), ...extra];
  return [...new Set(todos.map((x) => (x ?? "").trim().toLowerCase()).filter((x) => x.length >= 4))];
}
