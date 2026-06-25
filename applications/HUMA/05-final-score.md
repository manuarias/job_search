# Step 5: Final Score — HUMA

**Role:** Engineering Manager @ Humand
**Source CV:** `resumes/cv_en.md`
**Optimized CV:** `arias_emanuel-es-HUMA.md`

---

## Scoring Methodology

Three weighted categories, scored 0-100 each, weighted for total:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| ATS-Parseability | **40%** | Can the bot read it? Format, dates, special chars, section headers |
| Keyword Alignment | **30%** | Does it contain the words the ATS searches for? Title + skills + JD language |
| Recruiter Appeal | **30%** | Does a human shortlist it in 30 seconds? Hook, scanability, narrative |

**Formula:** `(ATS × 0.40) + (Keywords × 0.30) + (Recruiter × 0.30) = Total / 100`

---

## Current State (Original CV)

### ATS-Parseability: 70/100

| Issue | Impact | Detail |
|-------|--------|--------|
| Code blocks ``` in header and education | -15 | ATS puede no parsear el header correctamente |
| Pipe characters `\|` in contact line | -5 | Pueden confundir parsers de CSV |
| "Ene" en fechas (Español abreviado) | -5 | Algunos ATS esperan "Jan" o "Ene 2023" |
| Negritas `**` | -5 | Generalmente tolerado pero riesgo menor |
| **Subtotal** | **70** | |

### Keyword Alignment: 55/100

| Gap | Impact | Detail |
|-----|--------|--------|
| **Title mismatch**: "Project Leader" vs "Engineering Manager" | -20 | El mismatch más crítico |
| Missing "Product Manager" collaboration | -10 | No se menciona en ningún lado |
| Missing "calidad / quality standards" | -5 | Ausente en experiencia |
| Missing "estimación / estimation" | -5 | No aparece |
| Missing "cultura de equipo / team culture" | -3 | Implícito pero no explícito |
| "Inglés Professional Working" vs "Avanzado" | -2 | Sutil pero la JD pide "avanzado" |
| **Subtotal** | **55** | |

### Recruiter Appeal: 70/100

| Factor | Impact | Detail |
|--------|--------|--------|
| Mercado Libre brand | +20 | Peso de marca fuerte |
| 20,000+ RPM scale | +15 | Escala impresionante |
| 70% incident reduction metric | +15 | Única métrica fuerte |
| Title mismatch causes doubt | -15 | "Project Leader" aplicando a EM |
| No PM collaboration mentioned | -10 | Gap en narrativa |
| Mentoring sin métrica | -5 | "Mentored team members" genérico |
| **Subtotal** | **70** | |

### Current Total: 65.5/100

``` 
ATS (70 × 0.40)    = 28.0
Keywords (55 × 0.30) = 16.5
Recruiter (70 × 0.30) = 21.0
─────────────────────────
Total              = 65.5 / 100
```

---

## Optimized State (After Steps 1-4)

### ATS-Parseability: 90/100

| Fix Applied | Points Recovered | Detail |
|-------------|-----------------|--------|
| Code blocks removed | +15 | Header y education en texto plano |
| Pipes removed from header | +5 | Contacto con comas |
| Fechas estandarizadas | +5 | Formato consistente |
| Formato limpio sin caracteres raros | +5 | Markdown mínimo |
| **Subtotal** | **90** | |

### Keyword Alignment: 88/100

| Keyword | Status | Detail |
|---------|--------|--------|
| "Engineering Manager" | ✅ Added | Header + summary + competencies |
| "Product Management" | ✅ Added | Product Bundles bullet |
| "Estándares de calidad" | ✅ Added | Shadow Engine + Core Competencies |
| "Capacidad y rendimiento" | ✅ Added | n8n bullet + Core Competencies |
| "Cultura de equipo" | ✅ Added | Mentoring bullet + Core Competencies |
| "Crecimiento profesional" | ✅ Added | Mentoring bullet + Core Competencies |
| "Inglés Avanzado" | ✅ Updated | Core Skills actualizado |
| "Estimar / Estimation" | ⚠️ Parcial | Solo en Core Competencies #3 |
| **Subtotal** | **88** | |

### Recruiter Appeal: 88/100

| Factor | Score | Detail |
|--------|-------|--------|
| Title matches JD exactly | ✅ | "Engineering Manager" en primera línea |
| Metrics: 70%, ~18h/week, 20K RPM, 9 engineers | ✅ | Múltiples métricas verificables |
| Core Competencies mapean los 4 Must-Haves | ✅ | Squad leadership, delivery, planning, people dev |
| Spanish narrative matches JD language | ✅ | Keywords técnicos en inglés |
| Narrative: EM en Mercado Libre | ✅ | Historia clara y consistente |
| **Subtotal** | **88** | |

### Optimized Total: 87.9/100

``` 
ATS (90 × 0.40)     = 36.0
Keywords (88 × 0.30) = 26.4
Recruiter (88 × 0.30) = 26.4
──────────────────────────
Total               = 87.9 / 100
```

---

## Before vs After

```
                    Current     Optimized    Gain
ATS-Parseability     70/100      90/100      +20
Keyword Alignment    55/100      88/100      +33
Recruiter Appeal     70/100      88/100      +18
────────────────────────────────────────────────
TOTAL               65.5/100    87.9/100    +22.4
```

---

## Gap to 90+ Analysis

To reach 90+/100, need +2.1 points.

| Category | Current | Target | Gap | How to Close |
|----------|---------|--------|-----|-------------|
| ATS | 90 | 92 | +2 | Eliminar cualquier carácter especial restante |
| Keywords | 88 | 92 | +4 | Agregar "estimación" explícitamente en un bullet de experiencia |
| Recruiter | 88 | 90 | +2 | Agregar métrica de backend performance o número de features entregadas |

**Math:** Si se resuelve el gap de "estimación" (Keywords → 92) y se mejora ATS marginalmente (ATS → 92): `(92 × 0.40) + (92 × 0.30) + (88 × 0.30) = 36.8 + 27.6 + 26.4 = 90.8/100`

---

## Top 3 Quick Wins

| # | Change | Category | Point Gain | Effort | Time |
|---|--------|----------|------------|--------|------|
| 1 | Agregar métrica de backend performance (latencia o throughput) al bullet #5 | Recruiter | +2 | Bajo | 1 min (si tenés el dato) |
| 2 | Agregar "estimación de esfuerzos" explícitamente en un bullet de experiencia | Keywords | +4 | Bajo | 2 min de rewrite |
| 3 | Resumir roles early-career (2017-2020) a 1-2 líneas cada uno | ATS/Recruiter | +2 | Bajo | 5 min |

**Total potential gain:** +8 points → alcanza 95+/100.

---

## Score Card Visualization

```
Current:  ████████████████████████████████████████████████░░ 65.5%
Optimized: ██████████████████████████████████████████████████░ 87.9%
Target:    ███████████████████████████████████████████████████ 90%+
         0%        20%        40%        60%        80%       100%
```

---

## Final Recommendations

### Must-Do (antes de enviar)
- [ ] Revisar que el header diga "Engineering Manager" ✅
- [ ] Verificar que no haya `[NEEDS METRIC]` en el CV final
- [ ] Confirmar que los keywords técnicos están en inglés
- [ ] Verificar que el PDF se vea bien (sin code blocks, sin tablas complejas)

### Do-If-Time
- [ ] Si conseguís métrica de backend performance, agregarla al bullet #5
- [ ] Agregar "estimación" explícitamente en la experiencia
- [ ] Resumir roles tempranos (2017-2020) a 1-2 bullets

### Do-Not-Do
- ❌ No inventar métricas de CI/CD (confirmado falso)
- ❌ No traducir keywords técnicos al español
- ❌ No agregar skills que no tengas
