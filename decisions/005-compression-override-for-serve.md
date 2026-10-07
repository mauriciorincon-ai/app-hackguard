# ADR-005 — Override `compression` under `serve`

- **Date:** 2026-10-05 · **Status:** accepted · **Sprint:** 001 (audit phase 2)
- **Rule:** rule 18 of `CLAUDE.md`. An advisory that has a patch is never ignored: the dependency is raised.
  Overrides live in `pnpm-workspace.yaml`.

## Context

- **The advisory:** GHSA-vc2v-76pw-4v95, severity high, published 2026-10-05 at 23:28 UTC. It is a denial of service
  in `compression` below 1.8.2, through a memory leak when a response closes early.
- **How we found it:** `pnpm audit --audit-level high` failed in CI run 37401498633, on commit `9dfa994`. The run
  before it was green.
- **Where it comes from:** `compression` reaches the repo only through `serve`, a dev dependency. `serve` serves
  `out/` for `pnpm start`, which Playwright and Lighthouse use.
- **Why upgrading `serve` does not fix it:** `serve` 14.2.6 is the latest version and pins `compression` exactly at
  1.8.1.

## Decision

`pnpm-workspace.yaml` overrides `serve>compression` to `1.8.2`, the first patched version.

In its declared dependencies, 1.8.2 differs from 1.8.1 only by a new `destroy` 1.2.0. The lockfile changes in
exactly those two packages and the override.

## Consequences

- **The audit:** `pnpm audit --audit-level high` reports only the high advisory that ADR-001 already ignores.
- **Dependency checks:** `scripts/verificar-dependencias.mjs` finds no package below `origin/main`, and
  `pnpm peers check` reports no issues.
- **`serve` still works:** `serve` links `compression` 1.8.2. The determinism e2e started `pnpm start` with it on
  2026-10-05 and passed 3 of 3.
- **Removal condition:** remove the override in the first PR that brings a `serve` release depending on
  `compression >=1.8.2`.
