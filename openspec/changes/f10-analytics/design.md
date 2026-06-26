# Design: F10 Analytics Module

## Technical Approach

CJS modules (match project convention). `lib/analytics.js` reads `data/jd-tracking.json` as a pure-data module, computes stats in-memory. `scripts/analytics.js` imports the lib, writes `applications/ANALYTICS.md`. Zero new npm dependencies.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scoring data source | `applications/{REF}/05-final-score.md` per application | F6/F7 not always run; manual scores always present |
| JSON migration path | Hardcoded mapping script inside `lib/analytics.js` | Only 1 source file (jd-tracking.md); overkill to extract |
| Keyword storage | Read from `01-ats-diagnostic.md` top-5 gaps per app | Each app folder already has this from Step 1 of optimization |
| Report format | Markdown table sections | Matches project convention (all artifacts are .md) |

## Data Flow

```
applications/jd-tracking.md ──parse──→ data/jd-tracking.json
                                            │
                    ┌───────────────────────┤
                    ▼                       ▼
            lib/analytics.js       applications/{REF}/05-final-score.md
                    │               (fallback for detailed scores)
                    ▼
            scripts/analytics.js
                    │
                    ▼
            applications/ANALYTICS.md
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `data/jd-tracking.json` | Create | Structured 5-entry tracking array |
| `lib/analytics.js` | Create | Core analytics: scores, keywords, thresholds |
| `lib/analytics.test.js` | Create | Vitest unit tests |
| `scripts/analytics.js` | Create | CLI entry point, generates report |

## Interfaces / Contracts

```js
// lib/analytics.js exports
module.exports = {
  migrateTracking,   // (mdPath) → { tracking: [], errors: [] }
  analyzeScores,     // (trackingData) → { min, max, mean, median, count }
  correlateKeywords, // (trackingData, appsDir) → { correlations: [], warnings: [] }
  analyzeThresholds, // (trackingData) → { thresholds: [], warnings: [] }
  generateReport,    // (results) → string (markdown)
};
```

Each function returns `{ data, errors?, warnings? }` — errors array non-empty only on parse failure, empty array on partial/insufficient data with warnings.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `analyzeScores` with known arrays | Vitest, pure functions |
| Unit | `analyzeThresholds` edge cases (0 apps, 1 app) | Vitest |
| Unit | `correlateKeywords` with mock keyword data | Vitest, fs mocking not needed (pass data in) |
| Integration | `migrateTracking` reads real `jd-tracking.md` | Vitest, fs.readFileSync on fixture |
| E2E | `node scripts/analytics.js` generates valid .md | Vitest, execSync + fs.existsSync |

## Migration / Rollout

No migration required. All files are new. `data/jd-tracking.json` is derived from existing `jd-tracking.md`; .md remains source of truth.

## Open Questions

None.
