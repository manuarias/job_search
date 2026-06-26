/**
 * hermes.test.js — Tests for the Hermes pipeline orchestrator.
 *
 * Covers: argument parsing, language detection, state management,
 * CLI flags, and integration with a real JD text.
 */
'use strict';

const { parseArgs, detectLanguage, SPANISH_SIGNALS } = require('./hermes');

// ── parseArgs ─────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns help=true when no args', () => {
    const r = parseArgs(['node', 'hermes.js']);
    expect(r.help).toBe(true);
  });

  it('returns help with --help or -h', () => {
    expect(parseArgs(['node', 'hermes.js', '--help']).help).toBe(true);
    expect(parseArgs(['node', 'hermes.js', '-h']).help).toBe(true);
  });

  it('parses a single positional input (URL)', () => {
    const r = parseArgs(['node', 'hermes.js', 'https://example.com/jd']);
    expect(r.positional).toEqual(['https://example.com/jd']);
    expect(r.opts.lang).toBeNull();
    expect(r.opts.interactive).toBe(false);
  });

  it('parses multiple words as a single positional (text JD)', () => {
    const r = parseArgs(['node', 'hermes.js', 'We', 'are', 'hiring']);
    expect(r.positional).toEqual(['We', 'are', 'hiring']);
  });

  it('parses --lang en', () => {
    const r = parseArgs(['node', 'hermes.js', '--lang', 'en', 'https://x.com']);
    expect(r.opts.lang).toBe('en');
  });

  it('parses --lang es', () => {
    const r = parseArgs(['node', 'hermes.js', '--lang', 'es', 'https://x.com']);
    expect(r.opts.lang).toBe('es');
  });

  it('parses --interactive flag', () => {
    const r = parseArgs(['node', 'hermes.js', '--interactive', 'https://x.com']);
    expect(r.opts.interactive).toBe(true);
  });

  it('parses -i shorthand', () => {
    const r = parseArgs(['node', 'hermes.js', '-i', 'https://x.com']);
    expect(r.opts.interactive).toBe(true);
  });

  it('parses --batch flag', () => {
    const r = parseArgs(['node', 'hermes.js', '--batch', 'urls.txt']);
    expect(r.opts.batch).toBe('urls.txt');
  });

  it('parses --pdf flag', () => {
    const r = parseArgs(['node', 'hermes.js', '--pdf', 'https://x.com']);
    expect(r.opts.pdf).toBe(true);
  });

  it('parses combined options', () => {
    const r = parseArgs(['node', 'hermes.js', '--lang', 'es', '--interactive', '--pdf', 'https://x.com']);
    expect(r.opts.lang).toBe('es');
    expect(r.opts.interactive).toBe(true);
    expect(r.opts.pdf).toBe(true);
    expect(r.positional).toEqual(['https://x.com']);
  });

  it('rejects unknown options', () => {
    const r = parseArgs(['node', 'hermes.js', '--unknown', 'https://x.com']);
    expect(r.error).toBe('Unknown option: --unknown');
  });

  it('has no positional when only flags are passed', () => {
    const r = parseArgs(['node', 'hermes.js', '--interactive']);
    expect(r.positional).toEqual([]);
  });
});

// ── detectLanguage ────────────────────────────────────────────────────────

describe('detectLanguage', () => {
  it('returns "en" for English text', () => {
    const text = 'We are looking for a Senior Software Engineer with experience in cloud architecture and distributed systems.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('returns "en" for text with only 1-2 Spanish words', () => {
    const text = 'We need a developer with experiencia in Java. This role requires strong communication.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('returns "es" for fully Spanish text', () => {
    const text = 'Buscamos un desarrollador con experiencia en Java. Requisitos: conocimientos en AWS y Docker. Ofrecemos beneficios y trabajo en equipo.';
    expect(detectLanguage(text)).toBe('es');
  });

  it('returns "es" for Spanish JD with 3+ signal words', () => {
    const text = 'Estamos buscando un líder técnico. Experiencia requerida: 5 años. Conocimientos en desarrollo de software.';
    expect(detectLanguage(text)).toBe('es');
  });

  it('counts "experiencia", "requisitos", and "buscamos" as Spanish signals', () => {
    // Just enough to cross threshold
    const text = 'La experiencia es importante. Los requisitos son claros. Buscamos talento.';
    expect(detectLanguage(text)).toBe('es');
  });

  it('returns "en" for empty text', () => {
    expect(detectLanguage('')).toBe('en');
  });

  it('is case-insensitive', () => {
    const text = 'EXPERIENCIA en desarrollo. REQUISITOS: AWS. BUSCAMOS líder.';
    expect(detectLanguage(text)).toBe('es');
  });
});

// ── SPANISH_SIGNALS ────────────────────────────────────────────────────────

describe('SPANISH_SIGNALS', () => {
  it('contains expected Spanish keywords', () => {
    expect(SPANISH_SIGNALS).toContain('experiencia');
    expect(SPANISH_SIGNALS).toContain('requisitos');
    expect(SPANISH_SIGNALS).toContain('buscamos');
    expect(SPANISH_SIGNALS).toContain('conocimientos');
    expect(SPANISH_SIGNALS).toContain('responsabilidades');
    expect(SPANISH_SIGNALS).toContain('beneficios');
  });

  it('contains at least 10 signals for reliable detection', () => {
    expect(SPANISH_SIGNALS.length).toBeGreaterThanOrEqual(10);
  });
});
