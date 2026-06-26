# Tasks: CV Data Model (F3)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1050 (schema ~320, cv_en ~290, cv_es ~290, script ~60, README ~90, pkg ~5) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (see Work Units below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user decision required) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + validator + npm setup | PR 1 (~385 lines) | Base infrastructure; verifiable with test fixture |
| 2 | cv_en.json migration + schema docs | PR 2 (~380 lines) | Depends on PR 1; README travels with first consumer |
| 3 | cv_es.json migration | PR 3 (~290 lines) | Depends on PR 1; independent of PR 2 |

## Phase 1: Schema Infrastructure (→ PR 1)

- [x] 1.1 Install `ajv` as devDependency: `npm install --save-dev ajv` — verify `package.json` has `"ajv"` in devDependencies (~3 lines)
- [x] 1.2 Create `schemas/cv.schema.json` — JSON Schema Draft 2020-12 with `$defs` for: `contact`, `professionalSummary`, `coreCompetencies`, `skills` (nested `items[]`), `professionalExperience` (nested `achievements[]` → `metrics[]`), `earlierExperience` (simplified, no `id`/`achievements`), `education`, `languages`, `certifications`, `$metadata`. Root requires `lang`, `contact`, `professionalSummary`, `coreCompetencies`, `skills`, `professionalExperience`. Use `additionalProperties: false` in strict mode. UUID `id` on experience/achievement entries. `tags[]` on major entities (~320 lines)
- [x] 1.3 Create `scripts/validate-cv.js` — ESM script: `import Ajv from "ajv"`, read schema from `schemas/cv.schema.json`, read target JSON from CLI arg, compile + validate, format errors with JSON Pointer paths to stderr, exit 0/1. Handle no-args → usage message to stderr + exit 1 (~60 lines)
- [x] 1.4 Add `"validate-cv"` script to `package.json`: `"validate-cv": "node scripts/validate-cv.js"` (~2 lines)
- [x] 1.5 **Verify PR 1**: Create minimal fixture `data/_test-valid.json` with required fields only → `node scripts/validate-cv.js data/_test-valid.json` exits 0. Create `data/_test-invalid.json` missing `lang` → exits 1 with field path error. Delete fixtures after verification.

**PR 1 total: ~385 lines. Depends on: nothing.**

## Phase 2: English CV Migration + Docs (→ PR 2)

- [ ] 2.1 Create `data/cv_en.json` — migrate `resumes/cv_en.md` section by section. Header → `contact` object. Professional Summary → `professionalSummary[]`. Core Competencies → `coreCompetencies[]`. Core Skills → `skills[]` with `category`/`items[]`. Professional Experience (5 roles) → `professionalExperience[]` with UUID `id` per entry, nested `achievements[]` each with UUID `id`, `metrics[]`, `technologies[]`, `domains[]`, `tags[]`. Earlier Experience (2 entries) → `earlierExperience[]` (simplified: `company`, `role`, `location`, `dates` only). Education → `education[]`. Set `"lang": "en"`. Add `$metadata` block with `schemaVersion`, `generatedBy`, `migratedAt`. Use `"[NEEDS METRIC: ...]"` for any achievement lacking a verifiable metric from source (~290 lines)
- [ ] 2.2 Create `schemas/README.md` — document each entity/field with purpose and constraints. Document `[NEEDS METRIC]` convention. Document extensibility strategy (`tags[]`, `$metadata`, UUID `id`). Include at least one JSON example per major entity. Document date normalization rules from design (~90 lines)
- [ ] 2.3 **Verify PR 2**: `node scripts/validate-cv.js data/cv_en.json` exits 0. Manual diff: every section in `resumes/cv_en.md` has equivalent content in `data/cv_en.json`. No data omitted.

**PR 2 total: ~380 lines. Depends on: PR 1 (schema + validator must exist).**

## Phase 3: Spanish CV Migration (→ PR 3)

- [ ] 3.1 Create `data/cv_es.json` — migrate `resumes/cv_es.md` following same structure as `cv_en.json`. Set `"lang": "es"`. Keep technical keywords in English (skills, tools, job titles, methodologies). Narrative text in Spanish. Carry `[NEEDS METRIC]` placeholders identically. Same `$metadata` structure. Normalize Spanish month names (Ene→01, Feb→02, ..., Dic→12) per design spec (~290 lines)
- [ ] 3.2 **Verify PR 3**: `node scripts/validate-cv.js data/cv_es.json` exits 0. Manual diff: every section in `resumes/cv_es.md` maps to `data/cv_es.json`. Cross-check: both JSON files have identical structure, only `lang` and narrative text differ. Technical keywords remain English in both.

**PR 3 total: ~290 lines. Depends on: PR 1 (schema + validator). Independent of PR 2.**

## Dependency Graph

```
PR 1 (schema + validator + npm)
 ├── PR 2 (cv_en.json + README)
 └── PR 3 (cv_es.json)
```

PR 2 and PR 3 can proceed in parallel after PR 1 merges.
