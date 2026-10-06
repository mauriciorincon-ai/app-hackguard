# ADR-002 — Catalog data format and canonical fingerprint

- **Date:** 2026-10-04 · **Status:** accepted · **Sprint:** 001 («El catálogo vivo»)
- **Planner reference:** G-Plan decision P2 (`portafolio/hackguard/ordenes/SPRINT_001-orden.md`); hard rules 1
  and 10 of `CLAUDE.md`; RNF-01 and RF-01.7 of the requirements.

## Context

The catalog (frameworks, controls, tools, tests, vocabularies) is data, not code (hard rule 10), and every plan
will reference a snapshot of it by fingerprint (RF-01.7). The same data and the same evaluation date must give the
same bytes in Node and in Chromium, Firefox and WebKit (hard rule 1, RNF-01). The G-Plan offered YAML or JSON as
the authoring format.

## Decision

1. **JSON is the only format.** One file per entity: `datos/marcos/<id>.json`, `datos/herramientas/<id>.json`,
   `datos/pruebas/<familia>/<id>.json`, `datos/controles/<capa>.json`. Shared vocabularies have one file each:
   families, verdict rules, profile traits, filter patterns, thresholds and states. YAML was rejected for three
   reasons:
   - it needs a parser in the engine, and that parser would have to behave identically in four runtimes;
   - its implicit typing turns `no`, `1.0` or `2026-10` into something other than what was written;
   - JSON already is the input of the canonical form below.
2. **Schemas validate and never transform.** Zod 4 schemas (`src/engine/catalogo/esquemas.ts`) have no `.trim()`,
   `.default()` or coercion, so the parsed value is structurally what is written on disk. Every product text is a
   `{ es, en }` map.
3. **The fingerprint is SHA-256 over the JCS canonical form (RFC 8785).**
   - `src/engine/huella.ts` sorts keys by UTF-16 code units, never by locale.
   - Numbers are serialised as ECMAScript does, and the hash runs through `crypto.subtle`.
   - Lone surrogates, non-finite numbers, `undefined`, cycles and non-plain objects are rejected.
   - Because the hash is taken over the parsed value, formatting on disk (indentation, key order, Prettier) never
     changes a fingerprint.
4. **The engine is pure.** `src/engine/` reads no files, no clock and no randomness; ESLint enforces it with
   `no-restricted-globals`, `no-restricted-properties` and `no-restricted-imports`. The evaluation date is an
   input. `src/cli/cargar.ts` is the only catalog piece that touches the file system: it hands the engine the
   file texts and their paths.
5. **Snapshots** are written as `datos/instantaneas/<date>-<first 12 hex of the fingerprint>.json` with format
   `hackguard/instantanea@1`.
   - **Contents:** the whole catalog (frameworks, maps, controls, tools, vocabularies, thresholds, states) with
     only its publishable tests (approved, no errors, content review up to date). Next to it: the freshness
     semaphore on the evaluation date, the tests awaiting review, and the validator's warnings and notes.
   - **Not written** if the catalog is invalid (publication gate, RF-10.6).
   - **Rejected dates:** an evaluation date earlier than the catalog's latest verification.
   - **Versioned snapshots are records, checked two ways** (`tests/unit/catalogo/instantaneas-versionadas.test.ts`):
     - **Self-consistency:** fingerprint = content, name = date + fingerprint, bytes = what the CLI writes.
     - **Today's validator:** its own catalog, rebuilt from the file, has no errors. If today's filter is the
       version the snapshot cites, re-emitting it gives the same fingerprint.

     Neither check requires equality with today's catalog.
   - **A snapshot that today's validator rejects is replaced in the same PR by a re-emitted one,** as long as no
     plan cites it (audit finding AU-48).
     - **Sprint 001:** the audit made licence names bilingual, which rejects `2026-10-04-12d3b632a871.json`. It
       was replaced by `2026-10-05-703a0479d567.json`.
     - **From Sprint 2:** once plans cite snapshots, a schema change that rejects one needs a migration decided
       in its own ADR.
6. **Tool selectors are part of the schema, one shape per adapter.**
   - `TIPOS_DE_SELECTOR` in `esquemas.ts` knows four shapes: garak (probes and detectors), ZAP (`pluginid`), a
     generic `modulo` reference, and a human `revision`.
   - A third adapter (promptfoo, PyRIT or Inspect) adds its shape there. That is the adapter's contract, kept as a
     declared constant rather than spread through the engine.
   - The task for Sprint 3, when the adapters arrive: move each selector to
     `src/engine/adaptadores/<id>/selector.ts`, and build the union from that registry. After that, adding an
     adapter no longer touches the catalog schema (hard rule 10).
   - Audit finding AU-16.
7. **The CLI runs on Node's native TypeScript type stripping** (`node src/cli/catalogo.ts`), with `.ts` import
   extensions and `allowImportingTsExtensions`, instead of adding `tsx`. Only erasable syntax is used in
   `src/engine/` and `src/cli/`.

## Consequences

- **The same code, the same fingerprint everywhere.**
  - `tests/e2e/determinismo.spec.ts` bundles the engine with esbuild. It evaluates 11 days after the catalog's
    latest verification.
  - On 2026-10-05 that was the snapshot of 2026-10-16: fingerprint `2c1c927d29db…` in Node (three CLI runs) and in
    Chromium 153, Firefox 155 and WebKit 26.6.
  - `tests/unit/guia-huellas.test.ts` checks that the fingerprints this ADR and the test guide cite are the
    engine's.
- **Authoring JSON by hand is noisier than YAML.** The validator compensates by naming the file, field and rule of
  every finding in both languages.
- **No transpiler for the CLI, but restricted syntax.** `enum`, `namespace` and parameter properties are out.
  Node 22 in CI and Node 24 locally both run it.
- **A format change bumps the format version.** Any future change to the snapshot shape bumps
  `hackguard/instantanea@N`. `@1` was not bumped when the semaphore was added in Sprint 001, because no snapshot
  had been versioned before.
