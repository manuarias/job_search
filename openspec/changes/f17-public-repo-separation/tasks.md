# Tasks: Public/Private Repository Separation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 (18 files: 7 new, 11 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes (resolved)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `getDataDir()` module + refactor all lib/scripts to use it | PR 1 | Base: main. ~100 lines. Tests included. |
| 2 | Template files + `.gitignore` + `sync-data.js` | PR 2 | Base: PR 1 branch or main. ~300 lines. |
| 3 | Docs cleanup (README Quick Start, AGENTS.md paths, pdf-builder README) | PR 3 | Base: PR 2 branch or main. ~50 lines. |

## Phase 1: Foundation — Data Directory Module

- [x] 1.1 Create `lib/data-paths.js` with `getDataDir()`: reads `JS_DATA_DIR`, validates directory exists, resolves relative paths against `PROJECT_ROOT`, falls back to `data/` when unset or empty string, throws clear error when set but invalid.
- [x] 1.2 Tests for `getDataDir()` in `scripts/score-cv.test.js`: 5 scenarios — env set (absolute), env set (relative), env unset fallback, empty string fallback, getApplicationsDir independent.
- [x] 1.3 Refactor `lib/hermes.js` lines 33-37: replace `DATA_DIR` const with `getDataDir()` call; update `TRACKING_JSON`, `CV_EN`, `CV_ES` to use resolved dir.
- [x] 1.4 Refactor `lib/matcher.js`: replace `require()` for `soft-synonyms.json`, `domain-mapping.json`, `match-weights.json` with `fs.readFileSync` + `JSON.parse` using `getDataDir()`.
- [x] 1.5 Refactor `lib/keyword-extractor.js`: replace `require()` for `keyword-taxonomy.json` with `fs.readFileSync` + `JSON.parse` using `getDataDir()`.
- [x] 1.6 Refactor `lib/scorer.js`: replace `require()` for `score-config.json` with `fs.readFileSync` + `JSON.parse` using `getDataDir()`.
- [x] 1.7 Refactor `scripts/build-pdf.js`: resolve `cv_{lang}.json` path via `getDataDir()` instead of hardcoded `data/`.

## Phase 2: Templates, Gitignore & Sync Tool

- [ ] 2.1 Create `data/cv_en.json.template`: valid JSON conforming to `cv.schema.json`, all personal fields replaced with `"TODO: ..."` placeholders, empty arrays/objects for collections.
- [ ] 2.2 Create `data/cv_es.json.template`: Spanish variant of the same template structure.
- [ ] 2.3 Create `data/jd-tracking.json.template`: empty array `[]`.
- [ ] 2.4 Create `resumes/cv_en.md.template`: based on `template_optimized.md` structure, header/contact with `[REEMPLAZAR]` placeholders, example work history.
- [ ] 2.5 Create `resumes/cv_es.md.template`: Spanish variant.
- [ ] 2.6 Create `applications/jd-tracking.md.template`: table header + separator row only.
- [ ] 2.7 Create `applications/.gitkeep`: empty file.
- [ ] 2.8 Update `.gitignore`: add patterns for `data/cv_*.json`, `data/jd-tracking.json`, `resumes/cv_*.md`, `applications/jd-tracking.md`, `applications/[A-Z]*/`, `applications/ANALYTICS.md`, `historial-laboral.md`. Verify `!*.template` and `!.gitkeep` exceptions work.
- [ ] 2.9 Create `scripts/sync-data.js`: deep-merge algorithm per design (recursive object walk), `--dry-run` flag, clear error messages for missing files, summary output with field paths.
- [ ] 2.10 Create `tests/scripts/sync-data.test.js`: test 5 scenarios — no new fields, flat new field, nested new field, existing values preserved, dry-run no write.

## Phase 3: Documentation & Path Cleanup

- [ ] 3.1 Update `README.md`: add Quick Start section (clone → copy templates → fill data → set `JS_DATA_DIR` → run pipeline).
- [ ] 3.2 Update `AGENTS.md`: replace all `/Users/earias/Documents/job_search/` absolute paths with relative `./` or `PROJECT_ROOT`.
- [ ] 3.3 Update `pdf-builder/README.md`: replace absolute paths with relative `./` references.

## Phase 4: Verification

- [ ] 4.1 Run `git check-ignore` on real data files vs template files — verify templates are tracked, real data is ignored.
- [ ] 4.2 Run `JS_DATA_DIR=./test-fixture node scripts/hermes.js "mock JD text"` — verify pipeline works with custom data dir.
- [ ] 4.3 Run `node scripts/sync-data.js --dry-run` — verify it reports field diffs correctly.
- [ ] 4.4 Verify `git status` shows zero personal files after copying templates and running pipeline.
