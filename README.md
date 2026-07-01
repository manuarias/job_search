# 🎯 CV Optimization Engine

> Optimizá tu CV para cada Job Description y convertilo en PDF profesional.
> Optimize your CV for each Job Description and turn it into a professional PDF.

---

## 🚀 Quick Start / Inicio rápido

### 1. Clonar e instalar / Clone and install

```bash
git clone https://github.com/manuarias/job_search.git && cd job_search
pnpm install
```

### 2. Configurar tus datos / Set up your data

```bash
cp data/cv_en.json.template data/cv_en.json   # edit with your real info
cp data/cv_es.json.template data/cv_es.json   # editá con tus datos reales
cp resumes/cv_en.md.template resumes/cv_en.md # optional Markdown version
cp resumes/cv_es.md.template resumes/cv_es.md
```

> ✏️ Abrí `data/cv_en.json` y completá con tu nombre, experiencia, skills, etc.
> ✏️ Open `data/cv_en.json` and fill in your name, experience, skills, etc.

### 3. Verificar que todo funciona / Verify everything works

```bash
pnpm test
# → 500+ tests pass (using anonymous fixtures — no personal data needed)
```

### 4. Tu primera optimización / Your first optimization

```bash
# Desde URL — From URL
node scripts/hermes.js "https://boards.greenhouse.io/example/jobs/12345" --lang en --pdf

# Desde texto — From text
node scripts/hermes.js "We are looking for a Senior Engineer with Java and AWS experience..."

# Modo interactivo (aprobación paso a paso) — Interactive mode
node scripts/hermes.js "https://..." --interactive
```

### 5. Ver el resultado / Check the output

```bash
ls applications/EXAM/
# → arias_emanuel-en-EXAM.md   cover-letter.md   REPORT.md   score.json
# → arias_emanuel-en-EXAM.pdf  (si usaste --pdf)
```

### Próximos pasos / Next steps

- 📖 [Guía completa de uso →](AGENTS.md)
- 🤖 [Hermes IA — Setup en VPS →](docs/SETUP-VPS.md)
- 📊 [Roadmap del proyecto →](ROADMAP.md)

---

## 🇪🇸 Español

### ¿Qué hace este proyecto?

Sistema completo para optimizar currículums vitae (CVs) contra descripciones de trabajo (Job Descriptions) específicas. Incluye un flujo de 5 pasos de análisis y un generador de PDFs profesionales.

**El problema:** Mandar el mismo CV a todas las empresas es como tirar una carta genérica a 100 personas. No funciona.

**La solución:** Por cada postulación, analizamos la JD, identificamos gaps de keywords, reescribimos logros con métricas reales, fusionamos keywords naturalmente, y generamos un PDF profesional listo para enviar.

### Estructura del proyecto

```
job_search/
├── AGENTS.md              ← Reglas del flujo de optimización
├── ROADMAP.md             ← Plan de mejoras (completado ✅)
├── data/                  ← Datos estructurados (CVs, taxonomías, configs)
│   ├── cv_en.json.template← Template de CV (copiá y editá con tus datos)
│   ├── cv_es.json.template← Template de CV en español
│   ├── keyword-taxonomy.json ← Diccionario de keywords técnicas
│   ├── soft-synonyms.json ← Sinónimos de soft skills
│   ├── domain-mapping.json← Keyword → dominio
│   └── match-weights.json ← Pesos del motor de matching
├── lib/                   ← Módulos core
│   ├── hermes.js          ← API programática del pipeline
│   ├── pdf-builder.js     ← JSON → HTML → PDF
│   ├── keyword-extractor.js ← Extracción de keywords
│   ├── jd-scraper.js      ← Scraper de JDs
│   ├── matcher.js         ← Motor de matching CV-JD
│   ├── scorer.js          ← Motor de scoring
│   ├── assembler.js       ← Ensamblador de CV Markdown
│   ├── cover-letter.js    ← Generador de cover letters
│   ├── reporter.js        ← Reporte post-pipeline
│   └── analytics.js       ← Analytics de postulaciones
├── scripts/               ← CLI entry points
│   ├── hermes.js          ← 🚀 Pipeline completo (un comando)
│   ├── build-pdf.js       ← Generar PDF desde datos JSON
│   ├── sync-data.js       ← Sincronizar templates con datos reales
│   └── ...                ← (fetch, extract, match, score, etc.)
├── hermes-ia/             ← Integración con Hermes IA
│   ├── README.md          ← Guía de setup en VPS
│   ├── SOUL.md            ← Personalidad del agente
│   └── skills/cv-pipeline/← Skill + blueprint + scripts
├── schemas/               ← JSON Schemas
├── resumes/               ← CVs fuente (NO MODIFICAR)
│   ├── cv_en.md.template  ← Template de CV Markdown
│   ├── cv_es.md.template  ← Template de CV Markdown en español
│   └── resume_template/   ← Template optimizado
├── applications/          ← Postulaciones (una carpeta por empresa)
│   ├── jd-tracking.md     ← Tracking de postulaciones
│   └── [REF]/             ← Ej: AGIL/, META/
│       ├── job-description.md
│       ├── keywords.json
│       ├── match.json
│       ├── score.json
│       ├── REPORT.md
│       ├── arias_emanuel-[en/es]-[REF].md
│       └── cover-letter.md
└── package.json
```

> 💾 Los archivos `cv_en.json`, `cv_es.json`, `cv_en.md`, y `cv_es.md` (sin `.template`) están gitignoreados — tus datos nunca se suben al repo.

### Cómo usarlo

```bash
# Pipeline automático (desde URL)
node scripts/hermes.js https://boards.greenhouse.io/empresa/jobs/123

# Pipeline automático (desde texto)
node scripts/hermes.js "Buscamos un Senior Engineer con experiencia en..."

# Con opciones
node scripts/hermes.js https://... --lang es --pdf --interactive
```

Opciones: `--lang en|es`, `--interactive`, `--batch <file>`, `--pdf`, `--help`

#### Generar PDF

```bash
node scripts/build-pdf.js AGIL --lang es
# Genera applications/AGIL/arias_emanuel-es-AGIL.html (preview)
# y applications/AGIL/arias_emanuel-es-AGIL.pdf (final)
```

> 📖 El flujo detallado paso a paso está en [`AGENTS.md`](AGENTS.md). Para la integración con Hermes IA en VPS, ver [`docs/SETUP-VPS.md`](docs/SETUP-VPS.md).

### Principios clave

- ✅ **Un CV = Una JD** — Nunca mandar el mismo CV a dos roles distintos
- ✅ **Métricas reales** — Solo números verificables del CV original. Nunca inventar.
- ✅ **Keywords naturales** — Integrar sin "stuffing", solo lo que realmente hiciste
- ✅ **Impact-first** — El reclutador debe entender tu perfil en 7 segundos
- ❌ **No modificar** `resumes/cv_en.md.template` — Es el único source of truth
- 🗣️ **Comunicación** — Rioplatense Spanish (voseo) para hablar con el usuario

---

## 🇬🇧 English

### What does this project do?

Complete system for optimizing Curriculum Vitae (CVs) against specific Job Descriptions (JDs). Includes a 5-step analysis workflow and a professional PDF generator.

**The problem:** Sending the same CV to every company is like mailing a generic letter to 100 people. It doesn't work.

**The solution:** For each application, we analyze the JD, identify keyword gaps, rewrite achievements with real metrics, fuse keywords naturally, and generate a professional PDF ready to submit.

### Project Structure

```
job_search/
├── AGENTS.md              ← Optimization workflow rules
├── ROADMAP.md             ← Improvement plan (completed ✅)
├── data/                  ← Structured data (CVs, taxonomies, configs)
│   ├── cv_en.json.template← CV template (copy & edit with your info)
│   ├── cv_es.json.template← Spanish CV template
│   ├── keyword-taxonomy.json ← Tech keyword dictionary
│   ├── soft-synonyms.json ← Soft skill synonym mappings
│   ├── domain-mapping.json← Keyword → domain lookup table
│   └── match-weights.json ← Matching engine weight config
├── lib/                   ← Core modules
│   ├── hermes.js          ← Pipeline API
│   ├── pdf-builder.js     ← JSON → HTML → PDF
│   ├── keyword-extractor.js ← Keyword extraction
│   ├── jd-scraper.js      ← JD scraper
│   ├── matcher.js         ← CV-JD matching engine
│   ├── scorer.js          ← Scoring engine
│   ├── assembler.js       ← CV Markdown assembler
│   ├── cover-letter.js    ← Cover letter generator
│   ├── reporter.js        ← Pipeline report
│   └── analytics.js       ← Application analytics
├── scripts/               ← CLI entry points
│   ├── hermes.js          ← 🚀 Full pipeline orchestrator
│   ├── build-pdf.js       ← Generate PDF from structured data
│   ├── sync-data.js       ← Sync templates with real data
│   └── ...                ← (fetch, extract, match, score, etc.)
├── hermes-ia/             ← Hermes IA agent integration
│   ├── README.md          ← VPS setup guide
│   ├── SOUL.md            ← Agent personality
│   └── skills/cv-pipeline/← Skill + blueprint + scripts
├── schemas/               ← JSON Schemas
├── resumes/               ← Source CVs (DO NOT MODIFY)
│   ├── cv_en.md.template  ← Markdown CV template
│   ├── cv_es.md.template  ← Spanish Markdown CV template
│   └── resume_template/   ← Optimized template
├── applications/          ← Job applications (one folder per REF)
│   ├── jd-tracking.md     ← Application tracking
│   └── [REF]/             ← Ex: AGIL/, META/
│       ├── job-description.md
│       ├── keywords.json
│       ├── match.json
│       ├── score.json
│       ├── REPORT.md
│       ├── arias_emanuel-[en/es]-[REF].md
│       └── cover-letter.md
└── package.json
```

> 💾 The `cv_en.json`, `cv_es.json`, `cv_en.md`, and `cv_es.md` files (without `.template`) are gitignored — your data never gets committed.

### How to use it

```bash
# Automated pipeline (from URL)
node scripts/hermes.js https://boards.greenhouse.io/company/jobs/123

# Automated pipeline (from text)
node scripts/hermes.js "We are looking for a Senior Engineer with..."

# With options
node scripts/hermes.js https://... --lang en --pdf --interactive
```

Options: `--lang en|es`, `--interactive`, `--batch <file>`, `--pdf`, `--help`

#### Generate PDF

```bash
node scripts/build-pdf.js AGIL --lang en
# Generates applications/AGIL/arias_emanuel-en-AGIL.html (preview)
# and applications/AGIL/arias_emanuel-en-AGIL.pdf (final)
```

> 📖 The detailed step-by-step workflow is in [`AGENTS.md`](AGENTS.md). For Hermes IA VPS integration, see [`docs/SETUP-VPS.md`](docs/SETUP-VPS.md).

### Key Principles

- ✅ **One CV = One JD** — Never send the same CV to two different roles
- ✅ **Real metrics only** — Only verifiable numbers from the original CV. Never invent.
- ✅ **Natural keywords** — Integrate without "stuffing", only what you actually did
- ✅ **Impact-first** — The recruiter must understand your profile in 7 seconds
- ❌ **Do not modify** `resumes/cv_en.md.template` — It is the single source of truth
- 🗣️ **Communication** — Rioplatense Spanish (voseo) for user communication

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies (run once) |
| `pnpm test` | Run all test suites |
| `node scripts/hermes.js <url-or-text>` | Full pipeline: scrape → CV → cover letter → PDF |
| `node scripts/hermes.js <url> --lang en --pdf` | Pipeline + force English + PDF output |
| `node scripts/hermes.js --batch urls.txt` | Batch process multiple JDs |
| `node scripts/build-pdf.js <ref> [--lang en\|es]` | Generate A4 PDF from structured CV data |
| `node scripts/sync-data.js --dry-run` | Preview template sync changes |
| `node scripts/sync-data.js` | Merge new template fields into your data |

## License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with ❤️ for job hunting that actually works.**

</div>
