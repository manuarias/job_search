# Design: F7 Scoring Engine

## Technical Approach

Single CJS module (`lib/scorer.js`) consuming F6 match output + CV JSON, producing a 3-category scored report. Follows `lib/matcher.js` patterns: lazy-loaded config via `require()` cache, pure-function sub-scorers, thin CLI wrapper. No new npm deps — readability uses heuristic syllable-count regex; if insufficient, fallback to flagging `[NEEDS DEP]`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Monolithic `lib/scorer.js` vs per-category files | Single file = simpler (under 400 lines projected). Per-file = testable isolation but more wiring. | Single `lib/scorer.js` with 3 exported sub-scorer functions for testing. |
| Readability: regex heuristic vs npm package (text-readability/flesch) | Regex = zero deps, moderate accuracy. npm = accurate but adds dep, violates F6 zero-deps precedent. | Regex heuristic with syllable counting; config flag `readability.backend: "regex"|"npm"` for future swap. |
| CV Markdown source: re-render from JSON vs require source `.md` path | JSON→MD loses original formatting nuances ATS bots see. Source MD = exact. | Accept optional `cvMdPath` param; ATS Markdown checks skip if absent. |
| Quick wins: post-processing pass vs embedded in scorers | Post-pass = cleaner separation, easier to extend. Embedded = fewer passes over data. | Post-processing `generateQuickWins()` called after all scorers — collects mechanical issues from scorer detail objects. |

## Data Flow

```
CV JSON ──────────────┐
F6 match output ──────┤
                      ├── scoreCV() ──→ { final, categories, quickWins, gapToTarget }
CV MD path (optional)─┘
         │
score-config.json ── weights (40/30/30), targetScore: 90, ATS rules, recruiter thresholds
```

Three sub-scorers run independently, each returning `{score, maxScore, percentage, details}`. Aggregator applies weighted sum. `generateQuickWins()` scans detail objects for mechanical issues (missing dates, passive voice, bullet length, missing metrics). `gapAnalysis()` compares weighted total against `targetScore`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/scorer.js` | Create | Core: `scoreCV(cv, match, opts)` + 3 sub-scorers + quick-wins generator + gap analysis |
| `lib/scorer.test.js` | Create | Vitest: unit per sub-scorer, integration with real CV+F6 output, edge cases |
| `scripts/score-cv.js` | Create | CLI: `node scripts/score-cv.js <cv.json> <match.json> [--target N] [--cv-md path]` |
| `data/score-config.json` | Create | Weights, targetScore, ATS rule set, recruiter thresholds, quick-win patterns |

## Interfaces / Contracts

```js
// lib/scorer.js — sole public export
function scoreCV(cvData, matchResult, options = {}) → ScoreResult

// ScoreResult shape
{
  final: number,                    // 0–100 weighted total
  categories: {
    atsParseability: { score, maxScore, percentage, weight, weightedScore, details },
    keywordAlignment: { score, maxScore, percentage, weight, weightedScore, details },
    recruiterAppeal:  { score, maxScore, percentage, weight, weightedScore, details }
  },
  quickWins: [{ type, location, fix, priority }],
  gapToTarget: {
    target: number,
    current: number,
    gap: number,
    highestGapCategory: string,
    perCategory: [{ category, shortfall, targetContribution, actualContribution }]
  },
  metadata: { scoredAt, scorerVersion }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each sub-scorer isolation | Vitest — mock CV+F6 inputs, assert score ranges and detail shapes |
| Unit | Weighted aggregation | Verify final = sum(cat_i × weight_i), rounding to integer |
| Unit | Quick wins from detail objects | Pass details with known issues, verify specific win objects emitted |
| Unit | Gap analysis math | Verify gap = target − final, per-category shortfall arithmetic |
| Integration | Full scoreCV with real CV + F6 output | Load `data/cv_en.json` + mock F6 match result; validate output shape |
| Integration | CLI script | Run `score-cv.js` with real files, assert exit 0 and valid JSON |

## Open Questions

- [ ] Is a rendered CV Markdown file always available at scoring time, or should ATS Markdown checks be optional?
