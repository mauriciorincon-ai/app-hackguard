// @vitest-environment node
// La fecha del commit que se construye (S2-B6a): un dato del historial, jamás el reloj. Si git no está o no hay historial, no hay
// fecha (`undefined`) y la consulta cae a la de la instantánea; nunca lanza.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { fechaDelCommit } from "../../src/lib/catalogo/fecha-del-commit.ts";

const temporales: string[] = [];
const carpeta = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-commit-"));
  temporales.push(d);
  return d;
};
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, stdio: "ignore" });

describe("fechaDelCommit", () => {
  it("lee la fecha (UTC) del último commit, no la de hoy", () => {
    const d = carpeta();
    git(d, "init", "-q");
    execFileSync(
      "git",
      [
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.com",
        "commit",
        "-q",
        "--allow-empty",
        "-m",
        "x",
        "--date",
        "2020-02-29T23:30:00Z",
      ],
      {
        cwd: d,
        stdio: "ignore",
        env: { ...process.env, GIT_COMMITTER_DATE: "2020-02-29T23:30:00Z" },
      },
    );
    expect(fechaDelCommit(d)).toBe("2020-02-29");
  });

  it("sin historial (un repositorio sin commits) no hay fecha, y no lanza", () => {
    const d = carpeta();
    git(d, "init", "-q");
    expect(fechaDelCommit(d)).toBeUndefined();
  });

  it("fuera de un repositorio no hay fecha, y no lanza", () => {
    expect(fechaDelCommit(carpeta())).toBeUndefined();
  });

  it("una carpeta que no existe no hay fecha, y no lanza", () => {
    expect(fechaDelCommit(path.join(carpeta(), "no-existe"))).toBeUndefined();
  });
});
