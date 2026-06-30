# Proposal: Hermes IA Integration — Cron-to-Pipeline Bridge

## Intent

Hermes IA cron searches IT jobs daily but drops results into Telegram chat — JDs lost to history, no dedup, never fed into the CV pipeline. User must manually copy-paste each URL. Bridge: cron search → persistent state → batch pipeline → Telegram delivery.

## Scope

### In Scope
- `pending_jds.json` state file with URL dedup and status lifecycle (pending/processed/skipped)
- `hermes-ia/` directory: updated SOUL.md, README.md, SKILL.md with cron blueprint
- `append-jds.js`: deduplicate web_search results → append to state file
- `batch-process.sh`: per pending JD → `web_extract` → `runPipeline(text)` → score gate (≥75 + matchLevel ≠ skip → full package) → Telegram delivery
- Cron blueprint: daily search, dedup, notify Telegram ("N nuevas ofertas")

### Out of Scope
- Automatic batch (always manual trigger: "procesá las ofertas")
- Modifications to `lib/hermes.js` or any core pipeline code
- Concurrent batch runs — single-runner only
- PDF generation details (uses existing `pdf-generation` via `runPipeline`)

## Capabilities

### New Capabilities
- `jd-state-management`: `pending_jds.json` schema, URL-hash dedup, status lifecycle
- `hermes-ia-skill`: Hermes IA skill package — SOUL.md, README.md, SKILL.md with cron blueprint and batch trigger instructions
- `batch-processing`: orchestration scripts (append-jds, batch-process) bridging web_search → state → runPipeline → Telegram

### Modified Capabilities
None — zero changes to existing pipeline code. `runPipeline` handles text input as-is.

## Approach

Layered above existing pipeline, no core modifications:

1. **State file**: cron appends with dedup; batch reads + updates status per JD
2. **Cron skill**: SOUL.md blueprint for daily search. Results → `append-jds.js` checks URL hash, skips duplicates, appends new
3. **Batch trigger**: user sends "procesá las ofertas" → `batch-process.sh` loops `pending` JDs: `web_extract` text → `runPipeline(text, {lang:'es'})` → if score ≥75 and matchLevel ≠ skip, deliver CV+cover+PDF+reportCard to Telegram; otherwise mark `skipped`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `hermes-ia/` | New | Skill package and state file |
| `hermes-ia/skills/cv-pipeline/scripts/` | New | append-jds.js, batch-process.sh |
| Core pipeline (`lib/`, `scripts/hermes.js`) | None | Unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `web_extract` fails (paywalls, JS-only pages) | Med | Catch per-JD, mark `error`, continue to next |
| State file corruption (concurrent cron+batch) | Low | Single-writer: cron appends, batch runs only on manual trigger |
| Telegram PDF size limit | Low | A4 single-page PDFs ~50-100KB; well under 50MB limit |

## Rollback Plan

Remove `hermes-ia/` directory, revert cron to original SOUL.md. No DB migrations, no code reverts needed. `pending_jds.json` has no effect on core pipeline.

## Dependencies

- Hermes IA `web_extract` tool (available on VPS profile)
- `runPipeline` from `lib/hermes.js` (accepts text input)
- Telegram bot configured on Hermes IA profile

## Success Criteria

- [ ] Cron appends unique JDs to `pending_jds.json`; duplicates skipped by URL hash
- [ ] "procesá las ofertas" trigger produces per-JD: score, CV+cover+PDF (if ≥75), or skip
- [ ] Telegram receives reportCard summary + file attachments per qualifying JD
- [ ] Marked `processed` or `skipped` in state file; never re-processed
