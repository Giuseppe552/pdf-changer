# Anonymity 101 (for documents)

If you’re here, you probably have the “I need to share this… but I don’t want it traced back to me” feeling. This is a plain‑English guide to the boring little breadcrumbs that identify people when they share documents.

Take a breath. The goal isn’t perfection. It’s removing the **easy breadcrumbs** that add up.

This post is plain‑English: what typically identifies people, and what lowers risk.

## What anonymity means (and what it doesn’t)

In practice, anonymity is about **linkability**: can someone confidently connect *you* to *this document* and *the act of sending it*?

It does **not** guarantee you can’t be:

- investigated,
- suspected,
- identified by what’s in the content (names, IDs, letterheads, unique wording).

## The big three: device, network, document

Most people focus only on the PDF. That’s understandable — and it’s also where people get burned.

Think in three layers:

1) **Device layer** — the computer/phone you use  
2) **Network layer** — the internet connection that carries your requests  
3) **Document layer** — metadata + visible content inside the PDF

If any layer leaks your identity, anonymity can fail.

If you want the non‑technical version of device/network risks, read this next: [device and network basics](/blog/opsec/device-and-network-basics).

## Common ways people accidentally identify themselves

The “gotchas” are usually boring:

- Using a **work device** (managed devices can be logged, backed up, or monitored).
- Using a **work network** (logs can exist even if websites don’t “track”).
- Sharing a PDF that still contains **metadata** (Author/Creator/XMP/forms/comments).
- Sharing a document with **visible identifiers** (name, signature, address, employee ID, case number).
- Printing + rescanning (some printers add **tracking dots**: [printer tracking dots](/blog/opsec/printer-tracking-dots)).

## What PDF Changer helps with (document layer)

PDF Changer helps with the **document layer**.

The [Deep Metadata Scrubber](/scrub) removes common PDF metadata and risky interactive elements **on your device**, without uploading the file.

It removes things like:

- Document Info fields (Title/Author/etc.)
- XMP metadata streams
- forms and annotations (including hyperlinks — explained here: [why links and forms are removed](/blog/documents/why-links-and-forms-are-removed))
- embedded files (attachments)

It does **not** remove what’s visible in the document itself (names in the text, letterheads, scanned signatures, barcodes).

If you want a gentle explanation of PDF metadata: [what metadata is (and why it matters)](/blog/documents/what-metadata-is-and-why-it-matters).

## A simple, safer workflow

If your situation is high‑risk, keep the workflow boring and repeatable:

1) Read [device and network basics](/blog/opsec/device-and-network-basics) (it’s short, and it prevents the biggest mistakes).
2) If it fits your threat model: load the site once, then go offline while processing ([offline mode walkthrough](/blog/basics/using-pdf-changer-offline)).
3) Use [the scrubber](/scrub).
4) Open the output PDF and sanity‑check it (content + behavior).
5) Share using a channel that matches your situation (official newsroom tip channels, a trusted journalist org, or a lawyer).

If you’re planning to contact a newsroom, this may help: [sharing documents to journalists](/blog/submissions/sharing-documents-to-journalists).

## Final note

This is general information, not legal advice. If you’re worried about retaliation or prosecution, consider speaking to a qualified lawyer or a trusted journalist organization before acting.
