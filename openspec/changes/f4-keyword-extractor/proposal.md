# Proposal: JD Keyword Extractor (F4)

## Intent

Steps 1-5 of the optimization pipeline require manual analysis of each JD to identify hard/soft keywords, seniority signals, and section structure. Automating keyword extraction eliminates inconsistent manual parsing and feeds structured data to ATS diagnostic (Step 1), achievement rewrite (Step 3), and keyword fusion (Step 4).

## Scope

### In Scope
- Parse raw JD Markdown into structured sections (English + Spanish)
- Extract hard keywords (skills, tools, methodologies) via dictionary matching against a ~100-150 term taxonomy
- Classify keywords as `must_have` / `nice_to_have` with confidence scoring based on section context, repetition count, and proximity to requirement-signaling words
- Extract seniority signals as raw structured fields (`years_experience`, `level_labels[]`)
- Output JSON artifact (`applications/{REF}/jd-keywords.json`) consumable by downstream pipeline steps
- Build keyword dictionary seeded from F3's technology taxonomy (~22 terms), expanded with variants and common synonyms to ~100-150 terms

### Out of Scope
- Industry-complete taxonomy (v1 stays tight; expansion deferred)
- Seniority classification (raw extraction only; classification belongs to F6)
- Multi-language keyword translation (keywords always English; Spanish JDs use English tech terms)
- Matching engine or CV gap analysis (F6)

## Capabilities

### New Capabilities
- `jd-keyword-extractor`: Structured extraction of keywords, seniority signals, and section metadata from Job Description Markdown files. Produces `jd-keywords.json` per application folder.

### Modified Capabilities
None.

## Approach

**Dictionary scope (Q1)**: Seed from F3's technology extraction list (~22 terms from `design.md`). Expand with variants (`CI/CD` → `continuous integration`, `continuous delivery`), common synonyms (`Jira` ↔ `Linear` ↔ `Asana`), and framework suffixes (`React` → `React.js`). Target ~100-150 terms for v1. Dictionary lives as standalone JSON (`data/keyword-taxonomy.json`), editable without code changes.

**Classification heuristic (Q2)**: Scan each keyword occurrence with a weighted scoring function:
| Weight | Value | Trigger |
|--------|-------|---------|
| Section context | 0.35 | +1.0 in "Must Have" / "Requeridos" / "Required Skills"; +0.3 in "Nice to Have" / "Deseable"; +0.1 elsewhere |
| Repetition count | 0.25 | Logarithmic bonus per occurrence |
| Proximity to signal words | 0.25 | Bonus if within 5 words of `required`, `must have`, `essential`, `excluyente`, `requerido`, `imprescindible` |
| First-mention position | 0.15 | Bonus if keyword appears in top 30% of document |

Output `classification: "must_have" | "nice_to_have"` with `confidence: 0.0-1.0`.

**Spanish section matching (Q3)**: Match ALL patterns found across 4 real JDs in `applications/*/job-description.md`. English patterns: `Must Haves`, `Required Skills`, `Nice to Have`, `Responsibilities`, `About the Role`, etc. Spanish patterns: `Principales responsabilidades`, `Conocimientos técnicos requeridos`, `Acerca del empleo`, `Objetivo del rol`, `Nivel esperado`, `Lo que buscamos en vos`, `Qué te ofrecemos`, `Nuestra cultura`, `¿Qué valoramos?`, `Misión y Propósito`, and variants.

**Seniority (Q4)**: Regex extraction only — capture `years_experience: number | null`, `level_labels[]: string[]` (matches: "Senior", "Lead", "Junior", "Semi-Senior", "Mid-Level"). Output as raw fields in `jd-keywords.json`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/extract-jd-keywords.js` | New | CLI: JD Markdown → structured JSON |
| `data/keyword-taxonomy.json` | New | Curated dictionary (~100-150 terms with variants) |
| `schemas/jd-keywords.schema.json` | New | JSON Schema for extraction output |
| `applications/{REF}/jd-keywords.json` | New | Per-application extraction artifact |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dictionary misses niche tools in JD | Medium | Dictionary is external JSON — add terms without code changes; confidence scoring degrades gracefully with unknown terms |
| Spanish section headers vary across companies | Medium | Comprehensive regex patterns from 4 real JDs; fallback to "unclassified" section with raw text preserved |
| False positives on requirement-signaling words | Low | Weighted scoring + confidence value lets downstream consumers set their own threshold |

## Rollback Plan

All output is additive JSON artifacts — remove `data/keyword-taxonomy.json`, `scripts/extract-jd-keywords.js`, and any generated `jd-keywords.json` files. No Markdown sources or pipeline steps modified.

## Dependencies

- F3 (cv-data-model): JSON output format established; keyword taxonomy seeded from F3's technology extraction list
- Existing node_modules: No new dependencies; regex + file I/O only

## Success Criteria

- [ ] `scripts/extract-jd-keywords.js` processes all 4 real JDs in `applications/*/job-description.md` without crashing
- [ ] Output passes JSON Schema validation (`schemas/jd-keywords.schema.json`)
- [ ] Must-have classification confidence ≥0.7 for keywords in explicit "Must Have" sections
- [ ] Spanish section headers from VANT, HUMA are correctly classified
- [ ] Seniority signals extracted for AGIL ("5+ years", "Mid-Senior level") and VANT ("perfil semi-senior")
