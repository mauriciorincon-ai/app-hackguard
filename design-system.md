---
version: 1.0.0
estado: sellado en G-Diseño (2026-10-04) · dirección «consola» · miradas 1 a 6 aprobadas
---

# HackGuard — sistema de diseño

Fuente de verdad visual de la app. La maqueta de `docs/diseno/` lo demuestra; el producto lo obedece. Se
extiende por ADR, nunca se contradice en silencio.

La dirección «acta» de la mirada 1 (un documento: una columna, secciones numeradas, serifa y regla doble)
fue rechazada en la mirada 4: no era la interfaz de una aplicación. Este documento describe la que la
reemplazó. Su hoja es `docs/diseno/assets/app.css`.

## 1. Personalidad

**Una consola de evidencia: se trabaja en ella, no se lee como un informe.**

- Es: **sobria, densa, ordenada**.
- Jamás será: **estética «hacker»** (verde terminal, calaveras, neón), **tablero de alarmas**
  (todo rojo, todo urgente), **documento** (una columna de texto con secciones), **gris corporativo**
  (plantilla de cumplimiento sin carácter).

Cinco ideas sostienen todo lo demás:

1. **Es una aplicación.** Navegación fija a la izquierda, barra de contexto arriba y el contenido en
   paneles con borde. La pantalla ocupa el ancho; no hay columna centrada ni media pantalla vacía.
2. **Tabla densa antes que lista de fichas.** Lo que se repite va en filas de tabla; lo que se decide
   sobre una fila, a su derecha.
3. **A la derecha se actúa.** En las pantallas de detalle hay un carril con lo que una persona puede
   hacer y lo que falta para hacerlo (cuando hay algo que hacer) y las propiedades del objeto. La acción
   no se busca al final de la página. Las listas van a todo el ancho: sus tablas no caben junto a un
   carril.
4. **Lo que tiene ciclo de vida muestra su recorrido.** Un lote y un hallazgo dicen en qué paso van, qué
   ya se hizo y qué falta, antes que cualquier otro dato.
5. **La tinta azul es la mano humana, y la forma va antes que el color.** El único acento se reserva a
   lo que una persona firma, elige o acciona; la IA propone en gris. Cada estado se reconoce por su
   símbolo y su texto; el color acompaña.

## 2. Color

Los tokens **se generan**: la fuente es `scripts/paleta/tokens.mjs` (OKLCH) y `pnpm tokens` produce
`docs/diseno/assets/tokens.css` y `tokens.json`. `tests/unit/paleta.test.ts` mide contraste y separación
bajo daltonismo; `tests/unit/design-system.test.ts` exige que esta tabla diga lo mismo que los tokens.

Neutros cálidos (grafito en oscuro, papel en claro), un acento y cuatro papeles de estado. El tema por
defecto es el oscuro; el claro se diseña y se mira con el mismo cuidado.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fondo` | `#12100e` | `#f6f3eb` | Fondo de la aplicación |
| `--superficie` | `#1b1916` | `#fefcf9` | Paneles, tarjetas y barra lateral |
| `--superficie-2` | `#25221f` | `#ede9e0` | Cabecera de tabla, fila seleccionada, hover, esqueletos |
| `--linea` | `#3a3833` | `#d4d1c8` | Separador entre filas — **vetada como texto** |
| `--linea-fuerte` | `#78746e` | `#7e7a71` | Borde de controles y reglas de cabecera — **vetada como texto** |
| `--tinta` | `#ece9e4` | `#1f1c18` | Texto principal |
| `--tinta-2` | `#bbb7af` | `#544f48` | Texto secundario, rótulos, datos |
| `--acento` | `#89b1fa` | `#1b419f` | La tinta azul: enlaces, foco, firma de una persona |
| `--acento-tinte` | `#1c2a43` | `#dae7fe` | Fondo de lo firmado, elegido o seleccionado |
| `--positivo` | `#5acdc4` | `#017273` | Marca y borde de lo que está bien |
| `--positivo-tinte` | `#0b2e2b` | `#c9efeb` | Fondo del chip y del sello positivos |
| `--atencion` | `#efc558` | `#a77b0f` | Marca y borde de lo que pide atención |
| `--atencion-tinte` | `#352a0e` | `#f9eecd` | Fondo del chip y del sello de atención |
| `--falla` | `#f7755a` | `#a9170a` | Marca y borde de lo que falló o venció |
| `--falla-tinte` | `#431e16` | `#ffe0da` | Fondo del chip y del sello de falla |
| `--neutro` | `#a29e96` | `#848078` | Marca de lo ausente o no aplicable |
| `--neutro-tinte` | `#25221f` | `#ede9e0` | Fondo del chip y del sello neutros |

**Reglas de color**

- **El texto va siempre en tinta** (`--tinta`, `--tinta-2`), nunca en el color de un estado. Excepciones:
  la firma y los enlaces, en `--acento`; y el botón primario, que es el único relleno de acento y lleva
  el texto en `--fondo`.
- **Tintas vetadas como texto:** `--linea` y `--linea-fuerte`. Son para separar y bordear. El primer
  sprint con UI añade el barrido que lo hace fallar en `pnpm lint`.
- **El acento se gasta con avaricia.** Si algo es azul y no es una firma, un enlace, el foco, la acción
  principal o lo que una persona eligió (página abierta, pestaña, fila, filtro, campo lleno), sobra.
- **Al imprimir, el papel es claro:** `tokens.css` aplica la paleta del tema claro en los dos temas
  dentro de `@media print` (tinta clara sobre papel blanco no se leería). Lo vigila el e2e de la hoja de
  impresión.
- Umbrales medidos en ambos temas: tinta ≥ 7:1 sobre toda superficie y todo tinte; tinta secundaria y
  acento ≥ 4,5:1; marcas y bordes de control ≥ 3:1; los cinco papeles separados entre sí en visión normal
  (ΔE OKLab ≥ 0,10) y bajo protanopía, deuteranopía y tritanopía (≥ 0,05).

## 3. Tipografía

| Papel | Familia | Uso |
|---|---|---|
| Texto y títulos | **Atkinson Hyperlegible Next** (variable) | Todo lo que se lee. Títulos en peso 700 |
| Dato | **Atkinson Hyperlegible Mono** (variable) | Identificadores, fechas, huellas, selectores, versiones |

Las dos son OFL y viven en el repo (`docs/diseno/assets/fuentes/`, subconjunto latino). Atkinson
distingue cada carácter del vecino (0/O, 1/l/I), que es lo que una huella o un identificador necesitan.
La serifa de la dirección anterior (Source Serif 4) se retiró con su hoja.

- **Escala:** 12 (rótulos) · 13 (datos y texto secundario) · **14 (texto de interfaz)** · 16 (título de
  panel destacado) · 22 (título de página y cifras).
- **Rótulos** de tarjeta, de columna y de propiedad: 12 px, peso 600, en `--tinta-2`; los de tarjeta y
  de columna, en versalitas con espaciado.
- Cifras siempre tabulares. Fechas, identificadores y huellas no se parten por dentro.
- **Ninguna palabra se parte por la mitad**: si no cabe, cambia la disposición (la tabla pasa a
  tarjetas, la rejilla pierde una columna).
- **Solo caracteres del subconjunto latino.** Flechas, vistos y símbolos se dibujan como trazos SVG
  (`tests/unit/maqueta-cobertura-de-fuente.test.ts`).

## 4. Espacio y forma

- Espaciado en pasos de 4: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- **Radio de 6 px** en paneles, tarjetas, botones y campos; 4 px en chips; píldora solo en los filtros y
  las cuentas. Sin sombras: la profundidad la dan el borde de 1 px y las dos superficies.
- **Barra lateral de 224 px** y **carril de acción de 304 px**; el contenido ocupa el resto, sin ancho
  máximo.
- Tres anchos: bajo 860 px las tablas pasan a tarjetas; bajo 1100 px la navegación baja a una barra fija
  al pie y las páginas de la sección van como pestañas; desde 1240 px el carril va a la derecha (antes,
  debajo del contenido).
- A 380 px nada se desplaza en horizontal y nada se sale de su columna; en escritorio tampoco. Ningún
  panel, tarjeta ni caja deja salir su contenido por el borde (una tabla que no cabe junto al carril se
  monta encima de él sin salirse de la ventana: la sonda de desbordes lo mide).
- Objetivo táctil: 36 px con ratón, 44 px bajo 1100 px.

## 5. Estados: símbolo + texto + color

Una forma por papel, para que se aprenda sin color:

| Papel | Forma | Token |
|---|---|---|
| Bien | Círculo relleno con visto | `--positivo` |
| Atención | Triángulo con admiración; reloj para lo que espera; medio círculo para lo parcial | `--atencion` |
| Falla | Cuadrado relleno con aspa | `--falla` |
| Ausente | Círculo punteado; círculo con raya para «no aplica» | `--neutro` |
| Mano humana | Trazo de firma | `--acento` |
| Severidad | Cuatro barras ascendentes, rellenas según el nivel | el papel del nivel |

El vocabulario completo (veredicto, vigencia, estado de control, severidad, confirmación, ciclo de un
activo y de un hallazgo) es **dato**: vive en `scripts/maqueta/nucleo/estados.mjs` y una pantalla nunca
decide cómo se ve un estado.

Tres presentaciones, de menos a más peso:

- **Estado en línea:** marca + texto en tinta. Para lo que no es noticia (una prueba vigente), para las
  casillas de una matriz y para las cifras.
- **Chip:** marca + texto sobre el tinte del papel, con su borde. Para el estado que decide algo en una
  fila o en una cabecera: un veredicto, el estado de un hallazgo, una vigencia que ya no es vigente.
- **Sello:** franja con tinte, borde, marca, título y qué hacer. Para lo que el lector debe saber antes
  de seguir (plazo vencido, error de carga, advertencia de un lote). Uno por pantalla, como mucho dos.

Lo que no es noticia no lleva chip. Una deuda («sin control asignado») es atención, no falla.

## 6. Componentes canon

| Componente | Qué es |
|---|---|
| Armazón | Barra lateral (marca, que lleva al tablero; cinco secciones con icono y cuenta; la sección abierta despliega sus páginas; al pie, la instantánea del catálogo y la fecha de consulta) + barra de contexto (ruta y botones de tema e idioma) + contenido. En teléfono: barra fija al pie con las cinco secciones y pestañas con las páginas de la sección |
| Cabecera de página | Título, una frase y una línea de datos; a la derecha, la tira de cifras. En un objeto: identificador y chips de estado sobre el título |
| Tira de cifras | Cuatro celdas pegadas con su cifra y su estado. No son tarjetas sueltas |
| Panel | Superficie con borde: cabecera (título y nota o chip), cuerpo y pie opcional |
| Tabla | Cabecera en versalitas sobre superficie hundida, filas compactas con línea fina, la fila bajo el cursor resaltada. El nombre de la fila abre su objeto. Bajo 860 px cada fila es una tarjeta: identificador y estado arriba, el resto debajo |
| Fila seleccionable | El identificador de la fila es un botón; la fila elegida lleva fondo y barra de tinta azul, y el carril muestra su detalle |
| Herramientas de tabla | Píldoras para la faceta principal, listas para las demás, contador «se muestran N de M» y «Quitar filtros» solo cuando hay alguno |
| Carril de acción | Columna derecha de las pantallas de detalle. Arriba, la tarjeta de acción (filo de tinta azul): qué falta, los botones y, al decidir, qué ocurre. Debajo, tarjetas de detalle y de propiedades |
| Recorrido | Pasos de algo que tiene ciclo de vida, unidos por una línea: sólida y del color del paso si está hecho, punteada si falta. Horizontal en un panel ancho; vertical en teléfono y dentro del carril |
| Propiedades | Pares de rótulo arriba y valor abajo. En el carril, uno bajo otro con línea fina; en un panel ancho, en dos o tres columnas |
| Pestañas | Eligen un panel de la misma pantalla (las vías de carga) o agrupan de otra manera la misma cuenta dentro de un panel (cobertura por activo, familia o control); subrayado azul en la abierta |
| Selector de objeto | Tarjetas pequeñas con identificador y estado que dicen cuál objeto de una serie está abierto (un lote, un hallazgo) |
| Botón | Con borde, sobre superficie. **Primario**: relleno de tinta azul, uno por tarjeta de acción. **Discreto**: sin fondo, para ajustes. Lo elegido lleva borde y tinte azules, y además una barra inferior y más peso: se reconoce sin color |
| Formulario | Campos en una o dos columnas dentro de un panel: rótulo arriba, ayuda debajo. Un campo lleno lleva base azul. El contador de obligatorios y el botón de guardar van en la tarjeta de acción; el botón avisa si falta alguno en vez de estar deshabilitado |
| Chip, estado y sello | Los de la sección 5 |
| Dato y huella | Texto en la fuente de dato; la huella se abrevia a 8 + 4 caracteres |
| Firma | Marca de firma + «Confirmada» + fecha, en tinta azul |
| Barra de proporción | Parte sobre total, bajo su cifra. En el color de la falla cuando cuenta fallas (fallas sobre repeticiones); **en tinta cuando mide avance** (ejecutadas de las planeadas): cuánto se ejecutó no es un veredicto |
| Desglose | Los estados de un grupo en una línea que se parte, cada uno con su forma y su cifra («3 superadas · 3 fallidas · 4 sin ejecutar»; en la vigencia por familia, «4 vigentes · 1 vencida»); los ceros no se dibujan |
| Cuentas | Lista de rótulos con su forma y su cifra a la derecha, una por línea (hallazgos por severidad, controles por estado, catálogo por vigencia) |
| Banda de validación | Sello al pie de la cabecera del tablero que dice si el instrumento pasó su validación (C18), con un botón que revela las comprobaciones. En rojo, nada se publica y el tablero no muestra cifras |
| Tablero | Dos columnas desde 1240 px: a la izquierda lo que pide acción (una tabla «objeto · qué pasa · tipo», lo más urgente primero) y los activos; a la derecha, del ancho del carril, las cuentas |
| Informe | Un documento dentro de la aplicación: un panel con cabecera de informe (rótulo, título, fecha, instantánea y huella) y secciones numeradas separadas por una línea. Carril con la acción de imprimir y el índice |
| Hoja de impresión | Al imprimir sale solo el contenido: sin navegación, sin sala y sin carril; papel claro; las tablas como tablas (aunque la hoja sea más estrecha que el corte de las tarjetas), cabeceras de columna en minúscula; el resumen del informe en su propia hoja |
| Matriz de prioridad | Tabla de impacto por frecuencia con el nivel en cada casilla (barras + texto) y la casilla del objeto en un marco de tinta. En teléfono la tabla se reorganiza y las anclas bajan a una leyenda |
| Contraste | Dos cajas enfrentadas: lo que se esperaba y lo que se obtuvo; dueño y proveedor; lo que se puede probar y lo que no |
| Rejilla de cajas | Varias piezas iguales dentro de un panel (una por herramienta del paquete de ejecución, un aviso por marco) |
| Propuesta | Un panel por propuesta de la bandeja: quién propone, qué y su fuente arriba; al pie, sobre superficie hundida, los botones de decisión y qué ocurre con cada uno. Decidida, el pie lleva la barra de tinta azul. Sin botón primario: hay varias a la vista |
| Texto destacado | La frase que no puede perderse (el resultado esperado de una prueba): 16 px, peso 600, barra a la izquierda en `--linea-fuerte` |
| Vocabulario | Los estados de cada familia en columnas, cada uno en línea (en el kit) |
| Estado de pantalla | Vacío, carga y error: caja centrada con marca, título y qué hacer. El error nombra cada falla en un sello |

**Los cinco estados de cada pantalla** (vacío, carga, error, con datos, sin resultados cuando hay
filtros) se diseñan; ninguno es un texto gris de relleno.

## 7. Movimiento

Casi ninguno, a propósito: es una herramienta de trabajo.

- Solo transiciones de color, fondo y borde en controles y enlaces de navegación, 150 ms, salida suave.
- Nada entra animado, nada se desplaza solo, las filas no se animan al filtrar.
- Todo movimiento vive dentro de `@media (prefers-reduced-motion: no-preference)`: con «reducir
  movimiento» no hay ninguno. En el producto, la forma del árbol jamás depende de esa preferencia.

## 8. Idioma

Español e inglés en todo. Cada texto nace como par `{ es, en }`, redactado en cada idioma. El conmutador
está en la barra de contexto. Identificadores, fechas, huellas y nombres propios no cambian con el idioma.

## 9. Contrato con el código

- Los tokens de color son variables CSS (`--fondo`, `--tinta`, `--positivo`…) con los mismos nombres en
  la maqueta y en el producto; el producto las expone a Tailwind con `@theme inline`.
- `scripts/paleta/` sigue siendo la fuente: cambiar un color es cambiar `tokens.mjs` y regenerar.
- El vocabulario de estados se carga como dato; ningún componente lleva un color de estado escrito.
- **Una cuenta, un cálculo.** Lo que varias pantallas muestran (la cobertura, el estado de un control, los
  vencidos) sale de un solo cálculo, y dice lo mismo en cada pantalla y en cada fecha. En la maqueta lo
  vigilan `maqueta-brecha` y la matriz de envejecimiento.
- El primer sprint con UI añade: el barrido de tintas vetadas en `pnpm lint`, y la comparación de cada
  pantalla construida contra su página de la maqueta (gate de fidelidad).

## 10. Anti-patrones

Una columna de texto centrada con media pantalla vacía · secciones numeradas fuera del informe · listas
de rótulo y valor a todo el ancho · la acción al final de la página · rejilla de tarjetas idénticas como
respuesta a todo · gradientes · sombras · emojis como iconos · color como única señal · verde y rojo como
único contraste entre dos estados · un chip en cada fila cuando nada es noticia · más de un botón
primario a la vista · un carácter especial donde debía ir un trazo · una cifra escrita a mano · una
animación de entrada.

## 11. Después del sello

Sellado en G-Diseño el 2026-10-04: desde aquí se extiende por ADR y la maqueta es la referencia de
fidelidad. Queda para el producto:

- El primer sprint con UI añade el barrido de tintas vetadas y el gate de fidelidad (§ 9), y se detiene
  tras su primera pantalla para compararla con su página de la maqueta.
- El texto en los dos idiomas está «maquetado, no visto»: su veredicto es del gate del MVP.
- El bundle `design-sync/` deriva de este documento y de la maqueta (`scripts/design-sync/generar.mjs`;
  `tests/unit/design-sync.test.ts` exige los mismos bytes). Todo sprint que toque UI lo regenera en su
  PR; se publica en Claude Design después del gate ⭐⭐ del ciclo, cuando el usuario invoque
  `/design-sync`.

## 12. Registro de cambios

- **1.0.0** — Sellado en G-Diseño (mirada 6, 2026-10-04), sin cambios de forma desde 0.8.0. Nace el
  bundle `design-sync/`: una tarjeta por panel del kit, generada con la misma hoja que las pantallas.
- **0.8.0** — Cierre de la etapa (fase 2 de la auditoría): lo elegido lleva además barra inferior y más
  peso (se reconoce sin color); el desglose sirve también para la vigencia por familia; la escala de
  prioridad de IA declara su piso y su techo en datos; un solo nombre para «Toca revisar».
- **0.7.0** — Mirada 5: tablero, brecha, vista por control (lista y una página por control), informe y la
  portada del recorrido. Componentes nuevos: desglose, cuentas, barra de avance en tinta, banda de
  validación, tablero de dos columnas, informe y hoja de impresión (con la paleta clara al imprimir).
  Pestañas también dentro de un panel. Regla nueva: una cuenta, un cálculo. El logo lleva al tablero;
  la franja de sala vuelve al recorrido. Se retira la página `direccion`.
- **0.6.0** — Mirada 4-ter, tramo 2: todas las pantallas con la dirección «consola» (fichas de prueba,
  marcos, controles, propuestas, activo, plan, kit, vista por control e índice). Componentes nuevos:
  propuesta, rejilla de cajas, texto destacado, vocabulario; el kit dibuja ya todos los de § 6. Las
  listas van a todo el ancho; las cabeceras de tabla pueden partirse entre palabras. Se retiran
  `hg.css`, la serifa y las tres páginas de exploración.
- **0.5.0** — Dirección «consola» (elegida en la mirada 4-bis: la A, con el recorrido y el carril de la
  B). Armazón de aplicación, tabla, carril de acción, recorrido, chip, propiedades, selector de objeto,
  botón primario, tarjetas en teléfono. Se retiran: serifa, regla doble, secciones numeradas, libro de
  filas y ficha a todo el ancho. Primer tramo: catálogo, hallazgo y carga de evidencia.
- **0.4.0** — Mirada 4: pestañas, formulario, lote, matriz de prioridad de acción y cadena de cierre con
  sus variantes (riesgo aceptado, re-prueba por confirmar). Regla nueva: ninguna palabra se parte por la
  mitad; si no cabe, cambia la disposición.
- **0.3.0** — Mirada 3: libros de tres y cuatro columnas, conmutador de objeto, propuesta con sus botones
  de decisión, revelado y título menor.
- **0.2.1** — Avisos de un objeto (sellos bajo el encabezado de la ficha). Regla de maqueta: una pantalla
  de detalle muestra siempre el estado de su propio objeto.
- **0.2.0** — Dirección «acta» (elegida por el usuario en la mirada 1; rechazada en la 4): Source Serif 4
  en títulos, regla doble, esquinas rectas, secciones numeradas.
- **0.1.0** — Propuesta de la mirada 1: color, tipografía, espacio, estados y primeros componentes.
