/**
 * F10 Analytics Module — Core library
 *
 * Provides structured tracking migration, aggregate score analysis,
 * keyword-outcome correlation, score-threshold analysis, and markdown
 * report generation for the job-search application pipeline.
 *
 * CJS module — consumed via `require('./lib/analytics')`.
 *
 * Usage:
 *   const { migrateTracking, analyzeScores, correlateKeywords, analyzeThresholds, generateReport } = require('./lib/analytics');
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Tracking Migration ────────────────────────────────────────────────────

/**
 * Parse `applications/jd-tracking.md` into structured tracking entries.
 *
 * Extracts pipe-separated table rows from the `## Postulaciones` section.
 *
 * @param {string} mdPath — Path to jd-tracking.md
 * @returns {{ tracking: Array, errors: Array }}
 */
function migrateTracking(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const errors = [];
  const tracking = [];

  // Find the Postulaciones section
  const sectionMatch = content.match(/## Postulaciones\s*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!sectionMatch) {
    return { tracking, errors: ['Could not find "## Postulaciones" section in jd-tracking.md'] };
  }

  const section = sectionMatch[1];
  const lines = section.split('\n');

  for (const line of lines) {
    // Skip header row (| REF | ...) and separator row (|---|---|...)
    if (!line.trim().startsWith('|') || line.includes('---')) continue;
    const trimmed = line.trim();
    if (/^\|\s*REF\s*\|/.test(trimmed)) continue;

    // Split by pipe, trimming whitespace
    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);

    if (cells.length < 8) {
      errors.push(`Row has fewer than 8 cells: "${trimmed.substring(0, 60)}..."`);
      continue;
    }

    const ref = cells[0];
    if (!/^[A-Z]+$/.test(ref)) continue; // skip non-data rows

    const company = cells[1];
    const role = cells[2];
    const scoreRaw = cells[5]; // "88/100" or "79.5/100"
    const status = cells[6];
    const created = cells[7];
    const updated = cells[8] || cells[7]; // fallback to created if missing

    // Parse score
    const scoreMatch = scoreRaw.match(/^([\d.]+)\s*\/\s*100$/);
    let score;
    if (scoreMatch) {
      score = parseFloat(scoreMatch[1]);
    } else {
      errors.push(`Could not parse score "${scoreRaw}" for ${ref}`);
      continue;
    }

    tracking.push({ ref, company, role, score, status, created, updated });
  }

  return { tracking, errors };
}

// ── Score Distribution ────────────────────────────────────────────────────

/**
 * Compute aggregate score statistics.
 *
 * @param {Array<{score: number}>} trackingData
 * @returns {{ min: number|null, max: number|null, mean: number|null, median: number|null, count: number, warnings: Array }}
 */
function analyzeScores(trackingData) {
  const warnings = [];
  if (!trackingData || trackingData.length === 0) {
    return { min: null, max: null, mean: null, median: null, count: 0, warnings: ['No tracking data available'] };
  }

  const scores = trackingData.map(e => e.score).sort((a, b) => a - b);
  const count = scores.length;
  const min = scores[0];
  const max = scores[count - 1];
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = parseFloat((sum / count).toFixed(1));

  let median;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = parseFloat(((scores[mid - 1] + scores[mid]) / 2).toFixed(1));
  } else {
    median = scores[mid];
  }

  if (count < 3) {
    warnings.push('Low sample size — score statistics may not be representative');
  }

  return { min, max, mean, median, count, warnings };
}

// ── Keyword-Outcome Correlation ───────────────────────────────────────────

/**
 * Extract top-5 keyword gaps from an `01-ats-diagnostic.md` file.
 *
 * Looks for sections titled "Top 5 Keyword Gaps" (headers vary across apps)
 * and extracts keyword names from list items or table rows.
 *
 * @param {string} filePath — Path to 01-ats-diagnostic.md
 * @returns {Array<string>} Top 5 keyword gap phrases
 */
function extractTopKeywords(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Find "Top 5 Keyword Gaps" section (headers vary across apps)
    const sectionMatch = content.match(/#{2,4}\s+.*Top\s*5.*Keyword\s*Gaps[\s\S]*?(?=\n#{2,4}\s|$)/);
    if (!sectionMatch) return [];

    const section = sectionMatch[0];
    const keywords = [];

    // Try list format first: 1. **keyword**  (keywords may contain quotes)
    const listRegex = /^\d+\.\s+\*{1,2}\s*([^*\n]+?)\s*\*{1,2}/gm;
    let match;
    while ((match = listRegex.exec(section)) !== null) {
      const kw = match[1].replace(/^[🔴🟡🟢⚪⚠️✅❌☑️⭐"'\s]+/, '').replace(/["'\s]+$/, '').trim();
      if (kw && !keywords.includes(kw)) keywords.push(kw);
    }

    // If list didn't find anything, try table format: | 1 | **keyword** |
    if (keywords.length === 0) {
      const tableRegex = /\|\s*\d+\s*\|\s*\*{1,2}\s*([^*|\n]+?)\s*\*{1,2}/g;
      while ((match = tableRegex.exec(section)) !== null) {
        const kw = match[1].replace(/^[🔴🟡🟢⚪⚠️✅❌☑️⭐"'\s]+/, '').replace(/["'\s]+$/, '').trim();
        if (kw && !keywords.includes(kw)) keywords.push(kw);
      }
    }

    return keywords.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Determine whether a status is a "response" (positive outcome).
 *
 * @param {string} status
 * @returns {boolean}
 */
function isResponded(status) {
  const responded = ['Submitted', 'Interview', 'Offer'];
  return responded.includes(status);
}

/**
 * Correlate keywords from application folders with response outcomes.
 *
 * Reads each application's `01-ats-diagnostic.md` for top-5 keyword gaps,
 * groups keywords by outcome status (responded vs closed), and ranks.
 *
 * @param {Array<{ref: string, status: string}>} trackingData
 * @param {string} appsDir — Path to the applications directory
 * @returns {{ correlations: Array, warnings: Array }}
 */
function correlateKeywords(trackingData, appsDir) {
  const warnings = [];
  // { keyword: { responded: count, closed: count } }
  const keywordMap = new Map();

  for (const entry of trackingData) {
    const diagPath = path.join(appsDir, entry.ref, '01-ats-diagnostic.md');
    const keywords = extractTopKeywords(diagPath);

    for (const kw of keywords) {
      if (!keywordMap.has(kw)) {
        keywordMap.set(kw, { responded: 0, closed: 0 });
      }
      const entry_map = keywordMap.get(kw);
      if (isResponded(entry.status)) {
        entry_map.responded++;
      } else {
        entry_map.closed++;
      }
    }
  }

  if (keywordMap.size === 0) {
    warnings.push('No keyword data found — check that 01-ats-diagnostic.md files exist with Top 5 Keyword Gaps sections');
    return { correlations: [], warnings };
  }

  // Check if we have any response data
  const hasResponses = trackingData.some(e => isResponded(e.status));
  if (!hasResponses) {
    warnings.push('Insufficient response data — all applications have status "Closed"');
    return { correlations: [], warnings };
  }

  // Build correlations sorted by responded count desc, then total desc
  const correlations = [];
  for (const [keyword, counts] of keywordMap) {
    const total = counts.responded + counts.closed;
    correlations.push({
      keyword,
      responded: counts.responded,
      closed: counts.closed,
      total,
    });
  }

  correlations.sort((a, b) => {
    if (b.responded !== a.responded) return b.responded - a.responded;
    return b.total - a.total;
  });

  return { correlations, warnings };
}

// ── Score-Threshold Analysis ──────────────────────────────────────────────

/**
 * Group scores into thresholds and compute callback rates (responded/total per bucket).
 *
 * Buckets: ≥85, 80–84, <80
 *
 * @param {Array<{score: number, status: string}>} trackingData
 * @returns {{ thresholds: Array, warnings: Array }}
 */
function analyzeThresholds(trackingData) {
  const warnings = [];
  const buckets = {
    high: { label: '≥85', min: 85, max: Infinity, total: 0, responded: 0 },
    mid: { label: '80–84', min: 80, max: 84, total: 0, responded: 0 },
    low: { label: '<80', min: -Infinity, max: 79, total: 0, responded: 0 },
  };

  for (const entry of trackingData) {
    const score = entry.score;
    let bucket;
    if (score >= 85) bucket = buckets.high;
    else if (score >= 80) bucket = buckets.mid;
    else bucket = buckets.low;

    bucket.total++;
    if (isResponded(entry.status)) bucket.responded++;
  }

  // Check for low sample size (fewer than 2 non-Closed)
  const nonClosed = trackingData.filter(e => isResponded(e.status)).length;
  if (nonClosed < 2) {
    warnings.push('Low sample size — fewer than 2 applications with non-Closed status');
  }

  const thresholds = [];
  for (const key of ['high', 'mid', 'low']) {
    const b = buckets[key];
    if (b.total === 0) continue;
    const rate = b.total > 0 ? parseFloat(((b.responded / b.total) * 100).toFixed(1)) : 0;
    thresholds.push({
      label: b.label,
      total: b.total,
      responded: b.responded,
      callbackRate: rate,
      percentage: rate + '%',
    });
  }

  return { thresholds, warnings };
}

// ── Report Generation ─────────────────────────────────────────────────────

/**
 * Build a full-scope stats result object for report generation.
 *
 * @param {object} results — { scores, correlations, thresholds, tracking }
 * @returns {string} Markdown report
 */
function generateReport(results) {
  const { scores, correlations, thresholds, tracking } = results;
  const lines = [];

  lines.push('# Analytics Report — Job Applications');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
  lines.push(`**Applications tracked:** ${scores.count}`);
  lines.push('');

  // ── Score Distribution ──
  lines.push('## Score Distribution');
  lines.push('');
  if (scores.count === 0) {
    lines.push('*No score data available.*');
  } else {
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Min | ${scores.min} |`);
    lines.push(`| Max | ${scores.max} |`);
    lines.push(`| Mean | ${scores.mean} |`);
    lines.push(`| Median | ${scores.median} |`);
    lines.push(`| Count | ${scores.count} |`);
  }
  lines.push('');

  // ── Keyword Correlation ──
  lines.push('## Keyword Correlation');
  lines.push('');
  if (!correlations || correlations.length === 0) {
    lines.push('*Insufficient response data for keyword-outcome correlation.*');
  } else {
    lines.push('Keywords that appear in applications with positive outcomes (Submitted, Interview, Offer):');
    lines.push('');
    lines.push('| Keyword | Responded | Closed | Total |');
    lines.push('|---------|-----------|--------|-------|');
    for (const c of correlations) {
      lines.push(`| ${c.keyword} | ${c.responded} | ${c.closed} | ${c.total} |`);
    }
  }
  lines.push('');

  // ── Threshold Analysis ──
  lines.push('## Threshold Analysis');
  lines.push('');
  if (!thresholds || thresholds.length === 0) {
    lines.push('*No threshold data available.*');
  } else {
    lines.push('Callback rate (non-Closed / total) per score bucket:');
    lines.push('');
    lines.push('| Score Range | Applications | Responded | Callback Rate |');
    lines.push('|-------------|-------------|-----------|---------------|');
    for (const t of thresholds) {
      lines.push(`| ${t.label} | ${t.total} | ${t.responded} | ${t.percentage} |`);
    }
  }
  lines.push('');

  // ── Response Summary ──
  lines.push('## Response Summary');
  lines.push('');
  if (!tracking || tracking.length === 0) {
    lines.push('*No tracking data available.*');
  } else {
    const grouped = {};
    for (const e of tracking) {
      grouped[e.status] = (grouped[e.status] || 0) + 1;
    }
    lines.push('| Status | Count |');
    lines.push('|--------|-------|');
    for (const [status, count] of Object.entries(grouped).sort()) {
      lines.push(`| ${status} | ${count} |`);
    }

    const responded = tracking.filter(e => isResponded(e.status)).length;
    const rate = tracking.length > 0 ? parseFloat(((responded / tracking.length) * 100).toFixed(1)) : 0;
    lines.push('');
    lines.push(`**Overall response rate:** ${rate}% (${responded}/${tracking.length})`);
  }
  lines.push('');

  return lines.join('\n');
}

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  migrateTracking,
  analyzeScores,
  correlateKeywords,
  analyzeThresholds,
  generateReport,
};
