# Step 5: Final Score — Vantegrate Salesforce Developer Junior (VANT)

## Scoring Methodology

Three weighted categories, each scored 0-100:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| **ATS Parseability** | 40% | Can the bot read it? Clean format, no code blocks, standard section names, no special chars. |
| **Keyword Alignment** | 30% | Does it contain the words the ATS searches for? Coverage of hard skills from JD. |
| **Recruiter Appeal** | 30% | Does a human shortlist it in 30 seconds? Hook, scanability, narrative coherence. |

**Formula:** `(Parseability × 0.40) + (Keyword Alignment × 0.30) + (Recruiter Appeal × 0.30) = Total / 100`

---

## Current State (Original CV — `cv_en.md`)

### ATS Parseability: 60/100

**What works:**
- Clean Markdown, no HTML, no images, no tables
- Standard section headers (## format)
- Simple bullet lists
- No columns or multi-column layouts

**What hurts:**
- Contact info wrapped in code block (```) — confuses Workday/Greenhouse parsers ❌
- Education in code block (```) — same issue ❌
- Spanish month abbreviation "Ene" mixed with English content
- Bold-heavy formatting for company header can cause parsing fragmentation
- LinkedIn URL not clickable (plain text)
- No "Certifications" section — certifications are bundled under Education

**Weighted contribution:** 60 × 0.40 = **24.0**

### Keyword Alignment: 30/100

**Strengths:**
- n8n mentioned ✅
- REST APIs / Java / Agile ✅
- Git / GitHub / Docker ✅

**Gaps:**
- **Salesforce** — zero mentions ❌
- **Apex** — zero mentions ❌
- **Flows / LWC** — zero mentions ❌
- **SOQL** — zero mentions ❌
- **OAuth** — zero mentions ❌
- **Webhooks / JSON** — not explicit ❌
- **Salesforce Data Model** — zero mentions ❌
- **AI Agents / Prompt Engineering** — not framed ❌
- CV in English, JD in Spanish — language mismatch

**Weighted contribution:** 30 × 0.30 = **9.0**

### Recruiter Appeal: 45/100

**Strengths:**
- Mercado Libre brand recognition ✅
- 10+ years experience signals stability ✅
- n8n automation at scale is a rare hook ✅
- 70% backlog reduction is a strong metric ✅

**Weaknesses:**
- "Project Leader" title screams overqualification for "Junior" role ❌
- Complete absence of Salesforce keywords = wrong profile signal ❌
- Profile reads as manager/leader, not hands-on developer ❌
- English CV for Spanish JD — reduces first-glance coherence ⚠️
- Narrative mismatch: "Why is a Project Leader applying for Salesforce Developer Junior?" ⚠️

**Weighted contribution:** 45 × 0.30 = **13.5**

### Current State Total

| Category | Raw Score | Weight | Weighted |
|----------|-----------|--------|----------|
| ATS Parseability | 60/100 | 40% | 24.0 |
| Keyword Alignment | 30/100 | 30% | 9.0 |
| Recruiter Appeal | 45/100 | 30% | 13.5 |
| **TOTAL** | | | **46.5 / 100** |

---

## Optimized State (After Steps 1-4)

### ATS Parseability: 85/100

**What's fixed:**
- ✅ Code blocks removed from header and education
- ✅ Consistent date format (English months)
- ✅ Standard 2-3 line company/title/date format
- ✅ Clean bullet structure
- ✅ LinkedIn URL as clickable link
- ✅ Separate Education & Certifications sections

**What remains:**
- ⚠️ Some bullets are 2 lines (acceptable for ATS)
- ⚠️ Bold for emphasis in a few places (standard Markdown, parsers handle it)

**Weighted contribution:** 85 × 0.40 = **34.0**

### Keyword Alignment: 72/100

**What's added:**
- ✅ Salesforce mentioned 3x (Summary, Core Competencies, bullet analogy)
- ✅ Apex mentioned 3x (Core Competencies, OOP foundation bullet)
- ✅ Flows & LWC mentioned 1x each (Core Competencies)
- ✅ SOQL mentioned 1x (Core Competencies — data model context)
- ✅ OAuth explicitly added to API bullet
- ✅ Webhooks, HTTP Request nodes, JSON transformations in n8n bullet
- ✅ OOP terms explicit (classes, inheritance, encapsulation, polymorphism)
- ✅ ES6+ JavaScript added
- ✅ Spanish language narrative matches JD language

**What's still missing (can't fabricate):**
- ❌ Actual Salesforce project experience (Apex triggers written, Flows deployed, LWC components built)
- ❌ Actual SOQL queries written in production
- ❌ Salesforce certifications (not mentioned anywhere)

**Weighted contribution:** 72 × 0.30 = **21.6**

### Recruiter Appeal: 78/100

**What's improved:**
- ✅ Header now reads "Salesforce Developer | REST APIs & Integrations | n8n Automation"
- ✅ Summary opens with pivot narrative: "pivoting to Salesforce development with focus on Apex, Flows, LWC"
- ✅ n8n hook strengthened with metrics: ~18h/week saved
- ✅ All bullets reframed as technical builder, not leader/manager
- ✅ Spanish narrative matches JD language
- ✅ Core Competencies directly address JD Must-Haves

**What remains concerning:**
- ⚠️ Overqualification still visible (10+ years, ML background)
- ⚠️ Salesforce pivot narrative is honest but unproven — recruiter needs to believe it
- ⚠️ No Salesforce certifications or projects to point to

**Weighted contribution:** 78 × 0.30 = **23.4**

### Optimized State Total

| Category | Raw Score | Weight | Weighted |
|----------|-----------|--------|----------|
| ATS Parseability | 85/100 | 40% | 34.0 |
| Keyword Alignment | 72/100 | 30% | 21.6 |
| Recruiter Appeal | 78/100 | 30% | 23.4 |
| **TOTAL** | | | **79.0 / 100** |

---

## Before vs After Comparison

```
Current State:  ███████████████████████████████████████████████░░░░░░░░░░░░░░░  46.5/100
Optimized State: ████████████████████████████████████████████████████████████░░░  79.0/100
                 0                    25                    50                    75    100
```

| Dimension | Before | After | Δ |
|-----------|--------|-------|---|
| ATS Parseability | 60 | 85 | **+25** |
| Keyword Alignment | 30 | 72 | **+42** |
| Recruiter Appeal | 45 | 78 | **+33** |
| **Total** | **46.5** | **79.0** | **+32.5** |

---

## Gap to 90+: Analysis

| To reach 90, I need: | Current | Target | Gap |
|-----------------------|---------|--------|-----|
| ATS Parseability | 85 | 92 | +7 |
| Keyword Alignment | 72 | 88 | +16 |
| Recruiter Appeal | 78 | 90 | +12 |
| **Weighted shortfall** | **79.0** | **90.0** | **11.0 points** |

The gap is primarily **Salesforce experience that cannot be fabricated**. No amount of rewording replaces actual Apex code or a deployed LWC component. However:

- **11 points to 90** is achievable if the user:
  1. Completes a Salesforce Trailhead module or two (free, online) and adds it
  2. Gets a Salesforce certification (Admin or Platform App Builder)
  3. Or simply adds "Salesforce Certified [X] — in progress" to signal commitment

---

## Top 3 Quick Wins

| # | Change | Category | Point Gain | Time | Effort |
|---|--------|----------|------------|------|--------|
| 1 | **Complete 1 Trailhead module** (e.g., "Apex Basics & Database") and add to CV as "Salesforce learning in progress" | Keyword Alignment | +8 | 2-4 hours | 🟢 Low |
| 2 | **Get Salesforce Certified Platform App Builder** (or Associate) — entry-level, no experience required | Keyword + Recruiter | +12 | 1-2 weeks study | 🟡 Medium |
| 3 | **Build a simple Salesforce side project** (e.g., Apex REST service connected via n8n) and add to CV | Recruiter Appeal | +10 | 1-2 weeks | 🟡 Medium |

With Quick Win #1 alone (Trailhead): **79 → 87**
With Quick Win #2 (Certification): **79 → 91+** 🎯
With Quick Wins #1 + #2: **79 → 95+** 📈

---

## Score Card Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│  VANT — Vantegrate Salesforce Developer Junior                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  46.5/100  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░  CURRENT STATE    │
│                                                                     │
│  79.0/100  ████████████████████████████████░░░░░  OPTIMIZED STATE  │
│                                                                     │
│  ┌────────────┬──────────┬──────────┬──────────┐                    │
│  │ Category   │ Current  │ Optimized│ Δ        │                    │
│  ├────────────┼──────────┼──────────┼──────────┤                    │
│  │ Parseability│  60      │  85      │  +25     │                    │
│  │ Keywords   │  30      │  72      │  +42     │                    │
│  │ Recruiter  │  45      │  78      │  +33     │                    │
│  │ TOTAL      │  46.5    │  79.0    │  +32.5   │                    │
│  └────────────┴──────────┴──────────┴──────────┘                    │
│                                                                     │
│  🎯 TARGET: 90+  Gap: 11 points                                    │
│                                                                     │
│  Quickest path to 90+: Trailhead module + Certification              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Final Recommendations

### ✅ Must-Do

| Action | Why |
|--------|-----|
| **Submit the optimized CV** | 79/100 is competitive for a Junior role where the JD explicitly offers Salesforce training. The n8n + APIs profile is a genuine differentiator. |
| **Add "Salesforce learning in progress" framing** | Already done in the Core Competencies + Summary. This signals intent without fabricating experience. |

### 🟡 Do-If-Time

| Action | Why |
|--------|-----|
| **Complete 1 Trailhead badge** (Apex Basics) | Adds credibility to the "actively learning" claim. 2-4 hours. |
| **Study for Salesforce Platform App Builder certification** | Entry-level cert, no experience required. Would push score past 90. |

### ❌ Do-Not-Do

| Action | Why |
|--------|-----|
| **Fabricate Salesforce experience** | They'll catch it in the technical interview. Honest pivot is more compelling. |
| **Remove "Salesforce" from titles** | It's what the role is. The CV must be findable by ATS. |
| **Downplay ML experience** | 10+ years at ML is a strength, not a weakness. The pivot narrative handles the overqualification concern. |
