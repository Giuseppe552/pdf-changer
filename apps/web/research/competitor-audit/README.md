# Competitor Data Leak Audit

Tools for systematically auditing what data popular free PDF services transmit, retain, and expose.

## Quick start

```bash
# 1. Generate canary PDFs (one per target service)
npx tsx generate-canary.ts

# 2. Start mitmproxy to capture traffic
mitmproxy --mode regular --save-stream-file flows/ilovepdf.flow

# 3. Configure browser proxy to 127.0.0.1:8080, install mitmproxy CA
# 4. Upload each canary to the corresponding service, download result

# 5. Analyze the processed output
npx tsx analyze-output.ts canaries/canary-ilovepdf-2026-03-14.pdf output/ilovepdf-result.pdf
```

## Files

```
generate-canary.ts    — Creates canary PDFs with unique trackable metadata
analyze-output.ts     — Compares original canary with processed output
canaries/             — Generated canary PDFs (gitignored)
output/               — Downloaded results from services (gitignored)
flows/                — mitmproxy capture files (gitignored)
```

## Canary markers

Each PDF contains unique identifiers in:
- PDF Info Dictionary (Author, Title, Subject, Creator, Producer, Keywords)
- Creation and modification timestamps
- Hidden form field with canary value
- Unique document ID in keywords

## Target services

| Service | Claimed retention | Canary location |
|---------|------------------|-----------------|
| iLovePDF | 2 hours | Barcelona |
| Smallpdf | 1 hour | Zurich |
| PDF24 | Session-based | Berlin |
| Adobe Acrobat Online | 24 hours | Mountain View |
| Sejda | 2 hours | Amsterdam |
| PDF2Go | 24 hours | Paris |
| FreePDFConvert | 1 hour | London |

## Ethical boundaries

- Only our own synthetic documents are uploaded
- No attempt to access other users' files
- No exploitation of any vulnerabilities found
- Services with concerning findings are notified before publication
