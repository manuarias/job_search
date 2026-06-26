# Proposal: Extract Hermes Pipeline into Library

## Intent

`scripts/hermes.js` is a 560-line monolith mixing CLI parsing, pipeline orchestration, and I/O. AI agents (OpenCode, Claude Code) cannot consume it programmatically — they must spawn a process, parse stderr, and handle exit codes. Batch processing is locked inside the CLI.

Extract pipeline logic into `lib/hermes.js` as an exported `runPipeline()` function returning a structured result object.

## Scope

### In Scope
- New `lib/hermes.js` exporting `runPipeline(input, opts)` → structured result
- All 6 pipeline steps, state management, language detection, tracking updates moved to lib
- `scripts/hermes.js` reduced to ~50-line CLI wrapper (parseArgs, printUsage, main)
- Update `scripts/hermes.test.js` imports to test `lib/hermes.js`
- Structured result: `{ ref, company, role, lang, score, categories, recommendation, matchLevel, keywordCoverage, gap, reportCard, report, state, files, dir, status }`

### Out of Scope
- New dependencies
- Behavior changes to any pipeline step
- Parallel batch processing (deferred; caller can loop)
- Changes to existing CLI scripts (score-cv.js, assemble-cv.js, etc.)

## Capabilities

### New Capabilities
None — pure refactor, no spec-level behavior changes.

### Modified Capabilities
None — internal code organization only.

## Approach

Extract all pipeline logic (stepScrape through stepCover, state management, language detection, tracking updates, interactive prompts) from `scripts/hermes.js` into `lib/hermes.js`. The existing `runPipeline()` function becomes the primary export. Keep `console.error` output for progress feedback. The CLI wrapper delegates to the library and prints final summary.

Zero new dependencies — all imports remain `require()` of existing modules.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/hermes.js` | New | Pipeline orchestrator library (~450 lines) |
| `scripts/hermes.js` | Modified | Thin CLI wrapper (~50 lines, down from 560) |
| `scripts/hermes.test.js` | Modified | Import path update; test structured result |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing internal dependency during extraction | Low | 22 existing tests; run after extraction |
| CLI flag behavior drifts | Low | Keep parseArgs/printUsage unchanged in scripts/hermes.js |
| Circular dependency with lib modules | Low | Hermes depends on lib/*, not vice versa |

## Rollback Plan

Restore `scripts/hermes.js` from git. Delete `lib/hermes.js`. Tests unchanged in rollback.

## Dependencies

None. Pure extraction from existing code.

## Success Criteria

- [ ] `require('./lib/hermes').runPipeline(input, opts)` returns structured result object
- [ ] `node scripts/hermes.js` produces identical output and artifacts
- [ ] All 22 existing tests pass with updated imports
- [ ] `npm run hermes` works identically
