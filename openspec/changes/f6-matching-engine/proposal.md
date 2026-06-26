# Proposal: CV–JD Matching Engine (F6)

## Intent

F1–F5 produce structured CV (`data/cv_en.json`) and JD keyword extractions (`jd-keywords.json`) in isolation. No component answers the core question: *how well does this CV match this JD?* F6 bridges the gap with a scored, auditable match report driving downstream F7 (gap analysis) and F8 (CV assembler).

## Scope

### In Scope
- Compute weighted match score across 5 dimensions (config-editable weights)
- Hard keyword matching: CV technologies/skills vs JD taxonomy terms, with `must_have`/`nice_to_have` distinction and frequency
- Soft keyword matching: static synonym dictionary (`data/soft-synonyms.json`, ~80 pairs) mapping JD soft signals to CV competency/skill language
- Domain match: manual keyword→domain table (taxonomy term → one of 7 domains: `delivery-management`, `backend-engineering`, `automation`, `leadership`, `frontend`, `data-engineering`, `devops`)
- Seniority fit: YOE from experience `dates` summed (month-granularity), plus title signal matching (Senior/Lead/Junior)
- Fuzzy matching: substring/partial matches with 10% weight budget
- Structured recommendations output: `{type: highlight|reframe|add, achievementId?, skill?, reason, priority}` — machine-readable, enables F8 automation
- Output schema: `schemas/match-result.schema.json` and artifact `applications/{REF}/match-result.json`

### Out of Scope
- Embedding-based semantic matching (deferred; synonym dictionary documented as upgrade path)
- Auto-generated CV rewrite (F8)
- Gap analysis or action plan generation (F7)

## Capabilities

### New Capabilities
- `matching-engine`: Weighted 5-dimensional CV–JD scoring with structured, auditable match report and actionable recommendations.

### Modified Capabilities
None. F6 is a consumer of F3 (CV model) and F4 (keyword extraction), not a modifier.

## Approach

**Weights** (editable via `data/match-config.json`):

| Dimension | Default | Source |
|-----------|---------|--------|
| Hard keywords | 40% | CV `technologies` + `skills.items` vs JD `hardKeywords[].term` |
| Soft keywords | 20% | `data/soft-synonyms.json` ↔ CV competencies, JD `softKeywords[].term` |
| Domain match | 20% | CV `achievements[].domains` vs keyword→domain table mapping JD taxonomy terms to 7 domains |
| Seniority fit | 10% | YOE sum (month-granularity) + title signal comparison against `jd-keywords.json` `senioritySignals` |
| Fuzzy/partial | 10% | Substring and case-insensitive fallback for unmatched terms |

**Domain mapping**: Table `data/keyword-domain-map.json` maps each taxonomy term → 1+ of 7 domains. Manual, deterministic, auditable.

**Seniority**: Sum months from `dates.start` to `dates.end` (`Present` = today) across `professionalExperience`. Compare against JD `yearsMinimum`/`yearsPreferred` with threshold bands. Bonus/penalty from title keyword alignment.

**Recommendations**: Per achievement or skill, emit `{type, achievementId?, skill?, reason, priority}` where:
- `highlight`: achievement maps to JD must-have — surface it
- `reframe`: achievement matches domain but wrong terminology — suggest JD-aligned language
- `add`: JD must-have with no CV match — flag gap

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/match-cv-jd.js` | New | CLI: CV JSON + JD keywords → match result |
| `lib/matching-engine.js` | New | Core: 5 scorers, aggregator, recommendation builder |
| `data/soft-synonyms.json` | New | ~80 soft-skill synonym pairs |
| `data/keyword-domain-map.json` | New | Taxonomy term → 7-domain mapping |
| `data/match-config.json` | New | Weights, thresholds, band definitions |
| `schemas/match-result.schema.json` | New | Output schema |
| `applications/{REF}/match-result.json` | Generated | Per-application match artifact |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Synonyms miss JD-specific phrasing | Medium | Dictionary external JSON — add pairs without code change; fuzzy dimension catches stragglers |
| Domain table maintenance burden | Low | Manual mapping is one-time per taxonomy term; documented procedure |
| YOE calculation sensitive to date gaps | Low | Aggregate sum tolerates overlaps; log anomalies |

## Rollback Plan

All output is additive JSON artifacts. Remove `scripts/match-cv-jd.js`, `lib/matching-engine.js`, the 3 new data files, and any generated `match-result.json`. No existing pipeline artifacts modified.

## Dependencies

- F3 (cv-data-model): `data/cv_en.json`, `data/cv_es.json` with `achievements[].domains[]`
- F4 (keyword-extractor): `data/keyword-taxonomy.json`, `applications/{REF}/jd-keywords.json`
- Zero new npm dependencies — pure Node.js stdlib

## Success Criteria

- [ ] `scripts/match-cv-jd.js` runs against all 4 existing `applications/{REF}/jd-keywords.json` without crashing
- [ ] Match output passes JSON Schema validation
- [ ] Hard keyword coverage ≥40% when JD targets CV's known stack (Java, AWS, Jira)
- [ ] Seniority fit ≥70% for roles matching CV's 10+ years
- [ ] Recommendations output includes actionable `highlight`/`reframe`/`add` entries with non-empty `reason`
