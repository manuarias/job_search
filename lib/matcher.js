/**
 * F6 CV-JD Matcher — Core module
 *
 * Scores a structured CV against extracted JD keywords across five dimensions:
 *   1. Hard keywords (technical skills, tools, languages)
 *   2. Soft keywords (behavioral skills with synonym expansion)
 *   3. Domain match (keyword-to-domain alignment)
 *   4. Seniority fit (years, role level, signals)
 *   5. Fuzzy match (token/ngram overlap)
 *
 * Produces a weighted aggregate score and structured recommendations.
 *
 * CJS module — consumed via `require('./lib/matcher')`.
 *
 * Usage:
 *   const { matchCV } = require('./lib/matcher');
 *   const result = matchCV(cvData, jdKeywords, { weights: { hardKeywords: 0.40, ... } });
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data-paths');

// ── lazy-loaded data caches ─────────────────────────────────────────────────
let _synonyms = null;
let _domainMapping = null;
let _matchWeights = null;

function loadSynonyms() {
  if (!_synonyms) {
    const p = path.join(getDataDir(), 'soft-synonyms.json');
    _synonyms = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return _synonyms;
}

function loadDomainMapping() {
  if (!_domainMapping) {
    const p = path.join(getDataDir(), 'domain-mapping.json');
    _domainMapping = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return _domainMapping;
}

function loadMatchWeights() {
  if (!_matchWeights) {
    const p = path.join(getDataDir(), 'match-weights.json');
    _matchWeights = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return _matchWeights;
}

// ── Text helpers ────────────────────────────────────────────────────────────

/**
 * Extract all searchable text from CV sections relevant to keyword matching.
 * Returns a single lowercase string for fast scanning.
 */
function flattenCVText(cvData) {
  const parts = [];

  // Professional summaries
  if (cvData.professionalSummary) {
    for (const s of cvData.professionalSummary) {
      parts.push(s.text);
    }
  }

  // Core competencies
  if (cvData.coreCompetencies) {
    for (const c of cvData.coreCompetencies) {
      parts.push(c.title, c.description);
    }
  }

  // Skills (all items)
  if (cvData.skills) {
    for (const group of cvData.skills) {
      if (group.items) parts.push(...group.items);
    }
  }

  // Professional experience achievements
  if (cvData.professionalExperience) {
    for (const exp of cvData.professionalExperience) {
      if (exp.role) parts.push(exp.role);
      if (exp.achievements) {
        for (const a of exp.achievements) {
          parts.push(a.text);
          if (a.technologies) parts.push(...a.technologies);
        }
      }
    }
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Tokenize text into lowercase word tokens (split on non-alphanumeric).
 */
function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Generate bigrams from an array of tokens.
 */
function bigrams(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(tokens[i] + ' ' + tokens[i + 1]);
  }
  return result;
}

// ── Hard keywords scorer ────────────────────────────────────────────────────

/**
 * Score CV against JD hard keywords.
 *
 * Strategy: for each JD hard keyword, check if it (or its variants from
 * the taxonomy) appears in CV skills, technologies, or achievement text.
 * A match is found if the lowercase keyword is present as a whole word
 * in the flattened CV text.
 *
 * Returns a scorer result object.
 */
function scoreHardKeywords(cvData, jdKeywords) {
  const cvText = flattenCVText(cvData);
  const hardList = jdKeywords.hardKeywords || [];
  const total = hardList.length;

  if (total === 0) {
    return { score: 1, maxScore: 1, percentage: 1, matched: [], missed: [], total: 0 };
  }

  const matched = [];
  const missed = [];

  for (const kw of hardList) {
    const term = kw.term.toLowerCase();
    // Match whole word in cvText
    const regex = new RegExp('\\b' + escapeRegex(term) + '\\b', 'i');
    if (regex.test(cvText)) {
      matched.push(kw.term);
    } else {
      missed.push(kw.term);
    }
  }

  const score = matched.length;
  const maxScore = total;
  const percentage = total > 0 ? score / maxScore : 1;

  return {
    score,
    maxScore,
    percentage,
    matched,
    missed,
    total,
  };
}

// ── Soft keywords scorer ────────────────────────────────────────────────────

/**
 * Score CV against JD soft keywords using synonym expansion.
 *
 * For each JD soft keyword, check:
 *   1. Direct match of the canonical term in CV text
 *   2. Match of any synonym/alternate phrasing from soft-synonyms.json
 *
 * Returns a scorer result object.
 */
function scoreSoftKeywords(cvData, jdKeywords) {
  const cvText = flattenCVText(cvData);
  const softList = jdKeywords.softKeywords || [];
  const synonyms = loadSynonyms().synonyms;
  const total = softList.length;

  if (total === 0) {
    return { score: 1, maxScore: 1, percentage: 1, matched: [], missed: [], total: 0 };
  }

  const matched = [];
  const missed = [];

  for (const kw of softList) {
    const term = kw.term;
    let found = false;

    // 1. Direct match
    if (new RegExp('\\b' + escapeRegex(term.toLowerCase()) + '\\b', 'i').test(cvText)) {
      found = true;
    }

    // 2. Synonym expansion
    if (!found && synonyms[term]) {
      for (const syn of synonyms[term]) {
        if (new RegExp('\\b' + escapeRegex(syn.toLowerCase()) + '\\b', 'i').test(cvText)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      matched.push(term);
    } else {
      missed.push(term);
    }
  }

  const score = matched.length;
  const maxScore = total;
  const percentage = total > 0 ? score / maxScore : 1;

  return {
    score,
    maxScore,
    percentage,
    matched,
    missed,
    total,
  };
}

// ── Domain match scorer ─────────────────────────────────────────────────────

/**
 * Score domain alignment between CV and JD.
 *
 * Strategy:
 *   1. Map JD hard-keyword categories to domains (via jdCategoryToDomain).
 *   2. Map JD soft keywords to domains (keyword overlap with domain tables).
 *   3. Extract CV domains from achievements[].domains[].
 *   4. Score = Jaccard similarity between JD domain set and CV domain set.
 */
function scoreDomainMatch(cvData, jdKeywords) {
  const domainMapping = loadDomainMapping();

  // ── Collect CV domains ──
  const cvDomains = new Set();
  if (cvData.professionalExperience) {
    for (const exp of cvData.professionalExperience) {
      if (exp.achievements) {
        for (const a of exp.achievements) {
          if (a.domains) {
            for (const d of a.domains) {
              cvDomains.add(d);
            }
          }
        }
      }
    }
  }

  // ── Collect JD domains from hard keywords ──
  const jdDomains = new Set();
  const categoryToDomain = domainMapping.jdCategoryToDomain || {};

  if (jdKeywords.hardKeywords) {
    for (const kw of jdKeywords.hardKeywords) {
      // Map by category
      const domain = categoryToDomain[kw.category];
      if (domain) {
        jdDomains.add(domain);
      }
      // Also check if keyword matches any domain's keyword list directly
      for (const d of domainMapping.domains) {
        if (d.keywords.some(k => k.toLowerCase() === kw.term.toLowerCase())) {
          jdDomains.add(d.id);
        }
      }
    }
  }

  // ── Collect JD domains from soft keywords ──
  if (jdKeywords.softKeywords) {
    for (const kw of jdKeywords.softKeywords) {
      for (const d of domainMapping.domains) {
        if (d.keywords.some(k => k.toLowerCase() === kw.term.toLowerCase())) {
          jdDomains.add(d.id);
        }
      }
    }
  }

  // ── Compute Jaccard similarity ──
  const cvArr = [...cvDomains];
  const jdArr = [...jdDomains];

  if (jdArr.length === 0 && cvArr.length === 0) {
    return { score: 1, maxScore: 1, percentage: 1, cvDomains: cvArr, jdDomains: jdArr,
      matched: cvArr, missed: [], total: 0 };
  }

  const matched = cvArr.filter(d => jdDomains.has(d));
  const missed = jdArr.filter(d => !cvDomains.has(d));

  const intersection = matched.length;
  const union = new Set([...cvDomains, ...jdDomains]).size;

  const percentage = union > 0 ? intersection / union : 1;

  return {
    score: intersection,
    maxScore: jdArr.length || 1,
    percentage,
    cvDomains: cvArr,
    jdDomains: jdArr,
    matched,
    missed,
    total: jdArr.length,
  };
}

// ── Seniority fit scorer ────────────────────────────────────────────────────

/**
 * Score seniority alignment between CV and JD.
 *
 * Strategy:
 *   1. Compare CV total years → JD yearsMinimum
 *   2. Compare CV highest role → JD seniority level
 *   3. Composite score = (yearsFit * 0.6) + (levelFit * 0.4)
 */
function scoreSeniorityFit(cvData, jdKeywords) {
  const signals = jdKeywords.senioritySignals || {};
  const jdLevel = signals.level || 'unknown';
  const jdYears = signals.yearsMinimum || 0;

  // ── Compute CV total years ──
  const cvYears = computeCVYears(cvData);

  // ── Compute CV highest role level ──
  const cvLevel = inferCVLevel(cvData);

  // ── Years fit ──
  let yearsFit = 1.0;
  if (jdYears > 0) {
    if (cvYears >= jdYears * 1.5) {
      yearsFit = 1.0;  // well above minimum
    } else if (cvYears >= jdYears) {
      yearsFit = 0.85; // meets minimum
    } else if (cvYears >= jdYears * 0.7) {
      yearsFit = 0.5;  // close
    } else if (cvYears >= jdYears * 0.5) {
      yearsFit = 0.3;  // somewhat close
    } else {
      yearsFit = 0.1;  // far below
    }
  }

  // ── Level fit ──
  const levelOrder = ['junior', 'mid', 'senior', 'staff', 'principal', 'director', 'vp', 'c-level'];
  const jdLevelIdx = levelOrder.indexOf(jdLevel);
  const cvLevelIdx = levelOrder.indexOf(cvLevel);

  let levelFit = 0.5; // default if unknown
  if (jdLevelIdx >= 0 && cvLevelIdx >= 0) {
    const diff = cvLevelIdx - jdLevelIdx;
    if (diff >= 1) {
      levelFit = 1.0;     // CV level is above JD level
    } else if (diff === 0) {
      levelFit = 0.9;     // exact match
    } else if (diff === -1) {
      levelFit = 0.6;     // one level below
    } else if (diff === -2) {
      levelFit = 0.3;     // two levels below
    } else {
      levelFit = 0.1;     // significantly below
    }
  } else if (jdLevel === 'unknown') {
    levelFit = 1.0;       // no JD level requirement
  }

  const percentage = yearsFit * 0.6 + levelFit * 0.4;

  return {
    score: parseFloat(percentage.toFixed(2)),
    maxScore: 1,
    percentage: parseFloat(percentage.toFixed(2)),
    cvYears,
    jdYears,
    cvLevel,
    jdLevel,
    yearsFit: parseFloat(yearsFit.toFixed(2)),
    levelFit: parseFloat(levelFit.toFixed(2)),
  };
}

/**
 * Compute total years of professional experience from CV dates.
 */
function computeCVYears(cvData) {
  const experience = cvData.professionalExperience || [];
  if (experience.length === 0) return 0;

  let earliestStart = null;
  let latestEnd = null;

  for (const exp of experience) {
    if (exp.dates) {
      if (exp.dates.start) {
        const s = parseYearMonth(exp.dates.start);
        if (s && (!earliestStart || s < earliestStart)) earliestStart = s;
      }
      if (exp.dates.end) {
        const e = parseYearMonth(exp.dates.end);
        if (e && (!latestEnd || e > latestEnd)) latestEnd = e;
      } else {
        // current role → use now
        const now = new Date();
        const nowYM = now.getFullYear() + now.getMonth() / 12;
        if (!latestEnd || nowYM > latestEnd) latestEnd = nowYM;
      }
    }
  }

  if (earliestStart && latestEnd) {
    return Math.max(0, parseFloat((latestEnd - earliestStart).toFixed(1)));
  }
  return 0;
}

function parseYearMonth(ym) {
  if (!ym) return null;
  const parts = String(ym).split('-');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) + (parseInt(parts[1], 10) - 1) / 12;
  }
  const y = parseInt(ym, 10);
  return isNaN(y) ? null : y;
}

/**
 * Infer CV seniority level from role titles.
 */
function inferCVLevel(cvData) {
  const titles = [];
  if (cvData.contact && cvData.contact.titles) {
    titles.push(...cvData.contact.titles);
  }
  if (cvData.professionalExperience) {
    for (const exp of cvData.professionalExperience) {
      if (exp.role) titles.push(exp.role);
    }
  }

  const levels = [
    { keywords: ['c-level', 'cto', 'ceo', 'cpo', 'cio', 'chief', 'vp', 'vice president', 'director'], level: 'director' },
    { keywords: ['principal', 'staff'], level: 'staff' },
    { keywords: ['senior', 'sr.', 'sr ', 'lead', 'leader', 'manager', 'head of'], level: 'senior' },
    { keywords: ['mid', 'semi-senior', 'intermediate', 'mid-level'], level: 'mid' },
    { keywords: ['junior', 'jr.', 'jr ', 'associate', 'trainee'], level: 'junior' },
  ];

  let bestLevel = 'mid';
  let bestIdx = -1;

  for (const title of titles) {
    const lower = title.toLowerCase();
    for (let li = 0; li < levels.length; li++) {
      for (const kw of levels[li].keywords) {
        if (lower.includes(kw)) {
          if (li > bestIdx) {
            bestIdx = li;
            bestLevel = levels[li].level;
          }
          break;
        }
      }
    }
  }

  // Fallback: use years to guess
  if (bestIdx < 0) {
    const years = computeCVYears(cvData);
    if (years >= 10) bestLevel = 'senior';
    else if (years >= 5) bestLevel = 'mid';
    else bestLevel = 'junior';
  }

  return bestLevel;
}

// ── Fuzzy match scorer ──────────────────────────────────────────────────────

/**
 * Score fuzzy/semantic match between CV text and JD text.
 *
 * Strategy: use bigram overlap (Jaccard similarity on bigram sets)
 * between the CV narrative text and a reconstructed JD text from keywords.
 *
 * This is intentionally a lexical overlap metric. The design documents
 * the extension point for replacing this with embedding-based semantic
 * matching (cosine similarity of vector embeddings) in the future.
 *
 * FUTURE EXTENSION: Replace bigramOverlap() with an embedding model call:
 *   1. Embed CV narrative text → vector
 *   2. Embed JD text → vector
 *   3. Return cosine similarity
 * No scorer interface changes needed — just swap the implementation.
 */
function scoreFuzzyMatch(cvData, jdKeywords) {
  const cvText = flattenCVText(cvData);

  // Reconstruct representative JD text from keywords
  const jdParts = [];

  if (jdKeywords.hardKeywords) {
    for (const kw of jdKeywords.hardKeywords) {
      // Weight must-have keywords higher (repeat them)
      const repeat = kw.mustHave ? 2 : 1;
      for (let i = 0; i < repeat; i++) {
        jdParts.push(kw.term);
      }
    }
  }

  if (jdKeywords.softKeywords) {
    for (const kw of jdKeywords.softKeywords) {
      jdParts.push(kw.term);
    }
  }

  // Add seniority title
  if (jdKeywords.senioritySignals && jdKeywords.senioritySignals.title) {
    jdParts.push(jdKeywords.senioritySignals.title);
  }

  const jdText = jdParts.join(' ');

  // Bigram overlap
  const cvTokens = tokenize(cvText);
  const jdTokens = tokenize(jdText);

  if (jdTokens.length === 0) {
    return { score: 1, maxScore: 1, percentage: 1 };
  }

  const cvBigrams = new Set(bigrams(cvTokens));
  const jdBigrams = new Set(bigrams(jdTokens));

  const intersection = [...jdBigrams].filter(b => cvBigrams.has(b)).length;
  const union = new Set([...cvBigrams, ...jdBigrams]).size;

  const percentage = union > 0 ? intersection / union : 0;

  return {
    score: intersection,
    maxScore: jdBigrams.size || 1,
    percentage: parseFloat(percentage.toFixed(2)),
  };
}

// ── Weighted aggregator ─────────────────────────────────────────────────────

/**
 * Aggregate individual scorer results into a weighted overall score.
 */
function weightedAggregate(scorerResults, weights) {
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const [key, result] of Object.entries(scorerResults)) {
    const weight = weights[key] || 0;
    totalWeighted += (result.percentage || 0) * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  return parseFloat(overall.toFixed(4));
}

// ── Recommendation generator ────────────────────────────────────────────────

/**
 * Generate structured recommendations based on match scores.
 */
function generateRecommendations(overallPercentage, scorerResults, weightConfig) {
  const levels = weightConfig.recommendationLevels || {};
  const thresholds = weightConfig.thresholds || {};

  // Determine recommendation level — pick the highest threshold that matches
  const sortedLevels = Object.entries(levels)
    .sort((a, b) => b[1].minScore - a[1].minScore); // descending by threshold

  let level = 'skip';
  let label = 'Poor match — reconsider or upskill first';
  for (const [key, def] of sortedLevels) {
    if (overallPercentage >= def.minScore) {
      level = key;
      label = def.label;
      break; // first match is the highest threshold
    }
  }

  const actions = [];

  // Weakest scorer → highest priority action
  const sortedScorers = Object.entries(scorerResults)
    .map(([name, result]) => ({ name, ...result }))
    .sort((a, b) => a.percentage - b.percentage);

  for (const scorer of sortedScorers) {
    if (scorer.percentage < 0.5) {
      actions.push({
        priority: 'high',
        action: generateActionForScorer(scorer.name, scorer),
        impact: 'high',
      });
    } else if (scorer.percentage < 0.7) {
      actions.push({
        priority: 'medium',
        action: generateActionForScorer(scorer.name, scorer),
        impact: 'medium',
      });
    }
  }

  // If all good, add a reinforcement action
  if (actions.length === 0 && overallPercentage >= 0.75) {
    actions.push({
      priority: 'low',
      action: 'CV is already well-aligned with this JD. Tailor the professional summary to echo the role title and top 3 must-have keywords.',
      impact: 'low',
    });
  }

  return { level, label, actions };
}

function generateActionForScorer(name, result) {
  const d = result.details || result;
  const missed = d.missed || [];
  const actions = {
    hardKeywords: `Add missing technical keywords to CV: ${missed.slice(0, 5).join(', ')}${missed.length > 5 ? ' and ' + (missed.length - 5) + ' more' : ''}. Weave these into achievements and skills sections.`,
    softKeywords: `Highlight behavioral skills missing from CV: ${missed.slice(0, 5).join(', ')}${missed.length > 5 ? ' and ' + (missed.length - 5) + ' more' : ''}. Rewrite bullets using the JD's exact language for these soft skills.`,
    domainMatch: `Bridge domain gaps: ${missed.slice(0, 3).join(', ')}. Reframe existing achievements to show experience in these areas, or identify adjacent experience that transfers.`,
    seniorityFit: `Address seniority gap: CV has ${d.cvYears || 0} years vs JD's ${d.jdYears || 0} years minimum. Emphasize leadership scope, team size, and strategic impact. Use the highest-relevant title.`,
    fuzzyMatch: `Improve semantic alignment: the CV's narrative language differs from the JD. Rewrite the professional summary and competency bullets using the JD's exact terminology and phrasing.`,
  };
  return actions[name] || `Improve ${name} score (currently ${Math.round((result.percentage || 0) * 100)}%).`;
}

// ── Escape regex ────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Match a CV against extracted JD keywords.
 *
 * @param {object} cvData - Structured CV data (matching cv.schema.json).
 * @param {object} jdKeywords - Extracted JD keywords (matching keyword-output.schema.json).
 * @param {object} [options] - Optional overrides.
 * @param {object} [options.weights] - Custom scorer weights (merged with defaults).
 * @returns {object} Structured match result matching match-output.schema.json.
 */
function matchCV(cvData, jdKeywords, options) {
  const startTime = Date.now();
  const opts = options || {};

  const weightConfig = loadMatchWeights();
  const weights = { ...weightConfig.weights, ...(opts.weights || {}) };

  // ── Run all 5 scorers ──
  const hardResult = scoreHardKeywords(cvData, jdKeywords);
  const softResult = scoreSoftKeywords(cvData, jdKeywords);
  const domainResult = scoreDomainMatch(cvData, jdKeywords);
  const seniorityResult = scoreSeniorityFit(cvData, jdKeywords);
  const fuzzyResult = scoreFuzzyMatch(cvData, jdKeywords);

  // ── Build scorer result objects ──
  function buildScorerResult(name, raw, w) {
    return {
      score: raw.score,
      maxScore: raw.maxScore,
      percentage: raw.percentage,
      weight: w,
      weightedScore: parseFloat((raw.percentage * w).toFixed(4)),
      details: raw,
    };
  }

  const scorerResults = {
    hardKeywords: buildScorerResult('hardKeywords', hardResult, weights.hardKeywords),
    softKeywords: buildScorerResult('softKeywords', softResult, weights.softKeywords),
    domainMatch: buildScorerResult('domainMatch', domainResult, weights.domainMatch),
    seniorityFit: buildScorerResult('seniorityFit', seniorityResult, weights.seniorityFit),
    fuzzyMatch: buildScorerResult('fuzzyMatch', fuzzyResult, weights.fuzzyMatch),
  };

  // ── Weighted aggregate ──
  const overallPercentage = weightedAggregate(scorerResults, weights);
  const overall = {
    score: Math.round(overallPercentage * 100),
    maxScore: 100,
    percentage: overallPercentage,
  };

  // ── Summary ──
  const totalKeywords = (jdKeywords.hardKeywords || []).length + (jdKeywords.softKeywords || []).length;
  const totalMatched = hardResult.matched.length + softResult.matched.length;
  const keywordCoverage = {
    matched: totalMatched,
    total: totalKeywords,
    percentage: totalKeywords > 0 ? parseFloat((totalMatched / totalKeywords).toFixed(2)) : 1,
  };

  const strengths = [];
  const gaps = [];

  for (const [name, result] of Object.entries(scorerResults)) {
    if (result.percentage >= 0.7) {
      strengths.push(generateStrength(name, result));
    } else if (result.percentage < 0.5) {
      gaps.push(generateGap(name, result));
    }
  }

  // ── Recommendation ──
  const recommendation = generateRecommendations(overallPercentage, scorerResults, weightConfig);

  // ── Metadata ──
  const metadata = {
    matchedAt: new Date().toISOString(),
    matcherVersion: '1.0.0',
    weightsUsed: {
      hardKeywords: weights.hardKeywords,
      softKeywords: weights.softKeywords,
      domainMatch: weights.domainMatch,
      seniorityFit: weights.seniorityFit,
      fuzzyMatch: weights.fuzzyMatch,
    },
    processingTimeMs: Date.now() - startTime,
  };

  return {
    overall,
    scorers: scorerResults,
    summary: {
      strengths,
      gaps,
      keywordCoverage,
    },
    recommendation,
    metadata,
  };
}

function generateStrength(name, result) {
  const labels = {
    hardKeywords: `Strong technical keyword match (${Math.round(result.percentage * 100)}%)`,
    softKeywords: `Strong soft-skill alignment (${Math.round(result.percentage * 100)}%)`,
    domainMatch: `Domain expertise matches JD requirements`,
    seniorityFit: `Seniority level aligns well with role`,
    fuzzyMatch: `Narrative language aligns with JD terminology`,
  };
  return labels[name] || `${name}: ${Math.round(result.percentage * 100)}%`;
}

function generateGap(name, result) {
  const labels = {
    hardKeywords: `Missing ${result.details.missed ? result.details.missed.length : 0} technical keywords`,
    softKeywords: `Soft-skill gaps: ${result.details.missed ? result.details.missed.slice(0, 3).join(', ') : ''}`,
    domainMatch: `Domain coverage gap (${Math.round(result.percentage * 100)}%)`,
    seniorityFit: `Seniority level misalignment`,
    fuzzyMatch: `Narrative language differs from JD`,
  };
  return labels[name] || `${name}: ${Math.round(result.percentage * 100)}%`;
}

module.exports = { matchCV };
