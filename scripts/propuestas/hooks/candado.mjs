// Hook PreToolUse (Bash, escrituras y lecturas) — el candado de las skills /investigar y /extraer.
//   1. NADIE (tampoco la sesión principal) corre `propuestas:decidir`: decidir una propuesta es de una persona en su terminal (la IA propone,
//      el humano aprueba). Es la defensa contra el accidente; la frontera está dentro del CLI (`puedeDecidir`, src/lib/propuestas/frontera.ts).
//   2. Cada subagente (`investigador`, `extractor`) solo escribe `propuestas/corridas/<su corrida>/propuesta.json` —lo demás (la consulta, la
//      lectura del texto, la corrida sellada, el libro) lo escribe el código y el modelo no lo toca—, solo lee lo de su oficio (nada de
//      `datos/privado/`) y solo corre, tal cual, los dos comandos de su oficio, sin encadenar nada. Sin red: no tiene WebFetch ni WebSearch.
import { isAbsolute, relative, resolve } from "node:path";
import { RAIZ } from "../raiz.mjs";
import { agenteDe, bloquear, entrada, pasar } from "./entrada.mjs";
import { ejecutaDecidir } from "./orden.mjs";

const FECHA = String.raw`\d{4}-\d{2}-\d{2}`;

// ── Lo que cada agente puede hacer ──────────────────────────────────────────────────────────────────

const PREFIJO = { investigador: "INV", extractor: "EXT" };
const NOMBRE_DE_CORRIDA = String.raw`${FECHA}-\d{2}`;
const SEGURA = String.raw`(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]*`;
const ID = String.raw`[a-z0-9]+(?:[_-][a-z0-9]+)*`;

/** Lo único que un agente corre: sus dos comandos, tal cual, sin encadenar nada y sin variables de entorno delante. */
const COMANDOS = {
  investigador: (p) => [
    new RegExp(
      String.raw`^pnpm propuestas:buscar --(?:marco|familia) ${ID} --fecha ${FECHA}$`,
    ),
    new RegExp(String.raw`^pnpm propuestas:buscar --todos --fecha ${FECHA}$`),
    new RegExp(
      String.raw`^pnpm propuestas:verificar propuestas/corridas/${p}-${NOMBRE_DE_CORRIDA}(?: --json)?$`,
    ),
  ],
  extractor: (p) => [
    new RegExp(
      String.raw`^pnpm propuestas:leer (?:docs/kit-de-prueba|propuestas/entradas)/${SEGURA}\.txt --activo ${ID} --fecha ${FECHA}(?: --json)?$`,
    ),
    new RegExp(
      String.raw`^pnpm propuestas:verificar propuestas/corridas/${p}-${NOMBRE_DE_CORRIDA}(?: --json)?$`,
    ),
  ],
};

/** Lo único que un agente escribe: el propuesta.json de una corrida SUYA (INV- para el investigador, EXT- para el extractor). */
const escribible = (agente) =>
  new RegExp(
    String.raw`^propuestas/corridas/${PREFIJO[agente]}-${NOMBRE_DE_CORRIDA}/propuesta\.json$`,
  );

/** Lo que lee: el catálogo y los planes demo, las propuestas y sus lecturas, el contrato de su salida y su skill. Nunca `datos/privado/`. */
const LEIBLE = (agente) =>
  new RegExp(
    String.raw`^(?:(?:datos|propuestas)(?:/|$)|src/engine/propuestas/esquemas\.ts$|\.claude/skills/${agente === "investigador" ? "investigar" : "extraer"}(?:/|$))`,
  );
const NUNCA =
  /(?:^|\/)(?:datos\/privado|\.git|\.env[^/]*|node_modules)(?:\/|$)/;

/** La ruta relativa a la raíz de trabajo, con «/»; `null` si sale de ella. */
function dentro(ruta, cwd) {
  if (typeof ruta !== "string" || !ruta) return null;
  const r = relative(RAIZ, resolve(cwd, ruta)).split("\\").join("/");
  return r.startsWith("..") || isAbsolute(r) ? null : r;
}

const e = entrada();
const herramienta = e.tool_name;
const ti = e.tool_input ?? {};
const cwd = e.cwd ?? RAIZ;

if (herramienta === "Bash" && ejecutaDecidir(ti.command))
  bloquear(
    "BLOQUEADO: decidir una propuesta o aportar un documento lo hace solo una persona, en su terminal (la IA propone, el humano aprueba). Arma el comando (en la pantalla /catalogo/propuestas, o el de aportar que te da el CLI) y pídeselo al usuario.",
  );

const agente = agenteDe(e);
if (agente === null) pasar();

if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(herramienta)) {
  const ruta = ti.file_path ?? ti.path ?? ti.notebook_path;
  const r = dentro(ruta, cwd);
  if (!r || !escribible(agente).test(r))
    bloquear(
      `BLOQUEADO: el ${agente} solo escribe propuestas/corridas/${PREFIJO[agente]}-AAAA-MM-DD-NN/propuesta.json (pidió «${ruta ?? "?"}»); lo demás de propuestas/ lo escribe el código.`,
    );
  pasar();
}

if (["Read", "Glob", "Grep"].includes(herramienta)) {
  // Glob y Grep sin `path` buscan en todo el directorio de trabajo: se les pide una carpeta permitida.
  const ruta = herramienta === "Read" ? ti.file_path : ti.path;
  // macOS no distingue mayúsculas: `datos/Privado` es `datos/privado`. Toda la comparación va en minúsculas.
  const dentroDe = dentro(ruta, cwd);
  const r = dentroDe === null ? null : dentroDe.toLowerCase();
  const patron =
    herramienta === "Glob"
      ? String(ti.pattern ?? "")
      : herramienta === "Grep"
        ? String(ti.glob ?? "")
        : "";
  // Un patrón o un glob no puede nombrar lo privado ni lo ignorado: ripgrep lo busca aunque .gitignore lo excluya.
  const patronProhibido = /privado|\.git|\.env|node_modules/i.test(patron);
  // La raíz `datos` entera no: obliga a nombrar una subcarpeta, y así no se listan los nombres de datos/privado.
  const raizDeDatos = r === "datos";
  if (
    !r ||
    raizDeDatos ||
    NUNCA.test(r) ||
    !LEIBLE(agente).test(r) ||
    patronProhibido ||
    patron.includes("..") ||
    patron.startsWith("/") ||
    patron.startsWith("~")
  )
    bloquear(
      `BLOQUEADO: el ${agente} solo lee datos/ (sin datos/privado/), propuestas/, src/engine/propuestas/esquemas.ts y su skill (pidió «${ruta ?? "(todo)"}»).`,
    );
  pasar();
}

if (herramienta === "Bash") {
  const c = String(ti.command ?? "").trim();
  if (!COMANDOS[agente](PREFIJO[agente]).some((permitido) => permitido.test(c)))
    bloquear(
      agente === "investigador"
        ? "BLOQUEADO: el investigador solo corre, tal cual, `pnpm propuestas:buscar --marco <id>|--familia <id>|--todos --fecha AAAA-MM-DD` o `pnpm propuestas:verificar propuestas/corridas/INV-AAAA-MM-DD-NN`."
        : "BLOQUEADO: el extractor solo corre, tal cual, `pnpm propuestas:leer <texto en docs/kit-de-prueba o propuestas/entradas> --activo <id> --fecha AAAA-MM-DD` o `pnpm propuestas:verificar propuestas/corridas/EXT-AAAA-MM-DD-NN`.",
    );
  pasar();
}

// Cualquier otra herramienta (red, subagentes, edición de cuadernos…) no es de su oficio.
bloquear(
  `BLOQUEADO: el ${agente} no usa la herramienta ${herramienta ?? "?"}: solo lee, escribe su propuesta.json y corre sus dos comandos.`,
);
