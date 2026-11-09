// @vitest-environment node
// Deuda del S10 (#10): el e2e habla con el servidor por su dirección literal. `serve` escucha en 127.0.0.1 (`pnpm start`); `localhost` puede
// resolver a ::1 primero y la CI lo confirmó (el sondeo del servidor no llegaba). Una sola dirección en el servidor, la URL base y el sondeo.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../..");
const config = readFileSync(path.join(RAIZ, "playwright.config.ts"), "utf8");
const codigo = config
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");

describe("playwright.config.ts", () => {
  it("el servidor de pruebas escucha en 127.0.0.1 (`pnpm start`)", () => {
    const inicio = JSON.parse(
      readFileSync(path.join(RAIZ, "package.json"), "utf8"),
    ) as { scripts: { start: string } };
    expect(inicio.scripts.start).toContain("tcp://127.0.0.1:");
  });

  it("la URL base y el sondeo del servidor usan 127.0.0.1, nunca localhost", () => {
    expect(codigo).not.toMatch(/localhost/);
    expect(codigo).toMatch(/baseURL: `http:\/\/127\.0\.0\.1:\$\{PUERTO\}`/);
    expect(codigo).toMatch(/url: `http:\/\/127\.0\.0\.1:\$\{PUERTO\}`/);
  });
});
