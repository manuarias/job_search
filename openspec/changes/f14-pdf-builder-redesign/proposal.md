# Proposal: PDF Builder Redesign — Structured Data Direct to PDF

## Intent

Eliminate Markdown re-parsing in PDF generation. Today `pdf-builder/build-cv.js` (573 loc) uses 5 custom heuristic Markdown parsers to reconstruct structure that already exists in `cv_en.json` + `match.json` + `score.json`. The assembler serializes JSON → Markdown, then the PDF builder parses Markdown → HTML. This double conversion is fragile, loses metadata, and makes section layout dependent on Markdown parsing heuristics. Replace with direct JSON → HTML generation.

## Scope

### In Scope
- New `lib/pdf-builder.js` (~250 loc): pure render functions consuming structured data directly
- New `scripts/build-pdf.js` (~60 loc): CLI wrapper
- New `lib/pdf-builder.test.js` (~250 loc): per-renderer unit tests
- Modify `lib/hermes.js` stepPdf (~25 loc): call new builder with structured data instead of Markdown path
- Modify `pdf-builder/cv-template.html` (~20 loc): replace `{{placeholder}}` comments with data-attribute bindings
- Remove `markdown-it` from `package.json`
- Remove `pdf-builder/build-cv.js` invocation path; keep file as deprecated reference

### Out of Scope
- Match overlay, score badges, or pipeline metadata in PDF — clean CV only
- Backward compatibility with existing generated Markdown CVs
- Changing `cv-template.html` CSS/typography/layout (preserve visual quality)
- Inline PDF rendering in browser — Playwright headless rendering retained

## Capabilities

> Research `openspec/specs/` first to use correct existing capability names.

### New Capabilities
- `pdf-generation`: Generate professional A4 PDF CVs from structured JSON data via HTML + Playwright

### Modified Capabilities
- None — no existing spec-level behavior changes

## Approach

Architecture: renderers consume structured data, produce HTML strings, injected into template.

```
cv_en.json ──────┐
match.json ──────┤──→ lib/pdf-builder.js ──→ HTML ──→ Playwright ──→ PDF
score.json ──────┘
```

Six pure render functions: `renderHeader()`, `renderSummary()`, `renderCompetencies()`, `renderSkills()`, `renderExperience()`, `renderEducation()`. Each receives typed data, returns an HTML string. No Markdown parsing. The orchestrator loads template, replaces section placeholders with renderer output, writes temp HTML, renders to PDF via Playwright.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/pdf-builder.js` | New | Render functions consuming `cv_en.json` + match/score |
| `scripts/build-pdf.js` | New | CLI: `node scripts/build-pdf.js <ref> [--lang en|es]` |
| `lib/pdf-builder.test.js` | New | Unit tests per renderer |
| `lib/hermes.js` stepPdf | Modified | Load CV data + match, pass to `pdfBuilder()` instead of `buildCV(mdPath)` |
| `pdf-builder/cv-template.html` | Modified | Replace `{{placeholder}}` comments with `data-section` attributes |
| `package.json` | Modified | Remove `markdown-it`, add `npm run pdf` script |
| `pdf-builder/build-cv.js` | Deprecated | Keep file; remove from hermes call path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Visual regression vs current PDF output | Medium | Preserve template CSS; compare before/after PDF screenshots |
| Structured data shape mismatches section renderers | Low | CV data validated against `schemas/cv.schema.json`; match/score schemas stable |
| Score data unavailable at PDF time (pipeline skip) | Low | Renderer falls back to clean CV only if match/score missing |

## Rollback Plan

Revert `lib/hermes.js` stepPdf to call `pdf-builder/build-cv.js`; restore `markdown-it` in `package.json`. No data migration — new module is additive.

## Dependencies

- `data/cv_en.json` + `data/cv_es.json` (already exist, schema-validated)
- `playwright` (already installed)
- Match and score files present under `applications/{ref}/` at pipeline completion

## Success Criteria

- [ ] `npm run pdf <ref>` produces visually identical output to current `node pdf-builder/build-cv.js <md> <pdf>`
- [ ] All 6 render functions independently testable with pure data in / pure HTML out
- [ ] `markdown-it` removed from `package.json` with no residual imports
- [ ] hermes pipeline `runPipeline()` produces PDF via `stepPdf` without Markdown intermediate step
- [ ] PDF renders correctly for both `en` and `es` CV variants
