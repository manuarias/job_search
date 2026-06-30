# Batch Processing Specification

## Purpose

Defines the orchestration logic that reads pending JDs from the state file, extracts content, runs the CV pipeline, applies score thresholds, generates deliverables, and reports results to Telegram — with per-JD error isolation.

## Requirements

### Requirement: Batch Trigger and Pending Filter

The batch process SHALL read `pending_jds.json` and filter entries where `status === "pending"`. If no pending entries exist, the process MUST output "no hay ofertas pendientes" and exit cleanly.

#### Scenario: Multiple pending JDs found

- GIVEN `pending_jds.json` with 3 `pending`, 2 `processed`, 1 `skipped`
- WHEN batch processing starts
- THEN only the 3 `pending` entries enter the processing loop

#### Scenario: Empty pending state

- GIVEN `pending_jds.json` with all entries `status: "processed"` or `"skipped"`
- WHEN batch processing starts
- THEN the output is "no hay ofertas pendientes" and no pipeline calls are made

### Requirement: Per-JD Processing Pipeline

For each pending JD, the system SHALL: (1) extract page content via `web_extract`, (2) call `runPipeline(text, {lang: 'es'})` with the extracted text, (3) evaluate the score threshold. Each JD is processed independently — a failure on one MUST NOT block others.

#### Scenario: Successful end-to-end processing

- GIVEN a pending JD with accessible URL
- WHEN `web_extract` returns valid text
- THEN `runPipeline` is called with the text and `{lang: 'es'}`
- AND the result includes `score`, `matchLevel`, `reportCard`, and `files`

#### Scenario: web_extract failure isolated

- GIVEN 3 pending JDs where JD #2 URL returns a paywall error
- WHEN batch processing runs
- THEN JD #1 and #3 are processed normally
- AND JD #2 is marked `status: "error"` with the error logged
- AND the batch continues to completion

### Requirement: Score Threshold Decision

After `runPipeline` returns, the system SHALL evaluate: if `score >= 75` AND `matchLevel !== 'skip'`, the JD qualifies for full deliverable generation. Otherwise, the JD is marked `status: "skipped"`.

#### Scenario: High-score JD qualifies

- GIVEN `runPipeline` returns `{ score: 82, matchLevel: 'apply' }`
- WHEN the threshold check runs
- THEN the JD qualifies for CV + cover letter + PDF generation and Telegram delivery

#### Scenario: Low-score JD skipped

- GIVEN `runPipeline` returns `{ score: 60, matchLevel: 'skip' }`
- WHEN the threshold check runs
- THEN the JD is marked `status: "skipped"` and no deliverables are generated

#### Scenario: Borderline score with skip matchLevel

- GIVEN `runPipeline` returns `{ score: 78, matchLevel: 'skip' }`
- WHEN the threshold check runs
- THEN the JD is marked `status: "skipped"` (matchLevel override)

### Requirement: Deliverable Generation

For qualifying JDs, the system SHALL generate: optimized CV markdown, cover letter markdown, and PDF via `build-pdf.js`. All files are saved to the JD's application directory (`applications/{REF}/`).

#### Scenario: Full package generated for qualifying JD

- GIVEN a JD that passed the score threshold
- WHEN deliverable generation runs
- THEN `applications/{REF}/` contains: CV `.md`, cover letter `.md`, and PDF file

### Requirement: Telegram Delivery

After processing all pending JDs, the system SHALL deliver to Telegram: (1) a summary message with total processed/skipped/error counts, (2) per qualifying JD: the `reportCard` text and file attachments (CV, cover letter, PDF).

#### Scenario: Summary with mixed results

- GIVEN 5 pending JDs: 3 qualified, 1 skipped, 1 error
- WHEN batch processing completes
- THEN Telegram receives a summary: "3 aprobadas, 1 descartada, 1 error"
- AND 3 sets of files are attached with their reportCards

#### Scenario: All JDs skipped

- GIVEN 3 pending JDs all scoring below threshold
- WHEN batch processing completes
- THEN Telegram receives: "3 ofertas procesadas, ninguna superó el umbral"

### Requirement: Error Handling and Isolation

The batch process MUST isolate errors per JD. An unhandled exception on one JD MUST NOT crash the entire batch. All errors SHALL be logged with the JD URL and error message. The JD is marked `status: "error"` with `processedAt` set.

#### Scenario: runPipeline throws unexpected error

- GIVEN a pending JD where `runPipeline` throws an unhandled exception
- WHEN the error occurs
- THEN the error is caught and logged
- AND the JD is marked `status: "error"`
- AND processing continues with the next pending JD

#### Scenario: State file updated after each JD

- GIVEN 5 pending JDs being processed
- WHEN JD #3 completes (success or error)
- THEN `pending_jds.json` is updated with JD #3's new status before JD #4 starts
