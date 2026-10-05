# ADR-003 — The state vocabulary is data

- **Date:** 2026-10-04 · **Status:** accepted · **Sprint:** 001
- **Planner reference:** hard rule 12 of `CLAUDE.md` («el color nunca solo»); `design-system.md` § 5 and § 9;
  RF-01.5 of the requirements; decision 27 of the design stage (a family takes the state of its most out-of-date
  test).

## Context

Every state HackGuard shows (verdict, freshness, control status, severity, confirmation, asset and finding cycles)
must be readable without colour: symbol + text + colour. The design stage put this vocabulary in the mock-up
(`scripts/maqueta/nucleo/estados.mjs`) and said that no screen decides how a state looks. Sprint 001 is the first
time the engine computes a state (freshness), and it has no UI, so the vocabulary has to live where both the
engine and the future screens read it.

## Decision

1. **The vocabulary is in `datos/estados.json`.**
   - **Content:** the mock-up's full vocabulary, 9 vocabularies and 33 states. Each state has its colour role
     (`positivo`, `atencion`, `falla`, `neutro`, `acento`), its symbol (one of the design system's 13 marks) and
     its name in `{ es, en }`.
   - **Origin:** it was generated from the mock-up module, read only.
   - **Gate:** a test (`tests/unit/catalogo/catalogo-real.test.ts`) requires both to stay equal, state by state.
2. **The engine declares which states it computes** (`ESTADOS_QUE_CALCULA_EL_MOTOR` in
   `src/engine/catalogo/semaforo.ts`). The validator rule `estados/sin-etiqueta` makes the catalog invalid if any
   of them lacks a symbol and a name. Today that is the freshness vocabulary.
3. **The thresholds are data too.** `datos/umbrales.json` puts «review due» at 30 days and «overdue» at 60, as
   RF-01.5 and the mock-up do. The rule `umbrales/orden-invalido` rejects an overdue threshold that is not greater
   than the review-due one.
4. **Snapshots carry the vocabulary, the thresholds and the semaphore,** so whoever renders a snapshot needs
   nothing else to show its states.
5. **In the terminal,** each design-system mark maps to one character (✓ ! ✗ ◐ ◷ ○ ⊘ ✍ and five bar heights) in
   `src/engine/catalogo/informe.ts`. The CLI prints mark, name and count, and never prints a zero count.

## Consequences

- **A state is renamed in one place.** It changes in `datos/estados.json` and in the mock-up together, or the
  fidelity test goes red.
- **No unlabelled state can be published.** A state the engine computes but the vocabulary does not name makes
  the catalog invalid before any snapshot is written.
- **The aging matrix uses the vocabulary.** `tests/unit/catalogo/envejecimiento.test.ts` builds the real catalog's
  snapshot on every date a state changes, and checks that each computed state has its label in both languages.
