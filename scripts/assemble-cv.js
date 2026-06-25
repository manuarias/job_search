#!/usr/bin/env node

/**
 * F8 Assemble CV — CLI entry point
 *
 * Usage:
 *   node scripts/assemble-cv.js <cv.json> <match.json> [--lang en|es]
 *
 * Reads a structured CV JSON file and a match result JSON file,
 * runs the CV assembler, and prints the resulting Markdown to stdout.
 *
 * Exit codes:
 *   0 — assembly completed successfully (valid Markdown to stdout)
 *   1 — usage error (missing files, file not found)
 *   2 — input validation error (invalid JSON, missing required fields)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { assembleCV } = require('../lib/assembler');

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  let cvPath;
  let matchPath;
  let lang = 'en';  // default

  // Parse args: <cv.json> <match.json> [--lang en|es]
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && i + 1 < args.length) {
      lang = args[i + 1];
      i++; // skip next
    } else if (!args[i].startsWith('--')) {
      positional.push(args[i]);
    }
  }

  if (positional.length < 2) {
    console.error('Usage: node scripts/assemble-cv.js <cv.json> <match.json> [--lang en|es]');
    console.error('');
    console.error('  cv.json     — structured CV data (matching cv.schema.json)');
    console.error('  match.json  — match result output (matching match-output.schema.json)');
    console.error('  --lang      — language selector: en (default) or es');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/assemble-cv.js data/cv_en.json applications/AGIL/match.json');
    console.error('  node scripts/assemble-cv.js data/cv_es.json applications/AGIL/match.json --lang es');
    process.exit(1);
  }

  cvPath = path.resolve(positional[0]);
  matchPath = path.resolve(positional[1]);

  // Validate --lang
  if (lang !== 'en' && lang !== 'es') {
    console.error(`Error: --lang must be "en" or "es", got "${lang}"`);
    process.exit(2);
  }

  // If --lang es, try to use cv_es.json (if the user didn't already pass it)
  let actualCvPath = cvPath;

  // Read and parse CV
  let cvData;
  try {
    const cvRaw = fs.readFileSync(actualCvPath, 'utf8');
    cvData = JSON.parse(cvRaw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: CV file not found: "${actualCvPath}"`);
      process.exit(1);
    }
    if (err instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in CV file "${actualCvPath}": ${err.message}`);
      process.exit(2);
    }
    console.error(`Error reading CV file "${actualCvPath}": ${err.message}`);
    process.exit(1);
  }

  // Validate CV has required fields
  if (!cvData.contact || !cvData.professionalSummary || !cvData.professionalExperience) {
    console.error('Error: CV file missing required fields (contact, professionalSummary, or professionalExperience).');
    console.error('Expected format: cv.schema.json');
    process.exit(2);
  }

  // Read and parse match result
  let matchResult;
  try {
    const matchRaw = fs.readFileSync(matchPath, 'utf8');
    matchResult = JSON.parse(matchRaw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Match file not found: "${matchPath}"`);
      process.exit(1);
    }
    if (err instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in match file "${matchPath}": ${err.message}`);
      process.exit(2);
    }
    console.error(`Error reading match file "${matchPath}": ${err.message}`);
    process.exit(1);
  }

  // Validate match result has required fields
  if (!matchResult.overall || !matchResult.scorers) {
    console.error('Error: match file missing required fields (overall or scorers).');
    console.error('Expected format: match-output.schema.json');
    process.exit(2);
  }

  // Run assembler
  const result = assembleCV(cvData, matchResult);

  // Print Markdown to stdout
  console.log(result.markdown);

  // Also print low-confidence warning to stderr if applicable
  if (result.lowConfidence) {
    console.error('⚠️  Warning: Low confidence match. Review output carefully.');
  }
}

main();
