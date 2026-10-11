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

After that, `/catalogo` still measured **LCP 3.16 to 3.27 s and TBT 378 ms** in CI. Locally the observed LCP of the same
page is 55 ms: the figure comes from Lighthouse's simulated throttling, whose pessimistic estimate counts the framework
scripts and the layout of the whole document. The record pages (`/catalogo/<id>`) pass the default budget.

## Decision

1. `perf-budget.json` gets a first entry for `/catalogo` only: LCP 3.8 s and TBT 450 ms. FCP stays at 1.5 s, CLS at
   0.1 and the resource sizes are unchanged. The wildcard entry keeps the default for every other route. The entry must
   stay **before** `/*`: Lighthouse CI applies the first matching budget.
2. The margin warning of `scripts/lighthouse-margen.mjs` still applies: a measured value within 10 % of its budget is
   reported.

## Consequences

- The page is still gated: a regression that adds hundreds of milliseconds turns the check red.
- **Condition to retire it:** the list is paginated or virtualized, or the measured LCP falls under 3.0 s and TBT under
  300 ms with the default budget.
