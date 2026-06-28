#!/usr/bin/env node

/** @deprecated Use scripts/build-pdf.js + lib/pdf-builder.js instead. Kept as reference. */

/**
 * CV PDF Builder (DEPRECATED)
 * 
 * Convierte un CV en Markdown a PDF profesional.
 * Uso: node build-cv.js <input.md> <output.pdf>
 * 
 * Ejemplo:
 *   node build-cv.js ../applications/AGIL/arias_emanuel-en-AGIL.md ../applications/AGIL/arias_emanuel-en-AGIL.pdf
 */

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const { chromium } = require('playwright');

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

const TEMPLATE_PATH = path.join(__dirname, 'cv-template.html');
const md = new MarkdownIt({
  html: true,        // Permitir HTML inline
  breaks: false,     // No convertir \n a <br>
  linkify: true      // Auto-detectar URLs
});

// ==========================================================
// UTILIDADES
// ==========================================================

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// ==========================================================
// PARSEO DEL MARKDOWN
// ==========================================================

/**
 * Extrae las secciones principales del CV en Markdown.
 * Devuelve un objeto con cada sección como string raw (sin procesar).
 */
function extractSections(mdContent) {
  const lines = mdContent.split('\n');
  const sections = {
    header: [],           // Líneas antes del primer ##
    summary: [],
    competencies: [],
    skills: [],
    experience: [],
    education: [],
    extra: []             // Cualquier otra sección
  };

  let currentSection = 'header';

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Detectar inicio de secciones conocidas
    if (line.match(/^##\s+PROFESSIONAL\s+SUMMARY/i)) {
      currentSection = 'summary';
      continue;
    }
    if (line.match(/^##\s+CORE\s+COMPETENCIES/i)) {
      currentSection = 'competencies';
      continue;
    }
    if (line.match(/^##\s+CORE\s+SKILLS/i)) {
      currentSection = 'skills';
      continue;
    }
    if (line.match(/^##\s+PROFESSIONAL\s+EXPERIENCE/i)) {
      currentSection = 'experience';
      continue;
    }
    if (line.match(/^##\s+EDUCATION/i)) {
      currentSection = 'education';
      continue;
    }
    // Detectar cualquier otra sección (## Projects, ## Achievements, etc.)
    if (line.match(/^##\s/)) {
      currentSection = 'extra';
      // Guardar el título también
      sections.extra.push(line);
      continue;
    }

    // Ignorar líneas divisorias (---)
    if (line === '---') continue;

    // Agregar línea a la sección actual
    if (currentSection && line !== '' || sections[currentSection].length > 0) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

/**
 * Extrae datos del header desde las primeras líneas del MD.
 * Soporta code blocks y múltiples líneas de contacto.
 */
function parseHeader(headerLines) {
  // Filtrar líneas vacías y code blocks
  const lines = headerLines
    .map(l => l.trimEnd())
    .filter(l => {
      const t = l.trim();
      return t !== '' && t !== '```' && !t.startsWith('```');
    });
  
  const name = lines[0]?.replace(/^#\s*/, '')?.trim() || '{{candidate_name}}';
  const titles = lines[1]?.trim() || '{{candidate_titles}}';
  
  // Construir contacto desde las líneas restantes
  const contactParts = [];
  for (let i = 2; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '---' || l.match(/^##\s/)) break;
    if (l === '```' || l.startsWith('```')) continue;
    contactParts.push(l.replace(/^LinkedIn:\s*/, ''));
  }
  
  let contact = contactParts.join(' | ').replace(/\|?\s*LinkedIn:\s*/g, ' | ');
  if (!contact) contact = '{{candidate_contact}}';

  return { name, titles, contact };
}

/**
 * Convierte una sección simple de Markdown a HTML usando markdown-it.
 */
function renderSimpleSection(sectionLines) {
  const content = sectionLines.join('\n').trim();
  if (!content) return '';
  return md.render(content);
}

// ==========================================================
// EXPERIENCE PARSER (ROBUSTO)
// ==========================================================

function hasDate(str) {
  return /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago|Dic)\s*\d{4}/i.test(str) || 
         /\d{4}\s*[\–\-]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago|Dic)?\s*\d{4}/i.test(str) ||
         /Present/i.test(str);
}

function looksLikeCompany(str) {
  const upper = str.toUpperCase();
  // Heurística: si es todo mayúsculas (con espacios y &), probablemente sea empresa
  return str === upper && str.length > 1 && str.length < 50;
}

function isBullet(line) {
  const t = line.trim();
  // Requerir espacio después del marker para no confundir con **bold**
  return t.match(/^[-*+]\s/) !== null;
}

function extractBullet(line) {
  let bullet = line.trim();
  if (bullet.startsWith('-')) bullet = bullet.substring(1).trim();
  else if (bullet.startsWith('*')) bullet = bullet.substring(1).trim();
  else if (bullet.startsWith('+')) bullet = bullet.substring(1).trim();
  // Convertir **bold** markdown a <strong>bold</strong>
  bullet = bullet.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return bullet;
}

/**
 * Intenta extraer company, jobInfo y dates de una línea en negrita.
 * Soporta formatos combinados como:
 *   **EMPRESA**
 *   **EMPRESA | Ubicación**
 *   **EMPRESA | Ubicación | Rol | Fechas**
 *   **EMPRESA | Rol | Fechas**
 *   **Rol | Fechas**  (sub-rol, sin empresa)
 */
function parseJobHeader(line) {
  // Strip ** y _ envolventes
  let clean = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
  if (clean.startsWith('_')) clean = clean.slice(1);
  if (clean.endsWith('_')) clean = clean.slice(0, -1);
  clean = clean.trim();
  
  const parts = clean.split('|').map(p => p.trim());
  
  let company = '';
  let jobInfo = '';
  let dates = '';
  
  if (parts.length >= 3) {
    // Formato: Empresa | X | Y | ... | Fechas
    if (hasDate(parts[parts.length - 1])) {
      dates = parts[parts.length - 1];
      if (looksLikeCompany(parts[0])) {
        company = parts[0];
        jobInfo = parts.slice(1, -1).join(' | ');
      } else {
        jobInfo = parts.slice(0, -1).join(' | ');
      }
    } else {
      company = parts[0];
      jobInfo = parts.slice(1).join(' | ');
    }
  } else if (parts.length === 2) {
    if (hasDate(parts[1])) {
      dates = parts[1];
      if (looksLikeCompany(parts[0])) {
        company = parts[0];
      } else {
        jobInfo = parts[0];
      }
    } else if (hasDate(parts[0])) {
      dates = parts[0];
      jobInfo = parts[1];
    } else {
      company = parts[0];
      jobInfo = parts[1];
    }
  } else {
    if (looksLikeCompany(clean) && !hasDate(clean)) {
      company = clean;
    } else if (hasDate(clean)) {
      dates = clean;
    } else {
      jobInfo = clean;
    }
  }
  
  return { company, jobInfo, dates };
}

function parseExperience(experienceLines) {
  const lines = experienceLines.map(l => l.trimEnd());
  let html = '';
  let i = 0;
  let lastCompany = '';

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === '') {
      i++;
      continue;
    }

    // Detectar bullets sueltos antes de cualquier header (fallback)
    if (isBullet(line) && !lastCompany) {
      const bullets = [];
      while (i < lines.length && isBullet(lines[i])) {
        bullets.push(extractBullet(lines[i]));
        i++;
      }
      if (bullets.length > 0) {
        html += `      <ul>\n`;
        for (const b of bullets) {
          html += `        <li>${b}</li>\n`;
        }
        html += `      </ul>\n`;
      }
      continue;
    }

    // Detectar EARLIER EXPERIENCE
    if (line.match(/^\*\*EARLIER\s+EXPERIENCE\*\*$/i)) {
      i++;
      while (i < lines.length && lines[i].trim() === '') i++;
      const bullets = [];
      while (i < lines.length && isBullet(lines[i])) {
        bullets.push(extractBullet(lines[i]));
        i++;
      }
      if (bullets.length > 0) {
        html += `      <div class="earlier-experience">\n`;
        html += `        <div class="job-header">\n`;
        html += `          <span class="company">Earlier Experience</span>\n`;
        html += `        </div>\n`;
        html += `        <ul>\n`;
        for (const b of bullets) {
          html += `          <li>${b}</li>\n`;
        }
        html += `        </ul>\n`;
        html += `      </div>\n`;
      }
      continue;
    }

    // Detectar cualquier línea en negrita como posible job header
    const boldMatch = line.match(/^\*\*.+\*\*$/);
    if (boldMatch) {
      let { company, jobInfo, dates } = parseJobHeader(line);
      
      // Si no hay empresa pero sí hay info/fechas, usar última empresa conocida
      const finalCompany = company || lastCompany;
      if (company) lastCompany = company;
      
      i++;
      
      // Saltear líneas vacías
      while (i < lines.length && lines[i].trim() === '') i++;
      
      // Leer jobInfo y dates de líneas siguientes si faltan.
      // Soporta múltiples formatos:
      //   **EMPRESA\nPuesto | Ubicación\nFechas**
      //   **EMPRESA | Ubicación\nPuesto | Fechas**
      function parseJobLine(text) {
        const parts = text.split('|').map(p => p.trim());
        if (parts.length >= 2 && hasDate(parts[parts.length - 1])) {
          return {
            jobInfo: parts.slice(0, -1).join(' | '),
            dates: parts[parts.length - 1]
          };
        }
        return { jobInfo: text, dates: '' };
      }
      
      // Si no tenemos fechas, buscar en la siguiente línea
      if (!dates) {
        if (i < lines.length && !isBullet(lines[i]) && !lines[i].trim().match(/^\*\*/)) {
          const nextLine = lines[i].trim();
          const parsed = parseJobLine(nextLine);
          if (parsed.dates) {
            dates = parsed.dates;
            if (parsed.jobInfo) {
              // Combinar con jobInfo existente (ej: ubicación del header + puesto de la siguiente línea)
              jobInfo = jobInfo ? parsed.jobInfo + ' | ' + jobInfo : parsed.jobInfo;
            }
            i++;
            while (i < lines.length && lines[i].trim() === '') i++;
          }
        }
      }
      
      // Si todavía no tenemos jobInfo, leer la siguiente línea
      if (!jobInfo) {
        if (i < lines.length && !isBullet(lines[i]) && !lines[i].trim().match(/^\*\*/)) {
          const nextLine = lines[i].trim();
          if (!hasDate(nextLine)) {
            jobInfo = nextLine;
            i++;
            while (i < lines.length && lines[i].trim() === '') i++;
          }
        }
      }
      
      // Último intento por si las fechas quedaron en una línea suelta
      if (!dates) {
        if (i < lines.length && !isBullet(lines[i]) && !lines[i].trim().match(/^\*\*/)) {
          const nextLine = lines[i].trim();
          if (hasDate(nextLine)) {
            dates = nextLine;
            i++;
            while (i < lines.length && lines[i].trim() === '') i++;
          }
        }
      }
      
      // Leer descripción opcional (texto plano o itálica, no bullet, no bold)
      let description = '';
      if (i < lines.length && !isBullet(lines[i]) && !lines[i].trim().match(/^\*\*/)) {
        let desc = lines[i].trim();
        if (desc.startsWith('_')) desc = desc.slice(1);
        if (desc.endsWith('_')) desc = desc.slice(0, -1);
        description = desc;
        i++;
      }
      
      // Saltear líneas vacías antes de bullets
      while (i < lines.length && lines[i].trim() === '') i++;
      
      // Leer bullets
      const bullets = [];
      while (i < lines.length && isBullet(lines[i])) {
        bullets.push(extractBullet(lines[i]));
        i++;
      }
      
      // Renderizar
      if (finalCompany || jobInfo || dates) {
        html += `      <div class="job-header">\n`;
        if (finalCompany) html += `        <span class="company">${escapeHtml(finalCompany)}</span>\n`;
        if (jobInfo) html += `        <span class="job-info">${escapeHtml(jobInfo)}</span>\n`;
        if (dates) html += `        <span class="dates">${escapeHtml(dates)}</span>\n`;
        html += `      </div>\n`;
      }
      
      if (description) {
        html += `      <p class="job-description">${escapeHtml(description)}</p>\n`;
      }
      
      if (bullets.length > 0) {
        html += `      <ul>\n`;
        for (const b of bullets) {
          html += `        <li>${b}</li>\n`;
        }
        html += `      </ul>\n`;
      }
      
      continue;
    }

    // Si llegamos acá, es una línea que no reconocemos — la salteamos
    i++;
  }

  return html;
}

/**
 * Escapa caracteres HTML para prevenir XSS/errores de renderizado.
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================
// ORQUESTADOR PRINCIPAL
// ==========================================================

async function buildCV(inputPath, outputPath) {
  console.log(`📄 Leyendo CV: ${inputPath}`);
  const mdContent = readFile(inputPath);

  console.log('🔍 Extrayendo secciones...');
  const sections = extractSections(mdContent);

  // 1. Parsear Header
  const header = parseHeader(sections.header);
  console.log(`   ✓ Nombre: ${header.name}`);

  // 2. Renderizar secciones simples (usando markdown-it)
  const summaryHtml = renderSimpleSection(sections.summary);
  const competenciesHtml = renderSimpleSection(sections.competencies);
  const skillsHtml = renderSimpleSection(sections.skills);
  const educationHtml = renderSimpleSection(sections.education);

  // 3. Parsear experiencia profesional (custom, no markdown-it)
  console.log('   ✓ Parseando experiencia profesional...');
  const experienceHtml = parseExperience(sections.experience);

  // 4. Renderizar secciones extra (si existen)
  let extraHtml = '';
  if (sections.extra.length > 0) {
    const extraContent = sections.extra.join('\n').trim();
    if (extraContent) {
      extraHtml = `<section class="extra-section">\n${md.render(extraContent)}\n</section>`;
    }
  }

  // 5. Leer template y reemplazar placeholders
  console.log('🎨 Aplicando template...');
  let template = readFile(TEMPLATE_PATH);

  template = template.replace(/{{candidate_name}}/g, escapeHtml(header.name));
  template = template.replace(/{{candidate_titles}}/g, escapeHtml(header.titles));
  template = template.replace(/{{candidate_contact}}/g, escapeHtml(header.contact));
  template = template.replace(/{{professional_summary}}/g, summaryHtml);
  template = template.replace(/{{core_competencies}}/g, competenciesHtml);
  template = template.replace(/{{core_skills}}/g, skillsHtml);
  template = template.replace(/{{professional_experience}}/g, experienceHtml);
  template = template.replace(/{{education}}/g, educationHtml);
  template = template.replace(/{{extra_sections}}/g, extraHtml);

  // 6. Guardar HTML intermedio (para debug)
  const htmlPath = outputPath.replace('.pdf', '.html');
  writeFile(htmlPath, template);
  console.log(`   💾 HTML intermedio: ${htmlPath}`);

  // 7. Generar PDF con Playwright
  console.log('🚀 Generando PDF con Playwright...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(template, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();

  console.log(`✅ PDF generado: ${outputPath}`);
  console.log('');
  console.log('🎯 Listo para enviar a la empresa!');
}

// ==========================================================
// ENTRYPOINT
// ==========================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Uso incorrecto.');
    console.error('');
    console.error('   node build-cv.js <input.md> <output.pdf>');
    console.error('');
    console.error('Ejemplo:');
    console.error('   node build-cv.js ../applications/AGIL/arias_emanuel-en-AGIL.md ./output/cv-agil.pdf');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  try {
    await buildCV(inputPath, outputPath);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Only run main() when called directly (node build-cv.js), not when required for tests
if (require.main === module) {
  main();
}

// ==========================================================
// EXPORTS (para testing)
// ==========================================================

module.exports = {
  extractSections,
  parseHeader,
  parseExperience,
  parseJobHeader,
  isBullet,
  extractBullet,
  hasDate,
  looksLikeCompany,
  renderSimpleSection,
  readFile,
  writeFile,
  escapeHtml,
  buildCV
};
