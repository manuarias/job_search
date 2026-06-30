# Design: Hermes IA Integration — Cron-to-Pipeline Bridge

## Technical Approach

Layer above the existing pipeline (`lib/hermes.js`) with zero core modifications. Cron discovers JDs → `append-jds.sh` deduplicates and persists to state file → user triggers batch with "procesá las ofertas" → `batch-process.sh` orchestrates per-JD processing via `runPipeline` → results delivered to Telegram by the agent.

## Architecture Decisions

### Decision: Shell scripts (jq) for append-jds, Node.js-launching shell for batch-process

**Choice**: `append-jds.sh` uses bash + jq; `batch-process.sh` shells out to `node -e` for pipeline calls.
**Alternatives**: Pure Node.js scripts (need `npm install` in cron context, heavier); Python (new dependency).
**Rationale**: jq is available on every VPS without npm. `append-jds.sh` only manipulates JSON — no JS runtime needed. `batch-process.sh` must call `runPipeline` (JS), so it delegates via `node -e` or `node scripts/hermes.js`. Keeps cron footprint minimal.

### Decision: `pending_jds.json` in repo root, not `hermes-ia/`

**Choice**: `pending_jds.json` at workspace root.
**Alternatives**: Inside `hermes-ia/`, inside `applications/`, separate data directory.
**Rationale**: Both scripts (in `hermes-ia/skills/cv-pipeline/scripts/`) and `lib/hermes.js` need access. Root path is unambiguous. `.gitignore` excludes it — state data, not source.

### Decision: Agent pre-extracts for LinkedIn URLs

**Choice**: Scripts pass URLs to `scrapeJD` (handles Greenhouse, Lever, Workday natively). For LinkedIn (requires `LI_AT` cookie), the agent pre-extracts text via `web_extract` and pipes it.
**Alternatives**: Require `LI_AT` env var on VPS (security risk); disable LinkedIn support (misses many LATAM jobs).
**Rationale**: Hermes IA's `web_extract` already has cookie context. `scrapeJD` already throws clear error when `LI_AT` is missing — `batch-process.sh` catches this, marks `error`, continues.

### Decision: Atomic writes via temp file + rename

**Choice**: Write to `pending_jds.json.tmp`, validate JSON, `mv` to `pending_jds.json`.
**Alternatives**: In-place `jq` filter update; file locking.
**Rationale**: `mv` on same filesystem is atomic on Linux. Simple, no lock files, no jq `--in-place` partial-write risk. Spec requires "never a partial write" — satisfied.

## Data Flow

```
Cron (Hermes IA)
  │ web_search("IT jobs site:linkedin.com ...")
  ▼
append-jds.sh ──▶ pending_jds.json
  │ (dedup: SHA-256 URL hash)      │
  ▼                                 │
Telegram: "N nuevas ofertas"        │
                                    │
User: "procesá las ofertas"         │
  │                                 │
  ▼                                 ▼
batch-process.sh ◀──── pending_jds.json
  │ for each status=pending:
  ├─ web_extract URL (agent) / scrapeJD(url) (script)
  ├─ runPipeline(text, {lang:'es', pdf:true})
  ├─ score≥75 & matchLevel≠skip → mark processed
  └─ else → mark skipped/error
  │
  ▼
Summary JSON → Agent → Telegram delivery
  (reportCard + files per qualifying JD)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `hermes-ia/README.md` | Create | Setup guide: prerequisites, config, trigger phrases |
| `hermes-ia/SOUL.md` | Create | Agent personality with JD pipeline section |
| `hermes-ia/skills/cv-pipeline/SKILL.md` | Create | Cron blueprint + batch trigger instructions |
| `hermes-ia/skills/cv-pipeline/scripts/append-jds.sh` | Create | Dedup web_search results → append to state file |
| `hermes-ia/skills/cv-pipeline/scripts/batch-process.sh` | Create | Loop pending JDs → runPipeline → update state |
| `pending_jds.json` | Create | State file (empty array `[]` committed as template) |
| `.gitignore` | Modify | Add `pending_jds.json` and `hermes-ia/skills/cv-pipeline/scripts/*.tmp` |

## Interfaces / Contracts

### pending_jds.json Entry Schema
```json
{
  "url": "https://boards.greenhouse.io/...",
  "urlHash": "sha256-hex",
  "title": "Senior TPM",
  "source": "greenhouse",
  "status": "pending|processed|skipped|error",
  "addedAt": "2026-06-29T14:00:00Z",
  "processedAt": null
}
```

### batch-process.sh Output (stdout JSON)
```json
{
  "summary": { "total": 5, "processed": 2, "skipped": 2, "error": 1 },
  "results": [
    { "url": "...", "status": "processed", "ref": "ARXX", "score": 82,
      "matchLevel": "apply", "reportCard": "...", "files": ["cv.md", "cover-letter.md", "cv.pdf"] }
  ]
}
```

### append-jds.sh Input (stdin or arg — JSON array from web_search)
```json
[{"url": "https://...", "title": "...", "company": "..."}]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `append-jds.sh` dedup logic | Bash tests: feed known JSON, verify output; test URL normalization edge cases |
| Unit | Schema validation | `jq` schema check on malformed input → exit code ≠ 0 |
| Integration | `batch-process.sh` end-to-end | Mock JD text, verify state transitions (pending→processed/skipped/error) |
| Integration | Atomic writes | Kill process mid-write, verify `pending_jds.json` intact |
| Manual | Cron blueprint activation | Load SKILL.md on Hermes IA, verify daily `web_search` + append execution |

## Migration / Rollout

No migration required. New files only — no existing code modified. Rollback: delete `hermes-ia/`, remove `pending_jds.json` line from `.gitignore`, revert SOUL.md on VPS profile.

## Open Questions

- [ ] Confirm `web_extract` tool name in Hermes IA (may be `webfetch` or `web_fetch` — skill text adapts)
- [ ] Confirm Telegram delivery mechanism (direct message vs channel; file attachment size limits)
