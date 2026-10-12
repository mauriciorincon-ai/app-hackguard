# ADR-008 — The evidence envelope, the ledger and the finding: format and contract

- **Date:** 2026-10-12 · **Status:** accepted · **Sprint:** 005
- **Planner reference:** G-Plan decisions P1 (manual envelope, finding and severity now; adapters, batches and the intake
  screen in Sprint 6), P2 (FIRST's scoring code untouched, with our own strict validator) and P3 (59 + 500 + 14 vectors
  on every PR, the full corpus as a manual script); `portafolio/hackguard/sprints/SPRINT_005.md` (planner, read only).
  Hard rules 1, 2, 4, 6, 7 and 8.

## Context

From Sprint 005 a result recorded by hand becomes an **envelope** of evidence; once a person confirms it, a failing
envelope opens a **finding**, and the finding closes only when a valid **re-test** says so. The thesis of the app is
that a finding is not a vulnerability but evidence that a control fails; this ADR fixes the shape of that evidence,
because the adapters of Sprint 6 produce envelopes for this ledger and the gap, the per-control view and the report of
Sprint 7 count its envelopes and findings. A format that changes silently would change what those screens say.

## Decision

1. **The envelope** (`hackguard/sobre@1`, one file per envelope, `SOB-NNNN`). It cites the plan and the package it was
   run against by fingerprint (ADR-007), the tool and its version, the selector, the verdict rule, `k`, what the tool
   measured (`evaluadas`, `fallidas`, `alertas`, `metrica`), the verdict, the date and time zone, who ran it, optional
   reason and warnings, a **redacted excerpt** (inert text, 1500 characters at most), the envelope it corrects, the
   finding it re-tests and the confirmation. The schema is `strictObject`: a `crudo` or `raw` field does not fit. **The
   tool's raw output is never stored (hard rule 4)**: the CLI reads the file, keeps only its SHA-256 and discards it.
2. **Three fingerprints** (E-9): `crudo` (the raw bytes), `sobre` (the whole canonical envelope except `huellas`,
   confirmation included) and `resultado` (test, asset, configuration and what was measured, with no date, executor,
   id, warnings or confirmation). Two runs that measured the same thing give the same `resultado`. Demo envelopes carry
   a **synthetic raw** whose fingerprint is that of the text `crudo-sintetico:<id>`, and the validator checks it.
3. **The verdict comes from the test's rule, never from a person or a model.** `asimetrica_k`: any failure fails; zero
   failures passes only if at least `k` were evaluated, otherwise `parcial`. `comprobacion_determinista`: one alert or
   failure fails. `metrica_con_umbral`: the metric against the threshold fixed before the test. `revision_de_diseno`:
   declared by a person, with a reason. **Without proof that the test ran the verdict is `no_ejecutada`, never `superada`**
   (E-6/E-7). Confirming an envelope does not change its verdict; to disagree, record a new envelope that `corrige` it.
4. **The ledger only appends.** An envelope is confirmed once, individually, by a person, and then its bytes are
   immutable (the fingerprint breaks if anyone edits it). Correcting is recording another envelope that cites the
   first; the first stays. **An unconfirmed envelope does not count**: it opens no finding and closes none. The
   ledger's fingerprint is that of the sorted list of every envelope id and fingerprint.
5. **The finding** (`hackguard/hallazgo@1`, `HZ-NNNN`) stores only what a person declares: the envelope it comes from,
   title and description in both languages, the **input** of its severity (a CVSS 4.0 vector for software; impact,
   scope and detectability for the other families) and its **events** (correction, risk acceptance with a review
   date, elimination, does-not-reproduce, each with person, date and justification). Everything that can be computed
   is not stored: the state, the deadline, the severity, the test, the family, the controls and the asset come from
   the ledger and the snapshot. **`cerrado` cannot be written**: it does not exist in the file.
6. **Lifecycle** (`abierto → corregido → re_probado → cerrado`, plus `cerrado_por_eliminacion`, `no_reproducible` and
   `aceptado_con_riesgo`). A finding closes **only** by a re-test: a confirmed envelope that cites it, `superada`, of
   the same test and asset, **strictly after the last declared correction**, with the same tool, version and selector,
   and at least the same `k`. If any of that fails the finding stays where it is and the engine says exactly which
   reasons failed (`MOTIVOS_DE_RECHAZO`). **The absence of a finding in a later scan never closes it**: without an
   envelope that cites the finding as its re-test there is no closure, and a `no_ejecutada` envelope is never `superada`.
   An accepted risk keeps counting as a failure of the control; it has a review date. Elimination and
   does-not-reproduce are alternative closures and require a justification. Reopened findings are out of scope (D5).
7. **One finding per live test and asset**: a confirmed failing envelope opens a finding only if there is no live one
   for the same test and asset, and a re-test never opens another.
8. **Deadlines** are data (`datos/hallazgos/plazos.json`): 7, 30 and 90 days for critical, high and medium; low and
   informational have none. They run only while the finding waits for work (`abierto`, `corregido`, `re_probado`);
   an accepted risk is reviewed by its own date. The evaluation date is always an input.
9. **Where things live (hard rule 8).** Demo envelopes and findings are versioned in `datos/evidencia/demo/` and
   `datos/hallazgos/demo/` and must say `origen: "demo"`. Real ones live in `datos/privado/evidencia/` and
   `datos/privado/hallazgos/` (git ignores them; files 0600, folders 0700). The **folder decides** where a derivative
   goes: a demo inside `datos/privado/` or an own record inside a versioned folder is a validation error.
10. **Content boundary (hard rule 3).** The S1 content filter runs over the envelope's free text and **flags** a match
    for a person to review; it never rejects. The envelope has no field for a payload or a procedure.

## Consequences

- Adapters (Sprint 6) produce `EntradaDeRegistro` and call the same `armarSobre`; they cannot skip the verdict rule, the
  fingerprints or the confirmation.
- The gap and the per-control view (Sprint 7) count only confirmed envelopes and the findings whose state counts as a
  failure of the control (`cuentaComoFalla`): one calculation, shared by every screen.
- Changing a field of either format is a new `@N` version, not an edit: the fingerprints of every committed file depend
  on these shapes. The determinism e2e proves in Node, Chromium, Firefox and WebKit that the ledger and the evaluated
  findings give the same fingerprints with their lists in another order.
- A person who disagrees with a verdict can never edit it away: the correction stays visible next to the original.
