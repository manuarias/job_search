# Proposal: CV Data Model (F3)

## Intent

Master CVs live as Markdown (`cv_en.md`, `cv_es.md`) — human readable but unparseable by automation. The optimization pipeline (Steps 1-5) has no structured CV representation. A JSON data model enables programmatic field access, validation, and future template injection.

## Scope

### In Scope
- Design `schemas/cv.schema.json` with full JSON Schema (Draft 2020-12)
- Migrate `resumes/cv_en.md` → `data/cv_en.json`
- Migrate `resumes/cv_es.md` → `data/cv_es.json`
- Create `scripts/validate-cv.js` (reads schema, validates JSON, reports errors)
- Document schema design decisions in `schemas/README.md`

### Out of Scope
- Updating Steps 1-5 to consume JSON CVs (deferred to F4)
- Auto-migration from future Markdown edits (manual process for now)
- PDF generation integration (remains Markdown-based until F5)

## Capabilities

### New Capabilities
- `cv-data-model`: Structured CV representation with JSON Schema, validated JSON instances for en/es, and a validation CLI script.

### Modified Capabilities
None.

## Approach

1. **Schema design** (`schemas/cv.schema.json`):
   - Root entity: `CV` with `$schema`, `lang` ("en"/"es"), `id` (UUID), `tags[]`, and `$metadata` block for extensibility
   - Core sections mirror current Markdown: `header`, `professionalSummary`, `coreCompetencies[]`, `coreSkills[]`, `professionalExperience[]`, `earlierExperience[]`, `education[]`, `languages[]`
   - **Q1**: Missing metrics stored as `"metric": "[NEEDS METRIC: description]"` strings — never invented
   - **Q2**: `id` (UUID) and `tags[]` on experience entries and major blocks; `$metadata` root object for future extensions
   - **Q3**: `earlierExperience[]` array with simplified schema: `title`, `company`, `location`, `dates` only — no achievements array
   - **Q4**: `"lang": "en"` / `"es"` as required root field

2. **Migration**: Manual extraction from `cv_en.md` and `cv_es.md` — one-time, verified against sources

3. **Validation**: `scripts/validate-cv.js` using `ajv` (JSON Schema validator), exit code signaling, human-readable error output

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `schemas/` | New | JSON Schema + design README |
| `data/` | New | `cv_en.json`, `cv_es.json` |
| `scripts/` | Modified | Add `validate-cv.js` |
| `resumes/` | Read-only | Source CVs remain unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration introduces data loss vs Markdown | Medium | Diff JSON against original Markdown sections; validate against schema before accepting |
| Schema too rigid for future CV structures | Low | `$metadata` extensibility block; `tags[]` for ad-hoc categorization; semantic versioning on schema |

## Rollback Plan

- JSON files and schema are additive — master Markdown CVs remain untouched in `resumes/`
- Remove `data/` and `schemas/` directories to revert; no Markdown sources affected

## Dependencies

- `ajv` (npm) for JSON Schema validation — already in project if vitest installed it transitively
- Node.js ≥18 (ESM modules for validation script)

## Success Criteria

- [ ] `data/cv_en.json` and `data/cv_es.json` pass `scripts/validate-cv.js` with exit code 0
- [ ] Migrated JSON content matches source Markdown when diffed section-by-section
- [ ] Schema documents all Q1-Q4 decisions in `schemas/README.md`
- [ ] `validate-cv.js` returns non-zero exit and human-readable errors for malformed CV JSON
