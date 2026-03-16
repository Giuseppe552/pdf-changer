---
title: "Why PDF Changer: Honest Comparison with Alternatives"
summary: "A direct comparison of PDF Changer against Dangerzone, mat2, ExifTool, and online PDF tools. What we do better, what they do better, and when to use each."
date: 2026-03-14
status: published
tags: [comparison, privacy, tools, alternatives]
estimatedMinutes: 12
---

# Why PDF Changer: Honest Comparison with Alternatives

PDF Changer is not the only tool for cleaning PDFs. Here's when you should use it, when you shouldn't, and how it compares to the alternatives.

## The short version

| Need | Best tool |
|------|-----------|
| Quick metadata scrub, no install | **PDF Changer** |
| Office documents (Word, Excel, PPT) | **Dangerzone** |
| CLI automation in scripts | **mat2** or **ExifTool** |
| Auditable processing with proof | **PDF Changer** (unique) |
| Printer tracking dot analysis | **PDF Changer** (unique) |
| Maximum paranoia, air-gapped | **Dangerzone** + Tails |
| Batch EXIF extraction | **ExifTool** |
| Merge, split, edit + privacy in one place | **PDF Changer** |

## Detailed comparison

### PDF Changer vs Dangerzone

[Dangerzone](https://dangerzone.rocks/) (by Freedom of the Press Foundation) converts documents to safe PDFs using sandboxed LibreOffice inside containers.

**Dangerzone wins at:**
- Office format support (Word, Excel, PowerPoint, ODP)
- Sandboxing depth — runs inside gVisor/Docker containers with no network
- Established reputation in the journalist/activist community
- Handles malicious documents (macro exploits, embedded objects)

**PDF Changer wins at:**
- No installation required — works in any modern browser
- Audit reports — tamper-evident HMAC chain proves what happened during processing
- Tool breadth — merge, split, edit, compress, OCR, redact, sign, watermark in one place
- Printer tracking dot decoder — Dangerzone doesn't detect or decode MICs
- Speed — no container boot, no LibreOffice startup. Instant processing
- Transparency — you can inspect every line of JavaScript running in your browser

**When to use Dangerzone instead:**
- You received a suspicious Word/Excel file and need to render it safely
- You need container-level isolation (PDF Changer trusts your browser)
- You're on Tails or Qubes and want defense-in-depth

**When to use PDF Changer instead:**
- You need to scrub a PDF quickly without installing anything
- You need an audit trail proving the document was processed correctly
- You want to analyze what metadata exists before deciding what to do
- You need merge/split/edit/compress alongside privacy tools

### PDF Changer vs mat2

[mat2](https://0xacab.org/jfrber/mat2) (Metadata Anonymisation Toolkit 2) is a CLI tool for stripping metadata from files.

**mat2 wins at:**
- Format breadth — handles images, audio, video, office docs, torrents, not just PDFs
- Scriptability — pipes naturally into shell workflows
- Lightweight — small Python package, no browser needed
- Established in Tails (ships by default)

**PDF Changer wins at:**
- No CLI knowledge required
- Visual redaction — draw boxes and burn them irreversibly
- Forensic analysis — shows you exactly what metadata exists before removal
- Audit reports — cryptographic proof of what was done
- Printer tracking dot analysis
- PDF-specific operations — merge, split, compress, OCR, forms, signatures

**When to use mat2 instead:**
- You're scripting metadata removal in a pipeline
- You need to strip metadata from non-PDF files (images, audio)
- You're on Tails and want the pre-installed option

**When to use PDF Changer instead:**
- You need visual inspection of what's in the PDF before acting
- You need redaction, merging, splitting, or other PDF operations
- You want proof that processing happened correctly

### PDF Changer vs ExifTool

[ExifTool](https://exiftool.org/) is the standard for reading and writing metadata in files.

**ExifTool wins at:**
- Metadata depth — reads hundreds of tag types across dozens of formats
- Write support — can set specific metadata fields, not just remove them
- Forensic extraction — dumps raw binary metadata structures
- Community — decades of documentation and StackOverflow answers

**PDF Changer wins at:**
- Usability — no command line, no tag syntax to memorize
- PDF structure awareness — understands forms, annotations, JavaScript, not just metadata
- Combined operations — scrub + flatten + compress in one pipeline
- Audit reports
- Printer tracking dot decoding

**When to use ExifTool instead:**
- You need to read or write specific metadata tags
- You need to process non-PDF files
- You need maximum extraction depth for forensic investigation

**When to use PDF Changer instead:**
- You want a quick check of what's leaking from a PDF
- You need to remove metadata AND structural elements (forms, scripts, annotations)
- You need to merge, split, redact, or otherwise edit the PDF

### PDF Changer vs online tools (iLovePDF, Smallpdf, etc.)

Online tools like iLovePDF, Smallpdf, Adobe Acrobat Online, and PDF24 offer browser-based PDF processing.

**Online tools win at:**
- Polish — larger teams, more design investment
- Advanced features — some offer AI-powered OCR, form recognition
- Mobile apps — dedicated iOS/Android apps
- Brand recognition — most people have heard of them

**PDF Changer wins at:**
- Privacy — your PDF never leaves your browser. Period. No "we delete after 1 hour" promises that [we're currently auditing](/research/competitor-data-audit)
- No account required — no email, no signup, no tracking
- Audit proof — cryptographic verification that no data was transmitted
- Security research — we publish what we find, including about our competitors
- Transparency — open source, inspectable, verifiable

**When to use online tools instead:**
- You're processing non-sensitive documents and convenience matters more than privacy
- You need features PDF Changer doesn't have (e.g., PDF to Word conversion)

**When to use PDF Changer instead:**
- The document contains anything you wouldn't want a third party to see
- You need verifiable proof that no data was uploaded
- You're a journalist, lawyer, activist, or whistleblower

## What PDF Changer does that nobody else does

### 1. Verified Processing Environment (VPE)

No other PDF tool provides a tamper-evident audit report proving what happened during processing. The VPE runs three concurrent monitors (PerformanceObserver, CSP violation listener, MutationObserver), captures SHA-256 hashes of input and output, and chains events with HMAC for tamper detection.

The report is exportable as standalone HTML — no server needed to verify it.

[Read the technical details](/security/technical/verified-processing-environment)

### 2. Printer tracking dot decoder

PDF Changer includes the first browser-based Machine Identification Code decoder. Upload a high-resolution scan and the decoder identifies the Xerox DocuColor printer model, serial number, and exact print timestamp from invisible yellow tracking dots.

No other browser tool does this. The only alternatives are DEDA (Python, requires installation) and the EFF's 2005 decoder script (Python, Xerox only, unmaintained).

[Read the research](/research/printer-tracking-decoder)

### 3. Structure randomization

The Paranoid Scrub shuffles internal PDF object IDs using Fisher-Yates randomization. Two identical inputs produce visually identical but structurally different outputs — preventing fingerprinting by PDF structure analysis.

### 4. Competitive privacy audit

We're [systematically auditing](/research/competitor-data-audit) what popular online PDF tools actually transmit, retain, and expose when you upload a file. Using canary documents with trackable metadata and full traffic interception.

## Honest limitations

- **No Office file support** — Dangerzone handles Word/Excel, we don't
- **Browser trust model** — we can't protect against a compromised browser or OS
- **No batch CLI mode** — mat2 and ExifTool are better for automated pipelines
- **Unlock is basic** — just re-saves with `ignoreEncryption`, doesn't handle real passwords
- **Protect (password) is not implemented** — it's listed as coming-soon, not functional
- **Single language OCR per run** — Tesseract.js downloads ~15MB per language
- **200-page cap on flatten/redact** — browser memory limits

We'd rather be honest about these than pretend they don't exist.
