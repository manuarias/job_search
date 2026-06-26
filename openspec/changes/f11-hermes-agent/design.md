# Design — f11-hermes-agent

## Intent
`scripts/hermes.js` is the pipeline orchestrator that chains all CV optimization modules. Instead of running each script manually in sequence, Hermes automates the full flow: scrape → extract → match → score → assemble → cover letter.

## Architecture

```
scripts/hermes.js
├── parseArgs()         → CLI flag parsing
├── detectLanguage()    → Spanish/English auto-detect
├── loadCVData()        → Load structured CV JSON by language
├── runPipeline()       → Main orchestrator (single JD)
├── runBatch()          → Batch runner (multiple URLs)
│
├── Pipeline steps (each calls a lib/ module directly):
│   ├── stepScrape()    → lib/jd-scraper.scrapeJD()
│   ├── stepExtract()   → lib/keyword-extractor.extractKeywords()
│   ├── stepMatch()     → lib/matcher.matchCV()
│   ├── stepScore()     → lib/scorer.scoreCV()
│   ├── stepAssemble()  → lib/assembler.assembleCV()
│   ├── stepCover()     → lib/cover-letter.generateCoverLetter()
│   └── stepPdf()       → pdf-builder/build-cv.buildCV()
│
├── State management:
│   ├── loadState()     → Read .hermes-state.json
│   ├── saveState()     → Write .hermes-state.json
│   └── initState()     → Bootstrap new state
│
└── Tracking updates:
    ├── appendTrackingMd()    → Append row to jd-tracking.md
    ├── updateTrackingScore() → Update score in tracking table
    └── updateTrackingJson()  → Update data/jd-tracking.json
```

## Key Decisions

1. **Zero new dependencies** — All imports are `require()` of existing project modules. No `child_process` spawning.
2. **Filesystem state** — Each REF directory gets a `.hermes-state.json` that tracks which steps are done. Survives crashes and enables resume.
3. **Language detection** — Heuristic based on Spanish signal word count (≥3 = Spanish). Falls back to `--lang` flag.
4. **Direct library calls** — Hermes calls library functions directly, not via CLI subprocesses. This avoids serialization overhead.
5. **Readline for interactive mode** — Node's built-in `readline` module for step-by-step approval. Zero deps.
6. **Dual tracking** — Updates both `jd-tracking.md` (human-readable table) and `jd-tracking.json` (machine-readable).

## Data Flow

```
input (URL or text)
  → scrapeJD()        → applications/{REF}/job-description.md
  → extractKeywords() → applications/{REF}/keywords.json
  → matchCV()         → applications/{REF}/match.json
  → scoreCV()         → applications/{REF}/score.json
  → assembleCV()      → applications/{REF}/arias_emanuel-{lang}-{REF}.md
  → generateCoverLetter() → applications/{REF}/cover-letter.md
  → [optional] buildCV()  → applications/{REF}/arias_emanuel-{lang}-{REF}.pdf
```
