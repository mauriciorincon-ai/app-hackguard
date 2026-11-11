import type { NextConfig } from "next";

// C19 · el modo público (`pnpm build:publico`) construye en su propia carpeta para no pisar `out/` y deja el marcador en el JS del
// cliente: las pantallas dejan inertes los enlaces que salen de la lista blanca (src/lib/publico/lista-blanca.ts).
const PUBLICO = process.env.HACKGUARD_PUBLICO === "1";

const nextConfig: NextConfig = {
  ...(PUBLICO ? { distDir: ".next-publico" } : {}),
  env: { HACKGUARD_PUBLICO: PUBLICO ? "1" : "" },
  // Perfil EXPORTADO ESTÁTICO (kit v1.29.0): un HTML por ruta en out/, sin servidor.
  // `pnpm start` sirve out/ con serve (versión exacta) porque `next start` falla con export (E375).
  output: "export",
  images: { unoptimized: true },
  // El indicador de desarrollo de Next tapa la navegación inferior móvil e intercepta taps en los
  // e2e (visto en nutri-kids S1) — apagado por default.
  devIndicators: false,
};

export default nextConfig;
