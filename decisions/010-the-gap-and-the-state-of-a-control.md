# ADR-010 — The gap, and how the state of a control is decided

- **Date:** 2026-10-12 · **Status:** accepted · **Sprint:** 007
- **Planner reference:** `portafolio/hackguard/sprints/SPRINT_007.md` (planner, read only); requirements RF-05.1 to RF-05.6
  and E-6. Hard rules 1, 6 and 10 (the core is deterministic, evidence that survives an audit, knowledge is data).

## Context

The dashboard, the gap, the per-control view and the report must say the same figures on every date. Four screens that each
count their own way would drift, and the public showcase (H-2) will read the same definitions. So the definitions are a
decision, not an implementation detail, and the count is **one** function: `armarBrecha` in `src/engine/brecha/calcular.ts`.

## Decision

1. **One row per planned test.** For every asset that has a plan, each planned test is a row `(asset, test)`. A row carries
   the **latest confirmed envelope** of that test on that asset (individual or by batch, ADR-009), ordered by date and then
   by identifier. An envelope that another confirmed envelope **corrects** (`corrige`) no longer counts. A proposal is
   shown on the row (`propuestos`) but moves no figure. An asset without an authorized scope has no plan and no rows; it is
   still listed, with no totals.
2. **A row is _executed_ only if its latest confirmed envelope is `superada`, `fallida` or `parcial`.** A `no_ejecutada`
   or a `no_aplicable` is **never evidence**: _not detected is not verified_ (E-6/E-7). A row with no confirmed envelope is
   "not measured". Coverage is planned · executed · passed · failed (partials count as failed) · not executed.
3. **The deviation** (expected against obtained, RF-05.1) is data, not text: not measured · not measurable · not
   applicable · _n_ failures where the rule allows 0 · alerts where there should be none · inside or outside the limit · none.
   The screen words it; a "not detected" never reads as "none".
4. **The state of a control** (four states, all in `datos/estados.json`, vocabulary `estado_de_control`). A control is
   **applicable** if the plan of any asset covers it or left it without a test (the plan's `cobertura`). Then, in this
   order:
   - `con_fallas` if any finding of a test that covers it still counts as a failure (open, fixed, retested **or risk
     accepted**). **Accepting a risk does not close a finding**, and the absence of a finding in a later scan never closes
     it either (hard rule 6): only a valid retest does (ADR-008).
   - else `sin_evidencia` if none of its rows is executed;
   - else `evidencia_antigua` if the most recent executed result is `evidencia_antigua` days old or more
     (`datos/brecha/umbrales.json`, 180, RF-05.5);
   - else `con_evidencia_vigente`.
5. **Findings** come from `situacionDeHallazgo` (ADR-008), the same function the finding page uses: state, severity,
   deadline and review. "Overdue" is a finding that asks for work (open, fixed or retested) and is past its deadline, most
   late first. A finding that cannot be placed (its envelope is missing) goes to `problemas`; it is never hidden or invented.
6. **The date is an input.** The brecha is built for the consultation date of the build, never the clock. A date earlier than
   any confirmed evidence, finding or fiche is an error (`RangeError`), not a figure. Everything that comes out is sorted
   by identifier, except the families, which keep the catalog's order (an ordered list, not a set). The gap has a
   fingerprint (JCS + SHA-256) that is identical in Node, Chromium, Firefox and WebKit (e2e).
7. **Thresholds are data.** The 180 days live in `datos/brecha/umbrales.json`, apart from `datos/umbrales.json`: the
   snapshot of the catalog copies the latter, and the sprint does not touch the catalog.
8. **The instrument validates itself.** The seeds of `docs/kit-de-prueba/semillas-de-cierre/` take the demo world, change
   one or two envelopes and say what the engine must answer: a forbidden closure is denied with its reason, a proposal does
   not count, accepting a risk does not close, and "not detected" does not count as verified. The same runner
   (`validarInstrumento`) feeds the dashboard band, so the band says what the engine just did.

## Consequences

- The marcos with a new version (RF-05.5) cannot be reported yet: there is no record of the source's published version. The
  gap says so (`alertas.marcos.registro: false`) instead of saying "none".
- A new control state, a new kind of deviation or another threshold is a change to this ADR, to `datos/` and to the
  vocabulary, not to a screen.
- The report of real assets (H-2) will be a local command over the same function; real evidence never enters the build.
- Sprint 7 also pays B2 from the Sprint 6 audit: a retest of a finding is always reviewed in a batch (ADR-009 §3, amended).
