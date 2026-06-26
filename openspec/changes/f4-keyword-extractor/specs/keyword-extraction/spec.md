# Keyword Extraction Specification

## Purpose

Automated extraction of hard keywords, soft keywords, seniority signals, and section metadata from Job Description Markdown files. Produces structured JSON (`jd-keywords.json`) consumed by downstream pipeline steps (ATS diagnostic, achievement rewrite, keyword fusion). Pure heuristics — no LLM dependency.

## Requirements

### Requirement: Keyword Taxonomy

The system SHALL maintain a curated taxonomy at `data/keyword-taxonomy.json` containing 100–150 technical terms seeded from F3's skills taxonomy. Terms MUST be grouped by category (`languages`, `frameworks`, `tools`, `cloud`, `methodologies`, `databases`). Each entry MUST include common variants/synonyms (e.g., `"K8s"` → `"Kubernetes"`, `"CI/CD"` → `["continuous integration", "continuous delivery"]`). The taxonomy MUST be editable as standalone JSON without code changes.

#### Scenario: Taxonomy seeded from F3 technology list

- GIVEN F3's technology extraction list (~22 terms)
- WHEN the taxonomy file is loaded
- THEN it MUST contain ≥100 terms across all 6 categories
- AND each term MUST have at least one variant mapping

#### Scenario: Adding a new term without code changes

- GIVEN the taxonomy JSON file
- WHEN a new entry is appended (e.g., `"Terraform"` under `tools`)
- THEN the extractor MUST recognize it on next run without recompilation

---

### Requirement: Keyword Extraction

The system SHALL accept JD text (string) and return structured keyword data. It MUST detect hard keywords by matching against taxonomy entries (case-insensitive, variant-aware). It MUST detect soft keywords from a built-in soft-skill dictionary (leadership, communication, stakeholder management, etc.). It MUST return frequency counts per keyword. It MUST handle both English and Spanish JD text. It MUST extract raw seniority signals (`years_experience` via regex, `level_labels[]` from known labels). The extractor MUST NEVER depend on an LLM — pure heuristics and dictionary matching only.

#### Scenario: Extract hard keywords from English JD with explicit MUST HAVES section

- GIVEN a JD with a `## Must Haves` section listing "React, Node.js, AWS"
- WHEN the extractor processes the JD
- THEN `hardKeywords` MUST contain entries for `React`, `Node.js`, `AWS`
- AND each entry MUST include `frequency ≥ 1`, `category`, and `section: "must-haves"`

#### Scenario: Extract keywords from Spanish JD

- GIVEN a Spanish JD (e.g., GYA/HUMA) with section `## Conocimientos técnicos requeridos` listing "Python, Docker, metodologías Agile"
- WHEN the extractor processes the JD
- THEN `hardKeywords` MUST contain `Python`, `Docker`, `Agile`
- AND section MUST be classified as `must-haves` via Spanish pattern match

#### Scenario: Seniority signal extraction

- GIVEN a JD containing "5+ years of experience" and "Mid-Senior level"
- WHEN the extractor processes the JD
- THEN `senioritySignals.years_experience` MUST equal `5`
- AND `senioritySignals.level_labels` MUST contain `"Mid-Senior"`

---

### Requirement: Must-Have vs Nice-to-Have Classification

The system SHALL classify each keyword using a weighted heuristic and output `classification: "must-have" | "nice-to-have"` with `confidence: 0.0–1.0`. Weights:

| Factor | Weight | Trigger |
|--------|--------|---------|
| Section context | 0.40 | +1.0 if under Requirements/Must Haves; +0.3 if Nice to Have; +0.1 elsewhere |
| Repetition count | 0.30 | Logarithmic bonus per occurrence (3+ occurrences → full score) |
| Signal word proximity | 0.20 | Bonus if within 5 words of `required`, `must have`, `essential`, `excluyente`, `requerido`, `imprescindible` |
| First-mention position | 0.10 | Bonus if keyword appears in first 25% of document |

Classification threshold: composite score ≥ 0.5 → `must-have`; < 0.5 → `nice-to-have`.

#### Scenario: High-confidence must-have classification

- GIVEN a keyword appearing 4 times in the `## Requirements` section, preceded by "required"
- WHEN classified
- THEN `classification` MUST be `"must-have"`
- AND `confidence` MUST be ≥ 0.7

#### Scenario: Nice-to-have classification

- GIVEN a keyword appearing once in `## Nice to Have` / `## Deseables`
- WHEN classified
- THEN `classification` MUST be `"nice-to-have"`
- AND `confidence` MUST be < 0.5

---

### Requirement: Section Detection

The system SHALL detect section headers in both English and Spanish JDs using comprehensive regex patterns. English patterns MUST include: `Requirements`, `Must Haves`, `Nice to Have`, `Qualifications`, `Responsibilities`, `What You'll Do`, `About the Role`. Spanish patterns MUST include: `Requisitos`, `Qué buscamos`, `Conocimientos necesarios`, `Conocimientos técnicos requeridos`, `Deseables`, `Valoramos`, `Principales responsabilidades`, `Objetivo del rol`, `Nivel esperado`, `Lo que buscamos en vos`, `Misión y Propósito`. Unmatched sections MUST fall back to an `unclassified` label with raw text preserved.

#### Scenario: JD with no explicit section headers

- GIVEN a JD composed entirely of unstructured paragraphs with no headers
- WHEN the extractor processes it
- THEN all keywords MUST be assigned `section: "unclassified"`
- AND extraction MUST still succeed without errors

---

### Requirement: Output Schema

The system SHALL produce a JSON artifact conforming to `schemas/jd-keywords.schema.json` with the following structure:

- `hardKeywords[]`: `{ term, category, frequency, classification, confidence, section }`
- `softKeywords[]`: `{ term, frequency, classification }`
- `senioritySignals`: `{ years_experience: number | null, level_labels: string[] }`
- `metadata`: `{ totalTerms: number, classifiedCount: number, unclassifiedCount: number }`

Output file MUST be written to `applications/{REF}/jd-keywords.json`.

#### Scenario: Schema validation

- GIVEN a completed extraction run
- WHEN the output is validated against `schemas/jd-keywords.schema.json`
- THEN it MUST pass with zero errors
