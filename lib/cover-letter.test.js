/**
 * cover-letter.test.js — Comprehensive tests for the F9 Cover Letter Generator.
 *
 * Tests cover:
 *   1. Module shape and exports
 *   2. Refusal gate (match < 35%)
 *   3. Non-refusal (match ≥ 35%)
 *   4. All 5 sections present with correct labels
 *   5. Section filtering via opts.sections
 *   6. [INSERT: ...] placeholder format in every template
 *   7. JD context extraction (company, role, requirements)
 *   8. CV context extraction (name, titles, keywords, strengths)
 *   9. Custom refuse threshold
 *  10. Edge cases (empty jdText, missing CV fields, null opts)
 *  11. Integration with real CV + synthetic match
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { generateCoverLetter } = require('./cover-letter');

// ── Fixtures ────────────────────────────────────────────────────────────────

function loadCV() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cv_en.json'), 'utf8'));
}

function minimalCV(overrides) {
  return {
    contact: {
      name: 'Test User',
      titles: ['Senior Software Engineer', 'Engineering Manager'],
    },
    professionalSummary: [
      { text: 'Experienced engineering leader with 10+ years building scalable systems. Led cross-functional teams of up to 8 engineers.' },
    ],
    coreCompetencies: [
      { title: 'Technical Leadership', description: 'Owned end-to-end delivery of 3 major platform migrations, coordinating across 4 teams.' },
    ],
    skills: [
      { category: 'Languages', items: ['Java', 'Python', 'JavaScript'] },
      { category: 'Tools', items: ['Docker', 'Kubernetes', 'AWS'] },
    ],
    professionalExperience: [
      {
        id: 'exp-001',
        role: 'Engineering Manager',
        company: 'TestCorp',
        dates: { start: '2020-01', end: '2023-06' },
        achievements: [
          {
            id: 'ach-001',
            text: 'Led cross-functional squad of 8 engineers delivering a platform migration handling 20k RPM, reducing incident response time by 60%.',
            technologies: ['Java', 'Docker', 'Kubernetes'],
            domains: ['delivery-management', 'backend-engineering'],
          },
          {
            id: 'ach-002',
            text: 'Mentored 4 junior engineers, resulting in 2 promotions to senior within 18 months.',
            technologies: [],
            domains: ['mentoring', 'career-growth'],
          },
          {
            id: 'ach-003',
            text: 'Architected a debugging engine that cut RCA time from ~2 hours to ~30 minutes.',
            technologies: ['n8n', 'Python'],
            domains: ['automation', 'observability'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function minimalMatchResult(overrides) {
  return {
    overall: { score: 72, maxScore: 100, percentage: 0.72 },
    scorers: {
      hardKeywords: {
        score: 4, maxScore: 5, percentage: 0.8, weight: 0.30, weightedScore: 0.24,
        details: {
          matched: ['Java', 'Docker', 'Kubernetes', 'AWS'],
          missed: ['Go', 'Rust'],
          total: 6,
        },
      },
      softKeywords: {
        score: 3, maxScore: 4, percentage: 0.75, weight: 0.20, weightedScore: 0.15,
        details: {
          matched: ['Leadership', 'Mentoring', 'Communication'],
          missed: ['Negotiation'],
          total: 4,
        },
      },
      domainMatch: {
        score: 2, maxScore: 3, percentage: 0.67, weight: 0.20, weightedScore: 0.134,
        details: {
          cvDomains: ['delivery-management', 'backend-engineering'],
          jdDomains: ['delivery-management', 'backend-engineering', 'cloud-infrastructure'],
          matched: ['delivery-management', 'backend-engineering'],
          missed: ['cloud-infrastructure'],
          total: 3,
        },
      },
      seniorityFit: {
        score: 1, maxScore: 1, percentage: 0.85, weight: 0.15, weightedScore: 0.1275,
        details: {
          cvYears: 8,
          jdYears: 5,
          cvLevel: 'senior',
          jdLevel: 'senior',
          yearsFit: 0.85,
          levelFit: 0.9,
        },
      },
      fuzzyMatch: {
        score: 5, maxScore: 10, percentage: 0.5, weight: 0.15, weightedScore: 0.075,
        details: {},
      },
    },
    summary: {
      strengths: ['Strong technical keyword match', 'Seniority level aligns'],
      gaps: ['Domain coverage gap'],
      keywordCoverage: { matched: 7, total: 10, percentage: 0.7 },
    },
    recommendation: { level: 'tailor', label: 'Moderate match', actions: [] },
    metadata: { matchedAt: new Date().toISOString(), matcherVersion: '1.0.0', weightsUsed: {}, processingTimeMs: 12 },
    ...overrides,
  };
}

function minimalJDText() {
  return `Senior Software Engineer — Acme Corp

About Acme Corp: Acme Corp is a leading provider of cloud infrastructure solutions.

We are looking for a Senior Software Engineer to join our platform team.

Requirements:
- 5+ years of experience with Java and cloud infrastructure
- Experience leading cross-functional engineering teams
- Strong communication and mentoring skills
- Experience with Docker and Kubernetes

Nice to have:
- Go or Rust experience
- AWS certification`;
}

// ── Module shape ────────────────────────────────────────────────────────────

describe('cover-letter — module shape', () => {
  it('exports generateCoverLetter as a function', () => {
    expect(generateCoverLetter).toBeInstanceOf(Function);
  });

  it('returns result with refused boolean', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result).toHaveProperty('refused');
    expect(typeof result.refused).toBe('boolean');
  });

  it('non-refused result has required keys', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result).toHaveProperty('refused', false);
    expect(result).toHaveProperty('matchPercentage');
    expect(result).toHaveProperty('jdContext');
    expect(result).toHaveProperty('paragraphs');
    expect(result).toHaveProperty('cvContext');
    expect(result).toHaveProperty('metadata');
  });

  it('paragraphs is an array with 5 entries by default', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(Array.isArray(result.paragraphs)).toBe(true);
    expect(result.paragraphs).toHaveLength(5);
  });

  it('each paragraph has section, label, template', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    for (const p of result.paragraphs) {
      expect(p).toHaveProperty('section');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('template');
      expect(typeof p.template).toBe('string');
    }
  });

  it('matchPercentage matches input', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.matchPercentage).toBeCloseTo(0.72, 2);
  });

  it('metadata has expected fields', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.metadata).toHaveProperty('generatedAt');
    expect(result.metadata).toHaveProperty('generatorVersion', '1.0.0');
    expect(result.metadata).toHaveProperty('processingTimeMs');
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.metadata).toHaveProperty('sectionsIncluded');
    expect(result.metadata).toHaveProperty('sectionsRequested');
  });
});

// ── Refusal gate ────────────────────────────────────────────────────────────

describe('cover-letter — refusal gate', () => {
  it('refuses when match < 35%', () => {
    const match = minimalMatchResult({
      overall: { score: 20, maxScore: 100, percentage: 0.20 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.refused).toBe(true);
    expect(result.reason).toContain('20%');
    expect(result.reason).toContain('35%');
    expect(result).not.toHaveProperty('paragraphs');
  });

  it('refuses when match = 34%', () => {
    const match = minimalMatchResult({
      overall: { score: 34, maxScore: 100, percentage: 0.34 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.refused).toBe(true);
  });

  it('does not refuse when match = 35% exactly', () => {
    const match = minimalMatchResult({
      overall: { score: 35, maxScore: 100, percentage: 0.35 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.refused).toBe(false);
    expect(result.paragraphs).toBeDefined();
  });

  it('does not refuse when match > 35%', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.refused).toBe(false);
  });

  it('respects custom refuseThreshold', () => {
    const match = minimalMatchResult({
      overall: { score: 40, maxScore: 100, percentage: 0.40 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText(), { refuseThreshold: 0.50 });
    expect(result.refused).toBe(true);
    expect(result.reason).toContain('50%');
  });

  it('refused result still has metadata', () => {
    const match = minimalMatchResult({
      overall: { score: 10, maxScore: 100, percentage: 0.10 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.metadata).toHaveProperty('generatedAt');
    expect(result.metadata).toHaveProperty('generatorVersion');
  });

  it('refused result includes matchPercentage', () => {
    const match = minimalMatchResult({
      overall: { score: 25, maxScore: 100, percentage: 0.25 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.matchPercentage).toBeCloseTo(0.25, 2);
  });
});

// ── Section structure ───────────────────────────────────────────────────────

describe('cover-letter — section structure', () => {
  let result;

  beforeAll(() => {
    result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
  });

  it('all 5 sections are present in order', () => {
    const sections = result.paragraphs.map(p => p.section);
    expect(sections).toEqual(['opening', 'leadership', 'technical', 'mentoring', 'closing']);
  });

  it('each section has correct label', () => {
    const labels = result.paragraphs.map(p => p.label);
    expect(labels[0]).toBe('Opening Paragraph');
    expect(labels[1]).toBe('Leadership & Strategic Impact');
    expect(labels[2]).toBe('Technical Depth & Systems');
    expect(labels[3]).toBe('Mentoring & Team Development');
    expect(labels[4]).toBe('Closing Paragraph');
  });

  it('every template contains [INSERT: placeholder', () => {
    for (const p of result.paragraphs) {
      expect(p.template).toMatch(/\[INSERT:/);
    }
  });

  it('opening template contains candidate name', () => {
    const opening = result.paragraphs[0].template;
    expect(opening).toContain('Test User');
  });

  it('opening template starts with Dear Hiring Manager', () => {
    expect(result.paragraphs[0].template).toMatch(/^Dear Hiring Manager/);
  });

  it('closing template ends with candidate name', () => {
    const closing = result.paragraphs[4].template;
    expect(closing).toContain('Test User');
    expect(closing).toContain('Sincerely,');
  });

  it('leadership template references CV achievements', () => {
    const leadership = result.paragraphs[1].template;
    expect(leadership).toContain('Led cross-functional');
  });

  it('technical template references technologies', () => {
    const technical = result.paragraphs[2].template;
    expect(technical).toMatch(/Java|Docker/);
  });

  it('mentoring template references mentoring achievements', () => {
    const mentoring = result.paragraphs[3].template;
    expect(mentoring).toContain('Mentored');
  });

  it('closing template includes key requirements when present', () => {
    const closing = result.paragraphs[4].template;
    // JD has requirements — should be referenced
    expect(closing).toMatch(/key requirements/);
  });
});

// ── Section filtering ───────────────────────────────────────────────────────

describe('cover-letter — section filtering', () => {
  it('returns only requested sections', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: ['opening', 'closing'],
    });
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[0].section).toBe('opening');
    expect(result.paragraphs[1].section).toBe('closing');
  });

  it('returns 3 middle sections only', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: ['leadership', 'technical', 'mentoring'],
    });
    expect(result.paragraphs).toHaveLength(3);
    const sections = result.paragraphs.map(p => p.section);
    expect(sections).toEqual(['leadership', 'technical', 'mentoring']);
  });

  it('returns empty paragraphs when sections is empty', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: [],
    });
    expect(result.paragraphs).toHaveLength(0);
  });

  it('ignores invalid section names', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: ['opening', 'invalid-section', 'closing'],
    });
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[0].section).toBe('opening');
    expect(result.paragraphs[1].section).toBe('closing');
    expect(result.metadata.sectionsRequested).toContain('invalid-section');
    expect(result.metadata.sectionsIncluded).not.toContain('invalid-section');
  });

  it('metadata tracks sectionsRequested vs sectionsIncluded', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: ['opening', 'leadership', 'bogus', 'closing'],
    });
    expect(result.metadata.sectionsRequested).toEqual(['opening', 'leadership', 'bogus', 'closing']);
    expect(result.metadata.sectionsIncluded).toEqual(['opening', 'leadership', 'closing']);
  });

  it('single section works', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), {
      sections: ['technical'],
    });
    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].section).toBe('technical');
    expect(result.paragraphs[0].template).toMatch(/\[INSERT:/);
  });
});

// ── JD context extraction ───────────────────────────────────────────────────

describe('cover-letter — JD context extraction', () => {
  it('extracts company name from JD', () => {
    const jd = `About Acme Corp: We build cloud tools.\n\nSenior Engineer role at Acme Corp.`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.companyName).toBe('Acme Corp');
  });

  it('extracts role title from JD', () => {
    const jd = `We are looking for a Senior Software Engineer to join our team.\n\nRequirements: ...`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.roleTitle).toBe('Senior Software Engineer');
  });

  it('extracts key requirements from JD', () => {
    const jd = `Job Description\n\nRequirements:\n- 5+ years of Java experience\n- Docker and Kubernetes knowledge\n- Strong communication skills`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.keyRequirements.length).toBeGreaterThan(0);
    const reqText = result.jdContext.keyRequirements.join(' ');
    expect(reqText).toMatch(/Java/);
  });

  it('handles empty JD text gracefully', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), '');
    expect(result.jdContext.companyName).toBeNull();
    expect(result.jdContext.roleTitle).toBeNull();
    expect(result.jdContext.keyRequirements).toEqual([]);
  });

  it('handles null JD text gracefully', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), null);
    expect(result.jdContext.companyName).toBeNull();
    expect(result.paragraphs).toBeDefined();
    expect(result.refused).toBe(false);
  });

  it('handles JD with no company name', () => {
    const jd = `We are hiring a Developer. Requirements: JavaScript, React.`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.roleTitle).toBeTruthy();
    // company may be null
    expect(result.paragraphs).toHaveLength(5);
  });

  it('handles JD with "Looking for" pattern', () => {
    const jd = `Acme Corp is looking for a Lead Platform Engineer.\n\nAbout us: ...`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.companyName).toBeTruthy();
    const title = result.jdContext.roleTitle;
    expect(title).toBeTruthy();
  });

  it('extracts up to 5 key requirements', () => {
    const jd = `Requirements:\n- Req 1 with enough text to be valid\n- Req 2 with enough text to be valid\n- Req 3 with enough text to be valid\n- Req 4 with enough text to be valid\n- Req 5 with enough text to be valid\n- Req 6 with enough text to be valid\n- Req 7 with enough text to be valid`;
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.keyRequirements.length).toBeLessThanOrEqual(5);
  });
});

// ── CV context extraction ───────────────────────────────────────────────────

describe('cover-letter — CV context extraction', () => {
  it('extracts candidate name', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.candidateName).toBe('Test User');
  });

  it('extracts titles', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.titles).toContain('Senior Software Engineer');
    expect(result.cvContext.titles).toContain('Engineering Manager');
  });

  it('extracts top hard keywords', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.topHardKeywords.length).toBeGreaterThan(0);
    expect(result.cvContext.topHardKeywords).toContain('Java');
  });

  it('extracts top soft keywords', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.topSoftKeywords.length).toBeGreaterThan(0);
  });

  it('identifies match strengths (scorers >= 70%)', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.matchStrengths.length).toBeGreaterThan(0);
  });

  it('includes overall match percent', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    expect(result.cvContext.overallMatchPercent).toBe(72);
  });

  it('handles CV with no titles gracefully', () => {
    const cv = minimalCV();
    delete cv.contact.titles;
    const result = generateCoverLetter(cv, minimalMatchResult(), minimalJDText());
    expect(result.cvContext.titles).toEqual([]);
  });

  it('handles CV with no name gracefully', () => {
    const cv = minimalCV();
    delete cv.contact.name;
    const result = generateCoverLetter(cv, minimalMatchResult(), minimalJDText());
    expect(result.cvContext.candidateName).toBe('the candidate');
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe('cover-letter — edge cases', () => {
  it('handles null options gracefully', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText(), null);
    expect(result.refused).toBe(false);
    expect(result.paragraphs).toHaveLength(5);
  });

  it('handles CV with no professional experience', () => {
    const cv = minimalCV();
    cv.professionalExperience = [];
    const result = generateCoverLetter(cv, minimalMatchResult(), minimalJDText());
    expect(result.refused).toBe(false);
    expect(result.paragraphs).toHaveLength(5);
    // Leadership section draws from coreCompetencies and professionalSummary
    const leadership = result.paragraphs[1].template;
    expect(leadership).toMatch(/\[INSERT:/);
    // Should reference coreCompetencies entry
    expect(leadership).toContain('coreCompetencies');
  });

  it('handles CV with no achievements', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements = [];
    const result = generateCoverLetter(cv, minimalMatchResult(), minimalJDText());
    expect(result.refused).toBe(false);
    // Templates should still be generated
    for (const p of result.paragraphs) {
      expect(p.template).toMatch(/\[INSERT:/);
    }
  });

  it('handles match result with empty keyword arrays', () => {
    const match = minimalMatchResult();
    match.scorers.hardKeywords.details.matched = [];
    match.scorers.hardKeywords.details.missed = [];
    match.scorers.softKeywords.details.matched = [];
    match.scorers.softKeywords.details.missed = [];
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.refused).toBe(false);
    expect(result.cvContext.topHardKeywords).toEqual([]);
  });

  it('handles match result with all low scorers (no strengths)', () => {
    const match = minimalMatchResult({ overall: { score: 60, maxScore: 100, percentage: 0.60 } });
    for (const key of Object.keys(match.scorers)) {
      match.scorers[key].percentage = 0.3;
    }
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.cvContext.matchStrengths).toEqual([]);
  });

  it('handles JD text with no requirements section', () => {
    const jd = 'We are hiring a developer. Join our team!';
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), jd);
    expect(result.jdContext.keyRequirements).toEqual([]);
  });

  it('handles very high match (95%)', () => {
    const match = minimalMatchResult({
      overall: { score: 95, maxScore: 100, percentage: 0.95 },
    });
    const result = generateCoverLetter(minimalCV(), match, minimalJDText());
    expect(result.refused).toBe(false);
    expect(result.matchPercentage).toBeCloseTo(0.95, 2);
    expect(result.cvContext.overallMatchPercent).toBe(95);
  });

  it('all templates are non-empty strings', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    for (const p of result.paragraphs) {
      expect(p.template.length).toBeGreaterThan(50);
    }
  });
});

// ── Integration: real CV + synthetic match ─────────────────────────────────

describe('cover-letter — integration with real CV', () => {
  let cvData;
  let matchResult;
  let jdText;

  beforeAll(() => {
    cvData = loadCV();
    matchResult = minimalMatchResult({
      overall: { score: 78, maxScore: 100, percentage: 0.78 },
    });
    // Enhance with real-looking soft keywords
    matchResult.scorers.softKeywords.details.matched = [
      'Leadership', 'Communication', 'Mentoring', 'Stakeholder Management',
    ];
    matchResult.scorers.hardKeywords.details.matched = [
      'Java', 'Docker', 'AWS', 'CI/CD', 'REST API', 'Microservices',
    ];
    jdText = minimalJDText();
  });

  it('generates a complete skeleton for real CV', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    expect(result.refused).toBe(false);
    expect(result.paragraphs).toHaveLength(5);
  });

  it('opening template references real candidate name', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    expect(result.paragraphs[0].template).toContain(cvData.contact.name);
  });

  it('leadership template finds real leadership achievements', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    const leadership = result.paragraphs[1].template;
    expect(leadership).not.toMatch(/No explicit leadership/);
  });

  it('technical template finds real technical achievements', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    const technical = result.paragraphs[2].template;
    expect(technical).not.toMatch(/No explicit technical/);
  });

  it('mentoring template finds real mentoring achievements', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    const mentoring = result.paragraphs[3].template;
    expect(mentoring).not.toMatch(/No explicit mentoring/);
  });

  it('integrates real JD context', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    expect(result.jdContext.companyName).toBe('Acme Corp');
    expect(result.jdContext.roleTitle).toMatch(/Senior Software Engineer/);
  });

  it('cvContext includes real titles', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    expect(result.cvContext.titles.length).toBeGreaterThan(0);
  });

  it('produces valid metadata', () => {
    const result = generateCoverLetter(cvData, matchResult, jdText);
    expect(result.metadata.generatorVersion).toBe('1.0.0');
    expect(result.metadata.sectionsIncluded).toHaveLength(5);
  });
});

// ── [INSERT: ...] placeholder format consistency ───────────────────────────

describe('cover-letter — placeholder format', () => {
  it('every paragraph template has at least one [INSERT: ...] block', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    for (const p of result.paragraphs) {
      const insertCount = (p.template.match(/\[INSERT:/g) || []).length;
      expect(insertCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('all [INSERT: blocks are properly closed with ]', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    for (const p of result.paragraphs) {
      const openings = (p.template.match(/\[INSERT:/g) || []).length;
      const closings = (p.template.match(/\]/g) || []).length;
      // Each [INSERT: ...] has one closing bracket
      // There might be extra brackets from [Tech: ...] in technical section
      expect(closings).toBeGreaterThanOrEqual(openings);
    }
  });

  it('opening template provides role and company context in placeholder', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    const opening = result.paragraphs[0].template;
    expect(opening).toMatch(/Senior Software Engineer/);
    expect(opening).toMatch(/Acme Corp/);
  });

  it('closing template includes call to action hint', () => {
    const result = generateCoverLetter(minimalCV(), minimalMatchResult(), minimalJDText());
    const closing = result.paragraphs[4].template;
    expect(closing).toMatch(/enthusiasm|discuss|contribute/i);
  });
});
