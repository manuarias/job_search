# Design: Extract Hermes Pipeline into Library

## Technical Approach

Extract pipeline orchestration, state management, step functions, and tracking I/O from `scripts/hermes.js` into `lib/hermes.js`. CLI wrapper delegates to the library. Zero new deps — existing `path.join(__dirname, '..', ...)` patterns resolve identically from `lib/` and `scripts/`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Export as class vs plain functions | Class adds ceremony; pipeline is stateless (state passed explicitly). | Two `async function` exports: `runPipeline(input, opts)` and `runBatch(urls, opts)`. |
| Lazy vs top-level `require('readline')` | Top-level simpler; lazy avoids loading built-in in non-interactive mode (default). | Lazy — `require('readline')` only inside `askContinue()`. Node caches the require. |
| Throw vs return `{status:'error'}` | Returning forces every caller to check. Throwing matches current behavior. | Throw on fatal errors. `runBatch` catches per-URL. `stepPdf`/`generateReport` catch internally. |
| Capture results in scope vs re-read from disk | Re-reading duplicates reporter logic. Step loop is sequential. | Capture via closure: `if (s.name === 'match') matchResult = s.fn()`. |
| `runBatch` in lib vs CLI | Separating forces every batch consumer to reimplement the loop. | Move to lib as `runBatch(urls: string[], opts)`. CLI reads file and passes parsed array. |

## Data Flow

```
parseArgs → runPipeline → scrapeJD/extract/match/score/assemble/cover → generateReport
                                       ↓                                    ↓
                                  lib/* modules                          stderr
                                       ↓
                                  PipelineResult → CLI prints summary
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/hermes.js` | Create | Pipeline orchestrator: `runPipeline()`, `runBatch()`, all step functions, state helpers, tracking, language detection, `SPANISH_SIGNALS` (~450 lines). |
| `scripts/hermes.js` | Modify | Reduce to ~50-line CLI wrapper: `parseArgs()`, `printUsage()`, `main()` delegating to `require('../lib/hermes')`. Shebang and CLI guard intact. |
| `scripts/hermes.test.js` | Modify | Split imports: `parseArgs` from `'./hermes'`, `detectLanguage`/`SPANISH_SIGNALS` from `'../lib/hermes'`. |

## Interfaces / Contracts

### `runPipeline(input, opts)` → `PipelineResult`

```js
// opts: { lang?, interactive?: false, pdf?: false }
async function runPipeline(input, opts = {})
```

**Result shape** — fields sourced from `lib/*` return values (not re-read from disk):

```js
{
  ref, company, role, lang, dir,             // identity (scraper)
  status: 'done' | 'paused',
  score: number | null,                      // scoreResult.final
  gap: number | null,                        // scoreResult.gapToTarget.gap
  categories: { atsParseability, keywordAlignment, recruiterAppeal } | null,
  matchLevel: string | null,                 // recommendation.level
  recommendation: string | null,             // recommendation.actions[0].action
  keywordCoverage: number | null,            // summary.keywordCoverage.percentage
  report: string | null,                     // generateReport(state) output
  files: string[],                           // generated filenames (sorted, no dotfiles)
  state: object,                             // raw state for debugging/resume
}
```

### `runBatch(urls, opts)` → `BatchResult[]`

```js
// urls: string[] — pre-parsed, not a file path
async function runBatch(urls, opts = {})
// → [{ url, status: 'done'|'paused'|'error', error?: string }]
```

### Module exports

```js
// lib/hermes.js
module.exports = { runPipeline, runBatch, detectLanguage, SPANISH_SIGNALS };

// scripts/hermes.js (post-refactor)
module.exports = { parseArgs };
```

## Interactive Mode Handling

`askContinue()` stays in `lib/hermes.js`. `require('readline')` is lazy — called only when `opts.interactive` is `true` (default `false`). When `false` (programmatic call), `askContinue()` is never invoked — the step loop skips the interactive block entirely. No `process.stdin` binding, no hanging.

## File Paths

No changes. Every existing path uses `path.join(__dirname, '..', ...)`. Both `lib/` and `scripts/` are one level deep, so `..` resolves to project root identically. `APPS_DIR`, `DATA_DIR`, `TRACKING_MD`, etc. — all valid from either location.

## Error Handling

- **Scrape failure** (`SEARCH_RESULTS_PAGE`): propagates to caller — same as today
- **Step I/O errors**: propagate (no partial recovery)
- **PDF failure**: caught internally, `console.error`, continues — non-fatal
- **Report failure**: caught internally, `console.error`, continues — non-fatal
- **`runBatch` per-URL**: caught, `{ status: 'error', error }` pushed to results — one failure doesn't block remaining

## Backward Compatibility

| Concern | Status |
|---------|--------|
| `npm run hermes` | ✅ Unchanged — `node scripts/hermes.js` |
| CLI output and artifacts | ✅ Identical |
| `--batch` mode | ✅ CLI reads file, passes parsed URLs to `runBatch()` |
| `scripts/hermes.test.js` (22 tests) | ⚠️ Imports split: `parseArgs` from `'./hermes'`, rest from `'../lib/hermes'` |
| `.hermes-state.json` format/path | ✅ Unchanged |
| Other lib modules | ✅ Zero changes |

## No-Go Decisions

- No new dependencies (`fs`, `path`, `readline` only)
- No behavior changes to pipeline steps (step functions move as-is)
- No changes to `console.error` progress output
- No parallel batch processing (sequential loop preserved)
- No changes to `package.json` scripts
- No new `lib/hermes.test.js` (existing 22 tests verify exports)

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `parseArgs` | Existing tests — import path updated |
| Unit | `detectLanguage`, `SPANISH_SIGNALS` | Existing tests — import path updated |
| Integration | Full pipeline via CLI | `node scripts/hermes.js <sample-url>` — verify artifacts, exit 0 |

## Open Questions

None.
