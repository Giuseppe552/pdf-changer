# PDF Changer

[![CI](https://github.com/Giuseppe552/pdf-changer/actions/workflows/ci.yml/badge.svg)](https://github.com/Giuseppe552/pdf-changer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests: 299](https://img.shields.io/badge/tests-299_passing-brightgreen)]()
[![Tools: 21](https://img.shields.io/badge/tools-21-blue)]()

Free PDF toolkit. Runs in your browser. Files never leave your device.

[**pdfchanger.org**](https://pdfchanger.org)

## Why

Every online PDF tool uploads your files to a server. PDF Changer doesn't. Everything runs client-side in a sandboxed iframe with `connect-src: 'none'`. Three monitors (CSP, PerformanceObserver, MutationObserver) watch for exfiltration. Every event hashes into a tamper-evident HMAC chain. Downloadable audit report with SHA-256 proof.

## Tools

| | |
|---|---|
| **Privacy** | Deep scrub, Paranoid scrub, Forensic analyzer, Visual redaction, Flatten to image, Privacy pipeline |
| **Organise** | Merge, Split, Page editor, Remove pages, Rotate |
| **Edit** | Compress, Crop, Watermark, Page numbers, Sign, Fill forms, OCR, Image ↔ PDF |
| **Protect** | Unlock (owner password) |

21 tools. All client-side. No server uploads.

<details>
<summary><strong>Paranoid mode pipeline</strong></summary>

1. Strip all metadata, annotations, JavaScript, forms, embedded files
2. Strip ICC colour profiles (colour-space fingerprinting)
3. Clear document ID from trailer (unique file identifier)
4. Normalise producer string (authoring tool signature)
5. Fisher-Yates shuffle internal object order (structural fingerprinting)
6. Flag font subset fingerprints (ABCDEF+ prefix patterns)

Two identical inputs → structurally different outputs.

</details>

<details>
<summary><strong>Byte-level metadata stripping</strong></summary>

pdf-lib can't reach inside embedded image streams. The scrubber scans raw bytes:

- JPEG: finds SOI markers (FF D8), strips APP1/APP2/APP13/APP14 segments (EXIF, XMP, ICC, IPTC)
- PNG: walks chunks, strips tEXt/iTXt/eXIf/iCCP
- Overlapping regions get merge-sorted before excision

Most "metadata removal" tools don't touch embedded images. This one does.

</details>

<details>
<summary><strong>Printer tracking dot decoder</strong></summary>

Most colour printers embed invisible yellow dots encoding serial number, date, time (Machine Identification Code). The decoder renders pages at high resolution, scans margins for patterns, decodes Xerox DocuColor 15×8 grids.

Based on the EFF's research and TU Dresden's DEDA project. Currently Xerox only — other manufacturers use different encodings.

</details>

## Stack

```
apps/web     React SPA · pdf-lib · PDF.js · Tesseract.js · Web Crypto
             VPE sandbox (iframe + CSP + 3 monitors + HMAC chain)
             Service worker · offline cache · PWA
apps/api     Hono · Cloudflare Workers · D1 · WebAuthn · ECDSA tokens
```

## Run locally

```sh
git clone https://github.com/Giuseppe552/pdf-changer.git && cd pdf-changer
npm install
npm run dev          # starts web + api
npm test             # 299 tests across 42 files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues labeled [`good first issue`](https://github.com/Giuseppe552/pdf-changer/labels/good%20first%20issue) are ready to pick up.

Core rule: **files never leave the browser.** Any PR that adds server-side file processing will be rejected.

## License

MIT
