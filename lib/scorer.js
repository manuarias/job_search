/**
 * F7 Scoring Engine — Core module
 *
 * Consumes F6 match output + CV JSON data to produce a 3-category weighted
 * rubric matching the AGENTS.md Step 5 format:
 *   - ATS-Parseability (40%)
 *   - Keyword Alignment (30%)
 *   - Recruiter Appeal (30%)
 *
 * Also generates mechanical quick wins (separate from F6's semantic
 * recommendations) and gap-to-target analysis.
 *
 * CJS module — consumed via `require('./lib/scorer')`.
 *
 * Usage:
 *   const { scoreCV } = require('./lib/scorer');
 *   const result = scoreCV(cvData, matchResult, { targetScore: 90 });
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── data file paths ────────────────────────────────────────────────────────
const SCORE_CONFIG_PATH = path.join(__dirname, '..', 'data', 'score-config.json');

// ── lazy-loaded config cache ─────────────────────────────────────────────────
let _config = null;

function loadConfig() {
  if (!_config) _config = require(SCORE_CONFIG_PATH);
  return _config;
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract all bullet texts from CV data (professionalSummary + achievements).
 * Returns an array of { text, location } objects for traceability.
 */
function extractBullets(cvData) {
  const bullets = [];

  // Professional summary bullets
  if (cvData.professionalSummary) {
    for (let i = 0; i < cvData.professionalSummary.length; i++) {
      bullets.push({
        text: cvData.professionalSummary[i].text || '',
        location: `summary[${i}]`,
        section: 'professionalSummary',
      });
    }
  }

  // Professional experience achievement bullets
  if (cvData.professionalExperience) {
    for (let ei = 0; ei < cvData.professionalExperience.length; ei++) {
      const exp = cvData.professionalExperience[ei];
      if (exp.achievements) {
        for (let ai = 0; ai < exp.achievements.length; ai++) {
          bullets.push({
            text: exp.achievements[ai].text || '',
            location: `experience[${ei}].achievement[${ai}]`,
            section: 'professionalExperience',
            experienceIndex: ei,
            achievementIndex: ai,
          });
        }
      }
    }
  }

  return bullets;
}

/**
 * Check if text contains a number, percentage, or dollar amount (metric).
 */
function hasMetric(text) {
  // Percentage patterns
  if (/[\d.,]+\s*%/i.test(text)) return true;
  // Dollar amounts
  if (/\$\s*\d/i.test(text)) return true;
  // Digit followed by common metric-unit keywords
  if (/\d+[kK]?\s*(?:users?|engineers?|devs?|members?|RPM|hours?|weeks?|months?|days?|promotions?|squads?|teams?|systems?|pipelines?|deployments?|releases?)/i.test(text)) return true;
  // Fractions like "3/5"
  if (/\d+\s*\/\s*\d+/i.test(text)) return true;
  // Approximations like "~20", "~2h"
  if (/~\d/i.test(text)) return true;
  // Time reduction patterns like "from ~2h to ~30min", "from X to Y"
  if (/from\s+~?\d/i.test(text) && /to\s+~?\d/i.test(text)) return true;
  // Standalone numbers with contextual scaling words
  if (/\d+[xX]\b/.test(text)) return true;
  return false;
}

/**
 * Check if the first word of a bullet is an action verb from the config list.
 */
function leadsWithActionVerb(text, actionVerbs) {
  const firstWord = text.trim().split(/\s+/)[0].toLowerCase().replace(/[.,;:!?]$/, '');
  return actionVerbs.some(v => v.toLowerCase() === firstWord);
}

/**
 * Count lines in a bullet (splits on newlines; minimum 1).
 */
function countBulletLines(text) {
  return (text || '').split('\n').filter(l => l.trim().length > 0).length || 1;
}

/**
 * Syllable-count heuristic: count vowel groups in a word.
 * English-centric — returns approximate syllable count.
 */
function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return 1;
  const matches = cleaned.match(/[aeiouy]+/g);
  // Subtract silent 'e' at end
  let count = matches ? matches.length : 1;
  if (cleaned.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

/**
 * Estimate readability using a syllable/word heuristic.
 * Returns a score 0–100 where higher = easier to read.
 */
function readabilityScore(bullets, config) {
  const readCfg = config.recruiter.readability;
  const maxSyllables = readCfg.maxSyllablesPerWord;
  const maxSentenceWords = readCfg.maxWordsPerSentence;

  if (!bullets || bullets.length === 0) return 100;

  let totalWords = 0;
  let heavyWords = 0;        // words with too many syllables
  let totalSentences = 0;
  let longSentences = 0;     // sentences with too many words

  for (const b of bullets) {
    const sentences = b.text.split(/[.?!]\s+/);
    for (const s of sentences) {
      const words = s.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) continue;
      totalSentences++;

      if (words.length > maxSentenceWords) {
        longSentences++;
      }

      for (const w of words) {
        // Skip numbers and short words
        if (/^\d/.test(w) || w.length <= 2) continue;
        totalWords++;
        if (countSyllables(w) > maxSyllables) {
          heavyWords++;
        }
      }
    }
  }

  // Compute sub-scores
  const heavyWordPenalty = totalWords > 0 ? (heavyWords / totalWords) : 0;
  const longSentencePenalty = totalSentences > 0 ? (longSentences / totalSentences) : 0;

  // Start at 100, penalize for each issue
  let score = 100;
  score -= heavyWordPenalty * 30;      // up to 30 points off for heavy words
  score -= longSentencePenalty * 20;    // up to 20 points off for long sentences

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if a bullet contains passive voice using the config regex.
 */
function hasPassiveVoice(text, patternRegex) {
  try {
    const re = new RegExp(patternRegex, 'i');
    return re.test(text);
  } catch {
    return false;
  }
}

/**
 * Check if a bullet exceeds the maximum line count.
 */
function exceedsMaxLines(text, maxLines) {
  return countBulletLines(text) > maxLines;
}

// ── Sub-scorer: ATS Parseability ─────────────────────────────────────────────

/**
 * Score CV's ATS parseability.
 *
 * Checks:
 *   1. CV JSON required sections presence
 *   2. Date format compliance (YYYY-MM)
 *   3. Non-empty IDs on experience entries
 *
 * If cvMdPath is provided, also checks the rendered Markdown for:
 *   - Tables (pipe characters)
 *   - Special Unicode characters ATS bots may choke on
 *   - Missing section headers
 *
 * @param {object} cvData - Structured CV data
 * @param {string} [cvMdPath] - Optional path to rendered CV Markdown file
 * @returns {object} Scorer result
 */
function scoreATSParseability(cvData, cvMdPath) {
  const config = loadConfig();
  const atsConfig = config.ats;
  const deductions = atsConfig.deductions;
  const maxScore = 100;
  let score = maxScore;

  const missingSections = [];
  const dateIssues = [];
  const mdIssues = [];
  const idIssues = [];

  // 1. Check required sections
  for (const section of atsConfig.requiredSections) {
    if (!cvData[section] || (Array.isArray(cvData[section]) && cvData[section].length === 0)) {
      missingSections.push(section);
      score -= deductions.missingSection;
    }
  }

  // 2. Check date formats
  const dateRegex = new RegExp(atsConfig.dateRegex);
  if (cvData.professionalExperience) {
    for (let i = 0; i < cvData.professionalExperience.length; i++) {
      const exp = cvData.professionalExperience[i];
      if (exp.dates) {
        ['start', 'end'].forEach(field => {
          const val = exp.dates[field];
          if (val && !dateRegex.test(String(val))) {
            dateIssues.push({
              field: `experience[${i}].dates.${field}`,
              value: val,
              expected: atsConfig.dateFormat,
            });
            score -= deductions.dateFormatViolation;
          }
        });
      }
    }
  }

  // 3. Check non-empty IDs on experience entries
  if (cvData.professionalExperience) {
    for (let i = 0; i < cvData.professionalExperience.length; i++) {
      const exp = cvData.professionalExperience[i];
      if (!exp.id || (typeof exp.id === 'string' && exp.id.trim() === '')) {
        idIssues.push({ field: `experience[${i}].id`, issue: 'missing-or-empty' });
        score -= deductions.nonStandardId;
      }
    }
  }

  // 4. MD checks (only if path provided and file exists)
  if (cvMdPath) {
    try {
      const mdContent = fs.readFileSync(cvMdPath, 'utf8');

      // Check for tables (pipe characters in non-code blocks)
      if (atsConfig.mdChecks.tables) {
        const lines = mdContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('|') && !lines[i].trim().startsWith('```')) {
            mdIssues.push({ type: 'table', line: i + 1, description: 'Table detected — ATS may fail to parse' });
            score -= deductions.mdTable;
            break; // one table flag is enough
          }
        }
      }

      // Check for special chars
      for (const char of atsConfig.mdChecks.specialChars) {
        if (mdContent.includes(char)) {
          mdIssues.push({ type: 'special-char', char, description: `Unicode character "${char}" — may confuse ATS` });
          score -= deductions.mdSpecialChar;
        }
      }

      // Check for missing section headers
      const lowerContent = mdContent.toLowerCase();
      for (const [section, labels] of Object.entries(atsConfig.mdChecks.headerLabels)) {
        const found = labels.some(label => lowerContent.includes(label));
        if (!found) {
          mdIssues.push({ type: 'missing-header', section, description: `Section header "${labels[0]}" not found in MD` });
          score -= deductions.mdMissingHeader;
        }
      }
    } catch {
      mdIssues.push({ type: 'read-error', description: `Could not read cvMdPath: ${cvMdPath}` });
    }
  }

  score = Math.max(0, Math.min(100, score));
  const percentage = score / maxScore;

  return {
    score,
    maxScore,
    percentage: parseFloat(percentage.toFixed(4)),
    details: {
      missingSections,
      dateIssues,
      mdIssues,
      idIssues,
      cvMdChecked: !!cvMdPath,
    },
  };
}

// ── Sub-scorer: Keyword Alignment ────────────────────────────────────────────

/**
 * Score keyword alignment by wrapping F6's overall composite score.
 *
 * F6's `overall.score` (0–100) is the primary input. A configurable
 * floor/ceiling multiplier is applied to account for the fact that F6
 * measures CV-to-JD match rather than absolute keyword quality.
 *
 * When no F6 data is available, returns a configurable default.
 *
 * @param {object} matchResult - F6 match output
 * @returns {object} Scorer result
 */
function scoreKeywordAlignment(matchResult) {
  const config = loadConfig();
  const kaConfig = config.keywordAlignment;
  const maxScore = 100;

  let f6Score = null;
  let multiplierUsed = null;

  // Extract F6 overall score
  if (matchResult && matchResult.overall && typeof matchResult.overall.score === 'number') {
    f6Score = matchResult.overall.score;
  } else if (matchResult && typeof matchResult.overall === 'number') {
    f6Score = matchResult.overall;
  }

  if (f6Score === null) {
    // No F6 data — use default
    const base = kaConfig.emptyMatchDefault;
    return {
      score: base,
      maxScore,
      percentage: parseFloat((base / maxScore).toFixed(4)),
      details: {
        f6Score: null,
        multiplierUsed: null,
        note: 'No F6 match data available; using default score',
      },
    };
  }

  // Apply floor/ceiling multiplier
  // If F6 score is high, ceiling may cap; if low, floor lifts slightly
  const floor = kaConfig.floorMultiplier; // 0.95
  const ceiling = kaConfig.ceilingMultiplier; // 1.0

  let multiplier = (f6Score / 100) * (ceiling - floor) + floor;
  multiplier = Math.max(floor, Math.min(ceiling, multiplier));
  multiplierUsed = parseFloat(multiplier.toFixed(4));

  const score = Math.round(f6Score * multiplierUsed);
  const percentage = score / maxScore;

  return {
    score: Math.max(0, Math.min(100, score)),
    maxScore,
    percentage: parseFloat(percentage.toFixed(4)),
    details: {
      f6Score,
      multiplierUsed,
      f6MatchLevel: matchResult && matchResult.recommendation ? matchResult.recommendation.level : null,
    },
  };
}

// ── Sub-scorer: Recruiter Appeal ─────────────────────────────────────────────

/**
 * Score recruiter appeal across four sub-dimensions:
 *   1. Metrics-per-bullet ratio (≥50% target)
 *   2. Action-verb lead ratio (>60% target)
 *   3. Bullet-length compliance (<2 lines each)
 *   4. Readability (syllable/word heuristic)
 *
 * Each sub-dimension is weighted by recruiter.subWeights.
 *
 * @param {object} cvData - Structured CV data
 * @returns {object} Scorer result
 */
function scoreRecruiterAppeal(cvData) {
  const config = loadConfig();
  const recConfig = config.recruiter;
  const thresholds = recConfig.thresholds;
  const subWeights = recConfig.subWeights;
  const maxScore = 100;

  const bullets = extractBullets(cvData);
  const totalBullets = bullets.length;

  if (totalBullets === 0) {
    return {
      score: 0,
      maxScore,
      percentage: 0,
      details: {
        totalBullets: 0,
        metricsRatio: 0,
        actionVerbRatio: 0,
        bulletLengthCompliance: 0,
        readabilityScore: 0,
        bulletIssues: [],
        note: 'No bullets found in CV',
      },
    };
  }

  // 1. Metrics-per-bullet ratio
  const bulletFlags = []; // track issues per bullet for quick-wins
  let metricsCount = 0;
  let actionVerbCount = 0;
  let bulletLengthCompliant = 0;
  const passiveVoiceBullets = [];

  const passivePattern = config.quickWins.patterns.passiveVoice;

  for (const b of bullets) {
    const flags = [];
    if (hasMetric(b.text)) {
      metricsCount++;
    } else {
      flags.push('missing-metric');
    }
    if (leadsWithActionVerb(b.text, recConfig.actionVerbs)) {
      actionVerbCount++;
    } else {
      flags.push('missing-action-verb');
    }
    if (countBulletLines(b.text) <= thresholds.maxBulletLines) {
      bulletLengthCompliant++;
    } else {
      flags.push('bullet-too-long');
    }
    if (hasPassiveVoice(b.text, passivePattern)) {
      flags.push('passive-voice');
      passiveVoiceBullets.push({ text: b.text.substring(0, 100), location: b.location });
    }
    if (flags.length > 0) {
      bulletFlags.push({ location: b.location, flags, textPreview: b.text.substring(0, 80) });
    }
  }

  const metricsRatio = totalBullets > 0 ? metricsCount / totalBullets : 0;
  const actionVerbRatio = totalBullets > 0 ? actionVerbCount / totalBullets : 0;
  const bulletLengthComplianceVal = totalBullets > 0 ? bulletLengthCompliant / totalBullets : 1;

  // 2. Readability
  const readScore = readabilityScore(bullets, config);

  // Compute sub-scores (each 0–100)
  // metricsRatio: if ratio ≥ threshold → 100, else proportional
  const metricsSubScore = metricsRatio >= thresholds.metricsRatio
    ? 100
    : Math.round((metricsRatio / thresholds.metricsRatio) * 100);

  const verbSubScore = actionVerbRatio > thresholds.actionVerbRatio
    ? 100
    : Math.round((actionVerbRatio / thresholds.actionVerbRatio) * 100);

  const lengthSubScore = Math.round(bulletLengthComplianceVal * 100);

  // Weighted recruiter appeal score
  const recruiterScore =
    metricsSubScore * subWeights.metricsRatio +
    verbSubScore * subWeights.actionVerbRatio +
    lengthSubScore * subWeights.bulletLengthCompliance +
    readScore * subWeights.readability;

  const finalScore = Math.round(recruiterScore);

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    maxScore,
    percentage: parseFloat((finalScore / maxScore).toFixed(4)),
    details: {
      totalBullets,
      metricsCount,
      metricsRatio: parseFloat(metricsRatio.toFixed(4)),
      metricsSubScore,
      actionVerbCount,
      actionVerbRatio: parseFloat(actionVerbRatio.toFixed(4)),
      actionVerbSubScore: verbSubScore,
      bulletLengthCompliant,
      bulletLengthTotal: totalBullets,
      bulletLengthCompliance: parseFloat(bulletLengthComplianceVal.toFixed(4)),
      bulletLengthSubScore: lengthSubScore,
      readabilityScore: readScore,
      passiveVoiceCount: passiveVoiceBullets.length,
      bulletIssues: bulletFlags,
      passiveVoiceBullets,
    },
  };
}

// ── Weighted aggregator ─────────────────────────────────────────────────────

/**
 * Aggregate three category results into a final 0–100 score.
 *
 * final = round(Σ (category.percentage × 100 × weight_i))
 *
 * @param {object} categoryResults - { atsParseability, keywordAlignment, recruiterAppeal }
 * @param {object} weights - { atsParseability, keywordAlignment, recruiterAppeal }
 * @returns {number} 0–100 final score
 */
function aggregate(categoryResults, weights) {
  let totalWeighted = 0;

  for (const [key, result] of Object.entries(categoryResults)) {
    const w = weights[key] || 0;
    totalWeighted += (result.percentage || 0) * 100 * w;
  }

  return Math.round(totalWeighted);
}

// ── Quick wins generator ────────────────────────────────────────────────────

/**
 * Generate mechanical, format-focused quick wins from category details.
 * These are distinct from F6's semantic recommendations — they focus on
 * deterministic CV formatting issues.
 *
 * Scans:
 *   - atsParseability.details: missing sections, date format issues, MD issues
 *   - recruiterAppeal.details: passive voice, missing metrics, bullet length
 *
 * @param {object} categoryResults - Results from all three sub-scorers
 * @returns {Array<{type, location, fix, priority}>} Quick wins
 */
function generateQuickWins(categoryResults) {
  const config = loadConfig();
  const priorities = config.quickWins.priorities;
  const wins = [];

  // ── ATS parseability issues ──
  const ats = categoryResults.atsParseability;
  if (ats && ats.details) {
    const d = ats.details;

    // Missing sections
    for (const section of (d.missingSections || [])) {
      wins.push({
        type: 'missing-section',
        location: `cv.${section}`,
        fix: `Add "${section}" section to CV. ATS parsers expect this section.`,
        priority: priorities['missing-section'] || 'high',
      });
    }

    // Date format issues
    for (const issue of (d.dateIssues || [])) {
      wins.push({
        type: 'date-format',
        location: issue.field,
        fix: `Change date format at ${issue.field} from "${issue.value}" to "${issue.expected}" (e.g., "2023-01").`,
        priority: priorities['date-format'] || 'high',
      });
    }

    // MD issues
    for (const issue of (d.mdIssues || [])) {
      wins.push({
        type: `md-${issue.type}`,
        location: issue.line ? `line ${issue.line}` : 'markdown',
        fix: issue.description || 'Fix Markdown formatting issue.',
        priority: issue.type === 'table' ? 'high' : 'medium',
      });
    }

    // ID issues
    for (const issue of (d.idIssues || [])) {
      wins.push({
        type: 'non-standard-id',
        location: issue.field,
        fix: `Add a UUID to ${issue.field} for reliable ATS parsing.`,
        priority: priorities['non-standard-id'] || 'low',
      });
    }
  }

  // ── Recruiter appeal issues ──
  const rec = categoryResults.recruiterAppeal;
  if (rec && rec.details) {
    const d = rec.details;

    // Bullet-level issues
    for (const issue of (d.bulletIssues || [])) {
      const flags = issue.flags || [];

      if (flags.includes('missing-metric')) {
        wins.push({
          type: 'missing-metric',
          location: issue.location,
          fix: `Add a quantifiable metric (%, $, users, hours, RPM) to "${issue.textPreview}..."`,
          priority: priorities['missing-metric'] || 'high',
        });
      }

      if (flags.includes('passive-voice')) {
        wins.push({
          type: 'passive-voice',
          location: issue.location,
          fix: `Rewrite bullet using active voice (e.g., "Led..." instead of "Was responsible for...").`,
          priority: priorities['passive-voice'] || 'medium',
        });
      }

      if (flags.includes('bullet-too-long')) {
        wins.push({
          type: 'bullet-length',
          location: issue.location,
          fix: `Shorten bullet to 2 lines maximum: "${issue.textPreview}..."`,
          priority: priorities['bullet-length'] || 'medium',
        });
      }

      if (flags.includes('missing-action-verb')) {
        wins.push({
          type: 'missing-action-verb',
          location: issue.location,
          fix: `Start bullet with a strong action verb (e.g., Built, Led, Shipped, Scaled) instead of "${issue.textPreview.split(' ')[0]}".`,
          priority: 'medium',
        });
      }
    }

    // Passive voice bullets (already covered in bulletIssues, but add context)
    for (const pv of (d.passiveVoiceBullets || [])) {
      // Only add if not already covered by bulletIssues
      const alreadyCovered = wins.some(w => w.location === pv.location && w.type === 'passive-voice');
      if (!alreadyCovered) {
        wins.push({
          type: 'passive-voice',
          location: pv.location,
          fix: `Rewrite bullet using active voice: "${pv.text}..."`,
          priority: priorities['passive-voice'] || 'medium',
        });
      }
    }
  }

  return wins;
}

// ── Gap-to-target analysis ──────────────────────────────────────────────────

/**
 * Compute gap between final score and target, identifying the highest-shortfall
 * category and per-category breakdown.
 *
 * @param {number} final - Final weighted score (0–100)
 * @param {object} categories - Category results with weight and percentage
 * @param {number} targetScore - Target score to reach
 * @returns {object} Gap analysis
 */
function gapAnalysis(final, categories, targetScore) {
  const gap = Math.max(0, targetScore - final);
  const perCategory = [];
  let highestGapCategory = null;
  let highestShortfall = 0;

  for (const [key, cat] of Object.entries(categories)) {
    const weight = cat.weight || 0;
    const targetContribution = Math.round(targetScore * weight);
    const actualContribution = Math.round((cat.percentage || 0) * 100 * weight);
    const shortfall = Math.max(0, targetContribution - actualContribution);

    perCategory.push({
      category: key,
      shortfall,
      targetContribution,
      actualContribution,
      percentage: parseFloat((cat.percentage || 0).toFixed(4)),
      weight,
    });

    if (shortfall > highestShortfall) {
      highestShortfall = shortfall;
      highestGapCategory = key;
    }
  }

  return {
    target: targetScore,
    current: final,
    gap,
    highestGapCategory,
    highestShortfall,
    perCategory,
  };
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Score a CV against F6 match results using the 3-category rubric.
 *
 * @param {object} cvData - Structured CV data (matching cv.schema.json)
 * @param {object} matchResult - F6 match output (matching match-output.schema.json)
 * @param {object} [options] - Optional overrides
 * @param {number} [options.targetScore=90] - Target score for gap analysis
 * @param {string} [options.cvMdPath] - Path to rendered CV Markdown for ATS MD checks
 * @returns {object} ScoreResult with final, categories, quickWins, gapToTarget, metadata
 */
function scoreCV(cvData, matchResult, options) {
  const startTime = Date.now();
  const opts = options || {};

  const config = loadConfig();
  const weights = { ...config.weights };
  const targetScore = typeof opts.targetScore === 'number' ? opts.targetScore : config.targetScore;

  // Validate inputs
  if (!cvData || typeof cvData !== 'object') {
    throw new Error('scoreCV: cvData must be an object');
  }
  if (!matchResult || typeof matchResult !== 'object') {
    throw new Error('scoreCV: matchResult must be an object');
  }

  // ── Run 3 sub-scorers ──
  const atsResult = scoreATSParseability(cvData, opts.cvMdPath || null);
  const keywordResult = scoreKeywordAlignment(matchResult);
  const recruiterResult = scoreRecruiterAppeal(cvData);

  // ── Build category result objects ──
  function buildCategoryResult(name, raw, w) {
    return {
      score: raw.score,
      maxScore: raw.maxScore,
      percentage: raw.percentage,
      weight: w,
      weightedScore: parseFloat((raw.percentage * w).toFixed(4)),
      details: raw.details,
    };
  }

  const categories = {
    atsParseability: buildCategoryResult('atsParseability', atsResult, weights.atsParseability),
    keywordAlignment: buildCategoryResult('keywordAlignment', keywordResult, weights.keywordAlignment),
    recruiterAppeal: buildCategoryResult('recruiterAppeal', recruiterResult, weights.recruiterAppeal),
  };

  // ── Aggregate ──
  const final = aggregate(categories, weights);

  // ── Quick wins ──
  const quickWins = generateQuickWins(categories);

  // ── Gap analysis ──
  const gapToTarget = gapAnalysis(final, categories, targetScore);

  // ── Metadata ──
  const metadata = {
    scoredAt: new Date().toISOString(),
    scorerVersion: '1.0.0',
    weightsUsed: { ...weights },
    targetScore,
    processingTimeMs: Date.now() - startTime,
  };

  return {
    final,
    categories,
    quickWins,
    gapToTarget,
    metadata,
  };
}

module.exports = {
  scoreCV,
  // Exported for unit testing
  scoreATSParseability,
  scoreKeywordAlignment,
  scoreRecruiterAppeal,
  aggregate,
  generateQuickWins,
  gapAnalysis,
};
