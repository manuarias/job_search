# JD Scraping Specification

## Purpose

Automate Job Description ingestion from URLs or raw text, producing structured Markdown (`applications/{REF}/job-description.md`) for downstream pipeline consumption (F4 keyword extraction).

## Requirements

### Requirement: URL Intake

The system MUST accept a URL as input, perform an HTTP GET, and extract clean text from the HTML response. Navigation, footers, scripts, styles, and sidebar elements MUST be stripped. Only the main job posting content SHALL be retained.

#### Scenario: Valid Greenhouse URL

- GIVEN a Greenhouse job posting URL (e.g., `boards.greenhouse.io/...`)
- WHEN the system fetches and parses the page
- THEN the output SHALL contain the job title, location, and all content sections as Markdown headers

#### Scenario: Non-200 HTTP response

- GIVEN a URL that returns a 4xx or 5xx status
- WHEN the system attempts to fetch
- THEN the system SHALL exit with a non-zero code and a descriptive error message including the status code

#### Scenario: Unreachable host

- GIVEN a URL with an invalid or unreachable domain
- WHEN the system attempts to fetch
- THEN the system SHALL exit with a non-zero code and an actionable error (DNS/timeout)

### Requirement: Raw Text Intake

The system MUST accept raw text as an alternative to a URL. Raw text SHALL pass through to section detection without any HTTP fetch or HTML parsing.

#### Scenario: Raw text with Markdown headers

- GIVEN raw text containing `##` / `###` headers
- WHEN the system processes the input
- THEN the section structure SHALL be preserved verbatim

#### Scenario: Raw text without headers

- GIVEN raw text with no recognizable headers
- WHEN the system processes the input
- THEN the entire text SHALL be placed under a single `## Description` header

### Requirement: Source-Specific Parsers

The system MUST detect the source platform from the URL domain and apply platform-specific extraction patterns. Supported sources: Greenhouse, Lever, Workday. For unrecognized domains, a generic HTML parser SHALL extract content from `<article>`, `<main>`, or `<div class="content">` fallbacks.

#### Scenario: Greenhouse domain detected

- GIVEN a URL matching `boards.greenhouse.io`
- WHEN the parser runs
- THEN the Greenhouse-specific content selector SHALL be used

#### Scenario: Lever domain detected

- GIVEN a URL matching `jobs.lever.co`
- WHEN the parser runs
- THEN the Lever-specific content selector SHALL be used

#### Scenario: Workday domain detected

- GIVEN a URL matching `*.myworkdayjobs.com` or `*.wd5.myworkdaysite.com`
- WHEN the parser runs
- THEN the Workday-specific content selector SHALL be used

#### Scenario: Unknown domain

- GIVEN a URL not matching any known source
- WHEN the parser runs
- THEN the generic HTML fallback SHALL attempt extraction from semantic containers

### Requirement: Section Extraction

The system MUST detect section boundaries from HTML heading tags (`h2`, `h3`) and strong/bold markers. Detected sections SHALL be converted to Markdown `##` / `###` headers. Target sections include (but are not limited to): Requirements, Responsibilities, Nice to Have, About the Company. The scraper performs syntactic extraction only — it SHALL NOT classify or tag keywords.

#### Scenario: Page with h2 sections

- GIVEN an HTML page with `<h2>Requirements</h2>` and `<h2>Responsibilities</h2>`
- WHEN section extraction runs
- THEN the output SHALL contain `## Requirements` and `## Responsibilities` with their content preserved

#### Scenario: No detectable sections

- GIVEN an HTML page with no headings or bold section markers
- WHEN section extraction runs
- THEN the full content SHALL be placed under `## Description`

### Requirement: REF Generation

The system MUST auto-generate a 4-letter reference code from the detected company name (first 4 alphabetic characters, uppercased). The generated REF MUST be checked against `applications/jd-tracking.md` for uniqueness. If a collision exists, a numeric suffix SHALL be appended (e.g., `AGIL2`).

#### Scenario: New company name

- GIVEN company name "AgileEngine" with no existing entries in tracking
- WHEN REF is generated
- THEN the REF SHALL be `AGIL`

#### Scenario: Collision with existing REF

- GIVEN company name "AgileTech" and `AGIL` already exists in tracking
- WHEN REF is generated
- THEN the REF SHALL be `AGIL2`

#### Scenario: Company name shorter than 4 characters

- GIVEN company name "AB"
- WHEN REF is generated
- THEN the REF SHALL be padded with the first letter of the role title (e.g., `ABT` for "TPM")

### Requirement: Output Generation

The system MUST write the extracted content to `applications/{REF}/job-description.md`. The directory SHALL be created if it does not exist. The file SHALL contain: role title as `#` header, detected metadata (company, location) if extractable, and all content sections.

#### Scenario: Successful output

- GIVEN a successfully parsed JD with REF `AGIL`
- WHEN output generation completes
- THEN `applications/AGIL/job-description.md` SHALL exist with valid Markdown structure

#### Scenario: Directory creation

- GIVEN `applications/NEWREF/` does not exist
- WHEN output generation runs
- THEN the directory SHALL be created before writing the file

### Requirement: LinkedIn Handling

The system MUST detect LinkedIn job URLs (`linkedin.com/jobs/`). If the environment variable `LINKEDIN_SESSION` (li_at cookie value) is set, the system SHALL include it in the request. If the variable is absent or the request fails with 401/403, the system SHALL exit with an actionable error suggesting manual paste.

#### Scenario: LinkedIn URL without session cookie

- GIVEN a LinkedIn job URL and `LINKEDIN_SESSION` is not set
- WHEN the system processes the URL
- THEN the system SHALL exit non-zero with message: "LinkedIn requires LINKEDIN_SESSION env var. Paste JD text manually as fallback."

#### Scenario: LinkedIn URL with expired cookie

- GIVEN a LinkedIn job URL and `LINKEDIN_SESSION` is set but expired
- WHEN the system receives a 401/403 response
- THEN the system SHALL exit non-zero with message indicating the cookie expired and suggesting manual paste

### Requirement: JS-Heavy Site Graceful Failure

The system operates on server-rendered HTML only. If the fetched HTML contains no meaningful content (empty `<body>`, or content below a minimum threshold of extractable text), the system MUST exit with a clear error indicating the site likely requires JavaScript rendering.

#### Scenario: SPA with empty initial HTML

- GIVEN a URL that returns an HTML shell with no content (JS-rendered SPA)
- WHEN the system fetches and parses
- THEN the system SHALL exit non-zero with message: "Page appears to require JavaScript rendering. Paste JD text manually."

#### Scenario: Minimal content threshold

- GIVEN a fetched page with fewer than 50 words of extractable text
- WHEN content validation runs
- THEN the system SHALL treat this as a JS-heavy failure

### Requirement: No PDF Support

The system MUST NOT attempt to process PDF files. If the URL ends in `.pdf` or the response Content-Type is `application/pdf`, the system SHALL exit with an error indicating PDF is not supported.

#### Scenario: PDF URL provided

- GIVEN a URL ending in `.pdf`
- WHEN the system validates the input
- THEN the system SHALL exit non-zero with message: "PDF ingestion is not supported. Paste JD text manually."
