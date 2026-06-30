# Proposal: Public/Private Repository Separation

## Intent

The job_search repo mixes shareable pipeline code with personal data (CVs, applications, tracking). Making it public would expose PII. This change separates public code from private data via templates, `.gitignore` rules, and configurable data directories — enabling open-sourcing without data leaks.

## Scope

### In Scope
- **Template files**: `data/cv_*.json.template`, `resumes/cv_*.md.template`, `data/jd-tracking.json.template`, `applications/jd-tracking.md.template` — all with placeholder values
- **`.gitignore` rules**: exclude personal data while preserving templates; block `applications/` (except `.gitkeep`/`.template`), `resumes/cv_*.md`, `data/cv_*.json`, `data/jd-tracking.json`, `historial-laboral.md`, `pending_jds.json`
- **`scripts/sync-data.js`**: deep-merge template fields into user data, detect new fields, preserve existing values, `--dry-run` mode
- **`JS_DATA_DIR` env var**: `lib/hermes.js` and `scripts/build-pdf.js` read from env var, fall back to `data/`
- **Docs**: MIT license, README quick-start, remove hardcoded absolute paths from `AGENTS.md` and `pdf-builder/README.md`
- **`.gitkeep`**: add `applications/.gitkeep` so empty dir survives clone

### Out of Scope
- User-facing documentation site or GitHub Pages
- npm package publication
- CI/CD pipeline for public repo
- Encryption or secrets management for personal data

## Capabilities

### New Capabilities
- `data-directory-configuration`: `JS_DATA_DIR` env var with graceful fallback to `data/`
- `template-data-files`: `.template` files users copy and customize; never committed
- `data-sync-tool`: `sync-data.js` deep-merges new template fields into existing personal data

### Modified Capabilities
- None

## Approach

**Hybrid: public repo + templates + `JS_DATA_DIR` env var.** Personal data becomes `.template` files. Pipeline loads from `JS_DATA_DIR` (if set) or `data/`. `sync-data.js` helps users merge new fields on template updates. `.gitignore` blocks all personal paths while allowing templates.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `data/` | Modified | Add `.template` siblings; gitignore real files |
| `resumes/` | Modified | Add `.template` siblings; gitignore real files |
| `applications/` | Modified | Add `.gitkeep`, `.template` tracking; gitignore all else |
| `lib/hermes.js` | Modified | Support `JS_DATA_DIR` env var |
| `scripts/build-pdf.js` | Modified | Support `JS_DATA_DIR` env var |
| `scripts/sync-data.js` | New | Deep-merge script |
| `.gitignore` | Modified | 12+ new exclusion patterns |
| `AGENTS.md` | Modified | Remove hardcoded absolute paths |
| `README.md` | Modified | Add Quick Start for new users |
| `pdf-builder/README.md` | Modified | Replace absolute paths with relative |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User commits real data before copying templates | Medium | `.gitignore` blocks by filename; doc warns in Quick Start |
| Template drift: new fields not synced | Low | `sync-data.js` detects and reports missing fields |
| `JS_DATA_DIR` not set — pipeline breaks | Low | Graceful fallback to `data/`; clear error if missing required files |

## Rollback Plan

1. Revert `.gitignore` changes to unblock personal files
2. Remove `JS_DATA_DIR` reads from `lib/hermes.js` and scripts (restore hardcoded paths)
3. Delete `.template` files and `scripts/sync-data.js`
4. Restore `AGENTS.md` and `README.md` from git history

## Dependencies

- None (self-contained change)

## Success Criteria

- [ ] `git clone` + `cp data/cv_en.json.template data/cv_en.json` + `JS_DATA_DIR=../private node scripts/hermes.js <jd-url>` runs end-to-end
- [ ] `git status` shows zero personal files tracked after copying all templates and running pipeline
- [ ] `sync-data.js --dry-run` correctly reports new/missing fields when template diverges
- [ ] All hardcoded absolute paths (`/Users/earias/`) removed from `AGENTS.md` and `pdf-builder/README.md`
