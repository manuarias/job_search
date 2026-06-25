// vitest globals: describe, it, expect are available via vitest.config.js globals: true
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');

// ── Load schema ──────────────────────────────────────────────────────
const SCHEMA_PATH = path.join(__dirname, 'keyword-output.schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

function compileValidator() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

// ── Minimal valid keyword output ─────────────────────────────────────
const minimalValid = {
  hardKeywords: [],
  softKeywords: [],
  senioritySignals: {
    yearsMinimum: 0,
    yearsPreferred: 0,
    level: 'unknown',
    signals: [],
    title: 'Software Engineer'
  },
  metadata: {
    extractedAt: '2026-06-25T18:00:00.000Z',
    taxonomyVersion: '1.0.0'
  }
};

// ── Full valid keyword output ────────────────────────────────────────
const fullValid = {
  hardKeywords: [
    {
      term: 'Kubernetes',
      category: 'cloud',
      matched: 'K8s',
      confidence: 1.0,
      frequency: 3,
      mustHave: true,
      context: 'Experience with K8s and container orchestration'
    },
    {
      term: 'Java',
      category: 'languages',
      matched: 'Java',
      confidence: 1.0,
      frequency: 5,
      mustHave: true,
      context: '5+ years of Java development'
    },
    {
      term: 'AWS Lambda',
      category: 'cloud',
      matched: 'serverless functions',
      confidence: 0.7,
      frequency: 1,
      mustHave: false,
      context: 'Familiarity with serverless functions is a plus'
    }
  ],
  softKeywords: [
    {
      term: 'Stakeholder Management',
      matched: 'stakeholder alignment',
      confidence: 0.9,
      frequency: 2,
      mustHave: true,
      context: 'Strong stakeholder alignment and communication skills'
    },
    {
      term: 'Cross-Functional Collaboration',
      matched: 'cross-functional teams',
      confidence: 1.0,
      frequency: 3,
      mustHave: true,
      context: 'Experience leading cross-functional teams'
    }
  ],
  senioritySignals: {
    yearsMinimum: 5,
    yearsPreferred: 8,
    level: 'senior',
    signals: [
      { type: 'years_explicit', value: '5' },
      { type: 'title_keyword', value: 'Senior' },
      { type: 'team_lead', value: 'leading cross-functional teams' }
    ],
    title: 'Senior Technical Program Manager'
  },
  metadata: {
    extractedAt: '2026-06-25T18:00:00.000Z',
    taxonomyVersion: '1.0.0',
    jdSource: 'url',
    jdUrl: 'https://example.com/jobs/tpm',
    jdWordCount: 450,
    processingTimeMs: 12,
    extractorVersion: '1.0.0'
  }
};

// ==========================================================
// Schema self-validation
// ==========================================================

describe('keyword-output.schema.json', () => {
  it('debe ser un JSON Schema válido (tiene $schema y type)', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
  });

  it('debe tener las 4 propiedades requeridas en el root', () => {
    expect(schema.required).toContain('hardKeywords');
    expect(schema.required).toContain('softKeywords');
    expect(schema.required).toContain('senioritySignals');
    expect(schema.required).toContain('metadata');
    expect(schema.required).toHaveLength(4);
  });

  it('debe tener $defs para todos los sub-tipos principales', () => {
    expect(schema.$defs).toHaveProperty('hardKeyword');
    expect(schema.$defs).toHaveProperty('softKeyword');
    expect(schema.$defs).toHaveProperty('senioritySignals');
    expect(schema.$defs).toHaveProperty('senioritySignal');
    expect(schema.$defs).toHaveProperty('extractionMetadata');
  });
});

// ==========================================================
// Minimal valid output validation
// ==========================================================

describe('Validación de keyword output — caso mínimo', () => {
  let validate;

  beforeAll(() => {
    validate = compileValidator();
  });

  it('debe validar un output mínimo con arrays vacíos', () => {
    const valid = validate(minimalValid);
    if (!valid) {
      console.error(JSON.stringify(validate.errors, null, 2));
    }
    expect(valid).toBe(true);
  });

  it('debe rechazar un output sin hardKeywords', () => {
    const invalid = { ...minimalValid };
    delete invalid.hardKeywords;
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar un output sin softKeywords', () => {
    const invalid = { ...minimalValid };
    delete invalid.softKeywords;
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar un output sin senioritySignals', () => {
    const invalid = { ...minimalValid };
    delete invalid.senioritySignals;
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar un output sin metadata', () => {
    const invalid = { ...minimalValid };
    delete invalid.metadata;
    expect(validate(invalid)).toBe(false);
  });
});

// ==========================================================
// Full valid output validation
// ==========================================================

describe('Validación de keyword output — caso completo', () => {
  let validate;

  beforeAll(() => {
    validate = compileValidator();
  });

  it('debe validar un output con hardKeywords, softKeywords, señales y metadata completos', () => {
    const valid = validate(fullValid);
    if (!valid) {
      console.error(JSON.stringify(validate.errors, null, 2));
    }
    expect(valid).toBe(true);
  });

  it('debe validar que hardKeywords tengan term, category y matched', () => {
    for (const kw of fullValid.hardKeywords) {
      expect(kw).toHaveProperty('term');
      expect(kw).toHaveProperty('category');
      expect(kw).toHaveProperty('matched');
    }
  });

  it('debe validar que las categorías de hardKeywords sean válidas', () => {
    const validCategories = ['languages', 'frameworks', 'tools', 'cloud', 'methodologies', 'databases'];
    for (const kw of fullValid.hardKeywords) {
      expect(validCategories).toContain(kw.category);
    }
  });

  it('debe validar que senioritySignals tenga un level válido', () => {
    const validLevels = ['junior', 'mid', 'senior', 'staff', 'principal', 'director', 'vp', 'c-level', 'unknown'];
    expect(validLevels).toContain(fullValid.senioritySignals.level);
  });

  it('debe validar que los confidence scores estén entre 0 y 1', () => {
    for (const kw of fullValid.hardKeywords) {
      expect(kw.confidence).toBeGreaterThanOrEqual(0);
      expect(kw.confidence).toBeLessThanOrEqual(1);
    }
    for (const kw of fullValid.softKeywords) {
      expect(kw.confidence).toBeGreaterThanOrEqual(0);
      expect(kw.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('debe validar que las frequencies sean >= 1', () => {
    for (const kw of fullValid.hardKeywords) {
      expect(kw.frequency).toBeGreaterThanOrEqual(1);
    }
  });
});

// ==========================================================
// Invalid inputs — schema rejection
// ==========================================================

describe('Validación de keyword output — rechazos', () => {
  let validate;

  beforeAll(() => {
    validate = compileValidator();
  });

  it('debe rechazar una categoría inválida en hardKeyword', () => {
    const invalid = {
      ...minimalValid,
      hardKeywords: [{ term: 'Test', category: 'invalid-category', matched: 'Test', confidence: 1.0, frequency: 1, mustHave: false }]
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar confidence fuera de rango', () => {
    const invalid = {
      ...minimalValid,
      hardKeywords: [{ term: 'Test', category: 'tools', matched: 'Test', confidence: 1.5, frequency: 1, mustHave: false }]
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar un level inválido en senioritySignals', () => {
    const invalid = {
      ...minimalValid,
      senioritySignals: { ...minimalValid.senioritySignals, level: 'super-senior' }
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar una señal con type inválido', () => {
    const invalid = {
      ...minimalValid,
      senioritySignals: {
        ...minimalValid.senioritySignals,
        signals: [{ type: 'invalid_signal_type', value: 'test' }]
      }
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar metadata sin extractedAt', () => {
    const invalid = {
      ...minimalValid,
      metadata: { taxonomyVersion: '1.0.0' }
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar propiedades adicionales en el root', () => {
    const invalid = {
      ...minimalValid,
      extraField: 'this should not be here'
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar propiedades adicionales en hardKeyword', () => {
    const invalid = {
      ...minimalValid,
      hardKeywords: [{ term: 'Test', category: 'tools', matched: 'Test', confidence: 1.0, frequency: 1, mustHave: false, bogusField: true }]
    };
    expect(validate(invalid)).toBe(false);
  });

  it('debe rechazar yearsMinimum negativo', () => {
    const invalid = {
      ...minimalValid,
      senioritySignals: { ...minimalValid.senioritySignals, yearsMinimum: -1 }
    };
    expect(validate(invalid)).toBe(false);
  });
});
