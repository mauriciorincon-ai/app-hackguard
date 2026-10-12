# HackGuard — changelog

The app's own changelog, one entry per sprint. The root `CHANGELOG.md` belongs to the kit the repo was stamped
from.

## Sprint 004 — «Del activo al plan» (2026-10-11)

An asset with its owner, provider, profile and authorization gets a test plan computed by code from the official snapshot, with a declarative execution package, and both are on screen.

### Added

- **`/activos/<id>`:** the asset's page with its owner and provider (the provider's policy is cited, or marked «not read»), its profile, its scope and its engagement rules. Three demo assets: the assistant, the classifier and the customer portal.
- **`/activos/<id>/plan`:** the plan with the planned tests (each with «Applies because:», or «Added by you» and the justification), the excluded tests with one of three reasons (not applicable, out of scope, removed by you), the coverage by control (with «No test» where no planned test covers it), and the execution package. The customer portal has no plan: «No authorization, no plan».
- **Package download:** `/activos/<id>/paquete.json` serves the same bytes as the versioned file that the planner issues.
- **Planner:** a pure, deterministic core in `src/engine/planificador/`, with the priority formula, the tool and environment choice, and the coverage in data (`datos/planificador/`). Same input, same bytes, in Node and in Chromium, Firefox and WebKit.
- **Asset validator:** 21 named rules in `src/engine/activos/`. A demo asset must declare `origen: "demo"`; real assets live in `datos/privado/activos/`, which git ignores.
- **CLI:** `pnpm activo:validar` and `pnpm plan:emitir <id> --fecha AAAA-MM-DD`. A plan for an own asset is written to `datos/privado/planes/` with mode 0600.
- **Gates:** plan and package fingerprints across three browsers, fidelity of both screens against the maqueta, the aging matrix for the policy and tool dates, and an e2e with axe in both themes.
- **ADR-007:** the plan and package format that the evidence book will consume.

### Changed

- **Sidebar:** Assets is a live link to the first demo asset; Evidence, Dashboard and Gap are still marked «soon».
- **Console shell:** an optional subnavigation slot (Asset / Plan), used only by the asset screens.
- **Maqueta table:** `docs/diseno/README.md` lists what the product adds or leaves out against the maqueta (Sprint 4). The maqueta itself is not regenerated.

### Not in this sprint

- Real assets, import from a technical sheet, plan re-issue on profile change, a profile or plan editor on screen, evidence and findings (Sprint 5), and the «in test» state (it needs evidence).

## Sprint 003 — «Marcos y controles» (2026-10-11)

The catalog's other two views go on screen, the list is paginated, and the repo adopts the kit v2.1.0 rule of one live pull request.

### Added

- **`/catalogo/marcos`:** the 14 frameworks with their version in the catalog, their date, licence and what the licence requires,
  freshness and how many tests cite each one; the OWASP LLM Top 10 2025 → 2026 equivalence map with what changed and the
  tests that cite the new entries; and the catalog snapshots, the official one marked. What the snapshot does not know is said
  as not recorded (no comparison with the official source, no version notices), never simulated.
- **`/catalogo/controles`:** the default ISO/IEC 42001 layer with its note that no summary is checked against the standard, the nine
  Annex A areas, the controls that tests give evidence to (each test links to its record, and a partial equivalent from another
  framework is marked «Incomplete map»), and the tests with no control assigned as a visible debt.
- **Catalog list:** 20 tests per page with «Previous» and «Next», and a seventh filter, «Tool», on the tool each test is measured with.
- **Error state:** an invalid catalog's rejected tests are listed with their identifier and reason in both languages, driven by a real
  validator finding.
- **`un-pr-vivo`:** the kit's job that fails a second open pull request unless its body starts with «complementa #N», and the
  monthly Dependabot schedule for GitHub Actions. Added to the `main-protegida` ruleset as a required check.

### Changed

- **Performance:** the Sentry SDK is imported only when a DSN is configured. Without one, the main chunk every page runs falls from
  465 KB to 228 KB. The CI Lighthouse step warms the server up with an unmeasured run before it measures. `/catalogo` is back on the
  kit's default budgets, and ADR-006 is superseded.
- **Sidebar:** Frameworks and Controls are live links; Proposals is still marked «soon».

### Fixed

- Long framework names no longer overflow the 380 px width of the controls page: they wrap as text, not as an identifier.

## Sprint 002 — «El catálogo navegable» (2026-10-11)

The first screen: the catalog the Sprint 001 left as data can be browsed, and the repo adopts the kit v2 method.

### Added

- **`/catalogo`:** the 38 tests of the official snapshot with six filters (family, framework, control, maturity,
  freshness, content review), a freshness-by-family panel and the empty and no-results states (an invalid snapshot fails the build instead of
  showing an error screen; the error component exists and is covered by the fidelity gate).
- **`/catalogo/<id>` × 38:** one record per test with the expected result, why it matters, how the verdict is decided,
  the run configuration, when it applies, framework and controls, sources, and the review-due, overdue and flagged
  notices. English and Spanish, both always in the page.
- **Console shell:** sidebar with the five sections (only Catalog is live), context bar with theme and language that
  persist, built on the design system's `tokens.css` and `app.css` as the single source.
- **Query date:** the freshness is computed at the date of the commit being built (or `HACKGUARD_CONSULTA`), never the
  clock, so a published page ages when it is published again.
- **Kit v2:** the core constitution and its annex, the v2 commands, `scripts/horas-sprint.mjs` and
  `scripts/cero-enlaces.mjs` (a zero-links step in `quality`), and one Lighthouse run per URL.
- **Gates:** vetoed ink and loose colours in `src/`, fidelity of the screen against the maqueta, the 38 records on every
  date a state changes, and an e2e for the catalog with axe in both themes.

### Changed

- **AU-14 paid:** the state vocabulary gains `pendiente_de_revision` and `familia` (11 vocabularies, 37 states), and the
  official snapshot is `datos/instantaneas/2026-10-05-010a8c56f706.json`.
- The root redirects to `/catalogo`; `noindex` is gone from the app pages (the deployment protection keeps them private).

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
  It recognises seven shapes; the manual says what it does not see.
- **Canonical fingerprint:** JCS (RFC 8785) + SHA-256 through `crypto.subtle`.
- **Snapshots** (`pnpm catalogo:instantanea --fecha YYYY-MM-DD`):
  - the approved catalog, the state vocabulary, the thresholds and the freshness semaphore;
  - a publication gate: nothing is written when the catalog is invalid.
  - Official snapshot: `datos/instantaneas/2026-10-05-010a8c56f706.json`.
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
  - 004, the `modelo_decision` family and its demo asset;
  - 005, `compression` overridden to 1.8.2 under `serve` (GHSA-vc2v-76pw-4v95).

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

### Fixed in the sprint's audit (56 findings, `sprints/SPRINT_001-auditoria.md`)

- **Gates that could not fail now can:** tests date from the catalog's latest verification, the engine lint
  blocks `crypto.randomUUID`, `globalThis` and dynamic import, and new tests cover input order, the seed
  manifest, 30-day months, Brier and the threshold band. The determinism e2e runs without retries.
- **Secrets:** CI installs gitleaks 8.30.1, so the hook's bait test runs there; the hook is tested with only one
  of its two tools present.
- **CLI:** `instantanea --agregar` requires `--salida` outside `datos/`, and a file from outside the repo is
  recorded without the machine's path. The CLI names a file that is not UTF-8, explains a BOM, and warns about
  files in `datos/` that it does not read. The demo classifier's errors are bilingual.
- **Review:** the validator shows the fingerprint a person records to approve a flagged test.
- **Data:** framework licence names are bilingual and framework names are the publishers' titles. CWE 4.20's date
  comes from its own archive, and the attributions name authors, DOIs and each work's address.
- **Snapshots:** versioned snapshots are revalidated against today's validator, and the 2026-10-04 snapshot was
  replaced. A test checks that the fingerprints cited in the guide and in ADR-002 are the engine's.

