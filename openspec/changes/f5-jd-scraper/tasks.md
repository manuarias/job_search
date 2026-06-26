# Tasks: JD Scraper (F5)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–350 (3 new files, zero deps) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

## Phase 1: Foundation — Source Detection & HTML Parsing

- [ ] 1.1 Create `lib/jd-scraper.js` with `sourceDetect(url)` — returns `'greenhouse' | 'lever' | 'workday' | 'generic'` based on URL domain regex (spec: Source-Specific Parsers)
- [ ] 1.2 Add `stripChrome(html)` — regex-remove `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>` tags and their content
- [ ] 1.3 Add `parseHTML(html, source)` — apply source-specific content selectors (Greenhouse: `#content`, Lever: `.posting-page`, Workday: `[data-automation-id="jobPostingDescription"]`, Generic: `<article>`/`<main>` fallback). Return `{ title, company, body }`

## Phase 2: Core — Section Extraction & REF Generation

- [ ] 2.1 Add `extractSections(body)` — detect `<h2>`, `<h3>`, `<strong>` boundaries → convert to `##`/`###` Markdown. If no sections found, wrap entire body under `## Description` (spec: Section Extraction)
- [ ] 2.2 Add `generateRef(companyName, trackingPath)` — first 4 alpha chars uppercased; check `applications/jd-tracking.md` for collisions → append numeric suffix. Pad short names with role initial (spec: REF Generation)
- [ ] 2.3 Add input guards: PDF rejection (URL ends `.pdf` or Content-Type `application/pdf`), SPA detection (< 50 words extracted → actionable error), LinkedIn handling (check `LINKEDIN_SESSION` env var, 401/403 → friendly fallback message)

## Phase 3: Orchestration — fetchJD & Output

- [ ] 3.1 Add `fetchJD(url, opts)` — orchestrate: input validation → `sourceDetect` → `fetch()` with LinkedIn cookie if applicable → `stripChrome` → `parseHTML` → `extractSections` → `generateRef` → `writeOutput`. Return `{ ref, meta, md, path }`
- [ ] 3.2 Add `writeOutput(ref, md, meta)` — create `applications/{REF}/` dir if missing, write `job-description.md` with `# {title}` header + metadata + sections. Append row to `applications/jd-tracking.md`
- [ ] 3.3 Add raw text passthrough — if input starts with `text:` or `--text`, skip fetch/parse, pass directly to `extractSections`

## Phase 4: CLI Wrapper

- [ ] 4.1 Create `scripts/fetch-jd.js` — `#!/usr/bin/env node`, parse args: `<url>`, `--text "raw text"`, optional `--ref XXXX`. Call `fetchJD()`, print path on success (exit 0), print error on failure (exit 1)

## Phase 5: Testing

- [ ] 5.1 Create `lib/jd-scraper.test.js` — Vitest unit tests: `sourceDetect` for each domain + unknown, `extractSections` with/without headings, `generateRef` new/collision/short-name
- [ ] 5.2 Add `parseHTML` tests with inline HTML fixtures per source (Greenhouse, Lever, Workday, generic fallback) — no network calls
- [ ] 5.3 Add guard tests: PDF URL → error, SPA empty HTML → error, LinkedIn without cookie → actionable error, LinkedIn with expired cookie (mock 403) → error
- [ ] 5.4 Add integration test: mock `global.fetch`, run full `fetchJD()` pipeline, assert file written and tracking row appended

## Phase 6: Verification

- [ ] 6.1 Manual E2E: run `node scripts/fetch-jd.js <greenhouse-url>` and compare output against existing `job-description.md` in `applications/`
- [ ] 6.2 Verify error paths: LinkedIn URL without `LINKEDIN_SESSION`, PDF URL, unreachable host

## Implementation Order

Phase 1 → 2 → 3 → 4 → 5 → 6. Each phase builds on the previous. Tests (Phase 5) can be written alongside implementation if preferred (TDD-style: write failing test → implement → verify).
