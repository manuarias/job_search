# Job Description — CV Tracking

Registro único de todas las postulaciones. Ordenado por fecha de creación (más reciente arriba).

---

## Postulaciones

| REF | Company | Role | JD | Final CV | Score | Status | Created | Updated |
|-----|---------|------|-----|----------|-------|--------|---------|---------|
| UNKN | Unknown Company | Unknown Role | [JD](UNKN/job-description.md) | [CV](UNKN/arias_emanuel-en-UNKN.md) | 82/100 | In Progress | 2026-06-28 | 2026-06-28 ||
| ARXX | Ar | Trabajo de lider tecnico java | Ofertas laborales Argentina 2026 | [JD](ARXX/job-description.md) | 64/100 | — | In Progress | 2026-06-26 || 2026-06-26 |
| HUMA | Humand | Engineering Manager | [JD](HUMA/job-description.md) | [CV](HUMA/arias_emanuel-es-HUMA.md) | 88/100 | Closed | 2026-05-21 | 2026-06-04 |
| VANT | Vantegrate | Salesforce Developer Junior | [JD](VANT/job-description.md) | [CV](VANT/arias_emanuel-es-VANT.md) | 79/100 | Closed | 2026-05-21 | 2026-06-04 |
| SIMR | Simera | Java Developer (Mid-Level) | [JD](SIMR/job-description.md) | [CV](SIMR/arias_emanuel-en-SIMR.md) | 88/100 | Closed | 2026-05-07 | 2026-05-21 |
| GYA | Empresa Tandil (x GYA) | Python Semi Sr + Fullstack Jr/Semi Sr | [JD1](GYA/job-description-871.md) · [JD2](GYA/job-description-868.md) | [CV](GYA/arias_emanuel-es-GYA.md) | 79.5/100 | Submitted | 2026-06-04 | 2026-06-04 |
| AGIL | AgileEngine | Technical Program Manager (Part-time) | [JD](AGIL/job-description.md) | [CV](AGIL/arias_emanuel-en-AGIL.md) | 88/100 | Closed | 2026-05-06 | 2026-05-21 |

---

## Estados

| Status | Significado |
|--------|-------------|
| **In Progress** | Optimización en curso (pasos 1-5) |
| **Ready** | CV finalizado, listo para enviar |
| **Submitted** | Enviado a la empresa |
| **Interview** | En proceso de entrevistas |
| **Offer** | Oferta recibida |
| **Rejected** | No continuó |
| **Withdrawn** | Me retiré |
| **Closed** | Sin respuesta después de un tiempo prolongado |

---

## Cómo agregar una nueva postulación

1. Generar un código REF único (4+ letras, ej: `META`, `GOOG`)
2. Crear carpeta: `applications/[REF]/`
3. Guardar la JD como `job-description.md`
4. Ejecutar el flujo de optimización (ver `AGENTS.md`)
5. Agregar fila a la tabla con `Created = YYYY-MM-DD` y `Updated = YYYY-MM-DD`
6. Ir actualizando `Updated` cada vez que cambie el estado

**Reglas:**
- Ordenar por `Created` descendente (más reciente arriba)
- `Updated` siempre debe ser >= `Created`
- El `Score` se completa al finalizar el Step 5

