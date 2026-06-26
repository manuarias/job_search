# Proposal: JD Scraper (F5)

## Intent

F4 needs clean Markdown per JD, but today it's created manually — fetch page, copy text, format sections by hand. Automate ingestion so URLs feed the pipeline directly, producing `applications/{REF}/job-description.md` with zero manual formatting.

## Scope

### In Scope
- Input: URL (Greenhouse, Lever, Workday static, plain HTML) or raw text passthrough
- HTTP GET → HTML → structured Markdown with preserved section headers
- LinkedIn: attempt with `li_at` session cookie; show "paste JD manually" if missing/auth fails
- JS-heavy SPA sites: fail gracefully with actionable error

### Out of Scope
- Headless browser (no Puppeteer/Playwright)
- PDF ingestion
- Keyword extraction or semantic classification (F4's domain)

## Capabilities

### New Capabilities
- `jd-scraper`: Fetch JDs from URLs or raw text, extract syntactic section structure (h2/h3/strong → `##`/`###`), write structured Markdown to `applications/{REF}/job-description.md`.

### Modified Capabilities
None.

## Approach

Regex-based HTML-to-Markdown with section detection. No DOM execution. Q1–Q4 decisions:

| Decision | Verdict |
|----------|---------|
| Q1: LinkedIn | Try session cookie; friendly fallback error |
| Q2: JS-heavy sites | No Puppeteer — only server-rendered HTML; SPA pages fail with clear message |
| Q3: Section extraction | **Syntactic only** — scraper preserves source headers verbatim. F4 handles keyword classification within those sections. |
| Q4: PDF | Not supported |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/fetch-jd.js` | New | CLI: URL/text → Markdown |
| `lib/jd-scraper.js` | New | Core: fetch, section-detect, serialize |
| `applications/{REF}/job-description.md` | Generated | F4 input |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| LinkedIn cookie expires | Medium | Env-var `LINKEDIN_SESSION` with docs; manual paste fallback |
| HTML structure varies | Medium | Ordered regex fallbacks; unmatched → `## Description` catch-all |
| SPA-only postings increase | Low | Clear error message; Puppeteer path deferred |

## Rollback Plan

Remove `scripts/fetch-jd.js`, `lib/jd-scraper.js`, and generated `job-description.md` files. All additive — no other pipeline artifacts affected.

## Dependencies

- F4 keyword extractor (consumes `job-description.md`)
- Node.js ≥18 built-in `fetch` — no new npm deps

## Success Criteria

- [ ] Re-fetches all 4 existing JDs producing identical section structure to current `job-description.md` files
- [ ] Greenhouse/Lever/Workday URLs → valid Markdown with ≥2 detected sections
- [ ] LinkedIn URL without cookie → actionable error (exit ≠ 0)
- [ ] SPA URL → clear unsupported error
- [ ] Output sections match source headers verbatim
