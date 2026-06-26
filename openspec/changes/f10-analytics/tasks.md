# Tasks: F10 Analytics Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Data Foundation

- [x] 1.1 Create `data/jd-tracking.json` — parse `applications/jd-tracking.md` table rows into structured JSON array with fields: ref, company, role, score, status, created, updated
- [x] 1.2 Validate migration — ensure 5 entries match .md values, duplicate check on ref, non-null scores

## Phase 2: Analytics Library

- [x] 2.1 Create `lib/analytics.js` with `migrateTracking(mdPath)` exporting the parser from task 1.1
- [x] 2.2 Implement `analyzeScores(trackingData)` → `{ min, max, mean, median, count }`
- [x] 2.3 Implement `correlateKeywords(trackingData, appsDir)` — read `01-ats-diagnostic.md` top-5 gaps per app, group by outcome status
- [x] 2.4 Implement `analyzeThresholds(trackingData)` — group scores into ≥85 / 80-84 / <80 buckets, compute callback rate per bucket
- [x] 2.5 Implement `generateReport(results)` — produce markdown with sections: Score Distribution, Keyword Correlation, Threshold Analysis, Response Summary

## Phase 3: CLI Script

- [x] 3.1 Create `scripts/analytics.js` — parse jd-tracking.md via `migrateTracking`, run all analyzers, write `applications/ANALYTICS.md`
- [x] 3.2 Add npm script `"analytics": "node scripts/analytics.js"` to package.json

## Phase 4: Testing

- [x] 4.1 Create `lib/analytics.test.js` — unit tests for `analyzeScores` (empty, single, 5-item), `analyzeThresholds` (0 apps, no responses), `correlateKeywords` (empty dir, no files)
- [x] 4.2 Integration test for `migrateTracking` against real `applications/jd-tracking.md`
- [x] 4.3 E2E test: run `node scripts/analytics.js`, assert `applications/ANALYTICS.md` exists and contains expected section headers
