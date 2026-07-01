# VPS Setup Guide — Hermes IA + CV Pipeline

Guía paso a paso para levantar el pipeline de optimización de CV en un VPS con Hermes IA, conectado por Telegram.

## Requisitos

- **VPS con Linux** (Ubuntu/Debian recomendado)
- **Node.js** ≥ 18
- **pnpm** (gestor de paquetes)
- **jq** (JSON en shell scripts)
- **Hermes IA** instalado y corriendo
- **Playwright** (Chromium para PDFs)

---

## 1. Instalar dependencias del sistema

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+ (vía NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version   # ≥ 18
npm --version

# Instalar pnpm
npm install -g pnpm

# Instalar jq
sudo apt install -y jq
```

## 2. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/job_search.git ~/job_search
cd ~/job_search
pnpm install
```

## 3. Preparar tus datos personales

El repo viene con templates. Copialos y completalos con tu información:

```bash
# CV estructurado (JSON)
cp data/cv_en.json.template data/cv_en.json
cp data/cv_es.json.template data/cv_es.json
# ✏️ Editá data/cv_en.json y data/cv_es.json con tus datos

# Tracking de aplicaciones
cp data/jd-tracking.json.template data/jd-tracking.json

# CV en Markdown (si usás el generador de PDF)
cp resumes/cv_en.md.template resumes/cv_en.md
cp resumes/cv_es.md.template resumes/cv_es.md
# ✏️ Editá con tu CV en Markdown

# Tracking de postulaciones
cp applications/jd-tracking.md.template applications/jd-tracking.md

# Verificar que todo esté en orden
pnpm test
# → 533 tests should pass (usan fixtures anónimos)
```

> 💡 Si tenés tus datos en otro lado, podés usar `JS_DATA_DIR`:
> ```bash
> export JS_DATA_DIR=/ruta/a/tus/datos
> ```
> Así no necesitás copiar nada a `~/job_search/data/`.

### Sincronizar templates con cambios futuros

Cuando el repo reciba updates con nuevos campos en los templates:

```bash
git pull
node scripts/sync-data.js           # detecta campos nuevos
node scripts/sync-data.js --dry-run  # previsualizar sin escribir
```

## 4. Instalar Playwright (Chromium para PDFs)

```bash
npx playwright install chromium
npx playwright install-deps chromium   # dependencias del sistema
```

Verificar:
```bash
node scripts/build-pdf.js --help
```

## 5. Configurar Hermes IA

### 5.1 Crear perfil (si no existe)

```bash
hermes profile create jobhunter --description "Asistente de búsqueda laboral IT"
```

### 5.2 Copiar personalidad y skill

```bash
# SOUL.md — personalidad del agente
cp ~/job_search/hermes-ia/SOUL.md ~/.hermes/profiles/jobhunter/SOUL.md

# Skill cv-pipeline — blueprint + instrucciones
mkdir -p ~/.hermes/skills/cv-pipeline/
cp -r ~/job_search/hermes-ia/skills/cv-pipeline/* ~/.hermes/skills/cv-pipeline/
```

### 5.3 Configurar el perfil

```bash
# Apuntar al directorio del proyecto
hermes -p jobhunter config set terminal.cwd ~/job_search

# Configurar el path del repo (para los scripts del skill)
hermes -p jobhunter config set skills.config.cv-pipeline.repo_path ~/job_search
```

### 5.4 Configurar Telegram

En `~/.hermes/profiles/jobhunter/.env`:

```bash
TELEGRAM_BOT_TOKEN=tu_token_del_bot
```

Para crear un bot de Telegram: hablale a [@BotFather](https://t.me/BotFather), creá un bot, y copiá el token.

### 5.5 Iniciar el gateway

```bash
# Como servicio persistente (recomendado)
hermes -p jobhunter gateway install
hermes -p jobhunter gateway start

# O manual para testing
hermes -p jobhunter gateway start
```

### 5.6 Aceptar el blueprint del cron

En una sesión de chat con el agente (por Telegram o CLI):

```
/suggestions
/suggestions accept 1
```

Esto activa el cron diario que busca ofertas IT de lunes a viernes. Podés verlo con:

```bash
hermes -p jobhunter cron list
```

## 6. Verificar que todo funciona

### 6.1 Pipeline desde el VPS

```bash
cd ~/job_search
node scripts/hermes.js "Buscamos Senior Engineer con experiencia en Java y microservicios..." --lang es
```

### 6.2 PDF builder

```bash
node scripts/build-pdf.js --help
```

### 6.3 Cron de búsqueda

```bash
# Ejecutar manualmente para testear
hermes -p jobhunter cron run <job-id>
```

## 7. Flujo diario

```
┌─ 10:00 ART (lun-vie) ──────────────────────────────┐
│  Cron busca ofertas IT en Argentina                 │
│  Deduplica y guarda en pending_jds.json             │
│  Notifica por Telegram: "3 ofertas nuevas"          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Cuando quieras ────────────────────────────────────┐
│  Escribí "procesá las ofertas" por Telegram         │
│  El agente ejecuta el pipeline en batch             │
│  Score ≥ 75 → genera CV + cover letter + PDF        │
│  Entrega resultados con archivos adjuntos           │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### "web_extract no funciona con esta URL"

Algunas URLs requieren JavaScript. El pipeline maneja nativamente Greenhouse, Lever, y Workday. Para otros sitios, el error se captura y la oferta se marca como `error`. Para LinkedIn se necesita cookie `LI_AT`.

### "LinkedIn no funciona"

Requiere cookie `LI_AT` en el entorno:

```bash
export LI_AT="tu-cookie-de-linkedin"
```

### "No hay ofertas pendientes"

El cron busca de lunes a viernes. Si no hay ofertas nuevas, es normal — el mercado no publica cientos de ofertas por día.

### "El PDF no se genera"

```bash
cd ~/job_search
npx playwright install chromium
npx playwright install-deps chromium
node scripts/build-pdf.js --help  # verificar que funcione
```

### "Los tests fallan"

```bash
pnpm test
```
Los tests usan fixtures anónimos — no necesitan tus datos personales. Si fallan, revisá que `pnpm install` se haya ejecutado correctamente.

### "El tracking no se actualiza"

Verificá que `applications/jd-tracking.md` exista:
```bash
ls ~/job_search/applications/jd-tracking.md
```
Si no existe, copialo del template:
```bash
cp ~/job_search/applications/jd-tracking.md.template ~/job_search/applications/jd-tracking.md
```

### Resetear todo

```bash
# Limpiar ofertas pendientes
echo '{"jds":[]}' > ~/job_search/pending_jds.json

# Desinstalar el skill de Hermes
rm -rf ~/.hermes/skills/cv-pipeline/

# Reinstalar
cp -r ~/job_search/hermes-ia/skills/cv-pipeline/ ~/.hermes/skills/cv-pipeline/
```

---

[← Volver al README](../README.md)
