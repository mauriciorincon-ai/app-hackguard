# ADR-004 — The `modelo_decision` family: reference frameworks and the demo asset

- **Date:** 2026-10-04 · **Status:** accepted · **Sprint:** 001
- **Planner reference:** G-Plan decision P3; changes E-17 to E-23 and E-25 of the feature specification;
  `investigacion/2026-10-02-jev-typesafe.md` (planner, read only).

## Context

The fourth asset family covers typed decision models: a model that receives a typed state and returns a
probability distribution over typed options. Jev (TypeSafe) is the reference product. The family had no formal
framework, and its tests need an asset whose answers can be measured. Calling a real model is ruled out: it would
mean a third-party API, a key, and non-reproducible runs inside the deterministic core.

## Decision

1. **Reference frameworks (E-23),** each a versioned entry in `datos/marcos/`:
   - the vendor's documentation with version (`typesafe-jev`, `jev-1.13`, whose nine known limitations are its
     entries, E-21);
   - the 14-item checklist of arXiv:2609.32160 (`lista-decision-14`, `v1`);
   - NIST AI 100-2 E2025, NIST AI RMF 1.0 and MITRE ATLAS.

   Of the 12 tests in this family, 9 are `emergente` and 3 are `propia`. «Valid but wrong» is split into three
   separate checks (E-22).
   - Drift (`PR-MD-DER-001`) is `emergente`, one more than the four that E-23 names. It is anchored on item R1 of
     the 14-item checklist, which E-23 accepts as a framework.

2. **Tools.** The tests recommend scikit-learn, CheckList, TextAttack and Evidently. Three tests are human design
   reviews (`hackguard-revision`). MAPIE is registered but not recommended by any test. The TypeSafe provider for
   promptfoo was merged on 2026-10-02; when the tools were verified (2026-10-04) no published release shipped it,
   and promptfoo 0.124.0, published on 2026-10-06 (UTC), does. `inspect-typesafe` is not on PyPI (HTTP 404 on
   2026-10-05). No test in this sprint recommends either one.
3. **The demo asset is a classifier of our own** (`src/engine/demo/clasificador.ts`). It imitates Jev's
   **response contract** without being Jev:
   - **Response:** `{model, answers, usage}`.
   - **Choice:** `choice`, `probabilities` summing to 10,000 ten-thousandths, and
     `confidence = (p_max − 1/n)/(1 − 1/n)`. In floating point the sum may differ from 1 in the last bit.
   - **Noul:** `noul`, the probability of «yes».
   - **Ours, not the vendor's:** indexing `answers` by question id. The vendor does not document the nesting.
   - **Domain:** synthetic triage of members' requests to a municipal library.
4. **Determinism.**
   - **Probabilities:** they come from integer weights, split into ten-thousandths by largest remainder, with ties
     broken by option id, never by position.
   - **Noise:** optional seeded noise (mulberry32, seeded with the seed XOR FNV-1a of the canonical state)
     imitates the variation Jev shows between identical calls.
   - **Fixed draw order:** draws follow a fixed order, so neither the order nor the subset of options asked
     changes the answer.
5. **Three flaws are planted on purpose,** and tests pin them so the metrics have something to find:
   - **Language:** the lexicon covers English fully and Spanish only in part (Jev loses accuracy in Spanish).
   - **Negation:** keyword matching ignores it.
   - **Membership:** a bonus for long-standing members that the labelling policy does not mention.
6. **Metrics are measured on probabilities, never on `confidence`** (E-17). They live in
   `src/engine/modelo-decision/metricas.ts`, pure and reusable for a real model's answers:
   - **Accuracy and Brier:** multiclass Brier, with an invalid output counting as an error and adding 2.
   - **ECE:** top label, with declared equal-mass bins.
   - **Threshold-band error:** errors near the threshold the application decides with.
   - **Re-run change rate:** E-18 and E-19.
   - **ES/EN parity:** E-22.

   NLL is left out because `Math.log` is not guaranteed to round identically across JavaScript engines.

7. **The reference set**, `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`:
   - **Cases:** 26 cases, each with a typed state and a note written separately in each language.
   - **Labels:** they follow a written five-rule policy.
   - **Parameters:** seed 20261004, 5 runs, noise of 150 per mille, 4 ECE bins, and a band of 0.60–0.80 around an
     approval threshold of 0.70.
   - **Noise level:** 150 was chosen by measurement: of the levels tried, it gives the change rate closest to the
     ~1.5% measured for Jev (the demo changes 1 of 52 answers, 1.92%).
   - **Warning:** the set states that the same hand wrote it and the classifier.

## Consequences

- **The family's tests have measurable expected results.** `pnpm clasificador:demo` shows them, and its response
  fingerprint is identical in Node, Chromium, Firefox and WebKit.
- **The figures measure the metrics, not a model.** The guide and the manual say so. Running the family's tests
  on the demo asset is the evidence ledger's job (Sprint 3), not this sprint's.
- **Real Jev comes later.** It arrives only as a second asset, on the free plan and with its contract cited.
  Adding it will not touch the metrics.
- **A deliberate change shows in the tests.** Any change to the classifier's weights or lexicon changes the
  pinned figures in `tests/unit/demo/conjunto.test.ts`, and the guide's expected results with them.
