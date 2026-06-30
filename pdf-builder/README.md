# CV PDF Builder

Convierte CVs optimizados en Markdown a PDFs profesionales usando Playwright.

---

## ¿Qué hace?

Toma un archivo `.md` (tu CV optimizado para una Job Description específica) y genera:
- Un archivo `.html` intermedio (para debuggear si es necesario)
- Un archivo `.pdf` final, listo para enviar a la empresa

El PDF respeta el diseño profesional definido en `cv-template.html`: una columna, A4, tipografía limpia, y acentos en azul índigo.

---

## Estructura

```
job_search/
├── package.json                    ← Dependencias del proyecto (root)
├── pdf-builder/
│   ├── build-cv.js                 ← Script principal
│   ├── cv-template.html            ← Template HTML con CSS embebido
│   └── README.md                   ← Este archivo
└── resumes/
    └── applications/
        └── AGIL/
            ├── arias_emanuel-en-AGIL.md      ← Input: CV en Markdown
            ├── arias_emanuel-en-AGIL.html    ← Output: HTML intermedio
            └── arias_emanuel-en-AGIL.pdf     ← Output: PDF final
```

---

## Instalación

Las dependencias se instalan **una sola vez** en el root del proyecto:

```bash
cd <project-root>
npm install
```

Esto instala:
- `markdown-it` — Parser de Markdown a HTML
- `playwright` — Navegador headless para generar el PDF

La primera vez que corre Playwright, descarga Chromium automáticamente (~100MB).

---

## Uso

> ⚠️ **Deprecado.** Este script fue reemplazado por `lib/pdf-builder.js` + `scripts/build-pdf.js`.  
> Usá `node scripts/build-pdf.js <ref> [--lang en|es]` en su lugar.  
> Este archivo se mantiene como referencia histórica.

### Comando básico (legacy)

```bash
node pdf-builder/build-cv.js <input.md> <output.pdf>
```

### Ejemplo (legacy)

```bash
cd <project-root>
node pdf-builder/build-cv.js \
  applications/AGIL/arias_emanuel-en-AGIL.md \
  applications/AGIL/arias_emanuel-en-AGIL.pdf
```

### Output esperado

```
📄 Leyendo CV: .../arias_emanuel-en-AGIL.md
🔍 Extrayendo secciones...
   ✓ Nombre: Emanuel Ignacio Arias
   ✓ Parseando experiencia profesional...
🎨 Aplicando template...
   💾 HTML intermedio: .../arias_emanuel-en-AGIL.html
🚀 Generando PDF con Playwright...
✅ PDF generado: .../arias_emanuel-en-AGIL.pdf

🎯 Listo para enviar a la empresa!
```

---

## ¿Cómo funciona?

1. **Lee el Markdown** — Extrae las secciones: Header, Summary, Competencies, Skills, Experience, Education
2. **Parsea el Header** — Nombre, títulos, contacto
3. **Renderiza secciones simples** — Usa `markdown-it` para convertir bullets a HTML
4. **Parsea Experiencia Profesional** — Función custom que detecta empresa, puesto, fechas, descripción y bullets
5. **Inyecta en el Template** — Reemplaza los `{{placeholders}}` de `cv-template.html` con el contenido
6. **Guarda HTML intermedio** — Para que puedas abrirlo en Chrome y verificar si algo se ve mal
7. **Genera PDF con Playwright** — Abre Chromium invisible, carga el HTML, imprime a A4

---

## El Template (`cv-template.html`)

Es un archivo HTML con CSS embebido en el `<head>`. Tiene la estructura completa del CV:

```html
<header class="cv-header">
  <h1>{{candidate_name}}</h1>
  <p class="cv-titles">{{candidate_titles}}</p>
  <p class="cv-contact">{{candidate_contact}}</p>
</header>

<section class="professional-summary">
  <h2>Professional Summary</h2>
  {{professional_summary}}
</section>

<!-- ... más secciones ... -->
```

### Placeholders disponibles

| Placeholder | Contenido que reemplaza |
|---|---|
| `{{candidate_name}}` | Nombre completo (línea con `#`) |
| `{{candidate_titles}}` | Títulos debajo del nombre |
| `{{candidate_contact}}` | Línea de contacto |
| `{{professional_summary}}` | Bullets debajo de `## Professional Summary` |
| `{{core_competencies}}` | Bullets debajo de `## Core Competencies` |
| `{{core_skills}}` | Bullets debajo de `## Core Skills` |
| `{{professional_experience}}` | Toda la sección de experiencia |
| `{{education}}` | Bullets debajo de `## Education & Certifications` |
| `{{extra_sections}}` | Cualquier otra sección adicional |

### Diseño

- **Layout:** Una columna, A4, márgenes 1.2cm
- **Color de acento:** `#1e40af` (azul índigo)
- **Tipografía:** Segoe UI, Roboto, Helvetica, Arial (fallback)
- **Tamaños:** 20pt nombre, 10.5pt secciones, 9pt contenido
- **Job headers:** Flexbox en una sola línea (empresa + puesto + fechas)
- **Viñetas:** `▸` para summary/competencies, `▪` para el resto

---

## Requisitos del Markdown de entrada

El script espera que el `.md` siga esta estructura:

```markdown
# Nombre Completo

Título Principal | Título Secundario | Especialidad
Ciudad | Teléfono | Email | LinkedIn

---

## Professional Summary

- **Bold:** Texto del bullet
- **Bold:** Texto del bullet

## Core Competencies

- **Competencia:** Descripción
- **Competencia:** Descripción

## Core Skills

- **Categoría:** Skill 1, Skill 2, Skill 3
- **Categoría:** Skill 1, Skill 2

## Professional Experience

**EMPRESA**
Puesto | Ubicación
Mes Año – Mes Año

Descripción opcional del rol

- **Logro con métrica:** Descripción
- **Logro con métrica:** Descripción

**EMPRESA ANTERIOR**
Puesto
Mes Año – Mes Año

- **Logro:** Descripción

**EARLIER EXPERIENCE**

- **Puesto** | Empresa (Fechas)
- **Puesto** | Empresa (Fechas)

## Education & Certifications

- Certificación | Institución
- Certificación | Institución
```

**Notas importantes:**
- Los títulos de sección deben estar en inglés (`## Professional Summary`, `## Core Competencies`, etc.)
- La empresa debe estar en negritas: `**EMPRESA**`
- Las fechas deben empezar con un mes abreviado (`Jan`, `Feb`, etc.) o un año (`2023`)
- Los bullets de logros deben empezar con `-`

---

## Troubleshooting

### "Archivo no encontrado"
Verificá que la ruta al `.md` sea correcta. Usá rutas relativas al root del proyecto o absolutas.

### El PDF se ve diferente al HTML
El HTML intermedio se guarda junto al PDF. Abrilo en Chrome (`open archivo.html`) y usá `Cmd + P` para comparar. Playwright usa el mismo motor de renderizado que Chrome, así que deberían verse idénticos.

### Faltan bullets en la experiencia
Asegurate de que no haya líneas vacías entre la fecha y la descripción, o entre la descripción y los bullets. El parser espera este flujo:
```
Fechas
[descripción opcional]
- Bullet 1
- Bullet 2
```

### El nombre aparece como `{{candidate_name}}`
Eso pasaba en versiones anteriores. Ahora el script usa regex con flag global (`/g`) para reemplazar todas las ocurrencias.

### Playwright no encuentra Chromium
Corré esto para reinstalar los browsers:
```bash
npx playwright install chromium
```

---

## Historial de cambios

### v1.0 (2026-05-05)
- Template HTML con CSS embebido
- Parser de Markdown por secciones
- Job headers en una sola línea (flexbox)
- Generación de PDF vía Playwright
- Arreglado: reemplazo global de placeholders
- Arreglado: parser de experiencia no saltaba líneas vacías entre fechas y descripción

---

## Próximos pasos / Ideas

- [ ] Agregar soporte para foto de perfil
- [ ] Permitir cambiar el color de acento por parámetro
- [ ] Script batch para procesar todos los CVs de `applications/` de una
- [ ] Opción para generar versión "ATS-friendly" (sin colores, solo texto)
- [ ] Validación del Markdown antes de procesar
