// @vitest-environment node
// Sentry en el cliente es opcional (S3-M1): sin DSN no hace nada, y con DSN un SDK que no carga no rompe la página ni deja una
// promesa rechazada sin atender.
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@sentry/nextjs");
  vi.resetModules();
});

const esperar = () => new Promise((r) => setTimeout(r, 20));

describe("instrumentation-client", () => {
  it("sin DSN no importa el SDK y las transiciones no hacen nada", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const cargado = vi.fn();
    vi.doMock("@sentry/nextjs", () => {
      cargado();
      return { init: vi.fn(), captureRouterTransitionStart: vi.fn() };
    });
    const m = await import("../../instrumentation-client.ts");
    m.onRouterTransitionStart("/tablero", "push");
    await esperar();
    expect(cargado).not.toHaveBeenCalled();
  });

  it("con DSN inicia el SDK una vez, sin tracing, y reenvía las transiciones", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://clave@ejemplo.invalid/1");
    const init = vi.fn();
    const transicion = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      init,
      captureRouterTransitionStart: transicion,
    }));
    const m = await import("../../instrumentation-client.ts");
    m.onRouterTransitionStart("/brecha", "replace");
    await esperar();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0]![0]).toMatchObject({ tracesSampleRate: 0 });
    expect(transicion).toHaveBeenCalledWith("/brecha", "replace");
  });

  it("con DSN y un SDK que no carga, nada se rompe y ninguna promesa queda rechazada sin atender", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://clave@ejemplo.invalid/1");
    vi.doMock("@sentry/nextjs", () => {
      throw new Error("el chunk no cargó");
    });
    const sinAtender: unknown[] = [];
    const oyente = (e: unknown) => sinAtender.push(e);
    process.on("unhandledRejection", oyente);
    try {
      const m = await import("../../instrumentation-client.ts");
      expect(() => m.onRouterTransitionStart("/tablero", "push")).not.toThrow();
      await esperar();
    } finally {
      process.off("unhandledRejection", oyente);
    }
    expect(sinAtender).toEqual([]);
  });
});
