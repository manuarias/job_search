# Tasks: CV Assembler (F8)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Suggested split | Single PR — 3 cohesive files with tight coupling |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Medium

> **Rationale**: `lib/assembler.test.js` imports `lib/assembler.js` directly; CLI is a 70-line thin wrapper. Splitting across PRs adds orchestration overhead without review benefit. 3 files, single capability, zero existing-code modifications.

## Phase 1: Core Ranking & Selection

- [x] 1.1 Create `lib/assembler.js` skeleton: `'use strict'`, `assembleCV(cv, matchResult, opts)` export, lazy-loaded config constants (DEFAULT_N=4, LOW_CONFIDENCE_THRESHOLD=0.35)
- [x] 1.2 Implement `rankAchievement(ach, jdHardKeywords, jdDomains) → number` — formula: keywordOverlap×0.5 + domainBoost×0.3 + impactMult×0.2
- [x] 1.3 Implement `selectAchievements(achievements, n, jdHardKeywords, jdDomains) → Achievement[]` — top N by relevance, domain-diverse (no duplicate domain sets)
- [x] 1.4 Implement `reorderSkills(skills, jdHardKeywords) → skills` — sort categories by JD keyword match count, sort items within category (matched first, then alpha)

## Phase 2: Markdown Section Builders

- [x] 2.1 Build `buildHeader(cv, matchResult) → string` — name, titles, location, contact line with pipes
- [x] 2.2 Build `buildSummary(cv, matchResult, lang) → string` — 3 bullets from `cv.professionalSummary` with highlight marks
- [x] 2.3 Build `buildCompetencies(cv, matchResult) → string` — 4 bullets from `cv.coreCompetencies`, prefixed with bold title
- [x] 2.4 Build `buildSkills(cv, matchResult) → string` — reordered categories + items, comma-separated
- [x] 2.5 Build `buildExperience(cv, matchResult) → string` — per-role blocks with selected achievements as bullets
- [x] 2.6 Build `buildEducation(cv) → string` — degree | institution lines or "N/A"

## Phase 3: Reframe Hints & Assembly

- [x] 3.1 Implement `generateReframeHints(selectedAchievements, matchResult) → ReframeHint[]` — for achievements with relevance ≥ 0.4 but missing JD terminology
- [x] 3.2 Complete `assembleCV()` — wire all builders, compute lowConfidence flag, collect stats, return `{ markdown, lowConfidence, reframeHints, stats }`

## Phase 4: CLI & Integration Tests

- [x] 4.1 Create `scripts/assemble-cv.js` — parse args, read files, call `assembleCV()`, print markdown to stdout. Exit 0/1/2 per spec.
- [x] 4.2 Write `lib/assembler.test.js` unit tests: `rankAchievement` (3 cases), `selectAchievements` (domain diversity), `reorderSkills` (category ordering)
- [x] 4.3 Write integration test: `assembleCV(cv_en.json, realMatchResult)` → assert 6 sections, lowConfidence bool, non-empty reframeHints
- [x] 4.4 Write CLI test: run `node scripts/assemble-cv.js` with valid and invalid args, assert exit codes and stdout shape
