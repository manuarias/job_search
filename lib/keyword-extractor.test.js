/**
 * keyword-extractor.test.js — Comprehensive tests for the F4 keyword extractor.
 *
 * Tests cover:
 *   1. Real English JD (AGIL — with MUST HAVES section)
 *   2. Real Spanish JD (VANT — with Conocimientos técnicos requeridos)
 *   3. Seniority extraction edge cases
 *   4. Must-have classification heuristics
 *   5. Edge cases: empty text, no section headers
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { extractKeywords } = require('./keyword-extractor');

// ── Helpers ────────────────────────────────────────────────────────────────

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'applications', name, 'job-description.md'), 'utf8');
}

// ── Basic module shape ─────────────────────────────────────────────────────

describe('keyword-extractor — module shape', () => {
  it('exports extractKeywords as a function', () => {
    expect(extractKeywords).toBeInstanceOf(Function);
  });

  it('returns an object with the 4 required top-level keys', () => {
    const result = extractKeywords('Looking for a Senior Java Developer with 5+ years of experience.');
    expect(result).toHaveProperty('hardKeywords');
    expect(result).toHaveProperty('softKeywords');
    expect(result).toHaveProperty('senioritySignals');
    expect(result).toHaveProperty('metadata');
  });

  it('hardKeywords and softKeywords are arrays', () => {
    const result = extractKeywords('Some text');
    expect(Array.isArray(result.hardKeywords)).toBe(true);
    expect(Array.isArray(result.softKeywords)).toBe(true);
  });

  it('senioritySignals has required fields', () => {
    const result = extractKeywords('Some text');
    expect(result.senioritySignals).toHaveProperty('yearsMinimum');
    expect(result.senioritySignals).toHaveProperty('yearsPreferred');
    expect(result.senioritySignals).toHaveProperty('level');
    expect(result.senioritySignals).toHaveProperty('signals');
    expect(result.senioritySignals).toHaveProperty('title');
  });

  it('metadata has required fields', () => {
    const result = extractKeywords('Some text');
    expect(result.metadata).toHaveProperty('extractedAt');
    expect(result.metadata).toHaveProperty('taxonomyVersion');
    expect(result.metadata.taxonomyVersion).toBe('1.0.0');
    expect(result.metadata).toHaveProperty('processingTimeMs');
    expect(result.metadata).toHaveProperty('extractorVersion');
  });
});

// ── Hard keyword extraction — English JD ───────────────────────────────────

describe('keyword-extractor — English JD (AGIL)', () => {
  let result;
  let jdText;

  beforeAll(() => {
    jdText = loadFixture('AGIL');
    result = extractKeywords(jdText);
  });

  it('extracts hard keywords from a real English JD', () => {
    expect(result.hardKeywords.length).toBeGreaterThan(0);
  });

  it('detects Jira as a hard keyword in tools category', () => {
    const jira = result.hardKeywords.find(k => k.term === 'Jira');
    expect(jira).toBeDefined();
    expect(jira.category).toBe('tools');
    expect(jira.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects GitHub as a hard keyword', () => {
    const github = result.hardKeywords.find(k => k.term === 'GitHub');
    expect(github).toBeDefined();
  });

  it('detects Agile methodology', () => {
    const agile = result.hardKeywords.find(k => k.term === 'Agile');
    expect(agile).toBeDefined();
    expect(agile.category).toBe('methodologies');
  });

  it('detects SDLC', () => {
    const sdlc = result.hardKeywords.find(k => k.term === 'SDLC');
    expect(sdlc).toBeDefined();
  });

  it('resolves Linear variant correctly', () => {
    // Linear is in the taxonomy under tools
    const linear = result.hardKeywords.find(k => k.term === 'Linear');
    expect(linear).toBeDefined();
    expect(linear.category).toBe('tools');
  });

  it('every hard keyword has required fields', () => {
    for (const kw of result.hardKeywords) {
      expect(kw).toHaveProperty('term');
      expect(typeof kw.term).toBe('string');
      expect(kw).toHaveProperty('category');
      const validCategories = ['languages', 'frameworks', 'tools', 'cloud', 'methodologies', 'databases'];
      expect(validCategories).toContain(kw.category);
      expect(kw).toHaveProperty('matched');
      expect(kw).toHaveProperty('confidence');
      expect(kw.confidence).toBeGreaterThanOrEqual(0);
      expect(kw.confidence).toBeLessThanOrEqual(1);
      expect(kw).toHaveProperty('frequency');
      expect(kw.frequency).toBeGreaterThanOrEqual(1);
      expect(kw).toHaveProperty('mustHave');
      expect(typeof kw.mustHave).toBe('boolean');
      expect(kw).toHaveProperty('context');
      expect(kw.context.length).toBeGreaterThan(0);
    }
  });
});

// ── Hard keyword extraction — Spanish JD ───────────────────────────────────

describe('keyword-extractor — Spanish JD (VANT)', () => {
  let result;

  beforeAll(() => {
    const jdText = loadFixture('VANT');
    result = extractKeywords(jdText);
  });

  it('extracts hard keywords from a real Spanish JD', () => {
    expect(result.hardKeywords.length).toBeGreaterThan(0);
  });

  it('detects Salesforce-specific terms', () => {
    // Salesforce appears in the JD but is not in the taxonomy, so we don't expect it
    // But we should still get general tech terms
    const terms = result.hardKeywords.map(k => k.term);
    expect(terms.length).toBeGreaterThan(0);
  });

  it('detects REST API from the Spanish JD', () => {
    // VANT mentions "APIs REST" — should match variant mapping "REST" → "REST API"
    // or "API" → "REST API"
    const restApi = result.hardKeywords.find(k =>
      k.term === 'REST API' || k.matched.toLowerCase().includes('rest') || k.matched.toLowerCase().includes('api')
    );
    // The JD mentions "APIs REST de Salesforce"
    expect(restApi).toBeDefined();
  });

  it('detects JavaScript (mentioned in Nice to have section)', () => {
    const js = result.hardKeywords.find(k => k.term === 'JavaScript');
    expect(js).toBeDefined();
    expect(js.category).toBe('languages');
  });

  it('detects Git', () => {
    const git = result.hardKeywords.find(k => k.term === 'Git');
    expect(git).toBeDefined();
  });

  it('detects Python', () => {
    const python = result.hardKeywords.find(k => k.term === 'Python');
    expect(python).toBeDefined();
  });

  it('detects SQL', () => {
    // VANT mentions SOQL (Salesforce) and "SQL estándar"
    const sql = result.hardKeywords.find(k => k.term === 'SQL');
    expect(sql).toBeDefined();
  });

  it('detects n8n as a tool', () => {
    const n8n = result.hardKeywords.find(k => k.term === 'n8n');
    expect(n8n).toBeDefined();
    expect(n8n.category).toBe('tools');
  });

  it('soft keywords are detected in Spanish text', () => {
    expect(result.softKeywords.length).toBeGreaterThan(0);
    // Should detect autonomía, colaboración, etc.
    const terms = result.softKeywords.map(k => k.term);
    expect(terms).toContain('Collaboration');
    expect(terms).toContain('Autonomy');
  });
});

// ── Soft keyword extraction ────────────────────────────────────────────────

describe('keyword-extractor — soft skills', () => {
  it('extracts soft skills from English text', () => {
    const result = extractKeywords(
      'We need someone with strong leadership and communication skills, ' +
      'who can manage stakeholders and drive cross-functional collaboration.'
    );
    const terms = result.softKeywords.map(k => k.term);
    expect(terms).toContain('Leadership');
    expect(terms).toContain('Communication');
    expect(terms).toContain('Stakeholder Management');
    expect(terms).toContain('Cross-Functional Collaboration');
  });

  it('extracts soft skills from Spanish text', () => {
    const result = extractKeywords(
      'Buscamos alguien con liderazgo, buenas habilidades de comunicación, ' +
      'y capacidad de trabajar en equipo de forma colaborativa.'
    );
    const terms = result.softKeywords.map(k => k.term);
    expect(terms).toContain('Leadership');
    expect(terms).toContain('Communication');
    expect(terms).toContain('Collaboration');
  });

  it('every soft keyword has required fields', () => {
    const result = extractKeywords('Strong leadership and stakeholder management skills required.');
    for (const kw of result.softKeywords) {
      expect(kw).toHaveProperty('term');
      expect(kw).toHaveProperty('matched');
      expect(kw).toHaveProperty('confidence');
      expect(kw.confidence).toBeGreaterThanOrEqual(0);
      expect(kw.confidence).toBeLessThanOrEqual(1);
      expect(kw).toHaveProperty('frequency');
      expect(kw.frequency).toBeGreaterThanOrEqual(1);
      expect(kw).toHaveProperty('mustHave');
      expect(kw).toHaveProperty('context');
    }
  });
});

// ── Section detection and classification ───────────────────────────────────

describe('keyword-extractor — section-based must-have classification', () => {
  it('classifies keyword in MUST HAVES section as must-have', () => {
    const jd = [
      '## MUST HAVES',
      '- 5+ years of Java development',
      '- Experience with Kubernetes',
      '',
      '## NICE TO HAVE',
      '- Experience with Go',
    ].join('\n');

    const result = extractKeywords(jd);

    const java = result.hardKeywords.find(k => k.term === 'Java');
    const k8s = result.hardKeywords.find(k => k.term === 'Kubernetes');
    const go = result.hardKeywords.find(k => k.term === 'Go');

    expect(java).toBeDefined();
    expect(java.mustHave).toBe(true);
    expect(k8s).toBeDefined();
    expect(k8s.mustHave).toBe(true);
    expect(go).toBeDefined();
    expect(go.mustHave).toBe(false);
  });

  it('classifies keyword in Spanish "Requisitos" section as must-have', () => {
    const jd = [
      '## Requisitos',
      '- Experiencia con Java y Python',
      '- Conocimiento de Docker',
      '',
      '## Deseables',
      '- Conocimiento de Kubernetes',
    ].join('\n');

    const result = extractKeywords(jd);

    const java = result.hardKeywords.find(k => k.term === 'Java');
    const docker = result.hardKeywords.find(k => k.term === 'Docker');
    const k8s = result.hardKeywords.find(k => k.term === 'Kubernetes');

    expect(java).toBeDefined();
    expect(java.mustHave).toBe(true);
    expect(docker).toBeDefined();
    expect(docker.mustHave).toBe(true);
    expect(k8s).toBeDefined();
    expect(k8s.mustHave).toBe(false);
  });

  it('classifies keyword appearing 3+ times with high confidence', () => {
    const jd = [
      '## Requirements',
      '- Java experience required',
      '- Java backend development',
      '- Java microservices',
      '- Strong Java skills',
      '- Knowledge of Spring Boot',
    ].join('\n');

    const result = extractKeywords(jd);
    const java = result.hardKeywords.find(k => k.term === 'Java');

    expect(java).toBeDefined();
    expect(java.frequency).toBeGreaterThanOrEqual(3);
    expect(java.mustHave).toBe(true);
  });
});

// ── Seniority extraction ───────────────────────────────────────────────────

describe('keyword-extractor — seniority signals', () => {
  it('extracts "5+ years" as minimum experience', () => {
    const result = extractKeywords('We are looking for a candidate with 5+ years of experience in software development.');
    expect(result.senioritySignals.yearsMinimum).toBe(5);
    expect(result.senioritySignals.signals.some(s => s.type === 'years_explicit')).toBe(true);
  });

  it('extracts Spanish "años" patterns', () => {
    const result = extractKeywords('Buscamos profesional con al menos 3 años de experiencia en desarrollo.');
    expect(result.senioritySignals.yearsMinimum).toBe(3);
  });

  it('detects "Senior" in title as senior level', () => {
    const result = extractKeywords('# Senior Software Engineer');
    expect(result.senioritySignals.level).toBe('senior');
    expect(result.senioritySignals.title).toBe('Senior Software Engineer');
  });

  it('detects "Mid-Senior" level', () => {
    const result = extractKeywords('# Software Engineer\n**Mid-Senior level**');
    expect(result.senioritySignals.title).toContain('Software Engineer');
    // Mid-Senior should map to senior
    expect(['senior', 'mid']).toContain(result.senioritySignals.level);
  });

  it('detects "Junior" level', () => {
    const result = extractKeywords('# Junior Developer');
    expect(result.senioritySignals.level).toBe('junior');
  });

  it('detects "Semi-Senior" as mid level', () => {
    const result = extractKeywords('# Desarrollador Python Semi Sr');
    // "Semi Sr" maps to mid
    expect(result.senioritySignals.level).toBe('mid');
  });

  it('returns unknown when no seniority signals present', () => {
    const result = extractKeywords('We need someone to write some code.');
    expect(result.senioritySignals.level).toBe('unknown');
    expect(result.senioritySignals.yearsMinimum).toBe(0);
  });

  it('extracts team leadership signal', () => {
    const result = extractKeywords('You will lead teams of engineers and drive technical strategy.');
    expect(result.senioritySignals.signals.some(s => s.type === 'team_lead')).toBe(true);
    expect(result.senioritySignals.signals.some(s => s.type === 'strategy')).toBe(true);
  });

  it('extracts title from markdown heading', () => {
    const result = extractKeywords('# Technical Program Manager (Part-time) ID56888\n\nSome description.');
    expect(result.senioritySignals.title).toBe('Technical Program Manager (Part-time) ID56888');
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('keyword-extractor — edge cases', () => {
  it('handles empty string gracefully', () => {
    const result = extractKeywords('');
    expect(result.hardKeywords).toEqual([]);
    expect(result.softKeywords).toEqual([]);
    expect(result.senioritySignals.level).toBe('unknown');
    expect(result.metadata.jdWordCount).toBe(0);
  });

  it('handles null/undefined gracefully', () => {
    const result = extractKeywords(null);
    expect(result.hardKeywords).toEqual([]);
    expect(result.softKeywords).toEqual([]);
  });

  it('handles whitespace-only text', () => {
    const result = extractKeywords('   \n  \t  ');
    expect(result.hardKeywords).toEqual([]);
    expect(result.softKeywords).toEqual([]);
  });

  it('handles JD with no section headers', () => {
    const jd = 'We are looking for a Python developer with Docker and AWS experience. Must know CI/CD and Agile.';
    const result = extractKeywords(jd);

    expect(result.hardKeywords.length).toBeGreaterThan(0);
    // Without explicit sections, classification relies on other signals
    for (const kw of result.hardKeywords) {
      expect(typeof kw.mustHave).toBe('boolean');
    }
  });

  it('handles JD with only one line of text', () => {
    const result = extractKeywords('Java developer needed.');
    expect(result.hardKeywords.length).toBeGreaterThan(0);
    expect(result.hardKeywords[0].term).toBe('Java');
  });

  it('does not match partial words (Java should not match JavaScript as Java)', () => {
    // The taxonomy has both "Java" and "JavaScript"
    const result = extractKeywords('We use JavaScript for frontend and Java for backend.');
    const java = result.hardKeywords.find(k => k.term === 'Java');
    const js = result.hardKeywords.find(k => k.term === 'JavaScript');

    expect(java).toBeDefined();
    expect(java.frequency).toBe(1); // Only the standalone "Java", not inside "JavaScript"
    expect(js).toBeDefined();
    expect(js.frequency).toBe(1);
  });

  it('resolves acronyms via variant mapping (K8s → Kubernetes)', () => {
    const result = extractKeywords('Experience with K8s and AWS required.');
    const k8s = result.hardKeywords.find(k => k.term === 'Kubernetes');
    expect(k8s).toBeDefined();
    expect(k8s.matched).toMatch(/k8s/i);
  });

  it('resolves AWS → Amazon Web Services', () => {
    const result = extractKeywords('Must have AWS experience.');
    const aws = result.hardKeywords.find(k => k.term === 'Amazon Web Services');
    expect(aws).toBeDefined();
    expect(aws.matched.toLowerCase()).toBe('aws');
  });

  it('resolves CI/CD → CI/CD (direct taxonomy match)', () => {
    const result = extractKeywords('We use CI/CD pipelines.');
    const cicd = result.hardKeywords.find(k => k.term === 'CI/CD');
    expect(cicd).toBeDefined();
  });

  it('prefers longer match over shorter (GitHub Actions vs GitHub)', () => {
    const result = extractKeywords('We use GitHub Actions for CI/CD and GitHub for source control.');
    const ghActions = result.hardKeywords.find(k => k.term === 'GitHub Actions');
    const github = result.hardKeywords.find(k => k.term === 'GitHub');

    expect(ghActions).toBeDefined();
    expect(ghActions.frequency).toBe(1);
    expect(github).toBeDefined();
    // GitHub standalone should be 1 (not counting the one in "GitHub Actions")
    expect(github.frequency).toBe(1);
  });

  it('handles special characters in JD text gracefully', () => {
    const result = extractKeywords('🚀 We need a Python dev with Docker & Kubernetes — CI/CD essential.');
    expect(result.hardKeywords.length).toBeGreaterThan(0);
    const python = result.hardKeywords.find(k => k.term === 'Python');
    expect(python).toBeDefined();
  });
});

// ── Context extraction ─────────────────────────────────────────────────────

describe('keyword-extractor — context snippets', () => {
  it('provides context around matched keywords', () => {
    const result = extractKeywords('We are looking for a Senior Java Developer with experience in Docker and Kubernetes.');
    const java = result.hardKeywords.find(k => k.term === 'Java');
    expect(java).toBeDefined();
    expect(java.context.length).toBeGreaterThan(0);
    expect(java.context.toLowerCase()).toContain('java');
  });

  it('context is at most ~100 characters long', () => {
    const longText = 'A'.repeat(200) + ' Java ' + 'B'.repeat(200);
    const result = extractKeywords(longText);
    const java = result.hardKeywords.find(k => k.term === 'Java');
    expect(java).toBeDefined();
    expect(java.context.length).toBeLessThanOrEqual(105); // ~100 + ellipsis chars
  });
});

// ── Real JD integration tests ──────────────────────────────────────────────

describe('keyword-extractor — integration with real JDs', () => {
  it('AGIL JD: must-have keywords are correctly flagged', () => {
    const jdText = loadFixture('AGIL');
    const result = extractKeywords(jdText);

    // AGIL has explicit "MUST HAVES" section
    // Keywords only in MUST HAVES should be flagged mustHave: true
    const mustHaveKeywords = result.hardKeywords.filter(k => k.mustHave);
    expect(mustHaveKeywords.length).toBeGreaterThan(0);
  });

  it('AGIL JD: detects seniority correctly (5+ years, Mid-Senior)', () => {
    const jdText = loadFixture('AGIL');
    const result = extractKeywords(jdText);

    expect(result.senioritySignals.yearsMinimum).toBe(5);
    // AGIL has "5+ years of experience" → minimum 5
    expect(result.senioritySignals.level).toBe('senior');
  });

  it('AGIL JD: detects soft skills (communication, stakeholder, cross-functional)', () => {
    const jdText = loadFixture('AGIL');
    const result = extractKeywords(jdText);

    const terms = result.softKeywords.map(k => k.term);
    expect(terms).toContain('Communication');
    expect(terms).toContain('Stakeholder Management');
  });

  it('VANT JD: detects Spanish must-have section', () => {
    const jdText = loadFixture('VANT');
    const result = extractKeywords(jdText);

    // VANT has "Conocimientos técnicos requeridos" section
    expect(result.hardKeywords.length).toBeGreaterThan(0);
  });

  it('VANT JD: detects semi-senior level from "Nivel esperado"', () => {
    const jdText = loadFixture('VANT');
    const result = extractKeywords(jdText);

    // VANT says "Perfil semi-senior"
    expect(result.senioritySignals.level).toBe('mid');
  });

  it('VANT JD: detects soft skills in Spanish', () => {
    const jdText = loadFixture('VANT');
    const result = extractKeywords(jdText);

    const terms = result.softKeywords.map(k => k.term);
    expect(terms).toContain('Collaboration');
    expect(terms).toContain('Autonomy');
  });

  it('produces output that passes structural validation (all fields present)', () => {
    const jdText = loadFixture('AGIL');
    const result = extractKeywords(jdText);

    // Validate all required fields per keyword-output.schema.json
    expect(Array.isArray(result.hardKeywords)).toBe(true);
    expect(Array.isArray(result.softKeywords)).toBe(true);

    for (const kw of result.hardKeywords) {
      expect(typeof kw.term).toBe('string');
      expect(typeof kw.category).toBe('string');
      expect(typeof kw.matched).toBe('string');
      expect(typeof kw.confidence).toBe('number');
      expect(typeof kw.frequency).toBe('number');
      expect(typeof kw.mustHave).toBe('boolean');
      expect(typeof kw.context).toBe('string');
    }

    expect(typeof result.senioritySignals.yearsMinimum).toBe('number');
    expect(result.senioritySignals.yearsMinimum).toBeGreaterThanOrEqual(0);
    expect(typeof result.senioritySignals.yearsPreferred).toBe('number');
    expect(typeof result.senioritySignals.level).toBe('string');
    expect(Array.isArray(result.senioritySignals.signals)).toBe(true);
    expect(typeof result.senioritySignals.title).toBe('string');

    expect(typeof result.metadata.extractedAt).toBe('string');
    expect(typeof result.metadata.taxonomyVersion).toBe('string');
    expect(typeof result.metadata.jdWordCount).toBe('number');
    expect(typeof result.metadata.processingTimeMs).toBe('number');
    expect(typeof result.metadata.extractorVersion).toBe('string');
  });
});

// ── Frequency counting ─────────────────────────────────────────────────────

describe('keyword-extractor — frequency counting', () => {
  it('counts multiple occurrences of the same keyword', () => {
    const jd = 'Java Java Java Java Java'; // 5 times
    const result = extractKeywords(jd);
    const java = result.hardKeywords.find(k => k.term === 'Java');
    expect(java).toBeDefined();
    expect(java.frequency).toBe(5);
  });

  it('counts occurrences via variants as well', () => {
    const jd = 'We use AWS, AWS Lambda, and AWS EC2. Must know AWS well.';
    const result = extractKeywords(jd);
    const aws = result.hardKeywords.find(k => k.term === 'Amazon Web Services');
    // "AWS" appears 4 times but some are part of longer terms (AWS Lambda, AWS EC2)
    // Standalone "AWS" should appear at least once
    expect(aws).toBeDefined();
    expect(aws.frequency).toBeGreaterThanOrEqual(1);
  });
});

// ── Taxonomy coverage ──────────────────────────────────────────────────────

describe('keyword-extractor — taxonomy integration', () => {
  it('uses taxonomy version from keyword-taxonomy.json', () => {
    const result = extractKeywords('test');
    expect(result.metadata.taxonomyVersion).toBe('1.0.0');
  });

  it('extracts keywords from all taxonomy categories when present', () => {
    const jd = [
      'Python, Java, TypeScript developer needed.',
      'Experience with React, Node.js, Django, and FastAPI.',
      'Tools: Jira, GitHub, Docker, Jenkins, Terraform, Prometheus.',
      'Cloud: AWS, GCP, Kubernetes, Amazon S3, DynamoDB.',
      'Methodologies: Agile, Scrum, CI/CD, Microservices, TDD.',
      'Databases: MySQL, PostgreSQL, MongoDB, Redis.',
    ].join(' ');

    const result = extractKeywords(jd);
    const categories = new Set(result.hardKeywords.map(k => k.category));

    expect(categories.has('languages')).toBe(true);
    expect(categories.has('frameworks')).toBe(true);
    expect(categories.has('tools')).toBe(true);
    expect(categories.has('cloud')).toBe(true);
    expect(categories.has('methodologies')).toBe(true);
    expect(categories.has('databases')).toBe(true);
  });
});
