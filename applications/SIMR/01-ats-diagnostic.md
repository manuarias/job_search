# Step 1: ATS Diagnostic — Simera Java Developer (SIMR)

## Parseability Analysis

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Header wrapped in code block (```) | High | Top of CV | Remove code blocks; use plain text header |
| Education section wrapped in code block | High | Bottom of CV | Remove code blocks; use standard bullet list |
| Dates use Spanish abbreviations ("Ene", "Sep") | High | Experience section | Convert to English: "Jan", "Sep" |
| Current job title "Project Leader" mismatches target role "Java Developer" | High | Header + Summary | Reframe title to "Java Developer" or "Software Engineer" |
| "Technical Background (Non-coding)" explicitly signals non-technical role | Critical | Core Skills section | Remove "Non-coding" label; reframe as hands-on technical skills |
| Company/title/location crammed on single line | Medium | Experience header | Separate: Company / Title | Location / Dates |
| Bold markdown in bullets (**text**) | Low | Experience bullets | Generally ATS-safe, but avoid overuse |
| Missing standard section names | Low | Section headers | Use common ATS-friendly headers: Summary, Skills, Experience, Education |

---

## Hard Keyword Gaps vs Job Description

| JD Keyword | Present in CV? | Count in CV | Count in JD | Gap |
|------------|---------------|-------------|-------------|-----|
| Java | Yes (summary, skills) | 2 | 1 | Underrepresented |
| MySQL | No | 0 | 1 | **MISSING — cannot add without verification** |
| REST API | Yes (skills) | 1 | 1 | Present but buried |
| CI/CD | Yes (experience) | 1 | 1 | Present but needs prominence |
| Git | No (GitHub mentioned) | 0 | 1 | **MISSING — add Git explicitly** |
| SOLID | No | 0 | 1 | **MISSING — cannot add without verification** |
| Unit tests | No | 0 | 2 | **MISSING — cannot add without verification** |
| Integration tests | No | 0 | 1 | **MISSING — cannot add without verification** |
| Agile | Yes (skills) | 1 | 1 | Present |
| Scrum | Yes (skills) | 1 | 2 | Present |
| Sprints | No | 0 | 1 | **MISSING** |
| Backend | Yes (summary) | 1 | 1 | Present |
| Docker | Yes (skills, EXO CORP) | 2 | 0 | Nice overlap |
| Microservices | Yes (skills) | 1 | 0 | Nice overlap |
| Angular | No | 0 | 1 (Nice-to-Have) | Do NOT add — not in CV |

---

## Soft Keyword / Semantic Gaps

| JD Concept | CV Equivalent | Gap |
|------------|---------------|-----|
| "Develop product functionalities in the backend" | "Designed and implemented scalable backend services" | Partial match; needs stronger backend framing |
| "Design and execute unit and integration tests" | "code reviews and production incident resolution" | Missing explicit testing focus |
| "Collaborate with the team, supporting other members" | "Mentored team members", "collaborated on the design" | Partial match |
| "Participate in sprints and continuous deliveries" | "Agile Leadership (Scrum/Kanban)", "delivery velocity" | Missing explicit "sprints" and "continuous delivery" |
| "Maintain focus on code and product quality" | "code quality standards", "ensuring adherence to coding standards" | Good match |
| "Functional analysis / Refinement / Planning" | "translating functional requirements into technical specifications" | Good match |

---

## Top 5 Critical Keyword Gaps

1. **MySQL** — JD lists as must-have. CV mentions CouchDB and MongoDB only. If the candidate has MySQL experience, it must be added.
2. **Git** — JD lists as must-have. CV mentions GitHub but never "Git". This is an easy fix (Git via GitHub).
3. **SOLID** — JD lists as must-have. Not mentioned in CV. Cannot be added without verification.
4. **Unit tests / Integration tests** — JD heavily emphasizes testing. CV mentions "code reviews" and "quality" but never explicit testing. Cannot be added without verification.
5. **Sprints / Continuous delivery** — JD mentions multiple times. CV has "Scrum/Kanban" and "delivery velocity" but lacks these exact terms.

---

## JD Red Flags

- None identified. The JD is clean, well-structured, and free of contradictions.
- Salary range ($1,900–$2,000/month) suggests mid-level/contractor role, which aligns with the candidate's experience level if reframed away from senior leadership.
