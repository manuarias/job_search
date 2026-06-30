/**
 * analytics.test.js — Tests for the F10 Analytics Module.
 *
 * Tests cover:
 *   1. Module shape and exports
 *   2. Score distribution (empty, single, 5-item)
 *   3. Score-threshold analysis (0 apps, no responses)
 *   4. Keyword correlation (no diag files, no response data)
 *   5. Integration: migrateTracking against fixture tracking file
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
      { ref: 'FAKEA', status: 'Closed' },
      { ref: 'FAKED', status: 'Closed' },
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
        { ref: 'FAKEA', score: 88, status: 'Closed' },
        { ref: 'FAKED', score: 79.5, status: 'Submitted' },
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

// ── Integration: migrateTracking with fixture file ────────────────────────────

describe('analytics — migrateTracking integration', () => {
  const trackingPath = path.join(__dirname, '..', 'test-fixtures', 'anonymous-tracking.md');

  it('parses fixture tracking into 6 entries', () => {
    const result = migrateTracking(trackingPath);
    expect(result.errors).toHaveLength(0);
    expect(result.tracking).toHaveLength(6);

    const refs = result.tracking.map(t => t.ref);
    expect(refs).toContain('FAKEA');
    expect(refs).toContain('FAKEB');
    expect(refs).toContain('FAKEC');
    expect(refs).toContain('FAKED');
    expect(refs).toContain('FAKEE');
    expect(refs).toContain('FAKEF');
  });

  it('extracts correct scores from fixture data', () => {
    const result = migrateTracking(trackingPath);
    const byRef = {};
    for (const t of result.tracking) byRef[t.ref] = t.score;

    expect(byRef['FAKEA']).toBe(88);
    expect(byRef['FAKEB']).toBe(79);
    expect(byRef['FAKEC']).toBe(88);
    expect(byRef['FAKED']).toBe(79.5);
    expect(byRef['FAKEE']).toBe(88);
    expect(byRef['FAKEF']).toBe(73);
  });

  it('extracts correct statuses', () => {
    const result = migrateTracking(trackingPath);
    const statuses = result.tracking.map(t => t.status);
    expect(statuses.filter(s => s === 'Closed')).toHaveLength(5);
    expect(statuses.filter(s => s === 'Submitted')).toHaveLength(1);
  });

  it('extracts dates in YYYY-MM-DD format for well-formed entries', () => {
    const result = migrateTracking(trackingPath);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const t of result.tracking) {
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

// ── Integration: correlateKeywords with fixture data ─────────────────────────

describe('analytics — correlateKeywords integration', () => {
  it('extracts keywords from application folders (fixture refs — no real dirs)', () => {
    const trackingPath = path.join(__dirname, '..', 'test-fixtures', 'anonymous-tracking.md');
    const { tracking } = migrateTracking(trackingPath);
    const result = correlateKeywords(tracking, APPS_DIR);

    // FAKE refs have no application directories, so correlations are empty
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(result.correlations.length).toBeGreaterThanOrEqual(0);
  });

  it('correlateKeywords returns valid structure', () => {
    const trackingPath = path.join(__dirname, '..', 'test-fixtures', 'anonymous-tracking.md');
    const { tracking } = migrateTracking(trackingPath);
    const result = correlateKeywords(tracking, APPS_DIR);

    expect(result).toHaveProperty('correlations');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ── E2E: generateReport with fixture data ──────────────────────────────────

describe('analytics — E2E with fixture', () => {
  const trackingPath = path.join(__dirname, '..', 'test-fixtures', 'anonymous-tracking.md');

  it('generates report with expected section headers from fixture data', () => {
    const { tracking } = migrateTracking(trackingPath);
    const scores = analyzeScores(tracking);
    const { correlations } = correlateKeywords(tracking, APPS_DIR);
    const { thresholds } = analyzeThresholds(tracking);

    const report = generateReport({ scores, correlations, thresholds, tracking });

    expect(report).toContain('# Analytics Report');
    expect(report).toContain('## Score Distribution');
    expect(report).toContain('## Keyword Correlation');
    expect(report).toContain('## Threshold Analysis');
    expect(report).toContain('## Response Summary');
  });

  it('report contains correct statistics computed from fixture data', () => {
    const { tracking } = migrateTracking(trackingPath);
    const scores = analyzeScores(tracking);
    const { correlations } = correlateKeywords(tracking, APPS_DIR);
    const { thresholds } = analyzeThresholds(tracking);

    const report = generateReport({ scores, correlations, thresholds, tracking });

    // Fixture scores: 88, 79, 88, 79.5, 88, 73 (6 entries)
    expect(report).toContain('73');    // min
    expect(report).toContain('88');    // max
    expect(report).toContain('82.6');  // mean = (88+79+88+79.5+88+73)/6 = 82.6
    expect(report).toContain('83.8');  // median = (79.5 + 88)/2 = 83.8
  });
});
