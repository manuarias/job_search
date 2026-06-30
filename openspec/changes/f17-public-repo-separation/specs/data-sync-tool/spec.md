# Data Sync Tool Specification

## Purpose

Provide `scripts/sync-data.js` to detect new fields added to template files and merge them into the user's existing personal data files. This prevents template drift when the public repo adds new schema fields after a user has already set up their data.

## Requirements

### Requirement: Detect New Fields in Template

The sync tool MUST compare a template file against the user's corresponding data file. It SHALL identify fields present in the template but missing from the user's data file.

#### Scenario: Template has new field not in user data

- GIVEN `data/cv_en.json.template` contains field `portfolio_url`
- AND `data/cv_en.json` does NOT contain `portfolio_url`
- WHEN `scripts/sync-data.js` runs
- THEN it reports `portfolio_url` as a new field to add

#### Scenario: All template fields present in user data

- GIVEN `data/cv_en.json.template` and `data/cv_en.json` have identical field structure
- WHEN `scripts/sync-data.js` runs
- THEN it reports "All fields up to date"
- AND exits with status code 0

#### Scenario: Nested object fields detected

- GIVEN template has `contact.linkedin` but user data has `contact` without `linkedin`
- WHEN `scripts/sync-data.js` runs
- THEN it reports `contact.linkedin` as a new field

### Requirement: Merge New Fields with Placeholders

The sync tool MUST add missing fields to the user's data file using placeholder values from the template. It SHALL NOT modify existing field values.

#### Scenario: New field merged with placeholder value

- GIVEN template has `"portfolio_url": "https://your-portfolio.com"`
- AND user data lacks `portfolio_url`
- WHEN `scripts/sync-data.js` runs (non-dry-run)
- THEN `data/cv_en.json` now contains `"portfolio_url": "https://your-portfolio.com"`
- AND all existing field values remain unchanged

#### Scenario: Existing values preserved during merge

- GIVEN user data has `"name": "Emanuel Arias"`
- AND template has `"name": "Your Name"`
- WHEN `scripts/sync-data.js` runs
- THEN user data still has `"name": "Emanuel Arias"`
- AND the template placeholder does NOT overwrite it

### Requirement: Dry Run Mode

The sync tool MUST support a `--dry-run` flag. In dry run mode, it SHALL report what changes would be made without modifying any files.

#### Scenario: Dry run reports changes without writing

- GIVEN template has 3 new fields not in user data
- WHEN `scripts/sync-data.js --dry-run` runs
- THEN it lists all 3 new fields with their placeholder values
- AND the user's data file remains unchanged on disk

#### Scenario: Dry run with no changes

- GIVEN template and user data have identical structure
- WHEN `scripts/sync-data.js --dry-run` runs
- THEN it reports "No changes needed"
- AND exits with status code 0

### Requirement: Error Handling for Missing Files

The sync tool MUST handle missing files gracefully. It SHALL produce clear error messages and non-zero exit codes for error conditions.

#### Scenario: User data file does not exist

- GIVEN `data/cv_en.json` does NOT exist
- WHEN `scripts/sync-data.js` runs
- THEN it exits with a non-zero status code
- AND the error message instructs the user to copy the template first

#### Scenario: Template file does not exist

- GIVEN `data/cv_en.json.template` does NOT exist
- WHEN `scripts/sync-data.js` runs
- THEN it exits with a non-zero status code
- AND the error message indicates the template file is missing

#### Scenario: Reports summary of changes made

- GIVEN 2 new fields were merged into user data
- WHEN `scripts/sync-data.js` completes (non-dry-run)
- THEN it prints a summary: number of fields added, list of field paths
- AND exits with status code 0
