/**
 * reporter.test.js — Tests for the F12 Pipeline Report module.
 *
 * Tests cover:
 *   1. generateReport returns formatted string with all sections
 *   2. Spanish labels when state.lang='es'
 *   3. N/A fallback when score.json missing
 *   4. N/A fallback when match.json missing
 *   5. REPORT.md written to state.dir
 *   6. Graceful handling of malformed JSON
 *   7. Output line count ≤ 15
 *   8. Empty quickWins/missing actions arrays
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  generateReport,
  readJSON,
  extractScoreData,
  extractMatchData,
  formatCard,
  LABELS,
} = require('./reporter');

// ── Fixture helpers ────────────────────────────────────────────────────

function makeScore(final, atsPct, kwPct, recPct, gap, quickWinFix) {
  return {
    final,
    categories: {
      atsParseability: { score: Math.round(atsPct), maxScore: 100, percentage: atsPct, weight: 0.4, weightedScore: atsPct * 0.4 },
      keywordAlignment: { score: Math.round(kwPct * 100), maxScore: 100, percentage: kwPct, weight: 0.3, weightedScore: kwPct * 0.3 },
      recruiterAppeal: { score: Math.round(recPct * 100), maxScore: 100, percentage: recPct, weight: 0.3, weightedScore: recPct * 0.3 },
    },
    gapToTarget: { target: 90, current: final, gap, highestGapCategory: 'keywordAlignment' },
    quickWins: quickWinFix ? [{ type: 'test', location: 'n/a', fix: quickWinFix, priority: 'high' }] : [],
  };
}

function makeMatch(level, covPct, action) {
  return {
    overall: { score: 50, maxScore: 100, percentage: 0.5 },
    recommendation: {
      level,
      label: 'Test',
      actions: action ? [{ priority: 'high', action, impact: 'high' }] : [],
    },
    summary: {
      keywordCoverage: { matched: 5, total: 10, percentage: covPct },
    },
  };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'reporter-test-'));
}

function writeJSON(dir, filename, obj) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(obj), 'utf8');
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('readJSON', () => {
  it('returns parsed JSON when file exists', () => {
    const dir = tempDir();
    writeJSON(dir, 'test.json', { a: 1 });
    const result = readJSON(dir, 'test.json');
    expect(result).toEqual({ a: 1 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when file does not exist', () => {
    const dir = tempDir();
    const result = readJSON(dir, 'nonexistent.json');
    expect(result).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns null for malformed JSON', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'bad.json'), '{not json}', 'utf8');
    const result = readJSON(dir, 'bad.json');
    expect(result).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('extractScoreData', () => {
  const labels = LABELS.en;

  it('extracts all fields from valid score data', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, 'Add a metric to bullet X');
    const data = extractScoreData(score, labels);
    expect(data.final).toBe(82);
    expect(data.ats).toBe(100);
    expect(data.keywords).toBe(67);
    expect(data.recruiter).toBe(85);
    expect(data.target).toBe(90);
    expect(data.gap).toBe(8);
    expect(data.quickWin).toBe('Add a metric to bullet X');
    // biggestGapCategory maps keywordAlignment → Keywords
  });

  it('returns N/A for all fields when score is null', () => {
    const data = extractScoreData(null, labels);
    expect(data.final).toBe('N/A');
    expect(data.ats).toBe('N/A');
    expect(data.keywords).toBe('N/A');
    expect(data.recruiter).toBe('N/A');
    expect(data.quickWin).toBe('N/A');
  });

  it('returns N/A for quickWin when quickWins array is empty', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, null);
    const data = extractScoreData(score, labels);
    expect(data.final).toBe(82);
    expect(data.quickWin).toBe('N/A');
  });
});

describe('extractMatchData', () => {
  const labels = LABELS.en;

  it('extracts all fields from valid match data', () => {
    const match = makeMatch('apply', 0.75, 'Improve semantic alignment');
    const data = extractMatchData(match, labels);
    expect(data.level).toBe('apply');
    expect(data.keywordCoverage).toBe('75%');
    expect(data.topAction).toBe('Improve semantic alignment');
  });

  it('returns N/A for all fields when match is null', () => {
    const data = extractMatchData(null, labels);
    expect(data.level).toBe('N/A');
    expect(data.keywordCoverage).toBe('N/A');
    expect(data.topAction).toBe('N/A');
  });

  it('returns N/A for topAction when actions array is empty', () => {
    const match = makeMatch('skip', 0.2, null);
    const data = extractMatchData(match, labels);
    expect(data.level).toBe('skip');
    expect(data.topAction).toBe('N/A');
  });
});

describe('formatCard', () => {
  it('returns a string with all expected sections', () => {
    const state = { ref: 'TEST', company: 'TestCorp', role: 'Engineer', dir: '/tmp/test' };
    const labels = LABELS.en;
    const scoreData = extractScoreData(makeScore(82, 1.0, 0.67, 0.85, 8, 'Add metric'), labels);
    const matchData = extractMatchData(makeMatch('apply', 0.75, 'Improve alignment'), labels);

    const card = formatCard(state, scoreData, matchData, labels);
    expect(card).toContain('Pipeline Report');
    expect(card).toContain('TEST');
    expect(card).toContain('TestCorp');
    expect(card).toContain('Engineer');
    expect(card).toContain('Score: 82/100');
    expect(card).toContain('ATS: 100');
    expect(card).toContain('Keywords: 67');
    expect(card).toContain('Recruiter: 85');
    expect(card).toContain('Match: apply');
    expect(card).toContain('75%');
    expect(card).toContain('Gap to 90: -8');
    expect(card).toContain('Top quick win: Add metric');
    expect(card).toContain('Recommended: Improve alignment');
    expect(card).toContain('Report saved');
  });

  it('uses Spanish labels when LABELS.es is passed', () => {
    const state = { ref: 'TEST', company: 'TestCorp', role: 'Engineer', dir: '/tmp/test' };
    const labels = LABELS.es;
    const scoreData = extractScoreData(makeScore(82, 1.0, 0.67, 0.85, 8, 'Add metric'), labels);
    const matchData = extractMatchData(makeMatch('apply', 0.75, 'Improve alignment'), labels);

    const card = formatCard(state, scoreData, matchData, labels);
    expect(card).toContain('Puntaje: 82/100');
    expect(card).toContain('Reclutador: 85');
    expect(card).toContain('Brecha a 90: -8');
    expect(card).toContain('es la mayor brecha');
    expect(card).toContain('Mejora rápida principal');
    expect(card).toContain('Recomendado:');
    expect(card).toContain('Reporte guardado');
    // Technical terms stay in English
    expect(card).toContain('ATS: 100');
    expect(card).toContain('Keywords: 67');
  });

  it('output does not exceed 15 lines', () => {
    const state = { ref: 'TEST', company: 'TestCorp', role: 'Engineer', dir: '/tmp/test' };
    const labels = LABELS.en;
    const scoreData = extractScoreData(makeScore(82, 1.0, 0.67, 0.85, 8, 'Add metric'), labels);
    const matchData = extractMatchData(makeMatch('apply', 0.75, 'Improve alignment'), labels);

    const card = formatCard(state, scoreData, matchData, labels);
    const lines = card.split('\n');
    expect(lines.length).toBeLessThanOrEqual(15);
  });
});

describe('generateReport', () => {
  let dir;

  beforeEach(() => {
    dir = tempDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns a formatted string with all sections when both artifacts present', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, 'Add a metric to bullet X');
    const match = makeMatch('apply', 0.75, 'Improve semantic alignment');
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'TestCorp', role: 'Eng', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Pipeline Report — TEST');
    expect(result).toContain('Score: 82/100');
    expect(result).toContain('ATS: 100');
    expect(result).toContain('Keywords: 67');
    expect(result).toContain('Recruiter: 85');
    expect(result).toContain('Match: apply (75% keywords coverage)');
    expect(result).toContain('Add a metric to bullet X');
    expect(result).toContain('Improve semantic alignment');
  });

  it('uses Spanish labels when state.lang is "es"', () => {
    const score = makeScore(73, 1.0, 0.31, 0.80, 17, 'Agregar métrica');
    const match = makeMatch('skip', 0.27, 'Mejorar alineación semántica');
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'ARXX', company: 'Ar', role: 'Líder', lang: 'es' };
    const result = generateReport(state);

    expect(result).toContain('Puntaje: 73/100');
    expect(result).toContain('Reclutador: 80');
    expect(result).toContain('Brecha a 90: -17');
    expect(result).toContain('es la mayor brecha');
    expect(result).toContain('Mejora rápida principal');
    expect(result).toContain('Recomendado:');
    expect(result).toContain('Reporte guardado');
    // Technical terms stay English
    expect(result).toContain('ATS: 100');
    expect(result).toContain('Keywords: 31');
  });

  it('returns N/A when score.json does not exist', () => {
    const match = makeMatch('consider', 0.5, 'Some action');
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Score: N/A/100');
    expect(result).toContain('ATS: N/A');
    expect(result).toContain('Keywords: N/A');
    expect(result).toContain('Recruiter: N/A');
    expect(result).toContain('Match: consider');
    // Should not throw
  });

  it('returns N/A for match fields when match.json does not exist', () => {
    const score = makeScore(90, 0.9, 0.9, 0.9, 0, 'Some quick win');
    writeJSON(dir, 'score.json', score);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Score: 90/100');
    expect(result).toContain('Match: N/A');
    expect(result).toContain('Top quick win: Some quick win');
    // Should not throw
  });

  it('writes REPORT.md to state.dir', () => {
    const score = makeScore(50, 0.5, 0.5, 0.5, 40, 'Fix stuff');
    const match = makeMatch('skip', 0.1, 'Do better');
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    generateReport(state);

    const reportPath = path.join(dir, 'REPORT.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    const contents = fs.readFileSync(reportPath, 'utf8');
    expect(contents).toContain('Pipeline Report — TEST');
    expect(contents).toContain('Score: 50/100');
  });

  it('handles malformed JSON gracefully', () => {
    fs.writeFileSync(path.join(dir, 'score.json'), '{not valid}', 'utf8');
    const match = makeMatch('apply', 0.8, 'Good action');
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Score: N/A/100');
    expect(result).toContain('Match: apply');
    // Should not throw
  });

  it('creates state.dir if it does not exist', () => {
    const subDir = path.join(dir, 'new-app');
    const state = { dir: subDir, ref: 'NEW', company: 'Co', role: 'Role', lang: 'en' };

    // No score.json or match.json — test directory creation only
    const result = generateReport(state);

    expect(fs.existsSync(subDir)).toBe(true);
    expect(result).toContain('N/A');
  });

  it('output does not exceed 15 lines', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, 'A'.repeat(50));
    const match = makeMatch('apply', 0.75, 'B'.repeat(50));
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    const lines = result.split('\n');
    expect(lines.length).toBeLessThanOrEqual(15);
  });

  it('handles empty quickWins array in score.json', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, null); // null → empty quickWins
    const match = makeMatch('apply', 0.75, 'Some action');
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Top quick win: N/A');
    expect(result).toContain('Score: 82/100'); // other data still present
  });

  it('handles empty actions array in match.json', () => {
    const score = makeScore(82, 1.0, 0.67, 0.85, 8, 'quick');
    const match = makeMatch('apply', 0.75, null); // null → empty actions
    writeJSON(dir, 'score.json', score);
    writeJSON(dir, 'match.json', match);

    const state = { dir, ref: 'TEST', company: 'Co', role: 'Role', lang: 'en' };
    const result = generateReport(state);

    expect(result).toContain('Recommended: N/A');
    expect(result).toContain('Match: apply'); // other match data present
  });
});
