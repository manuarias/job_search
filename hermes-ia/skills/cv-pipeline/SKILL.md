---
name: CV Pipeline — Búsqueda y Procesamiento de Ofertas IT
description: |
  Busca ofertas de trabajo IT diariamente en Argentina, deduplica resultados,
  y procesa las pendientes por el pipeline de CV (Hermes) cuando el usuario lo solicita.
metadata:
  hermes:
    blueprint:
      schedule:
        kind: cron
        expr: "0 13 * * 1-5"
      deliver: origin
      prompt: |
        Sos un asistente de búsqueda laboral. Todos los días hábiles a las 13:00,
        ejecutá las siguientes búsquedas con web_search:

        web_search(query="ofertas trabajo Project Leader OR Lider proyectos OR IT Manager OR Desarrollador Java OR AI agent remoto Argentina", limit=8)

        web_search(query="empleos tecnologia liderazgo Java semi senior Argentina Bumeran Computrabajo", limit=8)

        web_search(query="linkedin jobs AI agent OR Engineering Manager OR Tech Lead Argentina remote", limit=8)

        De los resultados, extraé título, empresa y URL de cada oferta RELEVANTE.

        Filtros:
        - Nada de Mercado Libre
        - Remoto o Tandil, cualquier sueldo
        - Relevante para un perfil de Project Leader con background Java/APIs

        Formateá los resultados como array JSON y pasalos al script via terminal:
        ```
        echo '[{"url":"...","title":"...","company":"..."},...]' | bash ${HERMES_SKILL_DIR}/scripts/append-jds.sh
        ```

        El script deduplica por URL y agrega las nuevas a pending_jds.json.

        Respondé por Telegram con un resumen: cuántas ofertas nuevas encontraste y cuántas
        eran duplicadas. Si no hay ofertas nuevas, avisá igual ("Sin ofertas nuevas hoy").
    config:
      repo_path: "${HOME}/job_search"
---

# CV Pipeline Skill

## Propósito

Este skill automatiza dos tareas:

1. **Búsqueda diaria (cron)**: todos los días hábiles a las 13:00 busca ofertas IT en Argentina, deduplica por URL, y guarda las nuevas en `pending_jds.json`.
2. **Procesamiento batch (manual)**: cuando el usuario dice "procesá las ofertas", ejecuta el pipeline completo de CV (Hermes) sobre cada oferta pendiente.

## Dónde están los scripts

Todos los scripts están en `${HERMES_SKILL_DIR}/scripts/`. Este directorio se resuelve automáticamente según dónde esté instalado el skill.

- `${HERMES_SKILL_DIR}/scripts/append-jds.sh` — deduplica y agrega ofertas al archivo de estado
- `${HERMES_SKILL_DIR}/scripts/batch-process.sh` — procesa ofertas pendientes por el pipeline

## Configuración

La variable `JOB_SEARCH_PATH` apunta al directorio raíz del repositorio `job_search`.
Por defecto, el skill asume `${HOME}/job_search`. Si el repo está en otra ubicación,
configuralo en el `config.yaml` del perfil o exportá la variable de entorno.

```yaml
# En config.yaml del perfil Hermes IA:
JOB_SEARCH_PATH: /home/user/job_search
```

## Flujo diario (automático)

1. El cron dispara el blueprint a las 13:00 (lunes a viernes).
2. El agente ejecuta `web_search` con las queries configuradas en el blueprint.
3. Resultados se pasan a `append-jds.sh` que:
   - Normaliza URLs (quita trailing slash, lowercase host)
   - Calcula SHA-256 de cada URL
   - Descarta duplicados si el hash ya existe en `pending_jds.json`
   - Agrega nuevas ofertas con status `pending`
4. El agente envía un resumen a Telegram:
   - "🔍 Búsqueda del [fecha] — 5 nuevas ofertas (2 duplicados ignorados)"
   - O "😐 Sin ofertas nuevas hoy" si no hay nada

## Procesamiento batch (manual)

### Cómo dispararlo

El usuario envía cualquiera de estas frases:
- "procesá las ofertas"
- "procesar ofertas"
- "batch ofertas"
- "ejecutar pipeline de ofertas"
- "run pipeline"

### Qué hace el agente

Cuando recibís el trigger:

1. **Leé el estado**: verificá que exista `pending_jds.json` y tenga ofertas con status `pending`.
   ```bash
   cat ${JOB_SEARCH_PATH}/pending_jds.json | jq '[.[] | select(.status == "pending")]'
   ```

2. **Si no hay pendientes**: respondé "No hay ofertas pendientes para procesar."

3. **Si hay pendientes**: ejecutá el script batch:
   ```bash
   cd ${JOB_SEARCH_PATH} && bash ${HERMES_SKILL_DIR}/scripts/batch-process.sh
   ```

   El script:
   - Lee cada JD pendiente
   - Llama a `runPipeline(url, {lang:'es'})` que:
     - Scrapea el contenido de la URL (Greenhouse, Lever, Workday nativamente)
     - Extrae keywords
     - Matchea contra el CV
     - Calcula score
     - Genera CV optimizado, cover letter y PDF
   - Evalúa el umbral: score ≥ 75 Y matchLevel ≠ 'skip' → **procesada**
   - Si no alcanza: marca como **descartada**
   - Si hay error (URL rota, LinkedIn sin cookie): marca como **error**

4. **Entregá resultados por Telegram**:
   - Mensaje resumen: "📊 Pipeline batch — X procesadas, Y descartadas, Z errores"
   - Por cada oferta que calificó:
     - Report card (score + recomendaciones)
     - Archivos adjuntos: CV `.md`, cover letter `.md`, PDF
   - Por cada descartada: score y motivo breve

### Qué hace el script batch-process.sh

1. Filtra `pending_jds.json` → solo `status: "pending"`
2. Para cada JD:
   - Llama a `runPipeline(url, {lang:'es'})` vía Node.js
   - Evalúa: `score >= 75 AND matchLevel != 'skip'`
   - Si califica: genera PDF con `build-pdf.js`, marca `status: "processed"`
   - Si no califica: marca `status: "skipped"`
   - Si falla: marca `status: "error"`, loguea el error
   - Actualiza `pending_jds.json` después de cada JD (atómico)
3. Emite JSON resumen a stdout:
   ```json
   {
     "summary": { "total": 5, "processed": 3, "skipped": 1, "error": 1 },
     "results": [
       { "url": "...", "ref": "AR01", "score": 82, "matchLevel": "apply", ... }
     ]
   }
   ```

## Notas técnicas

### LinkedIn

Las URLs de LinkedIn requieren cookie `LI_AT`. Si no está configurada en el entorno,
`scrapeJD` fallará. El script captura este error y marca la JD como `error`.
Para habilitar LinkedIn, configurá `LI_AT` en las variables de entorno del VPS.

### Estado de las ofertas

El archivo `pending_jds.json` mantiene el ciclo de vida:
- `pending` → no procesada aún
- `processed` → pipeline completado, deliverables generados
- `skipped` → score bajo o matchLevel 'skip'
- `error` → falló el scrape o el pipeline

Las ofertas `processed` o `skipped` no se vuelven a procesar.

### Archivos generados

Cada oferta procesada crea una carpeta en `applications/{REF}/` con:
- `job-description.md`
- `keywords.json`
- `match.json`
- `score.json`
- `arias_emanuel-es-{REF}.md` (CV optimizado)
- `cover-letter.md`
- `arias_emanuel-es-{REF}.pdf`

## Troubleshooting

### "web_extract no funciona con esta URL"

Algunas URLs requieren JavaScript (SPAs, paywalls). El script `batch-process.sh`
usa `scrapeJD` que maneja Greenhouse, Lever y Workday. Para otros sitios,
el error se captura y la JD se marca como `error`.

### "Quiero resetear las ofertas pendientes"

Editá `pending_jds.json` manualmente o borralo para empezar de cero:
```bash
echo '[]' > ${JOB_SEARCH_PATH}/pending_jds.json
```

### "El PDF no se genera"

Verificá que `build-pdf.js` funcione correctamente:
```bash
cd ${JOB_SEARCH_PATH} && node scripts/build-pdf.js TESTREF --lang es
```
