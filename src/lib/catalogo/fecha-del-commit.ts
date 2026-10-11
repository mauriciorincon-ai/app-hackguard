// La fecha (UTC, AAAA-MM-DD) del commit que se construye, leída de git. Es un dato del historial, no el reloj: el mismo
// commit da la misma fecha en cualquier máquina. Si git no está o no hay historial (un despliegue sin repositorio), no hay
// fecha y la consulta cae a la de la instantánea.
import { execFileSync } from "node:child_process";

export function fechaDelCommit(
  raiz: string = process.cwd(),
): string | undefined {
  try {
    const segundos = Number(
      execFileSync("git", ["log", "-1", "--format=%ct"], {
        cwd: raiz,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
    if (!Number.isFinite(segundos) || segundos <= 0) return undefined;
    return new Date(segundos * 1000).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}
