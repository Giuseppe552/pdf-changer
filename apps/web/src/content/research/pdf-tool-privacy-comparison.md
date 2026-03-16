---
title: "Where Do Your PDFs Go? A Network Traffic Comparison of Popular PDF Tools"
summary: "We tested three popular PDF tools and recorded every network request. 91 requests to 18 domains vs 215 requests to 21 domains vs 18 requests to 1 domain. All data is reproducible."
date: 2026-03-16
status: published
tags: [privacy, pdf, network-analysis, ilovepdf, smallpdf, comparison]
estimatedMinutes: 12
---

# Where Do Your PDFs Go?

Every month, hundreds of millions of people upload PDFs to free online tools. Most don't think about where those files actually go.

We tested three popular approaches to PDF processing — two cloud-based tools and one browser-based tool — and recorded every network request the browser made. No speculation. Just traffic logs.

## What we tested

- **iLovePDF** — the most popular free PDF tool (217M monthly visits)
- **Smallpdf** — the second most popular (60M+ monthly visits)
- **PDF Changer** — a browser-only tool that processes files locally (this project)

For each tool, we loaded the merge page, uploaded two small test PDFs, and captured every network request using a browser extension that intercepts traffic at the browser level. The extension runs in a privileged context that page scripts cannot interfere with.

We're including PDF Changer in the comparison because we built it and we should hold ourselves to the same scrutiny. If our tool made requests we didn't expect, we'd want to know.

## Methodology

1. Fresh Chrome profile. No extensions except the capture tool.
2. Navigate to each tool's merge page.
3. Record all network requests from page load through file processing.
4. Upload two identical small test PDFs (no sensitive content).
5. Complete the merge operation.
6. Export the full request log as JSON.

Anyone can reproduce these results. The capture extension source is available and the methodology takes about 5 minutes per tool.

## Results

### The numbers

| | iLovePDF | Smallpdf | PDF Changer |
|---|---|---|---|
| Total network requests | 91 | 215 | 18 |
| Unique domains contacted | 18 | 21 | 1 |
| File uploads to external server | 2 | 2 | 0 |
| Google Analytics requests | 7 | 7 | 0 |
| Ad network domains | 5 | 1 | 0 |
| POST requests with body data | 5 | 68 | 0 |
| Third-party domains | 17 | 20 | 0 |
| Only domain contacted | — | — | pdfchanger.org |

### iLovePDF: 91 requests, 18 domains

When you merge two PDFs on iLovePDF, your browser contacts 18 different servers.

Your files are uploaded to a dynamically assigned server (`api25.ilovepdf.com` in our test — the number changes per session). The upload is a standard HTTP POST. The form data includes your original filenames in cleartext fields: `files[0][filename]`, `files[1][filename]`. The server assigns its own filenames (`server_filename`), confirming server-side storage.

Google Analytics (property `G-44KQ8HETWT`) receives 7 requests containing: your screen resolution, window size, browser version, operating system, language, and the full URL of the page you're on. A persistent client ID (`2122338958.1773693495`) links your visits across sessions.

iLovePDF runs its own analytics beacons to `evt.ilovepdf.com`. These track which tool you used (`t=event&c=user&a=process&l=merge`), your screen dimensions, window size, language, and referrer.

The download page loads Google Ad Manager (`securepubads.g.doubleclick.net`), Google Ad Syndication, OpenX, and Criteo. Ad network scripts loaded on a page that just processed your documents.

On the download page, a Google Ads request sends a GDPR consent string over 500 characters long, referencing TCF vendor IDs and partner lists. iLovePDF's own cookie policy mentions 141 TCF vendors and 63 ad partners.

**Domains contacted:**

| Domain | Requests | Purpose |
|--------|----------|---------|
| www.ilovepdf.com | 34 | Main site assets |
| region1.google-analytics.com | 7 | Google Analytics data collection |
| securepubads.g.doubleclick.net | 6 | Google Ad Manager |
| pagead2.googlesyndication.com | 6 | Google Ad Syndication |
| ep2.adtrafficquality.google | 5 | Ad fraud detection |
| ep1.adtrafficquality.google | 4 | Ad fraud detection |
| evt.ilovepdf.com | 3 | iLovePDF's own analytics |
| api25.ilovepdf.com | 3 | File upload + processing |
| cm.g.doubleclick.net | 2 | DoubleClick cookie matching |
| oajs.openx.net | 2 | OpenX ad exchange |
| gum.criteo.com | 2 | Criteo ad retargeting |

For context: iLovePDF's privacy policy states files are deleted within 2 hours. Their terms state they "do not access and analyze the content." They are ISO 27001 certified. These are their stated policies — we are not disputing them. We are documenting what the browser observes during a standard merge operation.

### Smallpdf: 215 requests, 21 domains

Smallpdf generated more than twice the network traffic of iLovePDF for the same operation.

57 of the 215 requests went to `www.google.com`. Files were uploaded to `files-upload.r2.smallpdf.com` (Cloudflare R2 storage). 48 requests went to `pluto.smallpdf.com` and 46 to `s.smallpdf.com` — internal API and asset servers.

Google Analytics (7 requests), Google Tag Manager (5 requests), Google Ad Syndication (7 requests). 68 POST requests with body data — significantly more server communication than iLovePDF.

Smallpdf's trust center states files are "permanently removed from servers after one hour" for free users. They use AES-256 encryption and TLS 256-bit for transit. They are ISO 27001 certified and GDPR compliant. They also state that data is "only accessed in limited ways, such as responding to support requests or addressing technical issues" — which confirms that staff access to uploaded files is technically possible during the retention window.

**Top domains contacted:**

| Domain | Requests | Purpose |
|--------|----------|---------|
| www.google.com | 57 | Google services |
| pluto.smallpdf.com | 52 | Internal API |
| s.smallpdf.com | 46 | Assets/API |
| region1.google-analytics.com | 7 | Analytics |
| pagead2.googlesyndication.com | 7 | Ad syndication |
| www.googletagmanager.com | 5 | Tag manager |
| smallpdf.com | 5 | Root domain |
| task.smallpdf.com | 4 | Task processing |
| pro.smallpdf.com | 4 | Pro features |

### PDF Changer: 18 requests, 1 domain

18 requests. All to `pdfchanger.org`. Zero third-party domains. Zero file uploads. Zero analytics. Zero ads. Zero POST requests with body data.

The 18 requests are: the HTML page, CSS, JavaScript bundle, fonts, icons, and manifest. The assets needed to load the tool. Nothing else.

Processing happens inside a sandboxed iframe with `connect-src 'none'` in its Content Security Policy — meaning the browser physically prevents any network request from the processing context. Three concurrent monitors (PerformanceObserver, CSP violation listener, MutationObserver) watch for exfiltration attempts during processing. After processing, a tamper-evident audit report is generated with SHA-256 hashes of both input and output.

PDF Changer also works offline. Disconnect from the internet entirely, process a PDF, reconnect. The files never need to leave the browser.

Our tool is not perfect. The audit report is self-attested (the same code that processes the file generates the proof). There are no E2E browser tests. The MIC decoder only covers Xerox patterns. These limitations are documented on the [colophon page](/colophon).

## The business model question

This isn't just a technical difference. It's an economic one.

iLovePDF and Smallpdf process your files on their servers. That architecture requires cloud infrastructure, which costs money, which is funded by ads and premium subscriptions. The ad networks on their pages aren't a failure of engineering — they're the business model. Your file processing subsidises the ad impressions.

PDF Changer processes files in your browser. There are no servers to maintain (beyond a static file host and a small auth API). Infrastructure costs are near zero. There's no ad revenue because there are no ads. There are no premium tiers because every feature is free.

This isn't a moral judgment. Cloud processing is a valid architecture and both iLovePDF and Smallpdf are legitimate businesses with ISO certifications and GDPR compliance. The question is whether you're comfortable with the trade-off: free PDF processing in exchange for your files passing through their servers and your browsing data going to ad networks.

## How to verify yourself

You don't have to trust this article. Open any PDF tool, open Chrome DevTools (F12), go to the Network tab, and process a file. Count the requests. Read the domains. Look at the request sizes.

For a more detailed capture, the browser extension we used for this research intercepts requests at the browser level. It records every request, response header, cookie, and third-party domain in a downloadable JSON file.

The methodology is reproducible. If our data is wrong, anyone can check.

## What we measured and what we didn't

We measured network traffic during a standard merge operation. We did not:

- Test file retention (whether download links remain active past the stated deletion window)
- Inspect server-side processing (we can only observe what the browser sends and receives)
- Verify deletion claims (we have no way to confirm files are actually deleted from their servers)
- Test with sensitive documents (we used blank test PDFs)
- Audit the mobile apps (this covers the web tools only)

These would be valuable follow-up studies. We're documenting what we can verify from the browser.

## Raw data

The full JSON capture files for all three tools are available for download. Each file contains every network request with timestamps, URLs, HTTP methods, response codes, server headers, cookies, and request body sizes.

- [iLovePDF capture (91 requests, 56KB)](/research/data/ilovepdf-capture.json)
- [Smallpdf capture (215 requests, 134KB)](/research/data/smallpdf-capture.json)
- [PDF Changer capture (18 requests, 7KB)](/research/data/pdfchanger-capture.json)
