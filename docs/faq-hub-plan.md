# FAQ Hub Plan (Indexable, Scalable, Human)

## Goal

Build `/faq` into a high-value knowledge hub that can scale to 500+ pages while staying:

- indexable by search engines
- useful for non-technical readers
- consistent with privacy-first product rules (no trackers, no third-party scripts)

## Current state (audited)

- `/faq` is a single markdown file at `apps/web/src/content/resources/faq.md`.
- Route is handled by `MarkdownContentPage` at `apps/web/src/ui/pages/content/MarkdownContentPage.tsx`.
- FAQ pages are not statically generated like blog pages.
- `vite.seo.ts` generates static SEO pages only for `/blog`.
- PWA fallback denylist includes `/blog` but not `/faq`.
- `_redirects` has explicit static handling for `/blog` only.

## Target information architecture

### URL model

- Hub: `/faq`
- Topic index: `/faq/<topic>`
- Question page: `/faq/<topic>/<slug>`

### Topic clusters (v1)

- `anonymity-basics`
- `document-safety`
- `metadata`
- `submission-safety`
- `device-opsec`
- `network-opsec`
- `legal-and-risk`
- `tool-usage`

## Content model

Create `apps/web/src/content/faq/` with one markdown file per question:

- path: `apps/web/src/content/faq/<topic>/<slug>.md`
- frontmatter fields:
  - `title`
  - `summary` (140-170 chars)
  - `question`
  - `topic`
  - `tags` (array)
  - `lastReviewed` (YYYY-MM-DD)

Recommended answer structure per page:

1. Short answer (2-4 lines)
2. Why this matters
3. Safe default steps (numbered)
4. Common mistakes
5. Limits and caveats
6. Related links (FAQ, Guides, Blog, tool pages)

## SEO and indexability implementation

## Static generation

Extend the current static SEO build system to generate FAQ pages at build time:

- Add FAQ index loader (`faqIndex.ts`) similar to blog index loader.
- Add static output in `vite.seo.ts` (or a dedicated `vite.faq.seo.ts`):
  - `/faq/index.html`
  - `/faq/<topic>/index.html`
  - `/faq/<topic>/<slug>/index.html`

## Page metadata

Per FAQ page:

- unique `<title>` and meta description from frontmatter
- canonical URL (absolute when `SITE_ORIGIN` is provided)
- Open Graph + Twitter tags
- `robots: index,follow`
- breadcrumb nav
- `FAQPage` microdata markup in HTML body (no inline JSON-LD required)

## Routing and fallback

- Add SPA routes for FAQ hub/topic/question pages for client navigation.
- Keep static files crawlable:
  - update `apps/web/public/_redirects`:
    - `/faq /faq/index.html 200`
    - `/faq/* /faq/:splat 200`
  - update `apps/web/vite.config.ts` PWA fallback denylist:
    - add `/^\\/faq(\\/|$)/`

## Sitemap and feeds

Add FAQ URLs to generated `sitemap.xml` in `vite.seo.ts`.

Optional:

- include FAQ entries in RSS only for "recently updated FAQ" feed, else keep RSS blog-only

## UX and internal linking

FAQ hub page should include:

- topic cards with question counts
- "Start here" section for non-technical users
- prominent search input (client-side filter)
- "Most read this week" (static list maintained in content index)

Each question page should include:

- "Related questions" (same topic + adjacent topic)
- "Next safe step" CTA linking to `/scrub`, `/guides`, or `/blog`
- clear "What this does not protect against" box

## Editorial quality rules (to avoid thin or generic AI-like pages)

- one question per page, one clear answer intent
- minimum 350 words unless answer is truly narrow
- include at least one concrete scenario or example
- avoid keyword stuffing and duplicated intros
- avoid absolute guarantees; state limits clearly
- review and refresh timestamps (`lastReviewed`)

## Scale plan to 500+ pages

## Phase 1 (foundation, 2-4 days)

- Implement FAQ content model + routes + static generation
- Build hub page + topic pages + question template
- Publish first 40-60 high-intent FAQs

## Phase 2 (authority, 2-3 weeks)

- Expand to 180-250 FAQs across all topics
- Add cross-linking rules and "related question" automation
- Add "Updated on" workflow and editorial checklist

## Phase 3 (scale, ongoing)

- Grow to 500+ FAQs with strict quality thresholds
- Split sitemap when URL count grows (`sitemap-faq-*.xml`)
- Quarterly content pruning of low-value or duplicate pages

## Measurement (privacy-safe)

Use only Google Search Console + server logs where available:

- indexed FAQ URL count
- impressions/clicks/CTR by topic
- top query-to-page match quality
- cannibalization checks (multiple pages competing for same query)

No third-party analytics scripts are required.

## Execution order in codebase

1. Add FAQ content index module
2. Build FAQ React pages (`/faq`, `/faq/:topic`, `/faq/:topic/:slug`)
3. Extend static generation plugin for FAQ HTML output
4. Update `_redirects`, `vite.config.ts`, sitemap generation
5. Add first content batch and internal links
6. QA crawlability + manual indexability checks
