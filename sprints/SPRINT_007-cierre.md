---
sprint: 007
app: hackguard
hito: H-1 Vitrina funcional
opened: 2026-10-12
closed: 2026-10-12
branch: sprint-007/la-brecha
pr: abierto al cierre (ver GitHub)
---

# Sprint 007 · «La brecha»

- **Objetivo planeado:** la evidencia confirmada se lee como brecha: esperado contra obtenido, cobertura por activo, familia y control, vista por control con su cadena de cierre, informe imprimible y tablero, todo desde un solo cálculo.
- **Resultado:** entregado. Motor de brecha con huella, cinco pantallas sobre ese cálculo, B2 pagada, matriz de envejecimiento, semillas de C18, e2e, manual, guía, 8 demos en rojo.
- **Estado:** completo para el alcance. PR abierto; checks de CI al final.
- **Tiempo estimado / real / diferencia:** 5,5 h (plan; el archivo dice 4 h) · 3,0 h (script) · -2,5 h. El script solo mide commits.
- **Fases planeadas y resultado:** F1 B2, motor, matriz, semillas (hecho) · F2 cinco pantallas y demos (hecho) · F3 e2e, manual, guía, auditoría, cierre (hecho, con una corrección de la auditoría).
- **Tiempo por fase (script / estimado):** F1 0,5 h / 1,25 h · F2 0,5 h / 2 h · F3 2,0 h / 0,75 h.
- **Entregables:** `src/engine/{brecha,instrumento}/`, `src/engine/lotes/revision.ts` (B2), `src/lib/brecha/`, `src/components/{brecha,tablero,control,informe}/`, cinco páginas, `datos/brecha/`, `docs/kit-de-prueba/semillas-de-cierre/`, `tests/e2e/brecha.spec.ts`, ADR-010, manual ES/EN, guía bloque L, CHANGELOG.
- **No completado:** e2e y capturas en inglés (cierre del hito); bandeja de propuestas (sin pantalla); un control en evidencia antigua en la demo (ver desviaciones).
- **Desviaciones:** umbral de 180 días en `datos/brecha/umbrales.json` · re-prueba confirmada que no cierra = `re_probado` · «ejecutada» = superada, fallida o parcial · marcos con versión nueva = «sin registro de la fuente» · banda del tablero con las 2 comprobaciones que corre el motor (RF-10.3 y E-6), no las 5 ilustrativas · e2e sin «un control en cada estado»: en la fecha del build ningún control está en evidencia antigua; la matriz de 21 fechas lo construye · guía: pasos ⭐⭐ numerados 1 a 21 · manual EN: faltaba la fila 006 (añadida).
- **Causas:** la demo no llega al umbral de 180 días; la numeración de la guía se perdió en S3 a S6 al añadir bloques.
- **Decisiones:** ADR-010 (definiciones de la brecha y del estado de un control). Ninguna mirada de DECISIÓN.
- **Deuda (medios y bajos, al lote del hito):** M1 `src/engine/brecha/calcular.ts:351-358,389-396` fila con última falla sin hallazgo queda vigente · M2 `src/lib/brecha/vista.ts:62` el filtro «Fallida» no cuenta parcial ni no aplicable · M3 `src/components/control/control-pantalla.tsx:218`, `src/components/brecha/piezas.tsx:380` claves duplicadas si una prueba está en dos activos · M4 `src/lib/brecha/vista.ts:847`, `src/components/informe/informe-pantalla.tsx:420-425` fecha de cierre falsa · B1 `src/lib/brecha/vista.ts:625-631` · B2 `src/engine/instrumento/cierres.ts:177-182` sin guarda por fecha · B3 `src/components/tablero/tablero-pantalla.tsx:62` rótulo «sin cerrar» · B4 `src/lib/brecha/vista.ts:324-330,379-401` textos en código · C1 `docs/MANUAL-DE-USO.md:119,515` «solo algunas vistas» es falsa · C2 `:150-152,547-548` secuencia · C3 `:252,648` · C4 `:360,752` fecha de consulta · huérfanos: `calcular.ts:94-99,123,137,153,177,314,339-347,360,384-387,448`, `tipos.ts:24,146,246`, `version_nueva` en `datos/brecha/etiquetas.json` y `esquemas.ts:30`.
- **Aprendizajes:** un texto que promete un bloqueo necesita su gate: el build no se detenía con una semilla roja, y la auditoría lo cazó. El e2e a 380 px encontró un desborde que el gate de fidelidad no ve.
- **Recomendación para el siguiente:** pagar M1 (qué cuenta una falla sin hallazgo) y M2 en el lote del hito, antes del gate humano.
- **Esfuerzo-beneficio:** alto. Una sola cuenta para cinco pantallas; el costo fue la matriz de fechas y el e2e.
- **Auditoría (4 casillas; auditor independiente, Sonnet 5.5, solo lectura):** 1 alcance: completo, dos desviaciones declaradas · 2 calidad: **A1 alto pagado · afcdacb** (un texto prometía que el instrumento bloquea el build; ahora lo bloquea); M1–M4 y B1–B4 al lote · 3 frases caducadas: la de A1 pagada, C1–C4 al lote (la barrida de F3 no las vio) · 4 campos sin consumidor: 9 grupos de huérfanos al lote. Herramientas: sin hallazgos. Protecciones del sistema: no se tocan.
- **Modelo por fase y desvío:** F1 Sonnet 5.5 · F2 Sonnet 5.5 · F3 Haiku 5.5, sin desvío de modelo. Haiku bastó para F3 (piloto 3 de 3; quedarse lo decide el usuario).
- **Fases pasadas del 50 %:** F3 (0,75 h → 2,0 h). Causa: el e2e encontró un desborde a 380 px en la tarjeta de F2, un revelador que el test no abría y la numeración de la guía heredada. Medida: el barrido de 380 px y el «Parada N de M» entran al criterio de cada fase que construye una pantalla o una guía.
- **Relevos:** ninguno. Una vez, un pánico interno de Turbopack cortó el e2e completo; con `.next` limpio pasó 1235 de 1235 y no volvió a salir.
- **Demos en rojo (F2):** 8 de 8, todas volvieron a verde: B2 · cifra distinta entre pantallas · «no detectado» contado · fecha de la matriz · cierre prohibido que pasa · fidelidad · regla 12 · huella solo de navegador (mínimos 72 · 22 · 35 · 45 · 14 · 23 · 11 · 24). F3: semilla rota → el build se detiene con código 1 y nombra la semilla.
- **Verificación:** `pnpm test` 112 archivos, 2417 pruebas; lint y typecheck limpios; e2e completo 1235 pasan y 1 se salta (el PDF en móvil, a propósito); build y build como proveedor idénticos; `verificar-dependencias` limpio; `pnpm audit`: 1 alta ignorada por ADR-001; gitleaks sin hallazgos. Puerto 3000 ocupado en esta máquina: `E2E_PUERTO=3217` (entorno, no código).
- **Horas (`scripts/horas-sprint.mjs`, antes de la fila de relevos):** 4 commits · 1 sesión · 3,0 h activas · 10:38 → 13:08 · F1 0,5 h · F2 0,5 h · F3 2,0 h.
- **CI:** pendiente de leer al abrir el PR; se completa después.
- **Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.
