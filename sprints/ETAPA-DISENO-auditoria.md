# Auditoría de cierre — Etapa de Diseño (F2a) de HackGuard · Fase 1 (solo lectura)

- **Fecha:** 2026-10-04 · **Rama:** `diseno/fundacion` (PR #4 → `main`) · **Último commit auditado:** `d98c4d3`
- **Auditor:** independiente del constructor (subagente sin participación en la construcción).
- **Procedimiento:** `.claude/commands/audita-sprint.md`, solo la Fase 1. Las seis casillas, adaptadas a una
  etapa de diseño.
- **Fuentes contrastadas:** orden `portafolio/hackguard/ordenes/DISENO-orden.md` y sus entradas (brief v1.0.0,
  especificación de features, spike y especificación del usuario § 12 y RF-01…RF-05, todo en la planeadora,
  leído sin escribir), plan aprobado `flickering-tickling-petal.md`, `git diff origin/main...HEAD` (118
  archivos) revisado archivo por archivo, y la bitácora (`sprints/ETAPA-DISENO-implementation-log.md`) usada
  solo como contraste.
- **Corridas propias:** `pnpm -s test` → **598/598 en verde, 14 archivos** (incluye `maqueta-deriva`: el
  generador no tiene deriva) · `pnpm -s lint` → limpio · `pnpm -s typecheck` → limpio (`next-env.d.ts`
  restaurado; árbol de trabajo limpio al terminar) · barrido de cero enlaces → vacío · cambios bajo `src/`
  → **0 archivos**. No corrí `pnpm maqueta`, `build`, e2e ni el arnés de capturas, por las restricciones de
  la auditoría. El estado de la CI (`quality`/`e2e`/`lighthouse` en `success` en `6b4b6fb`) lo dice la
  bitácora. No lo verifiqué por mi cuenta.
- **Fuera del alcance de los hallazgos:** la mirada 6 (G-Diseño), el registro de G-Diseño vacío, el bundle
  `design-sync/` y el summary corresponden a la fase 6, que todavía no corre.

## Veredicto

| Severidad | Cuántos |
| --------- | ------- |
| Crítico   | 0       |
| Alto      | 3       |
| Medio     | 16      |
| Bajo      | 17      |

**Recomendación: «requiere ajustes».** Las reglas duras de la etapa se cumplen: cero producto en `src/`, cero
enlaces, frontera de contenido, ISO solo con identificadores y resúmenes propios, color nunca solo en los
estados, gates con su demo en rojo, matriz de envejecimiento y controladores. Los tres hallazgos Altos son
baratos, pero hay que pagarlos **antes** de la mirada 6. La portada del recorrido de G-Diseño y el
`design-system.md` todavía dicen que la mirada 5 está «por mirar» o «en curso». Además, la vista y algunos
textos fijan a mano cifras de entidades que el producto declara extensibles por datos.

---

## 1. Cobertura de alcance

### 1.1 Orden de diseño

| Ítem de la orden                                                                                                                                                                  | Estado                                                             | Evidencia                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase 0: el preview del PR abre la maqueta                                                                                                                                         | **Completo**                                                       | `docs/diseno/README.md:142,159` (mirada 0 registrada); `vercel.json`, `serve.json`, `scripts/copiar-maqueta.mjs`, `package.json` (`build`, `start`)      |
| P1 Tablero (activos, abiertos por severidad, vencidos con atraso, alertas)                                                                                                        | **Completo**                                                       | `scripts/maqueta/paginas/tablero.mjs:29-205`; banda C18 en `:43-74`                                                                                      |
| P2 Catálogo filtrable por familia, marco, control, madurez, semáforo y revisión                                                                                                   | **Parcial**                                                        | Filtros completos (`catalogo.mjs:72-91`). Falta el **semáforo por familia** de RF-01.5/C3 (M1)                                                           |
| P3 Ficha de prueba (qué, por qué, marco con versión, controles, herramienta, esperado, regla, k, aplicabilidad)                                                                   | **Completo**                                                       | `prueba.mjs` (21 páginas `prueba-<id>.html`); el gate `maqueta-fichas` prueba que cada fila abre su ficha                                                |
| P4 Marcos y versiones (vigente, mapa de equivalencias, aviso de versión nueva)                                                                                                    | **Completo**                                                       | `marcos.mjs`; `datos/gobierno.mjs:18-37`                                                                                                                 |
| P5 Controles (Anexo A con resumen propio, pruebas por control, `control_pendiente`)                                                                                               | **Completo** frente a la orden · **Parcial** frente a C5 del brief | `controles.mjs`. Los `controles_equivalentes` con fuente y nota de incompletitud nunca se dibujan llenos (M2)                                            |
| P6 Bandeja de propuestas (fuente verificada o marca; aprobar, rechazar, separar)                                                                                                  | **Completo**                                                       | `propuestas.mjs`; `datos/gobierno.mjs:75-169`                                                                                                            |
| P7 Activo (perfil, familias, alcance, reglas, dueño y proveedor)                                                                                                                  | **Completo**                                                       | `activo.mjs`; tres activos, uno sin autorización                                                                                                         |
| P8 Plan (planeadas y excluidas con razón, cobertura por control, paquete)                                                                                                         | **Parcial**                                                        | `plan.mjs`. Falta el «agregar una prueba» del operador (RF-03.7, C9): solo existe «quitada» (M3)                                                         |
| P9 Carga y confirmación (tres vías, lote con muestra, todas las fallas a la vista)                                                                                                | **Completo**                                                       | `evidencia.mjs`; el gate `maqueta-evidencia` cubre los lotes                                                                                             |
| P10 Hallazgo (ciclo, CVSS o tabla de IA, plazo, re-prueba, cierres alternativos)                                                                                                  | **Completo**, con desviación de alcance                            | `hallazgo.mjs`. Promete «reabierto», que es RF-04.9/D5, fuera del MVP (M6)                                                                               |
| P11 Brecha (esperado contra obtenido, «no detectado» ≠ «verificado», cobertura)                                                                                                   | **Completo**                                                       | `brecha.mjs`, `nucleo/brecha.mjs`; gate `maqueta-brecha`                                                                                                 |
| P12 Vista por control (cuatro estados con símbolo y texto, cadena de cierre)                                                                                                      | **Completo**                                                       | `control.mjs` + cinco `control-<id>.html`; los cuatro estados aparecen en los datos                                                                      |
| P13 Informe (§ 12, imprimible)                                                                                                                                                    | **Completo**                                                       | `informe.mjs:96-260`: ocho secciones; e2e de impresión `maqueta-servida.spec.ts:52-65`                                                                   |
| Estados vacío, carga, con datos y error por pantalla                                                                                                                              | **Completo**                                                       | Las 13 pantallas tienen los cuatro en la franja de sala. `index` y `kit` son de sala; `plan-act-demo-portal` es a propósito el estado «sin autorización» |
| 380 px sin desplazamiento horizontal                                                                                                                                              | **Completo**                                                       | e2e por página e idioma (`maqueta-servida.spec.ts:76-84`). Solo en el estado «con datos» (M15)                                                           |
| Ambos temas                                                                                                                                                                       | **Completo**                                                       | `scripts/paleta/`, `tokens.css`; axe en los dos temas                                                                                                    |
| Conmutador ES/EN visible y todo el texto en los dos idiomas                                                                                                                       | **Completo**                                                       | `nucleo/pagina.mjs:213`; gate `maqueta-bilingue`. Brecha latente en B11                                                                                  |
| README: tabla pantalla → feature (C1–C20)                                                                                                                                         | **Parcial**                                                        | `docs/diseno/README.md:170-186` cubre C1–C18. **C19–C20 no aparecen ni se declaran fuera de alcance** (M4). El índice dice otro mapa en 4 filas (B3)     |
| README: estados por pantalla                                                                                                                                                      | **Completo**                                                       | `docs/diseno/README.md:174-186`                                                                                                                          |
| README: registro de G-Diseño y registro de miradas                                                                                                                                | Miradas: **Completo** (0 a 5). G-Diseño: **pendiente (esperado)**  | `docs/diseno/README.md:153-168, 225-237`                                                                                                                 |
| Generador en el repo desde la fase 0, con gate de deriva byte a byte y su demo en rojo                                                                                            | **Completo**                                                       | `scripts/maqueta/`, `tests/unit/maqueta-deriva.test.ts`; demos D1a y D1b (bitácora `:32-33`); verde hoy                                                  |
| Arnés de capturas con pasada de interacción (regla 22)                                                                                                                            | **Completo**                                                       | `scripts/capturar-maqueta.mjs`, `scripts/maqueta/arnes/sondas.mjs:109-216`; la misma pasada corre en el e2e                                              |
| Matriz de envejecimiento (regla 23)                                                                                                                                               | **Completo**                                                       | `tests/unit/maqueta-envejecimiento.test.ts`; la perilla es `MAQUETA_FECHA`                                                                               |
| Sección «Tokens de reusables consumidos»                                                                                                                                          | **Completo**                                                       | `docs/diseno/README.md:207-223`                                                                                                                          |
| (Brief `:238`) La Etapa de Diseño decide si se consume el agente «Experto ISO 42001» como fuente de los resúmenes del Anexo A                                                     | **No implementado**                                                | No figura en el README, el sistema de diseño ni la bitácora (M5)                                                                                         |
| `design-system.md` completo (tokens en los dos temas, personalidad, tipografía, espacio, radios, sombras, estados, componentes, movimiento y su variante reducida, anti-patrones) | **Completo**, con dos defectos                                     | `design-system.md`. El frontmatter está caducado (A1). El botón pulsado depende solo del color (M16)                                                     |

### 1.2 Plan aprobado

| Ítem                                                                                                      | Estado                                    | Evidencia                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fase 0: tubería, generador, copia, servidores, arnés y gates                                              | **Implementado con desviación declarada** | `--coverage` no entra al script `test` (bitácora `:664-667`, razón válida)                                                                                                                                                                                                                                                                                         |
| Fase 1: dirección (mirada 1)                                                                              | **Completo**, con desviación declarada    | La paleta se eligió a mano y se validó por código (bitácora `:660-662`)                                                                                                                                                                                                                                                                                            |
| Fase 2: sistema, kit, catálogo y ficha (mirada 2)                                                         | **Completo**                              | —                                                                                                                                                                                                                                                                                                                                                                  |
| Fase 3: marcos, controles, propuestas, activo y plan (mirada 3)                                           | **Completo**                              | —                                                                                                                                                                                                                                                                                                                                                                  |
| Fase 4: evidencia y hallazgo (mirada 4)                                                                   | **Implementado con desviación aprobada**  | Se insertaron 4-bis y 4-ter con aprobación (`docs/diseno/README.md:125-135`)                                                                                                                                                                                                                                                                                       |
| Fase 5: brecha, control, informe, tablero e índice (mirada 5)                                             | **Completo**                              | Mirada aprobada (`docs/diseno/README.md:168`)                                                                                                                                                                                                                                                                                                                      |
| Fase 6: cierre                                                                                            | **En curso** (esta auditoría)             | —                                                                                                                                                                                                                                                                                                                                                                  |
| Gates del plan: deriva, controladores, autocontención, envejecimiento, bilingüe, servidores y e2e servido | **Completo**                              | Están los siete archivos y sus demos (bitácora `:30-45`). Revisé tres contra el código. D4a: la exclusión de `<html lang>` está en `maqueta-bilingue.test.ts:21-23`. D6: la igualdad de redirecciones está en `servidor-config.test.ts:22-25`. G19: re-deduce el veredicto desde `SOBRES`, no desde el módulo (`maqueta-brecha.test.ts:26-34`). Las tres coinciden |
| Decisiones 1–8                                                                                            | **Completo**                              | La decisión 4 tiene desviaciones declaradas: `prueba-<id>`, `activo-<id>`, `control-<id>`, y `direccion` retirada (bitácora `:652-658`). La 6 quedó en 21 pruebas, no en «~25», sin consecuencia                                                                                                                                                                   |
| `scripts/maqueta/rutas.mjs`: «aborta fuera de `docs/diseno/` o un temporal»                               | **Implementado con desviación**           | Admite cualquier directorio fuera del repo (B8)                                                                                                                                                                                                                                                                                                                    |

### 1.3 Features C1–C20 en la maqueta

C1 ✓ · C2 ✓ · **C3 parcial** (falta el semáforo por familia, M1) · C4 ✓ · **C5 parcial** (equivalentes nunca
llenos, M2) · C6 ✓ · C7 ✓ · C8 ✓ · **C9 parcial** (falta «agregar», M3) · C10 ✓ · C11 ✓ · C12 ✓ (con la promesa
de D5, M6) · C13 ✓ · C14 ✓ · C15 ✓ · C16 ✓ · C17 ✓ · C18 ✓ (banda del tablero y ficha del informe) ·
**C19–C20: ni aparecen ni se declaran fuera de alcance (H2/S4)** (M4).

---

## 2. Hallazgos Altos, con ajuste ejecutable

### A1 · Frases de sala y del sistema de diseño que hoy son falsas: la mirada 5 ya se aprobó y siguen diciendo «por mirar»

**Qué está mal.** La mirada 5 quedó aprobada el 2026-10-04 (`docs/diseno/README.md:150,168`). Aun así:

- **(a)** `scripts/maqueta/paginas/index.mjs:12,17,37,39,41,51`: la portada del recorrido, que es la entrada
  de la mirada 6, marca tablero, brecha, vista por control e informe con el chip «**Mírala ahora** / Review
  it now».
- `index.mjs:54,68-71` dice «**4 por mirar ahora**».
- `index.mjs:101-104` (nota de sala) dice «Las cuatro pantallas nuevas van marcadas; las otras nueve ya están
  aprobadas».
- `index.mjs:116` dice «las cuatro nuevas dicen «Mírala ahora»».
- **(b)** `design-system.md:3`: el frontmatter dice «mirada 5 **en curso**».
- **(c)** Las notas de sala de la mirada 5 no dicen que se aprobó, a diferencia de las de las miradas 4-ter:
  `tablero.mjs:242-243`, `brecha.mjs:293-294`, `control.mjs:140-141`, `control.mjs:399-400` e
  `informe.mjs:347-348`. Además, `control.mjs:140-141` pinta comillas invertidas literales («`direccion`») y
  dice «se retira» cuando ya se retiró.
- **(d)** `control.mjs:409` pide comprobar «Cada uno en un estado distinto». Hoy hay cinco controles y cuatro
  estados: `iso42001-A.6.2.8` y `iso42001-A.7.4` están los dos en `sin_evidencia`, según
  `docs/diseno/control.html`.

**Por qué importa.** La mirada 6 es el instrumento del gate G-Diseño y empieza en `index.html`. Hoy el usuario
recorrería una portada que contradice el registro de miradas y una matriz «qué deberías ver» que no se cumple.
Es exactamente la clase de frase caducada que la casilla 4 debe cazar.

**Ajuste.** Es un cambio de texto: no abre parada (regla 10, segundas vueltas). Se anota en la bitácora.

1. `scripts/maqueta/paginas/index.mjs`:
   - Borra la constante `EN_MIRADA` (línea 12) y el `nueva: true` de las líneas 17, 37, 39 y 41.
   - En la línea 51, deja `<td data-celda="estado">${estado(APROBADA)}</td>`.
   - Borra la línea 54. Si `chip` queda sin uso, quítalo del `import` de la línea 7.
   - Líneas 68-71: `es: \`En el orden de la orden de diseño. Las ${PANTALLAS.length} aprobadas, una por una (miradas 1 a 5).\``,
`en: \`In the design order's sequence. All ${PANTALLAS.length} approved, one by one (reviews 1 to 5).\``.
   - Líneas 101-104, la nota: `es: "Mirada 6 (G-Diseño): el recorrido completo. Cada pantalla ya se aprobó en su mirada; ahora se mira el conjunto en teléfono y escritorio, en los dos temas y los dos idiomas."`,
     `en: "Review 6 (design gate): the full walk-through. Each screen was approved in its own review; now the whole is reviewed on phone and desktop, in both themes and both languages."`.
   - Línea 116, el campo `ver`: `es: \`Las ${PANTALLAS.length} de la orden de diseño en su orden, todas «Aprobada»\``,
`en: \`All ${PANTALLAS.length} from the design order in sequence, each “Approved”\``. Las cadenas pasan a
     plantillas.
2. En las cinco notas de la mirada 5: `tablero.mjs:242-243`, `brecha.mjs:293-294`, `control.mjs:140-141`,
   `control.mjs:399-400` e `informe.mjs:347-348`, cambia «Mirada 5:» por «Mirada 5 (aprobada):» y «Review 5:»
   por «Review 5 (approved):». En `control.mjs:140-141`, además, quita las comillas invertidas y pasa a
   pasado: «la de la mirada 1 (direccion) se retiró porque esta la reemplaza» / «the review 1 page
   (direccion) was retired because this one replaces it».
3. En `control.mjs:409`, el campo `ver`: `es: "Cada uno con su estado y un aviso que dice por qué; entre todos aparecen los cuatro estados"`,
   `en: "Each with its status and a notice saying why; together they show all four statuses"`.
4. En `design-system.md:3`:
   `estado: dirección «consola» aprobada (mirada 4-ter, tramos 1 y 2) · miradas 1 a 5 aprobadas · se sella en G-Diseño (mirada 6)`.
5. `pnpm maqueta` y comitea las páginas regeneradas en el mismo commit.

**Criterio de «ajuste verificado».**

- `grep -lE "Mírala ahora|por mirar ahora|Review it now|to review now" docs/diseno/*.html` no devuelve nada.
- `grep -n "en curso" design-system.md` no menciona la mirada 5.
- `grep -c "Mirada 5 (aprobada)" docs/diseno/tablero.html docs/diseno/brecha.html docs/diseno/control.html docs/diseno/informe.html`
  da ≥ 1 en cada uno.
- `grep -c '`' docs/diseno/control.html` da 0.
- `pnpm -s lint` está limpio y `pnpm -s test` en verde, con la deriva incluida.

### A2 · La vista fija la cardinalidad de la escala de IA, que la constitución declara dato (reglas 7 y 10)

**Qué está mal.** Los niveles de impacto están fijados a mano como `[4, 3, 2, 1]` en
`scripts/maqueta/paginas/hallazgo.mjs:54`, `hallazgo.mjs:67` y `scripts/maqueta/paginas/kit.mjs:183`. La
frase «de 4 / of 4» está escrita a mano en `hallazgo.mjs:92`. El piso y el techo están atados en código a
`impacto === 4` y `impacto === 1`, con su texto literal, en `hallazgo.mjs:61` y `hallazgo.mjs:69`. La escala vive
en `datos/mundo.mjs:372-405` (`ESCALA_IA`), pero nada en los datos declara el piso ni el techo, y ningún test
comprueba que la `tabla` los respete.

**Por qué importa.** La regla dura 7 dice que la escala es «una tabla de prioridad de acción en datos», y la
regla 10, que las escalas viven en archivos versionados. Los Altos de la casilla 6 son justamente literales
donde el dato dice N. Si la escala definitiva del S3 cambia de forma, la vista que el S2 copiará de la maqueta
se rompe o miente. El piso y el techo, que son la garantía de E-12, se afirman en pantalla sin que nada los
verifique.

**Ajuste.**

1. En `scripts/maqueta/datos/mundo.mjs`, dentro de `ESCALA_IA` y después de `tabla` (línea 392), añade:
   ```js
   // Piso y techo de la tabla (E-12), como dato: la vista los lee de aquí y un test los verifica.
   limites: [
     { impacto: 4, tipo: "piso", nivel: "alto" },
     { impacto: 1, tipo: "techo", nivel: "medio" },
   ],
   ```
2. En `hallazgo.mjs`, tras los `import`, añade
   `const IMPACTOS = Object.keys(ESCALA_IA.tabla).map(Number).sort((a, b) => b - a);`. Después:
   - Sustituye `[4, 3, 2, 1]` por `IMPACTOS` en las líneas 54 y 67.
   - En las líneas 61 y 69, arma `limite` desde `ESCALA_IA.limites.find((l) => l.impacto === impacto)`. Para el
     piso: `{ es: \`Piso: nunca menos de ${SEVERIDAD[l.nivel].nombre.es.toLowerCase()}\`, en: \`Floor: never below ${SEVERIDAD[l.nivel].nombre.en.toLowerCase()}\` }`.
     Para el techo, igual con «Techo: nunca más de» / «Ceiling: never above». En la leyenda de la línea 69,
     conserva el espacio inicial y el punto final de hoy.
   - En la línea 92, cambia `"de 4"` y `"of 4"` por plantillas con `${IMPACTOS[0]}`.
3. En `kit.mjs:183`, cambia `[4, 3, 2, 1]` por la misma derivación.
4. Crea un gate en un archivo nuevo, `tests/unit/maqueta-escala.test.ts`. Importa `ESCALA_IA` y comprueba:
   - cada fila de `tabla` tiene `ESCALA_IA.facilidad.length` casillas;
   - en cada fila la severidad no baja de izquierda a derecha, con rango
     `["informativo","bajo","medio","alto","critico"]`;
   - para cada `limites` de tipo `piso`, ninguna casilla de su fila queda por debajo de `nivel`, y para cada
     `techo`, ninguna queda por encima.
5. **Demo en rojo en el mismo commit** (regla 15). Cambia `tabla[4][0]` a `"medio"`: el test debe nombrar el
   piso. Luego restaura y confirma con `cmp`. Registra la demo en la bitácora.

**Criterio de «ajuste verificado».**

- `grep -rnE "\[4, 3, 2, 1\]|\"de 4\"|\"of 4\"" scripts/maqueta` no devuelve nada.
- `pnpm maqueta && git status --short docs/diseno` no muestra **ningún** cambio, porque los datos de hoy
  producen los mismos bytes.
- `pnpm -s test` está en verde, con el gate nuevo.
- La demo en rojo queda registrada.

### A3 · Textos con el número de familias, marcos y controles fijado a mano: entidades que el producto declara extensibles

**Qué está mal.**

- `scripts/maqueta/paginas/index.mjs:20` dice «las **cuatro familias** / the four families».
- `scripts/maqueta/paginas/control.mjs:408` dice «Abre los **cinco controles** / Open all five controls».
- `scripts/maqueta/datos/gobierno.mjs:157` dice «Todas las familias y los **cuatro marcos** / the four
  frameworks».

En los tres casos, la cifra sale de `FAMILIAS`, `MARCOS` y `brecha().controles`.

**Por qué importa.** El brief y la constitución (regla 10: «agregar una familia, un marco o un adaptador no
toca el núcleo») declaran estas tres entidades extensibles solo con datos. La casilla 6 trata un literal así
como Alto. El catálogo ya lo resuelve bien con `Object.keys(FAMILIAS).length` en `catalogo.mjs:112`; el
patrón existe.

**Ajuste.**

1. En `index.mjs:20`: `es: "Las pruebas de todas las familias, con filtros que funcionan."`,
   `en: "Tests for every family, with working filters."`.
2. En `control.mjs:408`, donde `b` está en el ámbito de `controlDetalle`:
   `hacer: { es: \`Abre los ${b.controles.length} controles\`, en: \`Open all ${b.controles.length} controls\` }`.
3. En `gobierno.mjs:157`: `alcance: { es: "Todas las familias y todos los marcos del catálogo", en: "All families and every framework in the catalog" }`.
4. **Gate contra la recaída**, con su demo en el mismo commit. Añade a `tests/unit/maqueta-bilingue.test.ts`, o
   a un archivo nuevo, un test que lea el texto de cada `docs/diseno/*.html` y falle si encuentra
   `/\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|two|three|four|five|six|seven|eight|nine|ten)\s+(familias|marcos|controles|herramientas|adaptadores|idiomas|families|frameworks|controls|tools|adapters|languages)\b/i`.
   Demo: reintroduce «cuatro familias» en `index.mjs:20`, ejecuta `pnpm maqueta`, el test queda en rojo,
   restaura y confirma con `cmp`.
5. `pnpm maqueta` y comitea las páginas.

**Criterio de «ajuste verificado».**

- `grep -rnEi "cuatro familias|four families|cinco controles|five controls|cuatro marcos|four frameworks" scripts/maqueta docs/diseno/*.html`
  no devuelve nada.
- `pnpm -s test` está en verde, con el gate nuevo y su demo registrada.

---

## 3. Hallazgos Medios

| #   | Ubicación                                                                                                                                                                                                                                                      | Qué está mal y por qué importa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pago sugerido                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `scripts/maqueta/paginas/catalogo.mjs:72-77`, `tablero.mjs:137-145`; el README afirma C3 en `docs/diseno/README.md:175`                                                                                                                                        | **C3 parcial.** RF-01.5 (Imprescindible) pide semáforo de vigencia «por prueba, por marco y **por familia**». Hay por prueba, por marco (`marcos.mjs:39`) y por herramienta (`prueba.mjs:161`), pero ninguna vista dibuja la vigencia de una familia. El S2 no tendría referencia de fidelidad para ese estado                                                                                                                                                                                                                       | Dar a `FAMILIAS` su `verificada`, o derivarla de la peor vigencia de sus pruebas, y dibujarla con `fechado()`, que ya trae el protocolo de envejecimiento, en las píldoras de familia o en una fila «Por familia» del tablero |
| M2  | `controles.mjs:52` (siempre «Ninguno registrado»), `control.mjs:362-367`                                                                                                                                                                                       | **C5 parcial.** `controles_equivalentes` «con fuente y nota de incompletitud» (brief C5, E-16) solo aparece vacío, con una promesa aplazada («Cuando lo esté, cada equivalencia dirá su fuente…»). El estado lleno no está diseñado                                                                                                                                                                                                                                                                                                  | Un control demo con una equivalencia (fuente e «incompleto») en los datos, y su celda o tarjeta                                                                                                                               |
| M3  | `datos/mundo.mjs:79-84`, `nucleo/calculos.mjs:89`, `plan.mjs:19`                                                                                                                                                                                               | **C9 parcial.** RF-03.7 (Imprescindible) permite que el operador **agregue** o quite pruebas con justificación. Solo existe «quitada»: ni dato, ni motivo, ni marca, ni acción para «agregada»                                                                                                                                                                                                                                                                                                                                       | Añadir `accion: "agregada"` con su marca y su razón en el plan y en `planDe`                                                                                                                                                  |
| M4  | `docs/diseno/README.md:170-186`                                                                                                                                                                                                                                | Entregable 3 de la orden: la tabla «pantalla → feature (C1–C20)» no menciona **C19 ni C20** y tampoco los declara fuera del alcance de la maqueta (H2/S4)                                                                                                                                                                                                                                                                                                                                                                            | Añadir una fila «Fuera de la maqueta: C19 (vitrina) y C20 (paquete para hoja-de-vida), H2 · S4»                                                                                                                               |
| M5  | `docs/diseno/README.md:207-223`; brief `:238`                                                                                                                                                                                                                  | El brief deja a esta etapa la decisión de consumir o no el agente «Experto ISO 42001» como fuente de los resúmenes del Anexo A. No está registrada en ningún lado                                                                                                                                                                                                                                                                                                                                                                    | Registrar la decisión y su razón en la sección de reusables                                                                                                                                                                   |
| M6  | `paginas/hallazgo.mjs:270-273`                                                                                                                                                                                                                                 | El texto de producto promete «si una re-prueba posterior vuelve a fallar, el hallazgo **se reabre y queda marcado como reabierto**». Es RF-04.9, Deseable y **diferido como D5** en el brief: la maqueta compromete al S3 con algo fuera del MVP                                                                                                                                                                                                                                                                                     | Redactarlo con el comportamiento del H1 (p. ej. «una falla posterior abre un hallazgo nuevo con su propia evidencia»), o declararlo diferido                                                                                  |
| M7  | `datos/mundo.mjs:193-198` (`CONTROL`), `:200-213` (`delCatalogo`/`PRUEBAS`), `datos/catalogo.mjs:22` (`MARCOS[…].anterior`), `nucleo/brecha.mjs:113` (`cerrados`)                                                                                              | **Campos del contrato sin consumidor (casilla 5).** Ninguna página ni test importa `CONTROL` ni `PRUEBAS` de `mundo.mjs` (restos de la página `direccion`, ya retirada). `anterior` duplica `EQUIVALENCIAS["owasp-llm-top10"].desde` (`gobierno.mjs:20`) y nadie lo lee. `brecha().cerrados` no tiene lector                                                                                                                                                                                                                         | Borrar los cuatro. Si `anterior` se quiere conservar, que `marcos.mjs` lo lea y `EQUIVALENCIAS` lo derive                                                                                                                     |
| M8  | `nucleo/calculos.mjs:8-11`                                                                                                                                                                                                                                     | `huellaDe` usa `JSON.stringify(registro, Object.keys(registro).sort())`. Esa lista filtra las claves **en todos los niveles**, así que lo anidado se pierde: comprobé que dos sobres que solo difieren en `razon` dan la misma huella. Se usa sobre sobres enteros en `control.mjs:213`, `hallazgo.mjs:218` y `:242`. La maqueta muestra como huella algo que no huella el contenido, y el comentario dice «canónico»                                                                                                                | Canonizar en profundidad, con claves ordenadas de forma recursiva. Cambian las huellas mostradas, lo que es un cambio de texto: se regenera                                                                                   |
| M9  | `nucleo/brecha.mjs:14-17` (`sinCerrar`), `:69` y `nucleo/calculos.mjs:57` (`!h.cierre`); `hallazgo.mjs:292`                                                                                                                                                    | «Abierto» se define de dos maneras: `sinCerrar` excluye `aceptado_con_riesgo` y `!h.cierre` lo incluye. Además, el texto de «Aceptar el riesgo» dice que el hallazgo «sigue contando como falla del control», pero `controles[].fallas` (`brecha.mjs:96`) usa `sinCerrar` y lo dejaría fuera. Hoy está latente, porque la prueba de HZ-0005 no tiene control                                                                                                                                                                         | Un solo predicado en `nucleo/brecha.mjs`, usado en los tres sitios, y el texto alineado con él                                                                                                                                |
| M10 | `nucleo/calculos.mjs:59-66`                                                                                                                                                                                                                                    | `vistaPorControl` da por evidencia un sobre `no_ejecutada`: el estado solo mira la edad. Un control cuyo único sobre sea «no detectado» saldría **«Con evidencia vigente»**, contra E-6, el principio que la propia brecha defiende. Latente: SOB-0023 cubre una prueba sin control. El gate de envejecimiento no lo vería, porque deduce de las mismas filas                                                                                                                                                                        | Tratar `no_ejecutada` como `sin_evidencia` en la fila del control. Demo: asignarle un control a `PR-SW-XSS-001`                                                                                                               |
| M11 | `datos/mundo.mjs:233` frente a `:354`; lectores en `control.mjs:203` y `evidencia.mjs:52-56`                                                                                                                                                                   | El campo `reprueba_de` apunta a **un sobre** en `SOBRES` (`"SOB-0012"`) y a **un hallazgo** en `LOTES` (`"HZ-0009"`). Además, `HZ-0009.reprueba_por_confirmar` (`:301`) duplica el vínculo en sentido inverso. El modelo de datos del S3 heredaría esa ambigüedad                                                                                                                                                                                                                                                                    | Dos nombres, p. ej. `reprueba_de_sobre` y `reprueba_de_hallazgo`, o un único sentido del vínculo                                                                                                                              |
| M12 | `nucleo/componentes.mjs:52-54, 83`, `nucleo/pagina.mjs:150-160, 183-185`, `paginas/hallazgo.mjs:31`, `paginas/control.mjs:259`; CSS en `assets/app.css:480,517,634`                                                                                            | Un enlace a una página que no existe se convierte **en silencio** en texto (o en nada, como el `boton` de `control.mjs`). `controladores-maqueta` solo revisa `<a href>`, así que un error de dedo en un destino desaparece del gate. Ya existen todas las páginas (cero `hg-nav-pendiente` en la salida): el respaldo es código muerto y un punto ciego                                                                                                                                                                             | Que el generador **lance** si un destino no está en `existentes`. Quitar las ramas y estilos `hg-nav-pendiente`. Demo: un destino con error de dedo hace que `pnpm maqueta` falle                                             |
| M13 | `index.mjs:36, 60-61, 116`; `activo.mjs:220-221, 229`; `hallazgo.mjs:415-416, 429`; `informe.mjs:371`; `control.mjs:418`; `marcos.mjs:249`; `catalogo.mjs:169, 203`; `tablero.mjs:257`; `propuestas.mjs:84, 263`; `brecha.mjs:313`; `datos/mundo.mjs:330, 350` | **Cuentas de datos escritas a mano** en textos de sala y de producto: «trece pantallas», «tres activos», «cuatro hallazgos», «dos hallazgos», «dos avisos», «Quedan 6 filas», «2 pruebas rechazadas», «cinco comprobaciones», «Hay dos pruebas parecidas» (texto de producto: debería salir de `p.candidatas.length`), «dos sobres», «Las dos sin alertas» y «dos de las tres reglas». `ORDEN_DE_HALLAZGOS` (`mundo.mjs:330`) duplica a mano los ids de `HALLAZGOS`: un hallazgo nuevo tendría página pero no estaría en el selector | Calcular cada cifra desde su arreglo y derivar el orden de los hallazgos de su estado. Lo cubre en parte el gate de A3                                                                                                        |
| M14 | `paginas/control.mjs:191`                                                                                                                                                                                                                                      | «Toda su evidencia tiene **más de 180** días». El umbral está escrito a mano en vez de leerse de `umbrales.evidencia_antigua`, y el texto se equivoca en un día: el estado es `>=` 180 (`calculos.mjs:25`). Si DA-04 cambia el umbral, la frase miente, y la matriz de envejecimiento no lee esta frase                                                                                                                                                                                                                              | Ponerle `umbrales` a `fraseDeControl` y escribir «tiene {N} días o más»                                                                                                                                                       |
| M15 | `tests/e2e/maqueta-servida.spec.ts:76-110`                                                                                                                                                                                                                     | axe y las sondas de desborde a 380 y 1280 px solo corren en el estado por defecto, «con datos». Vacío, carga y error, tres de los cuatro estados de cada pantalla, **no tienen gate de accesibilidad en ningún lado**. El arnés mide desbordes por estado, pero no corre axe y es local                                                                                                                                                                                                                                              | Repetir axe y desbordes por cada `data-valor` de la botonera de sala, al menos en un tema e idioma                                                                                                                            |
| M16 | `design-system.md:165` («Lo elegido lleva borde y tinte azules»), `docs/diseno/assets/app.css:374-377`                                                                                                                                                         | El estado pulsado de `.hg-boton` (botonera de sala, decisiones, selección) **solo cambia color** (borde y tinte). Contradice el anti-patrón «color como única señal» del propio sistema (`design-system.md:218`) y la regla 12, y el usuario es daltónico. `.hg-filtro[aria-pressed]` (`app.css:412`) ya muestra la forma correcta (peso). El S2 lo heredaría como canon                                                                                                                                                             | Añadir una señal no cromática (peso 700 o una barra interior) y corregir la frase del sistema de diseño. Es un cambio visual: se ve en la mirada 6                                                                            |

---

## 4. Hallazgos Bajos

| #   | Ubicación                                                                                                                                                                    | Qué                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `docs/diseno/README.md:43-121`                                                                                                                                               | Las decisiones van desordenadas: 1–7, 9–15, 8, 16, 17, 19, 20, 18, 21–26                                                                                                                                                                            |
| B2  | `docs/diseno/README.md:57, 170`; `nucleo/pagina.mjs:24-25`; `nucleo/componentes.mjs:52`; `datos/mundo.mjs:1`; `tests/unit/maqueta-fichas.test.ts:58`                         | Frases y comentarios caducados: «una página que la maqueta **aún no** tiene», «Cobertura (**se llena** durante la etapa)», «**todavía no** tiene… hasta que su mirada la construya», «(fase 1…; la fase 2 lo completa)», «21 fichas» escrito a mano |
| B3  | `paginas/index.mjs:21, 23, 33, 41` frente a `docs/diseno/README.md:176-186`                                                                                                  | El mapa de features está escrito dos veces y no coincide en cuatro filas: ficha (C1·C6 frente a C1·C3·C6), marcos (C4 frente a C3·C4), carga (C11·C14 frente a C11·C14·C15) e informe (C16 frente a C16·C18)                                        |
| B4  | `docs/diseno/README.md:193-205`                                                                                                                                              | A la tabla de gates le faltan `maqueta-cobertura-de-fuente`, `paleta` y `design-system`                                                                                                                                                             |
| B5  | `brecha.mjs:28`, `controles.mjs:18`, `control.mjs:26`, `informe.mjs:29`, `marcos.mjs:20`, `tablero.mjs:22`, `plan.mjs:25`; `catalogo.mjs:15`, `prueba.mjs:22`, `plan.mjs:24` | `columnas` está copiado en 7 módulos y `nombreDe` en 3. Deberían vivir en `nucleo/componentes.mjs`                                                                                                                                                  |
| B6  | `scripts/copiar-maqueta.mjs:15-22`                                                                                                                                           | El guardia «destino fuera de `public/`» **no puede fallar**, porque `destino` es constante: es decorado (tercera pregunta de la regla 15). Si falta el origen, sale con código 0 y el build pasa sin maqueta                                        |
| B7  | `scripts/paleta/generar-tokens.mjs:39`                                                                                                                                       | Detecta que corre como principal comparando `file://${argv[1]}`. Con espacios o enlaces simbólicos en la ruta, `pnpm tokens` no hace nada y no avisa. Usar `fileURLToPath(import.meta.url) === resolve(process.argv[1])`                            |
| B8  | `scripts/maqueta/rutas.mjs:10-17`                                                                                                                                            | Acepta cualquier directorio fuera del repo; el plan decía «`docs/diseno/` o un temporal»                                                                                                                                                            |
| B9  | `paginas/hallazgo.mjs:42-44`                                                                                                                                                 | La banda de frecuencia se elige con el porcentaje **redondeado**: 4,6 % cae en «del 5 al 19 %»                                                                                                                                                      |
| B10 | `paginas/evidencia.mjs:55-56`                                                                                                                                                | La nota de re-prueba («al confirmarla, el hallazgo se cierra») no mira el veredicto: lo diría también de una re-prueba fallida                                                                                                                      |
| B11 | `docs/diseno/assets/maqueta.js:38-51` frente a `tests/unit/maqueta-bilingue.test.ts:7, 53-58`                                                                                | El gate acepta `title`, `placeholder` y `alt` con `data-*-es/en`, pero el script solo cambia `aria-label`. Si alguien añade uno, el inglés se vería en español y el gate seguiría verde                                                             |
| B12 | `tests/unit/maqueta-envejecimiento.test.ts:192`                                                                                                                              | `completos.plazo` solo exige «vencido»; «en_plazo» no se exige aunque aparece                                                                                                                                                                       |
| B13 | `tests/unit/maqueta-autocontenida.test.ts:15-20`                                                                                                                             | No cubre `srcset`, `<meta http-equiv="refresh">` ni `import()` remoto                                                                                                                                                                               |
| B14 | `datos/gobierno.mjs:43, 48`                                                                                                                                                  | Los nombres de área en inglés («Internal organization», «Information for interested parties») son casi literales a los encabezados de la norma. Revisarlo con las licencias en la fase 0 del S1 (regla 11)                                          |
| B15 | `datos/mundo.mjs:173-179`; `datos/catalogo.mjs:461-465`                                                                                                                      | La fórmula ilustrativa no tiene «capacidad de acción» (RF-03.2) y los entornos no tienen «plan gratuito de servicio» (RF-03.3). Están declarados ilustrativos y se fijan en el S2                                                                   |
| B16 | `nucleo/piezas-de-brecha.mjs:72` frente a `:112`                                                                                                                             | El mismo estado se llama de dos formas: «Toca revisarlo» y «Toca revisar»                                                                                                                                                                           |
| B17 | `nucleo/pagina.mjs:26, 73, 83`; `nucleo/brecha.mjs:12, 17`; `nucleo/piezas-de-brecha.mjs:107`; `nucleo/fecha.mjs:10`                                                         | Se exportan símbolos que solo se usan dentro de su propio módulo (`NAVEGACION`, `grupoDeSala`, `ESTADOS_DE_PANTALLA`, `FICHAS`, `sinCerrar`, `vigenciaFechada`, `numeroDeDia`). La superficie del contrato es mayor de lo necesario                 |

---

## 5. Casilla 4 — ¿qué frases caducaron?

Barrí el vocabulario de promesa aplazada en español y en inglés: todavía no, aún no, por ahora, de momento,
mientras tanto, próximamente, llega después, en esta versión, más adelante, no (se) puede, sin embargo,
podrás, permitirá; not yet, for now, meanwhile, later, cannot, however, will. Lo pasé por `README.md`,
`docs/diseno/README.md`, `design-system.md`, los 15 módulos de `scripts/maqueta/paginas/` (incluidas las
`sala.nota` y las filas `revisar`), `nucleo/`, `datos/` y los scripts. También busqué el vocabulario propio de
la sala: «Mírala ahora», «por mirar», «en curso», «nueva».

- **Falsas hoy:** las de A1 (portada, nota, matriz, frontmatter, notas de la mirada 5 y `control.mjs:409`), las
  de M6 (promesa de «reabierto») y M14 («más de 180»), y las de B2.
- **Promesa aplazada que es cierta, pero deja sin diseño un estado:** `control.mjs:365-366` (M2).
- **Verdaderas hoy, porque describen el estado de un objeto del producto:** «todavía no cuenta» de lo que espera
  confirmación (`evidencia.mjs:168, 292`, `propuestas.mjs:28`, `hallazgo.mjs:249`), «todavía no puede recibir
  plan» del activo sin autorización (`plan.mjs:48, 286`, `activo.mjs:44-45`), «todavía no da evidencia a
  ningún control» (`prueba.mjs:102`, `hallazgo.mjs:316`, `controles.mjs:71`), los vacíos «Todavía no hay…» y
  «no se puede» de las reglas (`activo.mjs:67, 189, 204`, `marcos.mjs:199`, `plan.mjs:308`). Todas siguen
  siendo ciertas.
- `README.md` raíz: sin coincidencias.

## 6. Casilla 5 — campos del contrato sin consumidor

Conté, por cada estructura de `datos/*.mjs`, `nucleo/brecha.mjs`, `nucleo/calculos.mjs` y
`nucleo/piezas-de-brecha.mjs`, cuántos campos tienen al menos un lector fuera de su construcción, en páginas o
tests.

| Estructura                        | Campos con lector                                             |
| --------------------------------- | ------------------------------------------------------------- |
| `MARCOS`                          | 8 de 9 (huérfano: `anterior`)                                 |
| `HERRAMIENTAS`                    | 6 de 6                                                        |
| `PRUEBAS` del catálogo            | 12 de 12                                                      |
| `DETALLE`                         | 9 de 9                                                        |
| `REGLAS`                          | 3 de 3                                                        |
| `INSTANTANEAS`                    | 4 de 4                                                        |
| `ACTIVOS`                         | todos                                                         |
| `SOBRES`                          | 11 de 11                                                      |
| `HALLAZGOS`                       | todos                                                         |
| `LOTES`                           | todos                                                         |
| `MUESTREO`, `ESCALA_IA`, `CVSS`   | todos                                                         |
| `gobierno.mjs`                    | todos                                                         |
| `validacion.mjs`                  | todos                                                         |
| Exportaciones de `mundo.mjs`      | dos sin importador: `CONTROL` y `PRUEBAS` (con `delCatalogo`) |
| Salida de `brecha()`              | 12 de 13 (huérfano: `cerrados`)                               |
| `planDe`                          | 7 de 7                                                        |
| `vistaPorControl`                 | 3 de 3, y sus filas 6 de 6                                    |
| `plazo`, `vigencia`, `antiguedad` | completos                                                     |

Los huérfanos se pagan en M7.

## 7. Casilla 6 — ninguna cifra de entidades escrita a mano

Entidades extensibles por datos según el brief y la constitución: familias, marcos, controles, herramientas y
adaptadores, escalas (reglas 7 y 10) e idiomas.

- **Literales de entidades extensibles:** `[4, 3, 2, 1]`, «de 4» y piso y techo de la escala de IA (A2);
  «cuatro familias», «cinco controles» y «cuatro marcos» (A3).
- **Arreglos que suponen la cardinalidad de hoy:** `ORDEN_DE_HALLAZGOS` (M13).
- **Bien resueltos:** filtros, cifras y opciones del catálogo (`catalogo.mjs:72-91, 112`), páginas por prueba,
  activo, hallazgo y control (`generar.mjs:37-48`), cobertura por familia (`nucleo/brecha.mjs:76`), cifras de
  validación (`tablero.mjs:52-55`), idiomas (`IDIOMAS` en el arnés; el par `{ es, en }` es regla de la casa).
- **Parámetros de vista aceptables:** las cinco secciones de navegación (`pagina.mjs:26-70`), los cuatro
  estados de control y las ocho secciones de § 12. Su número lo fijan la especificación o el diseño, no los
  datos.

## 8. Reglas duras de la constitución que aplican a esta etapa

| Regla                                 | Verificación                                                                                                                                          | Resultado                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Cero código de producto               | `git diff origin/main...HEAD --name-only -- src`                                                                                                      | **0 archivos** ✓                      |
| 3 · Frontera de contenido             | Barrido de cargas y procedimientos en datos y textos; los selectores (`pluginid`, `probe`) son identificadores, como pide E-7                         | ✓                                     |
| 11 · ISO/IEC                          | Solo identificadores y resúmenes propios (`catalogo.mjs:27-33`, `gobierno.mjs:41-51`)                                                                 | ✓, con la nota B14                    |
| 12 · Color nunca solo                 | Los estados llevan trazo SVG, texto y color (`simbolos.mjs`, `componentes.mjs`). El texto va en tinta; el color de rol solo en las marcas (`app.css`) | ✓ en estados; el botón pulsado es M16 |
| 15 · Gate con demo en rojo            | Demos D1–D9, F, G y G10–G21 en la bitácora. Revisé tres contra el código (§ 1.2)                                                                      | ✓                                     |
| 17 · Cero enlaces                     | `git grep -nE "vercel[.]app\|workers[.]dev\|pages[.]dev" -- ':!pnpm-lock.yaml'`                                                                       | **vacío** ✓                           |
| 20 · Bilingüe                         | Gate `maqueta-bilingue` en verde                                                                                                                      | ✓, con la brecha latente B11          |
| 22 · Controlador por control dibujado | `controladores-maqueta` endurecido + pasada de interacción en e2e y arnés                                                                             | ✓                                     |
| 23 · Matriz de envejecimiento         | `maqueta-envejecimiento`: hoy, la víspera y el día de cada umbral, +100 y +400 días                                                                   | ✓, con la nota B12                    |
| 1 · Determinismo, sin reloj ni azar   | `nucleo/fecha.mjs`: la fecha de consulta es una entrada                                                                                               | ✓                                     |

## 9. Herramientas y dependencias

No hay dependencias nuevas de producción (`package.json` solo cambia scripts). El generador es ESM de Node sin
dependencias, y el arnés usa el Playwright ya instalado. No propongo ninguna alternativa: ninguna sería
claramente superior.

## 10. Pendiente de la fase 6 (no son hallazgos)

Mirada 6 (G-Diseño) en el preview del PR #4 y su registro; bundle `design-sync/` en el repo; summary de la
etapa; barrido de cero enlaces después del último `git add`; `gh pr checks` con conclusión propia en
`success` de los tres checks antes del merge.

---

**Recomendación final: requiere ajustes** (0 Críticos · 3 Altos · 16 Medios · 17 Bajos).

_Aprueba la Fase 1 y fija el modelo de la Fase 2 con `/model`. Un modelo menor basta si sigue este plan al
pie. Según el procedimiento, la Fase 2 paga todos los hallazgos, Bajos incluidos, y repite la casilla 4
después del último ajuste._
