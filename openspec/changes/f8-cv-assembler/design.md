# Design: CV Assembler (F8)

## Technical Approach

Single CJS module (`lib/assembler.js`) consuming cv.json + F6 matchResult, outputting Markdown + metadata. Follows existing `lib/matcher.js` conventions: `'use strict'`, lazy-loaded config, pure functions, single public export. CLI wrapper mirrors `scripts/match-cv.js`. Zero deps.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline MD builders vs template engine | Handlebars adds dep, harder to test. Inline is verbose but zero-deps, auditable. | Programmatic string builders per section. |
| Sort once vs re-rank on every call | Re-ranking is cheap (≤20 achievements × ~10 keywords). No cache needed. | Compute ranking inline per call — no stale cache risk. |
| Reframe hints in separate array vs inline comments | Inline comments pollute Markdown for ATS. Separate array keeps output clean. | `reframeHints[]` in return value, not in Markdown. |
| Config: module-level DEFAULT_N vs passed opts | Module-level is simpler for agent callers; passed opts for CLI flexibility. | Both — `DEFAULT_N = 4` in module, overridable via `opts.maxAchievementsPerRole`. |

## Data Flow

```
cv.json ──────────┐
                   ├── assembleCV() ──→ { markdown, lowConfidence, reframeHints[], stats }
matchResult ───────┘
         │
    ┌────┴────┐
    │  rank()   │  per-achievement relevance
    │  select() │  top N with domain diversity
    │  reorder()│  skill cats/items by JD overlap
    │  build()  │  section builders × 6
    └──────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/assembler.js` | Create | Core: `assembleCV(cv, matchResult, opts)`, ranking, selection, reordering, 6 MD builders |
| `lib/assembler.test.js` | Create | Unit tests per function + integration on real CV+match pairs |
| `scripts/assemble-cv.js` | Create | CLI: args → assembleCV → stdout |

## Interfaces

```js
// lib/assembler.js
function assembleCV(cv, matchResult, opts = {}) → AssembleResult

// AssembleResult
{
  markdown: string,            // complete CV Markdown
  lowConfidence: boolean,      // true if match overall < 0.35
  reframeHints: [{             // for external LLM agent
    achievementId: string,     // UUID from cv.achievements[].id
    currentText: string,       // original achievement text
    suggestion: string,        // JD-aligned reframe suggestion
    jdTerms: string[]          // JD keywords to incorporate
  }],
  stats: {                     // audit trail
    totalAchievements: number,
    selected: number,
    skillCatOrder: string[],   // category names in output order
    lowConfidence: boolean
  }
}
```

**Key internal functions**:
- `rankAchievement(ach, jdKeywords, jdDomains) → number` — 0–1 relevance
- `selectAchievements(achievements, n, jdKeywords, jdDomains) → Achievement[]` — domain-diverse top N
- `reorderSkills(skills, jdKeywords) → SkillCategory[]` — cats + items sorted
- `buildHeader(cv, matchResult)`, `buildSummary()`, `buildCompetencies()`, `buildSkills()`, `buildExperience()`, `buildEducation()` — each returns markdown string
- `generateReframeHints(selected, matchResult) → ReframeHint[]`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `rankAchievement` | Mock achievement + JD keyword data, assert score ranges |
| Unit | `selectAchievements` | 6 achievements input, assert N=4 selected, domain diversity |
| Unit | `reorderSkills` | 4 categories with varying JD overlap, verify output order |
| Unit | Markdown builders | Assert each builder's output is non-empty string with expected structure |
| Integration | `assembleCV(cv_en.json, real_match)` | Load real data files, assert 6 sections, validate stats shape |
| Integration | CLI script | Run with real files, assert exit 0 and valid MD on stdout |

## Migration / Rollout

No migration. Greenfield module. All new files. Existing F3-F6 untouched.

## Open Questions

None. All design decisions resolved per user's Q1-Q5 answers.
