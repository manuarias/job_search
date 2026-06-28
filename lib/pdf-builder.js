/**
 * PDF Builder — Structured Data Direct to HTML
 *
 * Six pure render functions that consume typed CV data and produce HTML fragments.
 * Plus the orchestrator (`pdfBuilder`) that assembles them into a PDF via Playwright.
 * No Markdown parsing. No DOM manipulation.
 *
 * CJS module — consumed via `require('./lib/pdf-builder')`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { selectAchievements, reorderSkills } = require('./assembler');

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS and rendering errors.
 * Pure function: string in → safe string out.
 *
 * @param {string} text - Raw text that may contain HTML special chars.
 * @returns {string} Escaped text safe for HTML embedding.
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format a YYYY-MM date string to "Mon YYYY" (e.g. "2023-01" → "Jan 2023").
 * Returns the input unchanged if it doesn't match YYYY-MM or is "Present".
 *
 * @param {string} dateStr - Date in YYYY-MM format or "Present".
 * @returns {string} Human-readable date string.
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Present') return dateStr || '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})$/);
  if (!match) return dateStr;
  const monthIdx = parseInt(match[2], 10) - 1;
  const month = MONTH_NAMES[monthIdx];
  if (!month) return dateStr;
  return `${month} ${match[1]}`;
}

/**
 * Format a start→end date range.
 * @param {{ start: string, end: string }} dates
 * @returns {string} e.g. "Jan 2023 – Nov 2025" or "Jan 2023 – Present"
 */
function formatDateRange(dates) {
  if (!dates) return '';
  const start = formatDate(dates.start);
  const end = formatDate(dates.end);
  return `${start} \u2013 ${end}`;
}

// ── Section Renderers ─────────────────────────────────────────────────────────

/**
 * Render the CV header section.
 *
 * @param {object} contact - Contact object from cv_{lang}.json.
 * @param {string} contact.name - Full name.
 * @param {string[]} contact.titles - Job title strings.
 * @param {string} [contact.location] - City, country.
 * @param {string} [contact.phone] - Phone number.
 * @param {string} [contact.email] - Email address.
 * @param {string} [contact.linkedin] - LinkedIn URL.
 * @returns {string} HTML fragment for the <header> section. Empty string if no name.
 */
function renderHeader(contact) {
  if (!contact || !contact.name) return '';

  const parts = [];

  // Name
  parts.push(`<h1>${escapeHtml(contact.name)}</h1>`);

  // Titles
  if (contact.titles && contact.titles.length > 0) {
    parts.push(`<p class="cv-titles">${escapeHtml(contact.titles.join(' | '))}</p>`);
  }

  // Contact line: location · phone · email · linkedin
  const contactItems = [];
  if (contact.location) contactItems.push(escapeHtml(contact.location));
  if (contact.phone) contactItems.push(escapeHtml(contact.phone));
  if (contact.email) {
    contactItems.push(
      `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>`
    );
  }
  if (contact.linkedin) {
    contactItems.push(
      `<a href="${escapeHtml(contact.linkedin)}">LinkedIn</a>`
    );
  }

  if (contactItems.length > 0) {
    parts.push(`<p class="cv-contact">${contactItems.join(' \u00B7 ')}</p>`);
  }

  return parts.join('\n');
}

/**
 * Render the Professional Summary section.
 *
 * @param {Array<{text: string, tags?: string[]}>} items - Summary items.
 * @returns {string} HTML <ul> fragment. Empty string for empty input.
 */
function renderSummary(items) {
  if (!items || items.length === 0) return '';

  const maxItems = items.slice(0, 3);
  const listItems = maxItems
    .map(item => `  <li>${escapeHtml(item.text)}</li>`)
    .join('\n');

  return `<ul>\n${listItems}\n</ul>`;
}

/**
 * Render the Core Competencies section.
 *
 * @param {Array<{title: string, description: string, tags?: string[]}>} items - Competency items.
 * @returns {string} HTML <ul> fragment. Empty string for empty input.
 */
function renderCompetencies(items) {
  if (!items || items.length === 0) return '';

  const maxItems = items.slice(0, 4);
  const listItems = maxItems
    .map(item => {
      const strongTitle = `<strong>${escapeHtml(item.title)}</strong>`;
      return `  <li>${strongTitle}: ${escapeHtml(item.description)}</li>`;
    })
    .join('\n');

  return `<ul>\n${listItems}\n</ul>`;
}

/**
 * Render the Core Skills section, optionally reordered by JD keyword match.
 *
 * @param {Array<{category: string, items: string[]}>} skills - Categorized skill groups.
 * @param {object} [hkDetails] - Hard keyword details from matchResult (optional).
 * @param {string[]} [hkDetails.matched] - Matched JD keywords.
 * @param {string[]} [hkDetails.missed] - Missed JD keywords.
 * @returns {string} HTML fragment with one <ul> per category. Empty string for empty input.
 */
function renderSkills(skills, hkDetails) {
  if (!skills || skills.length === 0) return '';

  let orderedSkills;

  if (hkDetails && (hkDetails.matched || hkDetails.missed)) {
    const jdKeywords = [
      ...(hkDetails.matched || []),
      ...(hkDetails.missed || []),
    ];
    orderedSkills = reorderSkills(skills, jdKeywords);
  } else {
    orderedSkills = skills;
  }

  const parts = [];
  for (const cat of orderedSkills) {
    if (!cat.items || cat.items.length === 0) continue;
    parts.push(`<p><strong>${escapeHtml(cat.category)}</strong></p>`);
    const listItems = cat.items
      .map(item => `  <li>${escapeHtml(item)}</li>`)
      .join('\n');
    parts.push(`<ul>\n${listItems}\n</ul>`);
  }

  return parts.join('\n');
}

/**
 * Render the Professional Experience section.
 *
 * Uses `selectAchievements()` from assembler.js to rank and limit achievements
 * when match data is available. Falls back to impact-descending order otherwise.
 *
 * @param {Array<object>} experiences - Primary professional experience entries.
 * @param {Array<object>} [earlierExperience] - Simplified earlier career entries.
 * @param {object} [matchResult] - F6 match result for achievement ranking (optional).
 * @param {object} [opts] - Options.
 * @param {number} [opts.maxAchievementsPerRole=4] - Max achievements per role.
 * @returns {string} HTML fragment with job headers and achievement lists.
 */
function renderExperience(experiences, earlierExperience, matchResult, opts) {
  if (!experiences || experiences.length === 0) return '';

  const maxPerRole = (opts && opts.maxAchievementsPerRole) || 4;
  let jdHardKeywords = [];
  let jdDomains = [];

  if (matchResult && matchResult.scorers) {
    const hk = matchResult.scorers.hardKeywords;
    if (hk && hk.details) {
      jdHardKeywords = [
        ...(hk.details.matched || []),
        ...(hk.details.missed || []),
      ];
    }
    const dm = matchResult.scorers.domainMatch;
    if (dm && dm.details) {
      jdDomains = dm.details.jdDomains || [];
    }
  }

  const parts = [];

  // Primary experience
  for (const exp of experiences) {
    // Job header
    const jobInfoParts = [];
    jobInfoParts.push(escapeHtml(exp.role));
    if (exp.location) jobInfoParts.push(escapeHtml(exp.location));

    const dateRange = formatDateRange(exp.dates);

    parts.push('<div class="job-header">');
    parts.push(`  <span class="company">${escapeHtml(exp.company)}</span>`);
    parts.push(`  <span class="job-info">${jobInfoParts.join(' | ')}</span>`);
    if (dateRange) {
      parts.push(`  <span class="dates">${escapeHtml(dateRange)}</span>`);
    }
    parts.push('</div>');

    // Role description (optional)
    if (exp.description) {
      parts.push(`<p class="job-description">${escapeHtml(exp.description)}</p>`);
    }

    // Achievements
    if (exp.achievements && exp.achievements.length > 0) {
      let selected;
      if (jdHardKeywords.length > 0 || jdDomains.length > 0) {
        selected = selectAchievements(exp.achievements, maxPerRole, jdHardKeywords, jdDomains);
      } else {
        // Fallback: impact-descending, capped at maxPerRole
        selected = [...exp.achievements]
          .sort((a, b) => {
            const impactOrder = { high: 3, medium: 2, low: 1 };
            return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
          })
          .slice(0, maxPerRole)
          .map(ach => ({ ach }));
      }

      if (selected.length > 0) {
        parts.push('<ul>');
        for (const { ach } of selected) {
          parts.push(`  <li>${escapeHtml(ach.text)}</li>`);
        }
        parts.push('</ul>');
      }
    }
  }

  // Earlier experience (compact)
  if (earlierExperience && earlierExperience.length > 0) {
    parts.push('<div class="earlier-experience">');
    parts.push('<p><strong>Earlier Career</strong></p>');
    parts.push('<ul>');
    for (const ee of earlierExperience) {
      const dateRange = formatDateRange(ee.dates);
      const line = [
        escapeHtml(ee.role),
        escapeHtml(ee.company),
      ];
      if (dateRange) line.push(escapeHtml(dateRange));
      parts.push(`  <li>${line.join(' \u2014 ')}</li>`);
    }
    parts.push('</ul>');
    parts.push('</div>');
  }

  return parts.join('\n');
}

/**
 * Render the Education section, plus optional certifications and languages.
 *
 * @param {Array<{degree: string, institution: string, year?: string}>} edu - Education entries.
 * @param {Array<{name: string, issuer?: string, year?: string}>} [certs] - Certifications.
 * @param {Array<{language: string, proficiency: string}>} [langs] - Language proficiencies.
 * @returns {string} HTML fragment. Empty string if all inputs are empty.
 */
function renderEducation(edu, certs, langs) {
  const parts = [];

  // Education
  if (edu && edu.length > 0) {
    const eduItems = edu
      .map(e => {
        const line = `${escapeHtml(e.degree)} \u2014 ${escapeHtml(e.institution)}`;
        return `  <li>${line}</li>`;
      })
      .join('\n');
    parts.push(`<ul>\n${eduItems}\n</ul>`);
  }

  // Certifications
  if (certs && certs.length > 0) {
    parts.push('<p><strong>Certifications</strong></p>');
    const certItems = certs
      .map(c => {
        let line = escapeHtml(c.name);
        if (c.issuer) line += ` \u2014 ${escapeHtml(c.issuer)}`;
        return `  <li>${line}</li>`;
      })
      .join('\n');
    parts.push(`<ul>\n${certItems}\n</ul>`);
  }

  // Languages
  if (langs && langs.length > 0) {
    parts.push('<p><strong>Languages</strong></p>');
    const langItems = langs
      .map(l => {
        return `  <li>${escapeHtml(l.language)} \u2014 ${escapeHtml(l.proficiency)}</li>`;
      })
      .join('\n');
    parts.push(`<ul>\n${langItems}\n</ul>`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

/**
 * Render extra sections: earlier experience, certifications, and languages.
 *
 * Each non-empty section is wrapped in `<section class="extra-section">` with an
 * `<h2>` heading. Returns empty string when all inputs are empty.
 *
 * @param {Array<object>} [earlierExp] - Simplified earlier career entries.
 * @param {Array<object>} [certs] - Certification entries { name, issuer?, year? }.
 * @param {Array<object>} [langs] - Language entries { language, proficiency }.
 * @returns {string} HTML fragment for {{extra_sections}}.
 */
function renderExtraSections(earlierExp, certs, langs) {
  const parts = [];

  // Earlier experience
  if (earlierExp && earlierExp.length > 0) {
    parts.push('<section class="extra-section">');
    parts.push('<h2>Earlier Career</h2>');
    parts.push('<ul>');
    for (const ee of earlierExp) {
      const dateRange = formatDateRange(ee.dates);
      const line = [
        escapeHtml(ee.role),
        escapeHtml(ee.company),
      ];
      if (dateRange) line.push(escapeHtml(dateRange));
      parts.push(`  <li>${line.join(' \u2014 ')}</li>`);
    }
    parts.push('</ul>');
    parts.push('</section>');
  }

  // Certifications
  if (certs && certs.length > 0) {
    parts.push('<section class="extra-section">');
    parts.push('<h2>Certifications</h2>');
    parts.push('<ul>');
    for (const c of certs) {
      let line = escapeHtml(c.name);
      if (c.issuer) line += ` \u2014 ${escapeHtml(c.issuer)}`;
      if (c.year) line += ` (${escapeHtml(String(c.year))})`;
      parts.push(`  <li>${line}</li>`);
    }
    parts.push('</ul>');
    parts.push('</section>');
  }

  // Languages
  if (langs && langs.length > 0) {
    parts.push('<section class="extra-section">');
    parts.push('<h2>Languages</h2>');
    parts.push('<ul>');
    for (const l of langs) {
      parts.push(`  <li>${escapeHtml(l.language)} \u2014 ${escapeHtml(l.proficiency)}</li>`);
    }
    parts.push('</ul>');
    parts.push('</section>');
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

// ── PDF Orchestrator ──────────────────────────────────────────────────────────

/**
 * Build a full A4 PDF CV from structured data.
 *
 * Loads the HTML template, replaces all {{placeholder}} tokens with renderer
 * output, writes intermediate HTML alongside the PDF, then renders via Playwright
 * headless Chromium.
 *
 * @param {object} cvData - Structured CV data (matching cv.schema.json).
 * @param {object} [matchResult] - F6 match result for achievement/skill ranking.
 * @param {string} outputPath - Absolute path for the output PDF.
 * @returns {Promise<void>}
 */
async function pdfBuilder(cvData, matchResult, outputPath) {
  if (!cvData || !cvData.contact) {
    throw new Error('Missing CV data: contact information is required');
  }

  // Load HTML template
  const templatePath = path.join(__dirname, '..', 'pdf-builder', 'cv-template.html');
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (e) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  // Build contact line for template
  const contactItems = [];
  if (cvData.contact.location) contactItems.push(escapeHtml(cvData.contact.location));
  if (cvData.contact.phone) contactItems.push(escapeHtml(cvData.contact.phone));
  if (cvData.contact.email) {
    contactItems.push(
      `<a href="mailto:${escapeHtml(cvData.contact.email)}">${escapeHtml(cvData.contact.email)}</a>`
    );
  }
  if (cvData.contact.linkedin) {
    contactItems.push(
      `<a href="${escapeHtml(cvData.contact.linkedin)}">LinkedIn</a>`
    );
  }

  // Resolve match details for skill/achievement reordering
  const hkDetails =
    matchResult && matchResult.scorers && matchResult.scorers.hardKeywords
      ? matchResult.scorers.hardKeywords.details
      : null;

  // Render sections
  // Note: earlierExperience, certs, and langs are routed to extra_sections
  // so the main experience and education sections stay focused.
  const replacements = {
    '{{candidate_name}}': escapeHtml(cvData.contact.name || ''),
    '{{candidate_titles}}': escapeHtml((cvData.contact.titles || []).join(' | ')),
    '{{candidate_contact}}': contactItems.join(' \u00B7 '),
    '{{professional_summary}}': renderSummary(cvData.professionalSummary || []),
    '{{core_competencies}}': renderCompetencies(cvData.coreCompetencies || []),
    '{{core_skills}}': renderSkills(cvData.skills || [], hkDetails),
    '{{professional_experience}}': renderExperience(
      cvData.professionalExperience || [], null, matchResult
    ),
    '{{education}}': renderEducation(cvData.education || [], null, null),
    '{{extra_sections}}': renderExtraSections(
      cvData.earlierExperience || [], cvData.certifications || [], cvData.languages || []
    ),
  };

  // Replace placeholders
  let html = template;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    html = html.split(placeholder).join(replacement);
  }

  // Write intermediate HTML for debugging
  const htmlPath = outputPath.replace(/\.pdf$/i, '.html');
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');

  // Render PDF via Playwright
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
    });
  } catch (e) {
    throw new Error(`Playwright error: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
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
  pdfBuilder,
};
