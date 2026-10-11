# ADR-007 — The test plan and its execution package: format and contract

- **Date:** 2026-10-11 · **Status:** accepted · **Sprint:** 004
- **Planner reference:** G-Plan decisions P1 (priority formula), P2 (asset, adjustments and plan as validated files
  emitted by the CLI) and P3 (engine and screens in one sprint); `portafolio/hackguard/sprints/SPRINT_004.md`
  (planner, read only). Hard rules 1, 3, 5 and 8.

## Context

From Sprint 004 an asset with a profile, an owner, a provider and an authorization receives a test plan computed
by code from the official catalog snapshot. The evidence ledger (Sprint 005 onwards) will hang envelopes and
findings from that plan, so its shape is a contract that cannot change silently. The plan must be reproducible
byte for byte in Node and in every browser (hard rule 1), no model decides anything, and nothing operational may
travel in the execution package (hard rule 3).

## Decision

1. **Two files per asset, each with its own fingerprint** (JCS RFC 8785 + SHA-256, `src/engine/huella.ts`):
   `<id>.plan.json` (`hackguard/plan@1`) and `<id>.paquete.json` (`hackguard/paquete@1`). The plan cites the
   package's fingerprint, so the pair cannot be mixed. Demo assets are emitted into `datos/planes/`; an own asset
   into `datos/privado/planes/` with mode 0600 (rule 17-bis: a derivative is never born less private than its
   source). The CLI refuses to write the plan of an own asset into any versioned folder.
2. **A plan cites everything that produced it:** the asset's fingerprint (over the normalized asset, so the order
   of set-like lists does not matter), the official snapshot's date and fingerprint, the priority formula's and
   the environments' version and fingerprint, and the issue date. The issue date is an **input** (`--fecha`);
   re-emitting with the plan's own date must give the same bytes, and a test demands it. A plan cannot be issued
   with a date earlier than its snapshot.
3. **No authorization, no plan (hard rule 5):** an asset without `alcance` AND `reglas` is valid but not
   authorized; `plan:emitir` says so, exits 2 and writes nothing.
4. **What is planned, in this order, for every approved test of the asset's families:** excluded as `perfil` if the
   profile does not meet the test's applicability (unless the operator added it); excluded as `alcance` if its
   family is outside the authorized scope or the owner named it as out of scope; excluded as `operador` if the
   operator removed it; otherwise planned. Tests of other families are counted, not considered. Every exclusion
   carries its reason in both languages. The catalog has no «channel»: what is out of scope by channel is stated
   per test.
5. **Priority** is data (`datos/planificador/formula.json`): the test's base plus the adjustments the profile
   triggers (public exposure, non-public data, ability to act), capped at +1 and ceilinged at 5; each row lists the
   adjustments that applied. Without the cap a public asset with data that can act would put its whole plan at the
   ceiling and priority would order nothing.
6. **Tool and environment (RF-03.3).** The catalog has no free/paid flag. Among a test's recommended tools only
   those whose environment the asset has count. First the tool that measures the expected result (`medido_con`:
   the harness configuration is part of the expectation, E-2), then the environment of lowest order in
   `datos/planificador/entornos.json` (what runs on your machine before a service's free plan), then the catalog's
   order. With no environment available the test stays planned with no tool, visibly, and the CLI exits 1.
7. **The package is declarative.** Its schema is a `strictObject`: per test the selector, the verdict criterion, `k`,
   the expected result; per tool the environment and the minimum version; plus the scope, limits and rules the owner
   declared. There is no free-text operational field and an unknown field is rejected. The content filter of
   Sprint 1 runs over the owner's free text that reaches the package; it marks, a person decides, and a mark makes
   the CLI exit 1 without rejecting the plan.
8. **Real assets never enter the public repository (hard rule 8):** every file under `datos/activos/` must declare
   `origen: "demo"` and the validator rejects anything else; real assets live in `datos/privado/activos/`
   (ignored by git, read by the same CLI).
9. **A plan pins the snapshot it used.** If a newer official snapshot appears, building the screens fails closed
   asking for the plans to be re-issued, as a broken fingerprint already does. This closes the note in ADR-002
   («while no plan cites it»): a snapshot that a plan cites is no longer replaceable in place.

## Consequences

- The evidence ledger can rely on `plan.huella`, the test ids in `planeadas` and the package's per-test selector
  and `k`. A change to either schema means a new `@N` format, not an edit.
- Re-emitting is cheap and deterministic, so a new snapshot costs one command per asset.
- The demo plans differ from what the mockup drew (its arithmetic was illustrative, with 21 tests and another
  trait vocabulary); the closing summary of Sprint 004 lists the difference per test and the engine's plan rules.
