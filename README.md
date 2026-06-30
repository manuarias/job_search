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
├── ROADMAP.md             ← Plan de mejoras (completado ✅)
├── README.md              ← Este archivo
├── data/                  ← Datos estructurados (CVs, taxonomías, configs)
│   ├── cv_en.json         ← CV estructurado en inglés
│   ├── cv_es.json         ← CV estructurado en español
│   ├── keyword-taxonomy.json ← Diccionario de keywords técnicas
│   └── ...                ← (más archivos de datos)
├── lib/                   ← Módulos core
│   ├── keyword-extractor.js ← Extracción de keywords (F4)
│   ├── jd-scraper.js      ← Scraper de JDs (F5)
│   ├── matcher.js         ← Motor de matching CV-JD (F6)
│   ├── scorer.js          ← Motor de scoring cuantitativo (F7)
│   ├── assembler.js       ← Ensamblador de CV Markdown (F8)
│   ├── cover-letter.js    ← Generador de cover letters (F9)
│   ├── analytics.js       ← Analytics y feedback (F10)
│   ├── hermes.js          ← API programática del pipeline (F13)
│   ├── pdf-builder.js     ← PDF desde datos estructurados (F14)
│   └── reporter.js        ← Reporte post-pipeline (F12)
├── scripts/               ← CLI entry points
│   ├── hermes.js          ← 🚀 Pipeline completo (un comando)
│   ├── build-pdf.js       ← Generar PDF desde datos JSON
│   ├── fetch-jd.js        ← Scrape JD desde URL
│   ├── extract-keywords.js← Extraer keywords
│   ├── match-cv.js        ← Matchear contra CV
│   ├── score-cv.js        ← Puntuar alineación
│   ├── assemble-cv.js     ← Armar CV optimizado
│   ├── generate-cover-letter.js ← Generar cover letter
│   └── analytics.js       ← Generar reporte ANALYTICS.md
├── hermes-ia/             ← Integración con Hermes IA (F15)
│   ├── README.md          ← Guía de setup en VPS
│   ├── SOUL.md            ← Personalidad del agente
│   └── skills/cv-pipeline/← Skill + blueprint + scripts
├── schemas/               ← JSON Schemas
├── pdf-builder/           ← Template HTML + builder legacy
├── resumes/               ← CVs fuente (NO MODIFICAR)
├── applications/          ← Postulaciones (una carpeta por empresa)
│   ├── jd-tracking.md     ← Tracking de postulaciones
│   ├── ANALYTICS.md       ← Reporte de analytics
│   └── [REF]/             ← Ej: AGIL/, META/, GOOG/
│       ├── job-description.md
│       ├── keywords.json
│       ├── match.json
│       ├── score.json
│       ├── REPORT.md
│       ├── arias_emanuel-[en/es]-[REF].md
│       └── cover-letter.md
└── package.json
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

> **Para agentes de IA:** usá la API programática en vez del CLI. Ver [`AGENTS.md`](./AGENTS.md#for-ai-agents-) para ejemplos con `require('./lib/hermes').runPipeline()`.

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
node scripts/build-pdf.js AGIL --lang en
```

Esto genera:
- `applications/AGIL/arias_emanuel-en-AGIL.html` — Preview para revisar
- `applications/AGIL/arias_emanuel-en-AGIL.pdf` — PDF final listo para enviar

El PDF se genera directo desde los datos estructurados (`data/cv_en.json` + `match.json`), sin parsear Markdown.

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
git clone <repo-url> && cd job_search
pnpm install
```

Dependencias:
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
├── ROADMAP.md             ← Improvement plan (completed ✅)
├── README.md              ← This file
├── data/                  ← Structured data (CVs, taxonomies, configs)
│   ├── cv_en.json         ← Structured CV in English
│   ├── cv_es.json         ← Structured CV in Spanish
│   └── ...                ← (more data files)
├── lib/                   ← Core modules
│   ├── hermes.js          ← Pipeline API: runPipeline(jd, opts) (F13)
│   ├── pdf-builder.js     ← JSON → HTML → PDF (F14)
│   ├── keyword-extractor.js ← Keyword extraction (F4)
│   ├── jd-scraper.js      ← JD scraper (F5)
│   ├── matcher.js         ← CV-JD matching engine (F6)
│   ├── scorer.js          ← Scoring engine (F7)
│   ├── assembler.js       ← CV Markdown assembler (F8)
│   ├── cover-letter.js    ← Cover letter generator (F9)
│   ├── reporter.js        ← Pipeline report (F12)
│   └── analytics.js       ← Application analytics (F10)
├── scripts/               ← CLI entry points
│   ├── hermes.js          ← 🚀 Full pipeline orchestrator
│   ├── build-pdf.js       ← Generate PDF from structured data
│   ├── fetch-jd.js        ← Scrape JD from URL
│   ├── extract-keywords.js← Extract keywords
│   ├── match-cv.js        ← Match CV against JD
│   ├── score-cv.js        ← Score CV-JD alignment
│   ├── assemble-cv.js     ← Generate optimized CV
│   ├── generate-cover-letter.js ← Generate cover letter
│   └── analytics.js       ← Generate ANALYTICS.md
├── hermes-ia/             ← Hermes IA agent integration (F15)
│   ├── SOUL.md            ← Agent personality
│   ├── README.md          ← VPS setup guide
│   └── skills/cv-pipeline/← Skill, blueprint, batch scripts
├── schemas/               ← JSON Schemas
├── pdf-builder/           ← Template HTML + legacy builder
├── resumes/               ← Source CVs (DO NOT MODIFY)
├── applications/          ← Job applications (one folder per REF)
│   ├── jd-tracking.md     ← Application tracking
│   ├── ANALYTICS.md       ← Analytics report
│   └── [REF]/             ← Ex: AGIL/, META/
│       ├── job-description.md
│       ├── keywords.json
│       ├── match.json
│       ├── score.json
│       ├── arias_emanuel-[en/es]-[REF].md
│       └── cover-letter.md
└── package.json
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
node scripts/build-pdf.js AGIL --lang en
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

### 🤖 Hermes IA — Agent Automation

This project includes a [Hermes IA](https://hermes-agent.nousresearch.com/) integration package to automate job searching and CV processing from a VPS via Telegram.

**How it works:**
1. A daily cron searches IT jobs in Argentina and saves them to `pending_jds.json`
2. When you say "procesá las ofertas" via Telegram, the agent runs the pipeline in batch
3. Each JD is auto-scored (≥ 75 → generates CV + PDF + cover letter)
4. Results delivered to Telegram with attached files

**Setup:** See [`hermes-ia/README.md`](hermes-ia/README.md) for the full VPS installation guide.

```bash
git clone <repo-url> && cd job_search
pnpm install
```

Dependencies:
- `playwright` — PDF generation via Chromium

The first time Playwright runs, it downloads Chromium automatically (~100MB).

</div>

---

## Engineering Tools

| Command | Description |
|---------|-------------|
| `node scripts/hermes.js <jd-url-or-text>` | Full pipeline: scrape → CV → cover letter (F11) |
| `node scripts/build-pdf.js <ref> [--lang en\|es]` | Generate A4 PDF from structured CV data (F14) |
| `node scripts/extract-keywords.js <jd.md>` | Extract keywords from a job description (F4) |
| `node scripts/match-cv.js <cv.json> <keywords.json>` | Score a CV against JD keywords (F6) |
| `pnpm test` | Run all tests (Vitest) |

### 🤖 Hermes IA — Automatización con agente

Este proyecto incluye un paquete de integración con [Hermes IA](https://hermes-agent.nousresearch.com/) para automatizar la búsqueda y procesamiento de ofertas desde un VPS con Telegram.

**Cómo funciona:**
1. Un cron diario busca ofertas IT en Argentina y las guarda en `pending_jds.json`
2. Cuando decís "procesá las ofertas" por Telegram, el agente ejecuta el pipeline en batch
3. Evalúa cada oferta con scoring automático (≥ 75 → genera CV + PDF + cover letter)
4. Entrega resultados por Telegram con archivos adjuntos

**Setup:** Ver [`hermes-ia/README.md`](hermes-ia/README.md) para la guía completa de instalación en tu VPS.

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
| `node scripts/build-pdf.js <ref> [--lang en\|es]` | Generate A4 PDF from structured CV data |
| `node scripts/extract-keywords.js <jd.md>` | Extract keywords from a job description |
| `node scripts/match-cv.js <cv.json> <keywords.json>` | Score CV against JD keywords |
| `pnpm install` | Install dependencies (run once) |
| `pnpm test` | Run all test suites |
| `pnpm run hermes -- <jd-url>` | Hermes pipeline (via pnpm script) |
| `pnpm run pdf <ref>` | Generate PDF from structured CV data |
| `npx playwright install chromium` | Reinstall Chromium if needed |

## License

Personal use only. This is a private CV optimization system.

---

<div align="center">

**Built with ❤️ for job hunting that actually works.**

</div>
