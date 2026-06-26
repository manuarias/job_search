# Proposal: Cover Letter Generator (F9)

## Intent

No cover letter exists in the pipeline. F9 bridges the gap: programmatic cover letter skeleton generation from CV JSON + F6 match result. Emits a structured template with placeholders for an external LLM to fill in. Refuses output entirely when the match is too poor — no false hope.

## Scope

### In Scope
- `lib/cover-letter.js`: single CJS module consuming `cv.json` + `matchResult` + JD text
- Fixed 5-paragraph skeleton: opening, leadership, technical, mentoring, closing
- Narrative breadth selector: picks achievements across leadership, technical, and mentoring domains (not just highest-ranked)
- Placeholder slots for LLM prose (`[INSERT: ...]`)
- Refusal gate: no output at all when `matchResult.overall.percentage < 0.35` (stricter than F8's `lowConfidence` warning)
- CLI wrapper: `node scripts/generate-cover-letter.js <cv.json> <match.json> [--lang en|es] [--jd jd-text.txt]`

### Out of Scope
- LLM-based text generation (external agent)
- PDF generation (existing `build-cv.js`)
- Company/role research beyond JD text
- Tonal variation (Q1: fixed scaffold for all)

## Capabilities

### New Capabilities
- `cover-letter`: Cover letter skeleton generation from structured CV JSON and F6 match output. Selects achievements across leadership, technical, and mentoring narratives. Emits placeholder-based template for LLM fill. Refuses output when match score is below threshold.

### Modified Capabilities
None.

## Approach

Single CJS module (`lib/cover-letter.js`), zero new dependencies. Follows existing `lib/assembler.js` patterns: `'use strict'`, lazy-loaded config, pure functions, single public export. Narrative selection uses breadth-first domain allocation (leadership ×1, technical ×1, mentoring ×1) rather than raw ranking. Placeholder format: `[INSERT: {domain} achievement — impact: {metric}]`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/cover-letter.js` | New | Core: `generateCoverLetter(cv, matchResult, jdText, opts)` + selectors + placeholder builders |
| `scripts/generate-cover-letter.js` | New | CLI wrapper (args → generateCoverLetter → stdout) |
| `lib/cover-letter.test.js` | New | Unit + integration tests |
| `lib/assembler.js` | None | Read-only consumer of same data shape |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No achievements found for one narrative domain | Medium | Fallback: widen domain selection to next-best achievement |
| JD text too short to extract useful context | Low | Gate: if JD < 100 chars, refuse with error |
| Placeholder format is too rigid for LLM | Low | Format is plain text `[INSERT: ...]` — any LLM can process it |

## Rollback Plan

Delete `lib/cover-letter.js`, `lib/cover-letter.test.js`, `scripts/generate-cover-letter.js`. No other files touched.

## Dependencies

- F3: `data/cv_en.json`, `data/cv_es.json` (read-only)
- F6: `lib/matcher.js` output shape (`{ overall, scorers, summary, recommendation }`)
- Zero new npm deps

## Success Criteria

- [ ] `generateCoverLetter(cv, matchResult, jdText)` produces 5-paragraph skeleton with placeholders for strong match (≥0.35)
- [ ] `generateCoverLetter()` returns `{ refused: true, reason: "..." }` when match < 0.35
- [ ] Output skeleton has exactly one achievement per narrative domain (leadership, technical, mentoring)
- [ ] Placeholder format is parseable: `[INSERT: ...]` on its own line
- [ ] CLI exits 0 for valid skeleton, 0 with empty stdout for refused, non-zero for invalid input
