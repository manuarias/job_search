/**
 * F12 Pipeline Report — Core module
 *
 * Generates a concise ~10–15 line summary report after Hermes pipeline
 * completion from score.json and match.json. Outputs to stderr and
 * writes REPORT.md in the application directory.
 *
 * CJS module — consumed via `require('./lib/reporter')`.
 *
 * Usage:
 *   const { generateReport } = require('./lib/reporter');
 *   const text = generateReport({ dir, ref, company, role, lang });
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Label maps ─────────────────────────────────────────────────────────
const LABELS = {
  en: {
    score: 'Score',
    ats: 'ATS',
    keywords: 'Keywords',
    recruiter: 'Recruiter',
    match: 'Match',
    gap: 'Gap to',
    biggestGap: 'is the biggest gap',
    topQuickWin: 'Top quick win',
    recommended: 'Recommended',
    reportSaved: 'Report saved',
    na: 'N/A',
  },
  es: {
    score: 'Puntaje',
    ats: 'ATS',
    keywords: 'Keywords',
    recruiter: 'Reclutador',
    match: 'Match',
    gap: 'Brecha a',
    biggestGap: 'es la mayor brecha',
    topQuickWin: 'Mejora rápida principal',
    recommended: 'Recomendado',
    reportSaved: 'Reporte guardado',
    na: 'N/D',
  },
};

// Map internal category keys to display labels per language.
const CATEGORY_DISPLAY = {
  atsParseability: { en: 'ATS', es: 'ATS' },
  keywordAlignment: { en: 'Keywords', es: 'Keywords' },
  recruiterAppeal: { en: 'Recruiter', es: 'Reclutador' },
};

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Read and parse a JSON file. Returns `null` on missing or malformed file.
 */
function readJSON(dir, filename) {
  try {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Extract score data from parsed score.json. Returns object with string
 * or numeric fields; missing fields are `'N/A'`.
 */
function extractScoreData(score, labels) {
  if (!score) {
    return {
      final: labels.na,
      ats: labels.na,
      keywords: labels.na,
      recruiter: labels.na,
      target: labels.na,
      gap: labels.na,
      biggestGapCategory: labels.na,
      quickWin: labels.na,
    };
  }

  const atsPct = score?.categories?.atsParseability?.percentage;
  const kwPct = score?.categories?.keywordAlignment?.percentage;
  const recPct = score?.categories?.recruiterAppeal?.percentage;

  const target = score?.gapToTarget?.target;
  const gap = score?.gapToTarget?.gap;
  const highestCat = score?.gapToTarget?.highestGapCategory;
  const gapLabel = CATEGORY_DISPLAY[highestCat]?.['en'] || highestCat || labels.na;

  const quickWins = score?.quickWins;
  const quickWin = Array.isArray(quickWins) && quickWins.length > 0
    ? quickWins[0].fix
    : labels.na;

  return {
    final: score?.final != null ? score.final : labels.na,
    ats: atsPct != null ? Math.round(atsPct * 100) : labels.na,
    keywords: kwPct != null ? Math.round(kwPct * 100) : labels.na,
    recruiter: recPct != null ? Math.round(recPct * 100) : labels.na,
    target: target != null ? target : labels.na,
    gap: gap != null ? gap : labels.na,
    biggestGapCategory: gapLabel,
    quickWin,
  };
}

/**
 * Extract match data from parsed match.json. Returns object with string
 * fields; missing fields are `'N/A'`.
 */
function extractMatchData(match, labels) {
  if (!match) {
    return {
      level: labels.na,
      keywordCoverage: labels.na,
      topAction: labels.na,
    };
  }

  const level = match?.recommendation?.level || labels.na;
  const covPct = match?.summary?.keywordCoverage?.percentage;
  const keywordCoverage = covPct != null
    ? `${Math.round(covPct * 100)}%`
    : labels.na;

  const actions = match?.recommendation?.actions;
  const topAction = Array.isArray(actions) && actions.length > 0
    ? actions[0].action
    : labels.na;

  return { level, keywordCoverage, topAction };
}

/**
 * Build the formatted ~10–15 line report card string.
 */
function formatCard(state, scoreData, matchData, labels) {
  const ref = state.ref || '?';
  const company = state.company || '?';
  const role = state.role || '?';
  const dir = state.dir || '?';

  const lines = [];

  // Header
  lines.push(`📊 Pipeline Report — ${ref} (${company} — ${role})`);
  lines.push('──────────────────────────────────────────────');

  // Score line
  lines.push(
    `${labels.score}: ${scoreData.final}/100  |  ` +
    `${labels.ats}: ${scoreData.ats}  |  ` +
    `${labels.keywords}: ${scoreData.keywords}  |  ` +
    `${labels.recruiter}: ${scoreData.recruiter}`
  );

  // Match line
  lines.push(`${labels.match}: ${matchData.level} (${matchData.keywordCoverage} ${labels.keywords.toLowerCase()} coverage)`);

  // Gap line
  lines.push(
    `${labels.gap} ${scoreData.target}: -${scoreData.gap} pts ` +
    `(${scoreData.biggestGapCategory} ${labels.biggestGap})`
  );

  // Quick win
  lines.push(`${labels.topQuickWin}: ${scoreData.quickWin}`);

  // Recommended action
  lines.push(`→ ${labels.recommended}: ${matchData.topAction}`);

  // Footer
  const reportPath = path.join(dir, 'REPORT.md');
  lines.push(`📁 ${labels.reportSaved}: ${reportPath}`);

  return lines.join('\n');
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Generate the pipeline report.
 *
 * @param {object} state — { dir, ref, company, role, lang? }
 * @returns {string} formatted report card
 */
function generateReport(state) {
  const lang = state.lang || 'en';
  const labels = LABELS[lang] || LABELS.en;

  // Read artifacts
  const score = readJSON(state.dir, 'score.json');
  const match = readJSON(state.dir, 'match.json');

  // Extract data
  const scoreData = extractScoreData(score, labels);
  const matchData = extractMatchData(match, labels);

  // Format the card
  const report = formatCard(state, scoreData, matchData, labels);

  // Ensure directory exists
  try {
    if (!fs.existsSync(state.dir)) {
      fs.mkdirSync(state.dir, { recursive: true });
    }
  } catch {
    // Non-fatal: directory creation failed but we can still return the string
  }

  // Write REPORT.md
  try {
    const reportPath = path.join(state.dir, 'REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf8');
  } catch {
    // Non-fatal: file write failed but we still return the formatted string
  }

  return report;
}

// ── Exports ────────────────────────────────────────────────────────────
module.exports = { generateReport, LABELS, CATEGORY_DISPLAY, readJSON, extractScoreData, extractMatchData, formatCard };
