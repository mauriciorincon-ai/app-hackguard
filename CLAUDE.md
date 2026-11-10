# HackGuard — constitución de la app (núcleo, kit v2.4.0)

> Auto-cargado en cada sesión de este repo. Esta app pertenece al pipeline **AI-APPs**; su plan vive en la casa planeadora.
> **Partida por carpeta en el S12:** aquí queda lo que rige siempre; el resto vive en `.claude/rules/<área>.md` con `paths:` y carga solo al tocar esa carpeta (`determinismo-y-motor` · `catalogo-y-conocimiento` · `adaptadores-y-evidencia` · `diseno-y-a11y` · `hito-docs-y-cierre` · `pruebas-ci-y-proceso` · `arquitectura`). Cada regla numerada vive en UN solo archivo (`tests/unit/reglas-por-carpeta.test.ts`). El detalle de las reglas del kit: `docs/REGLAS-ANEXO.md` (se lee solo cuando una regla se cita).

## Identidad y las dos casas (regla dura)

- **Planeadora** (`~/Code/hr01-develop-ai-apps/`, privada): brief, visión, el archivo del sprint (inicio ejecutivo + plan + prompt), método y estándares. La **lees** (`additionalDirectories` o path absoluto); **nunca escribes ahí**.
- **Esta app** (`~/Code/app-hackguard`, pública): código, tests, ADRs, `sprints/SPRINT_NNN-cierre.md`. Escritor único: **tú**. El avance vive solo aquí; la planeadora te lee, tú no le reportas a mano. Si el plan necesita cambio, lo declaras en el cierre ejecutivo («desviaciones») y avisas al usuario.
- **Qué es:** planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA: catálogo vivo de pruebas trazadas a marcos y a ISO/IEC 42001, plan desde el perfil del activo con alcance autorizado, resultados de herramientas externas como evidencia que una persona confirma, brecha control por control. **No ataca por su cuenta:** el ejecutor opcional (un CLI aparte, apagado por defecto; la web no ejecuta nada) corre *tus* herramientas, en tu equipo, dentro de lo que autorizaste. Tesis: *un hallazgo no es una vulnerabilidad; es evidencia de que un control falla.* Fuentes de verdad (planeadora, RO): `portafolio/hackguard/brief.md` (manda) · `VISION.md` · `investigacion/2026-10-02-especificacion-features.md` (E-1…E-29).
- **Stack:** Next.js 16 **exportado estático** + TypeScript strict · **sin backend, sin base de datos, sin auth, sin IA en tiempo de ejecución** · datos como JSON versionados con huella (JCS + SHA-256) · Node ≥ 22.18 (el CLI corre TypeScript nativo). Stack y estructura en detalle: `.claude/rules/arquitectura.md`.
  captura_terceros: false
- **Hito vigente: H-2 «Producto completo»** (ola H-2 desde el 2026-11-08), con el ensayo general como sprint propio al final. Matriz de hitos: `.claude/rules/hito-docs-y-cierre.md`.

## Reglas duras de HackGuard que rigen siempre (las 12 están repartidas por carpeta; aquí 4)

4. **El crudo de una herramienta nunca entra al almacén:** huella + extracto redactado por esquema; todo adjunto se muestra como texto inerte (escapado) en ambos modos.
5. **Autorización antes que plan.** Sin alcance autorizado y reglas de enfrentamiento no hay plan; dueño del activo y proveedor separados; la política del proveedor se cita; nada se planea contra infraestructura de terceros (E-24).
8. **La evidencia real no viaja al repo público:** alcances, reglas de enfrentamiento, sobres y hallazgos de activos reales viven en `datos/privado/` (ignorado; respaldo en un repo privado solo de datos). Público: código, catálogo, controles y activos demo sintéticos.
12. **El color nunca solo:** semáforo de vigencia, veredictos y estados = símbolo (trazo SVG, nunca un carácter) + texto + color, desde el vocabulario de `datos/estados.json`; ningún componente lleva un color de estado escrito.

## Workflow del sprint (5 pasos)

1. **Plan.** El usuario trae el archivo del sprint (`portafolio/hackguard/sprints/SPRINT_NNN.md`). En **plan mode** corres `/plan-sprint`: estado real del código, riesgos, plan en ≤ 3 fases con criterio observable y horas por fase, modelo recomendado. **La aprobación del plan NO arranca nada:** esperas el **«construye»** explícito. Branch `sprint-NNN/<tema>`.
2. **Construcción.** ≤ 3 fases; commits convencionales con `[F1]` / `[F2]` / `[F3]` en el subject (de ahí salen las horas por fase). **Un solo STOP al final de la construcción** con el resumen de las fases, **más como máximo 1 mirada de DECISIÓN** si el sprint cambia una decisión del usuario, la promesa o su máquina (las paradas de contenido donde el usuario aprueba datos son producto y no cuentan). Sin STOP por fase; FORMA y TEXTO se maquetan «no vistas» (registro de una línea) y van al gate humano del hito.
3. **Auditoría de una pasada + checklist manual.** `/audita-sprint` (un auditor independiente en solo lectura, 4 casillas; **todo hallazgo, de cualquier severidad, código y docs, se paga antes del STOP; lo imposible queda solo con la decisión del dueño escrita en el cierre**; kit v2.4.0). Luego `/deploy-check`: ≤ 10 casillas manuales — **la CI es el gate; si no está en la CI, no es casilla.**
4. **Cierre ejecutivo.** `sprints/SPRINT_NNN-cierre.md` ≤ 40 líneas con la salida de `node scripts/horas-sprint.mjs` pegada; sus campos: `.claude/rules/hito-docs-y-cierre.md`.
5. **PR normal** (no en borrador) con el cierre dentro; checks requeridos (`quality` · `e2e` · `lighthouse` · `un-pr-vivo`) con conclusión propia `success` leídos **al final**, no tras cada push. **Antes de abrirlo, `gh pr list --state open` (regla 18).** Al pedir el merge entregas la lista de PRs abiertos, que debe ser ese uno. **El merge squash lo hace el usuario** y borra la rama; después corre `/cierre-sprint hackguard` en la planeadora.

- **Tamaño:** ≈ 4 h activas por defecto; hasta ≈ 12 h con una línea de justificación. Si el real supera el estimado en más del 50 %, el cierre explica la causa y propone una medida.
- **Modelo por DECISIÓN, nunca por descuido (regla dura del usuario, 2026-10-11).** Cada fase declara el modelo requerido y un esfuerzo **sugerido**; el tope ordinario es **Opus 5.5**; **Fable 5.1 solo en emergencia declarada por el usuario**, jamás por iniciativa del builder, de una skill ni de un subagente.

  | Actividad | Modelo requerido | Esfuerzo (sugerido) |
  |---|---|---|
  | Planear sprint, cerrar sprint, preguntas de la planeadora | Opus 5.5 | medium |
  | Checkpoint de hito, decisión irreversible, auditoría del proceso | Opus 5.5 | high |
  | **Emergencia declarada por el usuario** | Fable 5.1 | — (solo si él lo pide en el mensaje) |
  | Construcción con alcance claro (interfaz, lógica, pruebas) | Sonnet 5.5 | high |
  | Construcción simple: ajustes de interfaz, textos, cambios pequeños | Haiku 5.5 (en prueba) | high |
  | Depuración difícil, concurrencia, seguridad | Opus 5.5 | high |
  | Auditoría de una pasada | Sonnet 5.5 | high |
  | Cierre ejecutivo, script de horas, documentación corta | Haiku 5.5 | low |
  | Subagentes de búsqueda o lectura de archivos | `Explore` de usuario (Haiku 5.5) | medium (en su archivo) |

  - **Gate de modelo al abrir cada fase:** tu primera línea es «Fase N · modelo requerido: X · esfuerzo sugerido: E (`/effort E` si tu encabezado muestra otro) · modelo activo: Y» (Y lo lees de tu encabezado de sesión). Si coinciden, arrancas. **Si no coinciden, NO construyes nada** hasta que el usuario escriba «vamos con Y» (queda registrado en el archivo del sprint) o cambie con `/model X`. Trabajo de rutina en Opus o Fable también se detiene y se recomienda bajar.
  - **El esfuerzo es sugerido:** no detiene nada ni se reporta como desvío. `/model`, `/effort`, `/compact` y `/advisor` los escribe el usuario: cuando el sprint los pida, se los pides en una línea con el comando exacto y esperas su «listo».
  - **Relevo, nunca loop (regla 29):** al **segundo intento fallido** sobre el mismo problema, o a los **20 min sin avance verificable**, **paras**: escribes qué intentaste y qué sabes, y pides relevo en UNA línea: «Relevo: modelo actual X · recomiendo Y · por qué · `/model Y`». Prohibido el tercer intento por el mismo camino con el mismo modelo. Escalón: Haiku → Sonnet → Opus; si Opus pide relevo, decide el usuario.
  - Al cambiar de fase, pide `/compact` (dentro del sprint, nunca `/clear`): el archivo del sprint conserva el estado.

## Reglas del kit que rigen siempre (las 29 están repartidas por carpeta; aquí 8)

6. `[siempre]` **Commits convencionales**; branch `sprint-NNN/<tema>`; jamás push directo a `main` (hook); ruleset `main-protegida` con checks requeridos; un job de CI nuevo entra a la ruleset en el mismo sprint. — § 6
7. `[siempre]` 🔒 **Secrets solo en `.env.local` y Vercel env;** gitleaks a doble cinturón (hook PreToolUse + `githooks/pre-commit`); se prueba con la carnada canónica. — § 7
17. `[siempre]` 🔒 **Cero enlaces: la producción se muestra, jamás se entrega.** Ningún archivo versionado ni campo de GitHub publica la URL de producción o de previews; barrido de árbol + homepage en el job `quality` (`scripts/cero-enlaces.mjs`, dominios en `cero-enlaces.json`). — § 17
17-bis. `[siempre]` **Lo que la app escribe también es superficie:** un derivado jamás nace menos privado que su fuente (700/600; `instantanea --agregar` exige `--salida` fuera de `datos/`); todo arnés que pueda tocar fuentes aborta ante datos reales. — § 17-bis
18. `[siempre]` **UN SOLO PR VIVO POR APP (regla dura del usuario, 2026-10-11; kit v2.1.0).** Dependabot cuenta. Antes de abrir cualquier PR: `gh pr list --state open`; si hay uno, se procesa (mergea o cierra) o se sigue en su rama. Un segundo PR solo si es complementario del primero y su cuerpo EMPIEZA con «complementa #N: <por qué no cabe en #N>»; el job `un-pr-vivo` de la CI falla al segundo PR sin esa línea. Dependencias agrupadas, de a uno, al arrancar el sprint y antes de abrir el PR del sprint; ningún paquete por debajo de `main` (`scripts/verificar-dependencias.mjs`); overrides y excepciones en `pnpm-workspace.yaml`, excepción solo por advisory sin parche y con ADR (ADR-001 `braces`, ADR-005 `compression`). — § 18
20. `[siempre]` **Bilingüe ES/EN en todo desde el primer sprint:** el dato nace como mapa `{ es, en }`, redactado (no traducido), con test de paridad de claves; e2e y capturas en UN idioma por sprint, el otro al cierre del hito. Conversación y cierres en español; código, commits y ADRs en inglés. — § 20
26. `[siempre]` **Worktrees prohibidos:** todo ocurre en `~/Code/app-hackguard`; nada de `git worktree` ni `git stash` a secas sobre trabajo ajeno. — § 26
29. `[siempre]` **Relevo, nunca loop (regla dura del usuario, 2026-10-11; kit v2.2.0).** Segundo intento fallido sobre el mismo problema, o 20 min sin avance verificable ⇒ paras, escribes qué intentaste y pides relevo en una línea con el `/model` del escalón siguiente (Haiku → Sonnet → Opus; de Opus decide el usuario). Jamás un tercer intento por el mismo camino con el mismo modelo. — detalle: docs/REGLAS-ANEXO.md § 29

# Compact instructions

Al compactar conserva: el archivo del sprint (`SPRINT_NNN.md`) como manifiesto, la fase en curso con su modelo y su esfuerzo, las
rutas tocadas con su último commit, las decisiones del dueño y los defaults que rigen, las huellas de instantáneas, planes y lotes
que el sprint creó, los gates en rojo con su causa y lo que falta para el STOP. Descarta salidas de herramientas, contenidos de
archivos ya leídos y diffs: se releen si hacen falta.

Constitución núcleo kit v2.4.0 — HackGuard. Partida por carpeta el 2026-11-09 (S12); antes, regenerada 2026-11-08 para el S11.
