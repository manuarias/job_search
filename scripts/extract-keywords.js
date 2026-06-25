#!/usr/bin/env node

/**
 * F4 Keyword Extractor — CLI wrapper
 *
 * Reads a job description Markdown file and prints the extracted keywords
 * as JSON to stdout. Uses lib/keyword-extractor.js (CJS module).
 *
 * Usage:
 *   node scripts/extract-keywords.js <path/to/jd.md>
 *   node scripts/extract-keywords.js applications/AGIL/job-description.md
 *
 * Exit codes:
 *   0 — success (valid JSON written to stdout)
 *   1 — error (missing argument, file not found, or extraction failure)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { extractKeywords } = require('../lib/keyword-extractor');

// ── Usage ────────────────────────────────────────────────────────────
function usage() {
  console.error('Usage: node scripts/extract-keywords.js <path/to/jd.md>');
  console.error('');
  console.error('Extracts hard keywords, soft keywords, and seniority signals');
  console.error('from a job description file. Prints JSON to stdout.');
  console.error('');
  console.error('Exit 0 on success, 1 on error.');
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────
const target = process.argv[2];

if (!target) {
  usage();
}

// Resolve path relative to cwd
const resolved = path.resolve(target);

// Read the JD file
let jdText;
try {
  jdText = fs.readFileSync(resolved, 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`File not found: ${target}`);
  } else {
    console.error(`Failed to read ${target}: ${err.message}`);
  }
  process.exit(1);
}

// Guard against empty files (extractKeywords handles empty strings, but an
// empty file is almost certainly an error in CLI usage)
if (jdText.trim().length === 0) {
  console.error(`File is empty: ${target}`);
  process.exit(1);
}

// Extract keywords
let result;
try {
  result = extractKeywords(jdText);
} catch (err) {
  console.error(`Extraction failed: ${err.message}`);
  process.exit(1);
}

// Write JSON to stdout
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
