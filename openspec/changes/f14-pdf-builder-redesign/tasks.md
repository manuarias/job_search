# Tasks: PDF Builder Redesign — Structured Data Direct to PDF

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~610 (new: 560, modified: 50) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (renderers + tests) → PR 2 (orchestrator + CLI + wiring) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: resolved (feature-branch-chain)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | 6 pure render functions + unit tests | PR 1 | `lib/pdf-builder.js` (renderers only) + `lib/pdf-builder.test.js`; no Playwright dependency; base = feature branch or main |
| 2 | Orchestrator, CLI, Hermes wiring, cleanup | PR 2 | `pdfBuilder()`, `scripts/build-pdf.js`, `lib/hermes.js` stepPdf, `package.json`; depends on PR 1 |

## Phase 1: Core Renderers (PR 1)

- [x] 1.1 Create `lib/pdf-builder.js` with `escapeHtml()` helper (copy from `build-cv.js` L40-50 area) and `renderHeader(contact)` — outputs `<header>` with `<h1>`, `.cv-titles`, `.cv-contact`. Verify: `renderHeader({name:'A',titles:['TPM'],email:'a@b.com',linkedin:'in/a'})` returns valid HTML with escaped entities.
- [x] 1.2 Add `renderSummary(items)` — renders `<ul>` of up to 3 `<li>` from `[{text, tags}]`. Empty array → empty string. Verify: 0/1/3 items, XSS in text escaped.
- [x] 1.3 Add `renderCompetencies(items)` — renders `<ul>` of up to 4 `<li>` with `<strong>` title + description. Empty → empty string. Verify: 0/4 items, special chars escaped.
- [x] 1.4 Add `renderSkills(skills, hkDetails?)` — import `reorderSkills` from `lib/assembler.js`. Render `<ul>` per category with JD-matched items first. No match → original order. Verify: with/without match data, empty skills.
- [x] 1.5 Add `renderExperience(exp, earlier?, matchResult?, opts?)` — import `selectAchievements` from `lib/assembler.js`. Render `.job-header` per role + ranked `<ul>` achievements. Limit by `maxAchievementsPerRole` (default 4). Earlier experience as compact section. Verify: 1/5 roles, 6 achievements with limit=4, missing match → impact desc order.
- [x] 1.6 Add `renderEducation(edu, certs?, langs?)` — render `<ul>` with degree+institution. Extra sections for certs/languages if non-empty. Verify: with/without optional arrays.
- [x] 1.7 Create `lib/pdf-builder.test.js` — Vitest unit tests for all 6 renderers. Cover: valid input, empty arrays, HTML entity escaping (Scenario 2.3), achievement limit (Scenario 2.2), skills with/without match. Use inline fixtures. Run: `npx vitest run lib/pdf-builder.test.js`.

## Phase 2: Orchestrator + CLI (PR 2)

- [x] 2.1 Add `pdfBuilder(cvData, matchResult, outputPath)` orchestrator to `lib/pdf-builder.js` — load template via `fs.readFileSync`, replace 9 `{{placeholder}}` tokens with renderer output, write temp HTML (`.html` alongside `.pdf`), launch Playwright headless chromium, `page.setContent(html)`, `page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true })`, close browser. Error handling: throw on missing CV data, try/catch around Playwright with "Playwright" in message. Verify: integration test — fixture CV → PDF file exists with size > 0 (Scenario 4.1).
- [x] 2.2 Add `renderExtraSections(earlierExp, certs, langs)` helper — combines earlier experience + certifications + languages into `{{extra_sections}}` replacement. Empty arrays → empty string (Scenario 3.2).
- [x] 2.3 Create `scripts/build-pdf.js` (~60 loc) — CLI: parse `<ref>` and `--lang en|es`, resolve paths (`data/cv_{lang}.json`, `applications/{ref}/match.json`, `applications/{ref}/score.json`), call `pdfBuilder()`. Exit 1 on missing ref (Scenario 5.2) or invalid lang (Scenario 7.2). Verify: `node scripts/build-pdf.js AGIL --lang en` produces PDF.
- [x] 2.4 Modify `lib/hermes.js` `stepPdf()` (L280-293) — replace `require('../pdf-builder/build-cv')` + `buildCV(cvPath, outPath)` with `require('./pdf-builder').pdfBuilder(cvData, matchResult, outPath)`. Load `cvData` from `data/cv_{lang}.json` and `matchResult` from `applications/{ref}/match.json`. Verify: `runPipeline()` produces PDF without reading `.md` file (Scenario 6.1).
- [x] 2.5 Update `package.json` — remove `"build-cv"` script, add `"pdf": "node scripts/build-pdf.js"`. Remove `markdown-it` from `dependencies`. Verify: `grep -r "markdown-it" lib/ scripts/` returns zero matches (Scenario 6.2).
- [x] 2.6 Add deprecation banner to `pdf-builder/build-cv.js` top comment — `/** @deprecated Use scripts/build-pdf.js + lib/pdf-builder.js instead. Kept as reference. */`. Verify: file still exists, no active code imports it.

## Phase 3: Verification

- [x] 3.1 Run full test suite: `npx vitest run`. All existing tests pass + new `pdf-builder.test.js` passes.
- [x] 3.2 End-to-end: run `node scripts/build-pdf.js UNKN --lang en`. PDF generated via new path at `applications/UNKN/arias_emanuel-en-UNKN.pdf` (92KB).
- [x] 3.3 Verify Spanish CV: `node scripts/build-pdf.js UNKN --lang es` produces PDF (94KB) with Spanish narrative, English technical keywords (Scenario 7.1).
