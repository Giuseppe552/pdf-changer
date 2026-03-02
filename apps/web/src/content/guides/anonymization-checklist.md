# Document anonymization checklist

This checklist helps reduce accidental identifiers when sharing documents.

## 1) Scrub metadata

Use the Deep Metadata Scrubber to remove common PDF metadata and interactive elements.

## 2) Review visible content

Metadata scrubbing does not remove:

- Names and signatures in visible content
- Letterheads, addresses, watermarks
- QR codes and barcodes

## 3) Watch for scans and photos

Scanned pages may contain:

- Handwritten marks
- Camera or scanner fingerprints
- Embedded image metadata (EXIF) in some cases

## 4) Use offline mode if needed

If it fits your threat model, load the app once, then turn off Wi‑Fi before processing.

## 5) Verify the output

Check the scrub report and hashes, and open the output to confirm it behaves as expected.

