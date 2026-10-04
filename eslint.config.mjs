import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados o derivados: cobertura, y la maqueta de la Etapa de Diseño (HTML autocontenido con
    // su propio JS de sala; public/diseno/ es su copia de build).
    "coverage/**",
    "docs/diseno/**",
    "public/diseno/**",
  ]),
]);

export default eslintConfig;
