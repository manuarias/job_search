#!/usr/bin/env node

/**
 * F7 Score CV — CLI entry point
 *
 * Usage:
 *   node scripts/score-cv.js <cv.json> <match.json> [--target N] [--cv-md path] [--lang en|es]
 *
 * Reads a structured CV JSON file and an F6 match output JSON file,
 * runs the 3-category scoring rubric (ATS 40%, Keyword 30%, Recruiter 30%),
 * and prints the result as formatted JSON.
 *
 * Exit codes:
 *   0 — scoring completed successfully
 *   1 — usage error (missing args, file not found)
 *   2 — input validation error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { scoreCV } = require('../lib/scorer');

// ── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);

  // No arguments at all → show usage
  if (args.length === 0) {
    return { help: true };
  }

  const positional = [];
  const options = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === '--target' && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (isNaN(val) || val < 0 || val > 100) {
        return { error: `Invalid --target value: "${args[i + 1]}". Must be an integer 0–100.` };
      }
      options.targetScore = val;
      i += 2;
    } else if (arg === '--cv-md' && i + 1 < args.length) {
      options.cvMdPath = args[i + 1];
      i += 2;
    } else if (arg === '--lang' && i + 1 < args.length) {
      const langVal = args[i + 1];
      if (langVal !== 'en' && langVal !== 'es') {
        return { error: `Invalid --lang value: "${langVal}". Must be "en" or "es".` };
      }
      options.lang = langVal;
      i += 2;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else if (arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}` };
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { positional, options };
}

function printUsage() {
  console.error('Usage: node scripts/score-cv.js <cv.json> <match.json> [--target N] [--cv-md path] [--lang en|es]');
  console.error('');
  console.error('  cv.json      — structured CV data (matching cv.schema.json)');
  console.error('  match.json   — F6 match output (matching match-output.schema.json)');
  console.error('');
  console.error('Options:');
  console.error('  --target N   — target score for gap analysis (default: 90, range: 0–100)');
  console.error('  --cv-md path — path to rendered CV Markdown for ATS MD checks');
  console.error('  --lang en|es — language selector: en (default) or es');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/score-cv.js data/cv_en.json match-output.json --target 85');
  console.error('  node scripts/score-cv.js data/cv_es.json match-output.json --lang es');
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const parsed = parseArgs(process.argv);

  // Explicit help request (--help, -h, or no args at all)
  if (parsed.help) {
    printUsage();
    process.exit(1);
  }

  if (parsed.error) {
    console.error(`Error: ${parsed.error}`);
    printUsage();
    process.exit(1);
  }

  const { positional, options } = parsed;

  // Not enough positional arguments
  if (positional.length < 2) {
    console.error('Error: missing required arguments. Both <cv.json> and <match.json> are required.');
    printUsage();
    process.exit(1);
  }

  const cvPath = path.resolve(positional[0]);
  const matchPath = path.resolve(positional[1]);

  // Read CV file
  let cvData;
  try {
    const cvRaw = fs.readFileSync(cvPath, 'utf8');
    cvData = JSON.parse(cvRaw);
  } catch (err) {
    console.error(`Error reading CV file "${cvPath}": ${err.message}`);
    process.exit(1);
  }

  // Read match file
  let matchResult;
  try {
    const matchRaw = fs.readFileSync(matchPath, 'utf8');
    matchResult = JSON.parse(matchRaw);
  } catch (err) {
    console.error(`Error reading match file "${matchPath}": ${err.message}`);
    process.exit(1);
  }

  // Input validation
  if (typeof cvData !== 'object' || cvData === null || Array.isArray(cvData)) {
    console.error('Error: CV file must contain a JSON object.');
    console.error('Expected format: cv.schema.json');
    process.exit(2);
  }

  if (typeof matchResult !== 'object' || matchResult === null || Array.isArray(matchResult)) {
    console.error('Error: match file must contain a JSON object.');
    console.error('Expected format: match-output.schema.json');
    process.exit(2);
  }

  // Resolve --cv-md to absolute path if provided
  const scorerOptions = { ...options };
  if (scorerOptions.cvMdPath) {
    scorerOptions.cvMdPath = path.resolve(scorerOptions.cvMdPath);
  }

  // Run scorer
  const result = scoreCV(cvData, matchResult, scorerOptions);

  // Pretty-print result
  console.log(JSON.stringify(result, null, 2));
}

main();
