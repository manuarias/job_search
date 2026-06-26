# Design: JD Scraper (F5)

## Technical Approach

Single CJS module `lib/jd-scraper.js` plus CLI wrapper `scripts/fetch-jd.js` — same pattern as existing `keyword-extractor`. Uses Node ≥18 built-in `fetch`, regex-based HTML-to-Markdown, and source-specific URL patterns. Zero new npm dependencies. Syntactic section extraction only (h2/h3/strong → ##/###); keyword classification stays in F4. Output: `applications/{REF}/job-description.md` plus structured return object for programmatic consumption.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|----------|--------|----------|-----------|
| 1 | HTTP client | Node 18+ global `fetch` | `http`/`https`, axios | Already in Node ≥18 (proposal requirement); zero-dependency; async/await native |
| 2 | HTML cleaning | Regex strip scripts/styles/nav + h2/h3→##/### | cheerio | No dependency budget; regex sufficient for server-rendered JD pages; SPA pages fail early by design |
| 3 | Source detection | URL regex match on domain | Content-sniffing | Deterministic; known ATS domains (Greenhouse, Lever, Workday) have stable URL patterns |
| 4 | REF generation | First 4 alpha chars, uppercased, collision suffix | Hash-based, random | Human-readable, matches existing convention (`AGIL`, `SIMR`), tracks naturally |
| 5 | Module format | CJS (`require`/`module.exports`) | ESM (`import`/`export`) | Matches existing `lib/keyword-extractor.js` and `scripts/extract-keywords.js` conventions |

## Data Flow

```
URL ──→ fetch() ──→ HTML ──→ sourceDetect() ──→ parser(html)
                                                    │
   text ──→ (passthrough) ─────────────────────────┘
                                                    │
              extractSections(md) ←── stripChrome() ←┘
                    │
         generateRef(company, tracking) ──→ REF
                    │
         writeFile(applications/{REF}/job-description.md)
                    │
         updateTracking(jd-tracking.md) ←── append row
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/jd-scraper.js` | Create | Core: `fetchJD(url)`, `parseHTML(html, source)`, `extractSections(md)`, `generateRef(name, tracking)`, `writeOutput(ref, md, meta)` |
| `lib/jd-scraper.test.js` | Create | Vitest: unit tests per spec scenario (Greenhouse, Lever, Workday, LinkedIn w/wo cookie, SPA failure, PDF rejection, REF collisions) |
| `scripts/fetch-jd.js` | Create | CLI: `node scripts/fetch-jd.js <url|file|--text "raw"> [--ref XXXX]`, exits 0 on success, 1 on error |

## Interfaces / Contracts

```js
// lib/jd-scraper.js — primary export
module.exports = { fetchJD, parseHTML, extractSections, generateRef, writeOutput };

/**
 * @param {string} url - JD URL or "text:" prefix for raw passthrough
 * @param {object} [opts]
 * @param {string} [opts.sessionCookie] - LinkedIn li_at cookie value
 * @returns {Promise<{ref: string, meta: {company, role, location}, md: string, path: string}>}
 */
async function fetchJD(url, opts = {}) { ... }

/**
 * @param {string} html - Raw HTML string
 * @param {string} source - Detected platform: 'greenhouse'|'lever'|'workday'|'generic'
 * @returns {{title: string, company: string, body: string}} - Clean text body
 */
function parseHTML(html, source) { ... }

/**
 * @param {string} companyName - Detected company name
 * @param {string} trackingPath - Path to jd-tracking.md
 * @returns {string} - Unique 4+ char uppercase REF
 */
function generateRef(companyName, trackingPath) { ... }
```

## Source-Specific Selectors

| Source | URL Pattern | Content Extraction |
|--------|------------|-------------------|
| Greenhouse | `boards.greenhouse.io` | `<div id="content">` or `<section class="level-0">` |
| Lever | `jobs.lever.co` | `<div class="posting-page">` or `<div class="section">` |
| Workday | `*.myworkdayjobs.com`, `*.wd5.myworkdaysite.com` | `<div data-automation-id="jobPostingDescription">` or `<article>` |
| Generic | (none matched) | `<article>`, `<main>`, `<div class="content">`, fallback `<body>` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `extractSections`, `generateRef`, `sourceDetect`, `parseHTML` per source | Vitest with inline HTML fixtures — no network |
| Integration | `fetchJD` with mock HTTP (vitest `fetch` mock), full pipeline URL→file | Mock `global.fetch`; assert file written and tracking updated |
| E2E | Live URLs (success criteria: re-fetch existing 4 JDs) | Manual `node scripts/fetch-jd.js <url>` — compare against existing `job-description.md` |

## Migration / Rollout

No migration required. All additive. Existing `job-description.md` files untouched. Rollback: delete `lib/jd-scraper.js`, `lib/jd-scraper.test.js`, `scripts/fetch-jd.js`.

## Open Questions

- [ ] Workday DOM selectors: need live sample to confirm `data-automation-id` attribute; fallback to `<article>` if missing
- [ ] LinkedIn `li_at` cookie format: verify it's sent as `Cookie: li_at=<value>` — may need additional headers (`csrf-token`)
- [ ] Content threshold for SPA detection: spec says 50 words — reasonable for initial implementation, tune after live testing
