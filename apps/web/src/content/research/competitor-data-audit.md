---
title: "Competitor Data Leak Audit: What Free PDF Tools Actually Transmit"
summary: "Systematic audit of 7 popular free PDF services using canary documents and traffic interception. We tested what data each service transmits, retains, and exposes — and whether their privacy claims hold up."
date: 2026-03-14
status: in-progress
tags: [privacy, metadata, pdf, audit, mitmproxy]
estimatedMinutes: 18
---

# Competitor Data Leak Audit: What Free PDF Tools Actually Transmit

## Background

Millions of people upload sensitive PDFs to free online tools every day. Services like iLovePDF, Smallpdf, and Adobe Acrobat Online promise they delete your files within hours. But nobody has systematically verified these claims.

This research uses canary PDFs — documents with unique, trackable metadata markers — combined with full traffic interception to document exactly what happens when you upload a PDF to each service.

## Research questions

1. **What data does each service receive?** The full PDF binary? A thumbnail? Metadata only?
2. **Do they strip metadata from output files?** Or does your author name, GPS location, and edit history survive processing?
3. **Do they add their own metadata?** Producer fields, modification timestamps, tracking IDs?
4. **Do retention claims hold?** If they say "deleted after 1 hour," is the download link actually dead after 1 hour?
5. **Do they leak data to third parties?** Analytics services, ad networks, social pixels?
6. **Do they strip EXIF from embedded images?** Or does the GPS location in your profile photo survive a PDF merge?

## Target services

| Service | Claimed privacy | Claimed retention |
|---------|----------------|-------------------|
| iLovePDF | "Files deleted after 2 hours" | 2 hours |
| Smallpdf | "Files deleted after 1 hour" | 1 hour |
| PDF24 | "Privacy-focused, German hosting" | Session-based |
| Adobe Acrobat Online | "Adobe does not access your files" | 24 hours |
| Sejda | "Files deleted after 2 hours" | 2 hours |
| PDF2Go | "Auto-deleted after 24 hours" | 24 hours |
| FreePDFConvert | "Removed after 1 hour" | 1 hour |

*Claimed retention periods sourced from each service's privacy policy or FAQ as of March 2026.*

## Methodology

### 1. Canary PDF construction

Each canary PDF is constructed using PDF Changer's own tools with the following unique markers:

**Document-level metadata (PDF Info Dictionary):**
- `Author` — unique per service (e.g., `canary-ilovepdf-2026-03-14`)
- `Title` — unique identifier string
- `Subject` — service name + timestamp
- `Creator` — `PDFChanger-Research-v1`
- `Producer` — original producer string to check if overwritten
- `CreationDate` — exact timestamp
- `ModDate` — exact timestamp

**XMP metadata:**
- `dc:creator` — canary author name
- `dc:description` — unique tracking string
- `xmp:CreateDate` — ISO 8601 timestamp
- Custom `xmpMM:DocumentID` — UUID unique to each upload

**Embedded image with EXIF:**
- JPEG embedded on page 1 with:
  - GPS coordinates (unique per service — different fake locations)
  - Camera model: `CanaryCamera-{service}`
  - EXIF timestamp
  - Software field: `PDFChanger-Research`

**Document ID:**
- PDF `/ID` array set to unique values per upload

**Form field:**
- One hidden AcroForm field with a canary value to test whether form data is preserved or stripped

### 2. Traffic interception

All uploads are performed through mitmproxy in transparent mode:

```bash
# Start mitmproxy with flow recording
mitmproxy --mode regular --save-stream-file flows/ilovepdf.flow \
  --set block_global=false
```

**Browser configuration:**
- Firefox with mitmproxy CA certificate installed
- Private browsing mode (clean session per service)
- No extensions (prevents extension-injected requests)
- User-Agent left as default Firefox

**Captured data per service:**
- Every HTTP/HTTPS request URL
- Request and response headers
- Request bodies (including the uploaded PDF binary)
- Response bodies (including the processed PDF)
- Cookies set and transmitted
- Third-party domains contacted
- WebSocket connections

### 3. Upload procedure

For each service, the same operation is performed:

1. Navigate to the service's merge/compress/convert page
2. Upload the canary PDF
3. Perform one operation (compress)
4. Download the result
5. Record all network traffic
6. Wait for the claimed retention period
7. Attempt to re-access the download link
8. Record whether the link is dead or still serves the file

### 4. Output analysis

The downloaded PDF from each service is analyzed for:

- **Metadata preservation** — does the canary author/title survive?
- **Metadata injection** — did the service add its own producer/creator fields?
- **EXIF preservation** — does the embedded image still contain GPS coordinates?
- **Form field preservation** — does the hidden form field survive?
- **Document ID changes** — was the `/ID` array modified?
- **Structural changes** — object count, page count, linearization

### 5. Third-party analysis

Network captures are analyzed for:

- Google Analytics hits (and what data they contain)
- Facebook Pixel events
- Other tracking pixels or beacons
- CDN requests that might cache document thumbnails
- API calls to services not listed in the privacy policy

## Tools

| Tool | Version | Purpose |
|------|---------|---------|
| mitmproxy | 10.x | HTTPS traffic interception |
| PDF Changer | latest | Canary PDF construction + output analysis |
| Firefox | stable | Upload browser |
| pdf-lib | 1.17 | Programmatic PDF inspection |
| ExifTool | 12.x | EXIF metadata verification |
| curl | latest | Retention testing (re-download attempts) |

## Data collection

### What we capture
- Network traffic (URLs, headers, bodies)
- PDF metadata before and after processing
- Download link availability over time
- Third-party domains contacted

### What we do NOT capture
- Other users' data or documents
- Internal API endpoints beyond what the browser naturally contacts
- Server-side storage or database contents (we only observe client-side behavior)

### Ethical boundaries
- We upload only our own synthetic documents
- We do not attempt to access other users' files
- We do not exploit any vulnerabilities found
- We notify services of concerning findings before publishing details
- We do not test rate limits or perform any action that could degrade service

## Status

This research is currently **in progress**. The methodology is finalized and canary PDFs have been constructed. Upload testing and traffic capture are underway.

### Completed
- Canary PDF template designed and built
- mitmproxy capture methodology validated
- Analysis pipeline for output PDFs ready
- Ethical review completed

### In progress
- Service-by-service upload and capture
- Retention period verification (requires waiting)

### Remaining
- Third-party traffic analysis
- Comparison table compilation
- Report writing
- Responsible disclosure to services with concerning findings

## Preliminary observations

*This section will be updated as data is collected. Check back for findings.*

## How to reproduce

All tools used in this audit are freely available:

1. Install mitmproxy: `pip install mitmproxy`
2. Generate a canary PDF using PDF Changer's analyze tool to verify markers
3. Configure browser proxy to `127.0.0.1:8080`
4. Install mitmproxy CA certificate in browser
5. Upload to target service through the proxy
6. Analyze captured flows with `mitmdump -r flows/service.flow`
7. Download the processed PDF and analyze with ExifTool + pdf-lib

Full automation scripts will be published after the report is complete.

## Related work

- EFF: ["Who Has Your Back?"](https://www.eff.org/who-has-your-back) — annual corporate transparency reports
- Previous metadata studies have focused on individual services but not systematic cross-service comparison
- PDF Changer's existing [metadata forensic traces](/security/technical/metadata-forensic-traces) article documents what metadata exists in PDFs

## Disclosure policy

If we find that a service makes privacy claims that are contradicted by observed behavior, we will:

1. Contact the service's security/privacy team with our findings
2. Give them 30 days to respond and correct the issue
3. Publish the finding with or without their response after 30 days
4. Clearly distinguish between "concerning" and "deceptive" behavior

Services that are transparent about their practices — even if those practices aren't ideal — will be noted positively.
