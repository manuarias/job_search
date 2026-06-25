/**
 * assembler.test.js — Tests for the F8 CV Assembler.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { assembleCV, rankAchievement, selectAchievements, reorderSkills } = require('./assembler');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function loadCV() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cv_en.json'), 'utf8'));
}

function makeMatchResult(overrides) {
  const base = {
    overall: { score: 75, maxScore: 100, percentage: 0.75 },
    scorers: {
      hardKeywords: {
        score: 8, maxScore: 10, percentage: 0.8, weight: 0.4, weightedScore: 0.32,
        details: {
          matched: ['n8n', 'Jira', 'Java', 'Docker', 'Agile', 'REST API', 'CI/CD', 'Scrum'],
          missed: ['Kubernetes', 'Python'],
          total: 10,
        },
      },
      softKeywords: {
        score: 4, maxScore: 5, percentage: 0.8, weight: 0.2, weightedScore: 0.16,
        details: { matched: ['Leadership', 'Stakeholder Management', 'Cross-Functional Collaboration', 'Ownership'], missed: ['Communication'], total: 5 },
      },
      domainMatch: {
        score: 3, maxScore: 5, percentage: 0.6, weight: 0.2, weightedScore: 0.12,
        details: {
          cvDomains: ['delivery-management', 'backend-engineering', 'automation', 'leadership', 'devops'],
          jdDomains: ['delivery-management', 'automation', 'backend-engineering', 'data-engineering', 'frontend'],
          matched: ['delivery-management', 'backend-engineering', 'automation'],
          missed: ['data-engineering', 'frontend'],
          total: 5,
        },
      },
      seniorityFit: { score: 0.85, maxScore: 1, percentage: 0.85, weight: 0.1, weightedScore: 0.085, details: { cvYears: 10, jdYears: 5, cvLevel: 'senior', jdLevel: 'senior' } },
      fuzzyMatch: { score: 12, maxScore: 20, percentage: 0.6, weight: 0.1, weightedScore: 0.06, details: {} },
    },
    summary: { strengths: ['Strong technical keyword match (80%)'], gaps: ['Domain coverage gap (60%)'], keywordCoverage: { matched: 12, total: 15, percentage: 0.8 } },
    recommendation: { level: 'apply', label: 'Good match', actions: [] },
    metadata: { matchedAt: new Date().toISOString(), matcherVersion: '1.0.0', weightsUsed: {}, processingTimeMs: 45 },
  };

  if (overrides) {
    if (overrides.overall) Object.assign(base.overall, overrides.overall);
    if (overrides.scorers) {
      for (const [key, val] of Object.entries(overrides.scorers)) {
        if (base.scorers[key]) {
          if (val.details) { Object.assign(base.scorers[key].details, val.details); delete val.details; }
          Object.assign(base.scorers[key], val);
        }
      }
    }
    if (overrides.summary) Object.assign(base.summary, overrides.summary);
  }

  return base;
}

function makeAchievement(overrides) {
  return {
    id: 'test-ach-1',
    text: 'Built a scalable Java backend service handling 20k RPM.',
    metrics: [{ type: 'other', value: '20,000+ RPM' }],
    technologies: ['Java', 'REST API'],
    domains: ['backend-engineering'],
    tags: ['architecture', 'high-throughput'],
    impact: 'high',
    ...overrides,
  };
}

function makeMinimalCV() {
  return {
    contact: { name: 'Test User', titles: ['Software Engineer'], location: 'Remote', email: 'test@test.com' },
    professionalSummary: [{ text: 'Experienced engineer with Java and Python skills.' }],
    coreCompetencies: [{ title: 'Backend', description: 'Built REST APIs with Java and Docker.' }],
    skills: [
      { category: 'Languages', items: ['Java', 'Python', 'JavaScript'] },
      { category: 'Tools', items: ['Docker', 'Git', 'Jira'] },
    ],
    professionalExperience: [
      {
        role: 'Software Engineer', company: 'TestCorp', dates: { start: '2020-01', end: '2023-06' },
        achievements: [makeAchievement()],
      },
    ],
    education: [{ degree: 'BSc Computer Science', institution: 'Test University' }],
  };
}

// ── Module shape ─────────────────────────────────────────────────────────────

describe('assembler — module shape', () => {
  it('exports assembleCV as a function', () => {
    expect(assembleCV).toBeInstanceOf(Function);
  });

  it('exports rankAchievement, selectAchievements, reorderSkills', () => {
    expect(rankAchievement).toBeInstanceOf(Function);
    expect(selectAchievements).toBeInstanceOf(Function);
    expect(reorderSkills).toBeInstanceOf(Function);
  });

  it('assembleCV returns required top-level keys', () => {
    const result = assembleCV(makeMinimalCV(), makeMatchResult());
    expect(result).toHaveProperty('markdown');
    expect(result).toHaveProperty('lowConfidence');
    expect(result).toHaveProperty('reframeHints');
    expect(result).toHaveProperty('stats');
  });

  it('stats has correct fields', () => {
    const result = assembleCV(makeMinimalCV(), makeMatchResult());
    expect(result.stats).toHaveProperty('totalAchievements');
    expect(result.stats).toHaveProperty('selected');
    expect(result.stats).toHaveProperty('skillCatOrder');
    expect(result.stats).toHaveProperty('lowConfidence');
  });
});

// ── rankAchievement — 3 cases ────────────────────────────────────────────────

describe('assembler — rankAchievement', () => {
  const jdKeywords = ['n8n', 'Jira', 'Java', 'Docker', 'Agile', 'Python', 'Kubernetes'];
  const jdDomains = ['delivery-management', 'automation', 'backend-engineering'];

  it('high-impact achievement with strong keyword match scores ≥ 0.70', () => {
    const ach = makeAchievement({
      technologies: ['n8n', 'Jira'],
      domains: ['delivery-management', 'backend-engineering'],
      tags: ['cross-team', 'roadmapping'],
      impact: 'high',
    });
    const score = rankAchievement(ach, jdKeywords, jdDomains);
    expect(score).toBeGreaterThanOrEqual(0.70);
  });

  it('achievement with no JD keyword overlap scores ≤ 0.30', () => {
    const ach = makeAchievement({
      technologies: ['CouchDB', 'MongoDB'],
      domains: ['data-engineering'],
      tags: ['nosql'],
      impact: 'low',
    });
    const score = rankAchievement(ach, jdKeywords, jdDomains);
    expect(score).toBeLessThanOrEqual(0.30);
  });

  it('medium-impact achievement with partial match has intermediate score', () => {
    const ach = makeAchievement({
      technologies: ['Java'],
      domains: ['frontend'],  // not in jdDomains
      impact: 'medium',
    });
    const score = rankAchievement(ach, jdKeywords, jdDomains);
    // keywordOverlap=1, domainBoost=0, impact=0.7 → 1*0.5 + 0 + 0.7*0.2 = 0.64
    expect(score).toBeGreaterThan(0.30);
    expect(score).toBeLessThan(0.70);
  });
});

// ── selectAchievements — domain diversity ────────────────────────────────────

describe('assembler — selectAchievements', () => {
  const jdKeywords = ['n8n', 'Jira', 'Java', 'Docker'];
  const jdDomains = ['delivery-management', 'automation', 'backend-engineering'];

  it('selects N=4 from 6 achievements with domain diversity', () => {
    const achievements = [
      makeAchievement({ id: 'a1', technologies: ['n8n', 'Jira'], domains: ['delivery-management', 'backend-engineering'], impact: 'high' }),
      makeAchievement({ id: 'a2', technologies: ['Java'], domains: ['backend-engineering'], impact: 'high' }),
      makeAchievement({ id: 'a3', technologies: ['n8n'], domains: ['automation'], impact: 'high' }),
      makeAchievement({ id: 'a4', technologies: ['Docker'], domains: ['devops'], impact: 'medium' }),
      makeAchievement({ id: 'a5', technologies: ['Java'], domains: ['backend-engineering'], impact: 'medium' }),
      makeAchievement({ id: 'a6', technologies: [], domains: ['leadership'], impact: 'low' }),
    ];
    const selected = selectAchievements(achievements, 4, jdKeywords, jdDomains);
    expect(selected).toHaveLength(4);
    // Domain diversity: each should have a different domain set if possible
    const domainSets = selected.map(s => [...(s.ach.domains || [])].sort().join('|'));
    const uniqueDomains = new Set(domainSets);
    // With 6 achievements across 4 different domain combos, we should get at least 3 unique domain sets
    expect(uniqueDomains.size).toBeGreaterThanOrEqual(3);
  });

  it('returns all when fewer than N exist', () => {
    const achievements = [makeAchievement({ id: 'a1' }), makeAchievement({ id: 'a2' })];
    const selected = selectAchievements(achievements, 4, jdKeywords, jdDomains);
    expect(selected).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(selectAchievements([], 4, jdKeywords, jdDomains)).toEqual([]);
    expect(selectAchievements(null, 4, jdKeywords, jdDomains)).toEqual([]);
  });
});

// ── reorderSkills — category ordering ─────────────────────────────────────────

describe('assembler — reorderSkills', () => {
  const jdKeywords = ['n8n', 'Jira', 'Docker', 'GitHub', 'Confluence'];

  it('sorts categories by JD keyword match count', () => {
    const skills = [
      { category: 'Databases', items: ['MySQL', 'CouchDB', 'MongoDB'] },
      { category: 'Automation & Tools', items: ['n8n', 'Jira', 'GitHub', 'Confluence', 'Webhooks'] },
      { category: 'Technical Background', items: ['Docker', 'Java', 'REST API'] },
      { category: 'Program Management', items: ['Agile', 'Scrum', 'Kanban'] },
    ];
    const reordered = reorderSkills(skills, jdKeywords);
    // Automation & Tools: n8n, Jira, GitHub, Confluence = 4 matches → first
    // Technical Background: Docker = 1 match → second
    // Databases: 0 matches → third (alphabetical)
    // Program Management: 0 matches → fourth (alphabetical after Databases)
    expect(reordered[0].category).toBe('Automation & Tools');
    expect(reordered[1].category).toBe('Technical Background');
  });

  it('places JD-matched items before unmatched within a category', () => {
    const skills = [
      { category: 'Tools', items: ['Webhooks', 'n8n', 'Jira', 'Confluence', 'Zapier'] },
    ];
    const reordered = reorderSkills(skills, jdKeywords);
    const items = reordered[0].items;
    // Matched items (n8n, Jira, Confluence) first in original order, then unmatched (Webhooks, Zapier) alpha
    const matchedSlice = items.slice(0, 3);
    expect(matchedSlice).toContain('n8n');
    expect(matchedSlice).toContain('Jira');
    expect(matchedSlice).toContain('Confluence');
    // Unmatched items should be alphabetically sorted after matched
    const unmatchedSlice = items.slice(3);
    expect(unmatchedSlice[0]).toBe('Webhooks');
    expect(unmatchedSlice[1]).toBe('Zapier');
  });

  it('returns empty for empty input', () => {
    expect(reorderSkills([], jdKeywords)).toEqual([]);
    expect(reorderSkills(null, jdKeywords)).toEqual([]);
  });
});

// ── Markdown section builders (via assembleCV) ───────────────────────────────

describe('assembler — Markdown sections', () => {
  it('produces 6 sections for full CV', () => {
    const cv = loadCV();
    const mr = makeMatchResult();
    const result = assembleCV(cv, mr);
    const md = result.markdown;

    // Six sections expected
    expect(md).toContain('# Emanuel Ignacio Arias');
    expect(md).toContain('### Professional Summary');
    expect(md).toContain('### Core Competencies');
    expect(md).toContain('### Core Skills');
    expect(md).toContain('### Professional Experience');
    expect(md).toContain('### Education');
  });

  it('shows N/A for empty education', () => {
    const cv = makeMinimalCV();
    cv.education = [];
    const result = assembleCV(cv, makeMatchResult());
    expect(result.markdown).toContain('N/A');
  });
});

// ── Low-confidence handling ──────────────────────────────────────────────────

describe('assembler — low confidence', () => {
  it('sets lowConfidence true and warns when overall < 0.35', () => {
    const mr = makeMatchResult({ overall: { percentage: 0.28 } });
    const result = assembleCV(makeMinimalCV(), mr);
    expect(result.lowConfidence).toBe(true);
    expect(result.stats.lowConfidence).toBe(true);
    expect(result.markdown).toContain('LOW CONFIDENCE');
  });

  it('sets lowConfidence false when overall ≥ 0.35', () => {
    const mr = makeMatchResult({ overall: { percentage: 0.40 } });
    const result = assembleCV(makeMinimalCV(), mr);
    expect(result.lowConfidence).toBe(false);
    expect(result.markdown).not.toContain('LOW CONFIDENCE');
  });
});

// ── Reframe hints ────────────────────────────────────────────────────────────

describe('assembler — reframe hints', () => {
  it('generates hints for achievements lacking JD terminology in text', () => {
    const cv = makeMinimalCV();
    cv.professionalExperience = [{
      role: 'Engineer', company: 'Co', dates: { start: '2020-01', end: '2022-01' },
      achievements: [
        makeAchievement({
          id: 'hint-ach-1',
          text: 'Coordinated cross-team delivery of platform migration.',  // no JD keywords in text
          technologies: ['n8n', 'Jira'],  // but tech matches JD
          domains: ['delivery-management'],
          impact: 'high',
        }),
        makeAchievement({
          id: 'hint-ach-2',
          text: 'Built APIs with Java and Docker for containerized deployments.',  // has JD keywords in text
          technologies: ['Java', 'Docker'],
          domains: ['backend-engineering'],
          impact: 'high',
        }),
      ],
    }];
    const mr = makeMatchResult();
    const result = assembleCV(cv, mr);
    expect(result.reframeHints.length).toBeGreaterThanOrEqual(1);
    // hint-ach-1 should be flagged (tech match, text lacks JD terms)
    const hint = result.reframeHints.find(h => h.achievementId === 'hint-ach-1');
    expect(hint).toBeDefined();
    expect(hint.jdTerms).toBeDefined();
    expect(hint.jdTerms.length).toBeGreaterThan(0);
  });

  it('emits achievementId, currentText, suggestion, jdTerms in each hint', () => {
    const cv = makeMinimalCV();
    cv.professionalExperience = [{
      role: 'Engineer', company: 'Co',
      achievements: [
        makeAchievement({
          id: 'hint-ach-3',
          text: 'Managed cross-team coordination for platform changes.',
          technologies: ['n8n', 'Jira'],
          domains: ['delivery-management'],
          impact: 'high',
        }),
      ],
    }];
    const result = assembleCV(cv, makeMatchResult());
    if (result.reframeHints.length > 0) {
      const h = result.reframeHints[0];
      expect(h).toHaveProperty('achievementId');
      expect(h).toHaveProperty('currentText');
      expect(h).toHaveProperty('suggestion');
      expect(h).toHaveProperty('jdTerms');
      expect(Array.isArray(h.jdTerms)).toBe(true);
    }
  });
});

// ── Integration test ─────────────────────────────────────────────────────────

describe('assembler — integration with real data', () => {
  it('assembleCV with real CV produces valid output structure', () => {
    const cv = loadCV();
    const mr = makeMatchResult();
    const result = assembleCV(cv, mr);

    // 6 sections present
    const md = result.markdown;
    expect(md).toContain('### Professional Summary');
    expect(md).toContain('### Core Competencies');
    expect(md).toContain('### Core Skills');
    expect(md).toContain('### Professional Experience');
    expect(md).toContain('### Education');

    // lowConfidence is boolean
    expect(typeof result.lowConfidence).toBe('boolean');

    // reframeHints is array
    expect(Array.isArray(result.reframeHints)).toBe(true);

    // stats has correct shape
    expect(typeof result.stats.totalAchievements).toBe('number');
    expect(typeof result.stats.selected).toBe('number');
    expect(Array.isArray(result.stats.skillCatOrder)).toBe(true);
    expect(result.stats.totalAchievements).toBeGreaterThan(0);
    expect(result.stats.selected).toBeGreaterThan(0);
  });
});
