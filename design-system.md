---
version: 0.1.0
estado: propuesta de la mirada 1 (dirección) — no sellada hasta G-Diseño
---

# HackGuard — sistema de diseño

Fuente de verdad visual de la app. La maqueta de `docs/diseno/` lo demuestra; el producto lo obedece.
Se extiende por ADR, nunca se contradice en silencio. **Versión 0.1:** identidad, color, tipografía y
estados. Componentes completos, movimiento y navegación llegan en la mirada 2.

## 1. Personalidad

**Un libro de evidencia: papel, tinta y firma.**

- Es: **sobrio, forense, legible**.
- Jamás será: **estética «hacker»** (verde terminal, calaveras, neón), **tablero de alarmas**
  (todo rojo, todo urgente), **gris corporativo** (plantilla de cumplimiento sin carácter).

Tres ideas sostienen todo lo demás:

1. **Filas de libro mayor antes que tarjetas.** La evidencia se lee en renglones con una regla gruesa
   arriba y líneas finas entre asientos. El identificador tiene su propia columna, como un folio.
2. **La tinta azul es la mano humana.** El único acento de la app se reserva a lo que una persona
   confirma o acciona: firmas, enlaces, foco. La IA propone en gris; lo confirmado va en azul.
3. **Forma antes que color.** Cada estado se reconoce por su símbolo y su texto. El color acompaña.

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
  relleno saturado. Única excepción: la firma, en `--acento`.
- **Tintas vetadas como texto:** `--linea` y `--linea-fuerte`. Son para separar y bordear. El primer
  sprint con UI añade el barrido que lo hace fallar en `pnpm lint`.
- **El acento se gasta con avaricia.** Si algo es azul y no es una firma, un enlace o el foco, sobra.
- Umbrales medidos en ambos temas: tinta ≥ 7:1 sobre toda superficie y todo tinte; tinta secundaria y
  acento ≥ 4,5:1; marcas y bordes de control ≥ 3:1; los cinco papeles separados entre sí en visión normal
  (ΔE OKLab ≥ 0,10) y bajo protanopía, deuteranopía y tritanopía (≥ 0,05).

## 3. Tipografía

| Papel | Familia | Uso |
|---|---|---|
| Texto y títulos | **Atkinson Hyperlegible Next** (variable, 200–800) | Todo lo que se lee. Títulos en 700 |
| Dato | **Atkinson Hyperlegible Mono** (variable) | Identificadores, fechas, huellas, cifras técnicas |

Ambas son OFL y viven en el repo (`docs/diseno/assets/fuentes/`, subconjunto latino). Se eligieron
porque distinguen cada carácter del vecino (0/O, 1/l/I), que es justo lo que una huella o un
identificador necesitan, y porque no son la tipografía por defecto de nadie.

- **Mínimo de lectura: 15 px.** Escala: 15 · 16 · 18 · 22 · 28 (34 en escritorio).
- Cifras siempre tabulares. Fechas e identificadores no se parten por sus guiones.
- **Solo caracteres del subconjunto latino.** Flechas, vistos y símbolos se dibujan como trazos SVG
  (`tests/unit/maqueta-cobertura-de-fuente.test.ts`).

*Dirección alternativa «B · acta», en evaluación en la mirada 1:* títulos en Source Serif 4, regla
doble, esquinas rectas y secciones numeradas. Si no se elige, se retira del repo.

## 4. Espacio y forma

- Espaciado en pasos de 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72.
- Radio: 4 px. Sin sombras: la profundidad la dan las reglas y las superficies.
- Regla gruesa de 2 px en tinta para abrir un libro; línea de 1 px entre filas.
- Ancho máximo de página: 1120 px. A 380 px nada se desplaza en horizontal.
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
  un objeto entero (un control, un cierre). Uno por pantalla, como mucho dos.

Lo que no es noticia no lleva marca: una evidencia reciente dice solo su fecha; la marca aparece cuando
envejece.

## 6. Componentes canon (0.1)

| Componente | Qué es |
|---|---|
| Libro | Lista de filas con regla de cabecera, columna de folio y celdas rotuladas en teléfono |
| Cifras | Línea de conteos con su estado; no son tarjetas |
| Estado y sello | Los de la sección 5 |
| Dato y huella | Texto en la fuente de dato; la huella se abrevia a 8 + 4 caracteres |
| Firma | Marca de firma + «Confirmada» + fecha, en tinta azul |
| Cadena de cierre | Hallazgo → corrección → re-prueba → cierre; horizontal en escritorio, vertical en teléfono; lo pendiente en línea punteada |
| Aviso de pantalla | Vacío, carga y error con título propio y qué hacer |

## 7. Anti-patrones

Rejilla de tarjetas idénticas como respuesta a todo · gradientes · sombras · emojis como iconos · color
como única señal · verde y rojo como único contraste entre dos estados · texto sobre color saturado ·
esquinas muy redondeadas · un caracter especial donde debía ir un trazo · una cifra escrita a mano.

## 8. Pendiente para la versión 0.2 (mirada 2)

Navegación de la app · formularios y filtros · tablas densas · movimiento y su variante reducida ·
impresión · contrato con el código (variables CSS y configuración de Tailwind).
