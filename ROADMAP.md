# 🗺️ Roadmap — De Pipeline Manual a Agente Hermes

> **Última actualización:** 2026-06-25
> **Objetivo:** Convertir este pipeline de optimización de CV (guiado por LLM) en un agente Hermes autónomo con datos estructurados, matching algorítmico, y feedback loop.
> **Framework:** SDD (Spec-Driven Development) con worktrees paralelos para cambios independientes.

---

## 📊 Resumen de Cambios

| Fase | Cambio | Dependencias | Agentes | Estado |
|------|--------|-------------|---------|--------|
| **F1** | Consolidar CVs fuente | Ninguna | 1 | ✅ Completo |
| **F2** | Infraestructura de tests | F1 | 1 | ⬜ Pendiente |
| **F3** | Modelo de datos del CV | F1 | 1 | ⬜ Pendiente |
| **F4** | Motor de extracción de keywords | F3 | 1 | ⬜ Pendiente |
| **F5** | JD Scraper multi-source | Ninguna | 1 | ⬜ Pendiente |
| **F6** | Matching engine | F3 + F4 + F5 | 1 | ⬜ Pendiente |
| **F7** | Scoring engine cuantitativo | F4 + F6 | 1 | ⬜ Pendiente |
| **F8** | CV Assembler | F3 + F6 | 1 | ⬜ Pendiente |
| **F9** | Cover letter generator | F8 | 1 | ⬜ Pendiente |
| **F10** | Analytics y feedback loop | F6 + F7 | 1 | ⬜ Pendiente |
| **F11** | Agente Hermes (orquestador) | F8 + F9 + F10 | 1 | ⬜ Pendiente |

---

## 🔀 Estrategia de Worktrees

Los cambios se agrupan en **olas** según dependencias. Dentro de cada ola, se pueden trabajar en paralelo con worktrees independientes.

```
Ola 1 (paralelo):        F1 ──┬── F2
                              └── F3

Ola 2 (paralelo):        F4 ──┬── F6 ──┬── F7
                         F5 ──┘        ├── F8 ── F9
                                       └── F10 ── F11
```

### Reglas de worktree

1. Cada cambio vive en su propio branch: `change/<cambio-slug>`
2. Worktrees se crean en `../job_search-wt/<cambio-slug>/`
3. Agentes leen ROADMAP.md antes de empezar y actualizan su fila al terminar
4. Un solo agente por cambio. Múltiples cambios en paralelo si son independientes.
5. Al mergear un cambio, actualizar `Última actualización` de este archivo.

---

## 📋 Detalle de Cambios

### F1 — Consolidar CVs Fuente

**Problema:** `cv_en.md` y `cv_en_v2.md` compiten como source of truth. No hay CV maestro en español.

**Alcance:**
- Mergear `cv_en_v2.md` → `cv_en.md` (la v2 es superior)
- Archivar `cv_en_v2.md` (mover a `resumes/archive/`)
- Crear `resumes/cv_es.md` desde el mejor CV en español generado (GYA o HUMA)
- Actualizar referencias en `AGENTS.md`, `README.md`
- Actualizar `.gitignore` si es necesario

**Agentes:** 1
**Rama:** `change/f1-consolidate-cvs`
**Estimación:** ~150 líneas

---

### F2 — Infraestructura de Tests

**Problema:** `build-cv.js` (550 líneas de parser) no tiene tests. Ya hubo bugs de bullets que desaparecían.

**Alcance:**
- Agregar `vitest` como devDependency
- Tests unitarios para `extractSections()`, `parseHeader()`, `parseExperience()`, `parseJobHeader()`, `isBullet()`, `extractBullet()`, `hasDate()`, `looksLikeCompany()`
- Fixtures Markdown de ejemplo (casos felices, edge cases, formatos alternativos)
- Agregar script `npm test`
- Actualizar `openspec/config.yaml` con `strict_tdd: true` y `test_command`

**Agentes:** 1
**Rama:** `change/f2-test-infra`
**Estimación:** ~400 líneas

---

### F3 — Modelo de Datos del CV

**Problema:** El CV existe solo como Markdown. Para matching algorítmico necesitamos datos estructurados.

**Alcance:**
- Definir JSON Schema (`schemas/cv.schema.json`)
  - `skills[]` con `{ category, items[], level? }`
  - `experiences[]` con `{ company, role, dates, achievements[] }`
  - `achievements[]` con `{ text, metrics[], technologies[], domains[], impact }`
  - `education[]`, `languages[]`
- Crear `data/cv_en.json` migrando desde `cv_en.md`
- Crear `data/cv_es.json` migrando desde `cv_es.md`
- Script de validación: `node scripts/validate-cv.js`
- Documentar el schema en `schemas/README.md`

**Agentes:** 1
**Rama:** `change/f3-cv-data-model`
**Estimación:** ~350 líneas

---

### F4 — Motor de Extracción de Keywords

**Problema:** Hoy el LLM "identifica" keywords de la JD. Necesitamos extracción programática.

**Alcance:**
- Módulo `lib/keyword-extractor.js`
  - Tokenización y limpieza de texto
  - Detección de skills técnicas (diccionario base + regex patterns)
  - Detección de skills blandas (diccionario)
  - Frecuencia de términos
  - Identificación de must-haves vs nice-to-haves (heurística por posición en la JD)
  - Output: `{ hard: [...], soft: [...], frequency: {...}, mustHave: [...] }`
- Tests unitarios con JDs reales de `applications/`
- No depende de LLM (puro NLP básico + diccionarios)

**Agentes:** 1
**Rama:** `change/f4-keyword-extractor`
**Depende de:** F3 (necesita el schema de skills para el diccionario)
**Estimación:** ~300 líneas

---

### F5 — JD Scraper Multi-Source

**Problema:** `webfetch` falla con LinkedIn, no extrae datos estructurados, no maneja PDFs.

**Alcance:**
- Módulo `lib/jd-scraper.js`
  - Soporte para URLs de Greenhouse, Lever, Workday, LinkedIn (con cookie de sesión)
  - Fallback: `webfetch` + LLM para sitios custom
  - Extracción estructurada: `{ company, role, location, type, description, requirements, niceToHave, aboutCompany }`
- Soporte para JD en texto plano (Modo B existente)
- Tests con URLs de ejemplo (mocks)

**Agentes:** 1
**Rama:** `change/f5-jd-scraper`
**Depende de:** Ninguna (totalmente independiente)
**Estimación:** ~350 líneas

---

### F6 — Matching Engine

**Problema:** El matching CV↔JD lo hace el LLM "opinando". Necesitamos medición real.

**Alcance:**
- Módulo `lib/matcher.js`
  - Input: `cv.json` + `jd.json` (estructurado)
  - Hard keyword matching: intersección exacta + fuzzy (Levenshtein para typos)
  - Soft keyword matching: similitud semántica (word embeddings o diccionario de sinónimos)
  - Domain matching: `domains[]` del CV vs áreas de la JD
  - Seniority matching: años de experiencia vs lo que pide la JD
  - Output: `{ overallScore, hardCoverage, softCoverage, gaps: [...], recommendations: [...] }`
- Tests con pares CV↔JD de `applications/` (datos reales para validar)

**Agentes:** 1
**Rama:** `change/f6-matcher`
**Depende de:** F3 (cv.json schema) + F4 (keyword extractor) + F5 (JD scraper)
**Estimación:** ~400 líneas

---

### F7 — Scoring Engine Cuantitativo

**Problema:** El scoring actual (88/100 para AGIL) es el LLM opinando. Necesitamos métricas medibles.

**Alcance:**
- Módulo `lib/scorer.js`
  - ATS-Parseability (40%): checks programáticos de formato, fechas, caracteres especiales, secciones estándar
  - Keyword Alignment (30%): usa output del matcher (F6) — coverage real, no opinión
  - Recruiter Appeal (30%): heurísticas de readability (longitud de bullets, densidad de métricas, verbos de acción)
  - Mismo rubric que AGENTS.md pero con mediciones objetivas
  - Output: `{ total, breakdown: { ats, keyword, recruiter }, quickWins: [...] }`
- Tests con CVs de `applications/` para validar que los scores tengan sentido

**Agentes:** 1
**Rama:** `change/f7-scorer`
**Depende de:** F4 + F6
**Estimación:** ~300 líneas

---

### F8 — CV Assembler

**Problema:** Hoy el LLM escribe todo el CV de cero cada vez. Debería ser un assembler que selecciona achievements relevantes y solo usa LLM para reframear.

**Alcance:**
- Módulo `lib/assembler.js`
  - Input: `cv.json` + resultado del matcher (F6) + template
  - Selecciona achievements más relevantes para la JD (basado en keyword y domain matching)
  - Ordena skills por relevancia
  - Genera secciones: Header, Summary, Core Competencies, Skills, Experience, Education
  - Usa LLM SOLO para reframear bullets con la terminología de la JD (no para decidir qué incluir)
  - Output: Markdown listo para `build-cv.js`
- Template engine (Handlebars o similar) para las secciones fijas
- Tests con pares CV↔JD reales

**Agentes:** 1
**Rama:** `change/f8-assembler`
**Depende de:** F3 + F6
**Estimación:** ~450 líneas

---

### F9 — Cover Letter Generator

**Problema:** No existe en el pipeline. Se hizo manual para HUMA.

**Alcance:**
- Módulo `lib/cover-letter.js`
  - Input: `jd.json` + resultado del matcher (F6) + `cv.json`
  - Template-driven con slots para: apertura, 2-3 párrafos de logros relevantes, cierre
  - Usa LLM para redacción natural
  - Output: Markdown + PDF (reutilizando `build-cv.js` adaptado)
- Tests

**Agentes:** 1
**Rama:** `change/f9-cover-letter`
**Depende de:** F8
**Estimación:** ~250 líneas

---

### F10 — Analytics y Feedback Loop

**Problema:** 5 postulaciones, 4 closed sin respuesta. No sabemos qué funciona y qué no.

**Alcance:**
- Módulo `lib/analytics.js`
  - Tracking de postulaciones enriquecido: `jd-tracking.json` con campos extra
  - Métricas por postulación: score inicial, score final, keywords agregadas, fecha envío, respuesta (interview/rejected/ghosted), días hasta respuesta
  - Agregados: ¿qué keywords correlacionan con entrevistas? ¿qué score threshold predice callback?
  - Dashboard simple en Markdown (`applications/ANALYTICS.md`)
- Script `node scripts/analytics.js` que lee `jd-tracking.json` y genera el reporte

**Agentes:** 1
**Rama:** `change/f10-analytics`
**Depende de:** F6 + F7
**Estimación:** ~300 líneas

---

### F11 — Agente Hermes (Orquestador)

**Problema:** Todo el pipeline sigue siendo pasos manuales. Necesitamos un orquestador autónomo.

**Alcance:**
- Módulo `lib/hermes-agent.js`
  - Un solo comando: `node hermes.js <jd-url-or-text>`
  - Flujo autónomo:
    1. Scrapea/parsea JD (F5)
    2. Extrae keywords (F4)
    3. Matchea contra CV (F6)
    4. Scorea (F7)
    5. Ensambla CV (F8)
    6. Genera cover letter (F9)
    7. Guarda en `applications/[REF]/`
    8. Actualiza tracking
  - Modo interactivo (`--interactive`) que pausa en cada step para revisión humana
  - Modo batch (`--batch`) para procesar múltiples JDs
- CLI con `commander` o `yargs`
- README actualizado con el nuevo flujo

**Agentes:** 1
**Rama:** `change/f11-hermes-agent`
**Depende de:** F8 + F9 + F10
**Estimación:** ~400 líneas

---

## 🚀 Instrucciones para Agentes

Cada agente que tome un cambio debe:

1. **Leer este ROADMAP.md** antes de empezar
2. **Leer AGENTS.md** para entender el contexto del proyecto
3. **Leer `openspec/config.yaml`** para configuración SDD
4. **Trabajar en su branch** (`change/<slug>`)
5. **Actualizar la fila de su cambio** en la tabla de arriba al terminar (⬜ → ✅)
6. **Actualizar `Última actualización`** al final de este archivo
7. **No modificar archivos fuera de su scope** sin coordinación

---

## ⚠️ Riesgos y Notas

- **F1 debe ser el primer cambio** — todo lo demás depende de tener los CVs fuente consolidados.
- **F3, F4, F5 se pueden trabajar en paralelo** una vez que F1 está completo.
- **F6 requiere F3, F4, F5 mergeados** — es el punto de integración.
- **El PDF builder se mantiene intacto** durante todas las fases. Solo se modifica en F8 (assembler lo usa como dependencia).
- **Los CVs existentes en `applications/` no se migran** — son artefactos históricos. El nuevo pipeline aplica hacia adelante.
- **Agentes trabajan con worktrees** — no pisan el workspace principal.
