---
sprint: 005 · app: hackguard · hito: H-1 · opened: 2026-10-11 · closed: 2026-10-11 · branch: sprint-005/sobre-al-hallazgo · pr: pendiente
---

# Sprint 005 — «Del sobre al hallazgo»

**Objetivo:** un resultado confirmado abre un hallazgo con severidad, plazo y ciclo de vida que solo una re-prueba válida cierra. **Resultado:** cumplido. **Estado:** listo para PR.

**Horas** (`node scripts/horas-sprint.mjs`):

| Commits | Sesiones | Horas activas | Span                                        |
| ------: | -------: | ------------: | ------------------------------------------- |
|      10 |        1 |         1,8 h | 2026-10-11 22:16 → 2026-10-11 23:35 (1,3 h) |

| Fase                    | Commits | Horas activas | Estimado | Modelo     |
| ----------------------- | ------: | ------------: | -------: | ---------- |
| F1 libro y hallazgos    |       1 |         0,5 h |   1,25 h | Sonnet 5.5 |
| F2 severidad y pantalla |       5 |         0,8 h |    1,5 h | Sonnet 5.5 |
| F3 evidencia y cierre   |       4 |         0,5 h |   0,75 h | Haiku 5.5  |

**Diferencia:** 3,5 h estimadas, 1,8 h reales (−49 %). El script mide commits y no ve el trabajo sin commit.

**Verificación:** 2 058 unitarias (cobertura 97,8 / 92,1 / 97,7 / 98,0) · e2e 1 172 pasan, 0 fallos, 0 flaky · determinismo igual en 4 motores · corpus CVSS 578 860 vectores, 0 diferencias · proveedor 101 páginas idénticas · cero enlaces limpio · catálogo, planes, planificador y HTML de la maqueta sin cambios.

**Auditoría** (3 auditores Sonnet 5.5, solo lectura): 1) alcance y textos: CHANGELOG ausente y frases caducadas, pagado · a66b419. 2) Calidad: un cierre se apoyaba en una re-prueba que otro sobre corregía, y `hallazgos-declarar` reabría un cerrado (Medio, subido a Alto por la regla 6), pagado · d99146f. 3) Dependencias limpias. 4) Frases caducadas: dos altos, pagado · a66b419. No corridas: contrato sin consumidor (`extracto_redactado` lo lee solo el motor; la pantalla llega en S6) y protecciones del sistema (no aplica).

**Deuda al lote del hito:**

- M `tests/e2e/hallazgos.spec.ts:98-108`: rompe desde builds con commit ≥ 2026-12-05 (pagar antes).
- M `src/lib/evidencia/vista.ts:449-458` y `hallazgo-pantalla.tsx:453`; M `docs/MANUAL-DE-USO.md:268,591,252,575,119,442,349`.
- B `src/cli/evidencia.ts:464-471,395-413`; B `cargar-evidencia.ts` (`escribirDato`); B `ciclo.ts:119,134`; B `validar.ts` y `esquemas.ts:45,51-53`; B `veredicto.ts:45`.
- B `piezas.tsx:28`; B `hallazgo-pantalla.tsx:50,238,260-264,369`; B `docs/GUIA-DE-PRUEBA.html:200,540`; B `docs/diseno/README.md` (métricas); B `docs/MANUAL-DE-USO.md:267,590`.

**Desviaciones:** CHANGELOG en `docs/CHANGELOG.md` (el de la raíz es del kit) · «Cómo se calculó» solo en CVSS (la maqueta de IA tampoco) · sobres demo con fechas de maqueta anteriores al plan (advertencia) · re-prueba con versión exacta y selector · por auditoría, `hallazgos-declarar` bloquea decisiones sobre cerrados.

**Modelo y relevos:** F1 y F2 Sonnet 5.5 (`/model sonnet`); F3 Haiku 5.5 (`/model claude-haiku-5-5`, gate verificado). **Haiku bastó** en F3: e2e de 15 verde al primer intento y una pasada de arreglos sin relevo (piloto 1 de 3). **Relevos:** ninguno.

**Aprendizaje:** la re-prueba corregida por otro sobre pasaba 337 unitarias; los tests de rechazo deben cubrir el reemplazo. **Siguiente:** pagar el test de fecha antes del 2026-12-05.

Para mergear: squash y borrar la rama; después `/cierre-sprint hackguard`.
