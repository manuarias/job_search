# Tasks: Extract Hermes Pipeline into Library

## Phase 1: Create `lib/hermes.js`

- [x] 1.1 Create `lib/hermes.js` with `'use strict'`, all library imports (`jd-scraper`, `keyword-extractor`, `matcher`, `scorer`, `assembler`, `cover-letter`, `reporter`), and path constants (`PROJECT_ROOT`, `APPS_DIR`, `DATA_DIR`, `TRACKING_MD`, `TRACKING_JSON`, `CV_EN`, `CV_ES`, `STATE_FILE`)
- [x] 1.2 Move `SPANISH_SIGNALS` array and `detectLanguage()` function from `scripts/hermes.js` to `lib/hermes.js`
- [x] 1.3 Move state management functions: `initState()`, `saveState()`, `loadState()`, `stepDone()`, `stepPending()`, `loadCVData()`
- [x] 1.4 Move all 6 step functions: `stepScrape`, `stepExtract`, `stepMatch`, `stepScore`, `stepAssemble`, `stepCover`
- [x] 1.5 Move `stepPdf()` and report generation logic
- [x] 1.6 Move tracking functions: `updateTrackingMd()`, `updateTrackingJson()`, `updateTrackingScore()`
- [x] 1.7 Move `askContinue()` with lazy `require('readline')` (only when `opts.interactive` is true)
- [x] 1.8 Move `runPipeline()` — add structured result object capture (`ref`, `company`, `role`, `lang`, `dir`, `status`, `score`, `gap`, `categories`, `matchLevel`, `recommendation`, `keywordCoverage`, `report`, `files`, `state`)
- [x] 1.9 Move `runBatch()` — accepts `urls: string[]` (pre-parsed array, not file path)
- [x] 1.10 Add `module.exports = { runPipeline, runBatch, detectLanguage, SPANISH_SIGNALS }`

## Phase 2: Trim `scripts/hermes.js`

- [x] 2.1 Remove all functions moved to lib (steps, state, tracking, language, runPipeline, runBatch, askContinue, SPANISH_SIGNALS, detectLanguage)
- [x] 2.2 Remove path constants now in lib (keep only what `parseArgs`/`printUsage` need — likely none)
- [x] 2.3 Add `const { runPipeline, runBatch } = require('../lib/hermes')` at top
- [x] 2.4 Keep `parseArgs()`, `printUsage()`, shebang, and CLI guard; lang validation stays inline in `main()`
- [x] 2.5 Rewrite `main()`: call `runPipeline(input, opts)` for single mode, `runBatch(urls, opts)` for batch mode; print final summary from structured result
- [x] 2.6 Verify `module.exports = { parseArgs }` (only CLI-parsing function exported)

## Phase 3: Update Tests

- [x] 3.1 Split import in `scripts/hermes.test.js`: `parseArgs` from `'./hermes'`, `detectLanguage`/`SPANISH_SIGNALS` from `'../lib/hermes'`
- [x] 3.2 Run existing 22 tests — all pass with updated imports (24 tests total with 2 new)
- [x] 3.3 Add test: `runPipeline` result object contains all 16 expected fields with correct types on success
- [x] 3.4 Add test: `runPipeline` rejects with descriptive error on empty string input

## Phase 4: Verification

- [x] 4.1 Run full test suite: `npx vitest run scripts/hermes.test.js lib/reporter.test.js lib/scorer.test.js` — all 124 pass
- [x] 4.2 Test CLI help: `node scripts/hermes.js --help` — usage text on stderr, exit 1 (preserved existing behavior)
- [x] 4.3 Test programmatic API: `require('./lib/hermes').runPipeline(...)` returns structured `{ref, score, status}` result
- [x] 4.4 Verify `npm run hermes` works — unchanged `package.json` entry points to `node scripts/hermes.js`
- [x] 4.5 Verify `require('./lib/hermes')` exports shape: `["SPANISH_SIGNALS","detectLanguage","runBatch","runPipeline"]`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900 (≈450 additions in `lib/hermes.js`, ≈450 deletions from `scripts/hermes.js`, ≈10 test changes) |
| 400-line budget risk | High (raw diff), but pure move — zero new logic |
| Chained PRs recommended | No |
| Suggested split | Single PR with `size:exception` |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Rationale:** This is a pure extraction — code moves from `scripts/` to `lib/` with zero behavior changes. The raw diff exceeds 400 lines because of the move, but the review burden is low: the reviewer confirms functions moved correctly and the result object wraps existing data. Splitting a move across PRs creates merge conflicts and makes review harder, not easier. `size:exception` is the right call.
