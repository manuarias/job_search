# Design: Public/Private Repository Separation

## Technical Approach

Replace hardcoded `data/` paths with `JS_DATA_DIR` env var resolution, add `.template` placeholder files for all personal data, create a `sync-data.js` deep-merge tool, and harden `.gitignore` to exclude PII while tracking templates. The pipeline falls back to `data/` when `JS_DATA_DIR` is unset — preserving backwards compatibility.

## Architecture Decisions

| Decision | Options considered | Choice & Rationale |
|---|---|---|
| Env var vs config file | `JS_DATA_DIR` env var, `config.json`, CLI flag `--data-dir` | `JS_DATA_DIR` env var. Zero dependency, standard 12-factor, trivial in CI, no file parsing, no CLI flag plumbing through 6+ pipeline steps. |
| JSON deep merge vs YAML/TOML | Deep merge JSON, YAML templates, TOML config | JSON deep merge. Project already JSON-only (`cv_en.json`, schemas, match/score output). No new parser dependency. `sync-data.js` uses pure recursive object walk. |
| Placeholder convention | `"TODO: ..."`, `"<placeholder>"`, `"[REPLACE]"` | `"TODO: <description>"`. Already used in `template_optimized.md` as `[REEMPLAZAR]`. Consistent, grep-friendly, self-documenting. JSON templates use `"TODO: Your Name"` for strings, `[]` for empty arrays, `{}` for empty objects. |
| All data/ files to JS_DATA_DIR vs only personal | Move all, move only CV+tracking | Move all `data/` files when `JS_DATA_DIR` is set. Simpler mental model: user copies entire `data/` to private dir. Config files (taxonomy, synonyms) are small and cloning them is trivial. Lib modules refactored from `require()` to `fs.readFileSync` to support dynamic path resolution. |
| Gitignore strategy | Per-file patterns, directory exclude with exceptions, `!*.template` global | Per-file patterns for `data/` and `resumes/`, directory prefix match for `applications/[A-Z]*/`. Templates already pass through because `data/cv_en.json` (exact) ≠ `data/cv_en.json.template`. |

## Data Flow

```
┌──────────────┐     JS_DATA_DIR?      ┌────────────────┐
│ process.env  │──────────────────────▶│ resolveDataDir()│
└──────────────┘  env or PROJECT_ROOT   └───────┬────────┘
                                                │
                    ┌───────────────────────────┤
                    ▼                           ▼
             lib/hermes.js              lib/matcher.js
             lib/scorer.js              lib/keyword-extractor
             scripts/build-pdf.js       (all via getDataDir())
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/data-paths.js` | **Create** | Shared `getDataDir()` — reads `JS_DATA_DIR`, validates path exists, resolves relative to `PROJECT_ROOT`, falls back to `data/` |
| `lib/hermes.js` | Modify | Replace `DATA_DIR` const with `getDataDir()` call; lines 33-37 become function calls |
| `lib/matcher.js` | Modify | Replace `require(SOFT_SYNONYMS_PATH)` with `fs.readFileSync` + `JSON.parse` using `getDataDir()`; same for domain-mapping, match-weights |
| `lib/keyword-extractor.js` | Modify | Same pattern: `require(TAXONOMY_PATH)` → `fs.readFileSync` |
| `lib/scorer.js` | Modify | Same pattern: `require(SCORE_CONFIG_PATH)` → `fs.readFileSync` |
| `scripts/build-pdf.js` | Modify | `data/cv_{lang}.json` path resolved via `getDataDir()` |
| `scripts/sync-data.js` | **Create** | Deep merge tool; reads template, compares to user data, adds missing fields with placeholder values; `--dry-run` flag |
| `.gitignore` | Modify | Add patterns: `data/cv_*.json`, `data/jd-tracking.json`, `resumes/cv_*.md`, `applications/jd-tracking.md`, `applications/[A-Z]*/`, `applications/ANALYTICS.md`, `historial-laboral.md`, `pending_jds.json` |
| `data/cv_en.json.template` | **Create** | Placeholder CV JSON conforming to `cv.schema.json`; `contact.name: "TODO: Your Name"` |
| `data/cv_es.json.template` | **Create** | Same in Spanish |
| `data/jd-tracking.json.template` | **Create** | `[]` |
| `resumes/cv_en.md.template` | **Create** | Markdown based on `template_optimized.md` structure with `[REEMPLAZAR]` placeholders |
| `resumes/cv_es.md.template` | **Create** | Same in Spanish |
| `applications/jd-tracking.md.template` | **Create** | Table header + separator row only |
| `applications/.gitkeep` | **Create** | Empty file so `applications/` survives `git clone` |
| `AGENTS.md` | Modify | Replace `/Users/earias/Documents/job_search/` with `PROJECT_ROOT` or relative `./` |
| `pdf-builder/README.md` | Modify | Replace absolute paths with relative `./` |
| `README.md` | Modify | Add Quick Start section: clone → copy templates → fill data → run pipeline |

## Sync Tool Algorithm

`scripts/sync-data.js` — field-level deep merge for JSON, advisory for Markdown:

```
function deepMerge(template, userData, prefix=''):
  added = []
  for key, tplVal in template:
    if key not in userData:
      userData[key] = clone(tplVal)
      added.push(prefix + key)
    else if isPlainObject(tplVal) and isPlainObject(userData[key]):
      added += deepMerge(tplVal, userData[key], prefix + key + '.')
  return added
```

For Markdown: compare file modification times. If template is newer, print advisory — no automated merge (Markdown merge is fragile). Output format:

```
data/cv_en.json:
  + contact.github (TODO: your-github-username)
  + certifications[0].name (TODO: Certification Name)
No changes needed for data/jd-tracking.json
⚠  resumes/cv_en.md: template is newer (2026-07-01 > 2026-05-15) — review manually
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getDataDir()` path resolution | Test with `JS_DATA_DIR` set/unset/invalid; verify fallback behavior |
| Unit | `sync-data.js` deep merge | Test with 5 scenarios: no new fields, flat new field, nested new field, array preserved, dry-run no write |
| Unit | Templates valid JSON | `JSON.parse()` each `.template` file; validate against `cv.schema.json` |
| Integration | Pipeline runs with `JS_DATA_DIR` | `JS_DATA_DIR=./test-fixtures node scripts/hermes.js "mock JD text"` |
| Integration | `.gitignore` rules | `git check-ignore` on real data files vs template files |
| E2E | Clone → setup → run pipeline | Fresh clone, copy templates, fill minimal data, run pipeline end-to-end |

## Migration / Rollout

No migration required. Existing users: set `JS_DATA_DIR` to point at current `data/` (or leave unset). New users: follow Quick Start. Rollback: revert `.gitignore`, remove `JS_DATA_DIR` reads, delete `.template` files.

## Open Questions

- [ ] Should `lib/pdf-builder.js` also respect `JS_DATA_DIR`? It currently receives CV data as a parameter (not from disk), so only `scripts/build-pdf.js` needs changes — not the library itself.
- [ ] Confirm all 4 config files (keyword-taxonomy, soft-synonyms, domain-mapping, match-weights) are always committed and never contain PII — verified: all contain generic technical terms, no personal data.
