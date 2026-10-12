---
sprint: 008
app: hackguard
hito: H-1 Vitrina funcional
opened: 2026-10-12
closed: 2026-10-12
branch: sprint-008/los-agentes
pr: pendiente
---

# Sprint 008 · «Los agentes»

- **Objetivo planeado:** el investigador y el extractor existen como skills que solo proponen; todo llega a `/catalogo/propuestas`, donde una persona decide; «por decidir» deja de ser fijo.
- **Resultado:** entregado. Dos skills con subagentes y cinco hooks que solo dejan escribir en `propuestas/corridas/`; bandeja con decisiones por comando; una cuenta para «por decidir» y los avisos de versión; dos corridas reales sin decidir (INV-2026-10-12-01: 3 propuestas; EXT-2026-10-12-01: 1).
- **Estado:** completo para el alcance; desviaciones abajo. CI: pendiente de leer tras el push.
- **Fases planeadas y resultado:** F1 contrato, motor, CLI y semillas (hecho) · F2 skills, hooks, bandeja y cableado (hecho) · F3 corridas reales, e2e, guía, manual, auditoría y cierre (hecho).
- **Tiempo (`horas-sprint.mjs`):** estimado 4,25 h · real 3,0 h (F1 1,4 h / 1,5 h estimadas · F2 0,9 h / 2 h · F3 0,7 h / 0,75 h) · diferencia −1,25 h.
- **Entregables:** `src/engine/propuestas/`, `src/lib/propuestas/`, `src/cli/propuestas.ts`, `src/components/propuestas/`, `src/app/catalogo/propuestas/`, `scripts/propuestas/`, `.claude/{agents,skills}/`, `datos/propuestas/`, `decisions/011`, `propuestas/corridas/` (dos corridas reales), manual ES/EN, bloque M de la guía.
- **No completado:** pegar un documento al investigador (RF-07.2b); severidad sugerida y propuestas sobre activos reales (fuera de alcance).
- **Desviaciones:** RF-07.2b parcial · `propuestas:leer` es un comando nuevo · la frontera de `decidir` (no corre en una sesión de Claude Code ni sin terminal) es defensa añadida · el retiro existe como propuesta sin efecto automático · demos: 9 en F2 más 3 en F3 (un gate propio nuevo cada una) · la auditoría de una pasada pagó sus Altos sin esperar la aprobación de la Fase 1, por la regla del kickoff.
- **Auditoría (una pasada, Sonnet independiente, 4 casillas):**
  - Alcance: requiere ajustes; el Medio va al lote. F1 y F2 completas.
  - Calidad y seguridad: 2 Altos, pagados · candado de lectura (mayúsculas y globs sobre `datos/privado`) · `7b86c04` · fuentes sin par en la consulta · `dbe4284`.
  - Frases caducadas: Medio y Bajos al lote.
  - Campos sin lector y gates: Medios y Bajos al lote.
- **Lote del hito (medios y bajos, `archivo:línea`):**
  - RF-07.5 · `src/engine/propuestas/avisos.ts:31-35`, `verificar.ts:327-377` (el aviso no exige que la versión esté en un fragmento verificado).
  - Filtro · `verificar.ts:341` y `datos/propuestas/instrucciones.json` (no escanea las páginas leídas).
  - Citas · `citas.ts:62-71`, `veredicto.ts:57-67`, `decisiones.ts:315-331` (métrica, fecha, versión y zona sin cita).
  - Campos sin lector y señales constantes · `esquemas.ts:315,449,459`, `verificar.ts:384,395,448,459`.
  - Textos · `marcos-pantalla.tsx:448-452`, `docs/MANUAL-DE-USO.md:410,826`, `docs/diseno/README.md:287`, `vista.ts:122`.
  - Hooks, CLI y carga · `entrada.mjs:20-27` y `.claude/agents/*.md` (sin `node` el hook da 1, no 2), `buscar.ts:114` y `cli/propuestas.ts:204` (sin timeout), `cargar.ts:223` (JSON sin try), `cli/propuestas.ts:355-372` (validar necesita `.lecturas/`), `frontera.ts:32-40`, `marcos.ts:133-136`.
  - Pruebas · `tests/e2e/propuestas.spec.ts` (solo recorre «rechazar»), `hooks.test.ts:711-716` (comprueba texto, no conducta).
- **Verificación:** `pnpm test` 130 archivos y 2748 pruebas en verde (`engine/propuestas` 100 % líneas, 95,9 % ramas) · lint y tipos en 0 · `pnpm build` y `build-como-proveedor` (115 páginas) en verde · e2e completo 1235 en verde antes de la auditoría (1 saltado por diseño: el PDF del informe) · e2e de propuestas 14 de 14 · barrido a 380 px de la guía y de la bandeja sin desbordes.
- **Aprendizajes reutilizables:** un test que fija cifras del mundo entero se rompe al versionar datos reales (fijar la demo). Una fuente se verifica por su par dirección+huella de la consulta, nunca por su fragmento.
- **Recomendación:** pagar el lote del hito, RF-07.5 primero; decidir si el investigador recibe documentos pegados (RF-07.2b).
- **Modelo por fase y relevos:** F1 y F2 Sonnet 5.5 · F3 Haiku 5.5, que bastó para e2e, guía, manual y los arreglos de auditoría (un test del candado no discriminaba y se corrigió en la segunda pasada). Relevos: ninguno.
- **Huellas:** no aplican (el catálogo y el planificador no cambiaron).
- **Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.
