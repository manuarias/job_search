# JD State Management Specification

## Purpose

Defines the `pending_jds.json` state file schema, URL-hash deduplication, status lifecycle, and atomic read/write operations that bridge cron-based JD discovery with batch pipeline processing.

## Requirements

### Requirement: State File Schema

The system SHALL maintain `hermes-ia/pending_jds.json` as a JSON array. Each entry MUST contain: `url` (string, validated URL), `urlHash` (string, SHA-256 of URL), `title` (string), `source` (string), `status` (enum: `pending` | `processed` | `skipped` | `error`), `addedAt` (ISO 8601 timestamp), `processedAt` (ISO 8601 timestamp or null).

#### Scenario: Valid entry structure

- GIVEN an empty `pending_jds.json`
- WHEN a new JD is appended
- THEN the entry contains all required fields with `status: "pending"` and `processedAt: null`

#### Scenario: Schema validation rejects malformed entry

- GIVEN a script attempting to write an entry without `urlHash`
- WHEN the write is attempted
- THEN the operation fails with a validation error and the file is unchanged

### Requirement: URL Deduplication

The system MUST compute `urlHash` as SHA-256 of the normalized URL (trimmed, lowercase protocol+host). Before appending, the system SHALL check if `urlHash` already exists in the file. Duplicate URLs MUST NOT be appended.

#### Scenario: New URL appended successfully

- GIVEN `pending_jds.json` with no entries
- WHEN a JD with URL `https://example.com/job/123` is appended
- THEN the entry is added with `urlHash` = SHA-256 of the normalized URL

#### Scenario: Duplicate URL rejected

- GIVEN `pending_jds.json` already contains an entry with `urlHash` = `abc123`
- WHEN another JD with the same URL is appended
- THEN the entry is NOT added and the script exits with a "duplicate" message

#### Scenario: Same path different host is not duplicate

- GIVEN an entry for `https://companyA.com/job/123`
- WHEN `https://companyB.com/job/123` is appended
- THEN the entry IS added (different host produces different hash)

### Requirement: Status Lifecycle

Each JD entry transitions through statuses: `pending` → `processed` | `skipped` | `error`. The system MUST NOT transition a `processed` or `skipped` entry back to `pending`. The batch processor updates status after handling each JD.

#### Scenario: Successful processing marks processed

- GIVEN a JD with `status: "pending"`
- WHEN batch processing completes successfully (score ≥ 75, matchLevel ≠ skip)
- THEN `status` is set to `"processed"` and `processedAt` is set to current ISO 8601 timestamp

#### Scenario: Low-score JD marked skipped

- GIVEN a JD with `status: "pending"`
- WHEN batch processing yields score < 75 or matchLevel = `skip`
- THEN `status` is set to `"skipped"` and `processedAt` is set

#### Scenario: Failed extraction marked error

- GIVEN a JD with `status: "pending"`
- WHEN `web_extract` fails (paywall, timeout, JS-only page)
- THEN `status` is set to `"error"` and `processedAt` is set

#### Scenario: Processed JD never re-processed

- GIVEN a JD with `status: "processed"`
- WHEN batch processing runs again
- THEN this JD is excluded from the processing loop

### Requirement: Atomic File Writes

The system SHALL write updates using atomic replace: write to a temporary file in the same directory, then rename over the original. This prevents corruption if the process is interrupted mid-write.

#### Scenario: Interrupted write leaves valid file

- GIVEN `pending_jds.json` with 5 entries
- WHEN the process is killed during a status update
- THEN the original file still contains the 5 valid entries (temp file is orphaned but original is intact)

#### Scenario: Concurrent read during write

- GIVEN a batch process writing status updates
- WHEN another process reads the file simultaneously
- THEN the reader gets either the old complete file or the new complete file, never a partial write
