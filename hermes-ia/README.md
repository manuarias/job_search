# Hermes IA — CV Pipeline Skill

Skill que automatiza la búsqueda diaria de ofertas IT y su procesamiento por el pipeline de CV (Hermes) desde un agente Hermes IA corriendo en un VPS.

## Requisitos

- **Node.js** ≥ 18 (para `fetch` nativo y el pipeline Hermes)
- **jq** (manipulación de JSON en shell scripts)
- **Hermes IA** corriendo en un VPS (Linux) con perfil configurado
- **Git** para clonar el repositorio

### Instalar dependencias

```bash
# En Ubuntu/Debian
sudo apt-get install -y jq

# Verificar Node.js
node --version  # Debe ser ≥ 18
```

## Setup

### 1. Clonar el repositorio en el VPS

```bash
git clone https://github.com/tu-usuario/job_search.git ~/job_search
cd ~/job_search
pnpm install
```

### 2. Copiar SOUL.md al perfil de Hermes IA

```bash
cp hermes-ia/SOUL.md ~/.hermes/profiles/default/SOUL.md
```

Esto le da al agente la personalidad de Job Search Coach con conocimiento del pipeline.

### 3. Copiar el skill al directorio de skills

```bash
mkdir -p ~/.hermes/skills/cv-pipeline/
cp -r hermes-ia/skills/cv-pipeline/* ~/.hermes/skills/cv-pipeline/
```

El skill incluye:
- `SKILL.md` — blueprint con cron diario + instrucciones de batch
- `scripts/append-jds.sh` — deduplica y agrega ofertas a `pending_jds.json`
- `scripts/batch-process.sh` — procesa ofertas pendientes por el pipeline

### 4. Configurar el path del repositorio

En `~/.hermes/config.yaml` (o el archivo de configuración del perfil), agregar:

```yaml
JOB_SEARCH_PATH: /home/tu-usuario/job_search
```

Si el repositorio está en otra ubicación, ajustar el path.

### 5. Aceptar el blueprint

Cuando Hermes IA arranque, el skill ofrecerá el blueprint via `/suggestions`.
Aceptalo para que el cron diario de búsqueda quede activo.

El blueprint:
- **Schedule**: lunes a viernes a las 13:00 (hora Argentina, equivalente a 16:00 UTC)
- **Acción**: busca ofertas IT en Argentina, deduplica, guarda en `pending_jds.json`
- **Delivery**: resultados por Telegram al chat configurado

### 6. (Opcional) Configurar LinkedIn

Para que el pipeline pueda scrapear ofertas de LinkedIn, configurá la cookie `LI_AT`:

```bash
export LI_AT="tu-cookie-de-linkedin"
```

Sin esto, las URLs de LinkedIn se marcarán como `error` en el batch.
Las URLs de Greenhouse, Lever y Workday funcionan sin configuración adicional.

## Uso

### Cron diario (automático)

No requiere intervención. Todos los días hábiles a las 13:00:
1. El agente busca ofertas IT en Argentina
2. Deduplica contra `pending_jds.json`
3. Envía un resumen a Telegram con las nuevas ofertas encontradas

### Procesamiento batch (manual)

Cuando quieras procesar las ofertas acumuladas, enviale al agente:

- "procesá las ofertas"
- "procesar ofertas"
- "batch ofertas"

El agente:
1. Lee `pending_jds.json`
2. Para cada oferta pendiente, ejecuta el pipeline completo de CV
3. Evalúa el score (≥ 75 y matchLevel ≠ 'skip' → genera CV + cover letter + PDF)
4. Entrega resultados por Telegram con archivos adjuntos

### Estado de las ofertas

El archivo `pending_jds.json` (en la raíz del repo) mantiene el tracking:

| Estado | Significado |
|--------|-------------|
| `pending` | No procesada aún |
| `processed` | Pipeline completado, deliverables generados en `applications/{REF}/` |
| `skipped` | No alcanzó el umbral de score |
| `error` | Falló el scrape o el pipeline |

Las ofertas `processed` o `skipped` no se vuelven a procesar.

## Estructura de archivos

```
hermes-ia/
├── README.md                                    ← Este archivo
├── SOUL.md                                      ← Personalidad del agente
└── skills/
    └── cv-pipeline/
        ├── SKILL.md                             ← Blueprint + instrucciones
        └── scripts/
            ├── append-jds.sh                    ← Dedup y append
            └── batch-process.sh                 ← Procesamiento batch
```

## Troubleshooting

### "web_extract no funciona con esta URL"

Algunas URLs requieren JavaScript o tienen paywalls. El pipeline maneja nativamente:
- **Greenhouse** (boards.greenhouse.io)
- **Lever** (jobs.lever.co)
- **Workday** (*.myworkdayjobs.com)

Para otros sitios, el error se captura y la oferta se marca como `error`.

### "LinkedIn no funciona"

Requiere la cookie `LI_AT` configurada como variable de entorno.
Sin ella, las URLs de LinkedIn se marcan como `error`.

### "No hay ofertas pendientes"

El cron busca de lunes a viernes a las 13:00. Si no hay ofertas nuevas, es normal —
el mercado IT argentino no publica cientos de ofertas por día para estos perfiles.

### Resetear ofertas pendientes

Para empezar de cero:

```bash
echo '[]' > ~/job_search/pending_jds.json
```

### "El PDF no se genera"

Verificar que `build-pdf.js` funcione:

```bash
cd ~/job_search && node scripts/build-pdf.js TESTREF --lang es
```

Si falla, revisar que `pnpm install` se haya ejecutado correctamente y que las
dependencias (Playwright) estén instaladas.

## Archivos generados por el pipeline

Cada oferta procesada crea en `applications/{REF}/`:

```
applications/AR01/
├── job-description.md         ← JD scrapeada
├── keywords.json              ← Keywords extraídas
├── match.json                 ← Resultado del matcher
├── score.json                 ← Score detallado
├── arias_emanuel-es-AR01.md   ← CV optimizado
├── cover-letter.md            ← Cover letter
└── arias_emanuel-es-AR01.pdf  ← PDF profesional
```

## Rollback

Para desinstalar el skill:

```bash
# Quitar el skill
rm -rf ~/.hermes/skills/cv-pipeline/

# Restaurar SOUL.md original
# (el SOUL.md original estaba en ~/.hermes/profiles/default/ antes de copiar)

# Limpiar estado
echo '[]' > ~/job_search/pending_jds.json
```

El pipeline core (`lib/`, `scripts/`) no se modifica — solo se agregan archivos nuevos en `hermes-ia/`.
