/**
 * F4 Keyword Extractor — Core module
 *
 * Pure-function module that extracts hard (technical) keywords, soft (behavioral)
 * keywords, and seniority signals from a job description string. Output matches
 * `schemas/keyword-output.schema.json`.
 *
 * CJS module — consumed via `require('./lib/keyword-extractor')`.
 *
 * Usage:
 *   const { extractKeywords } = require('./lib/keyword-extractor');
 *   const result = extractKeywords(jdText);
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data-paths');

// ── soft-skills.json is a library file (not data), stays as require ────────
const SOFT_SKILLS_PATH = path.join(__dirname, 'soft-skills.json');

let _taxonomy = null;
let _softSkills = null;

function loadTaxonomy() {
  if (!_taxonomy) {
    const p = path.join(getDataDir(), 'keyword-taxonomy.json');
    _taxonomy = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return _taxonomy;
}

function loadSoftSkills() {
  if (!_softSkills) {
    _softSkills = require(SOFT_SKILLS_PATH);
  }
  return _softSkills;
}

// ── Text normalization ─────────────────────────────────────────────────────

/**
 * Normalize JD text: collapse whitespace (including newlines → space),
 * normalize Unicode, but preserve case for later matching.
 * Returns a clean single string.
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\u2013\u2014]/g, '-')   // en-dash, em-dash → hyphen
    .replace(/[\u2018\u2019]/g, "'")    // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')    // curly double quotes
    .replace(/\t/g, ' ')
    .replace(/\n+/g, ' ')               // newlines → space
    .replace(/[ ]{2,}/g, ' ')           // collapse multiple spaces
    .trim();
}

// ── Section detection ──────────────────────────────────────────────────────

/**
 * Known section header patterns — ordered by priority.
 * Each entry: { regex, type }
 *   type: 'must-have' | 'nice-to-have' | 'responsibilities' | 'about' | 'benefits'
 */
const SECTION_PATTERNS = [
  // ── English must-have ──
  { regex: /\bMUST\s*HAVES?\b/i, type: 'must-have' },
  { regex: /\bMINIMUM\s+QUALIFICATIONS?\b/i, type: 'must-have' },
  { regex: /\bBASIC\s+QUALIFICATIONS?\b/i, type: 'must-have' },
  { regex: /\bWHAT\s+YOU\b.{0,20}\bNEED\b/i, type: 'must-have' },
  { regex: /\bWHAT\s+WE\b.{0,15}\bLOOKING\s+FOR\b/i, type: 'must-have' },
  { regex: /\bREQUIRED\s+(?:QUALIFICATIONS?|SKILLS?|EXPERIENCE)\b/i, type: 'must-have' },
  { regex: /\bKEY\s+QUALIFICATIONS?\b/i, type: 'must-have' },
  { regex: /\bESSENTIAL\s+(?:QUALIFICATIONS?|SKILLS?)\b/i, type: 'must-have' },

  // ── English nice-to-have ──
  { regex: /\bNICE\s*(?:-|\s)*TO\s*(?:-|\s)*HAVES?\b/i, type: 'nice-to-have' },
  { regex: /\bPREFERRED\s+QUALIFICATIONS?\b/i, type: 'nice-to-have' },
  { regex: /\bBONUS\s+POINTS?\b/i, type: 'nice-to-have' },
  { regex: /\bDESIRED\s+(?:QUALIFICATIONS?|SKILLS?)\b/i, type: 'nice-to-have' },
  { regex: /\bGOOD\s+TO\s+HAVE\b/i, type: 'nice-to-have' },
  { regex: /\bNICE\s+TO\s+HAVE\b/i, type: 'nice-to-have' },
  { regex: /\bADDITIONAL\s+QUALIFICATIONS?\b/i, type: 'nice-to-have' },

  // ── English responsibilities ──
  { regex: /\bRESPONSIBILIT(?:Y|IES)\b/i, type: 'responsibilities' },
  { regex: /\bWHAT\s+YOU\s+WILL\s+DO\b/i, type: 'responsibilities' },
  { regex: /\bWHAT\s+YOU'LL\s+DO\b/i, type: 'responsibilities' },
  { regex: /\bYOUR\s+ROLE\b/i, type: 'responsibilities' },
  { regex: /\bABOUT\s+THE\s+ROLE\b/i, type: 'responsibilities' },
  { regex: /\bKEY\s+RESPONSIBILITIES?\b/i, type: 'responsibilities' },
  { regex: /\bDUTIES\b/i, type: 'responsibilities' },

  // ── English about ──
  { regex: /\bABOUT\s+(?:US|THE\s+COMPANY|THE\s+TEAM)\b/i, type: 'about' },
  { regex: /\bWHO\s+WE\s+ARE\b/i, type: 'about' },
  { regex: /\bCOMPANY\s+DESCRIPTION\b/i, type: 'about' },
  { regex: /\bWHY\s+JOIN\s+US\b/i, type: 'about' },

  // ── English benefits ──
  { regex: /\bPERKS?\s*(?:&|AND)\s*BENEFITS?\b/i, type: 'benefits' },
  { regex: /\bBENEFITS?\b/i, type: 'benefits' },
  { regex: /\bWHAT\s+WE\s+OFFER\b/i, type: 'benefits' },
  { regex: /\bCOMPENSATION\b/i, type: 'benefits' },

  // ── English requirements (broad — placed after more specific patterns) ──
  { regex: /\bREQUIREMENTS?\b/i, type: 'must-have' },
  { regex: /\bQUALIFICATIONS?\b/i, type: 'must-have' },

  // ── Spanish must-have ──
  { regex: /\bREQUISITOS?\b/i, type: 'must-have' },
  { regex: /\bREQUERIMIENTOS?\b/i, type: 'must-have' },
  { regex: /\bCONOCIMIENTOS\s+T[ÉE]CNICOS\s+REQUERIDOS?\b/i, type: 'must-have' },
  { regex: /\bQU[ÉE]\s+BUSCAMOS\b/i, type: 'must-have' },
  { regex: /\bQU[ÉE]\s+VALORAMOS\b/i, type: 'must-have' },
  { regex: /\bLO\s+QUE\s+BUSCAMOS\b/i, type: 'must-have' },
  { regex: /\bEXPERIENCIA\s+REQUERIDA\b/i, type: 'must-have' },
  { regex: /\bFORMACI[ÓO]N\s+Y\s+EXPERIENCIA\b/i, type: 'must-have' },
  { regex: /\bQU[ÉE]\s+NECESITAS\b/i, type: 'must-have' },

  // ── Spanish nice-to-have ──
  { regex: /\bDESEABLES?\b/i, type: 'nice-to-have' },
  { regex: /\bNICE\s+TO\s+HAVE\b/i, type: 'nice-to-have' },
  { regex: /\bVALORABLE\b/i, type: 'nice-to-have' },
  { regex: /\bSE\s+VALORAR[ÁA]\b/i, type: 'nice-to-have' },
  { regex: /\bNO\s+EXCLUYENTE\b/i, type: 'nice-to-have' },
  { regex: /\bDESEABLE\b/i, type: 'nice-to-have' },
  { regex: /\bCONOCIMIENTOS?\s+ADICIONALES?\b/i, type: 'nice-to-have' },

  // ── Spanish responsibilities ──
  { regex: /\bPRINCIPALES\s+RESPONSABILIDADES\b/i, type: 'responsibilities' },
  { regex: /\bRESPONSABILIDADES\b/i, type: 'responsibilities' },
  { regex: /\bFUNCIONES\b/i, type: 'responsibilities' },
  { regex: /\bOBJETIVO\s+DEL\s+ROL\b/i, type: 'responsibilities' },
  { regex: /\bDE\s+QU[ÉE]\s+SE\s+TRATA\b/i, type: 'responsibilities' },
  { regex: /\bDESARROLLO\s+Y\s+PERSONALIZACI[ÓO]N\b/i, type: 'responsibilities' },
  { regex: /\bQU[ÉE]\s+HAR[ÁA]S\b/i, type: 'responsibilities' },
  { regex: /\bTUS?\s+RESPONSABILIDADES\b/i, type: 'responsibilities' },

  // ── Spanish about ──
  { regex: /\bSOBRE\s+(?:NOSOTROS|LA\s+EMPRESA|EL\s+EQUIPO)\b/i, type: 'about' },
  { regex: /\bACERCA\s+DE\b/i, type: 'about' },
  { regex: /\bNUESTRA\s+CULTURA\b/i, type: 'about' },
  { regex: /\bNUESTRO\s+ADN\b/i, type: 'about' },
  { regex: /\bQUI[ÉE]NES\s+SOMOS\b/i, type: 'about' },

  // ── Spanish benefits ──
  { regex: /\bQU[ÉE]\s+TE\s+OFRECEMOS\b/i, type: 'benefits' },
  { regex: /\bOFRECEMOS\b/i, type: 'benefits' },
  { regex: /\bBENEFICIOS\b/i, type: 'benefits' },
];

/**
 * Detect sections in the JD text by matching header patterns against lines.
 * Returns an array of { header, type, startIndex, endIndex } sorted by position.
 * startIndex is where the section content begins (after the header line).
 */
function detectSections(fullText) {
  const lines = fullText.split('\n');
  const sections = [];
  let currentSection = { header: '(preamble)', type: 'neutral', startIndex: 0 };
  let charOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const lineStart = charOffset;
    const lineEnd = charOffset + line.length;

    // Check if this line is a section header
    let matchedType = null;
    let matchedHeader = null;

    // Strip markdown heading markers for matching
    const cleanLine = trimmed.replace(/^#+\s*/, '').replace(/\*{1,2}(.+?)\*{1,2}/, '$1').trim();

    if (cleanLine.length > 1) {
      for (const pattern of SECTION_PATTERNS) {
        // Match against cleaned line (for markdown headings) and original trimmed
        if (pattern.regex.test(cleanLine) || pattern.regex.test(trimmed)) {
          // Avoid matching very long lines as headers (likely content, not a header)
          if (cleanLine.length <= 80) {
            matchedType = pattern.type;
            matchedHeader = cleanLine;
            break;
          }
        }
      }
    }

    if (matchedType) {
      // Push the current section before starting a new one
      currentSection.endIndex = lineStart;
      sections.push({ ...currentSection });

      // Start new section
      currentSection = {
        header: matchedHeader,
        type: matchedType,
        startIndex: lineEnd + 1, // content starts after this line (+1 for newline)
      };
    }

    charOffset = lineEnd + 1; // +1 for newline character
  }

  // Push the final section
  currentSection.endIndex = fullText.length;
  sections.push({ ...currentSection });

  return sections;
}

/**
 * Find which section a given character index falls into.
 */
function findSectionForIndex(index, sections) {
  for (const section of sections) {
    if (index >= section.startIndex && index < section.endIndex) {
      return section;
    }
  }
  return null;
}

// ── Keyword matching ───────────────────────────────────────────────────────

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match taxonomy terms against normalized text.
 * Returns a map: term → { category, matches: [{ index, matched }] }
 *
 * Handles:
 *   - Exact term matching with word boundaries
 *   - Variant resolution (K8s → Kubernetes)
 *   - Span deduplication (longer matches win)
 */
function matchTaxonomyTerms(normalizedText, taxonomy) {
  // Collect all (term, category) pairs and variants
  const termEntries = []; // { term, category, searchPattern }

  for (const category of taxonomy.categories) {
    for (const termDef of category.terms) {
      termEntries.push({
        term: termDef.name,
        category: category.id,
        searchPattern: termDef.name,
        isVariant: false,
      });
    }
  }

  // Add variant entries
  if (taxonomy.variants) {
    for (const [variant, canonical] of Object.entries(taxonomy.variants)) {
      // Find the category for the canonical term
      let category = null;
      for (const cat of taxonomy.categories) {
        if (cat.terms.some(t => t.name === canonical)) {
          category = cat.id;
          break;
        }
      }
      if (category) {
        termEntries.push({
          term: canonical,
          category,
          searchPattern: variant,
          isVariant: true,
        });
      }
    }
  }

  // Sort by pattern length descending — longer patterns matched first to avoid subsumption
  termEntries.sort((a, b) => b.searchPattern.length - a.searchPattern.length);

  // Matched spans for deduplication: Set of "start-end" strings
  const occupiedSpans = new Set();

  // Results map: term → { category, matches: [] }
  const results = new Map();

  for (const entry of termEntries) {
    const pattern = entry.searchPattern;
    // Build regex with word boundaries for single-word terms, but allow multi-word matching
    const regex = new RegExp('\\b' + escapeRegex(pattern) + '\\b', 'gi');

    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const spanKey = `${start}-${end}`;

      // Check if this span overlaps with an already-matched (longer) span
      if (isSpanOccluded(start, end, occupiedSpans)) {
        continue;
      }

      // Record this span
      occupiedSpans.add(spanKey);

      // Record the match
      if (!results.has(entry.term)) {
        results.set(entry.term, { category: entry.category, matches: [] });
      }
      results.get(entry.term).matches.push({
        index: start,
        matched: match[0],
      });
    }
  }

  return results;
}

/**
 * Check if a span [start, end) is fully contained within any occupied span.
 */
function isSpanOccluded(start, end, occupiedSpans) {
  for (const spanKey of occupiedSpans) {
    const [s, e] = spanKey.split('-').map(Number);
    if (start >= s && end <= e) {
      return true; // subsumed by a longer match
    }
  }
  return false;
}

// ── Soft skill matching ────────────────────────────────────────────────────

/**
 * Match soft skill patterns against normalized text.
 * Returns an array of { term, matches: [{ index, matched }] }
 */
function matchSoftSkills(normalizedText, softSkillsData) {
  const results = [];

  for (const entry of softSkillsData.terms) {
    const matches = [];

    for (const pattern of entry.patterns) {
      const regex = new RegExp('\\b' + escapeRegex(pattern) + '\\b', 'gi');
      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
        matches.push({
          index: match.index,
          matched: match[0],
        });
      }
    }

    if (matches.length > 0) {
      // Deduplicate matches by index (same term matched by different patterns at same position)
      const uniqueMatches = [];
      const seenIndices = new Set();
      for (const m of matches) {
        if (!seenIndices.has(m.index)) {
          seenIndices.add(m.index);
          uniqueMatches.push(m);
        }
      }

      results.push({
        term: entry.term,
        matches: uniqueMatches,
      });
    }
  }

  return results;
}

// ── Context extraction ─────────────────────────────────────────────────────

/**
 * Extract a ~100 char context snippet around a match position.
 */
function extractContext(text, index, matchLength, maxChars = 100) {
  const half = Math.floor((maxChars - matchLength) / 2);
  let start = Math.max(0, index - half);
  let end = Math.min(text.length, index + matchLength + half);

  // Adjust to avoid cutting words
  if (start > 0 && !/\s/.test(text[start - 1])) {
    // Find previous space
    const prevSpace = text.lastIndexOf(' ', start);
    if (prevSpace > 0 && start - prevSpace < 30) {
      start = prevSpace + 1;
    }
  }
  if (end < text.length && !/\s/.test(text[end])) {
    const nextSpace = text.indexOf(' ', end);
    if (nextSpace > 0 && nextSpace - end < 30) {
      end = nextSpace;
    }
  }

  let context = text.slice(start, end).trim();

  if (start > 0) context = '…' + context;
  if (end < text.length) context = context + '…';

  return context;
}

// ── Must-have classification ───────────────────────────────────────────────

/**
 * Determine if a keyword is a must-have using a weighted heuristic:
 *   - section type:      0.40
 *   - repetition:        0.30
 *   - signal proximity:  0.20
 *   - first-mention:     0.10
 *   - threshold:         ≥ 0.50
 */
function computeMustHaveScore(term, matches, sections, fullText) {
  if (matches.length === 0) return { score: 0, mustHave: false };

  const firstMatch = matches[0];
  const firstIndex = firstMatch.index;
  const frequency = matches.length;

  // Section score — where does the keyword first appear?
  let sectionScore = 0.2; // default neutral
  const section = findSectionForIndex(firstIndex, sections);
  if (section) {
    switch (section.type) {
      case 'must-have':
        sectionScore = 1.0;
        break;
      case 'nice-to-have':
        sectionScore = 0.0;
        break;
      case 'responsibilities':
        sectionScore = 0.3;
        break;
      case 'about':
        sectionScore = 0.15;
        break;
      case 'benefits':
        sectionScore = 0.1;
        break;
      default:
        sectionScore = 0.2;
    }
  }

  // Repetition score — normalized frequency (3+ appearances → 1.0)
  let repetitionScore = Math.min(frequency / 3, 1.0);

  // Signal proximity — is there a "required/must/essential" signal near any match?
  let proximityScore = 0.0;
  const signalPattern = /\b(required|must|essential|critical|mandatory|necesario|imprescindible|excluyente|requerido|obligatorio)\b/i;
  for (const m of matches) {
    const context = fullText.slice(Math.max(0, m.index - 80), Math.min(fullText.length, m.index + m.matched.length + 80));
    if (signalPattern.test(context)) {
      proximityScore = 1.0;
      break;
    }
  }

  // First-mention score — does keyword appear in first 20% of text?
  const firstMentionThreshold = fullText.length * 0.2;
  const firstMentionScore = firstIndex < firstMentionThreshold ? 1.0 : 0.0;

  const total = sectionScore * 0.40 + repetitionScore * 0.30 + proximityScore * 0.20 + firstMentionScore * 0.10;

  return {
    score: parseFloat(total.toFixed(2)),
    mustHave: total >= 0.50,
    breakdown: { section: sectionScore, repetition: repetitionScore, proximity: proximityScore, firstMention: firstMentionScore },
  };
}

// ── Seniority extraction ───────────────────────────────────────────────────

/**
 * Extract seniority signals from the JD.
 */
function extractSeniority(fullText, normalizedText) {
  const signals = [];
  let yearsMinimum = 0;
  let yearsPreferred = 0;

  // ── Years-of-experience patterns ──
  // "5+ years", "5+ años", "at least 3 years", "mínimo 3 años", "minimum of 5 years"
  const yearsPatterns = [
    // Explicit minimum: "X+ years" or "at least X years" or "minimum X years"
    /(?:(?:at\s+least|minimum(?:\s+of)?|mínimo(?:\s+de)?|al\s+menos|mínimo)\s+)?(\d+)\+?\s*(?:years|años)/gi,
    // Preferred: "preferably X+ years" or "X+ years preferred"
    /(?:preferably|preferred|preferiblemente|deseable)\s+(\d+)\+?\s*(?:years|años)/gi,
  ];

  let match;
  const foundYears = [];

  // First pass: extract all year mentions
  const yearsRegex = /(\d+)\+?\s*(?:years|años)/gi;
  while ((match = yearsRegex.exec(normalizedText)) !== null) {
    foundYears.push({ years: parseInt(match[1], 10), index: match.index, fullMatch: match[0] });
  }

  // Determine minimum vs preferred
  if (foundYears.length > 0) {
    // Sort by years ascending
    foundYears.sort((a, b) => a.years - b.years);

    // Check context around each for "preferred"/"deseable"
    for (const fy of foundYears) {
      const context = normalizedText.slice(Math.max(0, fy.index - 50), fy.index);
      const isPreferred = /\b(preferred|preferably|preferiblemente|deseable|nice\s+to\s+have)\b/i.test(context);

      if (isPreferred) {
        yearsPreferred = fy.years;
      }
    }

    // Minimum is the highest non-preferred year (the highest bar)
    const nonPreferred = foundYears.filter(fy => {
      const context = normalizedText.slice(Math.max(0, fy.index - 50), fy.index);
      return !/\b(preferred|preferably|preferiblemente|deseable|nice\s+to\s+have)\b/i.test(context);
    });

    if (nonPreferred.length > 0) {
      yearsMinimum = Math.max(...nonPreferred.map(f => f.years));
    } else if (foundYears.length > 0) {
      yearsMinimum = Math.max(...foundYears.map(f => f.years));
    }

    for (const fy of foundYears) {
      signals.push({ type: 'years_explicit', value: String(fy.years) });
    }
  }

  // ── Title extraction ──
  let title = '';
  // Try markdown heading first
  const titleMdMatch = fullText.match(/^#\s+(.+)$/m);
  if (titleMdMatch) {
    title = titleMdMatch[1].replace(/\*{1,2}/g, '').trim();
  }
  if (!title) {
    // Try "Puesto:", "Role:", "Position:" patterns
    const titleMetaMatch = fullText.match(/^(?:puesto|rol|role|position|cargo)[:\s-]+(.+)$/im);
    if (titleMetaMatch) {
      title = titleMetaMatch[1].trim();
    }
  }

  // ── Level inference ──
  // Strategy: search full text for seniority keywords FIRST (body text is more
  // reliable than titles which may use "Junior" as a marketing label).
  // Fall back to title only when body yields nothing.

  let level = 'unknown';

  const titleLower = title.toLowerCase();
  const fullLower = normalizedText.toLowerCase();

  const seniorityMap = [
    { keywords: ['c-level', 'cto', 'ceo', 'cpo', 'cio', 'chief', 'vp', 'vice president', 'director', 'head of'], level: 'senior' },
    { keywords: ['principal', 'staff engineer', 'staff software'], level: 'staff' },
    // Mid-level checked BEFORE generic senior — prevents "semi-senior" matching as "senior"
    { keywords: ['mid', 'mid-level', 'semi-senior', 'semi sr', 'semi-sr', 'semisenior', 'intermediate', 'mid-senior'], level: 'mid' },
    { keywords: ['senior', 'sr.', 'sr ', 'lead', 'líder', 'manager', 'engineering manager', 'technical program manager'], level: 'senior' },
    { keywords: ['junior', 'jr.', 'jr ', 'associate', 'trainee', 'entry-level', 'entry level'], level: 'junior' },
  ];

  // Search full text first (body text is usually more accurate)
  for (const entry of seniorityMap) {
    for (const kw of entry.keywords) {
      if (new RegExp('\\b' + escapeRegex(kw) + '\\b', 'i').test(fullLower)) {
        level = entry.level;
        signals.push({ type: 'title_keyword', value: kw });
        break;
      }
    }
    if (level !== 'unknown') break;
  }

  // Fallback: check title if body search found nothing
  if (level === 'unknown' && titleLower) {
    for (const entry of seniorityMap) {
      for (const kw of entry.keywords) {
        if (titleLower.includes(kw)) {
          level = entry.level;
          signals.push({ type: 'title_keyword', value: kw });
          break;
        }
      }
      if (level !== 'unknown') break;
    }
  }

  // If still unknown but years suggest a level
  if (level === 'unknown' && yearsMinimum > 0) {
    if (yearsMinimum >= 10) level = 'senior';
    else if (yearsMinimum >= 7) level = 'senior';
    else if (yearsMinimum >= 3) level = 'mid';
    else level = 'junior';
  }

  // ── Additional signals from JD language ──
  const signalChecks = [
    { pattern: /\b(lead|manage|supervise)\s+(?:a\s+)?teams?\b/i, type: 'team_lead' },
    { pattern: /\b(?:define|drive|set)\s+(?:\w+\s+){0,3}(?:strategy|vision|roadmap)\b/i, type: 'strategy' },
    { pattern: /\b(?:mentor|coach|develop|grow)\s+(?:team|engineers?|developers?|members?)\b/i, type: 'mentorship' },
    { pattern: /\b(?:budget|P&L|profit\s*(?:&|and)\s*loss|cost\s+center)\b/i, type: 'budget' },
    { pattern: /\b(?:executive|C-suite|VP|director-level|leadership\s+team)\b/i, type: 'stakeholder' },
    { pattern: /\b(?:organization|company-wide|enterprise|cross-org)\b/i, type: 'scope' },
  ];

  for (const check of signalChecks) {
    let m;
    const regex = new RegExp(check.pattern.source, check.pattern.flags.includes('i') ? check.pattern.flags : check.pattern.flags + 'i');
    if ((m = regex.exec(normalizedText)) !== null) {
      // Avoid duplicate signals
      if (!signals.some(s => s.type === check.type)) {
        signals.push({ type: check.type, value: m[0] });
      }
    }
  }

  return {
    yearsMinimum,
    yearsPreferred,
    level,
    signals,
    title: title || 'Unknown Role',
  };
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Extract keywords from a job description string.
 *
 * @param {string} jdText - Raw job description text (Markdown or plain text).
 * @returns {object} Structured result matching keyword-output.schema.json.
 */
function extractKeywords(jdText) {
  const startTime = Date.now();

  if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
    return buildEmptyResult(startTime);
  }

  const taxonomy = loadTaxonomy();
  const softSkillsData = loadSoftSkills();
  const normalizedText = normalizeText(jdText);

  // Detect sections (uses original text for markdown headers)
  const sections = detectSections(jdText);

  // Match hard keywords against taxonomy
  const taxonomyMatches = matchTaxonomyTerms(normalizedText, taxonomy);

  // Build hardKeywords array
  const hardKeywords = [];
  for (const [term, { category, matches }] of taxonomyMatches) {
    const { mustHave } = computeMustHaveScore(term, matches, sections, jdText);
    const firstMatch = matches[0];

    hardKeywords.push({
      term,
      category,
      matched: firstMatch.matched,
      confidence: 1.0, // exact taxonomy match
      frequency: matches.length,
      mustHave,
      context: extractContext(jdText, firstMatch.index, firstMatch.matched.length),
    });
  }

  // Match soft keywords
  const softMatches = matchSoftSkills(normalizedText, softSkillsData);

  // Build softKeywords array
  const softKeywords = [];
  for (const { term, matches: sm } of softMatches) {
    const firstMatch = sm[0];
    // Compute must-have classification for soft keywords too
    const { mustHave } = computeMustHaveScore(term, sm, sections, jdText);

    softKeywords.push({
      term,
      matched: firstMatch.matched,
      confidence: 0.9, // soft skills have inherent ambiguity
      frequency: sm.length,
      mustHave,
      context: extractContext(jdText, firstMatch.index, firstMatch.matched.length),
    });
  }

  // Extract seniority signals
  const senioritySignals = extractSeniority(jdText, normalizedText);

  // Build metadata
  const metadata = {
    extractedAt: new Date().toISOString(),
    taxonomyVersion: taxonomy.version,
    jdSource: 'text',
    jdWordCount: normalizedText.split(/\s+/).length,
    processingTimeMs: Date.now() - startTime,
    extractorVersion: '1.0.0',
  };

  return {
    hardKeywords,
    softKeywords,
    senioritySignals,
    metadata,
  };
}

/**
 * Return a valid but empty result for edge cases (empty text, etc.).
 */
function buildEmptyResult(startTime) {
  const taxonomy = loadTaxonomy();
  return {
    hardKeywords: [],
    softKeywords: [],
    senioritySignals: {
      yearsMinimum: 0,
      yearsPreferred: 0,
      level: 'unknown',
      signals: [],
      title: 'Unknown Role',
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      taxonomyVersion: taxonomy.version,
      jdSource: 'text',
      jdWordCount: 0,
      processingTimeMs: Date.now() - startTime,
      extractorVersion: '1.0.0',
    },
  };
}

module.exports = { extractKeywords };
