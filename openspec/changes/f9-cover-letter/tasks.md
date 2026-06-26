# Tasks: Cover Letter Generator (F9)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Suggested split | Single PR — 3 files, single capability, zero existing-code modifications |

> **Rationale**: `lib/cover-letter.test.js` imports `lib/cover-letter.js` directly; CLI is a 70-line thin wrapper. Splitting adds orchestration overhead without review benefit. Same pattern as F8 (3 files, greenfield).

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Medium

## Phase 1: Core Module Skeleton & JD Context

- [ ] 1.1 Create `lib/cover-letter.js` skeleton: `'use strict'`, `generateCoverLetter(cv, matchResult, jdText, opts)` export, config constants (REFUSAL_THRESHOLD=0.35, MIN_JD_CHARS=100)
- [ ] 1.2 Implement `extractJDContext(jdText) → { company, role }` — regex heuristics for company name and role title extraction from raw JD text. Fallback tokens: `[COMPANY]`, `[ROLE]`
- [ ] 1.3 Implement refusal gate: if `matchResult.overall.percentage < REFUSAL_THRESHOLD`, short-circuit return `{ refused: true, reason, markdown: null }`

## Phase 2: Narrative Breadth Selection

- [ ] 2.1 Define domain keyword maps: `LEADERSHIP_TERMS` (delivery-management, stakeholder-management, scrum, agile), `TECHNICAL_TERMS` (automation, backend-engineering, observability, high-throughput), `MENTORING_TERMS` (mentorship, career-growth, code-quality)
- [ ] 2.2 Implement `domainTagSet(achievement) → Set<string>` — maps achievement tags to narrative domains using keyword overlap
- [ ] 2.3 Implement `selectByDomain(achievements, domainTerms, jdContext) → { achievement, domain, fallback }` — selects one achievement per domain, falls back to next-best cross-domain when empty
- [ ] 2.4 Implement `selectNarrative(rankedAchievements, jdContext) → { leadership, technical, mentoring }` — orchestrates all 3 domain selections

## Phase 3: Skeleton Builders & Placeholders

- [ ] 3.1 Implement `buildPlaceholder(achievement, domain, jdContext) → string` — format: `[INSERT: {domain context for JD role} — impact: {metric}]` or `[NEEDS METRIC: ...]` when empty
- [ ] 3.2 Implement `buildOpening(cv, jdContext) → string` — greeting + why-this-role paragraph with `[INSERT: ...]`
- [ ] 3.3 Implement `buildLeadership(ach, jdContext)`, `buildTechnical(ach, jdContext)`, `buildMentoring(ach, jdContext)` — one paragraph each with achievement placeholder
- [ ] 3.4 Implement `buildClosing(jdContext) → string` — enthusiasm + call-to-action paragraph with `[INSERT: ...]`
- [ ] 3.5 Wire `buildSkeleton(cv, narrative, jdContext) → string` — assembles all 5 paragraphs into valid Markdown

## Phase 4: Main Export, CLI & Tests

- [ ] 4.1 Complete `generateCoverLetter()` — wire JD extraction → refusal gate → narrative selection → skeleton assembly → return `{ refused, markdown, stats }`
- [ ] 4.2 Create `scripts/generate-cover-letter.js` — parse args (`<cv.json> <match.json> [--lang] [--jd]`), call `generateCoverLetter()`, output skeleton or empty stdout (refused). Exit 0/1/2/3 per spec.
- [ ] 4.3 Write `lib/cover-letter.test.js` unit tests: `extractJDContext` (3 patterns), `selectByDomain` (full + empty domains), `buildPlaceholder` (with/without metrics)
- [ ] 4.4 Write integration test: `generateCoverLetter(cv_en.json, realMatch, sampleJdText)` → assert 5 sections, non-empty markdown, `refused: false`
- [ ] 4.5 Write refusal test: `generateCoverLetter(cv_en.json, lowMatchScore, jdText)` → `{ refused: true, markdown: null }`
- [ ] 4.6 Write CLI test: run with valid args → exit 0 + stdout has markdown; run with missing file → exit 1
