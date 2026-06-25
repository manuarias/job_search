# Tasks: F7 Scoring Engine

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 (scorer 250, tests 200, CLI 60, config 40) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: config + core module + unit tests → PR 2: CLI + integration tests |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `data/score-config.json` + `lib/scorer.js` + `lib/scorer.test.js` | PR 1 (base: main) | Core: 3 sub-scorers, aggregator, quick wins, gap analysis, unit tests |
| 2 | `scripts/score-cv.js` + integration tests | PR 2 (base: PR 1) | CLI wrapper + real-data integration tests |

## Phase 1: Configuration

- [x] 1.1 Create `data/score-config.json` — weights (40/30/30), targetScore: 90, ATS rule set (requiredSections, dateFormat regex), recruiter thresholds (metricsRatio≥0.5, actionVerbRatio>0.6, maxBulletLines:2), quick-win patterns (passive-voice regex, bullet-length regex)

## Phase 2: Core Scoring Module

- [x] 2.1 Create `lib/scorer.js` — skeleton: `scoreCV(cvData, matchResult, options)` export, lazy-load `score-config.json`, validate inputs
- [x] 2.2 Implement `scoreKeywordAlignment(matchResult)` — wraps F6 `matchResult.overall.score`, applies config floor/ceiling multiplier, returns scorer result
- [x] 2.3 Implement `scoreATSParseability(cvData, cvMdPath?)` — checks CV JSON required sections + date formats; if cvMdPath provided, checks MD for tables/special-chars/missing-headers
- [x] 2.4 Implement `scoreRecruiterAppeal(cvData)` — metrics/bullet ratio, action-verb lead ratio, bullet-length compliance, readability (syllable-count heuristic)
- [x] 2.5 Implement `aggregate(categoryResults, weights)` — weighted sum → 0–100 final
- [x] 2.6 Implement `generateQuickWins(categoryResults)` — scan detail objects for passive-voice flags, missing-metric flags, date-format warnings, bullet-length warnings; emit `{type, location, fix, priority}`
- [x] 2.7 Implement `gapAnalysis(final, categories, targetScore)` — compute gap, identify highest-shortfall category, per-category breakdown

## Phase 3: CLI + Integration

- [ ] 3.1 Create `scripts/score-cv.js` — arg parsing (`<cv.json> <match.json> [--target N] [--cv-md path]`), read files, call `scoreCV()`, JSON stdout, exit codes (0=success, 1=usage, 2=validation)
- [ ] 3.2 Verify CLI with `node scripts/score-cv.js data/cv_en.json <fixture-match.json> --target 90` — assert valid JSON, 3 categories present, quickWins array, gapToTarget object

## Phase 4: Testing

- [x] 4.1 Create `lib/scorer.test.js` — unit: each sub-scorer with mocked cvData + matchResult, assert score ranges and detail shapes
- [x] 4.2 Test weighted aggregation — verify final = round(Σ cat_i.percentage × weight_i)
- [x] 4.3 Test quick wins generation — pass detail with passive-voice flag, assert win emitted with type="passive-voice" and location
- [x] 4.4 Test gap analysis — verify gap = target − final, per-category shortfall arithmetic
- [x] 4.5 Integration test — load real `data/cv_en.json` + create fixture match JSON from F6 output shape, full `scoreCV()` call, validate against `ScoreResult` interface
- [x] 4.6 Edge cases — empty CV (no experience, no skills), zero-match F6 output, missing optional cvMdPath, targetScore=0, targetScore=100
