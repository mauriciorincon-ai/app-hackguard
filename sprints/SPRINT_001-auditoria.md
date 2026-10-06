# Sprint 001 — auditoría final (`/audita-sprint`)

**Estado:**

- **Fase 1:** completa; el usuario la aprobó el 2026-10-05 con «apruebo», con las cinco recomendaciones.
- **Fase 2:** correcciones pagadas el 2026-10-05.
  - **Pagados:** 53 de los 56 hallazgos: 52 en cuatro commits y AU-38 con el cuerpo del PR #8 al día.
    - Los que crean gates se vieron en rojo con `scripts/demo-rojo.sh`, salvo AU-11, que se vio en rojo con una
      simulación sin mutar archivos.
    - Las dos aserciones de AU-26 se demostraron en la segunda pasada.
    - El registro está en «Fase 2 de la auditoría» de `sprints/SPRINT_001-implementation-log.md`.
  - **Deuda declarada, con su registro hecho:**
    - AU-14 (al S2, nota en el ADR-003);
    - AU-20 (al S3, desviación en la bitácora);
    - AU-47 (decide la planeadora).
- **Segunda pasada:** la hizo otro auditor independiente el 2026-10-05 (anexo E). Encontró 5 medios y 7 bajos, y
  sus pagos están en «Segunda pasada» de la bitácora.

**Veredicto de la Fase 1: requiere ajustes.** No hubo ningún hallazgo crítico. Quitando duplicados quedaron **56
hallazgos: 7 altos, 21 medios y 28 bajos**.

## Cómo se auditó

El diff del sprint contra `main` tiene 169 archivos, así que la Fase 1 se partió por superficies (kit v1.38.0). Los cuatro auditores son independientes: ninguno construyó el sprint, y todos trabajaron en solo lectura (las mutaciones, en copias dentro del scratchpad).

| Auditor | Superficie                                                                                               | Altos · medios · bajos | Informe |
| ------- | -------------------------------------------------------------------------------------------------------- | ---------------------- | ------- |
| 1       | Alcance y textos                                                                                         | 2 · 8 · 8              | Anexo A |
| 2       | Hooks, privacidad, bilingüismo, guía y frontera de contenido                                             | 3 · 5 · 4              | Anexo B |
| 3       | Motor, contrato, gates y dependencias (cerró antes por la pausa del 2026-10-04)                          | 2 · 7 · 8              | Anexo C |
| 4       | Lo que el auditor 3 no alcanzó a revisar, más la casilla 4 (frases caducadas), que ninguno había corrido | 0 · 3 · 6                 | Anexo D |

**Cómo se lee el consolidado:**

- Cada hallazgo trae su auditor de origen.
- Cuando dos auditores encontraron lo mismo, se fusionó en una sola fila con la severidad mayor. El ajuste fusionado se escribe entero en la fila.
- En los demás, el ajuste ejecutable completo (archivo, línea, cambio exacto) está en el anexo que se cita. La fila lo resume.

## Decisiones del usuario

Estas cinco las decide el usuario; el resto del plan no tiene opciones.

1. **Los nombres y las licencias de los 14 marcos están escritos en un solo idioma** (AU-05).
   - **Corregirlo ahora (recomendado):** pasan a español e inglés.
     - Cuesta unos 30 minutos.
     - Cambian las huellas de la instantánea, así que se actualizan la guía (D1, D2, D5 y F1) y el ADR-002.
     - La instantánea del 2026-10-04 se conserva como registro histórico.
   - **Dejarlo como deuda del S2:** hoy no se toca. El S2 lo paga antes de la primera pantalla que muestre marcos.
2. **El filtro de contenido no ve una carga corta escrita dentro de una línea** (AU-06). Por ejemplo, una etiqueta `<script>` o una ruta con `../`.
   - **Documentarlo y sumar tres patrones de forma (recomendado):**
     - Los patrones nuevos son bloque de código sin lenguaje, etiqueta HTML activa y ruta con `../` repetido. Cada uno lleva su carnada inocua, su contraejemplo y su demo en rojo.
     - La lista de patrones que aprobaste en la fase 0 pasa de 4 a 7.
     - Lo que sigue sin verse, como una instrucción maliciosa escrita como frase normal, queda dicho en el manual y en la guía: el control es que una persona lea.
     - Cuesta unos 45 minutos.
   - **Solo documentarlo:** el manual y la guía dicen qué no ve, y los patrones se discuten en otro sprint. Cuesta unos 10 minutos.
3. **La prueba de que el hook bloquea un secreto nunca corre en la CI,** porque el servidor no tiene gitleaks (AU-11).
   - **Instalar gitleaks en la CI (recomendado):**
     - Misma versión que tu máquina, con verificación de la suma.
     - Una CI sin gitleaks pasa a salir en rojo en vez de saltarse la prueba.
     - Cuesta unos 20 minutos, y `quality` tarda unos segundos más.
   - **Declararla manual:** queda escrito que solo corre en tu máquina.
4. **La guía de prueba está solo en español** (AU-47).
   - **Dejarla en español y anotarlo para que decida la planeadora (recomendado):** la orden no lo pide, la guía es tu herramienta de gate y las apps hermanas lo resolvieron distinto.
   - **Hacerla bilingüe ahora:** cuesta entre una hora y hora y media (21 pruebas redactadas en inglés, más el conmutador).
5. **¿Las instantáneas que ya están en el repo se vuelven a validar con las reglas de hoy?** (AU-48)
   - **Sí, y la que quede inválida se reemplaza (recomendado):**
     - Una prueba nueva reconstruye cada instantánea guardada y le pasa el validador de hoy. Con eso, una edición a mano que la deje inválida sale en rojo.
     - Dos correcciones de este plan dejan inválida la del 2026-10-04: las licencias bilingües (AU-05) y CWE en las referencias secundarias (AU-51). Por eso se reemplaza en este mismo PR por una re-emitida con la fecha del pago.
     - Hoy no se pierde nada, porque ningún plan la cita todavía. Más adelante sí costaría.
     - El ADR-002 deja escrita la regla.
     - Cuesta unos 20 minutos.
   - **No:** solo se corrige el comentario de la prueba para que diga lo que mide, y el ADR-002 declara que las instantáneas guardadas no se revalidan. AU-51 queda a medias: se corrigen los datos, pero el validador no se amplía.

## Lo que no se puede pagar en este sprint (deuda declarada)

- **AU-14 · Estados que el motor emite sin etiqueta.**
  - **Cuáles son:** el motivo de las pruebas que esperan revisión y la familia sin pruebas publicadas.
  - **Por qué no se paga aquí:**
    - `datos/estados.json` tiene que ser idéntico a la maqueta (`tests/unit/catalogo/catalogo-real.test.ts:91-123`).
    - Este sprint tiene prohibido tocar `scripts/maqueta/`.
  - **Cuándo se paga:** en el S2, con la primera pantalla que muestre esos estados. Ahí cambian la maqueta y los datos juntos.
  - **Qué queda hoy:** la nota en el ADR-003 y la deuda en el summary.
- **AU-20 · § 11.2 (la escala de IA).**
  - **Qué pasó:** la orden la nombraba entre los insumos, pero ni el plan aprobado ni `SPRINT_001.md` la incluyen.
  - **Cómo se registra:** como desviación del plan en la bitácora y en el summary. El brief la asigna al S3 (C13).

## Hallazgos consolidados

### Altos

| ID    | Hallazgo                                                                                                                                                                                                                | Ubicación                                                                                                                                                                                                 | Ajuste                                                                                                                                                                                                                                                                                                        | Verificación                                                                                                                                                          | Origen |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AU-01 | **Las pruebas fechan contra el calendario.** Una entidad re-verificada después del 2026-10-15 rompe 13 pruebas. Con fechas de verificación separadas por más de 29 días, la matriz de envejecimiento ni siquiera carga. | `tests/unit/catalogo/envejecimiento.test.ts:35-46,55-58,125-140`; `instantanea.test.ts:13,60,80`; `informe.test.ts:124,162,169,180,192`; `cli.test.ts:96,113,137`; `tests/e2e/determinismo.spec.ts:19-21` | **Gate.** Fechas derivadas de la última verificación (`ULTIMA_VERIFICACION`, `FECHA_BASE` en `ayuda.ts`). En la matriz, filtrar las fechas anteriores a hoy y comparar pruebas, marcos y herramientas. En el e2e, las mismas fechas derivadas. Detalle en el anexo C, Alto 1.                                 | En una copia con `zap.json` en 2026-10-20 y `nuclei.json` en 2026-08-20, todo verde. `semaforo.ts:71` con `>` en vez de `>=` pone la matriz en rojo (`demo-rojo.sh`). | 3      |
| AU-02 | **El lint de determinismo del motor deja pasar** `crypto.randomUUID`, `globalThis.Date`, `navigator` e `import()` dinámico.                                                                                             | `eslint.config.mjs:26-53`                                                                                                                                                                                 | **Gate.** `navigator`, `window`, `self`, `document` y `location` pasan a `no-restricted-globals`, y se agrega `no-restricted-syntax` con los 4 selectores del anexo C, Alto 2.                                                                                                                                | Una sonda de 8 líneas da 7 errores; `globalThis.crypto.subtle` pasa. `eslint src/engine src/cli` queda limpio. Demo con `crypto.randomUUID()` en `huella.ts`.         | 3      |
| AU-03 | **La tabla de marcos aprobada en la parada 1 no está en ningún archivo,** y la guía manda a confirmarla en un documento que no la tiene.                                                                                | `docs/GUIA-DE-PRUEBA.html:199-209,228`; `docs/LICENCIAS-DE-MARCOS.md:22-33`                                                                                                                               | Sección «Marcos con versión y fuente (DA-01)», con 14 filas en español y 14 en inglés, sacadas de los datos. La guía, línea 201, nombra las dos tablas. Detalle en el anexo A, A1.                                                                                                                            | Las filas de tabla suben en 28, y cada versión y HTTP coincide con `datos/marcos/<id>.json`.                                                                          | 1      |
| AU-04 | **Al manual le faltan 3 de los 5 contenidos de la DoD:** la estructura de `datos/`, cómo se agrega una prueba y cómo se registra la decisión de revisión.                                                               | `docs/MANUAL-DE-USO.md:33-92` (es), `:155-213` (en)                                                                                                                                                       | El texto del anexo A, A2, más su versión en inglés redactada. Lleva el paso de la huella a registrar que agrega AU-13.                                                                                                                                                                                        | `grep -c "datos/pruebas/<familia>\|revisada_y_aprobada"` da 4 o más.                                                                                                  | 1      |
| AU-05 | **Los nombres y las licencias de los marcos están en un solo idioma,** y el esquema lo permite.                                                                                                                         | `src/engine/catalogo/esquemas.ts:81,97`; 11 archivos de `datos/marcos/`                                                                                                                                   | Según la decisión 1. Si es «ahora»: `licencia.nombre` pasa a `Texto`; se convierten los 14 archivos; se quitan las glosas de `nombre` y se llevan a `notas`; un invariante nuevo en `catalogo-real.test.ts` con su demo; y se actualizan las huellas de la guía y del ADR-002. Detalle en el anexo B, Alto 1. | El script del anexo devuelve `[]`, y `catalogo:validar` sale 1 con las mismas 10 advertencias y 4 notas.                                                              | 2      |
| AU-06 | **El filtro no ve las cargas escritas en línea,** y la parada 2 lo presenta como prueba de que nada operativo pasó.                                                                                                     | `datos/filtro/patrones.json`; `docs/GUIA-DE-PRUEBA.html:210-215`; `docs/MANUAL-DE-USO.md:91,212`                                                                                                          | Según la decisión 2. Siempre: «Lo que el filtro no ve» en el manual (es y en) y una línea en la guía a2. Si se elige agregar los tres patrones: carnada, contraejemplo y demo en rojo de cada uno, comprobando que no marcan ninguna de las 38 pruebas. Detalle en el anexo B, Alto 2.                        | `grep -n "Lo que el filtro no ve"` y `"What the filter does not see"` dan 1 línea cada uno. Con los patrones, `catalogo:validar` sigue con 0 marcadas.                | 2      |
| AU-07 | **Los errores del clasificador demo mezclan idiomas** y no respetan `--idioma`.                                                                                                                                         | `src/engine/demo/conjunto.ts:172-174`; `clasificador.ts:260-263`; `src/cli/clasificador-demo.ts:35`                                                                                                       | Mensajes bilingües con la ruta y el código de Zod, `readFileSync` envuelto, y las pruebas actualizadas. Detalle en el anexo B, Alto 3.                                                                                                                                                                        | Con `repeticiones: 1` y `--idioma en`, la salida es «invalid set at parametros.repeticiones (too_small)» y el código, 3.                                              | 2      |

### Medios

| ID    | Hallazgo                                                                                                                                           | Ubicación                                                                                | Ajuste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Verificación                                                                                                                            | Origen                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| AU-08 | **Ninguna prueba falla si el orden de entrada cambia la huella.**                                                                                  | `tests/unit/catalogo/instantanea.test.ts:66-76`; `validar.test.ts:711-723`               | **Gate.** Agregar la prueba «catálogo real con cada lista invertida, misma huella», con la `FECHA` derivada de AU-01. Detalle en el anexo C, Medio 1.                                                                                                                                                                                                                                                                                                                                                                                                                                | Pasa sobre el código real y falla al mutar `validar.ts:905` (orden de entrada).                                                         | 3                        |
| AU-09 | **«El manifiesto nombra cada semilla» no puede fallar.**                                                                                           | `tests/unit/instrumento/semillas-del-catalogo.test.ts:96-105`                            | **Gate.** Comparar el manifiesto con `readdirSync` de la carpeta. Detalle en el anexo C, Medio 2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Con una `SEMILLA-HUERFANA.json`, rojo.                                                                                                  | 3                        |
| AU-10 | **La prueba del hook no cubre «falta solo una herramienta».**                                                                                      | `.claude/settings.json:12`; `tests/unit/hook-secretos.test.ts:48-73`                     | **Gate.** Dos pruebas: con jq pero sin gitleaks, y con gitleaks pero sin jq. Detalle en el anexo B, Medio 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Cambiar `\|\|` por `&&` en el hook pone las dos en rojo (`demo-rojo.sh`). Después, 5 de 5.                                              | 2                        |
| AU-11 | **La prueba de la carnada nunca corre en la CI.**                                                                                                  | `tests/unit/hook-secretos.test.ts:62`; `.github/workflows/ci.yml:33`                     | **Gate.** Según la decisión 3. Si se elige «instalar»: gitleaks 8.30.1 con `sha256sum -c` en `quality`, y `runIf(hayHerramientas \|\| process.env.CI === "true")`. Detalle en el anexo B, Medio 2.                                                                                                                                                                                                                                                                                                                                                                                   | En el log de la CI, `hook-secretos.test.ts (3 tests)` sin «skipped». Demo: `CI=true` con un PATH sin gitleaks da rojo.                  | 2                        |
| AU-12 | **`instantanea --agregar` publica una prueba de fuera** en `datos/instantaneas/`, versionada, con la ruta de la máquina dentro.                    | `src/cli/catalogo.ts:76-90`; `src/cli/cargar.ts:67`; `docs/MANUAL-DE-USO.md:60,182`      | **Fusionado, y es gate.** Tres cambios:<br>(1) En `catalogo.ts`, si `instantanea` trae `--agregar`, exige `--salida` fuera de `datos/` (`path.resolve` contra `datos`, con el prefijo y `path.sep`). Si no, `ErrorDeUso` bilingüe.<br>(2) En `cargar.ts:67`, un archivo agregado fuera de la raíz entra con la ruta `agregado/<nombre>`.<br>(3) Dos casos en `cli.test.ts`: sin `--salida` sale 3 y `datos/instantaneas` no cambia; un externo deja `ruta` = `agregado/<nombre>`.<br>Además, en el manual, «para probar sin tocar el repositorio, agrega `--salida /tmp/hackguard`». | Después del caso (a), `git status --porcelain datos/instantaneas` sale vacío. Demo en rojo de los dos casos.                            | 2 y 3 (y el anexo A, B4) |
| AU-13 | **`revision.huella` no tiene productor:** nadie puede aprobar una prueba marcada sin escribir código.                                              | `src/engine/catalogo/validar.ts:453-464,1110-1137`                                       | **Fusionado.** Calcular `huellaActual` una sola vez y pasar como detalle `t("huella del contenido a revisar: …", "fingerprint of the content to review: …")` en `prueba/revision-sin-registro` y en `prueba/revision-desactualizada`. Las pruebas de esas dos reglas exigen la huella en el detalle. El manual lo explica dentro de AU-04.                                                                                                                                                                                                                                           | `catalogo:validar --agregar <semilla revisada_y_aprobada sin revision>` imprime los 64 hex. La instantánea oficial no cambia de huella. | 1 y 3                    |
| AU-14 | **Estados que el motor emite sin etiqueta:** `pendientes_de_revision[].motivo` y la familia con `estado: null`, que la terminal imprime sin marca. | `src/engine/catalogo/instantanea.ts:34`; `semaforo.ts:19-23,41-43`; `informe.ts:153-160` | **Deuda del S2,** porque no se puede pagar aquí (ver arriba). Se agrega una consecuencia en el ADR-003 (anexo C, Medio 5) y la deuda en el summary.                                                                                                                                                                                                                                                                                                                                                                                                                                  | `grep -n "pendiente_de_revision" decisions/003-*.md sprints/SPRINT_001-summary.md` da resultados.                                       | 2 y 3                    |
| AU-15 | **El e2e de determinismo corre con reintentos en la CI,** así que una divergencia intermitente sale «flaky» en verde.                              | `playwright.config.ts:14`; `tests/e2e/determinismo.spec.ts:46`                           | **Gate.** `test.describe.configure({ mode: "serial", retries: 0 })`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `grep -n "retries: 0"`. Demo: un contador que cambia el formato una llamada sí y otra no da rojo, no flaky.                             | 3                        |
| AU-16 | **Los selectores de Garak y ZAP están cableados en el esquema del núcleo.**                                                                        | `src/engine/catalogo/esquemas.ts:326-331,374-388`                                        | Un comentario con la razón sobre `TIPOS_DE_SELECTOR`, la misma frase en el ADR-002 y la tarea anotada para el S3 (mover los selectores a `src/engine/adaptadores/<id>/`).                                                                                                                                                                                                                                                                                                                                                                                                            | `grep -n "Un adaptador trae su selector"` encuentra el código y el ADR.                                                                 | 3                        |
| AU-17 | **`LICENCIAS-DE-MARCOS.md` dice que el HTTP de cada licencia está registrado,** y no lo está.                                                      | `docs/LICENCIAS-DE-MARCOS.md:3,7`                                                        | Reescribirlo tal como dice el anexo A, M2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `grep -n "URL de cada licencia"` no da resultados.                                                                                      | 1                        |
| AU-18 | **Las atribuciones no cumplen lo que cada licencia exige.**                                                                                        | `docs/LICENCIAS-DE-MARCOS.md:37,49-53`; `datos/marcos/lista-decision-14.json`            | Los autores de arXiv:2609.32160, leídos con `curl` y no supuestos; las citas de NIST con título, número y DOI; y la URL de cada obra de OWASP. Detalle en el anexo A, M3.                                                                                                                                                                                                                                                                                                                                                                                                            | Las tres atribuciones llevan autor, DOI o URL de la obra.                                                                               | 1                        |
| AU-19 | **La guía dice que la CI respalda los bloques B a F,** pero E3 es un juicio humano que no está declarado.                                          | `docs/GUIA-DE-PRUEBA.html:170-172,333-338`                                               | Agregar la frase del anexo A, M4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `grep -c "excepción es E3"` da 1.                                                                                                       | 1                        |
| AU-20 | **§ 11.2 (la escala de IA) no se hizo ni se declaró.**                                                                                             | `SPRINT_001-orden.md:56-57` (planeadora)                                                 | Una «Desviación del plan» en la bitácora y en el summary, con el texto del anexo A, M5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `grep -n "11.2"` en la bitácora da 1 o más.                                                                                             | 1                        |
| AU-21 | **La bitácora lista 3 campos `por_verificar`; los datos tienen 4.**                                                                                | `sprints/SPRINT_001-implementation-log.md:85-88,133`                                     | Después de AU-52 (la fecha de CWE ya consta en su archivo), los datos quedan con 3 campos en 2 marcos. La bitácora lista exactamente esos: fecha y fuente de ISO/IEC 42001, y fecha de OWASP Top 10.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `catalogo:validar \| grep -c marco/por-verificar` da 3, igual que las viñetas.                                                          | 1                        |
| AU-22 | **El CLI exige Node 22.18 o posterior;** el manual dice 22 y no hay `engines`.                                                                     | `docs/MANUAL-DE-USO.md:27,149`; `package.json`                                           | **Fusionado.** El manual pasa a decir «Node 22.18 o posterior (el CLI usa el TypeScript nativo de Node)» en los dos idiomas, y `package.json` agrega `"engines": { "node": ">=22.18" }`.                                                                                                                                                                                                                                                                                                                                                                                             | `node -p process.features.typescript` da `strip`. `pnpm install` no avisa.                                                              | 1 y 3                    |
| AU-23 | **`semillas.json` espera «ok» para la semilla de referencia,** pero su propio comando da «con advertencias».                                       | `docs/kit-de-prueba/semillas/semillas.json:6-19`                                         | Aclarar `como_correr` en es y en (anexo A, M8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `tests/unit/instrumento` sigue 22 de 22.                                                                                                | 1                        |
| AU-24 | **La guía tiene un contraste de 4,44:1** en las celdas de valor del tema claro.                                                                    | `docs/GUIA-DE-PRUEBA.html:74,146`                                                        | `--ok: #477043` en el `:root` claro.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | axe wcag2aa en tema claro: 0 violaciones en los tres motores.                                                                           | 2                        |
| AU-25 | **D1 de la guía cuenta archivos sin decir desde qué estado parte.**                                                                                | `docs/GUIA-DE-PRUEBA.html:290-295`                                                       | D1 escribe en su propia carpeta, `/tmp/hackguard-d1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Correr D1, D2, D5 y otra vez D1: `ls /tmp/hackguard-d1 \| wc -l` da 1.                                                                  | 2                        |
| AU-48 | **Nada vuelve a validar las instantáneas guardadas.** La prueba solo mide que el archivo sea coherente consigo mismo: una editada a mano con la huella recalculada pasa. | `tests/unit/catalogo/instantaneas-versionadas.test.ts:1-5,27-40` | **Gate.** Según la decisión 5. Si es «sí»: `reconstruir()` más la prueba `it.each` del anexo D (M4-1), la cabecera reescrita y la regla en el ADR-002. La instantánea inválida se re-emite en el mismo PR. | 3 de 3 en verde. `demo-rojo.sh` sobre el id de `PR-IA-PINJ-001` nombra «pasa hoy el validador». | 4 |
| AU-49 | **`metricas.test.ts` tiene tres afirmaciones que no pueden fallar:** Brier sin ordenar por id, Brier sin ordenar las opciones y los bordes superior y del umbral de la banda. | `tests/unit/modelo-decision/metricas.test.ts:67-74,123-134` | **Gate.** Los casos del anexo D, M4-2: tres predicciones cuyo orden cambia la suma, tres opciones, y los bordes 0,8 y 0,7 de la banda. Lo esperado pasa a `{ n: 6, cuenta: 3, tasa: 0.5 }`. | Las 4 mutaciones de la tabla del anexo D salen en rojo (`demo-rojo.sh`, `--minimo-tests 19`). | 4 |
| AU-50 | **`fecha.test.ts` no detecta una tabla de meses de 30 días equivocada:** sin junio, septiembre o noviembre, la suite entera sigue en verde. | `tests/unit/catalogo/fecha.test.ts:24-38,104`; `src/engine/fecha.ts:16` | **Gate.** Agregar `2026-06-31`, `2026-09-31`, `2026-11-31` y `2026-01-32` como fechas inválidas, y corregir el título («cada séptimo día»). | Cada una de las tres mutaciones de `[4, 6, 9, 11]` cae nombrando su fecha (`--minimo-tests 45`). | 4 |

### Bajos

| ID    | Hallazgo                                                                                                                                       | Ubicación                                                                                               | Ajuste                                                                                                                                                           | Origen |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AU-26 | **Las aserciones «otra fecha, otra huella» las cumple también el defecto.**                                                                    | `tests/e2e/determinismo.spec.ts:147`; `envejecimiento.test.ts:135-137`; `instantanea.test.ts:78-84`     | En el e2e, devolver los estados y afirmar `por_revisar` en el umbral. En las pruebas unitarias, quitar la aserción de huella. Anexo C, Bajo 1.                   | 3      |
| AU-27 | **Las probabilidades no suman 1 exacto en coma flotante,** y `margen` sale con ruido.                                                          | `src/engine/demo/clasificador.ts:3,8`; `conjunto.ts:261`; ADR-004:32; bitácora:510-511                  | Reescribir el texto («10 000 diezmilésimos…»), agregar una prueba con tolerancia de 1e-12 y redondear `margen` en diezmilésimos. Anexo C, Bajo 2.                | 3      |
| AU-28 | **Las cardinalidades del catálogo están cableadas en las pruebas.**                                                                            | `instantanea.test.ts:43-51`; `informe.test.ts:41,83,130,136-138,154,172,175`; `validar.test.ts:694-708` | Sacar las cifras de `catalogoBase()`. Anexo C, Bajo 3.                                                                                                           | 3      |
| AU-29 | **`erasableSyntaxOnly` no está activado.**                                                                                                     | `tsconfig.json`                                                                                         | `"erasableSyntaxOnly": true`; un `enum` en el motor tiene que dar TS1294.                                                                                        | 3      |
| AU-30 | **`huellaDeInstantanea` elige los campos a mano.**                                                                                             | `src/engine/catalogo/instantanea.ts:60-79`                                                              | Usar desestructuración `{ huella, ...cuerpo }`. Anexo C, Bajo 6.                                                                                                 | 3      |
| AU-31 | **La rama hexadecimal del patrón `cadena-codificada-larga` es código muerto.**                                                                 | `datos/filtro/patrones.json:61`                                                                         | Dejar solo la rama base64 y reescribir `por_que`. Anexo C, Bajo 7.                                                                                               | 3      |
| AU-32 | **El informe del demo no muestra la advertencia del conjunto.**                                                                                | `src/engine/demo/conjunto.ts:284-365`                                                                   | Imprimir `advertencia[idioma]` después de la huella.                                                                                                             | 3      |
| AU-33 | **La salida en inglés trae identificadores en español** (opciones del demo, nombre del patrón, `--fecha AAAA-MM-DD`, `--agregar` inexistente). | `conjunto.ts:333,351`; `validar.ts:900,926,1146`; `src/cli/catalogo.ts:65,79`                           | El nombre `{es,en}` del patrón, glosas en el informe en inglés y `ErrorDeUso` bilingüe. Anexo B, Bajo 1.                                                         | 2      |
| AU-34 | **El tiempo de `catalogo:validar` no está medido.**                                                                                            | Bitácora, fase 4                                                                                        | Medir los tres comandos con la máquina quieta y registrar el rango.                                                                                              | 1      |
| AU-35 | **La corrección `0a8228a` no está en la bitácora.**                                                                                            | Bitácora, fase 4                                                                                        | Abrir la sección «Bugs y resoluciones» de la fase 4.                                                                                                             | 1      |
| AU-36 | **`PR-MD-DER-001` es `emergente` sin declararlo frente a E-23.**                                                                               | `datos/pruebas/modelo_decision/PR-MD-DER-001.json:64`; `decisions/004-…md:22-23`                        | Agregar la frase del anexo A, B3, al ADR-004.                                                                                                                    | 1      |
| AU-37 | **El manual tiene tres afirmaciones inexactas:** 13 herramientas «verificadas», «el mismo formato que Jev» y el ejemplo sin `--salida`.        | `docs/MANUAL-DE-USO.md:39/161,99/221,60/182`                                                            | Reescribir según el anexo A, B4. El ejemplo sin `--salida` se cubre en AU-12.                                                                                    | 1      |
| AU-38 | **El cuerpo del PR #8 quedó en la fase 0.**                                                                                                    | PR #8                                                                                                   | Hacer `gh pr edit 8 --body-file` al cierre.                                                                                                                      | 1      |
| AU-39 | **Hay cuatro textos desfasados en la constitución y los comandos.**                                                                            | `CLAUDE.md:11,81,96,110-119`; `.claude/commands/plan-sprint.md:74`                                      | Aplicar (a) a (c) del anexo A, B6. (d) se registra como K-S1-4, sin editar la regla.                                                                             | 1      |
| AU-40 | **El ADR-002 describe mal lo que contiene la instantánea.**                                                                                    | `decisions/002-…md:38-39`                                                                               | Usar el texto del anexo A, B7.                                                                                                                                   | 1      |
| AU-41 | **La cita del usuario no coincide entre la guía y la bitácora.**                                                                               | `docs/GUIA-DE-PRUEBA.html:203-204`; bitácora:132                                                        | **Fusionado.** Verificado contra la transcripción: el usuario escribió «Aprobados lo marcos, continua» (2026-10-04, 23:08 UTC). La guía ya lo cita bien; la bitácora:132 pasa a esa cita con «(sic)».                             | 1 y 2  |
| AU-42 | **E2 de la guía cita una línea que el programa no imprime.**                                                                                   | `docs/GUIA-DE-PRUEBA.html` (E2)                                                                         | Escribir «la fila "accuracy" con 20 of 26 y 25 of 26».                                                                                                           | 1      |
| AU-43 | **«Es la más barata de la familia» no tiene sustento.**                                                                                        | `datos/pruebas/modelo_decision/PR-MD-COH-001.json:14-15`                                                | Usar el texto del anexo A, B8(c). Cambia la huella: se hace junto con AU-05 y AU-44.                                                                             | 1      |
| AU-44 | **Ninguna prueba compara las huellas que cita la guía con las del motor.**                                                                     | `docs/GUIA-DE-PRUEBA.html` (D1, D2, D5 y F1); ADR-002                                                   | **Gate.** Una prueba que extrae las huellas de 64 hex de la guía y las compara con `construirInstantanea` en esas fechas. D5 se redacta como registro histórico. Además, `conjunto.test.ts:66` fija `huella_de_respuestas` = `7d94f4a1…` (anexo D: invertir el sorteo de Noul la cambia y hoy nada cae). | 1 y 4      |
| AU-45 | **garak y ZAP dicen `tiene_adaptador: true`,** pero ningún adaptador existe en el código.                                                            | `datos/herramientas/garak.json`, `zap.json`; manual (limitaciones)                                      | Agregar en las limitaciones del manual: «HackGuard no lee hoy los informes de garak ni de ZAP: `tiene_adaptador` marca las herramientas para las que § 10.4 prevé un lector» (sin prometer sprint).                                                                     | 1      |
| AU-46 | **El `README.md` es el texto de create-next-app.**                                                                                             | `README.md`                                                                                             | Que apunte a `docs/MANUAL-DE-USO.md` y a la ruta real `src/app/`, sin URL.                                                                                       | 1      |
| AU-47 | **La guía está solo en español.**                                                                                                              | `docs/GUIA-DE-PRUEBA.html`                                                                              | Según la decisión 4.                                                                                                                                             | 2      |
| AU-51 | **`prueba/marco-no-aplica` solo mira la referencia principal.** Cuatro pruebas de agente y de modelo generativo citan CWE, que declara aplicar solo a software. | `src/engine/catalogo/validar.ts:960-976`; `datos/marcos/cwe.json:13` | (a) En `cwe.json`, `familias_aplicables` pasa a `["software", "agente", "modelo_generativo"]`. (b) **Gate,** si la decisión 5 es «sí»: la regla revisa también las `referencias_adicionales`. Anexo D, B4-1. | 4 |
| AU-52 | **La fecha de CWE 4.20 está en su propia vía de acceso,** y la bitácora dice que ninguna página la da. | `datos/marcos/cwe.json:6,61-64`; bitácora:87 | Poner `fecha_version` en 2026-04-30 y vaciar `por_verificar`, con la nota es/en. Re-descargar el archivo para fechar la consulta. Ajustar las pruebas y la guía de 4 a 3 notas. Anexo D, B4-2. | 4 |
| AU-53 | **Tres selectores no tienen fuente en `fuentes`:** garak `agent_breaker` y `propile`, y promptfoo `prompt-extraction`. | `datos/pruebas/agente/PR-AG-PERM-001.json:92`; `modelo_generativo/PR-IA-DATO-001.json:87`; `PR-IA-FUGA-001.json:87` | Agregar la fuente de cada uno, con su HTTP medido con `curl` el día del pago. Anexo D, B4-3. | 4 |
| AU-54 | **El CLI no dice qué archivo falla y no avisa lo que ignora:** un archivo que no es UTF-8, un BOM, extensiones distintas y carpetas mal escritas. | `src/cli/cargar.ts:15-18,39`; `src/engine/catalogo/validar.ts:105-111`; `src/cli/catalogo.ts:67` | **Gate.** El error de lectura nombra el archivo. `noLeidos()` avisa por stderr en los dos idiomas. Un BOM tiene su propio detalle. Nueva `tests/unit/catalogo/cargar.test.ts` (3 casos). Anexo D, B4-4. | 4 |
| AU-55 | **Cuatro conteos de la fase 2 en la bitácora no coinciden con los datos** (sondas de garak, complementos de promptfoo, Inspect, CWE) y no tienen corrida. | Bitácora:289,291-293,298 | Reescribirlos con las cifras del auditor 4, medidas el 2026-10-05. Anexo D, B4-5. | 4 |
| AU-56 | **Dos promesas aplazadas en los datos que la instantánea congela:** «el adaptador llega en el S3» (garak) y «el adaptador del S3 sugiere» (ZAP). | `datos/herramientas/garak.json:34-37`; `zap.json:75-78` | Usar la redacción en presente del anexo D, B4-6, en el mismo lote de datos. | 4 |

## Orden de pago de la Fase 2

1. **Primero, los que crean o amplían gates,** cada uno con su demo en `scripts/demo-rojo.sh`: AU-02, AU-01, AU-50, AU-49, AU-08, AU-09, AU-10, AU-11, AU-12, AU-54, AU-15, AU-26. Antes de cada demo se cuentan las pruebas para `--minimo-tests`.
2. **Después, código:** AU-07, AU-13, AU-22, AU-27, AU-29, AU-30, AU-32, AU-33 y AU-28.
3. **Luego, datos según las decisiones,** en un solo lote y después de AU-01: AU-05, AU-06, AU-31, AU-43, AU-51, AU-52, AU-53 y AU-56. Al terminar se cierran los gates que dependen de los datos:
   - AU-48: re-emitir la instantánea oficial, si la decisión 5 es «sí»;
   - AU-44: las huellas que cita la guía, con su prueba.
4. **Al final, documentos:** AU-03, AU-04, AU-14, AU-16, AU-17, AU-18, AU-19, AU-20, AU-21, AU-23, AU-24, AU-25, AU-34 a AU-42, AU-45, AU-46, AU-47 y AU-55.
5. **Cierre de la fase:**
   - los gates nuevos corren sobre el árbol completo: `typecheck`, `lint`, `test` con cobertura, `build`, `build-como-proveedor` y el e2e en los tres navegadores;
   - push y `gh pr checks`;
   - **segunda pasada** de frases caducadas y de frases de evidencia, hecha por otro auditor independiente sobre el diff completo, summary incluido.

## Anexo A — Informe del auditor «alcance y textos», tal como lo entregó

### Auditoría S1 de HackGuard, superficie «alcance y textos» (solo lectura)

No modifiqué nada en el repo; `git status` sigue limpio. Las corridas de instantánea fueron a una carpeta temporal fuera del repo, que borré al terminar.

**Lo que corrí:**

- `catalogo:validar` en es, en y `--json`, sobre el catálogo real y con 5 semillas.
- `catalogo:instantanea` en 8 fechas.
- `clasificador:demo` en es y en.
- `vitest run` completo, sin cobertura: **1.149 de 1.149 en 40 archivos**.
- Lectura de los logs de CI 37253753617 y 37252435488.

#### 1. Cobertura de alcance

| #   | Ítem del plan o la orden                                                                                            | Estado                          | Evidencia                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | F0 · Verificación del kit (hooks, carnada, TS 6/React 19.3, ADR-001)                                                | Completo                        | `sprints/SPRINT_001-implementation-log.md:10-16`                                                                                                    |
| 2   | F0 · Delta v1.34→v1.39 por nombre (scripts, CI, hook, comandos, constitución, plantilla)                            | Completo                        | log:18-40; `CLAUDE.md:9-11, 96-103, 323-332, 440-458, 504-538, 579-583, 658`; `.claude/commands/{audita-sprint,deploy-check}.md` = kit (diff vacío) |
| 3   | F0 · `--coverage` + 90 % en el motor + test de observability                                                        | Completo                        | `package.json:11`; `vitest.config.ts:32-37`                                                                                                         |
| 4   | F0 · `datos/privado/` ignorado + README + test                                                                      | Completo                        | `git ls-files datos/privado` da solo el README; `tests/unit/datos-privados.test.ts`                                                                 |
| 5   | F0 · DA-01/DA-10: 14 marcos con versión, fecha, fuente+HTTP, licencia, vías y lista blanca                          | Completo                        | `datos/marcos/*.json`; el validador da 4 notas `marco/por-verificar`                                                                                |
| 6   | F0 · DA-03: 4 patrones de forma con carnada y contraejemplo                                                         | Completo                        | `datos/filtro/patrones.json:9-99`; las carnadas son inocuas                                                                                         |
| 7   | F0 · `docs/LICENCIAS-DE-MARCOS.md` es/en                                                                            | Con desviación                  | `:3,:7` afirman algo falso; `:49-53` atribuciones incompletas (hallazgos M2 y M3)                                                                   |
| 8   | F0 · PR en borrador con la línea del merge + tabla de aprovisionamiento                                             | Completo, cuerpo desactualizado | PR #8 `isDraft:true`, línea 1 correcta; describe solo la fase 0 (B5)                                                                                |
| 9   | F0 · STOP: tabla DA-01 (marco·versión·fecha·fuente·HTTP·licencia·vía máquina) aprobada                              | Parcial                         | Aprobada en el chat (log:131-134); **la tabla no existe en ningún archivo del repo** (A1)                                                           |
| 10  | F1 · Esquemas Zod 4 con § 6 + campos de la F1                                                                       | Completo                        | `src/engine/catalogo/esquemas.ts:395-453` (el detalle es del otro auditor)                                                                          |
| 11  | F1 · Validador: rechazos, advertencias y aprobada+marcada                                                           | Completo                        | 61 reglas (`reglas.ts`); semillas reproducidas: SIN-MARCO 2, SIN-VERSION 2, VERSION-ANTERIOR 1, PATRON-PASOS 1                                      |
| 12  | F1 · Filtro que marca y no rechaza                                                                                  | Completo                        | PATRON-PASOS da «38 publicables, 1 pendiente», sale 1                                                                                               |
| 13  | F1 · Huella JCS + SHA-256                                                                                           | Completo                        | Huellas reproducidas (ítem 23)                                                                                                                      |
| 14  | F1 · CLI `validar`/`instantanea`, `--json`, `--idioma`, códigos 0/1/2/3                                             | Completo                        | Reproducido: 1, 2, 3 y 0                                                                                                                            |
| 15  | F1 · Semillas C18                                                                                                   | Completo                        | 19 semillas + `semillas.json`; 11/11 bloqueadas                                                                                                     |
| 16  | F2 · Anexo A: 9 áreas, 38 controles, resúmenes propios, `verificado_contra_norma:false`, equivalentes NIST con nota | Completo                        | `datos/controles/iso42001-anexo-a.json`; conté 201 equivalencias, todas «parcial»                                                                   |
| 17  | F2 · Herramientas de § 10.4 y E-25, más proveedores TypeSafe si verifican                                           | Completo                        | 13 archivos; los TypeSafe quedan como dato (`promptfoo.json:56`)                                                                                    |
| 18  | F2 · 21 pruebas de la maqueta + categorías de § 10.1/§ 10.2 + E-22                                                  | Completo, con desviación        | Las 21 IDs de la maqueta están; +17 nuevas = 38; 32 categorías cubiertas. DER `emergente` sin declarar (B3)                                         |
| 19  | F2 · Mapa OWASP LLM 2025→2026; «LLM07» sin versión rechazado                                                        | Completo                        | `datos/marcos/equivalencias/owasp-llm-2025-a-2026.json`; reproducido                                                                                |
| 20  | F2 · Filtro sobre todo el catálogo                                                                                  | Completo, ampliado y declarado  | log:335-338                                                                                                                                         |
| 21  | F2 · STOP: parada 2; parada 3 declarada no corrida                                                                  | Completo                        | log:410-411                                                                                                                                         |
| 22  | F3 · Semáforo por prueba, marco, herramienta y familia; umbrales y estados como dato                                | Completo                        | `datos/umbrales.json`, `datos/estados.json` (9 vocabularios, 33 estados). Reproducido: 11-02 vigente, 11-03 por revisar, 12-03 vencido              |
| 23  | F3 · Instantáneas, gate de publicación, autoconsistencia                                                            | Completo                        | Re-emití 2026-10-04: **idéntica byte a byte** a `datos/instantaneas/2026-10-04-12d3b632a871.json` (502.746 B)                                       |
| 24  | F3 · Clasificador demo + conjunto bilingüe + métricas + `clasificador:demo`                                         | Completo                        | Las cifras de log:538-548 coinciden una por una; huella `7d94f4a1…`                                                                                 |
| 25  | F4 · C18 + `demo-rojo` sobre validador, filtro y gate                                                               | Completo (desde la fase 1)      | log:222-240, 594-601                                                                                                                                |
| 26  | F4 · e2e de determinismo en 3 navegadores = Node, con rojo en un solo motor                                         | Completo                        | `tests/e2e/determinismo.spec.ts:123-163`; el log de CI 37253753617 muestra las 9 huellas iguales                                                    |
| 27  | F4 · Tiempos de los dos comandos                                                                                    | Parcial                         | `instantanea` medida (log:449-450); `validar` sin medición registrada (B1)                                                                          |
| 28  | F4 · Manual «El catálogo como dato» es/en                                                                           | Parcial                         | Faltan 3 de los 5 contenidos de la DoD de `SPRINT_001.md:80-82` (A2)                                                                                |
| 29  | F4 · Guía: nace, prefijo `hackguard-s1`, ⭐⭐ «1 de 3…3 de 3», declara lo que deja fuera                            | Con desviación                  | `GUIA-DE-PRUEBA.html:390`; parada 1 sin su artefacto (A1); E3 fuera del ⭐ sin declararlo (M4)                                                      |
| 30  | F4 · ADRs 002, 003 y 004                                                                                            | Completo                        | `decisions/002…004` (inexactitud menor en B7)                                                                                                       |
| 31  | F4 · `docs/CHANGELOG.md`                                                                                            | Completo                        | Sus cifras coinciden con los datos                                                                                                                  |
| 32  | Orden, insumo «§ 11.2: la escala, solo para dejar su tabla en datos»                                                | No implementado ni declarado    | `SPRINT_001-orden.md:56-57`; no hay tabla en `datos/` (M5)                                                                                          |
| 33  | Aceptación: todo `por_verificar` listado en el summary                                                              | Pendiente, en riesgo            | La bitácora lista 3 campos; los datos tienen 4 (M6)                                                                                                 |
| 34  | Cero UI y artefactos de diseño intactos                                                                             | Completo                        | `git diff` sobre `src/app`, `docs/diseno`, `scripts/maqueta`, `design-*` está vacío                                                                 |

#### 2. Hallazgos

##### [ALTO] A1 · La tabla DA-01 aprobada en la parada 1 no es un archivo del repo, y la guía manda a confirmarla en un documento que no la contiene

- **Ubicación:**
  - `docs/GUIA-DE-PRUEBA.html:199-209` y `:228`
  - `docs/LICENCIAS-DE-MARCOS.md:22-33`
  - `sprints/SPRINT_001-implementation-log.md:131-134`
- **Qué pasa (confirmado):**
  - La parada 1 del ⭐ dice «Abre `docs/LICENCIAS-DE-MARCOS.md` y recorre la tabla: cada marco con su versión, su fuente, su licencia».
  - «Qué mirar» exige «14, cada uno con versión, fuente con su código HTTP y licencia».
  - Ese documento tiene 8 filas agrupadas y columnas Marco · Licencia · Qué exige · Cómo cumple. **No tiene fuente ni HTTP.**
  - `git grep -i "DA-01"` no encuentra la tabla (marco·versión·fecha·fuente·HTTP·licencia·vía máquina) en ningún archivo: solo vivió en el chat del STOP de la fase 0.
- **Por qué importa:**
  - La parada 1 es obligatoria y no se puede recorrer tal como está escrita.
  - La regla 12 exige que todo entregable sea un archivo del repo.
  - El veredicto del usuario recae sobre un artefacto que no existe.
- **Ajuste ejecutable:**
  1. En `docs/LICENCIAS-DE-MARCOS.md`, antes de `### Tabla de licencias` (línea 22), agregar `### Marcos con versión y fuente (DA-01)` con esta tabla (salida verbatim de los datos):
     ```
     | Marco | Versión | Fecha | Fuente oficial | HTTP | Licencia | Vía legible por máquina |
     |---|---|---|---|---|---|---|
     | `cwe` | 4.20 | por verificar | https://cwe.mitre.org/data/index.html | 200 | Términos de uso de CWE | archivo 206 |
     | `iso-iec-42001` | 2023 | 2023 (día por verificar) | https://www.iso.org/standard/81230.html | 403 (`fuente_no_accesible_al_agente`) | Copyright de ISO/IEC | no |
     | `lista-decision-14` | v1 | 2026-09-26 | https://arxiv.org/abs/2609.32160 | 200 | CC BY 4.0 | interfaz 200; archivo 200 |
     | `mitre-atlas` | 2026.09 | 2026-09-15 | https://atlas.mitre.org/ | 200 | Apache-2.0 | repositorio 200; archivo 206 |
     | `mitre-attack` | 19.2 | 2026-04-28 | https://attack.mitre.org/resources/versions/ | 200 | Términos de uso de ATT&CK | repositorio 200; archivo 206 |
     | `nist-ai-100-2` | E2025 | 2025-03 | https://csrc.nist.gov/pubs/ai/100/2/e2025/final | 200 | Obra de NIST | no |
     | `nist-ai-600-1` | AI 600-1 | 2024-07 | https://doi.org/10.6028/NIST.AI.600-1 | 200 | Obra de NIST | archivo 200 |
     | `nist-ai-rmf` | 1.0 | 2023-01-26 | https://www.nist.gov/itl/ai-risk-management-framework | 200 | Obra de NIST | archivo 200 |
     | `owasp-agentic-top10` | 2026 | 2025-12-10 | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | 200 | CC BY-SA 4.0 | archivo 200 |
     | `owasp-asvs` | 5.0.0 | 2025-05-30 | https://owasp.org/www-project-application-security-verification-standard/ | 200 | CC BY-SA 4.0 | repositorio 200; archivo 206 |
     | `owasp-llm-top10` | 2026 | 2026-08-03 | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ | 200 | CC BY-SA 4.0 | repositorio 200; archivo 200 |
     | `owasp-top10` | 2025 | 2025 (día por verificar) | https://owasp.org/Top10/ | 200 | CC BY-SA 4.0 | repositorio 200 |
     | `owasp-wstg` | 4.2 | 2020-12-03 | https://owasp.org/www-project-web-security-testing-guide/ | 200 | CC BY-SA 4.0 | repositorio 200 |
     | `typesafe-jev` | jev-1.13 | 2026-10-02 | https://docs.typesafe.ai/model-jaggedness/jev-1.13.md | 200 | Sin licencia abierta (términos de TypeSafe) | interfaz 200 |
     ```
     Agregar su gemela en `## English`.
  2. En la guía, línea 201: «recorre la tabla» pasa a «recorre las tablas "Marcos con versión y fuente (DA-01)" y "Tabla de licencias"».
- **Verificación:** `grep -c '^| `' docs/LICENCIAS-DE-MARCOS.md`sube en 28 (14 filas × 2 idiomas). Cada versión y HTTP de la tabla coincide con`datos/marcos/<id>.json`.
- **Casilla:** 6 (guía contra arquitectura) y 1.

##### [ALTO] A2 · El manual no cumple 3 de los 5 contenidos de la DoD

- **Ubicación:**
  - `docs/MANUAL-DE-USO.md:33-92` (es) y `:155-213` (en)
  - DoD en `SPRINT_001.md:80-82` (planeadora)
- **Qué pasa (confirmado):** la DoD pide estructura de `datos/`, los dos comandos, códigos de salida, cómo se agrega una prueba y cómo se marca para revisión.
  - El manual cubre comandos y códigos.
  - **No describe la estructura de `datos/`.**
  - **No dice cómo se agrega una prueba.** Solo cómo probarla con `--agregar`.
  - **No dice cómo se registra la decisión de revisión:** `estado_aprobacion`, `revision_contenido` y el bloque `revision{fecha,por,decision,huella}` (`esquemas.ts:441-451`).
- **Por qué importa:**
  - Es un ítem de la DoD: sin él, la regla de los 6+1 exige que quede como deuda explícita.
  - La parada 2 («revisada_y_aprobada · reescribir · retirar») no tiene un procedimiento escrito.
- **Ajuste ejecutable:** en `docs/MANUAL-DE-USO.md`, después de la línea 81 (fin del paso 5), insertar:
  ```
  - **Dónde vive cada cosa (`datos/`):**
    - `marcos/<id>.json`: un marco por archivo; `marcos/equivalencias/` guarda los mapas entre versiones.
    - `controles/iso42001-anexo-a.json`: la capa de controles por defecto.
    - `herramientas/<id>.json`: una herramienta por archivo.
    - `pruebas/<familia>/<id>.json`: una prueba por archivo, en la carpeta de su familia (`software`, `agente`, `modelo_generativo`, `modelo_decision`).
    - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` y `filtro/patrones.json`: los vocabularios.
    - `instantaneas/`: las escribe el comando; no se editan a mano.
    - `privado/`: evidencia de activos reales; git la ignora.
  - **Agregar una prueba:** copia `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, cámbiale el `id` y nombra el archivo igual que el `id`. Escribe en los dos idiomas qué verifica, por qué importa, con qué herramienta y qué se espera (nunca cómo se ejecuta un ataque). Valídala con `pnpm catalogo:validar --agregar <archivo>` hasta que no quede ningún ✗, y muévela a `datos/pruebas/<familia>/`.
  - **Si el filtro la marca** (`filtro/marcada`), no entra a la instantánea hasta que una persona decida: reescribirla para que deje de marcar, retirarla (`"estado_aprobacion": "retirada"`) o aprobarla (`"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` y un bloque `revision` con fecha, quién, la decisión en los dos idiomas y la huella del contenido revisado).
  ```
  Agregar su versión en inglés, redactada, después de la línea 202.
- **Verificación:** `grep -c "datos/pruebas/<familia>\|revisada_y_aprobada" docs/MANUAL-DE-USO.md` da ≥ 4.
- **Casilla:** 1.

##### [MEDIO] M1 · Una persona no tiene cómo calcular la `revision.huella` que el validador exige para aprobar una prueba marcada

- **Ubicación:**
  - `src/engine/catalogo/validar.ts:453-464` y `:1113-1137`
  - `src/cli/` (ningún comando la expone)
- **Qué pasa (confirmado):**
  - `revision.huella` tiene que igualar a `huellaDeRevision(p)`: el JCS de la prueba sin `revision`, `revision_contenido`, `estado_aprobacion` ni `fecha_verificacion`.
  - Ni el CLI ni el `detalle` de `prueba/revision-desactualizada` o `prueba/aprobada-sin-revision` la muestran (`detalle` va en null).
  - **Plausible:** con cero marcadas en el S1 no se ejerció, pero la primera marcada real no se podrá aprobar sin escribir código.
- **Por qué importa:** RF-01.3 («una persona decide») y la parada 2 dependen de este camino. El texto que pide A2 no se podrá cumplir.
- **Ajuste ejecutable** (coordinar con el auditor de motor):
  - En `validar.ts:1117-1121` y `:1132-1136`, pasar como 4.º argumento ``t(`huella a registrar: ${await huellaDeRevision(p)}`, `fingerprint to record: ${await huellaDeRevision(p)}`)``.
  - Actualizar los casos de esas dos reglas en `tests/unit/catalogo/validar.test.ts`.
- **Verificación:** `pnpm catalogo:validar --agregar docs/kit-de-prueba/semillas/SEMILLA-APROBADA-MARCADA.json` muestra «huella a registrar: <64 hex>». `pnpm vitest run tests/unit/catalogo/validar.test.ts tests/unit/instrumento` queda en verde.
- **Casilla:** 1 y textos.

##### [MEDIO] M2 · `LICENCIAS-DE-MARCOS.md` afirma que el HTTP de cada licencia está registrado, y no lo está

- **Ubicación:** `docs/LICENCIAS-DE-MARCOS.md:3` y `:7`
- **Qué pasa (confirmado):**
  - El documento dice «con la URL de cada licencia consultada con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`».
  - El objeto `licencia` de los 14 marcos solo tiene `nombre`, `url`, `exige` y `como_cumple`, sin `http`.
  - Ninguna URL de licencia aparece en `vias_de_acceso`. La excepción es ISO, cuya URL de licencia es la misma página de la fuente.
- **Por qué importa:** es una afirmación de procedencia falsa en un documento que el usuario aprueba (parada 1).
- **Ajuste ejecutable:**
  - Línea 3: reemplazar «con la URL de cada licencia consultada con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`» por «con la fuente oficial y las vías de acceso de cada marco consultadas con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`; la URL de la licencia se registra sin código HTTP».
  - Línea 7: «Each licence URL was fetched with `curl` and its HTTP code is recorded» pasa a «Each framework's official source and access routes were fetched with `curl` and their HTTP codes are recorded…; the licence URL is recorded without an HTTP code».
- **Verificación:** `grep -n "URL de cada licencia" docs/LICENCIAS-DE-MARCOS.md` sin resultados.
- **Casilla:** regla 27 y normas.

##### [MEDIO] M3 · Las atribuciones no cumplen lo que los propios datos dicen que cada licencia exige

- **Ubicación:**
  - `docs/LICENCIAS-DE-MARCOS.md:49-53`
  - `datos/marcos/lista-decision-14.json` (`editor`), `nist-*.json` (`licencia.exige`)
- **Qué pasa (confirmado):**
  - **arXiv (CC BY 4.0):** «exige: atribución a los autores», pero ni el documento ni los datos nombran a ningún autor (`editor: "arXiv:2609.32160"`).
  - **NIST:** «exige: citar la publicación en el formato recomendado», y el documento solo da los identificadores.
  - **OWASP (CC BY-SA):** se dan títulos y el enlace a la licencia, sin el enlace a la fuente de cada obra.
- **Por qué importa:** la regla dura 11 manda atribuir «según la licencia de cada marco», y el repo es público.
- **Ajuste ejecutable:**
  - Línea 51: agregar los autores tal como figuran en https://arxiv.org/abs/2609.32160, leídos con `curl`, sin suponerlos. Registrarlos también en `lista-decision-14.json` (`notas` o `editor`).
  - Línea 49: citar cada publicación con título, número y DOI:
    - `https://doi.org/10.6028/NIST.AI.100-1`
    - `https://doi.org/10.6028/NIST.AI.600-1`
    - y la de AI 100-2 E2025 tomada de su `fuente_oficial`

    Cada cita, seguida de la leyenda.

  - Línea 37: agregar a cada título OWASP la URL de su `fuente_oficial`.
- **Verificación:** las tres atribuciones contienen autor o DOI o URL de la obra. Los datos no cambian de huella si solo se toca el `.md`.
- **Casilla:** normas (regla 11).

##### [MEDIO] M4 · La guía afirma que los bloques B a F «los respalda la CI», pero E3 es un juicio humano que queda fuera del ⭐ sin declararse

- **Ubicación:**
  - `docs/GUIA-DE-PRUEBA.html:170-172`
  - `:333-338` (E3)
- **Qué pasa (confirmado):** E3 pide juzgar que las notas «se leen natural… redactadas y no traducidas». Ningún test lo verifica. La orden fija el ⭐ en las 3 paradas, pero el encabezado lo presenta como cubierto por la CI.
- **Por qué importa:** es un gate que se encoge sin decirlo (regla 11 de desarrollo, disciplina (b) del ⭐⭐).
- **Ajuste ejecutable:**
  - Líneas 171-172: «Lo demás (bloques B a F) lo respalda la CI y se corre en pases completos: 18 pruebas, ~22 min.» pasa a «Lo demás (bloques B a F) lo respalda la CI y se corre en pases completos: 18 pruebas, ~22 min. La excepción es E3, una lectura de redacción que ninguna prueba automática juzga; queda fuera del ⭐ porque la orden lo fija en las tres paradas».
  - Línea 168: «Deja fuera 0 pruebas ⭐» queda igual.
- **Verificación:** `grep -c "salvo E3\|excepción es E3" docs/GUIA-DE-PRUEBA.html` da 1.
- **Casilla:** 6.

##### [MEDIO] M5 · El insumo de la orden «§ 11.2: la escala, solo para dejar su tabla en datos» no se hizo ni se declaró

- **Ubicación:**
  - `hr01…/ordenes/SPRINT_001-orden.md:56-57`
  - `datos/` (no hay tabla de escala)
  - El plan aprobado tampoco lo incluye
- **Qué pasa (confirmado):**
  - No existe ninguna tabla de la escala de IA en `datos/`.
  - Ni la bitácora ni el plan lo mencionan (`grep "11.2\|escala"` sin resultados).
  - El brief asigna C13 al S3 y descarta la suma de dimensiones.
- **Por qué importa:** una desviación del plan que no se registra queda invisible para la planeadora.
- **Ajuste ejecutable:** en la bitácora, bajo la fase 4, agregar `### Desviación del plan` con este texto:

  > «§ 11.2 (escala de IA) no se deja en datos en el S1: la orden la nombraba entre los insumos, pero ni el plan aprobado ni `SPRINT_001.md` la incluyen; el brief asigna C13 al S3 y la regla dura 7 sustituye la suma de dimensiones por una tabla de prioridad de acción.»

  Repetirlo en el summary y avisar al usuario.

- **Verificación:** `grep -n "11.2" sprints/SPRINT_001-implementation-log.md` da ≥ 1.
- **Casilla:** 1.

##### [MEDIO] M6 · La bitácora lista 3 campos `por_verificar`; los datos tienen 4

- **Ubicación:**
  - `sprints/SPRINT_001-implementation-log.md:85-88` y `:133`
  - `datos/marcos/iso-iec-42001.json` (`por_verificar: [fecha_version, fuente_oficial]`)
- **Qué pasa (confirmado):** `pnpm catalogo:validar` da 4 notas: cwe·fecha, iso·fecha, iso·fuente y owasp-top10·fecha. A la lista de la bitácora le falta la fecha de ISO.
- **Por qué importa:** la aceptación exige que el summary liste todo `por_verificar`, y el summary saldrá de la bitácora.
- **Ajuste ejecutable:** en la línea 88 agregar «- la fecha exacta de ISO/IEC 42001:2023 (la fuente responde 403; solo consta el año);». En la línea 133, «con las tres filas `por_verificar`» pasa a «con sus cuatro campos `por_verificar` en tres marcos».
- **Verificación:** `pnpm catalogo:validar | grep -c marco/por-verificar` da 4, igual al número de viñetas de la bitácora.
- **Casilla:** coherencia.

##### [MEDIO] M7 · El manual pide «Node 22 o posterior», pero el CLI usa type stripping, que Node 22 solo trae activado desde la 22.18 (plausible)

- **Ubicación:**
  - `docs/MANUAL-DE-USO.md:27` y `:149`
  - `package.json` sin `engines`
- **Qué pasa (plausible):** los scripts corren `node src/cli/*.ts` sin flag. En Node 22.0–22.17 eso falla con `ERR_UNKNOWN_FILE_EXTENSION`. No pude reproducirlo porque solo hay Node 24 instalado. La CI usa 22.23.3.
- **Por qué importa:** una persona con un Node 22 LTS anterior no puede seguir el manual.
- **Ajuste ejecutable:**
  - Línea 27: «Necesitas Node 22 o posterior y pnpm.» pasa a «Necesitas Node 22.18 o posterior (el CLI usa el TypeScript nativo de Node) y pnpm.»
  - Línea 149: lo mismo en inglés.
  - Opcional, fuera de mi tramo: `"engines": {"node": ">=22.18"}`.
- **Verificación:** `node -p process.features.typescript` imprime `strip` en la versión mínima declarada.
- **Casilla:** 4.

##### [MEDIO] M8 · `semillas.json` dice «ok» para la semilla de referencia, pero su propio `como_correr` da «con advertencias»

- **Ubicación:** `docs/kit-de-prueba/semillas/semillas.json:6-9` y `:12-19`
- **Qué pasa (confirmado):**
  - `pnpm catalogo:validar --agregar …/SEMILLA-REFERENCIA.json` da «Catálogo: con advertencias» y sale 1, por las 10 pruebas de software.
  - El manifiesto espera `"estado": "ok"` porque el test (`semillas-del-catalogo.test.ts:33-46`) solo cuenta los hallazgos propios de la semilla. El manifiesto no lo explica.
- **Por qué importa:** quien use el kit verá una discrepancia y la reportará como fallo (la guía, bloque C, pide reportar diferencias).
- **Ajuste ejecutable:** añadir al final de `como_correr.es`: « — «espera» describe solo los hallazgos de la semilla: el estado del catálogo entero suma las 10 advertencias de software, así que SEMILLA-REFERENCIA sale «con advertencias» (código 1) sin ningún hallazgo propio». Equivalente en `en`.
- **Verificación:** `pnpm vitest run tests/unit/instrumento` sigue en 22 de 22.
- **Casilla:** 6.

##### [BAJO] B1 · El tiempo de `catalogo:validar` no está medido

- **Ubicación:** bitácora, fase 4
- **Qué pasa:** solo se midió `instantanea` (log:449-450). Yo medí `validar` con `time -p` tres veces: 0,30, 0,31 y 0,36 s en esta máquina y con el entorno de agente. La cifra válida es la del builder.
- **Ajuste ejecutable:** correr `for i in 1 2 3; do /usr/bin/time -p pnpm -s catalogo:validar >/dev/null; done` y anotar el rango en «### Tiempos» de la fase 4 y en el summary.
- **Verificación:** la bitácora tiene una línea «validar: entre X y Y s» posterior a la corrida.
- **Casilla:** 1 y regla 27.

##### [BAJO] B2 · La corrección de la fase 4 (concordancia de número, `0a8228a`) no está en la bitácora

- **Ubicación:** bitácora, fase 4 (no tiene «Bugs y resoluciones»)
- **Qué pasa:** la línea de conteos decía «1 pendientes de revisión». La guía C4 depende de la corrección.
- **Ajuste ejecutable:** agregar a la fase 4 «### Bugs y resoluciones — La línea de conteos en español no concordaba en número («1 publicables», «1 pendientes de revisión»); `0a8228a` lo corrige con su prueba en `tests/unit/catalogo/informe.test.ts`.»
- **Verificación:** `grep -n 0a8228a sprints/SPRINT_001-implementation-log.md` da 1.

##### [BAJO] B3 · Deriva (`PR-MD-DER-001`) es `emergente` sin declararlo frente a E-23 / J E-8

- **Ubicación:** `datos/pruebas/modelo_decision/PR-MD-DER-001.json:64`; `decisions/004-…md:22-23`
- **Qué pasa:** E-23 dice «cuatro de las seis pasan a emergente» y J E-8 nombra calibración, umbral, inyección y límites. Los datos ponen cinco de las seis en `emergente`.
- **Ajuste ejecutable:** en ADR-004, línea 23, agregar: «Drift (`PR-MD-DER-001`) is `emergente`, one more than E-23's four: it is anchored on item R1 of the 14-item checklist, which E-23 accepts as a framework.»
- **Verificación:** `grep -n "PR-MD-DER-001" decisions/004-*.md` da 1.

##### [BAJO] B4 · Tres afirmaciones inexactas en el manual

- **Ubicación:** `docs/MANUAL-DE-USO.md:39/161`, `:99/221` y `:60/182`
- **Qué pasa:**
  - «13 herramientas, cada una con su versión verificada y su licencia»: `hackguard-revision` tiene versión «1» propia y licencia `NOASSERTION`.
  - «Responde con el mismo formato que Jev»: según ADR-004, la anidación de `answers` es nuestra.
  - El ejemplo `--fecha 2026-10-15` sin `--salida` escribe un archivo nuevo dentro de `datos/instantaneas/`, en el repo.
- **Ajuste ejecutable:**
  - L39: «13 herramientas: 12 públicas, cada una con su versión verificada y su licencia, y `hackguard-revision`, la revisión documentada por una persona».
  - L99: «responde con un formato que imita el contrato de respuesta de Jev, de TypeSafe (la anidación de las respuestas es nuestra)».
  - L60: añadir «Para probar sin tocar el repositorio, agrega `--salida /tmp/hackguard`.»
  - Lo mismo en inglés en 161, 221 y 182.
- **Verificación:** `grep -n "mismo formato que Jev" docs/MANUAL-DE-USO.md` sin resultados.
- **Casilla:** 4.

##### [BAJO] B5 · El cuerpo del PR #8 quedó en la fase 0

- **Qué pasa:** dice «Phase 0 (this push)» y «Playwright browsers … added in phase 4», en futuro, aunque ya está hecho.
- **Ajuste ejecutable:** al cierre, `gh pr edit 8 --body-file <archivo>`. La línea del merge va primero, luego un resumen de las 5 fases y la tabla de aprovisionamiento con «Installed by CI (chromium, firefox, webkit)».
- **Verificación:** `gh pr view 8 --json body --jq .body | grep -c "this push"` da 0.

##### [BAJO] B6 · Cuatro textos desfasados en la constitución y los comandos

- **Ubicación:**
  - `CLAUDE.md:81`
  - `CLAUDE.md:110-119` (Estructura)
  - `CLAUDE.md:11` / `:96`
  - `CLAUDE.md:229` vs `.claude/commands/plan-sprint.md:74`
- **Qué pasa:**
  - (a) La regla dura 11 dice la licencia «se fija en la fase 0 del S1», en futuro, aunque ya se fijó.
  - (b) La Estructura no lista `src/cli/`.
  - (c) La cabecera ubica la frase centinela «lo que el proveedor publica no es lo que el build escribe» en el Stack, pero solo existe en la cabecera. Un `grep` se satisface con su propia declaración.
  - (d) La regla 10 dice «Dos clases de mirada»; `plan-sprint` (f) dice «Tres». La contradicción se hereda del kit.
- **Ajuste ejecutable:**
  - (a) «(se fija en la fase 0 del S1)» pasa a «(fijada en la fase 0 del S1: `docs/LICENCIAS-DE-MARCOS.md` y `licencia` en cada `datos/marcos/<id>.json`)».
  - (b) Añadir «├─ cli/ (E/S del catálogo: lee `datos/` y llama al motor)» bajo `├─ app/`.
  - (c) En la línea 96, «**La CI construye COMO EL PROVEEDOR (kit v1.39.0):**» pasa a «**La CI construye COMO EL PROVEEDOR (kit v1.39.0) — lo que el proveedor publica no es lo que el build escribe:**».
  - (d) Registrar «K-S1-4 — la regla 10 del `CLAUDE.md` del kit dice dos clases de mirada y `plan-sprint.md` v1.36 dice tres» en la bitácora, sin editar la regla.
- **Verificación:** `grep -c "lo que el proveedor publica no es lo que el build escribe" CLAUDE.md` da 2, y `grep -n K-S1-4` da 1.

##### [BAJO] B7 · ADR-002 describe mal el contenido de la instantánea

- **Ubicación:** `decisions/002-…md:38-39`
- **Qué pasa:** dice «only publishable tests … plus the freshness semaphore». La instantánea lleva el catálogo entero (11 claves), `pendientes_de_revision` y `advertencias`. ADR-003, el manual y el CHANGELOG lo dicen bien.
- **Ajuste ejecutable:** reemplazar por «**Contents:** the whole catalog (frameworks, maps, controls, tools, vocabularies, thresholds, states) with only its publishable tests, plus the freshness semaphore, the tests awaiting review and the validator's warnings and notes.»
- **Verificación:** `grep -n "whole catalog" decisions/002-*.md` da 1.

##### [BAJO] B8 · Otros textos menores

- **(a) Cita del usuario en dos versiones.** La bitácora dice «Aprobados los marcos, continúa» (`log:132`) y la guía dice «Aprobados lo marcos, continua» (`GUIA:203-204`). Hay que unificar con la cita literal de la conversación, con «(sic)» como en la fase 2.
- **(b) La guía E2 cita una línea que no existe.** «accuracy 20 of 26 · 25 of 26» no sale así: la salida es una fila de tabla, `accuracy 20 of 26 25 of 26`. Cambiarlo por «la fila "accuracy" con 20 of 26 y 25 of 26».
- **(c) Afirmación sin sustento en `PR-MD-COH-001.json:14-15`.** «es la más barata de la familia»: ESTAB e INV tampoco necesitan etiquetas.
  - Propuesta: «y, como la estabilidad y la invariancia, esta prueba no necesita etiquetas».
  - **Aviso:** cualquier cambio en `datos/` cambia las huellas citadas en la guía (D1 `e2858e…`, D2, D5 `12d3b6…` y F1), en ADR-002 y en la bitácora. Ninguna prueba compara las huellas de la guía con el motor. Conviene un test que extraiga las huellas de 64 hex de `GUIA-DE-PRUEBA.html` y las compare con `construirInstantanea` en esas fechas. D5 se rompe con cualquier dato nuevo: o se re-emite la instantánea oficial, o D5 se reescribe.
- **(d) `tiene_adaptador: true` en garak y ZAP.** El campo afirma algo que hoy no existe (no hay `src/engine/adaptadores/`), aunque así lo pide `SPRINT_001.md` y las notas lo aclaran. Añadir en las limitaciones del manual: «garak y ZAP figuran con adaptador, como pide § 10.4; el adaptador que lee sus informes llega en el Sprint 3.»
- **(e) `README.md` es el texto de create-next-app.** Dice «modifying `app/page.tsx`», cuando la ruta real es `src/app/`. Es anterior al sprint: puede apuntar a `docs/MANUAL-DE-USO.md`, sin URL.

#### 3. Lo comprobado sin hallazgo

- **Guía contra el producto (casilla 6):** B1–B4, C1–C4, D1–D5 y E1 dan exactamente el resultado que la guía espera, cifra por cifra.
  - Las huellas `e2858e…`, `0b24f1…`, `39f851…` y `12d3b6…` coinciden.
  - D5 da un archivo idéntico byte a byte al versionado.
  - Las 7 cifras del clasificador coinciden.
  - F1 lo confirma el log de CI: 9 huellas iguales en chromium 153, firefox 155 y webkit 26.6.
  - **C5:** la línea «C18 catálogo: bloquea 11 de 11» no se imprime bajo un agente (Vitest oculta la consola con `CLAUDECODE`/`AI_AGENT`). Al quitar esas variables, aparece. En la terminal del usuario funciona.
- **Evidencia después del hecho (regla 27):**
  - Coinciden: tamaño de la instantánea (502.746 B), cuentas del semáforo, 61 reglas, 19 semillas y 11 de 11, 201 equivalencias, 33 estados, tallies de madurez y uso de herramientas, y versiones de navegadores.
  - La última cuenta de la bitácora, 1.148, es anterior a `0a8228a`. Hoy son 1.149 en 40 archivos: el summary debe usar la cifra nueva.
- **Frontera de contenido (regla 3):** leí las 38 pruebas (es) y en es/en una muestra de 6. Ninguna trae cargas, comandos ni pasos operativos. Las carnadas del filtro son inocuas.
- **Normas (regla 11):** los 38 resúmenes del Anexo A están en palabras propias.
  - **Plausible, de memoria:** 4 nombres de 1–2 palabras («Data provenance», «Data preparation», «Suppliers», «Customers») coinciden con los títulos oficiales. No es texto sustantivo, pero conviene sumarlo a la validación diferida antes de G-Release.
  - Las licencias de `LICENCIAS-DE-MARCOS.md` coinciden con `licencia.nombre` de los 14 marcos.
- **Bilingüe:** en 951 textos `{es,en}` de `datos/` y del kit, las cifras son las mismas en los dos idiomas y ningún idioma está vacío. Leí 6 pruebas en paralelo: dicen lo mismo.

**Recomendación para mi superficie: requiere ajustes.** Lo mínimo para cerrar es A1 y A2, y después los cinco Medios, para que la parada 1 y la DoD del manual puedan cumplirse.

## Anexo B — Informe del auditor «hooks, privacidad, bilingüismo, guía y frontera de contenido», tal como lo entregó

### Auditoría independiente S1 · superficie «hooks, privacidad, bilingüismo, guía y frontera de contenido»

**Veredicto: requiere ajustes.** Hay 3 hallazgos altos, 5 medios y 4 bajos. Ninguno es crítico: no hay secretos, no hay fugas de enlaces, ningún dato privado está versionado y ninguna de las 38 pruebas contiene una carga.

El repo queda intacto: `git status` está limpio y el HEAD sigue en `10c277c`. Trabajé en mi scratchpad porque otro auditor estaba vaciando `/tmp/auditoria-hg` mientras yo lo usaba.

#### Qué pasó bien (comprobado)

- **Rutas que no debían cambiar:** `git diff origin/main...HEAD` sobre `src/app`, `docs/diseno`, `scripts/maqueta`, `design-system.md` y `design-sync` sale vacío.
- **Worktrees:** `git worktree list` muestra solo el checkout principal y no existe `.claude/worktrees`.
- **Secretos:**
  - `gitleaks git --log-opts=origin/main..HEAD` revisó 18 commits: «no leaks found».
  - `gitleaks dir` sobre el árbol de HEAD: «no leaks found».
- **Cero enlaces:** el `git grep` de la regla 17 sale vacío. La única URL propia es la del repo público, en `datos/herramientas/hackguard-revision.json`, y está permitida. No hay rutas locales ni correos en archivos versionados.
- **Datos privados:**
  - `git ls-files datos/privado` devuelve solo el README.
  - El `.gitignore` es correcto y `datos-privados.test.ts` pasa.
  - Las pruebas escriben solo en `os.tmpdir()`.
- **Estados:** `datos/estados.json` tiene 9 vocabularios y 33 estados. Cada uno lleva rol, símbolo y nombre `{es,en}`, y ningún símbolo se repite dentro de un vocabulario. En la terminal, cada estado sale con marca y palabra.
- **Frontera de contenido:**
  - Leí las 38 pruebas una por una (qué verifica, resultado esperado y selectores): ninguna trae una carga ni un procedimiento.
  - Las carnadas de `patrones.json` y de las semillas son inocuas.
  - El filtro recorre todo el catálogo: 0 marcas.
  - El conjunto de referencia no tiene datos personales.
- **Guía de prueba:** la abrí con Playwright en Chromium, Firefox y WebKit, con los temas claro y oscuro, a 320 y a 1024 px.
  - 0 errores de consola y 0 peticiones fuera de `file://`.
  - La clave de `localStorage` es `hackguard-s1:a1` y persiste al recargar.
  - Las 21 pruebas llevan su chip de origen.
  - Los filtros cuentan bien (21/21/3/3) y el contador coincide.
  - Los 6 bloques tienen «Empieza en:» y todas las etiquetas están asociadas.
  - No hay desborde a 320 px y el foco es visible.
  - axe no encuentra nada en el tema oscuro.
- **Pruebas que corrí:** `hook-secretos`, `datos-privados`, `filtro`, `instrumento` y `catalogo-real` dan 93 de 93 en verde en local.

---

##### [ALTO] Nombres y licencias de los marcos escritos en un solo idioma, y el esquema lo permite

- **Ubicación:**
  - `src/engine/catalogo/esquemas.ts:81` (`nombre: Nombre`) y `:97` (`licencia.nombre: Nombre`).
  - `datos/marcos/cwe.json:3` y `:18`; `lista-decision-14.json:3`; `typesafe-jev.json:3` y `:18`; `mitre-atlas.json:20`; `mitre-attack.json:23`; `iso-iec-42001.json:20`; `nist-ai-rmf.json:20`; `nist-ai-600-1.json:19`; `nist-ai-100-2.json:20`.
- **Qué pasa (confirmado):** recorrí con un script todo `datos/`. Aparecen textos redactados por nosotros que viven solo en español:
  - en el nombre: «Common Weakness Enumeration (CWE) y CWE Top 25», «… (lista de 14 ítems)», «TypeSafe — documentación de Jev (límites conocidos del modelo)»;
  - en 8 licencias, por ejemplo «Obra de empleados de NIST (sin copyright en EE. UU.; …)» o «Sin licencia abierta declarada (términos de TypeSafe)».

  La versión inglesa existe solo en `docs/LICENCIAS-DE-MARCOS.md` (tabla «Licence table»). Ese es justo el patrón que la regla 20 prohíbe: «un campo en un idioma más una traducción aparte». Estos campos entran en la instantánea, y el gate «datos bilingües» (`texto/idioma-repetido`) no puede verlos porque no son `{es,en}`.

- **Por qué importa:** la pantalla del S2 los va a mostrar. Cuanto más tarde se corrija, más costoso es: cambia el contrato de datos y la huella.
- **Ajuste ejecutable:**
  1. En `esquemas.ts:97`, dentro de `licencia`, cambiar `nombre: Nombre,` por `nombre: Texto,`.
  2. En los 14 `datos/marcos/*.json`, convertir `licencia.nombre` en `{ "es": <texto actual>, "en": <texto> }`. Los textos en inglés salen de la tabla inglesa de `docs/LICENCIAS-DE-MARCOS.md`:
     - OWASP ×5 → `"CC BY-SA 4.0"`
     - lista-decision-14 → `"CC BY 4.0"`
     - mitre-atlas → `"Apache-2.0 (atlas-data data)"`
     - mitre-attack → `"ATT&CK terms of use (non-exclusive, royalty-free licence)"`
     - cwe → `"CWE terms of use (non-exclusive, royalty-free licence)"`
     - NIST ×3 → `"Work of NIST employees (not subject to copyright in the US; outside the US, a worldwide royalty-free licence)"`
     - typesafe → `"No open licence declared (TypeSafe terms)"`
     - iso → `"ISO/IEC copyright (text not reproducible)"`

     Los textos de menos de 24 caracteres no disparan `idioma-repetido`.

  3. `Marco.nombre` sigue siendo `Nombre`: es el título propio tal como lo publica el editor (comentario en `esquemas.ts:6-7`). Se quitan las glosas en español:
     - `cwe.json:3` → `"Common Weakness Enumeration (CWE)"`;
     - `lista-decision-14.json:3` → `"Typed Decision Models: An Early Evidence Audit and Evaluation Checklist"`;
     - `typesafe-jev.json:3` → el título de la página `https://docs.typesafe.ai/model-jaggedness/jev-1.13.md` copiado literal (leerlo con `curl` y registrar el HTTP).

     Cada glosa pasa a `notas` `{es,en}`: «lista de 14 ítems» / «14-item checklist»; «documentación de los límites conocidos del modelo» / «documentation of the model's known limits». La de CWE (Top 25) ya está en `notas`.

  4. Nuevo invariante en `tests/unit/catalogo/catalogo-real.test.ts`: «ningún `nombre` de marco lleva glosa en español», con `expect(m.nombre).not.toMatch(/[áéíóúñ¿¡]|\b(y|de|del|la|los|las|el)\b/)`. Va con su demo en rojo: restaurar la glosa de `cwe.json` debe poner la prueba en rojo.
  5. Efecto en cadena: las huellas cambian. Hay que actualizar la guía en D1 y F1 (`e2858e62…`), D2 y D5. La instantánea `2026-10-04-12d3b632a871.json` se conserva como registro histórico (su prueba exige autoconsistencia, no igualdad), así que D5 se reescribe así: «hoy la misma fecha da `<nueva>`; la versionada es el registro del 2026-10-04». Ninguna prueba fija esas huellas a mano (comprobado con `git grep`).

  **Alternativa válida:** declararlo como deuda en el summary, pagable antes de la primera pantalla que muestre marcos (S2).

- **Verificación:**
  - `pnpm catalogo:validar` sale 1, con las mismas 10 advertencias y 4 notas.
  - `python3 -c "import json,glob;print([f for f in glob.glob('datos/marcos/*.json') if not isinstance(json.load(open(f))['licencia']['nombre'],dict)])"` → `[]`.
- **Casilla:** bilingüe (regla 20).

##### [ALTO] El filtro de contenido no ve las cargas escritas dentro de una línea, y la parada 2 lo presenta como prueba de que nada operativo pasó

- **Ubicación:** `datos/filtro/patrones.json:19,40,61,81`; `docs/GUIA-DE-PRUEBA.html:210-215`; `docs/MANUAL-DE-USO.md:91` y `:212`.
- **Qué pasa (confirmado con una sonda en Node sobre los patrones reales):** ninguno de estos textos se marca. Las sondas literales se describen en prosa, sin copiarlas (regla dura 3):
  - una etiqueta de script en línea;
  - una tautología de SQL tras una comilla;
  - una instrucción maliciosa escrita como frase;
  - un recorrido de ruta hacia un archivo del sistema;
  - un comando encadenado dentro de una línea;
  - una expresión de plantilla;
  - un bloque con triple comilla invertida sin lenguaje;
  - pasos en viñetas;
  - un comando de red sangrado;
  - una dirección con una etiqueta de script sin codificar en el parámetro.

  Solo se marcan las cuatro formas que fijó DA-03. Hay que precisar dos cosas:
  - Las cuatro formas son exactamente las de la orden: no hay desvío del plan.
  - Una prueba que no se marca puede nacer `aprobada` sin ningún registro de revisión (decisión 7 del plan). Por eso el filtro es la única barrera automática entre una carga escrita en línea y la instantánea publicada.

  Hoy no hay ninguna violación: leí las 38 pruebas.

- **Por qué importa:** el requisito RF-01.3 pide marcar «toda prueba cuyo texto parezca contener cargas». La parada 2 («busca `filtro/marcada`: no debe aparecer») y la orden («el filtro demuestra… que nada operativo pasó») afirman más de lo que el filtro puede ver. Las propuestas del investigador (RF-07.4) pasarán por este mismo filtro.
- **Ajuste ejecutable (lo mínimo, sin decisión de producto):**
  1. `MANUAL-DE-USO.md`, después de la línea 92: «- **Lo que el filtro no ve:** reconoce cuatro formas (bloque de código con intérprete, tres o más pasos numerados, cadena codificada larga y dirección con parámetros de inyección). Una carga corta escrita dentro de una línea (una etiqueta HTML, una comilla seguida de una condición, una ruta con `../`) no tiene ninguna de esas formas y no se marca: la lectura de cada prueba nueva por una persona sigue siendo el control.»
  2. Después de la línea 213, el equivalente en inglés: «- **What the filter does not see:** … a short inline payload … is not flagged: a person reading each new test is still the control.»
  3. En la guía, a2 (línea 214), añadir: «El filtro solo reconoce cuatro formas; por eso esta parada también es leer.»
  4. Al summary o al backlog: «DA-03: la lista inicial no cubre cargas en línea; se revisa con el usuario (RF-01.3 prevé ajustarla)». Se proponen estos patrones de forma, con carnadas inertes, para que el usuario decida:
     - bloque con comillas triples sin lenguaje: carnada `"```\ntexto\n```"`;
     - etiqueta HTML activa `<\s*(?:script|iframe|object|embed|svg)\b|\bon[a-z]+\s*=\s*["']`: carnada `"<script></script>"`;
     - recorrido de ruta `(?:\.\.[\\/]){2,}`: carnada `"../../archivo"`.
- **Verificación:** `grep -n "Lo que el filtro no ve" docs/MANUAL-DE-USO.md` da 1 línea, y `grep -n "What the filter does not see"` da 1.
- **Casilla:** frontera de contenido (regla dura 3).

##### [ALTO] Los errores del clasificador demo mezclan español e inglés y no respetan `--idioma`

- **Ubicación:** `src/engine/demo/conjunto.ts:172-174`, `src/engine/demo/clasificador.ts:260-263` y `src/cli/clasificador-demo.ts:35` (lectura sin envoltorio).
- **Qué pasa (confirmado):** con un conjunto modificado y `--idioma en`, el CLI imprime `conjunto inválido: parametros.repeticiones: Too small: expected number to be >=2`: prefijo en español y cuerpo de Zod en inglés. Lo mismo ocurre con `bins_ece=0` y `ruido_por_mil=900`. Un archivo que no existe da `ENOENT: no such file…`, solo en inglés. Por contraste, el `RangeError` del semáforo (`semaforo.ts:103`) sí es bilingüe.
- **Por qué importa:** `--conjunto` es una opción documentada, así que este texto llega al usuario.
- **Ajuste ejecutable:**
  1. `conjunto.ts:172`:
     ```ts
     const ruta = p.path.map(String).join(".") || "(raíz / root)";
     throw new RangeError(
       `conjunto inválido en ${ruta} (${p.code}) / invalid set at ${ruta} (${p.code})`,
     );
     ```
  2. `clasificador.ts:260`, igual: `petición inválida en ${ruta} (${p.code}) / invalid request at ${ruta} (${p.code})`.
  3. `clasificador-demo.ts:35`: envolver `readFileSync` y `JSON.parse` en un `try` que relance `new Error(\`error de lectura / read error: ${e.message}\`)`.
  4. Actualizar las pruebas:
     - `tests/unit/demo/clasificador.test.ts:249`: la expresión pasa a `/^petición inválida en .* \/ invalid request at /`;
     - `tests/unit/demo/conjunto.test.ts:128`: pasa a `/conjunto inválido en \(raíz \/ root\)/`.
- **Verificación:** con un conjunto cuyas `repeticiones` valen 1, `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/cli/clasificador-demo.ts --conjunto <archivo> --idioma en` debe imprimir en stderr «invalid set at parametros.repeticiones (too_small)» y salir con 3.
- **Casilla:** bilingüe (regla 20).

##### [MEDIO] La prueba del hook no cubre el caso «falta solo una herramienta»

- **Ubicación:** `.claude/settings.json:12`; `tests/unit/hook-secretos.test.ts:48-73`.
- **Qué pasa (confirmado):** corrí el comando real del hook con gitleaks en el PATH, sin jq, y con la carnada como contenido:
  - el hook original sale 2;
  - mutado de `||` a `&&`, sale 0 y deja pasar la carnada.

  Las 3 pruebas existentes (faltan las dos, `KIT_SIN_GITLEAKS`, están las dos) siguen en verde con esa mutación.

- **Por qué importa:** «gitleaks sí, jq no» es el caso más probable en Windows con Git Bash, que no trae jq. Hoy esa rama de «falla cerrado» no tiene ninguna prueba que la sostenga.
- **Ajuste ejecutable:** en `hook-secretos.test.ts`, añadir:
  ```ts
  const hay = (b: string) =>
    spawnSync("/bin/bash", ["-c", `command -v ${b}`]).status === 0;
  function pathCon(extras: string[]) {
    const dir = pathSinHerramientas();
    for (const b of extras) {
      const r = spawnSync("/bin/bash", ["-c", `command -v ${b}`], {
        encoding: "utf8",
      });
      if (r.stdout.trim().startsWith("/"))
        symlinkSync(r.stdout.trim(), join(dir, b));
    }
    return dir;
  }
  it.runIf(hay("jq"))("con jq pero sin gitleaks bloquea", () => {
    const r = correr("hola", { PATH: pathCon(["jq"]) });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("falta gitleaks o jq");
  });
  it.runIf(hay("gitleaks"))("con gitleaks pero sin jq bloquea", () => {
    const r = correr("hola", { PATH: pathCon(["gitleaks"]) });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("falta gitleaks o jq");
  });
  ```
  La demo en rojo se hace con `demo-rojo.sh`, mutando `||` por `&&` en el `command`: las dos pruebas nuevas tienen que salir en rojo y volver a verde al restaurar. Se registra en la bitácora.
- **Verificación:** `pnpm vitest run tests/unit/hook-secretos.test.ts` debe dar 5 de 5 en local.
- **Casilla:** secretos (regla 7, regla 15).

##### [MEDIO] La prueba que bloquea la carnada nunca corre en la CI

- **Ubicación:** `tests/unit/hook-secretos.test.ts:62` (`it.runIf(hayHerramientas)`); `.github/workflows/ci.yml:33`.
- **Qué pasa (confirmado):** en el log de la corrida 37253753617 aparece `tests/unit/hook-secretos.test.ts (3 tests | 1 skipped)` y en el total `1147 passed | 1 skipped`. El runner de Ubuntu no tiene gitleaks.
- **Por qué importa:** regla 15, «skipped no es verde». La única prueba que demuestra que el hook detecta un secreto no ejecuta en la CI, y la CI no tiene ningún otro escaneo de secretos.
- **Ajuste ejecutable:**
  1. En `ci.yml`, job `quality`, antes de `pnpm test`, un paso que instale gitleaks 8.30.1 (la misma versión que en local) en `$HOME/.local/bin`:
     - descargar `gitleaks_8.30.1_linux_x64.tar.gz` del release;
     - verificar su SHA-256 contra el `checksums.txt` publicado (`sha256sum -c`);
     - `tar -xzf … gitleaks`;
     - `echo "$HOME/.local/bin" >> "$GITHUB_PATH"`.
  2. En la prueba, cambiar `it.runIf(hayHerramientas)` por `it.runIf(hayHerramientas || process.env.CI === "true")`. Así, una CI sin gitleaks sale en rojo en lugar de saltarse la prueba.
  3. La demo en rojo va en un PR desechable sin el paso de instalación: `quality` debe salir en rojo.

  **Alternativa:** declarar la prueba `manual` en el summary, con su corrida local registrada.

- **Verificación:** con `gh run view <id> --log | grep hook-secretos` debe verse `(3 tests)` sin «skipped».
- **Casilla:** secretos (regla 15).

##### [MEDIO] `instantanea --agregar` escribe en la carpeta versionada un derivado que viene de fuera de `datos/`, con la ruta de la máquina dentro

- **Ubicación:** `src/cli/catalogo.ts:83` (salida por defecto `datos/instantaneas`); `src/cli/cargar.ts:67` (`path.relative` de un archivo externo).
- **Qué pasa:**
  - **Confirmado:** `instantanea --fecha 2026-10-15 --agregar <archivo fuera del repo con advertencia> --salida <tmp>` emite el archivo y deja en `advertencias[].ruta` el valor `"../../../../private/tmp/claude-501/-Users-henryrincon-…/SEMILLA-SIN-CONTROL.json"`. Ahí van el nombre del usuario y la estructura local. Además, la huella pasa a depender de la máquina, lo que rompe la promesa del manual de «la misma huella en cualquier computador».
  - **Plausible:** sin `--salida`, el CLI escribiría en `datos/instantaneas/`, que está versionada, aunque el archivo agregado venga de `datos/privado/`. El archivo nace con permisos 644, y nada lo impide (regla 17-bis(a)).
- **Por qué importa:** un solo comando basta para que un borrador privado y la ruta del equipo terminen en el repo público.
- **Ajuste ejecutable:**
  1. En `catalogo.ts`, dentro de la rama `instantanea` y antes de `construirInstantanea`:
     ```ts
     if (
       o.agregar.length > 0 &&
       (o.salida === undefined ||
         path.resolve(o.salida) === path.resolve("datos/instantaneas"))
     )
       throw new ErrorDeUso(
         "--agregar exige --salida fuera de datos/instantaneas/ / --agregar requires --salida outside datos/instantaneas/",
       );
     ```
  2. En `cargar.ts:67`, para cada archivo agregado: si `path.relative(raiz, abs)` empieza por `..`, usar como ruta `agregado/${path.basename(abs)}`; si no, la relativa de hoy. Así siguen funcionando la guía (C1–C4, D4) y `semillas-del-catalogo.test.ts`, que arma sus rutas por su cuenta.
  3. Pruebas nuevas en `tests/unit/catalogo/cli.test.ts`:
     - (a) `instantanea --fecha 2026-10-15 --agregar docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json` sin `--salida` sale 3 y no crea ningún archivo nuevo en `datos/instantaneas`;
     - (b) un archivo externo con advertencia deja `ruta` = `agregado/<nombre>`.

     Cada una con su demo en rojo.
- **Verificación:** `git status --porcelain datos/instantaneas` vacío después de (a); `grep -c '"ruta": "\.\./' <instantánea>` igual a 0.
- **Casilla:** privacidad (reglas 8 y 17-bis).

##### [MEDIO] Guía: contraste de 4,44:1 en las celdas de valor del tema claro

- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:74` (`--ok: #4f7a4a`) y `:146` (`td.valor`).
- **Qué pasa (confirmado):** axe da `color-contrast(serious) x15` en tema claro en los tres motores: #4f7a4a sobre #f2f2ef = 4,44 (el mínimo es 4,5). El tema oscuro está limpio.
- **Ajuste ejecutable:** en la línea 74, dentro del `:root` claro, cambiar `--ok: #4f7a4a;` por `--ok: #477043;`. Calculado: 5,11 sobre #f2f2ef, 5,53 sobre #fbfbfa y 4,53 sobre #dde6ec.
- **Verificación:** axe con wcag2aa sobre `file://…/GUIA-DE-PRUEBA.html`, `colorScheme: "light"` → 0 violaciones en Chromium, Firefox y WebKit.
- **Casilla:** a11y de la guía (regla 11).

##### [MEDIO] Guía D1: cuenta archivos sin decir desde qué estado parte

- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:290-295`.
- **Qué pasa (confirmado leyendo):** D1 espera «en `/tmp/hackguard` un solo archivo», pero D2, D3 y D5 escriben en esa misma carpeta. Al repetir el bloque (el gate se corre por bloques, y volver a probar tras un arreglo es parte del gate) salen 4 archivos. Eso contradice la regla 9 que la propia guía declara en su cabecera.
- **Ajuste ejecutable:** en las líneas 290 y 292, D1 usa su propia carpeta: `--salida /tmp/hackguard-d1` en «Empieza en:» y en el paso. El esperado pasa a «en `/tmp/hackguard-d1` un solo archivo, `2026-10-15-<huella12>.json`, aunque repitas el bloque». Como el CLI no reescribe un archivo con la misma huella, sigue habiendo uno solo.
- **Verificación:** correr D1, D2, D5 y otra vez D1: `ls /tmp/hackguard-d1 | wc -l` debe dar 1.
- **Casilla:** guía (regla 11).

##### [BAJO] Identificadores en español dentro de la salida en inglés

- **Ubicación:**
  - `src/engine/demo/conjunto.ts:333` y `:351`: «Choice: aprobar · rechazar · revisar» y «the band: “aprobar”».
  - `src/engine/catalogo/validar.ts:900`, `:926` y `:1146`: el detalle de `filtro/marcada` muestra el id «pasos-imperativos» aunque el patrón tiene `nombre` `{es,en}`.
  - `src/cli/catalogo.ts:79`: «--fecha AAAA-MM-DD» en modo inglés.
  - `src/cli/catalogo.ts:65`: `--agregar <archivo>` no dice que el archivo no existe.
- **Qué pasa (confirmado):** salen así en `--idioma en`.
- **Ajuste ejecutable:**
  - En el detalle de `filtro/marcada`, usar `{ es: «nombre.es», en: “nombre.en” }` del patrón.
  - En el informe del demo en inglés, añadir glosas (`aprobar (approve) · rechazar (reject) · revisar (review)`).
  - `ErrorDeUso` con texto bilingüe: `--fecha AAAA-MM-DD / --fecha YYYY-MM-DD` y `--agregar: no existe / does not exist: <archivo>`.
- **Verificación:** con `--agregar docs/kit-de-prueba/semillas/SEMILLA-PATRON-PASOS.json --idioma en` sale «Step-by-step imperative sequence».
- **Casilla:** bilingüe.

##### [BAJO] Una familia sin pruebas publicadas se imprime sin marca

- **Ubicación:** `src/engine/catalogo/informe.ts:156-160`.
- **Qué pasa (confirmado leyendo):** «sin pruebas publicadas N» se imprime sin símbolo. El vocabulario `vigencia` no tiene un estado para ese caso, así que la pantalla del S2 heredará el mismo hueco. Hoy no ocurre, porque las 4 familias tienen pruebas.
- **Ajuste ejecutable:** añadir a `datos/estados.json`, vocabulario `vigencia`, el estado `{ "id": "sin_pruebas", "rol": "neutro", "simbolo": "vacio", "nombre": { "es": "Sin pruebas publicadas", "en": "No published tests" } }` y pintarlo con `MARCAS.vacio`. También puede quedar como backlog del S2.
- **Casilla:** el color nunca solo (regla dura 12).

##### [BAJO] La cita del usuario no coincide entre la guía y la bitácora

- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:203-204` («Aprobados lo marcos, continua») frente a `sprints/SPRINT_001-implementation-log.md:132` («Aprobados los marcos, continúa»).
- **Ajuste ejecutable:** dejar las dos con el texto literal del usuario, con «(sic)» si se conservan las erratas, como ya se hizo en la línea 411.
- **Casilla:** evidencia (regla 27).

##### [BAJO] La guía está solo en español

- **Ubicación:** `docs/GUIA-DE-PRUEBA.html` (`lang="es-CO"`).
- **Qué pasa (plausible, es una interpretación):** la regla 20 pide «documentos» bilingües y la guía se declara también «entregable para usuarios finales». Hay precedente en las dos direcciones: planlang tiene la guía bilingüe y big-d no. La orden no lo exige.
- **Ajuste:** que lo decida la planeadora; si no se hace ahora, anotarlo en el summary.
- **Casilla:** bilingüe.

---

**Casilla 8 (protecciones del sistema tocadas): ninguna.**

- Busqué en el diff Llavero, TCC, launchd o LaunchAgents, Touch ID, `osascript`, certificados, `sudo`, micrófono y cámara: no aparece nada.
- `pnpm test` solo lanza `bash`, `git`, `node` y gitleaks, y escribe en `os.tmpdir()`.
- `verificar-dependencias.test.ts` inyecta la consulta al registro, así que no sale a la red.
- Las reglas 24 y 25 se cumplen.
- Regla 26: no hay worktrees.

**Para mi superficie: requiere ajustes.** Los 3 altos hay que corregirlos o declararlos como deuda en el summary con su sprint de pago. Los medios del hook (2), de `--agregar` y de la guía (2) son cambios acotados.

## Anexo C — Informe del auditor «motor, contrato, gates y dependencias», tal como lo entregó

### Auditoría independiente S1 HackGuard: motor, contrato, gates y dependencias

**Veredicto para mi superficie: requiere ajustes.** Hay 2 hallazgos Altos, 7 Medios y 8 Bajos. No encontré nada Crítico.

No toqué el repo: `git status` sale limpio y no hay stash. Lo único que se movió fue un `git fetch origin main`, que solo actualiza `FETCH_HEAD` y la referencia `origin/main` dentro de `.git`. Todas las mutaciones las hice sobre una copia en el scratchpad (`…/scratchpad/copia-hg`, con `node_modules` enlazado).

**Lo que verifiqué y está bien:**

- **Pruebas unitarias:** 1.149 de 1.149 en verde en la copia.
- **Cobertura:** el motor queda en 99,12 % de sentencias y 94,48 % de ramas en `engine/catalogo`, y en 99,47 % y 96,42 % en `engine/demo`.
- **Reglas del validador:** son 61 y cada una tiene un caso que la hace saltar.
- **Paso de CI «Catálogo válido»:** `pnpm` propaga el código del CLI (2 → paso en rojo, 1 → paso en verde; comprobado con `bash -ec`).
- **Dependencias:** `esbuild` entró exacto en 0.28.2. `verificar-dependencias` dice «680 paquetes, ninguno por debajo de origin/main».
- **Scripts del kit:** son idénticos byte a byte a `kit-app/scripts`.
- **Instantánea versionada:** `2026-10-04-12d3b632a871` se reproduce exacta desde los datos actuales.
- **e2e de determinismo en CI:** en la corrida 37253753617, Node, Chromium, Firefox y WebKit dan las mismas huellas en las 9 pruebas.

---

#### ALTO

##### [ALTO] Las pruebas fechan contra el calendario y la matriz de envejecimiento revienta con fechas de verificación mezcladas

- **Ubicación:**
  - `tests/unit/catalogo/envejecimiento.test.ts:35-46`, `:55-58` y `:125-140`;
  - `tests/unit/catalogo/instantanea.test.ts:13`, `:60`, `:80`;
  - `tests/unit/catalogo/informe.test.ts:124`, `:162`, `:169`, `:180`, `:192`;
  - `tests/unit/catalogo/cli.test.ts:96`, `:113`, `:137`;
  - `tests/e2e/determinismo.spec.ts:19-21`;
  - la causa está en `src/engine/catalogo/semaforo.ts:102-107` (RangeError si la fecha es anterior a la última verificación).
- **Qué pasa (CONFIRMADO en la copia):**
  1. **Re-verificar una sola entidad después del 2026-10-15 rompe 13 pruebas unitarias.** Con `datos/herramientas/nuclei.json` en `fecha_verificacion: "2026-10-20"` fallan 13 en 4 archivos (cli, envejecimiento, informe, instantanea). El e2e se rompería igual, porque usa el mismo `"2026-10-15"`.
  2. **La matriz no soporta fechas separadas por más de 29 días.** Con una herramienta en `"2026-08-20"` y el resto en `2026-10-04`, el módulo entero de la matriz falla al cargar: «RangeError: la fecha de evaluación 2026-09-18 es anterior a la última verificación…» y corre 0 pruebas. La causa es que la matriz incluye umbrales de lo verificado antes, que caen antes de la última verificación.
  3. **La prueba «cambian el día de cada umbral» solo compara `semaforo.pruebas`.** Si lo re-verificado es un marco o una herramienta, falla aunque el motor esté bien.
- **Por qué importa:**
  - El S2 va a heredar la CI en rojo en cuanto re-verifique datos.
  - La regla 23 existe justamente para el catálogo vivo con fechas mezcladas, y ahí el gate se cae en vez de medir.
  - La bitácora (fase 3, bloque A) dice que los estados mezclados «no los tendría» el catálogo real. Lo tendrá.
- **Ajuste ejecutable (verificado en la copia):**
  1. `tests/unit/catalogo/ayuda.ts`, tras `const base = cargarCatalogo(RAIZ);`:
     ```ts
     export const ULTIMA_VERIFICACION = [
       ...base.marcos,
       ...base.herramientas,
       ...base.pruebas,
     ]
       .map(
         (a) =>
           (JSON.parse(a.texto) as { fecha_verificacion?: string })
             .fecha_verificacion ?? "",
       )
       .reduce((max, f) => (f > max ? f : max), "");
     export const FECHA_BASE = "2026-10-04";
     function conFechaBase(archivo: ArchivoDeDatos): ArchivoDeDatos {
       const datos = JSON.parse(archivo.texto) as Record<string, unknown>;
       datos.fecha_verificacion = FECHA_BASE;
       return { ...archivo, texto: JSON.stringify(datos) };
     }
     ```
     y `catalogoBase()` pasa a:
     ```ts
     const c = structuredClone(base);
     return {
       ...c,
       marcos: c.marcos.map(conFechaBase),
       herramientas: c.herramientas.map(conFechaBase),
       pruebas: [],
     };
     ```
  2. `cli.test.ts`:
     - importar `fechaMasDias` y `ULTIMA_VERIFICACION`;
     - `const FECHA = fechaMasDias(ULTIMA_VERIFICACION, 11)`, `OTRA_FECHA = …(…, 12)` y `ANTERIOR = …(…, -1)`;
     - reemplazar `"2026-10-15"` → `FECHA`, `"2026-10-16"` → `OTRA_FECHA` y `"2026-10-03"` → `ANTERIOR`;
     - el mensaje esperado pasa a `` `la fecha de evaluación ${ANTERIOR} es anterior a la última verificación del catálogo (${ULTIMA_VERIFICACION})` ``;
     - el regex de la línea 143 pasa a ``new RegExp(`^Instantánea emitida: .*${OTRA_FECHA}-[0-9a-f]{12}\\.json\\n`)``;
     - el `archivo` esperado pasa a `` `${temporal}/${FECHA}-…` ``.
  3. `envejecimiento.test.ts`:
     - **Filtro de fechas:** tras construir el arreglo de `FECHAS`, añadir `.filter((f) => f >= hoy)` antes de `.sort()`, con un comentario: «el motor rechaza fechas anteriores a la última verificación; esos umbrales los cubre semaforo.test.ts».
     - **Pares de víspera y día:** en el bucle de las líneas 130-138, tras `const dia = …`, añadir `if (vispera < hoy) continue;`.
     - **Qué se compara:** `vigencias()` mapea `[...semaforo.pruebas, ...semaforo.marcos, ...semaforo.herramientas]`.
  4. `determinismo.spec.ts`:
     - importar `fechaMasDias` y sustituir las líneas 19-21 por:
       ```ts
       const LEIDO = cargarCatalogo(RAIZ);
       const ULTIMA = [...LEIDO.marcos, ...LEIDO.herramientas, ...LEIDO.pruebas]
         .map(
           (a) =>
             (JSON.parse(a.texto) as { fecha_verificacion: string })
               .fecha_verificacion,
         )
         .reduce((m, f) => (f > m ? f : m), "");
       const POR_REVISAR = (
         JSON.parse(LEIDO.umbrales?.texto ?? "{}") as {
           vigencia: { por_revisar: number };
         }
       ).vigencia.por_revisar;
       const FECHA = fechaMasDias(ULTIMA, 11);
       const FECHA_EN_UMBRAL = fechaMasDias(ULTIMA, POR_REVISAR);
       ```
     - en `beforeAll`, `catalogo = LEIDO;`.
- **Verificación:**
  - En una copia, `zap.json` con `"2026-10-20"` y `nuclei.json` con `"2026-08-20"` → `npx vitest run tests/unit` todo en verde. Ya lo medí con el arreglo: 43 de 43 en la matriz y el resto en verde.
  - Volver a datos reales y cambiar `semaforo.ts:71` de `>=` a `>` → la matriz en rojo. Medido: 3 fallas con fechas mezcladas y 2 con datos reales.
  - El e2e no lo corrí; su arreglo queda por correr.
- **Casilla:** regla 23 y gates (regla 15).

##### [ALTO] El lint de determinismo del motor deja pasar `crypto.randomUUID`, `globalThis.Date`, `navigator` e `import()` dinámico

- **Ubicación:** `eslint.config.mjs:26-53`.
- **Qué pasa (CONFIRMADO):** un archivo sonda en `src/engine/` con estas líneas pasa `eslint` sin error:
  - `globalThis.Date.now()`, `crypto.randomUUID()` y `crypto.getRandomValues(...)`;
  - `navigator.userAgent`, `globalThis.Math.random()` y `new globalThis.Intl.Collator()`;
  - `await import("node:fs")`.

  Solo se marcan `Date.now()`, `Math.random()`, `const {random}=Math` e `Intl`. La propia demo en rojo del e2e (bitácora, fase 4) metió `navigator.userAgent` en `instantanea.ts`, y el lint no lo vio.

- **Por qué importa:**
  - La regla dura 1 promete un núcleo sin azar ni entorno.
  - `crypto.randomUUID()` es la tentación natural en el S3 (ids de sobres y lotes) y hoy sale en verde.
  - Es un gate con falsos negativos sobre el caso más probable.
- **Ajuste ejecutable (verificado en la copia):** en el bloque `files: ["src/engine/**/*.ts"]`:
  1. Añadir `"navigator", "window", "self", "document", "location"` a la lista de `no-restricted-globals`.
  2. Añadir, antes de `"no-restricted-imports"`:
     ```js
     "no-restricted-syntax": ["error",
       { selector: "MemberExpression[object.name='globalThis'][property.name!='crypto']", message: "Del entorno global, el núcleo solo usa globalThis.crypto.subtle (regla dura 1)." },
       { selector: "MemberExpression[object.name='crypto'][property.name!='subtle']", message: "Del entorno global, el núcleo solo usa globalThis.crypto.subtle (regla dura 1)." },
       { selector: "MemberExpression[object.property.name='crypto'][property.name!='subtle']", message: "Del entorno global, el núcleo solo usa globalThis.crypto.subtle (regla dura 1)." },
       { selector: "ImportExpression", message: "El núcleo no importa en tiempo de ejecución (regla dura 1)." },
     ],
     ```
  3. Opcional: ampliar `files` a `src/engine/**/*.{ts,tsx,mts}`.
- **Verificación:**
  - La sonda de 8 líneas (las 7 de arriba más `globalThis.crypto.subtle`) da 7 errores, y `globalThis.crypto.subtle` pasa.
  - `npx eslint src/engine src/cli` limpio sobre el árbol real (medido).
  - Registrar la demo en rojo con `demo-rojo.sh` (`crypto.randomUUID()` en `huella.ts`).
- **Casilla:** 2 (seguridad y determinismo) y gates.

#### MEDIO

##### [MEDIO] Ninguna prueba puede fallar si el orden de las pruebas de entrada cambia la huella

- **Ubicación:**
  - `tests/unit/catalogo/instantanea.test.ts:66-76`: invierte solo marcos y herramientas, y `catalogoBase()` no trae pruebas;
  - `tests/unit/catalogo/validar.test.ts:711-723`: invierte una lista de 1 prueba;
  - `tests/e2e/determinismo.spec.ts`: Node y navegador reciben el mismo orden.
- **Qué pasa (CONFIRMADO):** muté `validar.ts:905` para que las pruebas sigan el orden de entrada (`.sort` por índice en `entrada.pruebas`). La huella del 2026-10-15 cambió (`6f32…` en vez de `e285…`) y las 1.149 pruebas unitarias siguieron en verde.
- **Por qué importa:** el día que la UI cargue los archivos en otro orden, la huella del navegador divergirá de la de Node sin que nada lo vea antes.
- **Ajuste ejecutable (verificado):** añadir en `instantanea.test.ts`:

  ```ts
  it("el catálogo real, con cada lista invertida, da la misma huella", async () => {
    const directo = await construirInstantanea(catalogoReal(), FECHA);
    const c = catalogoReal();
    for (const l of [
      c.marcos,
      c.equivalencias,
      c.controles,
      c.herramientas,
      c.pruebas,
    ])
      l.reverse();
    const invertido = await construirInstantanea(c, FECHA);
    if (!directo.emitida || !invertido.emitida)
      throw new Error("debía emitirse");
    expect(invertido.instantanea.huella).toBe(directo.instantanea.huella);
  });
  ```

  Importar `catalogoReal`. Ojo: `FECHA` debe ser posterior a la última verificación del catálogo real, o sea la derivada del hallazgo Alto 1.

  Opcional y barato: en el e2e, enviar al navegador una copia de `LEIDO` con las cinco listas invertidas.

- **Verificación:** pasa sobre el código real y falla con la mutación («expected '5a70…' to be '6f32…'», medido).
- **Casilla:** 2 (tests) y regla 19.

##### [MEDIO] La prueba «el manifiesto nombra cada semilla del directorio» no puede fallar

- **Ubicación:** `tests/unit/instrumento/semillas-del-catalogo.test.ts:96-105`.
- **Qué pasa (CONFIRMADO):** `enDisco` es el texto del propio `semillas.json`, no el listado de la carpeta. Una `SEMILLA-HUERFANA.json` fuera del manifiesto deja la prueba en 22 de 22 verde.
- **Por qué importa:** una semilla nueva sin entrada en el manifiesto jamás se ejerce en C18. El «N de N» sale sin ella.
- **Ajuste ejecutable:**
  - importar `readdirSync`;
  - sustituir `const enDisco = readFileSync(...)` y el `expect(enDisco).toContain(s.archivo)` por:
    ```ts
    const enCarpeta = readdirSync(`${RAIZ}/${SEMILLAS}`)
      .filter((n) => n.startsWith("SEMILLA-") && n.endsWith(".json"))
      .sort();
    expect(manifiesto.semillas.map((s) => s.archivo).sort()).toEqual(enCarpeta);
    ```
- **Verificación:** con una semilla huérfana en la copia, la prueba sale en rojo; sin ella, en verde.
- **Casilla:** gates (¿puede fallar?).

##### [MEDIO] `instantanea --agregar` publica pruebas de fuera de `datos/` en una instantánea de aspecto oficial

- **Ubicación:** `src/cli/catalogo.ts:76-90`.
- **Qué pasa (CONFIRMADO):** `pnpm catalogo:instantanea --fecha 2026-10-15 --agregar docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json` emite una instantánea con 39 pruebas, incluida la semilla.
  - Sin `--salida`, cae en `datos/instantaneas/` y pasa `instantaneas-versionadas.test.ts`, que solo mide autoconsistencia.
  - Nada en el archivo dice que entró algo de fuera; las advertencias no nombran ninguna ruta externa.
- **Ajuste ejecutable:** en `catalogo.ts`, dentro de `if (o.comando === "instantanea")` y tras validar la fecha:
  ```ts
  if (o.agregar.length > 0) {
    const datosAbs = path.resolve(raiz, "datos");
    const salidaAbs = o.salida === undefined ? null : path.resolve(o.salida);
    if (
      salidaAbs === null ||
      salidaAbs === datosAbs ||
      salidaAbs.startsWith(`${datosAbs}${path.sep}`)
    )
      throw new ErrorDeUso(
        "--agregar con instantanea exige --salida fuera de datos/",
      );
  }
  ```
  Y en `cli.test.ts` un caso: `catalogo("instantanea","--fecha",FECHA,"--agregar",\`${SEMILLAS}/SEMILLA-REFERENCIA.json\`)`→`codigo`3,`errores`contiene «--salida fuera de datos/» y`readdirSync("datos/instantaneas")` no cambia.
- **Verificación:** con ese comando, `ls datos/instantaneas` sigue con un solo archivo. El paso d4 de la guía (que sí usa `--salida /tmp/hackguard`) sigue saliendo 2.
- **Casilla:** 2 (superficie de entrada del CLI) y gate de publicación.

##### [MEDIO] `revision.huella` no tiene productor: no hay forma de aprobar una prueba marcada sin escribir código

- **Ubicación:** `src/engine/catalogo/validar.ts:453-464` y `:1110-1137`.
- **Qué pasa (CONFIRMADO por lectura y `grep`):**
  - `huellaDeRevision` solo la llaman el validador y las pruebas unitarias.
  - Ningún comando la imprime, y ningún hallazgo la incluye en su detalle.
  - La parada 2 («revisada_y_aprobada» con registro) no es ejecutable por una persona. No saltó en el S1 porque hubo cero marcadas.
- **Ajuste ejecutable:** en `validar.ts`, sustituir el cálculo de `revisionAlDia` (líneas 1110-1112) por:
  ```ts
  const huellaActual = await huellaDeRevision(p);
  const revisionAlDia =
    p.revision !== undefined && huellaActual === p.revision.huella;
  const conHuella = t(
    `huella del contenido a revisar: ${huellaActual}`,
    `fingerprint of the content to review: ${huellaActual}`,
  );
  ```
  y pasar `conHuella` como 4.º argumento en `registro.agregar("prueba/revision-sin-registro", ruta, "revision", conHuella)` y en `registro.agregar("prueba/revision-desactualizada", ruta, "revision.huella", conHuella)`.
  - En `validar.test.ts`, el caso `prueba/revision-sin-registro` añade `expect(encontrado?.detalle?.es).toContain(await huellaDeRevision(Prueba.parse({...p, revision_contenido:"revisada_y_aprobada"})))`.
  - El manual describe los dos pasos (eso es del auditor de textos).
- **Verificación:**
  - `pnpm catalogo:validar --agregar <semilla con revision_contenido revisada_y_aprobada y sin revision>` imprime la huella de 64 caracteres.
  - La instantánea oficial no cambia de huella: hoy no hay advertencias de ese tipo.
- **Casilla:** 5 (campo sin productor) y 2.

##### [MEDIO] Estados que el motor emite sin etiqueta en el vocabulario

- **Ubicación:**
  - `src/engine/catalogo/instantanea.ts:34`: `pendientes_de_revision[].motivo`, con los valores `propuesta`, `marcada_para_revision` y `revision_desactualizada`;
  - `src/engine/catalogo/semaforo.ts:41-43`: familia con `estado: null`;
  - `src/engine/catalogo/semaforo.ts:19-23`: `ESTADOS_QUE_CALCULA_EL_MOTOR` solo declara `vigencia`;
  - `src/engine/catalogo/informe.ts:153-160`: «sin pruebas publicadas» escrito a mano.
- **Qué pasa (CONFIRMADO):** `datos/estados.json` trae 9 vocabularios, y ninguno cubre esos motivos ni la «familia sin pruebas». La instantánea los publica.
- **Por qué importa:** la regla dura 12 y la decisión 2 del ADR-003 dicen que no se publica un estado sin etiqueta. El S2 los pintará.
- **Ajuste ejecutable:**
  - El ajuste mínimo y coherente con «sin tocar `docs/diseno/`»: añadir a `decisions/003-state-vocabulary-as-data.md`, en Consequences:
    > The engine also emits `pendientes_de_revision[].motivo` and family `estado: null`; their labels (vocabulary `pendiente_de_revision` and a «no published tests» state) arrive with the first screen that shows them (S2), and `ESTADOS_QUE_CALCULA_EL_MOTOR` gains them in that same sprint.
  - Y registrarlo como deuda en el summary con sprint de pago S2.
- **Verificación:** `grep -n "pendiente_de_revision" decisions/003-*.md sprints/SPRINT_001-summary.md` devuelve resultados.
- **Casilla:** 5 y regla dura 12.

##### [MEDIO] El e2e de determinismo corre con reintentos en CI, y una divergencia intermitente sale «flaky» en verde

- **Ubicación:** `playwright.config.ts:14` (`retries: process.env.CI ? 2 : 0`) y `tests/e2e/determinismo.spec.ts:46`.
- **Qué pasa (PLAUSIBLE; no corrí el e2e):** una fuga de azar o de reloj que diverge 1 de cada 3 veces pasa al reintento. Playwright no falla el job por pruebas flaky.
- **Ajuste ejecutable:** en `determinismo.spec.ts:46`, `test.describe.configure({ mode: "serial", retries: 0 });`.
- **Verificación:** `grep -n "retries: 0" tests/e2e/determinismo.spec.ts`. Demo opcional: un contador de módulo que cambia `formato` en llamadas alternas da rojo en CI, no flaky.
- **Casilla:** gates (regla 15) y regla 19.

##### [MEDIO] Los selectores de Garak y ZAP están cableados en el esquema del núcleo

- **Ubicación:** `src/engine/catalogo/esquemas.ts:326-331` (`TIPOS_DE_SELECTOR`) y `:374-388` (`Selector`).
- **Qué pasa (CONFIRMADO por lectura):**
  - El tercer adaptador previsto (promptfoo, H2 en el brief, línea 82; y PyRIT e Inspect en D10) obliga a editar el esquema del núcleo.
  - No hay regla que ate `tiene_adaptador: true` a un selector de adaptador.
  - La regla dura 10 dice que «agregar un adaptador no toca el núcleo».
- **Ajuste ejecutable:** declararlo como constante con su razón:
  - comentario sobre `TIPOS_DE_SELECTOR`: «Un adaptador trae su selector; agregar uno añade aquí su forma (contrato del adaptador). En S3 los selectores se mueven a `src/engine/adaptadores/<id>/selector.ts` y este union se arma desde ese registro»;
  - la misma frase en ADR-002 o en uno nuevo, y la tarea anotada para el S3.
- **Verificación:** `grep -n "Un adaptador trae su selector" src/engine/catalogo/esquemas.ts decisions/*.md`.
- **Casilla:** 7.

#### BAJO

##### [BAJO] Asserts de «otra fecha, otra huella» que el defecto también cumple

- **Ubicación:** `tests/e2e/determinismo.spec.ts:147`, `tests/unit/catalogo/envejecimiento.test.ts:135-137` y `tests/unit/catalogo/instantanea.test.ts:78-84`.
- **Qué pasa (CONFIRMADO por lectura):** `fecha_evaluacion` entra en la huella, así que la huella siempre cambia aunque el semáforo esté roto.
- **Ajuste ejecutable:** en el e2e, que `page.evaluate` devuelva también `[...new Set([...s.pruebas, ...s.marcos, ...s.herramientas].map(v => v.estado))]`, y afirmar `toContain("por_revisar")` en `FECHA_EN_UMBRAL`. En las dos pruebas unitarias, borrar el assert de huella (el de estados ya lo cubre).
- **Casilla:** gates.

##### [BAJO] Las probabilidades del demo no suman exactamente 1 en coma flotante

- **Ubicación:**
  - comentarios en `src/engine/demo/clasificador.ts:3` y `:8`;
  - ADR-004, línea 32;
  - bitácora, líneas 510-511.
- **Qué pasa (CONFIRMADO):** suman 1 en diezmilésimos enteros, pero en flotante 3 de 52 distribuciones dan 0,9999999999999999 (BIB-001 es, BIB-013 es, BIB-022 en). Además `margen` (`conjunto.ts:261`) sale con ruido flotante, por ejemplo 0.04820000000000002.
- **Ajuste ejecutable:**
  - redactar «suman 10 000 diezmilésimos; en coma flotante la suma puede diferir de 1 en el último bit»;
  - añadir en `clasificador.test.ts` `expect(Math.abs(sum - 1)).toBeLessThanOrEqual(1e-12)`;
  - en `conjunto.ts:261`: `margen: (Math.round((d.probabilities[banda.opcion] ?? 0) * 10000) - Math.round(banda.umbral * 10000)) / 10000`.
- **Casilla:** 2 (floats).

##### [BAJO] Cardinalidades del catálogo cableadas en las pruebas (no en el núcleo)

- **Ubicación:**
  - `instantanea.test.ts:43-51` (14 marcos, 13 herramientas, `[null×4]`);
  - `informe.test.ts:41`, `:83`, `:130`, `:136-138`, `:154`, `:172`, `:175`;
  - `validar.test.ts:694-708` (conteos y notas).
- **Por qué importa:** agregar un marco o una familia rompe pruebas que no miden eso.
- **Ajuste ejecutable:** derivar los valores de `catalogoBase()`. Por ejemplo `const marcos = catalogoBase().marcos.length`, `toHaveLength(marcos)`, `Array(familias).fill(null)`, y armar las cadenas con esas cifras.
- **Casilla:** 7, lado de pruebas.

##### [BAJO] `erasableSyntaxOnly` no está activado

- **Ubicación:** `tsconfig.json`.
- **Qué pasa (CONFIRMADO en la copia):** un `enum` en `src/engine/` pasa `tsc`. Con `--erasableSyntaxOnly` da TS1294, y el resto del repo compila limpio con el flag.
- **Ajuste ejecutable:** `"erasableSyntaxOnly": true` en `compilerOptions`.
- **Casilla:** 3 y decisión 1 del plan.

##### [BAJO] El CLI no declara qué Node exige

- **Ubicación:** `package.json`.
- **Qué pasa:** el CLI exige type stripping sin flag (Node ≥ 22.18). No hay `engines` ni `.nvmrc`.
- **Ajuste ejecutable:** `"engines": { "node": ">=22.18" }`.
- **Casilla:** 3.

##### [BAJO] `huellaDeInstantanea` elige los campos a mano

- **Ubicación:** `src/engine/catalogo/instantanea.ts:60-79`.
- **Qué pasa:** un campo futuro quedaría fuera de la huella en silencio, y la prueba versionada usa la misma función.
- **Ajuste ejecutable:** `const { huella: _h, ...cuerpo } = instantanea as Instantanea; return huella(cuerpo);`, tipando el parámetro como `Omit<Instantanea,"huella"> | Instantanea`.
- **Casilla:** 2 (diseño).

##### [BAJO] La rama hexadecimal del patrón `cadena-codificada-larga` es código muerto

- **Ubicación:** `datos/filtro/patrones.json:61`.
- **Qué pasa:** todo hexadecimal está dentro del alfabeto base64, así que la primera alternativa (80 o más caracteres) siempre gana. Un hexadecimal de 80 a 95 caracteres ya marca, aunque `por_que` sugiere 96.
- **Ajuste ejecutable:** dejar solo `[A-Za-z0-9+/]{80,}={0,2}` y redactar `por_que` con «80 caracteres de base64 o hexadecimal».
- **ReDoS:** revisé los 4 patrones y los regex de ids, y no hay retroceso catastrófico.
- **Casilla:** 2.

##### [BAJO] El informe del clasificador demo omite la advertencia del conjunto

- **Ubicación:** `src/engine/demo/conjunto.ts:284-365`.
- **Qué pasa:** la advertencia del conjunto («el conjunto y el clasificador los escribió la misma mano») no aparece en `pnpm clasificador:demo`.
- **Ajuste ejecutable:** añadir `` `  ${c.advertencia[idioma]}` `` tras la línea de huella, pasando `advertencia` en `EvaluacionDelDemo.conjunto`.
- **Casilla:** 5.

---

#### Casilla 5: campos con lector fuera de su construcción y de sus pruebas

| Tipo                                          | Campos                                        | Con lector                           | Huérfanos                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResultadoDeValidacion` (+ `conteos`)         | 4 + 10                                        | 14                                   | 0                                                                                                                                                                                                           |
| `Hallazgo`                                    | 6                                             | 6                                    | 0                                                                                                                                                                                                           |
| `CatalogoValidado` / `PruebaEvaluada`         | 11 / 4                                        | 11 / 3                               | `PruebaEvaluada.ruta`                                                                                                                                                                                       |
| `Instantanea`                                 | 7 (+ 2 de `pendientes` + 5 de `advertencias`) | 6                                    | `formato`; los ítems de `pendientes_de_revision` (`id`, `motivo`) y de `advertencias` (5 campos): solo se lee `.length`. Declarados para el S2                                                              |
| `CatalogoDeInstantanea`                       | 11                                            | 3 (`pruebas`, `estados`, `umbrales`) | 8: `familias`, `reglas_de_veredicto`, `rasgos`, `filtro`, `marcos`, `equivalencias`, `controles`, `herramientas`. Carga del planificador y la UI del S2, declarados                                         |
| `Semaforo` / `Vigencia` / `VigenciaDeFamilia` | 4 / 4 / 4                                     | 4 / 1 / 1                            | `Vigencia.{id, fecha_verificacion, dias}`; `VigenciaDeFamilia.{id, dias, desglose}` (el informe recalcula el desglose). S2                                                                                  |
| `RespuestaDemo` / `Choice` / `Noul`           | 3 / 4 / 2                                     | 1 / 1 / 1                            | `model`, `usage`, `type`, `choice`, `confidence`. Espejo del contrato de Jev; `confidence` se ignora a propósito (E-17)                                                                                     |
| `EvaluacionDelDemo`                           | 7 (y anidados)                                | 6                                    | `casos` entero (8 subcampos, solo en `--json`), `ece.{bins, validas, invalidas}`, `paridad.{es, en}` (duplican `decision.es/en`). En la entrada: `advertencia`, `descripcion` y `politica[].{orden, texto}` |
| JSON de `validar`                             | 4                                             | 0 (la CI usa el código de salida)    | interfaz de máquina, declarada                                                                                                                                                                              |
| JSON de `instantanea`                         | 7                                             | 1 (`huella`, solo el e2e)            | 6, declarada                                                                                                                                                                                                |
| JSON de `clasificador:demo`                   | el objeto entero                              | `huella_de_respuestas` (solo el e2e) | ver `EvaluacionDelDemo`                                                                                                                                                                                     |

**Casilla 3:** no veo alternativas claramente superiores. JCS propio con los vectores del RFC, Zod 4 y `esbuild` exacto están bien elegidos.

**Contrato entre runtimes (regla 19):** el e2e compara de verdad: Node vía el CLI tres veces como proceso aparte contra el paquete `esbuild` del mismo código en tres navegadores. Lo que solo corre en Node es el CLI, `informe.ts` y `cargar.ts`. En el navegador no se ejercen el camino bloqueado ni el orden de los hallazgos de error (Bajo, no lo listé aparte).

#### Lo que no alcancé a revisar

- **e2e sin correr:** no ejecuté `tests/e2e/determinismo.spec.ts` (requiere build y navegadores). Quedan sin probar en vivo los arreglos propuestos al e2e (fechas derivadas, `retries: 0`, estados en el umbral, listas invertidas) y la demo de flaky.
- **Arreglo de `revision.huella`:** no lo apliqué en la copia; queda la corrida de verificación.
- **Cuerpo de las pruebas de métricas y demo:** de `tests/unit/modelo-decision/metricas.test.ts`, `tests/unit/demo/clasificador.test.ts` y `tests/unit/demo/conjunto.test.ts` solo leí los títulos. Falta revisar las cifras calculadas a mano (Brier, ECE, banda) y si alguna prueba es tautológica.
- **Pruebas de fechas y equivalencias:** `tests/unit/catalogo/equivalencias.test.ts` y `tests/unit/catalogo/fecha.test.ts` no los revisé en detalle.
- **Scripts del kit:** de `scripts/demo-rojo.sh`, `verificar-dependencias.mjs`, `lighthouse-margen.mjs`, `build-como-proveedor.mjs` y `verificar-salida-publicada.mjs` solo comprobé que son idénticos al kit. Su lógica interna y su prueba `tests/unit/verificar-dependencias.test.ts` no las audité.
- **CI del HEAD:** el e2e de la corrida 37254742220 (commit `10c277c`) estaba en curso. Falta `gh pr checks` con conclusión propia `success` en `quality`, `e2e` y `lighthouse`.
- **Contenido de `datos/`:** no revisé la coherencia campo a campo de marcos, controles, herramientas y pruebas más allá de fechas, selectores, reglas y k.
- **Instantánea versionada:** no verifiqué que `datos/instantaneas/2026-10-04-12d3b632a871.json` pase hoy el validador si se reconstruye desde su propio catálogo (gate de publicación sobre archivos versionados).
- **Otros chequeos sin correr:**
  - `pnpm peers check` y `pnpm audit` en local;
  - si `@types/node` 22 cubre lo que usa el CLI con Node 24;
  - el comportamiento del CLI ante un BOM (`cargar.ts:13`, `ignoreBOM: true` lo reporta como JSON inválido) y ante archivos con extensión distinta de `.json` bajo `datos/`, que se ignoran sin aviso.
- **ADRs y bitácora:** solo contrasté los ADR-002, ADR-003 y ADR-004 y la bitácora en los puntos citados. No revisé todas las cifras de la bitácora contra corridas (casilla de la regla 27).

## Anexo D — Informe del auditor 4 («lo que el anexo C no alcanzó a revisar» y la casilla 4), tal como lo entregó

### Auditor 4: lo que el anexo C no alcanzó a revisar, más la casilla 4

#### Veredicto: requiere ajustes

Encontré **0 críticos, 0 altos, 3 medios y 6 bajos**. Los medios son pruebas que no pueden fallar ante el defecto que dicen vigilar (regla 15). No hay ningún defecto en el código de producción de mi tramo.

El repo quedó intacto: `git status` sin líneas, HEAD en `c590c9e`, sin stash. Todas las mutaciones se hicieron en `…/scratchpad/auditor4/copia`.

**Lo que corrí:**
- Una reimplementación independiente en Python del clasificador y las métricas, con fracciones exactas.
- Mutaciones con vitest en la copia.
- Un barrido exhaustivo de `fecha.ts`.
- Un cruce de `datos/` contra fuentes oficiales descargadas: ATLAS-2026.09.yaml, cwec_v4.20.xml, el paquete de garak 0.17.0, las páginas de alertas de ZAP y de promptfoo, y PyPI/npm/GitHub.
- La reconstrucción de la instantánea versionada y su revalidación.
- `pnpm peers check` y `pnpm audit`.
- `gh run view` de 7 corridas de CI, con sus logs.
- El barrido de la casilla 4.

---

#### Hallazgos

##### MEDIO

###### M4-1 · Nada vuelve a validar las instantáneas versionadas
**Ubicación:** `tests/unit/catalogo/instantaneas-versionadas.test.ts:1-5` y `:27-40`

**Qué pasa (CONFIRMADO):**
- La cabecera dice «nadie la reformateó ni la editó a mano», pero la prueba solo comprueba que el archivo es coherente consigo mismo.
- En la copia edité la instantánea a mano: `PR-IA-PINJ-001` pasó a citar `version_marco: "2019"` y le puse tres pasos numerados. Recalculé la huella con `huellaDeInstantanea` y renombré el archivo. **La prueba siguió en verde, 2 de 2.**
- El archivo real, reconstruido desde su propio contenido, sí pasa hoy el validador: 0 errores, 10 advertencias y 4 notas. Además se re-emite con la huella idéntica, `12d3b632…`.

**Por qué importa:** un archivo versionado esquiva el gate de publicación (RF-10.6), y la cabecera promete más de lo que la prueba mide.

**Ajuste (verificado en la copia: 3 de 3 en verde, `tsc` y `eslint` limpios):**
- En `instantaneas-versionadas.test.ts`, añadir a los imports:
  - `construirInstantanea`;
  - `import type { ArchivoDeDatos, CatalogoEnBruto } from "../../../src/engine/catalogo/tipos.ts";`
  - `import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";`
- Tras `const archivos = …`, añadir:
```ts
const deDatos = (relativa: string) =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8")) as Record<string, unknown>;

/** Los archivos de `datos/` que darían esta instantánea. Ella no lleva los patrones del filtro ni el propósito
 * de los estados: se toman de hoy, y `mismoFiltro` dice si el filtro de hoy es la versión y fecha que ella cita. */
function reconstruir(s: Instantanea): { bruto: CatalogoEnBruto; mismoFiltro: boolean } {
  const filtro = deDatos("datos/filtro/patrones.json");
  const c = s.catalogo;
  const a = (ruta: string, v: unknown): ArchivoDeDatos => ({ ruta, texto: JSON.stringify(v) });
  const conId = (carpeta: string, xs: { id: string }[]) => xs.map((x) => a(`${carpeta}/${x.id}.json`, x));
  return {
    mismoFiltro: filtro.version === c.filtro?.version && filtro.fecha === c.filtro?.fecha,
    bruto: {
      familias: a("datos/familias.json", { familias: c.familias }),
      reglas_de_veredicto: a("datos/reglas-de-veredicto.json", { reglas: c.reglas_de_veredicto }),
      rasgos: a("datos/rasgos-de-perfil.json", { rasgos: c.rasgos }),
      filtro: a("datos/filtro/patrones.json", filtro),
      umbrales: a("datos/umbrales.json", c.umbrales),
      estados: a("datos/estados.json", { proposito: deDatos("datos/estados.json").proposito, vocabularios: c.estados }),
      marcos: conId("datos/marcos", c.marcos),
      equivalencias: conId("datos/marcos/equivalencias", c.equivalencias),
      controles: conId("datos/controles", c.controles),
      herramientas: conId("datos/herramientas", c.herramientas),
      pruebas: c.pruebas.map((p) => a(`datos/pruebas/${p.familia}/${p.id}.json`, p)),
    },
  };
}
```
- Dentro del `describe`, al final:
```ts
  it.each(archivos)(
    "%s: su propio catálogo pasa hoy el validador y, con el mismo filtro, se re-emite idéntica",
    async (nombre) => {
      const s = JSON.parse(readFileSync(path.join(CARPETA, nombre), "utf8")) as Instantanea;
      const { bruto, mismoFiltro } = reconstruir(s);
      const v = await validarCatalogo(bruto);
      expect(v.hallazgos.filter((h) => h.severidad === "error").map((h) => `${h.regla} ${h.ruta}`)).toEqual([]);
      if (mismoFiltro) {
        const r = await construirInstantanea(bruto, s.fecha_evaluacion);
        expect(r.emitida && r.instantanea.huella).toBe(s.huella);
      }
    },
  );
```
- Las líneas 2 a 5 de la cabecera pasan a decir: «Cada una es autoconsistente: su huella es la de su contenido, su nombre es su fecha más los 12 primeros caracteres de su huella y sus bytes son los que escribe el CLI, sin reformatear. Su propio catálogo, reconstruido desde el archivo, pasa el validador de hoy; y si el filtro de hoy es la versión que ella cita, re-emitirla da su misma huella. Una edición a mano que deje el catálogo inválido, o que toque el semáforo, los pendientes o las advertencias, no pasa aunque recalcule la huella; una que lo deje válido sí pasa, y su registro es git. No se exige que coincida con el catálogo de hoy.»

**Límite medido:** una edición del semáforo con la huella recalculada cae. Una edición textual válida pasa, por diseño.

**Decisión para el usuario (obligatoria si se aplica este ajuste):**
- El ajuste exige que cada instantánea versionada pase el validador **de hoy**.
- Dos ajustes ya propuestos la vuelven inválida:
  - el Alto 1 del anexo B, porque `licencia.nombre` pasa a `{es,en}` y el esquema rechaza la instantánea vieja;
  - B4-1(b) de abajo. Lo medí: la nueva prueba da 4 `prueba/marco-no-aplica`.
- **Opción A:** registrar en ADR-002 que «una instantánea versionada que el validador de hoy rechaza se reemplaza en el mismo PR por una re-emitida, mientras ningún plan la cite». En el S1 ningún plan cita instantáneas.
- **Opción B:** no aplicar la prueba nueva; solo corregir la cabecera para que diga lo que mide, y declarar en ADR-002 que las instantáneas versionadas no se revalidan.

**Verificación:**
- La prueba da 3 de 3 en verde.
- Demo en rojo, probada en la copia: el gate falla nombrando «pasa hoy el validador» y vuelve a 3 de 3 al restaurar.
```
scripts/demo-rojo.sh --archivo datos/instantaneas/2026-10-04-12d3b632a871.json --buscar '"id": "PR-IA-PINJ-001",
        "nombre": {' --reemplazar '"id": "PR-IA-PINJ-1",
        "nombre": {' --gate 'npx vitest run tests/unit/catalogo/instantaneas-versionadas.test.ts' --debe-nombrar 'pasa hoy el validador' --esperar-verde 'npx vitest run tests/unit/catalogo/instantaneas-versionadas.test.ts' --minimo-tests 3
```

###### M4-2 · `metricas.test.ts`: tres afirmaciones no pueden fallar
**Ubicación:** `tests/unit/modelo-decision/metricas.test.ts:67-74` y `:123-134`; código en `src/engine/modelo-decision/metricas.ts:57`, `:62`, `:138` y `:142`

**Qué pasa (CONFIRMADO con mutaciones; en cada caso 65 de 65 en verde sobre `tests/unit/{modelo-decision,demo}`):**
- **Brier sin ordenar por id** (`for (const p of porId(ps))` → `for (const p of ps)`): la prueba «no depende del orden de las predicciones» sigue en verde. Con sus valores, la suma en coma flotante da lo mismo en los dos órdenes.
- **Brier sin ordenar las opciones** (`[...opciones].sort(comparar)` → `opciones`): también sigue en verde, porque con 2 opciones la suma es conmutativa.
- **Bordes de la banda:** cambiar `<= banda.hasta` por `<`, o `>= banda.umbral` por `>`, deja todo en verde. Solo el borde `desde` está probado.

**Por qué importa:**
- La convención «toda suma recorre por id» sostiene que el navegador y Node den los mismos bytes.
- `p ≥ umbral` es la definición del error en banda (E-17), y un proveedor real redondea sus probabilidades, así que un valor de 0,70 exacto puede llegar de verdad.

**Ajuste (verificado: 19 de 19 en verde; cada mutación pone su prueba en rojo):**
- Reemplazar `:67-74` por:
```ts
  it("no depende del orden de las predicciones ni del de las opciones", () => {
    // En el orden de entrada, la media sale 0,5900000000000002 en vez de 0,5900000000000001: solo el orden por id las iguala.
    const ps = [
      p("1", { a: 0.35, b: 0.65 }, "b"),
      p("2", { a: 0.35, b: 0.65 }, "b"),
      p("3", { a: 0.2, b: 0.8 }, "a"),
    ];
    expect(brier([...ps].reverse(), ["a", "b"])).toBe(brier(ps, ["a", "b"]));
    // Con tres opciones, 1,34 o 1,3399999999999999 según el orden en que se sumen.
    const q = [p("1", { a: 0.1, b: 0.2, c: 0.7 }, "a")];
    expect(brier(q, ["c", "b", "a"])).toBe(brier(q, ["a", "b", "c"]));
  });
```
- En `:131`, tras el caso `"7"`, añadir:
  - `p("8", { aprobar: 0.8, revisar: 0.2 }, "aprobar"), // borde superior incluido, aprueba, bien`
  - `p("9", { aprobar: 0.7, revisar: 0.3 }, "revisar"), // justo en el umbral aprueba, mal`
- En `:133`, el resultado esperado pasa a `{ n: 6, cuenta: 3, tasa: 0.5 }`.

**Verificación:** cuatro demos con `demo-rojo.sh`, todas con `--gate 'npx vitest run tests/unit/modelo-decision/metricas.test.ts' --minimo-tests 19`:

| `--buscar` → `--reemplazar` | `--debe-nombrar` |
|---|---|
| `for (const p of porId(ps)) {` → `for (const p of ps) {` | `del de las opciones` |
| `[...opciones].sort(comparar)` → `[...opciones]` | `del de las opciones` |
| `<= banda.hasta` → `< banda.hasta` | `cuenta, dentro de la banda` |
| `>= banda.umbral` → `> banda.umbral` | `cuenta, dentro de la banda` |

###### M4-3 · `fecha.test.ts` no detecta una tabla de meses de 30 días equivocada
**Ubicación:** `tests/unit/catalogo/fecha.test.ts:24-38` y `:104`; código en `src/engine/fecha.ts:16`

**Qué pasa (CONFIRMADO):**
- Si se quita junio, septiembre o noviembre de `[4, 6, 9, 11]`, el archivo sigue en verde, y también **la suite unitaria entera, 1.149 de 1.149**.
- Con eso, `2026-09-31` pasaría como `fecha_verificacion` o `consultada` válidas.
- `fecha.ts` está bien hoy. Lo barrí entero: 3.652.059 días de 0001-01-01 a 9999-12-31 comparados contra `Date` con `setUTCFullYear`, más 4.620.000 combinaciones de año, mes y día (incluidos el año 0000, los meses 0 y 13 y los días 0 y 32). Cero discrepancias.
- Además, el título de `:104` dice «cada día», pero el bucle avanza de 7 en 7.

**Ajuste (verificado: 45 de 45 en verde; cada mutación cae):**
- En `:29`, tras `"2026-04-31",`, añadir `"2026-06-31",`, `"2026-09-31",`, `"2026-11-31"` y `"2026-01-32",`.
- En `:104`, «en cada día de cuatro siglos» pasa a «cada séptimo día de cuatro siglos».

**Verificación:** `scripts/demo-rojo.sh --archivo src/engine/fecha.ts --buscar '[4, 6, 9, 11]' --reemplazar '[4, 6, 9]' --gate 'npx vitest run tests/unit/catalogo/fecha.test.ts' --debe-nombrar '2026-11-31' --minimo-tests 45`. Lo mismo con `[4, 9, 11]` → `2026-06-31` y con `[4, 6, 11]` → `2026-09-31`.

##### BAJO

###### B4-1 · `prueba/marco-no-aplica` solo mira la referencia principal
**Ubicación:** `src/engine/catalogo/validar.ts:960-976`; `datos/marcos/cwe.json:13`

**Qué pasa (CONFIRMADO):**
- Cuatro pruebas que no son de software citan CWE en `referencias_adicionales`: `PR-AG-HERR-001` y `PR-IA-PINJ-001` (CWE-1427), `PR-AG-ID-001` (CWE-269) y `PR-AG-LIM-001` (CWE-770).
- `cwe.json` declara `familias_aplicables: ["software"]`.
- Si esas citas fueran la referencia principal, el validador las rechazaría con un error. CWE-1427 es justamente «Improper Neutralization of Input Used for LLM Prompting».

**Ajuste:**
- (a) **Datos:** en `cwe.json:13`, `familias_aplicables` pasa a `["software", "agente", "modelo_generativo"]`.
- (b) **Opcional:** cambiar `:961-963` por un `forEach` con llaves que, tras `revisarReferencia(...)`, compruebe `marcos.get(r.marco_id)?.familias_aplicables.includes(p.familia)`. Si falla, llama a `registro.agregar("prueba/marco-no-aplica", ruta, \`referencias_adicionales.${i}.marco_id\`, comillas(r.marco_id))`.
- (b) **solo junto con la opción A de M4-1**, porque invalida la instantánea del 2026-10-04.

**Verificación (medida en la copia):**
- Solo (b) da salida 2 y nombra las 4 pruebas.
- (a) más (b) da salida 1 con 0 errores, 10 advertencias y 4 notas, y 1.149 de 1.149 en verde.
- Cambiar datos mueve las huellas: la guía (D1, D2, D5, F1), ADR-002 y la bitácora se actualizan en el mismo lote que el Alto 1 del anexo B.

###### B4-2 · La fecha de CWE 4.20 está en su propia vía de acceso, y la bitácora dice que no
**Ubicación:**
- `datos/marcos/cwe.json:6` (`fecha_version: null`), `:61-63` (`por_verificar`) y `:64` (`notas`, «ninguna página consultada dice la fecha»);
- `sprints/SPRINT_001-implementation-log.md:87`.

**Qué pasa (CONFIRMADO):** la vía `archivo` registrada, `cwec_latest.xml.zip`, contiene `cwec_v4.20.xml`, y su raíz dice `Version="4.20" Date="2026-04-30"`. La descargué el 2026-10-05.

**Ajuste (verificado: 1.149 de 1.149 en verde; el validador da «0 errores · 10 advertencias · 3 notas»):**
- **`cwe.json`:**
  - `"fecha_version": "2026-04-30"`;
  - `"por_verificar": []`;
  - `notas.es`: «La lista vigente es la 4.20 y la lista anual es la 2025 CWE Top 25. La fecha de la 4.20 la declara el archivo de su vía «archivo»: cwec_v4.20.xml dice Version="4.20" Date="2026-04-30".»
  - `notas.en`: «The current list is 4.20 and the annual list is the 2025 CWE Top 25. The date of 4.20 is declared by the file of its «archivo» route: cwec_v4.20.xml says Version="4.20" Date="2026-04-30".»
  - Re-descargar el archivo y actualizar `fecha_verificacion` con la fecha de esa consulta. **Aplicar después del Alto 1 del anexo C**, porque mezcla fechas.
- **`tests/unit/catalogo/validar.test.ts`:**
  - `:505`, `preparar: () => CWE,` pasa a `preparar: (c) => (editar(buscar(c.marcos, CWE), (m) => (m.por_verificar = ["fecha_version"])), CWE),`.
  - `:511`, `(m) => (m.por_verificar = [])` pasa a `(m) => { m.fecha_version = null; m.por_verificar = []; }`.
  - Borrar `:695`.
  - `:707`, `notas: 4` pasa a `notas: 3`.
- **`tests/unit/catalogo/informe.test.ts`:**
  - `:43`, `4 notas` pasa a `3 notas`.
  - `:49`, `Notas (4)` pasa a `Notas (3)`.
  - `:72`, `cwe.json · fecha_version` pasa a `owasp-top10.json · fecha_version`.
  - `:130`, `advertencias y notas: 4` pasa a `advertencias y notas: 3`.
- **Guía:** en `docs/GUIA-DE-PRUEBA.html:244`, «4 notas» pasa a «3 notas»; en `:248`, «las 4 notas» pasa a «las 3 notas».
- **Bitácora `:87`:** «la fecha de CWE 4.20 (ninguna página consultada la dice)» pasa a «la fecha de CWE 4.20: ninguna página HTML la dice, pero el archivo `cwec_v4.20.xml` de su vía «archivo» declara `Date="2026-04-30"` (contrastado por el auditor 4 el 2026-10-05)».
- El M6 del anexo A pasa a «3 campos `por_verificar` en 2 marcos».

###### B4-3 · Tres selectores sin fuente en `fuentes`
**Ubicación:**
- `datos/pruebas/agente/PR-AG-PERM-001.json:92` (garak `agent_breaker`);
- `datos/pruebas/modelo_generativo/PR-IA-DATO-001.json:87` (garak `propile`);
- `datos/pruebas/modelo_generativo/PR-IA-FUGA-001.json:87` (promptfoo `prompt-extraction`).

**Qué pasa (CONFIRMADO):** son la segunda herramienta recomendada en cada prueba. Los tres selectores existen (los verifiqué en el paquete 0.17.0 y en la página de promptfoo), pero ninguna fuente los respalda. Las otras 35 pruebas sí traen la fuente de su selector.

**Ajuste:** añadir a cada arreglo `fuentes` un objeto `{ "url", "http", "consultada", "titulo" }`. Medir cada URL con `curl -s -o /dev/null -w '%{http_code}' <url>` el día de aplicar y poner esa fecha. Yo medí 200 el 2026-10-05.

| Prueba | `url` | `titulo` |
|---|---|---|
| PR-AG-PERM-001 | `https://raw.githubusercontent.com/NVIDIA/garak/v0.17.0/garak/probes/agent_breaker.py` | `garak 0.17.0 · probes/agent_breaker` |
| PR-IA-DATO-001 | `https://raw.githubusercontent.com/NVIDIA/garak/v0.17.0/garak/probes/propile.py` | `garak 0.17.0 · probes/propile` |
| PR-IA-FUGA-001 | `https://www.promptfoo.dev/docs/red-team/plugins/prompt-extraction/` | `promptfoo · prompt-extraction` |

**Verificación:** cada herramienta recomendada tiene en `fuentes` una URL que contiene su nombre (script de cruce, 0 faltantes). `pnpm catalogo:validar` sigue en salida 1.

###### B4-4 · El CLI no dice qué archivo falla ni avisa lo que ignora
**Ubicación:** `src/cli/cargar.ts:15-18` y `:39`; `src/engine/catalogo/validar.ts:105-111`; `src/cli/catalogo.ts:67`

**Qué pasa (CONFIRMADO en la copia):**
- **Prueba guardada en ANSI (cp1252):** el CLI imprime «error de lectura / read error: The encoded data was not valid for encoding utf-8» y sale 3, **sin nombrar el archivo**.
- **Archivo con BOM:** sale «archivo/json-invalido: El archivo no es JSON válido», sin decir por qué, y arrastra 9 errores en cascada.
- **Archivos que no se leen, sin aviso:** `PR-…-002.JSON`, `PR-…-003.json.txt`, `datos/herramientas/viejas/zap.json` y `datos/marco/cwe.json` se ignoran en silencio. El CLI dice «38 pruebas» y la CI queda en verde.

**Ajuste (verificado: 1.149 de 1.149 en verde, `eslint` limpio; los `.DS_Store` no generan aviso):**
- **`cargar.ts`, en `leer`:** leer los bytes y envolver `utf8.decode(bytes)` en `try { … } catch { throw new Error(\`${ruta}: no es UTF-8 válido, guárdalo como UTF-8 / is not valid UTF-8, save it as UTF-8\`); }`.
- **`cargar.ts`:** exportar `noLeidos(raiz, entrada)`.
  - Recorre `datos/` de forma recursiva y omite los nombres que empiezan por «.».
  - Excluye `datos/privado/` y `datos/instantaneas/`.
  - Devuelve las rutas con «/» que no estén entre las rutas de `entrada`.
- **`catalogo.ts:67`:** tras `cargarCatalogo`, escribir en stderr, por cada ruta: `aviso: ${ruta} no se lee (el catálogo solo lee los .json de sus carpetas) / warning: ${ruta} is not read (the catalog only reads the .json files in its folders)`.
- **`validar.ts:109`:** pasar como 4.º argumento, si `archivo.texto.startsWith("﻿")`, `t("empieza con una marca de orden de bytes (BOM): guárdalo como UTF-8 sin BOM", "starts with a byte order mark (BOM): save it as UTF-8 without a BOM")`; si no, `null`.
- **Prueba nueva `tests/unit/catalogo/cargar.test.ts` (verificada: 3 de 3 con el ajuste, 3 en rojo sin él):**
  - en un `mkdtemp`, `noLeidos` devuelve exactamente `["datos/herramientas/viejas/zap.json", "datos/marco/cwe.json", "datos/pruebas/software/PR-SW-X-002.JSON"]`, con `privado/`, `instantaneas/` y `.DS_Store` presentes;
  - un archivo con los bytes `7b e9 7d` hace que `cargarCatalogo` lance `/^datos\/herramientas\/ansi\.json: no es UTF-8 válido/`;
  - `cwe.texto` con `﻿` delante da un detalle con «BOM» en `es` y en `en`.

###### B4-5 · Regla 27: cuatro conteos de la fase 2 sin corrida, y no coinciden con los datos
**Ubicación:** `sprints/SPRINT_001-implementation-log.md:289`, `:291-292`, `:293` y `:298`

**Qué pasa (CONFIRMADO contra los datos):**

| La bitácora dice | Las pruebas citan |
|---|---|
| garak: «8 sondas y 10 módulos de detectores» | 7 sondas y 9 detectores de 8 módulos |
| promptfoo: «14 complementos», con `pii:session` | 10 complementos, sin `pii:session` |
| Inspect: «`agentdojo` y `agentharm`» | solo `agentdojo` |
| «16 páginas de CWE» | 15 identificadores |

No queda ningún artefacto de esa investigación.

**Ajuste (cada cifra con mi corrida del 2026-10-05):**
- `:289`: «garak 0.17.0: las 7 sondas y los 9 detectores (de 8 módulos) que citan las pruebas, leídos en la etiqueta `v0.17.0` con sus clases; el auditor 4 los encontró todos en el paquete 0.17.0 de PyPI.»
- `:291-292`: «promptfoo: los 10 complementos que citan las pruebas, en sus páginas (HTTP 200). `agentic:memory-poisoning` se confirmó dentro del HTML, porque las etiquetas partían el id.»
- `:293`: «Inspect: `inspect_evals/agentdojo`.»
- `:298`: «Los 15 identificadores CWE que citan las pruebas; el auditor 4 los encontró todos en `cwec_v4.20.xml`.»

###### B4-6 · Casilla 4: dos promesas aplazadas en datos que la instantánea congela
**Ubicación:** `datos/herramientas/garak.json:34-37` («El adaptador llega en el S3») y `datos/herramientas/zap.json:75-78` («el adaptador del S3 sugiere», en presente, de algo que no existe)

**Qué pasa:** no son falsas hoy, pero ya viajan en la instantánea oficial y la pantalla del S2 las va a mostrar.

**Ajuste (opcional, en el mismo lote de datos):**
- **garak**
  - `es`: «0.17.0 se publicó en PyPI el 2026-09-09. El spike de la F1 leyó el informe de esa versión. El umbral de los detectores no viaja en el informe: lo fija el paquete de ejecución (E-7).»
  - `en`: «0.17.0 was published on PyPI on 2026-09-09. The F1 spike read that version's report. The detector threshold does not travel in the report: the execution package sets it (E-7).»
- **zap:** cambiar solo la frase central.
  - `es`: «…sin constancia de ejecución y cobertura, el veredicto que se sugiera es «no ejecutada», nunca «superada» (E-6)…»
  - `en`: «…without proof of execution and coverage, the suggested verdict is “not run”, never “passed” (E-6)…»

---

#### Evidencia que cambia el ajuste de un anexo (una línea cada una)

- **Anexo A, B8(c):** la huella del demo que la guía promete en E1 (`7d94f4a1…`) tampoco está fijada. Invertir el orden de sorteo de Noul la cambia a `0eed9399…` y la suite sigue en 65 de 65. Añadir en `tests/unit/demo/conjunto.test.ts:66`: `expect(evaluacion.huella_de_respuestas).toBe("7d94f4a1c73e8004c80108caed40a67cc4a92f2406c74e18a0e6d3168e05c83d");`.
- **Anexo B, Alto 1** (nombres de licencia `{es,en}`) **y M4-1:** el cambio de esquema invalida la instantánea versionada. Hay que decidir la opción A o la B de M4-1 antes de aplicar los dos.
- **Anexo C, Alto 1:** B4-1(a), B4-2, B4-3 y B4-6 tocan datos. Si se mueve `fecha_verificacion`, aplicarlos después de ese ajuste.

#### Casilla 4: frases caducadas

**126 coincidencias revisadas:**

| Dónde | Coincidencias |
|---|---|
| `docs/MANUAL-DE-USO.md` | 8 |
| `README.md` | 0 |
| `docs/CHANGELOG.md` | 1 |
| `docs/LICENCIAS-DE-MARCOS.md` | 0 |
| ADRs 002 a 004 | 6 |
| `docs/GUIA-DE-PRUEBA.html` | 3 |
| `CLAUDE.md` | 8 |
| Textos `{es,en}` de `datos/` y `docs/kit-de-prueba/` (952 textos) | 94 |
| Cuerpo del PR #8 | 2 (ya en el B5 del anexo A) |
| Copy que imprime `src/` | 4 |

**Frases falsas o caducadas nuevas: 0.** Además de B4-6, comprobé las siguientes contra lo que es cierto hoy, y siguen siendo ciertas:

| Frase | Estado hoy |
|---|---|
| MANUAL `:22`, `:83`, `:89`, `:144`, `:204`, `:210` y CHANGELOG `:8`: «sin pantallas» / «no screens yet» | `src/app/page.tsx` sigue siendo la plantilla de Next |
| ADR-004 `:26`: MAPIE no está recomendado | Ninguna prueba lo cita |
| ADR-004 `:26`: `inspect-typesafe` no está en PyPI | 404 hoy |
| ADR-004 `:26` y `promptfoo.json`: el proveedor de TypeSafe no está en ninguna versión publicada | npm latest sigue en 0.123.1 (2026-09-18) |
| `owasp-llm-top10.json`: la página de archivo muestra 2025 | La página «LLMRisks Archive» lo sigue haciendo |
| `hackguard-revision.json`: el repo no declara licencia | No hay LICENSE ni `license` en `package.json` |
| `reglas.ts:166`: «todavía / yet» | Las 10 pruebas de software siguen sin control |
| «todavía puede llegar a 3/k» | Es la cota estadística, no una promesa |

Caducarán solas en el S2 o el S3: MANUAL `:83` y `:204` («llega en los sprints siguientes») y ADR-004 `:72-73`.

#### Lo comprobado sin hallazgo

**Cifras del demo, recalculadas de forma independiente:**
- Mi reimplementación del clasificador (mulberry32, FNV-1a, JCS y resto mayor) da las 52 respuestas idénticas a `clasificador:demo --json`.
- Con fracciones exactas:

| Medida | Español | Inglés |
|---|---|---|
| Exactitud | 20 | 25 |
| Brier | 0,374221 | 0,226655 |
| ECE con 4 bins de igual masa | 0,085458 | 0,291358 |
| Error en la banda | 1 de 7 | 1 de 9 |
| Exactitud de la urgencia | 23 | 25 |

- Paridad: 19,2308 puntos y 19 de 26 casos con la misma elección. Re-ejecución: 1 de 52 cambios y 0 distribuciones idénticas.
- Todas las cifras escritas a mano en `metricas.test.ts` y `clasificador.test.ts` son correctas.
- La mutación «semilla sin mezclar el estado» la detecta `conjunto.test.ts` (5 fallas).
- No hay pruebas tautológicas fuera de M4-2.

**E-15 y equivalencias:**
- Los 10 pares 2025→2026 son coherentes nombre a nombre; solo LLM07→LLM08 lleva `nombre` en `cambios`.
- Las mutaciones E1–E3 sobre `equivalencias.ts` caen.
- E4 (`?? []` → `?? [e]`) sobrevive, pero esa rama es inalcanzable con datos válidos por `equivalencias/entrada-sin-mapa`.

**Scripts del kit:**
- `ci.yml` es el del kit más 3 añadidos de HackGuard. `build-como-proveedor.mjs` sin argumentos es lo correcto en el perfil estático.
- La corrida 37254742220 compara 50 páginas, entre ellas las de `out/diseno/`.
- `lighthouse-margen` usa la ruta por defecto y `["/"]` cae bajo `/*`. `verificar-dependencias` corre solo en PR, tras el `fetch`.
- Las dos pruebas del kit pueden fallar (árboles y lockfiles sintéticos) y son idénticas byte a byte a las del kit.
- La CI de HEAD `c590c9e` (37255787550) tiene `quality`, `e2e` y `lighthouse` en `success`.

**Coherencia de `datos/`:**
- Cada herramienta recomendada existe y admite la familia y el entorno de su prueba. Ninguna `version_minima` supera la verificada, y `medido_con` siempre está entre las recomendadas.
- La regla de veredicto es coherente con la herramienta y la familia: ZAP → determinista; garak, promptfoo e Inspect → asimétrica con k = 20; las métricas → umbral con k de 5 o 10; `hackguard-revision` → revisión de diseño.
- Los 38 ids de control son el conjunto del Anexo A, y todo control citado existe.
- Las 201 equivalencias usan 60 subcategorías NIST, todas dentro de las 72 de AI RMF 1.0 (lista de memoria; ver «Lo que no alcancé»).
- Los 14 ids de ATLAS están en ATLAS-2026.09.yaml (208 técnicas) y sus temas cuadran con cada prueba. Los 15 de CWE están en `cwec_v4.20.xml`.
- garak: las 7 sondas y los 9 detectores están en el paquete 0.17.0. ZAP: los 12 `pluginids` corresponden a su alerta. promptfoo: las 10 páginas responden 200 con el id. Inspect y Nuclei responden 200.
- Las 12 versiones de herramientas son la última de su registro hoy, con la fecha de publicación que dicen las notas.

**Dependencias y CLI:**
- `pnpm peers check`: sin problemas.
- `pnpm audit --audit-level high`: sale 0 con 1 alta ignorada. GHSA-vfj7-8cjw-p6xm sigue con `first_patched_version: null`, `braces` latest es 3.0.3 y la ruta de dependencia coincide con ADR-001.
- `@types/node` 22.20.5 cubre todo lo que usa `src/cli`, que existe desde Node 22.0. La CI usa Node 22.23.3.

**Regla 27 en la bitácora (todo coincide):**
- Las 21 duraciones y conclusiones de jobs de las 7 corridas.
- Los totales de pruebas: 720, 990, 1.028, 1.083, 1.148 y 1.149. En CI siempre hay 1 saltada, ya reportada en el anexo B.
- Cada «N de N» de las tablas de demos contra los conteos por archivo de CI.
- La cobertura de las fases 1, 2, 3A y 3B contra las tablas de CI.
- Las citas de la CI: 50 páginas, `lighthouse-margen`, las líneas del paso «Catálogo válido», C18, Node 22.23.3 y las 14 pruebas de `cli.test.ts`.
- `cca0e8a58446`, reproducida 3 veces en `215d195`.
- 70 archivos y 4.695 cadenas.
- El barrido de ruido: de 60 a 120 → 0 cambios y 21/25; 150 → 1 cambio y 20/25; 200 → 4 cambios y 20/24.
- BIB-018: sin ruido elige «aprobar» (0,52) y la primera corrida lo voltea.
- Los bins del inglés, de 0,54 a 0,79.
- El reparto de controles del Anexo A.
- 59 → 61 reglas; 30 + 2 categorías; 6 + 19 rasgos.
- Versiones: TypeScript 6.0.3, React 19.3.0, Vitest 5.0.3, Next 16.3.8, gitleaks 8.30.1. Y los 24.301 bytes de la maqueta.

#### Lo que no alcancé

- No contrasté los pares control → subcategoría contra el PDF del cruce de NIST: la validez de las 60 subcategorías la comprobé contra la lista de AI RMF 1.0 que conozco, de memoria.
- No contrasté con sus fuentes oficiales las entradas ASI01–10 de `owasp-agentic-top10` ni las C1–C14 de `lista-decision-14`.
- Los tiempos de la bitácora (0,28–0,30 s, 0,33–0,37 s y las medianas del punto de reanudación) y la salida «+5 −3» del install no tienen una corrida equivalente que re-correr.
- Fuera de mi alcance: el e2e y la lógica interna de los scripts del kit.

## Anexo E — Segunda pasada (frases caducadas y de evidencia), tal como la entregó su auditor

Auditor independiente, 2026-10-05. Las sondas literales del filtro que citaba se describen en vez de copiarse (regla dura 3). Lo mismo se hizo en el anexo B al pagar B6.

### Segunda pasada de la Fase 2 del S1 de HackGuard: casilla 4 y regla 27

**Veredicto: requiere ajustes.** Encontré 5 hallazgos medios y 7 bajos. No hay ningún crítico ni alto. El barrido de cero enlaces sale limpio.

**Estado del repo:**
- Al empezar, `git status --short` daba `?? sprints/SPRINT_001-summary.md`. Mientras yo trabajaba, otra sesión comiteó `c924422` (summary y punto de reanudación). Por eso hoy `git status --short` sale vacío. Yo no toqué ni el repo ni su git.
- Todas mis salidas fueron a `…/scratchpad/auditor5/`. Hubo una sola excepción: un `/tmp/x.txt` que creé y borré en el acto.

#### Qué corrí

- **Barrido de enlaces:** `git grep -nE "vercel[.]app|workers[.]dev|pages[.]dev" -- ':!pnpm-lock.yaml'` sale vacío (exit 1). El summary tampoco tiene ninguno; su único URL es el del PR.
- **CLI:**
  - `pnpm catalogo:validar` en español, `--idioma en` y `--json`: «con advertencias», 10 advertencias, 3 notas, exit 1.
  - Las semillas SIN-MARCO (exit 2), SIN-VERSION (exit 2), VERSION-ANTERIOR (exit 1) y PATRON-PASOS («1 pendiente», dos `filtro/marcada`).
  - `catalogo:instantanea` en estas fechas, con su huella:
    - 2026-10-15 ×3: `5bcb8a75…`, un solo archivo;
    - 2026-11-03: `5df38fdb…`;
    - 2026-12-03: `0a6772a4…`;
    - 2026-10-16: `2c1c927d…`;
    - 2026-11-04: `d8c379af…`;
    - 2026-10-05: `703a0479…`, y `cmp` contra `datos/instantaneas/2026-10-05-703a0479d567.json` da idéntico.
  - Los dos casos que deben fallar: la fecha 2026-09-30 sale con exit 3 y sin archivo; `--agregar` con una semilla inválida sale con exit 2 y «No se escribió nada».
  - `pnpm clasificador:demo` en los dos idiomas: las 7 filas de la tabla E coinciden y la huella es `7d94f4a1…`.
- **Vitest, sin cobertura:** los 14 archivos de la tabla de demos dan 353 de 353, y los conteos por archivo cuadran con la bitácora. `instrumento` imprime «C18 … 11 de 11».
- **Cobertura:** la recalculé desde `coverage/coverage-final.json` (21:26). En los 14 archivos de `src/engine/` da 99,38 / 94,86 / 99,57 / 99,42 %, exactamente lo que dice el summary.
- **CI con `gh run view`:**
  - 37401498633 (`9dfa994`): `quality` en rojo solo en `pnpm audit`. Los pasos de gitleaks y de test sí corrieron; `e2e` y `lighthouse` quedaron skipped.
  - 37401801459 (`5b0d6c1`): 41 archivos, 1.161 pruebas, 99,36/95,27/99,56/99,4 %, checksum de gitleaks OK, «8.30.1», «1053 passed».
  - 37403300877 (`d53b05a`) y 37404065721 (`09842c8`): 42 archivos y 1.186 pruebas. En los tres navegadores aparecen `2c1c927d…`, `d8c379af…` y `7d94f4a1…`, y «1053 passed».
  - 37404800509 (`c924422`): a las 02:45 UTC, `quality` y `lighthouse` en success y `e2e` todavía en curso.
- **Fuentes externas con `curl`:**
  - arXiv da 200 y los autores Tang y Zheng;
  - los 3 DOI de NIST dan 302 hacia nvlpubs, y el título de csrc coincide;
  - TypeSafe da 200 con «Jev 1.13 jaggedness»;
  - iso.org da 403;
  - el zip de CWE baja entero y declara `Version="4.20" Date="2026-04-30"`;
  - los assets de gitleaks 8.30.1 dan 200.
- **Seguridad:**
  - en las advisories de GitHub, braces sigue sin parche; la de compression se publicó el 2026-10-05T23:28Z, parche 1.8.2;
  - en npm, `serve` 14.2.6 es la última y fija 1.8.1, y compression 1.8.2 solo suma `destroy` 1.2.0;
  - `pnpm audit` da «1 high (1 ignored)»;
  - `verificar-dependencias` da 681 paquetes;
  - `gitleaks git origin/main..HEAD` no encuentra nada.
- **Tiempos:** los re-medí con 7 corridas, en carga 10: 0,093, 0,098 y 0,079 s, coherentes con lo registrado.
- **Filtro:** probé el filtro real con las sondas de la bitácora y el resultado es el que dice la línea 844.

#### Hallazgos medios

**M1. Una frase caducó en los datos y en el ADR-004: promptfoo ya publicó el proveedor de TypeSafe. CONFIRMADO.**
- **Dónde:** `datos/herramientas/promptfoo.json:56-57` y `decisions/004-decision-model-family-and-demo-asset.md:28-30`. La instantánea oficial congela la misma nota, pero es un registro y no se toca.
- **Qué pasa:** la nota dice «0.123.1 es la última versión publicada … ninguna versión publicada lo trae todavía». Pero `npm view promptfoo time` da `0.124.0` publicada el 2026-10-06T01:35:42Z (el 2026-10-05 a las 20:35 hora local, antes de `d53b05a`). Su tarball trae `dist/src/typesafe-*.js` («TypeSafe provider for Jev», `jev-1.13.0`). `inspect-typesafe` sigue en 404 en PyPI, así que esa mitad es cierta.
- **Por qué importa:** son datos vivos y un ADR que afirman hoy algo falso, junto con la razón de una decisión de catálogo.
- **Ajuste del ADR-004 (barato, sin huellas).** Las líneas 28-30 pasan a:
  `MAPIE is registered but not recommended by any test. The TypeSafe provider for promptfoo was merged on 2026-10-02; when the tools were verified (2026-10-04) no published release shipped it, and promptfoo 0.124.0, published on 2026-10-06 (UTC), does. `inspect-typesafe` is not on PyPI (HTTP 404 on 2026-10-05). No test in this sprint recommends either one.`
- **Ajuste de los datos.** Elige uno de dos:
  - **(a) Corregir ya.** `notas` queda así:
    - `es`: «Al verificarla, el 2026-10-04, 0.123.1 era la última versión publicada (2026-09-18) y ninguna versión publicada traía el proveedor para modelos de decisión de TypeSafe, que se fusionó el 2026-10-02. Por eso ninguna prueba de modelo_decision la recomienda. La 0.124.0, publicada el 2026-10-06 (UTC), ya lo trae; recomendarla exige volver a verificar la herramienta en esa versión.»
    - `en`: «When it was verified, on 2026-10-04, 0.123.1 was the latest published version (2026-09-18), and no published version shipped the provider for TypeSafe decision models, merged on 2026-10-02. That is why no modelo_decision test recommends it. Version 0.124.0, published on 2026-10-06 (UTC), ships it; recommending it requires verifying the tool again at that version.»
    - **Cascada:** cambian todas las huellas. Hay que actualizar la guía en D1 (huella y nombre de archivo), D5 y F1, el ADR-002:73, el summary en :51, :94 y :96, el CHANGELOG (la instantánea oficial) y re-emitir la oficial del 2026-10-05. `tests/unit/guia-huellas.test.ts` nombra cada huella que quede vieja.
  - **(b) Declararlo deuda antes del merge.** Una fila en «Deuda técnica aceptada» del summary:
    `| promptfoo.json: la nota dice que 0.123.1 es la última versión y que ninguna trae el proveedor de TypeSafe; la 0.124.0 (2026-10-06 UTC) ya lo trae | Corregirla cambia todas las huellas, la instantánea oficial y la guía | S2, al volver a verificar promptfoo |`

**M2. «Cada gate nuevo tiene su demo en rojo» no vale para AU-26. CONFIRMADO.**
- **Dónde:**
  - `sprints/SPRINT_001-summary.md:135`;
  - `sprints/SPRINT_001-auditoria.md:7-8` («los que crean gates, con su demo en rojo»);
  - el cuerpo del PR #8 («each new gate shown red with `scripts/demo-rojo.sh`»).
- **Qué pasa:** el orden de pago pone AU-26 entre los gates con demo (`auditoria.md:159`). Sin embargo, AU-26 solo aparece en la bitácora en `:841`, en una corrida verde.
  - La demo de AU-01 sí enrojeció la aserción reescrita de `envejecimiento` («el semáforo cambia el día de cada umbral»).
  - Nunca se vieron en rojo las aserciones nuevas `tests/e2e/determinismo.spec.ts:175` (`expect(estados).toContain("por_revisar")`) ni `tests/unit/catalogo/instantanea.test.ts:83`.
  - En el PR, además, AU-11 se demostró con una simulación, sin `demo-rojo.sh`, como dice la propia bitácora en `:812`.
- **Ajuste: dos demos.** Las filas de la tabla se escriben después, con la salida real.
  ```
  scripts/demo-rojo.sh --archivo src/engine/catalogo/semaforo.ts --buscar 'if (dias >= umbrales.por_revisar) return "por_revisar";' --reemplazar 'if (dias >= umbrales.por_revisar) return "vigente";' --gate 'npx vitest run tests/unit/catalogo/instantanea.test.ts' --debe-nombrar 'otra fecha de evaluación cambia el semáforo' --esperar-verde 'npx vitest run tests/unit/catalogo/instantanea.test.ts' --minimo-tests 13
  scripts/demo-rojo.sh --archivo src/engine/catalogo/semaforo.ts --buscar 'if (dias >= umbrales.por_revisar) return "por_revisar";' --reemplazar 'if (dias >= umbrales.por_revisar) return "vigente";' --gate 'E2E_PUERTO=3217 pnpm exec playwright test tests/e2e/determinismo.spec.ts --project desktop-chromium' --debe-nombrar 'algo pasa a «por revisar»' --puerto 3217 --esperar-verde 'E2E_PUERTO=3217 pnpm exec playwright test tests/e2e/determinismo.spec.ts --project desktop-chromium' --minimo-tests 3
  ```
  - El literal aparece una sola vez en `semaforo.ts:72`.
  - En la fecha del umbral (2026-11-04) los marcos verificados el 10-04 llevan 31 días y CWE lleva 30. Con la mutación todo sale «vigente», así que las dos aserciones tienen que caer.
- **Texto del PR, después de las demos:** «52 are paid; each new gate was shown red, with `scripts/demo-rojo.sh` except AU-11, shown red by a simulation without a file mutation.»

**M3. «Pagados: 52 de 56, en cinco commits» no coincide con la tabla de la bitácora. CONFIRMADO.**
- **Dónde:** `summary.md:132-133` y `:136`.
- **Qué pasa:**
  - `09842c8` no paga ningún hallazgo AU: es el fix del `/deploy-check`. Los 52 se pagaron en cuatro commits (bitácora `:786-794`).
  - AU-38 (el cuerpo del PR) ya está cerrado. Lo dice el punto de reanudación de `c924422` y lo comprobé con `gh pr view 8`: el cuerpo cubre las cinco fases y la auditoría. Sin embargo, el summary no lo nombra.
- **Ajuste.** Reemplazar las líneas 132-133 por:
  ```
    - **Pagados:** 53 de 56: 52 en cuatro commits (`9dfa994` gates, `efb547a` código, `d53b05a` datos y `7ce50d7`
      documentos) y AU-38, con el cuerpo del PR #8 puesto al día.
    - **Fix del `/deploy-check`:** `09842c8`, lo que escribe `--agregar` nace con permisos 600 (regla 17-bis a).
  ```

**M4. «El conteo a mano falló cuatro veces» no coincide con la bitácora. CONFIRMADO.**
- **Dónde:** `summary.md:176`.
- **Qué pasa:** la bitácora registra tropiezos en cuatro fases: `:249`, `:413`, `:501`, `:591`, `:809` y `:821`. Son más de cuatro corridas rechazadas.
- **Ajuste:** «El conteo a mano falló en cuatro fases de este sprint (bitácora: fases 1, 2 y 3, y la Fase 2 de la auditoría).»

**M5. La fecha de verificación de `LICENCIAS-DE-MARCOS.md` es hermana de «la última verificación pasó al 2026-10-05» y quedó vieja. CONFIRMADO.**
- **Dónde:** `docs/LICENCIAS-DE-MARCOS.md:3` y `:7`.
- **Qué pasa:** el documento dice «Verificado el 2026-10-04». Pero la fila de CWE («2026-04-30», «archivo 200») sale de la descarga del 2026-10-05, y los autores y los DOI se resolvieron ese día.
- **Ajuste:**
  - `:3`: «> Verificado el 2026-10-04 (S1, fase 0) y, en la auditoría, el 2026-10-05: ese día se descargó entero el archivo de CWE (de ahí su fecha y su «archivo 200») y se resolvieron los autores de arXiv:2609.32160 y los DOI de NIST. La fuente oficial y las vías de acceso…» (el resto igual).
  - `:7`: «> Checked on 2026-10-04 (S1, phase 0) and, in the audit, on 2026-10-05: that day CWE's archive was downloaded whole (hence its date and its "file 200"), and the arXiv:2609.32160 authors and the NIST DOIs were resolved. Each framework's official source…» (el resto igual).

#### Hallazgos bajos

- **B1. La fila CI/CD del summary ya se puede llenar** (`summary.md:78`; «siguen en curso» ya no es cierto). Texto propuesto, de la corrida 37404065721:
  `| CI/CD | ✓ | Corrida 37404065721 (`09842c8`): `quality` 2 min 47 s, `e2e` 9 min 58 s y `lighthouse` 1 min 50 s, cada uno con conclusión propia `success`. En `quality`: 42 archivos y 1.186 de 1.186 pruebas, gitleaks 8.30.1 con la suma verificada, «C18 catálogo: bloquea 11 de 11» y `pnpm audit` con 1 alta, ignorada. En `e2e`: «1053 passed (8.1m)» y `2c1c927d…` en Chromium, Firefox y WebKit. |`
  Antes de cerrar hay que leer también la corrida del commit que finalmente lleve el summary. La de `c924422` (37404800509) tenía el `e2e` en curso.
- **B2. Las paradas A1 y A2 de la guía se quedaron cortas** frente a lo que cambió la auditoría (`docs/GUIA-DE-PRUEBA.html:206-209` y `:214`).
  - **A2:** «En el cierre de la fase 2 el filtro no marcó ninguna de las 38.» pasa a «Con los siete patrones de hoy, el filtro no marca ninguna de las 38.» (comprobado: 0 pendientes de revisión).
  - **A1:** «la auditoría cambió tres cosas: … propio archivo) y las atribuciones…» pasa a «la auditoría cambió cuatro cosas: el nombre de cada licencia está también en inglés; la fecha de CWE 4.20 dejó de estar por verificar (la declara su propio archivo, descargado entero el 2026-10-05); CWE aplica ahora también a pruebas de agente y de modelo generativo (AU-51); y las atribuciones nombran autores, DOI y la dirección de cada obra.»
  - Lo de AU-51 sale del diff de `d53b05a`: `cwe.json`, `familias_aplicables`.
- **B3. La lista de reglas de ESLint del ADR-002 no incluye `no-restricted-syntax`** (`decisions/002-…md:32-33`; es hermana de AU-02). Texto: «ESLint enforces it with `no-restricted-globals`, `no-restricted-properties`, `no-restricted-imports` and `no-restricted-syntax`; the last one, added in the audit (AU-02), blocks any `globalThis` or `crypto` access other than `crypto.subtle`, and dynamic `import()`.»
- **B4. La tabla de pagos de la bitácora dice «(este commit)».** En `implementation-log.md:794`, «(este commit)» pasa a `` `7ce50d7` ``.
- **B5. El paréntesis del nivel de ruido del ADR-004 es ambiguo:** «1 of 52» parece la tasa de Jev, pero es la del demo (`decisions/004-…md:65`). Texto: «**Noise level:** 150 was chosen by measurement: of the levels tried, it gives the change rate closest to the ~1.5% measured for Jev (the demo changes 1 of 52 answers, 1.92%).» Lo sostienen la salida del demo y la bitácora en `:544-550`.
- **B6. Hay cargas literales en la bitácora, contra la regla dura 3** («el repo jamás contiene cargas»). Es fuera de casilla, para que decidas tú.
  - **Dónde:** `implementation-log.md:844`, agregada en `7ce50d7`. La sección «tal como lo entregó» de `auditoria.md:600-605` (Fase 1) trae las mismas.
  - **Texto para `:844`:** «- 2026-10-05 sondas del auditor 2 sobre el filtro real (7 patrones): marca una etiqueta de script en línea, un recorrido de ruta hacia un archivo del sistema, un bloque de código sin lenguaje y una dirección con una etiqueta de script en el parámetro; no ve una tautología de SQL tras una comilla, una instrucción maliciosa escrita como frase, un comando encadenado dentro de una línea, una expresión de plantilla, viñetas ni un comando de red sangrado. El catálogo real sigue con 0 marcas.»
  - Lo re-sondeé y el resultado es el mismo.
- **B7. «Deuda que queda: AU-38 (al cierre)»** (`implementation-log.md:885`) quedó superado por el punto de reanudación. Se corrige junto con M3: «AU-38: cerrado; el cuerpo del PR #8 está al día.»

#### Conteos

- **Promesas aplazadas:** revisé 143 líneas distintas.
  - 45 son de la lente pedida, 10 de ellas en la instantánea congelada.
  - 105 son de una segunda lente (`todavía`, `aún`, `yet`, `still`, `until`, `latest`, `hoy`, `today`); 7 se repiten en las dos. Fue la segunda lente la que atrapó a promptfoo: su frase dice «todavía» sin un «no» detrás.
  - Además seguí 9 cambios de la Fase 2 hasta sus frases hermanas en todo el repo:
    - la instantánea vieja y sus huellas `e2858e62` y `0b24f1ab`;
    - el filtro de 4 a 7 patrones;
    - las notas de 4 a 3;
    - el `por_verificar` de CWE;
    - la última verificación del 2026-10-05;
    - el lint de AU-02;
    - los nombres de los marcos;
    - AU-38.
  - **Caducadas:** M1, M5, B1, B2, B3 y B7. Todo lo demás es cierto hoy, lo que incluye WSTG 4.2, NIST AI RMF 1.0 «en revisión» y «sin licencia» del repo.
- **Frases de evidencia:** verifiqué 51 del summary, las 15 líneas de «Evidencia de las correcciones», las 33 filas de la tabla de demos (coherencia por archivo), `/deploy-check`, los tiempos y los documentos:
  - la guía: B1-F1 y la tabla de E;
  - las 14 filas de LICENCIAS contra los datos;
  - los ADR 002, 003 y 005;
  - el CHANGELOG y el manual.
  - **No coinciden:** las 4 de M2, M3, M4 y M5, más B5, que es ambigua. Todas las demás cuadran con la corrida.

#### Lo que no alcancé

- No re-corrí el e2e completo ni la suite con cobertura: para esas cifras me apoyé en las corridas de CI.
- No vi terminar la CI de `c924422`.
- No verifiqué los 14 marcos contra sus fuentes uno por uno: solo los que la Fase 2 tocó o los que afirman ser la «última» versión.
- No revisé el archivo `auditoria.md` entero, solo sus frases hermanas.
