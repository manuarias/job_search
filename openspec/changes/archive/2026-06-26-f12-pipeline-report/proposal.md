# Proposal: Per-Application Pipeline Report (F12)

## Intent

After Hermes runs all 6 pipeline steps, generate a ~10-line "ficha" (card) report summarizing the results — printed to stderr and saved as `REPORT.md` in the application directory. This closes the feedback loop: the user sees at a glance whether to apply, consider, or skip without opening individual JSON files.

## Scope

### In Scope
- `lib/reporter.js` — new module exporting `generateReport(state)`
- Integration into `hermes.js` at pipeline end (after score is available, before PDF)
- Terminal output (stderr) — formatted ~10-line card with score breakdown, recommendation level, gap analysis, top quick win
- File output — `applications/{REF}/REPORT.md` with the same content plus metadata
- Graceful degradation when score or match data is missing (e.g., step skipped)
- Language-aware labels (en/es detected from `state.lang`)

### Out of Scope
- Full analytics report (that's `lib/analytics.js`)
- Interactive editing of the report
- PDF generation of the report
- Retroactive generation for past applications

## Capabilities

### New Capabilities
- `pipeline-report`: generates a concise terminal + file summary report after pipeline completion, pulling data from score.json and match.json artifacts

### Modified Capabilities
None — this is a purely additive feature downstream of existing steps.

## Approach

Simple synchronous module that reads `score.json` and `match.json` from the application directory, extracts key fields, formats a fixed-format card, and writes both to stderr and to `REPORT.md`. No new dependencies; uses `fs` and `path` (already in `hermes.js`).

**Data flow**: `hermes.js` → calls `generateReport(state)` → reads `score.json` + `match.json` from `state.dir` → formats card → `console.error(...)` + `fs.writeFileSync(REPORT.md)`.

**Missing data handling**: If `score.json` is absent (step skipped), show "Score: N/A". If `match.json` is absent, show "Match: N/A". Never crash — use try/catch around file reads.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/reporter.js` | New | Core module with `generateReport(state)` |
| `scripts/hermes.js` | Modified | Call reporter after score step, before PDF |
| `applications/{REF}/REPORT.md` | New artifact | Per-application report file |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Report duplicates existing 5-line summary | Low | The "ficha" is additive — prepends a header and shows different data (score breakdown, quick win, gap) |
| I18n drift if labels aren't centralized | Low | Use a small inline labels map keyed by `state.lang`; keep it minimal (6-8 labels) |
| Score.json schema changes break report | Med | Use optional chaining (`?.`) on all accessed fields; graceful N/A fallback |

## Rollback Plan

Remove the `require('../lib/reporter')` line and the `generateReport(state)` call from `hermes.js`. Delete `lib/reporter.js`. No data migration needed — `REPORT.md` files are additive artifacts.

## Dependencies

- `lib/scorer.js` output (score.json) — already present
- `lib/matcher.js` output (match.json) — already present
- `state.lang`, `state.ref`, `state.company`, `state.role` — already present in hermes state

## Success Criteria

- [ ] `node scripts/hermes.js <jd-input>` prints a formatted ~10-line report to stderr after pipeline completion
- [ ] `applications/{REF}/REPORT.md` exists with the same content after pipeline completion
- [ ] Report shows score breakdown (ATS / Keywords / Recruiter), recommendation level, gap to target, and top quick win
- [ ] Pipeline completes normally (no crash) when score.json or match.json is missing
- [ ] Labels render in Spanish when `state.lang === 'es'`
