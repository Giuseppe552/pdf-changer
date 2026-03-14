# What PDF metadata is (and why it matters)

PDFs can carry hidden metadata (Author/Creator, timestamps, XMP) and “interactive” elements (forms, links, attachments) you didn’t mean to share.

PDFs aren’t just “pages”. They can carry extra information — like what software created the file, when it was edited, and sometimes other hidden structures.

When you’re moving fast (or stressed), this is easy to miss.

If you’ve ever clicked “Export as PDF” and assumed the result was just the visible pages: you’re in good company.

## The two big kinds of metadata

### 1) Document Info fields

These are the classic “file properties” fields many tools fill automatically:

- Title, Author, Subject, Keywords
- Creator / Producer
- CreationDate / ModDate

They’re easy to forget because you usually don’t see them on the page itself.

### 2) XMP metadata

XMP is a separate metadata stream inside the PDF. It can contain more detail than the Info fields, and some software writes a lot of it.

## “Interactive” elements can leak too

PDFs can include:

- hyperlinks (annotations),
- form fields,
- embedded files (attachments),
- JavaScript actions.

Even if none of these are “malicious”, they can create surprising behavior and extra risk when shared.

## What Deep Metadata Scrubber removes

The scrubber rebuilds the PDF and removes:

- Document Info fields (cleared)
- XMP metadata stream (removed)
- open actions / additional actions (removed)
- forms (`/AcroForm`) (removed)
- annotations (`/Annots`) (removed — includes hyperlinks)
- embedded files / attachments (removed)

It also normalizes timestamps to a fixed constant to avoid leaking “now”.

If you’re wondering why links and forms disappear, here’s the reasoning: [why links and forms are removed](/blog/documents/why-links-and-forms-are-removed).

## What metadata scrubbing can’t fix

Metadata scrubbing does **not** remove:

- names and identifiers in visible text,
- letterheads and logos,
- barcodes/QR codes,
- scanned signatures,
- “who had access” organizational clues.

Treat it as one layer in a broader safety plan.

Next step: [scrub a PDF](/scrub).
