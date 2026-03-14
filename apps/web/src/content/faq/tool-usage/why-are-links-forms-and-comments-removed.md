---
title: Why are links, forms, and comments removed?
question: Why are links, forms, and comments removed?
summary: They are removed because annotations and forms can carry actions, scripts, and hidden data that increase risk.
tags: [tool-usage, annotations, forms, links]
lastReviewed: 2026-02-20
---
# Why are links, forms, and comments removed?

They are removed because annotations and forms can carry actions, scripts, and hidden data that increase risk.

## Why this matters

A strict default is easier to trust in high-risk workflows than partial filtering that can miss edge cases.

## Safe default steps

1. Assume interactive PDF elements are risky by default.
2. Scrub first, then re-check whether content meaning is intact.
3. If links are needed, add them later in a lower-risk copy.

## Common mistakes

- Expecting hyperlink behavior to remain unchanged.
- Re-introducing form fields before sharing sensitive copies.
- Confusing convenience with safety.

## Limits

This default prioritizes safety over feature retention. Future modes may allow controlled toggles with warnings.

## Related

- [Why we remove links and forms](/blog/documents/why-links-and-forms-are-removed)
- [What does PDF Changer remove?](/faq/metadata/what-does-pdf-changer-remove)
- [Deep scrubber](/scrub)

