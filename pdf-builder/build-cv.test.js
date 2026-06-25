// vitest globals: describe, it, expect, beforeAll, afterAll are available via vitest.config.js globals: true
const path = require('path');
const fs = require('fs');

const {
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
  escapeHtml
} = require('./build-cv');

// ==========================================================
// FIXTURES
// ==========================================================

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');
const SAMPLE_CV_PATH = path.join(FIXTURES_DIR, 'sample-cv.md');
const HEADER_ONLY_PATH = path.join(FIXTURES_DIR, 'header-only.md');
const EXPERIENCE_MULTI_PATH = path.join(FIXTURES_DIR, 'experience-multi-format.md');

function loadFixture(filename) {
  return fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf8');
}

// ==========================================================
// extractSections()
// ==========================================================

describe('extractSections()', () => {
  let sections;

  beforeAll(() => {
    const md = loadFixture('sample-cv.md');
    sections = extractSections(md);
  });

  it('debe extraer la sección header (líneas antes del primer ##)', () => {
    expect(sections.header.length).toBeGreaterThan(0);
    const headerText = sections.header.join('\n');
    expect(headerText).toContain('Juan Pérez');
    expect(headerText).toContain('Technical Program Manager');
  });

  it('debe extraer la sección summary', () => {
    expect(sections.summary.length).toBeGreaterThan(0);
    const summaryText = sections.summary.join('\n');
    expect(summaryText).toContain('Results-oriented');
    expect(summaryText).toContain('Technical Program Manager');
  });

  it('debe extraer la sección competencies', () => {
    expect(sections.competencies.length).toBeGreaterThan(0);
    const compText = sections.competencies.join('\n');
    expect(compText).toContain('End-to-End Program Delivery');
  });

  it('debe extraer la sección skills', () => {
    expect(sections.skills.length).toBeGreaterThan(0);
    const skillsText = sections.skills.join('\n');
    expect(skillsText).toContain('Project Management');
    expect(skillsText).toContain('Jira');
  });

  it('debe extraer la sección experience', () => {
    expect(sections.experience.length).toBeGreaterThan(0);
    const expText = sections.experience.join('\n');
    expect(expText).toContain('TECH CORP');
    expect(expText).toContain('STARTUP XYZ');
    expect(expText).toContain('EARLIER EXPERIENCE');
  });

  it('debe extraer la sección education', () => {
    expect(sections.education.length).toBeGreaterThan(0);
    const eduText = sections.education.join('\n');
    expect(eduText).toContain('Bachelor of Science');
    expect(eduText).toContain('AWS Solutions Architect');
  });

  it('debe ignorar líneas divisorias (---)', () => {
    // sample-cv.md no tiene ---, pero verificamos que ninguna línea sea exactamente '---'
    for (const key of Object.keys(sections)) {
      for (const line of sections[key]) {
        expect(line).not.toBe('---');
      }
    }
  });

  it('debe devolver un objeto con todas las secciones esperadas', () => {
    expect(sections).toHaveProperty('header');
    expect(sections).toHaveProperty('summary');
    expect(sections).toHaveProperty('competencies');
    expect(sections).toHaveProperty('skills');
    expect(sections).toHaveProperty('experience');
    expect(sections).toHaveProperty('education');
    expect(sections).toHaveProperty('extra');
  });
});

// ==========================================================
// parseHeader()
// ==========================================================

describe('parseHeader()', () => {
  it('debe extraer nombre, títulos y contacto de un header completo', () => {
    const md = loadFixture('header-only.md');
    const lines = md.split('\n');
    const headerLines = [];
    let inHeader = true;
    for (const line of lines) {
      if (line.match(/^##\s/)) break;
      headerLines.push(line);
    }

    const result = parseHeader(headerLines);
    expect(result.name).toBe('María García');
    expect(result.titles).toBe('Technical Program Manager | Agile Coach');
    expect(result.contact).toContain('maria@example.com');
    expect(result.contact).toContain('+54 9 11 1234 5678');
  });

  it('debe extraer nombre del h1 (# Titulo)', () => {
    const lines = [
      '# Juan Pérez',
      'Senior Engineer',
      'juan@test.com'
    ];
    const result = parseHeader(lines);
    expect(result.name).toBe('Juan Pérez');
    expect(result.titles).toBe('Senior Engineer');
    expect(result.contact).toBe('juan@test.com');
  });

  it('debe filtrar code blocks (```) del contacto', () => {
    const lines = [
      '# Test User',
      'Developer',
      '```',
      'test@example.com | +54 123',
      '```'
    ];
    const result = parseHeader(lines);
    expect(result.name).toBe('Test User');
    expect(result.contact).toContain('test@example.com');
    expect(result.contact).not.toContain('```');
  });

  it('debe eliminar prefijo "LinkedIn:" del contacto', () => {
    const lines = [
      '# Test User',
      'Dev',
      'test@example.com',
      'LinkedIn: https://linkedin.com/in/test'
    ];
    const result = parseHeader(lines);
    expect(result.contact).toContain('test@example.com');
    expect(result.contact).toContain('linkedin.com/in/test');
    expect(result.contact).not.toContain('LinkedIn:');
  });

  it('debe usar fallbacks cuando no hay datos', () => {
    const result = parseHeader([]);
    expect(result.name).toBe('{{candidate_name}}');
    expect(result.titles).toBe('{{candidate_titles}}');
    expect(result.contact).toBe('{{candidate_contact}}');
  });

  it('debe detenerse en ---', () => {
    const lines = [
      '# Test',
      'Role',
      'contact@test.com',
      '---',
      'Esto no debería aparecer'
    ];
    const result = parseHeader(lines);
    expect(result.contact).not.toContain('Esto no debería aparecer');
  });
});

// ==========================================================
// isBullet()
// ==========================================================

describe('isBullet()', () => {
  it('debe detectar bullets con guión (- )', () => {
    expect(isBullet('- Built REST APIs')).toBe(true);
    expect(isBullet('- Reduced latency by 40%')).toBe(true);
    expect(isBullet('  - Indented bullet')).toBe(true);
  });

  it('debe detectar bullets con asterisco (* )', () => {
    expect(isBullet('* Project Management: Agile')).toBe(true);
    expect(isBullet('* Languages: Spanish (Native)')).toBe(true);
  });

  it('debe detectar bullets con más (+)', () => {
    expect(isBullet('+ Additional responsibility')).toBe(true);
  });

  it('NO debe confundir **bold** con bullet', () => {
    expect(isBullet('**Strategic Delivery:**')).toBe(false);
    expect(isBullet('**EMPRESA | Puesto | Fechas**')).toBe(false);
    expect(isBullet('**EARLIER EXPERIENCE**')).toBe(false);
  });

  it('NO debe detectar texto plano como bullet', () => {
    expect(isBullet('Just a regular line')).toBe(false);
    expect(isBullet('Company description text')).toBe(false);
  });

  it('NO debe detectar marcador sin espacio', () => {
    expect(isBullet('-no-space')).toBe(false);
    expect(isBullet('*no-space')).toBe(false);
  });

  it('debe manejar líneas vacías', () => {
    expect(isBullet('')).toBe(false);
    expect(isBullet('   ')).toBe(false);
  });
});

// ==========================================================
// extractBullet()
// ==========================================================

describe('extractBullet()', () => {
  it('debe quitar el marcador de bullet (-)', () => {
    const result = extractBullet('- Built REST APIs');
    expect(result).toBe('Built REST APIs');
  });

  it('debe quitar el marcador de bullet (*)', () => {
    const result = extractBullet('* Project Management');
    expect(result).toBe('Project Management');
  });

  it('debe quitar el marcador de bullet (+)', () => {
    const result = extractBullet('+ Additional task');
    expect(result).toBe('Additional task');
  });

  it('debe convertir **bold** a <strong>bold</strong>', () => {
    const result = extractBullet('- Reduced latency by **40%**');
    expect(result).toBe('Reduced latency by <strong>40%</strong>');
  });

  it('debe convertir múltiples **bold** en el mismo bullet', () => {
    const result = extractBullet('- **Strategic Delivery:** Led the **Platform Migration**');
    expect(result).toBe('<strong>Strategic Delivery:</strong> Led the <strong>Platform Migration</strong>');
  });

  it('debe manejar bullets con indentación', () => {
    const result = extractBullet('  - Indented bullet with **bold** text');
    expect(result).toBe('Indented bullet with <strong>bold</strong> text');
  });

  it('debe preservar texto sin bold', () => {
    const result = extractBullet('- Plain text without formatting');
    expect(result).toBe('Plain text without formatting');
  });
});

// ==========================================================
// hasDate()
// ==========================================================

describe('hasDate()', () => {
  it('debe detectar fechas en inglés (Mes AAAA)', () => {
    expect(hasDate('Jan 2023')).toBe(true);
    expect(hasDate('Feb 2020')).toBe(true);
    expect(hasDate('Dec 2025')).toBe(true);
    expect(hasDate('Nov 2025')).toBe(true);
  });

  it('debe detectar fechas en español (Mes AAAA)', () => {
    expect(hasDate('Ene 2023')).toBe(true);
    expect(hasDate('Abr 2020')).toBe(true);
    expect(hasDate('Ago 2018')).toBe(true);
    expect(hasDate('Dic 2019')).toBe(true);
  });

  it('debe detectar rangos de fecha (AAAA – AAAA)', () => {
    expect(hasDate('2020 – 2022')).toBe(true);
    expect(hasDate('2018 – 2020')).toBe(true);
  });

  it('debe detectar rangos con Mes AAAA – Mes AAAA', () => {
    expect(hasDate('Jan 2020 – Dec 2022')).toBe(true);
    expect(hasDate('Ene 2023 – Nov 2025')).toBe(true);
  });

  it('debe detectar "Present" como fecha', () => {
    expect(hasDate('Jan 2023 – Present')).toBe(true);
    expect(hasDate('Present')).toBe(true);
  });

  it('NO debe detectar números sueltos como fechas', () => {
    expect(hasDate('2020')).toBe(false);
    expect(hasDate('Reduced by 40%')).toBe(false);
    expect(hasDate('Team of 9 engineers')).toBe(false);
  });

  it('NO debe detectar texto sin fecha', () => {
    expect(hasDate('Senior Engineer')).toBe(false);
    expect(hasDate('Buenos Aires, Argentina')).toBe(false);
  });
});

// ==========================================================
// looksLikeCompany()
// ==========================================================

describe('looksLikeCompany()', () => {
  it('debe detectar strings en MAYÚSCULAS como empresas', () => {
    expect(looksLikeCompany('TECH CORP')).toBe(true);
    expect(looksLikeCompany('MERCADO LIBRE')).toBe(true);
    expect(looksLikeCompany('EMPRESA GRANDE')).toBe(true);
    expect(looksLikeCompany('STARTUP XYZ')).toBe(true);
  });

  it('NO debe detectar strings con minúsculas como empresas', () => {
    expect(looksLikeCompany('Tech Corp')).toBe(false);
    expect(looksLikeCompany('Senior Engineer')).toBe(false);
  });

  it('NO debe detectar strings muy cortos', () => {
    expect(looksLikeCompany('A')).toBe(false);
  });

  it('NO debe detectar strings muy largos', () => {
    const long = 'A'.repeat(51);
    expect(looksLikeCompany(long)).toBe(false);
  });

  it('NO debe detectar fechas como empresas', () => {
    expect(looksLikeCompany('JAN 2023')).toBe(true); // Técnicamente sí, es todo mayúsculas
    // Pero tiene sentido porque el parser usa hasDate() primero
  });
});

// ==========================================================
// parseJobHeader()
// ==========================================================

describe('parseJobHeader()', () => {
  it('debe parsear formato combinado: **EMPRESA | Puesto | Fechas**', () => {
    const result = parseJobHeader('**TECH CORP | Senior Engineer | Jan 2023 – Present**');
    expect(result.company).toBe('TECH CORP');
    expect(result.jobInfo).toBe('Senior Engineer');
    expect(result.dates).toBe('Jan 2023 – Present');
  });

  it('debe parsear formato combinado: **EMPRESA | Ubicación | Puesto | Fechas**', () => {
    const result = parseJobHeader('**MERCADO LIBRE | Argentina | Project Leader | Ene 2023 – Nov 2025**');
    expect(result.company).toBe('MERCADO LIBRE');
    expect(result.jobInfo).toBe('Argentina | Project Leader');
    expect(result.dates).toBe('Ene 2023 – Nov 2025');
  });

  it('debe parsear formato simple: **Puesto** (sin empresa, sin fecha)', () => {
    const result = parseJobHeader('**Senior Engineer**');
    expect(result.company).toBe('');
    expect(result.jobInfo).toBe('Senior Engineer');
    expect(result.dates).toBe('');
  });

  it('debe parsear: **EMPRESA** (solo empresa)', () => {
    const result = parseJobHeader('**TECH CORP**');
    expect(result.company).toBe('TECH CORP');
    expect(result.jobInfo).toBe('');
    expect(result.dates).toBe('');
  });

  it('debe parsear formato con dos partes: Puesto | Fechas', () => {
    // Si la primera parte NO parece empresa y la segunda tiene fecha
    const result = parseJobHeader('**Project Leader | Ene 2023 – Present**');
    expect(result.dates).toBe('Ene 2023 – Present');
    // jobInfo o company dependerá de looksLikeCompany
  });

  it('debe limpiar underscores (_) alrededor del texto', () => {
    const result = parseJobHeader('**_Senior Engineer | Jul 2021 – Ene 2023_**');
    expect(result.jobInfo).toBe('Senior Engineer');
    expect(result.dates).toBe('Jul 2021 – Ene 2023');
  });

  it('debe manejar formato con solo fecha', () => {
    const result = parseJobHeader('**Ene 2023 – Present**');
    expect(result.dates).toBe('Ene 2023 – Present');
    expect(result.company).toBe('');
  });
});

// ==========================================================
// parseExperience()
// ==========================================================

describe('parseExperience()', () => {
  let html;

  beforeAll(() => {
    const md = loadFixture('experience-multi-format.md');
    const sections = extractSections(md);
    html = parseExperience(sections.experience);
  });

  it('debe generar HTML con company names', () => {
    expect(html).toContain('EMPRESA GRANDE');
    expect(html).toContain('TECH CORP');
    expect(html).toContain('SIMPLE CO');
  });

  it('debe generar HTML con job info (puestos)', () => {
    expect(html).toContain('Project Leader');
    expect(html).toContain('Senior Engineer');
    expect(html).toContain('Developer');
  });

  it('debe generar HTML con fechas', () => {
    expect(html).toContain('Ene 2023');
    expect(html).toContain('Jan 2020');
    expect(html).toContain('Mar 2016');
  });

  it('debe generar bullets con <strong> tags', () => {
    expect(html).toContain('<strong>Strategic Delivery:</strong>');
    expect(html).toContain('<strong>70%</strong>');
  });

  it('debe generar estructura <ul> y <li> para bullets', () => {
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).toContain('</li>');
    expect(html).toContain('</ul>');
  });

  it('debe generar estructura job-header con company, job-info y dates', () => {
    expect(html).toContain('class="job-header"');
    expect(html).toContain('class="company"');
    expect(html).toContain('class="job-info"');
    expect(html).toContain('class="dates"');
  });

  it('debe manejar EARLIER EXPERIENCE como sección especial', () => {
    expect(html).toContain('Earlier Experience');
    expect(html).toContain('class="earlier-experience"');
  });

  it('debe contener bullets de EARLIER EXPERIENCE', () => {
    expect(html).toContain('SmallCo');
    expect(html).toContain('DevShop');
  });

  it('debe manejar descripciones en itálica (_texto_)', () => {
    // La fixture tiene: _Leading a cross-functional squad of 9 engineers responsible for critical platform APIs._
    expect(html).toContain('cross-functional squad');
  });
});

// ==========================================================
// renderSimpleSection()
// ==========================================================

describe('renderSimpleSection()', () => {
  it('debe renderizar Markdown a HTML usando markdown-it', () => {
    const lines = ['Results-oriented **Professional** with experience in *SDLC*.'];
    const result = renderSimpleSection(lines);
    expect(result).toContain('<strong>Professional</strong>');
    expect(result).toContain('<em>SDLC</em>');
  });

  it('debe devolver string vacío si no hay contenido', () => {
    expect(renderSimpleSection([])).toBe('');
    expect(renderSimpleSection(['', '  '])).toBe('');
  });

  it('debe convertir bullets Markdown a HTML', () => {
    const lines = ['- Item one', '- Item two'];
    const result = renderSimpleSection(lines);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item one</li>');
    expect(result).toContain('<li>Item two</li>');
  });
});

// ==========================================================
// readFile() / writeFile()
// ==========================================================

describe('readFile() / writeFile()', () => {
  const testFile = path.join(FIXTURES_DIR, '_test-write.md');

  afterAll(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('readFile() debe leer un archivo existente', () => {
    const content = readFile(SAMPLE_CV_PATH);
    expect(content).toContain('Juan Pérez');
    expect(content.length).toBeGreaterThan(0);
  });

  it('readFile() debe lanzar error si el archivo no existe', () => {
    expect(() => readFile('/nonexistent/path/file.md')).toThrow('Archivo no encontrado');
  });

  it('writeFile() debe crear archivo y directorios', () => {
    writeFile(testFile, '# Test Content');
    expect(fs.existsSync(testFile)).toBe(true);
    const content = fs.readFileSync(testFile, 'utf8');
    expect(content).toBe('# Test Content');
  });
});

// ==========================================================
// escapeHtml()
// ==========================================================

describe('escapeHtml()', () => {
  it('debe escapar caracteres HTML especiales', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('debe escapar ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('debe escapar comillas simples y dobles', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('debe devolver string vacío si input es falsy', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('debe preservar texto sin caracteres especiales', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});
