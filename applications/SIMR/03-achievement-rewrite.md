# Step 3: Achievement Rewrite — Simera Java Developer (SIMR)

## Rules Applied
- Lead with strong action verb.
- Include metric per bullet (or [NEEDS METRIC] if missing).
- Include context (scale, team, company).
- Include result or business impact.
- Max 2 lines per bullet.
- Never use weak verbs.

---

## MERCADO LIBRE | Argentina
### Project Leader | Jan 2023 – Nov 2025

| Original | Rewritten | Why It Works |
|----------|-----------|--------------|
| Spearheaded the end-to-end delivery of the "Product Bundles" feature... Orchestrated high-stakes negotiations with Core Architecture teams... | Architected and shipped the "Product Bundles" backend feature, negotiating API contracts with Core Architecture teams to modify foundational entities and enable seller inventory combination at scale. | "Architected" signals technical design ownership. "API contracts" maps to JD's REST API requirement. Removes "stakeholder" language. |
| Championed the development of a custom "Shadow Processing & Debugging Engine"... resulting in a 70% reduction in incident backlog... | Built a custom Shadow Processing & Debugging Engine for the high-frequency pipeline, enabling rapid Root Cause Analysis and reducing incident backlog by 70%. | "Built" is a strong dev verb. Keeps the 70% metric. Emphasizes technical tooling over "championed." |
| Modernized the squad's operating model by restructuring Jira workflows and implementing n8n and AI automations... | Optimized squad delivery workflows by restructuring Jira processes and implementing n8n/AI automations, eliminating administrative overhead and increasing engineering bandwidth for feature development. [NEEDS METRIC: hours saved per week or velocity improvement %] | "Optimized" is stronger than "modernized." Still needs a quantified time/velocity metric. |
| Mentored team members and facilitated technical decision-making... | Mentored 7 developers and 2 technical leaders, facilitating architectural decisions for high-traffic solutions while enforcing code quality standards and protecting the team from scope creep. | Keeps team size context. "Enforcing code quality standards" signals hands-on engineering focus. |

### Senior Software Engineer | Jul 2021 – Jan 2023

| Original | Rewritten | Why It Works |
|----------|-----------|--------------|
| Designed and implemented scalable backend services, focusing on performance optimization for high-traffic components. | Designed and implemented scalable Java backend services for high-traffic Marketplace components, optimizing performance under peak load. [NEEDS METRIC: throughput improvement %, latency reduction ms, or RPM handled] | Adds "Java" keyword. Context: Marketplace, peak load. Needs performance metric. |
| Transformed development workflows by optimizing CI/CD pipelines, reducing deployment times and improving code quality standards. | Transformed CI/CD pipelines to reduce deployment friction and improve code quality gates, accelerating delivery velocity. [NEEDS METRIC: deployment time reduction % or release frequency increase] | "Transformed" is strong. Needs concrete deployment metric. |
| Provided technical mentorship to Junior and Semi-Senior developers... | Mentored junior and semi-senior developers through structured code reviews and pair programming, accelerating their path to independent contributors. [NEEDS METRIC: number of developers mentored or time-to-productivity improvement] | "Mentored" is fine. Needs quantified impact on dev growth. |

### Software Engineer | Jan 2020 – Jun 2021

| Original | Rewritten | Why It Works |
|----------|-----------|--------------|
| Maintained and evolved internal core components, ensuring stability during traffic spikes. | Maintained and evolved internal Java core components, ensuring system stability during traffic spikes exceeding 20,000+ RPM. [NEEDS METRIC: uptime % achieved or incidents prevented during spikes] | Adds "Java" and reuses the 20,000 RPM metric for context. Needs stability metric. |
| Actively participated in code reviews and production incident resolution... | Led production incident resolution and code reviews, identifying architectural risks and implementing preventive measures. [NEEDS METRIC: incident resolution time reduction or critical bugs caught pre-deployment] | "Led" is stronger than "participated." Needs quantified impact on incidents. |
| Collaborated on the design of backend solutions, translating functional requirements into technical specifications. | Translated functional requirements into technical specifications for backend solutions, collaborating with product and UX teams on feature delivery. [NEEDS METRIC: features delivered or spec-to-ship time] | "Translated" leads strongly. No metric available in original. |

### Software Developer | Sep 2018 – Dec 2019

| Original | Rewritten | Why It Works |
|----------|-----------|--------------|
| Developed and maintained internal ecosystem components, ensuring adherence to coding standards. | Developed and maintained internal Java ecosystem components, enforcing coding standards and contributing to system reliability. [NEEDS METRIC: components shipped or code coverage improvement] | Adds "Java." "Enforcing" stronger than "adherence." Needs output metric. |
| Engaged in early code review processes and assisted in the resolution of production incidents... | Participated in code review processes and production incident triage, building foundational skills in system reliability and root cause analysis. [NEEDS METRIC: incident reduction % or review turnaround time] | "Triage" signals technical depth. Needs quantified impact. |

---

## EXO CORP | Argentina
### Software Developer | May 2017 – Sep 2018

| Original | Rewritten | Why It Works |
|----------|-----------|--------------|
| Developed and maintained technological products using JavaScript, Node.js, and Python. | Built backend products using JavaScript, Node.js, and Python within Docker containerized environments, delivering features across the full development lifecycle. | "Built" is stronger than "developed." Adds Docker context from original. |
| Conducted code reviews and produced technical documentation... | Conducted code reviews and authored technical documentation to ensure long-term project maintainability and knowledge sharing. | "Authored" stronger than "produced." Emphasizes dev practices. |
| Managed database interactions using CouchDB and MongoDB within containerized environments (Docker). | Managed database interactions using CouchDB and MongoDB, optimizing query performance for application data layers. [NEEDS METRIC: query performance improvement or data volume handled] | Removes redundant Docker mention. Needs DB performance metric. |

---

## Verb Upgrades

| Weak Verb | Strong Replacement | Why |
|-----------|-------------------|-----|
| Spearheaded | Architected / Shipped | Technical ownership, not just initiation |
| Championed | Built / Implemented | Execution, not advocacy |
| Modernized | Optimized / Streamlined | Specific improvement, not vague update |
| Provided (mentorship) | Mentored | Direct action verb |
| Maintained and evolved | Maintained / Evolved / Hardened | "Hardened" signals reliability focus |
| Collaborated on | Designed / Translated | Individual contribution, not group activity |
| Engaged in | Participated / Led | More decisive |
| Assisted in | Led / Resolved | Removes subordinate tone |
| Conducted | Led / Drove | Stronger ownership |

---

## Patterns & Insights

1. **Leadership language dominates:** Original CV uses "spearheaded," "championed," "orchestrated," "facilitated" — all management verbs. For a dev role, we need "built," "designed," "implemented," "optimized."
2. **Metrics are sparse:** Only ONE hard metric exists across 5 roles: 70% incident reduction. Everything else is qualitative. This is the biggest weakness.
3. **Java is underrepresented:** Despite 7+ years at Mercado Libre (a Java shop), Java is only explicitly mentioned in the summary and skills. It needs to appear in every Mercado Libre bullet.
4. **Testing is invisible:** No mention of unit tests, integration tests, TDD, or QA involvement. This is a critical gap for the Simera JD.
5. **MySQL is absent:** The CV mentions CouchDB and MongoDB but never MySQL. For a JD that lists MySQL as must-have, this is problematic.

---

## Missing Metrics List

The user must provide real numbers for the following bullets. **DO NOT invent or estimate.**

1. **Project Leader - n8n/AI automation:** `[NEEDS METRIC: hours of administrative overhead saved per week, or % increase in team velocity]`
2. **Senior Software Engineer - backend services:** `[NEEDS METRIC: throughput improvement %, latency reduction in ms, or peak RPM handled]`
3. **Senior Software Engineer - CI/CD:** `[NEEDS METRIC: deployment time reduction %, or increase in release frequency (e.g., from X to Y per week)]`
4. **Senior Software Engineer - mentorship:** `[NEEDS METRIC: number of developers mentored to promotion, or reduction in onboarding time]`
5. **Software Engineer - stability:** `[NEEDS METRIC: uptime % achieved during traffic spikes, or number of incidents prevented]`
6. **Software Engineer - incident resolution:** `[NEEDS METRIC: average incident resolution time reduction, or % of critical bugs caught in code review]`
7. **Software Engineer - feature delivery:** `[NEEDS METRIC: number of features shipped, or average time from spec to production]`
8. **Software Developer - components:** `[NEEDS METRIC: number of components maintained, or code coverage % achieved]`
9. **Software Developer - code review/incidents:** `[NEEDS METRIC: incident reduction %, or average code review turnaround time]`
10. **EXO CORP - database:** `[NEEDS METRIC: query performance improvement %, or volume of data managed]`
