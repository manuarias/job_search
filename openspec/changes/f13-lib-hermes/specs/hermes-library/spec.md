# Delta for Hermes Library

## ADDED Requirements

### Requirement: Programmatic API

The system MUST export `runPipeline(input, opts)` from `lib/hermes.js`. The function MUST return a Promise resolving to a structured result object with all pipeline outputs: `ref`, `company`, `role`, `lang`, `score`, `categories`, `recommendation`, `matchLevel`, `keywordCoverage`, `gap`, `reportCard`, `report`, `state`, `files`, `dir`, `status`.

**Rationale:** AI agents and batch callers need a programmatic entry point returning structured data instead of requiring process spawning and stderr parsing.

#### Scenario: Successful pipeline call

- GIVEN `input` is a valid URL string and `opts` is `{}`
- WHEN `runPipeline(input, opts)` resolves
- THEN the result contains all 16 fields with correct types: `ref` (string), `score` (number), `status` equal to `'success'`, `files` (object with artifact paths), `dir` (string)

#### Scenario: Invalid input

- GIVEN `input` is an empty string
- WHEN `runPipeline(input, opts)` is called
- THEN the Promise rejects with a descriptive error; no partial artifacts are written

---

### Requirement: CLI Compatibility

Given `node scripts/hermes.js <url>`, terminal output (stderr) and all generated artifacts MUST be identical to pre-refactor behavior.

**Rationale:** Existing users, scripts, and CI pipelines depend on current CLI output. Zero behavior drift is a hard constraint.

#### Scenario: CLI run with URL argument

- GIVEN `scripts/hermes.js` receives a valid URL
- WHEN the process completes
- THEN stderr matches pre-refactor format, all files in `applications/{REF}/` are identical, exit code is 0

#### Scenario: CLI run with --help flag

- GIVEN `scripts/hermes.js` receives `--help`
- WHEN the process runs
- THEN usage text prints to stdout, exit code is 0, no pipeline steps execute

---

### Requirement: Structured Result Completeness

The result object MUST embed score data equivalent to `score.json`, match data equivalent to `match.json`, and file paths for all generated artifacts.

**Rationale:** Callers should not re-read JSON files from disk when the pipeline already produced that data in memory.

#### Scenario: Full pipeline success

- GIVEN all 6 pipeline steps complete
- WHEN `runPipeline()` resolves
- THEN `result.score` equals parsed `score.json`, `result.files` contains paths for all artifacts, `result.dir` equals the application directory

#### Scenario: Partial pipeline (early exit)

- GIVEN scrape succeeds but keyword step fails with a non-SEARCH_RESULTS_PAGE error
- WHEN `runPipeline()` resolves
- THEN `result.status` equals `'error'`, `result.files` contains only artifacts generated before the failure, `result.score` is `null`

---

### Requirement: Interactive Mode Preservation

Given `opts.interactive = true`, the function MUST prompt the user before each pipeline step, matching current CLI interactive behavior.

**Rationale:** Interactive mode is user-facing and must survive extraction unchanged.

#### Scenario: Interactive mode enabled

- GIVEN `opts.interactive = true` and valid input
- WHEN `runPipeline(input, opts)` runs
- THEN the user is prompted before each of the 6 steps and can skip or proceed

#### Scenario: Interactive mode disabled (default)

- GIVEN `opts.interactive` is `false` or omitted
- WHEN `runPipeline(input, opts)` runs
- THEN no prompts appear; all 6 steps execute sequentially without user input

---

### Requirement: Error Resilience

SEARCH_RESULTS_PAGE errors MUST be thrown with the same structured format as the current CLI. All other step failures MUST NOT crash the caller — they MUST be captured in the result with `status: 'error'`.

**Rationale:** SEARCH_RESULTS_PAGE errors signal user-actionable states the caller must handle. Other errors should be reportable without crashing batch callers.

#### Scenario: SEARCH_RESULTS_PAGE error

- GIVEN the scrape step returns multiple matching JDs
- WHEN `runPipeline()` encounters this condition
- THEN the Promise rejects with the same structured format as the current CLI

#### Scenario: Non-critical step failure

- GIVEN the cover letter step throws an unexpected error
- WHEN `runPipeline()` catches it
- THEN the Promise resolves with `status: 'error'`, `result.report` contains the error message, previously generated artifacts remain on disk
