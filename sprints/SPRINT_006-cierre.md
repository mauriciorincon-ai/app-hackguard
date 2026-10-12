---
sprint: 006
app: hackguard
hito: H-1 Vitrina funcional
opened: 2026-10-12
closed: 2026-10-12
branch: sprint-006/carga-de-evidencia
pr: abierto al cierre (ver GitHub)
---

# Sprint 006 · «La carga de evidencia»

- **Objetivo planeado:** el reporte de Garak o ZAP de una corrida del plan entra como lote de sobres que una persona confirma (todas las fallidas y parciales, más una muestra del resto).
- **Resultado:** entregado. Adaptadores, lotes con libro efectivo, CLI, pantalla `/evidencia/carga`, gates y 8 demos en rojo.
- **Estado:** completo para el alcance del plan. PR abierto; checks de CI pendientes de leer al final.
- **Tiempo estimado / real / diferencia:** 3,5 h (plan) · 2,0 h (script) · -1,5 h. El script mide commits: no ve el tiempo sin commit de las sesiones (hubo un compact).
- **Fases planeadas y resultado:** F1 adaptadores, lotes, libro, CLI (hecho) · F2 pantalla y demos (hecho) · F3 e2e, documentos, auditoría y un arreglo (hecho).
- **Tiempo por fase (script / estimado):** F1 0,9 h / 1,75 h · F2 0,5 h / 1 h · F3 0,7 h / 0,75 h.
- **Entregables:** `src/engine/adaptadores/*`, `src/engine/lotes/*`, `src/lib/evidencia/*`, `src/components/carga/*`, `src/app/evidencia/carga`, `src/cli/evidencia.ts`, ADR-009, fixtures con `MANIFIESTO.json`, LOTE-0007 y LOTE-0008, `tests/e2e/carga.spec.ts`, manual, guía (bloque K), CHANGELOG.
- **No completado:** pegar texto y leer el archivo en el navegador (la pantalla lo dice); estadísticas de ZAP probadas con un reporte real; e2e en inglés (cierre del hito).
- **Desviaciones:** umbral de Garak 0,5 supuesto y contrastado con sus líneas `eval` (el paquete no lo trae; planes intactos) · confirmación por lote en `lote@1` con libro efectivo en memoria (el sobre no admite `modo: "lote"`) · tramos 22/25/26/29 (el 24 de la maqueta no cumple el 5 %) · LOTE-0007 usa PR-IA-CONT-001 y LOTE-0008 ZAP 2.17.0 · carpetas `datos/lotes/demo` y `datos/privado/lotes` · etiquetas en `etiquetas-de-carga.json`.
- **Causas:** el reporte de Garak no trae umbral y el sobre fija `confirmacion.modo` en `"individual"`; ADR-009 los registra.
- **Decisiones:** ADR-009. Ninguna mirada de DECISIÓN.
- **Deuda (medios y bajos, al lote del hito, con `archivo:línea` en `sprints/SPRINT_006-auditoria.md`):** B2 re-prueba confirmable por lote sin revisión obligatoria · B3 manual EN falso · B4 manual sin el aviso de activo propio · B5 LOTE-0008 no es lo que produce `importar` · B6–B14 bajos · deuda de pruebas: tres pruebas de tiempo (`catalogo-ficha`, `evidencia/cli`, `lotes/cli`) con timeout explícito porque la máquina cargada pasa de 5 s; la causa de carga no está resuelta.
- **Aprendizajes:** una cobertura que se recalcula con el estado vivo rompe el build al cerrarse un hallazgo (B1); se decide al confirmar y se verifica con cualquier estado. Un test de fecha se escribe leyendo el estado que calcula el motor.
- **Recomendación para el siguiente:** primero B2 en el lote del hito (re-pruebas en lotes); después una prueba real de ZAP.
- **Esfuerzo-beneficio:** alto. El libro cuenta lotes sin tocar el formato del sobre; el costo fue la muestra exacta y los dos adaptadores.
- **Auditoría (4 casillas, registro completo en `sprints/SPRINT_006-auditoria.md`):** 1 alcance, completo con dos desviaciones no declaradas (B5, B12), al lote · 2 calidad y seguridad, **B1 alto pagado · e1eb3c8** (tipos en 1847959) con regresión que falla antes del arreglo; medios y bajos al lote · 3 frases caducadas, B3 falsa y B13 al lote · 4 campos sin consumidor, bajos, al lote.
- **Modelo por fase, relevos y fases pasadas del 50 %:** F1 Sonnet 5.5 · F2 Sonnet 5.5 · F3 Haiku 5.5, sin desvío; Haiku bastó para F3 (piloto 2 de 3); relevos: ninguno; ninguna fase pasó del 50 %.
- **Demos en rojo (F2):** 8 de 8 (contrato de Garak, contrato de ZAP, `no_ejecutada`, muestra solo en navegador, ataque reintroducido, `revisados` editado, fidelidad, regla 12). Tras restaurar: 28 · 26 · 26 · 11 · 69 · 9 · 5 · 21 pruebas en verde. Los scripts están fuera del repo.
- **Verificación local:** `pnpm test` 103 archivos, 2268 pruebas, líneas 97,9 %; build y build como proveedor (102 páginas idénticas); e2e de carga y hallazgos 48/48 en escritorio y móvil; peers, regla 18, cero enlaces, gitleaks; `pnpm audit`: 1 alta ignorada (GHSA-vfj7, ADR-001, previa). Huellas: no aplican, sin cambios en catálogo ni planificador.
- **Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.

```
Salida resumida de scripts/horas-sprint.mjs (origin/main..HEAD): 5 commits · 1 sesión · 2,0 h activas · 07:56 → 09:28 · F1 0,9 h · F2 0,5 h · F3 0,7 h
```
