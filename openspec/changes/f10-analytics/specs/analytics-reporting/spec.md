# Analytics Reporting Specification

## Purpose

Define analytics behavior for the job-search application pipeline: structured tracking migration, aggregate scoring, keyword-outcome correlation, threshold analysis, and markdown report generation.

## Requirements

### Requirement: Structured Tracking Migration

The system MUST produce `data/jd-tracking.json` from `applications/jd-tracking.md`.

| Field | Type | Description |
|-------|------|-------------|
| ref | string | Application reference code |
| company | string | Company name |
| role | string | Target role |
| score | number | Final score (0-100) |
| status | string | Application status |
| created | string | ISO date (YYYY-MM-DD) |
| updated | string | ISO date (YYYY-MM-DD) |

#### Scenario: Happy path — 5 applications parsed

- GIVEN `applications/jd-tracking.md` with 5 rows in the tracking table
- WHEN the migration runs
- THEN `data/jd-tracking.json` contains 5 entries with all fields populated
- AND scores match the values in jd-tracking.md (88, 79, 88, 79.5, 88)

#### Scenario: Empty tracking table

- GIVEN jd-tracking.md exists but has zero application rows
- WHEN the migration runs
- THEN `data/jd-tracking.json` contains an empty array

### Requirement: Score Distribution Analysis

The analytics module MUST compute aggregate score statistics across all applications.

#### Scenario: Standard dataset

- GIVEN 5 applications with scores [88, 79, 88, 79.5, 88]
- WHEN `analyzeScores(trackingData)` is called
- THEN it returns `{ min: 79, max: 88, mean: 84.5, median: 88, count: 5 }`

#### Scenario: Single application

- GIVEN 1 application with score 75
- WHEN `analyzeScores(trackingData)` is called
- THEN mean equals score and median equals score

### Requirement: Keyword-Outcome Correlation

The analytics module SHALL correlate keywords from application folders with response outcomes.

#### Scenario: Keywords present in responded applications

- GIVEN 2 applications with status "Submitted" and shared keywords extracted from their `01-ats-diagnostic.md`
- WHEN `correlateKeywords(trackingData)` is called
- THEN keywords found in responded applications rank higher than keywords only in closed applications
- AND output includes frequency count per keyword per outcome group

#### Scenario: No response data available

- GIVEN all applications have status "Closed" (no interviews/submitted)
- WHEN `correlateKeywords(trackingData)` is called
- THEN it returns empty correlation arrays with a note "insufficient response data"

### Requirement: Score-Threshold Analysis

The analytics module SHALL compute callback probability per score threshold.

#### Scenario: Threshold ≥85

- GIVEN scores 88, 88, 88 (above 85) have status Submitted/Interview/Offer and scores 79, 79.5 (below 85) have status Closed
- WHEN `analyzeThresholds(trackingData)` is called
- THEN ≥85 threshold shows higher callback rate than <85

#### Scenario: Insufficient data for thresholds

- GIVEN fewer than 2 applications with non-Closed status
- WHEN `analyzeThresholds(trackingData)` is called
- THEN it returns thresholds with a warning "low sample size"

### Requirement: Markdown Report Generation

The script MUST output `applications/ANALYTICS.md` with structured sections.

#### Scenario: Report generated successfully

- GIVEN tracking data with 5 applications
- WHEN `node scripts/analytics.js` runs
- THEN `applications/ANALYTICS.md` exists with sections: Score Distribution, Keyword Correlation, Threshold Analysis, Response Time
- AND sections contain concrete numbers (not placeholders)

#### Scenario: Report with insufficient data

- GIVEN tracking data with 1 application and no response data
- WHEN `node scripts/analytics.js` runs
- THEN report includes all sections with appropriate "insufficient data" notes
- AND script exits with code 0 (not an error)
