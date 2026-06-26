# Pipeline Report Specification

## Purpose

Generate a concise summary report after Hermes pipeline completion from `score.json` and `match.json`. Outputs to stderr and writes `REPORT.md` in the application directory.

## Requirements

### Requirement: Report Generation from Pipeline Artifacts

The system MUST export `generateReport(state)` from `lib/reporter.js`. Given artifacts exist in `state.dir`, the function MUST return a formatted string with: overall score, category breakdown (ATS/Keywords/Recruiter), recommendation level, gap-to-target, and top quick win.

#### Scenario: All artifacts present

- GIVEN `score.json` with `overall.percentage: 0.82` and `match.json` with `quickWins[0]`
- WHEN `generateReport(state)` is called
- THEN returned string contains "82", three category labels, recommendation, gap value, and quick win text

#### Scenario: Empty quickWins array

- GIVEN valid `score.json` and `match.json` with `quickWins: []`
- WHEN `generateReport(state)` is called
- THEN quick win line shows "N/A"; all other fields populated

---

### Requirement: Terminal Output via stderr

The system MUST print the report via `console.error()`. MUST NOT use stdout.

#### Scenario: Normal pipeline run

- GIVEN completed pipeline with valid report string
- WHEN hermes.js prints the report
- THEN output appears on stderr (fd 2), not stdout (fd 1)

#### Scenario: stderr redirected

- GIVEN `node scripts/hermes.js <input> 2> report.txt`
- WHEN pipeline completes
- THEN `report.txt` contains the card; stdout remains clean

---

### Requirement: File Output (REPORT.md)

The system MUST write report content to `{state.dir}/REPORT.md` via `fs.writeFileSync`.

#### Scenario: state.dir exists

- GIVEN `state.dir = 'applications/AGIL'` with artifacts present
- WHEN `generateReport(state)` is called
- THEN `applications/AGIL/REPORT.md` exists with same content as stderr output

#### Scenario: state.dir missing

- GIVEN `state.dir` pointing to non-existent path
- WHEN `generateReport(state)` is called
- THEN function creates directory or emits warning without crashing

---

### Requirement: Language-Aware Labels

Labels (e.g., "Score", "Keywords", "Recommended action") MUST render in the language indicated by `state.lang`. Supported: `'en'` (default), `'es'`.

#### Scenario: state.lang is 'es'

- GIVEN `state.lang = 'es'` and valid artifacts
- WHEN `generateReport(state)` is called
- THEN labels render in Spanish ("Puntaje", "Palabras clave", "Acción recomendada")

#### Scenario: state.lang undefined or 'en'

- GIVEN `state.lang` undefined or `'en'`
- WHEN `generateReport(state)` is called
- THEN labels render in English

---

### Requirement: Graceful Missing Data

MUST NOT crash when `score.json` or `match.json` is absent. Missing fields MUST render as `"N/A"`. File reads MUST use try/catch.

#### Scenario: score.json absent

- GIVEN no `score.json` in `state.dir`
- WHEN `generateReport(state)` is called
- THEN report returns with "Score: N/A"; no exception thrown

#### Scenario: match.json absent

- GIVEN `score.json` exists, `match.json` absent
- WHEN `generateReport(state)` is called
- THEN score data populated; quick win and gap show "N/A"

---

### Requirement: Format Length Constraint

Report output MUST NOT exceed 15 lines. Target: ~10 lines (header, score breakdown, recommendation, gap, quick win).

#### Scenario: All data available

- GIVEN valid artifacts with all fields populated
- WHEN `generateReport(state)` is called
- THEN output contains ≤ 15 lines

#### Scenario: All N/A

- GIVEN both artifacts missing
- WHEN `generateReport(state)` is called
- THEN output ≤ 15 lines with N/A placeholders

---

### Requirement: Pipeline Integration Point

`generateReport(state)` MUST be called in `hermes.js` AFTER the score step and BEFORE PDF generation.

#### Scenario: Full pipeline

- GIVEN all 6 steps complete successfully
- WHEN pipeline reaches report step
- THEN `generateReport(state)` invoked after score, before PDF

#### Scenario: Score step skipped

- GIVEN score step skipped (no score.json)
- WHEN pipeline reaches report step
- THEN `generateReport(state)` still called; renders N/A scores; pipeline continues
