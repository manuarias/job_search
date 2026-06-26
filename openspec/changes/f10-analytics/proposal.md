# Proposal: F10 Analytics Module

## Intent

Tracked 5 applications but can't answer basic questions: which keywords correlate with interviews? what score threshold predicts callback? Current jd-tracking.md is a flat markdown table — not queryable.

## Scope

### In Scope
- Migrate `jd-tracking.md` to structured `data/jd-tracking.json` (5 applications)
- `lib/analytics.js` — aggregate scoring, keyword correlation, response-time stats
- `scripts/analytics.js` — CLI that generates `applications/ANALYTICS.md` report
- Tests for all new modules

### Out of Scope
- F6/F7 integration (reads manual scores when automated data unavailable)
- Real-time dashboard, graphs, or charting
- Application submission pipeline (keep manual)

## Capabilities

### New Capabilities
- `analytics-reporting`: structured application tracking, keyword-outcome correlation, score-threshold analysis, markdown report generation

### Modified Capabilities
None.

## Approach

CJS modules, zero new dependencies. `lib/analytics.js` reads `data/jd-tracking.json`, computes:
1. Score distribution (min/max/mean/median)
2. Keyword frequency → outcome correlation (response received vs closed)
3. Score-threshold probability (does ≥85 predict interview/submitted?)
4. Response-time stats

`scripts/analytics.js` imports the lib, generates `applications/ANALYTICS.md`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `data/jd-tracking.json` | New | Structured tracking (migrated from .md) |
| `lib/analytics.js` | New | Analytics computations |
| `lib/analytics.test.js` | New | Vitest unit tests |
| `scripts/analytics.js` | New | CLI report generator |
| `applications/ANALYTICS.md` | New | Generated report output |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Manual scores from .md may not match F6/F7 format | Med | Fallback: read 05-final-score.md per app folder |
| jd-tracking.json gets out of sync with .md | Low | `scripts/analytics.js` validates against .md on run |

## Rollback Plan

Delete `data/jd-tracking.json`, `lib/analytics.js`, `scripts/analytics.js`, `applications/ANALYTICS.md`. No existing files modified.

## Dependencies

None external. Uses existing `applications/jd-tracking.md` and per-app `05-final-score.md` files.

## Success Criteria

- [ ] `node scripts/analytics.js` generates `applications/ANALYTICS.md` with score distribution, keyword correlation, and threshold analysis
- [ ] All tests pass (`npx vitest run lib/analytics.test.js`)
- [ ] Report works with current 5 applications
- [ ] Manual scores used as fallback when F6/F7 data unavailable
