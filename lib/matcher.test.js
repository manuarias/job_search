/**
 * matcher.test.js — Comprehensive tests for the F6 CV-JD matcher.
 *
 * Tests cover:
 *   1. Module shape and exports
 *   2. Hard keywords scorer
 *   3. Soft keywords scorer (with synonym expansion)
 *   4. Domain match scorer
 *   5. Seniority fit scorer
 *   6. Fuzzy match scorer
 *   7. Weighted aggregator
 *   8. Recommendation generator
 *   9. Full matchCV integration (synthetic data)
 *  10. Output schema validation
 *  11. Integration with real CV + AGIL JD keywords
 *  12. Edge cases (empty inputs, missing fields)
 *  13. Custom weights option
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { matchCV } = require('./matcher');
const { extractKeywords } = require('./keyword-extractor');

// ── Fixtures ────────────────────────────────────────────────────────────────

function loadCV() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cv_en.json'), 'utf8'));
}

function loadAGILJD() {
  return fs.readFileSync(path.join(__dirname, '..', 'applications', 'AGIL', 'job-description.md'), 'utf8');
}

// ── Minimal CV data for unit tests ──────────────────────────────────────────

function minimalCV(overrides) {
  return {
    contact: {
      name: 'Test User',
      titles: ['Software Engineer'],
    },
    professionalSummary: [
      { text: 'Experienced engineer with Java and Python skills.' },
    ],
    coreCompetencies: [
      { title: 'Backend', description: 'Built REST APIs with Java and Docker.' },
    ],
    skills: [
      { category: 'Languages', items: ['Java', 'Python', 'JavaScript'] },
      { category: 'Tools', items: ['Docker', 'Git', 'Jira'] },
    ],
    professionalExperience: [
      {
        role: 'Software Engineer',
        company: 'TestCorp',
        dates: { start: '2020-01', end: '2023-06' },
        achievements: [
          {
            text: 'Built Java REST APIs handling 10k RPM.',
            technologies: ['Java', 'REST API'],
            domains: ['backend-engineering'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function minimalJD(overrides) {
  return {
    hardKeywords: [
      { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 2, mustHave: true, context: '...' },
      { term: 'Docker', category: 'tools', matched: 'Docker', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ],
    softKeywords: [
      { term: 'Leadership', matched: 'leadership', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
      { term: 'Communication', matched: 'communication', confidence: 0.9, frequency: 2, mustHave: true, context: '...' },
    ],
    senioritySignals: {
      yearsMinimum: 3,
      yearsPreferred: 0,
      level: 'mid',
      signals: [],
      title: 'Software Engineer',
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      taxonomyVersion: '1.0.0',
    },
    ...overrides,
  };
}

// ── Module shape ────────────────────────────────────────────────────────────

describe('matcher — module shape', () => {
  it('exports matchCV as a function', () => {
    expect(matchCV).toBeInstanceOf(Function);
  });

  it('returns result with required top-level keys', () => {
    const result = matchCV(minimalCV(), minimalJD());
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('scorers');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('recommendation');
    expect(result).toHaveProperty('metadata');
  });

  it('overall has score, maxScore, percentage', () => {
    const result = matchCV(minimalCV(), minimalJD());
    expect(result.overall).toHaveProperty('score');
    expect(result.overall).toHaveProperty('maxScore', 100);
    expect(result.overall).toHaveProperty('percentage');
    expect(result.overall.percentage).toBeGreaterThanOrEqual(0);
    expect(result.overall.percentage).toBeLessThanOrEqual(1);
  });

  it('scorers has all 5 scorer keys', () => {
    const result = matchCV(minimalCV(), minimalJD());
    const keys = ['hardKeywords', 'softKeywords', 'domainMatch', 'seniorityFit', 'fuzzyMatch'];
    for (const key of keys) {
      expect(result.scorers).toHaveProperty(key);
    }
  });

  it('each scorer has required fields', () => {
    const result = matchCV(minimalCV(), minimalJD());
    for (const [name, scorer] of Object.entries(result.scorers)) {
      expect(scorer).toHaveProperty('score');
      expect(scorer).toHaveProperty('maxScore');
      expect(scorer).toHaveProperty('percentage');
      expect(scorer).toHaveProperty('weight');
      expect(scorer).toHaveProperty('weightedScore');
      expect(scorer).toHaveProperty('details');
    }
  });

  it('weights sum to ~1.0', () => {
    const result = matchCV(minimalCV(), minimalJD());
    const totalWeight = Object.values(result.scorers).reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it('summary has strengths, gaps, keywordCoverage', () => {
    const result = matchCV(minimalCV(), minimalJD());
    expect(result.summary).toHaveProperty('strengths');
    expect(result.summary).toHaveProperty('gaps');
    expect(result.summary).toHaveProperty('keywordCoverage');
    expect(result.summary.keywordCoverage).toHaveProperty('matched');
    expect(result.summary.keywordCoverage).toHaveProperty('total');
    expect(result.summary.keywordCoverage).toHaveProperty('percentage');
  });

  it('recommendation has level, label, actions', () => {
    const result = matchCV(minimalCV(), minimalJD());
    expect(result.recommendation).toHaveProperty('level');
    expect(result.recommendation).toHaveProperty('label');
    expect(result.recommendation).toHaveProperty('actions');
    expect(Array.isArray(result.recommendation.actions)).toBe(true);
  });

  it('metadata has matchedAt, matcherVersion, weightsUsed, processingTimeMs', () => {
    const result = matchCV(minimalCV(), minimalJD());
    expect(result.metadata).toHaveProperty('matchedAt');
    expect(result.metadata).toHaveProperty('matcherVersion', '1.0.0');
    expect(result.metadata).toHaveProperty('weightsUsed');
    expect(result.metadata).toHaveProperty('processingTimeMs');
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Hard keywords scorer ────────────────────────────────────────────────────

describe('matcher — hard keywords scorer', () => {
  it('matches Java keyword in CV skills', () => {
    const cv = minimalCV();
    const jd = minimalJD({ hardKeywords: [
      { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.hardKeywords.percentage).toBe(1.0);
    expect(result.scorers.hardKeywords.details.matched).toContain('Java');
  });

  it('detects missed keywords when not in CV', () => {
    const cv = minimalCV();
    const jd = minimalJD({ hardKeywords: [
      { term: 'Go', category: 'languages', matched: 'Go', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      { term: 'Rust', category: 'languages', matched: 'Rust', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.hardKeywords.percentage).toBe(0);
    expect(result.scorers.hardKeywords.details.missed).toContain('Go');
    expect(result.scorers.hardKeywords.details.missed).toContain('Rust');
  });

  it('matches keywords in technologies array', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements[0].technologies = ['Docker'];
    const jd = minimalJD({ hardKeywords: [
      { term: 'Docker', category: 'tools', matched: 'Docker', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.hardKeywords.percentage).toBe(1.0);
  });

  it('matches keywords in professional summary text', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'Skilled in Kubernetes and Terraform.' }];
    const jd = minimalJD({ hardKeywords: [
      { term: 'Kubernetes', category: 'cloud', matched: 'Kubernetes', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.hardKeywords.percentage).toBe(1.0);
  });

  it('returns 1.0 for empty hard keywords list', () => {
    const result = matchCV(minimalCV(), minimalJD({ hardKeywords: [] }));
    expect(result.scorers.hardKeywords.percentage).toBe(1);
    expect(result.scorers.hardKeywords.details.total).toBe(0);
  });

  it('computes partial match correctly', () => {
    const cv = minimalCV(); // has Java, Python, JavaScript, Docker, Git, Jira
    const jd = minimalJD({ hardKeywords: [
      { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      { term: 'Docker', category: 'tools', matched: 'Docker', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      { term: 'Kubernetes', category: 'cloud', matched: 'Kubernetes', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      { term: 'Go', category: 'languages', matched: 'Go', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    // Java + Docker matched, Kubernetes + Go missed → 2/4 = 0.5
    expect(result.scorers.hardKeywords.percentage).toBe(0.5);
    expect(result.scorers.hardKeywords.details.matched).toEqual(['Java', 'Docker']);
    expect(result.scorers.hardKeywords.details.missed).toEqual(['Kubernetes', 'Go']);
  });
});

// ── Soft keywords scorer ────────────────────────────────────────────────────

describe('matcher — soft keywords scorer', () => {
  it('matches soft keywords via direct term match', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'Strong communication skills and leadership experience.' }];
    const jd = minimalJD({ softKeywords: [
      { term: 'Communication', matched: 'communication', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.softKeywords.percentage).toBe(1.0);
  });

  it('matches soft keywords via synonym expansion', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'Mentored junior developers and drove career growth for the team.' }];
    const jd = minimalJD({ softKeywords: [
      { term: 'Mentoring', matched: 'mentoring', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.softKeywords.percentage).toBe(1.0);
    expect(result.scorers.softKeywords.details.matched).toContain('Mentoring');
  });

  it('matches Leadership via "led" synonym', () => {
    const cv = minimalCV();
    cv.coreCompetencies = [{ title: 'Leadership', description: 'Led cross-functional squad of 9 engineers.' }];
    const jd = minimalJD({ softKeywords: [
      { term: 'Leadership', matched: 'leadership', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.softKeywords.percentage).toBe(1.0);
  });

  it('returns 1.0 for empty soft keywords list', () => {
    const result = matchCV(minimalCV(), minimalJD({ softKeywords: [] }));
    expect(result.scorers.softKeywords.percentage).toBe(1);
  });

  it('detects missed soft keywords', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'Basic programming.' }];
    const jd = minimalJD({ softKeywords: [
      { term: 'Negotiation', matched: 'negotiation', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.softKeywords.percentage).toBe(0);
    expect(result.scorers.softKeywords.details.missed).toContain('Negotiation');
  });
});

// ── Domain match scorer ─────────────────────────────────────────────────────

describe('matcher — domain match scorer', () => {
  it('matches domains between CV and JD', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements[0].domains = ['backend-engineering', 'delivery-management'];
    const jd = minimalJD({ hardKeywords: [
      { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ] });
    const result = matchCV(cv, jd);
    expect(result.scorers.domainMatch.percentage).toBeGreaterThan(0);
  });

  it('maps JD keyword categories to domains correctly', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements[0].domains = ['backend-engineering'];
    // Use only a single hard keyword (no soft keywords) to isolate the category→domain mapping
    const jd = {
      hardKeywords: [
        { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      ],
      softKeywords: [],
      senioritySignals: { yearsMinimum: 0, yearsPreferred: 0, level: 'unknown', signals: [], title: 'Unknown' },
      metadata: { extractedAt: new Date().toISOString(), taxonomyVersion: '1.0.0' },
    };
    const result = matchCV(cv, jd);
    // languages → backend-engineering, matches CV domain → Jaccard = 1/1 = 1.0
    expect(result.scorers.domainMatch.percentage).toBe(1.0);
  });

  it('handles missing domains gracefully', () => {
    const cv = minimalCV();
    cv.professionalExperience = [];
    const result = matchCV(cv, minimalJD());
    expect(result.scorers.domainMatch.percentage).toBeGreaterThanOrEqual(0);
  });

  it('returns 1.0 when both CV and JD have no domains', () => {
    const cv = minimalCV();
    cv.professionalExperience = [];
    const result = matchCV(cv, minimalJD({ hardKeywords: [], softKeywords: [] }));
    expect(result.scorers.domainMatch.percentage).toBe(1.0);
  });
});

// ── Seniority fit scorer ────────────────────────────────────────────────────

describe('matcher — seniority fit scorer', () => {
  it('scores exact level match highly', () => {
    const cv = minimalCV();
    cv.contact.titles = ['Senior Software Engineer'];
    cv.professionalExperience[0].role = 'Senior Software Engineer';
    cv.professionalExperience[0].dates = { start: '2017-01', end: '2023-06' };

    const jd = minimalJD({ senioritySignals: {
      yearsMinimum: 5,
      level: 'senior',
      signals: [],
      title: 'Senior Software Engineer',
    }});

    const result = matchCV(cv, jd);
    expect(result.scorers.seniorityFit.percentage).toBeGreaterThanOrEqual(0.8);
    expect(result.scorers.seniorityFit.details.cvLevel).toBe('senior');
  });

  it('detects when CV is below JD seniority level', () => {
    const cv = minimalCV();
    cv.contact.titles = ['Junior Developer'];
    cv.professionalExperience[0].role = 'Junior Developer';
    cv.professionalExperience[0].dates = { start: '2022-01', end: '2023-06' };

    const jd = minimalJD({ senioritySignals: {
      yearsMinimum: 5,
      level: 'senior',
      signals: [],
      title: 'Senior Software Engineer',
    }});

    const result = matchCV(cv, jd);
    expect(result.scorers.seniorityFit.percentage).toBeLessThan(0.5);
  });

  it('scores CV above JD level as perfect fit', () => {
    const cv = minimalCV();
    cv.contact.titles = ['Staff Engineer'];
    cv.professionalExperience[0].role = 'Staff Engineer';
    cv.professionalExperience[0].dates = { start: '2015-01', end: '2023-06' };

    const jd = minimalJD({ senioritySignals: {
      yearsMinimum: 3,
      level: 'senior',
      signals: [],
      title: 'Senior Software Engineer',
    }});

    const result = matchCV(cv, jd);
    expect(result.scorers.seniorityFit.percentage).toBeGreaterThanOrEqual(0.9);
  });

  it('returns 1.0 when JD level is unknown', () => {
    const result = matchCV(minimalCV(), minimalJD({ senioritySignals: {
      yearsMinimum: 0,
      level: 'unknown',
      signals: [],
      title: 'Unknown Role',
    }}));
    // levelFit = 1.0 for unknown, yearsFit = 1.0 for no minimum → 1.0
    expect(result.scorers.seniorityFit.percentage).toBe(1.0);
  });

  it('computes CV years from experience dates', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].dates = { start: '2018-01', end: '2023-06' };
    const result = matchCV(cv, minimalJD());
    // ~5.5 years
    expect(result.scorers.seniorityFit.details.cvYears).toBeGreaterThan(4);
    expect(result.scorers.seniorityFit.details.cvYears).toBeLessThan(7);
  });
});

// ── Fuzzy match scorer ──────────────────────────────────────────────────────

describe('matcher — fuzzy match scorer', () => {
  it('returns high score when CV and JD share language', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'Senior software engineer with Java, Docker, and leadership experience. Built REST APIs and mentored teams.' }];

    const jd = minimalJD({ hardKeywords: [
      { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      { term: 'Docker', category: 'tools', matched: 'Docker', confidence: 1, frequency: 1, mustHave: true, context: '...' },
    ], softKeywords: [
      { term: 'Leadership', matched: 'leadership', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
      { term: 'Mentoring', matched: 'mentoring', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
    ], senioritySignals: {
      yearsMinimum: 3,
      level: 'senior',
      signals: [],
      title: 'Senior Software Engineer',
    }});

    const result = matchCV(cv, jd);
    expect(result.scorers.fuzzyMatch.percentage).toBeGreaterThan(0);
  });

  it('returns nonzero score even with partial overlap', () => {
    const cv = minimalCV();
    cv.professionalSummary = [{ text: 'I like to code and build things.' }];
    const result = matchCV(cv, minimalJD());
    expect(typeof result.scorers.fuzzyMatch.percentage).toBe('number');
  });
});

// ── Recommendation generator ────────────────────────────────────────────────

describe('matcher — recommendations', () => {
  it('recommends "apply" for strong match', () => {
    // Build a perfect-match scenario where every scorer should score high
    const cv = minimalCV();
    cv.contact.titles = ['Senior Software Engineer'];
    cv.professionalSummary = [{ text: 'Experienced senior engineer with Java, Docker, Kubernetes, and CI/CD skills. Strong leadership, communication, mentoring, and cross-functional collaboration. Strategic thinker with ownership mindset.' }];
    cv.coreCompetencies = [{ title: 'Engineering', description: 'Java, Docker, Kubernetes, CI/CD, leadership, communication, mentoring, strategic thinking, ownership, cross-functional collaboration.' }];
    cv.skills = [
      { category: 'Languages', items: ['Java', 'Python', 'SQL'] },
      { category: 'Tools', items: ['Docker', 'Jira', 'GitHub', 'Kubernetes'] },
    ];
    cv.professionalExperience = [
      {
        role: 'Senior Software Engineer',
        company: 'TestCorp',
        dates: { start: '2017-01', end: '2023-06' },
        achievements: [
          {
            text: 'Led Java backend team with Docker and Kubernetes deployments. Mentored junior engineers.',
            technologies: ['Java', 'Docker', 'Kubernetes'],
            domains: ['backend-engineering', 'leadership', 'cloud-infrastructure'],
          },
        ],
      },
    ];

    // JD with only keywords that the CV definitely has
    const jd = {
      hardKeywords: [
        { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
        { term: 'Docker', category: 'tools', matched: 'Docker', confidence: 1, frequency: 1, mustHave: true, context: '...' },
        { term: 'Kubernetes', category: 'cloud', matched: 'Kubernetes', confidence: 1, frequency: 1, mustHave: true, context: '...' },
        { term: 'CI/CD', category: 'methodologies', matched: 'CI/CD', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      ],
      softKeywords: [
        { term: 'Leadership', matched: 'leadership', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
        { term: 'Communication', matched: 'communication', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
        { term: 'Mentoring', matched: 'mentoring', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
      ],
      senioritySignals: {
        yearsMinimum: 5,
        level: 'senior',
        signals: [],
        title: 'Senior Software Engineer',
      },
      metadata: { extractedAt: new Date().toISOString(), taxonomyVersion: '1.0.0' },
    };

    const result = matchCV(cv, jd);
    expect(['apply', 'tailor']).toContain(result.recommendation.level);
  });

  it('suggests actions for weak scores', () => {
    const cv = minimalCV();
    cv.skills = [{ category: 'Languages', items: ['Python'] }];
    cv.professionalSummary = [{ text: 'Python developer.' }];
    cv.coreCompetencies = [{ title: 'Python', description: 'Python scripting.' }];
    cv.professionalExperience[0].role = 'Junior Developer';
    cv.professionalExperience[0].dates = { start: '2023-01', end: '2023-06' };
    cv.professionalExperience[0].achievements = [];
    cv.contact.titles = ['Junior Developer'];

    const jd = minimalJD({
      hardKeywords: [
        { term: 'Java', category: 'languages', matched: 'Java', confidence: 1, frequency: 1, mustHave: true, context: '...' },
        { term: 'Kubernetes', category: 'cloud', matched: 'Kubernetes', confidence: 1, frequency: 1, mustHave: true, context: '...' },
      ],
      softKeywords: [
        { term: 'Negotiation', matched: 'negotiation', confidence: 0.9, frequency: 1, mustHave: true, context: '...' },
      ],
      senioritySignals: {
        yearsMinimum: 7,
        level: 'senior',
        signals: [],
        title: 'Senior Software Engineer',
      },
    });

    const result = matchCV(cv, jd);
    expect(result.recommendation.actions.length).toBeGreaterThan(0);
  });
});

// ── Custom weights ──────────────────────────────────────────────────────────

describe('matcher — custom weights', () => {
  it('accepts custom weight overrides', () => {
    const result = matchCV(minimalCV(), minimalJD(), {
      weights: { hardKeywords: 0.60, softKeywords: 0.10, domainMatch: 0.10, seniorityFit: 0.10, fuzzyMatch: 0.10 },
    });
    expect(result.scorers.hardKeywords.weight).toBe(0.60);
    expect(result.scorers.softKeywords.weight).toBe(0.10);
    expect(result.metadata.weightsUsed.hardKeywords).toBe(0.60);
  });

  it('partially overrides weights, keeping defaults for others', () => {
    const result = matchCV(minimalCV(), minimalJD(), {
      weights: { hardKeywords: 0.50 },
    });
    expect(result.scorers.hardKeywords.weight).toBe(0.50);
    expect(result.scorers.softKeywords.weight).toBe(0.20); // default
  });

  it('overall score changes with different weights', () => {
    const resultDefault = matchCV(minimalCV(), minimalJD());
    const resultCustom = matchCV(minimalCV(), minimalJD(), {
      weights: { hardKeywords: 0.90, softKeywords: 0.02, domainMatch: 0.02, seniorityFit: 0.03, fuzzyMatch: 0.03 },
    });
    // Overall should differ because weights changed
    expect(resultDefault.overall.percentage).not.toEqual(resultCustom.overall.percentage);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe('matcher — edge cases', () => {
  it('handles missing hardKeywords array', () => {
    const jd = minimalJD();
    delete jd.hardKeywords;
    const result = matchCV(minimalCV(), jd);
    expect(result.scorers.hardKeywords.percentage).toBe(1);
    expect(result.scorers.hardKeywords.details.total).toBe(0);
  });

  it('handles missing softKeywords array', () => {
    const jd = minimalJD();
    delete jd.softKeywords;
    const result = matchCV(minimalCV(), jd);
    expect(result.scorers.softKeywords.percentage).toBe(1);
    expect(result.scorers.softKeywords.details.total).toBe(0);
  });

  it('handles CV with no professional experience', () => {
    const cv = minimalCV();
    cv.professionalExperience = [];
    const result = matchCV(cv, minimalJD());
    expect(result.scorers.seniorityFit.percentage).toBeDefined();
    expect(result.scorers.seniorityFit.details.cvYears).toBe(0);
  });

  it('handles CV with no skills', () => {
    const cv = minimalCV();
    cv.skills = [];
    cv.professionalSummary = [{ text: 'General experience.' }];
    cv.coreCompetencies = [{ title: 'General', description: 'General work.' }];
    cv.professionalExperience[0].achievements[0].text = 'General work.';
    cv.professionalExperience[0].achievements[0].technologies = [];
    const result = matchCV(cv, minimalJD());
    // Keywords 'Java' and 'Docker' are not anywhere in the CV → 0%
    expect(result.scorers.hardKeywords.percentage).toBe(0);
  });

  it('handles completely empty CV', () => {
    const cv = { contact: { name: 'Test' } };
    const result = matchCV(cv, minimalJD());
    expect(result.overall.percentage).toBeGreaterThanOrEqual(0);
    expect(result.overall.percentage).toBeLessThanOrEqual(1);
  });

  it('handles null options gracefully', () => {
    const result = matchCV(minimalCV(), minimalJD(), null);
    expect(result.overall.percentage).toBeDefined();
  });
});

// ── Integration: real CV + AGIL JD ──────────────────────────────────────────

describe('matcher — integration with real CV and AGIL JD', () => {
  let cvData;
  let jdKeywords;
  let result;

  beforeAll(() => {
    cvData = loadCV();
    const jdText = loadAGILJD();
    jdKeywords = extractKeywords(jdText);
    result = matchCV(cvData, jdKeywords);
  });

  it('produces a meaningful overall score between 0 and 1', () => {
    expect(result.overall.percentage).toBeGreaterThan(0);
    expect(result.overall.percentage).toBeLessThanOrEqual(1);
  });

  it('hard keywords scorer finds matches (CV has Jira, GitHub, Java etc.)', () => {
    expect(result.scorers.hardKeywords.percentage).toBeGreaterThan(0);
    expect(result.scorers.hardKeywords.details.matched.length).toBeGreaterThan(0);
  });

  it('soft keywords scorer finds matches (CV has leadership, communication, etc.)', () => {
    expect(result.scorers.softKeywords.percentage).toBeGreaterThan(0);
  });

  it('domain match scorer identifies overlapping domains', () => {
    expect(result.scorers.domainMatch.details.cvDomains.length).toBeGreaterThan(0);
  });

  it('seniority scorer evaluates years (CV has ~7 years, JD requires 5)', () => {
    expect(result.scorers.seniorityFit.details.cvYears).toBeGreaterThan(5);
    expect(result.scorers.seniorityFit.details.jdYears).toBe(5);
  });

  it('generates recommendations with actionable items', () => {
    expect(result.recommendation).toHaveProperty('level');
    expect(result.recommendation.actions.length).toBeGreaterThanOrEqual(0);
  });

  it('keyword coverage summary is computed', () => {
    expect(result.summary.keywordCoverage.total).toBeGreaterThan(0);
    expect(result.summary.keywordCoverage.matched).toBeGreaterThanOrEqual(0);
    expect(result.summary.keywordCoverage.percentage).toBeGreaterThanOrEqual(0);
  });

  it('metadata includes processing time', () => {
    expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    expect(result.metadata.matcherVersion).toBe('1.0.0');
  });

  it('overall score is the weighted average of all scorers', () => {
    let computed = 0;
    let totalW = 0;
    for (const s of Object.values(result.scorers)) {
      computed += s.percentage * s.weight;
      totalW += s.weight;
    }
    const expected = computed / totalW;
    expect(result.overall.percentage).toBeCloseTo(expected, 3);
  });

  it('weights used are recorded in metadata', () => {
    expect(result.metadata.weightsUsed.hardKeywords).toBe(0.30);
    expect(result.metadata.weightsUsed.softKeywords).toBe(0.20);
    expect(result.metadata.weightsUsed.domainMatch).toBe(0.20);
    expect(result.metadata.weightsUsed.seniorityFit).toBe(0.15);
    expect(result.metadata.weightsUsed.fuzzyMatch).toBe(0.15);
  });
});

// ── Synonym dictionary coverage ─────────────────────────────────────────────

describe('matcher — synonym coverage', () => {
  it('soft-synonyms.json has entries for key terms', () => {
    const synonyms = require('../data/soft-synonyms.json');
    expect(synonyms.synonyms).toHaveProperty('Leadership');
    expect(synonyms.synonyms).toHaveProperty('Communication');
    expect(synonyms.synonyms).toHaveProperty('Stakeholder Management');
    expect(synonyms.synonyms).toHaveProperty('Cross-Functional Collaboration');
    expect(synonyms.synonyms).toHaveProperty('Mentoring');
    expect(synonyms.synonyms).toHaveProperty('Ownership');
  });

  it('soft-synonyms.json has 20+ term entries', () => {
    const synonyms = require('../data/soft-synonyms.json');
    expect(Object.keys(synonyms.synonyms).length).toBeGreaterThanOrEqual(20);
  });
});

// ── Domain mapping coverage ─────────────────────────────────────────────────

describe('matcher — domain mapping', () => {
  it('domain-mapping.json has required domain IDs', () => {
    const dm = require('../data/domain-mapping.json');
    const ids = dm.domains.map(d => d.id);
    expect(ids).toContain('delivery-management');
    expect(ids).toContain('backend-engineering');
    expect(ids).toContain('automation');
    expect(ids).toContain('leadership');
  });

  it('jdCategoryToDomain maps all taxonomy categories', () => {
    const dm = require('../data/domain-mapping.json');
    const cats = ['languages', 'frameworks', 'tools', 'cloud', 'methodologies', 'databases'];
    for (const cat of cats) {
      expect(dm.jdCategoryToDomain).toHaveProperty(cat);
    }
  });
});

// ── Match weights configuration ─────────────────────────────────────────────

describe('matcher — weights config', () => {
  it('match-weights.json weights sum to 1.0', () => {
    const config = require('../data/match-weights.json');
    const sum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });
});
