# ADR-011 — The researcher and the extractor (generative AI): why the code is not enough, and where it stops

- **Date:** 2026-10-12 · **Status:** accepted · **Sprint:** 008
- **Planner reference:** `portafolio/hackguard/sprints/SPRINT_008.md` and the agents plan v2.0.0 made with planlang
  (`investigacion/2026-10-11-plan-agentes-planlang/`, fingerprint `3021ab88…`), both read only. Requirements RF-07.1 to RF-07.7
  and RF-08.1 to RF-08.3. Hard rules 2, 3, 4, 6, 8 and 17-bis. This is the "code first" ADR that rule 2 of the constitution
  requires **before** building the two skills (template: `PLANTILLA-ADR-codigo-primero.md`).

## 1. The feature, in one user sentence

Two Claude Code skills that **only propose**: the **researcher** brings new tests, framework versions, retirements and tool
updates, each with sources the code checked; the **extractor** matches a pasted result to a test in the plan, with literal
quotes the code checked and a verdict that the test's rule computes. Everything lands in an inbox where a person approves,
rejects or splits. Neither skill runs tests, closes a finding, sets a severity or decides anything.

## 2. What was tried with CODE first

| Deterministic attempt                                                                                                                                                           | What it solved                                                                                                         | Where it fell short                                                                                                                                                  | Evidence                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fetch the structured access routes of a framework (`vias_de_acceso`, whitelist `lista_blanca_de_fuentes`) and compare the catalog's `version_vigente` with what the source says | Where to look, and which domains may be read; a 403 is recorded as `fuente_no_accesible_al_agente`, never circumvented | A page cannot be turned into a **new test** or a **mapping between two versions** without reading it: the code can find and fingerprint the page, not write the test | `datos/marcos/*.json` (14 frameworks, routes and whitelists); `src/engine/catalogo/esquemas.ts`                                                                                                                  |
| Check that a quote is a **literal substring** of the page or pasted text after normalizing whitespace (U1 = 1.0)                                                                | Detects an invented or paraphrased quote with no model at all                                                          | It cannot tell a real quote placed in the **wrong field** (risk R5): the quote exists, the meaning is wrong                                                          | `src/engine/propuestas/citas.ts`; seed set S1 (20 quotes, 10 invented, all 10 flagged): `docs/kit-de-prueba/semillas-de-agentes/semillas.json`, `tests/unit/propuestas/semillas.test.ts`                         |
| Compute the **verdict** with the catalog rule over the fields whose quote was verified (D2)                                                                                     | The verdict never comes from a model; with no verified count there is no verdict                                       | The counts must first be **read** out of free text (a log line, a scanner summary): that reading is language work                                                    | `calcularVeredicto`, `src/engine/evidencia/veredicto.ts`; `src/engine/propuestas/veredicto.ts`; `tests/unit/propuestas/antiguedad-pagina-veredicto.test.ts`                                                      |
| The content filter (patterns of **form**) over every proposal, plus a second set that marks planted instructions                                                                | Marks, never rejects: a person sees the mark (RF-07.4)                                                                 | A pattern list cannot recognise every phrasing of an instruction; marking is a net, not a wall                                                                       | `datos/filtro/patrones.json` (7 patterns) and `datos/propuestas/instrucciones.json` (6 patterns), each with bait and counter-examples; seed set S2 (3 cases) in the same `semillas.json`                         |
| Age of the framework version (> 180 days goes to a person, U3) and at least 2 verified sources (U2)                                                                             | Both are plain arithmetic over dates and counts                                                                        | None: they are fully deterministic                                                                                                                                   | `src/engine/propuestas/antiguedad.ts`, `fuentes.ts`; thresholds as data in `datos/propuestas/umbrales.json`; `tests/unit/propuestas/{fuentes,verificar}.test.ts`                                                 |
| An append-only ledger of decisions, and the instrument validation of S7                                                                                                         | Who decided what and when; the build stops if a seed fails (rule 9)                                                    | None for the ledger; the instrument only proves the checks, not the model                                                                                            | `src/engine/propuestas/decisiones.ts`, `datos/propuestas/decisiones.jsonl`; `exigirInstrumentoVerde`, `src/lib/brecha/mundo.ts` (S1 and S2 now stop the build); `tests/unit/propuestas/{decisiones,cli}.test.ts` |

Writing the **text of a new test** (what is verified, why it matters, the expected result, in two languages and without a
payload), choosing **which test of the plan** a pasted text belongs to, and extracting **counts and quotes** from free text are
what code cannot do. That is the whole of the model's job.

## 3. Where the model enters and where it does NOT

- **Enters in:** (a) the researcher reads extracts the code already fetched and fingerprinted, and drafts a proposal in its own
  words with the passage it relies on copied literally; (b) the extractor reads a pasted text and the list of tests of one plan,
  picks up to three candidate tests when unsure (RF-08.2), and proposes the fields with a literal quote for each.
- **Does NOT enter in:** searching or fetching (a script does it, whitelist only, no model network); verifying a source or a quote;
  the **verdict** (the rule); the **severity** (a person, with the reference calculator; the agents never suggest or prefill one,
  D3); approving, rejecting, closing a finding or confirming an envelope; writing outside `propuestas/`; anything about a real
  asset (the extractor does not run on `datos/privado/` in this sprint).
- **Input to the model:** extracts and fingerprints of public pages of the catalog's frameworks; for the extractor, a demo text and
  the ids, names and rule inputs of one demo plan. Never an identifier of the person running it, never a raw tool output of a real
  asset. Requests carry no user identifiers (a hook checks it) and are https only.
- **Output of the model:** one JSON per run, validated by a strict Zod schema (`hackguard/propuesta@1`, draft form). The draft
  **has no field** for a verdict, a severity, a verification result or an identifier: a model that writes one fails the schema.
  The code adds the identifier, the verification, the computed verdict and the trace, and seals the run.

## 4. Deterministic fallback (mandatory)

The app is complete without either skill. A test is written by hand in `datos/pruebas/` and goes through the catalog validator; an
envelope is recorded with `pnpm evidencia:registrar` (manual route, E-6) or imported from Garak or ZAP (ADR-009). When a skill
produces an invalid file, the run is retried at most twice and then **reported on the inbox** as a proposal that could not be read;
the other proposals stay. A source that answers 401, 403 or 429, or needs a session, is logged as `fuente_no_accesible_al_agente`
and the report says the operator can read that document themselves and make the change by hand: it is never retried with other headers. (Attaching a document for the researcher to process, as RF-07.2b describes, is not built in this sprint; the extractor does accept a pasted text, as a file.)

## 5. Provider, cost and privacy

- **Provider order:** Claude Code under the user's subscription, run by a person with `/investigar` or `/extraer`. No API, no
  key, no token in env or repo (rule 21). No skill can be launched by another agent (hook).
- **Cost:** US$0 on top of the subscription. The plan v2 sets a demo batch of 20 and a full batch of 200 cases, run **outside CI**;
  this sprint runs neither (supposition S3 and the batches are deferred to H-2). CI validates schemas and fingerprints and never
  touches the network.
- **Privacy:** only metadata and a short literal fragment per source are stored, plus the fingerprint of the page; **the page and
  the pasted text are never stored in the repo** (`propuestas/.lecturas/` is ignored). Requests carry no cookie, no credential, no
  referrer and no identifier. Real assets stay in `datos/privado/` (rule 8).
- **HITL:** every proposal is decided by a person. Approving an envelope proposal creates an envelope **to be confirmed**, with the
  format `hackguard/sobre@1` unchanged (ADR-008); confirming it is a second, individual decision. A verdict a person corrects is
  counted by the signal `veredicto_corregido_por_persona` (R5).

## Decisions of this sprint that refine the plan

1. **The envelope format does not change.** The sprint text speaks of an envelope with `origen: extractor`; `origen` in ADR-008 says
   where an envelope lives (`demo` or `propio`), not who proposed it. The proposal that originated an envelope is linked in the
   decision ledger and in the envelope's `advertencias`.
2. **A quote is valid for a field only if** it is a literal substring and, for a numeric field, the number appears in the quote. A
   real quote that does not contain the value it supports is flagged like an unverified one (an extra defence against R5; it marks,
   it never rejects).
3. **`pausa_humana` means "arrives flagged".** Every proposal is decided by a person; the signal is true when a threshold (U1, U2,
   U3), an instruction mark or a missing count flags it.
4. **Approving does not apply everything alone.** A test passes the catalog validator (`propuesta → aprobada`) and enters in the next
   snapshot; a framework version, a retirement or a tool update records the decision and lists the data change a person makes. The
   official snapshot is not regenerated.
5. **A demonstration proposal does not write by default.** The demo runs live in `propuestas/demo/`; approving one that would write to
   the catalog or the evidence ledger needs `--aplicar-a-demo`. The envelope of a demo asset carries the synthetic raw fingerprint of
   its id (the ledger rule of ADR-008 for `origen: demo`); the fingerprint of the pasted text stays in the envelope's warnings. The
   test that approves such an envelope found that the first version of the code put the text's fingerprint there and the ledger
   refused it.

## Consequences

The product gains the two `[MVP]` agent functions with the rule "AI proposes, a person approves" enforced by schema, hooks and a
verifier, at no cost. It accepts two residual risks, both declared. **R5**, a real quote in the wrong field: covered by
the numeric check of decision 2, the individual confirmation of every envelope and the signal `veredicto_corregido_por_persona`.
And **planted false data that looks like a result**: seed set S2 proves that a planted _order_ does not change the verdict, but not
that a pasted text carrying forged counts is rejected, because to the extractor a forged count and a real one are the same text. It is
caught by the mark on any planted instruction and by the person who confirms the envelope, never by the code; confirming an envelope
from a text the person did not produce is the person's responsibility. The experience that CI cannot see (does the inbox
read well, does the mark stand out) goes to the human gate of the milestone.
