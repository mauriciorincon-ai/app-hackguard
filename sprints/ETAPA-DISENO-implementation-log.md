# Etapa de Diseño (F2a) — bitácora de implementación

Orden: `portafolio/hackguard/ordenes/DISENO-orden.md` (planeadora, solo lectura). Rama
`diseno/fundacion`. Plan aprobado y «construye» del usuario: 2026-10-03.

## Fase 0 — Tubería (2026-10-03)

**Criterio de fase completa:** el preview del PR abre la maqueta provisional con estilos, con sesión de
Vercel. Sin diseño todavía: la página `index.html` de esta fase declara que es provisional.

### Qué se construyó

- **Generador** `scripts/maqueta/` (ESM de Node, sin dependencias): `generar.mjs`, `rutas.mjs`,
  `nucleo/` (fechas civiles sin reloj, vigencia, HTML bilingüe, trazos de símbolos, armazón de página),
  `datos/` (fecha de consulta, umbrales, muestra de la fase 0), `paginas/index.mjs`.
- **Entrega:** `scripts/copiar-maqueta.mjs` encadenado en `build`; `vercel.json` y `serve.json`;
  `start` con `--config ../serve.json`. Patrón adoptado entero de big-d, que ya pagó el 404.
- **Arnés** `scripts/capturar-maqueta.mjs` + sondas compartidas con los e2e
  (`scripts/maqueta/arnes/sondas.mjs`): sirve `docs/diseno/` y entra por el índice; página × tema ×
  idioma × ancho × estado; desbordes; pasada de interacción por huella SHA-256 del DOM; vistas de
  daltonismo con `--simular`. Declara su árbol y aborta si la salida cae dentro del repo.
- **Gates** (tabla abajo), `docs/diseno/README.md`, `.prettierignore`, `datos/privado/` y
  `public/diseno/` en `.gitignore`, ignorados de ESLint.

### Demos en rojo (regla 15) — todas en este commit

Cada edición se confirmó con `cmp` contra un respaldo antes de correr el gate; después se restauró y
la suite volvió a verde (30 unitarias, 24 e2e).

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| D1a | deriva | `data-dias="12"` → `"13"` a mano en `index.html` | «index.html: difiere de lo que genera scripts/maqueta» |
| D1b | deriva | fecha de un dato cambiada sin regenerar | el mismo, sobre `index.html` |
| D2a | controladores | el script registra «estados» en vez de «estado» | «ningún script cargado registra «estado» → `<button … data-valor="datos"`» |
| D2b | controladores | la página deja de cargar `assets/maqueta.js` | «ningún script cargado registra «tema»» |
| D2c | controladores | enlace a `kit.html`, que aún no existe | «enlace a una página que no existe (kit.html)» |
| D3 | autocontención | `@import` de una hoja remota en `maqueta.css` | «assets/maqueta.css: url() remota en CSS» |
| D4a | bilingüe | un título emitido solo en español | «texto sin idioma declarado: ['Vigencia calculada']» |
| D4b | bilingüe | un `aria-label` sin su inglés | «aria-label sin inglés → `<button … data-controlador="tema"`» |
| D5 | envejecimiento | umbral corrido un día (`>=` → `>`) | «index.html @ 2026-10-21 (verificada 2026-09-21): estado a los 30 días: expected 'vigente' to be 'por_revisar'» |
| D6 | servidores | `serve.json` redirige `/diseno` a otro destino | «expected ['/diseno → /diseno/index', …] to deeply equal …» |
| D7 | servida (e2e) | `pnpm start` sin `serve.json` | 6 rojos: URL `/diseno` en vez de `/diseno/index.html` y fondo `rgba(0, 0, 0, 0)` — la maqueta sin estilos, el defecto exacto de las apps hermanas |
| D8a | interacción (e2e) | el controlador «estado» no hace nada | «el control «estado:vacio» no cambió nada al activarlo» (×4). **El gate unitario de controladores siguió verde**: por eso existe la pasada |
| D8b | 380 px (e2e) | `min-width: 480px` en una celda | «documento: scrollWidth 496 > 380» |
| D8c | accesibilidad (e2e) | tinta secundaria clara sobre fondo claro | «color-contrast: 10», solo en el tema claro |
| D9 | reducir movimiento (e2e) | transición fuera de su media query | «Expected: 0 · Received: 30» animaciones |

### Bugs y resoluciones

- **El gate bilingüe nació decorativo.** Su primera demo (D4a) salió **verde con el defecto puesto**:
  `closest("[lang]")` encontraba el `lang` de `<html>`, así que todo texto «tenía idioma». Se excluyó la
  raíz y se repitió la demo hasta verla en rojo. Es la tercera pregunta de la regla 15 —¿puede fallar?—
  respondida por la demo, no por la lectura del código.
- **La demo D6 no editó nada en su primer intento** (un `sed` inválido). `cmp` lo delató («SIN CAMBIO»)
  y el gate se habría dado por demostrado sin estarlo. Se repitió con la edición real.
- **Capturas a media transición.** La primera pasada fotografió un botón de estado con el borde aún
  animándose (parecían dos botones activos). El arnés ahora captura con las animaciones terminadas.

### Vercel, sin desplegar

`vercel build` local (sin sesión ni deploy, con un `.vercel/project.json` desechable e ignorado) confirma
lo que big-d encontró: el constructor de Next publica `diseno/index.html` en la ruta `diseno/index`. Con
`vercel.json`, las dos redirecciones de `/diseno` quedan **antes** de la regla que quita la barra final,
y la reescritura `.html` queda **después** de `filesystem` con `check: true`. Los `assets/` se publican
tal cual. **Falta la prueba real: el usuario abre el preview con sesión.**

### Dependencias (carril aparte)

Los PRs #1 y #2 de dependabot estaban en rojo por haber nacido sobre el commit inicial, antes de la
excepción de auditoría del PR #3. #1 (acciones de CI): regenerado con `@dependabot rebase`, tres checks
en `success`, mergeado. #2 (npm, react y react-dom 19.3.0): tras regenerarse siguió en rojo en el propio gate de la regla 18 —su
lockfile dejaba `electron-to-chromium` en 1.5.443 y `main` ya tiene 1.5.444—. No se peleó el lockfile de
dependabot: se abrió el PR #5 desde `main` con los mismos dos bumps y el lockfile regenerado
(`verificar-dependencias`: 653 paquetes, ninguno por debajo de `main`; `pnpm peers check` limpio), tres
checks en `success`, mergeado, y el #2 se cerró como reemplazado.

## Fase 1 — Dirección (2026-10-03 / 04)

**Mirada 0 registrada** antes de empezar: el usuario abrió el preview del PR #4 y envió la captura con la
página servida con estilos y un estado activo. Su primer «continúa» llegó sin comentar la página y se le
repreguntó (gate de mirada); además no supo dónde abrirla, así que desde ahora cada mirada lleva el
enlace directo del preview en el chat.

### Qué se construyó

- **Dirección A «libro de evidencia»** (recomendada) y **B «acta»** (alternativa), conmutables en
  `direccion.html` sobre el mismo HTML: un corte real de la vista por control (pantalla 12).
- **Paleta** en `scripts/paleta/` (OKLCH → hex): neutros cálidos, un acento —la tinta azul, reservada a
  la mano humana— y cuatro papeles de estado. `tokens.css` y `tokens.json` son salida de `pnpm tokens`.
- **Tipografía:** Atkinson Hyperlegible Next y Mono (A) y Source Serif 4 para los títulos de B; OFL,
  subconjunto latino, en `docs/diseno/assets/fuentes/` con su licencia.
- **Hoja del sistema** `assets/hg.css` separada de la hoja de sala `assets/maqueta.css`.
- **Generador:** vocabulario de estados como dato (`nucleo/estados.mjs`), componentes canon
  (`nucleo/componentes.mjs`), trazos SVG (`nucleo/simbolos.mjs`), mundo sintético (`datos/mundo.mjs`) y
  cifras derivadas (`nucleo/calculos.mjs`): antigüedad de evidencia, plazo y atraso por severidad, cota
  3/k, estado del control, huellas SHA-256 reales de cada registro sintético.
- **`design-system.md` 0.1.0** (personalidad, color, tipografía, espacio, estados, componentes canon).
- **Arnés:** variantes de dirección y comprobación de fuente cargada (`status === "loaded"`).

### Decisiones

- **La forma se asigna por papel, no por concepto.** Círculo relleno con visto = bien; triángulo =
  atención; cuadrado relleno con aspa = falla; círculo punteado = ausente. «Vigente», «superada» y «con
  evidencia vigente» comparten forma porque comparten papel: menos formas, más fáciles de aprender sin
  color.
- **La severidad no se codifica por tono** sino con cuatro barras ascendentes: la forma lleva el orden.
- **Lo que no es noticia no lleva marca:** una evidencia reciente junto a un veredicto fallido no muestra
  un visto verde (confundía); la marca aparece solo cuando la evidencia envejece.
- **Columna de folio:** en escritorio el identificador de cada fila tiene su propia columna.
- **Regla 11 en la maqueta:** del control solo se usa el identificador `iso42001-A.6.2.4` y un resumen
  con palabras propias; es ilustrativo hasta el S1.

### Demos en rojo de esta fase (confirmadas con `cmp`)

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| F1 | cobertura de fuente | una flecha en un texto | «caracteres fuera de la cobertura de las fuentes: ['→ U+2192']» |
| F2 | envejecimiento · evidencia | umbral de 180 días corrido un día | «@ 2027-02-13 (evidencia desde 2026-08-17): estado a los 180 días: expected 'vigente' to be 'antigua'» |
| F3 | envejecimiento · plazo | atraso contado con un día de más | rojo en las cinco fechas en que el hallazgo está vencido |
| F4 | envejecimiento · control | una sola falla deja de dominar el estado del control | rojo en las fechas con una prueba fallida |
| F5 | paleta · contraste | tinta secundaria más clara en el tema claro | «tinta-2 sobre fondo: expected 3.30 to be greater than or equal to 4.5» |
| F6 | paleta · separación | el papel positivo llevado hacia el gris | rojo en visión normal y en las tres dicromacias |
| F7 | paleta · deriva | `tokens.css` editado a mano | «tokens.css: difiere de lo que genera scripts/paleta» |
| F8 | design-system | un color cambiado en la tabla del documento | «expected ['#000000', '#f6f3eb'] to deeply equal ['#12100e', '#f6f3eb']» |

### Bugs y resoluciones

- **El tema claro confundía dos pares de papeles bajo daltonismo** en la primera paleta (positivo con
  neutro en protanopía, ΔE 0,012; atención con falla en deuteranopía, 0,023). Lo encontró la medición, no
  la vista. Se separaron por luminosidad además de por tono; peor par actual 0,072.
- **Fechas partidas por el guion** en columnas estrechas: identificadores y fechas ya no se parten.
- **Regla doble duplicada** en la dirección B (la especificidad del selector de dirección ganaba a la
  regla que la quitaba).

- **El puerto 3000 lo ocupaba otra app de la casa** (un servidor de desarrollo de `app-ds`). Playwright
  abortó en vez de probar contra el árbol ajeno —la configuración sin reuso de servidor hizo su trabajo—.
  No se tocó ese proceso: `E2E_PUERTO` permite correr los e2e en otro puerto (3000 sigue siendo el de CI).

### Pasada de capturas

44 capturas (380 y 1280 × tema × idioma × estado, más la dirección B), leídas como imagen: oscuro y
claro en escritorio, teléfono en oscuro, dirección B y estado de error. Sin desbordes, 8 controles
activados en `direccion.html` y 2 en `index.html`, fuentes en `loaded`.

## Fase 2 — Sistema, kit, catálogo y ficha (2026-10-04)

**Mirada 1 registrada:** el usuario eligió la dirección **B «acta»** («Me voy con B»), no la recomendada.
Se consolidó como única dirección: la A y su conmutador se retiraron del repo (hoja, script, generador,
arnés). Su respuesta eligiendo dirección se tomó además como el visto bueno para seguir con la fase 2.

### Qué se construyó

- **`design-system.md` 0.2.0** completo: personalidad, color, tipografía, espacio, estados, componentes
  canon, movimiento, idioma, contrato con el código, anti-patrones.
- **`kit.html`**: cada token y componente con la hoja real.
- **`catalogo.html`** (pantalla 2): 21 pruebas sintéticas de las cuatro familias en filas de libro, con
  filtros que funcionan (familia, marco, control, madurez, vigencia, revisión), contador y «Quitar
  filtros». Estados: con datos, sin resultados, vacío, carga y error (pruebas rechazadas al cargar).
- **`prueba.html`** (pantalla 3): ficha con resultado esperado destacado, regla de veredicto con k y su
  cota, asimetría, «no ejecutada» frente a «superada», configuración de la corrida, marco y controles
  con su propia vigencia, cuándo aplica y fuentes.
- **Navegación de la app** (cinco secciones y subnavegación) en el armazón de página.
- **Catálogo sintético** en `scripts/maqueta/datos/catalogo.mjs`; el corte de la vista por control ahora
  sale de él.
- **Arnés:** capturas por tramos (`--tramos`), listas desplegables en la pasada de interacción, vueltas
  para controles ocultos o ya pulsados, y una sonda nueva: nada se sale de su columna dentro de una fila.

### Decisiones

- **Las opciones de una lista llevan sus dos idiomas** en `data-es` / `data-en` y el script pone el del
  idioma activo (un `<option>` no admite marcado); el gate bilingüe lo exige.
- **En teléfono las filas van en dos columnas** bajo el folio y la descripción: la primera versión
  ocupaba casi una pantalla por prueba.
- **El marco y la prueba tienen relojes distintos:** la ficha muestra la vigencia de la prueba, de la
  herramienta, del marco y de cada fuente por separado.
- **Fuentes como texto, no como enlace:** la maqueta no enlaza hacia fuera.

### Demos en rojo de esta fase

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| G1 | sonda de columna (arnés) | un dato con ancho mínimo mayor que su columna | «celda: `<span class="hg-huella">` se sale de su columna por 80 px» |
| G2 | pasada de interacción | (estado real) «Todas» quedaba pulsado tras «Quitar filtros» | «el control «filtro:familia» no cambió nada al activarlo» — era un defecto de la sonda, no de la página; se corrigió la sonda |
| G3 | bilingüe · listas | una opción de lista sin su inglés | «opción sin inglés → `<option value="limpia" data-es="Limpia">`» |

### Bugs y resoluciones

- **La sonda de interacción daba un falso rojo** con grupos que vuelven a su estado inicial; ahora pulsa
  antes un hermano. Y otro falso rojo de la sonda de columna con los rótulos ocultos a la vista.
- **Mi primera demo de la sonda de columna no falló** (quitar el corte de la huella no la desbordaba a
  1280 px): la medición lo dijo y se cambió por una demo que sí desborda.
- **El texto que sigue a un estado se descolgaba** (la línea base la ponía el símbolo): el estado ahora
  se alinea por la línea base del texto.
- **Cabecera de teléfono de más de 400 px de alto:** marca y botones en una línea, navegación debajo.

### Mirada 2, ronda 2 — una ficha por prueba (2026-10-04)

**Qué vio el usuario.** Filtró el catálogo por «Vencido», abrió una fila y la ficha dijo «Vigente ·
verificada hace 12 días»: todas las filas abrían la ficha de `PR-IA-PINJ-001`. Yo lo había declarado
como decisión («todas las filas abren la misma ficha») en vez de verlo como lo que era: un detalle que
muestra el estado de otro objeto. Ninguna prueba lo veía, porque cada página era coherente por separado.

**Qué se construyó.**

- `datos/catalogo.mjs`: `REGLAS` (cinco reglas de veredicto como dato: `tasa-de-fallo/v1` y
  `alertas-zap/v1` del spike; tres ilustrativas para modelos de decisión y revisión propia) y el detalle
  de las 21 pruebas (por qué importa, resultado esperado, cuándo aplica, prioridad base, selector cuando
  el spike lo trae). `fichaDe(id)` lanza si a una prueba le falta detalle, cita una regla inexistente o
  nombra k sin declararlo. Todo al nivel de la regla dura 3: qué se verifica y qué se espera.
- `paginas/prueba.mjs` pasa a ser una fábrica: **una página por prueba** (`prueba-<id>.html`, 21). La
  ficha varía con su prueba: sello «Verificación vencida» o «Toca revisarla» bajo el encabezado, sello de
  revisión de contenido, «Sin control asignado» como deuda, repeticiones con cota / sin cota /
  determinista, vía de carga (adaptador o manual), fuentes derivadas del marco y la herramienta.
- Los sellos dicen el **umbral** (30/60 de `umbrales.json`), no los días transcurridos: la cifra que
  envejece sigue en un solo lugar, el que vigila la matriz de envejecimiento.
- Arnés de capturas: llega a cada página por el **camino más corto de enlaces desde el índice** (a una
  ficha se entra por el catálogo); antes exigía un enlace directo desde la portada.
- Matriz del pie en teléfono: se apila por fila (tres columnas estrechas partían las palabras).

**Demo en rojo (misma tanda, confirmada con `cmp`).**

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| G4 | `maqueta-fichas` (nuevo) | el enlace de todas las filas vuelve a apuntar a la ficha de `PR-IA-PINJ-001` (el defecto original) | 4 de 5 en rojo: «dos filas abren la misma ficha: expected 1 to be 21» y «PR-SW-XSS-001 abre la ficha de otra prueba (prueba-pr-ia-pinj-001.html)»; al revertir, `catalogo.html` idéntico byte a byte y 5 de 5 en verde |

El gate corre sobre la maqueta versionada y sobre una generada 45 días después (cuando varias filas ya
cambiaron de estado), y exige que entre las dos se vean los tres estados de vigencia.

**Verificación.** 344 pruebas unitarias (11 archivos) · 410 e2e en local (25 páginas × interacción, 380 px
en dos idiomas, axe en dos temas y dos idiomas, movimiento reducido; 1 min) · capturas de cinco fichas
representativas y del catálogo leídas como imagen, sin fallas.

**Decisión.** El e2e recorre las 21 fichas completas, no una muestra: los nombres y textos difieren en
largo y el desborde a 380 px es justo lo que una muestra no vería. Cuesta un minuto.

## Fase 3 — Marcos, controles, propuestas, activo y plan (2026-10-04)

Mirada 2 aprobada («Los abri y los apruebo») y registrada en el README antes de empezar. La aprobación se
tomó también como visto bueno de fase, igual que en la mirada 1 (se le dijo al usuario).

### Qué se construyó

- **`marcos.html`** (C4): versión de cada marco frente a la que publica su fuente, dos avisos de versión
  nueva (uno con propuesta en la bandeja, otro sin ella), mapa de equivalencias de OWASP LLM Top 10 de la
  1.1 a la 2025 con las pruebas que citan cada entrada, e instantáneas del catálogo con huella.
- **`controles.html`** (C5): las nueve áreas del Anexo A con resumen propio, los controles con las pruebas
  que les dan evidencia y la deuda de pruebas sin control. Solo identificadores y resúmenes propios.
- **`propuestas.html`** (C2, C7, C15): siete propuestas (fuente verificada, sin verificar, marcada por el
  filtro, cambio de versión, herramienta, sobre con veredicto calculado por la regla, texto que mezcla dos
  pruebas), botones de decisión que funcionan y registro de la corrida del investigador.
- **`activo-<id>.html`** (C8): tres activos demo ficticios; dueño y proveedor separados, política del
  proveedor citada en las reglas, perfil, alcance y reglas. El tercero, sin autorización.
- **`plan-<id>.html`** (C9, C10): planeadas con prioridad y razón, excluidas con sus tres motivos,
  cobertura por control y paquete de ejecución declarativo. Lo calcula `planDe()` desde el perfil.
- Datos nuevos: `datos/gobierno.mjs` (equivalencias, áreas, propuestas, corrida) y activos completos en
  `datos/mundo.mjs`. Núcleo: `libro()`, `fechado()`, `par()`, `enlace()` (nunca un enlace roto a una página
  que aún no existe), navegación por objeto. Controlador nuevo `decidir`; `estado` ahora sincroniza todos
  sus botones.

### Decisiones

- **Una página por activo y por plan**, por la lección de la mirada 2: un detalle muestra su propio objeto.
- **El mapa de equivalencias que se dibuja es 1.1 → 2025**, que conozco entrada por entrada; el aviso de
  la edición 2026 (E-15) aparece como propuesta pendiente, sin inventar su contenido.
- **El paquete de ejecución no tiene botón de descarga**: en la maqueta no descargaría nada.
- **Selectores de herramienta** solo donde el spike los trae (identificadores, no procedimientos).

### Demos en rojo de esta fase (confirmadas con `cmp`)

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| G5 | `maqueta-plan` (nuevo) | la página del activo declara «sin autorización» a un activo cuyo plan lista pruebas | «plan-act-demo-asistente.html: plan emitido sin alcance ni reglas: expected [ 'PR-AG-HERR-001', …(9) ] to deeply equal []» |
| G6 | pasada de interacción (sonda ampliada: busca un control recorriendo los estados de pantalla) | «Emitir el plan» deja el estado como está | «el control «estado:vacio» no cambió nada al activarlo» |

### Bugs y resoluciones

- **Flecha «→» fuera de la cobertura de las fuentes**: lo nombró el gate de cobertura; ahora es texto.
- **Identificador de marco más ancho que la columna de folio** (9 px): lo nombró la sonda de columna; el
  libro de marcos usa folio ancho.
- **Salto de nivel de título en la bandeja** (h1 → h3): lo nombró axe en el e2e; el título de cada
  propuesta es de segundo nivel con tamaño menor.
- **El arnés elegía dos botones «datos»** al existir «Emitir el plan»: ahora se limita a la sala.
- **La matriz de envejecimiento superó los 5 s por fecha** con 34 páginas: tiene 30 s por fecha. La suite
  unitaria tarda ~70 s; si sigue creciendo se parte por página.

### Verificación

442 pruebas unitarias (12 archivos) · 554 e2e en local (34 páginas) · capturas de las pantallas nuevas en
escritorio y teléfono leídas como imagen, sin fallas · 23 controles activados en la bandeja.

## Desviación del plan

- **`prueba.html` dejó de existir**: el plan nombraba una página `prueba`; ahora hay una por prueba
  (`prueba-<id>.html`). Es un ajuste pedido por el usuario en la mirada 2, no cambia el plan de miradas.

- **La paleta se eligió a mano y se validó por código**, no se «buscó» por código como decía el plan:
  con cinco papeles bastó ajustar luminosidades hasta pasar los umbrales. Los umbrales son literales en
  `tests/unit/paleta.test.ts`.

- **`--coverage` no entra al script `test` en esta etapa.** El plan lo listaba, pero la constitución lo
  fija para «los primeros tests del S1»: los umbrales cubren `src/lib` y `src/engine`, y en esta etapa no
  se escribe producto ni sus tests. Activarlo ahora pondría la CI en rojo por `src/lib/observability.ts`
  o empujaría a escribir producto antes de G-Diseño. Lo activa el S1.
- **El e2e de «enlace relativo abre otra página con estilos»** y **la comprobación de fuente cargada**
  se difirieron de la fase 0 a la fase 1 (no había segunda página ni fuentes). Pagados en la fase 1.
