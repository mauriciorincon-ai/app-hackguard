---
paths:
  - "src/engine/**"
  - "src/lib/**"
  - "src/cli/**"
  - "vitest.config.ts"
---

# Reglas del motor determinista (cargan al tocar `src/engine/`, `src/lib/`, `src/cli/`)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Regla dura de producto

1. **El núcleo es determinista y jamás invoca un modelo de lenguaje.** Catálogo, inventario, planificador, libro de evidencia, severidad, brecha y vista por control son código puro: la fecha de evaluación es una entrada, sin `Math.random`, sin reloj del sistema; toda muestra se siembra con la huella del lote; la misma entrada da los mismos bytes en Node y en Chromium, Firefox y WebKit (huellas en CI).

## Reglas del kit

1. `[siempre]` **TypeScript strict.** Sin `any` ni `@ts-ignore` sin justificación en comentario. — § 1
2. `[sprint]` **Tests de lo que cambia.** Motores puros > 80 % (`src/engine/` ≥ 90 %, umbral en `vitest.config.ts`), UI > 50 %, ≥ 1 e2e por feature core; `--coverage` en el script `test`. — § 2
3. `[siempre]` **Motor separado de UI.** Lógica pura en `engine/`/`lib/`; componentes sin lógica de negocio. — § 3
23. `[cambio]` **Matriz de envejecimiento:** todo dato con fecha de cambio de estado trae un gate que construye la página en cada fecha en que algo cambia; la fecha de consulta es perilla de build, nunca el reloj (`tests/unit/catalogo/envejecimiento.test.ts`, `maqueta-envejecimiento`). — § 23
