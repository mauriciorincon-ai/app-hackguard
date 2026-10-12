# ADR-009 — Evidence batches, the effective ledger and the Garak and ZAP adapters

- **Date:** 2026-10-12 · **Status:** accepted · **Sprint:** 006
- **Planner reference:** G-Plan decisions P1 (intake by command, the screen is read-only) and P2 (Garak and ZAP together);
  `portafolio/hackguard/sprints/SPRINT_006.md` (planner, read only). Hard rules 1, 2, 3, 4, 6 and 8, requirement E-5
  (review all failures plus a sample) and the contract gate of rule 19.

## Context

From Sprint 006 the report of a tool run against a plan becomes **a batch of envelopes**, one per test of the package that
the tool runs. ADR-008 fixes two things this has to respect: the envelope format (`hackguard/sobre@1`, whose
`confirmacion.modo` is the literal `"individual"`) and that an envelope is confirmed "once, individually". Hard rule 6
and E-5 ask for something else: a person confirms a batch by reviewing **every failure** and a **deterministic sample**
of the rest, with a quality plan kept as data. The format cannot change (the fingerprints of every committed envelope
depend on it), so the confirmation of a batch needs a place that is not the envelope.

## Decision

1. **The batch** (`hackguard/lote@1`, one file per batch, `LOTE-NNNN`) lists its envelopes as `{id, huella}`, where
   `huella` is the envelope's fingerprint **with `confirmacion: null`** (so confirming a separated envelope later does not
   break the batch). It cites the plan and package fingerprints, the tool and version, the adapter and its version (E-8:
   the conversion is reproducible), the **name** of the tool file (never the file), the run's date, time and zone, who
   ran it, the adapter's warnings and the confirmation. **Three fingerprints** like the envelope: `archivo` (the tool
   file's bytes), `lote` (the batch without confirmation or fingerprints: it is the **seed of the sample**, and confirming
   does not change it) and `registro` (everything but fingerprints, confirmation included: editing a confirmed batch
   breaks it). Nothing is born confirmed.
2. **The confirmation lives in the batch, and the engine computes an effective ledger** (`libroEfectivo`). This
   amends §4 of ADR-008 (how an envelope is confirmed) **without changing `sobre@1`**. An envelope counts if its own file
   carries an individual confirmation (which always wins) or if a **confirmed** batch lists it and did not **separate** it.
   A batch that is pending, or was sent to individual review, confirms nobody. The batch's confirmation is lent to the
   envelope **in memory only** (`SobreEfectivo`, `modo: "individual" | "lote"`, plus the batch id): the envelope's Zod
   schema still rejects `"lote"`, so it can never be written to an envelope file. Every reader of the confirmation (the
   findings engine, the screens, the CLI) reads the effective ledger. The ledger fingerprint adds the batches' `registro`
   fingerprints; with no batches it is the one Sprint 5 gave.
3. **What a person reviews (E-5).** Every `fallida` and `parcial` envelope, always, plus a sample of the rest. The sample
   size comes from `datos/evidencia/muestreo.json`, indexed by the size of the **rest** (what is not failing): limiting
   quality 10 %, consumer's risk 5 %, accept on zero errors. The tiers are 25 or fewer → all, up to 50 → 22, up to
   90 → 25, up to 150 → 26, above → 29. Only the procedure's name is cited (hard rule 11); the sizes are ours and the
   loader **refuses to load a plan whose tier does not meet its risk**, checked with exact hypergeometric arithmetic on
   integers (`BigInt`) for every size in every tier, and the last tier also against the binomial bound. (The mock-up's
   24 for 51–90 does not meet 5 %; its figures were marked illustrative.) The sample is the rest ordered by
   SHA-256(`huellas.lote` + `:` + id), first _n_, returned in id order: the same bytes in Node, Chromium, Firefox and
   WebKit (e2e). With one envelope per test the "stratified by test" of the plan degenerates; it is not simulated.
   **Amended in Sprint 7 (B2, found by the Sprint 6 audit):** an envelope that is the **retest of a finding**
   (`reprueba_de` is set) is also always reviewed, whatever its verdict. A passed retest closes its finding, which is
   more serious than any other pass, and it must not be closed because the sample happened to leave it out. The batch
   format does not change; only the rule that computes `revisados` (and so what the validator recomputes) does. The
   review reports which envelopes are in `siempre` only for this reason (`rePruebas`), so a screen can say so.
4. **Confirming a batch** (`confirmarLote`). A person confirms it, **separates** some failures to confirm them one by one,
   or sends the whole batch to individual review. Only failures and partials can be separated. A failure that would open
   a **new finding** must be separated: opening one asks for a person's severity, which is given when that envelope is
   confirmed on its own (as in Sprint 5). The batch stores `revisados` and `separados`; the validator recomputes
   `revisados` from the rule, so a hand-edited list fails. A batch is decided once; its confirmation is immutable.
5. **Adapters** (`src/engine/adaptadores/`, one file per tool plus an entry in the registry). An adapter only
   **translates**: it reads the tool's file and answers, per selector, what was measured. The verdict comes from the test's
   rule through `armarSobre` (ADR-008 §3), and **no model decides anything**. What leaves an adapter is numbers and
   identifiers; ZAP's `attack` and `evidence` and the requests' headers and bodies, and Garak's prompts and outputs, never
   reach an envelope or a batch.
   - **Garak** (`report.jsonl`, range tested 0.17.0): only attempts with `status: 2` count; an output fails if a detector
     of the selector scores at least **0.5**. Neither the report nor the package records the run's threshold, so 0.5
     (Garak's own default) is an **assumption**, said in the batch's warnings and **cross-checked**: the pass, fail and
     none counts recomputed from the attempts must equal each of the tool's own `eval` lines, or the batch is not built.
     The version must agree in the four places the report writes it.
   - **ZAP** (Traditional JSON, with or without requests and responses): proof that a rule ran is a non-zero
     `stats.pscan|ascan.<id>.(time|started|urls|alerts)` entry (global or per site) or an alert of that rule. A rule with
     neither is **`no_ejecutada`**, never `superada` (E-6/E-7), and a report with no `statistics` proves nothing. Confidence
     `0` is a false positive: it does not count, it warns, the rule did run. A "Dev Build" cannot be compared with a minimum
     version, so no batch is built from it.
6. **Where things live (hard rule 8).** Demo batches in `datos/lotes/demo/`, own ones in `datos/privado/lotes/` (0600,
   folders 0700), never under `datos/privado/evidencia/`, which the loader reads recursively as envelopes. The tool's
   file is read once, summarized in its SHA-256 and discarded; an own batch requires every envelope's `crudo` to be the
   batch's `archivo`, and the same file cannot be imported twice. Demo batches carry the synthetic raw
   `crudo-sintetico:<LOTE>` and the validator checks it. **No attack payload enters the repository**: the Garak fixture is
   a local run against `test.Repeat` in an ignored environment, redacted (prompts, outputs, triggers and local paths
   become markers; the redactor fails if any original text survives) and the raw and the environment are deleted before
   any commit. The ZAP fixtures are zap-extensions' official outputs (Apache-2.0) and two declared derivatives.

## Consequences

- Adding a tool is an adapter file and a registry entry; the envelope, the verdict rule, the fingerprints, the batch and
  the review rule do not change.
- The gap and the per-control view (Sprint 7) must count the **effective** ledger, not the envelope files: one calculation
  for every screen.
- Changing a field of the batch is a new `@2`, not an edit. `sobre@1` does not change.
- **Known limits, declared:** Garak's threshold is an assumption backed by a cross-check; ZAP's `statistics` keys come from
  its documentation and the "plus" fixture that exercises them is **derived, not produced by a ZAP run** (no Docker on the
  build machine), so the format of the real statistics is unverified until someone imports a real report; pasted text
  and reading the file in the browser are not built (the screen is read-only and says so).
