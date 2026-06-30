# Proposal: Decouple Tests from Personal Data

## Intent

6 test files load real CV data (`cv_en.json`, `cv_es.json`), application tracking, or real JDs from `applications/`. This couples the test suite to personal data and blocks making the repo public.

## Scope

### In Scope
- Create 4 shared fixtures in `test-fixtures/`: `anonymous-cv.json`, `anonymous-tracking.md`, `anonymous-jd-en.md`, `anonymous-jd-es.md`
- Modify 6 test files to load fixtures instead of real data (`assembler.test.js`, `cover-letter.test.js`, `matcher.test.js`, `pdf-builder.test.js`, `analytics.test.js`, `keyword-extractor.test.js`)
- Update ~50 hardcoded assertions to match anonymized fixture values
- 3 test files need zero changes (`scorer.test.js`, `extract-keywords.test.js`, `score-cv.test.js` — already decoupled or only checking shape)

### Out of Scope
- Factory functions (`minimalCV`, `makeMatchResult`) — already well-decoupled
- Core pipeline code — zero changes
- Test runner or framework changes
- PDF test infrastructure changes (only assertion values)

## Capabilities

### New Capabilities
None — this is a test infrastructure refactor, no new system capabilities.

### Modified Capabilities
None — test data decoupling does not change any spec-level behavior.

## Approach

**Create anonymized fixtures** that mimic the structure of real data but with generic values:
- `anonymous-cv.json`: same schema as `cv_en.json` with "Anonymous User", generic company names, placeholder URLs
- `anonymous-tracking.md`: 3 entries with synthetic REFs (FIX1, FIX2, FIX3), made-up scores
- `anonymous-jd-en.md` / `anonymous-jd-es.md`: generic "Software Engineer" JDs

**Update imports** in 6 test files from `require('../data/cv_en.json')` → `require('../test-fixtures/anonymous-cv.json')`

**Rewrite assertions** to match fixture values; preserve test semantics (what is tested), only change expected values.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `test-fixtures/` | New: 4 files | Anonymous fixture data |
| `lib/assembler.test.js` | Modified | 1 assertion (name) |
| `lib/cover-letter.test.js` | Modified | 1 assertion |
| `lib/matcher.test.js` | Modified | 2 assertions (jdYears, seniority) |
| `lib/pdf-builder.test.js` | Modified | ~15 assertions (name, email, phone, companies) |
| `lib/analytics.test.js` | Modified | ~12 assertions + load path |
| `lib/keyword-extractor.test.js` | Modified | ~25 assertions + load path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fixture data diverges from real CV schema | Low | Copy schema structure verbatim; use same field names/types |
| Assertion rewrites miss edge cases | Low | Run full test suite after each file change; batch per file |
| Overscoping into factory changes | Low | Scope locked to 6 files; factory files excluded |

## Rollback Plan

`git revert` the commit. Fixtures are additive — deleting them and reverting test imports restores original state. Zero pipeline code was changed.

## Dependencies

None. Test fixtures only; no package dependencies, no structural changes.

## Success Criteria

- [ ] `npm test` passes with zero failures using ONLY fixture data
- [ ] No test file imports from `data/cv_en.json`, `data/cv_es.json`, or `applications/` directory
- [ ] `grep -r "cv_en.json\|cv_es.json\|jd-tracking.md" lib/*.test.js scripts/*.test.js` returns empty
