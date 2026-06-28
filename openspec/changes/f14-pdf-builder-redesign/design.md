# Design: PDF Builder Redesign — Direct JSON → PDF

## Technical Approach

Eliminate the Markdown roundtrip. Instead of `assembler.js` serializing CV JSON → Markdown then `build-cv.js` parsing Markdown → HTML via `markdown-it` + 5 heuristic parsers, the new `lib/pdf-builder.js` consumes `cv.json` + `match.json` directly. Six pure render functions produce HTML fragments injected into `cv-template.html`. Playwright renders the assembled HTML to A4 PDF. The assembler's `selectAchievements()` and `reorderSkills()` are reused from `lib/assembler.js` — no duplication.

```
cv_{lang}.json ──────┐
match.json ──────────┤──→ pdf-builder.js ──→ HTML ──→ Playwright ──→ PDF
score.json (optional)┘
```

## Architecture Decisions

| Decision | Option A (Chosen) | Option B | Rationale |
|----------|-------------------|----------|-----------|
| Reuse ranking logic | Import `selectAchievements`, `reorderSkills` from `assembler.js` | Duplicate in pdf-builder | DRY. Assembler already tested. Avoids diverging sort behavior. |
| Template loading | `fs.readFileSync` at module load time in orchestrator | Async `fs.readFile` | Sync is fine: template is ~400 lines, loaded once, serverless not a concern. |
| PDF margins | `@page { margin: 1.2cm }` via CSS (preferCSSPageSize: true) | Playwright `margin: { top: '0mm', ... }` | CSS `@page` already in template. Switching to CSS-driven margins matches the visual intent and simplifies Playwright options. |
| Placeholder format | Keep `{{placeholder}}` string replacement | Switch to `<template>` / slots | Minimal change to template. `{{placeholder}}` is already used by 9 tokens. No DOM parser needed. |

## Data Flow

```
pdfBuilder(cvData, matchResult, outputPath)
  │
  ├── renderHeader(cvData.contact)
  ├── renderSummary(cvData.professionalSummary)
  ├── renderCompetencies(cvData.coreCompetencies)
  ├── renderSkills(cvData.skills, matchResult?.scorers?.hardKeywords)
  ├── renderExperience(cvData.professionalExperience, cvData.earlierExperience, matchResult, { maxAchievementsPerRole: 4 })
  ├── renderEducation(cvData.education, cvData.certifications, cvData.languages)
  │
  ├── Load template → String.replace all {{placeholders}}
  ├── Write temp HTML (for debug: outputPath.replace('.pdf', '.html'))
  ├── chromium.launch() → page.setContent(html) → page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true })
  └── browser.close()
```

## Renderer Contracts

All six are pure functions: typed data in → HTML string out. All escape user content via `escapeHtml()` (copied from `build-cv.js`).

| Renderer | Signature | Output |
|----------|-----------|--------|
| `renderHeader(contact)` | `{ name, titles[], email, linkedin }` | `<header>` with `<h1>`, `.cv-titles`, `.cv-contact` |
| `renderSummary(items)` | `[{ text, tags }]` up to 3 | `<ul>` of `<li>` items |
| `renderCompetencies(items)` | `[{ title, description }]` up to 4 | `<li>` with `<strong>` title + description |
| `renderSkills(skills, hkDetails?)` | `[{ category, items[] }]` + optional keyword details | Categories reordered by JD match; matched items first. Falls back to original order if no keywords. |
| `renderExperience(exp, earlier?, matchResult?, opts?)` | Experience array + optional earlier + match + `{ maxAchievementsPerRole }` | `.job-header` per role, `<ul>` of ranked achievements. Earlier experience rendered as compact section. |
| `renderEducation(edu, certs?, langs?)` | Arrays of `{ degree, institution }`, `{ name }`, `{ language, proficiency }` | `<ul>` items, extra sections for certs and languages if non-empty |

### Edge cases handled:
- Empty arrays → return empty string (no `<section>` wrapper)
- Missing match data → default achievement ordering by `impact` desc
- HTML entities in text → `escapeHtml()` sanitizes
- `[NEEDS METRIC]` text → rendered as-is (not a PDF builder concern — handled upstream)

## Template Strategy

`cv-template.html` is loaded as a string. Nine placeholders replaced:

| Placeholder | Replaced by |
|-------------|-------------|
| `{{candidate_name}}` | `contact.name` (escaped) |
| `{{candidate_titles}}` | `contact.titles.join(' | ')` |
| `{{candidate_contact}}` | email + linkedin (escaped, linkedin as `<a>`) |
| `{{professional_summary}}` | `renderSummary()` |
| `{{core_competencies}}` | `renderCompetencies()` |
| `{{core_skills}}` | `renderSkills()` |
| `{{professional_experience}}` | `renderExperience()` |
| `{{education}}` | `renderEducation()` |
| `{{extra_sections}}` | earlierExperience + languages + certifications renderers (if non-empty) |

CSS is NOT modified. `@page { margin: 1.2cm; size: A4 }` in the existing template drives PDF dimensions via `preferCSSPageSize: true`.

## CLI Design (`scripts/build-pdf.js`)

```
node scripts/build-pdf.js <ref> [--lang en|es]
```

Resolves paths relative to project root:
- Input: `data/cv_{lang}.json`, `applications/{ref}/match.json`, `applications/{ref}/score.json`
- Output: `applications/{ref}/arias_emanuel-{lang}-{ref}.pdf`

Exits 1 on missing ref folder or invalid lang flag. Uses `pdfBuilder()` from `lib/pdf-builder.js`.

## Hermes Integration

`stepPdf(state)` in `lib/hermes.js` changes from:

```js
const { buildCV } = require('../pdf-builder/build-cv');
await buildCV(cvPath, outPath);
```

To:

```js
const { pdfBuilder } = require('./pdf-builder');
const cvData = loadCVData(state.lang);
const matchResult = JSON.parse(fs.readFileSync(path.join(state.dir, 'match.json'), 'utf8'));
await pdfBuilder(cvData, matchResult, outPath);
```

`markdown-it` removed from `package.json`. `scripts.build-cv` replaced with `scripts.pdf` pointing to new CLI. Old `pdf-builder/build-cv.js` stays on disk but is never `require()`d by active code.

## Error Handling

Errors are caught at the orchestrator level (`pdfBuilder`), not per-renderer:
1. Missing CV data file → throw with path in message
2. Invalid CV schema → validation at entry (optional, uses `ajv` if installed)
3. Playwright launch failure → try/catch around `chromium.launch()`, throw with "Playwright" in message
4. Renderers never throw — empty input produces empty HTML string

## Testing Strategy

| Layer | Tests | Approach |
|-------|-------|----------|
| `renderHeader` | Valid contact, missing name, missing titles, XSS in name | Vitest + inline fixtures |
| `renderSummary` | 0/1/3 items, HTML in text | Vitest + snapshot |
| `renderCompetencies` | 0/4 items, special chars in description | Vitest |
| `renderSkills` | With/without match result, empty skills | Vitest + mock match |
| `renderExperience` | 1/5 roles, achievement limit (4/6), missing match | Vitest |
| `renderEducation` | With/without certs, with/without languages | Vitest |
| Integration | Full pipeline with fixture CV + match → PDF exists with size > 0 | Vitest + Playwright |

Reuse test fixture factory from `assembler.test.js` for match data. Testing file: `lib/pdf-builder.test.js`.

## Deprecation Plan

`pdf-builder/build-cv.js` remains on disk with a deprecation banner comment. No code imports it. Removed from `package.json` scripts (replace `"build-cv"` with `"pdf": "node scripts/build-pdf.js"`). `markdown-it` removed from `dependencies`. If rollback needed: restore `stepPdf` to call `buildCV(mdPath)` and reinstall `markdown-it`.
