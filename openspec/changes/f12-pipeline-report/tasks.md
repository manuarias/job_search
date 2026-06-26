# Tasks: Pipeline Report (F12)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — 3 files, one capability |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

## Phase 1: Core Module (`lib/reporter.js` + tests)

- [x] 1.1 Create `lib/reporter.js` skeleton: `'use strict'`, export `generateReport(state)`, define `LABELS` map keyed by `en`/`es` with 6–8 labels (Score, ATS Parseability, Keywords, Recruiter Appeal, Recommendation, Gap to Target, Quick Win, Action)
- [x] 1.2 Implement `readJSON(dir, filename)` helper — `fs.readFileSync` + `JSON.parse` wrapped in try/catch, returns `null` on missing or malformed file
- [x] 1.3 Implement `extractScoreData(score)` — uses optional chaining to pull `final`, `categories.atsParseability.percentage`, `categories.keywordAlignment.percentage`, `categories.recruiterAppeal.percentage`, `gapToTarget.{target,current,gap}`, `quickWins[0]`. Returns `"N/A"` for any missing field
- [x] 1.4 Implement `extractMatchData(match)` — pulls `recommendation.level`, `recommendation.actions[0].action`, `summary.keywordCoverage.percentage`. Returns `"N/A"` for missing fields
- [x] 1.5 Implement `formatCard(state, scoreData, matchData)` — builds ~10–15 line string: header (`── Pipeline Report: {ref} ──`), company/role, score breakdown (3 categories as percentages), recommendation level, keyword coverage %, gap to target, top quick win, top action. Uses `LABELS[state.lang || 'en']`
- [x] 1.6 Wire `generateReport(state)` — call `readJSON` for `score.json` and `match.json`, extract data, format card, write `{state.dir}/REPORT.md` via `fs.writeFileSync` (create dir if missing), return formatted string
- [x] 1.7 Create `lib/reporter.test.js` — test: all artifacts present (assert score value, 3 categories, recommendation, gap, quick win in output); empty `quickWins` array (assert "N/A"); `score.json` absent (assert "N/A" scores, no throw); `match.json` absent (assert score populated, quick win "N/A"); `state.lang = 'es'` (assert Spanish labels); output ≤ 15 lines; `REPORT.md` written to `state.dir`

## Phase 2: Integration (`scripts/hermes.js`)

- [x] 2.1 Add `const { generateReport } = require('../lib/reporter')` at top of `hermes.js` (line ~29, after existing lib imports)
- [x] 2.2 Insert report call in `runPipeline()` after tracking update block (line ~452) and before PDF block (line ~455): wrap `generateReport(state)` in try/catch, print result via `console.error()`, log warning on failure without crashing

## Phase 3: Verification (end-to-end)

- [x] 3.1 Run `node scripts/hermes.js` with a real JD input — verify REPORT.md appears in application dir, stderr shows formatted card, pipeline completes without errors
- [x] 3.2 Run pipeline with `score.json` manually deleted — verify report renders "N/A" scores, pipeline continues to PDF step
- [x] 3.3 Run with `--lang es` — verify Spanish labels in REPORT.md and stderr output
