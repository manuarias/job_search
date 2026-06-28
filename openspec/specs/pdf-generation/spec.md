# PDF Generation Specification

## Purpose

Generate professional A4 PDF CVs from structured JSON data (`cv_en.json` + `match.json` + `score.json`) via direct JSON → HTML → PDF pipeline. No Markdown parsing. Clean CV output only — no match overlay or pipeline metadata.

## Requirements

### Requirement 1: Data Input Contract

The system SHALL accept structured CV data conforming to `schemas/cv.schema.json` as primary input. Match data (`match-output.schema.json`) and score data SHALL be accepted as optional secondary inputs for achievement ranking and skill reordering.

The system MUST handle missing `match.json` or `score.json` gracefully — producing a clean CV with default achievement ordering (by `impact` field descending, then original order).

| Field | Source | Required | Fallback |
|-------|--------|----------|----------|
| `contact`, `professionalSummary`, `coreCompetencies`, `skills`, `professionalExperience`, `education` | `cv_{lang}.json` | Yes | Error if missing |
| `hardKeywords`, `jdDomains` | `match.json` | No | Default ordering |
| `earlierExperience`, `languages`, `certifications` | `cv_{lang}.json` | No | Omit section if empty |

#### Scenario 1.1: Full data available

- GIVEN `cv_en.json`, `match.json`, and `score.json` are present and valid
- WHEN the PDF builder is invoked
- THEN achievements are ranked by JD relevance and skills are reordered by keyword match

#### Scenario 1.2: Match data missing

- GIVEN only `cv_en.json` is present (no `match.json`)
- WHEN the PDF builder is invoked
- THEN achievements render in original order (by `impact` desc) and skills render in CV-defined order

#### Scenario 1.3: Invalid CV schema

- GIVEN a CV JSON file that fails `schemas/cv.schema.json` validation
- WHEN the PDF builder is invoked
- THEN the system SHALL exit with a non-zero code and print a validation error listing failing fields

---

### Requirement 2: HTML Section Renderers

The system SHALL provide six pure render functions. Each accepts typed data and returns an HTML string fragment. No side effects. No DOM manipulation.

| Renderer | Input | Output |
|----------|-------|--------|
| `renderHeader(contact)` | `contact` object | `<header>` with name, titles, contact line |
| `renderSummary(professionalSummary)` | Array of `{text, tags}` | `<ul>` with up to 3 `<li>` items |
| `renderCompetencies(coreCompetencies)` | Array of `{title, description}` | `<ul>` with up to 4 `<li>` items (bold title + description) |
| `renderSkills(skills, hardKeywords?)` | Array of `{category, items}` + optional keywords | `<ul>` per category, JD-matched items first |
| `renderExperience(professionalExperience, earlierExperience, matchResult?, opts?)` | Experience arrays + optional match | Job headers + achievement `<li>` per role |
| `renderEducation(education, certifications?, languages?)` | Education/cert/lang arrays | `<ul>` with degree + institution per item |

Each renderer MUST escape HTML entities in all text content to prevent injection.

#### Scenario 2.1: Renderer produces valid HTML fragment

- GIVEN a valid `contact` object with name, titles, email, linkedin
- WHEN `renderHeader(contact)` is called
- THEN the output contains `<h1>` with name, titles in `.cv-titles`, and contact in `.cv-contact` with a clickable linkedin `<a>` tag

#### Scenario 2.2: Experience renderer limits achievements

- GIVEN a role with 6 achievements and `maxAchievementsPerRole=4`
- WHEN `renderExperience()` is called
- THEN exactly 4 `<li>` elements are rendered for that role, selected by relevance ranking

#### Scenario 2.3: HTML entities are escaped

- GIVEN an achievement text containing `<script>alert('xss')</script>`
- WHEN `renderExperience()` processes it
- THEN the output contains the escaped form `&lt;script&gt;` — no raw HTML injection

---

### Requirement 3: Template Integration

The system SHALL load `pdf-builder/cv-template.html` and replace `{{placeholder}}` tokens with renderer output. The template CSS MUST NOT be modified.

Template placeholders to replace: `{{candidate_name}}`, `{{candidate_titles}}`, `{{candidate_contact}}`, `{{professional_summary}}`, `{{core_competencies}}`, `{{core_skills}}`, `{{professional_experience}}`, `{{education}}`, `{{extra_sections}}`.

The `{{extra_sections}}` placeholder SHALL be replaced with rendered `earlierExperience`, `languages`, and `certifications` sections (if non-empty), or empty string if all are absent.

#### Scenario 3.1: All placeholders replaced

- GIVEN a fully populated CV
- WHEN the template is processed
- THEN no `{{...}}` tokens remain in the final HTML string

#### Scenario 3.2: Empty optional sections produce no markup

- GIVEN a CV with empty `certifications` and `languages` arrays
- WHEN the template is processed
- THEN `{{extra_sections}}` is replaced with empty string (no empty `<section>` elements)

---

### Requirement 4: PDF Rendering

The system SHALL render the final HTML to A4 PDF using Playwright in headless mode. Output MUST be a single-page or multi-page A4 PDF with 1.2cm margins. Playwright browser instance MUST be closed after rendering (no leaked processes).

#### Scenario 4.1: Valid HTML produces PDF file

- GIVEN a complete HTML string with all sections populated
- WHEN `renderPdf(html, outputPath)` is called
- THEN a valid PDF file exists at `outputPath` with file size > 0

#### Scenario 4.2: Playwright cleanup on error

- GIVEN Playwright fails to launch (e.g., missing binary)
- WHEN `renderPdf()` is called
- THEN the system throws an error with message containing "Playwright" and no browser process remains

---

### Requirement 5: CLI Interface

The system SHALL provide `scripts/build-pdf.js` accepting: `node scripts/build-pdf.js <ref> [--lang en|es]`.

The CLI MUST resolve paths relative to the project root: load `data/cv_{lang}.json`, `applications/{ref}/match.json`, `applications/{ref}/score.json`, and output to `applications/{ref}/arias_emanuel-{lang}-{ref}.pdf`.

#### Scenario 5.1: CLI with valid ref

- GIVEN `applications/AGIL/` contains `match.json` and `score.json`
- WHEN `node scripts/build-pdf.js AGIL --lang en` is executed
- THEN `applications/AGIL/arias_emanuel-en-AGIL.pdf` is created

#### Scenario 5.2: CLI with missing ref folder

- GIVEN `applications/XXXX/` does not exist
- WHEN `node scripts/build-pdf.js XXXX` is executed
- THEN the process exits with code 1 and prints an error mentioning the missing path

---

### Requirement 6: Hermes Integration

The `stepPdf` function in `lib/hermes.js` SHALL call the new PDF builder with structured data from `state.cvData` instead of reading a Markdown file. The `markdown-it` dependency SHALL be removed from `package.json`. The old `pdf-builder/build-cv.js` file SHALL remain on disk but MUST NOT be imported by any active code path.

#### Scenario 6.1: Pipeline produces PDF without Markdown

- GIVEN `runPipeline()` completes steps 1–4 successfully
- WHEN `stepPdf(state)` executes
- THEN the PDF is generated from `state.cvData` directly — no `.md` file is read or written for PDF purposes

#### Scenario 6.2: No markdown-it imports

- GIVEN the project after implementation
- WHEN searching all `.js` files for `require('markdown-it')` or `import.*markdown-it`
- THEN zero matches are found

---

### Requirement 7: Language Support

The system SHALL select `data/cv_{lang}.json` based on the `--lang` flag (`en` or `es`). All narrative text (summary, competencies, achievements) MUST render in the CV JSON's language. Technical keywords (skills, tools, methodologies, job titles) MUST remain in English regardless of `lang`.

#### Scenario 7.1: Spanish CV renders Spanish narrative

- GIVEN `cv_es.json` with Spanish narrative text and `--lang es`
- WHEN the PDF is generated
- THEN summary and achievement text appears in Spanish; skill names like "CI/CD", "Jira", "Agile" remain in English

#### Scenario 7.2: Invalid lang flag

- GIVEN `--lang fr` (unsupported)
- WHEN the CLI is invoked
- THEN the process exits with code 1 and lists supported languages: `en`, `es`
