---
version: 0.2.0
estado: dirección «acta» elegida en la mirada 1 · sistema completo propuesto en la mirada 2 · se sella en G-Diseño
---

# HackGuard — sistema de diseño

Fuente de verdad visual de la app. La maqueta de `docs/diseno/` lo demuestra (`kit.html` dibuja cada
pieza); el producto lo obedece. Se extiende por ADR, nunca se contradice en silencio.

## 1. Personalidad

**Un acta de evidencia: papel, tinta y firma.**

- Es: **sobrio, forense, legible**.
- Jamás será: **estética «hacker»** (verde terminal, calaveras, neón), **tablero de alarmas**
  (todo rojo, todo urgente), **gris corporativo** (plantilla de cumplimiento sin carácter).

Cuatro ideas sostienen todo lo demás:

1. **Se lee como un acta.** Títulos con serifa, secciones numeradas y una regla doble que abre cada
   libro. La página es un documento que alguien podría imprimir y firmar.
2. **Filas de libro mayor antes que tarjetas.** La evidencia va en renglones con líneas finas entre
   asientos, y el identificador en su propia columna, como un folio.
3. **La tinta azul es la mano humana.** El único acento de la app se reserva a lo que una persona
   confirma o acciona: firmas, enlaces, foco, selección. La IA propone en gris; lo confirmado va en azul.
4. **Forma antes que color.** Cada estado se reconoce por su símbolo y su texto. El color acompaña.

## 2. Color

Los tokens **se generan**: la fuente es `scripts/paleta/tokens.mjs` (OKLCH) y `pnpm tokens` produce
`docs/diseno/assets/tokens.css` y `tokens.json`. `tests/unit/paleta.test.ts` mide contraste y separación
bajo daltonismo; `tests/unit/design-system.test.ts` exige que esta tabla diga lo mismo que los tokens.

Neutros cálidos (papel en claro, grafito en oscuro), un acento y cuatro papeles de estado. El tema por
defecto es el oscuro; el claro se diseña y se mira con el mismo cuidado.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fondo` | `#12100e` | `#f6f3eb` | Fondo de la página |
| `--superficie` | `#1b1916` | `#fefcf9` | Superficie elevada (campos, menús) |
| `--superficie-2` | `#25221f` | `#ede9e0` | Superficie hundida, hover, esqueletos |
| `--linea` | `#3a3833` | `#d4d1c8` | Separador entre filas — **vetada como texto** |
| `--linea-fuerte` | `#78746e` | `#7e7a71` | Borde de controles y reglas de cabecera — **vetada como texto** |
| `--tinta` | `#ece9e4` | `#1f1c18` | Texto principal y reglas gruesas |
| `--tinta-2` | `#bbb7af` | `#544f48` | Texto secundario, rótulos, datos |
| `--acento` | `#89b1fa` | `#1b419f` | La tinta azul: enlaces, foco, firma de una persona |
| `--acento-tinte` | `#1c2a43` | `#dae7fe` | Fondo de lo firmado o seleccionado |
| `--positivo` | `#5acdc4` | `#017273` | Marca y borde de lo que está bien |
| `--positivo-tinte` | `#0b2e2b` | `#c9efeb` | Fondo del sello positivo |
| `--atencion` | `#efc558` | `#a77b0f` | Marca y borde de lo que pide atención |
| `--atencion-tinte` | `#352a0e` | `#f9eecd` | Fondo del sello de atención |
| `--falla` | `#f7755a` | `#a9170a` | Marca y borde de lo que falló o venció |
| `--falla-tinte` | `#431e16` | `#ffe0da` | Fondo del sello de falla |
| `--neutro` | `#a29e96` | `#848078` | Marca de lo ausente o no aplicable |
| `--neutro-tinte` | `#25221f` | `#ede9e0` | Fondo del sello neutro |

**Reglas de color**

- **El texto va siempre en tinta** (`--tinta`, `--tinta-2`), nunca en el color de un estado ni sobre un
  relleno saturado. Únicas excepciones: la firma y los enlaces, en `--acento`.
- **Tintas vetadas como texto:** `--linea` y `--linea-fuerte`. Son para separar y bordear. El primer
  sprint con UI añade el barrido que lo hace fallar en `pnpm lint`.
- **El acento se gasta con avaricia.** Si algo es azul y no es una firma, un enlace, el foco o la opción
  elegida, sobra.
- Umbrales medidos en ambos temas: tinta ≥ 7:1 sobre toda superficie y todo tinte; tinta secundaria y
  acento ≥ 4,5:1; marcas y bordes de control ≥ 3:1; los cinco papeles separados entre sí en visión normal
  (ΔE OKLab ≥ 0,10) y bajo protanopía, deuteranopía y tritanopía (≥ 0,05).

## 3. Tipografía

| Papel | Familia | Uso |
|---|---|---|
| Título | **Source Serif 4** (variable), peso 600 | Títulos de página y de sección, cifras grandes, texto destacado |
| Texto | **Atkinson Hyperlegible Next** (variable) | Todo lo demás que se lee |
| Dato | **Atkinson Hyperlegible Mono** (variable) | Identificadores, fechas, huellas, selectores, versiones |

Las tres son OFL y viven en el repo (`docs/diseno/assets/fuentes/`, subconjunto latino). Atkinson
distingue cada carácter del vecino (0/O, 1/l/I), que es lo que una huella o un identificador necesitan.

- **Mínimo de lectura: 15 px.** Escala: 15 · 16 · 18 · 24 · 32 (40 en escritorio).
- Cifras siempre tabulares. Fechas, identificadores y huellas no se parten por dentro.
- **Solo caracteres del subconjunto latino.** Flechas, vistos y símbolos se dibujan como trazos SVG
  (`tests/unit/maqueta-cobertura-de-fuente.test.ts`).

## 4. Espacio y forma

- Espaciado en pasos de 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72.
- **Esquinas rectas** (radio de 1 px). Sin sombras: la profundidad la dan las reglas y las superficies.
- **Regla doble** en tinta para abrir un libro, una ficha o una línea de cifras; línea de 1 px entre filas.
- Las secciones de una página se **numeran** (1., 2., 3.).
- Ancho máximo de página: 1120 px. A 380 px nada se desplaza en horizontal y nada se sale de su columna.
- Objetivo táctil mínimo: 44 px.

## 5. Estados: símbolo + texto + color

Una forma por papel, para que se aprenda sin color:

| Papel | Forma | Token |
|---|---|---|
| Bien | Círculo relleno con visto | `--positivo` |
| Atención | Triángulo con admiración; reloj para lo antiguo; medio círculo para lo parcial | `--atencion` |
| Falla | Cuadrado relleno con aspa | `--falla` |
| Ausente | Círculo punteado; círculo con raya para «no aplica» | `--neutro` |
| Mano humana | Trazo de firma | `--acento` |
| Severidad | Cuatro barras ascendentes, rellenas según el nivel | el papel del nivel |

El vocabulario completo (veredicto, vigencia, estado de control, severidad, confirmación) es **dato**:
vive en `scripts/maqueta/nucleo/estados.mjs` y una pantalla nunca decide cómo se ve un estado.

Dos presentaciones:

- **Estado en línea:** marca + texto en tinta. Para filas.
- **Sello:** tinte de fondo + borde sólido + barra lateral + marca + texto. Para el estado que resume
  un objeto entero (un control, un cierre, un error de carga). Uno por pantalla, como mucho dos.

Lo que no es noticia no lleva marca: una evidencia reciente dice solo su fecha; la marca aparece cuando
envejece. Una deuda («sin control asignado») es atención, no falla.

## 6. Componentes canon

`kit.html` dibuja cada uno con la misma hoja (`assets/hg.css`) que usan las pantallas.

| Componente | Qué es |
|---|---|
| Cabecera y navegación | Marca, cinco secciones (Tablero · Catálogo · Activos · Evidencia · Brecha) y los botones de tema e idioma. La sección actual lleva subrayado azul y negrita |
| Subnavegación | Las páginas de la sección, sobre una línea fina |
| Encabezado de página | Identificador en dato, título, frase de entrada; a la derecha, el sello o la ficha que la resume |
| Cifras | Línea de conteos con su estado bajo regla doble; no son tarjetas |
| Libro | Filas con cabecera, columna de folio y celdas. En teléfono, folio y descripción a todo el ancho y el resto de dos en dos, cada celda con su rótulo |
| Ficha | Pares rótulo–valor en renglones, bajo regla doble |
| Estado y sello | Los de la sección 5 |
| Dato y huella | Texto en la fuente de dato; la huella se abrevia a 8 + 4 caracteres |
| Firma | Marca de firma + «Confirmada» + fecha, en tinta azul |
| Texto destacado | La frase que no puede perderse: serifa, barra de tinta a la izquierda |
| Filtros | Botones de grupo para la faceta principal, listas para las demás, contador «se muestran N de M» y «Quitar filtros» solo cuando hay alguno |
| Botón | Borde de `--linea-fuerte`, sin relleno. Activo: borde y base azules, negrita |
| Cadena de cierre | Hallazgo → corrección → re-prueba → cierre; horizontal en escritorio, vertical en teléfono; lo pendiente en línea punteada |
| Aviso de pantalla | Vacío, carga y error con título propio y qué hacer. El error nombra cada falla |
| Libro de tres, cuatro o cinco columnas | El mismo libro con menos columnas (`hg-cols-3`, `hg-cols-4`); `hg-folio-ancho` cuando el identificador es largo. En teléfono siempre igual: folio y descripción arriba, el resto de dos en dos |
| Conmutador de objeto | Fila de enlaces con borde que dice cuál objeto está abierto (un activo). Va encima de la subnavegación, porque las páginas de debajo son de ese objeto. El abierto lleva base azul y negrita |
| Propuesta | Fila de bandeja: a la izquierda quién propone, qué y con qué fuente; a la derecha, tras una barra, los botones de decisión y la frase que dice qué pasa con cada una. Al decidir, la barra pasa a tinta azul (la mano humana) |
| Revelado | Contenido que abre el botón que lo precede (la plantilla para activos propios) |
| Pestañas | Grupo de botones que elige un panel de la misma pantalla (las tres vías de carga). Mismo aspecto que los botones de grupo |
| Formulario | Campos en una columna bajo regla doble: rótulo arriba, ayuda debajo, 44 px de alto mínimo. Un campo lleno lleva base azul. Bajo los campos, cuántos obligatorios faltan; el botón de guardar avisa si falta alguno en vez de estar deshabilitado |
| Lote | Fila de bandeja con su cabecera (archivo, adaptador, huellas, advertencias), su decisión a la derecha y, a todo el ancho, el libro de sus sobres |
| Matriz de prioridad | Tabla de impacto por frecuencia con el nivel en cada casilla (barras + texto) y la casilla del objeto en un marco de tinta. Una palabra de la tabla nunca se parte: en teléfono la tabla se reorganiza |
| Avisos de un objeto | Bajo el encabezado de una ficha, un sello por cada cosa que su lector debe saber antes de leerla (verificación vencida, toca revisarla, marcada para revisión). Del más grave al más leve; dice el umbral y qué hacer, no repite la cifra que ya está en la ficha. Un objeto sin nada que avisar no lleva sello |

**Los cinco estados de cada pantalla** (vacío, carga, error, con datos, sin resultados cuando hay
filtros) se diseñan; ninguno es un texto gris de relleno.

## 7. Movimiento

Casi ninguno, a propósito: un acta no se mueve.

- Solo transiciones de color y borde en controles, 150 ms, salida suave.
- Nada entra animado, nada se desplaza solo, las filas no se animan al filtrar.
- Todo movimiento vive dentro de `@media (prefers-reduced-motion: no-preference)`: con «reducir
  movimiento» no hay ninguno. En el producto, la forma del árbol jamás depende de esa preferencia.

## 8. Idioma

Español e inglés en todo. Cada texto nace como par `{ es, en }`, redactado en cada idioma. El conmutador
está en la cabecera. Identificadores, fechas, huellas y nombres propios no cambian con el idioma.

## 9. Contrato con el código

- Los tokens de color son variables CSS (`--fondo`, `--tinta`, `--positivo`…) con los mismos nombres en
  la maqueta y en el producto; el producto las expone a Tailwind con `@theme inline`.
- `scripts/paleta/` sigue siendo la fuente: cambiar un color es cambiar `tokens.mjs` y regenerar.
- El vocabulario de estados se carga como dato; ningún componente lleva un color de estado escrito.
- El primer sprint con UI añade: el barrido de tintas vetadas en `pnpm lint`, y la comparación de cada
  pantalla construida contra su página de la maqueta (gate de fidelidad).

## 10. Anti-patrones

Rejilla de tarjetas idénticas como respuesta a todo · gradientes · sombras · emojis como iconos · color
como única señal · verde y rojo como único contraste entre dos estados · texto sobre color saturado ·
esquinas redondeadas · un carácter especial donde debía ir un trazo · una cifra escrita a mano · una
animación de entrada.

## 11. Pendiente

Hoja de impresión del informe (mirada 5) · llevar al `kit.html` los componentes de las miradas 3 y 4
(conmutador de objeto, propuesta, revelado, pestañas, formulario, lote, matriz de prioridad): hoy solo se
ven en sus pantallas (se paga en la mirada 5).

## 12. Registro de cambios

- **0.4.0** — Mirada 4: pestañas, formulario, lote, matriz de prioridad de acción y cadena de cierre con
  sus variantes (riesgo aceptado, re-prueba por confirmar). Regla nueva: ninguna palabra se parte por la
  mitad; si no cabe, cambia la disposición.
- **0.3.0** — Mirada 3: libros de tres y cuatro columnas, conmutador de objeto, propuesta con sus botones
  de decisión, revelado y título menor.
- **0.2.1** — Avisos de un objeto (sellos bajo el encabezado de la ficha). Regla de maqueta: una pantalla
  de detalle muestra siempre el estado de su propio objeto.
- **0.2.0** — Dirección «acta» (elegida por el usuario en la mirada 1): Source Serif 4 en títulos, regla
  doble, esquinas rectas, secciones numeradas. Navegación, filtros, ficha, texto destacado, movimiento,
  idioma y contrato con el código.
- **0.1.0** — Propuesta de la mirada 1: color, tipografía, espacio, estados y primeros componentes.
