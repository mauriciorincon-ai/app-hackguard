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

## Fase 2 — Los datos del catálogo (2026-10-04)

### Fuentes verificadas en esta fase (con `curl`, sin eludir nada; caché en el scratchpad)

- **Anexo A de ISO/IEC 42001:** el esquema público de CISO Assistant (`iso42001-2023.yaml`, HTTP 200) confirma
  38 controles en 9 áreas, de A.2 a A.10. De ahí salieron **solo los identificadores**; nombre y resumen de cada
  control están escritos con palabras propias.
- **Cruce NIST AI RMF ↔ ISO/IEC 42001** (PDF de NIST, HTTP 200): 201 pares control → subcategoría, uno o más para
  cada uno de los 38 controles. El cruce se hizo contra el borrador final (FDIS) y cita el Anexo B, la guía de cada
  control, con la misma numeración que el Anexo A. Por eso toda equivalencia queda «parcial», con esa nota.
- **Herramientas, en su registro:**

  | Herramienta | Versión | Fecha |
  |---|---|---|
  | PyRIT | 1.1.0 | 2026-09-04 |
  | Inspect | 0.3.276 | 2026-10-02 |
  | Giskard | 3.0.1 | 2026-10-02 |
  | promptfoo | 0.123.1 | 2026-09-18 |
  | ZAP | 2.17.0 | 2025-12-15 |
  | Nuclei | 3.11.1 | 2026-08-08 |
  | scikit-learn | 1.9.1 | 2026-09-10 |
  | MAPIE | 1.5.0 | 2026-08-05 |
  | Evidently | 0.7.23 | 2026-09-11 |
  | CheckList | 0.0.11 | 2021 |
  | TextAttack | 0.3.11 | 2026-08-14 |

  Los repositorios y las licencias respondieron 200. La de scikit-learn está en `COPYING`.
- **Cambios de editor, con fuente:**
  - ZAP: de OWASP pasó al Software Security Project el 2023-08-01, y a Checkmarx el 2024-09-24 (blog oficial, 200).
  - promptfoo: pasó a OpenAI el 2026-03-09 (blog, 200).
  - PyRIT: archivó `Azure/PyRIT` y sigue en `microsoft/PyRIT`.
- **Selectores, uno por uno:**
  - garak 0.17.0: 8 sondas y 10 módulos de detectores leídos en la etiqueta `v0.17.0`, con sus clases.
  - ZAP: 12 alertas en `zaproxy.org/docs/alerts/<id>/`.
  - promptfoo: 14 complementos en sus páginas. `pii:session` y `agentic:memory-poisoning` se confirmaron dentro del
    HTML, porque las etiquetas partían el id.
  - Inspect: `inspect_evals/agentdojo` y `agentharm`.
  - Nuclei: `http/exposures/configs`.
  - Las funciones de scikit-learn, más las clases `DataDriftPreset` (Evidently), `INV` y `DIR` (CheckList) y
    `EmbeddingAugmenter` (TextAttack), en sus archivos.
- **Referencias adicionales:**
  - 16 páginas de CWE 4.20.
  - Los identificadores de MITRE ATLAS, leídos en `ATLAS-2026.09.yaml` (208 técnicas).
- **Hallazgos que quedan como dato:**
  - El proveedor TypeSafe de promptfoo se fusionó el 2026-10-02, pero ninguna versión publicada lo trae. Por eso
    ninguna prueba de `modelo_decision` lo recomienda todavía.
  - `inspect-typesafe` existe en GitHub (MIT) pero no en PyPI (404).
  - CheckList no recibe cambios desde 2024.
  - El repositorio de HackGuard no declara licencia: la herramienta propia dice `NOASSERTION` y lo anota como
    decisión pendiente del dueño.

### Qué se escribió

- **`datos/controles/iso42001-anexo-a.json`:** capa `por_defecto`.
  - 9 áreas con los nombres propios que se aprobaron en la maqueta.
  - 38 controles con nombre y resumen `{es, en}` propios, todos con `verificado_contra_norma: false`.
  - 201 equivalencias con NIST AI RMF 1.0.
- **`datos/herramientas/`:** 12 herramientas nuevas, 13 en total.
  - Las de la especificación: ZAP con adaptador, más PyRIT, promptfoo, Inspect, Giskard y Nuclei.
  - Las de E-25: scikit-learn, MAPIE, Evidently, CheckList y TextAttack.
  - `hackguard-revision`, herramienta propia para las pruebas que decide una persona revisando diseño o código.
- **`datos/pruebas/<familia>/`:** 38 pruebas, todas `aprobada` y `limpia`:
  - software: 10;
  - agente: 9;
  - modelo generativo: 7;
  - modelo de decisión: 12, con las cuatro nuevas de E-22 y «válido pero equivocado» partido en tres.

  Cada una dice qué se verifica, por qué importa, con qué herramienta y selector verificados y qué se espera. Lleva
  además marco con versión y entrada, referencias adicionales (CWE, ATLAS), regla de veredicto con k cuando mide
  sobre un activo estocástico, aplicabilidad por rasgos, prioridad, madurez (E-23) y fuentes con su HTTP.
- **Vocabulario:**
  - 2 categorías nuevas que pedían las pruebas de la maqueta: «Registro de las acciones» en agente y «Manejo de la
    salida» en modelo generativo.
  - 19 rasgos de perfil nuevos, 25 en total.
- **Semillas:** la de referencia ahora cita el control A.6.2.4 y sale «ok». El manifiesto se actualizó y las 19
  siguen respondiendo lo esperado.

### Desviaciones del plan

- **El filtro recorre ahora todo el catálogo dentro del validador:** marcos, mapas, controles, herramientas y
  vocabulario, además de las pruebas. Fuera de las pruebas no hay estado de aprobación, así que una marca es una
  advertencia.
  - Corrida a mano antes de cambiar el validador: 70 archivos, 4.695 textos, 0 marcas.
  - Con el validador: 0 marcas.
- **Las 10 pruebas de software nacen sin control** (`control_pendiente`): la capa por defecto es el Anexo A de
  ISO/IEC 42001, que gobierna sistemas de IA. Esperan una capa propia de controles de software (D12).
- **Cambios frente a la maqueta:**
  - `PR-IA-FUGA-001` cita LLM08 de 2026 en vez de LLM07 de 2025.
  - `PR-IA-DATO-001`, que la maqueta mostraba marcada, no la marca el filtro con el texto real.
  - Las referencias numéricas de la maqueta a la lista de 14 ítems (`3`, `7`…) pasan a sus identificadores reales
    (`C1`, `C3`…).
- **Las pruebas del motor parten ahora de `catalogoBase()`:** el catálogo real sin sus pruebas, para que sumar una
  prueba real no cambie lo que miden. Las cifras del catálogo real tienen su propio archivo,
  `tests/unit/catalogo/catalogo-real.test.ts`.

### Inventario (salida del validador sobre `datos/`)

«Catálogo: con advertencias»:
- 14 marcos, 1 mapa, 38 controles, 13 herramientas y 38 pruebas: 38 publicables, 0 pendientes;
- 0 errores, 10 advertencias (todas `prueba/sin-control`, de software) y 4 notas `por_verificar`.

| Familia | Pruebas | Madurez | Categorías cubiertas |
|---|---|---|---|
| Software | 10 | 10 estándar | 7 de 7 |
| Agente | 9 | 8 estándar · 1 propia | 8 de 8 |
| Modelo generativo | 7 | 7 estándar | 7 de 7 |
| Modelo de decisión | 12 | 9 emergente · 3 propia | 10 de 10 |

- **Marcadas por el filtro:** ninguna.
- **Sin control:** las 10 de software.
- **Controles del Anexo A con pruebas:** A.6.2.4 (12), A.9.2 (5), A.6.2.6 (5), A.9.4 (2), A.6.2.8, A.7.4, A.7.5 y
  A.6.2.2 (1 cada uno).
- **Herramientas registradas sin prueba que las recomiende:** Giskard, MAPIE y PyRIT. Quedan en el catálogo como
  recomendables, como pide § 10.4.

### Pruebas (corrida final de la fase, después de las demos)

- `pnpm test`: **1.028 pruebas en 34 archivos, todas en verde**. `pnpm typecheck` y `pnpm lint` limpios.
- **Archivo nuevo, `catalogo/catalogo-real.test.ts`, con 37 pruebas:**
  - una por cada una de las 32 categorías;
  - cinco invariantes: sin errores, con solo las advertencias esperadas; cada prueba en la carpeta de su familia;
    ningún control verificado contra la norma; toda herramienta pública con su registro en 200; k ≥ 5 en las
    pruebas estocásticas que miden sobre el activo.
- **Cobertura de `src/engine/`:**
  - `validar.ts`: 98,56 % de sentencias, 94,25 % de ramas, 98,5 % de funciones y 98,44 % de líneas.
  - `equivalencias.ts`: 95,83 % de ramas. `informe.ts`: 96,15 % de ramas.
  - Los demás archivos, al 100 %.

### Demos en rojo de esta fase (`scripts/demo-rojo.sh`)

| Gate | Mutación | Rojo que dio | Verde tras restaurar |
|---|---|---|---|
| Toda categoría tiene prueba | `PR-SW-LOG-001` pasa a `control_de_acceso` | «× software · registro_y_monitoreo tiene al menos una prueba» | 37 de 37 |
| Ningún control verificado contra la norma | El primer control dice `true` | «× ningún control del Anexo A dice estar verificado contra la norma (G-Plan P1)» | 37 de 37 |
| Cada prueba en la carpeta de su familia | `PR-SW-LOG-001` dice `agente` | «× cada prueba vive en datos/pruebas/<su familia>/» (también nombró el error y la categoría vacía) | 37 de 37 |
| Registro de herramienta en 200 | El registro de garak dice 404 | «× toda herramienta pública tiene su registro consultado con 200» | 37 de 37 |
| k en pruebas estocásticas | `PR-AG-PERM-001` con k = 3 | «× toda prueba de una familia estocástica que mide sobre el activo declara k» | 37 de 37 |
| El filtro recorre todo el catálogo | El bucle recorre una lista vacía | «× el filtro recorre también herramientas, marcos y controles, y marca con advertencia» | 88 de 88 |

Nota: la primera corrida de las cinco demos de datos dio el rojo correcto y restauró, pero falló en el último paso
porque pedí `--minimo-tests 40` y el verde corre 37. Se repitieron con 37 y salieron limpias.

### CI de la fase 2 (PR #8, commit `215d195`, corrida 37249090787)

- **Checks requeridos:** `quality` (2 min 15 s), `e2e` (8 min 42 s) y `lighthouse` (1 min 31 s), cada uno con
  conclusión propia `success`, y Vercel también.
- **Paso «Catálogo válido» en Node v22.23.3:** «Catálogo: con advertencias · 14 marcos · 1 mapa de equivalencias
  · 38 controles · 13 herramientas · 38 pruebas (38 publicables, 0 pendientes de revisión) · 0 errores ·
  10 advertencias · 4 notas». El paso aceptó la salida 1. C18 en la CI: «bloquea 11 de 11 semillas inválidas
  sembradas».
- **Instantánea con el catálogo completo, en local:** misma huella en tres corridas (`cca0e8a58446…` con
  `--fecha 2026-10-15`), entre 0,33 y 0,37 s cada una. No se comitea: la primera instantánea oficial sale en la
  fase 3, con el semáforo.

**STOP de la fase 2 (parada 2 del ⭐; la parada 3 no corre por el G-Plan P1):** inventario, marcadas (ninguna) y
pruebas sin control (las 10 de software) presentados al usuario el 2026-10-04. **Veredicto del usuario, 2026-10-04: «Contunua»** (sic). Con cero pruebas marcadas no había nada que decidir prueba por prueba; las 38 nacen `aprobada` / `limpia` como se presentaron. No es una mirada: la fase no produjo ningún artefacto visual.

## Fase 3 — Semáforo, instantáneas y la familia `modelo_decision`

Arranca el 2026-10-04 tras el «continúa» de la fase 2.

### Bloque A — semáforo de vigencia, vocabulario de estados e instantánea con semáforo

**Qué se construyó:**

- `datos/umbrales.json`: por revisar desde 30 días y vencido desde 60, con su origen (RF-01.5 y la maqueta).
- `datos/estados.json`: el vocabulario completo de la maqueta aprobada, 9 vocabularios y 33 estados, cada uno con
  papel de color, símbolo y nombre `{es, en}`. Se generó desde `scripts/maqueta/nucleo/estados.mjs` (solo
  lectura) y una prueba exige que los dos sigan iguales estado por estado.
- `src/engine/catalogo/semaforo.ts`: días y estado de cada prueba publicada, marco y herramienta; la familia
  toma el estado de su prueba más atrasada y lleva el desglose de todas. Una familia sin pruebas publicadas
  queda con estado `null`.
- `src/engine/fecha.ts`: `fechaMasDias`, el inverso del algoritmo civil (Hinnant), para la matriz.
- Validador: lee los dos archivos nuevos y suma dos reglas, `umbrales/orden-invalido` y `estados/sin-etiqueta`
  (61 reglas). La segunda exige que cada estado que el motor calcula tenga nombre y símbolo. El filtro recorre
  también estos dos archivos.
- Instantánea: el catálogo suma `umbrales` y `estados`, y la instantánea suma `semaforo`, que entra en la huella.
  El formato sigue en `hackguard/instantanea@1` porque todavía no había ninguna versionada.
- Informe de `instantanea`: una sección de vigencia con marca, nombre y cifra por estado; los ceros no se
  dibujan. La salida `--json` suma el desglose.

**Decisiones:**

- **El semáforo cubre pruebas publicadas, marcos, herramientas y familias** (RF-01.5 y E-26). No cubre
  controles ni mapas de equivalencias: ningún requisito lo pide.
- **Una fecha de evaluación anterior a la última verificación del catálogo se rechaza.** El motor lanza
  `RangeError`, que el CLI trata como error de uso (código 3) con un mensaje en los dos idiomas. Una instantánea
  no puede decir que algo estaba vigente antes de que alguien lo verificara.
- **Las instantáneas versionadas son registros históricos.** Su prueba exige autoconsistencia (huella =
  contenido, nombre = fecha + huella, bytes = los del CLI), no que coincidan con el catálogo de hoy.

**Primera instantánea oficial:** `datos/instantaneas/2026-10-04-12d3b632a871.json` (502.746 bytes), emitida con
`pnpm catalogo:instantanea --fecha 2026-10-04`. Las tres corridas dieron la misma huella
(`12d3b632a871cc7ceb06970036976e25542b7eab6bc58ebc63dc4db5f6495ce4`). Cada una tardó entre 0,28 y 0,30 s
medidos con `time -p`, incluido el arranque de pnpm. En esa fecha todo está vigente: el catálogo entero se
verificó el 2026-10-04.

**El semáforo sobre datos reales, en sus tres estados** (corridas a una carpeta temporal):

| Fecha | Pruebas | Marcos | Herramientas | Familias | Huella |
|---|---|---|---|---|---|
| 2026-10-04 | ✓ Vigente 38 | ✓ Vigente 14 | ✓ Vigente 13 | ✓ Vigente 4 | `12d3b632a871…` |
| 2026-11-03 | ! Por revisar 38 | ! Por revisar 14 | ! Por revisar 13 | ! Por revisar 4 | `0b24f1abde9c…` |
| 2026-12-03 | ✗ Vencido 38 | ✗ Vencido 14 | ✗ Vencido 13 | ✗ Vencido 4 | `39f851ad3f55…` |
| 2026-09-30 | — | — | — | — | rechazada: anterior a la última verificación |

**Matriz de envejecimiento** (`tests/unit/catalogo/envejecimiento.test.ts`, regla 23): construye la instantánea
del catálogo real en 6 fechas. Son el día de la última verificación, la víspera y el día de cada umbral, y +100
días. En cada fecha exige la instantánea emitida, días enteros no negativos, el estado esperado de cada entidad
(calculado comparando fechas, no días), la familia como su prueba más atrasada y la etiqueta de cada estado. 27
pruebas. Los estados mezclados se prueban aparte, con casos armados a mano en `semaforo.test.ts`: el catálogo
real tiene una sola fecha de verificación y no los tendría.

**Pruebas:** 1.083 en 37 archivos, en verde con cobertura. El motor del catálogo queda en 99,12 % de sentencias y
94,48 % de ramas. `semaforo.ts`, `instantanea.ts` y `fecha.ts` están al 100 %, y por eso la tabla no los lista.

**Demos en rojo de este bloque (`scripts/demo-rojo.sh`):**

| Gate | Mutación | Rojo que dio | Verde tras restaurar |
|---|---|---|---|
| Matriz de envejecimiento | `dias >= umbrales.vencido` pasa a `>` (el umbral se corre un día) | «× 2026-12-03: cada entidad está en el estado que le toca» y «× el semáforo y la huella cambian el día de cada umbral» | 27 de 27 |
| Vocabulario = maqueta | «Por revisar» pasa a «Pendiente» en `datos/estados.json` | «× el vocabulario de estados es el de la maqueta aprobada en G-Diseño» | 39 de 39 |
| Umbrales de RF-01.5 | `"vencido": 60` pasa a 61 | «× los umbrales de vigencia son los de RF-01.5» | 39 de 39 |
| Regla `estados/sin-etiqueta` | La condición nunca se cumple | «× estados/sin-etiqueta: el vocabulario de vigencia sin «vencido»» | 90 de 90 |
| Fecha anterior a la verificación | La comparación con la última verificación nunca se cumple | «× rechaza una fecha anterior a la última verificación del catálogo» | 12 de 12 |
| Instantánea versionada autoconsistente | La fecha de la instantánea versionada pasa a 2026-10-05 | «× 2026-10-04-12d3b632a871.json: su huella es la de su contenido…» (huella `95265a1c60ce…` en vez de `12d3b632a871…`) | 2 de 2 |

Nota: la primera corrida de la demo de `estados/sin-etiqueta` dio el rojo correcto y restauró, pero falló en el
último paso porque pedí `--minimo-tests 100` y el archivo corre 90. Se repitió con 90 y salió limpia.

**CI del bloque A (PR #8, commit `97b712a`, corrida 37251673371):** `quality` (2 min 32 s), `e2e` (7 min 15 s) y
`lighthouse` (1 min 27 s), cada uno con conclusión propia `success`, y Vercel también.

### Bloque B — clasificador demo, métricas y conjunto de referencia

**Qué se construyó:**

- `src/engine/demo/clasificador.ts`: el activo demo de `modelo_decision`. Imita el contrato de respuesta de Jev
  (`{model, answers, usage}`, Choice con `choice`, `probabilities` y `confidence = (p_max − 1/n)/(1 − 1/n)`, y
  Noul con `noul`) sobre un dominio neutro: el triaje de solicitudes de socios de una biblioteca municipal.
- `src/engine/modelo-decision/metricas.ts`: funciones puras sobre probabilidades. Exactitud, Brier multiclase,
  ECE con bins de igual masa, error en la banda del umbral, tasa de cambio por re-ejecución y paridad ES/EN.
- `src/engine/demo/conjunto.ts`: el esquema del conjunto de referencia, su evaluación (cada caso en los dos
  idiomas, k corridas con la semilla del conjunto) y el informe en español o en inglés.
- `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`: 26 casos sintéticos con estado tipado y una
  nota redactada en cada idioma, etiquetados según una política escrita de 5 reglas (decisión y urgencia). Lleva
  su advertencia: el conjunto y el clasificador los escribió la misma mano.
- `pnpm clasificador:demo [--json] [--idioma es|en] [--conjunto <archivo>]`: sale 0, o 3 ante un error de uso,
  de lectura o un conjunto inválido.

**Decisiones:**

- **`answers` va indexado por el id de la pregunta.** El fabricante no documenta la anidación; es nuestra y el ADR
  de la familia lo dirá. `usage` va en cero porque el demo no consume tokens.
- **Probabilidades exactas.** Salen de pesos enteros por regla y se reparten en diezmilésimos por resto mayor, con
  empates rotos por id: suman exactamente 1 y dan los mismos bytes en cualquier motor.
- **Ruido sembrado.** Cada peso se perturba con mulberry32, sembrado con la semilla XOR FNV-1a del estado canónico.
  Los sorteos van en un orden fijo, así que ni el orden ni el subconjunto de opciones que pide la pregunta
  cambian la respuesta.
- **Tres imperfecciones sembradas a propósito y fijadas por pruebas:**
  1. el léxico cubre el inglés y solo parte del español;
  2. no entiende la negación;
  3. premia la antigüedad del socio, que la política no menciona.
- **Convenciones de las métricas:**
  - Una salida inválida cuenta como error y aporta 2 a Brier (E-17).
  - El ECE es de la etiqueta elegida, con 4 bins de igual masa.
  - La banda es la de «aprobar sin pasar por una persona si p ≥ 0,70», medida entre 0,60 y 0,80.
  - La re-ejecución cuenta los ítems que cambian de elección en al menos una de las k corridas.
- **NLL queda fuera.** E-17 la nombra junto a Brier, pero `Math.log` no tiene garantía de dar el mismo último bit
  en todos los motores. Brier basta para el S1.
- **`ruido_por_mil: 150` se fijó midiendo.** El objetivo era la cifra más cercana al ~1,5 % que cambia Jev entre
  llamadas idénticas. En 52 respuestas cada cambio vale 1,9 %. Barrido con 5 corridas:

  | Ruido por mil | Cambios de decisión | Exactitud ES / EN |
  |---|---|---|
  | 60 a 120 | 0 de 52 | 21 / 25 |
  | 150 | 1 de 52 | 20 / 25 |
  | 200 | 4 de 52 | 20 / 24 |

**La demo, `pnpm clasificador:demo`** (huella de las respuestas
`7d94f4a1c73e8004c80108caed40a67cc4a92f2406c74e18a0e6d3168e05c83d`, la misma en tres evaluaciones):

| Medida | Español | Inglés |
|---|---|---|
| Exactitud de la decisión | 20 de 26 | 25 de 26 |
| Brier | 0,3742 | 0,2267 |
| ECE (4 bins de igual masa) | 0,0855 | 0,2914 |
| Error en la banda 0,60–0,80 | 1 de 7 | 1 de 9 |
| Exactitud de la urgencia (Noul) | 23 de 26 | 25 de 26 |

- **Paridad:** el inglés acierta 19,2 puntos más, y los dos idiomas eligen lo mismo en 19 de 26 casos.
- **Re-ejecución:** en 5 corridas cambia la decisión en 1 de 52 respuestas (1,92 %), y ninguna distribución sale
  idéntica.

**Dónde falla, que es lo que tiene que pasar:**

- El español falla en BIB-007, 008, 013, 019 y 023, cuyas notas usan palabras fuera de su léxico, y en BIB-018,
  un casi empate que el ruido de la primera corrida voltea.
- El inglés falla solo en BIB-025, la negación («I wasn't ill»).

**Lectura de la calibración:** el inglés acierta casi todo con probabilidades de 0,54 a 0,79 de media por bin. Es
un modelo subconfiado, y por eso su ECE es mayor que el del español, que acierta menos pero en proporción a lo
que dice. Exactitud y calibración miden cosas distintas: por eso E-17 pide medir las probabilidades.

**Pruebas:** 1.148 en 40 archivos, en verde con cobertura. `src/engine/demo/` queda en 99,47 % de sentencias y
96,42 % de ramas; `src/engine/modelo-decision/` en 100 % y 93,54 %. Lint limpio.

**Demos en rojo de este bloque (`scripts/demo-rojo.sh`):**

| Gate | Mutación | Rojo que dio | Verde tras restaurar |
|---|---|---|---|
| Distribuciones que suman 1 | El resto mayor se detiene con un diezmilésimo por repartir | «× en cada caso del conjunto, en los dos idiomas…» y «× el resto mayor reparte los diezmilésimos que faltan» | 27 de 27 |
| Misma entrada, misma salida | La semilla arrastra un contador global entre llamadas | «× la misma petición con la misma semilla da la misma respuesta y la misma huella» y «× el orden de las opciones no cambia nada» | 27 de 27 |
| Brier calculado a mano | `(p − y)²` pasa a `\|p − y\|` | «× es la media de Σ (p − y)² sobre todas las opciones» (y otras dos) | 19 de 19 |
| Lint de determinismo en `src/engine/demo/` (heredado, primera vez en esta carpeta) | `Math.random()` en un peso | «'Math.random' is restricted… Sin azar en el núcleo» | eslint limpio |

Nota: la primera corrida de las tres primeras demos dio el rojo correcto y restauró, pero falló en el último
paso porque pedí `--minimo-tests` 30 y 20 sin contar; los archivos corren 27 y 19. Se repitieron con la cuenta
medida y salieron limpias. Es la tercera fase con el mismo tropiezo: desde ahora cuento las pruebas del archivo
antes de fijar el mínimo.

### CI de la fase 3 (PR #8, commit `195f6bf`, corrida 37252435488)

- **Checks requeridos:** `quality` (2 min 37 s), `e2e` (10 min 16 s) y `lighthouse` (1 min 28 s), cada uno con
  conclusión propia `success`, y Vercel también.
- **Dentro de `quality`:** 40 archivos de pruebas en verde, C18 «bloquea 11 de 11 semillas inválidas sembradas» y
  el paso «Catálogo válido» con «Catálogo: con advertencias». En local, la misma validación sale con 1 (0 errores,
  10 advertencias, 4 notas) sobre 61 reglas.

**STOP de la fase 3:** semáforo en sus tres estados sobre datos reales, primera instantánea oficial y demo del
clasificador presentados al usuario el 2026-10-04. El usuario preguntó «Que quieres de mi? se claro»; se le
respondió que solo hacía falta su «continúa» o un cambio a alguna de las cuatro decisiones. **Veredicto del
usuario, 2026-10-04: «continúa»**, sin cambios a las decisiones.

## Fase 4 — Validación del instrumento, determinismo multi-navegador y cierre

Arranca el 2026-10-04 tras el «continúa» de la fase 3.

### C18: ya cubierto desde la fase 1

- Las semillas RF-10.1 + E-15 de `docs/kit-de-prueba/semillas/` y su prueba en `tests/unit/instrumento/` existen
  desde la fase 1.
- Siguen dando «C18 catálogo: bloquea 11 de 11 semillas inválidas sembradas», en la corrida local y en la CI de la
  fase 3.
- Las demos en rojo del validador sobre las semillas, del filtro y del gate de publicación están en la tabla de la
  fase 1. No se repiten aquí.

### Determinismo en Node, Chromium, Firefox y WebKit

**Qué se construyó:**

- `tests/e2e/determinismo.spec.ts`:
  - **Node es la referencia.** El CLI corre tres veces como proceso aparte y las tres huellas tienen que
    coincidir. Además da la huella del umbral y la del clasificador.
  - **El navegador recibe el motor empaquetado.** esbuild empaqueta `construirInstantanea` y `evaluarConjunto`
    como IIFE, y la página se sirve con `page.route` sobre `https://hackguard.invalid`: un contexto seguro, sin red
    y sin la aplicación.
  - **Tres pruebas por navegador:** la instantánea del 2026-10-15, la del 2026-11-03 (que tiene que cambiar) y el
    clasificador.
- **Playwright:** proyectos `firefox` y `webkit` que corren solo ese spec. Chromium lo corre en `desktop-chromium`;
  `mobile-chromium` lo ignora.
- **CI:** el job `e2e` instala `chromium firefox webkit`.
- **Dependencia:** `esbuild` 0.28.2 exacto, como devDependency.
  - La instalación dio «+5 −3». Los −3 son `vite` y `vitest` re-resueltos con `esbuild` como peer opcional, en las
    mismas versiones.
  - `verificar-dependencias`: «680 paquetes, ninguno por debajo de origin/main».

**Corrida local** (`E2E_PUERTO=3217`): 9 de 9 en verde.

| Motor | Instantánea 2026-10-15 | Instantánea 2026-11-03 | Clasificador |
|---|---|---|---|
| Node (CLI ×3) | `e2858e62cd9e…` | `0b24f1abde9c…` | `7d94f4a1c73e…` |
| Chromium 153.0.8010.12 | `e2858e62cd9e…` | `0b24f1abde9c…` | `7d94f4a1c73e…` |
| Firefox 155.0 | `e2858e62cd9e…` | `0b24f1abde9c…` | `7d94f4a1c73e…` |
| WebKit 26.6 | `e2858e62cd9e…` | `0b24f1abde9c…` | `7d94f4a1c73e…` |

Huellas completas:

- 2026-10-15: `e2858e62cd9e72af0baf1bf7b54c01f3c1cfc580b6f6afa21a19d700dabcd862`.
- 2026-11-03: `0b24f1abde9c3dcc912a28c69ed5907243037826a046c138f86e31be3182fcc2`.
- Clasificador: `7d94f4a1c73e8004c80108caed40a67cc4a92f2406c74e18a0e6d3168e05c83d`.

**Demo en rojo (estándar v2.19.0: una divergencia en un solo motor):**

- **Mutación:** `instantanea.ts` cambia el `formato` solo cuando el agente de usuario dice Firefox.
- **Rojo:** «✘ [firefox] › tests/e2e/determinismo.spec.ts:124:7 › … la instantánea del 2026-10-15», «1 failed · 6
  passed». Chromium y WebKit siguieron en verde. Las otras dos pruebas de Firefox no corrieron porque el spec es
  serial.
- **Verde tras restaurar:** 9 de 9.
