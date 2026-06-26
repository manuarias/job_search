# 🎯 CV Optimization Engine

<div align="center">

**Optimizá tu CV para cada Job Description y convertilo en PDF profesional.**

[![Español](https://img.shields.io/badge/🇪🇸_Español-Abrir-blue)](#español)
[![English](https://img.shields.io/badge/🇬🇧_English-Open-blue)](#english)

</div>

---

<div id="español">

## 🇪🇸 Español

### ¿Qué hace este proyecto?

Sistema completo para optimizar currículums vitae (CVs) contra descripciones de trabajo (Job Descriptions) específicas. Incluye un flujo de 5 pasos de análisis y un generador de PDFs profesionales.

**El problema:** Mandar el mismo CV a todas las empresas es como tirar una carta genérica a 100 personas. No funciona.

**La solución:** Por cada postulación, analizamos la JD, identificamos gaps de keywords, reescribimos logros con métricas reales, fusionamos keywords naturalmente, y generamos un PDF profesional listo para enviar.

### Estructura del proyecto

```
job_search/
├── AGENTS.md              ← Reglas del flujo de optimización (leer primero)
├── README.md              ← Este archivo
├── applications/          ← Postulaciones (una carpeta por empresa)
│   ├── jd-tracking.md     ← Tracking de todas tus postulaciones
│   └── [REF]/             ← Ej: AGIL/, META/, GOOG/
│       ├── job-description.md
│       ├── 01-ats-diagnostic.md
│       ├── 02-recruiter-eye-test.md
│       ├── 03-achievement-rewrite.md
│       ├── 04-keyword-fusion.md
│       ├── 05-final-score.md
│       ├── README.md
│       └── arias_emanuel-en-[REF].md   ← CV final en Markdown
├── pdf-builder/           ← Generador de PDFs
│   ├── build-cv.js        ← Script principal (Node.js + Playwright)
│   ├── cv-template.html   ← Template HTML/CSS profesional
│   └── README.md          ← Guía del pdf-builder
├── resumes/               ← CVs fuente (NO MODIFICAR)
│   ├── cv_en.md           ← CV maestro en inglés
│   ├── cv_es.md           ← CV maestro en español
│   └── resume_template/
│       ├── template.md
│       └── template_optimized.md
└── package.json           ← Dependencias
```

### 🚀 Hermes — Pipeline automatizado

Hermes (`scripts/hermes.js`) automatiza todo el pipeline de optimización en un solo comando. Encadena los pasos: scrape → extraer keywords → matchear → puntuar → ensamblar CV → cover letter. Persiste estado en disco para sobrevivir crashes.

```bash
# Desde URL
node scripts/hermes.js https://boards.greenhouse.io/empresa/jobs/123

# Desde texto
node scripts/hermes.js "Buscamos un Senior Engineer con experiencia en..."

# Modo interactivo (aprobación paso a paso)
node scripts/hermes.js https://... --interactive

# Batch (un archivo con una URL por línea)
node scripts/hermes.js --batch urls.txt

# Forzar idioma + generar PDF
node scripts/hermes.js https://... --lang en --pdf
```

Opciones: `--lang en|es`, `--interactive`, `--batch <file>`, `--pdf`, `--help`

### Cómo usarlo (flujo completo)

#### Paso 0: Inicializar la postulación

**Opción A — Automático (URL):**
Pasame el link de la Job Description y hago todo solo:
- Fetch del contenido
- Extracción de texto limpio
- Generación automática del código REF
- Creación de carpeta y archivos
- Actualización del tracking

**Opción B — Manual (texto):**
```bash
# 1. Elegir un código REF único (4+ letras)
# Ejemplos: AGIL (AgileEngine), META (Meta), GOOG (Google)

# 2. Crear la carpeta
mkdir applications/AGIL

# 3. Guardar la Job Description
cp ~/Downloads/job-description.md applications/AGIL/job-description.md

# 4. Agregar al tracking
# Editar applications/jd-tracking.md y agregar fila con Status: "In Progress"
```

#### Paso 1-5: Ejecutar la optimización

Seguir el flujo definido en `AGENTS.md`:

1. **ATS Diagnostic** — Verificar que el ATS pueda leer el CV y encontrar gaps de keywords
2. **Recruiter Eye Test** — Simular la revisión de un reclutador (7s + 30s)
3. **Achievement Rewrite** — Transformar responsabilidades en logros cuantificados
4. **Keyword Fusion** — Integrar keywords faltantes de forma natural
5. **Final Score** — Puntuar y encontrar quick wins para superar 90/100

> ⚠️ **Regla de oro:** Nunca se inventan métricas. Si el CV original no tiene un número, se marca como `[NEEDS METRIC]` y se consulta al usuario.

#### Paso 6: Generar el PDF

```bash
# Desde el root del proyecto
node pdf-builder/build-cv.js \
  applications/AGIL/arias_emanuel-en-AGIL.md \
  applications/AGIL/arias_emanuel-en-AGIL.pdf
```

Esto genera:
- `applications/AGIL/arias_emanuel-en-AGIL.html` — Preview para revisar
- `applications/AGIL/arias_emanuel-en-AGIL.pdf` — PDF final listo para enviar

#### Paso 7: Actualizar tracking

Editar `applications/jd-tracking.md`:
- Actualizar `Status` a "Ready" o "Submitted"
- Completar `Score` con el puntaje del Step 5
- Actualizar `Updated` con la fecha actual

### Principios clave (Golden Rules)

- ✅ **Un CV = Una JD** — Nunca mandar el mismo CV a dos roles distintos
- ✅ **Métricas reales** — Solo números verificables del CV original. Nunca inventar.
- ✅ **Keywords naturales** — Integrar sin "stuffing", solo lo que hiciste
- ✅ **Impact-first** — El reclutador debe entender tu perfil en 7 segundos
- ❌ **No modificar** `resumes/cv_en.md` — Es el único source of truth
- 💾 **Guardar en Engram** — Después de cada decisión importante o paso completado
- 🗣️ **Comunicación** — Rioplatense Spanish (voseo) para hablar con el usuario

### Instalación

```bash
cd /Users/earias/Documents/job_search
npm install
```

Dependencias:
- `markdown-it` — Parseo de Markdown a HTML
- `playwright` — Generación de PDF vía Chromium

La primera vez que corre Playwright, descarga Chromium automáticamente (~100MB).

</div>

---

<div id="english">

## 🇬🇧 English

### What does this project do?

Complete system for optimizing Curriculum Vitae (CVs) against specific Job Descriptions (JDs). Includes a 5-step analysis workflow and a professional PDF generator.

**The problem:** Sending the same CV to every company is like mailing a generic letter to 100 people. It doesn't work.

**The solution:** For each application, we analyze the JD, identify keyword gaps, rewrite achievements with real metrics, fuse keywords naturally, and generate a professional PDF ready to submit.

### Project Structure

```
job_search/
├── AGENTS.md              ← Optimization workflow rules (read this first)
├── README.md              ← This file
├── applications/          ← Job applications (one folder per company)
│   ├── jd-tracking.md     ← Track all your applications
│   └── [REF]/             ← Ex: AGIL/, META/, GOOG/
│       ├── job-description.md
│       ├── 01-ats-diagnostic.md
│       ├── 02-recruiter-eye-test.md
│       ├── 03-achievement-rewrite.md
│       ├── 04-keyword-fusion.md
│       ├── 05-final-score.md
│       ├── README.md
│       └── arias_emanuel-en-[REF].md   ← Final CV in Markdown
├── pdf-builder/           ← PDF generator
│   ├── build-cv.js        ← Main script (Node.js + Playwright)
│   ├── cv-template.html   ← Professional HTML/CSS template
│   └── README.md          ← pdf-builder guide
├── resumes/               ← Source CVs (DO NOT MODIFY)
│   ├── cv_en.md           ← Master CV in English
│   ├── cv_es.md           ← Master CV in Spanish
│   └── resume_template/
│       ├── template.md
│       └── template_optimized.md
└── package.json           ← Dependencies
```

### 🚀 Hermes — Automated Pipeline

Hermes (`scripts/hermes.js`) automates the entire optimization pipeline in a single command. It chains the steps: scrape → extract keywords → match → score → assemble CV → cover letter. Filesystem-based state survives crashes.

```bash
# From URL
node scripts/hermes.js https://boards.greenhouse.io/company/jobs/123

# From text
node scripts/hermes.js "We are looking for a Senior Engineer with..."

# Interactive mode (step-by-step approval)
node scripts/hermes.js https://... --interactive

# Batch mode (one URL per line)
node scripts/hermes.js --batch urls.txt

# Force language + generate PDF
node scripts/hermes.js https://... --lang en --pdf
```

Options: `--lang en|es`, `--interactive`, `--batch <file>`, `--pdf`, `--help`

### How to use it (complete workflow)

#### Step 0: Initialize the application

**Option A — Automatic (URL):**
Pass me the Job Description link and I'll handle everything:
- Fetch content
- Extract clean text
- Auto-generate REF code
- Create folder and files
- Update tracking

**Option B — Manual (text):**
```bash
# 1. Choose a unique REF code (4+ letters)
# Examples: AGIL (AgileEngine), META (Meta), GOOG (Google)

# 2. Create the folder
mkdir applications/AGIL

# 3. Save the Job Description
cp ~/Downloads/job-description.md applications/AGIL/job-description.md

# 4. Add to tracking
# Edit applications/jd-tracking.md and add a row with Status: "In Progress"
```

#### Steps 1-5: Run the optimization

Follow the workflow defined in `AGENTS.md`:

1. **ATS Diagnostic** — Verify the ATS can read the CV and find keyword gaps
2. **Recruiter Eye Test** — Simulate a recruiter's review (7s + 30s)
3. **Achievement Rewrite** — Transform responsibilities into quantified achievements
4. **Keyword Fusion** — Integrate missing keywords naturally
5. **Final Score** — Score and find quick wins to push above 90/100

> ⚠️ **Golden rule:** Metrics are never invented. If the original CV doesn't have a number, mark it as `[NEEDS METRIC]` and ask the user.

#### Step 6: Generate the PDF

```bash
# From the project root
node pdf-builder/build-cv.js \
  applications/AGIL/arias_emanuel-en-AGIL.md \
  applications/AGIL/arias_emanuel-en-AGIL.pdf
```

This generates:
- `applications/AGIL/arias_emanuel-en-AGIL.html` — Preview for review
- `applications/AGIL/arias_emanuel-en-AGIL.pdf` — Final PDF ready to submit

#### Step 7: Update tracking

Edit `applications/jd-tracking.md`:
- Update `Status` to "Ready" or "Submitted"
- Fill `Score` with the Step 5 result
- Update `Updated` with today's date

### Key Principles (Golden Rules)

- ✅ **One CV = One JD** — Never send the same CV to two different roles
- ✅ **Real metrics only** — Only verifiable numbers from the original CV. Never invent.
- ✅ **Natural keywords** — Integrate without "stuffing", only what you actually did
- ✅ **Impact-first** — The recruiter must understand your profile in 7 seconds
- ❌ **Do not modify** `resumes/cv_en.md` — It is the single source of truth
- 💾 **Save to Engram** — After every significant decision or completed step
- 🗣️ **Communication** — Rioplatense Spanish (voseo) for user communication

### Installation

```bash
cd /Users/earias/Documents/job_search
npm install
```

Dependencies:
- `markdown-it` — Markdown to HTML parser
- `playwright` — PDF generation via Chromium

The first time Playwright runs, it downloads Chromium automatically (~100MB).

</div>

---

## Engineering Tools

| Command | Description |
|---------|-------------|
| `node scripts/hermes.js <jd-url-or-text>` | Full pipeline: scrape → CV → cover letter (F11) |
| `node scripts/extract-keywords.js <jd.md>` | Extract keywords from a job description (F4) |
| `node scripts/match-cv.js <cv.json> <keywords.json>` | Score a CV against JD keywords (F6) |
| `npm test` | Run all tests (Vitest) |

### F6 Matcher — Architecture

The `lib/matcher.js` module scores a structured CV against JD keywords across five dimensions:

| Scorer | Weight | What it measures |
|--------|--------|------------------|
| Hard Keywords | 30% | Direct match of technical terms in CV text |
| Soft Keywords | 20% | Behavioral skill match via synonym expansion |
| Domain Match | 20% | Keyword-to-domain alignment (Jaccard similarity) |
| Seniority Fit | 15% | Years of experience + role level comparison |
| Fuzzy Match | 15% | Bigram token overlap (lexical similarity) |

**Future extension — Embedding-based semantic matching:**

The `fuzzyMatch` scorer currently uses bigram overlap (lexical). This is an intentional placeholder. To upgrade:

1. Replace `scoreFuzzyMatch()` in `lib/matcher.js` with an embedding model call
2. Embed CV narrative text (flattenCVText) → vector
3. Embed JD text (reconstructed from keywords) → vector
4. Return cosine similarity of the two vectors
5. No other scorer or interface changes needed

Local options (zero API cost): `@xenova/transformers` (ONNX runtime, all-MiniLM-L6-v2) or `@supabase/edge-runtime` compatible models. API-based options: OpenAI embeddings, Cohere, or any OpenAI-compatible endpoint.

## Quick Reference

| Command | Description |
|---------|-------------|
| `node scripts/hermes.js <jd-url-or-text>` | Full pipeline: scrape → CV → cover letter |
| `node pdf-builder/build-cv.js <input.md> <output.pdf>` | Generate PDF from optimized CV |
| `node scripts/extract-keywords.js <jd.md>` | Extract keywords from a job description |
| `node scripts/match-cv.js <cv.json> <keywords.json>` | Score CV against JD keywords |
| `npm install` | Install dependencies (run once) |
| `npm test` | Run all test suites |
| `npm run hermes -- <jd-url>` | Hermes pipeline (via npm script) |
| `npx playwright install chromium` | Reinstall Chromium if needed |

## License

Personal use only. This is a private CV optimization system.

---

<div align="center">

**Built with ❤️ for job hunting that actually works.**

</div>
