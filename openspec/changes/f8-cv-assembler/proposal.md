# Proposal: CV Assembler (F8)

## Intent

F6 produces a scored match report. No component turns that data + `cv.json` into an optimized CV Markdown. F8 bridges the gap: programmatic CV assembly from structured data, with JD-aware achievement selection, skill reordering, and reframe hints for the external LLM agent. Replaces manual template adaptation (currently done by hand in `applications/{REF}/`).

## Scope

### In Scope
- `lib/assembler.js`: single-module API that takes `cv.json` + F6 `matchResult` and produces complete CV Markdown
- Per-achievement relevance ranking (keyword overlap + domain match + impact level), computed independently of F6
- Top-N achievement selection per experience entry (configurable N=4 default)
- Skill category + item reordering by JD keyword overlap
- Best-effort output with `lowConfidence` flag when match score < threshold (35%)
- CLI wrapper: `node scripts/assemble-cv.js <cv.json> <match.json> [--lang en|es]`
- Exported `reframeHints` array for external LLM agent consumption (achievement ID + suggestion text)

### Out of Scope
- LLM-based text reframing (external agent)
- PDF generation (existing `build-cv.js`)
- Handlebars or template engine dependency
- F6 modifications (assembler is consumer, not modifier)

## Capabilities

### New Capabilities
- `cv-assembly`: Programmatic CV Markdown generation from structured CV JSON and F6 match output. Computes achievement relevance ranking, selects top achievements, reorders skills by JD relevance, produces complete Markdown sections with reframe hints.

### Modified Capabilities
None.

## Approach

**Module**: Single CJS `lib/assembler.js` — consumable by agent or CLI. Zero new deps. Follows existing `lib/matcher.js` pattern: lazy-loaded config, pure functions, `require()`-cached data.

**Ranking formula**: `relevance = keywordOverlap(ach.technologies/domains × jd.hardKeywords) × 0.5 + domainBoost(ach.domains ∩ jdDomainSet) × 0.3 + impactMult × 0.2`. No modification to F6 scorers.

**Skill reorder**: Sort categories by JD keyword count across items; sort items within category by JD keyword match. Unmatched items trail.

**Output sections**: header → professionalSummary → coreCompetencies → coreSkills → professionalExperience → education.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/assembler.js` | New | Core: `assembleCV(cv, matchResult, opts)` + ranking + MD builders |
| `scripts/assemble-cv.js` | New | CLI wrapper |
| `lib/assembler.test.js` | New | Unit + integration tests |
| `lib/matcher.js` | None | Consumer only — assembler imports `matchCV` result shape |
| `data/cv_en.json` | None | Read-only source |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ranking formula over-selects same achievement | Low | Configurable N-per-experience cap with diversity scoring |
| Low-score CVs produce misleading output | Medium | `lowConfidence: true` flag + warning header in output; agent gate |

## Rollback Plan

Delete `lib/assembler.js`, `lib/assembler.test.js`, `scripts/assemble-cv.js`. No other files touched. F6 and CV data unchanged.

## Dependencies

- F3: `data/cv_en.json`, `data/cv_es.json` (read-only)
- F6: `lib/matcher.js` output shape (`{ scorers, summary, recommendation }`)
- Zero new npm deps

## Success Criteria

- [ ] `assembleCV(cv, matchResult)` produces valid Markdown for 2 real CV+match pairs
- [ ] Output passes structural validation (6 required sections present, no empty sections)
- [ ] Achievements selected per experience match JD keyword domains at ≥60% rate
- [ ] Skill categories reordered: highest JD-overlap category first
- [ ] `lowConfidence: true` emitted when match `overall.percentage` < 0.35
- [ ] CLI exits 0 for valid input, non-zero for missing/invalid files
