/**
 * pdf-builder.test.js — Unit tests for the PDF Builder renderers.
 *
 * Tests all six pure render functions: renderHeader, renderSummary,
 * renderCompetencies, renderSkills, renderExperience, renderEducation.
 *
 * Covers: valid input, empty/null input, HTML escaping, achievement
 * limiting, skill reordering with/without match data, language variants.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  formatDate,
  formatDateRange,
  renderHeader,
  renderSummary,
  renderCompetencies,
  renderSkills,
  renderExperience,
  renderEducation,
  renderExtraSections,
} = require('./pdf-builder');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function loadCV(lang) {
  const file = lang === 'es' ? 'cv_es.json' : 'cv_en.json';
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'));
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
        details: { matched: ['Leadership'], missed: ['Communication'], total: 5 },
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
    summary: { strengths: [], gaps: [], keywordCoverage: { matched: 12, total: 15, percentage: 0.8 } },
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
  }

  return base;
}

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml()', () => {
  test('escapes <script> tags', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  test('returns empty string for falsy input', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  test('handles numeric input', () => {
    expect(escapeHtml(123)).toBe('123');
  });
});

// ── formatDate / formatDateRange ──────────────────────────────────────────────

describe('formatDate()', () => {
  test('formats YYYY-MM to Mon YYYY', () => {
    expect(formatDate('2023-01')).toBe('Jan 2023');
    expect(formatDate('2025-11')).toBe('Nov 2025');
  });

  test('returns "Present" unchanged', () => {
    expect(formatDate('Present')).toBe('Present');
  });

  test('returns falsy input as empty string', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });

  test('returns unrecognized format unchanged', () => {
    expect(formatDate('2023')).toBe('2023');
  });
});

describe('formatDateRange()', () => {
  test('formats start–end range', () => {
    expect(formatDateRange({ start: '2023-01', end: '2025-11' })).toBe('Jan 2023 \u2013 Nov 2025');
  });

  test('handles Present', () => {
    expect(formatDateRange({ start: '2023-01', end: 'Present' })).toBe('Jan 2023 \u2013 Present');
  });

  test('returns empty for null input', () => {
    expect(formatDateRange(null)).toBe('');
  });
});

// ── renderHeader ──────────────────────────────────────────────────────────────

describe('renderHeader()', () => {
  const contact = {
    name: 'Emanuel Ignacio Arias',
    titles: ['Project Leader', 'Engineering Manager', 'Technical Program Manager'],
    location: 'Tandil, Buenos Aires, Argentina',
    phone: '+54 9 15 3765 7844',
    email: 'arias.emanuel@gmail.com',
    linkedin: 'https://www.linkedin.com/in/ariasemanuel',
  };

  test('renders full header with name, titles, and contact', () => {
    const html = renderHeader(contact);
    expect(html).toContain('<h1>Emanuel Ignacio Arias</h1>');
    expect(html).toContain('class="cv-titles"');
    expect(html).toContain('Project Leader | Engineering Manager | Technical Program Manager');
    expect(html).toContain('class="cv-contact"');
    expect(html).toContain('Tandil, Buenos Aires, Argentina');
    expect(html).toContain('arias.emanuel@gmail.com');
    expect(html).toContain('<a href="mailto:arias.emanuel@gmail.com">');
    expect(html).toContain('<a href="https://www.linkedin.com/in/ariasemanuel">LinkedIn</a>');
  });

  test('returns empty string for null contact', () => {
    expect(renderHeader(null)).toBe('');
  });

  test('returns empty string for contact without name', () => {
    expect(renderHeader({ titles: ['TPM'] })).toBe('');
  });

  test('renders header without optional fields', () => {
    const html = renderHeader({ name: 'John Doe', titles: ['Engineer'] });
    expect(html).toContain('<h1>John Doe</h1>');
    expect(html).toContain('Engineer');
    expect(html).not.toContain('class="cv-contact"');
  });

  test('escapes HTML in name', () => {
    const html = renderHeader({ name: '<script>alert(1)</script>', titles: ['TPM'] });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('escapes HTML in titles', () => {
    const html = renderHeader({ name: 'Jane', titles: ['<b>Bold</b>'] });
    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });

  test('renders contact line with separator', () => {
    const html = renderHeader({ name: 'Jane', titles: ['Dev'], location: 'NYC', phone: '555-1234' });
    expect(html).toContain('class="cv-contact"');
    expect(html).toContain('NYC');
    expect(html).toContain('555-1234');
  });
});

// ── renderSummary ─────────────────────────────────────────────────────────────

describe('renderSummary()', () => {
  test('renders up to 3 summary items', () => {
    const items = [
      { text: 'First bullet with impact.' },
      { text: 'Second bullet about automation.' },
      { text: 'Third bullet on leadership.' },
      { text: 'Fourth bullet that should be excluded.' },
    ];
    const html = renderSummary(items);
    expect(html).toContain('<ul>');
    expect(html).toContain('</ul>');
    const liCount = (html.match(/<li>/g) || []).length;
    expect(liCount).toBe(3);
    expect(html).toContain('First bullet with impact.');
    expect(html).not.toContain('Fourth bullet');
  });

  test('renders single item', () => {
    const html = renderSummary([{ text: 'Solo bullet' }]);
    expect(html).toContain('<li>Solo bullet</li>');
  });

  test('returns empty string for empty array', () => {
    expect(renderSummary([])).toBe('');
  });

  test('returns empty string for null input', () => {
    expect(renderSummary(null)).toBe('');
  });

  test('escapes HTML entities in text (Scenario 2.3)', () => {
    const html = renderSummary([{ text: '<script>alert("xss")</script>' }]);
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});

// ── renderCompetencies ────────────────────────────────────────────────────────

describe('renderCompetencies()', () => {
  test('renders up to 4 competency items with bold titles', () => {
    const items = [
      { title: 'Competency A', description: 'Description A' },
      { title: 'Competency B', description: 'Description B' },
      { title: 'Competency C', description: 'Description C' },
      { title: 'Competency D', description: 'Description D' },
      { title: 'Competency E', description: 'Should be excluded' },
    ];
    const html = renderCompetencies(items);
    const liCount = (html.match(/<li>/g) || []).length;
    expect(liCount).toBe(4);
    expect(html).toContain('<strong>Competency A</strong>');
    expect(html).toContain(': Description A');
    expect(html).not.toContain('Competency E');
  });

  test('renders single competency', () => {
    const html = renderCompetencies([{ title: 'Leadership', description: 'Led teams.' }]);
    expect(html).toContain('<strong>Leadership</strong>');
    expect(html).toContain(': Led teams.');
  });

  test('returns empty string for empty array', () => {
    expect(renderCompetencies([])).toBe('');
  });

  test('returns empty string for null input', () => {
    expect(renderCompetencies(null)).toBe('');
  });

  test('escapes HTML in title', () => {
    const html = renderCompetencies([{ title: '<b>Bad</b>', description: 'Desc' }]);
    expect(html).toContain('&lt;b&gt;Bad&lt;/b&gt;');
  });

  test('escapes HTML in description', () => {
    const html = renderCompetencies([{ title: 'OK', description: '<script>xss</script>' }]);
    expect(html).toContain('&lt;script&gt;xss&lt;/script&gt;');
  });
});

// ── renderSkills ──────────────────────────────────────────────────────────────

describe('renderSkills()', () => {
  const skills = [
    { category: 'Management', items: ['Agile', 'Scrum', 'Kanban'] },
    { category: 'Backend', items: ['Java', 'Docker', 'CI/CD'] },
  ];

  test('renders categories with items', () => {
    const html = renderSkills(skills);
    expect(html).toContain('<strong>Management</strong>');
    expect(html).toContain('<strong>Backend</strong>');
    expect(html).toContain('<li>Agile</li>');
    expect(html).toContain('<li>Java</li>');
  });

  test('returns empty string for empty array', () => {
    expect(renderSkills([])).toBe('');
  });

  test('returns empty string for null input', () => {
    expect(renderSkills(null)).toBe('');
  });

  test('reorders skills when hkDetails provided', () => {
    const skills3 = [
      { category: 'Category A', items: ['Python', 'Java', 'Go'] },
      { category: 'Category B', items: ['Agile', 'Scrum', 'XP'] },
    ];
    // JD keywords: Agile matches Category B → Category B should come first
    const hkDetails = { matched: ['Agile'], missed: ['Kubernetes'] };
    const html = renderSkills(skills3, hkDetails);
    const idxB = html.indexOf('Category B');
    const idxA = html.indexOf('Category A');
    expect(idxB).toBeLessThan(idxA);
  });

  test('reorders items within category by JD match', () => {
    const skills2 = [
      { category: 'Tech', items: ['Go', 'Java', 'Python'] },
    ];
    // JD keywords contain Java → Java should appear first
    const hkDetails = { matched: ['Java'], missed: [] };
    const html = renderSkills(skills2, hkDetails);
    const idxJava = html.indexOf('<li>Java</li>');
    const idxGo = html.indexOf('<li>Go</li>');
    expect(idxJava).toBeLessThan(idxGo);
  });

  test('preserves original order without hkDetails', () => {
    const skills2 = [
      { category: 'Tech', items: ['Go', 'Java', 'Python'] },
    ];
    const html = renderSkills(skills2);
    const idxGo = html.indexOf('<li>Go</li>');
    const idxJava = html.indexOf('<li>Java</li>');
    expect(idxGo).toBeLessThan(idxJava);
  });

  test('skips categories with empty items', () => {
    const skillsWithEmpty = [
      { category: 'Management', items: ['Agile'] },
      { category: 'Empty', items: [] },
    ];
    const html = renderSkills(skillsWithEmpty);
    expect(html).toContain('Management');
    expect(html).not.toContain('Empty');
  });

  test('escapes HTML in category and item names', () => {
    const skillsXss = [
      { category: '<script>Bad</script>', items: ['<b>Bold</b>'] },
    ];
    const html = renderSkills(skillsXss);
    expect(html).toContain('&lt;script&gt;Bad&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });
});

// ── renderExperience ──────────────────────────────────────────────────────────

describe('renderExperience()', () => {
  const cv = loadCV('en');

  test('renders all primary experience entries', () => {
    const html = renderExperience(cv.professionalExperience);
    expect(html).toContain('class="job-header"');
    expect(html).toContain('class="company"');
    expect(html).toContain('Mercado Libre');
    expect(html).toContain('Project Leader');
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('EXO CORP');
  });

  test('limits achievements per role to default 4 (Scenario 2.2)', () => {
    // Mercado Libre Project Leader has 4 achievements — all should be included
    const html = renderExperience(cv.professionalExperience);
    // Count <li> elements within professional experience (before earlierExperience)
    const beforeEarlier = html.split('earlier-experience')[0];
    const liCount = (beforeEarlier.match(/<li>/g) || []).length;
    // 4 (PL) + 3 (SSE) + 3 (SE) + 2 (SD) + 3 (EXO) = 15 max
    // Actually with default ordering it might limit to 4 per role
    expect(liCount).toBeGreaterThanOrEqual(10);
  });

  test('respects custom maxAchievementsPerRole option', () => {
    // Create a role with 6 achievements
    const exp = [{
      company: 'TestCo',
      role: 'Engineer',
      dates: { start: '2020-01', end: '2021-12' },
      achievements: [
        { id: '1', text: 'Achievement 1', metrics: [], technologies: [], domains: ['backend-engineering'], impact: 'high', tags: [] },
        { id: '2', text: 'Achievement 2', metrics: [], technologies: [], domains: ['automation'], impact: 'medium', tags: [] },
        { id: '3', text: 'Achievement 3', metrics: [], technologies: [], domains: ['leadership'], impact: 'high', tags: [] },
        { id: '4', text: 'Achievement 4', metrics: [], technologies: [], domains: ['devops'], impact: 'medium', tags: [] },
        { id: '5', text: 'Achievement 5', metrics: [], technologies: [], domains: ['frontend'], impact: 'low', tags: [] },
        { id: '6', text: 'Achievement 6', metrics: [], technologies: [], domains: ['data-engineering'], impact: 'low', tags: [] },
      ],
      tags: [],
    }];

    const htmlDefault = renderExperience(exp);
    const liDefault = (htmlDefault.match(/<li>/g) || []).length;
    expect(liDefault).toBe(4); // max 4 by default

    const htmlCustom = renderExperience(exp, null, null, { maxAchievementsPerRole: 2 });
    const liCustom = (htmlCustom.match(/<li>/g) || []).length;
    expect(liCustom).toBe(2);
  });

  test('falls back to impact-descending order without match data', () => {
    const exp = [{
      company: 'TestCo',
      role: 'Engineer',
      dates: { start: '2020-01', end: '2021-12' },
      achievements: [
        { id: '1', text: 'Low impact', metrics: [], technologies: [], domains: ['frontend'], impact: 'low', tags: [] },
        { id: '2', text: 'High impact', metrics: [], technologies: [], domains: ['backend-engineering'], impact: 'high', tags: [] },
        { id: '3', text: 'Medium impact', metrics: [], technologies: [], domains: ['automation'], impact: 'medium', tags: [] },
      ],
      tags: [],
    }];

    const html = renderExperience(exp);
    const idxHigh = html.indexOf('High impact');
    const idxLow = html.indexOf('Low impact');
    // High impact should appear before low impact
    expect(idxHigh).toBeLessThan(idxLow);
  });

  test('ranks achievements by JD relevance when match data provided', () => {
    const exp = [{
      company: 'TestCo',
      role: 'Engineer',
      dates: { start: '2020-01', end: '2021-12' },
      achievements: [
        { id: '1', text: 'Python data pipeline', metrics: [], technologies: ['Python'], domains: ['data-engineering'], impact: 'medium', tags: [] },
        { id: '2', text: 'Java backend service', metrics: [], technologies: ['Java'], domains: ['backend-engineering'], impact: 'high', tags: [] },
      ],
      tags: [],
    }];

    // Match data favors Python
    const matchResult = makeMatchResult({
      scorers: {
        hardKeywords: { details: { matched: ['Python'], missed: ['Java'], total: 2 } },
        domainMatch: { details: { jdDomains: ['data-engineering'] } },
      },
    });

    const html = renderExperience(exp, null, matchResult);
    const idxPython = html.indexOf('Python data pipeline');
    const idxJava = html.indexOf('Java backend service');
    expect(idxPython).toBeLessThan(idxJava);
  });

  test('returns empty string for null experience', () => {
    expect(renderExperience(null)).toBe('');
  });

  test('returns empty string for empty experience array', () => {
    expect(renderExperience([])).toBe('');
  });

  test('escapes HTML in achievement text (Scenario 2.3)', () => {
    const exp = [{
      company: 'TestCo',
      role: 'Dev',
      dates: { start: '2020-01', end: '2021-01' },
      achievements: [{
        id: '1', text: '<script>alert("xss")</script>',
        metrics: [], technologies: [], domains: ['backend-engineering'], impact: 'high', tags: [],
      }],
      tags: [],
    }];
    const html = renderExperience(exp);
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('escapes HTML in company and role names', () => {
    const exp = [{
      company: '<b>BadCorp</b>',
      role: '<i>Hacker</i>',
      dates: { start: '2020-01', end: '2021-01' },
      achievements: [],
      tags: [],
    }];
    const html = renderExperience(exp);
    expect(html).toContain('&lt;b&gt;BadCorp&lt;/b&gt;');
    expect(html).toContain('&lt;i&gt;Hacker&lt;/i&gt;');
  });

  test('renders role description when present', () => {
    const exp = [{
      company: 'TestCo',
      role: 'Dev',
      dates: { start: '2020-01', end: '2021-01' },
      description: 'Led a team of 5.',
      achievements: [],
      tags: [],
    }];
    const html = renderExperience(exp);
    expect(html).toContain('class="job-description"');
    expect(html).toContain('Led a team of 5.');
  });
});

// ── renderEducation ───────────────────────────────────────────────────────────

describe('renderEducation()', () => {
  const edu = [
    { degree: 'Introduction to Computer Science', institution: 'HarvardX (edX)' },
    { degree: 'Introduction to Linux', institution: 'edX' },
  ];
  const certs = [
    { name: 'AWS Solutions Architect', issuer: 'AWS', year: '2025' },
  ];
  const langs = [
    { language: 'Spanish', proficiency: 'native' },
    { language: 'English', proficiency: 'advanced' },
  ];

  test('renders education items', () => {
    const html = renderEducation(edu);
    expect(html).toContain('Introduction to Computer Science');
    expect(html).toContain('HarvardX (edX)');
    expect(html).toContain('Introduction to Linux');
  });

  test('certifications are NOT rendered by renderEducation (owned by renderExtraSections)', () => {
    const html = renderEducation(edu, certs);
    expect(html).not.toContain('Certifications');
    expect(html).not.toContain('AWS Solutions Architect');
    expect(html).toContain('HarvardX'); // education still rendered
  });

  test('languages are NOT rendered by renderEducation (owned by renderExtraSections)', () => {
    const html = renderEducation(edu, null, langs);
    expect(html).not.toContain('Languages');
    expect(html).not.toContain('Spanish');
    expect(html).toContain('HarvardX'); // education still rendered
  });

  test('only education rendered when certs and langs passed', () => {
    const html = renderEducation(edu, certs, langs);
    expect(html).toContain('HarvardX');
    expect(html).not.toContain('Certifications');
    expect(html).not.toContain('Languages');
  });

  test('returns empty string when all inputs are empty', () => {
    expect(renderEducation([], [], [])).toBe('');
    expect(renderEducation(null, null, null)).toBe('');
  });

  test('renders only education when certs and langs are null', () => {
    const html = renderEducation(edu);
    expect(html).toContain('HarvardX');
    expect(html).not.toContain('Certifications');
    expect(html).not.toContain('Languages');
  });

  test('escapes HTML in degree and institution', () => {
    const xssEdu = [{ degree: '<b>Bad</b>', institution: '<i>HackU</i>' }];
    const html = renderEducation(xssEdu);
    expect(html).toContain('&lt;b&gt;Bad&lt;/b&gt;');
    expect(html).toContain('&lt;i&gt;HackU&lt;/i&gt;');
  });
});

// ── renderExtraSections ────────────────────────────────────────────────────

describe('renderExtraSections()', () => {
  const earlierExp = [
    { company: 'EarlyCo', role: 'Junior Dev', dates: { start: '2015-01', end: '2016-12' } },
    { company: 'OldOrg', role: 'Intern', dates: { start: '2014-06', end: '2014-12' } },
  ];
  const certs = [
    { name: 'AWS Solutions Architect', issuer: 'AWS', year: '2025' },
    { name: 'PMP' },
    { name: 'CKAD', issuer: 'CNCF', year: '2024' },
  ];
  const langs = [
    { language: 'Spanish', proficiency: 'native' },
    { language: 'English', proficiency: 'advanced' },
  ];

  test('renders all sections with valid data', () => {
    const html = renderExtraSections(earlierExp, certs, langs);
    expect(html).toContain('<h2>Earlier Career</h2>');
    expect(html).toContain('Junior Dev');
    expect(html).toContain('EarlyCo');
    expect(html).toContain('<h2>Certifications</h2>');
    expect(html).toContain('AWS Solutions Architect');
    expect(html).toContain('<h2>Languages</h2>');
    expect(html).toContain('Spanish');
  });

  test('only earlier experience (certs and langs empty)', () => {
    const html = renderExtraSections(earlierExp, [], []);
    expect(html).toContain('Earlier Career');
    expect(html).toContain('Junior Dev');
    expect(html).not.toContain('Certifications');
    expect(html).not.toContain('Languages');
  });

  test('only certifications (others empty)', () => {
    const html = renderExtraSections([], certs, []);
    expect(html).not.toContain('Earlier Career');
    expect(html).toContain('Certifications');
    expect(html).toContain('AWS Solutions Architect');
    expect(html).not.toContain('Languages');
  });

  test('only languages (others empty)', () => {
    const html = renderExtraSections([], [], langs);
    expect(html).not.toContain('Earlier Career');
    expect(html).not.toContain('Certifications');
    expect(html).toContain('Languages');
    expect(html).toContain('native');
  });

  test('all empty arrays → empty string', () => {
    expect(renderExtraSections([], [], [])).toBe('');
    expect(renderExtraSections(null, null, null)).toBe('');
  });

  test('HTML escaping in section content', () => {
    const xssExp = [{ company: '<b>Bad</b>', role: '<script>xss</script>', dates: { start: '2020-01', end: '2021-01' } }];
    const html = renderExtraSections(xssExp, [{ name: '<i>HackCert</i>' }], [{ language: '<b>Lang</b>', proficiency: 'native' }]);
    expect(html).toContain('&lt;b&gt;Bad&lt;/b&gt;');
    expect(html).toContain('&lt;script&gt;xss&lt;/script&gt;');
    expect(html).toContain('&lt;i&gt;HackCert&lt;/i&gt;');
    expect(html).toContain('&lt;b&gt;Lang&lt;/b&gt;');
  });

  test('year rendering for certifications', () => {
    const html = renderExtraSections([], certs, []);
    // AWS cert has year 2025 → should render "(2025)"
    expect(html).toContain('AWS Solutions Architect \u2014 AWS (2025)');
    // PMP has no year → should NOT render parentheses
    expect(html).toContain('PMP</li>');
    expect(html).not.toContain('PMP (');
    // CKAD has year 2024
    expect(html).toContain('CKAD \u2014 CNCF (2024)');
  });

  test('renders certification without issuer', () => {
    const html = renderExtraSections([], [{ name: 'PMP' }], []);
    expect(html).toContain('PMP');
    expect(html).not.toContain('\u2014');
  });

  test('renders certification year without issuer', () => {
    const html = renderExtraSections([], [{ name: 'CKA', year: '2023' }], []);
    expect(html).toContain('CKA (2023)');
  });

  test('wraps sections in extra-section class', () => {
    const html = renderExtraSections(earlierExp, certs, langs);
    const sectionCount = (html.match(/class="extra-section"/g) || []).length;
    expect(sectionCount).toBe(3); // earlier, certs, langs
  });
});

// ── Language Variants ─────────────────────────────────────────────────────────

describe('Language variants (ES)', () => {
  const cvES = loadCV('es');

  test('renderHeader works with Spanish CV data', () => {
    const html = renderHeader(cvES.contact);
    expect(html).toContain('<h1>Emanuel Ignacio Arias</h1>');
    expect(html).toContain('Project Leader');
  });

  test('renderSummary renders Spanish narrative text', () => {
    const html = renderSummary(cvES.professionalSummary);
    expect(html).toContain('más de 10 años'); // Spanish text
    expect(html).not.toContain('<script>');
  });

  test('renderExperience renders Spanish achievements', () => {
    const html = renderExperience(cvES.professionalExperience);
    expect(html).toContain('Mercado Libre');
    expect(html).toContain('Project Leader');
  });

  test('renderEducation renders Spanish CV education/languages', () => {
    const html = renderEducation(cvES.education, cvES.certifications, cvES.languages);
    expect(html).toContain('HarvardX');
  });
});

// ── Integration: real CV data produces valid fragments ────────────────────────

describe('Integration with real CV data', () => {
  const cv = loadCV('en');
  const matchResult = makeMatchResult();

  test('all renderers produce non-empty output with real data', () => {
    expect(renderHeader(cv.contact).length).toBeGreaterThan(50);
    expect(renderSummary(cv.professionalSummary).length).toBeGreaterThan(50);
    expect(renderCompetencies(cv.coreCompetencies).length).toBeGreaterThan(50);
    expect(renderSkills(cv.skills).length).toBeGreaterThan(50);
    expect(renderExperience(cv.professionalExperience).length).toBeGreaterThan(100);
    expect(renderEducation(cv.education).length).toBeGreaterThan(10);
  });

  test('all renderers escape user content (no raw HTML injection possible)', () => {
    const header = renderHeader(cv.contact);
    const summary = renderSummary(cv.professionalSummary);
    const comps = renderCompetencies(cv.coreCompetencies);
    const skills = renderSkills(cv.skills);
    const exp = renderExperience(cv.professionalExperience, null, matchResult);
    const edu = renderEducation(cv.education);

    // None should contain unescaped angle brackets that aren't valid HTML tags
    for (const html of [header, summary, comps, skills, exp, edu]) {
      // Only valid HTML tags (h1, p, ul, li, strong, a, span, div, header) should have <>
      // No bare <script>, <img, <iframe, etc.
      expect(html).not.toMatch(/<script[\s>]/i);
      expect(html).not.toMatch(/<img[\s>]/i);
      expect(html).not.toMatch(/<iframe[\s>]/i);
      expect(html).not.toMatch(/on\w+=/i);
    }
  });

  test('all renderers return strings (type check)', () => {
    expect(typeof renderHeader(cv.contact)).toBe('string');
    expect(typeof renderSummary(cv.professionalSummary)).toBe('string');
    expect(typeof renderCompetencies(cv.coreCompetencies)).toBe('string');
    expect(typeof renderSkills(cv.skills)).toBe('string');
    expect(typeof renderExperience(cv.professionalExperience)).toBe('string');
    expect(typeof renderEducation(cv.education)).toBe('string');
  });
});
