/**
 * F5 JD Scraper — Core module
 *
 * Fetches a JD from a URL or parses raw text. Detects ATS source
 * (Greenhouse, Lever, Workday), converts HTML to Markdown via regex
 * (zero dependencies), extracts sections, and generates a REF code.
 *
 * Usage:
 *   const { scrapeJD } = require('./lib/jd-scraper');
 *   const result = await scrapeJD('https://boards.greenhouse.io/...');
 */

'use strict';

// ── Source detection ───────────────────────────────────────────────────────
function detectSource(url) {
  if (!url || typeof url !== 'string') return 'unknown';
  const l = url.toLowerCase();
  if (l.includes('greenhouse.io')) return 'greenhouse';
  if (l.includes('lever.co')) return 'lever';
  if (l.includes('myworkdayjobs.com')) return 'workday';
  if (l.includes('linkedin.com/jobs')) return 'linkedin';
  return 'unknown';
}

// ── HTML entity decode ─────────────────────────────────────────────────────
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&mdash;': '\u2014', '&ndash;': '\u2013', '&bull;': '\u2022', '&rsquo;': "'", '&lsquo;': "'", '&rdquo;': '"', '&ldquo;': '"' };
function decode(s) { return s.replace(/&[#a-z0-9]+;/gi, m => ENTITIES[m] || m); }

// ── HTML → Markdown (regex, no dependencies) ───────────────────────────────
function htmlToMarkdown(html) {
  let m = html;
  m = m.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  m = m.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Headings
  m = m.replace(/<\/h([1-6])>/gi, '\n\n');
  m = m.replace(/<h([1-6])[^>]*>/gi, (_, n) => '\n\n' + '#'.repeat(+n) + ' ');
  // Block elements
  m = m.replace(/<\/(p|div|section|article|header|footer|main|aside)>/gi, '\n\n');
  m = m.replace(/<(p|div|section|article|header|footer|main|aside)[^>]*>/gi, '');
  // Lists
  m = m.replace(/<li[^>]*>/gi, '\n- ');
  m = m.replace(/<\/li>/gi, '');
  m = m.replace(/<\/(ul|ol)>/gi, '\n');
  // Inline and misc
  m = m.replace(/<br\s*\/?>/gi, '\n');
  m = m.replace(/<\/?(?:strong|b)>/gi, '**');
  m = m.replace(/<\/?(?:em|i)>/gi, '*');
  m = m.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  m = m.replace(/<[^>]+>/g, '');
  return collapse(decode(m));
}
function collapse(s) {
  return s.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    .split('\n').map(l => l.trim()).join('\n').trim();
}

// ── Title & company extraction ─────────────────────────────────────────────
function extractTitle(html, src) {
  let t = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  if (src === 'greenhouse') t = (html.match(/<h1[^>]*class=["'][^"']*app-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || t;
  if (src === 'lever') t = (html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || t;
  t = decode(t);
  return t.replace(/\s*[-–—|]\s*(at\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/, '').trim() || 'Unknown Role';
}

function extractCompany(html, src, url) {
  if (src === 'greenhouse') {
    const m = html.match(/<span[^>]*class=["'][^"']*company-name[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (m) return m[1].trim();
  }
  // Meta tags (preferred over URL heuristics)
  const meta = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (meta) return decode(meta[1].trim());
  // URL fallback
  if (url) {
    const h = url.match(/https?:\/\/(?:www\.|boards\.|jobs\.)?([^.]+)\./);
    if (h) return h[1].charAt(0).toUpperCase() + h[1].slice(1);
  }
  return 'Unknown Company';
}

// ── REF generation ─────────────────────────────────────────────────────────
function generateRef(company) {
  const c = company.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (c + 'XXXX').slice(0, 4);
}

// ── Section extraction ─────────────────────────────────────────────────────
const SECTION_MARKERS = [
  { rx: /^#+\s*(?:MUST\s*HAVES?|MINIMUM\s+QUALIFICATIONS?|BASIC\s+QUALIFICATIONS?|REQUIRED\s+(?:QUALIFICATIONS?|SKILLS?|EXPERIENCE)|QUALIFICATIONS?|REQUIREMENTS?)\s*$/im, type: 'mh' },
  { rx: /^#+\s*NICE\s*(?:[- ]*TO\s*[- ]*)?HAVES?\s*$/im, type: 'nt' },
  { rx: /^#+\s*PREFERRED\s+QUALIFICATIONS?\s*$/im, type: 'nt' },
  { rx: /^#+\s*BONUS\s+POINTS?\s*$/im, type: 'nt' },
  { rx: /^#+\s*(?:KEY\s+)?RESPONSIBILIT(?:Y|IES)\s*$/im, type: 'resp' },
  { rx: /^#+\s*WHAT\s+YOU\s+(?:WILL|'LL)\s+DO\s*$/im, type: 'resp' },
  { rx: /^#+\s*(?:ABOUT\s+)?THE\s+ROLE\s*$/im, type: 'resp' },
  { rx: /^#+\s*ABOUT\s+(?:US|THE\s+COMPANY|THE\s+TEAM)\s*$/im, type: 'abt' },
  { rx: /^#+\s*WHO\s+WE\s+ARE\s*$/im, type: 'abt' },
];

function extractSections(md) {
  const lines = md.split('\n');
  const cont = { mh: '', nt: '', resp: '', abt: '', pre: '' };
  let cur = 'pre';
  for (const line of lines) {
    let hit = null;
    for (const { rx, type } of SECTION_MARKERS) {
      if (rx.test(line) && line.length <= 80) { hit = type; break; }
    }
    if (hit) { cur = hit; continue; }
    cont[cur] += (cont[cur] ? '\n' : '') + line;
  }
  const trim = s => s.trim();
  const mh = trim(cont.mh);
  return {
    mustHave: mh,
    niceToHave: trim(cont.nt),
    responsibilities: trim(cont.resp),
    about: trim(cont.abt) || (mh ? '' : trim(cont.pre)),
  };
}

// ── Search results page detection ──────────────────────────────────────────

/**
 * Detect if the fetched page is a search/listing results page rather than an
 * individual job posting. Returns null if it looks like a real JD, or an object
 * with signals and suggestedUrls if it appears to be a listing page.
 *
 * @param {string} html - Raw HTML content
 * @param {string} markdown - Converted markdown
 * @param {string} url - The fetched URL
 * @returns {null|{ isSearch: true, signals: string[], suggestedUrls: string[] }}
 */
function detectSearchResultsPage(html, markdown, url) {
  const signals = [];
  const suggestedUrls = [];

  // ── Computrabajo-specific detection ──
  if (url && /computrabajo\.com/i.test(url)) {
    // Individual posting URLs contain /oferta-de-trabajo-de-
    if (!/\/oferta-de-trabajo-de-/.test(url)) {
      signals.push('La URL es una página de búsqueda de Computrabajo (no contiene "/oferta-de-trabajo-de-").');
    }

    // Multiple "Postular" buttons indicate listing page
    const postularCount = (html.match(/Postular/g) || []).length;
    if (postularCount > 2) {
      signals.push(`${postularCount} botones "Postular" detectados — esto es una página de listado con múltiples ofertas.`);
    }

    // Filter/sort UI elements
    if (/Ordenar\s*por/i.test(html) && /Filtrar/i.test(html)) {
      signals.push('UI de filtros y ordenamiento de búsqueda detectada.');
    }

    // Result count indicator
    if (/\d{2,}\s+Ofertas\s+de\s+trabajo/i.test(html)) {
      signals.push('Contador de resultados de búsqueda detectado (ej: "189 Ofertas de trabajo").');
    }

    // Extract individual posting URLs from the page
    if (signals.length > 0) {
      const postingRx = /\/oferta-de-trabajo-de-[^\s"')]+/gi;
      const seen = new Set();
      let m;
      while ((m = postingRx.exec(html)) !== null) {
        const href = m[0];
        if (!seen.has(href)) {
          seen.add(href);
          suggestedUrls.push('https://ar.computrabajo.com' + href);
        }
      }
    }
  }

  // ── General heuristics (platform-agnostic) ──

  // High link-to-text ratio suggesting listing page
  const linkCount = (markdown.match(/\[([^\]]+)\]\(https?:\/\//g) || []).length;
  if (linkCount > 30 && markdown.length / Math.max(linkCount, 1) < 500) {
    signals.push(`Alta densidad de enlaces (${linkCount} links en ${markdown.length} caracteres) — típico de páginas de listado.`);
  }

  // Multiple distinct job titles in headings
  const h2Matches = markdown.match(/^##\s+.+$/gm) || [];
  const jobTitleRx = /(?:developer|desarrollador|engineer|ingeniero|arquitecto|analista|líder|lider|técnico|tecnico|senior|junior|semi|backend|frontend|fullstack|devops)/i;
  const jobTitleHeadings = h2Matches.filter(h => jobTitleRx.test(h));
  if (jobTitleHeadings.length > 3) {
    signals.push(`${jobTitleHeadings.length} títulos de ofertas detectados en headings — página de listado, no un aviso individual.`);
  }

  // No JD content sections found
  if (signals.length >= 2) {
    return { isSearch: true, signals, suggestedUrls };
  }

  return null;
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Scrape a job description from a URL or parse raw text/HTML.
 * @param {string} input - URL string or raw HTML/text content
 * @returns {Promise<object>} { ref, company, title, markdown, sections, source, url? }
 */
async function scrapeJD(input) {
  if (!input || typeof input !== 'string' || !input.trim()) throw new Error('Input is empty');
  const isUrl = /^https?:\/\//i.test(input.trim());

  if (!isUrl) {
    const md = /<[^>]+>/i.test(input) ? htmlToMarkdown(input) : input;
    const sections = extractSections(md);
    const t = (md.match(/^#\s+(.+)$/m) || [])[1] || 'Unknown Role';
    return { ref: generateRef('Unknown Company'), company: 'Unknown Company', title: t.trim(), markdown: md, sections, source: 'text' };
  }

  const url = input.trim();
  const src = detectSource(url);
  if (src === 'linkedin' && !process.env.LI_AT) throw new Error('LinkedIn JD scraping requires LI_AT cookie. Set the LI_AT environment variable.');

  const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html;q=0.9,*/*;q=0.8' };
  if (src === 'linkedin') headers['Cookie'] = `li_at=${process.env.LI_AT}`;

  let resp;
  try { resp = await fetch(url, { headers, redirect: 'follow' }); }
  catch (e) { throw new Error(`Failed to fetch ${url}: ${e.message}`); }
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText} fetching ${url}`);

  const html = await resp.text();
  if (html.length < 200) throw new Error(`Page returned too little content (${html.length} chars). The site may require JavaScript.`);

  const title = extractTitle(html, src);
  const company = extractCompany(html, src, url);
  const ref = generateRef(company);
  const markdown = htmlToMarkdown(html);

  if (markdown.length < 100) throw new Error(`Content extraction produced too little text (${markdown.length} chars). The site likely requires JavaScript.`);

  // ── Search results page detection ──
  const searchDetection = detectSearchResultsPage(html, markdown, url);
  if (searchDetection) {
    const lines = [
      '',
      '⚠️  PÁGINA DE RESULTADOS DE BÚSQUEDA DETECTADA',
      '',
      'La URL provista es una página de listado/búsqueda, no un aviso individual.',
      'El pipeline necesita una URL directa al aviso específico.',
      '',
      'Señales detectadas:',
      ...searchDetection.signals.map(s => `  • ${s}`),
    ];
    if (searchDetection.suggestedUrls.length > 0) {
      lines.push('', 'URLs de avisos individuales encontradas en esta página:');
      searchDetection.suggestedUrls.slice(0, 5).forEach((u, i) => {
        lines.push(`  ${i + 1}. ${u}`);
      });
      lines.push('', 'Volvé a ejecutar Hermes con una de estas URLs.');
    } else {
      lines.push('', 'Buscá el aviso individual y copiá su URL específica.');
    }
    lines.push('');
    const err = new Error(lines.join('\n'));
    err.code = 'SEARCH_RESULTS_PAGE';
    err.searchDetection = searchDetection;
    throw err;
  }

  return { ref, company, title, markdown, sections: extractSections(markdown), source: src, url };
}

module.exports = { scrapeJD, detectSource, generateRef, htmlToMarkdown, extractSections, detectSearchResultsPage };
