# PDF Changer

**Free PDF toolkit that runs entirely in your browser. No uploads. No tracking. No subscriptions.**

[**Try it live →**](https://pdf-changer.pages.dev) · [How it's built](https://pdf-changer.pages.dev/colophon) · [Security docs](https://pdf-changer.pages.dev/security) · [Research](https://pdf-changer.pages.dev/research) · [Self-test](https://pdf-changer.pages.dev/verify)

---

Every online PDF tool uploads your files to their servers. iLovePDF, Smallpdf, Adobe Acrobat Online — they all do it. Some promise to delete after an hour. Some don't say.

PDF Changer processes everything in your browser tab. Your files never leave your device. And unlike "trust us" privacy claims, this one is **provable** — every operation runs inside a sandboxed iframe with three concurrent monitors that produce a tamper-evident audit report.

## Tools

19 PDF tools, all running client-side (+ 1 coming soon):

| Tool | What it does |
|------|-------------|
| **Deep Scrub** | Strip metadata, EXIF, XMP, forms, annotations, JavaScript, embedded files |
| **Paranoid Scrub** | Everything above + ICC profiles, document ID, structure randomization |
| **Merge** | Combine multiple PDFs into one |
| **Split** | Extract page ranges or split per-page |
| **Compress** | Reduce file size by rebuilding document structure |
| **Redact** | Properly remove content (flatten to image, not just draw a box over it) |
| **Flatten** | Convert pages to images — destroys all hidden structure |
| **OCR** | Extract text from scanned PDFs (Tesseract.js, runs locally) |
| **Rotate / Crop** | Page-level transformations |
| **Watermark** | Add text watermarks with configurable opacity and angle |
| **Page numbers** | Add numbering to pages |
| **Sign** | Place signature images on pages |
| **Fill forms** | Detect and fill interactive PDF form fields |
| **Unlock** | Strip owner-password restrictions (cannot decrypt user-password PDFs) |
| **Image ↔ PDF** | Convert between images and PDFs |
| **Analyze** | Forensic analysis of PDF structure and hidden data |
| **Pipeline** | Chain operations: scrub → flatten → compress in one pass |

## What makes this different

### Verified Processing Environment (VPE)

Every operation is wrapped in three concurrent monitors:

- **PerformanceObserver** — catches all network requests during processing
- **CSP violation listener** — captures any blocked exfiltration attempts
- **MutationObserver** — detects injected scripts, tracking pixels, iframes

WebRTC is monkey-patched to prevent IP leaks via ICE candidates. The sandbox iframe runs with `connect-src 'none'` — it physically cannot make outbound connections.

After processing, you get a green shield badge with a full audit report. Export it as JSON or standalone HTML. The report includes SHA-256 hashes of input and output, an HMAC chain for tamper evidence, and the CSP policy that was active.

Threat model covers [45+ browser exfiltration vectors](https://pdf-changer.pages.dev/security/technical/csp-exfiltration-analysis).

### Steganography detection

Most printers embed invisible yellow tracking dots ([Machine Identification Code](https://en.wikipedia.org/wiki/Machine_Identification_Code)) that encode the printer serial number, date, and time. If you scan a printed document back to PDF, those dots survive.

The scrubber includes a heuristic detector that renders pages at high resolution and scans margin areas for yellow pixel patterns matching known MIC grids.

### Structure randomization

PDFs have internal object ordering. If every output had identical structure, that structure becomes a fingerprint — "this document was processed by PDF Changer." Paranoid mode shuffles internal object insertion order using Fisher-Yates. Two identical inputs produce visually identical but structurally different outputs.

### Font fingerprint detection

When you create a PDF with a custom font, the authoring tool embeds a font subset with a randomly generated prefix (`ABCDEF+Helvetica`). That prefix is unique to that specific export. The scrubber detects these and warns you.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, PWA (offline-capable) |
| PDF processing | pdf-lib, PDF.js, Tesseract.js (WASM) |
| Crypto | Web Crypto API (SHA-256, HMAC-SHA256, ECDSA P-256) |
| Backend | Hono on Cloudflare Workers (auth + billing only) |
| Database | Cloudflare D1 (SQLite at the edge) |
| Auth | WebAuthn passkeys, recovery codes |
| Billing | Stripe subscriptions |
| Deploy | Cloudflare Pages + Workers |
| Tests | Vitest — 134 tests across 32 files |
| SSG | Custom Vite plugin — 2,900 lines, pre-renders 500+ static pages |

## Architecture

```
apps/
  web/     — PWA. All PDF processing happens here. ~19k lines TS.
  api/     — Auth + billing only. No file handling. ~1.2k lines TS.
packages/
  shared/  — TypeScript types shared between apps
```

The web app is a PWA — once loaded, it works fully offline. Usage quotas are tracked client-side. Paid users get an ECDSA-signed entitlement token verified in the browser with no API call.

### Build pipeline

The build runs 5 content validation scripts before producing output:

1. **Security content** — enforces required fields, blocks prohibited phrases ("how to commit fraud", "evade law enforcement")
2. **Tool registry** — validates all 21 tool definitions (19 enabled + 1 beta + 1 coming-soon), checks route references
3. **Copy quality** — grammar, tone, jargon detection
4. **Tool doc quality** — documentation completeness per tool
5. **Donation proof** — cryptographic verification of donation artifacts

14 bundle size budgets are enforced. Entry JS is capped at 450KB. Individual tool pages at 10-30KB.

## Interesting implementation details

**Byte-level EXIF stripping** — pdf-lib doesn't expose raw embedded streams, so `exifStrip.ts` scans for JPEG SOI markers and PNG magic bytes in the raw PDF buffer, then excises APP segments and metadata chunks at the byte level.

**Offline entitlements** — paid status is an ECDSA P-256 signed JWT. The browser verifies it locally against a public key — no network roundtrip after initial login.

**Passkey auth** — no passwords stored. WebAuthn registration with 10 one-time recovery codes (SHA-256 hashed with pepper, consumed on use).

**Content Security Policy** — `default-src 'none'` on the sandbox iframe. The main site uses strict CSP with `X-DNS-Prefetch-Control: off` to block DNS-based exfiltration (documented in [Chalmers/ACM AsiaCCS 2016](https://pdf-changer.pages.dev/security/technical/csp-exfiltration-analysis)).

## Research

Original security research published at [/research](https://pdf-changer.pages.dev/research):

- **[Competitor data audit](https://pdf-changer.pages.dev/research/competitor-data-audit)** — canary PDFs + traffic interception to verify what iLovePDF, Smallpdf, etc. actually transmit and retain (in progress)
- **[CSP exfiltration test suite](https://pdf-changer.pages.dev/research/csp-exfiltration-tests)** — systematic cross-browser testing of 45+ data exfiltration vectors against CSP restrictions (in progress)
- **[Printer tracking dot decoder](https://pdf-changer.pages.dev/research/printer-tracking-decoder)** — first browser-based Machine Identification Code decoder. Identifies Xerox DocuColor serial numbers and print timestamps from invisible yellow dots (published)
- **[Why PDF Changer](https://pdf-changer.pages.dev/research/why-pdf-changer)** — honest comparison against Dangerzone, mat2, ExifTool, and online tools

## Honest limitations

- **Protect (password) tool is not implemented.** It's listed as coming-soon, not functional. Use qpdf or LibreOffice for PDF password protection.
- **Unlock is basic.** It strips owner-password restrictions (`ignoreEncryption`). It cannot decrypt user-password-protected PDFs.
- **Browser trust model.** If your browser or OS is compromised, no website can help. Use [Dangerzone](https://dangerzone.rocks/) for container-level isolation.
- **No Office file support.** We handle PDFs only. Dangerzone handles Word/Excel/PowerPoint.
- **No batch CLI.** For scripted pipelines, use mat2 or ExifTool.
- **200-page cap** on flatten/redact due to browser memory limits.
- **Remaining npm dev-dependency vulnerabilities** are in build tools (wrangler, vite, miniflare) that never ship to users. We update as upstream patches become available.

## Self-hosting

The code is MIT licensed. Clone it, run it yourself:

```sh
npm install

# web
cp apps/web/.env.example apps/web/.env
npm run dev:web

# api (optional — only needed for accounts and billing)
cp apps/api/.dev.vars.example apps/api/.dev.vars
npx wrangler d1 create pdf-changer
npx wrangler d1 migrations apply pdf-changer --local --cwd apps/api
npm run dev:api
```

All PDF tools work without the API. The API is only needed for passkey accounts and Stripe billing.

## Tests

```sh
npm test          # everything
cd apps/web && npm test   # web (134 tests)
cd apps/api && npm test   # api
```

## Privacy

- No analytics, no trackers, no third-party scripts
- No PDF uploads — bytes stay on-device
- CSP blocks all external connections during processing
- WebRTC patched to prevent IP leaks
- Backend handles auth and billing only — never sees a PDF byte

## License

[MIT](LICENSE)

---

Built by [Giuseppe Giona](https://pdf-changer.pages.dev/about).
