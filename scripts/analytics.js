#!/usr/bin/env node

/**
 * F10 Analytics — CLI entry point
 *
 * Usage:
 *   node scripts/analytics.js
 *
 * Reads `applications/jd-tracking.md`, runs all analyzers (score distribution,
 * keyword correlation, threshold analysis), and writes `applications/ANALYTICS.md`.
 *
 * Exit codes:
 *   0 — report generated successfully
 *   1 — critical error (tracking file missing, no data)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  migrateTracking,
  analyzeScores,
  correlateKeywords,
  analyzeThresholds,
  generateReport,
} = require('../lib/analytics');

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, '..');
const TRACKING_PATH = path.join(ROOT, 'applications', 'jd-tracking.md');
const APPS_DIR = path.join(ROOT, 'applications');
const REPORT_PATH = path.join(APPS_DIR, 'ANALYTICS.md');

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  // 1. Migrate tracking data
  if (!fs.existsSync(TRACKING_PATH)) {
    console.error(`Error: tracking file not found at "${TRACKING_PATH}"`);
    process.exit(1);
  }

  const { tracking, errors: migrateErrors } = migrateTracking(TRACKING_PATH);

  if (migrateErrors.length > 0) {
    console.error('Migration warnings:');
    for (const err of migrateErrors) {
      console.error(`  - ${err}`);
    }
  }

  if (tracking.length === 0) {
    console.error('Error: no application entries found in jd-tracking.md');
    process.exit(1);
  }

  console.log(`Parsed ${tracking.length} application entries from jd-tracking.md`);

  // 2. Analyze scores
  const scores = analyzeScores(tracking);
  if (scores.warnings.length > 0) {
    for (const w of scores.warnings) console.warn(`  ⚠ ${w}`);
  }

  // 3. Correlate keywords
  const { correlations, warnings: kwWarnings } = correlateKeywords(tracking, APPS_DIR);
  if (kwWarnings.length > 0) {
    for (const w of kwWarnings) console.warn(`  ⚠ ${w}`);
  }

  // 4. Analyze thresholds
  const { thresholds, warnings: thWarnings } = analyzeThresholds(tracking);
  if (thWarnings.length > 0) {
    for (const w of thWarnings) console.warn(`  ⚠ ${w}`);
  }

  // 5. Generate report
  const report = generateReport({ scores, correlations, thresholds, tracking });

  fs.writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(`Report written to ${REPORT_PATH}`);
}

main();
