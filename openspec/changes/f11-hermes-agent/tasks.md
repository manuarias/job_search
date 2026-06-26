# Tasks — f11-hermes-agent

## Phase 1: Core Pipeline (scripts/hermes.js)

- [x] 1.1 Create `scripts/hermes.js` skeleton with `'use strict'` and library imports
- [x] 1.2 Implement CLI argument parsing (`--lang`, `--interactive`, `--batch`, `--pdf`)
- [x] 1.3 Implement `stepScrape`: scrape JD from URL/text via `lib/jd-scraper`
- [x] 1.4 Implement `stepExtract`: extract keywords via `lib/keyword-extractor`
- [x] 1.5 Implement `stepMatch`: match CV against keywords via `lib/matcher`
- [x] 1.6 Implement `stepScore`: score match result via `lib/scorer`
- [x] 1.7 Implement `stepAssemble`: assemble optimized CV via `lib/assembler`
- [x] 1.8 Implement `stepCover`: generate cover letter via `lib/cover-letter`

## Phase 2: State & Resume

- [x] 2.1 Implement `.hermes-state.json` save/load (filesystem-based persistence)
- [x] 2.2 Implement resume logic: skip already-completed steps on re-run
- [x] 2.3 Implement `initState` and `stepDone` helpers

## Phase 3: Language & Auto-Detection

- [x] 3.1 Implement `detectLanguage()` heuristic (Spanish signal words)
- [x] 3.2 Implement `loadCVData(lang)`: load `data/cv_en.json` or `data/cv_es.json`
- [x] 3.3 Wire `--lang` override with auto-detect fallback

## Phase 4: Tracking Updates

- [x] 4.1 Implement `appendTrackingMd()`: append row to `applications/jd-tracking.md`
- [x] 4.2 Implement `updateTrackingScore()`: update score in tracking table
- [x] 4.3 Implement `updateTrackingJson()`: update `data/jd-tracking.json`

## Phase 5: Interactive & Batch Mode

- [x] 5.1 Implement interactive mode with `readline` (y/n/q per step)
- [x] 5.2 Implement batch mode: read URLs from file, process sequentially

## Phase 6: PDF Generation

- [x] 6.1 Implement `stepPdf()`: call `pdf-builder/build-cv.js` via `require()`
- [x] 6.2 Wire `--pdf` flag to post-assembly PDF generation

## Phase 7: Tests

- [x] 7.1 Unit tests for `parseArgs` (all flag combinations)
- [x] 7.2 Unit tests for `detectLanguage` (English, Spanish, edge cases)
- [x] 7.3 Unit tests for `SPANISH_SIGNALS` array

## Phase 8: Integration

- [x] 8.1 Add `"hermes"` script to `package.json`
- [x] 8.2 Update `README.md` with Hermes usage (both languages)
- [x] 8.3 Make `scripts/hermes.js` executable
- [x] 8.4 Run full test suite — all 487 tests pass (12 files)
- [x] 8.5 Verify `--help` CLI output
