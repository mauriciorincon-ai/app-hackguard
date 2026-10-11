---
sprint: 002
app: hackguard
hito: H-1
opened: 2026-10-10
closed: 2026-10-11
branch: sprint-002/catalogo-navegable
pr: https://github.com/mauriciorincon-ai/app-hackguard/pull/9
---

# Sprint 002 — El catálogo navegable · cierre ejecutivo

**Objetivo y resultado:** el catálogo del S1 se recorre en pantalla, fiel a la maqueta. **Sí**, con una desviación de rendimiento (ADR-006). **Estado:** listo para el merge; CI de `187ddf6` (corrida 38118867050) con `quality` 2 min 49 s, `e2e` 7 min 48 s y `lighthouse` 1 min 28 s, los tres `success`. `lighthouse` y el e2e del catálogo corrían por primera vez: sin histórico no hay regresión ni no-regresión que afirmar.
**Entregables:** kit v2 (constitución, comandos, `horas-sprint`, `cero-enlaces` en `quality`) · cascarón «consola» con tema e idioma · `/catalogo` y 38 fichas desde la instantánea oficial, con la fecha del commit como consulta · AU-14 pagada (instantánea `010a8c56f706`) · manual, guía (bloque G), CHANGELOG, ADR-006 · 1.354 pruebas unitarias, 1.069 e2e, 89 páginas idénticas a `out/`.
**Horas** (estimado 8 h · real 2,6 h · −5,4 h; el script es un piso: no ve lectura ni pausas):

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, heurística git-hours: huecos ≤ 2 h + 0,5 h por sesión)

| Commits | Sesiones | Horas activas | Span (primer → último commit) |
|---:|---:|---:|---|
| 13 | 1 | 2,6 h | 2026-10-10 23:36 → 2026-10-11 01:40 (2,1 h) |

| Fase | Commits | Horas activas |
|---|---:|---:|
| F1 | 2 | 0,5 h |
| F2 | 4 | 1,1 h |
| F3 | 7 | 1,0 h |

**Fases (plan → real, h):** F1 2,5 → 0,5 · F2 4 → 1,1 · F3 1,5 → 1,0; ninguna pasó el 50 % por encima. **No completado:** el filtro «herramienta» (la maqueta no lo tiene) y la pantalla de error (un catálogo inválido rompe el build en vez de mostrarse).
**Desviaciones y decisiones:** seis filtros de la maqueta · gate de fidelidad renderizado en Vitest, no sobre `out/` · consulta = fecha del commit, no `datos/consulta.json` · raíz redirigida por `vercel.json`/`serve.json` · sin `noindex` (el SEO caía a 0,6) · presupuesto propio de `/catalogo` (LCP 3,8 s, TBT 1.000 ms, rendimiento ≥ 0,75, ADR-006) tras medir en CI LCP 3,2–3,3 s y TBT 378–709 ms; hidratar menos no lo arregló · subnavegación de Catálogo con «pronto».
**Causas:** tabla densa de 38 filas con los dos idiomas en el DOM (≈2.200 elementos); el LCP simulado cuenta el script del marco. **Mirada de FIDELIDAD:** «la idea en general está perfecta»; la diferencia que señaló en «Todas» no la precisó (`docs/diseno/README.md:195`).
**Auditoría** (Sonnet 5.5 high, 4 casillas): 0 críticos, 1 alto (A-1, `lighthouse` rojo) `pagado · 187ddf6`; M-1, M-2, M-4, M-6, M-7, M-10, B-1, B-2 pagados · `6ebd8d8`. El auditor dijo «requiere ajustes» solo por A-1; con A-1 pagado no queda ningún C/A abierto.
**Demos en rojo** (`demo-rojo.sh`): tintas vetadas (2 mutaciones, 4 de 4) · cero enlaces (nombró `README.md`) · fidelidad (nombró «las cabeceras…», 7 de 7) · e2e de filtros (nombró «un filtro reduce la lista», 8 de 8).
**Deuda M/B → lote del hito:** M-3 `src/lib/catalogo/vista.ts:123` («revisada y aprobada» sale «limpia») · M-5 mirada de «Todas» · M-8 `tests/e2e/catalogo.spec.ts:37` (38 y «sin marcadas» cableados) · M-9 `src/lib/catalogo/etiquetas.ts:7`, `ficha.tsx:32`, `simbolo.tsx:113` (dominio en código) · M-11 `ficha.tsx:69`, `estado-vacio.tsx:16` (citan al investigador del S3) · tres etiquetas locales `etiquetas.ts:22-35` al vocabulario · B-3 `layout.tsx:11` · B-5 `docs/MANUAL-DE-USO.md:148` · B-6 `fecha-del-commit.ts:19` sin test y `components/consola/` sin prueba unitaria.
**Modelo por fase:** F1 y F2 Sonnet 5.5, sin desvío; **F3 corrió en Sonnet 5.5 y no en Haiku 5.5** (la sesión no cambió): Haiku no se probó. Auditor: Sonnet 5.5 high.
**Aprendizajes:** el presupuesto de Lighthouse CI aplica **todos** los `path` que coinciden (`/` coincide con todo); mide con `cpuSlowdownMultiplier` 30 para parecerse a CI; la pantalla envejece al publicarla, no sola. **Recomendación:** paginar o virtualizar la lista antes de S3 y retirar la entrada de ADR-006. **Esfuerzo-beneficio:** alto; la primera pantalla y el método v2 por 2,6 h activas.
**Para mergear:** squash y borrar la rama; después `/cierre-sprint hackguard`.
