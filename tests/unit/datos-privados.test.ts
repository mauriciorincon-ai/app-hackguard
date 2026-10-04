// La evidencia real no viaja al repo público (regla dura 8). datos/privado/ está ignorada salvo su README;
// este gate falla si algo más de esa carpeta llegó al índice de git (un `git add -f`, o un .gitignore que se
// relajó), y si la regla de ignorado dejó de cubrir un archivo nuevo.
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

describe("datos/privado/: nada de la evidencia real se versiona", () => {
  it("lo único versionado es su README", () => {
    const versionados = git("ls-files", "datos/privado")
      .split("\n")
      .filter(Boolean);
    expect(versionados).toEqual(["datos/privado/README.md"]);
  });

  it("un archivo nuevo en la carpeta queda ignorado", () => {
    const regla = git("check-ignore", "-v", "datos/privado/sobre-real.json");
    expect(regla).toMatch(/\.gitignore:\d+:datos\/privado\/\*/);
  });
});
