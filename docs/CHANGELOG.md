# HackGuard — changelog

The app's own changelog, one entry per sprint. The root `CHANGELOG.md` belongs to the kit the repo was stamped
from.

## Sprint 009 — «Listo para el gate» (2026-10-13)

The closing sprint of milestone H-1: the debt of seven sprints paid, the architecture written down as built, the data sheet figures taken from commands, and the screens read in both languages.

### Added

- **`propuestas:aportar`** (RF-07.2b): a person contributes the page the researcher could not read; it is sealed like a page the agent read (`hackguard/aporte@1`, `aportes.json`), and blocked for every Claude Code session.
- **`datos/propuestas/licencias.json`:** what each framework's licence lets a proposal quote. A framework whose licence allows identifiers only (ISO/IEC 42001) is neither contributed with `aportar` nor quoted in a sealed run (`borrador/licencia-sin-texto`), because the run is published with the repository.
- **RF-07.5 as a sealing rule:** a version notice needs the new version inside a verified quote; otherwise the proposal pauses. The planted-order filter now scans the whole page read, and a metric, a date or a version needs its value inside its quote.
- **`datos/vistas/etiquetas.json`:** the vocabulary of the catalog, controls and frameworks screens as data, outside the snapshot's fingerprint. A test fails if any component writes a state role or symbol.
- **Titles per page** (WCAG 2.4.2), the paging hands the focus over at the ends (2.4.3), and the buttons that open a panel say `aria-expanded`.
- **`docs/BLUEPRINT.html`** (as built), **`decisions/README.md`** (the ADR index), **`design-system.md` 1.1.0**, the refreshed **`docs/brochure-export.json`** and **`docs/BROCHURE.html`**, with **`scripts/cifras-del-export.mjs`** taking every figure from a command.
- **`scripts/verificar-salida-publicada.mjs --publico`:** fails if a public package carries the mockup or anything private.
- **`tests/unit/frases-caducadas.test.ts`, `etiquetas-en-componentes.test.ts`, `campos-con-lector.test.ts`:** the transversal gates that keep the debt paid.
- **The main flow in English** (`tests/e2e/flujo-en.spec.ts`): catalog, a record, frameworks, controls, asset and plan, intake, finding, dashboard, gap, control, report and inbox, each with no visible Spanish outside neutral data and no serious axe violation.
- **«Gate del H-1» opens the guide:** 29 short-gate stops grouped by screen family, numbered 1 to 29 and checked by a test, with their minutes (about 56, above the 20-minute target: the closing declares it and proposes two sessions).

### Changed

- **Gap engine:** a failure closed by a person stays a failed row but no longer makes its control «with failures» (ADR-010); the «Failed» filter counts partials and offers not-applicable.
- **Evidence:** counts must add up, any failing count fails a deterministic check, a corrector cannot lower the retest bar, ZAP warns outside its tested version, confirming a finding or importing a batch writes all or nothing, and private folders close to 0700 even if they existed.
- **The intake counts only what is still proposed** and compares verdicts by id; the e2e pins its query date.
- **Explicit test timeouts are gone** (the slowest test takes 1.0 s against the 5 s default) and a gate fails the next one that raises its own.
- **Audit of the sprint, paid inside it:** the planted-order filter reads a page with its spaces normalized (an order across a wrapped line no longer slips through) and a downloaded page stops at 5 MB even without a declared length; `validar` decides resealing per run from the readings it cites; a contributed file must name its own run; a version outside a verified quote says so in its own words in the inbox.
- **`/conoce`:** a `main` landmark, regions that exist only when a card is open, print shows every section, the language buttons say their visible text, and the policy hashes the one script and the one style (no `unsafe-inline` for styles on that route).
- **The lot's confirm command** now carries `--revisados N`, the count the CLI asks for, and the evidence files are written all or nothing even if a rename fails halfway.

### Not in this sprint

- Pasting text in the browser, real-asset reports and the public mode (H-2); the 38 controls checked against the standard (H-4).

## Sprint 008 — «Los agentes» (2026-10-12)

The researcher and the extractor exist as Claude Code skills that only propose: everything arrives in `/catalogo/propuestas`, where a person decides.

### Added

- **Two skills with subagents** (`.claude/skills/investigar`, `.claude/skills/extraer`; `.claude/agents/`) and five hooks that only let them write under `propuestas/corridas/` (ADR-011).
- **The inbox `/catalogo/propuestas`:** proposals with their sources checked by code (address and fingerprint pair), literal quotes, marks from the content filter, and decisions made by command (`pnpm propuestas:decidir`) into an append-only ledger.
- **Sealing:** the code seals each run with 17 signals; the suggested verdict is computed by the test's rule, never proposed by the agent.
- **Version notices** on the frameworks screen, from the researcher's runs, saying «none» only when a run backs it.
- **Two real runs** (3 and 1 proposals), undecided; guide block M, manual ES/EN.

### Not in this sprint

- Pasting a document to the researcher (RF-07.2b, paid in Sprint 009); suggested severity.

## Sprint 007 — «La brecha» (2026-10-12)

The confirmed evidence read as a gap: five screens over one calculation, so they say the same figures on every date.

### Added

- **`/tablero`** (the front page), **`/brecha`** (planned against run, by asset, family and control, and the expected-against-obtained table), **`/brecha/control`** and **`/brecha/control/<id>`** (each control's state, its evidence and its closure chain), and **`/brecha/informe`** (eight sections, the reproducibility sheet, printable on light paper).
- **Gap engine** (`src/engine/brecha/`, ADR-010): coverage, expected against obtained with its deviation, overdue findings with their days, the state of each applicable control (`con_fallas`, `evidencia_antigua`, `con_evidencia_vigente`, `sin_evidencia`), the alerts, and a JCS + SHA-256 fingerprint identical in Node, Chromium, Firefox and WebKit. The 180-day threshold lives in `datos/brecha/umbrales.json`.
- **Aging matrix** (rule 23): the gap is built on each of the 21 dates on which a state changes; the query date is the build's, never the clock.
- **Instrument validation (C18):** eight closure seeds in `docs/kit-de-prueba/semillas-de-cierre/`, run by the engine before anything is published.
- **Labels as data:** `datos/brecha/etiquetas.json` gives each state's colour role and symbol (rule 12).
- **Manual and guide:** «La brecha y el informe» in the manual; guide block L; block K moves to S6 and the gate's ⭐⭐ steps are numbered in document order.
- **Gates:** `brecha.spec.ts` (Spanish: the same figures on every screen, the closure chain, «no detectado» not counted, 380 px, axe in both themes, the report's PDF in Chromium), fidelity and interaction gates for the five screens, and eight demonstrations in red.

### Changed

- **A retest of a finding is always reviewed in its batch** (B2), as the failures are. Its regression was red before the fix.
- **The root and the logo** go to `/tablero`.
- **The control card** breaks long equivalence references instead of overflowing at 380 px.

### Not in this sprint

- The proposals inbox; the English e2e and captures (milestone close); the medium and low audit items, which go to the milestone's batch.

## Sprint 006 — «La carga de evidencia» (2026-10-12)

The report of a Garak or ZAP run becomes a batch of envelopes whose verdicts a rule computes; a person confirms the batch by reviewing every failure and a deterministic sample of the rest.

### Added

- **`/evidencia/carga`:** the intake screen, read-only, as in the maqueta: the batches, the recorded tools, the review of each envelope («Siempre», «Muestra», «Fuera»), the batch file card with its fingerprints, «Para confirmar» with the commands that decide, the selected envelope and «How the sample is chosen».
- **Adapters** (`src/engine/adaptadores/`): Garak (`report.jsonl`, range tested 0.17.0) and ZAP (Traditional JSON, with or without requests and responses). An adapter only translates; the verdict comes from the test's rule. ZAP's attack and evidence fields never reach an envelope, and a rule with no proof that it ran is «No ejecutada».
- **Batches** (`hackguard/lote@1`, ADR-009): one file per import, with three fingerprints (file, batch, record). Confirming a batch covers every failure and partial, plus a sample of the rest drawn with SHA-256 from the batch's fingerprint, and the plan's tiers are checked with exact arithmetic against their risk.
- **Effective ledger:** a batch's confirmation counts for its envelopes in memory only; the envelope format `hackguard/sobre@1` does not change.
- **CLI:** `pnpm evidencia:importar` and `pnpm evidencia:confirmar-lote`; `pnpm evidencia:validar` also checks the batches.
- **Demo data:** two batches (LOTE-0007 Garak, LOTE-0008 ZAP), both pending, and their envelopes.
- **Fixtures:** Garak's contract is a redacted local run against `test.Repeat`; ZAP's are the official outputs of zap-extensions (Apache-2.0) and two declared derivatives. Attribution in `docs/LICENCIAS-DE-MARCOS.md`.
- **Gates:** determinism of the sample and the ledger in Node, Chromium, Firefox and WebKit; the sample plan's risk checked for every size; fidelity of the screen against the maqueta; the e2e in Spanish with axe in both themes and at 380 px; eight demonstrations in red.

### Changed

- **Sidebar:** Evidence opens the intake; the findings are one click away.
- **The plan** links to the intake from its foot.
- **Hallazgos e2e:** the expiry check reads the state the engine computes instead of assuming a calendar date.

### Not in this sprint

- Pasted text and reading the file in the browser (the screen says so); other tools; coverage by control, report, dashboard and gap (Sprint 7); real evidence; the English e2e (milestone close).

## Sprint 005 — «Del sobre al hallazgo» (2026-10-11)

A result recorded by hand becomes an evidence envelope, a person confirms it, and a confirmed failure opens a finding with a computed severity, deadline and lifecycle that only a valid retest closes.

### Added

- **`/evidencia/hallazgos/<id>`:** four demo findings (HZ-0003, HZ-0005, HZ-0007, HZ-0009), each with its closure chain, its severity, the control it fails, «What you can do» (read-only: each outcome with its consequence and the command that records it) and its properties.
- **Evidence ledger** (`hackguard/sobre@1`): each envelope keeps three fingerprints (raw, canonical envelope, result without run identifiers). A confirmed envelope never changes; a correction is a new envelope that cites the one it corrects. The raw output of a tool is read only to compute its fingerprint and is never stored.
- **Findings** (`hackguard/hallazgo@1`): the file stores only human input; the state is computed. Closure needs a confirmed, passed retest of the same test and asset, after the correction, with the same tool, the same exact version, the same selector and at least the same repetitions. The absence of a finding in a later scan never closes it. An accepted risk still counts as a failure of its control.
- **Severity:** CVSS 4.0 with FIRST's scoring code vendored byte for byte from `c5b0d40` (BSD-2), behind a strict vector validator that rejects truncated or out-of-order vectors. The AI scale is a priority table in data (`datos/severidad/escala-ia.json`), impact first, with validated floor and ceiling.
- **Deadlines:** critical 7 days, high 30, medium 90; low and informational have none. They count from the confirmation of the envelope that opens the finding (`datos/hallazgos/plazos.json`).
- **CLI:** `pnpm evidencia:registrar`, `evidencia:confirmar`, `evidencia:validar`, `hallazgos:listar` and `hallazgos:declarar`. A finding already closed takes no further declaration.
- **Demo data:** 11 envelopes (10 confirmed, 1 proposed) and the 4 findings of the maqueta, as versioned demo data.
- **Gates:** determinism of the ledger and the findings in Node, Chromium, Firefox and WebKit; fidelity of the four screens against the maqueta; the aging matrix for deadlines and risk reviews; an e2e in Spanish with axe in both themes and at 380 px; eight demonstrations in red.
- **ADR-008:** the format of the envelope, the ledger and the finding.

### Changed

- **Sidebar:** Evidence opens the first finding; «Intake» is still marked «soon».
- **Constitution:** kit v2.2.0 (model gate, rule 29, milestone matrix).
- **Maqueta table:** `docs/diseno/README.md` lists what the product adds or leaves out against the maqueta (Sprint 5).

### Not in this sprint

- The intake screen and the Garak and ZAP adapters (Sprint 6); reopening a finding (D5); coverage by control, report, dashboard and gap (Sprint 7); real evidence; the English e2e (milestone close).

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

