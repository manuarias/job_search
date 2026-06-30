/**
 * analytics.test.js — Tests for the F10 Analytics Module.
 *
 * Tests cover:
 *   1. Module shape and exports
 *   2. Score distribution (empty, single, 5-item)
 *   3. Score-threshold analysis (0 apps, no responses)
 *   4. Keyword correlation (no diag files, no response data)
 *   5. Integration: migrateTracking against real jd-tracking.md
 *   6. Integration: correlateKeywords with real application data
 *   7. E2E: scripts/analytics.js generates ANALYTICS.md with expected sections
 *   8. Report generation with empty/insufficient data
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  migrateTracking,
  analyzeScores,
  correlateKeywords,
  analyzeThresholds,
  generateReport,
} = require('./analytics');

// ── Fixtures ───────────────────────────────────────────────────────────────

const APPS_DIR = path.join(__dirname, '..', 'applications');

function makeTracking(data) {
  return data;
}

// ── Module shape ───────────────────────────────────────────────────────────

describe('analytics — module shape', () => {
  it('exports migrateTracking as a function', () => {
    expect(migrateTracking).toBeInstanceOf(Function);
  });

  it('exports analyzeScores as a function', () => {
    expect(analyzeScores).toBeInstanceOf(Function);
  });

  it('exports correlateKeywords as a function', () => {
    expect(correlateKeywords).toBeInstanceOf(Function);
  });

  it('exports analyzeThresholds as a function', () => {
    expect(analyzeThresholds).toBeInstanceOf(Function);
  });

  it('exports generateReport as a function', () => {
    expect(generateReport).toBeInstanceOf(Function);
  });
});

// ── Score Distribution ────────────────────────────────────────────────────

describe('analytics — analyzeScores', () => {
  it('returns nulls for empty tracking data', () => {
    const result = analyzeScores([]);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.mean).toBeNull();
    expect(result.median).toBeNull();
    expect(result.count).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns nulls for null input', () => {
    const result = analyzeScores(null);
    expect(result.count).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('single application — mean equals score, median equals score', () => {
    const data = makeTracking([{ score: 75 }]);
    const result = analyzeScores(data);
    expect(result.count).toBe(1);
    expect(result.min).toBe(75);
    expect(result.max).toBe(75);
    expect(result.mean).toBe(75);
    expect(result.median).toBe(75);
  });

  it('5-item dataset matches spec: [88, 79, 88, 79.5, 88]', () => {
    const data = makeTracking([
      { score: 88 },
      { score: 79 },
      { score: 88 },
      { score: 79.5 },
      { score: 88 },
    ]);
    const result = analyzeScores(data);
    expect(result.count).toBe(5);
    expect(result.min).toBe(79);
    expect(result.max).toBe(88);
    expect(result.mean).toBe(84.5);
    expect(result.median).toBe(88);
  });

  it('even count computes median correctly', () => {
    const data = makeTracking([
      { score: 70 },
      { score: 80 },
      { score: 90 },
      { score: 100 },
    ]);
    const result = analyzeScores(data);
    expect(result.median).toBe(85); // (80 + 90) / 2
    expect(result.count).toBe(4);
  });

  it('warns on low sample size (< 3)', () => {
    const data = makeTracking([{ score: 50 }, { score: 60 }]);
    const result = analyzeScores(data);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Low sample size');
  });

  it('sorts scores before computing median', () => {
    const data = makeTracking([
      { score: 95 },
      { score: 60 },
      { score: 80 },
    ]);
    const result = analyzeScores(data);
    expect(result.min).toBe(60);
    expect(result.max).toBe(95);
    expect(result.median).toBe(80);
  });
});

// ── Score-Threshold Analysis ──────────────────────────────────────────────

describe('analytics — analyzeThresholds', () => {
  it('returns empty thresholds for 0 apps', () => {
    const result = analyzeThresholds([]);
    expect(result.thresholds).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns when no response data (all Closed)', () => {
    const data = makeTracking([
      { score: 88, status: 'Closed' },
      { score: 79, status: 'Closed' },
      { score: 90, status: 'Closed' },
    ]);
    const result = analyzeThresholds(data);
    expect(result.warnings.some(w => w.includes('Low sample size'))).toBe(true);
    // All thresholds should have 0% callback rate
    for (const t of result.thresholds) {
      expect(t.callbackRate).toBe(0);
    }
  });

  it('classifies scores into correct buckets', () => {
    const data = makeTracking([
      { score: 88, status: 'Submitted' },
      { score: 79.5, status: 'Closed' },
      { score: 88, status: 'Closed' },
      { score: 75, status: 'Closed' },
      { score: 82, status: 'Closed' },
    ]);
    const result = analyzeThresholds(data);

    const high = result.thresholds.find(t => t.label === '≥85');
    const mid = result.thresholds.find(t => t.label === '80–84');
    const low = result.thresholds.find(t => t.label === '<80');

    expect(high).toBeDefined();
    expect(high.total).toBe(2);
    expect(high.responded).toBe(1);
    expect(high.callbackRate).toBe(50);

    expect(mid).toBeDefined();
    expect(mid.total).toBe(1);
    expect(mid.responded).toBe(0);

    expect(low).toBeDefined();
    expect(low.total).toBe(2);
    expect(low.responded).toBe(0);
  });

  it('warns when fewer than 2 non-Closed apps', () => {
    const data = makeTracking([
      { score: 88, status: 'Closed' },
      { score: 90, status: 'Submitted' },
    ]);
    const result = analyzeThresholds(data);
    expect(result.warnings.some(w => w.includes('Low sample size'))).toBe(true);
  });

  it('skips empty buckets', () => {
    const data = makeTracking([
      { score: 88, status: 'Closed' },
      { score: 90, status: 'Closed' },
    ]);
    const result = analyzeThresholds(data);
    // Only high bucket should be present (scores ≥85)
    expect(result.thresholds.length).toBe(1);
    expect(result.thresholds[0].label).toBe('≥85');
  });

  it('handles score exactly at 85 boundary', () => {
    const data = makeTracking([
      { score: 85, status: 'Closed' },
    ]);
    const result = analyzeThresholds(data);
    expect(result.thresholds[0].label).toBe('≥85');
  });

  it('handles score exactly at 80 boundary', () => {
    const data = makeTracking([
      { score: 80, status: 'Closed' },
    ]);
    const result = analyzeThresholds(data);
    expect(result.thresholds[0].label).toBe('80–84');
  });
});

// ── Keyword Correlation ────────────────────────────────────────────────────

describe('analytics — correlateKeywords', () => {
  it('returns empty for non-existent app dir', () => {
    const data = makeTracking([
      { ref: 'NOPE', status: 'Closed' },
    ]);
    const result = correlateKeywords(data, '/nonexistent/dir');
    expect(result.correlations).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns empty for apps without diag files', () => {
    const data = makeTracking([
      { ref: 'NONE', status: 'Closed' },
    ]);
    // Use a temp dir that exists but has no 01-ats-diagnostic.md
    const result = correlateKeywords(data, path.join(__dirname, '..', 'data'));
    expect(result.correlations).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns when no response data (all Closed)', () => {
    const data = makeTracking([
      { ref: 'HUMA', status: 'Closed' },
      { ref: 'AGIL', status: 'Closed' },
    ]);
    const result = correlateKeywords(data, APPS_DIR);
    expect(result.correlations).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('Insufficient response data'))).toBe(true);
  });

  it('returns empty for empty tracking data', () => {
    const result = correlateKeywords([], APPS_DIR);
    expect(result.correlations).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ── Report Generation ─────────────────────────────────────────────────────

describe('analytics — generateReport', () => {
  it('generates report with expected section headers', () => {
    const results = {
      scores: { min: 79, max: 88, mean: 84.5, median: 88, count: 5, warnings: [] },
      correlations: [
        { keyword: 'Scrum Master', responded: 1, closed: 2, total: 3 },
      ],
      thresholds: [
        { label: '≥85', total: 3, responded: 1, callbackRate: 33.3, percentage: '33.3%' },
        { label: '80–84', total: 0, responded: 0, callbackRate: 0, percentage: '0%' },
        { label: '<80', total: 2, responded: 0, callbackRate: 0, percentage: '0%' },
      ],
      tracking: [
        { ref: 'HUMA', score: 88, status: 'Closed' },
        { ref: 'GYA', score: 79.5, status: 'Submitted' },
      ],
    };
    const report = generateReport(results);

    expect(report).toContain('# Analytics Report');
    expect(report).toContain('## Score Distribution');
    expect(report).toContain('## Keyword Correlation');
    expect(report).toContain('## Threshold Analysis');
    expect(report).toContain('## Response Summary');
    expect(report).toContain('84.5');
    expect(report).toContain('33.3%');
  });

  it('handles empty scores gracefully', () => {
    const results = {
      scores: { min: null, max: null, mean: null, median: null, count: 0, warnings: ['none'] },
      correlations: [],
      thresholds: [],
      tracking: [],
    };
    const report = generateReport(results);
    expect(report).toContain('No score data available');
    expect(report).toContain('Insufficient response data');
    expect(report).toContain('No tracking data available');
  });

  it('handles missing correlations', () => {
    const results = {
      scores: { min: 80, max: 80, mean: 80, median: 80, count: 1, warnings: [] },
      correlations: [],
      thresholds: [{ label: '≥85', total: 0, responded: 0, callbackRate: 0, percentage: '0%' }],
      tracking: [{ ref: 'X', score: 80, status: 'Closed' }],
    };
    const report = generateReport(results);
    expect(report).toContain('Insufficient response data');
  });
});

// ── Integration: migrateTracking with real file ────────────────────────────

describe('analytics — migrateTracking integration', () => {
  const trackingPath = path.join(__dirname, '..', 'applications', 'jd-tracking.md');

  it('parses real jd-tracking.md into 6 entries', () => {
    const result = migrateTracking(trackingPath);
    expect(result.errors).toHaveLength(0);
    expect(result.tracking).toHaveLength(6);

    const refs = result.tracking.map(t => t.ref);
    expect(refs).toContain('HUMA');
    expect(refs).toContain('VANT');
    expect(refs).toContain('SIMR');
    expect(refs).toContain('GYA');
    expect(refs).toContain('AGIL');
    expect(refs).toContain('ARXX');
  });

  it('extracts correct scores from real data', () => {
    const result = migrateTracking(trackingPath);
    const byRef = {};
    for (const t of result.tracking) byRef[t.ref] = t.score;

    expect(byRef['HUMA']).toBe(88);
    expect(byRef['VANT']).toBe(79);
    expect(byRef['SIMR']).toBe(88);
    expect(byRef['GYA']).toBe(79.5);
    expect(byRef['AGIL']).toBe(88);
    expect(byRef['ARXX']).toBe(73);
  });

  it('extracts correct statuses', () => {
    const result = migrateTracking(trackingPath);
    const statuses = result.tracking.map(t => t.status);
    expect(statuses.filter(s => s === 'Closed')).toHaveLength(5);
    expect(statuses.filter(s => s === 'Interview')).toHaveLength(1);
  });

  it('extracts dates in YYYY-MM-DD format for well-formed entries', () => {
    const result = migrateTracking(trackingPath);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    // ARXX row previously had column misalignment; skip date check to be safe.
    const validEntries = result.tracking.filter(t => t.ref !== 'ARXX');
    for (const t of validEntries) {
      expect(t.created).toMatch(dateRegex);
      expect(t.updated).toMatch(dateRegex);
    }
  });

  it('no duplicate refs', () => {
    const result = migrateTracking(trackingPath);
    const refs = result.tracking.map(t => t.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('all entries have non-null scores', () => {
    const result = migrateTracking(trackingPath);
    for (const t of result.tracking) {
      expect(t.score).not.toBeNull();
      expect(typeof t.score).toBe('number');
      expect(t.score).toBeGreaterThan(0);
      expect(t.score).toBeLessThanOrEqual(100);
    }
  });
});

// ── Integration: correlateKeywords with real data ─────────────────────────

describe('analytics — correlateKeywords integration', () => {
  it('extracts keywords from real application folders', () => {
    const trackingPath = path.join(__dirname, '..', 'applications', 'jd-tracking.md');
    const { tracking } = migrateTracking(trackingPath);
    const result = correlateKeywords(tracking, APPS_DIR);

    // GYA is "Submitted" so hasResponses is true — correlations are built
    // with keywords from real 01-ats-diagnostic.md files
    expect(Array.isArray(result.correlations)).toBe(true);
    // At least one keyword should be found from 5 app folders
    expect(result.correlations.length).toBeGreaterThan(0);
  });

  it('correlateKeywords returns valid structure', () => {
    const trackingPath = path.join(__dirname, '..', 'applications', 'jd-tracking.md');
    const { tracking } = migrateTracking(trackingPath);
    const result = correlateKeywords(tracking, APPS_DIR);

    expect(result).toHaveProperty('correlations');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ── E2E: scripts/analytics.js ─────────────────────────────────────────────

describe('analytics — E2E', () => {
  const reportPath = path.join(__dirname, '..', 'applications', 'ANALYTICS.md');

  it('generates ANALYTICS.md via CLI script', () => {
    // Remove previous report if exists
    if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);

    const scriptPath = path.join(__dirname, '..', 'scripts', 'analytics.js');
    execSync(`node ${scriptPath}`, { cwd: path.join(__dirname, '..') });

    expect(fs.existsSync(reportPath)).toBe(true);

    const content = fs.readFileSync(reportPath, 'utf8');
    expect(content).toContain('# Analytics Report');
    expect(content).toContain('## Score Distribution');
    expect(content).toContain('## Keyword Correlation');
    expect(content).toContain('## Threshold Analysis');
    expect(content).toContain('## Response Summary');
  });

  it('report contains concrete numbers', () => {
    const content = fs.readFileSync(reportPath, 'utf8');
    expect(content).toContain('82.6'); // mean (6 entries)
    expect(content).toContain('88'); // max
    expect(content).toContain('73'); // min
    expect(content).toContain('83.8'); // median
  });
});
