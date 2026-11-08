# HackGuard — respuesta al pedido 026 de CV Viva

> Ejecutado por la planeadora el 2026-10-27 desde una copia aislada de `app-hackguard` (`git archive`); sin PR ni rama, y sin
> escribir en la app ni en CV Viva. Pedido común: `portafolio/hoja-de-vida/ordenes/PEDIDO-2026-10-27-fichas-026.md`. Pedido de
> la app: `portafolio/hackguard/ordenes/FICHA-2026-10-27-pedido-026.md`.

## La lista del pedido común

| Qué | Respuesta |
|---|---|
| Base | `origin/main` = `b5acd4b2934b2291c8799449ef0f61a473765918` (2026-10-14; el export de hoy en CV Viva es igual al de esta base). |
| Export | `brochure-export.json` · `actualizado: "2026-10-27"` · sha256 `62692af65926729568bcb55c020c650a22592e10f6a34ffc1411b9ff66bcf24e` (el de la base es `8f9668f9…49892a4`). Forma intacta: mismos campos, mismos 18 `id`, `total` 18 = 7 + 3 + 5 + 3. Los cuatro grupos conservan orden y composición; solo cambian su `nombre` y su `linea`. |
| Copy del export | Reescritos: `promesa` (los 4 textos), `nombre` y `que_hace` de las 18 funcionalidades (37 a 45 palabras cada una), `nombre` y `linea` de los 4 grupos, `privacidad.detalle`, `enlaces.razon` y `enlaces.razon_repositorio`. `seccion_manual` sin cambio (las 9 secciones existen en el manual). |
| Datos del export | `app.sprints_cerrados` 9 (sin cambio; S9 es el último cierre en la planeadora) · `app.version_repo` 0.1.0 (sin cambio, `package.json`) · `app.ciclo` H1 (sin cambio: H-1 construido, falta el gate, `estado-actual.md`). |
| Métricas medidas de nuevo | Desde el `actualizado` del export (2026-10-13) solo cambiaron las pruebas unitarias: `b5acd4b` sumó 2 a `tests/unit/brochure-export.test.ts`. `pnpm test --maxWorkers=2` del 2026-10-27 sobre `b5acd4b`: 154 archivos, **3098** pruebas, todas pasan → `pruebas_unitarias` 3096 → 3098 y `pruebas_automaticas` 4390 → 4392. Sin cambio: `cobertura_lineas` (la misma corrida da 4713 de 4832 líneas, igual que el export), `pruebas_e2e` (`playwright test --list` del 2026-10-27: 1294 en 12 archivos) y las cifras del catálogo (su test las re-deriva del repo y pasa). |
| Complemento | `complemento.yaml` completo. Cambian: encabezado (procedencia planeadora, pedido 026, 2026-10-27) · `procedencia: planeadora` (nuevo, va con el proceso) · `declarado_en` 2026-10-11 → 2026-10-27 · `titular` reescrito (222 de 240) · `limites` 3 → 4 (nuevo: los resúmenes de ISO/IEC 42001 aún no se contrastan con la norma) · `nunca` 4 → 5 (nuevo: cerrar un hallazgo porque dejó de aparecer en un escaneo) · `proceso` nuevo. Sin cambio: `schema_version`, `app`, `cifras_destacadas` y `roadmap` (copiado byte a byte de `data/fichas/hackguard.yaml`). |
| Cifras destacadas | `funcionalidades` · `pruebas_en_el_catalogo` · `controles_iso_42001` · `pruebas_automaticas` · `costo_operacion_mensual`. **Un cero, y es la promesa:** el `diferencial` ahora lo declara («Corre como web estática, sin servidor ni servicios de pago: operarla cuesta cero»). |
| Proceso («Cómo funciona») | **Nuevo** (HackGuard no tenía): «De tu app a la evidencia, control por control». 3 carriles (Tú · HackGuard · Tus herramientas, afuera), 17 pasos (1 inicio, 13 tareas, 3 decisiones, 1 fin), 19 flujos, 5 anotaciones. Cada paso está en el manual (Activos y plan · Carga de evidencia · Evidencia y hallazgos · La brecha y el informe). |
| Capturas | **18 + portada.** Portada: `entrada.webp` (el Tablero, la pantalla a la que lleva la raíz). `sin_pantalla`: ninguno (las 18 funcionalidades tienen pantalla). WebP de 1536×960 (viewport 1024×640 a escala 1,5), de 49 a 77 KB, todas a calidad 75–80. |
| «vitrina» | 1 frase, en el `detalle` de la métrica `funcionalidades`: «El resto son del roadmap o de la vitrina para terceros» → «El resto son del roadmap o del modo público para terceros». Ahí la palabra nombraba el modo público de HackGuard (§ 5 «La vitrina» de su VISION), no a CV Viva: por eso «modo público» y no «Portafolio». Las razones de `enlaces` ya dicen «Portafolio». El validador no da avisos. |
| Prueba del export de la app | Export copiado a `docs/` de la copia aislada: `tests/unit/brochure-export.test.ts` **13 de 13 en verde** (esquema de CV Viva copiado, secciones del manual, cifras re-derivadas, topes de la ficha, cero enlaces). |
| Commit de `main` | No aplica: lo ejecuta la planeadora y la planeadora commitea esta carpeta. |

### Salida del validador

```
$ ~/Code/app-planlang/node_modules/.bin/tsx --tsconfig ~/Code/app-hoja-de-vida/tsconfig.json \
    ~/Code/hr01-develop-ai-apps/vitrina/validar-026.mts ~/Code/hr01-develop-ai-apps/vitrina/apps/026/hackguard
✓ hackguard: 18 funcionalidades en 4 grupos · 18 capturas + portada · 0 sin pantalla · proceso 17 pasos · arma en CV Viva
```

## Las capturas, una por una

Build de producción (`pnpm build` + `serve`, sin indicador de desarrollo) en el puerto 3206, fecha de consulta 2026-10-14 (la del
commit base), tema claro, español. Datos: solo los activos, lotes, hallazgos y propuestas **demo sintéticos** del repo; ningún dato
personal. Revisadas una por una: contenido real, sin errores ni overlays, sin estados vacíos, sin cargas ni ataques.

| Archivo | Pantalla y estado |
|---|---|
| `entrada.webp` | Tablero: lo que pide atención, el instrumento validado, un hallazgo vencido. |
| `F01` | Ficha de PR-AG-HERR-001: resultado esperado, por qué importa, cómo se decide el veredicto (k = 20). |
| `F02` | Bandeja de propuestas en PROP-0034, marcada por el filtro de contenido (patrón y campo, sin texto). |
| `F03` | Catálogo al pie: «Vigencia por familia», cada estado con símbolo y texto. |
| `F04` | Marcos: el mapa de equivalencias OWASP LLM 2025 → 2026 con las pruebas que citan cada entrada. |
| `F05` | Controles: las cifras del Anexo A, «No contrastado con la norma» y los resúmenes en palabras propias. |
| `F06` | Catálogo filtrado por «Modelo de decisión» (12 de 38). |
| `F07` | Bandeja filtrada por «Investigador»: propuestas con fuentes verificadas. |
| `F08` | Portal demo de clientes: «Sin autorización no hay plan». |
| `F09` | Plan del asistente demo: 14 planeadas, 12 excluidas, cada prueba con «Aplica porque» y su prioridad. |
| `F10` | Paquete de ejecución: herramientas, alcance y límites, reglas de enfrentamiento. |
| `F11` | Carga de evidencia, LOTE-0007: la ficha del lote (solo huellas), qué revisar y el sobre seleccionado. |
| `F12` | HZ-0003: la cadena de cierre completa, cerrado por re-prueba. |
| `F13` | HZ-0009: severidad CVSS 4.0 con su vector y la referencia de FIRST fijada. |
| `F14` | Carga de evidencia, LOTE-0008 de ZAP: fallida, «no ejecutada» y superada, con su revisión. |
| `F15` | Bandeja filtrada por «Extractor»: citas verificadas por código y veredicto sugerido por la regla. |
| `F16` | Brecha: 8 de 25 ejecutadas, superadas, fallidas y sin ejecutar, y la cobertura por activo. |
| `F17` | Vista del control A.6.2.6 (reentrega 2026-10-28): el aviso «Con fallas» y su tabla entera, 3 pruebas con resultado, evidencia y hallazgo. |
| `F18` | Tablero con «Ver las comprobaciones» abierto: las 4 comprobaciones del instrumento en verde. |

## Devolución (lo que adopta la app en su próximo sprint)

1. **El copy en su fuente.** Copiar este `brochure-export.json` a `docs/brochure-export.json`. Su test del export pasa tal cual
   (13 de 13). Si la app regenera el export, `scripts/cifras-del-export.mjs --correr --escribir` conserva los textos, pero la fuente
   del copy es este archivo: no se vuelve al texto viejo.
2. **El brochure propio y el BLUEPRINT.** Con el export nuevo, `tests/unit/documentos-del-hito.test.ts` falla en 3 pruebas:
   `docs/BROCHURE.html` debe llevar los 18 nombres nuevos y la cifra 4392, y `docs/BLUEPRINT.html` la fecha del export. Hay que
   regenerar el brochure con el copy nuevo **en español y en inglés** (el export es solo en español; la versión en inglés del copy
   la escribe la app) y poner la fecha en el BLUEPRINT. El generador del brochure sigue fuera del repo (lección del S9): llevarlo
   al repo en ese mismo sprint.
3. **Dos defectos de pantalla a 1024 px** (los vi al tomar las capturas a 1024×640):
   - en `/activos/<id>/plan`, el botón «Descargar el paquete» de la barra del pie se parte en una letra por línea (columna
     vertical): la captura F10 se tomó encima de esa barra;
   - en `/catalogo/propuestas`, la tira de 3 cifras deja una cuarta celda gris vacía en la rejilla de 4.
4. **Next.js 16.4.0.** El primer `pnpm build` de la copia se detuvo con un aviso de vulnerabilidad conocida de Next.js; el segundo
   pasó. No actualicé nada: revisar el aviso y la versión de Next en el próximo sprint, con el PR de dependabot si existe.
5. **Las capturas, reproducibles.** El script que las tomó está en el scratchpad de la planeadora; la app puede adoptarlo como
   `scripts/capturas-ficha.mjs` (build de producción, `HACKGUARD_CONSULTA`, tema claro, 1024×640 a escala 1,5, anclas por texto).

## Pendientes

- Ninguno que bloquee la ficha.
- La versión en inglés del copy (punto 2 de la devolución): el export no tiene campos en inglés, así que la escribe la app en su
  brochure.
- La corrida e2e completa no se repitió: ningún archivo e2e cambió desde el 2026-10-13 y `--list` da las mismas 1294.

## Decisiones que tomé

1. **Fecha de consulta 2026-10-14** para el build de las capturas: es la del commit base, lo que muestra su producción. Con ella todo
   el catálogo sale «vigente», y es verdad a esa fecha.
2. **Comandos en pantalla.** F08 y F11 dejan ver comandos propios de HackGuard (`pnpm plan:emitir`, `pnpm evidencia:confirmar-lote`).
   No son material de ataque: la regla «nunca» habla de cargas, exploits y crudos. En F10 elegí el pie del paquete para no mostrar
   los nombres de los módulos de garak.
3. **F12 y F13 en dos hallazgos distintos** (HZ-0003, la cadena cerrada; HZ-0009, la severidad CVSS) para no repetir pantalla.
4. **F08 en el portal demo sin plan:** muestra «Sin autorización no hay plan», el corazón de la funcionalidad.
5. **Sin afirmaciones de unicidad.** El titular dice «Otras herramientas acumulan alertas o llenan matrices» en vez de «la única»
   (E-1 del brief). La familia de modelos de decisión ya no se llama «La familia que nadie prueba todavía»: la investigación que lo
   respalda es del 2026-10-02 y el brief le pone fecha de caducidad.
6. **Límites y «nunca».** Sumé un límite (resúmenes sin contrastar con la norma, del manual) y un «nunca» (cerrar por desaparición,
   del manual y de la pantalla de cada hallazgo). Los demás quedan con su texto de la planeadora.
7. **«vitrina» → «modo público»** y no «Portafolio»: ahí la palabra nombraba el modo público de HackGuard, no CV Viva.
8. **Los grupos** conservan orden, `estrella` y composición; solo su `nombre` y su `linea` cambian, con la forma «tema: lo que te da».

## Reentrega 2026-10-28

Defectos de la lista de CV Viva (`privado/revision-s21/entrega-026-defectos.md`, su sprint 026, PR #105) que tocan a HackGuard: uno.
La misma base `b5acd4b` y la misma copia aislada. El build de producción volvió a detenerse la primera vez con el `SecurityFatalError`
de Next.js 16.4.0 y pasó al repetir el mismo comando, como el 2026-10-27; no se actualizó nada (punto 4 de la devolución).
Servidor solo en el puerto 3204, la misma fecha de consulta (2026-10-14), tema claro, español, 1024×640 a escala 1,5.

- **F17** · ahora se ve el control A.6.2.6 «Se vigila mientras opera», el más corto de los que tienen fallas: el aviso «Con fallas, 1 de
  3 pruebas falló» y su tabla de pruebas **entera** sobre la barra inferior. Están sus tres pruebas: una fallida con el hallazgo HZ-0005 de
  severidad media y el riesgo aceptado, una sin ejecutar y una superada con evidencia antigua. Cada una trae su sobre, su fecha, su huella y
  su confirmación por «Operador demo», que es un rol. · **retomada**, y el pie reescrito para que diga lo que se ve:
  «Un control de ISO/IEC 42001 con fallas: sus tres pruebas, evidencia y hallazgo» / «An ISO/IEC 42001 control with failures: its three
  tests, evidence and finding» (78 y 77 caracteres). WebP de 1536×960, 66 010 bytes, calidad 80. La revisé con Read: sin cortes, sin rutas,
  sin nombres de persona y sin overlays.
  - **Por qué del aviso hacia abajo y no desde el título:** a 1024×640 la barra inferior ocupa 60 px y quedan 580 útiles. Del
    identificador del control al final de su tabla, A.6.2.6 mide 738 px y A.9.4 (2 pruebas, sin fallas) mide 603. Ningún control con
    fallas cabe entero con su título. El identificador y el nombre quedan justo encima del cuadro.
- **Lo demás, idéntico byte a byte:** el export, el complemento y las otras 18 imágenes (sha256 comparados antes y después). En
  `capturas.yaml` solo cambia la línea de F17.

```
$ ~/Code/app-planlang/node_modules/.bin/tsx --tsconfig ~/Code/app-hoja-de-vida/tsconfig.json \
    ~/Code/hr01-develop-ai-apps/vitrina/validar-026.mts ~/Code/hr01-develop-ai-apps/vitrina/apps/026/hackguard
✓ hackguard: 18 funcionalidades en 4 grupos · 18 capturas + portada · 0 sin pantalla · proceso 17 pasos · arma en CV Viva
```

## Pies corregidos 2026-10-29 (al cierre del 027 de CV Viva)

CV Viva marcó pies que dicen más de lo que se ve. Solo cambia el texto de `capturas.yaml`; las imágenes no se tocan.

- F17 · sale «ISO/IEC 42001»: el nombre de la norma no está en el encuadre.

```
✓ hackguard: 18 funcionalidades en 4 grupos · 18 capturas + portada · 0 sin pantalla · proceso 17 pasos · arma en CV Viva
```

## Tomas con propósito 2026-10-31 (pedido del dueño para el brochure)

- **Cómo:**
  - **Entorno:** la misma base que la entrega 026: copia aislada de `b5acd4b` (`git archive`), `pnpm install --ignore-scripts` y build de
    producción (export estático) con `HACKGUARD_CONSULTA=2026-10-14`, servido con `serve` en un puerto propio. El primer build volvió a
    detenerse con el `SecurityFatalError` de Next.js 16.4.0 y pasó al repetir el mismo comando, como el 27 y el 28 de octubre; no se
    actualizó nada (punto 4 de la devolución). Tema claro, español, solo los activos, lotes, hallazgos y propuestas demo del repo.
  - **Composición:** cada pieza es la caja exacta de su unidad, capturada a DPR 3 y centrada en un lienzo de 1024×640 CSS con el fondo del
    `body` de la app, con s = min(944/w, 560/h, 2), nunca bajo 0,6. La pieza sin borde propio lleva sombra suave y esquinas de 12 px. El
    aire alrededor se recorta hasta 3 px antes del vecino más cercano y un detector anota todo elemento que la caja atraviese.
  - **Ancho por pieza:** se mide en 1280 · 1024 · 900 · 768 · 640 (la portada en 1440 · 1280 · 1024). Gana el de mayor llenado; si empatan
    a ±5 %, el más ancho. Se descarta un ancho si cambian los textos visibles de la pieza frente a 1024, si la pieza no aparece, si s baja
    de 0,6 o si la caja atraviesa algo.
  - **La navegación no entra en ninguna toma.** Bajo 1100 px la app la baja a una barra fija al pie, que se oculta en la toma (sin mover
    nada) para que no tape la pieza. Desde 1100 px es la barra lateral, que queda fuera de la caja. El puntero se aparta antes de cada
    toma, para que ninguna fila salga resaltada por `:hover`.
- **Las 19** (id · tipo · qué se ve · ventana · s · llenado):
  - `entrada` · página arriba · la cabecera (HackGuard, «Tablero», Claro y ES), el resumen 2 · 1 · 6 · 11 y el sello «El instrumento pasó su validación» · 1024 · 0,92 · 55 %
  - `F01` · pieza · la ficha de PR-AG-HERR-001 de «Resultado esperado» (con «Por qué importa») a «Cuándo aplica», con «Cómo se decide el veredicto» y «Configuración de la corrida» · 1024 · 0,62 · 54 %
  - `F02` · pieza · la tarjeta PROP-0034 entera: dos fuentes verificadas, «Marcada por el filtro de contenido» (patrón y campo, sin texto) y sus botones · 1280 · 1,36 · 80 %
  - `F03` · pieza · «Vigencia por familia»: las cuatro familias, cada una con símbolo y texto · 900 · 1,08 · 54 %
  - `F04` · pieza · «Mapa de equivalencias» entero: OWASP LLM 2025 → 2026, sus 10 entradas con las pruebas que las citan y la nota final · 1280 · 0,60 · 52 %
  - `F05` · pieza · la cabecera de «Controles» (ISO/IEC 42001, «el texto de la norma no está aquí»), su resumen y «Áreas del Anexo A» con «No contrastado con la norma» y sus dos primeras áreas · 1280 · 0,86 · 77 %
  - `F06` · pieza · el catálogo filtrado por «Modelo de decisión» («Se muestran 12 de 38 pruebas»), los filtros y sus dos primeras pruebas · 1024 · 0,95 · 67 %
  - `F07` · pieza · los filtros de la bandeja con «Investigador» («Se muestran 8 de 11 propuestas») y la tarjeta PROP-0031 entera, con sus dos fuentes verificadas · 640 · 1,31 · 72 %
  - `F08` · pieza · `act-demo-portal` «Registrado, sin plan», su nombre y el aviso «Sin autorización no hay plan» · 640 · 1,48 · 49 %
  - `F09` · pieza · la cabecera del plan del asistente demo, el resumen 14 · 12 · 4 · 3 y «Pruebas planeadas» con sus dos primeras pruebas (razón, prioridad, herramienta y control) · 1024 · 0,92 · 71 %
  - `F10` · pieza · el paquete: las tarjetas de promptfoo y ZAP (versión mínima, dónde corre, cómo vuelve el resultado y sus pruebas), «Alcance y límites» y «Reglas de enfrentamiento» · 1280 · 0,75 · 64 %
  - `F11` · pieza · LOTE-0007: «Ficha del lote» (archivo y huellas), «Para confirmar» (qué revisar y sus comandos) y «Sobre seleccionado» · 1024 · 0,64 · 56 %
  - `F12` · pieza · HZ-0003 «Cerrado por re-prueba»: su título y la cadena de cierre completa · 768 · 1,17 · 77 %
  - `F13` · pieza · la tarjeta «Severidad» de HZ-0009: 5.1, el vector CVSS 4.0, las métricas base y la referencia fijada · 768 · 1,26 · 80 %
  - `F14` · pieza · LOTE-0008 de ZAP entero: «Sin confirmar», 1 fallida · 1 no ejecutada · 1 superada, sus tres sobres con su revisión y la nota de la muestra · 900 · 1,04 · 78 %
  - `F15` · pieza · los filtros con «Extractor» («Se muestran 3 de 11») y la tarjeta PROP-0036 entera: 8 citas verificadas por código y el veredicto de la regla · 1024 · 0,80 · 70 %
  - `F16` · pieza · «Brecha»: su cabecera, 8 / 25 · 5 · 3 · 17, el aviso de evidencia por confirmar y «Cobertura» por activo con los tres activos · 1280 · 0,90 · 76 %
  - `F17` · pieza · el control A.6.2.6 «Se vigila mientras opera»: su identificador, su resumen, el aviso «Con fallas» y su tabla entera de tres pruebas · 1024 · 0,73 · 64 %
  - `F18` · pieza · el sello del instrumento abierto: «4 de 4 comprobaciones en verde» y la tabla E-6 · RF-10.3 · S1 · S2, todas «En verde» · 900 · 1,08 · 68 %
- **Conteo:**
  - 18 piezas y 1 página arriba;
  - llenado de 49 % (`F08`) a 80 % (`F02`, `F13`): ninguna bajo el 35 %;
  - escala de 0,60 (`F04`) a 1,48 (`F08`), siempre entre 0,6 y 2;
  - ventanas: 1280 en 5, 1024 en 7 (con `entrada`), 900 en 3, 768 en 2 y 640 en 2;
  - WebP de 1536×960 a q 80, de 32 a 72 KB.
- **Anchos descartados:**
  - `entrada`: a 1440 y 1280 la marca «HackGuard» pasa a la barra lateral y sale de la cabecera, así que la toma cambia. Queda 1024.
  - `F01` y `F04`: a los demás anchos la escala queda bajo 0,6.
  - `F10` a 768: la rejilla pasa a dos columnas y la caja de Inspect entra en la pieza. A 640 la escala queda bajo 0,6.
  - `F11` y `F17` a 1280: la columna lateral reparte la pieza y la caja abarca otro bloque. `F11` también cambia a 768 y a 640.
  - `F05`, `F06`, `F09`, `F14`, `F16`, `F17` y `F18`: a 768 y a 640 la tabla pierde sus encabezados de columna.
- **Pie que cambió (1):** `F18` · «El tablero con las comprobaciones del instrumento, todas en verde» → «Las comprobaciones del instrumento,
  todas en verde» / «The dashboard with the instrument's checks, all green» → «The instrument's checks, all green».
  - La pieza es el sello abierto: la cabecera del tablero ya no está en el encuadre.
  - Los otros 17 pies siguen diciendo lo que se ve.
  - En la cabecera de `capturas.yaml` cambia la línea que describe la toma.
- **Lo que no queda sin corte:**
  - `F05`, `F06` y `F09` son tablas de 9, 12 y 14 filas que enteras quedarían bajo 0,6. Cada pieza termina en la línea divisoria de una
    fila (dos filas completas en cada una), sin cortar texto, y la tabla sigue debajo.
  - `F10` empieza debajo de la primera fila de herramientas (garak, hackguard-revision e Inspect), que sigue arriba. El paquete entero
    mide 1729 px a 1024. Además, así no se ven los nombres de módulos de garak (decisión 2 de la entrega) ni la franja del pie con el
    botón partido (punto 3 de la devolución).
- **Decisiones:**
  - **`F04` va entero**, con s = 0,60 a 1280, porque la regla pide la unidad completa cuando cabe sobre 0,6.
  - **`F01` va sin el título de la prueba:** con él, ninguna ventana llega a 0,6. Lleva las cuatro secciones que prueban su pie.
  - **`F11` deja ver el selector del sobre** («encoding · encoding.DecodeMatch»): es el nombre de una sonda y un detector de garak, no
    una carga ni un ataque. Conviene que el dueño lo mire.
  - **`F17` ahora muestra el título del control y «ISO/IEC 42001»;** el pie del 29 de octubre se conserva porque sigue siendo cierto.
  - **Comandos en pantalla:** `F08` y `F11` muestran comandos propios de HackGuard, como en la entrega.
  - **Referencia en `F13`:** es `FIRSTdotorg/cvss-v4-calculator@c5b0d40`, un repositorio y su commit; no es un enlace.
  - Ningún correo, teléfono, URL ni `localhost` a la vista. Los únicos nombres son roles demo, como «Operador demo».
- **Validador:**

```
✓ hackguard: 18 funcionalidades en 4 grupos · 18 capturas + portada · 0 sin pantalla · proceso 17 pasos · arma en CV Viva
```

- **Limpieza:** servidor apagado; sin Docker; la copia (con su `node_modules` y su build) y las tomas intermedias, borradas.
