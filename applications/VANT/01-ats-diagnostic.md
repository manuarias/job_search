# Step 1: ATS Diagnostic — Vantegrate Salesforce Developer Junior (VANT)

**Role:** Enterprise ATS Parser (Workday, Greenhouse, Lever)
**Source CV:** `resumes/cv_en.md` (Project Leader / SWE profile)
**Target JD:** `applications/VANT/job-description.md`

---

## 1. Parseability Analysis

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Header contact info wrapped in code block (```) | **High** | Lines 2-4 | Remove ```, use plain text or pipes |
| Education section in code block (```) | **High** | Lines 65-67 | Convert to plain markdown list |
| Month abbreviation "Ene" (Spanish) mixed with English content | **Low** | Dates in Mercado Libre entries | Use "Jan" consistently (English CV) |
| Company + Title + Location + Dates in single bold line with pipes | **Medium** | All experience entries | Split into 2-3 lines per template format (company alone, title+location, dates) |
| "Earliest Experience" uses bullet format with nested bold | **Low** | Lines 59-62 | Standardize to same format as main roles |
| Special chars in metrics (20,000+ RPM with comma) | **Low** | Line 26 | Remove comma: `20000+ RPM` |
| "KITs Project" / "Kits" inconsistent capitalization | **Low** | Lines 28, 32 | Standardize to "KITs" or "Kits" |
| No standard section for "Certifications" — bundled under Education | **Low** | Education section | Split Education & Certifications |
| No LinkedIn URL as clickable link | **Low** | Header | Add full URL |
| CV language is **English**, JD is **Spanish** | **Med** | Entire CV | Rewrite narrative in Spanish (keywords stay English) |

**Veredicto de parseabilidad:** El CV es limpio (Markdown simple, sin tablas, sin imágenes, sin columnas), pero los code blocks (```) alrededor del header y education confunden a parsers de ATS como Workday y Greenhouse. Es un fix fácil.

---

## 2. Hard Keyword Gap Analysis

### Hard Skills Present ✅

| Keyword | Source | Location |
|---------|--------|----------|
| n8n | Summary + Experience (ML) | Mentioned explicitly as automation tool |
| REST APIs | Core Skills | "API Design (REST)" |
| Java | Core Skills + Experience | Java ecosystem, backend services |
| JavaScript / Node.js | Experience | Exo Corp (Node.js) |
| Python | Experience | Exo Corp |
| Git / GitHub | Core Skills + Tools | "GitHub" listed |
| Docker | Core Skills | Mentioned |
| Agile / Scrum / Kanban | Core Skills + Summary | "Agile Leadership (Scrum/Kanban)" |
| CI/CD | Experience | "optimizing CI/CD pipelines" (Sr SWE role) |
| Jira | Core Skills + Experience | "restructuring Jira workflows" |
| SQL (relational) | Experience (implied) | CouchDB/MongoDB (NoSQL, partial match) |
| OOP (Java, JavaScript) | Entire profile | Implied through Java experience |
| APIs / Microservices | Core Skills + Experience | "Microservices Architecture, API Design" |
| JSON (implied) | Experience | REST APIs imply JSON |
| Monitoring / Observability | Core Skills | Datadog, New Relic |

### Hard Skills Missing ❌

| Keyword | Importance | JD Context |
|---------|-----------|------------|
| **Salesforce** | **Critical** | Core platform — appears 15+ times in JD |
| **Apex** | **Critical** | Main dev language for Salesforce |
| **Flows (Screen Flows, Record-Triggered Flows, Subflows)** | **Critical** | Core Salesforce automation |
| **Lightning Web Components (LWC)** | **Critical** | UI layer in Salesforce |
| **SOQL** | **High** | Salesforce query language |
| **Salesforce Data Model** (objects, custom objects, lookup, master-detail) | **High** | Foundation of platform |
| **OAuth** | **High** | REST API auth requirement |
| **Webhooks** | **High** | n8n integration requirement |
| **AI Agents / Function Calling** | **Medium** | Listed as nociones/understanding |
| **Prompt Engineering** | **Medium** | AI agent concept |
| **Agentforce** | **Low** | Nice to have |
| **ES6+ JavaScript** (async/await, fetch) | **Low** | Nice to have |

---

## 3. Soft Keyword / Semantic Gap Analysis

### Soft Skills Present ✅

| Keyword | Semantic Match | Location |
|---------|---------------|----------|
| Liderazgo / Leadership | ✅ Strong | Project Leader, mentoring, team of 9 |
| Stakeholder Management | ✅ Strong | "Negotiating with stakeholders" |
| Cross-functional collaboration | ✅ | "Aligning UX, Product, and Commercial stakeholders" |
| Risk Management / Mitigation | ✅ | "Risk Mitigation", custom debugging engine |
| Mentorship / Talent Development | ✅ | "Mentored team members" |
| Delivery / End-to-end | ✅ | "Spearheaded end-to-end delivery" |
| Process Improvement | ✅ | Restructuring workflows, automation |
| Autonomía | ✅ Implied | Led projects independently at ML |
| Comunicación | ✅ | Stakeholder alignment implies it |

### Soft Skills Missing ❌

| Keyword | Importance | JD Context |
|---------|-----------|------------|
| **Documentación técnica** | **Med** | Explicitly in JD responsibilities |
| **Adaptabilidad / Resiliencia** | **Med** | JD lists as cultural values |
| **Curiosidad / Aprendizaje continuo** | **Med** | ADN section of JD |
| **Resolución autónoma de problemas** | **Med** | "tomar un requerimiento, investigar y resolverlo" |
| **Feedback / Mejora continua** | **Low** | "proponer mejoras basadas en feedback" |
| **Accountability** | **Low** | JD ADN value |
| **Empatía / Colaboración** | **Low** | JD cultural values |

---

## 4. Top 5 Critical Keyword Gaps vs JD

| # | Keyword | Gap | Impact |
|---|---------|-----|--------|
| 1 | **Salesforce** (platform) | ❌ Not mentioned anywhere in CV. JD mentions it 15+ times. The role IS a Salesforce Developer. | **Critical — ATS will reject without this keyword** |
| 2 | **Apex** | ❌ Not mentioned. Primary development language for Salesforce. | **Critical — must-have for the role** |
| 3 | **Flows / Lightning Web Components** | ❌ Not mentioned. Core Salesforce customization tools. | **Critical — listed as main responsibilities** |
| 4 | **SOQL** | ❌ Not mentioned. Salesforce query language. | **High — required under "Bases de datos"** |
| 5 | **OAuth / API Auth** | ❌ Not mentioned explicitly. CV mentions REST but not auth methods. | **High — explicit JD requirement under APIs** |

---

## 5. JD Red Flags / Observations

- **Contradicción de nivel:** El título dice "Junior" pero la descripción pide "Perfil semi-senior" con "capacidad para ejecutar de manera autónoma" — hay ambigüedad en el nivel esperado.
- **n8n como requisito vs nice-to-have:** En la sección "n8n y automatización" lo ponen como requerido, pero en la descripción general dicen "Make o Zapier cuentan, n8n es un plus fuerte" — inconsistencia.
- **Expectativa de Salesforce vs disposición a capacitar:** Por un lado exigen Apex/Flows/LWC, por otro dicen "si no tenés experiencia en Salesforce, contamos con programas de capacitación interna" — abre la puerta a perfiles sin experiencia Salesforce.
- **Sobrecalificación potencial:** El perfil del candidato (10+ años, Project Leader en Mercado Libre) excede el target "Junior/Semi-Senior" del rol. Habría que ajustar el framing hacia un perfil más técnico y hands-on, no de liderazgo.

---

## Summary

| Category | Score | Notes |
|----------|-------|-------|
| **ATS Parseability** | 70/100 | Clean Markdown but code blocks hurt parsing |
| **Hard Keyword Coverage** | 35/100 | Strong on n8n/APIs/Agile, zero on Salesforce ecosystem |
| **Soft Keyword Coverage** | 50/100 | Strong leadership/autonomy, missing documentation/adaptability framing |
| **Overall** | **45/100** | Salesforce gap is the elephant in the room; n8n + APIs + Agile are strong anchors |
