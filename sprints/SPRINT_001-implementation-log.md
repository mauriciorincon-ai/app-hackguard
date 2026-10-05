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

## Fase 1 — Esquemas, validador, filtro, huella y CLI (2026-10-04)

### Qué se construyó

- **Motor puro en `src/engine/`** (sin disco, sin reloj, sin azar; corre igual en Node y en navegador):
  - `fecha.ts`: fechas civiles y días entre fechas con aritmética entera, sin `Date`.
  - `huella.ts`: JCS (RFC 8785) + SHA-256 con `crypto.subtle`, escrito desde el RFC. Rechaza no finitos,
    surrogates solitarios, `undefined`, objetos no planos y ciclos.
  - `catalogo/esquemas.ts`: Zod 4 para marco, mapa de equivalencias, familias, reglas de veredicto, rasgos del
    perfil, capa de controles, herramienta, prueba y patrones del filtro. Los esquemas validan y nunca
    transforman: la huella se calcula sobre lo que está escrito.
  - `catalogo/reglas.ts`: 59 reglas con nombre, severidad (error · advertencia · nota) y texto `{es, en}`.
  - `catalogo/validar.ts`: el validador de carga. Un campo obligatorio ausente se reporta con su regla propia
    (`prueba/sin-marco`, `referencia/sin-version`…), no como «esquema». Calcula qué prueba entra a una
    instantánea y por qué espera la que no entra.
  - `catalogo/filtro.ts`: aplica los patrones a todo texto de una entrada, en los dos idiomas. Solo marca;
    el hallazgo nombra patrón y campo, nunca el fragmento. Al cargar, comprueba que cada patrón marca sus
    carnadas y ningún contraejemplo.
  - `catalogo/equivalencias.ts`: resuelve una referencia de una versión anterior a la vigente, salto a salto.
  - `catalogo/instantanea.ts`: la instantánea con huella y su gate de publicación. El semáforo entra en la fase 3.
  - `catalogo/informe.ts`: la salida en texto (`es` o `en`) y en JSON, con los códigos de salida.
- **CLI en `src/cli/`** con el TypeScript nativo de Node: `cargar.ts` lee `datos/` y `catalogo.ts` hace la E/S.
  - `pnpm catalogo:validar [--json] [--idioma es|en] [--agregar <prueba.json>]…`
  - `pnpm catalogo:instantanea --fecha AAAA-MM-DD [--json] [--idioma] [--salida <carpeta>] [--agregar …]`
  - Salidas: validar 0 ok · 1 con advertencias · 2 inválido · 3 uso o lectura; instantánea 0 emitida · 2
    bloqueada sin escribir · 3 uso o lectura. Sin `--fecha` la instantánea no corre: la fecha jamás sale del reloj.
- **Datos estructurales:** `datos/familias.json` (las 4 familias, cuáles son estocásticas, la madurez que
  admiten y las 30 categorías de § 10.1, § 10.2 y E-22), `datos/reglas-de-veredicto.json` (4 reglas, la
  asimétrica de E-2 con la cota 3/k), `datos/rasgos-de-perfil.json` (6 rasgos, incluido el tipo de acceso de
  E-16).
- **Semillas de C18** en `docs/kit-de-prueba/semillas/`: 19 pruebas (la de referencia y 18 con un solo defecto
  cada una) y su manifiesto `semillas.json` con lo que el validador debe responder a cada una.
- **ESLint:** sobre `src/engine/**` prohíbe `Math.random`, `Date`, `performance`, `process`, temporizadores,
  `fetch`, `Intl`, los métodos `toLocale*` y `localeCompare`, y los módulos de Node.
- **CI:** paso nuevo en `quality`, «Catálogo válido»: `pnpm catalogo:validar || [ $? -eq 1 ]`.
- **`tsconfig.json`:** `allowImportingTsExtensions`. `next build` y `build-como-proveedor` pasan con él
  (50 páginas publicadas idénticas a `out/`).

### Desviaciones del plan

- **Entraron en la fase 1 tres cosas que el plan ponía en la fase 2**, porque el validador las necesita para
  aceptar el catálogo real:
  - el mapa `datos/marcos/equivalencias/owasp-llm-2025-a-2026.json`: `owasp-llm-top10.json` ya lo cita desde la
    fase 0, y un mapa citado que no existe es un error (`marco/equivalencias-inexistentes`). Sus pares son los del
    mapa oficial (`crosswalk/MIGRATION.md`, HTTP 200 el 2026-10-04, idéntico al de la fase 0);
  - `datos/herramientas/garak.json`: las semillas recomiendan garak. Versión 0.17.0 verificada en PyPI (HTTP 200,
    publicada el 2026-09-09), Apache-2.0 según el `LICENSE` del repositorio (HTTP 200);
  - las familias, las reglas de veredicto y los rasgos, que el plan solo nombraba.
- **Un dato aprobado en la fase 0 cambió de esquema, no de contenido:** el validador rechazó la vía «interfaz»
  de `lista-decision-14.json` porque era `http://`. La misma dirección con `https://` responde 200 con el mismo
  artículo; quedó en https.
- **Herramientas y controles reales siguen siendo de la fase 2.** La prueba de referencia de las semillas no
  cita control, así que hoy sale «con advertencias» (`prueba/sin-control`); cuando existan los controles del
  Anexo A, la referencia citará uno y el manifiesto se actualiza.

### Bugs y resoluciones

- **La herramienta de edición convirtió escapes `\uXXXX` en caracteres** dentro de un archivo de prueba: la
  muestra del RFC 8785 dejó de ser la del RFC y el test falló. Las dos muestras viven ahora en
  `tests/unit/catalogo/rfc8785/*.json.txt`, escritas byte a byte con Python, y la prueba compara contra los bytes
  UTF-8 que el RFC publica en § 3.2.4. El regex de surrogates del motor se revisó: quedó intacto.
- **Node avisa en cada corrida del CLI** que el `package.json` no declara `"type"`. Se silencia solo ese aviso
  con `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` en los dos scripts; poner `"type": "module"` habría
  cambiado cómo se cargan las configuraciones de Next, Vitest y Playwright.
- **`z.int()` describe un texto como «se esperaba un número»** y un decimal como «se esperaba un entero». La
  prueba del detalle bilingüe cubre los dos.

### Pruebas (corrida final de la fase, después de las demos)

- `pnpm test`: **990 pruebas en 33 archivos, todas en verde** (720 de la fase 0 + 270 nuevas). `pnpm typecheck` y
  `pnpm lint` limpios; `pnpm build` y `build-como-proveedor` en verde.
- Las 270 nuevas, por archivo de `tests/unit/`:
  - `catalogo/huella.test.ts`: la muestra de § 3.2.2 contra los bytes de § 3.2.4, el orden de claves de § 3.2.3,
    los 24 números del Apéndice B, NaN e infinitos, surrogates solitarios, ciclos y objetos no planos;
    SHA-256 contra `node:crypto`.
  - `catalogo/validar.test.ts`: **un caso por cada una de las 59 reglas**, y una prueba que falla si una regla
    queda sin caso. Además: el catálogo real, el orden de los archivos, qué prueba entra a una instantánea, capas
    de controles y el detalle bilingüe de cada tipo de error de esquema.
  - `catalogo/{fecha,filtro,equivalencias,instantanea,informe,cli}.test.ts`. El CLI se prueba como proceso aparte
    con el TypeScript nativo de Node.
  - `instrumento/semillas-del-catalogo.test.ts`: C18 sobre las 19 semillas. Con la salida de la consola activa
    (`--silent=false`) imprime «C18 catálogo: bloquea 11 de 11 semillas inválidas sembradas».
- **Cobertura de `src/engine/`** (umbral 90 %): `validar.ts` 98,25 % de sentencias, 93,83 % de ramas, 96,96 % de
  funciones y 98,1 % de líneas; `equivalencias.ts` 95,83 % de ramas; `informe.ts` 96,15 % de ramas; los otros
  siete archivos al 100 % en las cuatro métricas.

### Demos en rojo de esta fase (`scripts/demo-rojo.sh`, restauradas con Python + `cmp`)

| Gate | Mutación | Rojo que dio | Verde tras restaurar |
|---|---|---|---|
| Lint de determinismo: azar | `+ Math.random()` en `huella.ts` | «'Math.random' is restricted… Sin azar en el núcleo» (`no-restricted-properties`) | lint limpio |
| Lint de determinismo: Node | `import { readFileSync } from "node:fs"` en `validar.ts` | «'node:fs' import is restricted…» (`no-restricted-imports`) | lint limpio |
| Validador sobre las semillas | La regla de k compara con `-1` en vez de `undefined` | «× SEMILLA-ESTOCASTICA-SIN-K.json (E-2)» y «× bloquea N de N sembradas» | 22 de 22 |
| E-15: referencia sin versión | Se quita la regla propia de `version_marco` ausente | «× SEMILLA-SIN-VERSION.json (E-15)»: sigue rechazada, pero ya no nombra su regla | 22 de 22 |
| Filtro: carnadas y contraejemplos | `{80,}` → `{800,}` en `cadena-codificada-larga` | «× cadena-codificada-larga marca su carnada» y «× compilan y se comprueban a sí mismos» | 27 de 27 |
| Huella JCS | Claves ordenadas con `localeCompare` | «× ordena las claves por unidades UTF-16 (§ 3.2.3)» | 47 de 47 |
| Gate de publicación | El gate compara con un estado que no existe | «× no emite nada si el catálogo es inválido» y «× con un catálogo inválido sale 2 y no escribe nada» | 24 de 24 (ver nota) |
| Datos bilingües | La comparación es = en nunca se cumple | «× texto/idioma-repetido: un texto largo igual en los dos idiomas» | 87 de 87 |
| Procedencia de marcos | Se quita la regla propia de `fuente_oficial.http` ausente | «× marco/sin-procedencia: sin código HTTP de la fuente» | 87 de 87 |
| ¿Puede fallar? Toda regla con caso | Una regla nueva en `reglas.ts` sin caso | «× ninguna regla queda sin un caso que la haga saltar» | 87 de 87 |
| CI: «Catálogo válido» | `cwe.json` sin `fecha_version` en `por_verificar` | «✗ datos/marcos/cwe.json · fecha_version» (`marco/nulo-sin-declarar`), salida 2 | salida 0 |
| Cobertura del motor ≥ 90 % | `describe.skip` sobre la tabla de reglas | «ERROR: Coverage for branches (86.63%) does not meet "src/engine/**/*.ts" threshold (90%)» | 990 de 990 |

Nota sobre la demo del gate de publicación: la primera corrida dio el rojo correcto y restauró, pero falló en el
último paso porque le pedí `--minimo-tests 25` y el verde corre 24. Se repitió con 24 y salió limpia.

### CI de la fase 1 (PR #8, commit `c5086d8`, corrida 37245076348)

- **Checks requeridos:** `quality` (2 min 38 s), `e2e` (10 min 25 s) y `lighthouse` (1 min 37 s), cada uno con
  conclusión propia `success`, y Vercel también.
- **Node v22.23.3 en la CI:** el CLI corre con el TypeScript nativo de Node 22 (las 14 pruebas de `cli.test.ts`
  lanzan el proceso aparte). Primera corrida del paso «Catálogo válido»: «Catálogo: ok · 14 marcos · 1 mapa de
  equivalencias · 0 controles · 1 herramienta · 0 pruebas · 0 errores · 0 advertencias · 4 notas». C18 en la CI:
  «bloquea 11 de 11 semillas inválidas sembradas».

**STOP de la fase 1:** demo del validador con las 19 semillas presentada al usuario el 2026-10-04 (11 inválidas
salen con código 2 y su regla; la de referencia, la sin control, la de versión anterior y las cinco marcadas por el
filtro salen con código 1, sin rechazo). **Veredicto del usuario, 2026-10-04: «continúa».** La fase 2
arranca sobre este validador.
