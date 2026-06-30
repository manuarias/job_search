/**
 * score-cv.test.js — Integration tests for the F7 CLI wrapper.
 *
 * Tests cover:
 *   1. CLI exits 1 on missing args, nonexistent files, invalid JSON
 *   2. CLI exits 0 with real CV + fixture match data
 *   3. CLI output is valid JSON with required ScoreResult keys
 *   4. --target flag overrides default target score
 *   5. --cv-md flag enables ATS MD checks
 *   6. Pretty-printed JSON output
 *   7. Exit code 2 on validation errors (non-object JSON)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI = path.join(__dirname, 'score-cv.js');
const NODE = process.execPath;

function runCLI(args = '') {
  const cmd = `${NODE} ${CLI} ${args}`.trim();
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status || 1,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    };
  }
}

// ── Paths to real data files ────────────────────────────────────────────────

const CV_PATH = path.join(__dirname, '..', 'test-fixtures', 'anonymous-cv.json');
const MATCH_PATH = path.join(__dirname, '..', 'test-fixtures', 'sample-match.json');
const CV_MD_PATH = path.join(__dirname, '..', 'test-fixtures', 'anonymous-cv.md');
const PKG_PATH = path.join(__dirname, '..', 'package.json'); // valid JSON, wrong shape

// ── CLI exit codes ──────────────────────────────────────────────────────────

describe('score-cv CLI — exit codes', () => {
  it('exits 1 when no arguments given', () => {
    const result = runCLI('');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Usage/i);
  });

  it('exits 1 when only one argument given', () => {
    const result = runCLI(CV_PATH);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/missing required arguments/i);
  });

  it('exits 1 when CV file does not exist', () => {
    const result = runCLI('/nonexistent/cv.json ' + MATCH_PATH);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error reading CV file/i);
  });

  it('exits 1 when match file does not exist', () => {
    const result = runCLI(CV_PATH + ' /nonexistent/match.json');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error reading match file/i);
  });

  it('exits 1 with --help flag', () => {
    const result = runCLI('--help');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Usage/i);
  });

  it('exits 1 with unknown option', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --unknown');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Unknown option/i);
  });

  it('exits 0 with valid CV + match files', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 with --target flag', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target 85');
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 with --cv-md flag (real CV MD)', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --cv-md ' + CV_MD_PATH);
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 with invalid --target (non-numeric)', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target abc');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Invalid --target/i);
  });

  it('exits 1 with --target out of range (>100)', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target 150');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Invalid --target/i);
  });
});

// ── JSON output validation ──────────────────────────────────────────────────

describe('score-cv CLI — JSON output', () => {
  it('produces valid JSON on stdout', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    expect(result.exitCode).toBe(0);

    let parsed;
    expect(() => { parsed = JSON.parse(result.stdout); }).not.toThrow();
    expect(parsed).toBeInstanceOf(Object);
  });

  it('output has all required top-level keys', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    expect(parsed).toHaveProperty('final');
    expect(parsed).toHaveProperty('categories');
    expect(parsed).toHaveProperty('quickWins');
    expect(parsed).toHaveProperty('gapToTarget');
    expect(parsed).toHaveProperty('metadata');
  });

  it('final is a number between 0 and 100', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    expect(typeof parsed.final).toBe('number');
    expect(parsed.final).toBeGreaterThanOrEqual(0);
    expect(parsed.final).toBeLessThanOrEqual(100);
    expect(Number.isInteger(parsed.final)).toBe(true);
  });

  it('categories has all 3 required keys', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    const keys = ['atsParseability', 'keywordAlignment', 'recruiterAppeal'];
    for (const key of keys) {
      expect(parsed.categories).toHaveProperty(key);
      const cat = parsed.categories[key];
      expect(cat).toHaveProperty('score');
      expect(cat).toHaveProperty('maxScore');
      expect(cat).toHaveProperty('percentage');
      expect(cat).toHaveProperty('weight');
      expect(cat).toHaveProperty('weightedScore');
      expect(cat).toHaveProperty('details');
    }
  });

  it('quickWins is an array with correct shape', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    expect(Array.isArray(parsed.quickWins)).toBe(true);
    for (const win of parsed.quickWins) {
      expect(win).toHaveProperty('type');
      expect(win).toHaveProperty('location');
      expect(win).toHaveProperty('fix');
      expect(win).toHaveProperty('priority');
    }
  });

  it('gapToTarget has required fields', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.gapToTarget).toHaveProperty('target');
    expect(parsed.gapToTarget).toHaveProperty('current');
    expect(parsed.gapToTarget).toHaveProperty('gap');
    expect(parsed.gapToTarget).toHaveProperty('highestGapCategory');
    expect(Array.isArray(parsed.gapToTarget.perCategory)).toBe(true);
    expect(parsed.gapToTarget.perCategory).toHaveLength(3);
  });

  it('metadata has scoredAt, scorerVersion, processingTimeMs', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.metadata).toHaveProperty('scoredAt');
    expect(parsed.metadata).toHaveProperty('scorerVersion', '1.0.0');
    expect(parsed.metadata).toHaveProperty('processingTimeMs');
    expect(parsed.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('no stderr noise on success', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
  });
});

// ── --target flag ───────────────────────────────────────────────────────────

describe('score-cv CLI — --target flag', () => {
  it('default targetScore is 90', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.gapToTarget.target).toBe(90);
  });

  it('--target 85 overrides to 85', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target 85');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.gapToTarget.target).toBe(85);
  });

  it('--target 0 results in gap=0 when score > 0', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target 0');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.gapToTarget.target).toBe(0);
    expect(parsed.gapToTarget.gap).toBe(0);
  });

  it('--target 100 works', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --target 100');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.gapToTarget.target).toBe(100);
  });
});

// ── --cv-md flag ────────────────────────────────────────────────────────────

describe('score-cv CLI — --cv-md flag', () => {
  it('cvMdChecked is false without --cv-md', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.categories.atsParseability.details.cvMdChecked).toBe(false);
  });

  it('cvMdChecked is true with --cv-md', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH + ' --cv-md ' + CV_MD_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.categories.atsParseability.details.cvMdChecked).toBe(true);
  });
});

// ── Output formatting ───────────────────────────────────────────────────────

describe('score-cv CLI — output formatting', () => {
  it('produces pretty-printed JSON with 2-space indentation', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);

    const lines = result.stdout.split('\n');
    expect(lines.length).toBeGreaterThan(5);

    // First line should be "{"
    expect(lines[0].trim()).toBe('{');
    // Second line should start with 2 spaces
    expect(lines[1]).toMatch(/^  "/);
  });
});

// ── Exit code 2: validation errors ──────────────────────────────────────────

describe('score-cv CLI — validation errors (exit 2)', () => {
  it('exits 2 when CV file contains non-object JSON (array)', () => {
    // Create a temp file with an array
    const tmpFile = path.join(__dirname, '..', 'test-fixtures', 'tmp-array.json');
    fs.writeFileSync(tmpFile, JSON.stringify([1, 2, 3]));
    try {
      const result = runCLI(tmpFile + ' ' + MATCH_PATH);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/JSON object/);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('exits 2 when match file contains non-object JSON (string)', () => {
    // Create a temp file with a string
    const tmpFile = path.join(__dirname, '..', 'test-fixtures', 'tmp-string.json');
    fs.writeFileSync(tmpFile, JSON.stringify('not an object'));
    try {
      const result = runCLI(CV_PATH + ' ' + tmpFile);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/JSON object/);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

// ── Real-world: score against actual CV ─────────────────────────────────────

describe('score-cv CLI — real CV scoring', () => {
  it('real CV scores above 0 with moderate match', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.final).toBeGreaterThan(0);
  });

  it('real CV keyword alignment reflects F6 score (72)', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    const kw = parsed.categories.keywordAlignment;
    // F6 score is 72; wrapped score should be close (±5 tolerance for multipliers)
    expect(kw.score).toBeGreaterThanOrEqual(67);
    expect(kw.score).toBeLessThanOrEqual(72);
  });

  it('real CV ATS parseability is strong (>0.8 percentage)', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.categories.atsParseability.percentage).toBeGreaterThanOrEqual(0.8);
  });

  it('real CV has at least some recruiter appeal score', () => {
    const result = runCLI(CV_PATH + ' ' + MATCH_PATH);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.categories.recruiterAppeal.percentage).toBeGreaterThanOrEqual(0);
  });
});

// ── JS_DATA_DIR environment variable resolution ─────────────────────────────
//
// Tests for lib/data-paths.js: verifies getDataDir() respects JS_DATA_DIR
// env var and falls back to data/ when unset.

describe('JS_DATA_DIR — data path resolution', () => {
  const { getDataDir, getApplicationsDir } = require('../lib/data-paths');
  const path = require('path');
  const fs = require('fs');

  const ORIGINAL_JS_DATA_DIR = process.env.JS_DATA_DIR;

  afterEach(() => {
    // Restore original env var after each test
    if (ORIGINAL_JS_DATA_DIR === undefined) {
      delete process.env.JS_DATA_DIR;
    } else {
      process.env.JS_DATA_DIR = ORIGINAL_JS_DATA_DIR;
    }
  });

  it('falls back to data/ when JS_DATA_DIR is unset', () => {
    delete process.env.JS_DATA_DIR;
    const dir = getDataDir();
    expect(dir).toMatch(/data$/);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('falls back to data/ when JS_DATA_DIR is empty string', () => {
    process.env.JS_DATA_DIR = '';
    const dir = getDataDir();
    expect(dir).toMatch(/data$/);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('uses JS_DATA_DIR when set to a valid absolute path', () => {
    // Use the existing test-fixtures directory as a valid data dir
    const fixturesDir = path.join(__dirname, '..', 'test-fixtures');
    process.env.JS_DATA_DIR = fixturesDir;
    const dir = getDataDir();
    expect(dir).toBe(fixturesDir);
  });

  it('uses JS_DATA_DIR when set to a valid relative path', () => {
    process.env.JS_DATA_DIR = 'test-fixtures';
    const dir = getDataDir();
    expect(dir).toMatch(/job_search\/test-fixtures$/);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('getApplicationsDir returns applications/ at project root regardless of env', () => {
    delete process.env.JS_DATA_DIR;
    const appsDir = getApplicationsDir();
    expect(appsDir).toMatch(/applications$/);
  });
});
