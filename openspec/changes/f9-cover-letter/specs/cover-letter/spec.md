# Cover Letter Specification

## Purpose

Generate a cover letter skeleton in Markdown from structured CV JSON and F6 match result. Emits a 5-paragraph template with `[INSERT: ...]` placeholders for an external LLM to fill. Refuses generation entirely when the CV-JD match score is below the refusal threshold.

## Requirements

### Requirement: Five-Paragraph Skeleton Structure

The system MUST produce a Markdown document with exactly 5 paragraphs in fixed order: opening, leadership, technical, mentoring, closing. Each paragraph body MUST contain at least one `[INSERT: ...]` placeholder. The system MUST NOT generate completed prose — only skeletons with placeholders.

#### Scenario: Complete skeleton for strong match

- GIVEN cv.json with ≥1 achievement in each narrative domain and `matchResult.overall.percentage ≥ 0.35`
- WHEN `generateCoverLetter(cv, matchResult, jdText)` runs
- THEN output has 5 sections, each with ≥1 `[INSERT: ...]` placeholder, no finished prose

#### Scenario: Output format is valid Markdown

- GIVEN any valid input above threshold
- WHEN skeleton is generated
- THEN output is parseable Markdown with `## {Section}` headers, blank-separated paragraphs

### Requirement: Narrative Breadth Selection

The system MUST select achievements across three narrative domains: leadership (delivery-management, stakeholder-management, scrum, agile), technical (automation, backend-engineering, observability, high-throughput), and mentoring (mentorship, career-growth, code-quality). One achievement per domain SHALL be selected. If a domain has zero achievements, the system SHALL widen selection to the next-best achievement from any domain (best-effort fallback).

#### Scenario: All three domains have achievements

- GIVEN cv.json with achievements tagged `delivery-management`, `automation`, and `mentorship`
- WHEN skeleton is generated
- THEN leadership paragraph references a delivery-management achievement, technical references automation, mentoring references mentorship

#### Scenario: One domain has no achievements

- GIVEN cv.json with no achievements tagged in the mentoring domain
- WHEN skeleton is generated
- THEN mentoring paragraph references the next best achievement from any domain, and placeholder includes `[FALLBACK: no mentoring-domain achievement found]`

### Requirement: Placeholder Format

The system SHALL emit placeholders using the format `[INSERT: {context} — impact: {metric}]` on its own line. Each placeholder MUST include: the domain context (why this achievement is relevant to the JD), the achievement's primary metric (from `ach.metrics[]`), and the JD role/company name. Placeholders MUST NOT contain fabricated achievements or metrics.

#### Scenario: Achievement with metric present

- GIVEN selected achievement with `metrics: [{ value: "40%", what: "deployment time reduction" }]`
- WHEN placeholder is generated
- THEN placeholder text includes "40% deployment time reduction"

#### Scenario: Achievement with no metrics

- GIVEN selected achievement with empty `metrics` array
- WHEN placeholder is generated
- THEN placeholder includes `[NEEDS METRIC: {achievement summary}]` instead of fabricated data

### Requirement: Refusal Gate

The system MUST inspect `matchResult.overall.percentage`. When < 0.35, generation MUST be refused entirely: the return value SHALL be `{ refused: true, reason: "<explanation>" }` and the markdown field SHALL be `null`. When ≥ 0.35, `refused` MUST be `false` and `markdown` MUST contain the full skeleton.

#### Scenario: Match below refusal threshold

- GIVEN `matchResult.overall.percentage = 0.28`
- WHEN `generateCoverLetter(cv, matchResult, jdText)` runs
- THEN return value is `{ refused: true, reason: "Match score 28% below 35% threshold" }` with `markdown: null`

#### Scenario: Match at or above threshold

- GIVEN `matchResult.overall.percentage = 0.42`
- WHEN `generateCoverLetter(cv, matchResult, jdText)` runs
- THEN return value is `{ refused: false, markdown: "<full skeleton>", stats: {...} }`

### Requirement: JD Context Extraction

The system SHALL extract company name and role title from the JD text for placeholder interpolation. Extraction MUST use the `jd-scraper` module when structured JD data is available, falling back to regex heuristics on raw JD text. If extraction fails, placeholders SHALL use `[COMPANY]` and `[ROLE]` as fallback tokens.

#### Scenario: JD text contains recognizable patterns

- GIVEN JD text containing "We are looking for a Technical Program Manager" with company "Acme Corp" in header
- WHEN context is extracted
- THEN role is "Technical Program Manager" and company is "Acme Corp"

### Requirement: CLI Wrapper

The system SHALL provide `scripts/generate-cover-letter.js` accepting `<cv.json> <match.json> [--lang en|es] [--jd jd-text.txt]`. MUST exit 0 on success (valid skeleton or refusal to stdout), 1 on missing files, 2 on invalid JSON, 3 on JD text too short (<100 chars). `--jd` is required when no structured JD data exists in match result.

#### Scenario: Valid inputs produce skeleton

- GIVEN valid cv.json, match.json (score 0.45), and JD text file
- WHEN CLI runs
- THEN exit 0, valid Markdown skeleton on stdout

#### Scenario: Valid inputs but match below threshold

- GIVEN valid cv.json, match.json (score 0.28)
- WHEN CLI runs
- THEN exit 0, stdout is empty (refused — no skeleton generated)
