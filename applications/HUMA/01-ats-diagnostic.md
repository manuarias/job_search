# Step 1: ATS Diagnostic — HUMA

**Role:** Engineering Manager @ Humand
**Source CV:** `resumes/cv_en.md`
**JD:** `applications/HUMA/job-description.md`

---

## Parseability Issues

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Code blocks (```) alrededor de header y education | **High** | Header, Education section | Reemplazar con texto plano o pipes `\|` |
| Caracteres especiales (+54 9 15...) | **Low** | Header | Se mantiene, ATS modernos lo soportan |
| `|` pipes en el header | **Med** | Header | Reemplazar con comas o guiones |
| Línea separadora `---` | **Low** | Entre secciones | Inofensivo, pero mejor evitar |
| Bullets con `*` en lugar de `-` | **Low** | Toda la experiencia | ATS lo parsea igual, pero ser consistentes |
| Negritas `**` | **Low** | Varias secciones | Generalmente tolerado, usar con moderación |
| Fechas en formato "Ene 2023 – Nov 2025" | **Med** | Experience section | Usar "Jan 2023 – Nov 2025" (inglés) o estandarizar. El "Ene" puede no parsear bien |
| Bullets con emojis 🚀 | **Low** | N/A (no hay en CV) | Bien, no hay emojis en el CV actual |

---

## Hard Keyword Gaps vs JD

| Keyword (JD) | In CV? | Count (CV) | Count (JD) | Gap |
|-------------|--------|------------|------------|-----|
| Engineering Manager | ❌ | 0 | 2 | **CRITICAL** — el CV dice "Project Leader" |
| Squad(s) | ✅ | 2 | 3 | OK |
| Backlog | ✅ | 1 | 1 | OK (implicitamente) |
| Product Manager | ❌ | 0 | 1 | **HIGH** — collaborates with PM |
| Roadmap(s) | ✅ | 1 | 1 | OK |
| Stakeholders | ✅ | 1 | 1 | OK |
| Calidad / Quality | ❌ | 0 | 1 | **MED** — "estándares de calidad" |
| Planificar / Planning | ✅ | 1 | 1 | OK |
| Estimar / Estimation | ❌ | 0 | 1 | **MED** |
| Equipo / Team | ✅ | 5+ | 3 | OK |
| Desarrollo / Development | ✅ | 3 | 2 | OK |
| Cultura de equipo | ❌ | 0 | 1 | **LOW** — team culture |
| Crecimiento profesional | ❌ | 0 | 1 | **MED** — professional growth |
| Inglés avanzado | ✅ | 1 (Professional Working) | 1 | OK, pero "Advanced" vs "Professional Working" es sutil |
| Entrega de software / Delivery | ✅ | 3 | 2 | OK |
| N8n (automation) | ✅ | 1 | 0 | Nice-to-have, not in JD |
| Jira | ✅ | 1 | 0 | Implied by backlog management |
| Agile / Scrum / Kanban | ✅ | 1 | 0 | Implied by squad methodology |

---

## Soft Keyword / Semantic Gaps

| Soft Skill (JD) | Matched in CV? | Evidence |
|----------------|---------------|----------|
| Liderazgo técnico + personas | ✅ Parcial | CV mentions "leading squad", "mentored", but JD emphasizes dual technical+people leadership |
| Proactividad para resolver desafíos | ✅ | Shadow Processing Engine case — strong evidence |
| Colaboración con stakeholders | ✅ | "high-stakes negotiations", "aligning stakeholders" |
| Alinear expectativas | ✅ | Stakeholder alignment mentioned |
| Comunicar avances | ✅ | Implied by stakeholder management |
| Ambiente colaborativo | ✅ | Team culture, mentoring |
| Balancear carga de trabajo | ❌ | No se menciona workload balancing explícitamente |
| Mejorar capacidad y rendimiento | ✅ | Operational excellence, automation initiatives |
| Desarrollo técnico de miembros | ✅ | Mentoring, technical decision-making facilitation |

---

## Top 5 Critical Keyword Gaps

1. **🔴 "Engineering Manager"** — El título actual es "Project Leader". Es el gap más crítico. El header y summary deben decir "Engineering Manager".
2. **🟡 "Product Manager" collaboration** — No se menciona explícitamente en el CV. Es una responsabilidad clave de la JD.
3. **🟡 "Calidad / Quality standards"** — El CV no menciona explícitamente aseguramiento de calidad en entregas.
4. **🟡 "Estimación / Estimation"** — No aparece en el CV. La JD pide habilidades para estimar.
5. **🟡 "Crecimiento profesional / Professional growth"** — El CV menciona mentoring pero no enmarcado como "fomentar crecimiento profesional".

---

## JD Red Flags

- **Ninguno significativo.** La JD es clara, consistente y bien estructurada. Sin contradicciones ni copy-paste errors.
- El rango de experiencia no se especifica numéricamente (años), lo cual es positivo — da flexibilidad.
- No menciona stack tecnológico específico (lenguajes, frameworks), lo que sugiere que el foco es gestión, no código.
