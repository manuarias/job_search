#!/usr/bin/env node

/**
 * Hermes — JD-to-CV Pipeline Orchestrator
 *
 * Chains the full optimization pipeline: scrape → extract → match →
 * score → assemble → cover letter. Filesystem-based state survives
 * crashes and enables resume.
 *
 * Usage:
 *   node scripts/hermes.js <jd-url-or-text> [--lang en|es] [--interactive] [--pdf]
 *   node scripts/hermes.js --batch <file.txt> [--lang en|es] [--pdf]
 *
 * Zero new dependencies — direct require() imports, no child_process.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Library imports ───────────────────────────────────────────────────────
const { scrapeJD, generateRef } = require('../lib/jd-scraper');
const { extractKeywords } = require('../lib/keyword-extractor');
const { matchCV } = require('../lib/matcher');
const { scoreCV } = require('../lib/scorer');
const { assembleCV } = require('../lib/assembler');
const { generateCoverLetter } = require('../lib/cover-letter');

// ── Paths ─────────────────────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '..');
const APPS_DIR = path.join(PROJECT_ROOT, 'applications');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const TRACKING_MD = path.join(APPS_DIR, 'jd-tracking.md');
const TRACKING_JSON = path.join(DATA_DIR, 'jd-tracking.json');
const CV_EN = path.join(DATA_DIR, 'cv_en.json');
const CV_ES = path.join(DATA_DIR, 'cv_es.json');
const STATE_FILE = '.hermes-state.json';

// ── Spanish signal words for language detection ───────────────────────────
const SPANISH_SIGNALS = [
  'experiencia', 'requisitos', 'buscamos', 'ofrecemos', 'conocimientos',
  'responsabilidades', 'funciones', 'beneficios', 'postulación', 'empleo',
  'trabajo', 'empresa', 'equipo', 'desarrollo', 'años', 'mínimo',
  'deseable', 'excluyente', 'valoramos', 'ofrecemos',
];

// ── Argument parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return { help: true };

  const opts = { lang: null, interactive: false, batch: null, pdf: false };
  const positional = [];
  let i = 0;

  while (i < args.length) {
    const a = args[i];
    if (a === '--lang' && i + 1 < args.length) {
      opts.lang = args[i + 1];
      i += 2;
    } else if (a === '--interactive' || a === '-i') {
      opts.interactive = true;
      i++;
    } else if (a === '--batch' && i + 1 < args.length) {
      opts.batch = args[i + 1];
      i += 2;
    } else if (a === '--pdf') {
      opts.pdf = true;
      i++;
    } else if (a === '--help' || a === '-h') {
      return { help: true };
    } else if (a.startsWith('--')) {
      return { error: `Unknown option: ${a}` };
    } else {
      positional.push(a);
      i++;
    }
  }

  return { positional, opts };
}

function printUsage() {
  console.error('Usage: node scripts/hermes.js <jd-url-or-text> [options]');
  console.error('       node scripts/hermes.js --batch <file.txt> [options]');
  console.error('');
  console.error('Chains the full CV optimization pipeline from JD input to final artifacts.');
  console.error('');
  console.error('Options:');
  console.error('  --lang en|es     Force output language (default: auto-detect from JD)');
  console.error('  --interactive    Step-by-step approval mode (y/n/q after each step)');
  console.error('  --batch <file>   Process a file with one JD URL per line');
  console.error('  --pdf            Generate PDF after CV assembly (requires build-cv.js)');
  console.error('  --help, -h       Show this help');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/hermes.js https://boards.greenhouse.io/...');
  console.error('  node scripts/hermes.js "We are looking for a Senior Engineer..."');
  console.error('  node scripts/hermes.js --batch urls.txt --lang en');
  console.error('  node scripts/hermes.js https://... --interactive --pdf');
}

// ── Language detection ────────────────────────────────────────────────────

function detectLanguage(text) {
  const lower = text.toLowerCase();
  let spanishHits = 0;
  for (const sig of SPANISH_SIGNALS) {
    if (lower.includes(sig)) spanishHits++;
  }
  return spanishHits >= 3 ? 'es' : 'en';
}

// ── State management ──────────────────────────────────────────────────────

function loadState(dir) {
  const p = path.join(dir, STATE_FILE);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function saveState(dir, state) {
  const p = path.join(dir, STATE_FILE);
  fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
}

function initState(ref, company, role, lang, input, dir) {
  return {
    version: '1',
    ref,
    company,
    role,
    lang,
    input,
    dir,
    steps: {},
    createdAt: new Date().toISOString(),
  };
}

function stepDone(state, stepName) {
  state.steps[stepName] = { status: 'done', ts: new Date().toISOString() };
}

function stepPending(state, stepName) {
  return !state.steps[stepName] || state.steps[stepName].status !== 'done';
}

// ── CV data loading ───────────────────────────────────────────────────────

function loadCVData(lang) {
  const cvPath = lang === 'es' ? CV_ES : CV_EN;
  const raw = fs.readFileSync(cvPath, 'utf8');
  return JSON.parse(raw);
}

// ── Tracking update ───────────────────────────────────────────────────────

function appendTrackingMd(ref, company, role) {
  const today = new Date().toISOString().slice(0, 10);
  const row = `| ${ref} | ${company} | ${role} | [JD](${ref}/job-description.md) | [CV](${ref}/arias_emanuel-en-${ref}.md) | — | In Progress | ${today} | ${today} |`;

  const lines = fs.readFileSync(TRACKING_MD, 'utf8').split('\n');
  // Check if already exists
  if (lines.some(l => l.startsWith(`| ${ref} |`))) return;

  // Insert after table header separator (first row after the header that has |---)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|-----') || lines[i].startsWith('| ---')) {
      // Find the data rows — insert after the separator, before any existing rows
      lines.splice(i + 1, 0, row);
      break;
    }
  }
  fs.writeFileSync(TRACKING_MD, lines.join('\n'), 'utf8');
}

function updateTrackingScore(ref, score) {
  const lines = fs.readFileSync(TRACKING_MD, 'utf8').split('\n');
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`| ${ref} |`)) {
      const cells = lines[i].split('|');
      if (cells.length >= 9) {
        cells[6] = ` ${Math.round(score)}/100 `;    // Score column
        cells[9] = ` ${today} |`;                     // Updated column
      }
      lines[i] = cells.join('|');
      break;
    }
  }
  fs.writeFileSync(TRACKING_MD, lines.join('\n'), 'utf8');
}

function updateTrackingJson(ref, company, role, score, status) {
  let tracking;
  try {
    tracking = JSON.parse(fs.readFileSync(TRACKING_JSON, 'utf8'));
  } catch {
    tracking = [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = tracking.find(e => e.ref === ref);
  if (existing) {
    if (score !== null) existing.score = score;
    existing.status = status || existing.status;
    existing.updated = today;
  } else {
    tracking.push({
      ref,
      company,
      role,
      score: score !== null ? Math.round(score) : null,
      status: status || 'In Progress',
      created: today,
      updated: today,
    });
  }
  fs.writeFileSync(TRACKING_JSON, JSON.stringify(tracking, null, 2) + '\n', 'utf8');
}

// ── Pipeline steps ────────────────────────────────────────────────────────

async function stepScrape(input, dir, state) {
  console.error(`[1/6] Scraping JD${/^https?:\/\//i.test(input) ? ' from URL' : ' from text'}...`);
  const result = await scrapeJD(input);
  console.error(`      REF: ${result.ref} | Company: ${result.company} | Role: ${result.title}`);

  // Ensure directory exists
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Save JD
  const jdPath = path.join(dir, 'job-description.md');
  const jdMd = `# ${result.title}\n\n${result.markdown}`;
  fs.writeFileSync(jdPath, jdMd, 'utf8');
  console.error(`      Saved: ${jdPath}`);

  return result;
}

function stepExtract(state) {
  console.error('[2/6] Extracting keywords...');
  const jdPath = path.join(state.dir, 'job-description.md');
  const jdText = fs.readFileSync(jdPath, 'utf8');
  const keywords = extractKeywords(jdText);

  const kwPath = path.join(state.dir, 'keywords.json');
  fs.writeFileSync(kwPath, JSON.stringify(keywords, null, 2), 'utf8');
  console.error(`      Extracted ${keywords.hardKeywords.length} hard + ${keywords.softKeywords.length} soft keywords`);
  console.error(`      Saved: ${kwPath}`);

  return keywords;
}

function stepMatch(state) {
  console.error('[3/6] Matching CV against JD keywords...');
  const cvData = loadCVData(state.lang);
  const kwPath = path.join(state.dir, 'keywords.json');
  const keywords = JSON.parse(fs.readFileSync(kwPath, 'utf8'));
  const matchResult = matchCV(cvData, keywords);

  const matchPath = path.join(state.dir, 'match.json');
  fs.writeFileSync(matchPath, JSON.stringify(matchResult, null, 2), 'utf8');
  console.error(`      Overall match: ${matchResult.overall.score}/100 (${matchResult.recommendation.level})`);
  console.error(`      Saved: ${matchPath}`);

  return matchResult;
}

function stepScore(state) {
  console.error('[4/6] Scoring CV...');
  const cvData = loadCVData(state.lang);
  const matchPath = path.join(state.dir, 'match.json');
  const matchResult = JSON.parse(fs.readFileSync(matchPath, 'utf8'));
  const scoreResult = scoreCV(cvData, matchResult, { lang: state.lang });

  const scorePath = path.join(state.dir, 'score.json');
  fs.writeFileSync(scorePath, JSON.stringify(scoreResult, null, 2), 'utf8');
  console.error(`      Final score: ${scoreResult.final}/100`);
  console.error(`      Saved: ${scorePath}`);

  return scoreResult;
}

function stepAssemble(state) {
  console.error('[5/6] Assembling optimized CV...');
  const cvData = loadCVData(state.lang);
  const matchPath = path.join(state.dir, 'match.json');
  const matchResult = JSON.parse(fs.readFileSync(matchPath, 'utf8'));
  const assembled = assembleCV(cvData, matchResult);

  const cvName = `arias_emanuel-${state.lang}-${state.ref}.md`;
  const cvPath = path.join(state.dir, cvName);
  fs.writeFileSync(cvPath, assembled.markdown, 'utf8');
  console.error(`      Saved: ${cvPath}`);
  if (assembled.lowConfidence) {
    console.error('      ⚠️  Low confidence — review output carefully.');
  }

  return assembled;
}

function stepCover(state) {
  console.error('[6/6] Generating cover letter...');
  const cvData = loadCVData(state.lang);
  const matchPath = path.join(state.dir, 'match.json');
  const matchResult = JSON.parse(fs.readFileSync(matchPath, 'utf8'));
  const jdPath = path.join(state.dir, 'job-description.md');
  const jdText = fs.readFileSync(jdPath, 'utf8');
  const coverResult = generateCoverLetter(cvData, matchResult, jdText);

  const coverPath = path.join(state.dir, 'cover-letter.md');
  if (coverResult.refused) {
    const msg = `⚠️ Cover letter refused: ${coverResult.reason}`;
    fs.writeFileSync(coverPath, msg + '\n', 'utf8');
    console.error(`      ${msg}`);
  } else {
    let md = '# Cover Letter\n\n';
    for (const p of coverResult.paragraphs) {
      md += `## ${p.label}\n\n${p.template}\n\n`;
    }
    fs.writeFileSync(coverPath, md, 'utf8');
    console.error(`      Saved: ${coverPath}`);
  }

  return coverResult;
}

// ── PDF generation ────────────────────────────────────────────────────────

async function stepPdf(state) {
  console.error('[PDF] Generating PDF...');
  try {
    const { buildCV } = require('../pdf-builder/build-cv');
    const cvName = `arias_emanuel-${state.lang}-${state.ref}.md`;
    const cvPath = path.join(state.dir, cvName);
    const outPath = path.join(state.dir, `arias_emanuel-${state.lang}-${state.ref}.pdf`);
    await buildCV(cvPath, outPath);
    console.error(`      Saved: ${outPath}`);
  } catch (e) {
    console.error(`      PDF generation failed: ${e.message}`);
    console.error('      (PDF requires playwright — install with: npm install)');
  }
}

// ── Interactive prompt ────────────────────────────────────────────────────

function askContinue(rl, stepName) {
  return new Promise(resolve => {
    rl.question(`  [${stepName}] Continue? (y/n/q) `, answer => {
      const a = answer.trim().toLowerCase();
      if (a === 'y' || a === 'yes' || a === '') resolve(true);
      else if (a === 'n' || a === 'no') resolve(false);
      else if (a === 'q' || a === 'quit') resolve('quit');
      else {
        console.error('  Please answer y (yes), n (no), or q (quit).');
        resolve(askContinue(rl, stepName));
      }
    });
  });
}

// ── Main pipeline (single JD) ─────────────────────────────────────────────

async function runPipeline(input, opts) {
  // Step 0: Scrape to determine REF and dir
  const scrapeResult = await scrapeJD(input);
  const ref = scrapeResult.ref;
  const dir = path.join(APPS_DIR, ref);

  // Detect or force language
  const lang = opts.lang || detectLanguage(scrapeResult.markdown);

  // Initialize or resume state
  let state = loadState(dir);
  if (state) {
    console.error(`Resuming existing pipeline for ${ref}...`);
    state.lang = opts.lang || state.lang; // allow lang override on resume
  } else {
    state = initState(ref, scrapeResult.company, scrapeResult.title, lang, input, dir);
  }

  // Save JD if not already done
  if (stepPending(state, 'scrape')) {
    // Already scraped above — save JD
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const jdMd = `# ${scrapeResult.title}\n\n${scrapeResult.markdown}`;
    fs.writeFileSync(path.join(dir, 'job-description.md'), jdMd, 'utf8');
    stepDone(state, 'scrape');
    saveState(dir, state);
  }

  // Append tracking row if new
  appendTrackingMd(ref, scrapeResult.company, scrapeResult.title);

  // Interactive mode setup
  let rl = null;
  if (opts.interactive) {
    rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    console.error(`\n  REF: ${ref} | ${scrapeResult.company} | ${scrapeResult.title}`);
    console.error(`  Language: ${lang}\n`);
  }

  const steps = [
    { name: 'extract', fn: () => stepExtract(state) },
    { name: 'match', fn: () => stepMatch(state) },
    { name: 'score', fn: () => stepScore(state) },
    { name: 'assemble', fn: () => stepAssemble(state) },
    { name: 'cover', fn: () => stepCover(state) },
  ];

  for (const s of steps) {
    if (!stepPending(state, s.name)) {
      console.error(`[${s.name}] Already done — skipping.`);
      continue;
    }

    if (opts.interactive && rl) {
      const answer = await askContinue(rl, s.name);
      if (answer === 'quit') {
        console.error('\nPipeline paused. Resume with:');
        console.error(`  node scripts/hermes.js "${input}"`);
        if (rl) rl.close();
        return { state, status: 'paused' };
      }
      if (answer === false) {
        console.error(`  Skipping ${s.name}.`);
        continue;
      }
    }

    s.fn();
    stepDone(state, s.name);
    saveState(dir, state);
  }

  // Update tracking with score
  try {
    const scorePath = path.join(dir, 'score.json');
    const scoreResult = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
    updateTrackingScore(ref, scoreResult.final);
    updateTrackingJson(ref, scrapeResult.company, scrapeResult.title, scoreResult.final, 'Ready');
  } catch {
    // Score may not exist if skipped
  }

  // PDF generation
  if (opts.pdf) {
    await stepPdf(state);
  }

  if (rl) rl.close();

  // Print summary
  console.error(`\n✅ Pipeline complete for ${ref}`);
  console.error(`   Dir: ${dir}`);
  console.error(`   Files:`);
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  for (const f of files.sort()) {
    console.error(`     - ${f}`);
  }

  return { state, status: 'done' };
}

// ── Batch runner ──────────────────────────────────────────────────────────

async function runBatch(batchFile, opts) {
  const urls = fs.readFileSync(batchFile, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));

  if (urls.length === 0) {
    console.error('Error: batch file is empty.');
    process.exit(1);
  }

  console.error(`Batch mode: ${urls.length} JD(s) to process.\n`);

  const results = [];
  for (let i = 0; i < urls.length; i++) {
    console.error(`── Batch ${i + 1}/${urls.length} ──`);
    try {
      const result = await runPipeline(urls[i], opts);
      results.push({ url: urls[i], status: result.status });
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
      results.push({ url: urls[i], status: 'error', error: e.message });
    }
    console.error();
  }

  // Batch summary
  console.error('── Batch Summary ──');
  for (const r of results) {
    const icon = r.status === 'done' ? '✅' : r.status === 'paused' ? '⏸️' : '❌';
    console.error(`  ${icon} ${r.url} — ${r.status}`);
  }
}

// ── Main entry ────────────────────────────────────────────────────────────

async function main() {
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

  const { positional, opts } = parsed;

  // Batch mode
  if (opts.batch) {
    await runBatch(opts.batch, opts);
    process.exit(0);
  }

  // Single mode — need input
  if (positional.length === 0) {
    console.error('Error: no JD URL or text provided.');
    printUsage();
    process.exit(1);
  }

  // Validate --lang
  if (opts.lang && opts.lang !== 'en' && opts.lang !== 'es') {
    console.error('Error: --lang must be "en" or "es".');
    process.exit(1);
  }

  const input = positional.join(' ');
  await runPipeline(input, opts);
  process.exit(0);
}

// ── CLI entry guard ───────────────────────────────────────────────────
if (require.main === module) {
  main().catch(e => {
    console.error(`Fatal: ${e.message}`);
    process.exit(1);
  });
}

// ── Exports for testing ───────────────────────────────────────────────────
module.exports = { parseArgs, detectLanguage, SPANISH_SIGNALS };
