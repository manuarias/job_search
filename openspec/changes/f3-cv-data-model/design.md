# Design: CV Data Model (F3)

## Technical Approach

Add a structured JSON representation for master CVs with JSON Schema validation. Source Markdown CVs (`resumes/cv_*.md`) remain untouched — the JSON is a derived artifact. Migration is a one-time manual extraction; the validation script ensures correctness.

## Architecture Decisions

### Decision: JSON Schema Draft

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Draft 2020-12 | Newer; ajv supports it well; `$dynamicRef` for extensibility | **Chosen** |
| Draft-07 | Broader ecosystem support; more conservative | Rejected |

**Rationale**: Proposal mandates 2020-12. ajv supports it natively. No legacy tooling constraint.

### Decision: Validation script module format

| Option | Tradeoff | Decision |
|--------|----------|----------|
| ESM (`import`/`.mjs`) | Proposal asks for ESM; cleaner for new code | **Chosen** |
| CJS (`require`) | Matches existing `pdf-builder/build-cv.js` | Rejected |

**Rationale**: `validate-cv.js` is a brand-new file — no need to match CJS legacy. ESM aligns with Node ≥18 direction.

### Decision: UUID strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `crypto.randomUUID()` | Zero deps; available Node 14.17+ (≥18 target) | **Chosen** |
| `uuid` npm package | Extra dep; battleship approach | Rejected |

**Rationale**: Built-in, no dependency. Used in migration script only — not in runtime validation.

## Data Flow

```
resumes/cv_en.md ──[manual migration]──→ data/cv_en.json
                                              │
                                              ▼
                                    scripts/validate-cv.js
                                     │  reads schema
                                     ▼
                              schemas/cv.schema.json
                                     │
                              ┌──────┴──────┐
                          exit 0        exit 1
                       (valid CV)    (errors → stderr)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `schemas/cv.schema.json` | Create | Full JSON Schema Draft 2020-12 for CV entity |
| `schemas/README.md` | Create | Schema docs: entities, `[NEEDS METRIC]` convention, extensibility |
| `data/cv_en.json` | Create | Migrated English CV in structured JSON |
| `data/cv_es.json` | Create | Migrated Spanish CV in structured JSON |
| `scripts/validate-cv.js` | Create | CLI validator using ajv, exit-code signaling |
| `package.json` | Modify | Add `ajv` to devDependencies, `"validate-cv"` script |

## Interfaces / Contracts

### validate-cv.js CLI

```
node scripts/validate-cv.js <path/to/cv.json>
```

- Exit 0 on valid, 1 on invalid
- Errors format: `"/professionalExperience/0/achievements/1/metrics/0/value: must be string — got null"`
- Uses `ajv` strict mode — rejects unknown properties

### Schema versioning

```json
"$metadata": {
  "schemaVersion": "1.0.0",
  "generatedBy": "f3-cv-data-model",
  "migratedAt": "2026-06-25"
}
```

### Achievement domain classification

Domains derived from bullet context + role: `delivery-management`, `backend-engineering`, `devops`, `observability`, `mentorship`, `automation`, `architecture`.

### Technology extraction heuristic

Regex matching capitalized tech nouns and tool names from a curated keyword list: `Java`, `Python`, `Docker`, `AWS`, `n8n`, `Jira`, `GitHub`, `REST`, `CI/CD`, `MySQL`, `CouchDB`, `MongoDB`, `OAuth`, `Kubernetes`, `Node.js`, `Datadog`, `New Relic`, `Confluence`, `SOLID`, `Scrum`, `Kanban`.

### Date normalization

| Source | Normalized |
|--------|------------|
| `Jan 2023` | `2023-01` |
| `Ene 2023` | `2023-01` |
| `Sep 2018` | `2018-09` |
| `Nov 2025` | `2025-11` |
| `Jul 2021 – Jan 2023` | `{ start: "2021-07", end: "2023-01" }` |

Month parsing table for Spanish: `Ene→01, Feb→02, ..., Dic→12`.

## Migration / Rollout

- `resumes/cv_*.md` remain unchanged (source of truth)
- JSON files are additive — remove `data/` and `schemas/` to roll back
- `[NEEDS METRIC: ...]` placeholders are carried verbatim into JSON; no invention
- `ajv` added to devDependencies via `npm install --save-dev ajv`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Schema loads and compiles | Vitest: `ajv.compile(schema)` succeeds |
| Unit | Valid CV JSON passes | Vitest: `validate(cv_en_json)` returns true |
| Unit | Malformed JSON fails with specific error | Vitest: missing `lang`, wrong type → expect error path |
| Integration | `validate-cv.js` exit codes on real files | Vitest: `execSync` on `data/cv_en.json` → exit 0 |
| Integration | `validate-cv.js` rejects invalid fixture | Vitest: `execSync` on fixture with missing fields → exit 1 |
| CLI | `scripts/validate-cv.js` no-args behavior | Prints usage to stderr, exits 1 |

## Open Questions

- [ ] Should `skills[].proficiency` be an enum (`expert`, `advanced`, `intermediate`) or free text? Spec says optional string — deferring to free text until F6 needs structure.
- [ ] Is `earlierExperience` ever needed in the matching engine (F6)? If so, UUID `id` may need adding later. Current spec says no.
