/**
 * jd-scraper.test.js — Tests for the F5 JD scraper.
 */
'use strict';

const { scrapeJD, detectSource, generateRef, htmlToMarkdown } = require('./jd-scraper');

const GH = `<!DOCTYPE html><html><head><title>Senior Engineer — Acme Corp</title></head><body>
<div class="app-title">Senior Engineer</div><span class="company-name">Acme Corp</span>
<div id="content"><h2>About the role</h2><p>We need a Senior Engineer.</p>
<h2>Requirements</h2><ul><li>5+ years Java or Python</li><li>AWS and Docker</li><li>Strong communication</li></ul>
<h2>Nice to Have</h2><ul><li>Kubernetes</li><li>Go knowledge</li></ul></div></body></html>`;

const LV = `<!DOCTYPE html><html><head><title>EM — Beta Inc.</title></head><body><div class="posting">
<h2>Engineering Manager</h2><a class="postings-btn" href="/">Beta Inc.</a>
<div class="section"><h3>About the Role</h3><p>Lead the platform team.</p></div>
<div class="section"><h3>Minimum Qualifications</h3><ul><li>7+ years engineering</li><li>3+ years management</li><li>Agile background</li></ul></div></div></body></html>`;

const WD = `<!DOCTYPE html><html><head><title>Cloud Architect — Gamma Solutions</title>
<meta property="og:site_name" content="Gamma Solutions"/></head><body><main><h1>Cloud Architect</h1>
<div class="job-description"><p>Design AWS infrastructure.</p>
<h3>Key Responsibilities</h3><ul><li>Design cloud-native architectures</li><li>Lead migration projects</li></ul>
<h3>Qualifications</h3><ul><li>5+ years AWS</li><li>Terraform and CI/CD</li></ul>
<h3>Nice-to-Have</h3><ul><li>GCP multi-cloud</li></ul></div></main></body></html>`;

const JS_HEAVY = '<!DOCTYPE html><html><head><title>Loading...</title></head><body><div id="root"></div><script>window.__INITIAL_STATE__ = {};</script></body></html>';

describe('detectSource', () => {
  it('detects Greenhouse, Lever, Workday, LinkedIn', () => {
    expect(detectSource('https://boards.greenhouse.io/acme/jobs/123')).toBe('greenhouse');
    expect(detectSource('https://jobs.lever.co/beta/abc')).toBe('lever');
    expect(detectSource('https://gamma.myworkdayjobs.com/job')).toBe('workday');
    expect(detectSource('https://www.linkedin.com/jobs/view/123')).toBe('linkedin');
    expect(detectSource('https://example.com')).toBe('unknown');
  });
});

describe('htmlToMarkdown', () => {
  it('converts headings, bold, italic, links, lists', () => {
    const md = htmlToMarkdown('<h1>Title</h1><h2>Sub</h2><p><strong>bold</strong> <em>italic</em>. <a href="https://x.com">link</a></p><ul><li>A</li><li>B</li></ul>');
    expect(md).toContain('# Title');
    expect(md).toContain('## Sub');
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
    expect(md).toContain('[link](https://x.com)');
    expect(md).toContain('- A');
    expect(md).toContain('- B');
  });
  it('strips scripts and decodes entities', () => {
    const md = htmlToMarkdown('<script>xss()</script><p>a &amp; b</p>');
    expect(md).not.toContain('xss');
    expect(md).toContain('a & b');
  });
});

describe('generateRef', () => {
  it('produces 4-char uppercase clean REF', () => {
    expect(generateRef('AgileEngine')).toBe('AGIL');
    expect(generateRef('A')).toBe('AXXX');
    expect(generateRef('123 Corp')).toBe('CORP');
  });
});

describe('scrapeJD — URL', () => {
  let f;
  beforeAll(() => { f = globalThis.fetch; });
  afterAll(() => { globalThis.fetch = f; });

  it('Greenhouse: extracts title, company, sections', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => GH });
    const r = await scrapeJD('https://boards.greenhouse.io/acme/jobs/123');
    expect(r.source).toBe('greenhouse');
    expect(r.company).toBe('Acme Corp');
    expect(r.title).toBe('Senior Engineer');
    expect(r.sections.mustHave).toContain('Java');
    expect(r.sections.niceToHave).toContain('Kubernetes');
  });

  it('Lever: extracts title and must-have section', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => LV });
    const r = await scrapeJD('https://jobs.lever.co/beta/abc');
    expect(r.source).toBe('lever');
    expect(r.title).toBe('Engineering Manager');
    expect(r.sections.mustHave).toContain('Agile');
  });

  it('Workday: extracts via meta tag and sections', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => WD });
    const r = await scrapeJD('https://gamma.myworkdayjobs.com/job');
    expect(r.company).toBe('Gamma Solutions');
    expect(r.title).toBe('Cloud Architect');
    expect(r.sections.responsibilities.toLowerCase()).toContain('cloud-native');
    expect(r.sections.mustHave).toContain('AWS');
    expect(r.sections.niceToHave).toContain('GCP');
  });
});

describe('scrapeJD — text', () => {
  it('parses raw markdown with sections', async () => {
    const r = await scrapeJD('# TPM\n\n## MUST HAVES\n- Jira\nexpertise\n\n## RESPONSIBILITIES\n- Define roadmaps');
    expect(r.source).toBe('text');
    expect(r.title).toBe('TPM');
    expect(r.sections.mustHave).toContain('Jira');
    expect(r.sections.responsibilities).toContain('roadmaps');
  });
  it('parses raw HTML input', async () => {
    const r = await scrapeJD('<h1>Backend Dev</h1><p>Need Go skills.</p>');
    expect(r.source).toBe('text');
    expect(r.title).toBe('Backend Dev');
    expect(r.markdown).toContain('Go skills');
  });
});

describe('scrapeJD — failures', () => {
  let f;
  beforeAll(() => { f = globalThis.fetch; });
  afterAll(() => { globalThis.fetch = f; });

  it('throws on empty input', async () => {
    await expect(scrapeJD('')).rejects.toThrow('Input is empty');
  });
  it('throws on HTTP 404', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(scrapeJD('https://x.com/j')).rejects.toThrow('HTTP 404');
  });
  it('throws on JS-heavy page', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => JS_HEAVY });
    await expect(scrapeJD('https://x.com/j')).rejects.toThrow('JavaScript');
  });
  it('throws on LI without cookie', async () => {
    delete process.env.LI_AT;
    await expect(scrapeJD('https://www.linkedin.com/jobs/view/1')).rejects.toThrow('LI_AT');
  });
  it('throws on network error', async () => {
    globalThis.fetch = async () => { throw new Error('ENOTFOUND'); };
    await expect(scrapeJD('https://nx.example/j')).rejects.toThrow('Failed to fetch');
  });
});
