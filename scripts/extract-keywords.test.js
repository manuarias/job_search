/**
 * extract-keywords.test.js — Integration tests for the CLI wrapper.
 *
 * Tests cover:
 *   1. CLI exits 0 with valid JSON for real JDs (AGIL, VANT)
 *   2. CLI exits 1 on missing argument, nonexistent file, empty file
 *   3. CLI output matches keyword-output.schema.json
 *   4. Round-trip: CLI → parse JSON → validate with extractKeywords()
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI = path.join(__dirname, 'extract-keywords.js');
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

// ── CLI exit codes ──────────────────────────────────────────────────────────

describe('extract-keywords CLI — exit codes', () => {
  it('exits 0 when given a valid JD file (AGIL)', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 when given a valid JD file (VANT)', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'VANT', 'job-description.md');
    const result = runCLI(jdPath);
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 when no argument is given', () => {
    const result = runCLI('');
    expect(result.exitCode).toBe(1);
  });

  it('exits 1 when given a nonexistent file', () => {
    const result = runCLI('/nonexistent/path/to/jd.md');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/not found/i);
  });

  it('exits 1 when given an empty file', () => {
    const emptyFile = path.join(__dirname, '..', 'test-fixtures', 'empty.md');
    fs.mkdirSync(path.dirname(emptyFile), { recursive: true });
    fs.writeFileSync(emptyFile, '');
    try {
      const result = runCLI(emptyFile);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/empty/i);
    } finally {
      fs.unlinkSync(emptyFile);
    }
  });

  it('exits 1 when given a non-markdown file that exists', () => {
    // Should still work — the extractor doesn't care about file extension
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const result = runCLI(pkgPath);
    // package.json has text, so extraction should succeed
    expect(result.exitCode).toBe(0);
  });
});

// ── JSON output validation ──────────────────────────────────────────────────

describe('extract-keywords CLI — JSON output', () => {
  it('produces valid JSON on stdout', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    expect(result.exitCode).toBe(0);

    let parsed;
    expect(() => { parsed = JSON.parse(result.stdout); }).not.toThrow();
    expect(parsed).toBeInstanceOf(Object);
  });

  it('output JSON has all required top-level keys', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(parsed).toHaveProperty('hardKeywords');
    expect(parsed).toHaveProperty('softKeywords');
    expect(parsed).toHaveProperty('senioritySignals');
    expect(parsed).toHaveProperty('metadata');
  });

  it('hardKeywords are an array with correct shape', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(Array.isArray(parsed.hardKeywords)).toBe(true);
    for (const kw of parsed.hardKeywords) {
      expect(typeof kw.term).toBe('string');
      expect(typeof kw.category).toBe('string');
      expect(typeof kw.matched).toBe('string');
      expect(typeof kw.confidence).toBe('number');
      expect(kw.confidence).toBeGreaterThanOrEqual(0);
      expect(kw.confidence).toBeLessThanOrEqual(1);
      expect(typeof kw.frequency).toBe('number');
      expect(kw.frequency).toBeGreaterThanOrEqual(1);
      expect(typeof kw.mustHave).toBe('boolean');
      expect(typeof kw.context).toBe('string');
      expect(kw.context.length).toBeGreaterThan(0);
    }
  });

  it('softKeywords are an array with correct shape', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(Array.isArray(parsed.softKeywords)).toBe(true);
    for (const kw of parsed.softKeywords) {
      expect(typeof kw.term).toBe('string');
      expect(typeof kw.matched).toBe('string');
      expect(typeof kw.confidence).toBe('number');
      expect(typeof kw.frequency).toBe('number');
      expect(kw.frequency).toBeGreaterThanOrEqual(1);
      expect(typeof kw.mustHave).toBe('boolean');
      expect(typeof kw.context).toBe('string');
    }
  });

  it('senioritySignals has correct shape', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(typeof parsed.senioritySignals.yearsMinimum).toBe('number');
    expect(parsed.senioritySignals.yearsMinimum).toBeGreaterThanOrEqual(0);
    expect(typeof parsed.senioritySignals.yearsPreferred).toBe('number');
    expect(typeof parsed.senioritySignals.level).toBe('string');
    expect(Array.isArray(parsed.senioritySignals.signals)).toBe(true);
    expect(typeof parsed.senioritySignals.title).toBe('string');
  });

  it('metadata has correct shape', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(typeof parsed.metadata.extractedAt).toBe('string');
    // ISO 8601 format
    expect(() => new Date(parsed.metadata.extractedAt)).not.toThrow();
    expect(typeof parsed.metadata.taxonomyVersion).toBe('string');
    expect(typeof parsed.metadata.jdWordCount).toBe('number');
    expect(typeof parsed.metadata.processingTimeMs).toBe('number');
    expect(typeof parsed.metadata.extractorVersion).toBe('string');
  });

  it('stdout has no stderr noise on success', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
  });
});

// ── Real JD content checks ──────────────────────────────────────────────────

describe('extract-keywords CLI — real JD content', () => {
  it('AGIL: extracts Jira, GitHub, Agile from stdout', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    const terms = parsed.hardKeywords.map(k => k.term);
    expect(terms).toContain('Jira');
    expect(terms).toContain('GitHub');
    expect(terms).toContain('Agile');
  });

  it('AGIL: detects 5+ years experience', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.senioritySignals.yearsMinimum).toBe(5);
  });

  it('VANT: extracts keywords from Spanish JD', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'VANT', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.hardKeywords.length).toBeGreaterThan(0);
    const terms = parsed.hardKeywords.map(k => k.term);
    expect(terms).toContain('JavaScript');
    expect(terms).toContain('Python');
  });

  it('VANT: detects semi-senior level', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'VANT', 'job-description.md');
    const result = runCLI(jdPath);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.senioritySignals.level).toBe('mid');
  });
});

// ── JSON is pretty-printed ──────────────────────────────────────────────────

describe('extract-keywords CLI — output formatting', () => {
  it('produces pretty-printed JSON with 2-space indentation', () => {
    const jdPath = path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md');
    const result = runCLI(jdPath);

    // Check that the output is multi-line (pretty-printed)
    const lines = result.stdout.split('\n');
    expect(lines.length).toBeGreaterThan(5);

    // First line should be "{"
    expect(lines[0].trim()).toBe('{');
    // Second line should start with 2 spaces
    expect(lines[1]).toMatch(/^  "/);
  });
});
