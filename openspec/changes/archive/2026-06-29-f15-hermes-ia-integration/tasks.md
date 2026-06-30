# Tasks: Hermes IA Integration — Cron-to-Pipeline Bridge

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280 (5 new files + .gitignore) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (under budget) |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain (if split needed) |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | ~280 lines, single PR sufficient |

## Phase 1: Foundation (State + Gitignore)

- [x] 1.1 Add `pending_jds.json` and `*.tmp` patterns to `.gitignore`
- [x] 1.2 Create `pending_jds.json` with empty array `[]` as template
- [x] 1.3 Verify: `git status` shows `pending_jds.json` ignored

## Phase 2: Dedup Script (append-jds.sh)

- [x] 2.1 Create `hermes-ia/skills/cv-pipeline/scripts/append-jds.sh` — reads JSON array from stdin, computes SHA-256 URL hash via `sha256sum`, checks dedup against existing `urlHash` values, appends new entries with `status: "pending"`, `addedAt`, `processedAt: null`
- [x] 2.2 Implement atomic write: output to `.tmp`, validate JSON with `jq empty`, `mv` to `pending_jds.json`
- [x] 2.3 Handle edge cases: empty stdin, malformed JSON (exit 1), duplicate URL (print "duplicate: <url>", skip)
- [x] 2.4 Verify: feed 3 URLs → 3 appended; feed same 3 → 0 appended, "duplicate" messages

## Phase 3: Batch Script (batch-process.sh)

- [x] 3.1 Create `hermes-ia/skills/cv-pipeline/scripts/batch-process.sh` — reads `pending_jds.json`, filters `status == "pending"`, outputs "no hay ofertas pendientes" if none
- [x] 3.2 Per-JD loop: call `node -e "require('./lib/hermes').runPipeline(text, {lang:'es'})"` with extracted text, capture stdout JSON
- [x] 3.3 Score threshold: if `score >= 75 && matchLevel !== 'skip'` → mark `processed`, else → mark `skipped`; on exception → mark `error`
- [x] 3.4 Atomic state update after EACH JD: write `.tmp`, validate, `mv` — spec requires per-JD persistence
- [x] 3.5 Output summary JSON to stdout: `{summary: {total, processed, skipped, error}, results: [...]}`
- [x] 3.6 Verify: 3 pending JDs (1 high, 1 low, 1 bad URL) → correct status transitions, summary counts match

## Phase 4: Hermes IA Skill Package

- [x] 4.1 Create `hermes-ia/skills/cv-pipeline/SKILL.md` — metadata.hermes block with `blueprint.schedule` (cron daily), `blueprint.deliver: origin`, `blueprint.prompt` (web_search IT jobs → pipe to append-jds.sh); batch trigger instructions ("procesá las ofertas" variants → execute batch-process.sh); `JOB_SEARCH_PATH` env var docs
- [x] 4.2 Create `hermes-ia/SOUL.md` — agent persona with JD search capabilities, references to scripts and `pending_jds.json` location
- [x] 4.3 Create `hermes-ia/README.md` — purpose, cron schedule, trigger phrases, state file location, troubleshooting (web_extract failures, resetting pending JDs)
- [x] 4.4 Verify: SKILL.md contains all spec-required fields (schedule, deliver, prompt, trigger variants, JOB_SEARCH_PATH)

## Phase 5: Verification

- [x] 5.1 End-to-end: append 3 JDs via append-jds.sh → run batch-process.sh with mock data → verify state transitions and summary output
- [x] 5.2 Atomic write test: verify `.tmp` + `mv` pattern leaves valid file on interrupted write
- [x] 5.3 Dedup edge case: same path different host → both appended (different hashes)
