# Step 5: Final Score — GYA

**CV:** Único para dos JDs (Python Semi Sr + Fullstack Jr/Semi Sr)
**Empresa:** Importante empresa de Tandil (vía GYA Recursos Humanos)

---

## Scoring Rubric

| Categoría | Peso | Qué mide |
|-----------|------|----------|
| **ATS-Parseability** | 40% | ¿Puede el bot leerlo? Formato, fechas, caracteres especiales. |
| **Keyword Alignment** | 30% | ¿Tiene las palabras que el ATS busca? Match vs ambas JDs. |
| **Recruiter Appeal** | 30% | ¿Un humano lo shortlista en 30 segundos? Hook, escaneabilidad. |

---

## Current State — CV Original (cv_en_v2.md sin optimizar)

### ATS-Parseability: 85/100
Markdown limpio, sin tablas ni imágenes. Penaliza:
- Header con `|` (5pts)
- CV en inglés (JDs en español) sin adaptación (10pts)

### Keyword Alignment: 40/100
- Java, API REST, backend: ✅ bien cubiertos
- Python, IA, volúmenes de datos: 🟡 presentes pero débiles
- SQL Server, Dashboards, Frontend, Agentes IA: ❌ ausentes

### Recruiter Appeal: 45/100
- Mercado Libre + métricas: ✅ hook fuerte
- Perfil de líder/manager: ❌ no matchea el tono de las JDs (buscan devs)
- Sin SQL Server ni frontend a la vista: ❌ recruiter descarta rápido

### Weighted Total — Current State

```
ATS-Parseability:    85 × 0.40 = 34.0
Keyword Alignment:   40 × 0.30 = 12.0
Recruiter Appeal:    45 × 0.30 = 13.5
                     --------------
                     TOTAL = 59.5/100
```

---

## Optimized State — Después de Steps 1-4

### ATS-Parseability: 90/100
- Se sacaron `|` del header ✅
- Ahora en español (keywords técnicos en inglés) ✅
- Fechas limpias, sin caracteres raros ✅
- Penaliza: sin "SQL Server" exacto (5pts)

### Keyword Alignment: 75/100
- Java, API REST, backend: ✅ fuerte
- Python: ✅ destacado al inicio
- Dashboards: ✅ agregado (Datadog + Tableau)
- Agentes IA: ✅ reframeado desde n8n
- Frontend: 🟡 mencionado (básico, sin exagerar)
- Análisis/ciencia de datos: ✅ agregado
- SQL Server: ❌ sigue siendo gap (no inventamos)

### Recruiter Appeal: 70/100
- Header cambió a "Desarrollador Fullstack | Python & Java | Automatización con IA" ✅
- Bullets reescritas con tono de dev, no de manager ✅
- Dashboard + IA skills destacan para empresa de Tandil ✅
- SQL Server ausente: recruiter humano puede notarlo ❌
- Perfil sigue siendo "senior de más" para rol Semi Sr 🟡

### Weighted Total — Optimized State

```
ATS-Parseability:    90 × 0.40 = 36.0
Keyword Alignment:   75 × 0.30 = 22.5
Recruiter Appeal:    70 × 0.30 = 21.0
                     --------------
                     TOTAL = 79.5/100
```

---

## Gap to 90+ Analysis

Para llegar a 90+, necesitaríamos:

| Gap | Puntos | Cómo cerrarlo |
|-----|--------|---------------|
| **SQL Server exacto** | +8 | Si el usuario confirma experiencia con SQL Server (aunque sea mínima), subiría Keyword Alignment a ~85. |
| **Frontend más explícito** | +5 | Si el usuario desarrolla más su experiencia frontend (proyectos, tecnologías concretas). |
| **Refinar seniority framing** | +3 | Si ajustamos aún más el tono para que no suene a "estoy sobrecalificado". |

**Máximo alcanzable sin inventar datos:** ~85/100 con la información actual.

---

## Top 3 Quick Wins

| Change | Category | Point Gain | Time | Effort |
|--------|----------|------------|------|--------|
| Agregar "SQL" en Core Skills como "Bases de datos relacionales (MySQL, SQL)" | Keyword | +5 | 1 min | Bajo |
| Agregar fundación Conocimiento Abierto como "Fullstack Developer" con bullet de sistemas web | Keyword + Appeal | +8 | 5 min | Bajo |
| Destacar Datadog dashboards + Tableau en la bullet de ML Project Leader | Keyword | +10 | 2 min | Bajo |

---

## Before vs After Comparison

| Métrica | Before (original) | After (optimized) | Δ |
|---------|------------------|-------------------|---|
| ATS-Parseability | 85 | 90 | +5 |
| Keyword Alignment | 40 | 75 | +35 |
| Recruiter Appeal | 45 | 70 | +25 |
| **Total Weighted** | **59.5** | **79.5** | **+20** |

---

## Score Card Visualization

```
Current:  ████████████████████████████████████████████████░░░░░░░░░░░░  59.5/100
Optimized:████████████████████████████████████████████████████████░░░░░░  79.5/100
Target:   ██████████████████████████████████████████████████████████████  90+/100
```

---

## Final Recommendations

### Must-Do
- [x] Traducir CV a español con keywords técnicos en inglés ✅
- [x] Reframear header de "Project Leader" a "Desarrollador Fullstack" ✅
- [x] Agregar dashboards (Datadog + Tableau) a bullets ✅
- [x] Destacar Python al inicio de la experiencia EXO ✅

### Do-If-Time
- [ ] Expandir experiencia de Fundación Conocimiento Abierto como Fullstack Developer
- [ ] Agregar bullet de frontend en AME (Administradora de Monederos Electrónicos)
- [ ] Confirmar si el usuario usó SQL Server aunque sea mínimamente

### Do-Not-Do
- ❌ No inventar SQL Server si no se usó
- ❌ No exagerar experiencia frontend
- ❌ No poner tecnologías que no se dominan (React, Angular, Vue)
