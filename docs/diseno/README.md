# Etapa de Diseño de HackGuard — maqueta y registro de G-Diseño

Fundación visual del H1 (entregas E1 a E4), **anterior a cualquier código de producto**. Orden:
`portafolio/hackguard/ordenes/DISENO-orden.md` de la planeadora. Rama `diseno/fundacion`.

## Cómo abrir la maqueta

- **Donde se aprueba:** el preview del PR de la etapa, con sesión de Vercel, entrando por `/diseno`.
- **En local, servida:** `pnpm build && pnpm start` y abrir `/diseno` en el puerto 3000.
- **Doble clic** sobre `docs/diseno/index.html` también abre, pero no es la prueba: en las dos apps
  hermanas la maqueta funcionaba como archivo y fallaba servida.

Arriba a la derecha de cada página: conmutador de **tema** (oscuro por defecto) y de **idioma** (ES/EN).
Al pie de cada página: la matriz «Qué revisar y qué deberías ver». Sobre la aplicación, la franja de
**sala de diseño** (línea discontinua) con la nota de la mirada y los estados de la pantalla: no es producto.

## Qué vive aquí

| Ruta | Qué es | Quién la escribe |
|---|---|---|
| `*.html` | Páginas de la maqueta | **Salida** de `scripts/maqueta/` (`pnpm maqueta`). No se editan a mano: el gate de deriva lo impide |
| `assets/tokens.css`, `assets/tokens.json` | Tokens de color en ambos temas, y la paleta clara para imprimir | **Salida** de `scripts/paleta/` (`pnpm tokens`) |
| `assets/app.css` | Hoja del sistema de diseño, dirección «consola»: lo que el producto obedecerá | A mano |
| `assets/maqueta.css`, `assets/maqueta.js` | Hoja y controlador de **sala**: lo que no es producto (nota de la mirada, botoneras, matriz del pie) | A mano |
| `assets/fuentes/` | Tipografías OFL, subconjunto latino, con su licencia | Copiadas de `@fontsource-variable` 5.3.0 |
| `README.md` | Este registro | A mano; no se publica (la copia al build excluye los `.md`) |

La maqueta es **autocontenida**: cero red, cero scripts en línea (la política de contenido de `/diseno/`
solo admite `'self'`). Los datos son **sintéticos** y están al nivel de la regla dura 3: qué se verifica,
con qué herramienta y qué se espera; ninguna carga ni procedimiento. Versiones de marcos y resúmenes del
Anexo A son **ilustrativos**: la versión real de cada marco se fija en la fase 0 del S1 (DA-01).

Las cifras se **calculan**: la fecha de consulta es una entrada del generador
(`scripts/maqueta/datos/consulta.json`, o `MAQUETA_FECHA`), nunca el reloj.

Lighthouse no mide la maqueta (`lighthouse-urls.json` sigue en `["/"]`); la miden los e2e
(`tests/e2e/maqueta-servida.spec.ts`) y el arnés de capturas (`pnpm capturas:maqueta`).

## Decisiones de diseño que la orden no escribió

Aprobadas con el plan de la etapa (2026-10-03):

1. **Miradas incrementales.** «Propuesta completa» se entiende por artefacto, no las 13 pantallas antes
   de la primera mirada.
2. **Un solo PR vivo** hasta G-Diseño; cada ronda es un push y se mira en su preview.
3. **Entrega de la maqueta:** copia `docs/diseno/` → `public/diseno/` en el `build` (derivado, ignorado),
   con `vercel.json` y `serve.json` equivalentes. Solo en despliegues protegidos. Que el paquete público
   del H2 jamás la incluya es un gate a construir en el S4.
4. **Nombres de página:** `index` · `direccion` · `kit` · `tablero` · `catalogo` · `prueba-<id>` (una
   por prueba del catálogo) · `marcos` · `controles` · `propuestas` · `activo-<id>` y `plan-<id>` (una
   por activo demo) · `evidencia` · `hallazgo-<id>` (una por hallazgo) · `brecha` · `control` · `informe`.
5. **C18 (validación del instrumento)** no tiene pantalla propia: banda de estado en `tablero` y ficha
   de reproducibilidad en `informe`.
6. **Toda marca de estado es un trazo SVG**, nunca un carácter de una fuente.
7. **Tema por defecto: oscuro.** El claro se diseña y se mira con el mismo cuidado.
9. **Navegación:** cinco secciones (Tablero · Catálogo · Activos · Evidencia · Brecha) y, dentro de cada
   una, sus páginas. Una página que la maqueta aún no tiene se dibuja como texto, no como enlace roto.
10. **Cada fila del catálogo abre la ficha de SU prueba** (`prueba-<id>.html`, una página por prueba;
    21 hoy). Reemplaza la decisión anterior —todas las filas abrían la ficha de `PR-IA-PINJ-001`—, que
    el usuario encontró rota en la mirada 2: una prueba vencida se leía «Vigente» al abrirla. Una
    pantalla de detalle de la maqueta jamás muestra el estado de otro objeto.
11. **Una página por activo, y su plan con él** (`activo-<id>.html`, `plan-<id>.html`; tres activos demo
    ficticios que cubren las cuatro familias). Arriba, un conmutador dice qué activo está abierto; debajo,
    «Activo» y «Plan» son de ese activo. El tercero no tiene alcance ni reglas: muestra «sin autorización
    no hay plan» en las dos páginas. El plan lo calcula el generador desde el perfil y el catálogo
    (aritmética de maqueta, no el planificador del producto); la fórmula de prioridad es ilustrativa.
12. **Los botones de la bandeja de propuestas funcionan pero no guardan nada**: marcan la decisión, dicen
    su consecuencia y descuentan la cifra «por decidir». Pulsar otra vez la misma decisión la deshace.
13. **Una página por hallazgo** (`hallazgo-<id>.html`; cuatro, uno por momento del ciclo: abierto y
    vencido, corregido con re-prueba por confirmar, aceptado con riesgo y cerrado por re-prueba), con el
    mismo conmutador de objeto que los activos.
14. **La carga de evidencia muestra un solo activo** (el asistente demo) con dos lotes por confirmar; las
    tres vías son pestañas de la misma pantalla. Los campos y botones funcionan, pero no guardan nada.
15. **Mirada 4-bis: tres direcciones de interfaz sobre la misma pantalla** (`interfaz-a` «Consola»:
    barra lateral, tabla densa e inspector; `interfaz-b` «Expediente»: barra lateral, el lote como un
    caso con su recorrido y un carril «para confirmar»; `interfaz-c` «Tablero»: navegación superior,
    cifras grandes y los lotes lado a lado). Comparten datos, paleta y vocabulario de estados; difieren
    en navegación, disposición, densidad y componentes. Viven en `assets/interfaz.css`, aparte de la hoja
    del sistema: la elegida pasó a `app.css` y a `design-system.md`; las tres páginas y su hoja se
    retiraron en la 4-ter (tramo 2).
8. **Dirección «acta»** (mirada 1; **rechazada en la mirada 4**): títulos en Source Serif 4, texto en
   Atkinson Hyperlegible Next, datos en Atkinson Hyperlegible Mono; regla doble, esquinas rectas y
   secciones numeradas. La reemplaza la decisión 16.
16. **Dirección «consola»** (mirada 4-bis): la A, con dos piezas de la B — el **recorrido de pasos** para
    lo que tiene ciclo de vida (lotes y hallazgos) y el **carril de acción** a la derecha en las pantallas
    de detalle. Barra lateral con las secciones y sus páginas, barra de contexto, tablas densas, paneles
    con borde, chips de estado, radio de 6 px, texto de 14 px, sin serifa. En teléfono: barra fija al pie
    y tablas como tarjetas. Se conservan la paleta, el vocabulario de estados y el contenido aprobado.
17. **La mirada 4-ter se hace en dos tramos.** Primero el sistema y tres pantallas tipo — una lista
    (`catalogo`), un detalle (`hallazgo-<id>`) y un formulario (`evidencia`) — y, con su aprobación, el
    resto. Mientras duró el tramo 1 convivieron dos hojas; desde el tramo 2 queda solo `app.css`.
19. **Las listas van a todo el ancho; el carril es de las pantallas de detalle.** El plan se diseñó al
    principio con carril y su tabla de pruebas no cabía: se montaba encima del carril sin salirse de la
    ventana. La sonda de desbordes mide ahora que ningún panel deje salir su contenido.
20. **La página `direccion`** (mirada 1) se conserva rehecha como adelanto de la vista por control; la
    página `control` de la mirada 5 la reemplaza.
18. **En la carga de evidencia cada sobre se puede seleccionar**: el identificador de la fila es un botón
    y el carril muestra su regla, sus huellas y su hallazgo. La ficha del lote va bajo la tabla.
21. **La brecha es una sola, de todos los activos**, con la cobertura agrupada por activo, por familia y
    por control en pestañas; no hay una página de brecha por activo. La tabla «esperado contra obtenido»
    se filtra por activo y por veredicto. Lo que espera confirmación se nombra en su fila, pero no mueve
    ninguna cifra. El tablero, la brecha, la vista por control y el informe salen de un mismo cálculo
    (`scripts/maqueta/nucleo/brecha.mjs`).
22. **Cuatro sobres confirmados más en el mundo sintético** (`SOB-0003`, `SOB-0016`, `SOB-0022`,
    `SOB-0023`), para que la brecha y la vista por control muestren lo que tienen que mostrar: un control
    en cada uno de los cuatro estados y, en la misma corrida de ZAP, una regla «no detectada» (sin
    constancia de que corrió: no ejecutada) junto a otra «verificada» (superada).
23. **La vista por control es una lista y una página por control aplicable** (`control-<id>.html`, cinco,
    con el selector de objeto). La página `direccion` de la mirada 1 se retira, como anunció la decisión
    20: lo que se aprobó en ella vive en la página del control con fallas. En la página de un control, el
    hallazgo abierto va junto a su resultado: con el carril, cinco columnas no cabían.
24. **El informe es global e imprimible.** Las ocho secciones de § 12, la validación del instrumento en la
    ficha de reproducibilidad y su propia huella. Al imprimir sale solo el informe, en papel claro aunque
    la pantalla esté en oscuro, con las tablas como tablas y el resumen en su propia hoja.
25. **El tablero es la portada de la aplicación**: el logo lleva a él. El índice (`index.html`) es la
    portada de la sala: las trece pantallas en el orden de la orden de diseño, con el estado de su mirada;
    la franja de sala de cada pantalla trae de vuelta con «Recorrido».
26. **La validación del instrumento (C18) es una banda en el tablero**, con sus comprobaciones a la vista,
    y su rojo es el estado de error del tablero y del informe. Las semillas son ilustrativas
    (`scripts/maqueta/datos/validacion.mjs`; las dos cifras de CVSS son las del spike) y nacen de verdad
    en el S1.

## Plan de miradas

> **Cambio de plan del 2026-10-04 (pedido por el usuario en la mirada 4):** la dirección «acta» de la
> mirada 1 resolvió tipografía y color, pero no la interfaz; las dos opciones mostradas diferían solo en
> la letra. Se insertan dos miradas antes de la 5: **4-bis** (elegir la dirección de interfaz viendo la
> misma pantalla en tres estructuras distintas) y **4-ter** (rehacer con ella lo ya construido). Lo que
> se conserva de lo aprobado: el contenido y los estados de cada pantalla, el vocabulario de estados
> (símbolo + texto + color), la paleta validada y todos los gates.

> **Cambio de plan del 2026-10-04 (propuesto por el constructor, aprobado por el usuario: «Pues
> iniciemos con el primer tramo»):** la mirada 4-ter pasa a tener **dos paradas**. Tramo 1: el sistema y
> tres pantallas tipo (lista, detalle, formulario). Tramo 2: el resto de lo construido. Así, si la
> interfaz no convence, se corrige sobre tres pantallas y no sobre cuarenta.

Todas son de **forma** y abren parada. El **texto** (copy en ambos idiomas) queda «maquetado, no visto»
y su veredicto viaja al gate del MVP. Cambiar número, agrupación u orden exige aprobación previa.

| # | Artefacto | Estado |
|---|---|---|
| 0 | Fase 0: el preview del PR abre la maqueta provisional | **abre** (2026-10-03) |
| 1 | `direccion.html` — corte real de la vista por control, dirección recomendada + alternativa | **aprobada: dirección B «acta»** (2026-10-04, ronda 1) |
| 2 | `design-system.md` + `kit.html` + `catalogo` + `prueba-<id>` | **aprobada** (2026-10-04, ronda 2) |
| 3 | `marcos` · `controles` · `propuestas` · `activo-<id>` · `plan-<id>` | **aprobada** (2026-10-04, ronda 1) |
| 4 | `evidencia` · `hallazgo-<id>` | **función aprobada, diseño rechazado** (2026-10-04, ronda 1): reabre la dirección visual |
| 4-bis | `interfaz-a` · `interfaz-b` · `interfaz-c` — la misma pantalla (carga de evidencia) en tres direcciones de INTERFAZ: estructura, navegación, densidad y componentes, no solo tipografía | **elegida: A «Consola» con el recorrido y el carril de B** (2026-10-04, ronda 1) — elegida sobre la recomendación; **sin evidencia de que el usuario abriera las tres** (ver registro) |
| 4-ter · tramo 1 | `design-system.md` 0.5.0 + `assets/app.css` + `catalogo` · `hallazgo-<id>` · `evidencia` con la dirección «consola» | **aprobada** (2026-10-04, ronda 1) — con ella queda vista y confirmada la dirección de la 4-bis |
| 4-ter · tramo 2 | `prueba-<id>` · `marcos` · `controles` · `propuestas` · `activo-<id>` · `plan-<id>` · `kit` · `direccion` · `index` con la misma dirección; se retiran `hg.css`, `interfaz.css` e `interfaz-a/b/c` | **aprobada** (2026-10-04, ronda 1) |
| 5 | `brecha` · `control` (lista y una página por control) · `informe` · `tablero` · `index` | **en mirada** (ronda 1, 2026-10-04) |
| 6 | G-Diseño: recorrido completo en el preview, teléfono y escritorio | pendiente |

## Registro de miradas

Una fila por mirada, **antes** de construir encima. «Continúa» no es una mirada.

| Fecha | Artefacto | Dónde se miró | Veredicto del usuario (textual) | Qué se construyó encima |
|---|---|---|---|---|
| 2026-10-03 | `index.html` provisional (fase 0, tubería) | preview del PR #4, escritorio, tema oscuro | Captura de pantalla del preview con la página con estilos, las tres filas de vigencia y el estado «Cargando» activo con su mensaje; texto: «Esto aparece que se supone que debo hacer». No pidió ajustes. Antes había respondido «continúa» sin comentar la página y se le repreguntó | Fase 1: dirección |
| 2026-10-04 | `direccion.html` (mirada 1, ronda 1): dirección A «libro» recomendada y B «acta» conmutable | preview del PR #4 | «Me voy con B» — **dirección elegida: B «acta»** (títulos con serifa Source Serif 4, regla doble, esquinas rectas, secciones numeradas). Eligió la alternativa, no la recomendada; sin más ajustes | Consolidación de B como única dirección (la A y el conmutador se retiran) y fase 2: sistema completo, kit, catálogo y ficha de prueba |
| 2026-10-04 | `catalogo` y ficha de prueba (mirada 2, ronda 1) | preview del PR #4, escritorio, tema oscuro | Captura de la ficha de `PR-IA-PINJ-001` («Vigente · verificada hace 12 días») abierta desde una fila filtrada por «Vencido»; texto: «Esto muestra en el que esta vencido». **Ajuste pedido:** la ficha debe ser la de la prueba que se abrió. Antes preguntó «Que falta de mi» (se le respondió con los enlaces directos). Mirada 2 aún sin veredicto | Ronda 2 (segunda vuelta, sin parada propia): una ficha por prueba con su vigencia, su regla de veredicto y sus avisos (por revisar · vencida · marcada para revisión · sin control); gate «cada fila abre su ficha» |
| 2026-10-04 | `catalogo`, fichas de prueba y `kit.html` (mirada 2, ronda 2) | preview del PR #4 | «Los abri y los apruebo» — **mirada 2 aprobada**, sin más ajustes. El texto en ambos idiomas sigue «maquetado, no visto» | Fase 3: marcos, controles, propuestas, activo y plan |
| 2026-10-04 | `marcos`, `controles`, `propuestas`, `activo-<id>` y `plan-<id>` (mirada 3, ronda 1) | preview del PR #4 | «Lo abri y lo apruebo» — **mirada 3 aprobada**, sin ajustes. El texto en ambos idiomas sigue «maquetado, no visto» | Fase 4: carga de evidencia y hallazgo |
| 2026-10-04 | `evidencia` y `hallazgo-<id>` (mirada 4, ronda 1) | preview del PR #4 | «a nivel funcional considero que está bien el diseño de la evidencia con el tema de la carga y demás pero estoy sintiendo que el diseño no sé es un poco ordinario la verdad no me parece que sea elegante que sea ordenado siento que hay como vacíos es como si fuera un documento no es como si fuera realmente una interfaz de una aplicación así que yo creo que es bueno revisarlo completamente porque bueno tú me presentaste dos opciones pero eran dos opciones apenas de la letra yo siento que realmente le falta muchísimo al diseño» — **función aprobada; diseño rechazado**: pide revisar la interfaz completa. Alcanza a lo aprobado en las miradas 1 a 3 (misma estructura) | Mirada 4-bis: tres direcciones de interfaz sobre la misma pantalla, antes de tocar nada más |
| 2026-10-04 | `interfaz-a`, `interfaz-b`, `interfaz-c` (mirada 4-bis, ronda 1) | preview del PR #4 (no consta que las abriera) | «Si de acuerdo con tu sugerencia "A · Consola, con dos piezas de B: el recorrido de pasos para lo que tiene ciclo de vida (lotes y hallazgos) y el carril de acción a la derecha en las pantallas de detalle. " podemos cambiar a opus? o debemos seguir con Fable» — **dirección elegida: A con el recorrido y el carril de B**, citando la recomendación. Se le repreguntó si había abierto las tres páginas; respondió: «Pues uniciemos con el primer tramo y avisame cuando cambiara opus en el segundo». **No hay evidencia de mirada**: la elección descansa en la recomendación del constructor. Riesgo acotado por el cambio de plan que aprobó en esa misma respuesta: el tramo 1 son tres pantallas y abre su propia parada | Mirada 4-ter, tramo 1: sistema «consola» y tres pantallas tipo |
| 2026-10-04 | `catalogo`, `hallazgo-<id>` y `evidencia` con la dirección «consola» (mirada 4-ter, tramo 1, ronda 1) | preview del PR #4 | «Muy muy bien excelente ahora si que realmente se ve como una aplicacion seria, el recorrido en hallazgos esta perfecto y se entiende y confirmar el lote esta claro, Los abri y los apruebo» — **tramo 1 aprobado**, sin ajustes; comenta el recorrido del hallazgo y la confirmación del lote (evidencia de mirada). Con esto la dirección «consola» queda vista en pantallas reales. El texto en ambos idiomas sigue «maquetado, no visto» | Mirada 4-ter, tramo 2: el resto de las pantallas con la misma dirección |
| 2026-10-04 | fichas de prueba, `marcos`, `controles`, `propuestas`, `activo-<id>`, `plan-<id>`, `kit`, `direccion` e `index` con la dirección «consola» (mirada 4-ter, tramo 2, ronda 1) | preview del PR #4 | «Abri todas las paginas y estan buenismas muy claras y adecuadas, las abri y las apruebo continua» — **tramo 2 aprobado**, sin ajustes; dice haber abierto todas las páginas. Con esto toda la maqueta construida queda en la dirección «consola» y vista. El texto en ambos idiomas sigue «maquetado, no visto» | Mirada 5: brecha, vista por control, informe, tablero y portada |

## Cobertura (se llena durante la etapa)

| Página | Funcionalidad | Estados que muestra |
|---|---|---|
| `tablero` | C16 · C18 | con datos (pide tu atención: plazo vencido, lotes por confirmar, propuestas por decidir, fichas del plan vencidas, marcos con versión nueva, evidencia antigua · activos con su avance · hallazgos sin cerrar por severidad · controles por estado · catálogo por vigencia · banda de validación en verde, con sus comprobaciones) · vacío · carga · error (validación del instrumento en rojo: no se publica nada) |
| `catalogo` | C1 · C3 | con datos · sin resultados (filtros) · vacío · carga · error (pruebas rechazadas al cargar) |
| `prueba-<id>` | C1 · C3 · C6 | con datos, en sus variantes: vigente · por revisar · vencida (sello bajo el encabezado) · marcada para revisión de contenido · sin control asignado · con repeticiones y cota · determinista · con adaptador o por carga manual — y vacío (prueba retirada) · carga · error (no pasa su esquema) |
| `marcos` | C3 · C4 | con datos (versión al día · versión más nueva con propuesta · versión más nueva sin propuesta · mapa de equivalencias con entrada sin equivalente y entradas nuevas · instantáneas) · vacío · carga · error (referencia sin versión) |
| `controles` | C5 | con datos (áreas con y sin pruebas · controles con las pruebas que les dan evidencia · pruebas sin control asignado) · vacío · carga · error (control inexistente) |
| `propuestas` | C2 · C7 · C15 | con datos (fuente verificada · fuente sin verificar · marcada por el filtro · cambio de versión · herramienta · sobre con prueba dudosa y veredicto por regla · texto que mezcla dos pruebas; cada una sin decidir / aprobada / rechazada / separada) · filtro por quién propone · registro de la corrida · vacío · carga · error (propuesta que no cumple su esquema) |
| `activo-<id>` | C8 | con datos (autorizado con proveedor y política leída · autorizado sin proveedor · **sin autorización**, con la plantilla para activos propios) · vacío · carga · error (perfil sin dueño) |
| `plan-<id>` | C9 · C10 | con datos (planeadas con prioridad y razón · excluidas por perfil, por alcance y por el operador · control sin prueba · paquete de ejecución por herramienta) · **sin autorización: no hay plan** · vacío con «Emitir el plan» · carga · error (instantánea que no coincide con su huella) |
| `evidencia` | C11 · C14 · C15 | con datos, por vía: **archivo de herramienta** (dos lotes por confirmar: sobres con veredicto sugerido fallida / superada / no ejecutada, revisión obligatoria o en la muestra, huellas, advertencias; cada sobre seleccionable con su detalle en el carril; lote sin decidir / confirmado / a revisión individual, y el recorrido lo refleja) · **texto pegado** (campo vacío / lleno / propuesto) · **sobre manual** (formulario con obligatorios por llenar / completo / guardado) · vacío · carga · error (versión de herramienta fuera del rango probado) |
| `hallazgo-<id>` | C12 · C13 | con datos: abierto con plazo vencido · corregido con re-prueba por confirmar · aceptado con riesgo y revisión programada (o vencida) · cerrado por re-prueba; severidad por tabla de prioridad de IA o por vector CVSS 4.0; salidas posibles con lo que exige cada una · vacío · carga · error (vector incompleto) |
| `brecha` | C16 | con datos (cifras de cobertura · evidencia por confirmar que no cuenta · cobertura por activo, familia y control · esperado contra obtenido con su desviación, «no detectado» frente a «verificado» y sobres propuestos que no cuentan · vencidos y alertas) · sin resultados (filtros) · vacío · carga · error (plan cuya instantánea no está) |
| `control` y `control-<id>` | C17 | lista: los cuatro estados · control sin prueba en los planes · pruebas del plan sin control; cada control: con fallas (con la cadena de cierre de sus dos hallazgos) · evidencia antigua · sin evidencia · sin prueba en los planes · con evidencia vigente y pruebas sin resultado; una sola acción, la que pide su estado · vacío · carga · error (una huella que no coincide) |
| `informe` | C16 · C18 | con datos (las ocho secciones de § 12, con su huella y la validación del instrumento) · hoja de impresión · vacío · carga · error (validación del instrumento en rojo) |

## Gates de esta etapa y su demo en rojo

Cada gate se vio fallar antes de entrar al repo; el detalle (qué se rompió, qué dijo el fallo) está en
`sprints/ETAPA-DISENO-implementation-log.md`.

| Gate | Archivo | Qué impide |
|---|---|---|
| Deriva | `tests/unit/maqueta-deriva.test.ts` | HTML editado a mano o datos cambiados sin regenerar |
| Controladores | `tests/unit/controladores-maqueta.test.ts` | Control sin controlador registrado, script ausente, enlace roto |
| Autocontención | `tests/unit/maqueta-autocontenida.test.ts` | Cualquier petición a la red |
| Bilingüe | `tests/unit/maqueta-bilingue.test.ts` | Texto o atributo en un solo idioma |
| Envejecimiento | `tests/unit/maqueta-envejecimiento.test.ts` | Estado equivocado en una fecha umbral; un control que dice estados distintos en dos pantallas, o un estado que no es el de sus filas, en cualquier fecha |
| Brecha | `tests/unit/maqueta-brecha.test.ts` | Cifras que no son las de su tabla; un sobre sin confirmar que mueve un veredicto; «no detectado» contado como ejecutada; tablero, brecha e informe con cifras distintas |
| Fichas | `tests/unit/maqueta-fichas.test.ts` | Que una fila del catálogo abra la ficha de otra prueba, o que fila y ficha digan vigencias distintas (hoy y 45 días después) |
| Plan | `tests/unit/maqueta-plan.test.ts` | Un plan con pruebas para un activo sin alcance ni reglas; una prueba planeada y excluida a la vez; cifras que no son las filas; una exclusión sin razón |
| Evidencia | `tests/unit/maqueta-evidencia.test.ts` | Una fallida fuera de la revisión obligatoria de su lote; un hallazgo mostrado como cerrado sin su cadena completa; una tabla de prioridad cuya casilla no es la severidad declarada |
| Servidores | `tests/unit/servidor-config.test.ts` | Que Vercel y `serve` sirvan la maqueta distinto |
| Servida | `tests/e2e/maqueta-servida.spec.ts` | 404 o estilos perdidos al entrar por `/diseno`; control que no hace nada; desborde a 380 px; palabra partida por la mitad, dato que pisa la columna vecina o contenido que se sale de su panel, en teléfono **y en escritorio**; violaciones de accesibilidad en cualquier tema e idioma; movimiento con «reducir movimiento»; un informe que se imprime con navegación, en tinta clara, con tablas hechas tarjetas o fuera de la hoja |

## Tokens de reusables consumidos

HackGuard no consume el diagramador en el H1, ni tokens de ningún reusable. Del reusable
`instrumentos-de-plan` toma solo el **patrón** de la tabla de prioridad de acción (el impacto primero, la
tabla en datos, nunca una suma de dimensiones), dibujado con los tokens propios de `design-system.md`:

- **Forma:** matriz de impacto (filas, de 4 a 1) por frecuencia observada (columnas, en cuatro bandas).
  Cada casilla lleva el nivel con su símbolo de barras y su texto; la casilla del hallazgo se marca con
  un marco de tinta y la leyenda «este hallazgo» (nunca solo con color).
- **Piso y techo** escritos en la propia fila: impacto 4 nunca baja de «alto»; impacto 1 nunca pasa de
  «medio».
- **La facilidad no se opina:** es la frecuencia observada en el sobre de origen (fallas / repeticiones).
  Alcance y detectabilidad se registran y ordenan dentro de un mismo nivel; no lo cambian.
- **En teléfono** la fila se nombra con su número, el símbolo va sobre su texto y las anclas del impacto
  bajan a una leyenda bajo la tabla.
- La tabla y sus bandas son **ilustrativas y provisionales** (mirada 4); la definitiva se fija con el
  sprint del libro de evidencia.

## Registro de G-Diseño (se llena al cerrar la etapa)

| Campo | Valor |
|---|---|
| Veredicto | — |
| Fecha | — |
| Rondas | — |
| Dónde se aprobó | preview del PR #— |
| Decisiones selladas | — |
| Notas | — |

**Sin este registro lleno y sin el registro de miradas, G-Diseño no está aprobado y no existe orden de
construcción con UI que ejecutar.**
