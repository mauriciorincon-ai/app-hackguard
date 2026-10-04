# HackGuard (app-hackguard) — constitución de la app (Claude Code)

> Auto-cargado en cada sesión de este repo. Esta app pertenece al pipeline **AI-APPs**; su plan
> vive en la casa planeadora. Constitución emitida por `/nueva-app hackguard` el 2026-10-02 desde
> kit-app **v1.33.0** con perfil **`--estatico`**. Tercera app con especificación completa del
> usuario y tercer proyecto de la trilogía con big-d y planlang. Nace con el pipeline completo desde
> el día 0 (Etapa de Diseño · filtros ⭐/⭐⭐ · cero enlaces · bilingüe integral).
>
> **Sincronizada con kit-app v1.39.0** el 2026-10-04 (S1, fase 0), por nombre: v1.34.0 → v1.39.0. Frases centinela:
> «La evidencia se escribe DESPUÉS del hecho» (regla 27) ·
> «lo que el proveedor publica no es lo que el build escribe» (Stack, perfil estático).

## Las dos casas (regla dura)

| Casa | Path | Escritor único | Qué vive ahí |
|---|---|---|---|
| **Planeadora** | `~/Code/hr01-develop-ai-apps/` | su propia sesión | brief, sprints (plan+retro), órdenes de construcción, método, estándares |
| **Esta app** | este repo | **tú** | código, tests, ADRs de implementación, bitácora y summary del sprint |

- ✅ Puedes **leer** la planeadora (agregada como `additionalDirectories`, o por path absoluto).
- ❌ **Nunca escribes** en la planeadora. Si el plan necesita cambio, lo anotas en tu
  `sprints/SPRINT_NNN-implementation-log.md` bajo `## Desviación del plan` y avisas al usuario.
- El avance de implementación vive **solo aquí** — la planeadora te lee, tú no le reportas a mano.

## Qué es esta app

**HackGuard** — planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA.
Mantiene un **catálogo vivo** de pruebas para cuatro familias de activo (software · agente · modelo
generativo · modelo de decisión tipado), cada una trazada a un **marco con versión** y, cuando se
puede, a un **control de ISO/IEC 42001**; **planea** las pruebas de un activo desde su perfil, con
alcance autorizado y reglas de enfrentamiento declarados; **recibe** resultados de herramientas
externas (Garak, ZAP, texto pegado, carga manual) como **evidencia** confirmada por una persona; y
**mide la brecha** control por control. No ejecuta pruebas. Tesis: *un hallazgo no es una
vulnerabilidad; es evidencia de que un control falla.*

Fuentes de verdad en la planeadora (solo lectura): `portafolio/hackguard/brief.md` (v1.0.0, manda
sobre la especificación), `portafolio/hackguard/investigacion/2026-10-02-especificacion-features.md`
(29 cambios aceptados, E-1…E-29), `corpus/raw/[APP HackGuard] - Requerimientos v1.1.md` (inmutable) y
el spike `portafolio/hackguard/investigacion/spike-adaptadores-cvss/` (referencia de adaptadores,
huellas y CVSS 4.0; código desechable, jamás se copia como producto).

## ⚠️ Reglas duras de esta app (producto, no estilo)

1. **EL NÚCLEO ES DETERMINISTA Y JAMÁS INVOCA UN MODELO DE LENGUAJE.** Catálogo, inventario,
   planificador, libro de evidencia, severidad, brecha y vista por control son código puro: la fecha
   de evaluación es una entrada, sin `Math.random`, sin reloj del sistema. Toda muestra (confirmación
   por lote) se siembra con la huella del lote. La misma entrada produce los mismos bytes en Node y en
   Chromium, Firefox y WebKit (JCS RFC 8785 + SHA-256 con `crypto.subtle`; huellas en CI).
2. **LA IA PROPONE, EL HUMANO APRUEBA.** Las únicas piezas con IA son dos skills de Claude Code a
   demanda: el **investigador** del catálogo y el **extractor** de resultados pegados. Escriben solo en
   `propuestas/`, con salida validada por esquema; hooks bloquean escrituras fuera de esa carpeta.
   Jamás aprueban, jamás confirman un veredicto, jamás corren en tiempo de ejecución. Ninguna fuente se
   muestra sin verificación por código (existencia + fragmento literal); el **veredicto sugerido lo
   calcula la regla del catálogo**, no el modelo. ADR «código primero» para ambas antes de construirlas
   (`decisions/PLANTILLA-ADR-codigo-primero.md`). Sin APIs de terceros ni claves.
3. **FRONTERA DE CONTENIDO.** Cada prueba describe **qué se verifica, por qué importa, con qué
   herramienta y qué resultado se espera** — nada más. El repo jamás contiene cargas ni procedimientos
   operativos. El filtro de contenido **marca** para revisión y la persona decide; nunca rechaza solo.
4. **EL CRUDO DE UNA HERRAMIENTA NUNCA ENTRA AL ALMACÉN.** Se guarda su huella y un **extracto redactado
   por esquema**; todo contenido adjunto se muestra como **texto inerte** (escapado) en ambos modos.
5. **AUTORIZACIÓN ANTES QUE PLAN.** Sin alcance autorizado y reglas de enfrentamiento no se emite plan.
   El perfil separa **dueño del activo y proveedor**; la política del proveedor se cita en las reglas de
   enfrentamiento; nada se planea contra infraestructura de terceros (E-24).
6. **EVIDENCIA QUE AGUANTA UNA AUDITORÍA.** Ningún sobre cuenta sin confirmación humana (individual, o
   por lote con plan de calidad límite en datos). En familias estocásticas, `repeticiones_k` y regla
   asimétrica con la cota visible. La re-prueba usa la misma configuración y al menos el mismo k. **La
   ausencia de un hallazgo en un escaneo posterior nunca lo cierra.** Evidencia confirmada inmutable.
7. **SEVERIDAD.** CVSS 4.0 con la referencia que sirve first.org fijada por commit
   (`FIRSTdotorg/cvss-v4-calculator@c5b0d40`) y un validador estricto aparte; la escala de IA es una
   **tabla de prioridad de acción en datos** con el impacto primero (patrón de
   `reusables/instrumentos-de-plan/`), nunca una suma de dimensiones.
8. **LA EVIDENCIA REAL NO VIAJA AL REPO PÚBLICO.** Alcances, reglas de enfrentamiento, sobres y
   hallazgos de activos reales viven en `datos/privado/` (ignorado por git; respaldo en un repo privado
   solo de datos). El repo público lleva código, catálogo, controles y **activos demo sintéticos**.
9. **VITRINA POR LISTA BLANCA.** Nada es publicable por defecto; paquetes de ejecución y alcances nunca
   pueden serlo. La validación del instrumento corre antes de publicar y bloquea si falla.
10. **EL CONOCIMIENTO ES DATO.** Marcos (con versión y mapa de equivalencias), controles, herramientas,
    pruebas, escalas y plantillas viven en archivos versionados; agregar una familia, un marco o un
    adaptador no toca el núcleo. Una referencia de marco sin versión se rechaza al cargar.
11. **NORMAS Y MARCOS.** De ISO/IEC solo identificadores y resúmenes con palabras propias, jamás su
    texto; atribución según la licencia de cada marco (se fija en la fase 0 del S1).
12. **EL COLOR NUNCA SOLO.** Semáforo de vigencia, veredictos y estados = símbolo + texto + color.

## Stack

- **Frontend:** Next.js 16.3 LTS (perfil exportado estático) + TypeScript strict + Tailwind + shadcn/ui.
- **Backend/BD/Auth:** **ninguno.** Archivos versionados con huella; evidencia real en `datos/privado/`.
- **IA embebida:** **ninguna en tiempo de ejecución.** Las dos skills (investigador, extractor) operan en
  construcción y operación por la suscripción de Claude Code del usuario (estándar 7-S); sin claves.
- **Tests:** Vitest (unit/integration) + Playwright (e2e) + Testing Library + @axe-core/playwright.
  captura_terceros: false
- **Perfil EXPORTADO ESTÁTICO (kit v1.29.0):** `next.config.ts` lleva `output: "export"`; no hay
  servidor: `pnpm start` sirve `out/` con `serve` (versión exacta) y así Lighthouse y Playwright corren
  igual que en el perfil web. Sin Server Actions, sin rutas dinámicas sin `generateStaticParams`, sin
  `next/image` con el loader por defecto (`unoptimized`).
  **La CI construye COMO EL PROVEEDOR (kit v1.39.0):** `scripts/build-como-proveedor.mjs` corre en `quality` tras
  `pnpm build`; si `next.config.*` declara `output: "export"`, hace `vercel build` sin conexión con el adapter de Next
  (`NEXT_ENABLE_ADAPTER=1`, CLI fijado en el script) y exige que **cada página de `.vercel/output/static/` sea idéntica
  byte a byte a la de `out/`** (`scripts/verificar-salida-publicada.mjs`). En Vercel, Next 16 copia las páginas durante
  `next build` y publica esa copia, no `out/`: **todo paso posterior al build que modifica `out/` (CSP, manifiestos,
  huellas) escribe también en la carpeta publicada**, o no llega a producción sin que ninguna prueba local lo vea.
  *(Big-D S2, S2-AUD-32: la CSP faltaba en producción; lo vio el usuario guardando la página del preview.)* Patrón:
  `wiki/patterns/lo-que-el-proveedor-publica.md` (planeadora, RO).
- **Deploy:** Vercel (preview por PR, prod desde `main`, protección en **All Deployments**: la app
  privada no se muestra a nadie; la superficie pública es el paquete estático dentro de hoja-de-vida, H2).
  **Observabilidad:** Sentry client-only y metadata-only desde el kit (inerte sin DSN).

## Estructura

```
src/
├─ app/            (App Router, export estático)
├─ components/     (UI sin lógica de negocio)
├─ engine/         (núcleo determinista: catálogo, planificador, libro, severidad, brecha, huellas)
│  └─ adaptadores/ (Garak, ZAP — interfaz común)
├─ lib/            (utils, dominio)
└─ types/
datos/             (catálogo, marcos, controles, herramientas, activos demo — versionados con huella)
datos/privado/     (evidencia de activos reales — IGNORADO por git)
propuestas/        (única carpeta donde escriben las skills)
tests/{unit,integration,e2e}/
design-system.md · design-sync/ · docs/MANUAL-DE-USO.md · docs/GUIA-DE-PRUEBA.html · docs/kit-de-prueba/
sprints/SPRINT_NNN-implementation-log.md · SPRINT_NNN-summary.md
decisions/NNN-titulo.md   (ADRs de implementación)
```

## Reglas de desarrollo

1. **TypeScript strict.** Sin `any` ni `@ts-ignore` sin justificación en comentario.
2. **Tests con cada feature.** Motores puros >80%, UI >50%, ≥1 e2e por feature core.
   **Al escribir los PRIMEROS tests (S1): añade `--coverage` al script `test`** — sin el flag los
   umbrales del `vitest.config.ts` no se aplican en CI (el estampado lo omite para que la CI del
   commit inicial quede verde sin tests). Directorios **generados** (`coverage/`, assets copiados
   a `public/` tipo `public/pyodide/`) van a los `globalIgnores` de `eslint.config.mjs`.
3. **Motor separado de UI.** Lógica pura en `engine/`/`lib/`; componentes sin lógica de negocio.
4. **Toda salida de LLM que se persista pasa por esquema Zod** (skill `ia-embebida`) — nunca texto
   libre directo a la BD.
5. **A11y desde el inicio:** tabindex, aria-labels, contraste AA, `prefers-reduced-motion`.
   **Y dos reglas que nacen de reincidencias (kit v1.26.0):** (a) **la FORMA del árbol jamás
   depende de `useReducedMotion()`** — el hook vale `null` en el servidor y `true` en el
   navegador con «reducir movimiento»; si decide QUÉ elementos se pintan, el HTML del servidor
   y el primer render del cliente no coinciden (React #418) y la página se regenera entera
   justo para quien el cinturón quiere cuidar. Reduced motion cambia PROPIEDADES (initial,
   variants, transition) o lo hace el CSS; dos gates: test unitario «mismo HTML con `null` /
   `true` / `false`» sobre cada componente de motion + axe bajo emulación de reduced-motion
   (patrón `wiki/patterns/reduced-motion-sin-ramificar-el-arbol.md` de la planeadora).
   (b) **Los tokens de tinta VETADOS como texto se declaran en `design-system.md` y FALLAN en
   lint/test, no en axe al final** (p. ej. `ink-3`, que no alcanza AA sobre superficie): un
   barrido de clases prohibidas sobre `src/` que corre con `pnpm lint`/`pnpm test` — la
   segunda reincidencia en una misma app (hoja-de-vida S6 y post-S7) fue la señal.
6. **Commits convencionales**; branch `sprint-NNN/<tema>`; **jamás push directo a `main`** (hook lo
   bloquea); PR con CI verde + preview probado. La ruleset `main-protegida` exige los checks
   `quality`/`e2e`/`lighthouse` **desde el estampado** (regla 2026-07-10 — protección GitHub no
   negociable, repo público); **si un sprint añade un job de CI (p. ej. `integration`), se añade
   a la ruleset en el mismo sprint** (`gh api` o Settings → Rules).
7. **Secrets solo en `.env.local` (gitignored) y Vercel env vars.** Doble protección gitleaks:
   hook `pre-commit` de git (`githooks/`, cubre commits manuales) + hook PreToolUse de Claude
   Code (cubre escrituras del agente). El hook nace ejecutable (100755) y `core.hooksPath` se
   re-aplica en cada `pnpm install` (script `prepare` — K12); si un commit con secreto de prueba
   NO es bloqueado, el gate está muerto — repáralo antes de seguir. **Carnada canónica verificada
   (kit v1.6.3; desde v1.7.3 viaja PARTIDA aquí para no disparar el hook al comitear este
   archivo): ármala concatenando `AWS_ACCESS_KEY_ID=` + `AKIAQ7RTZ4PX` + `KM2WNB3S` SOLO en el
   archivo de prueba del hook** — no improvises el secreto de prueba:
   las reglas modernas de gitleaks exigen alfabeto real (base32 tras `AKIA`) y entropía, y una
   carnada floja pasa en silencio dando falsa tranquilidad (lección 2026-07-15: dos falsos "todo
   bien" seguidos). Si gitleaks sube de versión mayor, re-verificar la carnada en sandbox antes
   de confiar en ella.
8. **Presupuesto de esfuerzo:** ~12 pasos por pantalla; si lo excedes, detente y simplifica o consulta.
9. **Manual de uso vivo (`docs/MANUAL-DE-USO.md`, obligatorio).** Toda feature que llegue a `main`
   queda documentada ahí **en el mismo sprint**: qué hace, cómo se usa (pasos para el usuario final,
   no para el dev), capturas o rutas de pantalla, y limitaciones conocidas. En español llano. Es el
   documento que permite a cualquier persona conocer las features principales de la app sin leer
   código — al lanzar (F5) se convierte en la base de la guía de usuario pública.
10. **El diseño va ANTES del código — Etapa de Diseño con gate G-Diseño (kit v1.14.0, método
   v1.14.0 F2a).** Si este repo acaba de estamparse: **tu primer trabajo NO es construir — es
   diseñar**. La planeadora emite una **orden de diseño** (`ordenes/DISENO-orden.md`); en branch
   `diseno/fundacion` produces (1) el **`design-system.md` completo** (tokens ambos temas,
   personalidad, componentes canon, motion + reduced-motion, anti-patrones) y (2) la **maqueta
   navegable del H1 COMPLETO** en `docs/diseno/` — HTML autocontenido, una página por pantalla
   core con sus estados, mobile + desktop, ambos temas, **cero React y cero motores** — que se
   despliega en Vercel para que el usuario la recorra en sus dispositivos. Se trabaja en **sala
   de diseño** (rondas de propuesta → mirada del usuario → ajuste, sin presupuesto de pasos ni
   prisa; pasada de capturas desde la ronda 1). **CERO código de producto hasta que el usuario
   apruebe G-Diseño** (veredicto registrado en `docs/diseno/README.md`). Desde entonces, toda
   pantalla de producto **obedece la maqueta**: en el primer sprint con UI, DETENTE tras la
   primera pantalla construida y presenta capturas comparadas contra la maqueta (gate de
   FIDELIDAD, indiferible — no viaja con el ⭐). Claude Design sigue bajo demanda (convergencia
   trabada ≥2 rondas o exploración del usuario); `/design-sync` publica el sistema consolidado
   al cerrar cada ciclo. *(Apps estampadas ANTES de v1.14.0 y sin etapa: el gate del primer
   sprint con UI es de DIRECCIÓN — design-system + primera pantalla en capturas — igual de
   indiferible.)* Origen: Velo llegó a su S2 sin que el usuario viera un solo artefacto visual. Cada sprint con UI cierra con el **checklist de revisión de
   diseño** del skill `diseno-ui` + aprobación visual del usuario sobre la preview.
   **Claude Design — LA regla única (método v1.19.0, resuelve la contradicción que Velo S4
   destapó):** **durante el ciclo es BAJO DEMANDA** con sus dos disparadores escritos (el gate
   visual no converge · el usuario pide explorar pantallas) — jamás se crea proyecto por defecto
   al arrancar. **Al CERRAR el ciclo, la publicación del consolidado es OBLIGATORIA** con su
   razón declarada: costo en minutos (bundle `design-sync/` versionado, publicación incremental,
   destino en `project.json`), activo estable entre ciclos y base de toda exploración futura —
   **y SIEMPRE después del gate ⭐⭐ corto** (que incluye el juicio de diseño): jamás se publica
   un sistema que el usuario no ha juzgado. La invocación es del usuario (§ Cierre de CICLO); si
   decide no invocarla, el summary lo registra como decisión suya. Las órdenes CITAN esta regla,
   no la re-redactan.
   **El gate de MIRADA (kit v1.20.0, método v1.21.0 — para TODO artefacto visual, en la etapa
   de diseño Y en los sprints):** el gate de FASE es de proceso y se pasa con «continúa»; el
   gate de MIRADA es otro gate y **solo se pasa con evidencia de que el usuario VIO**: un
   comentario que delate el archivo abierto, o su **«lo abrí y apruebo»** textual.
   **«Continúa» JAMÁS aprueba diseño.** Mecánica obligatoria del mensaje — claridad ante todo:
   la **PRIMERA línea** es una pregunta simple en español llano + el lugar
   («**¿Apruebas el design system? Ábrelo aquí: docs/diseno/kit.html (doble clic)**») — sin
   jerga del método, sin códigos; el resumen técnico va DESPUÉS. Si el usuario responde solo
   la palabra de fase sin comentar el artefacto: **DETENTE y repregunta «¿qué viste al
   abrirlo?»** antes de construir encima — esa negativa es la demo en rojo de este gate.
   AskUserQuestion/previews ASCII **no sustituyen la mirada**: si preguntas por chat sobre un
   artefacto visual, pide la respuesta con el archivo abierto y dilo. **Y cuando la mirada exige leer el HTML del
   preview (una meta, una cabecera, un script; kit v1.39.0, método v1.41.0), la mecánica es la PÁGINA GUARDADA
   (Cmd+S) y buscar en el archivo**, nunca «ver código fuente»: en Safari Cmd+Opt+U no hace nada sin el menú de
   desarrollo y el primer «no» puede ser falso *(Big-D S2, P4)*. Cada mirada queda
   **registrada** (README de diseño o bitácora) ANTES de la construcción siguiente — la
   planeadora lo audita en G-Diseño y al cierre; sin registro, el cierre queda condicionado.
   **Y el PLAN de miradas —número, agrupación y ORDEN— es parte del gate (kit v1.21.0):**
   cualquier cambio (agrupar, reordenar, posponer) se propone y el usuario lo aprueba ANTES de
   construir el segundo artefacto — jamás sobre la marcha. Cada desvío reduce las oportunidades
   de ver (dash S1: B6 sobrevivió a la mirada agrupada; dash S2: las 3 pantallas se
   construyeron antes de la primera mirada — «ninguna pidió ajustes» fue suerte, no proceso).
   *(Origen: Dash Agent AI, Etapa de Diseño 2026-08-16 — 4/9 pantallas construidas sin una
   mirada real con todos los gates de palabra cumplidos; 3ª ocurrencia de la clase. Es la
   regla 15-hermana del lado humano: una mirada satisfecha sin mirada es un gate que nunca
   ejecutó.)*
   **Dos clases de mirada (kit v1.31.0, método v1.33.0):** la de **FORMA** (qué se construye:
   estado nuevo, pantalla, estructura) abre parada antes de construir encima. La de **TEXTO**
   (si un copy se entiende) **no bloquea**: maquetas igual, registras «maquetado, no visto» y su
   veredicto viaja al gate humano del MVP; mientras, la vigilan los gates automáticos
   (diccionario fiel a la maqueta, fidelidad, maquetas que caben). Toda mirada va en **matriz
   de una fila** (archivo · botón/estado · qué mirar · respuesta esperada), nunca preguntas
   sueltas. **Las segundas vueltas no abren parada**: copy retocado por su propio veredicto y
   filas sin respuesta se aplican, se registran y se ven al cierre de fase. *(Angel Ghost S2:
   el usuario cortó las paradas de copy — «así no vamos a avanzar nada».)*
11. **Guía de prueba viva y ACUMULATIVA (`docs/GUIA-DE-PRUEBA.html`, OBLIGATORIA en todo sprint
   con UI — reglas duras del pipeline, G-Metodo 2026-07-12 ×2).** HTML visual y **AUTOCONTENIDO**
   (cero CDNs; casillas con `localStorage` bajo **prefijo versionado por sprint** — cambia en
   cada versión de la guía para que una regresión sin correr jamás aparezca marcada por el sprint
   anterior): **qué probar, cómo y qué resultado esperar**, por bloques. **Es bola de nieve:** la
   última versión contiene **TODAS las pruebas vigentes** de la app; el sprint N hereda ENTERAS
   las del N−1 — no las resume ni las comprime en un "verificar que sigue funcionando" (comprimir
   borra la regresión). Cada prueba lleva su **origen visible en su línea**: `Nuevo · SN` ·
   `Mejorado en SN` (hay que volver a mirarla) · `SN` a secas (heredada sin cambios ⇒ regresión),
   con **filtros por origen**. Una prueba solo se elimina cuando su feature dejó de existir, y se
   declara en el historial del pie. Y trae **DOS filtros de gate desde el sprint 1 (kit
   v1.18.0)**:
   - **⭐ Gate mínimo** — SOLO lo que ninguna automatización puede verificar (hardware/micrófono/
     voz reales, juicio humano sobre contenido, aprobación visual) MÁS la re-verificación de
     confianza que el usuario quiera hacer con sus manos aunque el CI ya la cubra. **Se OFRECE.**
   - **⭐⭐ Gate corto** — el subconjunto cuyo veredicto **solo puede ser humano**, con techo
     declarado (**~20 min**). Regla de selección: **si el CI lo verifica por otro camino, NO
     entra** — aunque viva en el ⭐ por buenas razones de confianza. Es un **recorrido caminable**
     (paradas «N de M» en el orden del documento, comprobando que la secuencia se camina),
     **declara cuántas ⭐ deja fuera y por qué** (ninguna se borra — un gate que se encoge sin
     decirlo se lee como «esto es todo lo que había»), y no mueve los conteos de los otros
     filtros: añade una lente, no reparte. **Es el que el cierre de ciclo EXIGE.** *(Origen: Velo
     llegó al cierre con 26 ⭐ / 90 min y el gate se aplazó indefinidamente — no falló el gate,
     falló su tamaño; con varias apps en curso, todo-o-nada pierde contra nada.)*
   La guía dice cuántas pruebas son y cuánto toman, en ambos gates. **Kit de prueba:** si un paso —o
   la app misma— requiere documento, código o dataset de prueba, se entrega en el repo
   (`docs/kit-de-prueba/`) enlazado desde su bloque, siempre que se pueda (precedente: los
   datasets de ds). Doble propósito: gate de prueba del usuario + entregable a usuarios finales.
   Plantilla base: la que estampa el kit (v1.6.0). **Implementación de referencia:
   `app-habla/docs/GUIA-DE-PRUEBA.html` (S2)** — 81 chips de origen, gate mínimo ⭐ de 14
   pruebas/~25 min con filtro, namespace versionado, historial de eliminaciones.
12. **PROHIBIDO entregar por artifacts de Claude o cualquier plataforma externa** (regla dura del
   pipeline, G-Metodo 2026-07-12). **Todo entregable** —guías, reportes, documentos visuales,
   resúmenes— es un **ARCHIVO DEL REPO** (HTML autocontenido o Markdown) que el usuario pueda
   **abrir, versionar y llevarse**. Sin excepciones, ni "para verlo rápido". Si algo merece
   mostrarse visualmente, se escribe como archivo y se entrega su ruta.
13. **Brochure vivo (`docs/BROCHURE.html` + ruta pública `/conoce` — molde v2, kit v1.10.0,
   informe del piloto habla 2026-08-08).** El entregable de PRESENTACIÓN de la app para
   usuarios finales y clientes — el anti-manual. **Tiene DOS estados (kit v1.19.0, método
   v1.20.0):** nace como **BROCHURE INICIAL** en el cierre DE CONSTRUCCIÓN del ciclo (declara
   visiblemente que es inicial y que se sella con las pruebas) y pasa a **BROCHURE SELLADO
   (MVP)** en el cierre DE PRUEBAS (tras el gate ⭐⭐ + correcciones). El sello NO lo congela:
   **todo sprint posterior que cambie features lo ajusta EN EL MISMO SPRINT** (DoD). Y junto al
   HTML se produce el **export estructurado `docs/brochure-export.json`** (schema versionado:
   tagline, intro, funcionalidades con el conteo del MANUAL, métricas reales, stack) — es lo que
   la vitrina de hoja-de-vida consume, anclado a versión, para re-expresarlo en SU design system.
   **REGLA CERO: el brochure NO se estampa, se
   PRODUCE** — antes de una línea de HTML, un **storyboard aprobado por el usuario** («guion
   aprobado»): escenas con mensaje/gramática/técnica justificada, **clímax explícito** (la
   promesa mayor de la app tiene escena propia, JAMÁS un acordeón del pie), ritmo, variante
   reduced-motion POR escena, dial `MOTION_INTENSITY` fijado con el usuario, identidad en una
   frase y un riesgo registrado. Las gramáticas se ejecutan con el **banco de técnicas en
   vanilla** (`docs/BROCHURE-banco-de-tecnicas.md` — sin recetas, "G3" degenera en fundido:
   el piloto lo demostró con un rechazo). Estructura de 4 capas + regla de conteo con **tabla
   de mapeo en el summary** (feature → sección del manual → tarjeta; el brochure no se
   documenta a sí mismo). Solo `transform`/`opacity` (excepciones DECLARADAS en storyboard y
   código) + presupuesto de recorrido móvil (~1 pantalla extra). A11y estructural:
   `<h3><button>` canónico · lo cerrado FUERA del árbol de accesibilidad (`visibility` en la
   transición; axe no lo ve — e2e por CDP) · LCP jamás nace de `opacity: 0`. **Gates que la
   CI no ve** (en el piloto la CI estuvo VERDE con un entregable RECHAZADO): pasada de
   capturas por bloque leídas como imagen (cuadro a cuadro en animaciones) antes de presentar
   · sala de proyección como proceso (fidelidad al producto real es criterio) · **e2e
   obligatorio de reduced-motion** (visibilidad real de elementos clave) · lo medible se
   corrige MIDIENDO contra la versión anterior · **última milla: el link de producción se
   prueba SIN sesión** y dominio + protección de deployment van al BLUEPRINT. Doble vida
   (ruta + archivo), vivo por sprint, iconos y señas del design system de la app (jamás
   emojis si el DS los prohíbe), cero datos personales. Fuentes: MANUAL-DE-USO + VISION (RO)
   + guías de prueba. Referencia: `app-habla/docs/BROCHURE.html` + su storyboard.
14. **Código primero, IA generativa después (regla dura del pipeline, G-Metodo 2026-07-12).**
   Esta app es una integración sólida entre IA y código, pero **toda funcionalidad nativa
   interna se resuelve PRIMERO con programación** — código, librerías, algoritmos deterministas —
   **antes de cualquier intención de acudir a IA generativa** (APIs o cualquier tipo de
   conexión). Activar una feature LLM exige un **ADR "código primero"** que justifique por qué
   el código y las librerías no alcanzan. La IA es acento con fallback determinista, jamás
   columna vertebral.
15. **Un gate se demuestra FALLANDO (regla dura del pipeline, G-Metodo 2026-08-10).** Todo gate
   nuevo que este repo agregue —job de CI, hook, aserción, umbral, script de verificación— nace
   con su **demo**: un cambio deliberado que lo pone en **rojo**, con el resultado (rojo → verde
   al revertir, y a quién nombró el fallo) registrado en
   `sprints/SPRINT_NNN-implementation-log.md`. Cuesta cinco minutos y es **la única evidencia
   real de que el gate funciona**: un gate que nunca se vio fallar no es un gate, es decorado —
   y decorado que da falsa tranquilidad (precedente: dos "todo bien" seguidos de una carnada
   floja de gitleaks, 2026-07-15; contraprecedente que sí lo hizo: PR desechable con `openai`
   → anti-IA en rojo en 7 s, Velo S1). La demo puede ir en un **PR desechable** que se cierra
   sin mergear; se registra igual. Aplica también al **verificar un gate heredado** cuando un
   sprint depende de él por primera vez. **La demo se corre con `scripts/demo-rojo.sh` (kit
   v1.35.0):** mutación literal → gate (debe fallar) → restauración desde UNA carpeta de respaldo
   verificada con `grep` y `cmp` → gate restaurado (debe pasar); `--puerto` mata el server viejo
   por puerto y comprueba que no quede `EADDRINUSE`. Y la **tercera pregunta** antes de darla por
   hecha: *¿puede fallar siquiera?* — un test de determinismo sin un miembro con azar no puede
   *(ds S5: K-S5-8/10/11)*. **Endurecido en v1.38.0 (ds S6, AU-S6-12 y K-S6-2/4/5):** `--debe-nombrar`
   exige que el rojo venga de la aserción (un servidor que no arrancó o una mutación que no compila no
   son rojos); un exit 126/127 no cuenta como rojo; `--minimo-tests N` rechaza un verde que corrió menos
   de N pruebas (un filtro `-t` que no coincide sale 0); una interrupción restaura antes de salir; y la
   presencia/ausencia de la mutación se verifica con Python, también cuando `--buscar` tiene varias líneas.
   **Y su hermana (kit v1.16.0): un gate que nunca EJECUTÓ tampoco es un gate.** `skipped` no es
   verde: un job con `needs:` sobre otro que falló queda saltado y GitHub lo lista entre los
   checks requeridos **sin alarma**, así que una columna sin rojo se lee como aprobación. Antes de
   cerrar, **cada check requerido debe tener conclusión propia `success`** (`gh pr checks`), y si
   uno corrió por primera vez en este PR se dice en el summary — sin histórico **no puede
   afirmarse ni regresión ni no-regresión**. Las dos reglas cubren la misma ilusión por lados
   opuestos: *¿lo viste **fallar** cuando debía?* y *¿lo viste **correr**, alguna vez?*.
   **Y el tercer filo (kit v1.21.0): ¿lo viste correr EN EL MODO en que el usuario lo va a
   usar?** Todo modo/perfil de arranque (p. ej. `start:seguro`) corre EN VIVO al menos una vez
   antes de cerrar el sprint que lo introduce o lo toca — pasar sus tests no es haber corrido
   *(dash S2: el modo endurecido existió dos sprints sin arrancar jamás de verdad; y el índice
   world-readable solo apareció inspeccionando el proceso vivo)*. Detalle
   operativo en `/deploy-check` §11. *(Origen: ds S4 — el job `lighthouse` estuvo `skipped` las 12
   corridas de la rama; el gate de performance no corrió ni una vez en un ciclo de 4 sprints
   mientras el DoD lo daba por verde con corridas locales.)*
   **Y el rojo nace en el MISMO commit que introduce el gate (kit v1.25.0), no al final de la
   fase:** una demo diferida deja al gate viviendo «verde» sin haber medido nada, y todo lo
   construido mientras tanto se apoyó en él *(hoja-de-vida S5: el test de deriva cero pasaba en
   verde con el bug puesto — afirmaba «se llega al fondo», que el defecto también cumplía; solo
   la demo en rojo, exigida al cierre de la fase, reveló la prueba decorativa)*. La demo es parte
   de la definición del gate, no un trámite posterior.
   **Y la tercera pregunta (kit v1.26.0): ¿puede este gate FALLAR siquiera?** Antes de
   escribirlo, comprueba que existe un estado del repo que lo pondría en rojo y que ninguna
   regla anterior lo hace inalcanzable (un schema que ya rechaza el caso, un test que ya lo
   cubre, un build que ya rompe antes). Si no puede fallar, no es un gate: se retira y se
   anota cuál regla lo cubría *(hoja-de-vida S7: un gate nuevo resultó inalcanzable por una
   regla previa y solo se descubrió al exigirle el rojo)*. Las tres preguntas, juntas: ¿lo
   viste **fallar**? · ¿lo viste **correr**? · ¿**puede** fallar?
   **Y el MODO incluye el PERFIL DE COMPILACIÓN (kit v1.28.0):** un test que solo corre en
   `debug` no prueba `release`. Todo gate que dependa del comportamiento del binario (pánicos
   atrapados, optimizaciones, `panic = "abort"`, features de compilación) corre al menos una
   vez con el perfil con que la app se DISTRIBUYE, y el summary lo dice *(Angel Ghost S1: el
   `catch_unwind` que protegía el parseo de PDF pasaba todos sus tests en debug y era letra
   muerta en release, donde `panic = "abort"` lo anula)*.
   **Y `gh pr checks` DESPUÉS DE CADA PUSH (kit v1.31.0), no al cierre de la fase:** un rojo
   que nadie mira es un gate que no ejecutó para ti *(Angel Ghost S2: tres corridas en rojo sin
   mirar en una fase; desde entonces cada push termina leyendo sus checks)*. **Y una métrica
   del kit que la CI NO puede medir se declara `manual` con su corrida local registrada**, o
   no se declara: el WER vivió dos sprints «en CI» sin que el runner tuviera modelos de voz.
16. **El bundle publicable del design system es un ARTEFACTO DEL REPO (kit v1.17.0).** `design-sync/`
   se versiona aquí como **espejo 1:1** de lo publicado en Claude Design, y la jerarquía es fija:
   `design-system.md` (fuente de verdad) → `design-sync/` (bundle, deriva) → el proyecto remoto
   (vitrina, **jamás se edita allá**). **Todo sprint que toque UI actualiza el bundle en su MISMO
   PR** — son archivos del repo, entran a la revisión y los escanea gitleaks como a todo lo demás;
   publicar puede esperar al cierre de ciclo, y así el cierre es un delta pequeño y nunca una
   reconstrucción. El destino se **lee** de `design-sync/project.json`, no se busca. Procedimiento
   completo: `/design-sync`. *(Origen: en el cierre H1 de ds el bundle se construyó en el
   scratchpad efímero; al retomar días después quedaban **4 de 13 archivos** y hubo que
   reconstruirlo bajando del proyecto remoto uno por uno. Un entregable de ciclo que vive fuera del
   repo no tiene versión, ni diff, ni revisión, ni supervivencia.)*

17-bis. **LO QUE LA APP ESCRIBE TAMBIÉN ES SUPERFICIE (kit v1.21.0 — derivados y arneses).**
   Las capas de solo-lectura protegen a las fuentes DE LA APP; esta regla protege a los
   DERIVADOS de todo lo demás. **(a) Un derivado JAMÁS nace menos privado que su fuente:**
   índice, cache, config, reporte o log que descienda de datos privados nace con permisos
   restrictivos (700/600 o equivalente), con test que se demostró en rojo y reparación al
   abrir si ya existía mal *(origen: dash S2 Correctivo 001 — el índice nacía 644 con prompts
   reales; 531 tests verdes no lo vieron)*. **(b) Todo arnés que pueda tocar fuentes arranca
   demostrando contra qué árbol corre** (capturas, fixtures, seeds): declara su árbol al
   arrancar y ABORTA si alcanza datos reales sin confirmación explícita — comprobar, no
   recordar *(origen: un server viejo en el puerto hizo que la pasada de capturas fotografiara
   transcripts reales)*. `/deploy-check` §12 verifica ambas.

17. **CERO ENLACES: la producción se MUESTRA, jamás se ENTREGA (regla dura del pipeline, F0 #8
   2026-08-15 — kit v1.19.0).** Ningún archivo de este repo público ni campo de GitHub publica la
   URL de producción o de previews: ni el `README.md` (apunta al brochure/`/conoce` como
   CONTENIDO, jamás como link de acceso publicado), ni el campo About/website del repo, ni el
   `BLUEPRINT.html` (documenta dominio y protección como "qué ve quién sin sesión" **sin escribir
   la URL** — la URL exacta vive en la planeadora, que es privada), ni el manual, ni la guía
   (su campo de URL se llena EN USO, desde la orden), ni `package.json`. El CTA público de la app
   es la **«lista de espera»** — sin promesa de otorgamiento. **El campo homepage del repo APUNTA AL PROPIO
   REPO (kit v1.32.1; antes «limpieza recurrente», v1.22.0):** la GitHub App de Vercel reescribe
   el campo solo cuando está VACÍO — con cualquier valor puesto deja de tocarlo (experiencia del
   usuario en otra app y en planlang). El estampador lo fija al crear el repo (`gh repo edit
   --homepage <url del repo>`); se verifica una vez tras el primer deploy de producción y en
   `/deploy-check`. JAMÁS se automatiza con un PAT de administración como secret en un repo público. Y **los documentos
   que NARRAN el barrido escriben los patrones sin el literal** (clase de carácter, p. ej.
   `vercel[.]app`): un summary que cita el patrón tal cual rompe el grep y el gate deja de ser
   binario. **El comando del barrido corre sobre TODOS los archivos versionados** (kit
   v1.23.0): `git grep -nE "vercel[.]app|workers[.]dev|pages[.]dev" -- ':!pnpm-lock.yaml'` —
   jamás con include-list de extensiones (la URL de producción de Innmobiliaria vivía en
   `wrangler.jsonc` y pasó limpiamente un gate con `--include`); el patrón de dominios sale del
   STACK REAL de la app (súmale su host si difiere). **Y todo comando que sea un gate viaja
   ENTRE BACKTICKS y se prueba copiándolo del RENDER (kit v1.24.0):** sin backticks el
   markdown come las barras invertidas y entrega un grep que no encuentra nada nunca — un
   gate muerto que pasa en verde para siempre. `/deploy-check` lo verifica
   (casilla de enlaces). *Origen: la vitrina de hoja-de-vida muestra QUÉ construyó el usuario
   (brochure + ficha del repo), nunca POR DÓNDE entrar.*
   **El barrido corre sobre el árbol que se va a subir — DESPUÉS del último `git add` (kit
   v1.26.0) — y vale también para código y comentarios de tests:** un barrido temprano deja
   ciega la ventana entre él y el push (los artefactos de `.lighthouseci/` entraron así al PR
   del S5 de hoja-de-vida con seis falsos positivos), y el comentario de un spec que cita el
   dominio de preview es una fuga igual que una URL en el README.
   **El README de diseño registra «preview del PR #N», jamás la URL (kit v1.32.0):** el registro
   de G-Diseño identifica dónde se aprobó por el número del PR cuyo preview recorrió el usuario; la
   URL exacta vive en la planeadora.

18. **PRs de dependencias: máximo DOS abiertos y el lockfile NO se pelea (kit v1.24.0 — regla
   del usuario 2026-08-22).** dependabot con techo real de 2 (limit 1 por ecosistema, todo
   agrupado — el yml del kit lo trae). Se mergean **DE A UNO, dejando a dependabot REGENERAR**
   entre merges (`@dependabot rebase` puede no obedecer, y el hand-merge del lockfile le rompe
   el parser: cerró un PR solo y abrió otro). Si un conflicto de lockfile TOCA resolverse a
   mano: la resolución **parte del lado que trae los bumps** y se verifica dependencia por
   dependencia que quedó la versión MÁS NUEVA de ambos lados — pnpm degrada en silencio y la
   CI pasa VERDE porque **ninguna puerta compara el resultado contra la INTENCIÓN del PR**:
   leer la salida del install ES el gate. `pnpm peers check` corre en quality (es lo único que
   ve un peer insatisfecho). Overrides: en `pnpm-workspace.yaml`, jamás en `package.json`.
   **Comprobación MECÁNICA (kit v1.32.0; falla CERRADO desde v1.35.0 — si no puede leer la rama
   base sale en rojo, no «se omite»; solo un repo cuya base no tiene lockfile pasa en verde con
   aviso):** `scripts/verificar-dependencias.mjs` compara las
   versiones de `pnpm-lock.yaml` del PR contra `origin/main` y falla si alguna quedó por debajo;
   corre en el job `quality` en cada PR. Leer la salida del install sigue siendo obligatorio; el
   script es la red que no depende de que alguien la lea.
   **Excepciones de auditoría (kit v1.34.0):** `pnpm audit --audit-level high` es gate y su nivel no se baja. Si una
   advisory alta o crítica **no tiene versión parcheada publicada** (GitHub la lista con `first_patched_version: null`),
   se ignora **solo esa advisory, por id**, en `pnpm-workspace.yaml` → `auditConfig.ignoreGhsas` (pnpm 11 ya no lee
   `pnpm.*` en `package.json`), con un **ADR en `decisions/`** que diga id, razón (ruta de la dependencia, si es solo de
   desarrollo), fecha y **condición de retiro**. El PR que traiga el parche borra la entrada y cierra el ADR. Una
   advisory CON parche nunca se excepciona: se sube la dependencia. *(HackGuard, estampado 2026-10-03: `braces` sin
   parche vía `eslint-config-next`.)*
   **Bajadas FORZADAS (kit v1.39.0, Big-D PR #6):** a veces el bump trae un paquete que **fija exacta** una versión
   más vieja que la de `main` (`vitest` 5.0.3 fija `why-is-node-running` 3.2.1; la 5.0.2 pedía `^3.2.1`). Esa bajada
   es la intención del PR, no pnpm degradando: `verificar-dependencias.mjs` la acepta **solo si algún paquete del
   lockfile del PR que usa esa versión la declara exacta en el registro** (`npm view`), y nombra cuál («bajada forzada
   aceptada porque vitest@5.0.3 la fija exacta»). Un rango que admite la versión de `main`, sin dependiente o sin
   registro, sigue en rojo; una degradación a propósito sigue declarándose en `degradaciones-permitidas.json`.
19. **Todo puente entre dos lenguajes exige su GATE DE CONTRATO, en el mismo sprint que lo
   cruza (kit v1.28.0).** Donde un dato cambia de lenguaje o de runtime —Rust→TS por eventos
   de Tauri, worker→UI por `postMessage`, servidor→cliente por JSON, Swift→Rust por FFI— la
   suite tiene que atravesar la costura: **el lado que EMITE escribe un fixture con su
   serializador real** (no un literal copiado a mano), **el lado que LEE lo declara con su
   tipo** (generado o validado con Zod contra ese fixture), y **al menos un test cruza la
   suscripción de punta a punta** (emitir → recibir → render). Un contrato tipado en cada
   orilla y ninguna prueba entre ellas no es un contrato: es dos suposiciones que coinciden
   hasta que no. *(Origen: Angel Ghost S1 — Rust serializaba el enum etiquetado por dentro y
   el webview lo leía etiquetado por fuera; la ficha automática nunca llegó a la banda y
   ninguno de los 153 tests verdes lo vio; lo cazó el auditor independiente. Tres defectos de
   la misma clase en un sprint.)* Patrón completo en la planeadora:
   `wiki/patterns/gate-de-contrato-entre-lenguajes.md` (RO).

21. **IA de construcción por suscripción (estándar 7-S, kit v1.30.0).** Si un agente o un lote de
    esta app usa la **suscripción del usuario** como proveedor de modelo (binario oficial de Claude Code en
    modo no interactivo): solo el binario sin modificar y la sesión propia del usuario · el token **jamás**
    entra a variables de entorno, trazas, LangSmith ni al repo · la invocación corre en un **directorio
    temporal limpio con MCP vacío** (esta constitución NO entra al prompt del agente) · los lotes se corren
    **fuera de CI**, pequeños y espaciados · existe un **ADR de cumplimiento** con la lectura de los términos
    vigentes, re-leídos antes de cada release, y un **interruptor a proveedor por clave** · prohibido exponer
    el patrón a terceros (para usuarios externos, siempre clave de API). *(Primera app: planlang; el spike
    de su F1 fijó los flags y el costo por llamada.)*
22. **Todo control dibujado tiene su script cargado, y una pasada de INTERACCIÓN lo demuestra (kit
    v1.32.0).** Un botón, un panel, una ficha o un conmutador que aparece en una maqueta o en una pantalla
    solo cuenta si su controlador está cargado y hace algo: (a) el gate `tests/unit/controladores-maqueta`
    (plantilla del kit; cada app lo endurece) falla si una página dibuja controles sin script o con un
    `src` que no existe; (b) **el arnés de capturas incluye una pasada de interacción**: activa cada
    control (abrir panel, cambiar tema, cambiar idioma, siguiente paso) y comprueba que ALGO cambió en el
    DOM o en la captura antes de darlo por bueno — una captura de un panel cerrado «mide bien» y no dice
    nada. *(Origen: Big-D, Etapa de Diseño — la ficha del nivel 2 no cargó su script desde la mirada 2 y
    cuatro miradas con capturas no lo vieron; lo cazó el auditor independiente.)* Y **el generador de la
    maqueta nace EN EL REPO desde la fase 0** de la Etapa de Diseño, con su gate de deriva byte a byte
    (regenerar = mismos bytes): un generador fuera del repo hace inauditable la regla 8 y deja la
    referencia sin fuente.
23. **Matriz de envejecimiento (kit v1.33.0, método v1.36.0).** Todo dato con **fecha de cambio de
    estado** (vigente → por revisar → vencido; publicado → archivado; suscripción activa → caducada) trae,
    **desde el sprint que lo introduce**, un gate que construye o dibuja la página **en cada fecha en que
    algo cambia de estado** (hoy, cada umbral, +100 días) y exige cero avisos. La fecha de consulta es una
    **perilla de build** (nunca el reloj), y la guía de prueba la usa para mostrar los estados. *(Origen:
    Big-D S1 — el atlas pasó todo en verde y se habría roto solo 27 días después, cuando el primer mapa
    pasaba a «por revisar»; lo vio un auditor, no una prueba. Un gate que solo mira hoy no ve lo que el
    calendario toca.)* **LCP por perfil:** si la app mide texto con una tabla de métricas (G15) y por eso
    sirve sus fuentes con `display: block`, el presupuesto de LCP es **3,0 s declarado por ADR** (estándares
    v2.17.0), con el subconjunto de las fuentes a su cobertura como deuda pagable.
24. **Las protecciones del sistema del usuario se enseñan ANTES de tocarlas (kit v1.36.0, método v1.38.0 —
    regla dura del pipeline).** Antes de crear, modificar o invocar algo que el sistema operativo protege
    —Llavero, permisos TCC, ítems de inicio o launchd, Touch ID, Automatización, cuentas, certificados—
    presentas una **matriz de una fila por acción: qué · para qué · qué aviso vas a ver · cómo se deshace** y
    esperas un «sí» por acción. Vale para scripts, tests, `/release-check` y cualquier comando que corras tú:
    si no sabes si pide permiso, se enseña. *(Origen: Angel Ghost S3 — un ítem de inicio «sh · desarrollador no
    identificado», seis contraseñas de administrador y un `cargo test` que abrió el micrófono.)*
    `/audita-sprint` lo pregunta (casilla 8). En apps que ya tienen esta regla con otro número, cítala por NOMBRE.
25. **El comando de pruebas por defecto no toca hardware ni permisos (kit v1.36.0).** `pnpm test`, `cargo test`,
    `pytest` a secas corren solo lo que no abre micrófono, cámara, audio del sistema, Llavero, red local ni
    diálogos del sistema. Lo que los toca va detrás de una marca explícita (`#[ignore]`, una *feature*, un
    `describe.skip` con `RUN_HARDWARE=1`) y lo corre la CI (`cargo test -- --include-ignored` en
    `build-escritorio`) o un comando nombrado en el README. Un verde que costó un aviso del sistema al usuario
    no es un verde.
    *Reglas 24 y 25 en HackGuard: **no aplican** (perfil estático web; ni la app ni sus pruebas tocan
    protecciones del sistema, hardware ni permisos). Se conservan por nombre para que la numeración siga la del
    kit; si un sprint llegara a tocarlas, aplican enteras.*
26. **Worktrees prohibidos (kit v1.37.0, regla del usuario 2026-09-27).** Todo el trabajo ocurre en el checkout
    principal `~/Code/app-hackguard`: nada de `git worktree` ni de `.claude/worktrees`. Un trabajo en paralelo (una
    etapa de diseño mientras corre un sprint sin pantalla) vive como archivos en este directorio y se comitea a su
    rama sin cambiar de rama (índice temporal); jamás `git stash` a secas sobre trabajo ajeno. *(planlang: la Etapa
    de Diseño y el S1 convivieron así; un worktree duplica el `node_modules`, pierde el `settings.local.json` y
    deja ramas que nadie cierra.)*
27. **La evidencia se escribe DESPUÉS del hecho (kit v1.38.0, método v1.40.0).** Una frase de evidencia en
    la bitácora, el summary o el PR —«leído como imagen», «N de N», «% de líneas», «medido con…», «en verde
    en la CI»— se escribe después de la corrida que la produce, con su cuenta tomada del resultado, nunca
    como plan en pasado. Es la hermana de «ninguna cifra sin procedencia»: una evidencia anticipada es una
    promesa disfrazada. La segunda pasada de la casilla 4 de `/audita-sprint` busca estas frases y exige la
    corrida que las sostiene *(ds S6: «leído como imagen» antes de leer, «36 de 36» que mezclaba anchos con
    altos y «93,24 % de líneas» que era la cifra de sentencias; se corrigieron porque alguien releyó)*.
    **Y la pasada de capturas cubre los extremos de magnitud** de cada dataset o contenido de ejemplo (el
    valor más grande y el más pequeño que la app puede mostrar: seis dígitos, ~1e-11, el texto más largo),
    no solo el ejemplo principal *(ds S6: los dos defectos del cierre vivían en el gráfico de precios)*.
    **Un spike de costos se corre con máquina quieta y carga registrada** (molde
    `docs/SPIKE-DE-COSTOS.plantilla.md`; se repite el lote si hubo carga) *(ds S6, K-S6-3)*.

## Estándares (los 6+1, gates en CI)

Testing · CI/CD · Observabilidad · Seguridad · Performance (contra `perf-budget.json`) · UX+A11y ·
**IA embebida responsable**. Detalle canónico: `estandares/estandares.md` de la planeadora
(read-only). Ítem rojo ⇒ deuda técnica explícita en el summary o el sprint no cierra.

## Workflow de un sprint

**Apertura** — el usuario trae la **orden de construcción** (`portafolio/<slug>/ordenes/SPRINT_NNN-orden.md`
de la planeadora). Léela entera + sus referencias (SPRINT_NNN.md, brief, prototipo READ-ONLY).
**Plan mode primero, siempre.** **La aprobación del plan NO arranca la construcción** (gate de
arranque, kit v1.6.2): tras aprobarse el plan, emite el bloque de arranque — tu recomendación de
**modelo y esfuerzo** para el sprint (el usuario los fija con `/model`) + espacio para sus
ajustes — y espera su **«construye»** explícito antes de tocar cualquier archivo.
Branch `sprint-NNN/<tema>`.

**Durante** — construye por fases (setup → motor → UI → integración → e2e). Mantén viva la bitácora
`sprints/SPRINT_NNN-implementation-log.md` (progreso, decisiones, bugs). ADRs en `decisions/` para
decisiones no anticipadas. `/self-review` tras cada bloque; `/run-tests` frecuente.
**Gate de FASE (kit v1.8.0): al terminar CADA fase DETENTE** — entrega el resumen completo de
la fase (qué se construyó, archivos, tests y resultados, criterio de fase completa,
desviaciones), recuerda al usuario que puede cambiar modelo/esfuerzo con `/model`, y espera su
**«continúa»** explícito antes de arrancar la siguiente fase. **Gate de FASE ≠ gate de
MIRADA (kit v1.20.0):** si la fase produjo un artefacto visual, «continúa» NO lo aprueba —
aplica la mecánica de mirada de la regla 10 (pregunta simple + lugar en la primera línea;
evidencia de archivo abierto o «lo abrí y apruebo»; sin eso, repregunta antes de construir
encima).

**Prototipo READ-ONLY** (si la orden referencia `referencias-ui/<slug>/` de la planeadora): extrae
paleta/tipografía/spacing/microcopy/patrones. ❌ No importes archivos, no copies código tal cual, no
uses su estructura de carpetas, no heredes sus gaps (testing/a11y/perf inexistentes).

**Cierre — auditoría OBLIGATORIA + summary OBLIGATORIO.** Al concluir la construcción (todas
las fases aprobadas): **corre `/audita-sprint`** (auditoría final de dos fases, método
v1.10.0 — Fase 1 solo-lectura con severidades y veredicto "listo para cierre"/"requiere
ajustes"; **el modelo poderoso audita y PLANEA los ajustes para que CUALQUIER modelo de menor
capacidad los ejecute**; Fase 2 solo tras aprobación del usuario) — ANTES de la guía/gate ⭐.
Luego, con la DoD completa: `/deploy-check` → genera `sprints/SPRINT_NNN-summary.md`
(plantilla abajo; **registra la auditoría: hallazgos y pagos**) → PR → gate ⭐ del usuario →
merge con CI verde. **El PR del sprint nace en borrador (`gh pr create --draft`) y su cuerpo EMPIEZA con la línea
del merge (kit v1.38.0, método v1.40.0):** «cuando esté verde: marca el PR listo, mergea con **squash** y
borra la rama; después corre `/cierre-sprint hackguard`» — la misma línea cierra el summary (sección fija
«Para mergear»). El merge lo hace el usuario; escrita solo al final de la orden no llegó al momento del
merge *(ds S6: dos PRs entraron como merge commit, uno al arrancar la fase 0)*. **El summary es CONDICIÓN DE MERGE (método v1.24.0): viaja DENTRO del PR
del sprint — un PR de sprint sin `SPRINT_NNN-summary.md` no se mergea.** Sin summary el sprint
es INVISIBLE para la planeadora (el S3 de Innmobiliaria lo estuvo UN MES) — y sin auditoría
registrada, el cierre queda condicionado. **Y si el sprint se mergea SIN completar sus fases,
el CORTE SE DECLARA EN EL MISMO ACTO (método v1.24.0):** en el PR y en el summary — qué fases
quedaron fuera y qué entregables arrastran; el corte silencioso arrastró 5 consecuencias
medibles.

**Cierre de CICLO — ocurre en DOS ACTOS (método v1.20.0; la orden declara cuando este sprint es
el ÚLTIMO del ciclo):** **Acto 1, DE CONSTRUCCIÓN** — el último sprint mergea con CI verde
(conclusión propia por check) + auditoría + contrapesos + BLUEPRINT; el gate del usuario aquí es
SOLO el storyboard + visual del **BROCHURE INICIAL** (regla 13 — llega por su orden de entrega).
**Acto 2, DE PRUEBAS (el sello MVP)** — cuando el usuario decida: gate **⭐⭐** → correcciones por
PR normal → **BROCHURE SELLADO** → `/design-sync`. **El ⭐⭐ condiciona el acto 2, no el 1**: no
retengas el merge ni el brochure inicial esperando el gate; y registra en el summary cuál acto
ocurrió — dos eventos, dos registros. Además de la DoD, el ciclo entrega (1) **`docs/BLUEPRINT.html`** — as-built
de TODA la infraestructura que soporta la app (plantilla `docs/BLUEPRINT.plantilla.html`: **HTML
autocontenido con diagrama SVG embebido** — jamás mermaid ni CDNs — + tabla por pieza + costo
real + punto único de falla), vivo y acumulativo entre ciclos;
y (2) el **design system publicado en Claude Design** con **`/design-sync`** — el comando está
estampado en este repo y su regla de reparto es (kit v1.18.0): **EL USUARIO INVOCA, TÚ EJECUTAS.**
La skill lleva `disable-model-invocation` — el disparador es del usuario, jamás lo lanzas tú —
pero la herramienta `DesignSync` sí es tuya: creas/verificas el proyecto, armas el bundle,
publicas. Lo reservado es el disparador, no el trabajo. Y **SIEMPRE después del gate ⭐⭐ corto**:
jamás se publica como activo estable un sistema que el usuario no ha juzgado. El punto de control
adicional es mecánico: `finalize_plan` le muestra al usuario la lista exacta de rutas y el
directorio de origen, independiente de lo que tú narres. Requisito previo: **el bundle
`design-sync/` del repo al día** (ver regla 16). Si el usuario decide NO invocarlo, el summary lo
registra como decisión suya explícita, no como olvido. Todo ciclo tiene MÍNIMO
3 sprints (regla dura 2026-07-17).

> **La regla llegó a su forma final equivocándose por mitades (v1.16.0 → v1.17.0 → v1.18.0):**
> v1.16.0 dijo *"lo corre EL USUARIO, no tú"* (verdad a medias: el disparador); v1.17.0 dijo *"lo
> corre TU sesión, la de la app"* (verdad a medias: el trabajo). Velo lo demostró ejecutándolo:
> el usuario escribió `/design-sync` y el constructor hizo todo — **el usuario invoca, el
> constructor ejecuta**. Se deja visible el camino a propósito.

**El gate ⭐ del cierre se corre POR BLOQUES, con arreglo en caliente (kit v1.16.0).** No entregues
la guía como una lista de 25+ pruebas para una sentada: el usuario recorre un bloque, tú corriges
lo que encontró **antes de que pase al siguiente**, y **el re-test de esa corrección es parte del
gate**. No es comodidad — es donde aparecen defectos que la primera pasada no puede ver. *(Origen:
ds S4, gate de 27 pruebas en 5 bloques: al re-verificar el arreglo del bloque C contra el proveedor
real apareció un segundo bug —`direction: null` hacía abortar la generación entera y la app caía a
plantilla **en silencio**— que un pase único habría enterrado.)* Registra en la bitácora, bloque a
bloque: resultado, ajustes aplicados en caliente y lo que va a backlog.

### Plantilla del summary

```markdown
---
sprint: NNN
app: <slug>
status: closed
opened: YYYY-MM-DD
closed: YYYY-MM-DD
branch: sprint-NNN/<tema>
pr: <link>
---
# Sprint NNN Summary — HackGuard
## Outcome            [¿Se logró el outcome del SPRINT_NNN.md? Sí/No/Parcial + 1 frase]
## Qué se construyó   [features/pantallas/componentes]
## DoD — checklist    [los 6+1 estándares, uno a uno, con evidencia breve]
## Métricas técnicas  [cumplidas vs. no, del SPRINT_NNN.md]
## Gate ⭐ — diferimiento y contrapesos  [kit v1.28.0 — sección FIJA; sin ella el diferimiento no es válido]
| Contrapeso | Evidencia (archivo, cuenta medida, corrida) |
|---|---|
| Pasada de capturas del builder | [N encuadres leídos como imagen · ruta · fecha] |
| e2e de `reduced-motion` | [N pruebas · archivo del spec · corrida en CI] |
[+ «⭐ diferido: N pruebas al acumulado del ciclo (S1: n₁ · S2: n₂…)» o «⭐ OBLIGATORIO corrido: parada a parada»]
## Decisiones no anticipadas  [ADR-NNN: resumen]
## Bugs + resoluciones
## Qué salió bien / qué generó fricción
## Sugerencias de mejora al método  [¿algo de metodo/metodo.md debería cambiar?]
## Deuda técnica aceptada  [qué, por qué, sprint de pago]
## Archivos clave (máx. 10) · ## Cómo probar
## Para mergear  [línea FIJA (kit v1.38.0): «marca el PR listo, mergea con SQUASH y borra la rama; después corre /cierre-sprint hackguard» — la hace el usuario]
```

## Patrones de dominio de esta app

- **Sobre de evidencia:** campos de § 6.7 de la especificación + los de E-8 (versión del adaptador,
  selector nativo, regla de veredicto aplicada, zona horaria, advertencias, `ejecutado_por`) y **tres
  huellas** (crudo · sobre canónico · resultado sin identificadores de corrida, E-9).
- **Adaptadores:** interfaz común en `src/engine/adaptadores/`; Garak lee `report.jsonl`/hitlog en el
  rango de versiones probado (spike: 0.17.0) y su umbral llega del paquete de ejecución; ZAP sin
  evidencia de ejecución y cobertura sugiere `no_ejecutada`, nunca `superada` (E-6, E-7).
- **Familia `modelo_decision`:** activo demo = clasificador determinista propio que imita el contrato de
  respuesta de Jev (distribución sobre opciones tipadas + estadístico derivado). Las pruebas miden
  probabilidades, no el estadístico; comparan contra la variación por re-ejecución; incluyen paridad
  ES/EN (E-17 a E-23). Jev real solo como segundo activo, con plan gratuito y su contrato citado.
- **Vista por control:** «evidencia organizada», separada del nivel de aseguramiento; cadena hallazgo →
  corrección → re-prueba visible (E-16).

## Idioma

Español en conversación y bitácoras. Inglés en código, commits, nombres y ADRs.

**Regla 20 — La app es BILINGÜE español/inglés en TODO desde el primer sprint (kit v1.29.0,
estándares 2.14.0 apartado 6-B, regla de la casa).** Interfaz, contenido, informes, documentos
generados, demo y ficha técnica. El dato nace como mapa de idioma `{ es, en }` (nunca un campo en un
idioma más una traducción aparte); **redactado, no traducido** (la traducción automática de contenido
de producto está prohibida); las pruebas de texto, capturas y e2e con texto corren en AMBOS idiomas;
conmutador visible desde la maqueta de la Etapa de Diseño.
