# Auditoría · Sprint 006 «La carga de evidencia»

Auditor: un subagente independiente (Sonnet 5.5, esfuerzo alto) que no construyó el sprint, en solo lectura, sobre
`git diff main...HEAD` (76 archivos) más el commit F3. No corrió tests ni build: lo que no pudo comprobar por lectura
(cobertura del motor, determinismo en tres navegadores, CI) queda fuera de su informe y lo cubren las pruebas y la CI.

Regla de pago (kickoff del sprint): críticos y altos se pagan en el sprint; medios y bajos van al lote del hito con su
`archivo:línea`.

## Estado de los hallazgos

| Id  | Sev.  | Hallazgo (resumen)                                                                                                    | Estado               |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B1  | Alto  | Un lote confirmado se volvía inválido al cerrarse el hallazgo que cubría una de sus fallas; el build estático lanzaba | **pagado · e1eb3c8** |
| B2  | Medio | Una re-prueba que cierra un hallazgo puede confirmarse por lote sin revisión obligatoria                              | lote del hito        |
| B3  | Medio | Manual EN, línea caduca y falsa («neither does the intake of results»)                                                | lote del hito        |
| B4  | Medio | Manual: no dice que `importar` exige activo propio ni que la pantalla solo lee lotes demo                             | lote del hito        |
| B5  | Medio | LOTE-0008 demo (3 sobres, advertencia redactada a mano) no es lo que produce `importar` (6 sobres)                    | lote del hito        |
| B6  | Bajo  | ZAP no avisa de versión fuera del rango probado                                                                       | lote del hito        |
| B7  | Bajo  | `revisados` lo escribe el CLI sin atestación de la persona                                                            | lote del hito        |
| B8  | Bajo  | Literal de rol y símbolo fuera de datos en la pantalla                                                                | lote del hito        |
| B9  | Bajo  | Mensaje engañoso al confirmar un sobre de lote pendiente                                                              | lote del hito        |
| B10 | Bajo  | «sobres propuestos» cuenta también los ya confirmados                                                                 | lote del hito        |
| B11 | Bajo  | Comparación por nombre de veredicto en vez de por id                                                                  | lote del hito        |
| B12 | Bajo  | e2e del S5 debilitado: ya no comprueba el caso «corregido dentro de plazo»                                            | lote del hito        |
| B13 | Bajo  | Razón obsoleta en `docs/diseno/README.md`                                                                             | lote del hito        |
| B14 | Bajo  | Ruido de importaciones de tipos; lote inválido deja sus sobres contando; escritura de `importar` no atómica           | lote del hito        |

## Cobertura de alcance

- Adaptador Garak (0.17.0, versión en cuatro lugares, `status: 2`, cotejo con las líneas `eval`): Completo, con la
  desviación declarada (umbral 0,5 supuesto). `src/engine/adaptadores/garak.ts:25-26,136-161`.
- Adaptador ZAP (Traditional JSON, constancia por `statistics`, `no_ejecutada`): Completo. Derivada declarada.
  `src/engine/adaptadores/zap.ts:52-66,169-237`.
- Interfaz común y registro: Completo. `rangoProbado` de ZAP sin lector (B6).
- Gate de contrato y fixtures redactadas con manifiesto: Completo. `tests/unit/adaptadores/fixtures.test.ts:37-125`.
- Motor de lotes (armar, confirmar, separar, libro efectivo, validar, huellas, muestra, revisión): Completo.
- Muestreo: Completo con desviación declarada (22/25/26/29; la maqueta traía 24). Recalculado por el auditor con la
  hipergeométrica exacta: 4,64 %, 4,53 %, 4,91 % y 4,36 % frente a un riesgo de 5 %.
- Lotes demo LOTE-0007 y LOTE-0008: Implementado con desviaciones. LOTE-0008 no declara su advertencia inventada (B5).
- CLI `importar`, `confirmar-lote` y `validar` (que cubre lotes): Completo.
- Pantalla `/evidencia/carga` y su gate de fidelidad: Completo.
- Barra lateral y pie del plan: Completo.
- Demos en rojo (8 de 8, en F2): ejecutadas en el scratchpad; sus scripts no están en el repo. Las cuentas están en el
  cierre.
- ADR-009 y atribuciones Apache-2.0: Completo.
- e2e `carga.spec.ts` y ajuste de `hallazgos.spec.ts`: Completo; el ajuste debilitó el test (B12).
- `lighthouse-urls.json`, manual, guía (bloque K), CHANGELOG y README: Completo con fallos B3 y B4.

## Restricciones verificadas por lectura

1. Sobre `hackguard/sobre@1` sin cambios: solo se añaden tipos en memoria (`src/engine/evidencia/esquemas.ts:110-125`).
2. Rutas prohibidas sin cambios: catálogo, planificador, severidad, `datos/planes`, `datos/instantaneas`.
3. Fixtures sin carga de ataque: todo texto de Garak y de las ZAP derivadas es marcador. Metadatos públicos de la librería
   (`goal`, `model_list`) quedan sin redactar y son públicos.
4. `attack` y `evidence` de ZAP nunca llegan a un sobre: `src/engine/adaptadores/zap.ts:25-30`.
5. Crudo nunca guardado: `src/cli/evidencia.ts` lee, huella y descarta; el lote guarda solo el nombre base.
6. Ningún adaptador decide veredictos: `src/engine/lotes/armar.ts:69-88`.
7. Determinismo: sin `Math.random`, reloj ni `process.env` en `src/engine` ni `src/lib`.
8. Regla 12: un literal (B8).
9. Regla 17: sin dominios de producción en líneas nuevas.
10. Regla 19: cumple con fixture del serializador real y validación Zod del lado lector; el e2e de contrato es la cadena
    por CLI en Vitest más el e2e de la pantalla. Declarado: `statistics` de ZAP no probado con un reporte real.
11. Regla 22: `tests/unit/carga-interaccion.test.tsx` cubre pestañas, selector y filas.
12. Muestreo: BigInt, el validador rechaza tramos que no cumplen el riesgo, la revisión obligatoria cubre todas las
    fallidas y parciales (`src/engine/lotes/revision.ts:35-50`).
13. Confirmación por lote: `revisados` lo recalcula el validador (`src/engine/lotes/validar.ts:369-375`).
14. Paridad bilingüe: `etiquetas-de-carga.json` y `muestreo.json` tienen `es` y `en`.
15. Permisos 0600/0700 en lo propio (`src/lib/evidencia/cargar-evidencia.ts:201-217`); `importar` bloquea activos demo.

## Frases caducadas

- `docs/MANUAL-DE-USO.md:541` (EN): «neither does the intake of results» es falsa (B3).
- Verdaderas: `docs/MANUAL-DE-USO.md:27,152,183,264,303,324,326,610` y sus equivalentes EN; `docs/GUIA-DE-PRUEBA.html:453,570`;
  `src/components/carga/carga-pantalla.tsx:400,596`; `src/components/carga/piezas.tsx:148`.
- `docs/diseno/README.md:245`: frase verdadera con razón obsoleta (B13).
- `README.md`: sin promesas aplazadas.

## Campos sin consumidor

- `PlanDeMuestreo.nota` (`src/engine/lotes/esquemas.ts`, `datos/evidencia/muestreo.json`): sin lector; la pantalla repite
  la prosa a mano en `carga-pantalla.tsx:563`.
- `EtiquetasDeCarga.version` y `.nota` (`src/engine/lotes/esquemas.ts:130-131`): sin lector.
- `Adaptador.rangoProbado` de ZAP (`src/engine/adaptadores/zap.ts:244`): sin lector (B6).
- `Lote.origen`: solo lo lee el validador.
- `ConfirmacionDeLote.revisados`: solo lo lee el validador; la pantalla recalcula la revisión.

Estos campos son bajos: van al lote del hito.

## Recomendación del auditor

«Requiere ajustes». B1 (alto) se pagó en `e1eb3c8`, con su prueba de regresión, que falla antes del arreglo. Los medios
B2 a B5 y los bajos quedan para el lote del hito, con su `archivo:línea` arriba.
