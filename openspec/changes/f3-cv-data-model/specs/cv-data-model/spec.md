# CV Data Model Specification

## Purpose

Structured JSON representation of master CVs enabling programmatic field access, schema validation, and future template injection. Replaces unparseable Markdown as the automation source of truth while keeping Markdown CVs as human-readable fallback.

## Requirements

### Requirement: CV JSON Schema

The system MUST provide `schemas/cv.schema.json` (JSON Schema Draft 2020-12) defining:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `lang` | `"en" \| "es"` | Yes | Root language discriminator |
| `contact` | object | Yes | `name`, `titles[]`, `location`, `phone`, `email`, `linkedin` |
| `professionalSummary[]` | array | Yes | Bullet objects with `text` |
| `coreCompetencies[]` | array | Yes | Objects with `title`, `description` |
| `skills[]` | array | Yes | `category`, `items[]`, optional `proficiency` |
| `professionalExperience[]` | array | Yes | `id` (UUID), `company`, `role`, `location`, `dates`, `description?`, `achievements[]`, `tags[]` |
| `achievements[]` | array | Yes | `id` (UUID), `text`, `metrics[]`, `technologies[]`, `domains[]`, `impact`, `tags[]` |
| `metrics[]` | array (nested) | Yes | `type`, `value` — value MAY be `"[NEEDS METRIC: ...]"` |
| `earlierExperience[]` | array | No | Simplified: `company`, `role`, `location`, `dates` — NO achievements |
| `education[]` | array | No | Degree/cert objects |
| `languages[]` | array | No | Language proficiency objects |
| `certifications[]` | array | No | Certification objects |
| `$metadata` | object | No | `lastOptimizedFor?`, `generatedBy?`, `version?` |

All major entities (`professionalExperience`, `achievements`, `skills`) MUST carry a UUID `id` field and a `tags[]` string array for forward-compatibility.

#### Scenario: Validate complete CV JSON

- GIVEN a JSON file conforming to `schemas/cv.schema.json`
- WHEN `scripts/validate-cv.js` is executed against it
- THEN the script exits with code 0 and produces no error output

#### Scenario: Forward-compatible custom tags

- GIVEN an achievement with `"tags": ["future-feature-x"]`
- WHEN validated against the schema
- THEN validation passes — `tags[]` accepts arbitrary strings without schema changes

---

### Requirement: CV JSON Instances

The system MUST provide `data/cv_en.json` and `data/cv_es.json` that:
- Pass schema validation with exit code 0
- Contain ALL data from source Markdown CVs (`resumes/cv_en.md`, `resumes/cv_es.md`)
- Use `"[NEEDS METRIC: description]"` for any metric not present in the source — NEVER invent values
- Keep technical keywords (skills, tools, job titles, methodologies) in English regardless of `lang`

#### Scenario: Migrate cv_en.md without data loss

- GIVEN `resumes/cv_en.md` as source
- WHEN `data/cv_en.json` is generated
- THEN every section (summary bullets, competencies, skills, experiences, earlier experience, education) maps to a schema field with equivalent content
- AND no data from the Markdown source is omitted

#### Scenario: Achievement with missing metric

- GIVEN an achievement where the source Markdown contains no quantifiable metric for a claim
- WHEN the JSON is authored
- THEN the metric `value` field MUST contain `"[NEEDS METRIC: <what metric would fit>]"`
- AND the metric MUST NOT contain an invented number

---

### Requirement: Validation Script

The system MUST provide `scripts/validate-cv.js` that:
- Accepts a JSON file path as CLI argument
- Validates against `schemas/cv.schema.json` using `ajv` (or equivalent JSON Schema validator)
- Reports errors with field path references
- Exits 0 on valid, 1 on invalid

#### Scenario: Reject malformed CV JSON

- GIVEN a JSON file with a missing required field (e.g., no `lang`)
- WHEN `scripts/validate-cv.js <file>` is executed
- THEN the script exits with code 1
- AND outputs the field path and validation error message

---

### Requirement: Schema Documentation

The system MUST provide `schemas/README.md` documenting:
- Each entity and field with purpose and constraints
- The `"[NEEDS METRIC]"` convention and when to use it
- Extensibility strategy: `tags[]`, `$metadata`, UUID `id` fields
- At least one example per major entity

#### Scenario: Validate earlierExperience simplified schema

- GIVEN an `earlierExperience[]` entry with only `company`, `role`, `location`, `dates`
- WHEN validated against the schema
- THEN validation passes — no `achievements` or `id` required for earlier experience entries
- AND adding `achievements` to an earlierExperience entry would fail validation (simplified schema enforced)
