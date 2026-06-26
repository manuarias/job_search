# Design: JD Keyword Extractor (F4)

## Technical Approach

Pure-heuristic pipeline: regex section detection → dictionary token matching → weighted classification → JSON output. No LLM dependency. Single CJS module (`lib/keyword-extractor.js`) exposes `extractKeywords(jdText, options?)`, plus a CLI wrapper (`scripts/extract-jd-keywords.js`). Taxonomy lives as standalone JSON at `data/keyword-taxonomy.json` (editable without code changes). Classification uses 4-factor weighted scoring per spec with threshold ≥0.5 → `must-have`.

## Architecture Decisions

| Decision | Option A | Option B | Choice & Rationale |
|----------|----------|----------|---------------------|
| Module format | ESM (`.mjs`) — matches `validate-cv.mjs` | CJS (`require`) — matches `build-cv.js` + `vitest.config.js` | **CJS**: `build-cv.js` is CJS already; proposal specifies `.js`; vitest config is CJS. |
| Section detection | Markdown AST parser (markdown-it) | Regex patterns on raw text | **Regex**: no parser dependency; JDs are human-written Markdown, not strict AST; comprehensive regex handles EN + ES headers proven across 4 real JDs. |
| Keyword matching | Full-text index (FTS) | `Set` + `Map` lookup after tokenization | **Set/Map**: taxonomy is ≤150 terms — lookup is O(1) per token; no indexing overhead; trivial to implement. |
| Soft-skill detection | LLM call | Static dictionary (~40 terms) | **Static dictionary**: spec explicitly requires no LLM; soft skills map to known patterns (leadership, communication, stakeholder management). |

## Data Flow

```
JD Markdown ──→ normalize() ──→ detectSections() ──→ tokenize()
                     │                                    │
                     ▼                                    ▼
              (lowercase,                     [words + bigrams]
              collapse whitespace)                    │
                                                     ▼
                                          matchTaxonomy(tokens, taxonomy)
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          ▼                          ▼                          ▼
                   matchHardSkills()           matchSoftSkills()       extractSeniority()
                          │                          │
                          └──────────┬───────────────┘
                                     ▼
                            classify(keywords[])
                                     │
                                     ▼
                            output: jd-keywords.json
```

Pipeline stages: (1) normalize → (2) section-detect → (3) tokenize → (4) match hard keywords via taxonomy + variant resolution → (5) match soft keywords via static dictionary → (6) extract seniority signals via regex → (7) classify must-have/nice-to-have → (8) serialize JSON.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/keyword-extractor.js` | Create | Core pure function: `extractKeywords(jdText, options?) → result`. All pipeline stages. |
| `data/keyword-taxonomy.json` | Create | ~100-150 terms across 6 categories + variant mappings. Seed: 22 terms from F3 + CV `technologies[]` + common industry terms. |
| `schemas/jd-keywords.schema.json` | Create | JSON Schema Draft 2020-12 for extraction output (matches project convention from F3). |
| `scripts/extract-jd-keywords.js` | Create | CLI: `node scripts/extract-jd-keywords.js <jd.md> [--output <path>] [--ref <REF>]`. Reads JD, calls extractor, writes JSON. |
| `package.json` | Modify | Add `"extract-jd-keywords"` script + optional `"test"` integration. |

## Interfaces / Contracts

### extractKeywords() signature

```js
/**
 * @param {string} jdText - Raw JD Markdown
 * @param {object} [options]
 * @param {string} [options.taxonomyPath] - Override taxonomy location
 * @returns {object} { hardKeywords[], softKeywords[], senioritySignals, metadata }
 */
function extractKeywords(jdText, options = {}) {}
```

### Output schema (matching spec Requirement: Output Schema)

```json
{
  "hardKeywords": [{ "term": "React", "category": "frameworks", "frequency": 3, "classification": "must-have", "confidence": 0.85, "section": "must-haves" }],
  "softKeywords": [{ "term": "stakeholder management", "frequency": 2, "classification": "nice-to-have" }],
  "senioritySignals": { "years_experience": 5, "level_labels": ["Mid-Senior"] },
  "metadata": { "totalTerms": 18, "classifiedCount": 15, "unclassifiedCount": 3 }
}
```

### Taxonomy structure

```json
{
  "categories": { "languages": ["JavaScript", "Python", "Java"], "frameworks": ["React", "Node.js", "Apex"], "tools": ["Jira", "Git", "n8n"], "cloud": ["AWS", "Docker", "Kubernetes"], "methodologies": ["Scrum", "Agile", "CI/CD"], "databases": ["MySQL", "MongoDB", "PostgreSQL"] },
  "variants": { "K8s": "Kubernetes", "CI/CD": "Continuous Integration/Continuous Delivery", "React.js": "React", "Node": "Node.js" }
}
```

### Classification algorithm (per spec weights)

| Factor | Weight | Value | Cap |
|--------|--------|-------|-----|
| Section context | 0.40 | 1.0 (Requirements/Must Haves), 0.3 (Nice to Have/Deseables), 0.1 (else) | N/A |
| Repetition | 0.30 | Log-scaled: 1 occurrence → 0.33, 3+ → 1.0 | 5 occurrences |
| Signal words | 0.20 | 1.0 if "required"/"must"/"esencial"/"requerido" within 5-word window | N/A |
| First mention | 0.10 | 1.0 if keyword in first 25% of text | N/A |

Threshold: composite ≥ 0.5 → `must-have`; < 0.5 → `nice-to-have`. Confidence = composite score.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Taxonomy loads & validates | Vitest: `JSON.parse(fs.readFileSync(...))` succeeds, ≥100 terms across 6 categories |
| Unit | Section detection (EN + ES) | Vitest: 4 real JDs (AGIL, VANT, HUMA, SIMR) — verify section labels match expected |
| Unit | Keyword matching (exact + variant) | Vitest: "K8s" → "Kubernetes", "React" in `## Must Haves` → `category: "frameworks"` |
| Unit | Classification scoring | Vitest: keyword in Requirements ×4 with "required" proximity → confidence ≥ 0.7 |
| Unit | Seniority regex | Vitest: "5+ years" → 5, "Mid-Senior level" → ["Mid-Senior"] |
| Unit | No-crash on unclassified JD | Vitest: plain text with no headers → `section: "unclassified"`, extraction succeeds |
| Integration | CLI processes real JDs | Vitest: `execSync` on AGIL/VANT/HUMA/SIMR → exit 0, output validates against schema |
| Integration | Schema validation | Vitest: output from all 4 JDs passes `ajv.compile(schema)` |

## Migration / Rollout

No migration required. All files are additive — remove `lib/keyword-extractor.js`, `data/keyword-taxonomy.json`, `schemas/jd-keywords.schema.json`, and `scripts/extract-jd-keywords.js` to roll back. Generated `jd-keywords.json` files are disposable artifacts.

## Open Questions

- [ ] Should soft-skill dictionary be internal (hardcoded in extractor) or external JSON like taxonomy? Proposal says "built-in soft-skill dictionary" → internal is fine for v1, can externalize later if needed.
- [ ] Does the taxonomy need a version field or `$metadata` block like cv.schema.json? Not in spec — can add in future iteration if F6 needs it.
