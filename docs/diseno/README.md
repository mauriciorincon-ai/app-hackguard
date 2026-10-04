# Etapa de Diseño de HackGuard — maqueta y registro de G-Diseño

Fundación visual del H1 (entregas E1 a E4), **anterior a cualquier código de producto**. Orden:
`portafolio/hackguard/ordenes/DISENO-orden.md` de la planeadora. Rama `diseno/fundacion`.

## Cómo abrir la maqueta

- **Donde se aprueba:** el preview del PR de la etapa, con sesión de Vercel, entrando por `/diseno`.
- **En local, servida:** `pnpm build && pnpm start` y abrir `/diseno` en el puerto 3000.
- **Doble clic** sobre `docs/diseno/index.html` también abre, pero no es la prueba: en las dos apps
  hermanas la maqueta funcionaba como archivo y fallaba servida.

Arriba a la derecha de cada página: conmutador de **tema** (oscuro por defecto) y de **idioma** (ES/EN).
Al pie de cada página: la matriz «Qué revisar y qué deberías ver».

## Qué vive aquí

| Ruta | Qué es | Quién la escribe |
|---|---|---|
| `*.html` | Páginas de la maqueta | **Salida** de `scripts/maqueta/` (`pnpm maqueta`). No se editan a mano: el gate de deriva lo impide |
| `assets/tokens.css`, `assets/tokens.json` | Tokens de color en ambos temas | **Salida** de `scripts/paleta/` (`pnpm tokens`) |
| `assets/hg.css` | Hoja del sistema de diseño: lo que el producto obedecerá | A mano |
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
4. **Nombres de página:** `index` · `direccion` · `kit` · `tablero` · `catalogo` · `prueba` · `marcos` ·
   `controles` · `propuestas` · `activo` · `plan` · `evidencia` · `hallazgo` · `brecha` · `control` ·
   `informe`.
5. **C18 (validación del instrumento)** no tiene pantalla propia: banda de estado en `tablero` y ficha
   de reproducibilidad en `informe`.
6. **Toda marca de estado es un trazo SVG**, nunca un carácter de una fuente.
7. **Tema por defecto: oscuro.** El claro se diseña y se mira con el mismo cuidado.
9. **Navegación:** cinco secciones (Tablero · Catálogo · Activos · Evidencia · Brecha) y, dentro de cada
   una, sus páginas. Una página que la maqueta aún no tiene se dibuja como texto, no como enlace roto.
10. **En el catálogo de la maqueta, todas las filas abren la misma ficha** (`prueba.html`, la de
    `PR-IA-PINJ-001`).
8. **Dirección «acta»** (mirada 1): títulos en Source Serif 4, texto en Atkinson Hyperlegible Next, datos
   en Atkinson Hyperlegible Mono; regla doble, esquinas rectas y secciones numeradas.

## Plan de miradas

Todas son de **forma** y abren parada. El **texto** (copy en ambos idiomas) queda «maquetado, no visto»
y su veredicto viaja al gate del MVP. Cambiar número, agrupación u orden exige aprobación previa.

| # | Artefacto | Estado |
|---|---|---|
| 0 | Fase 0: el preview del PR abre la maqueta provisional | **abre** (2026-10-03) |
| 1 | `direccion.html` — corte real de la vista por control, dirección recomendada + alternativa | **aprobada: dirección B «acta»** (2026-10-04, ronda 1) |
| 2 | `design-system.md` + `kit.html` + `catalogo` + `prueba` | **en mirada** (ronda 1) |
| 3 | `marcos` · `controles` · `propuestas` · `activo` · `plan` | pendiente |
| 4 | `evidencia` · `hallazgo` | pendiente |
| 5 | `brecha` · `control` · `informe` · `tablero` · `index` | pendiente |
| 6 | G-Diseño: recorrido completo en el preview, teléfono y escritorio | pendiente |

## Registro de miradas

Una fila por mirada, **antes** de construir encima. «Continúa» no es una mirada.

| Fecha | Artefacto | Dónde se miró | Veredicto del usuario (textual) | Qué se construyó encima |
|---|---|---|---|---|
| 2026-10-03 | `index.html` provisional (fase 0, tubería) | preview del PR #4, escritorio, tema oscuro | Captura de pantalla del preview con la página con estilos, las tres filas de vigencia y el estado «Cargando» activo con su mensaje; texto: «Esto aparece que se supone que debo hacer». No pidió ajustes. Antes había respondido «continúa» sin comentar la página y se le repreguntó | Fase 1: dirección |
| 2026-10-04 | `direccion.html` (mirada 1, ronda 1): dirección A «libro» recomendada y B «acta» conmutable | preview del PR #4 | «Me voy con B» — **dirección elegida: B «acta»** (títulos con serifa Source Serif 4, regla doble, esquinas rectas, secciones numeradas). Eligió la alternativa, no la recomendada; sin más ajustes | Consolidación de B como única dirección (la A y el conmutador se retiran) y fase 2: sistema completo, kit, catálogo y ficha de prueba |

## Cobertura (se llena durante la etapa)

| Página | Funcionalidad | Estados que muestra |
|---|---|---|
| `tablero` | C16 · C18 | — |
| `catalogo` | C1 · C3 | con datos · sin resultados (filtros) · vacío · carga · error (pruebas rechazadas al cargar) |
| `prueba` | C1 · C6 | con datos · vacío (prueba retirada) · carga · error (no pasa su esquema) |
| `marcos` | C4 | — |
| `controles` | C5 | — |
| `propuestas` | C2 · C7 · C15 | — |
| `activo` | C8 | — |
| `plan` | C9 · C10 | — |
| `evidencia` | C11 · C14 | — |
| `hallazgo` | C12 · C13 | — |
| `brecha` | C16 | — |
| `control` | C17 | — |
| `informe` | C16 · C18 | — |

## Gates de esta etapa y su demo en rojo

Cada gate se vio fallar antes de entrar al repo; el detalle (qué se rompió, qué dijo el fallo) está en
`sprints/ETAPA-DISENO-implementation-log.md`.

| Gate | Archivo | Qué impide |
|---|---|---|
| Deriva | `tests/unit/maqueta-deriva.test.ts` | HTML editado a mano o datos cambiados sin regenerar |
| Controladores | `tests/unit/controladores-maqueta.test.ts` | Control sin controlador registrado, script ausente, enlace roto |
| Autocontención | `tests/unit/maqueta-autocontenida.test.ts` | Cualquier petición a la red |
| Bilingüe | `tests/unit/maqueta-bilingue.test.ts` | Texto o atributo en un solo idioma |
| Envejecimiento | `tests/unit/maqueta-envejecimiento.test.ts` | Estado equivocado en una fecha umbral |
| Servidores | `tests/unit/servidor-config.test.ts` | Que Vercel y `serve` sirvan la maqueta distinto |
| Servida | `tests/e2e/maqueta-servida.spec.ts` | 404 o estilos perdidos al entrar por `/diseno`; control que no hace nada; desborde a 380 px; violaciones de accesibilidad en cualquier tema e idioma; movimiento con «reducir movimiento» |

## Tokens de reusables consumidos

HackGuard no consume el diagramador en el H1. La forma visual de la **tabla de prioridad de acción** de
la escala de IA (patrón de `reusables/instrumentos-de-plan/`: impacto primero, piso y techo, las dos
prioridades a la vista) se decide en la mirada 4 y se registra aquí.

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
