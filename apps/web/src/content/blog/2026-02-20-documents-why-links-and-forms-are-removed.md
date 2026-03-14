# Why we remove links, forms, and annotations

PDF links, comments, and form fields are “annotations” — and they can carry actions, embedded files, and surprising behavior across viewers. We remove **all** annotations on purpose.

People often ask: “Why did the scrubber remove my hyperlinks?”

Yes — the Deep Metadata Scrubber removes **all annotations** on purpose.

It’s not because links are “bad”. It’s because the scrubber is built around a strict, high‑risk default: **safe and boring beats feature‑complete**.

## What counts as an annotation?

In PDFs, “annotations” include more than comments:

- hyperlinks
- sticky notes / comments
- form widgets (interactive form fields)
- file attachments embedded in the PDF

## Why remove them?

Annotations can:

- reveal editing history or authorship clues,
- contain embedded actions (including JavaScript),
- create unpredictable behavior across PDF viewers,
- accidentally carry information you didn’t intend to share.

Also: it’s genuinely hard to automatically separate “harmless” annotations from risky ones across the wild variety of PDFs and PDF viewers. We choose the strict default.

## What to expect

After scrubbing:

- Text remains selectable (we do not rasterize by default).
- Hyperlinks won’t work (because they were annotations).
- Forms won’t be fillable (forms are removed).

If you need a “keep links” mode later, we can add it as an explicit toggle with warnings — but the default is maximum safety.

If you want the bigger picture, start here: [Anonymity 101](/blog/basics/anonymity-101).
