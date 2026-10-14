---
sprint: 009
app: hackguard
hito: H-1 Vitrina funcional
opened: 2026-10-13
closed: 2026-10-13
branch: sprint-009/listo-para-el-gate
pr: 23
---

# Sprint 009 · «Listo para el gate»

- **Objetivo planeado:** cerrar el H-1: la deuda media y baja de S2 a S8 pagada, la arquitectura as-built, la ficha para CV Viva con cifras de comandos, el flujo principal también en inglés y la guía lista para el gate.
- **Resultado:** entregado salvo una decisión tuya. Lote de 130 filas: 95 pagadas con su sha y su test, 26 «ya no aplica», 9 «imposible» con razón y sitio, 0 abiertas. BLUEPRINT, índice de ADR, design-system 1.1.0, export de 18 funciones, brochure en `/conoce` con política por huella, e2e en inglés y «Gate del H-1» (29 paradas).
- **Estado:** completo, con una fila de auditoría abierta por tu decisión (S9-E-M2). CI (PR #23, leída al final): {CI}.
- **Fases planeadas y resultado:** F1 lote de código (hecho) · F2 documentos del hito y `/conoce` (hecho) · F3 inglés, guía, auditoría de una pasada y cierre (hecho).
- **Tiempo (`horas-sprint.mjs`, 40 commits, 2 sesiones):** estimado 7,75 h · real 4,3 h (F1 2,2 / 4 · F2 0,4 / 2 · F3 1,7 / 1,75) · diferencia −3,45 h. La heurística cuenta huecos ≤ 2 h y subestima: el span fue de 18,7 h.
- **Entregables:** lote en `sprints/SPRINT_009-lote.md`; `docs/{BLUEPRINT,BROCHURE,BROCHURE-guion,brochure-export}`, `decisions/README.md`, `design-system.md`; `scripts/{cifras-del-export,csp-del-brochure}.mjs`; `tests/e2e/{flujo-en,conoce}.spec.ts`; bloque H1 de la guía; manual ES/EN con `aportar` y `/conoce`.
- **No completado:** S9-E-M2 (`src/cli/propuestas.ts:277-385`): `aportar` acepta documentos de ISO/IEC 42001, cuya licencia no deja reproducir texto; decides tú (rechazar el marco o anotarlo en ADR-011).
- **Desviaciones:** guion del brochure sin mirada a mitad de sprint (P2 del G-Plan: va al gate con la pieza) · el gate ⭐⭐ declara 56 min, no ≈ 20: se propone partirlo en dos sesiones · S9-R9 y S9-R10, dos brechas de la constitución, «imposible» con sitio (lista blanca del paquete público → H-2; selectores por adaptador → quinto adaptador) · S3-B11 a medias y S5-7b imposible (formato de ADR-007 congelado) · S7-B3 estaba contada como pagada y era «ya no aplica» · CLAUDE.md: la línea de estructura dice design-system 1.1.0 · el candado impide a Claude correr `aportar`: se probó por test con el entorno de una persona, no por comando.
- **Auditoría (una pasada, 3 auditores Sonnet independientes, 221 archivos, 53 hallazgos, ningún Crítico):**
  - Alcance y textos: 2 Altos y 16 Medios y Bajos, pagados (`0e343f0`, `e5af179`); el gate de 56 min queda declarado en la guía y arriba.
  - Motor, contratos y gates: 3 Altos pagados (A1 filtro de órdenes `bd0c548` · A2 comando de confirmar `0e343f0` · A3 prosa del export `a48907e`); 8 Medios y 13 Bajos: pagados `30676b3 7cb97f3 ee1a0f3 89315a8 5f438df da4b75c`; abierto M2; B6 imposible (zod en el bundle del cliente, ADR-006).
  - UI, idioma, accesibilidad y privacidad: 2 Medios y 9 Bajos pagados (`e5af179`, `0e343f0`).
  - Frases caducadas y campos sin lector: 6 frases nuevas entran a `frases-caducadas.test`; el gate de campos se ancla a la variable que lee cada nombre.
- **Lote del hito (deuda que queda):** solo S9-E-M2. Fuera del repo: el generador del brochure vive en el scratchpad y no se versiona; la comparación de bundle contra `main` no se corrió (la cubre `lighthouse` en la CI).
- **Verificación:** `pnpm test` 153 archivos, 3076 pruebas, 97,53 % de líneas · lint y tipos en 0 · e2e completo 1293 en verde, 1 saltada por diseño, 0 flaky · `build-como-proveedor` 116 páginas idénticas · `pnpm audit --audit-level high` en 0 (excepción de ADR-001) · cero enlaces limpio · 26 demos en rojo con `demo-rojo.sh` en F3 (por fila en el lote) · barrido a 380 px: 20 capturas EN y la guía, 0 px de desborde · capturas EN leídas como imagen: tablero, ficha, plan; la de propuestas y la de brecha a 380 px salieron demasiado altas para leerse y no cuentan como leídas.
- **Aprendizajes reutilizables:** un test pasaba en mi máquina porque existían los derivados de build que git ignora (`out/`, `public/conoce/`, `propuestas/.lecturas/`) y falló en la CI sobre un checkout limpio: ahora solo perdona lo ausente que git ignora (`b6fb23b`). una mutación que rompe el hash de una CSP deja la página sin hoja y el test «pasa» sin medir nada: la demo recalcula la cabecera y el test comprueba primero que la hoja se aplica. Un auditor por superficie halló tres Altos de producto reales que ningún test veía (una orden partida por un salto de línea, un comando que el propio CLI bloqueaba, una prosa que contaba cuatro familias).
- **Recomendación:** decidir M2 antes del merge; recorrer el gate del H-1 en dos sesiones; después H-2 si hay un uso real.
- **Modelo por fase y relevos:** F1 y F2 Sonnet 5.5 · F3 Haiku 5.5 (e2e en inglés, manual, guía y los pagos acotados; bastó para eso). **Relevos: 1**, Haiku → Sonnet 5.5, pedido por el builder para los pagos de auditoría de código no trivial que el plan de F3 preveía (verificación de propuestas, validadores, export): Haiku no era el modelo para esos.
- **Huellas:** la instantánea oficial no cambió (sin diff en `datos/instantaneas/`); el e2e de determinismo da en Chromium, Firefox y WebKit lo mismo que Node; la corrida real `INV-2026-10-12-01` se volvió a sellar (`ce357fc4…` → `9331fd9e…`) porque cambió la regla del filtro.
- **Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`. PRs abiertos al pedir el merge: {ABIERTOS}.
