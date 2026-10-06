---
sprint: 001
app: hackguard
status: open
opened: 2026-10-04
closed:
branch: sprint-001/catalogo-vivo-nucleo
pr: https://github.com/mauriciorincon-ai/app-hackguard/pull/8
---

# Sprint 001 Summary — HackGuard

## Outcome

**Sí, los tres outcomes.**

- **El catálogo es dato validado con huella.** `pnpm catalogo:validar` rechaza lo incompleto, acepta con advertencia
  lo que no tiene control y marca sin rechazar lo que tiene forma operativa. `pnpm catalogo:instantanea` da la
  misma huella en tres corridas de Node y en Chromium, Firefox y WebKit.
- **La familia `modelo_decision` nació completa:** 12 pruebas y un clasificador demo que imita el contrato de
  respuesta de Jev.
- **C18 parcial corre en CI:** bloquea 11 de 11 semillas inválidas, y el gate de publicación no escribe nada si el
  catálogo es inválido.

El ⭐ corto está en la sección «Gate ⭐».

## Qué se construyó

Sin pantallas: `src/app/`, `docs/diseno/`, `scripts/maqueta/` y `design-system.md` no cambiaron.

- **El catálogo como dato** (`datos/`):
  - **Pruebas:** 38, en cuatro familias: software 10, agente 9, modelo generativo 7 y modelo de decisión 12.
    - Por madurez: 25 `estandar`, 9 `emergente` y 4 `propia`.
    - Cada una dice qué verifica, por qué importa, con qué herramienta y qué se espera.
  - **Marcos:** 14, con versión, fecha, fuente y su HTTP, licencia `{es, en}` y vías de acceso.
  - **Equivalencias:** el mapa OWASP LLM 2025 → 2026.
  - **Controles:** los 38 del Anexo A de ISO/IEC 42001, en palabras propias, todos con
    `verificado_contra_norma: false`.
  - **Herramientas:** 13.
  - **Vocabularios:** familias, reglas de veredicto, rasgos de perfil, umbrales de vigencia y los 33 estados de la
    maqueta (9 vocabularios).
- **El validador:**
  - 61 reglas con nombre, severidad y una prueba que las hace saltar;
  - el filtro de contenido, con 7 patrones de forma: marca para revisión y nunca rechaza;
  - la huella JCS (RFC 8785) + SHA-256 con `crypto.subtle`.
- **El semáforo de vigencia:**
  - por prueba, marco, herramienta y familia;
  - umbrales de 30 y 60 días como dato;
  - la matriz de envejecimiento como gate (regla 23).
- **Instantáneas:**
  - `datos/instantaneas/2026-10-05-739ed8c104f0.json` es la oficial;
  - su gate de publicación;
  - la revalidación de las instantáneas guardadas.
- **El clasificador demo y sus métricas puras:**
  - exactitud, Brier, ECE de masa igual, error en la banda, cambio por re-ejecución y paridad ES/EN;
  - un conjunto de referencia bilingüe de 26 casos.
- **CLI:** `catalogo validar`, `catalogo instantanea` y `clasificador-demo`, en los dos idiomas, con `--json` y
  códigos de salida 0, 1, 2 y 3.
- **Kit de prueba:** 19 semillas con su manifiesto y el conjunto de referencia.
- **Documentos:**
  - el manual «El catálogo como dato», en español e inglés;
  - la guía de prueba (21 pruebas en 6 bloques, prefijo `hackguard-s1`);
  - `docs/LICENCIAS-DE-MARCOS.md` con la tabla DA-01;
  - `docs/CHANGELOG.md` y el README.
- **Delta del kit v1.34 → v1.39, por nombre:**
  - `demo-rojo.sh` endurecido;
  - `verificar-dependencias` que falla cerrado;
  - el hook de secretos que falla cerrado;
  - `lighthouse-margen`;
  - `build-como-proveedor` y la verificación de la salida publicada;
  - la constitución sincronizada con frase centinela.

## DoD — checklist

| Estándar       | Estado               | Evidencia                                                                                                                                                                                                                                                                                                                                               |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testing        | ✓                    | **Unitarias:** `pnpm test` (con cobertura) da 1.186 de 1.186 en 42 archivos, el 2026-10-05. **e2e:** `pnpm test:e2e` en local da «1053 passed (3.4m)», sin flaky ni saltadas; el spec de determinismo corre en los tres navegadores.                                                                                                                    |
| CI/CD          | pendiente            | Pendiente al escribir este summary: las corridas de los últimos pushes siguen en curso. Se completa con su número de corrida y la conclusión propia de `quality`, `e2e` y `lighthouse`.                                                                                                                                                                 |
| Observabilidad | No aplica en runtime | Sin servidor ni UI nueva. El CLI da salida JSON y un código de salida por tipo de fallo.                                                                                                                                                                                                                                                                |
| Seguridad      | ✓                    | **Audit:** `pnpm audit --audit-level high` solo trae la alta ignorada por ADR-001 (`braces`, todavía sin parche), y `compression` se subió a 1.8.2 (ADR-005). **Secretos:** gitleaks no encuentra nada en la rama, y la CI instala gitleaks 8.30.1 para que la prueba de la carnada corra. **Privado:** `git ls-files datos/privado` da solo el README. |
| Performance    | ✓                    | Medianas de 7 corridas con `node` directo: `validar` 0,093 s, `instantanea` 0,096 s, `clasificador:demo` 0,078 s. Node v24.18.0, carga 3,98. Lighthouse sin ruta nueva, en verde en la CI.                                                                                                                                                              |
| UX/A11y        | No aplica            | Sin UI. Los estados viven como dato con símbolo, nombre `{es, en}` y rol de color (ADR-003).                                                                                                                                                                                                                                                            |
| IA embebida    | No aplica            | El sprint no toca ningún modelo.                                                                                                                                                                                                                                                                                                                        |
| Manual de uso  | ✓                    | La estructura de `datos/`, los comandos, los códigos de salida, cómo se agrega una prueba, cómo se registra una revisión y lo que el filtro no ve.                                                                                                                                                                                                      |
| Guía de prueba | ✓                    | 21 pruebas en 6 bloques, ⭐ = las 3 paradas, prefijo `hackguard-s1`, el kit de prueba enlazado. Sus huellas tienen gate (`tests/unit/guia-huellas.test.ts`).                                                                                                                                                                                            |
| ADRs           | ✓                    | 002 formato de datos y huella · 003 el vocabulario de estados es dato · 004 la familia `modelo_decision` · 005 el override de `compression`.                                                                                                                                                                                                            |
| Constitución   | ✓                    | Sincronizada con el kit v1.39.0 por nombre, con dos frases centinela.                                                                                                                                                                                                                                                                                   |

## Métricas técnicas

- **Determinismo (RNF-01):**
  - `tests/e2e/determinismo.spec.ts` evalúa 11 días después de la última verificación del catálogo.
  - El 2026-10-05, después de corregir la nota de promptfoo en la segunda pasada, eso dio la instantánea del
    2026-10-16, con la huella `2c062f72ce57175c3d5ee8eb497024c693f4a23164721859beaf5829c706c302` en Node (tres
    corridas del CLI) y en Chromium 153.0.8010.12, Firefox 155.0 y WebKit 26.6 («9 passed» en local).
  - El umbral (2026-11-04) da `9b1f7542…`, con estados en «por revisar».
  - El clasificador da `7d94f4a1…` en los cuatro motores.
  - El navegador recibe las listas en orden inverso.
- **Cobertura ≥ 90 % en `src/engine/`:** 99,38 % de sentencias, 94,86 % de ramas, 99,57 % de funciones y 99,42 % de líneas en los 14 archivos de `src/engine/`, calculado desde `coverage/coverage-final.json` de la corrida de `pnpm test` del 2026-10-05. El umbral del 90 % lo aplica `vitest.config.ts` en cada corrida de `pnpm test`, también en la CI.
- **`demo-rojo.sh`:** enrojece el validador, el filtro y el gate de publicación en las fases 1 a 4. Después hubo 29 corridas válidas en la fase 2 de la auditoría, 1 en el `/deploy-check` y 2 en la segunda pasada, sobre las aserciones del semáforo de AU-26 (bitácora).
- **Tiempos:** ver Performance.
- **`por_verificar` (aceptación: el summary los lista todos), 3 campos en 2 marcos:**
  - la fecha exacta de ISO/IEC 42001:2023 (solo consta el año);
  - la fuente de ISO/IEC 42001: iso.org responde **403** a un agente y se registró como
    `fuente_no_accesible_al_agente`, sin eludirlo;
  - el día de la fecha del OWASP Top 10:2025 (la fuente solo da el año).

  La fecha de CWE 4.20 dejó de estar por verificar en la auditoría: la declara su propio archivo.

- **Primeras corridas en CI (sin histórico, no se afirma regresión ni no-regresión):**
  - Firefox y WebKit en el job `e2e`, desde `38ac110`;
  - gitleaks en `quality`, desde `9dfa994`;
  - `build-como-proveedor` y `lighthouse-margen`, desde la fase 0.

## Gate ⭐ — diferimiento y contrapesos

| Contrapeso                     | Evidencia (archivo, cuenta medida, corrida)                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Pasada de capturas del builder | No aplica: el sprint no tiene pantalla. Por eso el ⭐ no se difiere (`SPRINT_001.md`, `gate_estrella: obligatorio-corto`). |
| e2e de `reduced-motion`        | No aplica: sin UI ni animaciones nuevas. La suite e2e heredada pasa entera («1053 passed (3.4m)» en local, el 2026-10-05). |

**⭐ OBLIGATORIO corto: pendiente.** Se corre con el usuario después de este summary, parada a parada, y el resultado se escribe aquí. Son 3 paradas: la 1 y la 2 son efectivas, y la 3 está declarada no corrida. Deja 0 ⭐ al acumulado.

## Auditoría (`/audita-sprint`)

- **Fase 1:** cuatro auditores independientes por superficie (alcance y textos · hooks, privacidad, bilingüismo y
  guía · motor, contrato, gates y dependencias · lo que este último no alcanzó, más la casilla 4).
  - Encontraron **56 hallazgos sin duplicados: 0 críticos, 7 altos, 21 medios y 28 bajos**.
  - El detalle está en `sprints/SPRINT_001-auditoria.md`.
  - El usuario aprobó el plan el 2026-10-05, con cinco decisiones.
- **Fase 2:**
  - **Pagados:** 53 de 56: 52 en cuatro commits (`9dfa994` gates, `efb547a` código, `d53b05a` datos y `7ce50d7`
    documentos) y AU-38, con el cuerpo del PR #8 puesto al día.
  - **Fix del `/deploy-check`:** `09842c8`, lo que escribe `--agregar` nace con permisos 600 (regla 17-bis a).
  - **Dependencia fuera del plan:** `5b0d6c1`, `compression` (ADR-005).
  - **Demos:** cada gate nuevo se vio en rojo con `scripts/demo-rojo.sh`, salvo AU-11, que se vio en rojo con una
    simulación sin mutar archivos. Las dos aserciones de AU-26 se demostraron en la segunda pasada. Todo está en
    la bitácora.
- **Deuda declarada:** AU-14 (S2), AU-20 (S3) y AU-47 (decide la planeadora). Ver «Deuda técnica aceptada».
- **Segunda pasada** de frases caducadas y de evidencia, con otro auditor independiente: pendiente al escribir este summary; su resultado se registra aquí.

## Decisiones no anticipadas

- **ADR-002 (ampliado en la auditoría):**
  - Una instantánea guardada que el validador de hoy rechaza se reemplaza en el mismo PR, mientras ningún plan la
    cite. Así la del 2026-10-04 pasó a ser la del 2026-10-05, que se volvió a emitir en la segunda pasada al
    corregir la nota de promptfoo.
  - Los selectores de adaptador son una lista declarada del esquema hasta el S3.
- **ADR-005:** `serve` 14.2.6 fija `compression` 1.8.1, y GHSA-vc2v-76pw-4v95 (alta, publicada el 2026-10-05) tiene
  parche en 1.8.2. Va un override acotado en `pnpm-workspace.yaml`, con su condición de retiro.
- **El CLI con el TypeScript nativo de Node,** sin `tsx`. Exige Node ≥ 22.18, declarado en `engines`.

## Bugs + resoluciones

- **Concordancia de número en la línea de conteos** («1 pendientes de revisión»): `0a8228a`.
- **Las pruebas fechaban contra el calendario** y la matriz no soportaba fechas mezcladas (AU-01): se derivan de la
  última verificación.
- **El lint de determinismo dejaba pasar `crypto.randomUUID` y el acceso por `globalThis`** (AU-02).
- **`instantanea --agregar` escribía en `datos/instantaneas/`** con la ruta de la máquina dentro (AU-12), y con
  permisos 644 (`/deploy-check`): ahora exige `--salida` fuera de `datos/`, guarda `agregado/<nombre>` y nace con 600.
- **La primera expresión del patrón `bloque-sin-lenguaje`** marcaba también la valla de cierre de un bloque con
  lenguaje: se corrigió en la misma fase.

## Qué salió bien / qué generó fricción

- **Bien:**
  - El motor puro con huella JCS da los mismos bytes en cuatro motores, y el e2e lo vigila sin reintentos.
  - La regla de forma del filtro mantuvo el catálogo real en 0 marcas.
  - La auditoría en cuatro auditores encontró gates que no podían fallar, y ninguno de los 1.149 tests de entonces
    lo habría visto.
- **Fricción:**
  - **El conteo de `--minimo-tests`:** se escribió a mano y mal en cuatro fases. `demo-rojo.sh` lo atrapó siempre,
    y desde la fase 2 de la auditoría sale de un comando.
  - **Las barras invertidas en `demo-rojo.sh`** (K-S1-5).
  - **La pausa nocturna a mitad de la Fase 1:** el auditor de motor cerró antes y hubo que sumar un cuarto.

## Sugerencias de mejora al método

- **`demo-rojo.sh`** podría contar las pruebas del verde por sí mismo antes de mutar, y dejar `--minimo-tests` como
  piso opcional. El conteo a mano falló en cuatro fases de este sprint (bitácora: fases 1, 2 y 3, y la Fase 2 de la
  auditoría).
- **`demo-rojo.sh`** debería tratar `--buscar` como literal, sin interpretar barras invertidas (K-S1-5).
- **La casilla 4 de `/audita-sprint`:** cuando la Fase 1 se parte por superficies, conviene asignarla explícitamente a
  un auditor. En este sprint ninguno de los tres la corrió, y la cubrió el cuarto.

## Deuda técnica aceptada

| Qué                                                                              | Por qué                                                 | Sprint de pago                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| AU-14: etiquetas para `pendientes_de_revision[].motivo` y la familia sin pruebas | Exige tocar la maqueta, prohibida en el S1 (ADR-003)    | S2                                                    |
| AU-20: § 11.2, la escala de IA como tabla en datos                               | No estaba en el plan aprobado; el brief la asigna a C13 | S3                                                    |
| AU-47: la guía de prueba solo en español                                         | La orden no lo pide y las apps hermanas difieren        | Decide la planeadora                                  |
| La parada 3 del ⭐ (resúmenes del Anexo A contra la norma)                       | Sin texto de ISO/IEC 42001 (G-Plan P1)                  | Antes de G-Release                                    |
| ADR-001: `braces` sin parche                                                     | No hay versión parcheada                                | El PR que traiga el parche                            |
| ADR-005: override de `compression`                                               | `serve` todavía fija 1.8.1                              | El PR que traiga un `serve` con `compression` ≥ 1.8.2 |

## Archivos clave (máx. 10)

1. `src/engine/catalogo/validar.ts`: el validador y sus 61 reglas.
2. `src/engine/catalogo/instantanea.ts`: la instantánea, su huella y su gate.
3. `src/engine/catalogo/semaforo.ts`: el semáforo de vigencia.
4. `src/engine/huella.ts`: JCS + SHA-256.
5. `src/engine/demo/clasificador.ts` y `src/engine/modelo-decision/metricas.ts`.
6. `src/cli/catalogo.ts` y `src/cli/cargar.ts`.
7. `datos/`: el catálogo.
8. `tests/e2e/determinismo.spec.ts`.
9. `docs/MANUAL-DE-USO.md` y `docs/GUIA-DE-PRUEBA.html`.
10. `sprints/SPRINT_001-auditoria.md`.

## Cómo probar

Abre `docs/GUIA-DE-PRUEBA.html` (doble clic). El bloque A son las tres paradas del ⭐ corto; los bloques B a F se
corren en una terminal en la carpeta del repo, después de `pnpm install`.

## Para mergear

Marca el PR listo, mergea con **squash** y borra la rama; después corre `/cierre-sprint hackguard` en la planeadora.
Lo hace el usuario.
