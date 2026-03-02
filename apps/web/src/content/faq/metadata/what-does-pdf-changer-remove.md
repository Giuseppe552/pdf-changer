---
title: What does PDF Changer remove?
question: What does PDF Changer remove?
summary: PDF Changer removes common document metadata, XMP, actions, forms, annotations, and attachments, then rebuilds the output PDF.
tags: [metadata, scrubber, pdf]
lastReviewed: 2026-02-20
---
# What does PDF Changer remove?

PDF Changer removes common document metadata, XMP, actions, forms, annotations, and attachments, then rebuilds the output PDF.

## Why this matters

The rebuilt output helps drop incremental-update baggage and risky interactive elements that can leak information.

## Safe default steps

1. Use Deep Metadata Scrubber before external sharing.
2. Check the local scrub report for removed fields.
3. Open the output and verify text is still usable.
4. Share the scrubbed copy, not the original.

## Common mistakes

- Assuming visible content was also anonymized.
- Re-attaching the original file by accident.
- Expecting links and form fields to remain.

## Limits

The tool does not guarantee removal of identifiers inside visible content, including logos, signatures, and unique wording.

## Related

- [Why are links, forms, and comments removed?](/faq/tool-usage/why-are-links-forms-and-comments-removed)
- [Can you remove names inside the document?](/faq/metadata/can-you-remove-names-inside-the-document)
- [Deep scrubber](/scrub)

