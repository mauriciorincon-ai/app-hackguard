# Brochure de HackGuard — guion (storyboard)

> Escrito **antes** del HTML (regla cero del molde v2). Lo mira el usuario en el gate del H-1 junto con la pieza: es la desviación
> declarada del Sprint 9 (el molde pide un «guion aprobado» antes de construir; la planeadora decidió en el G-Plan, P2, que el
> brochure se hace en este sprint y se mira en el gate). Si el gate rechaza la dirección, se corrige aquí primero.
> Fuentes: `docs/MANUAL-DE-USO.md` (las funcionalidades), la VISION de la planeadora (la promesa), `design-system.md` 1.1.0.

## Cabecera

- **`MOTION_INTENSITY`: 2 de 10 (el mínimo que no es cero).** Entrada con stagger corto, apertura de tarjetas y un solo trazo que se
  dibuja. Nada se mueve con el scroll. Razón: la app es un instrumento de evidencia y su personalidad es sobria («consola»,
  `design-system.md` § 1); una pieza que se agita contradice lo que promete.
- **Identidad en una frase:** _la página se lee como un cuaderno de pruebas: cada cosa que dice lleva su fuente, su fecha o su firma._
- **La decisión valiente (la que el usuario juzga en el gate):** el clímax es **lo que HackGuard se niega a hacer**. Cuatro negativas
  (no ejecuta pruebas, no certifica cumplimiento, no decide un veredicto, no cierra un hallazgo porque dejó de aparecer) ocupan una
  escena propia a media página, con el texto visible, en vez de un acordeón de «limitaciones» al pie. Se vende por lo que no hace.
- **Excepciones a solo-`transform`/`opacity`:** (1) `stroke-dashoffset` para dibujar el hilo de la escena 2, un disparo, sobre un SVG
  decorativo `aria-hidden`; (2) `grid-template-rows` en la apertura de las tarjetas, con `visibility` en la transición para que lo
  cerrado salga del árbol de accesibilidad.
- **Motion-system:** curva `cubic-bezier(0.22, 1, 0.36, 1)` («asentar»), duraciones 0,45 s (apertura) y 0,6 s (entrada). Vocabulario:
  _alzar · dibujar · abrir_.
- **Idiomas:** español e inglés en el árbol (regla 20); el selector de la página cambia `html[data-lang]` y comparte la clave
  `hackguard:idioma` con la app. El tema sigue solo el del sistema (la pieza vive fuera del almacenamiento de la app): declarado.
- **Tipografía:** el sistema (Georgia para los titulares, `system-ui` para el cuerpo): las fuentes de la app no viajan en un archivo
  autocontenido. Declarado, no improvisado.

## Escenas

| #   | Escena                      | Mensaje                                                                                                | Gramática · técnica                                      | Cómo el movimiento cuenta el mensaje                                    | Assets                  | Peso  | Propiedades                                                | Con movimiento reducido                        |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------- | ----- | ---------------------------------------------------------- | ---------------------------------------------- |
| E1  | Portada                     | «Un hallazgo no es una vulnerabilidad: es la prueba de que un control falla.»                          | G3 · alzar sin fundido (el `h1` es candidato LCP)        | la frase sube y se asienta una vez: es la tesis, no un adorno           | ninguno                 | 1 KB  | `transform`                                                | frase y apoyo visibles, quietos                |
| E2  | El hilo                     | Cada prueba queda atada a un marco con versión, a un control, a una evidencia con huella y a un cierre | G3 · dibujar el trazo (un disparo)                       | el hilo se traza de la prueba al cierre: la trazabilidad ES el producto | SVG propio, cinco nodos | 3 KB  | `stroke-dashoffset` (excepción 1)                          | el hilo ya dibujado                            |
| E3  | Qué hace                    | Dieciocho funciones en cuatro tarjetas, cada una explicada al abrirla                                  | G2 · apertura de tarjeta                                 | la tarjeta se abre solo si quieres: nadie lee lo que no pidió           | 4 iconos de trazo       | 10 KB | `grid-template-rows` (excepción 2), `opacity`, `transform` | tarjetas con la misma apertura, sin transición |
| E4  | **Clímax · lo que no hace** | Se vende por lo que se niega a hacer                                                                   | G3 · alzar escalonado, la primera negativa un beat antes | el orden importa: lo primero que lees es «no ejecuta pruebas»           | ninguno                 | 1 KB  | `transform`, `opacity`                                     | las cuatro negativas visibles, quietas         |
| E5  | Lo fino                     | Cifras con su fuente, requisitos, privacidad y el mapa de rutas                                        | G2 · `details` nativos                                   | baja la voz a propósito después del clímax                              | ninguno                 | 6 KB  | ninguna                                                    | igual                                          |

- **Ritmo:** E1 quieta · E2 media · E3 media · **E4 clímax** · E5 baja la voz. Toda escena clímax es ninguna lo es: solo E4.
- **Clímax explícito:** E4, texto visible, no en un acordeón.
- **Peso total estimado:** ≤ 40 KB autocontenido, sin dependencias. El cierre del sprint publica el real.

## Cuadre de mensajes n/n

Las **18 funcionalidades** del export (`docs/brochure-export.json`, cuadradas con las 18 `[MVP · personal]` de la visión y con las
18 entradas del manual) caben en las cuatro tarjetas de E3; ninguna se omite.
`tests/unit/documentos-del-hito.test.ts` exige que cada una esté en el HTML.

| Id  | Funcionalidad                                      | Sección del manual                                                         | Tarjeta                             |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| F01 | Pruebas que no entran a medias                     | El catálogo como dato · desde Sprint 001                                   | T1 · Un catálogo que no miente      |
| F02 | Un filtro que marca, nunca censura                 | El catálogo como dato · desde Sprint 001                                   | T1 · Un catálogo que no miente      |
| F03 | Semáforo de vigencia que se lee sin color          | El catálogo en pantalla · desde Sprint 002                                 | T1 · Un catálogo que no miente      |
| F04 | Memoria entre versiones de un marco                | Marcos y controles · desde Sprint 003                                      | T1 · Un catálogo que no miente      |
| F05 | Los controles de ISO/IEC 42001 en palabras propias | Marcos y controles · desde Sprint 003                                      | T1 · Un catálogo que no miente      |
| F06 | La familia que nadie prueba todavía                | El clasificador demo de la familia «modelo de decisión» · desde Sprint 001 | T1 · Un catálogo que no miente      |
| F07 | Un investigador que propone con pruebas            | Las propuestas y los dos agentes · desde Sprint 008                        | T1 · Un catálogo que no miente      |
| F08 | Tu app, descrita como activo                       | Activos y plan · desde Sprint 004                                          | T2 · Un plan que explica            |
| F09 | Un planificador que explica cada decisión          | Activos y plan · desde Sprint 004                                          | T2 · Un plan que explica            |
| F10 | El paquete para correr afuera                      | Activos y plan · desde Sprint 004                                          | T2 · Un plan que explica            |
| F11 | Un libro de evidencia que una persona firma        | Evidencia y hallazgos · desde Sprint 005                                   | T3 · Evidencia que firmas tú        |
| F12 | Hallazgos que solo cierran con re-prueba           | Evidencia y hallazgos · desde Sprint 005                                   | T3 · Evidencia que firmas tú        |
| F13 | Severidad que un auditor puede reproducir          | Evidencia y hallazgos · desde Sprint 005                                   | T3 · Evidencia que firmas tú        |
| F14 | Garak y ZAP hablan tu idioma                       | Carga de evidencia · desde Sprint 006                                      | T3 · Evidencia que firmas tú        |
| F15 | Un extractor para lo que pegas                     | Las propuestas y los dos agentes · desde Sprint 008                        | T3 · Evidencia que firmas tú        |
| F16 | Lo esperado contra lo obtenido                     | La brecha y el informe · desde Sprint 007                                  | T4 · La brecha, control por control |
| F17 | La vista por control                               | La brecha y el informe · desde Sprint 007                                  | T4 · La brecha, control por control |
| F18 | El instrumento se prueba a sí mismo                | La brecha y el informe · desde Sprint 007                                  | T4 · La brecha, control por control |

**Qué no cuenta y por qué:** el propio brochure (no se documenta a sí mismo), el kit de prueba y la guía (son del gate, no de la app) y las
12 funciones `[roadmap]` de la visión (no existen todavía; viajan aparte, como roadmap votable, en el complemento de la ficha).

## Escena por escena en inglés

El inglés es redacción propia, no traducción literal (regla 20): cada frase tiene su par en `<span lang="en">`; el e2e de `/conoce`
comprueba que con el idioma en inglés no queda español visible.

## Lo que el gate juzga

1. ¿La decisión valiente funciona, o la pieza se lee mejor con las limitaciones al pie?
2. ¿Las 18 funciones se entienden con los nombres de las tarjetas, sin abrir el manual?
3. ¿El inglés suena a inglés?
4. El movimiento mínimo: ¿es demasiado poco?
