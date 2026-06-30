# Hermes IA Skill Specification

## Purpose

Defines the Hermes IA skill package (SKILL.md, SOUL.md, README.md) that teaches the agent to perform daily JD searches, manage the pending state file, and execute batch pipeline processing on demand.

## Requirements

### Requirement: SKILL.md Blueprint Block

The SKILL.md MUST contain a `metadata.hermes` block with `blueprint` configuration including: `schedule` (cron expression for daily execution), `deliver` (set to `origin` for Telegram delivery), and `prompt` (instructions for the daily search task). The blueprint instructs the agent to use `web_search` to find IT job postings, then call `append-jds.js` via `terminal` to deduplicate and append results.

#### Scenario: Blueprint cron triggers daily search

- GIVEN the SKILL.md is loaded by Hermes IA
- WHEN the cron schedule fires (daily at configured time)
- THEN the agent executes `web_search` with the configured IT job search query
- AND passes results to `${HERMES_SKILL_DIR}/scripts/append-jds.js` via `terminal`

#### Scenario: Blueprint delivers results to Telegram

- GIVEN the daily search finds 3 new unique JDs
- WHEN the blueprint execution completes
- THEN a Telegram message is delivered via `deliver: origin` summarizing the new findings

### Requirement: SKILL.md Batch Trigger Instructions

The SKILL.md MUST include instructions for handling the batch trigger message. When the user sends "procesá las ofertas" (or variants like "procesar ofertas", "batch ofertas"), the agent SHALL execute `${HERMES_SKILL_DIR}/scripts/batch-process.sh` via `terminal`.

#### Scenario: User triggers batch processing

- GIVEN the skill is loaded and `pending_jds.json` has 5 entries with `status: "pending"`
- WHEN the user sends "procesá las ofertas"
- THEN the agent executes `batch-process.sh` via `terminal`
- AND delivers per-JD results to Telegram

#### Scenario: Variant trigger phrases recognized

- GIVEN the skill instructions list trigger variants
- WHEN the user sends "procesar ofertas" or "batch ofertas"
- THEN the agent recognizes the intent and executes `batch-process.sh`

### Requirement: Config — Job Search Repo Path

The skill MUST reference the `job_search` repository path via a configurable setting. The SKILL.md SHALL document that scripts expect `JOB_SEARCH_PATH` environment variable or default to the repo location. All script invocations use `${HERMES_SKILL_DIR}/scripts/` for bundled tool paths.

#### Scenario: Scripts resolve correct repo path

- GIVEN `JOB_SEARCH_PATH=/home/user/job_search`
- WHEN `batch-process.sh` invokes `runPipeline`
- THEN the command runs in the correct directory and resolves `lib/hermes.js`

#### Scenario: Default path used when env var absent

- GIVEN `JOB_SEARCH_PATH` is not set
- WHEN a script needs the repo path
- THEN the script falls back to the documented default path

### Requirement: SOUL.md Additions

SOUL.md MUST be updated to include the JD search persona: the agent searches for IT jobs daily, deduplicates results, and processes them on command. SOUL.md SHALL reference the skill's scripts and the `pending_jds.json` state file location.

#### Scenario: Agent identity includes JD search role

- GIVEN the updated SOUL.md is loaded
- WHEN the agent describes its capabilities
- THEN it mentions daily IT job search, deduplication, and batch CV pipeline processing

### Requirement: README.md Documentation

The README.md SHALL document: purpose of the skill, cron schedule, how to trigger batch processing, state file location, and troubleshooting (what happens when `web_extract` fails, how to reset pending JDs).

#### Scenario: New user understands skill usage

- GIVEN a user reads README.md
- WHEN they want to trigger batch processing
- THEN the README clearly states the trigger phrase and expected output
