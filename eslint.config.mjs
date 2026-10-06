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
    // Salida de `vercel build` (scripts/build-como-proveedor.mjs, kit v1.39.0).
    ".vercel/**",
  ]),
  // El núcleo es determinista y corre igual en Node y en los navegadores (regla dura 1, RNF-01): sin azar,
  // sin reloj, sin entorno, sin red, sin idioma del sistema y sin módulos de Node. La fecha de evaluación es
  // una entrada; la huella usa `globalThis.crypto.subtle`, que existe en los dos.
  {
    files: ["src/engine/**/*.{ts,mts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...[
          "Date",
          "performance",
          "process",
          "setTimeout",
          "setInterval",
          "fetch",
          "XMLHttpRequest",
          "Intl",
          "require",
          "navigator",
          "window",
          "self",
          "document",
          "location",
        ].map((name) => ({ name, message: "El núcleo es determinista: recibe lo que necesita como entrada (regla dura 1)." })),
      ],
      // `no-restricted-globals` no ve los accesos por `globalThis` ni `crypto.randomUUID()`: del entorno global, el
      // núcleo solo toca `globalThis.crypto.subtle`. Y no importa nada en tiempo de ejecución.
      "no-restricted-syntax": [
        "error",
        ...[
          "MemberExpression[object.name='globalThis'][property.name!='crypto']",
          "MemberExpression[object.name='crypto'][property.name!='subtle']",
          "MemberExpression[object.property.name='crypto'][property.name!='subtle']",
        ].map((selector) => ({
          selector,
          message: "Del entorno global, el núcleo solo usa globalThis.crypto.subtle (regla dura 1).",
        })),
        { selector: "ImportExpression", message: "El núcleo no importa en tiempo de ejecución (regla dura 1)." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Sin azar en el núcleo: una muestra se siembra con una huella (regla dura 1)." },
        ...["localeCompare", "toLocaleString", "toLocaleDateString", "toLocaleTimeString", "toLocaleUpperCase", "toLocaleLowerCase"].map(
          (property) => ({ property, message: "Depende del idioma del sistema: compara por unidades UTF-16 (regla dura 1)." }),
        ),
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: ["fs", "fs/promises", "path", "os", "crypto", "child_process", "url", "util", "process"].map((name) => ({
            name,
            message: "El núcleo no usa módulos de Node: corre también en el navegador (regla dura 1).",
          })),
          patterns: [{ group: ["node:*"], message: "El núcleo no usa módulos de Node: corre también en el navegador (regla dura 1)." }],
        },
      ],
    },
  },
]);

export default eslintConfig;
