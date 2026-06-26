# CV Assembly Specification

## Purpose

Generate a complete, JD-optimized CV in Markdown from structured CV JSON and F6 match output. Computes achievement relevance, selects top achievements per role, reorders skills by JD keyword overlap, and emits reframe hints for external LLM agents.

## Requirements

### Requirement: Markdown Structure Generation

The system MUST produce a Markdown document with six ordered sections: header, professional summary, core competencies, core skills, professional experience, and education. Every section MUST be present even if empty (`N/A` placeholder). Output MUST be valid input for the PDF builder.

#### Scenario: Complete output for strong match

- GIVEN cv.json with all sections populated and `matchResult.overall.percentage ≥ 0.75`
- WHEN `assembleCV(cv, matchResult)` runs
- THEN output contains 6 Markdown sections, no empty sections, and no `LOW CONFIDENCE` warning header

#### Scenario: Sparse CV with missing education

- GIVEN cv.json with empty `education` array
- WHEN `assembleCV(cv, matchResult)` runs
- THEN education section exists with "N/A" text, and output is still valid Markdown

### Requirement: Achievement Relevance Ranking

The system MUST compute per-achievement relevance as `(keywordOverlap × 0.5) + (domainBoost × 0.3) + (impactMult × 0.2)`. `keywordOverlap` counts JD hard-keyword terms found in the achievement's technologies/tags/domains. `domainBoost` is the Jaccard overlap between achievement domains and JD-required domains. `impactMult` is 1.0 for `high`, 0.7 for `medium`, 0.4 for `low`.

#### Scenario: High-impact achievement with strong keyword match

- GIVEN achievement with domains `[delivery-management, backend-engineering]`, technologies `[n8n, Jira]`, impact `high`, and JD hard-keywords containing "n8n" and "Jira" with JD domains `[delivery-management, automation]`
- WHEN relevance is computed
- THEN relevance score ≥ 0.70

#### Scenario: Achievement with no JD keyword overlap

- GIVEN achievement with no technologies/tags matching JD hard-keywords, no domain overlap
- WHEN relevance is computed
- THEN relevance score ≤ 0.30

### Requirement: Achievement Selection Per Experience

The system MUST select up to N achievements per `professionalExperience` entry (default N=4), ordered by relevance descending. If an experience has ≤ N achievements, all are included. The selection MUST cover unique domains — no achievement with identical domain set selected more than once unless fewer than N distinct-domain achievements exist.

#### Scenario: Experience with 6 achievements, N=4

- GIVEN experience with 6 achievements and config `maxAchievementsPerRole: 4`
- WHEN assembler runs
- THEN exactly 4 achievements selected, sorted by relevance descending, with distinct domains prioritized

### Requirement: Skill Reordering by JD Relevance

The system MUST reorder skill categories by count of JD keyword matches within their items. Categories with more JD-matched items appear first. Within each category, items matching JD keywords MUST appear first, followed by unmatched items alphabetically.

#### Scenario: JD targets automation, CV has 4 skill categories

- GIVEN JD hard-keywords heavily targeting automation tools and CV has categories: Program Management, Automation & Tools, Technical Background, Databases
- WHEN assembler runs
- THEN Automation & Tools category appears first, with JD-matched items (n8n, Jira) before unmatched items

### Requirement: Reframe Hints Generation

The system MUST emit a `reframeHints` array in the return value (not in Markdown output). Each hint SHALL contain `{ achievementId, suggestion }` where `suggestion` recommends JD-aligned language. Hints MUST be generated for achievements with relevance ≥ 0.4 but whose text lacks JD terminology.

#### Scenario: Domain match with different terminology

- GIVEN achievement uses "cross-functional coordination" and JD uses "stakeholder alignment"
- WHEN relevance ≥ 0.4 but JD terminology missing from achievement text
- THEN reframeHints includes entry with `achievementId` and suggestion referencing JD term

### Requirement: Low-Confidence Handling

The system MUST inspect `matchResult.overall.percentage`. When < 0.35, the Markdown output MUST include a `⚠️ LOW CONFIDENCE` header, the return value MUST set `lowConfidence: true`, and all sections MUST still be generated (best-effort). When ≥ 0.35, `lowConfidence` MUST be `false` with no warning.

#### Scenario: Match score below threshold

- GIVEN `matchResult.overall.percentage = 0.28`
- WHEN `assembleCV(cv, matchResult)` runs
- THEN output includes "LOW CONFIDENCE" warning header, `lowConfidence: true`, but all 6 sections are present

### Requirement: CLI Wrapper

The system SHALL provide `scripts/assemble-cv.js` accepting `<cv.json> <match.json> [--lang en|es]`. MUST exit 0 on success (valid Markdown to stdout), 1 on missing files, 2 on invalid JSON. `--lang` SHALL select `data/cv_en.json` or `data/cv_es.json` for the summary/competency text language.

#### Scenario: Valid inputs with --lang es

- GIVEN valid cv.json and match.json with `--lang es`
- WHEN CLI runs
- THEN exit 0, Spanish summary/competency text in stdout, Spanish-language sections
