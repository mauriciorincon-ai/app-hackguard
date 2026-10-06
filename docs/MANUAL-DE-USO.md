# HackGuard — Manual de uso · User manual

> **Documento obligatorio y vivo.** Toda feature que llega a `main` se documenta aquí en el mismo sprint (regla 9
> del CLAUDE.md), en español y en inglés. Escrito para quien usa la app, no para quien la programa.
>
> **Mandatory, living document.** Every feature that reaches `main` is documented here in the same sprint, in
> Spanish and in English, for the people who use the app rather than the people who build it.

[Español](#español) · [English](#english)

---

## Español

### Qué es esta app

HackGuard ayuda a planear, gestionar y validar pruebas de seguridad para software y para sistemas de
inteligencia artificial. No ejecuta ninguna prueba: dice qué conviene verificar en un activo, con qué herramienta
y qué resultado se espera, y recibe los resultados como evidencia que una persona confirma. Su idea central es
que un hallazgo no es una vulnerabilidad: es evidencia de que un control falla.

En el Sprint 001 todavía no hay pantallas. Lo que existe es el **catálogo de pruebas como dato**, con sus
comandos para validarlo y fotografiarlo, y un **clasificador demo** para la familia de modelos de decisión.

### Primeros pasos

1. Necesitas Node 22.18 o posterior (el CLI usa el TypeScript nativo de Node) y pnpm.
2. En la carpeta del repositorio, instala lo necesario una vez: `pnpm install`.
3. Todos los comandos de este manual se escriben en una terminal abierta en esa carpeta.

### Features

#### El catálogo como dato · desde Sprint 001

- **Qué hace:** guarda en archivos, dentro de la carpeta `datos/`, todo lo que HackGuard sabe:
  - 38 pruebas en cuatro familias de activo: software, agente, modelo generativo y modelo de decisión;
  - 14 marcos de referencia con su versión, como OWASP LLM Top 10 2026, NIST AI RMF o MITRE ATLAS;
  - 38 controles del Anexo A de ISO/IEC 42001, resumidos con palabras propias;
  - 13 herramientas: 12 públicas, cada una con su versión verificada y su licencia, y `hackguard-revision`, la
    revisión documentada por una persona.

  Cada prueba dice qué verifica, por qué importa, con qué herramienta, qué resultado se espera, con qué regla
  se decide el veredicto y a qué activos aplica. Nunca dice cómo se ejecuta un ataque.

- **Cómo se usa:**
  1. **Validar el catálogo:** `pnpm catalogo:validar`. La primera línea dice el estado, con un código de salida
     que se lee con `echo $?`:

     | Estado                    | Qué significa                                 | Código |
     | ------------------------- | --------------------------------------------- | ------ |
     | «ok»                      | Nada que revisar                              | 0      |
     | «con advertencias»        | Es válido, pero algo pide atención            | 1      |
     | «inválido»                | Hay al menos un error                         | 2      |
     | Error de uso o de lectura | Faltó una opción o no se pudo leer un archivo | 3      |

     Debajo aparece cada hallazgo con su archivo, el campo, la regla que lo encontró y su explicación. Las marcas
     son ✗ para un error, ! para una advertencia y · para una nota.

  2. **Probar una prueba nueva antes de sumarla:** `pnpm catalogo:validar --agregar <archivo.json>`. El archivo
     se valida junto con el catálogo real, sin copiarlo a `datos/`.
  3. **Tomar una instantánea:** `pnpm catalogo:instantanea --fecha 2026-10-15`.
     - **Qué escribe:** un archivo en `datos/instantaneas/` cuyo nombre lleva la fecha y los primeros 12
       caracteres de su huella, una suma de comprobación SHA-256 del contenido. Con `--salida <carpeta>` se
       escribe en otra parte; para probar sin tocar el repositorio, agrega `--salida /tmp/hackguard`.
     - **Con una prueba de fuera:** `--agregar` exige `--salida` fuera de `datos/`, para que una prueba que no es
       del catálogo no termine en la carpeta versionada.
     - **Qué contiene:** las pruebas aprobadas, los marcos, controles y herramientas, y el semáforo de vigencia en
       esa fecha.
     - **Es reproducible:** la misma fecha y los mismos datos dan siempre la misma huella, en cualquier
       computador y en cualquier navegador.
  4. **Leer el semáforo de vigencia:** el informe de la instantánea cuenta cuántas pruebas, marcos, herramientas
     y familias hay en cada estado. Los días se cuentan desde la última verificación de cada uno:

     | Estado        | Desde cuándo     |
     | ------------- | ---------------- |
     | ✓ Vigente     | Menos de 30 días |
     | ! Por revisar | Desde 30 días    |
     | ✗ Vencido     | Desde 60 días    |

     Una familia está como su prueba más atrasada. Cada estado lleva siempre su marca y su nombre, nunca solo un
     color.

  5. **Otro idioma o una máquina:** todo comando acepta `--idioma en` para la salida en inglés y `--json` para
     una salida que lee otro programa.
  6. **Dónde vive cada cosa (`datos/`):**
     - `marcos/<id>.json`: un marco por archivo; `marcos/equivalencias/` guarda los mapas entre versiones.
     - `controles/iso42001-anexo-a.json`: la capa de controles por defecto.
     - `herramientas/<id>.json`: una herramienta por archivo.
     - `pruebas/<familia>/<id>.json`: una prueba por archivo, en la carpeta de su familia (`software`, `agente`,
       `modelo_generativo`, `modelo_decision`).
     - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` y
       `filtro/patrones.json`: los vocabularios.
     - `instantaneas/`: las escribe el comando; no se editan a mano.
     - `privado/`: evidencia de activos reales; git la ignora.

     El comando avisa de cualquier archivo de `datos/` que no lee (otra extensión o una carpeta mal escrita).

  7. **Agregar una prueba:**
     1. Copia `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, cámbiale el `id` y nombra el archivo igual que
        el `id`.
     2. Escribe en los dos idiomas qué verifica, por qué importa, con qué herramienta y qué se espera; nunca cómo se
        ejecuta un ataque.
     3. Valídala con `pnpm catalogo:validar --agregar <archivo>` hasta que no quede ningún ✗.
     4. Muévela a `datos/pruebas/<familia>/`.
  8. **Si el filtro la marca** (`filtro/marcada`), la prueba no entra a la instantánea hasta que una persona decida
     una de tres cosas:
     - **Reescribirla** para que deje de marcar.
     - **Retirarla:** `"estado_aprobacion": "retirada"`.
     - **Aprobarla:** `"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` y un bloque
       `revision` con la fecha, quién la revisó, la decisión en los dos idiomas y la huella del contenido revisado.
       La huella la da el validador: con `revisada_y_aprobada` y sin `revision`, el hallazgo
       `prueba/revision-sin-registro` dice «huella del contenido a revisar: …». Si el contenido cambia después,
       `prueba/revision-desactualizada` da la huella nueva.
- **Limitaciones conocidas:**
  - **Sin pantallas:** todavía no hay interfaz; llega en los sprints siguientes.
  - **Instantánea bloqueada:** si el catálogo es inválido, no se escribe nada (código 2).
  - **Fecha obligatoria:** la fecha de la instantánea es obligatoria y nunca se toma del reloj. Una fecha anterior
    a la última verificación del catálogo se rechaza (código 3).
  - **Controles sin contrastar:** los resúmenes del Anexo A no se han comparado con el texto de la norma; cada
    control lo declara («verificado contra la norma: no»).
  - **Software sin control:** las 10 pruebas de software todavía no dan evidencia a ningún control, porque el
    Anexo A gobierna sistemas de IA. Por eso el catálogo sale «con advertencias».
  - **El filtro de contenido marca, no decide:** marca para revisión el texto con forma de instrucción operativa.
    Una prueba marcada no entra a la instantánea hasta que una persona la revisa.
  - **Lo que el filtro no ve:**
    - **Lo que reconoce:** siete formas:
      - un bloque de código con intérprete;
      - un bloque de código sin lenguaje;
      - tres o más pasos numerados;
      - una cadena codificada larga;
      - una dirección con parámetros de inyección;
      - una etiqueta HTML activa;
      - un recorrido de ruta (`../../`).
    - **Lo que se le escapa:** una carga corta escrita como texto normal no tiene ninguna de esas formas, y no se
      marca. Por ejemplo, una comilla seguida de una condición, una instrucción maliciosa escrita como frase, un
      comando dentro de una línea o pasos en viñetas.
    - **El control es la persona:** que alguien lea cada prueba nueva.
  - **garak y ZAP con adaptador:** figuran con adaptador porque la especificación prevé que HackGuard lea sus
    informes. Esta versión no los lee: la marca dice para qué herramientas está previsto un lector.

#### El clasificador demo de la familia «modelo de decisión» · desde Sprint 001

- **Qué hace:** simula un modelo que decide, para que las pruebas de esa familia tengan algo que medir.
  - **El caso:** clasifica solicitudes inventadas de socios de una biblioteca: aprobar, rechazar o pasar a una
    persona, y si son urgentes.
  - **El formato:** imita el contrato de respuesta de Jev, de TypeSafe: una distribución de probabilidad sobre las
    opciones y un estadístico de confianza. Cómo se anidan las respuestas es decisión nuestra.
  - **Lo que mide:** las probabilidades, nunca la «confianza»:
    - exactitud;
    - error de Brier;
    - error de calibración (ECE);
    - errores cerca del umbral con que se aprobaría sin una persona;
    - cuánto cambia la decisión al repetir la misma petición;
    - la diferencia entre español e inglés.
- **Cómo se usa:** `pnpm clasificador:demo`, o `pnpm clasificador:demo --idioma en`, o `--json`.
  - **El conjunto:** 26 casos en `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`, con la política
    que decide la respuesta correcta de cada uno.
  - **La huella de las respuestas:** sale siempre la misma con los mismos datos.
- **Limitaciones conocidas:**
  - **No mide un modelo real:** no aprende, y el conjunto y el clasificador los escribió la misma persona. Las
    cifras demuestran que las métricas funcionan.
  - **Tiene tres defectos a propósito,** para que las métricas los encuentren:
    - entiende el inglés mejor que el español;
    - no entiende frases negadas;
    - favorece a los socios antiguos.

### Preguntas frecuentes

- **¿Por qué el catálogo sale «con advertencias» y no «ok»?** Por las 10 pruebas de software sin control. Es lo
  esperado hasta que exista una capa de controles de software.
- **Cambié un archivo de `datos/`, ¿qué hago?** Corre `pnpm catalogo:validar` y lee los hallazgos. Si cambiaste
  el contenido de una prueba y su fecha de verificación, su vigencia vuelve a empezar.

### Historial

| Sprint           | Features añadidas a este manual                                                           |
| ---------------- | ----------------------------------------------------------------------------------------- |
| 001 · 2026-10-04 | El catálogo como dato (validar, instantánea, semáforo de vigencia) · el clasificador demo |

---

## English

### What this app is

HackGuard helps plan, manage and validate security tests for software and for artificial intelligence systems.
It runs no tests itself: it says what is worth checking on an asset, with which tool and what result is expected,
and it takes in results as evidence that a person confirms. Its central idea is that a finding is not a
vulnerability: it is evidence that a control is failing.

Sprint 001 has no screens yet. What exists is the **test catalog as data**, with the commands to validate it and
take snapshots of it, and a **demo classifier** for the decision-model family.

### Getting started

1. You need Node 22.18 or later (the CLI uses Node's native TypeScript support) and pnpm.
2. In the repository folder, install what is needed once: `pnpm install`.
3. Every command in this manual is typed in a terminal opened in that folder.

### Features

#### The catalog as data · since Sprint 001

- **What it does:** it keeps everything HackGuard knows in files, inside the `datos/` folder:
  - 38 tests across four asset families: software, agent, generative model and decision model;
  - 14 reference frameworks with their version, such as OWASP LLM Top 10 2026, NIST AI RMF or MITRE ATLAS;
  - 38 controls from Annex A of ISO/IEC 42001, summarised in our own words;
  - 13 tools: 12 public ones, each with its verified version and its licence, and `hackguard-revision`, a review
    documented by a person.

  Each test says what it checks, why it matters, which tool to use, what result is expected, which rule decides
  the verdict and which assets it applies to. It never says how to carry out an attack.

- **How to use it:**
  1. **Validate the catalog:** `pnpm catalogo:validar --idioma en`. The first line gives the status, with an exit
     code you can read with `echo $?`:

     | Status              | What it means                                     | Code |
     | ------------------- | ------------------------------------------------- | ---- |
     | “ok”                | Nothing to review                                 | 0    |
     | “with warnings”     | It is valid, but something needs attention        | 1    |
     | “invalid”           | There is at least one error                       | 2    |
     | Usage or read error | An option was missing or a file could not be read | 3    |

     Below come the findings, each with its file, the field, the rule that found it and its explanation. The marks
     are ✗ for an error, ! for a warning and · for a note.

  2. **Try a new test before adding it:** `pnpm catalogo:validar --agregar <file.json>`. The file is validated
     together with the real catalog, without copying it into `datos/`.
  3. **Take a snapshot:** `pnpm catalogo:instantanea --fecha 2026-10-15 --idioma en`.
     - **What it writes:** a file in `datos/instantaneas/` whose name carries the date and the first 12 characters
       of its fingerprint, a SHA-256 checksum of the content. With `--salida <folder>` it goes somewhere else; to
       try it without touching the repository, add `--salida /tmp/hackguard`.
     - **With a test from outside:** `--agregar` requires `--salida` outside `datos/`, so a test that is not part
       of the catalog never lands in the versioned folder.
     - **What it holds:** the approved tests, the frameworks, controls and tools, and the freshness semaphore on
       that date.
     - **It is reproducible:** the same date and the same data always give the same fingerprint, on any computer
       and in any browser.
  4. **Read the freshness semaphore:** the snapshot report counts how many tests, frameworks, tools and families
     are in each state. Days are counted from each one's last verification:

     | State        | From when     |
     | ------------ | ------------- |
     | ✓ Current    | Under 30 days |
     | ! Review due | From 30 days  |
     | ✗ Overdue    | From 60 days  |

     A family takes the state of its most out-of-date test. Every state always shows its mark and its name, never
     colour alone.

  5. **Another language or a machine:** every command takes `--idioma en` for English output and `--json` for
     output another program reads.
  6. **Where everything lives (`datos/`):**
     - `marcos/<id>.json`: one framework per file; `marcos/equivalencias/` holds the maps between versions.
     - `controles/iso42001-anexo-a.json`: the default control layer.
     - `herramientas/<id>.json`: one tool per file.
     - `pruebas/<familia>/<id>.json`: one test per file, in its family's folder (`software`, `agente`,
       `modelo_generativo`, `modelo_decision`).
     - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` and
       `filtro/patrones.json`: the vocabularies.
     - `instantaneas/`: written by the command; never edited by hand.
     - `privado/`: evidence from real assets; git ignores it.

     The command warns about any file in `datos/` that it does not read (another extension, or a misspelt folder).

  7. **Add a test:**
     1. Copy `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, change its `id`, and name the file after the
        `id`.
     2. Write, in both languages, what it checks, why it matters, with which tool and what is expected; never how
        an attack is carried out.
     3. Validate it with `pnpm catalogo:validar --agregar <file>` until no ✗ is left.
     4. Move it to `datos/pruebas/<familia>/`.
  8. **If the filter flags it** (`filtro/marcada`), the test stays out of the snapshot until a person decides one
     of three things:
     - **Rewrite it** so that it is no longer flagged.
     - **Withdraw it:** `"estado_aprobacion": "retirada"`.
     - **Approve it:** `"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` and a
       `revision` block with the date, who reviewed it, the decision in both languages and the fingerprint of the
       reviewed content. The validator gives the fingerprint: with `revisada_y_aprobada` and no `revision`, the
       finding `prueba/revision-sin-registro` says “fingerprint of the content to review: …”. If the content
       changes later, `prueba/revision-desactualizada` gives the new one.
- **Known limitations:**
  - **No screens:** there is no interface yet; it arrives in the next sprints.
  - **Blocked snapshot:** if the catalog is invalid, nothing is written (code 2).
  - **Date required:** the snapshot date is required and is never taken from the clock. A date earlier than the
    catalog's latest verification is rejected (code 3).
  - **Controls not checked against the standard:** the Annex A summaries have not been compared with the text of
    the standard; each control says so (“verified against the standard: no”).
  - **Software tests without a control:** the 10 software tests do not yet give evidence to any control, because
    Annex A governs AI systems. That is why the catalog comes out “with warnings”.
  - **The content filter flags, it does not decide:** it flags text shaped like an operational instruction for
    review. A flagged test stays out of the snapshot until a person reviews it.
  - **What the filter does not see:**
    - **What it recognises:** seven shapes:
      - a code block for an interpreter;
      - a code block with no language;
      - three or more numbered steps;
      - a long encoded string;
      - a URL with injection parameters;
      - an active HTML tag;
      - path traversal (`../../`).
    - **What gets past it:** a short payload written as plain text has none of those shapes, and is not flagged.
      For example, a quote followed by a condition, a malicious instruction written as a sentence, a command
      inside a line, or steps as bullets.
    - **The control is a person:** someone reads each new test.
  - **garak and ZAP with an adapter:** they are listed with an adapter because the specification plans for
    HackGuard to read their reports. This version does not read them: the flag says which tools a reader is
    planned for.

#### The demo classifier for the “decision model” family · since Sprint 001

- **What it does:** it simulates a model that makes decisions, so the tests of that family have something to
  measure.
  - **The case:** it sorts made-up requests from library members: approve, reject or send to a person, and whether
    they are urgent.
  - **The format:** it imitates the response contract of Jev, from TypeSafe: a probability distribution over the
    options and a confidence statistic. How the answers are nested is our own choice.
  - **What is measured:** the probabilities, never the “confidence”:
    - accuracy;
    - Brier score;
    - calibration error (ECE);
    - errors near the threshold at which a request would be approved without a person;
    - how much the decision changes when the same request is repeated;
    - the gap between Spanish and English.
- **How to use it:** `pnpm clasificador:demo --idioma en`, or `--json`.
  - **The set:** 26 cases in `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`, with the policy that
    decides the right answer for each one.
  - **The response fingerprint:** it always comes out the same with the same data.
- **Known limitations:**
  - **It measures no real model:** it does not learn, and the same person wrote the set and the classifier. The
    figures show that the metrics work.
  - **It has three flaws on purpose,** so the metrics can find them:
    - it understands English better than Spanish;
    - it does not understand negated sentences;
    - it favours long-standing members.

### Frequently asked questions

- **Why does the catalog come out “with warnings” rather than “ok”?** Because of the 10 software tests without a
  control. That is expected until there is a layer of software controls.
- **I changed a file in `datos/`. What now?** Run `pnpm catalogo:validar` and read the findings. If you changed a
  test's content and its verification date, its freshness starts again.

### History

| Sprint           | Features added to this manual                                                       |
| ---------------- | ----------------------------------------------------------------------------------- |
| 001 · 2026-10-04 | The catalog as data (validate, snapshot, freshness semaphore) · the demo classifier |
