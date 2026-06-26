# Tasks: JD Keyword Extractor (F4)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850-950 (4 new files, 1 modified, tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | pending (user decision needed) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Taxonomy + Schema + taxonomy validation tests | PR 1 (~300 lines) | Foundation data files; no code deps; independently verifiable |
| 2 | Core extractor module + unit tests | PR 2 (~450 lines) | Section detection, matching, classification, seniority; depends on PR 1 taxonomy |
| 3 | CLI wrapper + integration tests + package.json | PR 3 (~170 lines) | End-to-end on 4 real JDs; depends on PR 2 |

## Phase 1: Foundation — Taxonomy + Schema

- [ ] 1.1 Create `data/keyword-taxonomy.json` with 6 categories (`languages`, `frameworks`, `tools`, `cloud`, `methodologies`, `databases`), ≥100 terms seeded from F3's 22 terms + CV technologies + common industry terms, plus `variants` map (e.g., `"K8s": "Kubernetes"`, `"React.js": "React"`). ~180 lines.
- [ ] 1.2 Create `schemas/jd-keywords.schema.json` (JSON Schema Draft 2020-12) defining `hardKeywords[]`, `softKeywords[]`, `senioritySignals`, `metadata` per spec Output Schema requirement. ~90 lines.
- [ ] 1.3 Create `lib/keyword-extractor.test.js` — taxonomy validation tests: JSON parses, ≥100 terms across 6 categories, each term has ≥1 variant, adding a term is recognized without code reload. ~30 lines.
- [ ] 1.4 **Verify**: `npx vitest run lib/keyword-extractor.test.js` — taxonomy tests pass; schema validates against sample output via `ajv`.

## Phase 2: Core Extractor + Unit Tests

- [ ] 2.1 Create `lib/keyword-extractor.js` — `normalize()` (lowercase, collapse whitespace) + `detectSections()` (regex for EN headers: `Requirements`, `Must Haves`, `Nice to Have`, `Responsibilities`, `About the Role`; ES headers: `Requisitos`, `Conocimientos técnicos requeridos`, `Deseables`, `Lo que buscamos en vos`, `Misión y Propósito`, etc.; fallback `unclassified`). ~80 lines.
- [ ] 2.2 Add `tokenize()` (words + bigrams) + `matchTaxonomy()` (case-insensitive Set lookup with variant resolution) + `matchSoftSkills()` (static ~40-term dictionary: leadership, communication, stakeholder management, etc.). ~70 lines.
- [ ] 2.3 Add `extractSeniority()` (regex: `(\d+)\+?\s*years` → `years_experience`; level labels: Senior, Lead, Junior, Semi-Senior, Mid-Level → `level_labels[]`) + `classify()` (4-factor weighted scoring: section 0.40, repetition 0.30 log-scaled, signal proximity 0.20 within 5 words, first-mention 0.10; threshold ≥0.5 → must-have). ~100 lines.
- [ ] 2.4 Add unit tests to `lib/keyword-extractor.test.js`: section detection on EN+ES JDs (4 real JDs), keyword matching with variants ("K8s" → "Kubernetes"), classification scoring (keyword in Requirements ×4 with "required" → confidence ≥0.7), seniority regex ("5+ years" → 5, "Mid-Senior level" → ["Mid-Senior"]), no-crash on unclassified JD. ~200 lines.
- [ ] 2.5 **Verify**: `npx vitest run lib/keyword-extractor.test.js` — all unit tests pass; `extractKeywords()` returns valid structure for inline test strings.

## Phase 3: CLI + Integration Tests

- [ ] 3.1 Create `scripts/extract-jd-keywords.js` — CLI: parse args (`<jd.md>`, `--output <path>`, `--ref <REF>`), read JD file, call `extractKeywords()`, write JSON to `applications/{REF}/jd-keywords.json` (or `--output` path). ~50 lines.
- [ ] 3.2 Modify `package.json` — add `"extract-jd-keywords": "node scripts/extract-jd-keywords.js"` to `scripts`. ~3 lines.
- [ ] 3.3 Add integration tests to `lib/keyword-extractor.test.js` (or separate `tests/integration/keyword-extractor.integration.test.js`): run CLI via `execSync` on all 4 real JDs (AGIL, VANT, HUMA, SIMR) — exit 0, output validates against `schemas/jd-keywords.schema.json` via `ajv`. ~120 lines.
- [ ] 3.4 **Verify**: `npx vitest run` — full suite passes; `node scripts/extract-jd-keywords.js applications/AGIL/job-description.md --ref AGIL` produces valid `applications/AGIL/jd-keywords.json`.
