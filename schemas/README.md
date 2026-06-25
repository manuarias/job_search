# CV Data Model Schema

> **Schema version:** 1.0.0  
> **Schema file:** `schemas/cv.schema.json`  
> **Validator:** `scripts/validate-cv.mjs`  
> **Last updated:** 2026-06-25 (PR 2 — documentation + cv_en.json migration)

---

## Overview

The CV Data Model (`cv.schema.json`) defines a structured, machine-readable representation of a résumé/CV. It is the canonical data layer for the job_search pipeline, enabling:

- **Programmatic matching** — keyword coverage, domain alignment, seniority checks (F6)
- **Automated scoring** — ATS parseability, recruiter appeal, weighted rubrics (F7)
- **Selective assembly** — pull the most relevant achievements for a given JD (F8)
- **Analytics** — track which keywords and metrics correlate with interview callbacks (F10)

The model replaces the Markdown-only source of truth with a structured JSON that preserves all original content while adding metadata for downstream automation.

---

## Entity Reference

### Root Document

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | No | Reference to the JSON Schema used for validation |
| `lang` | string (enum: `en`, `es`) | **Yes** | Root language discriminator. Technical keywords (skills, tools, job titles) must remain in English regardless of this value |
| `contact` | object (`#/$defs/contact`) | **Yes** | Contact information block |
| `professionalSummary` | array of `summaryItem` | **Yes** | 3–5 scannable bullets summarizing career highlights |
| `coreCompetencies` | array of `competency` | **Yes** | 4–6 competency bullets mapping to JD must-haves |
| `skills` | array of `skillCategory` | **Yes** | Categorized technical and soft skills |
| `professionalExperience` | array of `experience` | **Yes** | Primary career window with quantified achievements (most-recent-first) |
| `earlierExperience` | array of `earlierExperience` | No | Simplified entries for roles outside the primary window |
| `education` | array of `education` | No | Academic degrees and coursework |
| `languages` | array of `language` | No | Spoken/written language proficiencies |
| `certifications` | array of `certification` | No | Professional certifications and licenses |
| `$metadata` | object (`#/$defs/metadata`) | No | Forward-compatible metadata for versioning and provenance |

All top-level `additionalProperties` are **forbidden** — the schema will reject unknown fields.

---

### `contact`

Contact information. Titles are kept in English regardless of CV language.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Full name |
| `titles` | string[] | **Yes** | Job titles in English (e.g. "Technical Program Manager") |
| `location` | string | No | City, country (e.g. "Buenos Aires, Argentina") |
| `phone` | string | No | Contact phone |
| `email` | string (email format) | No | Contact email |
| `linkedin` | string | No | LinkedIn profile URL |

---

### `summaryItem`

A single professional summary bullet.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | **Yes** | The bullet text |
| `tags` | string[] | No | Forward-compatible categorization tags |

---

### `competency`

A core competency pairing a domain area label with an achievement-backed justification.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Competency area (e.g. "Technical Program Leadership") |
| `description` | string | **Yes** | Brief justification, ideally with a metric or outcome |
| `tags` | string[] | No | Forward-compatible tags |

---

### `skillCategory`

A group of related skills under a category label. All skill names must be in English.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | **Yes** | Label (e.g. "Languages & Frameworks", "Cloud & DevOps") |
| `items` | string[] | **Yes** | Individual skill names in English |
| `proficiency` | string | No | Optional proficiency level (free-text) |
| `tags` | string[] | No | Forward-compatible tags |

---

### `experience`

A professional experience entry in the primary career window. Contains quantified achievements with structured metadata for programmatic matching. Each experience has a stable UUID `id` for cross-referencing.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (uuid) | **Yes** | Stable UUID v4 identifier |
| `company` | string | **Yes** | Company/organization name |
| `role` | string | **Yes** | Job title in English |
| `location` | string | No | City, country, or "Remote" |
| `dates` | object (`#/$defs/dates`) | **Yes** | Start/end date range |
| `description` | string | No | Optional one-liner context paragraph |
| `achievements` | array of `achievement` | **Yes** | Quantified, impact-driven bullets |
| `tags` | string[] | **Yes** | Forward-compatible categorization tags |

---

### `achievement`

The core unit of structured CV data. Every achievement bullet is enriched with metrics, technology extraction, domain classification, and impact assessment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (uuid) | **Yes** | Stable UUID v4 identifier |
| `text` | string | **Yes** | The achievement text (language matches CV `lang`) |
| `metrics` | array of `metric` | **Yes** | Extracted or placeholder metrics |
| `technologies` | string[] | **Yes** | Technologies/tools/platforms mentioned (always English) |
| `domains` | string[] (enum) | **Yes** | Domain classification for JD matching |
| `impact` | string (enum) | **Yes** | `high`, `medium`, or `low` |
| `tags` | string[] | **Yes** | Forward-compatible categorization tags |

#### Domains

Each achievement is classified into one or more of these 7 domains:

| Domain | What it covers |
|--------|---------------|
| `delivery-management` | Program delivery, roadmapping, stakeholder alignment, epic breakdown, backlog refinement |
| `backend-engineering` | Server-side development, API design, microservices, database work, system architecture |
| `automation` | Workflow automation, CI/CD, scripting, n8n, AI copilots, process optimization |
| `leadership` | Mentorship, team management, hiring, code review leadership, career development |
| `frontend` | UI/UX development, client-side frameworks (not currently present in source CV) |
| `data-engineering` | Data modeling, ETL, database design, query optimization, caching strategies |
| `devops` | Infrastructure, deployments, observability, incident management, reliability |

---

### `metric`

A single quantified metric from an achievement.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string (enum) | **Yes** | Category: `percentage-improvement`, `dollar-saved`, `time-reduction`, `users-impacted`, `team-size`, `delivery-throughput`, `uptime`, `other` |
| `value` | string | **Yes** | Numeric or descriptive value. May be `[NEEDS METRIC: ...]` if the source lacks a verifiable number |

---

### `dates`

Normalized date range (`YYYY-MM` format). End may be `"Present"` for current roles.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string (pattern: `\d{4}-(0[1-9]\|1[0-2])`) | **Yes** | Start date (e.g. `"2023-01"`) |
| `end` | string (pattern or `"Present"`) | **Yes** | End date or `"Present"` |

**Date normalization rules:**
- `"Jan 2023"` → `"2023-01"`
- `"Nov 2025"` → `"2025-11"`
- Spanish months: `Ene` → `01`, `Feb` → `02`, …, `Dic` → `12`

---

### `earlierExperience`

Simplified entry for roles outside the primary experience window. No UUID `id` or `achievements` array — these are excluded from algorithmic matching.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company` | string | **Yes** | Company/organization name |
| `role` | string | **Yes** | Job title in English |
| `location` | string | No | City, country, or "Remote" |
| `dates` | object (`#/$defs/dates`) | **Yes** | Start/end date range |

---

### `education`

Academic degree or certification program.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `degree` | string | **Yes** | Degree name |
| `institution` | string | **Yes** | Institution name |
| `year` | string (pattern: `\d{4}`) | No | Graduation year |
| `dates` | object (`#/$defs/dates`) | No | Date range for multi-year programs |

---

### `language`

Spoken/written language proficiency.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | **Yes** | Language name in English |
| `proficiency` | string (enum) | **Yes** | `native`, `fluent`, `advanced`, `intermediate`, or `basic` |

---

### `certification`

Professional certification or license.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Certification name |
| `issuer` | string | No | Issuing organization |
| `year` | string (pattern: `\d{4}`) | No | Year obtained |

---

### `$metadata` (metadata)

Forward-compatible metadata block for schema versioning, provenance tracking, and extensibility.

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | string | Semantic version of the schema used (e.g. `"1.0.0"`) |
| `generatedBy` | string | Identifier for the process/agent that generated this JSON |
| `migratedAt` | string (date) | ISO 8601 date when the JSON was migrated from source Markdown |
| `lastOptimizedFor` | string | Reference code of the last JD this CV was optimized against (e.g. `"AGIL"`) |
| `version` | string | Instance version string for tracking revisions |

---

## `[NEEDS METRIC]` Convention

The schema requires every achievement to have at least one metric. When the source Markdown contains **no verifiable number** for a given achievement, the metric value must use the placeholder convention:

```
[NEEDS METRIC: <description of what metric would fit>]
```

Examples from the live data:

| Achievement | Metric |
|-------------|--------|
| "Led functional analysis and backlog refinement sessions…" | `[NEEDS METRIC: number of endpoints designed or integrations documented]` |
| "Transformed CI/CD and Git workflows…" | `[NEEDS METRIC: deployment frequency before vs after, or reduction in deployment time]` |
| "Conducted code reviews and authored technical documentation…" | `[NEEDS METRIC: number of API specs or integration guides produced]` |

**Critical rule:** NEVER invent, estimate, or hallucinate a metric value. If you don't have the number, you don't have the number — mark it and ask the CV owner. Fabricated metrics are worse than placeholders because they poison downstream analytics (F7/F10).

**When to fill:** These placeholders should be resolved by the CV owner before running algorithmic matching (F6) or scoring (F7). The analytics module (F10) can report coverage stats like "8 of 15 achievements have real metrics (53%)" to track improvement over time.

---

## Extensibility Strategy

The schema is designed to evolve without breaking downstream consumers. Three mechanisms support this:

### 1. Tags (`tags` fields)

Every major entity (`summaryItem`, `competency`, `skillCategory`, `experience`, `achievement`) carries a `tags: string[]` field. This is a **free-form extension channel**:

- Add ad-hoc labels for filtering (e.g. `"featured"`, `"b2b"`, `"remote"`)
- Prototype new structured metadata without schema changes
- Tag-based queries work immediately — no migration needed

**Convention:** Tags are lowercase, hyphenated, and descriptive. Avoid single-use tags; prefer categories that could apply to multiple items.

### 2. `$metadata` block

The root-level metadata block captures **instance-level** information that crosses schema versions:

- `schemaVersion` — which schema version was used to generate this instance
- `generatedBy` — which agent/process created it (for debugging and provenance)
- `migratedAt` — when the Markdown → JSON migration happened
- `lastOptimizedFor` — tracking which JD this CV was last tailored for
- `version` — instance revision string (can be incremented independently of schema version)

Adding new metadata fields is backward-compatible: existing validators ignore them, new consumers can use them.

### 3. Stable UUID Identifiers

Every `experience` and `achievement` carries a UUID v4 `id`. These IDs are **permanent** once assigned. They enable:

- Cross-referencing from scoring reports back to source achievements
- Merging updated metrics without regenerating all UUIDs
- Tracking which achievements were selected for a particular JD optimization

**Generation:** Use `crypto.randomUUID()` when creating new instances. Never reuse or reassign IDs.

### Schema Evolution Policy

When the schema itself needs to change (new required fields, new entity types, enum additions):

1. **Minor (additive):** Add optional fields or new enum values. Bump schema patch version (`1.0.0` → `1.0.1`). Backward-compatible — all existing JSON instances remain valid.
2. **Major (breaking):** Add required fields, remove fields, or change types. Bump schema major version (`1.0.0` → `2.0.0`). Existing JSON instances need migration.
3. **Instance version:** The `$metadata.version` field tracks the instance separately from the schema — increment it whenever the content changes (e.g. new achievements, updated metrics).

---

## Minimal Valid CV Example

```json
{
  "$schema": "../schemas/cv.schema.json",
  "lang": "en",
  "contact": {
    "name": "Jane Doe",
    "titles": ["Software Engineer"]
  },
  "professionalSummary": [
    {
      "text": "Full-stack engineer with 3 years building React micro-frontends."
    }
  ],
  "coreCompetencies": [
    {
      "title": "Frontend Development",
      "description": "Built 2 component libraries used by 5 internal teams."
    }
  ],
  "skills": [
    {
      "category": "Languages",
      "items": ["JavaScript", "TypeScript", "Python"]
    }
  ],
  "professionalExperience": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "company": "Acme Corp",
      "role": "Software Engineer",
      "dates": {
        "start": "2023-06",
        "end": "Present"
      },
      "achievements": [
        {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "text": "Shipped checkout redesign, increasing mobile conversion by 15%.",
          "metrics": [
            {
              "type": "percentage-improvement",
              "value": "15%"
            }
          ],
          "technologies": ["React", "TypeScript"],
          "domains": ["frontend"],
          "impact": "high",
          "tags": ["conversion", "mobile"]
        }
      ],
      "tags": ["featured"]
    }
  ]
}
```

This example omits optional fields (`earlierExperience`, `education`, `languages`, `certifications`, `$metadata`, entity-level `tags`) to show the minimum valid document. In practice, real CV instances should include all available data.

---

## Validation

Validate any CV JSON instance against the schema:

```bash
node scripts/validate-cv.mjs data/cv_en.json
# Exits 0 on valid, 1 on invalid with detailed error messages
```

The validator uses `ajv` with `ajv-formats` for full JSON Schema 2020-12 support including `format: "uuid"`, `format: "email"`, and `format: "date"`.

You can also validate via npm:

```bash
npm run validate-cv -- data/cv_en.json
```
