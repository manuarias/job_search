/**
 * F9 Cover Letter Generator — Core module
 *
 * Produces a structured cover letter skeleton with [INSERT: ...] placeholders
 * for LLM fill, backed by CV data, match result, and JD text.
 *
 * Fixed 5-paragraph skeleton:
 *   1. Opening — introduction + role enthusiasm
 *   2. Leadership — team, cross-functional, strategic impact
 *   3. Technical — hard skills, architectures, systems
 *   4. Mentoring — people development, career growth
 *   5. Closing — call to action
 *
 * Refusal gate: returns {refused: true} when overall match percentage < 0.35.
 *
 * Narrative breadth: sections may be omitted via opts.sections or auto-skipped
 * when the CV lacks relevant experience for a domain.
 *
 * CJS module — consumed via `require('./lib/cover-letter')`.
 *
 * Usage:
 *   const { generateCoverLetter } = require('./lib/cover-letter');
 *   const result = generateCoverLetter(cv, matchResult, jdText, { sections: ['opening', 'leadership', 'technical', 'closing'] });
 */

'use strict';

// ── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_REFUSE_THRESHOLD = 0.35;
const ALL_SECTIONS = ['opening', 'leadership', 'technical', 'mentoring', 'closing'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract role title and company name from raw JD text using simple heuristics.
 */
function extractJDContext(jdText) {
  const context = {
    companyName: null,
    roleTitle: null,
    keyRequirements: [],
  };

  if (!jdText || typeof jdText !== 'string') return context;

  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Company name: try common patterns ──
  const companyPatterns = [
    // "About Acme Corp" or "About Acme Corp:" or "About: Acme Corp"
    /(?:^|\n)\s*(?:About|Company)\s*:?\s+([A-Z][A-Za-z0-9\s&.,]{2,40}?)(?:\s*(?:[:.,]|is|are|was|,|\n|$))/im,
    // "at Acme Corp" or "join Acme Corp"
    /(?:at|with|join)\s+([A-Z][A-Za-z0-9\s&.,]{2,40}?)(?:\s*(?:[:.,]|is|are|as|,|\n|$))/i,
    // "Acme Corp is looking/hiring/seeking"
    /([A-Z][A-Za-z0-9&]{2,30})\s+(?:is\s+(?:a\s+)?(?:looking|hiring|seeking|searching))/i,
    // "About — Acme Corp" (em-dash)
    /^(?:About|Company)\s*[–—-]\s*([A-Z][A-Za-z0-9\s&.,]{2,40})/im,
    // Standalone company name on its own line (all-caps, short)
    /^([A-Z][A-Z0-9&.\s]{3,35})$/m,
  ];

  for (const pat of companyPatterns) {
    const m = jdText.match(pat);
    if (m) {
      const candidate = m[1].trim();
      // Filter out obvious false positives
      const lower = candidate.toLowerCase();
      if (!/(?:job|descri|requir|qualif|respons|benefit|about|apply|remote|full.?time|salary|nice\s+to|preferr|bonus|what\s+you|what\s+we|we\s+offer|we\s+are|looking\s+for|hiring|seeking)/i.test(lower)) {
        context.companyName = candidate;
        break;
      }
    }
  }

  // ── Role title: look for common patterns ──
  const titlePatterns = [
    // "looking for a/an/the Senior Software Engineer"
    /(?:position|role|title|hiring|seeking|looking\s+for|recruiting)\s*(?:a|an|the|for)?\s+((?:(?:Senior|Staff|Principal|Lead|Head\s+of|Director\s+of)\s+)?(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+){0,2}(?:Engineer|Developer|Manager|Architect|Leader|Scientist|Analyst|Designer|Consultant|Program\s*Manager|Product\s*Manager|Engineering\s*Manager|Technical\s*Program\s*Manager|Scrum\s*Master|DevOps|SRE|QA))\b/i,
    // "Senior/Staff/Principal/Lead Foo Bar" (title with level prefix standalone)
    /\b((?:Senior|Staff|Principal|Lead|Head\s+of|Director\s+of)\s+(?:[A-Z][a-z]+\s+){0,2}(?:Engineer|Developer|Manager|Architect|Leader|Scientist|Analyst|Designer|Consultant|Program\s*Manager|Product\s*Manager|Scrum\s*Master|DevOps|SRE|QA))\b/i,
    // "# Senior Software Engineer" (markdown heading)
    /^#{1,3}\s*(.+?(?:Engineer|Developer|Manager|Architect|Leader|Analyst|Consultant|Scientist|Designer|Program\s*Manager|Product\s*Manager|Scrum\s*Master))(?:$|\s*\n)/im,
    // Plain line: "Senior Software Engineer" on its own
    /^((?:(?:Senior|Staff|Principal|Lead)\s+)?[A-Z][a-zA-Z\s]{5,60}(?:Engineer|Developer|Manager|Architect|Leader|Scientist|Analyst|Designer|Consultant))(?:$|\n)/m,
  ];

  for (const pat of titlePatterns) {
    const m = jdText.match(pat);
    if (m) {
      context.roleTitle = m[1].trim();
      // Clean up trailing punctuation/special chars
      context.roleTitle = context.roleTitle.replace(/[,.;:!?()\-—–]+$/, '').trim();
      if (context.roleTitle.length >= 4) break;
      context.roleTitle = null;
    }
  }

  // ── Key requirements: extract from requirement/qualification sections ──
  const reqSection = jdText.match(
    /(?:Requirements|Qualifications|What You'll Need|Must Have|Required|Key Qualifications|What We're Looking For)[\s:]*\n([\s\S]*?)(?:\n\n|\n(?:Nice to Have|Preferred|Bonus|Benefits|About|Why|What We Offer)|\n?$)/i
  );

  if (reqSection && reqSection[1]) {
    // Extract bullet points or numbered items
    const reqLines = reqSection[1].split('\n').filter(l => l.trim());
    const reqItems = [];
    for (const line of reqLines) {
      const cleaned = line.replace(/^[-•*\d.]\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        reqItems.push(cleaned);
      }
    }
    // Take up to 5
    context.keyRequirements = reqItems.slice(0, 5);
  }

  return context;
}

/**
 * Collect achievements from CV that are relevant to a given domain theme.
 *
 * @param {object} cv - Structured CV data
 * @param {string[]} domainKeywords - Keywords that signal relevance to the domain
 * @param {number} maxCount - Max achievements to return
 * @returns {object[]} Relevant achievements with text and source info
 */
function collectDomainAchievements(cv, domainKeywords, maxCount) {
  const results = [];
  const lowerKeywords = domainKeywords.map(k => k.toLowerCase());

  // Check professional summary bullets
  if (cv.professionalSummary) {
    for (let i = 0; i < cv.professionalSummary.length; i++) {
      const item = cv.professionalSummary[i];
      const lower = (item.text || '').toLowerCase();
      const matchCount = lowerKeywords.filter(k => lower.includes(k)).length;
      if (matchCount > 0 && results.length < maxCount) {
        results.push({
          text: item.text,
          source: 'professionalSummary',
          relevance: matchCount,
        });
      }
    }
  }

  // Check core competencies
  if (cv.coreCompetencies) {
    for (const comp of cv.coreCompetencies) {
      const lower = (comp.title + ' ' + (comp.description || '')).toLowerCase();
      const matchCount = lowerKeywords.filter(k => lower.includes(k)).length;
      if (matchCount > 0 && results.length < maxCount) {
        results.push({
          text: `**${comp.title}**: ${comp.description}`,
          source: 'coreCompetencies',
          relevance: matchCount,
        });
      }
    }
  }

  // Check professional experience achievements
  if (cv.professionalExperience) {
    for (const exp of cv.professionalExperience) {
      const achievements = exp.achievements || [];
      for (const ach of achievements) {
        const lower = (ach.text || '').toLowerCase();
        const matchCount = lowerKeywords.filter(k => lower.includes(k)).length;
        if (matchCount > 0) {
          results.push({
            text: ach.text,
            source: `experience: ${exp.role || 'unknown'} @ ${exp.company || 'unknown'}`,
            relevance: matchCount,
            technologies: ach.technologies || [],
          });
        }
      }
    }
  }

  // Sort by relevance descending
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, maxCount);
}

/**
 * Extract top matched keywords from match result.
 */
function extractTopKeywords(matchResult) {
  const hk = matchResult.scorers.hardKeywords.details;
  const sk = matchResult.scorers.softKeywords.details;

  return {
    hard: (hk.matched || []).slice(0, 6),
    soft: (sk.matched || []).slice(0, 6),
    missedHard: (hk.missed || []).slice(0, 5),
    missedSoft: (sk.missed || []).slice(0, 5),
  };
}

/**
 * Extract candidate name from CV data.
 */
function extractCandidateName(cv) {
  if (cv.contact && cv.contact.name) return cv.contact.name;
  return 'the candidate';
}

/**
 * Extract primary titles from CV.
 */
function extractTitles(cv) {
  if (cv.contact && cv.contact.titles && cv.contact.titles.length > 0) {
    return cv.contact.titles;
  }
  return [];
}

/**
 * Build a section label for display.
 */
function sectionLabel(section) {
  const labels = {
    opening: 'Opening Paragraph',
    leadership: 'Leadership & Strategic Impact',
    technical: 'Technical Depth & Systems',
    mentoring: 'Mentoring & Team Development',
    closing: 'Closing Paragraph',
  };
  return labels[section] || section;
}

/**
 * Collect scored strengths from match result for the template context.
 */
function collectStrengths(matchResult, cv) {
  const strengths = [];
  const scorers = matchResult.scorers;

  for (const [name, scorer] of Object.entries(scorers)) {
    if (scorer.percentage >= 0.7) {
      strengths.push(name);
    }
  }
  return strengths;
}

// ── Section builders ─────────────────────────────────────────────────────────

/**
 * Build the opening paragraph template.
 */
function buildOpening(cv, matchResult, jdContext, keywords) {
  const name = extractCandidateName(cv);
  const titles = extractTitles(cv);
  const primaryTitle = titles[0] || 'professional';
  const role = jdContext.roleTitle || 'this role';
  const company = jdContext.companyName || 'your company';

  const topHard = keywords.hard.slice(0, 3).join(', ') || 'my core technical skills';
  const topSoft = keywords.soft.slice(0, 2).join(', ') || 'collaboration and delivery';

  const overallPct = Math.round((matchResult.overall.percentage || 0) * 100);

  return `Dear Hiring Manager,

[INSERT: Introduce yourself as ${name}, a ${primaryTitle} with a strong background in ${topHard}. Express genuine enthusiasm for the ${role} role at ${company}. Mention that your experience aligns well with the position's requirements (overall match: ${overallPct}%). Reference 1-2 key strengths: ${topSoft}. Keep this paragraph concise — 3-4 sentences.]`;
}

/**
 * Build the leadership paragraph template.
 */
function buildLeadership(cv, matchResult, jdContext, keywords) {
  const domainKeywords = [
    'leadership', 'cross-functional', 'stakeholder', 'strategy', 'roadmap',
    'delivery', 'program', 'squad', 'team', 'led', 'managed', 'owned',
    'drove', 'coordinated', 'aligned', 'director', 'head of', 'executive',
  ];

  const achievements = collectDomainAchievements(cv, domainKeywords, 3);
  const hasContent = achievements.length > 0;

  let achievementContext = '';
  if (hasContent) {
    achievementContext = achievements.map((a, i) =>
      `  - Leadership example ${i + 1}: "${a.text}" (from: ${a.source})`
    ).join('\n');
  } else {
    achievementContext = '  - [No explicit leadership achievements detected in CV — use professional summary or core competencies instead]';
  }

  const role = jdContext.roleTitle || 'this role';

  return `[INSERT: Describe your leadership experience and strategic impact. Focus on team sizes, cross-functional coordination, and delivery ownership relevant to the ${role} role at ${jdContext.companyName || 'the company'}. 
Reference these achievements from your CV:
${achievementContext}
If the JD emphasizes stakeholder management, program delivery, or Agile leadership, weave those terms in. Use 3-4 sentences with at least one quantified metric.]`;
}

/**
 * Build the technical paragraph template.
 */
function buildTechnical(cv, matchResult, jdContext, keywords) {
  const domainKeywords = [
    'architecture', 'system', 'microservice', 'api', 'cloud', 'aws',
    'docker', 'kubernetes', 'ci/cd', 'pipeline', 'automation', 'n8n',
    'debugging', 'observability', 'monitoring', 'scal', 'throughput',
    'rpm', 'deployment', 'infrastructure', 'java', 'python', 'node',
    'database', 'sql', 'backend', 'frontend', 'full-stack',
  ];

  const achievements = collectDomainAchievements(cv, domainKeywords, 3);
  const hasContent = achievements.length > 0;

  let achievementContext = '';
  if (hasContent) {
    achievementContext = achievements.map((a, i) => {
      const tech = a.technologies && a.technologies.length > 0
        ? ` [Tech: ${a.technologies.join(', ')}]`
        : '';
      return `  - Technical example ${i + 1}: "${a.text}"${tech} (from: ${a.source})`;
    }).join('\n');
  } else {
    achievementContext = '  - [No explicit technical achievements detected in CV]';
  }

  const topHard = keywords.hard.slice(0, 5).join(', ') || 'key technologies';
  const topMissed = keywords.missedHard.length > 0
    ? `\nNote: JD mentions these keywords not yet matched: ${keywords.missedHard.slice(0, 3).join(', ')}. If you have experience with any of these, mention them here.`
    : '';

  return `[INSERT: Describe your technical depth and systems expertise. Focus on ${topHard}. 
Reference these achievements from your CV:
${achievementContext}${topMissed}
Connect your technical work to business outcomes. Use 3-4 sentences with at least one quantified metric.]`;
}

/**
 * Build the mentoring paragraph template.
 */
function buildMentoring(cv, matchResult, jdContext, keywords) {
  const domainKeywords = [
    'mentor', 'coach', 'career', 'growth', 'promotion', 'team development',
    'people', 'training', 'onboarding', 'knowledge sharing', 'code review',
    'pair program', 'culture', 'junior', 'senior', 'talent',
  ];

  const achievements = collectDomainAchievements(cv, domainKeywords, 3);
  const hasContent = achievements.length > 0;

  let achievementContext = '';
  if (hasContent) {
    achievementContext = achievements.map((a, i) =>
      `  - Mentoring example ${i + 1}: "${a.text}" (from: ${a.source})`
    ).join('\n');
  } else {
    achievementContext = '  - [No explicit mentoring achievements detected in CV — use soft skills or team collaboration experience instead]';
  }

  return `[INSERT: Describe your mentoring and team development experience. Focus on engineers mentored, career growth facilitated, and team culture built. 
Reference these achievements from your CV:
${achievementContext}
If the JD values team development, knowledge sharing, or culture building, emphasize those aspects. Use 2-3 sentences with specifics (team size, promotions driven, time saved).]`;
}

/**
 * Build the closing paragraph template.
 */
function buildClosing(cv, matchResult, jdContext, keywords) {
  const name = extractCandidateName(cv);
  const role = jdContext.roleTitle || 'this role';
  const company = jdContext.companyName || 'your team';

  let companyContext = '';
  if (jdContext.keyRequirements && jdContext.keyRequirements.length > 0) {
    companyContext = `\nThe JD highlights these key requirements: ${jdContext.keyRequirements.slice(0, 3).join('; ')}. If your experience covers any of these, restate them here.`;
  }

  return `[INSERT: Close with a confident, warm statement.${companyContext}
Reiterate your enthusiasm for the ${role} role at ${company}. Mention that your combination of leadership, technical expertise, and mentoring makes you a strong fit. Include a call to action — express eagerness to discuss how you can contribute. Sign off as ${name}. 2-3 sentences.]

Sincerely,
${name}`;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a cover letter skeleton with [INSERT: ...] placeholders.
 *
 * @param {object} cv - Structured CV data (matching cv.schema.json).
 * @param {object} matchResult - F6 match result (matching match-output.schema.json).
 * @param {string} jdText - Raw job description text for context extraction.
 * @param {object} [opts] - Optional overrides.
 * @param {string[]} [opts.sections] - Which sections to include. Default: all 5.
 *        Valid: 'opening', 'leadership', 'technical', 'mentoring', 'closing'.
 * @param {number} [opts.refuseThreshold=0.35] - Match threshold below which to refuse.
 * @returns {object} { refused, paragraphs, jdContext, cvContext, metadata }
 */
function generateCoverLetter(cv, matchResult, jdText, opts) {
  const startTime = Date.now();
  const options = opts || {};

  const refuseThreshold = typeof options.refuseThreshold === 'number'
    ? options.refuseThreshold
    : DEFAULT_REFUSE_THRESHOLD;

  const sectionFilter = options.sections || ALL_SECTIONS;
  // Validate section names
  const validSections = sectionFilter.filter(s => ALL_SECTIONS.includes(s));

  // ── Refusal gate ──
  const overallPct = matchResult.overall.percentage;
  if (overallPct < refuseThreshold) {
    return {
      refused: true,
      reason: `Match score (${Math.round(overallPct * 100)}%) is below the ${Math.round(refuseThreshold * 100)}% threshold. A meaningful cover letter cannot be generated with this level of keyword alignment. Consider upskilling or targeting a different role.`,
      matchPercentage: parseFloat(overallPct.toFixed(4)),
      metadata: {
        generatedAt: new Date().toISOString(),
        generatorVersion: '1.0.0',
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  // ── Extract context ──
  const jdContext = extractJDContext(jdText);
  const keywords = extractTopKeywords(matchResult);
  const strengths = collectStrengths(matchResult, cv);
  const titles = extractTitles(cv);

  // ── Build sections ──
  const sectionBuilders = {
    opening: () => buildOpening(cv, matchResult, jdContext, keywords),
    leadership: () => buildLeadership(cv, matchResult, jdContext, keywords),
    technical: () => buildTechnical(cv, matchResult, jdContext, keywords),
    mentoring: () => buildMentoring(cv, matchResult, jdContext, keywords),
    closing: () => buildClosing(cv, matchResult, jdContext, keywords),
  };

  const paragraphs = [];
  for (const section of validSections) {
    paragraphs.push({
      section,
      label: sectionLabel(section),
      template: sectionBuilders[section](),
    });
  }

  // ── CV context for LLM fill ──
  const cvContext = {
    candidateName: extractCandidateName(cv),
    titles,
    topHardKeywords: keywords.hard,
    topSoftKeywords: keywords.soft,
    matchStrengths: strengths,
    overallMatchPercent: Math.round(overallPct * 100),
  };

  // ── Metadata ──
  const metadata = {
    generatedAt: new Date().toISOString(),
    generatorVersion: '1.0.0',
    processingTimeMs: Date.now() - startTime,
    sectionsIncluded: validSections,
    sectionsRequested: sectionFilter,
  };

  return {
    refused: false,
    matchPercentage: parseFloat(overallPct.toFixed(4)),
    jdContext,
    paragraphs,
    cvContext,
    metadata,
  };
}

module.exports = { generateCoverLetter };
