---
paths:
  - "docs/**"
  - "sprints/**"
  - "decisions/**"
  - "scripts/horas-sprint.mjs"
  - "scripts/brochure.mjs"
---

# Reglas de hito, documentos y cierre (cargan al tocar `docs/`, `sprints/` o `decisions/`)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Regla dura de producto

9. **Vitrina por lista blanca.** Nada es publicable por defecto; paquetes de ejecución y alcances nunca; la validación del instrumento (C18) corre antes de publicar y bloquea si falla (ninguna instantánea ni paquete se emite con el catálogo inválido).

## Reglas del kit

8. `[sprint]` **Presupuesto medido:** ≈ 4 h activas por defecto, ≤ 12 h con justificación; horas con `scripts/horas-sprint.mjs`. — § 8
9. `[sprint]` **Manual de uso vivo** (`docs/MANUAL-DE-USO.md`): toda feature que llega a `main` tiene su sección en el mismo sprint, en lenguaje de usuario final. — § 9
11. `[cambio]` **Guía de prueba viva y acumulativa** (`docs/GUIA-DE-PRUEBA.html`, prefijo `hackguard-sN`): se toca solo si el sprint cambia un flujo visible; ⭐/⭐⭐ se corren en el gate humano del hito; kit de prueba (`docs/kit-de-prueba/`) solo por cambio. — § 11
12. `[siempre]` **Prohibido entregar por artifacts o plataformas externas:** todo entregable es un archivo del repo y se entrega su ruta. — § 12
13. `[hito]` **Brochure** (`docs/BROCHURE.html` + `docs/brochure-export.json`): una vez, cuando la app entra al hito Vitrina; se ajusta al cierre de cada hito posterior. — § 13

## Por hito, no por sprint

- Gate humano único = **ensayo general del H-2** en su propio sprint (sin tope de tiempo, sobre una guía que es UN recorrido sin pasos repetidos con matriz de cobertura `cubre: [ids]` y su test; ⭐/⭐⭐ de la guía, FORMA y TEXTO pendientes, juicio de diseño; el del H-1 salió de 29 paradas que repetían preparación) · brochure (hito Vitrina) · `design-sync/` y `/design-sync` · `docs/BLUEPRINT.html` · pruebas y capturas en el segundo idioma · adopción del kit y de esta constitución (una vez al abrir el hito; el kit versiona ≤ 1 vez al mes).
- **Matriz de hitos (método v2.4.0; 4 hitos, ninguno más).** Un hito = los sprints que su objetivo necesite; el gate humano es uno por hito.

  | Hito | Objetivo | Sale cuando (gate humano) |
  |---|---|---|
  | **H-1 Vitrina funcional** (= MVP) | diseño, propuesta de valor y funciones esenciales, demostrables | flujo principal de punta a punta con datos sintéticos · manual · deuda registrada · ficha en CV Viva · arquitectura al día |
  | **H-2 Producto completo** (ensayo general; no robusto) | todo lo que el visitante verá y usará, de punta a punta como en producción | VISION 100 % construida o descartada con nombre · bilingüe completo · **ensayo general del usuario** (lo no visto no cuenta) · arquitectura al día |
  | **H-3 Robustez** | calidad, mantenibilidad, datos y conectividad proporcionales | pruebas esenciales de lo que cambia · integraciones definitivas · arquitectura al día |
  | **H-4 Producción** (= G-Release) | seguridad, privacidad, despliegue, operación y legal proporcionales | checklist de release · observabilidad mínima · legal · smoke |

  H-2 se cierra antes de H-3 y H-4 (método v2.3.0, 2026-10-17); que el usuario use la app en su vida no es un hito. El último sprint de construcción del hito trae la guía al día como recorrido, manual, BLUEPRINT, `design-sync` y la auditoría de esta constitución contra el código; el ensayo va después, en su sprint.
- **Solo por cambio:** aprovisionamiento (tabla y humo solo si hay uno nuevo) · demo en rojo (solo gates propios nuevos) · roadmap de CV Viva (solo si el sprint toca una feature votada) · ADR (solo decisiones irreversibles).
- **Haiku 5.5 en construcción simple está en prueba:** su relevo es Sonnet 5.5 (regla 29); el cierre registra si Haiku bastó o no; tras 3 sprints se decide si se queda. Nombre completo `claude-haiku-5-5` en `/model` hasta confirmar que el alias `haiku` apunta a esa versión.
- Los subagentes declaran su modelo en su definición (búsqueda y lectura: Haiku 5.5; auditor: Sonnet 5.5); ninguno hereda Opus o Fable por omisión.

## Cierre ejecutivo (`sprints/SPRINT_NNN-cierre.md`, ≤ 40 líneas)

Frontmatter `sprint · app · hito · opened · closed · branch · pr`, y los campos, cada uno en una línea o una tabla corta:
nombre · objetivo planeado · resultado · estado · tiempo estimado · tiempo real (salida de `scripts/horas-sprint.mjs`) · diferencia ·
fases planeadas y resultado real · tiempo estimado y real por fase · entregables · no completado · desviaciones · causas · decisiones ·
deuda (solo lo imposible, con `archivo:línea` y la decisión del dueño) · aprendizajes reutilizables · recomendación para el siguiente ·
evaluación esfuerzo-beneficio · **auditoría** (4 casillas; cada hallazgo con `pagado · <commit>`) · si una fase se pasó más del 50 %: causa y medida ·
**modelo usado por fase y si hubo desvío** (una línea; si una fase corrió con Haiku 5.5, si bastó o no) · **relevos** (cuántos · de qué modelo a cuál · por qué; o «ninguno») ·
huellas de la instantánea o del plan en los cuatro motores si el sprint tocó el catálogo o el planificador ·
«Para mergear: squash y borrar la rama; después `/cierre-sprint hackguard`».
