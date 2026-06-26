# CV Optimization Agent Rules

These rules define the workflow for optimizing resumes/CVs against specific Job Descriptions (JD) in the `job_search` project. Follow these instructions precisely to ensure reproducible, high-quality results.

---

## Quick Start — Hermes Agent 🚀

The automated pipeline handles everything in one command:

```bash
node scripts/hermes.js <jd-url-or-text>
```

This runs: scrape JD → extract keywords → match against CV → score → assemble optimized CV → generate cover letter → save all artifacts to `applications/{REF}/`.

See `README.md` for full CLI options (interactive mode, batch, PDF, etc.).

The **manual 5-step workflow** below is the fallback for cases where you want full control over each phase.

---

## Project Context

- **Project Root:** `/Users/earias/Documents/job_search/`
- **Master CVs (source, NEVER modified):** `resumes/cv_en.md` (English) and `resumes/cv_es.md` (Spanish)
- **Structured CV data:** `data/cv_en.json` and `data/cv_es.json` (auto-generated, used by pipeline)
- **Optimized Template:** `resumes/resume_template/template_optimized.md`
- **Applications Directory:** `applications/` (all JD-specific optimizations go here)
- **Tracking File:** `applications/jd-tracking.md`

---

## Core Principles

1. **NEVER modify the original CV.** It is the single source of truth. Always work on copies.
2. **One CV = One JD.** Never send the same CV to two different roles without optimization.
3. **Metrics > Responsibilities.** Every bullet must have a quantifiable impact.
4. **Language matching.** Use the exact terminology from the JD (if they say "stakeholder alignment," you say "stakeholder alignment," not "worked with business people").
5. **Impact-first formatting.** The recruiter must understand the profile in 7 seconds.
6. **Always save to Engram** after completing significant work or making architectural decisions.

---

## Folder Structure

```
job_search/
├── AGENTS.md              ← Optimization workflow rules (this file)
├── ROADMAP.md             ← Improvement roadmap (completed ✅)
├── README.md              ← Project overview & usage
├── data/                  ← Structured data (CVs, taxonomies, configs)
│   ├── cv_en.json         ← Structured CV in English
│   ├── cv_es.json         ← Structured CV in Spanish
│   ├── keyword-taxonomy.json  ← Tech keyword dictionary (~117 terms)
│   ├── soft-synonyms.json ← Soft skill synonym mappings
│   ├── domain-mapping.json← Keyword → domain lookup table
│   ├── match-weights.json ← Matching engine weight config
│   ├── score-config.json  ← Scoring engine config
│   └── jd-tracking.json   ← Structured application tracking
├── schemas/               ← JSON Schemas
│   ├── cv.schema.json     ← CV data model schema
│   ├── keyword-output.schema.json
│   ├── match-output.schema.json
│   └── README.md          ← Schema documentation
├── lib/                   ← Core modules
│   ├── matcher.js         ← F6: CV-JD matching engine
│   ├── scorer.js          ← F7: Quantified scoring engine
│   ├── assembler.js       ← F8: CV Markdown assembler
│   ├── cover-letter.js    ← F9: Cover letter skeleton generator
│   ├── analytics.js       ← F10: Application analytics
│   ├── keyword-extractor.js  ← F4: Keyword extraction engine
│   ├── jd-scraper.js      ← F5: JD URL scraper
│   └── soft-skills.json   ← Soft skill detection dictionary
├── scripts/               ← CLI entry points
│   ├── hermes.js          ← 🚀 Full pipeline orchestrator
│   ├── fetch-jd.js        ← Scrape JD from URL
│   ├── extract-keywords.js← Extract keywords from JD text
│   ├── match-cv.js        ← Match CV against JD keywords
│   ├── score-cv.js        ← Score CV-JD alignment
│   ├── assemble-cv.js     ← Generate optimized CV Markdown
│   ├── generate-cover-letter.js ← Generate cover letter skeleton
│   ├── analytics.js       ← Generate ANALYTICS.md report
│   └── validate-cv.mjs    ← Validate CV JSON against schema
├── pdf-builder/           ← PDF generator
│   ├── build-cv.js        ← MD → PDF (Node.js + Playwright)
│   └── cv-template.html   ← Professional HTML/CSS template
├── resumes/               ← Source CVs (DO NOT MODIFY)
│   ├── cv_en.md           ← Master CV in English
│   ├── cv_es.md           ← Master CV in Spanish
│   ├── archive/           ← Archived CV versions
│   └── resume_template/
│       └── template_optimized.md
└── applications/          ← Job applications (one folder per REF)
    ├── jd-tracking.md     ← Application tracking table
    ├── ANALYTICS.md       ← Auto-generated analytics report
    └── [REF]/             ← Per-application folder
        ├── job-description.md
        ├── keywords.json
        ├── match.json
        ├── score.json
        ├── arias_emanuel-[en/es]-[REF].md
        └── cover-letter.md
```

---

## Workflow: 5-Step Optimization Process

When the user wants to optimize a CV for a new JD, follow these steps in EXACT order.

### Step 0: Initialize the Optimization

**Before doing anything else.** El usuario puede iniciar de dos formas:

#### Modo A: URL (Automático)

El usuario pasa un link a la Job Description. El agente ejecuta todo el setup:

1. **Fetch the URL** usando `webfetch` para obtener el contenido.
2. **Extraer texto limpio** de la JD: quitar navegación, footers, scripts, y quedarse solo con el contenido relevante (título del rol, descripción, requisitos, about the company).
3. **Identificar empresa y rol** a partir del título de la página, meta tags, o contenido.
4. **Generar REF automáticamente** basado en el nombre de la empresa:
    - Tomar las primeras 4 letras del nombre (ej: "AgileEngine" → `AGIL`).
    - Si son menos de 4 letras, completar con la inicial del rol.
    - Verificar contra `jd-tracking.md`. Si ya existe, agregar número: `AGIL2`.
5. **Crear carpeta:** `applications/[REF]/`
6. **Guardar JD:** `applications/[REF]/job-description.md` (texto limpio extraído).
7. **Leer source CV:** `resumes/cv_en.md` (o variante de idioma apropiada).
8. **Leer template:** `resumes/resume_template/template_optimized.md`.
9. **Actualizar tracking:** Agregar fila en `applications/jd-tracking.md` con Status: "In Progress", Created: fecha de hoy.
10. **Confirmar al usuario:** Mostrar resumen (REF, empresa, rol) y preguntar "¿Procedemos al Step 1?" antes de continuar.

**Notas importantes sobre URLs:**
- LinkedIn: A veces requiere login. Si el fetch falla, pedir al usuario que pegue el texto directamente.
- Greenhouse/Lever/Workday: Suelen funcionar bien, el contenido está en HTML limpio.
- Si la página es un PDF, descargar y extraer texto con `pdftotext` si está disponible, o pedir al usuario que lo pegue.
- Si no se puede identificar la empresa con claridad, usar el dominio como fallback (ej: `jobs.example.com` → `EXAM`).

#### Modo B: Texto (Manual)

El usuario pega el texto de la JD directamente. Proceder con los pasos manuales originales:

1. Read the JD provided by the user.
2. Generate a unique 4+ letter reference code (`[REF]`) based on the company/role:
    - Must be unique (check `jd-tracking.md` to ensure it doesn't exist).
    - Should be recognizable (e.g., `AGIL` for AgileEngine, `META` for Meta, `GOOG` for Google).
    - Examples: `AGIL`, `AETP`, `MELI`, `EXCO`, `FANG`, `NEAR`
3. Create folder: `applications/[REF]/`
4. Save the JD as `applications/[REF]/job-description.md`
5. Read the source CV: `resumes/cv_en.md` (or the appropriate language variant)
6. Read the optimized template: `resumes/resume_template/template_optimized.md`
7. Update `applications/jd-tracking.md` with a new row (Status: "In Progress")

---

### Step 1: ATS Diagnostic

**Goal:** Check parseability and identify keyword gaps vs the JD.

**Prompt to execute:**

```
ROLE: Enterprise ATS parser (Workday, Greenhouse, Lever). 
INPUT: Resume + Job Description.
TASK:
1. Parse resume as ATS would: extract skills, tools, certifications, job titles, companies, degrees.
2. Identify parsing failures: tables, headers/footers, graphics, columns, special chars, non-standard section names.
3. Check missing HARD keywords vs JD (skills, tools, methodologies, certifications).
4. Check missing SOFT keywords/semantic matches (leadership, cross-functional, stakeholder management).
5. Flag formatting humans love but ATS hate (PDF image text, icons replacing bullets, etc.).

OUTPUT FORMAT:
Markdown table: [Issue] | [Severity: High/Med/Low] | [Location] | [Fix]
Then bullet list: "Top 5 Keyword Gaps vs Job Description"
```

**Output file:** `applications/[REF]/01-ats-diagnostic.md`

**Must include:**
- Parseability issues table
- Hard keyword gaps table
- Soft keyword / semantic gaps table
- Top 5 critical keyword gaps
- Any JD red flags (contradictions, copy-paste errors)

---

### Step 2: Recruiter Eye Test

**Goal:** Simulate a recruiter's 7-second and 30-second review.

**Prompt to execute:**

```
ROLE: Senior technical recruiter with 10+ years hiring for [ROLE]. You review 200+ resumes weekly. Spend exactly 7 seconds on first glance.
CONTEXT: Hiring manager's top 3 must-haves for this role are: [extract from JD].
INPUT: Resume.
TASK:
- 7-second glance: What stands out immediately? What signals the must-haves? Verdict?
- 30-second deeper scan: Strongest signal (the hook)? Weakest signal / red flag? One change to increase shortlist probability? Pass to hiring manager (Yes/No/Maybe)?

OUTPUT: Use bold headers. Be brutally direct. No sugarcoating.
```

**Output file:** `applications/[REF]/02-recruiter-eye-test.md`

**Must include:**
- 7-second glance observations
- 30-second deeper scan (hook, red flags, one change)
- Pass/No Pass verdict with justification
- Key insight about narrative framing

---

### Step 3: Achievement Rewrite

**Goal:** Transform responsibilities into quantified, impact-driven bullets.

**Rules for rewrites:**
1. Lead with strong action verb (built, architected, scaled, optimized, reduced, led, shipped).
2. Include at least one METRIC per bullet: % improvement, $ saved, time reduced, users impacted, team size. **If the original CV does not contain a verifiable metric for a bullet, you MUST NOT invent one.** Instead: (a) mark it as `[NEEDS METRIC: describe what metric would fit]`, (b) add it to the "Missing Metrics" list, and (c) STOP and ask the user to provide the real number before proceeding to Step 4.
3. Include CONTEXT: scale of system, team, or company stage.
4. Include RESULT or business impact.
5. Maximum 2 lines per bullet. No fluff.
6. NEVER use: "Responsible for", "Duties included", "Assisted with".
7. **NEVER invent, estimate, or hallucinate metrics.** If you don't have the number, you don't have the number. Ask the user.

**Output format:**
For each role, create a table:
| Original | Rewritten | Why It Works |

**Output file:** `applications/[REF]/03-achievement-rewrite.md`

**Must include:**
- All experience bullets rewritten
- Metrics added per bullet (only if present in source CV; otherwise marked as `[NEEDS METRIC]`)
- Verb upgrades table
- Patterns & insights section
- List of missing metrics the user needs to fill (e.g., "$XXk")

---

### Step 4: Keyword Fusion

**Goal:** Integrate missing JD keywords naturally into the rewritten bullets from Step 3.

**Strategy:**
- Preserve all metrics from Step 3. If Step 3 contained a `[NEEDS METRIC]` placeholder, carry it forward. Do not replace `[NEEDS METRIC]` with invented numbers.
- Add missing keywords by slightly reframing existing achievements.
- NEVER add fluff. Every keyword must map to real work.

**Two-phase approach:**

**Phase 1 - Gap Analysis:**
- Exact keyword matches present
- Exact keyword matches missing
- Semantic equivalents (your term vs JD term)
- Frequency analysis (JD mentions 5x vs your 1x)

**Phase 2 - Natural Integration:**
- For each missing/under-represented keyword, suggest one specific bullet rewrite.
- The rewrite must sound human, preserve original achievement/metric, and only change terminology.

**Output file:** `applications/[REF]/04-keyword-fusion.md`

**Must include:**
- Gap analysis tables
- Fused bullets (showing Step 3 version vs fused version)
- New "Core Competencies" section proposal (4 bullets mapping JD Must-Haves)
- Header update proposal (adding target role title)
- Keyword coverage analysis (% of JD covered)

---

### Step 5: Final Score

**Goal:** Score the optimized CV and identify quick wins to push above 90/100.

**Scoring Rubric (weighted):**

| Category | Weight | What It Measures |
|----------|--------|------------------|
| ATS-Parseability | 40% | Can the bot read it? Format, dates, special chars |
| Keyword Alignment | 30% | Does it contain the words the ATS searches for? |
| Recruiter Appeal | 30% | Does a human shortlist it in 30 seconds? Hook, scanability |

**Score both states:**
1. **Current State** — Original CV (before optimization)
2. **Optimized State** — After Steps 1-4 applied

**Deliver:**
- Weighted total score for both states
- Detailed breakdown per category with justification
- Gap to 90+ analysis
- Top 3 Quick Wins table: [Change] | [Category] | [Point Gain] | [Time] | [Effort]
- Before vs After comparison
- Final recommendations (Must-Do, Do-If-Time, Do-Not-Do)

**Output file:** `applications/[REF]/05-final-score.md`

**Must include:**
- Scoring methodology explanation
- Current vs Optimized scores
- Weighted calculations
- Gap to 90+ with math
- Top 3 quick wins with impact estimation
- Score card visualization

---

## Deliverables

After completing all 5 steps, generate:

### 1. README.md
Update `applications/[REF]/README.md` with:
- Process tracker (all 5 steps marked complete)
- Executive summary
- Quick wins log (all fixes with "Applied?" status)
- Key decisions made
- Critical findings by step
- Final score summary
- Next actions / remaining manual tasks for user

### 2. Final CV
Generate the optimized CV using the `template_optimized.md` structure:

**Naming convention:** `arias_emanuel-[en/es]-[REF].md`

**Sections (in order):**
1. Header (with target role added)
2. Professional Summary (3 scannable bullets)
3. Core Competencies (4 bullets mapping JD Must-Haves)
4. Core Skills (categorized)
5. Professional Experience (fused bullets with metrics)
6. Education & Certifications

**File location:** `applications/[REF]/arias_emanuel-en-[REF].md`

### 3. Update Tracking Table
Update `applications/jd-tracking.md`:
- Mark status as "Ready" or "Submitted"
- Update Final Score column
- Update `Updated` date (YYYY-MM-DD)

---

## Golden Rules

1. **Original CV is sacred.** `cv_en.md` is read-only. Always output to `applications/[REF]/`.
2. **Reference codes are permanent.** Once assigned, never change. They tie together folder, files, and tracking table.
3. **Metrics are mandatory.** No bullet without a number, %, or time savings.
4. **No keyword stuffing.** If you didn't do it, don't claim it. Use semantic equivalents instead.
5. **Save to Engram** after every significant decision, bug fix, pattern establishment, or workflow change.
6. **No fabricated data.** Metrics, team sizes, dollar amounts, percentages, and timelines must come from the original CV or be explicitly provided by the user. If unknown, mark as `[NEEDS METRIC]` or `[NEEDS DATA]` and ask.

---

## Language & Localization Rules

### Infer Language from JD
- **Detect the primary language** of the Job Description automatically.
- The **optimized CV must match the JD's language** in its narrative sections (Summary, Experience bullets, Competencies descriptions).
- **Naming convention adapts:**
  - JD in English → `arias_emanuel-en-[REF].md`
  - JD in Spanish → `arias_emanuel-es-[REF].md`
  - JD in Portuguese → `arias_emanuel-pt-[REF].md`

### Technical Keywords Always in English
**Regardless of the JD language, the following elements MUST remain in English:**
- **Job titles:** Technical Program Manager, Engineering Manager, Scrum Master, etc.
- **Technical skills:** Python, Java, React, SQL, Docker, Kubernetes, AWS, CI/CD
- **Tools & platforms:** Jira, GitHub, Linear, Datadog, Confluence, n8n
- **Methodologies:** Agile, Scrum, Kanban, SDLC, DevOps
- **Concepts:** Microservices, API, REST, SaaS, Multi-tenant, Cloud Infrastructure
- **Metrics & KPIs:** RPM, MTTR, SLA, uptime, throughput
- **Frameworks & libraries:** Node.js, Spring Boot, GraphQL

**Why:** ATS systems and recruiters search for English terms even in Spanish JDs. Translating "Scrum Master" to "Maestro Scrum" or "CI/CD" to "IC/CD" breaks keyword matching.

### Hybrid Language Examples

**JD in Spanish:**
> "Buscamos un Technical Program Manager con experiencia en Jira, GitHub y CI/CD para liderar equipos Agile."

**CV output (Spanish narrative + English keywords):**
> "Lideré la entrega end-to-end del programa 'Product Bundles', definiendo milestones y success criteria en Jira. Implementé CI/CD pipelines que redujeron deployment time by 40%."

**JD in English:**
> "Looking for a Technical Program Manager experienced with Jira, GitHub, and CI/CD."

**CV output (fully in English):**
> "Owned end-to-end delivery of the 'Product Bundles' program, defining milestones and success criteria in Jira. Implemented CI/CD pipelines that reduced deployment time by 40%."

### Verification Checklist
Before submitting any CV, verify:
- [ ] Narrative flow matches JD language
- [ ] All technical skills are in English
- [ ] Job titles are in English
- [ ] Tool names are in English (original branding)
- [ ] No translated technical buzzwords (e.g., NOT "Maestro de Scrum", NOT "Nube de Amazon")

---

## Engram Persistence

After completing each step, save to Engram:

```
mem_save:
  title: "[REF] Step X: [What was done]"
  type: decision | pattern | config
  content:
    What: [One sentence]
    Why: [What motivated it]
    Where: [Files affected]
    Learned: [Gotchas, edge cases]
```

Also save a session summary at the end:

```
mem_session_summary:
  Goal: [What we were building]
  Discoveries: [Technical findings]
  Accomplished: [Completed items]
  Next Steps: [What remains]
  Relevant Files: [paths and descriptions]
```

---

## User Preferences (Non-Negotiable)

- **CV Original:** Never modify `resumes/cv_en.md`. It is the source of truth.
- **Process Order:** Always follow 1→2→3→4→5. Do not skip or reorder steps.
- **Template:** Use `template_optimized.md` as the base for all final CVs.
- **Output Naming:** `arias_emanuel-[en/es]-[REF].md`
- **Two Versions:** When possible, generate both a "custom optimized" version and a "template-based" version adapted to the user's original template format.
- **Language:** Rioplatense Spanish (voseo) for user communication.

---

## Example Reference Codes

| Company | Role | Reference | Notes |
|---------|------|-----------|-------|
| AgileEngine | TPM | `AGIL` | Used in example optimization |
| Mercado Libre | EM | `MELI` | Internal promotion |
| Google | SWE | `GOOG` | L4 application |
| Meta | TPM | `META` | E6 equivalent |
| Stripe | EngMgr | `STRP` | Remote |

If a code is taken, append a number: `AGIL2`, `META3`.

---

## Quick Start Checklist for New Optimizations

**Option A — Automatic (URL):**
- [ ] User provides JD URL
- [ ] Agent fetches, extracts clean text, auto-generates REF
- [ ] Agent creates folder, saves JD, updates tracking
- [ ] Agent reads source CV and template
- [ ] Agent confirms setup with user before proceeding

**Option B — Manual (text):**
- [ ] Read JD and source CV
- [ ] Generate unique `[REF]` code
- [ ] Create `applications/[REF]/` folder
- [ ] Save JD as `job-description.md`
- [ ] Initialize tracking table row

**Then run the 5 steps:**
- [ ] Run Step 1: ATS Diagnostic
- [ ] Run Step 2: Recruiter Eye Test
- [ ] Run Step 3: Achievement Rewrite
- [ ] Run Step 4: Keyword Fusion
- [ ] Run Step 5: Final Score

**Deliverables:**
- [ ] Generate `applications/[REF]/README.md`
- [ ] Generate `applications/[REF]/arias_emanuel-en-[REF].md`
- [ ] Update tracking table to "Ready"
- [ ] Save session to Engram
