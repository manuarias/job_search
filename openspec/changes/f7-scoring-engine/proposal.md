# Proposal: F7 Scoring Engine

## Intent

F6 produces a 5-dimensional match score. F7 wraps F6's composite into a 3-category final-score rubric matching the AGENTS.md Step 5 format: ATS-Parseability (40%), Keyword Alignment (30%), Recruiter Appeal (30%). Also generates mechanical quick wins (separate from F6's semantic recommendations) and provides a gap-to-targetScore analysis.

## Scope

### In Scope
- `lib/scorer.js`: takes F6 match output + CV data → 3-category weighted rubric
- Keyword Alignment wraps F6 `overall.score` as sub-component (decision B)
- ATS checks: CV JSON structure validation (date formats, sections, IDs) + rendered Markdown parseability
- Recruiter Appeal: metrics/bullet ratio, action-verb usage, readability scores, bullet-length checks
- Mechanical quick wins: format-level fixes ("add date to bullet 3", "replace passive voice", "shorten bullet X")
- Configurable `targetScore` (default 90) with gap-to-target analysis
- CLI: `node scripts/score-cv.js <cv.json> <match.json> [--target 85]`

### Out of Scope
- Semantic rewriting (F6's `reframe` recommendations already cover this)
- PDF generation or visual scorecard (F8 territory)
- Job-description-side checks (F6 already processes JD)

## Capabilities

### New Capabilities
- `scoring`: 3-category weighted rubric (ATS 40%, Keyword 30%, Recruiter 30%) consuming F6 match output + CV data, producing final score, gap analysis, and mechanical quick wins.

### Modified Capabilities
None. F7 is a consumer-only module.

## Approach

Single CJS module following existing `lib/matcher.js` patterns: lazy-loaded config, pure-function scorers, `require()`-cached data. Three independent sub-scorers → weighted aggregate. ATS checks run against both CV JSON structure and rendered MD output. Recruiter metrics use regex-based heuristics (no NLP deps). Quick wins are deterministic, format-focused, distinct from F6 semantic recommendations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/scorer.js` | New | Core: 3 sub-scorers + aggregator + quick-wins generator |
| `lib/scorer.test.js` | New | Vitest tests with real CV + F6 output |
| `scripts/score-cv.js` | New | CLI: cv.json + match.json → scored output |
| `data/score-config.json` | New | Weights (40/30/30), targetScore default, ATS rule set, readability thresholds |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Recruiter heuristics produce misleading signals | Medium | Calibrate against Step 2/5 manual scores from existing applications; config-tunable thresholds |
| Readability scoring adds npm dep | Low | Use simple syllable-count regex; if complex, document as `[NEEDS DEP: text-readability]` and skip |

## Rollback Plan

All additive: remove `lib/scorer.js`, `lib/scorer.test.js`, `scripts/score-cv.js`, `data/score-config.json`. No existing files modified.

## Dependencies

- F6: `lib/matcher.js` `matchCV()` output (consumed as sub-component for Keyword Alignment)
- `data/cv_en.json`, `data/cv_es.json` (CV structure for ATS checks)
- Zero new npm deps (readability via heuristic regex; fallback if insufficient)

## Success Criteria

- [ ] `scripts/score-cv.js` runs against at least 2 existing application match outputs without crashing
- [ ] Final score matches Step 5 rubric weighting (ATS 40%, Keyword 30%, Recruiter 30%)
- [ ] Gap-to-target analysis identifies which category has the highest unfilled potential
- [ ] Quick wins are mechanical and format-focused, not overlapping F6 `reframe`/`add` semantics
