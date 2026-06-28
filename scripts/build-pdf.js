#!/usr/bin/env node

/**
 * CLI: Build a professional A4 PDF CV from structured JSON data.
 *
 * Usage:
 *   node scripts/build-pdf.js <ref> [--lang en|es]
 *
 * Example:
 *   node scripts/build-pdf.js AGIL --lang en
 *
 * Resolves data/cv_{lang}.json and applications/{ref}/match.json then calls
 * pdfBuilder() to produce applications/{ref}/arias_emanuel-{lang}-{ref}.pdf.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { pdfBuilder } = require('../lib/pdf-builder');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const args = process.argv.slice(2);

  // Parse arguments: <ref> [--lang en|es]
  let ref = null;
  let lang = 'en';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && i + 1 < args.length) {
      lang = args[++i];
    } else if (!ref && !args[i].startsWith('--')) {
      ref = args[i];
    }
  }

  // Validate ref
  if (!ref) {
    console.error('Usage: node scripts/build-pdf.js <ref> [--lang en|es]');
    console.error('');
    console.error('  <ref>       Application reference code (e.g. AGIL)');
    console.error('  --lang      Language: en (default) or es');
    process.exit(1);
  }

  // Validate lang
  if (lang !== 'en' && lang !== 'es') {
    console.error(`Unsupported language: ${lang}. Supported: en, es`);
    process.exit(1);
  }

  // Resolve paths
  const cvPath = path.join(PROJECT_ROOT, 'data', `cv_${lang}.json`);
  const appDir = path.join(PROJECT_ROOT, 'applications', ref);

  if (!fs.existsSync(appDir)) {
    console.error(`Application directory not found: ${appDir}`);
    console.error('Make sure the ref is correct and the folder exists under applications/.');
    process.exit(1);
  }

  // Load CV data
  let cvData;
  try {
    cvData = JSON.parse(fs.readFileSync(cvPath, 'utf8'));
  } catch (e) {
    console.error(`Failed to load CV data from ${cvPath}: ${e.message}`);
    process.exit(1);
  }

  // Load match result (optional — clean CV if missing)
  let matchResult = null;
  const matchPath = path.join(appDir, 'match.json');
  if (fs.existsSync(matchPath)) {
    try {
      matchResult = JSON.parse(fs.readFileSync(matchPath, 'utf8'));
      console.error(`Loaded match data from ${matchPath}`);
    } catch (e) {
      console.error(`Warning: failed to parse match.json: ${e.message}`);
    }
  } else {
    console.error('No match.json found — generating clean CV without JD optimization');
  }

  // Output path
  const outPath = path.join(appDir, `arias_emanuel-${lang}-${ref}.pdf`);

  // Build PDF
  pdfBuilder(cvData, matchResult, outPath)
    .then(() => {
      const htmlPath = outPath.replace(/\.pdf$/i, '.html');
      console.error(`✅ PDF generated: ${outPath}`);
      console.error(`   HTML (debug): ${htmlPath}`);
    })
    .catch(err => {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    });
}

main();
