---
title: Does scrubbing remove EXIF from images?
question: Does scrubbing remove EXIF from images?
summary: Not guaranteed. EXIF may remain in embedded images, so high-risk cases should treat image metadata as potentially present.
tags: [metadata, exif, images]
lastReviewed: 2026-02-20
---
# Does scrubbing remove EXIF from images?

Not guaranteed. EXIF may remain in embedded images, so high-risk cases should treat image metadata as potentially present.

## Why this matters

Image metadata can include timestamps, device model details, and other clues that may increase linkability.

## Safe default steps

1. Watch for EXIF warnings in the scrub report.
2. Prefer documents that do not depend on embedded photos when possible.
3. If risk is serious, get legal or professional guidance before sharing.
4. Keep your workflow simple so review steps are not skipped.

## Common mistakes

- Assuming all metadata types are handled identically.
- Trusting a single pass without review.
- Sharing camera-origin files directly.

## Limits

The scrubber prioritizes preserving selectable text and core document structure. Full rasterization or advanced image cleaning is a future mode.

## Related

- [What does PDF Changer remove?](/faq/metadata/what-does-pdf-changer-remove)
- [What metadata does a PDF carry?](/faq/metadata/what-metadata-does-a-pdf-carry)
- [Security page](/security)

