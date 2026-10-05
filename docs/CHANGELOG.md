# HackGuard — changelog

The app's own changelog, one entry per sprint. The root `CHANGELOG.md` belongs to the kit the repo was stamped
from.

## Sprint 001 — «El catálogo vivo» (2026-10-04)

The catalog core as validated data with a fingerprint. No user interface yet.

### Added

- **Catalog as data** in `datos/`:
  - 38 tests in four families (software, agent, generative model, decision model);
  - 14 versioned frameworks, each with its source, HTTP status and licence;
  - an equivalence map from OWASP LLM Top 10 2025 to 2026;
  - 38 ISO/IEC 42001 Annex A controls summarised in our own words, all `verificado_contra_norma: false`;
  - 13 tools with verified versions;
  - families, verdict rules, profile traits, content-filter patterns, freshness thresholds and the state
    vocabulary.
- **Validator** (`pnpm catalogo:validar`):
  - 61 named rules, each with a severity, a bilingual name and a test that triggers it;
  - exit codes 0 ok · 1 with warnings · 2 invalid · 3 usage or read error;
  - `--json`, `--idioma es|en` and `--agregar <test.json>`.
- **Content filter:** it flags operational-looking text in any catalog file for human review and never rejects.
- **Canonical fingerprint:** JCS (RFC 8785) + SHA-256 through `crypto.subtle`.
- **Snapshots** (`pnpm catalogo:instantanea --fecha YYYY-MM-DD`):
  - the approved catalog, the state vocabulary, the thresholds and the freshness semaphore;
  - a publication gate: nothing is written when the catalog is invalid.
  - First official snapshot: `datos/instantaneas/2026-10-04-12d3b632a871.json`.
- **Freshness semaphore** per test, framework, tool and family: review due from 30 days, overdue from 60. Every
  state carries a symbol and a name.
- **Demo classifier for `modelo_decision`** (`pnpm clasificador:demo`):
  - it imitates Jev's response contract;
  - it ships with pure metrics on probabilities (Brier, equal-mass ECE, threshold-band error, re-run change rate,
    ES/EN parity);
  - it is measured on a bilingual reference set of 26 cases.
- **Test kit** in `docs/kit-de-prueba/`: 19 validator seeds with their manifest (C18: blocks 11 of 11 invalid
  seeds) and the classifier's reference set.
- **Determinism e2e:** the same snapshot and classifier fingerprints in Node, Chromium, Firefox and WebKit.
- **ADRs:**
  - 002, catalog data format and canonical fingerprint;
  - 003, state vocabulary as data;
  - 004, the `modelo_decision` family and its demo asset.

### Changed

- **Kit synced from v1.33.0 to v1.39.0,** by name:
  - hardened `demo-rojo.sh`;
  - fail-closed dependency check;
  - fail-closed secrets hook;
  - Lighthouse margin;
  - build-as-provider check.
- **CI** now:
  - runs the catalog validation;
  - enforces coverage thresholds (90% on `src/engine/`);
  - installs Firefox and WebKit for the determinism spec.
