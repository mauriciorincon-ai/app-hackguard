# Sprint 001 — «El catálogo vivo» · bitácora de implementación

Orden: `portafolio/hackguard/ordenes/SPRINT_001-orden.md` (planeadora, solo lectura). Plan:
`sprints/SPRINT_001.md` de la planeadora. Rama `sprint-001/catalogo-vivo-nucleo` desde `main` en `41eaad0`.
Plan aprobado y «construye» del usuario: 2026-10-04. Sin PRs de dependabot abiertos al arrancar (el #6 se
reemplazó por el #7 antes del sprint).

## Fase 0 — Setup, delta del kit y decisiones abiertas (2026-10-04)

### Verificación de supuestos del kit

- **Hooks:** `githooks/pre-commit` está en 100755 y `core.hooksPath` apunta a `githooks`. gitleaks 8.30.1 y jq
  están en el PATH de la sesión.
- **Versiones:** TypeScript 6.0.3 y React 19.3 conviven con Vitest 5.0.3 y Next 16.3.8. typecheck, lint, test y
  build pasan en verde en local antes de tocar nada.
- **`pnpm audit`:** ADR-001 sigue vigente: `braces` 3.0.3 es todavía la última versión publicada.

### Delta del kit v1.34.0 → v1.39.0, por nombre

| Versión            | Pieza                                                                                                                                                                                           | Qué se hizo                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.35 / 1.38        | `scripts/demo-rojo.sh`                                                                                                                                                                          | Copiado en 100755; con él se corrieron todas las demos de esta fase                                                                                                                                                                                                                                                                                                                                                                     |
| 1.35 / 1.37 / 1.39 | `scripts/verificar-dependencias.mjs` (falla cerrado, degradaciones permitidas, bajadas forzadas) + `scripts/degradaciones-permitidas.json` (`[]`) + `tests/unit/verificar-dependencias.test.ts` | Copiados juntos (el test importa funciones que la versión v1.33 no exportaba)                                                                                                                                                                                                                                                                                                                                                           |
| 1.37               | Hook PreToolUse de secretos que falla cerrado (`.claude/settings.json`) + `tests/unit/hook-secretos.test.ts`                                                                                    | Copiados juntos                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 1.37               | `scripts/lighthouse-margen.mjs`                                                                                                                                                                 | Al final del job `lighthouse`                                                                                                                                                                                                                                                                                                                                                                                                           |
| 1.39               | `scripts/build-como-proveedor.mjs` + `scripts/verificar-salida-publicada.mjs` + `tests/unit/salida-publicada.test.ts`                                                                           | Paso nuevo en `quality` tras `pnpm build`. Corrido en local antes de empujar: **50 páginas publicadas idénticas a `out/`**, maqueta incluida                                                                                                                                                                                                                                                                                            |
| 1.35 / 1.36 / 1.38 | `.claude/commands/audita-sprint.md`, `deploy-check.md`                                                                                                                                          | Reemplazados por los del kit (la app no los había adaptado)                                                                                                                                                                                                                                                                                                                                                                             |
| 1.36               | `.claude/commands/plan-sprint.md`                                                                                                                                                               | **Solo** el cambio (f), tres clases de mirada. Se conservan el paso 10 y «`gh pr checks` tras cada push» (ver K-S1-2)                                                                                                                                                                                                                                                                                                                   |
| 1.38               | `.claude/COMANDOS.md`                                                                                                                                                                           | Copiado; la fila `/release-check` dice que no se estampa en el perfil estático                                                                                                                                                                                                                                                                                                                                                          |
| 1.35               | Cabecera de `.github/dependabot.yml`                                                                                                                                                            | Copiada (solo el comentario de la versión)                                                                                                                                                                                                                                                                                                                                                                                              |
| 1.38               | `docs/SPIKE-DE-COSTOS.plantilla.md`                                                                                                                                                             | Copiada                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.34–1.39          | Constitución (`CLAUDE.md`)                                                                                                                                                                      | Stack v1.39; regla 10 (página guardada); regla 15 (demo-rojo); regla 18 (falla cerrado, excepciones de auditoría, bajadas forzadas); reglas 24 y 25 declaradas **no aplicables** por nombre; reglas 26 «Worktrees prohibidos» y 27 «La evidencia se escribe DESPUÉS del hecho»; PR en borrador con la línea del merge; sección «Para mergear» en la plantilla del summary. Cabecera con las dos frases centinela, cada una en una línea |
| 1.37               | Cambio al README de diseño                                                                                                                                                                      | **No se aplica**: la orden prohíbe tocar `docs/diseno/`                                                                                                                                                                                                                                                                                                                                                                                 |

Ajustes de la app que acompañan al delta:

- `.vercel/**` entra en los ignorados de ESLint.
- `.demo-rojo/` entra en `.gitignore`.
- `datos/privado/` pasa a `datos/privado/*` con `!datos/privado/README.md`.
- Los documentos que estampa el kit entran en `.prettierignore` (ver K-S1-3).

**Cobertura:**

- `test` pasa a `vitest run --coverage`.
- `src/engine/**` sube a 90 %; el 70 % global y el 80 % de `src/lib/**` se mantienen.
- `tests/unit/observability.test.ts` cubre `src/lib/observability.ts`, que era el único módulo sin prueba y habría
  dejado la CI en rojo.

### Demos en rojo de esta fase (`scripts/demo-rojo.sh`, restauradas con Python + `cmp`)

| Gate                                                                 | Mutación                                                                                                  | Rojo que dio                                                                                                                 | Verde tras restaurar          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Salida publicada = `out/` (kit v1.39)                                | `data-tocado-tras-el-build="1"` en `.vercel/output/static/diseno/index.html`                              | «diseno/index.html: distinta de la de out (24331 vs 24301 bytes)»                                                            | 50 páginas idénticas          |
| Hook de secretos que falla cerrado (kit v1.37)                       | Sin gitleaks ni jq, el hook sale 0 en vez de 2                                                            | «× sin gitleaks ni jq bloquea, y lo dice»                                                                                    | 3 de 3                        |
| `verificar-dependencias` (kit v1.39)                                 | Toda bajada se acepta en vez de quedar como degradación                                                   | «× rojo: una bajada que el rango declarado admite es pnpm degradando» y «× rojo: sin registro (la consulta falla)…»          | 6 de 6                        |
| Margen de Lighthouse (kit v1.37)                                     | El presupuesto pasa de `/*` a `/otra-ruta/*`                                                              | «✗ lighthouse-margen: la URL medida / no cae bajo ningún path de perf-budget.json»                                           | Verde                         |
| Umbral de cobertura                                                  | `describe.skip` sobre el test de `observability`                                                          | «ERROR: Coverage for lines (0%) does not meet "src/lib/**/*.ts" threshold (80%)» (y las otras tres métricas)                 | 3 de 3                        |
| `datos/privado/` no versionado (`tests/unit/datos-privados.test.ts`) | `git add -f datos/privado/sobre-de-demo.json` (mutación del índice, a mano: `demo-rojo.sh` muta archivos) | «expected [ 'datos/privado/README.md', …(1) ] to deeply equal [ 'datos/privado/README.md' ]», nombrando `sobre-de-demo.json` | 2 de 2 tras `git rm --cached` |

### Decisiones abiertas de la especificación, como datos con fuente

**DA-01 y DA-10:** 14 marcos en `datos/marcos/<id>.json`.

- **Cada marco lleva:**
  - versión y fecha;
  - fuente oficial con su código HTTP y fecha de consulta;
  - licencia con qué exige y cómo se cumple;
  - vías de acceso (página, repositorio, archivo legible por máquina, canal de novedades, interfaz) con su
    HTTP;
  - lista blanca de fuentes (E-14);
  - sus entradas cuando el marco las publica.
- **Cómo se consultó:**
  - Todo con `curl` y el user-agent por defecto, sin eludir nada.
  - Los archivos grandes se pidieron por rango de un byte, que responde 206.
  - Lo consultado quedó en el scratchpad, fuera del repo.
- **Hallazgos:**
  - **OWASP LLM Top 10:** la edición vigente es la **2026**, publicada el 2026-08-03 según su página de recurso;
    el anuncio del proyecto es del 2026-09-01.
    - La página de archivo `/llm-top-10/` todavía muestra la 2025, y el PDF de la 2026 es una **descarga
      condicionada**: redirige a una página de acceso restringido. No se eludió.
    - Las entradas 2026 y el mapa 2025 → 2026 se leyeron del repositorio oficial (`genai-security-project`:
      `GenAI-LLM-Top10/2026/final` y `crosswalk/MIGRATION.md`, CC BY-SA 4.0).
    - Ese mapa nombra dos entradas 2025 como en la edición 2023; los identificadores coinciden.
  - **ISO/IEC 42001:** iso.org responde **403** a un agente (`fuente_no_accesible_al_agente`).
  - **`por_verificar`:**
    - el día de la fecha del OWASP Top 10:2025 (la fuente solo da el año);
    - la fecha de CWE 4.20 (ninguna página consultada la dice);
    - la fuente de ISO/IEC 42001.
  - **NIST:** la licencia de su serie técnica se leyó en su página propia («not subject to Copyright
    protection within the United States»); la primera URL que escribí trataba de software y se corrigió antes
    de comitear.

**DA-03:** `datos/filtro/patrones.json`.

- Cuatro patrones de forma:
  - bloque de código con intérprete;
  - secuencia imperativa paso a paso;
  - cadena codificada larga (umbral por encima de una huella de 64);
  - dirección con parámetros de inyección.
- Cada uno lleva carnada inocua y contraejemplo, más contraejemplos generales que nombran técnicas, marcos y
  módulos.
- **Comprobado con el motor de expresiones de JavaScript:** cada patrón marca sus carnadas y ninguno marca un
  contraejemplo. El gate formal nace con el filtro, en la fase 1. gitleaks no ve secretos en `datos/`.

**Licencias:** `docs/LICENCIAS-DE-MARCOS.md` en es y en.

- Tabla marco · licencia · qué exige · cómo se cumple.
- Avisos de MITRE y de NIST citados textualmente desde sus páginas.

### Fricciones del kit (K#)

- **K-S1-1 — constitución de la planeadora incompleta y sin frase centinela.** `ordenes/CLAUDE-md-para-app.md`
  seguía en v1.33 más los deltas 1.38 y 1.39, y no declaraba frase centinela. Los textos de 1.34 a 1.37
  salieron del `CLAUDE.md` del kit. La app declara dos frases centinela en su cabecera.
- **K-S1-2 — `plan-sprint.md` del kit (v1.36.0) perdió contenido.** Al reescribir la (f) se borró el paso 10
  (`/audita-sprint` obligatoria) y «`gh pr checks` tras cada push». Se fusionó solo la (f) y se conservó lo
  demás.
- **K-S1-3 — el hook de prettier reformatea los documentos que estampa el kit.** Cambiaba cursivas y
  sangrías de `.claude/commands/*.md`, y en `plan-sprint.md` movió una línea bajo otro inciso. Se
  restauraron y `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `.claude/` y `docs/*.plantilla.*` entraron en
  `.prettierignore`.

### CI de la fase 0 (PR #8, commit `8e86733`)

- **Checks requeridos:** `quality` (2 min 30 s), `e2e` (10 min 30 s) y `lighthouse` (1 min 28 s), cada uno con
  conclusión propia `success`, y Vercel también.
- **Primeras corridas en CI** (sin histórico, no se afirma regresión ni no-regresión):
  - «✓ build-como-proveedor: 50 páginas publicadas idénticas a out»;
  - «✓ lighthouse-margen: ninguna mediana a menos del 10 % de su presupuesto; 1 URL con presupuesto».

**STOP de la fase 0 (parada 1 del ⭐):** tabla DA-01 y tabla de licencias presentadas al usuario el 2026-10-04.
**Veredicto del usuario, 2026-10-04: «Aprobados los marcos, continúa».** Se aprueba la tabla tal como se presentó,
con sus 14 marcos (el OWASP Top 10 web 2025 incluido) y con las tres filas `por_verificar` declaradas. La fase 1
arranca sobre estos datos.
