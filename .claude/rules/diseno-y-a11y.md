---
paths:
  - "src/components/**"
  - "src/app/**"
  - "scripts/maqueta/**"
  - "scripts/paleta/**"
  - "docs/diseno/**"
  - "design-system.md"
  - "design-sync/**"
  - "**/*.css"
---

# Reglas de diseño y accesibilidad (cargan al tocar componentes, páginas, maqueta o `design-system.md`)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Reglas del kit

5. `[siempre]` **A11y desde el inicio:** tabindex, aria-labels, contraste AA; `prefers-reduced-motion` cambia propiedades, jamás la forma del árbol; tokens de tinta vetados fallan en lint; el color nunca solo. — § 5
10. `[hito]` **El diseño va antes del código:** G-Diseño sellado el 2026-10-04 (`docs/diseno/`, `design-system.md` 1.0.0, dirección «consola»); **FIDELIDAD del primer sprint con UI indiferible** (la primera pantalla construida se compara con su página de la maqueta antes de construir encima); de las tres clases de mirada solo **DECISIÓN** abre parada (máx. 1 por sprint); FORMA y TEXTO al gate humano del hito. — § 10
16. `[hito]` **El bundle `design-sync/` es un artefacto del repo** (`pnpm design-sync:bundle`, `tests/unit/design-sync.test.ts`), se actualiza al cierre del hito; `/design-sync` lo invoca el usuario. — § 16
22. `[cambio]` **Todo control dibujado tiene su script cargado** (gate `tests/unit/controladores-maqueta`); si el sprint toca una maqueta o pantalla, la pasada de capturas activa cada control y comprueba que algo cambió. — § 22

## Patrón de dominio

- **Maqueta como referencia de fidelidad:** `scripts/maqueta/` genera `docs/diseno/` (gate de deriva byte a byte); el producto obedece `design-system.md` y la hoja `docs/diseno/assets/app.css` + `tokens.css` (fuente: `scripts/paleta/`); una decisión de diseño nueva se registra en `docs/diseno/README.md` y se regenera la maqueta, nunca se edita el HTML a mano.
