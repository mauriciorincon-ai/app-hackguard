import { defineConfig, devices } from "@playwright/test";

// El e2e del paquete (C20): sirve `dist/paquete-hoja-de-vida/public` TAL CUAL lo recibirá CV Viva —sin URL limpias, bajo `/piezas/hackguard/`—
// en 127.0.0.1 y recorre el paquete desde su entrada. Pide el paquete ya armado (`pnpm paquete:vitrina`). Puerto propio: 3213.
const PUERTO = Number(process.env.E2E_PUERTO_PAQUETE ?? 3213);

export default defineConfig({
  testDir: "tests/e2e-paquete",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://127.0.0.1:${PUERTO}`, trace: "on-first-retry" },
  projects: [
    {
      name: "movil-380",
      use: { ...devices["Pixel 7"], viewport: { width: 380, height: 800 } },
    },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm exec serve -c tests/e2e-paquete/serve.json -l tcp://127.0.0.1:${PUERTO} --no-request-logging`,
    url: `http://127.0.0.1:${PUERTO}/piezas/hackguard/index.html`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
