# Step 1: ATS Diagnostic — AGIL (AgileEngine - Technical Program Manager)

**Date:** 2025-05-06  
**Resume:** Emanuel Ignacio Arias — Project Leader  
**Target Role:** Technical Program Manager (Part-time) — AgileEngine  
**JD Language:** English  

---

## Executive Summary

**Overall ATS Parseability: 65/100** — The CV is partially parseable but has **critical formatting issues** that will significantly impact ATS performance. The job title mismatch is the most severe gap.

---

## 1. Parsing Failures & Format Issues

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| **Job Title Mismatch** — CV says "Project Leader", JD requires "Technical Program Manager" | **HIGH** | Header, line 4; Summary, line 10 | Update header to "Technical Program Manager" or "Project Leader / Technical Program Manager" |
| **Code Block Delimiter** — Triple backticks (```) used for header formatting | **HIGH** | Lines 3 and 90 | Remove ALL ``` markers; they can confuse parsers and break section extraction |
| **Dates in Spanish** — "Ene", "Jul" not recognized by English ATS parsers | **HIGH** | Lines 32, 52, 60, 67, 81, 82 | Convert to English: "Jan", "Jul", "Sep", "Dec", "May", "Mar" |
| **Spaced Numbers** — "20 , 000 + RPM" with spaces/commas breaks numeric parsing | **MED** | Line 34 | Remove spaces: "20,000+ RPM" or "20k+ RPM" |
| **Inconsistent Date Format** — Mix of "Ene 2023" and "Jan 2020" | **MED** | Lines 32, 60 | Standardize ALL dates to English (MMM YYYY) |
| **Bullet Character** — Using "●" instead of "*" or "-" | **LOW** | Lines 88, 89 | Use standard ASCII bullet "-" or "*" for better ATS compatibility |
| **Parenthetical Acronyms** — "(Non-coding)", "(Scrum/Kanban)" may split keywords | **LOW** | Line 20-24 | Consider placing acronyms as separate keywords in Skills section |
| **Missing Target Role in Header** — ATS searches for exact job title | **HIGH** | Header section | Add "Technical Program Manager" explicitly to header line |

---

## 2. Hard Keyword Gaps vs Job Description

### Critical Missing Keywords

| Keyword/Phrase | JD Frequency | CV Match | Status | Impact |
|----------------|--------------|----------|--------|--------|
| **Technical Program Manager** | 3x | 0x | ❌ MISSING | **CRITICAL** — Exact title required |
| **Scrum Master** | 1x | 0x | ❌ MISSING | **HIGH** — Explicit requirement in JD |
| **Linear** | 2x | 0x | ❌ MISSING | **HIGH** — Tool explicitly required |
| **AI copilots** | 1x | 0x ("AI automations" present) | ⚠️ PARTIAL | **HIGH** — Different terminology used |
| **Program structure** | 1x | 0x | ❌ MISSING | **MED** — Core responsibility |
| **Multi-quarter planning** | 1x | 0x | ❌ MISSING | **MED** — JD-specific requirement |
| **Ticket sizing** | 1x | 0x | ❌ MISSING | **LOW** — Scrum-specific |
| **Forecasting accuracy** | 1x | 0x | ❌ MISSING | **LOW** — KPI-related |
| **Acceptance criteria** | 1x | 0x | ❌ MISSING | **LOW** — Agile ceremony artifact |
| **Definition of done** | 1x | 0x | ❌ MISSING | **LOW** — Agile standard |
| **Sprint planning** | 1x | 0x | ❌ MISSING | **MED** — Scrum ceremony |
| **Standups** | 1x | 0x | ❌ MISSING | **MED** — Daily ceremony |
| **Asana** | 1x | 0x | ❌ MISSING | **LOW** — Alternative tool mention |
| **Systems thinking** | 1x | 0x | ❌ MISSING | **MED** — Soft skill requirement |
| **Data-driven approach** | 1x | 0x (data-driven case mentioned) | ⚠️ PARTIAL | **MED** — Implicit but not explicit |

### Present Hard Keywords (✅ Good Coverage)

- ✅ SDLC / Software Development Life Cycle — Mentioned multiple times
- ✅ Agile / Scrum / Kanban — Present in Core Skills
- ✅ Jira — Mentioned in tools and experience
- ✅ GitHub — Present in Tools section
- ✅ Roadmap Planning — Present
- ✅ Risk Mitigation — Present
- ✅ Stakeholder Management — Present ("negotiating with stakeholders")
- ✅ Cross-functional — Implicit in "cross-functional squad"
- ✅ Engineering teams — Present
- ✅ CI/CD — Mentioned in Senior Engineer role
- ✅ Microservices / REST APIs / Distributed Systems — Present

---

## 3. Soft Keyword / Semantic Gaps

| Soft Skill/Concept | JD Language | CV Language | Gap Analysis |
|-------------------|-------------|-------------|--------------|
| **Program Management** | "complex, cross-functional programs" | "Product Bundles feature" | CV uses "project" not "program" — semantic gap |
| **Milestone Definition** | "milestones, and success criteria" | No explicit mention | Missing — JD-specific language |
| **Quarterly Planning** | "quarterly, and multi-quarter planning" | "roadmap prioritization" | Partial — CV has roadmap but not quarterly cadence |
| **Tradeoff Analysis** | "support decision-making through tradeoff analysis" | "data-driven business case" | Similar concept but different terminology |
| **Blocker Resolution** | "resolving blockers" | "incident resolution" | Close but not exact semantic match |
| **Work Prioritization** | "Drive work prioritization" | "strict roadmap prioritization" | ✅ Match present |
| **Structured Updates** | "Provide structured updates to leadership" | "high-stakes negotiations" | Different framing — CV emphasizes negotiation over reporting |
| **Delivery Management** | "Delivery Management" | ✅ Present in Core Skills | ✅ Match present |
| **Execution Quality** | "focus on execution quality" | "delivery velocity", "Operational Excellence" | Similar concept, different words |
| **Operating Models** | "Improve operating models" | "modernized the squad's operating model" | ✅ Strong match present |
| **Scalability** | "scalability of engineering systems" | "scalable solutions", "scalable backend services" | ✅ Strong match present |

---

## 4. Top 5 Keyword Gaps vs Job Description

These are the **most critical gaps** that will cause the ATS to rank this CV poorly:

1. **"Technical Program Manager"** — The JD uses this exact title 3 times. The CV uses "Project Leader" exclusively. This is the #1 priority fix.

2. **"Scrum Master"** — Explicitly mentioned as a responsibility ("Act as Scrum Master"). The CV describes Scrum Master activities but never uses the title.

3. **"Linear"** — Listed twice as a required tool alongside Jira. CV only mentions Jira.

4. **"AI copilots"** — CV mentions "AI automations" but the JD specifically asks for "AI copilots and related tools" — similar concept, wrong keyword for ATS matching.

5. **"Program" vs "Project"** — The JD emphasizes "programs" (complex, multi-team initiatives). The CV only uses "project" language, missing the seniority signal of program-level work.

---

## 5. JD Red Flags & Observations

### 🔍 JD Quality Issues Detected

1. **Redundant Requirements** — "Experience working with engineering teams in Agile environments" (line 39) is redundant with "3+ years of Agile Project Management experience" (line 37). This suggests either copy-paste error or emphasis on the requirement.

2. **Vague Tool Reference** — "AI copilots and related tools" (line 43) is intentionally broad but makes keyword matching difficult. Both GitHub Copilot and ChatGPT would qualify, but the JD doesn't specify.

3. **Role vs Title Inconsistency** — JD says "part-time" in title but doesn't specify hours/percentage anywhere in the body. Also requires "5+ years TPM experience" for a part-time role — unusual signal, may indicate they're looking for senior talent at reduced hours.

4. **Overloaded Responsibilities** — The "WHAT YOU WILL DO" section lists 13 bullet points ranging from TPM work to Scrum Master duties to PM activities. This is a very broad role definition — the CV should demonstrate versatility across all these areas.

### 🎯 Strategic Observations

- **Language Mismatch Risk**: The JD is in English, but the CV uses Spanish dates and has some Spanish-influenced phrasing. ATS may not normalize these.
- **Seniority Gap**: JD asks for 5+ years TPM experience. CV shows ~2 years Project Leader (Jan 2023 - Nov 2025) but has 10+ years total SDLC experience. Need to frame the narrative carefully.
- **Tool Currency**: CV mentions n8n (workflow automation) which is impressive but not in the JD. JD wants Linear. Consider adding Linear exposure or learning it before applying.

---

## 6. ATS Score Breakdown

| Category | Score | Notes |
|----------|-------|-------|
| **Format Compatibility** | 55/100 | Code blocks, Spanish dates, inconsistent formatting |
| **Hard Keyword Match** | 60/100 | Missing critical title, Scrum Master, Linear, program language |
| **Soft Keyword Match** | 70/100 | Good semantic overlap but terminology gaps exist |
| **Section Standardization** | 80/100 | Standard sections present but could use "Core Competencies" |
| **Overall ATS Parseability** | **65/100** | Below threshold for most enterprise ATS systems |

---

## 7. Quick Wins to Fix Before Submission

| Priority | Fix | Time | Impact |
|----------|-----|------|--------|
| **P0** | Change title from "Project Leader" to "Technical Program Manager" in header | 2 min | **+15 points** — Critical for ATS matching |
| **P0** | Remove ALL ``` code block delimiters | 2 min | **+10 points** — Prevents parsing errors |
| **P1** | Convert all Spanish dates to English (Ene→Jan, Jul→Jul, etc.) | 5 min | **+8 points** — Ensures date parsing |
| **P1** | Add "Linear" to Tools section (even if self-taught/learning) | 1 min | **+7 points** — Required tool |
| **P1** | Add "Scrum Master" to Professional Summary | 2 min | **+5 points** — Required responsibility |
| **P2** | Replace "Project" with "Program" where applicable (e.g., "Program Delivery") | 10 min | **+5 points** — Semantic alignment |
| **P2** | Fix spacing in "20 , 000 +" to "20,000+" | 1 min | **+3 points** — Clean numeric parsing |
| **P2** | Add explicit "AI copilots" mention (e.g., "AI copilots for workflow automation") | 2 min | **+4 points** — Keyword match |

**Estimated Total Score After Fixes: 85-90/100**

---

## 8. Files Reference

- **Source CV:** `resumes/cv_en.md` (READ-ONLY — never modify)
- **Job Description:** `applications/AGIL/job-description.md`
- **This Diagnostic:** `applications/AGIL/01-ats-diagnostic.md`
- **Next Step:** Step 2 — Recruiter Eye Test (`applications/AGIL/02-recruiter-eye-test.md`)

---

*Generated by ATS Diagnostic Agent — 2025-05-06*
