# ADR-006 — The catalog list has its own performance budget

- **Date:** 2026-10-11 · **Status:** superseded (Sprint 003, 2026-10-11) · **Sprint:** 002
- **Planner reference:** standard 2.17.0 (LCP budget declared by ADR when a page is a dense, text-heavy screen);
  hard rule 20 (both languages always in the page); design decision 19 (dense table).

## Context

The default budget in `perf-budget.json` (FCP 1.5 s, LCP 3.0 s, TBT 300 ms) was written for small pages. `/catalogo` is
a dense table of 38 tests with both languages in the DOM: about 2,200 elements and a 164 KB document. In the CI
`lighthouse` job (one run per URL since kit v2) it first failed on all three metrics.

What was done before asking for a looser budget:

- the theme and language script is inline (a separate file arrived after first paint);
- both interface fonts are preloaded, which brought FCP under budget;
- the 38 rows are rendered on the server and the browser only shows or hides them, instead of hydrating each row.

After that, `/catalogo` still measured, in CI, **LCP 3.16 to 3.31 s and TBT between 378 and 709 ms** (three runs on
three commits). Two other attempts did not help and were dropped: hydrating less (a static HTML island for the table
measured TBT 323 ms against 268 ms with a slow local CPU) and a single looser entry next to the wildcard (Lighthouse
CI applies **every** matching budget, so the stricter one still wins). Locally the observed LCP of the page is 55 ms: the
figure comes from Lighthouse's simulated throttling, whose pessimistic estimate counts the framework scripts and the
layout of the whole document. The record pages (`/catalogo/<id>`) pass the default budget.

## Decision

1. `perf-budget.json` no longer has the `/*` wildcard. It has `/catalogo` with LCP 3.8 s and TBT 1,000 ms (FCP 1.5 s,
   CLS 0.1 and the resource sizes unchanged), and `/catalogo/*` with the default values for the 38 record pages.
2. Every measured route must have its own entry: `scripts/lighthouse-margen.mjs` fails when a URL in
   `lighthouse-urls.json` falls under no path. A new route is a conscious decision about its budget.
3. `lighthouse-categorias.json` gets the same split: the performance category of `/catalogo` must score at least 0.75 (CI
   measured 0.84 on the first run with the new budgets); every other route and the other three categories stay at 0.9.
4. The margin warning of the same script still applies: a measured value within 10 % of its budget is reported.

## Consequences

- The page is still gated: a regression that adds hundreds of milliseconds turns the check red. A wildcard `/*` must not
  come back: a path `/` matches every URL.
- **Condition to retire it:** the list is paginated or virtualized, or the measured LCP falls under 3.0 s and TBT under
  300 ms with the default budget.

## Update — Sprint 003: superseded, and the cause was not the table

Paginating the list (20 rows per page) left `/catalogo` at **LCP 3,151 ms and TBT 354 ms** in CI against the defaults
(3,000 and 300), so the list was measured locally with the same CPU slowdown (30x) to find what actually costs time:

| Local measurement, `/catalogo`                                 | LCP               | TBT           |
| -------------------------------------------------------------- | ----------------- | ------------- |
| 38 rows in the document, 18 hidden (the paginated list)        | 3,308 ms          | 403 ms        |
| 20 rows in the document                                        | 3,312 ms          | 408 ms        |
| **0 rows** in the document (DOM 554 elements instead of 2,211) | 3,155 to 3,215 ms | 399 to 610 ms |

Removing the whole table changed nothing, so the dense table was the wrong suspect. The record page (`/catalogo/<id>`,
475 elements) measured the same 3.1 s in three of four local runs: the budget it passes in CI is a matter of timing, not
of size. What both pages share is the JavaScript the browser must download and run before the page counts as painted in
Lighthouse's simulated model: a 465 KB main chunk. About half of it was the Sentry SDK, bundled by a static import in
`instrumentation-client.ts` even though the SDK does nothing without a DSN.

**Change:** the SDK is imported with a dynamic `import()` inside the branch that has a DSN. Without a DSN (CI, today's
production) the branch is dead and no page references the SDK chunk; with a DSN it loads apart, off the critical path.
The privacy options (`beforeSend`, no breadcrumbs, exception message reduced to its type) are unchanged.

| Local measurement after the change (4 runs) | LCP               | TBT           |
| ------------------------------------------- | ----------------- | ------------- |
| `/catalogo` (38 rows in the document)       | 2,811 to 2,873 ms | 217 to 269 ms |
| `/catalogo/PR-IA-PINJ-001`                  | 2,653 to 2,811 ms | 197 to 318 ms |

**Decision:** `perf-budget.json` and `lighthouse-categorias.json` are the kit defaults again, with no entry of their own
for `/catalogo`. The condition to retire this ADR (default budget met) holds once the CI run of the Sprint 003 branch
confirms it. The paginated list stays: it is shorter to read, and it is not what bought the budget.
