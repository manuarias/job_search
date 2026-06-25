#!/usr/bin/env node

/**
 * F6 Match CV — CLI entry point
 *
 * Usage:
 *   node scripts/match-cv.js <cv.json> <keywords.json>
 *
 * Reads a structured CV JSON file and a JD keyword extraction output JSON file,
 * runs the five-dimensional match scorer, and prints the result as formatted JSON.
 *
 * Exit codes:
 *   0 — match completed successfully
 *   1 — usage error (missing args, file not found)
 *   2 — input validation error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { matchCV } = require('../lib/matcher');

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/match-cv.js <cv.json> <keywords.json>');
    console.error('');
    console.error('  cv.json       — structured CV data (matching cv.schema.json)');
    console.error('  keywords.json — JD keyword extraction output (matching keyword-output.schema.json)');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/match-cv.js data/cv_en.json applications/AGIL/keywords.json');
    process.exit(1);
  }

  const cvPath = path.resolve(args[0]);
  const keywordsPath = path.resolve(args[1]);

  // Read and parse CV
  let cvData;
  try {
    const cvRaw = fs.readFileSync(cvPath, 'utf8');
    cvData = JSON.parse(cvRaw);
  } catch (err) {
    console.error(`Error reading CV file "${cvPath}": ${err.message}`);
    process.exit(1);
  }

  // Read and parse keywords
  let jdKeywords;
  try {
    const kwRaw = fs.readFileSync(keywordsPath, 'utf8');
    jdKeywords = JSON.parse(kwRaw);
  } catch (err) {
    console.error(`Error reading keywords file "${keywordsPath}": ${err.message}`);
    process.exit(1);
  }

  // Basic validation
  if (!jdKeywords.hardKeywords && !jdKeywords.softKeywords) {
    console.error('Error: keywords file must contain at least hardKeywords or softKeywords arrays.');
    console.error('Expected format: keyword-output.schema.json (output of extractKeywords)');
    process.exit(2);
  }

  // Run matcher
  const result = matchCV(cvData, jdKeywords);

  // Pretty-print result
  console.log(JSON.stringify(result, null, 2));
}

main();
