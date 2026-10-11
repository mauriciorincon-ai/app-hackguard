# HackGuard — constitución de la app (núcleo, kit v2.1.0)

> Auto-cargado en cada sesión de este repo. Esta app pertenece al pipeline **AI-APPs**; su plan vive en la casa planeadora.
> Núcleo regenerado por la planeadora el 2026-10-10 (`/nueva-app hackguard` modo regenerar, método v2.0.0) para el S2; sustituye
> a la constitución v1.33.0 de 687 líneas. Las reglas del kit en detalle viven en `docs/REGLAS-ANEXO.md` y se leen solo cuando
> una regla se cita, nunca al abrir la sesión. Las reglas duras de producto de HackGuard están aquí, completas.

## Identidad y las dos casas (regla dura)

- **Planeadora** (`~/Code/hr01-develop-ai-apps/`, privada): brief, visión, el archivo del sprint (inicio ejecutivo + plan + prompt), método y estándares. La **lees** (`additionalDirectories` o path absoluto); **nunca escribes ahí**.
- **Esta app** (`~/Code/app-hackguard`, pública): código, tests, ADRs, `sprints/SPRINT_NNN-cierre.md`. Escritor único: **tú**. El avance vive solo aquí; la planeadora te lee, tú no le reportas a mano. Si el plan necesita cambio, lo declaras en el cierre ejecutivo («desviaciones») y avisas al usuario.
- **Qué es:** planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA. Catálogo vivo de pruebas en cuatro familias (software · agente · modelo generativo · modelo de decisión tipado), cada una trazada a un marco con versión y, cuando se puede, a un control de ISO/IEC 42001; planea desde el perfil del activo con alcance autorizado; recibe resultados de herramientas externas como evidencia confirmada por una persona; mide la brecha control por control. **No ejecuta pruebas.** Tesis: *un hallazgo no es una vulnerabilidad; es evidencia de que un control falla.* Fuentes de verdad (planeadora, RO): `portafolio/hackguard/brief.md` (manda sobre la especificación) · `VISION.md` · `investigacion/2026-10-02-especificacion-features.md` (E-1…E-29) · `corpus/raw/[APP HackGuard] - Requerimientos v1.1.md`.
- **Stack:** Next.js 16.3 **exportado estático** (`output: "export"`, `images.unoptimized`; `pnpm start` sirve `out/` con `serve`; la CI construye como el proveedor con `scripts/build-como-proveedor.mjs`) + TypeScript strict + Tailwind · **sin backend, sin base de datos, sin auth, sin IA en tiempo de ejecución** · datos como JSON versionados con huella (JCS RFC 8785 + SHA-256 con `crypto.subtle`) · Vitest + Playwright + Testing Library + @axe-core/playwright · Sentry client-only y metadata-only (inerte sin DSN) · Vercel con protección en **All Deployments** (la app privada no se muestra a nadie; la superficie pública del H-2 es el paquete estático dentro de hoja-de-vida). Node ≥ 22.18 (el CLI corre TypeScript nativo, sin `tsx`).
  captura_terceros: false
- **Estructura:** `src/app` (App Router, export estático) · `src/components` (UI sin lógica) · `src/engine` (núcleo determinista: `catalogo/` esquemas · validador · filtro · semáforo · equivalencias · instantánea · informe; `modelo-decision/`; `demo/`; `huella.ts`; `fecha.ts`) · `src/cli` (`catalogo validar | instantanea`, `clasificador-demo`) · `src/lib` · `datos/` (marcos, controles, herramientas, pruebas por familia, equivalencias, filtro, estados, instantáneas) · `datos/privado/` (evidencia real, **ignorado por git**) · `propuestas/` (única carpeta donde escriben las skills) · `scripts/maqueta/` + `docs/diseno/` (maqueta aprobada; generador con gate de deriva) · `design-system.md` 1.0.0 · `docs/MANUAL-DE-USO.md` · `docs/GUIA-DE-PRUEBA.html` · `docs/LICENCIAS-DE-MARCOS.md` · `docs/kit-de-prueba/` · `sprints/SPRINT_NNN-cierre.md` · `decisions/NNN-titulo.md` (ADR solo si la decisión es irreversible).

## Reglas duras de HackGuard (producto, no estilo — 12, completas)

1. **El núcleo es determinista y jamás invoca un modelo de lenguaje.** Catálogo, inventario, planificador, libro de evidencia, severidad, brecha y vista por control son código puro: la fecha de evaluación es una entrada, sin `Math.random`, sin reloj del sistema; toda muestra se siembra con la huella del lote; la misma entrada da los mismos bytes en Node y en Chromium, Firefox y WebKit (huellas en CI).
2. **La IA propone, el humano aprueba.** Las únicas piezas con IA son dos skills de Claude Code a demanda (investigador del catálogo, extractor de resultados): escriben solo en `propuestas/` con salida validada por esquema; hooks bloquean escrituras fuera; jamás aprueban ni confirman un veredicto ni corren en tiempo de ejecución; ninguna fuente se muestra sin verificación por código; el veredicto sugerido lo calcula la regla del catálogo. ADR «código primero» para ambas antes de construirlas. Sin APIs de terceros ni claves.
3. **Frontera de contenido.** Cada prueba describe **qué se verifica, por qué importa, con qué herramienta y qué resultado se espera**, nada más. El repo jamás contiene cargas ni procedimientos operativos. El filtro **marca** para revisión y la persona decide; nunca rechaza solo. Si una redacción se detiene, se reescribe desde ese ángulo, no se omite la prueba.
4. **El crudo de una herramienta nunca entra al almacén:** huella + extracto redactado por esquema; todo adjunto se muestra como texto inerte (escapado) en ambos modos.
5. **Autorización antes que plan.** Sin alcance autorizado y reglas de enfrentamiento no hay plan; dueño del activo y proveedor separados; la política del proveedor se cita; nada se planea contra infraestructura de terceros (E-24).
6. **Evidencia que aguanta una auditoría.** Ningún sobre cuenta sin confirmación humana (individual o por lote con plan de calidad límite en datos); en familias estocásticas `repeticiones_k` y regla asimétrica con la cota visible; la re-prueba usa la misma configuración y al menos el mismo k; **la ausencia de un hallazgo en un escaneo posterior nunca lo cierra**; evidencia confirmada inmutable.
7. **Severidad:** CVSS 4.0 contra la referencia de first.org fijada por commit (`FIRSTdotorg/cvss-v4-calculator@c5b0d40`) con validador estricto aparte; la escala de IA es una **tabla de prioridad de acción en datos** con el impacto primero, nunca una suma.
8. **La evidencia real no viaja al repo público:** alcances, reglas de enfrentamiento, sobres y hallazgos de activos reales viven en `datos/privado/` (ignorado; respaldo en un repo privado solo de datos). Público: código, catálogo, controles y activos demo sintéticos.
9. **Vitrina por lista blanca.** Nada es publicable por defecto; paquetes de ejecución y alcances nunca; la validación del instrumento (C18) corre antes de publicar y bloquea si falla (ninguna instantánea ni paquete se emite con el catálogo inválido).
10. **El conocimiento es dato.** Marcos (con versión y mapa de equivalencias), controles, herramientas, pruebas, escalas, vocabularios de estado y plantillas viven en archivos versionados; agregar una familia, un marco o un adaptador no toca el núcleo; una referencia de marco sin versión se rechaza al cargar; umbrales de vigencia (30/60 días) y fecha de consulta son datos, nunca el reloj.
11. **Normas y marcos:** de ISO/IEC solo identificadores y resúmenes con palabras propias, jamás su texto (`verificado_contra_norma: false` hasta validar contra la norma, deuda antes de G-Release); atribución según la licencia de cada marco (`docs/LICENCIAS-DE-MARCOS.md`, DA-01); una fuente que responde 403 se registra `fuente_no_accesible_al_agente`, nunca se elude.
12. **El color nunca solo:** semáforo de vigencia, veredictos y estados = símbolo (trazo SVG, nunca un carácter) + texto + color, desde el vocabulario de `datos/estados.json`; ningún componente lleva un color de estado escrito.

## Workflow del sprint (5 pasos)

1. **Plan.** El usuario trae el archivo del sprint de la planeadora (`portafolio/hackguard/sprints/SPRINT_NNN.md`: inicio ejecutivo + plan técnico breve + prompt de arranque). En **plan mode** corres `/plan-sprint`: estado real del código, riesgos, plan en ≤ 3 fases con criterio observable y horas estimadas por fase, recomendación de modelo. **La aprobación del plan NO arranca nada:** esperas el **«construye»** explícito. Branch `sprint-NNN/<tema>`.
2. **Construcción.** ≤ 3 fases; commits convencionales con la etiqueta `[F1]` / `[F2]` / `[F3]` en el subject (de ahí salen las horas por fase). **Un solo STOP al final de la construcción** con el resumen de las fases, **más como máximo 1 mirada de DECISIÓN** si el sprint cambia una decisión del usuario, la promesa o su máquina (las paradas de contenido donde el usuario aprueba datos son producto y no cuentan). Sin STOP por fase; FORMA y TEXTO se maquetan «no vistas» (registro de una línea) y van al gate humano del hito.
3. **Auditoría de una pasada + checklist manual.** `/audita-sprint` (un auditor independiente en solo lectura, 4 casillas; **críticos y altos se pagan en el sprint, medios y bajos van al lote del hito**). Luego `/deploy-check`: ≤ 10 casillas manuales — **la CI es el gate; si no está en la CI, no es casilla.**
4. **Cierre ejecutivo.** `sprints/SPRINT_NNN-cierre.md` ≤ 40 líneas con la salida de `node scripts/horas-sprint.mjs` pegada (campos abajo). Reemplaza al summary, la bitácora y la auditoría como archivos aparte (la auditoría es una sección del cierre).
5. **PR normal** (no en borrador) con el cierre dentro; checks requeridos (`quality` · `e2e` · `lighthouse`) con conclusión propia `success` leídos **al final**, no tras cada push. **El merge squash lo hace el usuario** y borra la rama; después corre `/cierre-sprint hackguard` en la planeadora.

- **Por hito, no por sprint:** gate humano único (≈ 20 min con la página abierta; ⭐/⭐⭐ de la guía, FORMA y TEXTO pendientes, juicio de diseño) · lote de hallazgos medios y bajos · brochure (hito Vitrina) · `design-sync/` y `/design-sync` · `docs/BLUEPRINT.html` · pruebas y capturas en el segundo idioma · adopción del kit y de esta constitución (una vez al abrir el hito; el kit versiona ≤ 1 vez al mes).
- **Solo por cambio:** aprovisionamiento (tabla y humo solo si hay uno nuevo) · demo en rojo (solo gates propios nuevos) · roadmap de CV Viva (solo si el sprint toca una feature votada) · ADR (solo decisiones irreversibles).
- **Tamaño:** ≈ 4 h activas de builder por defecto; hasta ≈ 12 h con una línea de justificación. Si el real supera el estimado en más del 50 %, el cierre explica la causa y propone una medida.
- **Modelo y esfuerzo por fase (default configurable, no regla dura):** cada fase del plan declara modelo, esfuerzo y una línea de por qué; desviarse de la tabla se permite con esa línea en el archivo del sprint.

  | Actividad | Modelo | Esfuerzo |
  |---|---|---|
  | Planear sprint, cerrar sprint, preguntas de la planeadora | Opus 5.5 | medium |
  | Checkpoint de hito, decisión irreversible, auditoría del proceso | Fable 5.1 | high |
  | Construcción con alcance claro (interfaz, lógica, pruebas) | Sonnet 5.5 | medium |
  | Construcción simple: ajustes de interfaz, textos, cambios pequeños | Haiku 5.5 (en prueba) | medium |
  | Depuración difícil, concurrencia, seguridad | Opus 5.5 | high |
  | Auditoría de una pasada | Sonnet 5.5 | high |
  | Cierre ejecutivo, script de horas, documentación corta | Haiku 5.5 | low |
  | Subagentes de búsqueda o lectura de archivos | Haiku 5.5 | — |

  - La primera línea de cada fase dice: «Fase N · modelo requerido: X · esfuerzo: Y. Verifica el encabezado de la sesión o `/status`; si no coincide, ejecuta `/model X` y `/effort Y`». El cambio de modelo entre fases se pide dentro del mensaje de fin de fase o del STOP que ya existen: **ninguna parada nueva**.
  - Si el modelo no coincide con el requerido, o la tarea no corresponde al modelo (trabajo de rutina en Opus o Fable; un mismo problema que falló dos veces con el modelo actual), te detienes y recomiendas en UNA línea: modelo actual · modelo recomendado · por qué · comando exacto para cambiar.
  - **Haiku 5.5 en construcción simple está en prueba:** si falla dos veces en el mismo problema, recomienda subir a Sonnet 5.5; el cierre registra si Haiku bastó o no; tras 3 sprints se decide si se queda. Nombre completo `claude-haiku-5-5` en `--model` y `/model` hasta confirmar que el alias `haiku` apunta a esa versión.
  - Al cambiar de fase, si el contexto anterior no se necesita, recomienda `/clear` o `/compact`: el archivo del sprint conserva el estado.
  - Los subagentes declaran su modelo en su definición (búsqueda y lectura: Haiku 5.5; auditor: Sonnet 5.5); ninguno hereda Opus o Fable por omisión.

## Reglas del kit (28, una línea cada una)

Frecuencia: `[sprint]` cuesta algo en cada sprint · `[hito]` se ejecuta al cerrar o abrir un hito · `[cambio]` solo cuando el sprint toca lo que la regla cubre · `[siempre]` pasiva, costo cero. 🔒 = privacidad o seguridad. El detalle, origen y precedentes de cada una: `docs/REGLAS-ANEXO.md § N`.

1. `[siempre]` **TypeScript strict.** Sin `any` ni `@ts-ignore` sin justificación en comentario. — § 1
2. `[sprint]` **Tests de lo que cambia.** Motores puros > 80 % (`src/engine/` ≥ 90 %, umbral en `vitest.config.ts`), UI > 50 %, ≥ 1 e2e por feature core; `--coverage` en el script `test`. — § 2
3. `[siempre]` **Motor separado de UI.** Lógica pura en `engine/`/`lib/`; componentes sin lógica de negocio. — § 3
4. `[siempre]` **Toda salida de LLM que se persista pasa por esquema Zod**; en esta app solo en `propuestas/` (regla dura 2). — § 4
5. `[siempre]` **A11y desde el inicio:** tabindex, aria-labels, contraste AA; `prefers-reduced-motion` cambia propiedades, jamás la forma del árbol; tokens de tinta vetados fallan en lint; el color nunca solo. — § 5
6. `[siempre]` **Commits convencionales**; branch `sprint-NNN/<tema>`; jamás push directo a `main` (hook); ruleset `main-protegida` con checks requeridos; un job de CI nuevo entra a la ruleset en el mismo sprint. — § 6
7. `[siempre]` 🔒 **Secrets solo en `.env.local` y Vercel env;** gitleaks a doble cinturón (hook PreToolUse + `githooks/pre-commit`); se prueba con la carnada canónica. — § 7
8. `[sprint]` **Presupuesto medido:** ≈ 4 h activas por defecto, ≤ 12 h con justificación; horas con `scripts/horas-sprint.mjs`. — § 8
9. `[sprint]` **Manual de uso vivo** (`docs/MANUAL-DE-USO.md`): toda feature que llega a `main` tiene su sección en el mismo sprint, en lenguaje de usuario final. — § 9
10. `[hito]` **El diseño va antes del código:** G-Diseño sellado el 2026-10-04 (`docs/diseno/`, `design-system.md` 1.0.0, dirección «consola»); **FIDELIDAD del primer sprint con UI indiferible** (la primera pantalla construida se compara con su página de la maqueta antes de construir encima); de las tres clases de mirada solo **DECISIÓN** abre parada (máx. 1 por sprint); FORMA y TEXTO al gate humano del hito. — § 10
11. `[cambio]` **Guía de prueba viva y acumulativa** (`docs/GUIA-DE-PRUEBA.html`, prefijo `hackguard-sN`): se toca solo si el sprint cambia un flujo visible; ⭐/⭐⭐ se corren en el gate humano del hito; kit de prueba (`docs/kit-de-prueba/`) solo por cambio. — § 11
12. `[siempre]` **Prohibido entregar por artifacts o plataformas externas:** todo entregable es un archivo del repo y se entrega su ruta. — § 12
13. `[hito]` **Brochure** (`docs/BROCHURE.html` + `docs/brochure-export.json`): una vez, cuando la app entra al hito Vitrina; se ajusta al cierre de cada hito posterior. — § 13
14. `[siempre]` **Código primero, IA generativa después:** una feature LLM exige ADR «código primero» (`decisions/PLANTILLA-ADR-codigo-primero.md`). — § 14
15. `[cambio]` **Un gate se demuestra fallando:** `scripts/demo-rojo.sh` solo para gates PROPIOS nuevos; un check `skipped` no es verde: conclusión propia `success` en cada check requerido. — § 15
16. `[hito]` **El bundle `design-sync/` es un artefacto del repo** (`pnpm design-sync:bundle`, `tests/unit/design-sync.test.ts`), se actualiza al cierre del hito; `/design-sync` lo invoca el usuario. — § 16
17. `[siempre]` 🔒 **Cero enlaces: la producción se muestra, jamás se entrega.** Ningún archivo versionado ni campo de GitHub publica la URL de producción o de previews; barrido de árbol + homepage en el job `quality` (`scripts/cero-enlaces.mjs`, dominios en `cero-enlaces.json`). — § 17
17-bis. `[siempre]` **Lo que la app escribe también es superficie:** un derivado jamás nace menos privado que su fuente (700/600; `instantanea --agregar` exige `--salida` fuera de `datos/`); todo arnés que pueda tocar fuentes aborta ante datos reales. — § 17-bis
18. `[siempre]` **UN SOLO PR VIVO POR APP (regla dura del usuario, 2026-10-11; kit v2.1.0).** Dependabot cuenta. Antes de abrir cualquier PR: `gh pr list --state open`; si hay uno, se procesa (mergea o cierra) o se sigue en su rama. Un segundo PR solo si es complementario del primero y su cuerpo EMPIEZA con «complementa #N: <por qué no cabe en #N>»; el job `un-pr-vivo` de la CI falla al segundo PR sin esa línea. Dependencias agrupadas, de a uno, al arrancar el sprint y antes de abrir el PR del sprint; ningún paquete por debajo de `main` (`scripts/verificar-dependencias.mjs`); overrides y excepciones en `pnpm-workspace.yaml`, excepción solo por advisory sin parche y con ADR (ADR-001 `braces`, ADR-005 `compression`). — § 18
19. `[cambio]` **Todo puente entre dos lenguajes exige su gate de contrato** (fixture del serializador real, tipo validado del lado que lee, un e2e): aplica a los adaptadores Garak y ZAP del S3. — § 19
20. `[siempre]` **Bilingüe ES/EN en todo desde el primer sprint:** el dato nace como mapa `{ es, en }`, redactado (no traducido), con test de paridad de claves; e2e y capturas en UN idioma por sprint, el otro al cierre del hito. Conversación y cierres en español; código, commits y ADRs en inglés. — § 20
21. `[cambio]` **IA de construcción por suscripción (7-S):** solo el binario oficial de Claude Code, token jamás en env ni repo; ADR de cumplimiento por release. — § 21
22. `[cambio]` **Todo control dibujado tiene su script cargado** (gate `tests/unit/controladores-maqueta`); si el sprint toca una maqueta o pantalla, la pasada de capturas activa cada control y comprueba que algo cambió. — § 22
23. `[cambio]` **Matriz de envejecimiento:** todo dato con fecha de cambio de estado trae un gate que construye la página en cada fecha en que algo cambia; la fecha de consulta es perilla de build, nunca el reloj (`tests/unit/catalogo/envejecimiento.test.ts`, `maqueta-envejecimiento`). — § 23
24. `[cambio]` 🔒 **Las protecciones del sistema del usuario se enseñan antes de tocarlas:** matriz de una fila por acción y un «sí» por acción. — § 24
25. `[siempre]` **El comando de pruebas por defecto no toca hardware ni permisos.** — § 25
26. `[siempre]` **Worktrees prohibidos:** todo ocurre en `~/Code/app-hackguard`; nada de `git worktree` ni `git stash` a secas sobre trabajo ajeno. — § 26
27. `[siempre]` **La evidencia se escribe después del hecho** («leído como imagen», «N de N», «en verde») con la cuenta tomada del resultado; el conteo de `--minimo-tests` sale de un comando, nunca a mano. — § 27
28. `[cambio]` **Parejas de versiones entre dos ecosistemas** se vigilan con un test entre lockfiles; no aplica hoy (sin Tauri ni Python). — § 28

## Cierre ejecutivo (`sprints/SPRINT_NNN-cierre.md`, ≤ 40 líneas)

Frontmatter `sprint · app · hito · opened · closed · branch · pr`, y los campos, cada uno en una línea o una tabla corta:
nombre · objetivo planeado · resultado · estado · tiempo estimado · tiempo real (salida de `scripts/horas-sprint.mjs`) · diferencia ·
fases planeadas y resultado real · tiempo estimado y real por fase · entregables · no completado · desviaciones · causas · decisiones ·
deuda generada o aplazada (medios y bajos con `archivo:línea`, al lote del hito) · aprendizajes reutilizables · recomendación para el siguiente ·
evaluación esfuerzo-beneficio · **auditoría** (4 casillas; C/A con `pagado · <commit>`) · si una fase se pasó más del 50 %: causa y medida ·
**modelo usado por fase y si hubo desvío** (una línea; si una fase corrió con Haiku 5.5, si bastó o no) · huellas de la instantánea oficial en los cuatro motores si el sprint tocó el catálogo ·
«Para mergear: squash y borrar la rama; después `/cierre-sprint hackguard`».

## Comandos

`/plan-sprint` (paso 1) · `/audita-sprint` (paso 3) · `/deploy-check` (paso 3) · `/design-sync` (hito; lo invoca el usuario) · `/self-review`, `/run-tests`, `/security-audit` (opcionales).
Scripts: `scripts/horas-sprint.mjs` · `scripts/demo-rojo.sh` · `scripts/verificar-dependencias.mjs` · `scripts/build-como-proveedor.mjs` · `scripts/verificar-salida-publicada.mjs` · `scripts/cero-enlaces.mjs` · `scripts/lighthouse-margen.mjs`.
Propios: `pnpm catalogo:validar` · `pnpm catalogo:instantanea` · `pnpm clasificador:demo` · `pnpm maqueta` · `pnpm capturas:maqueta` · `pnpm tokens` · `pnpm design-sync:bundle`.

## Estándares (los 6+1, gates en CI)

Testing · CI/CD · Observabilidad · Seguridad · Performance (`perf-budget.json`, Lighthouse una corrida, categorías ≥ 0.9; cada sprint suma sus rutas nuevas a `lighthouse-urls.json`) · UX+A11y · IA embebida responsable.
Detalle canónico: `estandares/estandares.md` de la planeadora (solo lectura). Ítem rojo ⇒ deuda explícita en el cierre ejecutivo o el sprint no cierra.

## Patrones de dominio de esta app

- **Catálogo como dato con huella:** `src/engine/catalogo/` valida (61 reglas con nombre y severidad), filtra (patrones de forma en `datos/filtro/patrones.json`: marca, no rechaza), calcula el semáforo (umbrales en datos; la familia está como su prueba más atrasada) y emite la instantánea (JCS + SHA-256, gate de publicación). Toda pantalla lee la **instantánea oficial** (`datos/instantaneas/`), nunca los archivos sueltos; **una cuenta, un cálculo** (design-system § 9): lo que varias pantallas muestran sale de una sola función del motor.
- **Vocabulario de estados como dato** (ADR-003): `datos/estados.json` da símbolo, nombre `{es, en}` y rol de color; `ESTADOS_QUE_CALCULA_EL_MOTOR` debe tener etiqueta para cada estado que el motor emite (la matriz de envejecimiento lo exige).
- **Sobre de evidencia** (S3): campos de § 6.7 + E-8 y **tres huellas** (crudo · sobre canónico · resultado sin identificadores de corrida, E-9). **Adaptadores** con interfaz común en `src/engine/adaptadores/`: Garak (`report.jsonl`/hitlog, rango probado 0.17.0) y ZAP (sin evidencia de ejecución sugiere `no_ejecutada`, nunca `superada`, E-6/E-7).
- **Familia `modelo_decision`** (ADR-004): activo demo = clasificador determinista propio que imita el contrato de respuesta de Jev (distribución sobre opciones tipadas + estadístico derivado; `confidence` ≠ probabilidad); las pruebas miden probabilidades, comparan contra la variación por re-ejecución e incluyen paridad ES/EN; Jev real solo como segundo activo, con plan gratuito y su contrato citado (prohíbe pruebas de vulnerabilidad sobre su servicio).
- **Vista por control:** «evidencia organizada», separada del nivel de aseguramiento; cadena hallazgo → corrección → re-prueba visible (E-16). **Brecha única de todos los activos**; tablero, brecha, vista por control e informe salen del mismo cálculo (decisión 21 de diseño).
- **Maqueta como referencia de fidelidad:** `scripts/maqueta/` genera `docs/diseno/` (gate de deriva byte a byte); el producto obedece `design-system.md` y la hoja `docs/diseno/assets/app.css` + `tokens.css` (fuente: `scripts/paleta/`); una decisión de diseño nueva se registra en `docs/diseno/README.md` y se regenera la maqueta, nunca se edita el HTML a mano.

Constitución núcleo kit v2.1.0 — HackGuard, regenerada 2026-10-10 (regla 18 actualizada 2026-10-11). Las reglas del kit en detalle viven en `docs/REGLAS-ANEXO.md` y se leen solo cuando una regla se cita.
