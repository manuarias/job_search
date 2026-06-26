# Design: CV–JD Matching Engine (F6)

## Technical Approach

Single CJS module (`lib/matcher.js`) consuming structured CV JSON and JD keywords JSON, producing a scored match report. Follows existing `lib/keyword-extractor.js` patterns: lazy-loaded config, pure-function scorers, `require()`-cached data files. A thin CLI wrapper (`scripts/match-cv-jd.js`) calls the module and writes JSON to stdout. No new dependencies — zero npm additions, per proposal constraint.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Monolithic module vs per-scorer files | One file = simpler discoverability, under ~400 lines. Separate files = unit-testable in isolation but more wiring. | Single `lib/matcher.js` with 5 named scorer functions exported for testing. |
| Lazy-loaded config vs passed-as-param | Passed-as-param is purer but forces every caller to read files. Lazy `require()` caches on first call — matches existing pattern. | Lazy `require()` from `data/match-config.json` and sibling data files. |
| Levenshtein distance cutoff (1 vs 2 vs 3) | Dist 1 catches "Javas → Java". Dist 2 catches "Kubernete → Kubernetes". Dist 3 generates false positives ("Python → Pytest"). | Distance ≤ 2. Configurable via `match-config.json` `fuzzy.maxDistance`. |
| Seniority: months-only vs years-rounding | Month-granularity from `dates.start/end` is exact. Year-rounding loses precision when dates span partial years. | Sum months from `YYYY-MM` dates; `Present` = today. Tolerance bands in config. |

## Data Flow

```
CV JSON (data/cv_en.json) ──┐
                             ├── matcher() ──→ match-result.json
JD keywords JSON ────────────┘                 schemas/match-output.schema.json
         │
  data/match-config.json ─── weights, thresholds
  data/soft-synonyms.json ── JD soft term → canonical form
  data/keyword-domain-map.json ── taxonomy term → domain[]
```

Five independent scorers run, each returning `{score, details, recommendations[]}`. Aggregator applies weighted sum, builds composite score, merges recommendations.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/matcher.js` | Create | Core: `matcher(cv, jdKeywords)` export + 5 scorers + recommendation builder |
| `lib/matcher.test.js` | Create | Unit tests per scorer + integration test on real CV+JD pair |
| `scripts/match-cv-jd.js` | Create | CLI: `node scripts/match-cv-jd.js <cv.json> <jd-keywords.json>` → stdout |
| `data/soft-synonyms.json` | Create | ~80 synonym pairs: `{"canonical": "Stakeholder Management", "synonyms": ["cross-functional coordination", "business alignment"]}` |
| `data/keyword-domain-map.json` | Create | `{"Java": ["backend-engineering"], "Jira": ["delivery-management"], ...}` mapping every taxonomy term |
| `data/match-config.json` | Create | Weights, thresholds, bands, embedding stub (disabled) |
| `schemas/match-output.schema.json` | Create | JSON Schema for `match-result.json` with `$defs` pattern from existing schemas |

## Interfaces / Contracts

```js
// lib/matcher.js — sole public export
function matcher(cv, jdKeywords, configOverride = {}) → MatchResult

// MatchResult shape
{
  compositeScore: number,          // 0–100
  dimensionScores: {               // per-dimension sub-scores
    hardKeywords: number,
    softKeywords: number,
    domainMatch: number,
    seniorityFit: number,
    fuzzyMatch: number
  },
  hardKeywordDetails: [{ term, matched, cvSource, mustHave, fuzzy }],
  softKeywordDetails: [{ jdTerm, canonical, cvMatch, matched }],
  domainCoverage: { jdDomains: [], cvDomains: [], overlap: [], coveragePct },
  seniority: { totalMonths, years, jdYearsMin, jdYearsPref, band, titleMatch },
  recommendations: [{ type: 'highlight'|'reframe'|'add', achievementId?, skill?, reason, priority }],
  metadata: { matchedAt, matcherVersion, cvSource, jdSource }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each scorer in isolation | Vitest — mock CV/JD inputs, assert dimension scores and detail shapes |
| Unit | Weighted aggregation | Verify composite = sum(score_i × weight_i) |
| Unit | Levenshtein fuzzy | Test "Kubernete" → "Kubernetes" (dist=1 match), "Dockr" → "Docker" (dist=1) |
| Integration | Full matcher(cv_en.json, jdKeywords) | Load real CV + mock JD keywords, validate output schema with Ajv |
| Integration | CLI script | Run `match-cv-jd.js` with real data files, assert exit 0 and valid JSON on stdout |

## Migration / Rollout

No migration required. This is a greenfield module consuming existing artifacts (CV JSON, eventual jd-keywords.json). Additive-only: all new files.

## Open Questions

- [ ] The 5 existing `applications/{REF}/` folders have no `jd-keywords.json` yet (F4 extractor not run). Testing needs at least one fixture JD keywords file — create one under `lib/__fixtures__/` or run extractor against AGIL first.
