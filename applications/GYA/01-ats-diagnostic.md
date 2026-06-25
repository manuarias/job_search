# Step 1: ATS Diagnostic — GYA

**CV:** `cv_en_v2.md` (Project Leader / EM / TPM profile)
**JDs:** 
- [871 — Python Semi Sr](job-description-871.md)
- [868 — Fullstack Jr/Semi Sr](job-description-868.md)

**Strategy:** Single CV covering both JDs (superset of keywords)

---

## 1. Parseability Issues

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Header uses pipe separators (`\|`) | Low | Header line 2 | Replace `\|` with standard text separators |
| Dashboards listed as a skill? Not explicitly in CV | Low | Core Skills | Add to relevant category |
| HarvardX (edX) as Education — no formal degree listed | Medium | Education | Framing is fine, but may not match "estudios avanzados en Ingeniería en Sistemas" filter |
| CV is in English, JDs are in Spanish | High | All | Must translate to Spanish (keywords técnicos en inglés) |

**ATS Parseability Score: 85/100** — Clean markdown, no tables, no images, no columns. Main issues: language mismatch and no formal degree.

---

## 2. Hard Keyword Gaps vs Combined JD Superset

### Exact Keyword Match

| Keyword | In CV? | Frequency in JD(s) | Notes |
|---------|--------|-------------------|-------|
| Python | ✅ Sí (minor, EXO CORP) | 4x (871) | Mencionado como secundario en experiencia antigua |
| Java | ✅ Sí | 3x (871) | Core en Mercado Libre |
| SQL Server | ❌ No | 6x (ambas) | CV tiene MySQL, CouchDB, MongoDB — **gap crítico** |
| API REST | ✅ Sí | 3x (868) | Mencionado en ML y EXO |
| Backend | ✅ Sí | 4x (ambas) | Core del perfil ML |
| Frontend | ❌ No | 3x (ambas) | CV no menciona frontend |
| Dashboards | ❌ No | 2x (ambas) | No aparece en CV |
| Análisis de datos | ❌ No | 2x (ambas) | No aparece explícitamente |
| Ciencia de datos | ❌ No | 2x (ambas) | No aparece |
| Grandes volúmenes de datos | ✅ Sí (implícito) | 2x (ambas) | 20,000+ RPM es equivalente |
| Herramientas IA | ✅ Sí (n8n + AI copilots) | 2x (ambas) | Aparece en ML experience |
| Agentes IA | ❌ No | 1x (871) | No mencionado explícitamente |
| Sistemas web / Aplicaciones de escritorio | ❌ No | 2x (868) | No aparece |
| SQL Server (Microsoft) | ❌ No | 2x (868) | Especificación de proveedor |

### Top 5 Critical Keyword Gaps

| # | Keyword | Impact | Why It Matters |
|---|---------|--------|----------------|
| 1 | **SQL Server** | 🔴 Crítico | Aparece 6 veces entre ambas JDs. Es el skill más demandado. Sin esto, el CV no pasa filtros ATS. |
| 2 | **Frontend / Sistemas web** | 🔴 Alto | Ambas JDs piden desarrollo frontend. CV actual es 100% backend. |
| 3 | **Dashboards** | 🔴 Alto | Mencionado en ambas JDs. Necesitamos conectar con experiencia en datos. |
| 4 | **Análisis / Ciencia de datos** | 🟡 Medio | Aparece en ambas JDs. Podemos reframear experience con datos. |
| 5 | **Agentes IA** | 🟡 Medio | JD 871 lo pide específicamente. Tenemos n8n + AI copilots, pero no "agentes". |

---

## 3. Soft Keyword / Semantic Gaps

| Soft Keyword | In CV? | Equivalent |
|-------------|--------|------------|
| Procesamiento de grandes volúmenes de datos | ✅ | 20,000+ RPM, high-traffic systems |
| Control y verificación de resultados | ✅ | Incident management, RCA, debugging engine |
| Trabajo en equipo dinámico | ✅ | Cross-functional squad leadership, mentoring |
| Estabilidad laboral y proyección | ✅ | 7+ years at Mercado Libre |
| Estudios avanzados en Sistemas | ❌ | HarvardX + edX — no es Ingeniería formal |

---

## 4. JD Red Flags

- **Ambas JDs** tienen descripciones genéricas y casi idénticas en responsabilidades ("Desarrollo y mantenimiento de soluciones backend y frontend", "Procesamiento y validación de grandes volúmenes de datos", "Control y verificación de resultados"). Son templates casi calcados.
- **JD 871** pide "Python Semi Sr" pero también Java y frontend — es un perfil más híbrido de lo que sugiere el título.
- **JD 868** dice "Junior o Semi Sr" — el rango es amplio. Con tu experiencia (10+ años, leadership en ML), podés quedar sobrecalificado si no ajustás el framing.
- **Ninguna JD** menciona herramientas específicas de frontend (React, Angular, Vue, etc.) — es vago.
- **No mencionan inglés** como requisito — raro para una empresa de Tandil con proyección.

---

## 5. Summary & Recommended Focus

| Métrica | Valor |
|---------|-------|
| **Hard keyword coverage (actual)** | ~45% |
| **Hard keyword coverage (target)** | 80%+ |
| **Top priority to add** | SQL Server, Frontend, Dashboards, Data Analysis |
| **Semantic match** | Fuerte en escala, liderazgo, y automation |
| **Biggest risk** | No tener SQL Server ni frontend explícito en el CV |
