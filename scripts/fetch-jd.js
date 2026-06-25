#!/usr/bin/env node

/**
 * F5 JD Fetcher — CLI wrapper
 *
 * Fetches a JD from a URL, saves it to applications/{REF}/job-description.md,
 * and appends a row to applications/jd-tracking.md.
 *
 * Usage: node scripts/fetch-jd.js <url>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { scrapeJD } = require('../lib/jd-scraper');

const APPS_DIR = path.resolve(__dirname, '..', 'applications');
const TRACKING = path.join(APPS_DIR, 'jd-tracking.md');

function usage() { console.error('Usage: node scripts/fetch-jd.js <url>'); process.exit(1); }

function appendTracking(ref, company, title) {
  const today = new Date().toISOString().slice(0, 10);
  const row = `| ${ref} | ${company} | ${title} | [JD](${ref}/job-description.md) | — | — | In Progress | ${today} | ${today} |`;

  const lines = fs.readFileSync(TRACKING, 'utf8').split('\n');
  if (lines.some(l => l.startsWith(`| ${ref} |`))) { console.error(`REF "${ref}" already exists.`); return; }

  // Insert after table header separator
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|-----|') && lines[i - 1].startsWith('| REF |')) { lines.splice(i + 1, 0, row); break; }
  }
  fs.writeFileSync(TRACKING, lines.join('\n'), 'utf8');
}

async function main() {
  const url = process.argv[2];
  if (!url) usage();
  if (!/^https?:\/\//i.test(url)) { console.error('Error: provide a URL (https://...)'); process.exit(1); }

  let r;
  try { r = await scrapeJD(url); }
  catch (e) { console.error(`Scrape failed: ${e.message}`); process.exit(1); }

  console.error(`Source: ${r.source} | Company: ${r.company} | REF: ${r.ref}`);

  const dir = path.join(APPS_DIR, r.ref);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const out = `# ${r.title}\n\n${r.markdown}`;
  fs.writeFileSync(path.join(dir, 'job-description.md'), out, 'utf8');
  console.error(`Saved: ${dir}/job-description.md`);

  appendTracking(r.ref, r.company, r.title);
  console.error('Done.');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
