// La frontera de «la IA propone, el humano aprueba» (regla dura 2): decidir una propuesta lo hace una persona en su terminal. El candado
// de los hooks es la defensa contra el accidente; esta guarda es la frontera, porque un hook se puede burlar con un rodeo (`f=…; $f`) y
// el CLI no puede saber quién lo llama salvo por su entorno.
//   · Sobre el repositorio real: no corre dentro de una sesión de Claude Code (la presencia de la variable basta, aunque esté vacía) ni
//     sin una terminal interactiva.
//   · Sobre una raíz temporal (las pruebas, el kit de prueba): no aplica, para poder probar el CLI por línea de comandos.
import { realpathSync } from "node:fs";
import path from "node:path";

const real = (ruta: string): string => {
  try {
    return realpathSync(path.resolve(ruta));
  } catch {
    return path.resolve(ruta);
  }
};

export type PuedeDecidir = { ok: true } | { ok: false; motivo: string };

export function puedeDecidir(e: {
  raiz: string;
  repo: string;
  env: Record<string, string | undefined>;
  tty: boolean;
}): PuedeDecidir {
  if (real(e.raiz) !== real(e.repo)) return { ok: true };
  if (
    Object.keys(e.env).some(
      (k) => k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_"),
    )
  )
    return {
      ok: false,
      motivo:
        "corre dentro de una sesión de Claude Code; ábrelo en tu propia terminal / it runs inside a Claude Code session; open it in your own terminal",
    };
  if (!e.tty)
    return {
      ok: false,
      motivo:
        "no hay una terminal interactiva; ábrelo en tu propia terminal / there is no interactive terminal; open it in your own terminal",
    };
  return { ok: true };
}
