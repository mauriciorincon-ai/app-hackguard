---
paths:
  - "tests/**"
  - ".github/**"
  - "scripts/**"
  - "githooks/**"
  - ".claude/**"
  - "playwright.config.ts"
  - "perf-budget.json"
  - "lighthouse-urls.json"
  - "pnpm-workspace.yaml"
---

# Reglas de pruebas, CI y proceso (cargan al tocar `tests/`, `.github/`, `scripts/`, `githooks/` o `.claude/`)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Reglas del kit

15. `[cambio]` **Un gate se demuestra fallando:** `scripts/demo-rojo.sh` solo para gates PROPIOS nuevos; un check `skipped` no es verde: conclusión propia `success` en cada check requerido. — § 15
21. `[cambio]` **IA de construcción por suscripción (7-S):** solo el binario oficial de Claude Code, token jamás en env ni repo; ADR de cumplimiento por release. — § 21
24. `[cambio]` 🔒 **Las protecciones del sistema del usuario se enseñan antes de tocarlas:** matriz de una fila por acción y un «sí» por acción. — § 24
25. `[siempre]` **El comando de pruebas por defecto no toca hardware ni permisos.** — § 25
27. `[siempre]` **La evidencia se escribe después del hecho** («leído como imagen», «N de N», «en verde») con la cuenta tomada del resultado; el conteo de `--minimo-tests` sale de un comando, nunca a mano. — § 27
28. `[cambio]` **Parejas de versiones entre dos ecosistemas** se vigilan con un test entre lockfiles; no aplica hoy (sin Tauri ni Python). — § 28

## Comandos y estándares

`/plan-sprint` (paso 1) · `/audita-sprint` (paso 3) · `/deploy-check` (paso 3) · `/design-sync` (hito; lo invoca el usuario) · `/self-review`, `/run-tests`, `/security-audit` (opcionales).
Scripts: `scripts/horas-sprint.mjs` · `scripts/demo-rojo.sh` · `scripts/verificar-dependencias.mjs` · `scripts/build-como-proveedor.mjs` · `scripts/verificar-salida-publicada.mjs` · `scripts/cero-enlaces.mjs` · `scripts/lighthouse-margen.mjs`.
Propios: `pnpm catalogo:validar` · `pnpm catalogo:instantanea` · `pnpm clasificador:demo` · `pnpm maqueta` · `pnpm capturas:maqueta` · `pnpm tokens` · `pnpm design-sync:bundle`.

**Estándares (los 6+1, gates en CI):** Testing · CI/CD · Observabilidad · Seguridad · Performance (`perf-budget.json`, Lighthouse una corrida, categorías ≥ 0.9; cada sprint suma sus rutas nuevas a `lighthouse-urls.json`) · UX+A11y · IA embebida responsable. Detalle canónico: `estandares/estandares.md` de la planeadora (solo lectura). Ítem rojo ⇒ hallazgo que se paga en el sprint; lo imposible, con la decisión del dueño en el cierre, o el sprint no cierra.
