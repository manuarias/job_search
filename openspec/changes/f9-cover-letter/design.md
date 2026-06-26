# Design: Cover Letter Generator (F9)

## Technical Approach

Single CJS module (`lib/cover-letter.js`) consuming `cv.json` + F6 `matchResult` + JD text. Follows existing `lib/assembler.js` conventions: `'use strict'`, lazy-loaded config, pure functions, single public export. Zero new deps. Placeholder-based skeleton output designed for an external LLM agent to fill.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Breadth selector vs top-ranked | Top-ranked may fill all slots with same-domain achievements. Breadth ensures coverage of user's 3 narratives. | Breadth-first: one achievement per domain (leadership, technical, mentoring). Fallback to next-best when domain empty. |
| JD parser: regex-only vs reuse jd-scraper | Regex is simpler but fragile. jd-scraper reuses tested code but adds import dependency. | Use `jd-scraper` when available, regex fallback when JD is raw text. |
| Placeholder format: structured JSON vs plain `[INSERT:]` | JSON is machine-parseable but harder for LLMs. Plain text is universally consumable. | Plain `[INSERT: domain context — impact: metric]`. Any LLM can process it. |
| Refusal vs warning | F8 emits `lowConfidence` warning + best-effort output. User Q5 wants stricter: no output at all. | `{ refused: true, reason, markdown: null }` when < 0.35. |

## Data Flow

```
cv.json ─────────────┐
matchResult ─────────┤
jdText ──────────────┤
                     ├── generateCoverLetter() ──→ { refused, markdown, stats }
                     │
               ┌─────┴──────┐
               │ extractJDContext() → { company, role, roleDomain }
               │ selectNarrative()   → { leadership, technical, mentoring } ach[]
               │ buildSkeleton()     → 5 paragraphs with [INSERT: ...]
               │ refusal gate        → if < 0.35: short-circuit
               └────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/cover-letter.js` | Create | Core: `generateCoverLetter(cv, matchResult, jdText, opts)`, narrative selectors, placeholder builders, refusal gate |
| `lib/cover-letter.test.js` | Create | Unit tests per function + integration on real CV+match+JD |
| `scripts/generate-cover-letter.js` | Create | CLI: args → generateCoverLetter → stdout (or empty if refused) |

## Interfaces

```js
// lib/cover-letter.js

function generateCoverLetter(cv, matchResult, jdText, opts = {}) → CoverLetterResult

// CoverLetterResult
{
  refused: boolean,           // true when match < 0.35
  reason?: string,            // refusal reason (only when refused)
  markdown: string | null,    // skeleton or null if refused
  stats: {                    // audit trail
    matchScore: number,
    domainsUsed: string[],    // which domains had achievements selected
    fallbacksUsed: string[],  // domains that needed fallback
    totalPlaceholders: number
  }
}

// Internal functions:
//   extractJDContext(jdText) → { company, role, roleDomain }
//   domainTagSet(achievement) → Set<string> — maps achievement.domainTags to narrative buckets
//   selectByDomain(achievements, domainKeywords, jdTerms) → { achievement, domain }
//   buildPlaceholder(achievement, domain, context) → string
//   buildOpening(cv, context) → string
//   buildLeadership(ach, context) → string
//   buildTechnical(ach, context) → string
//   buildMentoring(ach, context) → string
//   buildClosing(context) → string
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `extractJDContext()` | Mock JD text with known company/role patterns, assert extraction |
| Unit | `selectByDomain()` | 8 achievements across 3 domains, assert 1 per domain selected |
| Unit | `buildPlaceholder()` | Achievement with/without metrics, assert format and no fabrication |
| Unit | Refusal gate | `overall.percentage = 0.28` → `{ refused: true, markdown: null }` |
| Integration | `generateCoverLetter()` with real data | Load `cv_en.json` + match result + sample JD, assert 5 sections |
| Integration | CLI script | Valid args → exit 0, invalid args → exit 1/2/3 |

## Migration / Rollout

No migration. Greenfield module. All new files. Existing F3, F6, F8 untouched.

## Open Questions

None. All design decisions resolved per user's Q1–Q5 answers.
