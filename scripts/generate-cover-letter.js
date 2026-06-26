#!/usr/bin/env node

/**
 * F9 Generate Cover Letter — CLI entry point
 *
 * Usage:
 *   node scripts/generate-cover-letter.js <cv.json> <match.json> <jd.txt> [--threshold N] [--sections a,b,c]
 *
 * Reads a structured CV JSON file, an F6 match output JSON file, and a
 * raw JD text file, generates a cover letter skeleton with [INSERT: ...]
 * placeholders, and prints the result as formatted JSON.
 *
 * Exit codes:
 *   0 — generation completed successfully
 *   1 — usage error (missing args, file not found)
 *   2 — input validation error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { generateCoverLetter } = require('../lib/cover-letter');

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
    if (arg === '--threshold' && i + 1 < args.length) {
      const val = parseFloat(args[i + 1]);
      if (isNaN(val) || val < 0 || val > 1) {
        return { error: `Invalid --threshold value: "${args[i + 1]}". Must be a number 0–1 (e.g., 0.35).` };
      }
      options.refuseThreshold = val;
      i += 2;
    } else if (arg === '--sections' && i + 1 < args.length) {
      options.sections = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
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
  console.error('Usage: node scripts/generate-cover-letter.js <cv.json> <match.json> <jd.txt> [options]');
  console.error('');
  console.error('  cv.json    — structured CV data (matching cv.schema.json)');
  console.error('  match.json — F6 match output (matching match-output.schema.json)');
  console.error('  jd.txt     — raw job description text');
  console.error('');
  console.error('Options:');
  console.error('  --threshold N  — match percentage threshold below which to refuse (default: 0.35, range: 0–1)');
  console.error('  --sections a,b — comma-separated list of sections to include');
  console.error('                   Valid: opening, leadership, technical, mentoring, closing');
  console.error('                   Default: all 5');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/generate-cover-letter.js data/cv_en.json match-output.json jd.txt');
  console.error('  node scripts/generate-cover-letter.js data/cv_en.json match-output.json jd.txt --threshold 0.40');
  console.error('  node scripts/generate-cover-letter.js data/cv_en.json match-output.json jd.txt --sections opening,leadership,closing');
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const parsed = parseArgs(process.argv);

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

  if (positional.length < 3) {
    console.error('Error: missing required arguments. <cv.json>, <match.json>, and <jd.txt> are all required.');
    printUsage();
    process.exit(1);
  }

  const cvPath = path.resolve(positional[0]);
  const matchPath = path.resolve(positional[1]);
  const jdPath = path.resolve(positional[2]);

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

  // Read JD file
  let jdText;
  try {
    jdText = fs.readFileSync(jdPath, 'utf8');
  } catch (err) {
    console.error(`Error reading JD file "${jdPath}": ${err.message}`);
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

  if (typeof jdText !== 'string' || jdText.trim().length === 0) {
    console.error('Error: JD file must contain non-empty text.');
    process.exit(2);
  }

  // Validate --sections
  if (options.sections) {
    const valid = ['opening', 'leadership', 'technical', 'mentoring', 'closing'];
    const invalid = options.sections.filter(s => !valid.includes(s));
    if (invalid.length > 0) {
      console.error(`Warning: ignoring invalid section names: ${invalid.join(', ')}`);
      console.error(`Valid sections: ${valid.join(', ')}`);
    }
  }

  // Run generator
  const result = generateCoverLetter(cvData, matchResult, jdText, options);

  // Pretty-print result
  console.log(JSON.stringify(result, null, 2));

  // Non-zero exit if refused
  if (result.refused) {
    process.exit(2);
  }
}

main();
