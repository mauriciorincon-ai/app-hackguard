// src/lib/observability.ts: el reporte de errores es metadata-only y queda inerte sin DSN. Al activar la
// cobertura en el S1 este módulo era el único de src/lib sin prueba; lo que se prueba es su contrato: sin DSN
// no sale nada, y con DSN sale el tipo de error y solo los metadatos que se le pasan.
import { afterEach, describe, expect, it, vi } from "vitest";

const captureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureMessage }));

const { reportError } = await import("../../src/lib/observability");

afterEach(() => {
  captureMessage.mockReset();
  vi.unstubAllEnvs();
});

describe("reportError", () => {
  it("sin DSN no envía nada", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    reportError("catalogo/validacion", { hallazgos: 3 });
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("con DSN envía el tipo y solo los metadatos dados", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "dsn-de-prueba");
    reportError("catalogo/validacion", { hallazgos: 3, bloqueado: true });
    expect(captureMessage).toHaveBeenCalledWith("catalogo/validacion", {
      level: "error",
      extra: { hallazgos: 3, bloqueado: true },
    });
  });

  it("sin metadatos envía un extra vacío", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "dsn-de-prueba");
    reportError("catalogo/lectura");
    expect(captureMessage).toHaveBeenCalledWith("catalogo/lectura", {
      level: "error",
      extra: {},
    });
  });
});
