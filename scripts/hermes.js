#!/usr/bin/env node

/**
 * Hermes — JD-to-CV Pipeline Orchestrator (CLI Wrapper)
 *
 * Thin CLI layer over lib/hermes.js. Parses arguments and delegates
 * pipeline execution to the library.
 *
 * Usage:
 *   node scripts/hermes.js <jd-url-or-text> [--lang en|es] [--interactive] [--pdf]
 *   node scripts/hermes.js --batch <file.txt> [--lang en|es] [--pdf]
 */

'use strict';

const fs = require('fs');
const { runPipeline, runBatch } = require('../lib/hermes');

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
    const urls = fs.readFileSync(opts.batch, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));

    if (urls.length === 0) {
      console.error('Error: batch file is empty.');
      process.exit(1);
    }

    await runBatch(urls, opts);
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
  const result = await runPipeline(input, opts);

  if (result.status === 'done') {
    console.error(`\n✅ Pipeline complete for ${result.ref}`);
    console.error(`   Dir: ${result.dir}`);
    console.error(`   Files:`);
    const files = result.files || [];
    for (const f of files) {
      console.error(`     - ${f}`);
    }
  }

  process.exit(result.status === 'error' ? 1 : 0);
}

// ── CLI entry guard ───────────────────────────────────────────────────
if (require.main === module) {
  main().catch(e => {
    if (e.code === 'SEARCH_RESULTS_PAGE') {
      // Error message is already formatted — print directly without "Fatal:" prefix
      console.error(e.message);
      process.exit(1);
    }
    console.error(`Fatal: ${e.message}`);
    process.exit(1);
  });
}

// ── Exports for testing ───────────────────────────────────────────────────
module.exports = { parseArgs };
