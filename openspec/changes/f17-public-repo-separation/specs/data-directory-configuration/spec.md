# Data Directory Configuration Specification

## Purpose

Allow the pipeline to load structured data (CV JSON, tracking, keyword taxonomies) from a user-configurable directory instead of the hardcoded `data/` folder. This enables keeping personal data outside the public repo while running the pipeline from a clone.

## Requirements

### Requirement: JS_DATA_DIR Environment Variable Resolution

The system MUST read the `JS_DATA_DIR` environment variable at startup. When set, the system SHALL resolve all data file paths (CV JSON, tracking JSON, keyword taxonomy, soft-skill synonyms, domain mapping, match weights, score config) relative to that directory instead of the default `data/` folder.

#### Scenario: Environment variable set to valid absolute path

- GIVEN `JS_DATA_DIR` is set to `/home/user/private-data`
- AND `/home/user/private-data/cv_en.json` exists
- WHEN the pipeline initializes data paths
- THEN `DATA_DIR` resolves to `/home/user/private-data`
- AND all data file reads use that directory as base

#### Scenario: Environment variable set to relative path

- GIVEN `JS_DATA_DIR` is set to `../private-data`
- AND the project root is `/home/user/job_search`
- WHEN the pipeline initializes data paths
- THEN `DATA_DIR` resolves to `/home/user/private-data`

#### Scenario: Environment variable not set

- GIVEN `JS_DATA_DIR` is not defined in the environment
- WHEN the pipeline initializes data paths
- THEN `DATA_DIR` falls back to `{PROJECT_ROOT}/data`
- AND pipeline operates normally with default paths

### Requirement: build-pdf.js Respects JS_DATA_DIR

The `scripts/build-pdf.js` script MUST use the same `JS_DATA_DIR` resolution logic as `lib/hermes.js`. It SHALL read CV JSON and configuration from the resolved data directory.

#### Scenario: build-pdf with JS_DATA_DIR set

- GIVEN `JS_DATA_DIR=/home/user/private-data`
- AND `/home/user/private-data/cv_en.json` exists
- WHEN `scripts/build-pdf.js` executes
- THEN it reads CV data from `/home/user/private-data/cv_en.json`

#### Scenario: build-pdf without JS_DATA_DIR

- GIVEN `JS_DATA_DIR` is not set
- WHEN `scripts/build-pdf.js` executes
- THEN it reads CV data from `{PROJECT_ROOT}/data/cv_en.json`

### Requirement: Invalid Path Error Handling

The system MUST detect when `JS_DATA_DIR` points to a non-existent directory and exit with a clear error message. It SHALL NOT silently fall back to `data/` when the env var is explicitly set but invalid.

#### Scenario: JS_DATA_DIR points to non-existent directory

- GIVEN `JS_DATA_DIR` is set to `/nonexistent/path`
- WHEN the pipeline attempts to resolve data paths
- THEN the system exits with a non-zero status code
- AND the error message includes the invalid path value
- AND the error message suggests checking the environment variable

#### Scenario: JS_DATA_DIR set to empty string

- GIVEN `JS_DATA_DIR` is set to an empty string `""`
- WHEN the pipeline initializes data paths
- THEN the system treats it as unset and falls back to `{PROJECT_ROOT}/data`
