---
sprint: 003
app: hackguard
hito: H-1
opened: 2026-10-11
closed: 2026-10-11
branch: sprint-003/marcos-controles
pr: https://github.com/mauriciorincon-ai/app-hackguard/pull/13
---

# Sprint 003 — Marcos y controles · cierre ejecutivo

**Objetivo y resultado:** `/catalogo/marcos` y `/catalogo/controles` leen la instantánea oficial; la lista pagina de 20 en 20; ADR-006 retirado; regla 18 (un solo PR vivo) en la CI y en la ruleset. **Sí**, con una desviación de causa (ver «Desviaciones»).
**Estado:** listo para el squash. CI de `e419654` (corrida 38178317363): `quality` 2 min 55 s, `e2e` 7 min 9 s, `lighthouse` 2 min 7 s, `un-pr-vivo` 3 s; los cuatro en `success`, leídos al final. Las páginas nuevas corren por primera vez en CI: sin histórico no hay regresión ni no-regresión que afirmar.
**Entregables:** `/catalogo` paginada (20 por página, «n de N», filtro «herramienta») · `/catalogo/marcos` (14 marcos, mapa `owasp-llm-2025-a-2026`) · `/catalogo/controles` (9 áreas, 38 controles, 10 pruebas sin control) · kit v2.1.0 con `un-pr-vivo` · Lighthouse de 4 rutas · e2e en español + axe · manual ES/EN, guía bloque H, CHANGELOG · ADR-006 `superseded` · 1.419 pruebas unitarias, 1.097 e2e, 91 páginas idénticas a `out/`.
**Horas** (estimado 4 h · real 2,1 h activas · −1,9 h; `horas-sprint` es un piso y se midió antes del commit de cierre):

| Commits | Sesiones | Horas activas | Span                             |
| ------: | -------: | ------------: | -------------------------------- |
|      10 |        2 |         2,1 h | 2026-10-11 11:27 → 16:55 (5,5 h) |

| Fase | Commits | Horas activas |
| ---- | ------: | ------------: |
| F1   |       6 |         1,3 h |
| F2   |       2 |         0,2 h |
| F3   |       2 |         0,6 h |

**Fases (plan → real, h):** F1 1,25 → 1,3 · F2 2 → 0,2 · F3 0,75 → 0,6. Ninguna pasó el 50 % por encima.
**No completado:** «versión más nueva», propuestas e historial de la maqueta no están en la instantánea: la pantalla dice «sin registro», no se simula. La vista por control no existe como pantalla. La maqueta no se regeneró (fuera de alcance).
**Desviaciones:** (1) ADR-006 se retiró por otra vía: import dinámico de Sentry (chunk principal 465 → 228 KB) y calentamiento del servidor en CI; la paginación sola dio LCP 3.151 ms y TBT 354 ms; la mitigación del riesgo 1 (solo idioma activo) no se aplicó. (2) `perf-budget.json` con `/*` por defecto, sin entradas por ruta. (3) Filtro «herramienta» sobre `resultado_esperado.medido_con`, no sobre `herramientas_recomendadas`. (4) Ruleset `main-protegida` editada con `gh api -X PUT` para sumar `un-pr-vivo`. (5) `rechazadasDe` sin lector de producción.
**Causas:** paginar no quitó coste: las filas 21+ siguen en el DOM. El TBT venía del chunk de Sentry al arrancar; y la primera medición de un servidor recién levantado sale fría (demostrado invirtiendo el orden de las URLs).
**Demos en rojo:** `un-pr-vivo` → PR #14 rojo «Hay 2 PRs abiertos ([14,13])», cerrado, rama borrada · e2e «Sin avisos registrados» · fidelidad marcos «Avisos de versión» · fidelidad controles «Qué exige, con palabras propias». Cada una nombró lo esperado y volvió a verde.
**Auditoría** (Sonnet 5.5 high, una pasada, 4 casillas): C 0 · A 0 → «listo para cierre». Pagados en `e419654`: M-2 (`until` sin límite en `ci.yml`), M-6, M-7, B-6, B-7, B-9. Lote del hito (líneas al commit `1a3268c`): M-1 `instrumentation-client.ts:12,36-39` import de Sentry sin `.catch` ni prueba con DSN · M-3 colores de estado escritos en `controles-pantalla.tsx:14-19,110-114,134-142,175-183` y `marcos-pantalla.tsx:171,390-399,472-478` · M-4 `src/components/catalogo/paginacion.tsx` foco perdido al paginar (WCAG 2.4.3) · M-5 `docs/GUIA-DE-PRUEBA.html:439` «solo cambian los datos», ya falso.
B-1 `src/lib/catalogo/paginacion.ts:4`, `lista-filtrable.tsx:20-27` comentarios obsoletos · B-2 `Cabeceras` duplicada en `marcos-pantalla.tsx:27` y `controles-pantalla.tsx:21` · B-3 `tests/unit/marcos-controles-pantalla.test.tsx:~52` aserción trivial · B-4 `src/lib/catalogo/marcos.ts:135` `find(...)!` sin mensaje · B-5 `marcos-pantalla.tsx:351-354` «Fuente no accesible» junto a «Verificado hace N días» · B-8 `src/components/catalogo/estado-vacio.tsx:16` (S2) · B-10 `docs/GUIA-DE-PRUEBA.html:231` · B-11 `src/lib/catalogo/rechazadas.ts:16` y campos sin lector en `controles.ts:39,47,50` y `marcos.ts:150`.
**Modelo por fase:** F1 y F2 Sonnet 5.5 (medium) · F3 Haiku 5.5 (medium). **Haiku bastó:** tres problemas distintos (desborde a 380 px, nombre accesible de la barra móvil, caché de Turbopack), ninguno repetido dos veces. Auditor Sonnet 5.5 high.
**Huellas de la instantánea:** n/a; el sprint no tocó `datos/` ni `src/engine/` y lee `2026-10-05-010a8c56f706`.
**Deploy-check** (cada casilla con su job): solo #13 abierto · `un-pr-vivo` en la ruleset · CI `success` en `e419654` · typecheck, lint, `test` con cobertura, `catalogo:validar`, `build-como-proveedor` (91 idénticas) y `pnpm audit` en `quality` · e2e 1.097 en verde · Lighthouse 4 rutas · cero enlaces: árbol y homepage limpios tras el último `git add` (la única coincidencia es la lista de dominios de `cero-enlaces.json`).
**Aprendizajes:** un `until` en CI necesita límite y salida visible · la primera medición de un servidor es fría; mide el orden antes de culpar a la página. **Recomendación:** pagar M-1 y M-4 al abrir el hito; decidir en el gate si la vista por control entra al S4. **Esfuerzo-beneficio:** alto; dos páginas y la lista paginada en 2,1 h activas.

**Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.
