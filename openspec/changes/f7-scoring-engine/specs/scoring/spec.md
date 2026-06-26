# Scoring Specification

## Purpose

Defines the 3-category scoring rubric and quick-wins generation that consumes F6 match output and CV data to produce a Step 5-compatible final score.

## Requirements

### Requirement: Three-Category Weighted Scoring

The system MUST compute a final score as the weighted sum of three categories: ATS-Parseability (40%), Keyword Alignment (30%), Recruiter Appeal (30%). The final score SHALL be a number 0–100.

#### Scenario: All categories score well

- GIVEN ATS=85, Keyword=90, Recruiter=80
- WHEN `score()` is called
- THEN final = round(85×0.40 + 90×0.30 + 80×0.30) = 85

#### Scenario: Zero match data

- GIVEN F6 output with `overall.score=0` and empty CV
- WHEN `score()` is called
- THEN final ≥ 0 and ≤ 100, no crash

### Requirement: Keyword Alignment Sub-Component

The Keyword Alignment category (30%) MUST wrap F6's `overall.score` as its primary input. The scorer SHALL normalize F6's 0–100 composite to the category scale and MAY apply a configurable floor/ceiling multiplier defined in `data/score-config.json`.

#### Scenario: F6 score maps directly

- GIVEN F6 `overall.score=72`
- WHEN Keyword Alignment sub-scorer runs
- THEN keywordScore ≈ 72 (within ±5 tolerance for config multipliers)

### Requirement: ATS Parseability Checks

ATS-Parseability (40%) MUST check two sources: the CV JSON structure and the rendered Markdown output. JSON checks SHALL validate date formats (`YYYY-MM` or `YYYY-MM-DD`), required sections (`contact`, `professionalExperience`, `skills`, `education`), and non-empty IDs. Markdown checks SHALL detect known ATS-unfriendly patterns (tables, special Unicode bullets, missing section headers, non-standard date formats).

#### Scenario: Clean CV passes

- GIVEN a well-formed CV JSON with valid dates and required sections
- WHEN ATS checker runs
- THEN ATS score ≥ 80

#### Scenario: Missing required section

- GIVEN CV JSON lacking `skills` section
- WHEN ATS checker runs
- THEN ATS score ≤ 70 AND result includes a `missingSection` detail

### Requirement: Recruiter Appeal Metrics

Recruiter Appeal (30%) MUST score: metrics-per-bullet ratio (≥50% target), action-verb lead ratio (>60%), bullet length compliance (<2 lines), and readability (syllable/word heuristic or optional dep). Each sub-metric SHALL be configurable via `score-config.json`.

#### Scenario: Bullets lack metrics

- GIVEN CV with 8 bullets, only 2 containing numbers or percentages
- WHEN Recruiter scorer runs
- THEN metricsRatio = 2/8 = 0.25 AND a quick-win "add metric to bullet X" is emitted

### Requirement: Mechanical Quick Wins

The scorer MUST generate mechanical, format-focused quick wins distinct from F6's semantic recommendations. Quick wins SHALL include: date format fixes, missing section flags, passive-voice replacements, bullet-length warnings, and missing-metric flags. Each quick win MUST reference a specific bullet index or section name.

#### Scenario: Passive voice detected

- GIVEN a bullet "The system was architected by the team"
- WHEN quick-wins generator runs
- THEN output includes `{type: "passive-voice", location: "bullet N", fix: "Use active voice (e.g., 'Architected the system...')"}`

### Requirement: Gap-to-Target Analysis

The scorer MUST accept a `targetScore` parameter (default 90) and SHALL report which category has the highest unfilled gap. The gap report SHALL include per-category shortfall in points.

#### Scenario: Gap below target

- GIVEN ATS=80, Keyword=75, Recruiter=70, targetScore=90
- WHEN gap analysis runs
- THEN gap=90−round(80×0.40+75×0.30+70×0.30)=90−75=15 AND highest-gap category is Recruiter (target contribution 27, actual 21, shortfall 6)

### Requirement: CLI Integration

The module SHALL export a function `scoreCV(cvData, matchResult, options)` and a CLI script `scripts/score-cv.js` MUST accept `<cv.json> <match.json> [--target N]` and output JSON to stdout.

#### Scenario: CLI with custom target

- GIVEN valid cv.json and match.json files
- WHEN `node scripts/score-cv.js data/cv_en.json match.json --target 85` runs
- THEN exit code 0, stdout contains valid JSON with `final`, `categories`, `quickWins`, `gapToTarget`
