/**
 * F8 CV Assembler — Core module
 *
 * Consumes structured CV JSON (F3) + matchResult (F6) and produces:
 *   - Complete JD-optimized CV Markdown
 *   - Reframe hints for external LLM agent
 *   - Low-confidence flag
 *   - Stats audit trail
 *
 * CJS module — consumed via `require('./lib/assembler')`.
 *
 * Usage:
 *   const { assembleCV } = require('./lib/assembler');
 *   const result = assembleCV(cvData, matchResult, { maxAchievementsPerRole: 4 });
 */

'use strict';

// ── Config constants ─────────────────────────────────────────────────────────
const DEFAULT_N = 4;
const LOW_CONFIDENCE_THRESHOLD = 0.35;
const REFRAME_MIN_RELEVANCE = 0.4;

// Impact multiplier mapping
const IMPACT_MULT = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract all JD hard keyword terms and JD domains from the match result.
 */
function extractJDContext(matchResult) {
  const hk = matchResult.scorers.hardKeywords.details;
  const hardKeywords = [...(hk.matched || []), ...(hk.missed || [])];
  const jdDomains = matchResult.scorers.domainMatch.details.jdDomains || [];
  return { hardKeywords, jdDomains };
}

/**
 * Build a set of all searchable terms from an achievement.
 * Covers technologies, tags, and domains (both hyphenated and space-separated forms).
 */
function achievementTermSet(ach) {
  const terms = new Set();
  if (ach.technologies) {
    for (const t of ach.technologies) terms.add(t.toLowerCase());
  }
  if (ach.tags) {
    for (const t of ach.tags) terms.add(t.toLowerCase());
  }
  if (ach.domains) {
    for (const d of ach.domains) {
      terms.add(d.toLowerCase());
      // Also add space-separated form (e.g., "delivery-management" → "delivery management")
      terms.add(d.replace(/-/g, ' ').toLowerCase());
    }
  }
  return terms;
}

/**
 * Compute Jaccard similarity between two sets.
 */
function jaccard(setA, setB) {
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Check if text contains any of the given terms (case-insensitive word-boundary match).
 */
function textContainsAnyTerm(text, terms) {
  if (!text || !terms || terms.length === 0) return false;
  const lower = text.toLowerCase();
  for (const t of terms) {
    const escaped = escapeRegex(t.toLowerCase());
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Count how many JD hard keyword terms appear in the given term set.
 */
function countKeywordMatches(achTermSet, jdHardKeywords) {
  let count = 0;
  for (const kw of jdHardKeywords) {
    const kwLower = kw.toLowerCase();
    if (achTermSet.has(kwLower)) {
      count++;
      continue;
    }
    // Also check space-separated variant (e.g., "delivery management" might match "delivery-management")
    const kwSpaces = kwLower.replace(/-/g, ' ');
    if (kwSpaces !== kwLower && achTermSet.has(kwSpaces)) {
      count++;
    }
  }
  return count;
}

/**
 * Compute domain-set key for deduplication in selection.
 * Returns a sorted, joined string of domains.
 */
function domainKey(ach) {
  const domains = ach.domains || [];
  return [...domains].sort().join('|');
}

// ── Core ranking ─────────────────────────────────────────────────────────────

/**
 * Rank a single achievement against JD keywords and domains.
 *
 * @param {object} ach - Achievement with technologies[], tags[], domains[], impact.
 * @param {string[]} jdHardKeywords - JD hard keyword terms.
 * @param {string[]} jdDomains - JD domain identifiers.
 * @returns {number} Relevance score (0–unbounded; higher = better match).
 */
function rankAchievement(ach, jdHardKeywords, jdDomains) {
  const achTerms = achievementTermSet(ach);

  // keywordOverlap: count of JD hard-keyword terms found in achievement
  const keywordOverlap = countKeywordMatches(achTerms, jdHardKeywords);

  // domainBoost: Jaccard between achievement domains and JD domains
  const achDomainSet = new Set((ach.domains || []).map(d => d.toLowerCase()));
  const jdDomainSet = new Set((jdDomains || []).map(d => d.toLowerCase()));
  const domainBoost = jaccard(achDomainSet, jdDomainSet);

  // impactMult: 1.0 | 0.7 | 0.4
  const impactMult = IMPACT_MULT[ach.impact] || 0.5;

  return keywordOverlap * 0.5 + domainBoost * 0.3 + impactMult * 0.2;
}

// ── Achievement selection ────────────────────────────────────────────────────

/**
 * Select top-N achievements with domain diversity.
 *
 * Algorithm:
 *   1. Score all achievements, sort by relevance descending.
 *   2. First pass: select achievements with unique domain sets.
 *   3. If fewer than N selected, fill from remaining (duplicate domains OK).
 *
 * @param {object[]} achievements - CV achievements array.
 * @param {number} n - Max achievements to select.
 * @param {string[]} jdHardKeywords - JD hard keyword terms.
 * @param {string[]} jdDomains - JD domain identifiers.
 * @returns {object[]} Selected achievements in relevance order.
 */
function selectAchievements(achievements, n, jdHardKeywords, jdDomains) {
  if (!achievements || achievements.length === 0) return [];

  // Score and sort
  const scored = achievements.map(ach => ({
    ach,
    relevance: rankAchievement(ach, jdHardKeywords, jdDomains),
  }));
  scored.sort((a, b) => b.relevance - a.relevance);

  // First pass: domain-diverse selection
  const selected = [];
  const seenDomains = new Set();

  for (const { ach, relevance } of scored) {
    if (selected.length >= n) break;
    const dk = domainKey(ach);
    if (!dk || !seenDomains.has(dk)) {
      selected.push({ ach, relevance });
      if (dk) seenDomains.add(dk);
    }
  }

  // Second pass: fill remaining slots (allow domain duplicates)
  if (selected.length < n) {
    const selectedIds = new Set(selected.map(s => s.ach.id));
    for (const { ach, relevance } of scored) {
      if (selected.length >= n) break;
      if (!selectedIds.has(ach.id)) {
        selected.push({ ach, relevance });
        selectedIds.add(ach.id);
      }
    }
  }

  return selected;
}

// ── Skill reordering ─────────────────────────────────────────────────────────

/**
 * Reorder skill categories and items by JD keyword relevance.
 *
 * Categories sorted by count of JD keyword matches within their items (desc).
 * Within each category: items matching JD keywords first, then unmatched items
 * alphabetically.
 *
 * @param {object[]} skills - CV skills array [{ category, items[] }].
 * @param {string[]} jdHardKeywords - JD hard keyword terms.
 * @returns {object[]} Reordered skills array.
 */
function reorderSkills(skills, jdHardKeywords) {
  if (!skills || skills.length === 0) return [];

  const kwSet = new Set(jdHardKeywords.map(k => k.toLowerCase()));

  // Score each category: count of items that match any JD keyword
  const scored = skills.map(cat => {
    const items = cat.items || [];
    const matchedItems = [];
    const unmatchedItems = [];

    for (const item of items) {
      const itemLower = item.toLowerCase();
      if (kwSet.has(itemLower)) {
        matchedItems.push(item);
      } else {
        unmatchedItems.push(item);
      }
    }

    // Sort: matched items first (preserve original order within matched),
    // then unmatched alphabetically
    unmatchedItems.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return {
      category: cat.category,
      items: [...matchedItems, ...unmatchedItems],
      matchCount: matchedItems.length,
    };
  });

  // Sort categories: more JD-matched items first, then alphabetically as tiebreaker
  scored.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.category.toLowerCase().localeCompare(b.category.toLowerCase());
  });

  return scored.map(c => ({ category: c.category, items: c.items }));
}

// ── Markdown section builders ────────────────────────────────────────────────

/**
 * Build the header section: name, titles, location, contact line.
 */
function buildHeader(cv) {
  const c = cv.contact || {};
  const name = c.name || 'N/A';
  const titles = (c.titles || []).join(' | ') || 'N/A';
  const parts = [];
  if (c.location) parts.push(`📍 ${c.location}`);
  if (c.phone) parts.push(`📞 ${c.phone}`);
  if (c.email) parts.push(`✉️ ${c.email}`);
  if (c.linkedin) parts.push(`🔗 ${c.linkedin.replace(/^https?:\/\//, '')}`);

  const contactLine = parts.length > 0 ? parts.join(' | ') : '';

  let md = `# ${name}\n`;
  md += `**${titles}**\n`;
  if (contactLine) md += `${contactLine}\n`;
  return md;
}

/**
 * Build the professional summary section (3 bullets with highlight marks).
 */
function buildSummary(cv) {
  const items = cv.professionalSummary || [];
  if (items.length === 0) return '### Professional Summary\n\nN/A\n';

  let md = '### Professional Summary\n\n';
  for (const item of items.slice(0, 3)) {
    md += `- ${item.text}\n`;
  }
  return md;
}

/**
 * Build the core competencies section (4 bullets with bold titles).
 */
function buildCompetencies(cv) {
  const items = cv.coreCompetencies || [];
  if (items.length === 0) return '### Core Competencies\n\nN/A\n';

  let md = '### Core Competencies\n\n';
  for (const item of items.slice(0, 4)) {
    md += `- **${item.title}**: ${item.description}\n`;
  }
  return md;
}

/**
 * Build the core skills section with reordered categories and items.
 */
function buildSkills(cv, matchResult) {
  const { hardKeywords } = extractJDContext(matchResult);
  const reordered = reorderSkills(cv.skills, hardKeywords);

  if (reordered.length === 0) return '### Core Skills\n\nN/A\n';

  let md = '### Core Skills\n\n';
  for (const cat of reordered) {
    md += `**${cat.category}**: ${cat.items.join(', ')}\n\n`;
  }
  return md.trimEnd() + '\n';
}

/**
 * Build the professional experience section with selected achievements per role.
 */
function buildExperience(cv, matchResult, opts) {
  const experience = cv.professionalExperience || [];
  if (experience.length === 0) return '### Professional Experience\n\nN/A\n';

  const { hardKeywords, jdDomains } = extractJDContext(matchResult);
  const maxN = (opts && opts.maxAchievementsPerRole) || DEFAULT_N;

  let md = '### Professional Experience\n\n';

  for (const exp of experience) {
    const selected = selectAchievements(exp.achievements || [], maxN, hardKeywords, jdDomains);
    const dates = exp.dates
      ? `${exp.dates.start || '?'} — ${exp.dates.end || 'Present'}`
      : '';

    md += `#### ${exp.role} | ${exp.company}`;
    if (exp.location) md += ` | ${exp.location}`;
    md += '\n';
    if (dates) md += `*${dates}*\n\n`;

    if (exp.description) {
      md += `${exp.description}\n\n`;
    }

    for (const { ach } of selected) {
      md += `- ${ach.text}\n`;
    }
    md += '\n';
  }

  return md.trimEnd() + '\n';
}

/**
 * Build the education section.
 */
function buildEducation(cv) {
  const edu = cv.education || [];
  if (edu.length === 0) return '### Education\n\nN/A\n';

  let md = '### Education\n\n';
  for (const e of edu) {
    md += `- ${e.degree} | ${e.institution}\n`;
  }
  return md;
}

// ── Reframe hints ────────────────────────────────────────────────────────────

/**
 * Generate reframe hints for achievements that match on domains/tech but lack
 * JD terminology in their narrative text.
 *
 * @param {object[]} selected - Array of { ach, relevance } from selectAchievements.
 * @param {object} matchResult - F6 match result.
 * @returns {object[]} Array of { achievementId, currentText, suggestion, jdTerms }.
 */
function generateReframeHints(selected, matchResult) {
  const { hardKeywords, jdDomains } = extractJDContext(matchResult);
  if (!selected || selected.length === 0) return [];

  const hints = [];

  for (const { ach, relevance } of selected) {
    // Only consider achievements with relevance ≥ 0.4
    if (relevance < REFRAME_MIN_RELEVANCE) continue;

    // Check if achievement text already contains JD terminology
    if (textContainsAnyTerm(ach.text, hardKeywords)) continue;

    // Find JD terms that match the achievement's domains/tech but are missing from text
    const achTerms = achievementTermSet(ach);
    const matchedJD = hardKeywords.filter(kw => {
      const kwLower = kw.toLowerCase();
      return achTerms.has(kwLower) || achTerms.has(kwLower.replace(/-/g, ' '));
    });

    if (matchedJD.length === 0) continue;

    // Build suggestion
    const suggestion = `Consider incorporating JD terminology: ${matchedJD.slice(0, 3).join(', ')}${matchedJD.length > 3 ? ' and more' : ''}.`;

    hints.push({
      achievementId: ach.id,
      currentText: ach.text,
      suggestion,
      jdTerms: matchedJD,
    });
  }

  return hints;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Assemble a complete JD-optimized CV in Markdown.
 *
 * @param {object} cv - Structured CV data (matching cv.schema.json).
 * @param {object} matchResult - F6 match result (matching match-output.schema.json).
 * @param {object} [opts] - Optional overrides.
 * @param {number} [opts.maxAchievementsPerRole=4] - Max achievements per experience entry.
 * @returns {object} { markdown, lowConfidence, reframeHints, stats }
 */
function assembleCV(cv, matchResult, opts) {
  const options = opts || {};
  const maxN = options.maxAchievementsPerRole || DEFAULT_N;
  const overallPct = matchResult.overall.percentage;
  const lowConfidence = overallPct < LOW_CONFIDENCE_THRESHOLD;

  // Collect all achievements for reframe hint generation
  const { hardKeywords, jdDomains } = extractJDContext(matchResult);
  const allSelected = [];

  for (const exp of (cv.professionalExperience || [])) {
    const selected = selectAchievements(exp.achievements || [], maxN, hardKeywords, jdDomains);
    allSelected.push(...selected);
  }

  // Generate reframe hints before building Markdown
  const reframeHints = generateReframeHints(allSelected, matchResult);

  // Build sections
  const sections = [];

  if (lowConfidence) {
    sections.push('⚠️ **LOW CONFIDENCE** — Match score below threshold. Review with care.\n');
  }

  sections.push(buildHeader(cv));
  sections.push('');
  sections.push(buildSummary(cv));
  sections.push('');
  sections.push(buildCompetencies(cv));
  sections.push('');
  sections.push(buildSkills(cv, matchResult));
  sections.push('');
  sections.push(buildExperience(cv, matchResult, options));
  sections.push('');
  sections.push(buildEducation(cv));

  const markdown = sections.join('\n').trim() + '\n';

  // Stats
  const totalAchievements = (cv.professionalExperience || []).reduce(
    (sum, exp) => sum + (exp.achievements ? exp.achievements.length : 0),
    0
  );

  const { hardKeywords: hkStats } = extractJDContext(matchResult);
  const reorderedSkills = reorderSkills(cv.skills || [], hkStats);
  const skillCatOrder = reorderedSkills.map(c => c.category);

  const stats = {
    totalAchievements,
    selected: allSelected.length,
    skillCatOrder,
    lowConfidence,
  };

  return {
    markdown,
    lowConfidence,
    reframeHints,
    stats,
  };
}

module.exports = { assembleCV, rankAchievement, selectAchievements, reorderSkills };
