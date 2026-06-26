/**
 * scorer.test.js — Comprehensive tests for the F7 Scoring Engine.
 *
 * Tests cover:
 *   1. Module shape and exports
 *   2. ATS Parseability sub-scorer (JSON + MD checks)
 *   3. Keyword Alignment sub-scorer (F6 wrapper)
 *   4. Recruiter Appeal sub-scorer (metrics, verbs, length, readability)
 *   5. Weighted aggregator (arithmetic verification)
 *   6. Quick wins generator (passive voice, missing metrics, etc.)
 *   7. Gap analysis (per-category shortfall math)
 *   8. Full scoreCV integration (synthetic + real data)
 *   9. Edge cases (empty CV, zero-match, null options)
 *  10. Output schema validation against ScoreResult interface
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  scoreCV,
  scoreATSParseability,
  scoreKeywordAlignment,
  scoreRecruiterAppeal,
  aggregate,
  generateQuickWins,
  gapAnalysis,
} = require('./scorer');

// ── Fixtures ────────────────────────────────────────────────────────────────

function loadCV() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cv_en.json'), 'utf8'));
}

/**
 * Build a minimal CV fixture for unit tests.
 */
function minimalCV(overrides) {
  return {
    contact: {
      name: 'Test User',
      titles: ['Software Engineer'],
    },
    professionalSummary: [
      { text: 'Built scalable microservices handling 10k RPM using Node.js and Docker.' },
    ],
    coreCompetencies: [
      { title: 'Backend', description: 'Designed and deployed REST APIs.' },
    ],
    skills: [
      { category: 'Languages', items: ['JavaScript', 'Python'] },
      { category: 'Tools', items: ['Docker', 'Git'] },
    ],
    professionalExperience: [
      {
        id: 'exp-001',
        role: 'Software Engineer',
        company: 'TestCorp',
        dates: { start: '2020-01', end: '2023-06' },
        achievements: [
          {
            id: 'ach-001',
            text: 'Built REST APIs handling 10k RPM for payment processing.',
            metrics: [{ type: 'scale', value: '10k RPM' }],
            technologies: ['Node.js', 'Docker'],
            domains: ['backend-engineering'],
          },
          {
            id: 'ach-002',
            text: 'Led migration from monolith to microservices, reducing deployment time by 60%.',
            metrics: [{ type: 'percentage-improvement', value: '60%' }],
            technologies: ['Docker', 'Kubernetes'],
            domains: ['cloud-infrastructure'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/**
 * Build a minimal F6 match result fixture.
 */
function minimalMatchResult(overrides) {
  return {
    overall: { score: 72, maxScore: 100, percentage: 0.72 },
    scorers: {},
    summary: { strengths: [], gaps: [], keywordCoverage: { matched: 5, total: 10, percentage: 0.5 } },
    recommendation: { level: 'tailor', label: 'Moderate match', actions: [] },
    metadata: { matchedAt: new Date().toISOString(), matcherVersion: '1.0.0' },
    ...overrides,
  };
}

// ── Module shape ────────────────────────────────────────────────────────────

describe('scorer — module shape', () => {
  it('exports scoreCV as a function', () => {
    expect(scoreCV).toBeInstanceOf(Function);
  });

  it('exports sub-scorers for unit testing', () => {
    expect(scoreATSParseability).toBeInstanceOf(Function);
    expect(scoreKeywordAlignment).toBeInstanceOf(Function);
    expect(scoreRecruiterAppeal).toBeInstanceOf(Function);
  });

  it('exports aggregate, generateQuickWins, gapAnalysis', () => {
    expect(aggregate).toBeInstanceOf(Function);
    expect(generateQuickWins).toBeInstanceOf(Function);
    expect(gapAnalysis).toBeInstanceOf(Function);
  });

  it('scoreCV returns result with required top-level keys', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    expect(result).toHaveProperty('final');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('quickWins');
    expect(result).toHaveProperty('gapToTarget');
    expect(result).toHaveProperty('metadata');
  });

  it('final is a number between 0 and 100', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    expect(result.final).toBeGreaterThanOrEqual(0);
    expect(result.final).toBeLessThanOrEqual(100);
    expect(Number.isInteger(result.final)).toBe(true);
  });

  it('categories has all 3 required keys with correct structure', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    const keys = ['atsParseability', 'keywordAlignment', 'recruiterAppeal'];
    for (const key of keys) {
      expect(result.categories).toHaveProperty(key);
      const cat = result.categories[key];
      expect(cat).toHaveProperty('score');
      expect(cat).toHaveProperty('maxScore');
      expect(cat).toHaveProperty('percentage');
      expect(cat).toHaveProperty('weight');
      expect(cat).toHaveProperty('weightedScore');
      expect(cat).toHaveProperty('details');
    }
  });

  it('weights sum to 1.0', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    const totalWeight = Object.values(result.categories)
      .reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it('quickWins is an array', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    expect(Array.isArray(result.quickWins)).toBe(true);
  });

  it('gapToTarget has required fields', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    expect(result.gapToTarget).toHaveProperty('target');
    expect(result.gapToTarget).toHaveProperty('current');
    expect(result.gapToTarget).toHaveProperty('gap');
    expect(result.gapToTarget).toHaveProperty('highestGapCategory');
    expect(Array.isArray(result.gapToTarget.perCategory)).toBe(true);
  });

  it('metadata has scoredAt, scorerVersion, weightsUsed, processingTimeMs', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult());
    expect(result.metadata).toHaveProperty('scoredAt');
    expect(result.metadata).toHaveProperty('scorerVersion', '1.0.0');
    expect(result.metadata).toHaveProperty('weightsUsed');
    expect(result.metadata).toHaveProperty('processingTimeMs');
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ── ATS Parseability scorer ─────────────────────────────────────────────────

describe('scorer — ATS parseability', () => {
  it('scores a well-formed CV at or above 80', () => {
    const cv = minimalCV();
    const result = scoreATSParseability(cv);
    expect(result.percentage).toBeGreaterThanOrEqual(0.8);
    expect(result.details.missingSections).toHaveLength(0);
    expect(result.details.dateIssues).toHaveLength(0);
  });

  it('deducts for missing required section (skills)', () => {
    const cv = minimalCV();
    // Remove the skills array entirely — deduction is 15 points (100-15=85)
    delete cv.skills;
    const result = scoreATSParseability(cv);
    expect(result.percentage).toBeLessThanOrEqual(0.85);
    expect(result.details.missingSections).toContain('skills');
  });

  it('deducts for missing professionalExperience', () => {
    const cv = minimalCV();
    delete cv.professionalExperience;
    const result = scoreATSParseability(cv);
    expect(result.percentage).toBeLessThanOrEqual(0.85);
    expect(result.details.missingSections).toContain('professionalExperience');
  });

  it('deducts for bad date format', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].dates.start = 'January 2020';
    const result = scoreATSParseability(cv);
    expect(result.details.dateIssues.length).toBeGreaterThan(0);
    expect(result.details.dateIssues[0].value).toBe('January 2020');
  });

  it('deducts for missing dates.end with bad format', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].dates.end = '2023';
    const result = scoreATSParseability(cv);
    expect(result.details.dateIssues.length).toBeGreaterThan(0);
    expect(result.details.dateIssues[0].expected).toBe('YYYY-MM');
  });

  it('accepts valid YYYY-MM dates', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].dates = { start: '2023-01', end: '2025-11' };
    const result = scoreATSParseability(cv);
    expect(result.details.dateIssues).toHaveLength(0);
  });

  it('handles missing dates field gracefully', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].dates = {};
    const result = scoreATSParseability(cv);
    expect(result.details.dateIssues).toHaveLength(0);
  });

  it('deducts for empty professionalExperience array', () => {
    const cv = minimalCV();
    cv.professionalExperience = [];
    const result = scoreATSParseability(cv);
    expect(result.details.missingSections).toContain('professionalExperience');
  });

  it('deducts for missing IDs on experience entries', () => {
    const cv = minimalCV();
    delete cv.professionalExperience[0].id;
    const result = scoreATSParseability(cv);
    expect(result.details.idIssues.length).toBeGreaterThan(0);
  });

  it('marks cvMdChecked=false when no path provided', () => {
    const cv = minimalCV();
    const result = scoreATSParseability(cv);
    expect(result.details.cvMdChecked).toBe(false);
  });

  it('score never goes below 0', () => {
    const cv = { contact: { name: 'N' } };
    const result = scoreATSParseability(cv);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('score never exceeds 100', () => {
    const cv = minimalCV();
    const result = scoreATSParseability(cv);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ── Keyword Alignment scorer ────────────────────────────────────────────────

describe('scorer — keyword alignment', () => {
  it('wraps F6 overall.score within tolerance', () => {
    const match = minimalMatchResult({ overall: { score: 72, maxScore: 100, percentage: 0.72 } });
    const result = scoreKeywordAlignment(match);
    // With floor 0.95 multiplier, 72 * 0.95 ≈ 68.4, rounds to 68
    // The multiplier depends on score relative to floor/ceiling, so it may vary
    expect(result.score).toBeGreaterThanOrEqual(68);
    expect(result.score).toBeLessThanOrEqual(72);
    expect(result.details.f6Score).toBe(72);
    expect(result.details.multiplierUsed).toBeGreaterThan(0.94);
    expect(result.details.multiplierUsed).toBeLessThanOrEqual(1.0);
  });

  it('returns default for missing F6 data', () => {
    const match = { overall: {} };
    const result = scoreKeywordAlignment(match);
    expect(result.score).toBe(50);
    expect(result.details.f6Score).toBeNull();
    expect(result.details.note).toContain('default');
  });

  it('handles null matchResult', () => {
    const result = scoreKeywordAlignment(null);
    expect(result.score).toBe(50);
    expect(result.details.f6Score).toBeNull();
  });

  it('handles matchResult with numeric overall', () => {
    const match = { overall: 85 };
    const result = scoreKeywordAlignment(match);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.score).toBeLessThanOrEqual(85);
    expect(result.details.f6Score).toBe(85);
  });

  it('maps F6 perfect score (100) correctly', () => {
    const match = minimalMatchResult({ overall: { score: 100, maxScore: 100, percentage: 1.0 } });
    const result = scoreKeywordAlignment(match);
    // 100 * ceiling 1.0 = 100
    expect(result.score).toBe(100);
    expect(result.details.multiplierUsed).toBeCloseTo(1.0, 2);
  });

  it('maps F6 zero score correctly', () => {
    const match = minimalMatchResult({ overall: { score: 0, maxScore: 100, percentage: 0 } });
    const result = scoreKeywordAlignment(match);
    // 0 * floor 0.95 = 0
    expect(result.score).toBe(0);
  });

  it('captures F6 recommendation level in details', () => {
    const match = minimalMatchResult({
      overall: { score: 80, maxScore: 100, percentage: 0.8 },
      recommendation: { level: 'apply', label: 'Strong match', actions: [] },
    });
    const result = scoreKeywordAlignment(match);
    expect(result.details.f6MatchLevel).toBe('apply');
  });
});

// ── Recruiter Appeal scorer ─────────────────────────────────────────────────

describe('scorer — recruiter appeal', () => {
  it('scores bullets with good metrics and action verbs highly', () => {
    const cv = minimalCV();
    // Both bullets start with strong verbs and have metrics
    const result = scoreRecruiterAppeal(cv);
    expect(result.percentage).toBeGreaterThanOrEqual(0.6);
    expect(result.details.metricsRatio).toBe(1.0);
    expect(result.details.actionVerbRatio).toBe(1.0);
  });

  it('detects when bullets lack metrics (ratio ≤ 0.5)', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Worked on backend services.' },
      { id: 'a2', text: 'Helped the team with deployments.' },
      { id: 'a3', text: 'Participated in code reviews.' },
      { id: 'a4', text: 'Assisted with documentation.' },
    ];
    const result = scoreRecruiterAppeal(cv);
    expect(result.details.metricsRatio).toBeLessThan(0.5);
    expect(result.details.metricsSubScore).toBeLessThan(100);
  });

  it('detects passive-voice bullets', () => {
    const cv = minimalCV();
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'The system was architected by the team.' },
      { id: 'a2', text: 'Features were deployed weekly.' },
    ];
    const result = scoreRecruiterAppeal(cv);
    expect(result.details.passiveVoiceCount).toBeGreaterThan(0);
  });

  it('flags bullets exceeding max lines', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      {
        id: 'a1',
        text: 'Line one.\nLine two.\nLine three.\nLine four.',
      },
    ];
    const result = scoreRecruiterAppeal(cv);
    expect(result.details.bulletLengthCompliance).toBe(0);
    const issues = result.details.bulletIssues;
    expect(issues.some(i => i.flags.includes('bullet-too-long'))).toBe(true);
  });

  it('handles CV with no bullets (empty experience)', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience = [];
    const result = scoreRecruiterAppeal(cv);
    expect(result.score).toBe(0);
    expect(result.details.note).toContain('No bullets');
  });

  it('returns score in 0–100 range', () => {
    const result = scoreRecruiterAppeal(minimalCV());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('scores summary bullets in addition to achievements', () => {
    const cv = minimalCV();
    cv.professionalSummary = [
      { text: 'Led 3 cross-functional teams delivering $2M in annual savings.' },
    ];
    const result = scoreRecruiterAppeal(cv);
    expect(result.details.totalBullets).toBeGreaterThanOrEqual(3);
  });

  it('detects English action verbs when lang=en (default)', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Built REST APIs handling 10k RPM.' },
      { id: 'a2', text: 'Led migration from monolith to microservices.' },
    ];
    const result = scoreRecruiterAppeal(cv, 'en');
    expect(result.details.actionVerbRatio).toBe(1.0);
    expect(result.details.actionVerbCount).toBe(2);
  });

  it('detects Spanish action verbs when lang=es', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Construí APIs REST manejando 10k RPM.' },
      { id: 'a2', text: 'Lideré migración de monolito a microservicios.' },
    ];
    const result = scoreRecruiterAppeal(cv, 'es');
    expect(result.details.actionVerbRatio).toBe(1.0);
    expect(result.details.actionVerbCount).toBe(2);
  });

  it('detects more Spanish action verbs in varied bullets', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Construí APIs REST con Node.js.' },
      { id: 'a2', text: 'Diseñé la arquitectura de microservicios.' },
      { id: 'a3', text: 'Modernicé el stack de CI/CD.' },
      { id: 'a4', text: 'Mentoricé a 5 ingenieros junior.' },
      { id: 'a5', text: 'Transformé el proceso de deployment.' },
    ];
    const result = scoreRecruiterAppeal(cv, 'es');
    expect(result.details.actionVerbCount).toBe(5);
    expect(result.details.actionVerbRatio).toBe(1.0);
  });

  it('scores Spanish CV higher with lang=es than with lang=en', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Construí APIs REST manejando 10k RPM.' },
      { id: 'a2', text: 'Lideré migración de monolito a microservicios.' },
      { id: 'a3', text: 'Diseñé la arquitectura de microservicios.' },
      { id: 'a4', text: 'Modernicé el stack de CI/CD.' },
    ];
    const resultEs = scoreRecruiterAppeal(cv, 'es');
    const resultEn = scoreRecruiterAppeal(cv, 'en');
    expect(resultEs.details.actionVerbCount).toBeGreaterThan(resultEn.details.actionVerbCount);
  });

  it('English verb list does NOT match Spanish bullets', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience[0].achievements = [
      { id: 'a1', text: 'Construí APIs REST con Node.js.' },
      { id: 'a2', text: 'Lideré migración de monolito a microservicios.' },
      { id: 'a3', text: 'Diseñé la arquitectura de microservicios.' },
    ];
    const result = scoreRecruiterAppeal(cv, 'en');
    expect(result.details.actionVerbRatio).toBe(0);
    expect(result.details.actionVerbCount).toBe(0);
  });
});

// ── Weighted aggregator ─────────────────────────────────────────────────────

describe('scorer — weighted aggregate', () => {
  it('computes final as weighted sum of category percentages × 100', () => {
    const categories = {
      atsParseability: { percentage: 0.85, weight: 0.40, score: 85, maxScore: 100 },
      keywordAlignment: { percentage: 0.90, weight: 0.30, score: 90, maxScore: 100 },
      recruiterAppeal: { percentage: 0.80, weight: 0.30, score: 80, maxScore: 100 },
    };
    const weights = { atsParseability: 0.40, keywordAlignment: 0.30, recruiterAppeal: 0.30 };
    const final = aggregate(categories, weights);
    // 85×0.40 + 90×0.30 + 80×0.30 = 34 + 27 + 24 = 85
    expect(final).toBe(85);
  });

  it('rounds to integer', () => {
    const categories = {
      atsParseability: { percentage: 0.853, weight: 0.40 },
      keywordAlignment: { percentage: 0.721, weight: 0.30 },
      recruiterAppeal: { percentage: 0.687, weight: 0.30 },
    };
    const weights = { atsParseability: 0.40, keywordAlignment: 0.30, recruiterAppeal: 0.30 };
    const final = aggregate(categories, weights);
    expect(Number.isInteger(final)).toBe(true);
  });

  it('returns 0 for all-zero percentages', () => {
    const categories = {
      atsParseability: { percentage: 0, weight: 0.40 },
      keywordAlignment: { percentage: 0, weight: 0.30 },
      recruiterAppeal: { percentage: 0, weight: 0.30 },
    };
    const weights = { atsParseability: 0.40, keywordAlignment: 0.30, recruiterAppeal: 0.30 };
    expect(aggregate(categories, weights)).toBe(0);
  });

  it('returns 100 for all-perfect percentages', () => {
    const categories = {
      atsParseability: { percentage: 1.0, weight: 0.40 },
      keywordAlignment: { percentage: 1.0, weight: 0.30 },
      recruiterAppeal: { percentage: 1.0, weight: 0.30 },
    };
    const weights = { atsParseability: 0.40, keywordAlignment: 0.30, recruiterAppeal: 0.30 };
    expect(aggregate(categories, weights)).toBe(100);
  });
});

// ── Quick wins generator ────────────────────────────────────────────────────

describe('scorer — quick wins', () => {
  it('generates win for passive voice', () => {
    const categories = {
      recruiterAppeal: {
        details: {
          bulletIssues: [
            {
              location: 'experience[0].achievement[0]',
              flags: ['passive-voice'],
              textPreview: 'The system was architected...',
            },
          ],
          passiveVoiceBullets: [],
        },
      },
      atsParseability: { details: { missingSections: [], dateIssues: [], mdIssues: [], idIssues: [] } },
    };
    const wins = generateQuickWins(categories);
    const pvWin = wins.find(w => w.type === 'passive-voice');
    expect(pvWin).toBeDefined();
    expect(pvWin.location).toBe('experience[0].achievement[0]');
    expect(pvWin.priority).toBe('medium');
  });

  it('generates win for missing metrics', () => {
    const categories = {
      recruiterAppeal: {
        details: {
          bulletIssues: [
            {
              location: 'summary[0]',
              flags: ['missing-metric'],
              textPreview: 'Worked on various projects...',
            },
          ],
          passiveVoiceBullets: [],
        },
      },
      atsParseability: { details: { missingSections: [], dateIssues: [], mdIssues: [], idIssues: [] } },
    };
    const wins = generateQuickWins(categories);
    const mmWin = wins.find(w => w.type === 'missing-metric');
    expect(mmWin).toBeDefined();
    expect(mmWin.priority).toBe('high');
    expect(mmWin.fix).toContain('quantifiable metric');
  });

  it('generates win for missing section', () => {
    const categories = {
      atsParseability: {
        details: {
          missingSections: ['education'],
          dateIssues: [],
          mdIssues: [],
          idIssues: [],
        },
      },
      recruiterAppeal: { details: { bulletIssues: [], passiveVoiceBullets: [] } },
    };
    const wins = generateQuickWins(categories);
    const msWin = wins.find(w => w.type === 'missing-section');
    expect(msWin).toBeDefined();
    expect(msWin.location).toBe('cv.education');
    expect(msWin.priority).toBe('high');
  });

  it('generates win for date format issues', () => {
    const categories = {
      atsParseability: {
        details: {
          missingSections: [],
          dateIssues: [
            { field: 'experience[0].dates.start', value: 'Jan 2020', expected: 'YYYY-MM' },
          ],
          mdIssues: [],
          idIssues: [],
        },
      },
      recruiterAppeal: { details: { bulletIssues: [], passiveVoiceBullets: [] } },
    };
    const wins = generateQuickWins(categories);
    const dfWin = wins.find(w => w.type === 'date-format');
    expect(dfWin).toBeDefined();
    expect(dfWin.priority).toBe('high');
    expect(dfWin.fix).toContain('2023-01');
  });

  it('generates win for bullet too long', () => {
    const categories = {
      recruiterAppeal: {
        details: {
          bulletIssues: [
            {
              location: 'experience[0].achievement[1]',
              flags: ['bullet-too-long'],
              textPreview: 'A very long bullet...',
            },
          ],
          passiveVoiceBullets: [],
        },
      },
      atsParseability: { details: { missingSections: [], dateIssues: [], mdIssues: [], idIssues: [] } },
    };
    const wins = generateQuickWins(categories);
    const blWin = wins.find(w => w.type === 'bullet-length');
    expect(blWin).toBeDefined();
    expect(blWin.fix).toContain('Shorten bullet');
  });

  it('returns empty array for clean results', () => {
    const categories = {
      atsParseability: { details: { missingSections: [], dateIssues: [], mdIssues: [], idIssues: [] } },
      recruiterAppeal: { details: { bulletIssues: [], passiveVoiceBullets: [] } },
    };
    const wins = generateQuickWins(categories);
    expect(wins).toHaveLength(0);
  });
});

// ── Gap analysis ────────────────────────────────────────────────────────────

describe('scorer — gap analysis', () => {
  it('computes gap correctly (spec scenario)', () => {
    const categories = {
      atsParseability: { weight: 0.40, percentage: 0.80, score: 80, maxScore: 100 },
      keywordAlignment: { weight: 0.30, percentage: 0.75, score: 75, maxScore: 100 },
      recruiterAppeal: { weight: 0.30, percentage: 0.70, score: 70, maxScore: 100 },
    };
    const final = Math.round(80 * 0.40 + 75 * 0.30 + 70 * 0.30); // = 76
    const gap = gapAnalysis(final, categories, 90);
    expect(gap.target).toBe(90);
    expect(gap.current).toBe(76);
    expect(gap.gap).toBe(14);
    expect(gap.highestGapCategory).toBe('recruiterAppeal');
  });

  it('returns gap=0 when at or above target', () => {
    const categories = {
      atsParseability: { weight: 0.40, percentage: 1.0 },
      keywordAlignment: { weight: 0.30, percentage: 1.0 },
      recruiterAppeal: { weight: 0.30, percentage: 1.0 },
    };
    const gap = gapAnalysis(100, categories, 90);
    expect(gap.gap).toBe(0);
  });

  it('identifies highest-gap category', () => {
    const categories = {
      atsParseability: { weight: 0.40, percentage: 0.50, score: 50, maxScore: 100 },
      keywordAlignment: { weight: 0.30, percentage: 0.90, score: 90, maxScore: 100 },
      recruiterAppeal: { weight: 0.30, percentage: 0.90, score: 90, maxScore: 100 },
    };
    const final = Math.round(50 * 0.40 + 90 * 0.30 + 90 * 0.30); // = 74
    const gap = gapAnalysis(final, categories, 90);
    expect(gap.highestGapCategory).toBe('atsParseability');
  });

  it('perCategory has expected fields', () => {
    const categories = {
      atsParseability: { weight: 0.40, percentage: 0.70 },
      keywordAlignment: { weight: 0.30, percentage: 0.60 },
      recruiterAppeal: { weight: 0.30, percentage: 0.80 },
    };
    const gap = gapAnalysis(70, categories, 85);
    expect(gap.perCategory).toHaveLength(3);
    for (const pc of gap.perCategory) {
      expect(pc).toHaveProperty('category');
      expect(pc).toHaveProperty('shortfall');
      expect(pc).toHaveProperty('targetContribution');
      expect(pc).toHaveProperty('actualContribution');
      expect(pc).toHaveProperty('percentage');
      expect(pc).toHaveProperty('weight');
    }
  });
});

// ── Integration: full scoreCV ───────────────────────────────────────────────

describe('scorer — full integration with synthetic data', () => {
  it('produces meaningful final score with good CV + moderate match', () => {
    const cv = minimalCV();
    const match = minimalMatchResult({ overall: { score: 72, maxScore: 100, percentage: 0.72 } });
    const result = scoreCV(cv, match);
    expect(result.final).toBeGreaterThan(0);
    expect(result.final).toBeLessThanOrEqual(100);
    expect(result.categories.atsParseability.percentage).toBeGreaterThan(0.5);
    expect(result.categories.keywordAlignment.details.f6Score).toBe(72);
    expect(result.categories.recruiterAppeal.percentage).toBeGreaterThanOrEqual(0);
    expect(result.gapToTarget.gap).toBeGreaterThanOrEqual(0);
  });

  it('custom targetScore overrides default 90', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), { targetScore: 85 });
    expect(result.gapToTarget.target).toBe(85);
    expect(result.metadata.targetScore).toBe(85);
  });

  it('custom cvMdPath is stored but not required', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), { cvMdPath: '/tmp/test-cv.md' });
    expect(result.categories.atsParseability.details.cvMdChecked).toBe(true);
  });

  it('handles null options', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), null);
    expect(result.final).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

// ── Integration: real CV data ───────────────────────────────────────────────

describe('scorer — integration with real CV data', () => {
  let cvData;
  let matchResult;

  beforeAll(() => {
    cvData = loadCV();
    matchResult = minimalMatchResult({ overall: { score: 72, maxScore: 100, percentage: 0.72 } });
  });

  it('scores real CV without crashing', () => {
    const result = scoreCV(cvData, matchResult);
    expect(result.final).toBeGreaterThanOrEqual(0);
    expect(result.final).toBeLessThanOrEqual(100);
  });

  it('real CV passes ATS section checks', () => {
    const result = scoreATSParseability(cvData);
    expect(result.details.missingSections).toHaveLength(0);
    expect(result.percentage).toBeGreaterThanOrEqual(0.8);
  });

  it('real CV has valid date formats', () => {
    const result = scoreATSParseability(cvData);
    expect(result.details.dateIssues).toHaveLength(0);
  });

  it('real CV recruiter score is computed', () => {
    const result = scoreRecruiterAppeal(cvData);
    expect(result.details.totalBullets).toBeGreaterThan(0);
    expect(result.details.metricsRatio).toBeGreaterThan(0);
  });

  it('full scoreCV for real CV produces valid output shape', () => {
    const result = scoreCV(cvData, matchResult);

    // Validate categories
    expect(result.categories.atsParseability.percentage).toBeGreaterThan(0);
    expect(result.categories.keywordAlignment.percentage).toBeGreaterThan(0);
    expect(result.categories.recruiterAppeal.percentage).toBeGreaterThanOrEqual(0);

    // Validate gap
    expect(result.gapToTarget.perCategory).toHaveLength(3);
    expect(result.gapToTarget.gap).toBeGreaterThanOrEqual(0);

    // Validate quickWins
    expect(Array.isArray(result.quickWins)).toBe(true);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe('scorer — edge cases', () => {
  it('handles completely empty CV', () => {
    const cv = { contact: { name: 'Test' } };
    const result = scoreCV(cv, minimalMatchResult());
    expect(result.final).toBeGreaterThanOrEqual(0);
    expect(result.final).toBeLessThanOrEqual(100);
  });

  it('handles CV with no professional experience', () => {
    const cv = minimalCV();
    cv.professionalSummary = [];
    cv.professionalExperience = [];
    const result = scoreCV(cv, minimalMatchResult());
    expect(result.final).toBeDefined();
    expect(result.categories.recruiterAppeal.score).toBe(0);
  });

  it('handles zero-match F6 output', () => {
    const match = minimalMatchResult({ overall: { score: 0, maxScore: 100, percentage: 0 } });
    const result = scoreCV(minimalCV(), match);
    expect(result.final).toBeGreaterThanOrEqual(0);
    expect(result.categories.keywordAlignment.score).toBe(0);
  });

  it('handles targetScore=0', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), { targetScore: 0 });
    expect(result.gapToTarget.target).toBe(0);
    expect(result.gapToTarget.gap).toBe(0);
  });

  it('handles targetScore=100', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), { targetScore: 100 });
    expect(result.gapToTarget.target).toBe(100);
    expect(result.gapToTarget.gap).toBeGreaterThanOrEqual(0);
  });

  it('throws for missing cvData', () => {
    expect(() => scoreCV(null, minimalMatchResult())).toThrow('cvData');
  });

  it('throws for missing matchResult', () => {
    expect(() => scoreCV(minimalCV(), null)).toThrow('matchResult');
  });

  it('handles missing optional cvMdPath gracefully (no error)', () => {
    const result = scoreCV(minimalCV(), minimalMatchResult(), { cvMdPath: '/nonexistent/file.md' });
    expect(result.final).toBeDefined();
    // Should still have completed even though MD file doesn't exist
  });

  it('handles matchResult with no recommendation property', () => {
    const match = { overall: { score: 65, maxScore: 100, percentage: 0.65 } };
    const result = scoreKeywordAlignment(match);
    expect(result.details.f6MatchLevel).toBeNull();
  });
});

// ── Score >= 0 and <= 100 invariant ────────────────────────────────────────

describe('scorer — invariant: scores in [0, 100]', () => {
  const testCases = [
    { name: 'minimal CV + moderate F6', cv: minimalCV(), match: minimalMatchResult() },
    { name: 'empty CV', cv: { contact: { name: 'X' } }, match: minimalMatchResult() },
    { name: 'CV with no bullets', cv: (() => { const c = minimalCV(); c.professionalSummary = []; c.professionalExperience = []; return c; })(), match: minimalMatchResult() },
    { name: 'zero F6', cv: minimalCV(), match: minimalMatchResult({ overall: { score: 0, maxScore: 100, percentage: 0 } }) },
    { name: 'perfect F6', cv: minimalCV(), match: minimalMatchResult({ overall: { score: 100, maxScore: 100, percentage: 1.0 } }) },
  ];

  for (const tc of testCases) {
    it(`invariant holds for: ${tc.name}`, () => {
      const result = scoreCV(tc.cv, tc.match);
      expect(result.final).toBeGreaterThanOrEqual(0);
      expect(result.final).toBeLessThanOrEqual(100);

      for (const cat of Object.values(result.categories)) {
        expect(cat.score).toBeGreaterThanOrEqual(0);
        expect(cat.score).toBeLessThanOrEqual(cat.maxScore);
        expect(cat.percentage).toBeGreaterThanOrEqual(0);
        expect(cat.percentage).toBeLessThanOrEqual(1);
      }
    });
  }
});
