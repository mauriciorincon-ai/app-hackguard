---
paths:
  - "src/engine/adaptadores/**"
  - "src/engine/evidencia/**"
  - "src/engine/hallazgos/**"
  - "src/engine/severidad/**"
  - "src/engine/brecha/**"
  - "src/engine/lotes/**"
  - "src/engine/propuestas/**"
  - "src/engine/exportar/**"
  - "src/engine/ejecutor/**"
  - "src/lib/evidencia/**"
  - "src/components/carga/**"
  - "src/components/hallazgo/**"
  - "src/cli/evidencia.ts"
  - "tests/fixtures/adaptadores/**"
---

# Reglas de adaptadores, evidencia y hallazgos (cargan al tocar esas carpetas)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Reglas duras de producto

6. **Evidencia que aguanta una auditoría.** Ningún sobre cuenta sin confirmación humana (individual o por lote con plan de calidad límite en datos); en familias estocásticas `repeticiones_k` y regla asimétrica con la cota visible; la re-prueba usa la misma configuración y al menos el mismo k; **la ausencia de un hallazgo en un escaneo posterior nunca lo cierra**; evidencia confirmada inmutable.
7. **Severidad:** CVSS 4.0 contra la referencia de first.org fijada por commit (`FIRSTdotorg/cvss-v4-calculator@c5b0d40`) con validador estricto aparte; la escala de IA es una **tabla de prioridad de acción en datos** con el impacto primero, nunca una suma.

## Regla del kit

19. `[cambio]` **Todo puente entre dos lenguajes exige su gate de contrato** (fixture del serializador real, tipo validado del lado que lee, un e2e): aplica a los cinco adaptadores (Garak y ZAP del S3; promptfoo, PyRIT e Inspect del S12). — § 19

## Patrones de dominio

- **Sobre de evidencia** (S3): campos de § 6.7 + E-8 y **tres huellas** (crudo · sobre canónico · resultado sin identificadores de corrida, E-9). **Adaptadores** con interfaz común en `src/engine/adaptadores/`: Garak (`report.jsonl`/hitlog, rango probado 0.17.0) y ZAP (sin evidencia de ejecución sugiere `no_ejecutada`, nunca `superada`, E-6/E-7), más promptfoo 0.123.1 (`promptfoo eval -o`), PyRIT 1.1.0 (resultado del escenario) e Inspect 0.3.288 (registro de la evaluación), los tres S12 y con fixture sintético: una fila con error de la corrida no se evaluó y nunca cuenta como superada. Un adaptador solo traduce: el veredicto sale de la regla de la prueba (ADR-008).
- **Vista por control:** «evidencia organizada», separada del nivel de aseguramiento; cadena hallazgo → corrección → re-prueba visible (E-16). **Brecha única de todos los activos**; tablero, brecha, vista por control e informe salen del mismo cálculo (decisión 21 de diseño).
