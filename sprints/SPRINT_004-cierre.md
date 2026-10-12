---
sprint: 004
app: hackguard
hito: H-1
opened: 2026-10-11
closed: 2026-10-11
branch: sprint-004/activos-y-plan
pr: https://github.com/mauriciorincon-ai/app-hackguard/pull/16
---

# Sprint 004 — Del activo al plan · cierre ejecutivo

**Objetivo y resultado:** un activo con perfil, dueño, proveedor y autorización recibe un plan calculado por código desde la instantánea `2026-10-05-010a8c56f706`, con su paquete de ejecución declarativo; `/activos/<id>` y `/activos/<id>/plan` lo muestran. **Sí.**
**Estado:** listo para el squash. CI de `8896327` (corrida 38192318974): `quality` 3 min 10 s, `e2e` 11 min 21 s (1.139 en verde, sin flaky), `lighthouse` 2 min 2 s, `un-pr-vivo` 3 s; los cuatro en `success`, leídos al final. Las dos rutas nuevas son la primera medición en CI: sin histórico no hay regresión que afirmar.
**Entregables:** validador de activos (21 reglas) · planificador puro y paquete `hackguard/paquete@1` · CLI `activo:validar` y `plan:emitir` · 3 activos demo; planes versionados del asistente (14 planeadas / 12 excluidas) y del clasificador (11 / 1); el portal no recibe plan · pantallas activo y plan con descarga del paquete · e2e de activos con axe · ADR-007 · guía bloque I · manual y CHANGELOG.
**Horas** (estimado 5 h · real 1,9 h activas · −3,1 h; piso de `horas-sprint`, medido antes del commit de cierre):

| Commits | Sesiones | Horas activas | Span                             |
| ------: | -------: | ------------: | -------------------------------- |
|       6 |        1 |         1,9 h | 2026-10-11 18:14 → 19:37 (1,4 h) |

**Fases (plan → real, h):** F1 2,5 → 0,5 · F2 1,75 → 0,2 · F3 0,75 → 1,2 (**+60 %**: causa abajo).
**No completado:** estado «en prueba» (necesita evidencia, S5) · editor de perfil y de plan · inglés en e2e (hito).
**Desviaciones:** (1) herramienta: `medido_con` antes que el orden de entornos (ADR-007) · (2) «canal» no existe en el catálogo: fuera de alcance por prueba · (3) estado derivado de si hay plan; sin «en prueba» · (4) `etiquetas.json` y `motivos.json` como datos, para que ningún componente lleve un color · (5) descarga por route handler en export estático, bytes idénticos a `datos/planes/` · (6) «Descargar el paquete» en lugar de «Ir a la carga de evidencia» (esa pantalla no existe) · (7) sin panel «Instantánea» (la maqueta no lo tiene) · (8) `aria-pressed` en la plantilla: la hoja compartida lo exige · (9) activos reales fuera del build web: `datos/privado/` no se publica.
**Causas:** la maqueta usa aritmética ilustrativa (21 pruebas, otro vocabulario de rasgos); el motor manda. F3 superó el 50 % por tres pasadas de auditoría, una caché de Turbopack corrupta (se borró `.next`) y cuatro demos en rojo que cuestan un build cada una.
**Plan del motor frente a plan de la maqueta** (script de un solo uso, fuera del repo):

| Activo       | Motor (planeadas / excluidas) | Maqueta | Solo en el motor | Pruebas en ambas con distinto veredicto |
| ------------ | ----------------------------- | ------- | ---------------: | --------------------------------------: |
| asistente    | 14 / 12                       | 11 / 4  |               11 |                                 0 de 15 |
| clasificador | 11 / 1                        | 5 / 1   |                6 |                                  0 de 6 |

**Deuda (lote del hito):** `src/components/activos/plantilla.tsx:33` `aria-pressed` en vez de `aria-expanded` (Bajo, valorado: el CSS compartido de `docs/diseno/assets/app.css:1060` lo exige) · el lote del S3 sigue abierto (M-1, M-3, M-4, M-5).
**Aprendizajes:** un atributo que una hoja compartida usa para mostrar contenido no se cambia sin mirar la hoja · cada demo de navegador cuesta un build: agrúpalas en una pasada.
**Recomendación:** squash y, para el gate del hito, abrir las pantallas de activo y plan. **Esfuerzo-beneficio:** alto (dos pantallas y el planificador en 1,9 h activas).
**Auditoría** (Sonnet 5.5 high, una pasada; segunda pasada de frases caducadas por otro subagente): C 0 · A 1 (un demo en `datos/privado/` escribía su plan en `datos/planes/`) pagado `fbe2a14` · M 4 (`--salida`, carpeta 0755, cinco textos falsos, «por su adaptador») pagados `fbe2a14` · B 10: 9 pagados (`fbe2a14`, `9314dd5`); 1 valorado (`aria-pressed`, arriba). Segunda pasada: una nota de datos falsa (`datos/planificador/plantilla.json`) pagada `9314dd5`.
**Modelo por fase:** F1 y F2 Sonnet 5.5 (medium) · F3 Haiku 5.5 (medium). **Haiku bastó para la mayoría**, pero tuvo un fallo que revertí (`aria-expanded` sin mirar la hoja) y repitió dos veces el mismo error de `sed -i` de macOS. Recomiendo Sonnet 5.5 para la próxima fase que toque CSS o shell.
**Huellas:** la maqueta no se regenera; el motor manda. Plan verificado en Node, Chromium, Firefox y WebKit (asistente `c0253ba5…c93b`, clasificador `86ef9654…6a87`); el catálogo no cambió y se lee `2026-10-05-010a8c56f706`.
**Deploy-check:** solo #16 abierto (el #15 se mergeó antes) · demos en rojo 4 de 4 · `build-como-proveedor` 97 idénticas · typecheck, lint, test con cobertura en verde local · e2e 1.139, sin flaky · `catalogo:validar` sale 1 por advertencias del catálogo intacto (la CI acepta 0 o 1) · Lighthouse: 6 URL dentro de margen · cero enlaces: árbol y homepage limpios · gitleaks sin fugas.
**Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.
