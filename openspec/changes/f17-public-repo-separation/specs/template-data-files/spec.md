# Template Data Files Specification

## Purpose

Provide `.template` files that contain the structure and placeholder values for all personal data files. New users copy templates to create their real data files. Templates are committed to the public repo; real data files are gitignored.

## Requirements

### Requirement: Template Files Exist for All Personal Data

The repository MUST contain a `.template` sibling for every personal data file. Template files SHALL use the naming convention `{original-filename}.template` (e.g., `cv_en.json.template`).

| Source File | Template File |
|---|---|
| `data/cv_en.json` | `data/cv_en.json.template` |
| `data/cv_es.json` | `data/cv_es.json.template` |
| `data/jd-tracking.json` | `data/jd-tracking.json.template` |
| `applications/jd-tracking.md` | `applications/jd-tracking.md.template` |
| `resumes/cv_en.md` | `resumes/cv_en.md.template` |
| `resumes/cv_es.md` | `resumes/cv_es.md.template` |

#### Scenario: All templates present after clone

- GIVEN a fresh `git clone` of the public repository
- WHEN the user lists template files
- THEN all 6 template files exist at their expected paths
- AND each template file is non-empty

#### Scenario: Template files are valid formats

- GIVEN `data/cv_en.json.template` exists
- WHEN parsed as JSON
- THEN it produces a valid object without parse errors
- AND all required schema fields are present with placeholder values

### Requirement: Templates Use Placeholder Values

Template files MUST NOT contain real personal data. All personal fields SHALL use descriptive placeholder values that indicate what the user should replace.

#### Scenario: JSON template has no real PII

- GIVEN `data/cv_en.json.template`
- WHEN inspected for personal data fields (name, email, phone, address)
- THEN all values are placeholders (e.g., `"Your Name"`, `"your.email@example.com"`)
- AND no real names, emails, phone numbers, or addresses are present

#### Scenario: Markdown template has no real PII

- GIVEN `resumes/cv_en.md.template`
- WHEN inspected for personal data
- THEN header contains placeholder name and contact info
- AND work history uses example company names or generic placeholders

### Requirement: Gitignore Excludes Real Data, Allows Templates

The `.gitignore` file MUST exclude all personal data files while explicitly allowing `.template` files and `.gitkeep` files to be tracked.

#### Scenario: Real data files are ignored

- GIVEN `.gitignore` contains the exclusion rules
- WHEN `data/cv_en.json` exists on disk
- THEN `git status` does NOT show `data/cv_en.json` as tracked or untracked

#### Scenario: Template files are tracked

- GIVEN `.gitignore` contains the exclusion rules
- AND `data/cv_en.json.template` exists
- WHEN `git status` runs
- THEN `data/cv_en.json.template` IS shown as tracked

#### Scenario: Applications directory ignores content except allowed files

- GIVEN `.gitignore` rules for `applications/`
- AND `applications/.gitkeep` exists
- AND `applications/ABC1/arias_emanuel-en-ABC1.md` exists
- THEN `git status` shows `.gitkeep` as tracked
- AND `git status` does NOT show the optimized CV file

### Requirement: New User Setup Flow

The repository MUST support a new user going from clone to running pipeline in documented steps. The Quick Start in README SHALL describe: clone → copy templates → fill in data → run pipeline.

#### Scenario: New user end-to-end setup

- GIVEN a user clones the public repo
- WHEN they follow Quick Start steps
- THEN they copy each `.template` to its real filename
- AND fill in their personal data
- AND `node scripts/hermes.js <jd-url>` runs successfully
