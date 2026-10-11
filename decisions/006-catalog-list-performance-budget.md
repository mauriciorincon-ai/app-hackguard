# ADR-006 — The catalog list has its own performance budget

- **Date:** 2026-10-11 · **Status:** accepted · **Sprint:** 002
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
3. The margin warning of the same script still applies: a measured value within 10 % of its budget is reported.

## Consequences

- The page is still gated: a regression that adds hundreds of milliseconds turns the check red. A wildcard `/*` must not
  come back: a path `/` matches every URL.
- **Condition to retire it:** the list is paginated or virtualized, or the measured LCP falls under 3.0 s and TBT under
  300 ms with the default budget.
