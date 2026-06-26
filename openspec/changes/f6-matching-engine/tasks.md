# Tasks: CV–JD Matching Engine (F6)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–700 (7 new files, zero modifications) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (all additive, zero existing code touched) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Data files + schema + core matcher + tests + CLI | PR 1 | All greenfield, no existing code modified. Split only if reviewer requests it. |

## Phase 1: Foundation (Data Files & Schema)

- [ ] 1.1 Create `data/match-config.json` with default weights (hard 40%, soft 20%, domain 20%, seniority 10%, fuzzy 10%), thresholds, bands, and `embedding: { enabled: false }` stub
- [ ] 1.2 Create `data/soft-synonyms.json` with ~80 synonym pairs mapping JD soft terms to canonical forms (e.g. `"stakeholder management"` ↔ `"cross-functional coordination"`)
- [ ] 1.3 Create `data/keyword-domain-map.json` mapping every taxonomy term to 1+ of 7 domains (`delivery-management`, `backend-engineering`, `automation`, `leadership`, `frontend`, `data-engineering`, `devops`)
- [ ] 1.4 Create `schemas/match-output.schema.json` defining `MatchResult` shape with `$defs` pattern matching existing schemas

## Phase 2: Core Implementation

- [ ] 2.1 Create `lib/matcher.js` — export `matcher(cv, jdKeywords, configOverride)` with lazy `require()` for config/data files
- [ ] 2.2 Implement `scoreHardKeywords(cv, jdKeywords)` — exact case-insensitive + Levenshtein ≤ 2 matching against CV `technologies` + `skills.items`, must_have/nice_to_have weighting
- [ ] 2.3 Implement `scoreSoftKeywords(cv, jdKeywords, synonyms)` — resolve JD soft terms through synonym dictionary, match against CV competencies
- [ ] 2.4 Implement `scoreDomainMatch(cv, jdKeywords, domainMap)` — map JD taxonomy terms to domains, compute overlap with CV `achievements[].domains[]`
- [ ] 2.5 Implement `scoreSeniorityFit(cv, jdKeywords)` — sum months from `dates.start` to `dates.end` (`Present` = today), compare against `yearsMinimum`/`yearsPreferred` bands, apply title signal bonus/penalty
- [ ] 2.6 Implement `scoreFuzzyMatch(cv, jdKeywords)` — substring/case-insensitive fallback for unmatched terms from hard dimension
- [ ] 2.7 Implement weighted aggregator — `compositeScore = Σ(score_i × weight_i)`, build `dimensionScores`, merge recommendations
- [ ] 2.8 Implement `buildRecommendations()` — emit `{type: highlight|reframe|add, achievementId?, skill?, reason, priority}` per spec rules

## Phase 3: CLI & Integration

- [ ] 3.1 Create `scripts/match-cv-jd.js` — CLI wrapper: `node scripts/match-cv-jd.js <cv.json> <jd-keywords.json>` → writes `match-result.json` to stdout
- [ ] 3.2 Create `lib/__fixtures__/` with a sample JD keywords JSON for testing (since F4 extractor hasn't run yet on existing applications)

## Phase 4: Testing

- [ ] 4.1 Create `lib/matcher.test.js` — unit tests per scorer: hard exact/fuzzy/zero-match, soft synonym bridge, domain overlap %, seniority bands, fuzzy Levenshtein dist ≤ 2
- [ ] 4.2 Add weighted aggregation test — verify `compositeScore = Σ(score_i × weight_i)` with default and custom weights
- [ ] 4.3 Add integration test — full `matcher(cv_en.json, fixture-jd-keywords)` with JSON Schema validation (Ajv)
- [ ] 4.4 Add CLI test — run `match-cv-jd.js` with real data, assert exit 0 and valid JSON on stdout
- [ ] 4.5 Verify recommendation generation — assert at least one `highlight`, `reframe`, and `add` entry with non-empty `reason` and `priority`

## Phase 5: Verification

- [ ] 5.1 Run `scripts/match-cv-jd.js` against all existing `applications/{REF}/jd-keywords.json` (when available) — assert no crashes
- [ ] 5.2 Validate all output against `schemas/match-output.schema.json`
- [ ] 5.3 Verify hard keyword coverage ≥ 40% for JD targeting CV's known stack (Java, AWS, Jira)
- [ ] 5.4 Verify seniority fit ≥ 70% for roles matching CV's 10+ years
