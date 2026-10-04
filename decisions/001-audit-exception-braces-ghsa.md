# ADR-001 — Temporary audit exception for GHSA-vfj7-8cjw-p6xm (braces)

- **Date:** 2026-10-03 · **Status:** accepted · **Expires:** when a patched `braces` (> 3.0.3) is published
- **Context:** the kit's `quality` job runs `pnpm audit --audit-level high`. On the initial commit it failed on
  GHSA-vfj7-8cjw-p6xm (`braces` <= 3.0.3, CVSS 7.5, stack-exhaustion DoS through deeply nested glob patterns).
  `braces` is a transitive **devDependency** (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` →
  `micromatch` → `braces`); it never ships to users. The advisory lists **no patched version** and npm serves 3.0.3
  (2024) as latest, so no upgrade or override can fix it today.
- **Decision:** ignore this single advisory by id via `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` (pnpm 11 no longer reads the `pnpm` field of `package.json`). Nothing else
  changes: the audit level stays `high`, every other advisory still fails the job.
- **Consequences:** CI is green on the real state of the toolchain. Dependabot will raise the fix when it exists; the
  first PR that bumps `braces` past 3.0.3 must also delete the ignore entry and this ADR's "accepted" status.
- **Planner reference:** `portafolio/hackguard/ordenes/ESTAMPADO-hackguard.md` (checklist, 2026-10-03).
