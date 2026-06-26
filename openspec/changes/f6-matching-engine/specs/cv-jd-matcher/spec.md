# CV–JD Matcher Specification

## Purpose

Score how well a structured CV matches a job description across 5 weighted dimensions, producing an auditable match report and actionable recommendations for downstream gap analysis (F7) and CV assembly (F8).

## Requirements

### Requirement: Weighted Score Aggregation

The system MUST compute a composite match score (0–100) as the weighted sum of 5 dimension scores. Default weights MUST be loaded from `data/match-config.json` and MUST be editable without code changes.

| Dimension | Default Weight |
|-----------|---------------|
| Hard keywords | 40% |
| Soft keywords | 20% |
| Domain match | 20% |
| Seniority fit | 10% |
| Fuzzy/partial | 10% |

#### Scenario: Default weights produce valid composite score

- GIVEN a CV JSON and JD keywords with matches in all dimensions
- WHEN the matching engine runs with default config
- THEN composite score equals the sum of each dimension score multiplied by its weight, and falls between 0 and 100

#### Scenario: Custom weights override defaults

- GIVEN `data/match-config.json` with hard=50%, soft=10%, domain=20%, seniority=10%, fuzzy=10%
- WHEN the matching engine runs
- THEN composite score uses the custom weights, not defaults

### Requirement: Hard Keyword Coverage

The system MUST compare CV `technologies` and `skills.items` against JD `hardKeywords[].term`. Each term is classified as `must_have` or `nice_to_have`. Matching MUST support exact (case-insensitive) and fuzzy (Levenshtein distance <= 2) matching.

#### Scenario: Exact match on must-have keyword

- GIVEN JD requires "Kubernetes" as `must_have` and CV lists "Kubernetes" in technologies
- WHEN matching runs
- THEN that term scores as matched with full weight

#### Scenario: Zero hard keyword match

- GIVEN a CV with no overlapping skills against JD hard keywords
- WHEN matching runs
- THEN hard dimension score is 0 and recommendations include `add` entries for each `must_have` gap

### Requirement: Soft Keyword Alignment

The system MUST map JD `softKeywords[].term` to CV competencies via `data/soft-synonyms.json`. Each JD soft term MUST be resolved through the synonym dictionary before matching against CV language.

#### Scenario: Synonym bridge matches equivalent terms

- GIVEN JD requires "stakeholder management" and CV lists "cross-functional coordination", and the synonym dictionary maps both to the same canonical form
- WHEN matching runs
- THEN soft dimension scores this as a match

### Requirement: Domain Matching

The system MUST map JD taxonomy terms to domains via `data/keyword-domain-map.json` (7 domains: `delivery-management`, `backend-engineering`, `automation`, `leadership`, `frontend`, `data-engineering`, `devops`). Domain score MUST reflect overlap between JD-required domains and CV `achievements[].domains[]`.

#### Scenario: Domain overlap produces proportional score

- GIVEN JD maps to 3 domains and CV achievements cover 2 of those 3
- WHEN matching runs
- THEN domain dimension score is approximately 66%

### Requirement: Seniority Fit

The system MUST compute YOE by summing months across all `professionalExperience` entries (`dates.start` to `dates.end`, where `Present` = today). The score MUST compare computed YOE against JD `yearsMinimum`/`yearsPreferred` with threshold bands, plus title signal alignment (Senior/Lead/Junior).

#### Scenario: YOE meets preferred threshold

- GIVEN CV has 120 months total experience and JD requires `yearsPreferred: 8`
- WHEN matching runs
- THEN seniority dimension score is 100%

#### Scenario: JD with no explicit seniority signals

- GIVEN JD keywords contain no `senioritySignals` and no `yearsMinimum`
- WHEN matching runs
- THEN seniority dimension score is neutral (50%) and no penalty is applied

### Requirement: Structured Recommendations

The system MUST output an array of recommendations, each with `{type, achievementId?, skill?, reason, priority}`. Types: `highlight` (achievement maps to JD must-have), `reframe` (domain match with wrong terminology), `add` (JD must-have with no CV match). Every recommendation MUST have a non-empty `reason`.

#### Scenario: Recommendation generation covers all types

- GIVEN a CV with 1 matching achievement, 1 domain-matching achievement with different terminology, and 1 JD must-have gap
- WHEN matching runs
- THEN recommendations include at least one `highlight`, one `reframe`, and one `add` entry, each with non-empty `reason` and `priority`

### Requirement: Output Schema Compliance

The system MUST produce output conforming to `schemas/match-result.schema.json` and write it to `applications/{REF}/match-result.json`.

#### Scenario: Output passes JSON Schema validation

- GIVEN any valid CV + JD keywords input
- WHEN matching runs
- THEN output validates against `match-result.schema.json` without errors

### Requirement: Future Embedding Extension Point

The system SHOULD document in `data/match-config.json` an `embedding` configuration block (disabled by default) reserving the integration point for future semantic matching.

#### Scenario: Embedding config block exists but is disabled

- GIVEN default `data/match-config.json`
- WHEN inspected
- THEN an `embedding` key exists with `enabled: false` and a description of the upgrade path
