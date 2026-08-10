# PhD Cold-Email & PI Matchmaker

**名校博士套磁导师一站式服务平台** — find the right PhD advisor, ranked by university, backed by live academic data, and draft the cold email in one place.

Enter a research topic. The platform returns the world's top-ranked universities (QS / THE order, strictly enforced), and under each one the faculty who actually publish in that exact field — with live citation metrics, recent funding, an admission-capacity assessment with written justification, and a one-click personalised outreach email.

Runs entirely on **free, key-less APIs**. No SerpAPI subscription needed.

---

## Why this exists

Prospective PhD applicants waste weeks on two questions that public data can already answer:

1. *Who works on my exact topic at a school I'd actually attend?*
2. *Are they even taking students this year?*

This tool answers both from OpenAlex's open bibliographic record, and then writes the first draft of the email.

---

## Features

### Rank-ordered discovery
Results are grouped by university and strictly ordered by QS (default) or THE world rank. Under each university card, the faculty who published on your topic there — surfaced by searching *works* on the topic, grouping by author, and keeping only authors with ≥2 papers in the field (so you get specialists, not one-off co-authors).

### Comprehensive PI profile cards
| Field | Source |
|---|---|
| Name, title, department, faculty page | OpenAlex author record |
| Total citations, h-index, publication count | OpenAlex `summary_stats` |
| Top 3 landmark papers + DOI links | OpenAlex works, ranked by citations |
| Recent grants (last 3 years) | OpenAlex funding acknowledgements |
| Admission status + written rationale | Deterministic heuristic (below) |

Metrics that OpenAlex doesn't have render as `—` with a "partially unavailable" note rather than breaking the card.

### Admission-capacity indicator
Every PI gets one of three badges, plus the reasoning behind it in plain English:

- 🟢 **Expanding (Actively Recruiting)**
- 🟡 **Stable**
- 🔴 **Downsizing / Sabbatical (Hard to Accept)**

The classifier (`src/lib/admission/heuristic.ts`) is **deterministic** — identical input always produces an identical status and identical reasons, so results are reproducible and auditable. It scores six signals:

| Signal | Weight | Rationale |
|---|---|---|
| Publication momentum (last 3y vs prior 3y) | ±2.0 | A growing group publishes more |
| Active **external** grants since Y−2 | ±2.0 | Funded slots require money |
| New external awards in the last 2 years | ±1.5 | New awards precede new hires |
| Lab-site "Prospective Students" language | ±3.0 | Strongest direct evidence |
| Large author lists on ≥60% of recent papers | +1.0 | Sizeable, still-staffed group |
| Career notes (sabbatical, new lab, retiring) | ±1.5 | Direct capacity change |

Score ≥ 4.5 → Expanding; ≤ −2 → Downsizing; otherwise Stable. A `confidence` level (low/medium/high) reflects how many independent signals were actually available.

**Two calibration details that matter:**
- *Institutional funding is excluded from the grant signal.* OpenAlex lists a PI's own university among `funders` for internal/seed money; nearly every PI has some, so counting it made every professor look "Expanding". Only external agencies and industry sponsors count. Internal money is still displayed, tagged `(internal)`.
- *Publication momentum uses a `group_by` year histogram*, not the fetched page of works, so a truncated 40-work page can't fake a "no recent output" collapse for prolific PIs.

> ⚠️ The status is a heuristic estimate from public data — **not** a statement from the PI. Always confirm by email.

### Integrated cold-email generator
Each card has a **Draft Cold Email** button. Supply your name, affiliation and research interests (and optionally a CV link) and it produces a subject line and body that reference the PI's actual top paper (with DOI), their most recent work, their *external* funder, and their department — the details that make an email read as researched rather than mass-mailed.

### Filters & UX
Region (US / UK / EU / Asia / Other), minimum citation threshold, actively-recruiting-only, QS vs THE ranking, and result breadth. Dark/light mode with persistence. Animated hierarchical drill-down: `University (Rank N)` → `Faculty` → `Deep Metrics Panel`.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** (class-based dark mode), **Lucide** icons, **Framer Motion**
- **Next.js API Routes** for the backend
- **OpenAlex** REST API — free, open, no key required
- **Vitest** for unit/integration tests
- In-memory TTL cache (12h), swappable for Postgres/Prisma or Supabase

---

## Getting started

```bash
git clone https://github.com/ClarkOuyang/phd-pi-matchmaker.git
cd phd-pi-matchmaker
npm install
cp .env.example .env.local   # optional — the app runs fine with no env vars
npm run dev                  # http://localhost:3000
```

### Environment variables

All optional. The application is fully functional with none of them set.

| Variable | Purpose |
|---|---|
| `OPENALEX_MAILTO` | Your email — joins the OpenAlex "polite pool" for better rate limits. Recommended. |
| `OPENALEX_MIN_GAP_MS` | Minimum gap between OpenAlex calls (default `110`). Raise it if you still see 429s. |
| `SCRAPER_MODE` | `fetch` (default) or `playwright` for JS-rendered lab pages. |
| `DATABASE_URL` | PostgreSQL / Supabase URL if you replace the in-memory cache. |

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the production build
npm test           # vitest unit + integration suite
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # dashboard: search, filters, results
│   ├── layout.tsx                  # theme bootstrap (no-flash dark mode)
│   └── api/
│       ├── search/route.ts         # POST — topic → ranked universities + PIs
│       ├── email/route.ts          # POST — PI + applicant → cold email
│       └── universities/route.ts   # GET  — ranking dataset
├── components/
│   ├── UniversityGroupCard.tsx     # rank header + faculty grid
│   ├── PICard.tsx                  # metrics, papers, grants, deep panel
│   ├── AdmissionBadge.tsx          # status pill + confidence
│   ├── ColdEmailDialog.tsx         # applicant form + generated email
│   └── ThemeToggle.tsx
└── lib/
    ├── academic_api/
    │   ├── openalex.ts             # authors, works, yearly histogram
    │   ├── grants.ts               # funder normalisation, internal/external split
    │   └── grants.types.ts
    ├── scrapers/labPage.ts         # lab-site fetch + snippet extraction
    ├── admission/heuristic.ts      # deterministic recruitment classifier
    ├── email/coldEmail.ts          # personalised outreach generator
    ├── search/service.ts           # orchestration: rank → authors → profiles
    ├── data/universities.ts        # QS + THE ranking dataset
    ├── cache.ts                    # TTL cache
    └── types.ts
```

### Request flow

```
topic
  └─> filter universities by region, sort strictly by QS/THE rank
        └─> per university: /works?fulltext.search=topic
                            &filter=authorships.institutions.lineage:<id>
                            &group_by=authorships.author.id
              └─> hydrate top authors  -> /authors?filter=openalex_id:a|b|c
              └─> recent works         -> /works?filter=author.id:X
              └─> yearly histogram     -> /works?group_by=publication_year
              └─> grants from funding acknowledgements
              └─> optional lab-page scrape
              └─> deterministic admission assessment
        └─> apply citation / recruiting filters
  └─> groups sorted by university rank
```

Every external call is wrapped with a timeout, a 12-hour cache, and error capture. A failure for one PI or one university becomes a `warnings[]` entry in the response instead of failing the whole search.

**Rate limiting and payload size.** OpenAlex returns HTTP 429 to bursty clients, which silently dropped whole universities from results. Outbound calls are therefore serialised through a queue with a minimum gap (`OPENALEX_MIN_GAP_MS`, default 110ms) and retried with exponential backoff on 429/5xx. Responses are also trimmed with `select=` to just the rendered fields — `authorships` is excluded because hyperauthorship papers pushed single responses past 4MB and broke the data cache, so collaboration breadth is read from `institutions_distinct_count` instead. Together these took a representative multi-topic run from 6 warnings to 0.

### API

**`POST /api/search`**
```jsonc
{
  "topic": "photoelectrochemical water splitting",  // required, min 2 chars
  "regions": ["UK"],            // optional: US | UK | EU | Asia | Other
  "minCitations": 20000,        // optional
  "recruitingOnly": true,       // optional
  "rankingSource": "QS",        // QS (default) | THE
  "limit": 6                    // universities to scan, max 15
}
```

**`POST /api/email`** — `{ pi: PIProfile, applicant: ApplicantProfile }` → `{ subject, body, wordCount }`

**`GET /api/universities`** — the ranking dataset.

---

## Testing

```
✓ tests/coldEmail.test.ts  (3 tests)
✓ tests/heuristic.test.ts  (7 tests)
✓ tests/pipeline.test.ts   (6 tests)
  16 passed
```

Coverage includes: expanding/stable/downsizing classification, heuristic determinism, graceful behaviour with zero data, the yearly-histogram path overriding a truncated works page, funder normalisation, internal-vs-external funder split, the legacy `grants` payload shape, strict QS/THE ordering, DOI normalisation, top-3 paper selection, HTML stripping, and email personalisation (including preferring an external agency over the PI's own university).

The full stack was also verified against the live OpenAlex API and in a real browser: searching "Solid-State Batteries" returns Yet-Ming Chiang, Gerbrand Ceder and Ju Li at MIT, Peter Bruce and Mauro Pasta at Oxford, and Clare Grey at Cambridge — with genuine ARPA-E / DARPA / NSF grant records and real DOIs.

---

## Data sources & limitations

- **OpenAlex** (CC0) — bibliometrics, funding acknowledgements. Coverage of funding metadata varies by publisher; absence of a grant is not proof of absence of funding.
- **QS & THE World University Rankings 2025** — a curated in-repo slice (22 universities) so the app works offline and key-free. Extend `src/lib/data/universities.ts` to broaden coverage.
- Emails and personal lab URLs are frequently not in OpenAlex; the faculty page link is always provided so you can find them.
- A PI appearing under two universities reflects genuine dual/visiting affiliations in the source data.

---

## Roadmap

- Persist PI profiles and search history to Postgres/Supabase
- Faculty-directory scrapers per university for emails and lab URLs
- NSF / NIH / CORDIS award APIs for authoritative grant amounts and end dates
- CV upload with parsing to auto-fill the applicant profile
- LLM-polished email variants

## License

MIT
