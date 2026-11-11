import { defineConfig, devices } from "@playwright/test";

// El e2e del modo público (C19): construye la exportación pública (`pnpm build:publico`, que ya barre la frontera) y la sirve con `serve`
// en 127.0.0.1. Es la misma suite en escritorio y a 380 px. Puerto propio para no chocar con el e2e normal ni con el del paquete.
const PUERTO = Number(process.env.E2E_PUERTO_PUBLICO ?? 3212);
const CONSULTA_DEL_E2E = "2026-10-05";

export default defineConfig({
  testDir: "tests/e2e-publico",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://127.0.0.1:${PUERTO}`, trace: "on-first-retry" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "movil-380",
      use: { ...devices["Pixel 7"], viewport: { width: 380, height: 800 } },
    },
  ],
  webServer: {
    command: `HACKGUARD_CONSULTA=${CONSULTA_DEL_E2E} pnpm build:publico && pnpm exec serve dist/publico -l tcp://127.0.0.1:${PUERTO}`,
    url: `http://127.0.0.1:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
